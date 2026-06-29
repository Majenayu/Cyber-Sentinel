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

function buildPrompt(title: string, content: string): string {
  return (
    'You are a senior penetration tester writing clean study notes for yourself.\n\n' +
    'ENTRY TITLE: ' + title + '\n' +
    'RAW CONTENT:\n' + content.slice(0, 4000) + '\n\n' +
    'Respond ONLY with valid JSON (no markdown wrapper). Use exactly this structure:\n\n' +
    '{\n' +
    '  "cleanedTitle": "A clear specific title e.g. Nmap: Full Port Scan with Service Detection",\n' +
    '  "cleanedContent": "Clean markdown rewrite. Remove all HTML, nav text, breadcrumbs, course junk, repeated lines. Keep all technical content. Use ## headings, bullet points, code blocks. Write so you can remember it quickly. Start with a ## Summary section (1-2 sentences).",\n' +
    '  "tags": ["lowercase-tag1", "tag2"],\n' +
    '  "tools": [\n' +
    '    {\n' +
    '      "name": "ToolName",\n' +
    '      "slug": "toolname",\n' +
    '      "category": "recon|web|password|exploitation|post-exploitation|network|other",\n' +
    '      "description": "Plain English: what this tool does and WHY. Example: Nmap scans a target network to find open ports — like knocking on every door of a building to see which ones open.",\n' +
    '      "cheatsheet": "Full markdown cheatsheet with these sections: ## What it does (2-3 plain English sentences), ## Real-world scenario (concrete example like: you have IP 10.10.10.5 and want to find open ports before attacking), ## Linux (bash code block with 2-3 useful examples and comments), ## Windows (PowerShell code block), ## Key flags explained (bullet list of the most important flags in plain English)",\n' +
    '      "officialUrl": "https://example.com or null"\n' +
    '    }\n' +
    '  ],\n' +
    '  "commands": [\n' +
    '    {\n' +
    '      "title": "Short action title e.g. Full TCP port scan with service detection",\n' +
    '      "command": "exact command string (Linux/bash)",\n' +
    '      "description": "WHAT: what this command does in plain English. WHEN: a real pentesting scenario when you reach for this. EXAMPLE: brief example context or expected output.",\n' +
    '      "category": "recon|web|password|exploitation|post-exploitation|network|other"\n' +
    '    }\n' +
    '  ]\n' +
    '}\n\n' +
    'Rules:\n' +
    '- cleanedContent: must be clean, readable markdown — no junk HTML, no repeated lines, no course navigation text\n' +
    '- tags: 2-6 lowercase keywords\n' +
    '- tools: ONLY if the entry is clearly about a named pentesting tool. Empty array if not.\n' +
    '- commands: only real usable one-liners. Max 8. description MUST use WHAT/WHEN/EXAMPLE format.\n' +
    '- Do not invent commands not present in the source. Do not hallucinate tool names.'
  );
}

async function analyzeEntry(groq: Groq, entry: { id: string; title: string; content: string }) {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.2,
    max_tokens: 4096,
    messages: [{ role: 'user', content: buildPrompt(entry.title, entry.content) }],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? '{}';
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim();

  return JSON.parse(cleaned) as {
    cleanedTitle: string;
    cleanedContent: string;
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
    res.write('data: ' + JSON.stringify(data) + '\n\n');
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

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const id = (entry._id as any).toString();

      send({ type: 'progress', current: i + 1, total: entries.length, title: entry.title });

      try {
        const result = await analyzeEntry(groq, { id, title: entry.title, content: entry.content });

        const mergedTags = Array.from(new Set([
          ...(entry.tags ?? []),
          ...(result.tags ?? []).map((t: string) => t.toLowerCase().trim()),
        ]));

        const updatePayload: any = { tags: mergedTags };
        if (result.cleanedContent && result.cleanedContent.length > 50) {
          updatePayload.content = result.cleanedContent;
        }
        if (result.cleanedTitle && result.cleanedTitle.length > 3) {
          updatePayload.title = result.cleanedTitle;
        }

        await Knowledge.findByIdAndUpdate(id, { $set: updatePayload });
        totalTags += (result.tags ?? []).length;

        for (const tool of (result.tools ?? [])) {
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
          } else {
            await Tool.findByIdAndUpdate(existing._id, {
              $set: { description: tool.description, cheatsheet: tool.cheatsheet },
            });
          }
        }

        for (const cmd of (result.commands ?? [])) {
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

        send({
          type: 'entry_done',
          id,
          title: result.cleanedTitle || entry.title,
          tags: result.tags ?? [],
          toolsAdded: (result.tools ?? []).length,
          commandsAdded: (result.commands ?? []).length,
        });
      } catch (err: any) {
        send({ type: 'entry_error', title: entry.title, error: err.message });
      }

      await new Promise(r => setTimeout(r, 800));
    }

    send({ type: 'done', totalTags, totalTools, totalCommands, errors: [] });
    res.end();
  } catch (err: any) {
    send({ type: 'error', message: err.message });
    res.end();
  }
});

export default router;
