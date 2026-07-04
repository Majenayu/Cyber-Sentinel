import { Router } from 'express';
import connectToDatabase from '../lib/mongodb';
import ResearchLog from '../lib/models/ResearchLog';
import Knowledge from '../lib/models/Knowledge';
import { runResearch, RESEARCH_SOURCES, isResearchRunning } from '../lib/researcher';

const router = Router();

// ── GET /api/research/status ──────────────────────────────────────────────────
router.get('/research/status', async (_req, res) => {
  try {
    await connectToDatabase();
    const lastLog = await ResearchLog.findOne({}).sort({ runAt: -1 }).lean();
    const totalGeneralKb = await Knowledge.countDocuments({ category: 'general' });

    // Next 3 AM
    const now = new Date();
    const next = new Date(now);
    next.setHours(3, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);

    res.json({
      isRunning: isResearchRunning(),
      lastRun: lastLog
        ? {
            runAt: lastLog.runAt,
            finishedAt: lastLog.finishedAt,
            status: lastLog.status,
            triggeredBy: lastLog.triggeredBy,
            sourcesChecked: lastLog.sourcesChecked,
            kbEntriesCreated: lastLog.kbEntriesCreated,
            toolsCreated: lastLog.toolsCreated,
            commandsCreated: lastLog.commandsCreated,
            errors: lastLog.errors,
            discoveries: lastLog.discoveries,
          }
        : null,
      nextScheduledRun: next.toISOString(),
      totalGeneralKb,
      sourcesInPool: RESEARCH_SOURCES.length,
      sourcesPool: RESEARCH_SOURCES.map(s => ({ url: s.url, topic: s.topic, tags: s.tags })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/research/log ─────────────────────────────────────────────────────
router.get('/research/log', async (_req, res) => {
  try {
    await connectToDatabase();
    const logs = await ResearchLog.find({}).sort({ runAt: -1 }).limit(30).lean();
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/research/run — manual trigger, streams SSE ──────────────────────
router.post('/research/run', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const send = (data: object) => {
    res.write('data: ' + JSON.stringify(data) + '\n\n');
    if ((res as any).flush) (res as any).flush();
  };

  let logId: string | null = null;
  let sourcesChecked = 0;
  let kbCreated = 0;
  let toolsCreated = 0;
  let commandsCreated = 0;
  const errors: string[] = [];
  const discoveries: Array<{ source: string; title: string; tags: string[] }> = [];

  try {
    await connectToDatabase();

    const log = await ResearchLog.create({
      runAt: new Date(),
      status: 'running',
      triggeredBy: 'manual',
      sourcesChecked: 0,
      kbEntriesCreated: 0,
      toolsCreated: 0,
      commandsCreated: 0,
      errors: [],
      discoveries: [],
    });
    logId = log._id.toString();

    // Never accept sources from the request body — always use the server-side allowlist
    // (prevents SSRF: attacker-supplied URLs could cause server-side fetches to internal services)

    await runResearch((progress) => {
      send(progress);
      if (progress.type === 'source_done') {
        sourcesChecked++;
        kbCreated += progress.kbCreated ?? 0;
        toolsCreated += progress.toolsAdded ?? 0;
        commandsCreated += progress.commandsAdded ?? 0;
        if (progress.sourceTitle) {
          discoveries.push({ source: progress.sourceUrl ?? '', title: progress.sourceTitle, tags: [] });
        }
      } else if (progress.type === 'source_error') {
        errors.push(`${progress.sourceUrl}: ${progress.error}`);
      }
    });

    if (logId) {
      await ResearchLog.findByIdAndUpdate(logId, {
        $set: {
          status: 'done',
          sourcesChecked,
          kbEntriesCreated: kbCreated,
          toolsCreated,
          commandsCreated,
          errors,
          discoveries,
          finishedAt: new Date(),
        },
      });
    }

    res.end();
  } catch (err: any) {
    if (logId) {
      await ResearchLog.findByIdAndUpdate(logId, {
        $set: { status: 'error', errors: [err.message], finishedAt: new Date() },
      }).catch(() => {});
    }
    send({ type: 'error', message: err.message });
    res.end();
  }
});

export default router;
