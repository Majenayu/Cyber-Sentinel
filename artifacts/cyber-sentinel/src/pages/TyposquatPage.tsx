import React, { useState, useMemo } from 'react';
import { AlertTriangle, Copy, Check, Search } from 'lucide-react';

function generateTyposquats(domain: string): string[] {
  const [name, ...tldParts] = domain.split('.');
  const tld = tldParts.join('.');
  const results = new Set<string>();

  const ADJACENT: Record<string, string[]> = {
    a:['q','w','s','z'], b:['v','g','h','n'], c:['x','d','f','v'], d:['s','e','r','f','c','x'],
    e:['w','s','d','r'], f:['r','d','g','t','c','v'], g:['t','f','h','y','v','b'], h:['y','g','j','u','b','n'],
    i:['u','o','k','j'], j:['u','i','k','m','h','n'], k:['i','o','l','j','m'], l:['o','p','k'],
    m:['n','j','k'], n:['b','h','j','m'], o:['i','p','l','k'], p:['o','l'],
    q:['w','a'], r:['e','f','t','d'], s:['a','w','d','x','z','e'], t:['r','g','y','f','h'],
    u:['y','i','h','j'], v:['c','f','g','b'], w:['q','s','e','a'], x:['z','s','d','c'],
    y:['t','h','u','g'], z:['a','s','x'],
  };

  // Omission (drop each char)
  for (let i = 0; i < name.length; i++) {
    const t = name.slice(0, i) + name.slice(i + 1);
    if (t.length >= 2) results.add(`${t}.${tld}`);
  }

  // Addition (double each char)
  for (let i = 0; i < name.length; i++) {
    const t = name.slice(0, i) + name[i] + name[i] + name.slice(i + 1);
    results.add(`${t}.${tld}`);
  }

  // Substitution (swap adjacent keys)
  for (let i = 0; i < name.length; i++) {
    const ch = name[i].toLowerCase();
    for (const adj of ADJACENT[ch] ?? []) {
      const t = name.slice(0, i) + adj + name.slice(i + 1);
      results.add(`${t}.${tld}`);
    }
  }

  // Transposition (swap adjacent chars)
  for (let i = 0; i < name.length - 1; i++) {
    const t = name.slice(0, i) + name[i + 1] + name[i] + name.slice(i + 2);
    results.add(`${t}.${tld}`);
  }

  // Common TLD variations
  const COMMON_TLDS = ['com', 'net', 'org', 'io', 'co', 'info', 'biz', 'app'];
  for (const alt of COMMON_TLDS) {
    if (alt !== tld) results.add(`${name}.${alt}`);
  }

  // Hyphen insertions
  for (let i = 1; i < name.length; i++) {
    results.add(`${name.slice(0, i)}-${name.slice(i)}.${tld}`);
  }

  // Common prefix/suffix variations
  for (const pre of ['my', 'the', 'get', 'go', 'www']) {
    results.add(`${pre}${name}.${tld}`);
    results.add(`${pre}-${name}.${tld}`);
  }
  for (const suf of ['app', 'hq', 'hub', 'io', 'web', 'online', 'secure', 'login', 'support']) {
    results.add(`${name}${suf}.${tld}`);
    results.add(`${name}-${suf}.${tld}`);
  }

  // Homoglyphs
  const HOMO: Record<string, string> = { a:'@', e:'3', i:'1', l:'1', o:'0', s:'5', t:'7', b:'6' };
  for (let i = 0; i < name.length; i++) {
    const ch = name[i].toLowerCase();
    if (HOMO[ch]) {
      const t = name.slice(0, i) + HOMO[ch] + name.slice(i + 1);
      results.add(`${t}.${tld}`);
    }
  }

  results.delete(domain);
  return [...results].sort();
}

function CopyBtn({ text }: { text: string }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 1200); }}
      className="p-1 text-muted-foreground hover:text-primary transition-colors">
      {c ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
    </button>
  );
}

export default function TyposquatPage() {
  const [domain, setDomain] = useState('');
  const [filter, setFilter] = useState('');
  const [generated, setGenerated] = useState<string[]>([]);

  function generate() {
    const d = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!d || !d.includes('.')) return;
    setGenerated(generateTyposquats(d));
  }

  const displayed = useMemo(() =>
    generated.filter(d => !filter || d.includes(filter.toLowerCase())),
    [generated, filter]
  );

  function copyAll() {
    navigator.clipboard.writeText(displayed.join('\n'));
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 font-mono">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-primary"><AlertTriangle size={22} /> Typosquat Generator</h1>
          <p className="text-muted-foreground text-xs">Generate all typosquat variations of a domain that attackers might register to impersonate you.</p>
        </header>

        <div className="flex gap-2">
          <input value={domain} onChange={e => setDomain(e.target.value)} onKeyDown={e => e.key === 'Enter' && generate()}
            placeholder="example.com"
            className="flex-1 bg-card border border-border rounded px-3 py-2 text-sm text-primary font-mono outline-none focus:border-primary/50 placeholder:text-muted-foreground/40" />
          <button onClick={generate} disabled={!domain.trim() || !domain.includes('.')}
            className="px-4 py-2 bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary text-xs rounded transition-colors disabled:opacity-50">
            Generate
          </button>
        </div>

        {generated.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-card border border-border rounded px-3 py-1.5 flex-1">
                <Search size={12} className="text-muted-foreground" />
                <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter…"
                  className="bg-transparent text-xs outline-none w-full text-primary font-mono" />
              </div>
              <span className="text-xs text-muted-foreground shrink-0">{displayed.length} variants</span>
              <button onClick={copyAll} className="text-xs text-primary/60 hover:text-primary border border-border hover:border-primary/40 px-2 py-1 rounded transition-colors">
                Copy All
              </button>
            </div>

            <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0 divide-y divide-border/30">
                {displayed.map(d => (
                  <div key={d} className="flex items-center justify-between px-3 py-1.5 hover:bg-secondary/20 transition-colors group">
                    <span className="text-xs text-primary font-mono truncate">{d}</span>
                    <CopyBtn text={d} />
                  </div>
                ))}
              </div>
            </div>

            <div className="text-xs text-muted-foreground/60">
              Check which variants are registered using WHOIS in the Recon tab.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
