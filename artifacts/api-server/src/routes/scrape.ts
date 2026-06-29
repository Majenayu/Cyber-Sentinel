import { Router } from 'express';
import * as cheerio from 'cheerio';
import { promises as dns } from 'dns';
import { isIPv4, isIPv6 } from 'net';

const router = Router();

const PRIVATE_IPv4_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /^::$/,
  /^100\.(6[4-9]|[7-9]\d|1([01]\d|2[0-7]))\./,
  /^198\.(1[89])\./,
  /^192\.0\.0\./,
  /^192\.0\.2\./,
  /^198\.51\.100\./,
  /^203\.0\.113\./,
  /^(22[4-9]|23\d|24\d|25[0-5])\./,
];

const ALLOWED_SCHEMES = ['http:', 'https:'];
const ALLOWED_PORTS = [80, 443, 8080, 8443, 3000, 4000, 5000];

async function isPrivateOrReserved(hostname: string): Promise<boolean> {
  if (isIPv4(hostname) || isIPv6(hostname)) {
    return PRIVATE_IPv4_RANGES.some(r => r.test(hostname));
  }
  try {
    const { address } = await dns.lookup(hostname, { family: 4 });
    return PRIVATE_IPv4_RANGES.some(r => r.test(address));
  } catch {
    return true;
  }
}

async function validateScrapeUrl(rawUrl: string): Promise<{ ok: true; parsed: URL } | { ok: false; error: string }> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, error: 'Invalid URL' };
  }

  if (!ALLOWED_SCHEMES.includes(parsed.protocol)) {
    return { ok: false, error: 'Only http and https URLs are allowed' };
  }

  const port = parsed.port ? parseInt(parsed.port, 10) : parsed.protocol === 'https:' ? 443 : 80;
  if (parsed.port && !ALLOWED_PORTS.includes(port)) {
    return { ok: false, error: `Port ${port} is not allowed` };
  }

  const hostname = parsed.hostname.replace(/\[|\]/g, '');
  if (await isPrivateOrReserved(hostname)) {
    return { ok: false, error: 'URL resolves to a private or reserved address' };
  }

  return { ok: true, parsed };
}

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

  const validation = await validateScrapeUrl(url);
  if (!validation.ok) {
    res.status(400).json({ error: validation.error });
    return;
  }

  try {
    // Follow redirects manually so each hop is validated against SSRF rules
    let currentUrl = validation.parsed.toString();
    let response!: Response;
    const MAX_REDIRECTS = 5;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        response = await fetch(currentUrl, {
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; CyberSentinel/1.0)',
            'Accept': 'text/html,application/xhtml+xml',
          },
        });
      } finally {
        clearTimeout(timeout);
      }

      // Not a redirect — proceed with this response
      if (response.status < 300 || response.status >= 400) break;

      const location = response.headers.get('Location');
      if (!location) break; // no Location header, use what we have

      // Resolve potentially-relative redirect URL and validate before following
      const nextUrl = new URL(location, currentUrl).toString();
      const nextValidation = await validateScrapeUrl(nextUrl);
      if (!nextValidation.ok) {
        res.status(400).json({ error: `Redirect blocked: ${nextValidation.error}` });
        return;
      }
      currentUrl = nextUrl;

      if (hop === MAX_REDIRECTS) {
        res.status(400).json({ error: 'Too many redirects' });
        return;
      }
    }

    if (!response.ok) {
      res.status(502).json({ error: `Remote returned ${response.status}` });
      return;
    }

    // Cap response size at 2 MB
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 2 * 1024 * 1024) {
      res.status(413).json({ error: 'Response too large (>2MB)' });
      return;
    }

    const html = await response.text();
    if (html.length > 2 * 1024 * 1024) {
      res.status(413).json({ error: 'Response too large (>2MB)' });
      return;
    }
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
