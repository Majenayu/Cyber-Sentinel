import React, { useState } from 'react';
import { Users, Search, Loader2, CheckCircle, XCircle, HelpCircle, Link, AlertTriangle } from 'lucide-react';

export default function OsintPage() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'found' | 'notfound' | 'links'>('all');

  async function search() {
    const q = username.trim();
    if (!q) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await fetch(`/api/osint/username?q=${encodeURIComponent(q)}`);
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? 'Search failed'); return; }
      setResult(data);
    } catch (e: any) { setError(e.message ?? 'Error'); }
    finally { setLoading(false); }
  }

  const CAT_COLORS: Record<string, string> = {
    dev: 'text-blue-400', social: 'text-purple-400', professional: 'text-yellow-400',
    gaming: 'text-green-400', hacking: 'text-red-400', music: 'text-pink-400',
    creative: 'text-orange-400', messaging: 'text-cyan-400', blog: 'text-indigo-400',
    crypto: 'text-yellow-300', other: 'text-muted-foreground',
  };

  const displayed = result?.results?.filter((r: any) => {
    if (filter === 'found') return r.found === true;
    if (filter === 'notfound') return r.found === false;
    if (filter === 'links') return r.linkOnly === true;
    return true;
  }) ?? [];

  const verifiedFound = result?.results?.filter((r: any) => r.found === true).length ?? 0;
  const verifiedNotFound = result?.results?.filter((r: any) => r.found === false).length ?? 0;
  const linkOnlyCount = result?.results?.filter((r: any) => r.linkOnly === true).length ?? 0;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 font-mono">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-primary"><Users size={22} /> Social Media OSINT</h1>
          <p className="text-muted-foreground text-xs">Check username presence across 35+ platforms. Verified platforms show confirmed results; others provide direct links.</p>
        </header>

        <div className="flex items-start gap-3 px-4 py-3 rounded border border-primary/20 bg-primary/5 text-xs text-muted-foreground leading-relaxed">
          <AlertTriangle size={13} className="text-primary shrink-0 mt-0.5" />
          <div>
            <strong className="text-foreground">How it works:</strong> Some platforms like GitHub, GitLab, npm, and Reddit reliably return HTTP 404 for non-existent users — those show <span className="text-green-400">✓ Found</span> or <span className="text-muted-foreground">✗ Not Found</span>. Others like Instagram, Twitter, and LinkedIn return the same HTTP status regardless of whether the user exists — those show as <span className="text-blue-400">→ Links</span> so you can verify manually. Click any link to check in your browser.
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-card border border-border rounded px-3 py-2 focus-within:border-primary/50">
            <Search size={14} className="text-muted-foreground shrink-0" />
            <input value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="Enter username to investigate…"
              className="bg-transparent flex-1 text-sm text-primary font-mono outline-none placeholder:text-muted-foreground/40" />
          </div>
          <button onClick={search} disabled={loading || !username.trim()}
            className="px-4 py-2 bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary text-xs rounded transition-colors disabled:opacity-50 flex items-center gap-2">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
            {loading ? 'Scanning…' : 'Scan'}
          </button>
        </div>

        {loading && (
          <div className="text-center py-8 space-y-2">
            <Loader2 size={24} className="animate-spin mx-auto text-primary" />
            <p className="text-xs text-muted-foreground">Checking {username} across platforms… ~10–15 seconds</p>
          </div>
        )}

        {error && <div className="text-red-400 text-xs border border-red-500/30 bg-red-950/20 rounded px-4 py-3">{error}</div>}

        {result && !loading && (
          <div className="space-y-4">
            <div className="flex items-center gap-6 text-xs flex-wrap">
              <div><span className="text-green-400 font-bold text-lg">{verifiedFound}</span> <span className="text-muted-foreground">verified found</span></div>
              <div><span className="text-muted-foreground font-bold text-lg">{verifiedNotFound}</span> <span className="text-muted-foreground">not found</span></div>
              <div><span className="text-blue-400 font-bold text-lg">{linkOnlyCount}</span> <span className="text-muted-foreground">links only</span></div>
              <div className="flex gap-1 ml-auto flex-wrap">
                {([
                  { id: 'all', label: 'All' },
                  { id: 'found', label: `Found (${verifiedFound})` },
                  { id: 'notfound', label: 'Not Found' },
                  { id: 'links', label: `Links (${linkOnlyCount})` },
                ] as const).map(f => (
                  <button key={f.id} onClick={() => setFilter(f.id)}
                    className={`text-[10px] px-2 py-1 rounded border transition-colors ${filter === f.id ? 'border-primary/50 text-primary bg-primary/10' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {displayed.map((r: any) => (
                <div key={r.name} className={`flex items-center justify-between px-3 py-2.5 rounded border transition-colors ${
                  r.found === true
                    ? 'border-green-500/30 bg-green-950/10 hover:border-green-500/50'
                    : r.linkOnly
                    ? 'border-blue-500/20 bg-blue-950/5 hover:border-blue-500/40'
                    : r.found === false
                    ? 'border-border/40 bg-black/10'
                    : 'border-border/30'
                }`}>
                  <div className="flex items-center gap-2 min-w-0">
                    {r.found === true
                      ? <CheckCircle size={13} className="text-green-400 shrink-0" />
                      : r.linkOnly
                      ? <Link size={13} className="text-blue-400 shrink-0" />
                      : r.found === false
                      ? <XCircle size={13} className="text-muted-foreground/40 shrink-0" />
                      : <HelpCircle size={13} className="text-muted-foreground/40 shrink-0" />}
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-foreground truncate">{r.name}</div>
                      <div className={`text-[9px] ${CAT_COLORS[r.cat] ?? 'text-muted-foreground'}`}>{r.cat}</div>
                    </div>
                  </div>
                  <div className="shrink-0 ml-2">
                    {(r.found === true || r.linkOnly) && (
                      <a href={r.url} target="_blank" rel="noopener noreferrer"
                        className={`text-[10px] tracking-wider border px-2 py-0.5 rounded transition-colors ${
                          r.found === true
                            ? 'text-primary/60 hover:text-primary border-primary/20 hover:border-primary/50'
                            : 'text-blue-400/60 hover:text-blue-400 border-blue-500/20 hover:border-blue-500/40'
                        }`}>
                        {r.found === true ? 'visit →' : 'check →'}
                      </a>
                    )}
                    {r.found === null && !r.linkOnly && <span className="text-[9px] text-muted-foreground/40">timeout</span>}
                  </div>
                </div>
              ))}
            </div>

            {filter === 'found' && verifiedFound === 0 && (
              <div className="text-center py-6 text-muted-foreground text-xs">No verified accounts found. Switch to "Links" to check platforms manually.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
