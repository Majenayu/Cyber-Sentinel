/**
 * POST /api/terminal/suggest
 *
 * AI-powered terminal autocomplete.
 * Takes the partial command the user is typing and asks Groq's fastest model
 * to return smart completions with plain-English descriptions.
 *
 * Body:   { input: string, platform?: 'linux'|'windows', username?: string }
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

// ── Linux / local terminal prompt ────────────────────────────────────────────
const SUGGEST_SYSTEM_LINUX = `You are a Linux terminal autocomplete engine for a cybersecurity operations platform.
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

// ── Windows / remote terminal prompt (HTB-aware) ─────────────────────────────
function buildWindowsPrompt(username: string) {
  const user = username || 'pgayu';
  const htbBase = `C:\\Users\\${user}\\Downloads\\hack-the-box`;
  return `You are a Windows CMD/PowerShell terminal autocomplete engine for a cybersecurity (Hack The Box / CTF) operator.
The operator's Windows machine: username="${user}", HTB tools folder="${htbBase}"

Known wordlist and tool paths on this system:
  Passwords/usernames:
    ${htbBase}\\rockyou.txt
    ${htbBase}\\passwords.txt
    ${htbBase}\\usernames.txt
    ${htbBase}\\common-passwords.txt
    ${htbBase}\\top1000.txt
    ${htbBase}\\SecLists\\Passwords\\rockyou.txt
    ${htbBase}\\SecLists\\Usernames\\top-usernames-shortlist.txt
  Directory wordlists (gobuster/dirb):
    ${htbBase}\\directory-list-2.3-medium.txt
    ${htbBase}\\directory-list-2.3-small.txt
    ${htbBase}\\common.txt
    ${htbBase}\\SecLists\\Discovery\\Web-Content\\directory-list-2.3-medium.txt
    ${htbBase}\\SecLists\\Discovery\\Web-Content\\common.txt
  Tools (may be native Windows or WSL):
    Hydra:    hydra  (or wsl hydra)
    John:     john   (or wsl john / john.exe from ${htbBase}\\JohnTheRipper\\)
    Hashcat:  hashcat.exe  (or ${htbBase}\\hashcat\\hashcat.exe)
    Gobuster: gobuster  (or wsl gobuster)
    Nmap:     nmap  (installed in PATH or C:\\Program Files (x86)\\Nmap\\nmap.exe)
    SQLMap:   wsl sqlmap  (or python sqlmap.py)
    Netcat:   ncat  / nc  (or wsl nc)
    Metasploit: wsl msfconsole

Rules:
- Use correct Windows CMD or PowerShell syntax (backslash paths, double-quoted strings)
- For security tools, prefer wsl <tool> if a native Windows binary is unlikely
- Replace placeholder targets with realistic CTF examples (10.10.10.X, target.htb, 192.168.1.X)
- Use the actual paths from this system (listed above) in wordlist arguments
- desc must be 1–2 short plain-English sentences (max 120 chars) explaining what the command does
- category must be ONE of: network, security, file, system, process, archive, search, text, help

Respond ONLY with a valid JSON array — no markdown, no explanation, no code fences:
[
  { "name": "<full command>", "desc": "<plain English>", "category": "<category>" },
  ...
]`;
}

router.post('/terminal/suggest', async (req, res) => {
  const { input, platform, username } = req.body as {
    input?: string;
    platform?: string;
    username?: string;
  };

  if (!input || typeof input !== 'string' || !input.trim()) {
    res.status(400).json({ error: 'input required' });
    return;
  }

  const trimmed = input.trim().slice(0, 200); // guard against huge payloads
  const isWindows = platform === 'windows';
  const systemPrompt = isWindows
    ? buildWindowsPrompt(username || 'pgayu')
    : SUGGEST_SYSTEM_LINUX;

  try {
    const groq = getGroqClient();

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',   // fastest Groq model — ~200ms latency
      temperature: 0.2,                 // low temp = consistent, accurate commands
      max_tokens: 512,
      messages: [
        { role: 'system', content: systemPrompt },
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
