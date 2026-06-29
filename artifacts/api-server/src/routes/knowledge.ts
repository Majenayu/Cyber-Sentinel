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

const SIMPLIFY_SYSTEM_PROMPT = `You are a formatting cleaner for a cybersecurity knowledge base.

YOUR ONLY JOB: clean up the formatting and readability of the text. You are NOT summarizing. You are NOT condensing.

CRITICAL RULE — READ THIS FIRST:
- The output MUST be approximately the SAME LENGTH as the input or longer.
- Every piece of technical information in the input must appear in the output.
- Do NOT remove any technical details, steps, explanations, examples, or commands.
- If in doubt about whether to keep something technical, KEEP IT.

WHAT TO REMOVE (junk only):
- Raw HTML tags (<div>, <span>, <nav>, <footer>, etc.)
- Cookie consent notices, "Accept cookies", GDPR banners
- Navigation menus (repeated lists of page links)
- Advertisement text, "sponsored by", "click here", "subscribe now"
- Repeated header/footer boilerplate (site name repeated on every paragraph)
- Excessive blank lines (more than 2 in a row)

WHAT TO DO WITH THE REAL CONTENT:
- Keep every sentence, explanation, command, flag, IP, URL, CVE, step, example exactly
- Fix formatting: add markdown headings (## ##) to organize sections that don't have them
- Wrap bare commands in code blocks with the right language label (bash, python, powershell)
- Break very long run-on paragraphs into 2-4 sentence chunks — but keep all the text
- Use bullet lists for lists that are written inline with commas

OUTPUT RULES:
- Output ONLY the cleaned text. No preamble. No "Here is the cleaned version:".
- The output length should be similar to or greater than the input length.`;

/** Split content into chunks at natural line boundaries */
function splitIntoChunks(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = start + maxChars;
    if (end >= text.length) {
      chunks.push(text.slice(start));
      break;
    }
    // Find the nearest newline before the limit
    const newlineIdx = text.lastIndexOf('\n', end);
    if (newlineIdx > start + maxChars / 2) {
      end = newlineIdx;
    }
    chunks.push(text.slice(start, end));
    start = end + 1;
  }
  return chunks;
}

async function cleanChunk(title: string, chunk: string, chunkNum: number, total: number): Promise<string> {
  const providers = getAvailableProviders();
  const label = total > 1 ? ` (part ${chunkNum} of ${total})` : '';
  const messages = [
    {
      role: 'user' as const,
      content: `Clean the formatting of this knowledge base chunk${label}. Keep ALL content — do NOT summarize or shorten. Only fix formatting, remove HTML junk, and add markdown structure.\n\nTitle: ${title}\n\n---\n${chunk}\n---`,
    },
  ];
  for (const provider of providers) {
    try {
      const result = await provider.call(messages, SIMPLIFY_SYSTEM_PROMPT);
      // Reject if output is less than 30% of input size (AI over-summarized)
      if (result.trim().length > chunk.length * 0.3) return result.trim();
    } catch {}
  }
  // If AI fails or over-compresses, return original chunk unchanged
  return chunk;
}

async function runSimplify(title: string, content: string): Promise<string> {
  const providers = getAvailableProviders();
  if (providers.length === 0) throw new Error('No AI providers configured');

  const CHUNK_SIZE = 5000;
  const chunks = splitIntoChunks(content, CHUNK_SIZE);

  const cleaned: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const result = await cleanChunk(title, chunks[i], i + 1, chunks.length);
    cleaned.push(result);
  }

  return cleaned.join('\n\n');
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
