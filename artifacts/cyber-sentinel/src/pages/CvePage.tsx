import React, { useState } from 'react';
import { Bug, Search, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react';

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: 'text-red-400 border-red-500/40 bg-red-950/20',
  HIGH: 'text-orange-400 border-orange-500/40 bg-orange-950/20',
  MEDIUM: 'text-yellow-400 border-yellow-500/40 bg-yellow-950/20',
  LOW: 'text-green-400 border-green-500/40 bg-green-950/20',
  NONE: 'text-muted-foreground border-border',
};

export default function CvePage() {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  async function search() {
    const query = q.trim();
    if (!query) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await fetch(`/api/cve/search?q=${encodeURIComponent(query)}`);
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? 'Search failed'); return; }
      setResult(data);
    } catch (err: any) {
      setError(err.message ?? 'Network error');
    } finally { setLoading(false); }
  }

  const QUICK = ['log4j', 'openssl', 'apache struts', 'spring4shell', 'heartbleed', 'shellshock', 'eternal blue'];

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 font-mono">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-primary"><Bug size={22} /> CVE Search</h1>
          <p className="text-muted-foreground text-xs">Search the NVD (National Vulnerability Database) for CVEs by software name or keyword.</p>
        </header>

        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-card border border-border rounded px-3 py-2 focus-within:border-primary/50 transition-colors">
              <Search size={14} className="text-muted-foreground shrink-0" />
              <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()}
                placeholder="Search CVEs… e.g. openssl, log4j, apache"
                className="bg-transparent flex-1 text-sm text-primary font-mono outline-none placeholder:text-muted-foreground/40" />
            </div>
            <button onClick={search} disabled={loading || !q.trim()}
              className="px-4 py-2 bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary text-xs rounded transition-colors disabled:opacity-50 flex items-center gap-2">
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
              Search
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            <span className="text-[10px] text-muted-foreground self-center mr-1">Quick:</span>
            {QUICK.map(k => (
              <button key={k} onClick={() => { setQ(k); }}
                className="text-[10px] px-2 py-0.5 border border-border rounded text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors">
                {k}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="flex items-center gap-2 text-red-400 text-xs border border-red-500/30 bg-red-950/20 rounded px-4 py-3"><AlertTriangle size={14} />{error}</div>}

        {result && (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">{result.total.toLocaleString()} total results · showing {result.items.length}</div>
            {result.items.map((cve: any) => (
              <div key={cve.id} className="bg-card/50 border border-border rounded-lg p-4 space-y-3 hover:border-border/80 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <a href={`https://nvd.nist.gov/vuln/detail/${cve.id}`} target="_blank" rel="noopener noreferrer"
                      className="text-primary font-bold text-sm hover:underline flex items-center gap-1">
                      {cve.id} <ExternalLink size={11} />
                    </a>
                    {cve.severity && (
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-bold tracking-widest ${SEVERITY_COLOR[cve.severity] ?? SEVERITY_COLOR.NONE}`}>
                        {cve.severity}
                      </span>
                    )}
                    {cve.score != null && (
                      <span className="text-[10px] text-muted-foreground">CVSS {cve.score}</span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground shrink-0">
                    {cve.published ? new Date(cve.published).toLocaleDateString() : ''}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{cve.description}</p>
                {cve.vector && <code className="text-[10px] text-primary/60 bg-black/30 px-2 py-0.5 rounded">{cve.vector}</code>}
                {cve.references.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {cve.references.map((ref: string) => (
                      <a key={ref} href={ref} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-primary/60 hover:text-primary hover:underline flex items-center gap-0.5">
                        ref <ExternalLink size={9} />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
