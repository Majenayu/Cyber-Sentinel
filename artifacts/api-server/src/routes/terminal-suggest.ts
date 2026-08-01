/**
 * POST /api/terminal/suggest
 *
 * AI-powered terminal autocomplete.
 * Takes the partial command the user is typing and asks Groq's fastest model
 * to return smart completions with plain-English descriptions.
 *
 * Body:   { input: string }
 * Returns { suggestions: Array<{ name: string; desc: string; category: string }> }
 */

import { Router } from 'express';
import Groq from 'groq-sdk';

const router = Router();

function getGroqClient() {
  const key = process.env.GROQ_API_KEY ?? process.env.GROQ_API_KEY_2;
  if (!key) throw new Error('No Groq API key configured');
  return new Groq({ apiKey: key });
}

const SUGGEST_SYSTEM = `You are a Linux terminal autocomplete engine for a cybersecurity operations platform.
Given a partial command the operator is typing, return exactly 5 smart completions.

Rules:
- Completions must be real, runnable Linux/bash commands (no made-up flags or fake hosts)
- For security tools (nmap, hydra, sqlmap, etc.) use correct real syntax
- Replace placeholder targets with realistic examples (192.168.1.1, target.com, example.com)
- desc must be 1–2 short plain-English sentences (max 120 chars) explaining what that specific command+args does
- category must be ONE of: network, security, file, system, process, archive, search, text, help

Respond ONLY with a valid JSON array — no markdown, no explanation, no code fences:
[
  { "name": "<full command>", "desc": "<plain English>", "category": "<category>" },
  ...
]`;

router.post('/terminal/suggest', async (req, res) => {
  const { input } = req.body as { input?: string };

  if (!input || typeof input !== 'string' || !input.trim()) {
    res.status(400).json({ error: 'input required' });
    return;
  }

  const trimmed = input.trim().slice(0, 200); // guard against huge payloads

  try {
    const groq = getGroqClient();

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',   // fastest Groq model — ~200ms latency
      temperature: 0.2,                 // low temp = consistent, accurate commands
      max_tokens: 512,
      messages: [
        { role: 'system', content: SUGGEST_SYSTEM },
        {
          role: 'user',
          content: `Partial input: "${trimmed}"\n\nReturn 5 completions as a JSON array.`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '[]';

    // Parse and validate
    let suggestions: Array<{ name: string; desc: string; category: string }> = [];
    try {
      // Strip any accidental markdown code fences the model might add
      const cleaned = raw.replace(/^```[a-z]*\n?/i, '').replace(/```$/,'').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        suggestions = parsed
          .filter((s: any) => typeof s?.name === 'string' && typeof s?.desc === 'string')
          .map((s: any) => ({
            name: String(s.name).slice(0, 300),
            desc: String(s.desc).slice(0, 200),
            category: typeof s.category === 'string' ? s.category : 'system',
          }))
          .slice(0, 7);
      }
    } catch {
      // Model returned non-JSON — return empty gracefully
      suggestions = [];
    }

    res.json({ suggestions });
  } catch (err: any) {
    // Never let AI errors crash the terminal — just return empty
    res.status(200).json({ suggestions: [], error: err.message });
  }
});

export default router;
