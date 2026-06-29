import { Router } from 'express';
import Groq from 'groq-sdk';
import connectToDatabase from '../lib/mongodb';
import Knowledge from '../lib/models/Knowledge';
import Tool from '../lib/models/Tool';
import Command from '../lib/models/Command';

const router = Router();

function getGroqClient() {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured');
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

async function analyzeEntry(groq: Groq, entry: { id: string; title: string; content: string }) {
  const prompt = `You are a pentesting knowledge analyst. Analyze this knowledge base entry and extract structured data.

ENTRY TITLE: ${entry.title}
ENTRY CONTENT:
${entry.content.slice(0, 3000)}

Respond ONLY with valid JSON (no markdown, no explanation) matching exactly this shape:
{
  "tags": ["tag1", "tag2"],
  "tools": [
    {
      "name": "ToolName",
      "slug": "toolname",
      "category": "recon|web|password|exploitation|post-exploitation|network|other",
      "description": "One sentence description of what this tool does.",
      "cheatsheet": "## Usage\\n\\n### Linux\\n\`\`\`bash\\nnmap -sV target\\n\`\`\`\\n\\n### Windows\\n\`\`\`powershell\\nnmap.exe -sV target\\n\`\`\`",
      "officialUrl": "https://example.com or null"
    }
  ],
  "commands": [
    {
      "title": "Short descriptive title",
      "command": "the exact command string",
      "description": "what this command does",
      "category": "recon|web|password|exploitation|post-exploitation|network|other"
    }
  ]
}

Rules:
- tags: 2-6 lowercase keywords that describe the topic (e.g. "nmap", "port-scan", "smb", "privilege-escalation")
- tools: ONLY include if this entry clearly describes a specific named pentesting tool with actual usage. Empty array [] if none.
- commands: extract every distinct command, one-liner, or flag example shown. Max 10 per entry. Empty array [] if none.
- For tool cheatsheets: always include both Linux (bash) and Windows (PowerShell) examples where applicable.
- Slugs must be lowercase, hyphens only, no spaces.`;

  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.1,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? '{}';
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim();
  return JSON.parse(cleaned) as {
    tags: string[];
    tools: { name: string; slug: string; category: string; description: string; cheatsheet: string; officialUrl?: string }[];
    commands: { title: string; command: string; description: string; category: string }[];
  };
}

router.post('/analyze/knowledge', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const send = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    if ((res as any).flush) (res as any).flush();
  };

  try {
    await connectToDatabase();
    const groq = getGroqClient();

    const entries = await Knowledge.find({}).lean();

    if (entries.length === 0) {
      send({ type: 'error', message: 'No knowledge entries found. Add some entries to the vault first.' });
      res.end();
      return;
    }

    send({ type: 'start', total: entries.length });

    let totalTags = 0;
    let totalTools = 0;
    let totalCommands = 0;
    const errors: string[] = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const id = (entry._id as any).toString();

      send({ type: 'progress', current: i + 1, total: entries.length, title: entry.title });

      try {
        const result = await analyzeEntry(groq, { id, title: entry.title, content: entry.content });

        if (result.tags?.length > 0) {
          const mergedTags = Array.from(new Set([...(entry.tags ?? []), ...result.tags.map((t: string) => t.toLowerCase().trim())]));
          await Knowledge.findByIdAndUpdate(id, { $set: { tags: mergedTags } });
          totalTags += result.tags.length;
        }

        if (result.tools?.length > 0) {
          for (const tool of result.tools) {
            if (!tool.name || !tool.slug || !tool.cheatsheet) continue;
            const existing = await Tool.findOne({ slug: tool.slug });
            if (!existing) {
              await Tool.create({
                name: tool.name,
                slug: tool.slug,
                category: tool.category ?? 'other',
                description: tool.description ?? '',
                cheatsheet: tool.cheatsheet,
                officialUrl: tool.officialUrl ?? null,
              });
              totalTools++;
            }
          }
        }

        if (result.commands?.length > 0) {
          for (const cmd of result.commands) {
            if (!cmd.title || !cmd.command) continue;
            const existing = await Command.findOne({ command: cmd.command });
            if (!existing) {
              await Command.create({
                title: cmd.title,
                command: cmd.command,
                description: cmd.description ?? null,
                category: cmd.category ?? 'other',
              });
              totalCommands++;
            }
          }
        }

        send({
          type: 'entry_done',
          id,
          title: entry.title,
          tags: result.tags ?? [],
          toolsAdded: result.tools?.length ?? 0,
          commandsAdded: result.commands?.length ?? 0,
        });
      } catch (err: any) {
        errors.push(`${entry.title}: ${err.message}`);
        send({ type: 'entry_error', title: entry.title, error: err.message });
      }

      await new Promise(r => setTimeout(r, 500));
    }

    send({ type: 'done', totalTags, totalTools, totalCommands, errors });
    res.end();
  } catch (err: any) {
    send({ type: 'error', message: err.message });
    res.end();
  }
});

export default router;
