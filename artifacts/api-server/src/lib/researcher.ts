/**
 * Autonomous research pipeline.
 * Scrapes a curated pool of security resource URLs, runs AI analysis,
 * and saves new knowledge entries / tool references / commands into the
 * "general" category automatically.
 */
import * as cheerio from 'cheerio';
import connectToDatabase from './mongodb';
import Knowledge from './models/Knowledge';
import Tool from './models/Tool';
import Command from './models/Command';
import { getBestJsonAnswer } from './multi-ai';

// ── Curated security-resource pool ────────────────────────────────────────────
export const RESEARCH_SOURCES = [
  { url: 'https://gtfobins.github.io/', topic: 'linux-gtfobins', tags: ['linux', 'privilege-escalation', 'gtfobins'] },
  { url: 'https://lolbas-project.github.io/', topic: 'windows-lolbas', tags: ['windows', 'lolbas', 'post-exploitation'] },
  { url: 'https://owasp.org/www-community/attacks/', topic: 'owasp-web-attacks', tags: ['web', 'owasp', 'attacks'] },
  { url: 'https://portswigger.net/web-security/all-topics', topic: 'portswigger-web-security', tags: ['web', 'portswigger', 'burp'] },
  { url: 'https://pentestmonkey.net/cheat-sheet/shells/reverse-shell-cheat-sheet', topic: 'reverse-shell-cheatsheet', tags: ['shells', 'exploitation', 'reverse-shell'] },
  { url: 'https://cheatsheetseries.owasp.org/index.html', topic: 'owasp-cheatsheets', tags: ['owasp', 'web', 'cheatsheet'] },
  { url: 'https://highon.coffee/blog/penetration-testing-tools-cheat-sheet/', topic: 'pentest-tools-cheatsheet', tags: ['pentesting', 'cheatsheet', 'tools'] },
  { url: 'https://attack.mitre.org/tactics/enterprise/', topic: 'mitre-attack-enterprise', tags: ['mitre', 'attack', 'tactics', 'ttp'] },
  { url: 'https://swisskyrepo.github.io/PayloadsAllTheThings/', topic: 'payloads-all-things', tags: ['payloads', 'web', 'exploitation'] },
  { url: 'https://overthewire.org/wargames/', topic: 'overthewire-wargames', tags: ['ctf', 'wargames', 'linux'] },
  { url: 'https://www.hackingarticles.in/', topic: 'hacking-articles', tags: ['pentesting', 'tutorials'] },
  { url: 'https://www.kali.org/tools/', topic: 'kali-tools', tags: ['kali', 'tools', 'pentesting'] },
  { url: 'https://www.exploit-db.com/docs', topic: 'exploit-db-docs', tags: ['exploits', 'vulnerability', 'research'] },
  { url: 'https://book.hacktricks.xyz/welcome/readme', topic: 'hacktricks', tags: ['hacktricks', 'pentesting', 'ctf'] },
  { url: 'https://ired.team/', topic: 'ired-team-blog', tags: ['red-team', 'active-directory', 'offensive'] },
];

/** How many sources to process per research run */
const SOURCES_PER_RUN = 3;

// ── Helpers ───────────────────────────────────────────────────────────────────
function canonicalSlug(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function buildResearchPrompt(sourceTitle: string, content: string): string {
  let excerpt = content;
  if (content.length > 8000) {
    excerpt = content.slice(0, 5000) + '\n\n[... middle omitted ...]\n\n' + content.slice(-3000);
  }
  return (
    'You are a cybersecurity knowledge base assistant reading a security resource website.\n\n' +
    'SOURCE: ' + sourceTitle + '\n' +
    'CONTENT:\n' + excerpt + '\n\n' +
    'Extract ALL security-relevant knowledge. Respond ONLY with valid JSON, no markdown wrapper:\n\n' +
    '{\n' +
    '  "tags": ["lowercase-tag"],\n' +
    '  "tools": [{\n' +
    '    "name": "ToolName",\n' +
    '    "slug": "tool-name",\n' +
    '    "category": "recon|web|password|exploitation|post-exploitation|network|forensics|crypto|reversing|osint|general|other",\n' +
    '    "description": "1-2 plain-English sentences about what this tool does.",\n' +
    '    "cheatsheet": "Markdown with:\\n## What it does\\n## Typical usage scenario\\n## Examples (code block with 3-5 practical examples)\\n## Key flags/options",\n' +
    '    "officialUrl": "URL from the text or null"\n' +
    '  }],\n' +
    '  "commands": [{\n' +
    '    "title": "Short action description",\n' +
    '    "command": "exact command string",\n' +
    '    "description": "WHAT: plain English. WHEN: scenario. EXAMPLE: expected result.",\n' +
    '    "category": "recon|web|password|exploitation|post-exploitation|network|forensics|crypto|reversing|osint|general|other"\n' +
    '  }]\n' +
    '}\n\n' +
    'RULES:\n' +
    '- tags: 3-8 lowercase keywords describing the source topic\n' +
    '- tools: extract EVERY named tool, utility, website, service, or resource mentioned — do not skip web-based tools\n' +
    '- commands: extract every shell command or one-liner shown in the content; max 15\n' +
    '- Do NOT invent content not present in the source\n' +
    '- Return [] for tools or commands if genuinely none exist'
  );
}

// ── Scraper ───────────────────────────────────────────────────────────────────
async function scrapeUrl(url: string): Promise<{ title: string; content: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CyberSentinel-Research/1.0)',
          'Accept': 'text/html,application/xhtml+xml,*/*',
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) return null;

    const html = await response.text();
    if (html.length > 3 * 1024 * 1024) return null; // skip pages > 3 MB

    const $ = cheerio.load(html);
    $('script, style, nav, footer, header, aside, .nav, .footer, .header, .sidebar, .menu, .advertisement, .ad').remove();

    const title =
      $('title').text().trim() ||
      $('h1').first().text().trim() ||
      new URL(url).hostname;

    const mainContent = $('article, main, .content, .post, .entry, #content, #main').first();
    const contentEl = mainContent.length ? mainContent : $('body');

    // Code blocks
    const codeBlocks: string[] = [];
    const seenCode = new Set<string>();
    contentEl.find('pre, code').each((_i, el) => {
      if ($(el).is('code') && $(el).closest('pre').length) return;
      const code = $(el).text().trim();
      if (!code || code.length < 8 || code.length > 2000) return;
      const norm = code.replace(/\s+/g, ' ');
      if (!seenCode.has(norm)) { seenCode.add(norm); codeBlocks.push(code); }
    });

    // External links
    const baseHostname = new URL(url).hostname.replace(/^www\./, '');
    const extractedLinks: string[] = [];
    const seenHrefs = new Set<string>();
    contentEl.find('a[href]').each((_i, el) => {
      const href = $(el).attr('href') ?? '';
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      if (!text || text.length < 3 || text.length > 80) return;
      try {
        const abs = new URL(href, url).toString();
        if (!abs.startsWith('http')) return;
        const linkHost = new URL(abs).hostname.replace(/^www\./, '');
        if (linkHost === baseHostname || seenHrefs.has(abs)) return;
        seenHrefs.add(abs);
        extractedLinks.push(`- [${text}](${abs})`);
      } catch {}
    });

    const rawText = contentEl.text().replace(/\s+/g, ' ').trim().slice(0, 6000);
    const sections: string[] = [rawText];
    if (extractedLinks.length > 0)
      sections.push('## References\n' + extractedLinks.slice(0, 30).join('\n'));
    if (codeBlocks.length > 0)
      sections.push('## Commands & Code\n' + codeBlocks.slice(0, 20).map(c => '```\n' + c + '\n```').join('\n\n'));

    return { title: title.slice(0, 200), content: sections.join('\n\n') };
  } catch {
    return null;
  }
}

// ── Progress event shape ──────────────────────────────────────────────────────
export interface ResearchProgress {
  type: 'start' | 'source_start' | 'source_done' | 'source_error' | 'done';
  total?: number;
  current?: number;
  sourceUrl?: string;
  sourceTitle?: string;
  toolsAdded?: number;
  commandsAdded?: number;
  kbCreated?: number;
  error?: string;
  summary?: { sources: number; kb: number; tools: number; commands: number };
}

// ── Concurrency lock — prevents scheduler + manual from running simultaneously ─
let researchRunning = false;
export const isResearchRunning = () => researchRunning;

// ── Main pipeline ─────────────────────────────────────────────────────────────
export async function runResearch(
  onProgress: (p: ResearchProgress) => void,
  sourcesToUse?: Array<{ url: string; topic: string; tags: string[] }>,
): Promise<{ kb: number; tools: number; commands: number }> {
  if (researchRunning) {
    throw new Error('A research run is already in progress. Please wait for it to finish.');
  }
  researchRunning = true;

  try {
  await connectToDatabase();

  const sources = sourcesToUse ?? await pickSources();
  onProgress({ type: 'start', total: sources.length });

  let totalKb = 0;
  let totalTools = 0;
  let totalCommands = 0;

  for (let i = 0; i < sources.length; i++) {
    const src = sources[i];
    onProgress({ type: 'source_start', current: i + 1, total: sources.length, sourceUrl: src.url });

    try {
      const scraped = await scrapeUrl(src.url);
      if (!scraped) {
        onProgress({ type: 'source_error', sourceUrl: src.url, error: 'Failed to scrape URL (timeout or non-200 response)' });
        continue;
      }

      onProgress({ type: 'source_start', current: i + 1, total: sources.length, sourceUrl: src.url, sourceTitle: scraped.title });

      // Skip if we already have a very recent entry for this source (< 12 h)
      const recentCutoff = new Date(Date.now() - 12 * 60 * 60 * 1000);
      const existing = await Knowledge.findOne({
        sources: src.url,
        category: 'general',
        createdAt: { $gte: recentCutoff },
      }).lean();

      let kbId: string;
      let kbWasCreated = 0;
      if (existing) {
        kbId = (existing._id as any).toString();
      } else {
        const kbEntry = await Knowledge.create({
          title: scraped.title,
          content: scraped.content,
          category: 'general',
          tags: src.tags,
          sources: [src.url],
        });
        kbId = kbEntry._id.toString();
        totalKb++;
        kbWasCreated = 1;
      }

      // Run AI analysis
      let parsed: { tags: string[]; tools: any[]; commands: any[] };
      try {
        const jsonStr = await getBestJsonAnswer(
          buildResearchPrompt(scraped.title, scraped.content),
          (p: any) => Array.isArray(p.tags),
        );
        parsed = JSON.parse(jsonStr);
      } catch {
        onProgress({ type: 'source_error', sourceUrl: src.url, error: 'AI analysis failed or returned invalid JSON' });
        continue;
      }

      // Merge tags
      if ((parsed.tags ?? []).length > 0) {
        const merged = Array.from(new Set([
          ...src.tags,
          ...parsed.tags.map((t: string) => t.toLowerCase().trim()).filter(Boolean),
        ]));
        await Knowledge.findByIdAndUpdate(kbId, { $set: { tags: merged } });
      }

      // Save new tools
      let toolsAdded = 0;
      for (const tool of (parsed.tools ?? [])) {
        if (!tool.name || !tool.slug || !tool.cheatsheet) continue;
        const slug = canonicalSlug(tool.slug);
        const existingTool = await Tool.findOne({ slug });
        if (!existingTool) {
          await Tool.create({
            name: tool.name,
            slug,
            category: tool.category ?? 'general',
            description: tool.description ?? '',
            cheatsheet: tool.cheatsheet,
            officialUrl: tool.officialUrl ?? null,
          });
          toolsAdded++;
          totalTools++;
        }
      }

      // Save new commands
      let commandsAdded = 0;
      for (const cmd of (parsed.commands ?? [])) {
        if (!cmd.title || !cmd.command) continue;
        const normalised = cmd.command.trim().replace(/\s+/g, ' ');
        const escapedCmd = normalised.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const existingCmd = await Command.findOne({
          command: { $regex: '^' + escapedCmd + '$', $options: 'i' },
        });
        if (!existingCmd) {
          await Command.create({
            title: cmd.title,
            command: normalised,
            description: cmd.description ?? null,
            category: cmd.category ?? 'general',
          });
          commandsAdded++;
          totalCommands++;
        }
      }

      onProgress({
        type: 'source_done',
        sourceUrl: src.url,
        sourceTitle: scraped.title,
        toolsAdded,
        commandsAdded,
        kbCreated: kbWasCreated,
      });

      // Polite inter-source delay
      await new Promise(r => setTimeout(r, 2500));
    } catch (err: any) {
      onProgress({ type: 'source_error', sourceUrl: src.url, error: err.message });
    }
  }

  const summary = { sources: sources.length, kb: totalKb, tools: totalTools, commands: totalCommands };
  onProgress({ type: 'done', summary });
  return { kb: totalKb, tools: totalTools, commands: totalCommands };
  } finally {
    researchRunning = false;
  }
}

// ── Source rotation ───────────────────────────────────────────────────────────
async function pickSources(): Promise<Array<{ url: string; topic: string; tags: string[] }>> {
  // Exclude sources checked in the last 6 hours
  const recentCutoff = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const recentEntries = await Knowledge.find(
    { category: 'general', createdAt: { $gte: recentCutoff } },
    { sources: 1 },
  ).lean();
  const recentUrls = new Set(recentEntries.flatMap(e => e.sources ?? []));

  const fresh = RESEARCH_SOURCES.filter(s => !recentUrls.has(s.url));
  const pool = fresh.length >= SOURCES_PER_RUN ? fresh : RESEARCH_SOURCES;

  // Shuffle
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, SOURCES_PER_RUN);
}
