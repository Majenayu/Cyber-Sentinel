/**
 * Daily research scheduler.
 * Fires the autonomous research pipeline once per day at 3:00 AM server time.
 * Also exposed so the /api/research/run route can trigger it on demand.
 */
import { logger } from './logger';
import { runResearch } from './researcher';
import connectToDatabase from './mongodb';
import ResearchLog from './models/ResearchLog';

function msUntilNextRun(hour = 3): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

export async function executeResearchRun(triggeredBy: 'scheduler' | 'manual' = 'scheduler'): Promise<void> {
  await connectToDatabase();

  const log = await ResearchLog.create({
    runAt: new Date(),
    status: 'running',
    triggeredBy,
    sourcesChecked: 0,
    kbEntriesCreated: 0,
    toolsCreated: 0,
    commandsCreated: 0,
    errors: [],
    discoveries: [],
  });

  let sourcesChecked = 0;
  let kbCreated = 0;
  let toolsCreated = 0;
  let commandsCreated = 0;
  const errors: string[] = [];
  const discoveries: Array<{ source: string; title: string; tags: string[] }> = [];

  try {
    await runResearch((progress) => {
      logger.debug(progress, 'research progress');
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

    await ResearchLog.findByIdAndUpdate(log._id, {
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

    logger.info(
      { triggeredBy, sourcesChecked, kbCreated, toolsCreated, commandsCreated },
      'Research run complete',
    );
  } catch (err: any) {
    await ResearchLog.findByIdAndUpdate(log._id, {
      $set: { status: 'error', errors: [err.message], finishedAt: new Date() },
    });
    logger.error({ err }, 'Research run failed');
    throw err;
  }
}

export function startScheduler(): void {
  const msUntilFirst = msUntilNextRun(3);
  const hours = Math.floor(msUntilFirst / 3_600_000);
  const minutes = Math.floor((msUntilFirst % 3_600_000) / 60_000);

  logger.info({ nextRunIn: `${hours}h ${minutes}m` }, 'Research scheduler armed — next run at 3:00 AM');

  setTimeout(() => {
    executeResearchRun('scheduler').catch(err =>
      logger.error({ err }, 'Scheduled research run failed'),
    );
    // After the first run, fire every 24 h
    setInterval(() => {
      executeResearchRun('scheduler').catch(err =>
        logger.error({ err }, 'Scheduled research run failed'),
      );
    }, 24 * 60 * 60 * 1000);
  }, msUntilFirst);
}
