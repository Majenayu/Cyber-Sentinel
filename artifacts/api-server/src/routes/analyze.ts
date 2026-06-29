import { Router } from 'express';
import Groq from 'groq-sdk';
import connectToDatabase from '../lib/mongodb';
import Knowledge from '../lib/models/Knowledge';
import Tool from '../lib/models/Tool';
import Command from '../lib/models/Command';
import { getBestJsonAnswer } from '../lib/multi-ai';

const router = Router();

/** Canonical slug: lowercase, letters/digits only, separated by hyphens */
function canonicalSlug(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
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
    '      "slug": "tool-name",\n' +
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

async function analyzeEntry(entry: { id: string; title: string; content: string }) {
  const jsonStr = await getBestJsonAnswer(
    buildPrompt(entry.title, entry.content),
    (parsed) => Array.isArray(parsed.tags),
  );

  let parsed: {
    tags: string[];
    tools: { name: string; slug: string; category: string; description: string; cheatsheet: string; officialUrl?: string }[];
    commands: { title: string; command: string; description: string; category: string }[];
  };
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(`AI returned invalid JSON: ${jsonStr.slice(0, 120)}`);
  }
  return parsed;
}

const VISION_PROMPT = `You are a cybersecurity expert analyzing this screenshot for a penetration tester.
Read ALL visible text carefully and extract every security-relevant detail:
- Exact IP addresses, hostnames, ports, services
- SSH/RSA/PEM keys or any credential material — copy them verbatim
- Error messages, stack traces, or debug output revealing system info
- Software names and version numbers
- CTF flags (format: flag{...}, HTB{...}, etc.)
- File paths, usernames, environment variables
- Any configuration snippets or network topology visible

Respond with a concise, technical bullet list. Start directly with findings — no preamble.
If you see a private key or credential, output it in full so the operator can use it.`;

async function callGroqVision(apiKey: string, model: string, base64: string, mimeType: string): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
            { type: 'text', text: VISION_PROMPT },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`${model} returned ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${model} returned empty content`);
  return content;
}

/** POST /api/analyze/image — Groq vision analysis of an attached screenshot */
router.post('/analyze/image', async (req, res) => {
  try {
    const { base64, mimeType } = req.body;
    if (!base64 || !mimeType) return res.status(400).json({ error: 'base64 and mimeType required' });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY not set' });

    // Try primary model, fall back to secondary vision model
    const models = ['llama-3.2-11b-vision-preview', 'llama-3.2-90b-vision-preview'];
    let lastError = '';

    for (const model of models) {
      try {
        const analysis = await callGroqVision(apiKey, model, base64, mimeType);
        return res.json({ analysis, model });
      } catch (err: any) {
        lastError = err.message;
        // Try next model
      }
    }

    // Both failed — return error with details so frontend can surface it
    res.status(502).json({ error: `Vision analysis failed: ${lastError}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

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
        const result = await analyzeEntry({ id, title: entry.title, content: entry.content });

        // ONLY update tags — never touch the original content or title
        if ((result.tags ?? []).length > 0) {
          const mergedTags = Array.from(new Set([
            ...(entry.tags ?? []),
            ...result.tags.map((t: string) => t.toLowerCase().trim()).filter(Boolean),
          ]));
          await Knowledge.findByIdAndUpdate(id, { $set: { tags: mergedTags } });
          totalTags += result.tags.length;
        }

        // Create Tool Reference entries — deduplicate by canonical slug, update if richer
        for (const tool of (result.tools ?? [])) {
          if (!tool.name || !tool.slug || !tool.cheatsheet) continue;
          const slug = canonicalSlug(tool.slug);
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
            // Only update if new description/cheatsheet is longer (richer)
            const shouldUpdate =
              (tool.description && tool.description.length > (existing.description?.length ?? 0)) ||
              (tool.cheatsheet && tool.cheatsheet.length > (existing.cheatsheet?.length ?? 0));
            if (shouldUpdate) {
              await Tool.findByIdAndUpdate(existing._id, {
                $set: {
                  description: tool.description || existing.description,
                  cheatsheet: tool.cheatsheet.length > (existing.cheatsheet?.length ?? 0)
                    ? tool.cheatsheet
                    : existing.cheatsheet,
                },
              });
            }
          }
        }

        // Create Saved Commands — deduplicate by normalised command string
        for (const cmd of (result.commands ?? [])) {
          if (!cmd.title || !cmd.command) continue;
          // Normalise: collapse whitespace so "nmap  -sV" and "nmap -sV" are the same
          const normalised = cmd.command.trim().replace(/\s+/g, ' ');
          const existing = await Command.findOne({
            command: { $regex: '^' + normalised.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', $options: 'i' },
          });
          if (!existing) {
            await Command.create({
              title: cmd.title,
              command: normalised,
              description: cmd.description ?? null,
              category: cmd.category ?? 'other',
            });
            totalCommands++;
          } else {
            // Update description only if the new one is longer/richer
            if (cmd.description && cmd.description.length > (existing.description?.length ?? 0)) {
              await Command.findByIdAndUpdate(existing._id, {
                $set: { description: cmd.description },
              });
            }
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

/** POST /api/analyze/deduplicate — clean up duplicate tools and commands in the DB */
router.post('/analyze/deduplicate', async (req, res) => {
  try {
    await connectToDatabase();

    // ── Deduplicate Tools ──────────────────────────────────────────────────
    const allTools = await Tool.find({}).lean();
    const toolGroups: Record<string, typeof allTools> = {};

    for (const tool of allTools) {
      // Strip ALL non-alpha chars so "browser-devtools" and "browserdevtools" → same key
      const key = tool.slug.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!toolGroups[key]) toolGroups[key] = [];
      toolGroups[key].push(tool);
    }

    let toolsRemoved = 0;
    for (const group of Object.values(toolGroups)) {
      if (group.length <= 1) continue;
      // Keep the one with the longest cheatsheet; delete the rest
      group.sort((a, b) => (b.cheatsheet?.length ?? 0) - (a.cheatsheet?.length ?? 0));
      const [keep, ...dupes] = group;
      for (const dupe of dupes) {
        await Tool.findByIdAndDelete(dupe._id);
        toolsRemoved++;
      }
      // Ensure the keeper has the canonical slug (hyphened form)
      const canonical = canonicalSlug(keep.slug);
      if (keep.slug !== canonical) {
        // Only update slug if no other tool already owns it
        const conflict = await Tool.findOne({ slug: canonical, _id: { $ne: keep._id } });
        if (!conflict) await Tool.findByIdAndUpdate(keep._id, { $set: { slug: canonical } });
      }
    }

    // ── Deduplicate Commands ───────────────────────────────────────────────
    const allCommands = await Command.find({}).lean();
    const cmdGroups: Record<string, typeof allCommands> = {};

    for (const cmd of allCommands) {
      const key = cmd.command.trim().toLowerCase().replace(/\s+/g, ' ');
      if (!cmdGroups[key]) cmdGroups[key] = [];
      cmdGroups[key].push(cmd);
    }

    let commandsRemoved = 0;
    for (const group of Object.values(cmdGroups)) {
      if (group.length <= 1) continue;
      // Keep the one with the longest description; delete the rest
      group.sort((a, b) => (b.description?.length ?? 0) - (a.description?.length ?? 0));
      const [, ...dupes] = group;
      for (const dupe of dupes) {
        await Command.findByIdAndDelete(dupe._id);
        commandsRemoved++;
      }
    }

    res.json({ toolsRemoved, commandsRemoved });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
