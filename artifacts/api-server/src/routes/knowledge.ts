import { Router } from 'express';
import connectToDatabase from '../lib/mongodb';
import Knowledge from '../lib/models/Knowledge';
import { getAvailableProviders } from '../lib/multi-ai';

const router = Router();

router.get('/knowledge', async (req, res) => {
  try {
    await connectToDatabase();
    const { q, tag } = req.query as { q?: string; tag?: string };
    let filter: any = {};
    if (tag) filter.tags = tag;
    if (q) {
      const regex = new RegExp(q, 'i');
      filter = { $or: [{ title: regex }, { content: regex }, { tags: regex }] };
    }
    const entries = await Knowledge.find(filter).sort({ createdAt: -1 });
    res.json(entries.map(e => ({
      id: e._id.toString(),
      title: e.title,
      content: e.content,
      tags: e.tags ?? [],
      source: e.source ?? null,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const SIMPLIFY_SYSTEM_PROMPT = `You are a technical writer cleaning up a cybersecurity knowledge base entry.

Your job: rewrite the content to be clean, readable, and well-structured.

RULES:
1. Remove HTML artifacts, navigation menus, cookie notices, ads, footer boilerplate, "click here" links, and any repeated junk text.
2. Keep ALL technical content exactly: tool names, commands, IP addresses, flags, CVE numbers, technique names.
3. Preserve code blocks — wrap in triple-backticks with language label (bash, python, etc.) if not already formatted.
4. Write explanations in simple, plain English — short sentences, no jargon walls.
5. Use markdown: ## for main sections, ### for subsections, bullet lists for steps or options.
6. Short paragraphs (2–4 sentences). Replace long walls of text with focused paragraphs.
7. If steps are sequential, use a numbered list.
8. Remove duplicate content.
9. Output ONLY the cleaned markdown — no preamble like "Here is the cleaned version:" — just start writing.`;

async function runSimplify(title: string, content: string): Promise<string> {
  const providers = getAvailableProviders();
  if (providers.length === 0) throw new Error('No AI providers configured');
  const messages = [
    { role: 'user' as const, content: `Clean and simplify this knowledge base entry into readable markdown:\n\nTitle: ${title}\n\nContent:\n${content.slice(0, 8000)}` },
  ];
  for (const provider of providers) {
    try {
      const result = await provider.call(messages, SIMPLIFY_SYSTEM_PROMPT);
      if (result.trim().length > 30) return result.trim();
    } catch {}
  }
  throw new Error('All providers failed to simplify content');
}

/** Preview-simplify: clean content without saving (used from the edit form) */
router.post('/knowledge/simplify-preview', async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'content required' });
    const simplified = await runSimplify(title ?? 'Entry', content);
    res.json({ content: simplified });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/** Simplify an existing entry and save it */
router.post('/knowledge/:id/simplify', async (req, res) => {
  try {
    await connectToDatabase();
    const entry = await Knowledge.findById(req.params.id);
    if (!entry) { res.status(404).json({ error: 'Not found' }); return; }
    const simplified = await runSimplify(entry.title, entry.content);
    const updated = await Knowledge.findByIdAndUpdate(
      req.params.id,
      { $set: { content: simplified } },
      { new: true }
    );
    res.json({
      id: updated!._id.toString(),
      title: updated!.title,
      content: updated!.content,
      tags: updated!.tags ?? [],
      source: updated!.source ?? null,
      sources: (updated as any).sources ?? [],
      createdAt: updated!.createdAt,
      updatedAt: updated!.updatedAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/knowledge', async (req, res) => {
  try {
    await connectToDatabase();
    const { title, content, tags, source } = req.body;
    const entry = await Knowledge.create({ title, content, category: 'lesson', tags: tags ?? [], source: source ?? null });
    res.status(201).json({
      id: entry._id.toString(),
      title: entry.title,
      content: entry.content,
      tags: entry.tags,
      source: entry.source ?? null,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/knowledge/:id', async (req, res) => {
  try {
    await connectToDatabase();
    const entry = await Knowledge.findById(req.params.id);
    if (!entry) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({
      id: entry._id.toString(),
      title: entry.title,
      content: entry.content,
      tags: entry.tags ?? [],
      source: entry.source ?? null,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/knowledge/:id', async (req, res) => {
  try {
    await connectToDatabase();
    const entry = await Knowledge.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!entry) { res.status(404).json({ error: 'Not found' }); return; }
    res.json({
      id: entry._id.toString(),
      title: entry.title,
      content: entry.content,
      tags: entry.tags ?? [],
      source: entry.source ?? null,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/knowledge/:id', async (req, res) => {
  try {
    await connectToDatabase();
    await Knowledge.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
