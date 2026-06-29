import React, { useState } from 'react';
import { Search, Copy, Check, ExternalLink, Plus, Trash2 } from 'lucide-react';

const DORK_TEMPLATES = [
  { label: 'Login Pages', dork: 'site:{DOMAIN} inurl:login' },
  { label: 'Admin Panels', dork: 'site:{DOMAIN} inurl:admin' },
  { label: 'Config Files', dork: 'site:{DOMAIN} ext:xml | ext:conf | ext:cnf | ext:config' },
  { label: 'Env Files', dork: 'site:{DOMAIN} ext:env | inurl:.env' },
  { label: 'Exposed Git', dork: 'site:{DOMAIN} inurl:"/.git"' },
  { label: 'SQL Backups', dork: 'site:{DOMAIN} ext:sql | ext:db | ext:bak' },
  { label: 'Log Files', dork: 'site:{DOMAIN} ext:log' },
  { label: 'PDF Documents', dork: 'site:{DOMAIN} ext:pdf' },
  { label: 'Excel Sheets', dork: 'site:{DOMAIN} ext:xls | ext:xlsx' },
  { label: 'Password Files', dork: 'inurl:password ext:txt | ext:log | ext:cfg' },
  { label: 'Exposed phpMyAdmin', dork: 'inurl:phpmyadmin' },
  { label: 'Webcams', dork: 'intitle:"webcamXP 5"' },
  { label: 'Open FTP', dork: 'intitle:"index of" ftp' },
  { label: 'Directory Listing', dork: 'intitle:"index of" site:{DOMAIN}' },
  { label: 'API Keys in Code', dork: 'site:github.com "{DOMAIN}" "api_key" OR "apikey" OR "secret"' },
];

const OPERATORS = [
  { op: 'site:', desc: 'Limit to specific domain' },
  { op: 'inurl:', desc: 'URL must contain keyword' },
  { op: 'intitle:', desc: 'Page title must contain' },
  { op: 'intext:', desc: 'Page body must contain' },
  { op: 'filetype:', desc: 'Specific file type' },
  { op: 'ext:', desc: 'File extension' },
  { op: 'cache:', desc: 'Google cached version' },
  { op: 'link:', desc: 'Pages linking to URL' },
  { op: 'related:', desc: 'Similar websites' },
  { op: 'info:', desc: 'Page information' },
  { op: '"..."', desc: 'Exact phrase match' },
  { op: '-keyword', desc: 'Exclude keyword' },
  { op: 'OR', desc: 'Either term' },
  { op: 'AND', desc: 'Both terms (default)' },
  { op: '*', desc: 'Wildcard' },
  { op: '..', desc: 'Number range (1..100)' },
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

export default function DorkBuilder() {
  const [domain, setDomain] = useState('example.com');
  const [clauses, setClauses] = useState<Clause[]>([{ op: 'site:', value: '' }, { op: 'inurl:', value: '' }]);

  const query = clauses.map(c => c.value.trim() ? `${c.op}${c.value.trim()}` : '').filter(Boolean).join(' ').trim();
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

  function addClause() { setClauses(prev => [...prev, { op: 'site:', value: '' }]); }
  function removeClause(i: number) { setClauses(prev => prev.filter((_, idx) => idx !== i)); }
  function updateClause(i: number, field: keyof Clause, val: string) {
    setClauses(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: val } : c));
  }
  function loadTemplate(dork: string) {
    const filled = dork.replace('{DOMAIN}', domain);
    const parts = filled.match(/\S+:\S*|\S+/g) ?? [];
    const parsed: Clause[] = parts.map(p => {
      const m = p.match(/^([a-z]+:|")(.*)$/);
      if (m) return { op: m[1], value: m[2] };
      return { op: '', value: p };
    });
    setClauses(parsed.length ? parsed : [{ op: '', value: filled }]);
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 font-mono">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-primary"><Search size={22} /> Google Dork Builder</h1>
          <p className="text-muted-foreground text-xs">Build targeted Google search operators for OSINT and recon.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2 bg-card border border-border rounded px-3 py-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Target Domain</span>
              <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="example.com"
                className="bg-transparent text-primary text-sm flex-1 outline-none font-mono" />
            </div>

            <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b border-border bg-black/20 text-xs font-bold text-primary tracking-widest uppercase">Query Builder</div>
              <div className="p-4 space-y-2">
                {clauses.map((c, i) => (
                  <div key={i} className="flex gap-2">
                    <select value={c.op} onChange={e => updateClause(i, 'op', e.target.value)}
                      className="bg-black/50 border border-border rounded px-2 py-1.5 text-xs text-primary font-mono outline-none focus:border-primary/50">
                      <option value="">raw</option>
                      {OPERATORS.filter(o => o.op !== '"..."' && o.op !== '-keyword' && o.op !== 'OR' && o.op !== 'AND' && o.op !== '*' && o.op !== '..').map(o => (
                        <option key={o.op} value={o.op}>{o.op}</option>
                      ))}
                    </select>
                    <input value={c.value} onChange={e => updateClause(i, 'value', e.target.value)} placeholder="value"
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
                <code className="text-sm text-primary break-all">{query}</code>
                <a href={searchUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary border border-primary/30 hover:border-primary/60 px-3 py-1.5 rounded transition-colors">
                  <ExternalLink size={12} /> Search on Google
                </a>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b border-border bg-black/20 text-xs font-bold text-primary tracking-widest uppercase">Templates</div>
              <div className="divide-y divide-border/50 max-h-64 overflow-y-auto">
                {DORK_TEMPLATES.map(t => (
                  <div key={t.label} className="flex items-center justify-between px-3 py-2 hover:bg-secondary/20 transition-colors">
                    <span className="text-xs text-foreground">{t.label}</span>
                    <button onClick={() => loadTemplate(t.dork)} className="text-[10px] text-primary/60 hover:text-primary tracking-wider">load</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b border-border bg-black/20 text-xs font-bold text-primary tracking-widest uppercase">Operators</div>
              <div className="p-3 space-y-1">
                {OPERATORS.map(o => (
                  <div key={o.op} className="flex items-start gap-2 text-xs">
                    <code className="text-primary shrink-0 w-20">{o.op}</code>
                    <span className="text-muted-foreground">{o.desc}</span>
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
