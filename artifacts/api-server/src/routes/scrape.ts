import { Router } from 'express';
import * as cheerio from 'cheerio';

const router = Router();

const SECURITY_TOOLS: Record<string, string[]> = {
  nmap: ['nmap', 'network mapper'],
  masscan: ['masscan'],
  gobuster: ['gobuster'],
  ffuf: ['ffuf', 'fuzz faster'],
  nikto: ['nikto'],
  sqlmap: ['sqlmap'],
  burpsuite: ['burpsuite', 'burp suite', 'burp proxy'],
  metasploit: ['metasploit', 'msfconsole', 'msfvenom'],
  hashcat: ['hashcat'],
  john: ['john the ripper', 'john '],
  hydra: ['hydra', 'thc-hydra'],
  wireshark: ['wireshark'],
  aircrack: ['aircrack', 'airmon'],
  impacket: ['impacket', 'psexec', 'secretsdump', 'wmiexec'],
  bloodhound: ['bloodhound', 'sharphound'],
  linpeas: ['linpeas', 'winpeas'],
  mimikatz: ['mimikatz'],
  netcat: ['netcat', 'nc -', 'ncat'],
  socat: ['socat'],
  chisel: ['chisel'],
  subfinder: ['subfinder'],
  amass: ['amass'],
  nuclei: ['nuclei'],
  feroxbuster: ['feroxbuster'],
  dirsearch: ['dirsearch'],
};

const TOOL_URLS: Record<string, string> = {
  nmap: 'https://nmap.org',
  masscan: 'https://github.com/robertdavidgraham/masscan',
  gobuster: 'https://github.com/OJ/gobuster',
  ffuf: 'https://github.com/ffuf/ffuf',
  nikto: 'https://github.com/sullo/nikto',
  sqlmap: 'https://sqlmap.org',
  burpsuite: 'https://portswigger.net/burp',
  metasploit: 'https://www.metasploit.com',
  hashcat: 'https://hashcat.net',
  john: 'https://www.openwall.com/john',
  hydra: 'https://github.com/vanhauser-thc/thc-hydra',
  wireshark: 'https://www.wireshark.org',
  aircrack: 'https://www.aircrack-ng.org',
  impacket: 'https://github.com/fortra/impacket',
  bloodhound: 'https://github.com/BloodHoundAD/BloodHound',
  linpeas: 'https://github.com/peass-ng/PEASS-ng',
  mimikatz: 'https://github.com/gentilkiwi/mimikatz',
  netcat: 'https://netcat.sourceforge.net',
  socat: 'https://github.com/craSH/socat',
  chisel: 'https://github.com/jpillora/chisel',
  subfinder: 'https://github.com/projectdiscovery/subfinder',
  amass: 'https://github.com/owasp-amass/amass',
  nuclei: 'https://github.com/projectdiscovery/nuclei',
  feroxbuster: 'https://github.com/epi052/feroxbuster',
  dirsearch: 'https://github.com/maurosoria/dirsearch',
};

export function detectToolsInText(text: string): Array<{ tool: string; url: string }> {
  const lower = text.toLowerCase();
  const found: Array<{ tool: string; url: string }> = [];
  const seen = new Set<string>();

  for (const [toolKey, aliases] of Object.entries(SECURITY_TOOLS)) {
    if (seen.has(toolKey)) continue;
    const mentioned = aliases.some(alias => lower.includes(alias.toLowerCase()));
    if (mentioned && TOOL_URLS[toolKey]) {
      found.push({ tool: toolKey, url: TOOL_URLS[toolKey] });
      seen.add(toolKey);
    }
  }
  return found;
}

router.post('/scrape/url', async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'url required' });
    return;
  }

  try {
    new URL(url);
  } catch {
    res.status(400).json({ error: 'Invalid URL' });
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CyberSentinel/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      res.status(502).json({ error: `Remote returned ${response.status}` });
      return;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    $('script, style, nav, footer, header, aside, .nav, .footer, .header, .sidebar, .menu, .advertisement, .ad').remove();

    const title = $('title').text().trim()
      || $('h1').first().text().trim()
      || new URL(url).hostname;

    const metaDesc = $('meta[name="description"]').attr('content')
      || $('meta[property="og:description"]').attr('content')
      || '';

    const mainContent = $('article, main, .content, .post, .entry, #content, #main').first();
    const contentEl = mainContent.length ? mainContent : $('body');

    const rawText = contentEl.text().replace(/\s+/g, ' ').trim();
    const content = rawText.slice(0, 8000);

    const suggestedTags: string[] = [];
    const lowerContent = content.toLowerCase();

    const tagKeywords: Record<string, string[]> = {
      nmap: ['nmap', 'port scan'],
      recon: ['reconnaissance', 'recon', 'enumeration'],
      web: ['web application', 'http', 'https', 'webapp'],
      exploitation: ['exploit', 'payload', 'reverse shell', 'rce'],
      'post-exploitation': ['privilege escalation', 'privesc', 'lateral movement'],
      password: ['hashcat', 'john', 'password crack', 'brute force'],
      network: ['network', 'subnet', 'routing', 'firewall'],
      ctf: ['ctf', 'capture the flag', 'hackthebox', 'tryhackme', 'htb', 'thm'],
      'active-directory': ['active directory', 'kerberoast', 'bloodhound', 'ldap'],
      linux: ['linux', 'bash', 'shell'],
      windows: ['windows', 'powershell', 'cmd.exe'],
    };

    for (const [tag, keywords] of Object.entries(tagKeywords)) {
      if (keywords.some(k => lowerContent.includes(k))) suggestedTags.push(tag);
    }

    res.json({
      title: title.slice(0, 200),
      content: metaDesc ? `${metaDesc}\n\n${content}` : content,
      suggestedTags: suggestedTags.slice(0, 8),
      wordCount: content.split(/\s+/).length,
    });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      res.status(504).json({ error: 'Request timed out (10s)' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

export default router;
