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
    'You are a senior penetration tester helping organize a personal knowledge base.\n\n' +
    'ENTRY TITLE: ' + title + '\n' +
    'ENTRY CONTENT (first portion):\n' + content.slice(0, 6000) + '\n\n' +
    'Your job is to EXTRACT metadata from this entry — do NOT rewrite or summarize the content.\n\n' +
    'Respond ONLY with valid JSON. No markdown wrapper. Exactly this structure:\n\n' +
    '{\n' +
    '  "tags": ["lowercase-tag1", "tag2"],\n' +
    '  "tools": [\n' +
    '    {\n' +
    '      "name": "ToolName",\n' +
    '      "slug": "toolname",\n' +
    '      "category": "recon|web|password|exploitation|post-exploitation|network|other",\n' +
    '      "description": "One or two plain-English sentences. What does this tool do and why would a pentester use it? Example style: Nmap is a network scanner that discovers open ports on a target — like knocking on every door of a building to see which ones are unlocked.",\n' +
    '      "cheatsheet": "Write in clean markdown. Include these sections:\\n## What it does\\n2-3 plain English sentences explaining the tool.\\n\\n## Real-world scenario\\nA concrete example: you have target IP 10.10.10.5, what do you do with this tool?\\n\\n## Linux (bash)\\nCode block with 3-4 practical examples, each with a comment explaining what it does.\\n\\n## Windows (PowerShell)\\nCode block with equivalent Windows commands.\\n\\n## Key flags explained\\nBullet list of important flags in plain English — e.g. -sV: detect what software version is running on each port.",\n' +
    '      "officialUrl": "url string or null"\n' +
    '    }\n' +
    '  ],\n' +
    '  "commands": [\n' +
    '    {\n' +
    '      "title": "Short descriptive action title",\n' +
    '      "command": "exact command string",\n' +
    '      "description": "WHAT: what this command does in plain English. WHEN: the real scenario when you use it. EXAMPLE: a concrete example or expected result.",\n' +
    '      "category": "recon|web|password|exploitation|post-exploitation|network|other"\n' +
    '    }\n' +
    '  ]\n' +
    '}\n\n' +
    'STRICT RULES:\n' +
    '- tags: 2-6 lowercase keywords that describe the topic of this entry\n' +
    '- tools: ONLY if the entry clearly covers a specific named pentesting tool. Return [] if none.\n' +
    '- commands: extract every real usable command or one-liner. Max 10. The description MUST use WHAT/WHEN/EXAMPLE format.\n' +
    '- Do NOT invent commands that are not in the source text.\n' +
    '- Do NOT return cleanedContent or cleanedTitle — only the fields listed above.'
  );
}

async function analyzeEntry(groq: Groq, entry: { id: string; title: string; content: string }) {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.1,
    max_tokens: 3000,
    messages: [{ role: 'user', content: buildPrompt(entry.title, entry.content) }],
  });

  const raw = completion.choices[0]?.message?.content?.trim() ?? '{}';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : '{}';

  return JSON.parse(jsonStr) as {
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

        // ONLY update tags — never touch the original content or title
        if ((result.tags ?? []).length > 0) {
          const mergedTags = Array.from(new Set([
            ...(entry.tags ?? []),
            ...result.tags.map((t: string) => t.toLowerCase().trim()).filter(Boolean),
          ]));
          await Knowledge.findByIdAndUpdate(id, { $set: { tags: mergedTags } });
          totalTags += result.tags.length;
        }

        // Create Tool Reference entries (additive — won't delete existing tools)
        for (const tool of (result.tools ?? [])) {
          if (!tool.name || !tool.slug || !tool.cheatsheet) continue;
          const slug = tool.slug.toLowerCase().replace(/\s+/g, '-');
          const existing = await Tool.findOne({ slug });
          if (!existing) {
            await Tool.create({
              name: tool.name,
              slug,
              category: tool.category ?? 'other',
              description: tool.description ?? '',
              cheatsheet: tool.cheatsheet,
              officialUrl: tool.officialUrl ?? null,
            });
            totalTools++;
          } else {
            // Update description and cheatsheet if they exist (enrich existing tools)
            if (tool.description) {
              await Tool.findByIdAndUpdate(existing._id, {
                $set: { description: tool.description, cheatsheet: tool.cheatsheet },
              });
            }
          }
        }

        // Create Saved Commands (additive — won't overwrite existing)
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
          title: entry.title,
          tags: result.tags ?? [],
          toolsAdded: totalTools,
          commandsAdded: (result.commands ?? []).length,
        });
      } catch (err: any) {
        send({ type: 'entry_error', title: entry.title, error: err.message });
      }

      await new Promise(r => setTimeout(r, 600));
    }

    send({ type: 'done', totalTags, totalTools, totalCommands, errors: [] });
    res.end();
  } catch (err: any) {
    send({ type: 'error', message: err.message });
    res.end();
  }
});

export default router;
