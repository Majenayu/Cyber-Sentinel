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
  const sl = `${htbBase}\\SecLists-master`;  // actual folder name on disk
  return `You are a Windows CMD/PowerShell terminal autocomplete engine for a cybersecurity (Hack The Box / CTF) operator.
The operator's Windows machine: username="${user}", HTB tools folder="${htbBase}"

Known wordlist and tool paths CONFIRMED on this system (use these exact paths):

  Passwords — Common Credentials:
    ${sl}\\Passwords\\Common-Credentials\\10k-most-common.txt
    ${sl}\\Passwords\\Common-Credentials\\100k-most-used-passwords-NCSC.txt
    ${sl}\\Passwords\\Common-Credentials\\probable-v2_top-12000.txt
    ${sl}\\Passwords\\Common-Credentials\\xato-net-10-million-passwords-10000.txt
    ${sl}\\Passwords\\Common-Credentials\\xato-net-10-million-passwords-100000.txt
    ${sl}\\Passwords\\Common-Credentials\\top-20-common-SSH-passwords.txt
    ${sl}\\Passwords\\Common-Credentials\\top-passwords-shortlist.txt
    ${sl}\\Passwords\\Common-Credentials\\darkweb2017_top-10000.txt
    ${sl}\\Passwords\\Common-Credentials\\500-worst-passwords.txt
    ${sl}\\Passwords\\darkc0de.txt
    ${sl}\\Passwords\\corporate_passwords.txt

  Passwords — Leaked Databases:
    ${sl}\\Passwords\\Leaked-Databases\\000webhost.txt
    ${sl}\\Passwords\\Leaked-Databases\\hotmail.txt
    ${sl}\\Passwords\\Leaked-Databases\\alleged-gmail-passwords.txt

  Usernames:
    ${sl}\\Usernames\\top-usernames-shortlist.txt
    ${sl}\\Usernames\\cirt-default-usernames.txt
    ${sl}\\Usernames\\xato-net-10-million-usernames.txt
    ${sl}\\Usernames\\Names\\names.txt

  DNS / Subdomain enumeration:
    ${sl}\\Discovery\\DNS\\subdomains-top1million-5000.txt
    ${sl}\\Discovery\\DNS\\subdomains-top1million-20000.txt
    ${sl}\\Discovery\\DNS\\subdomains-top1million-110000.txt
    ${sl}\\Discovery\\DNS\\namelist.txt
    ${sl}\\Discovery\\DNS\\bitquark-subdomains-top100000.txt
    ${sl}\\Discovery\\DNS\\dns-Jhaddix.txt

  Web Content Discovery (gobuster/ffuf dir mode):
    ${sl}\\Discovery\\Web-Content\\common.txt
    ${sl}\\Discovery\\Web-Content\\directory-list-2.3-small.txt
    ${sl}\\Discovery\\Web-Content\\directory-list-2.3-medium.txt
    ${sl}\\Discovery\\Web-Content\\big.txt
    ${sl}\\Discovery\\Web-Content\\raft-medium-directories.txt
    ${sl}\\Discovery\\Web-Content\\raft-large-directories.txt
    ${sl}\\Discovery\\Web-Content\\quickhits.txt

  Fuzzing:
    ${sl}\\Fuzzing\\big-list-of-naughty-strings.txt
    ${sl}\\Fuzzing\\command-injection-commix.txt
    ${sl}\\Fuzzing\\Databases\\SQLi\\Generic-SQLi.txt
    ${sl}\\Fuzzing\\Databases\\SQLi\\Generic-BlindSQLi.fuzzdb.txt
    ${sl}\\Fuzzing\\XSS\\XSS-Jhaddix.txt
    ${sl}\\Fuzzing\\LDAP.Fuzzing.txt
    ${sl}\\Fuzzing\\XXE-Fuzzing.txt
    ${sl}\\Fuzzing\\extensions-most-common.fuzz.txt

  Tools on this system:
    ffuf:       wsl ffuf  (source at ${htbBase}\\ffuf — use WSL binary)
    gobuster:   wsl gobuster  (source at ${htbBase}\\gobuster — use WSL binary)
    Nmap:       nmap  (C:\\Program Files (x86)\\Nmap\\nmap.exe or in PATH)
    Hydra:      wsl hydra
    John:       wsl john
    Hashcat:    wsl hashcat  (or hashcat.exe if installed natively)
    SQLMap:     wsl sqlmap
    Netcat:     ncat  (or wsl nc)
    Metasploit: wsl msfconsole
    Cookies:    ${htbBase}\\cookies.txt  (pre-saved session cookies)

Rules:
- Use correct Windows CMD or PowerShell syntax (backslash paths, double-quoted strings)
- For security tools, prefer "wsl <tool>" — ffuf and gobuster are Go source repos, so WSL binary is required
- Replace placeholder targets with realistic CTF/HTB examples (10.10.10.X, 10.129.X.X, target.htb)
- Always use the EXACT confirmed paths above for wordlist arguments — do NOT invent paths
- desc must be 1–2 short plain-English sentences (max 120 chars)
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
