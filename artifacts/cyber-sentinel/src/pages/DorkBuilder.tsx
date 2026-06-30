import React, { useState } from 'react';
import { Search, Copy, Check, ExternalLink, Plus, Trash2, BookOpen, Lightbulb } from 'lucide-react';

const DORK_TEMPLATES = [
  { label: 'Login Pages', dork: 'site:{DOMAIN} inurl:login', desc: 'Find all login/sign-in pages on a target site' },
  { label: 'Admin Panels', dork: 'site:{DOMAIN} inurl:admin', desc: 'Discover admin dashboards or control panels' },
  { label: 'Config Files', dork: 'site:{DOMAIN} ext:xml | ext:conf | ext:cnf | ext:config', desc: 'Find exposed configuration files' },
  { label: 'Env Files', dork: 'site:{DOMAIN} ext:env | inurl:.env', desc: 'Look for exposed .env files with secrets' },
  { label: 'Exposed Git', dork: 'site:{DOMAIN} inurl:"/.git"', desc: 'Find exposed git repositories (source code)' },
  { label: 'SQL Backups', dork: 'site:{DOMAIN} ext:sql | ext:db | ext:bak', desc: 'Find database dump/backup files' },
  { label: 'Log Files', dork: 'site:{DOMAIN} ext:log', desc: 'Find exposed application log files' },
  { label: 'PDF Documents', dork: 'site:{DOMAIN} ext:pdf', desc: 'List all indexed PDF documents' },
  { label: 'Excel Sheets', dork: 'site:{DOMAIN} ext:xls | ext:xlsx', desc: 'Find exposed spreadsheets (may contain PII)' },
  { label: 'Password Files', dork: 'inurl:password ext:txt | ext:log | ext:cfg', desc: 'Find files that may contain passwords' },
  { label: 'phpMyAdmin', dork: 'inurl:phpmyadmin', desc: 'Find exposed phpMyAdmin database interfaces' },
  { label: 'Webcams', dork: 'intitle:"webcamXP 5"', desc: 'Discover publicly exposed webcam streams' },
  { label: 'Open FTP', dork: 'intitle:"index of" ftp', desc: 'Find publicly accessible FTP directories' },
  { label: 'Directory Listing', dork: 'intitle:"index of" site:{DOMAIN}', desc: 'Find open directory listings (file browsing)' },
  { label: 'API Keys in Code', dork: 'site:github.com "{DOMAIN}" "api_key" OR "apikey" OR "secret"', desc: 'Search GitHub for leaked API keys' },
  { label: 'WordPress Admin', dork: 'site:{DOMAIN} inurl:wp-admin', desc: 'Find WordPress admin login pages' },
  { label: 'Exposed API Docs', dork: 'site:{DOMAIN} inurl:swagger | inurl:api-docs | inurl:openapi', desc: 'Find Swagger/OpenAPI documentation' },
  { label: 'Error Pages', dork: 'site:{DOMAIN} intext:"SQL syntax" | intext:"Warning: mysql"', desc: 'Find pages leaking database errors' },
];

const REAL_EXAMPLES = [
  { label: 'Log4Shell related', dork: 'site:github.com "log4j" "jndi:ldap" 2021', desc: 'Search GitHub for Log4Shell PoCs' },
  { label: 'S3 buckets exposed', dork: 'site:s3.amazonaws.com "index of" filetype:pdf', desc: 'Find public AWS S3 buckets with PDFs' },
  { label: 'Shodan dork', dork: 'intitle:"Shodan Search" "country:US"', desc: 'Find Shodan search result pages' },
  { label: 'Cisco login', dork: 'intitle:"Cisco" inurl:login', desc: 'Find Cisco device login pages' },
  { label: 'WordPress vuln sites', dork: 'inurl:wp-content/uploads ext:php', desc: 'Find PHP files in WordPress upload dirs' },
];

const OPERATORS = [
  { op: 'site:', desc: 'Limit results to a specific domain (e.g. site:example.com)' },
  { op: 'inurl:', desc: 'URL must contain this word (e.g. inurl:admin)' },
  { op: 'intitle:', desc: 'Page title must contain this word (e.g. intitle:"index of")' },
  { op: 'intext:', desc: 'Page body text must contain this (e.g. intext:password)' },
  { op: 'filetype:', desc: 'Specific file type (e.g. filetype:pdf)' },
  { op: 'ext:', desc: 'File extension (e.g. ext:sql)' },
  { op: 'cache:', desc: 'View Google\'s cached version of a page' },
  { op: 'link:', desc: 'Pages that link to a specific URL' },
  { op: 'related:', desc: 'Websites similar to a given URL' },
  { op: '"..."', desc: 'Exact phrase match (e.g. "password" "admin")' },
  { op: '-keyword', desc: 'Exclude keyword from results (e.g. -wikipedia)' },
  { op: 'OR', desc: 'Either term — (login OR signin)' },
  { op: '*', desc: 'Wildcard — matches any word' },
  { op: '..', desc: 'Number range — e.g. 1..100' },
];

function CopyBtn({ text }: { text: string }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 1500); }}
      className="p-1 text-muted-foreground hover:text-primary transition-colors shrink-0">
      {c ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
    </button>
  );
}

type Clause = { op: string; value: string };

function buildQuery(clauses: Clause[]): string {
  return clauses.map(c => {
    const v = c.value.trim();
    if (!v) return '';
    if (c.op === 'raw') return v;
    return `${c.op}${v}`;
  }).filter(Boolean).join(' ').trim();
}

export default function DorkBuilder() {
  const [domain, setDomain] = useState('');
  const [clauses, setClauses] = useState<Clause[]>([
    { op: 'site:', value: '' },
    { op: 'inurl:', value: '' },
  ]);
  const [showExamples, setShowExamples] = useState(false);

  const query = buildQuery(clauses);
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

  function addClause() { setClauses(prev => [...prev, { op: 'site:', value: '' }]); }
  function removeClause(i: number) { setClauses(prev => prev.filter((_, idx) => idx !== i)); }
  function updateClause(i: number, field: keyof Clause, val: string) {
    setClauses(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: val } : c));
  }

  function loadTemplate(dork: string) {
    const filled = domain.trim() ? dork.replace(/\{DOMAIN\}/g, domain.trim()) : dork;
    setClauses([{ op: 'raw', value: filled }]);
  }

  function reset() {
    setClauses([{ op: 'site:', value: '' }, { op: 'inurl:', value: '' }]);
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 font-mono">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-primary"><Search size={22} /> Google Dork Builder</h1>
          <p className="text-muted-foreground text-xs">Build targeted Google search operators for OSINT and recon. Find exposed files, login pages, and sensitive data.</p>
        </header>

        <div className="flex items-start gap-3 px-4 py-3 rounded border border-primary/20 bg-primary/5 text-xs text-muted-foreground leading-relaxed">
          <BookOpen size={14} className="text-primary shrink-0 mt-0.5" />
          <div>
            <strong className="text-foreground">What are Google Dorks?</strong> Google supports special search operators that let you filter results precisely. Security researchers use these to find accidentally exposed files, login panels, database backups, and config files that were indexed by Google. For example: <code className="bg-black/30 px-1 rounded text-primary">site:example.com ext:sql</code> searches only example.com for .sql files. This is completely legal — you're just using Google's own features. Enter a target domain below, pick a template, and click "Search on Google".
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2 bg-card border border-border rounded px-3 py-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest shrink-0">Target Domain</span>
              <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="example.com (optional — used by templates)"
                className="bg-transparent text-primary text-sm flex-1 outline-none font-mono placeholder:text-muted-foreground/30" />
            </div>

            <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b border-border bg-black/20 text-xs font-bold text-primary tracking-widest uppercase flex items-center justify-between">
                Query Builder
                <button onClick={reset} className="text-[10px] text-muted-foreground hover:text-primary font-normal tracking-wider transition-colors">reset</button>
              </div>
              <div className="p-4 space-y-2">
                {clauses.map((c, i) => (
                  <div key={i} className="flex gap-2">
                    <select value={c.op} onChange={e => updateClause(i, 'op', e.target.value)}
                      className="bg-black/50 border border-border rounded px-2 py-1.5 text-xs text-primary font-mono outline-none focus:border-primary/50">
                      <option value="raw">raw text</option>
                      {OPERATORS.filter(o => !['\"...\"', '-keyword', 'OR', 'AND', '*', '..'].includes(o.op)).map(o => (
                        <option key={o.op} value={o.op}>{o.op}</option>
                      ))}
                    </select>
                    <input value={c.value} onChange={e => updateClause(i, 'value', e.target.value)}
                      placeholder={c.op === 'raw' ? 'full dork query or raw text' : 'value'}
                      className="flex-1 bg-black/50 border border-border rounded px-3 py-1.5 text-xs text-primary font-mono outline-none focus:border-primary/50" />
                    <button onClick={() => removeClause(i)} className="text-muted-foreground hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                <button onClick={addClause} className="flex items-center gap-1 text-xs text-primary/60 hover:text-primary transition-colors mt-1">
                  <Plus size={12} /> Add operator
                </button>
              </div>
            </div>

            {query && (
              <div className="bg-black/50 border border-primary/30 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-primary tracking-widest uppercase font-bold">Generated Query</span>
                  <CopyBtn text={query} />
                </div>
                <code className="text-sm text-primary break-all block">{query}</code>
                <a href={searchUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary border border-primary/30 hover:border-primary/60 px-3 py-1.5 rounded transition-colors hover:bg-primary/10">
                  <ExternalLink size={12} /> Search on Google
                </a>
              </div>
            )}

            <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
              <button onClick={() => setShowExamples(!showExamples)}
                className="w-full px-4 py-2.5 border-b border-border bg-black/20 text-xs font-bold text-primary tracking-widest uppercase flex items-center justify-between hover:bg-black/30 transition-colors">
                <span className="flex items-center gap-2"><Lightbulb size={13} /> Real-World Example Dorks</span>
                <span className="text-muted-foreground font-normal">{showExamples ? '▲ hide' : '▼ show'}</span>
              </button>
              {showExamples && (
                <div className="divide-y divide-border/50">
                  {REAL_EXAMPLES.map(ex => (
                    <div key={ex.label} className="px-4 py-3 flex items-start justify-between gap-3 hover:bg-secondary/10 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-foreground font-semibold mb-0.5">{ex.label}</div>
                        <code className="text-[11px] text-primary/80 break-all">{ex.dork}</code>
                        <div className="text-[10px] text-muted-foreground mt-1">{ex.desc}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <CopyBtn text={ex.dork} />
                        <a href={`https://www.google.com/search?q=${encodeURIComponent(ex.dork)}`} target="_blank" rel="noopener noreferrer"
                          className="p-1 text-muted-foreground hover:text-primary transition-colors">
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b border-border bg-black/20 text-xs font-bold text-primary tracking-widest uppercase">
                Templates {domain.trim() && <span className="font-normal text-muted-foreground">→ {domain}</span>}
              </div>
              <div className="divide-y divide-border/50 max-h-72 overflow-y-auto">
                {DORK_TEMPLATES.map(t => (
                  <div key={t.label} className="px-3 py-2 hover:bg-secondary/20 transition-colors">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-foreground font-semibold">{t.label}</span>
                      <div className="flex items-center gap-1">
                        <CopyBtn text={domain.trim() ? t.dork.replace(/\{DOMAIN\}/g, domain.trim()) : t.dork} />
                        <button onClick={() => loadTemplate(t.dork)} className="text-[10px] text-primary/60 hover:text-primary tracking-wider transition-colors">load</button>
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground">{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b border-border bg-black/20 text-xs font-bold text-primary tracking-widest uppercase">Operators Reference</div>
              <div className="p-3 space-y-1.5 max-h-60 overflow-y-auto">
                {OPERATORS.map(o => (
                  <div key={o.op} className="flex items-start gap-2 text-xs">
                    <code className="text-primary shrink-0 w-20 text-[11px]">{o.op}</code>
                    <span className="text-muted-foreground text-[11px]">{o.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
