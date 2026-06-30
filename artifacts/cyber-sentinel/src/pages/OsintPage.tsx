import React, { useState } from 'react';
import { Users, Search, Loader2, CheckCircle, XCircle, Link, AlertTriangle, ExternalLink } from 'lucide-react';

const CAT_COLORS: Record<string, string> = {
  dev: 'text-blue-400', social: 'text-purple-400', professional: 'text-yellow-400',
  gaming: 'text-green-400', hacking: 'text-red-400', music: 'text-pink-400',
  creative: 'text-orange-400', messaging: 'text-cyan-400', blog: 'text-indigo-400',
  crypto: 'text-yellow-300', other: 'text-muted-foreground',
};

const CAT_LABELS: Record<string, string> = {
  dev: 'Dev', social: 'Social', professional: 'Pro', gaming: 'Gaming',
  hacking: 'Security', music: 'Music', creative: 'Creative',
  messaging: 'Messaging', blog: 'Blog', crypto: 'Crypto', other: 'Other',
};

type Filter = 'all' | 'found' | 'notfound' | 'links';

export default function OsintPage() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [catFilter, setCatFilter] = useState<string>('all');

  async function search() {
    const q = username.trim();
    if (!q) return;
    setLoading(true); setError(''); setResult(null); setFilter('all'); setCatFilter('all');
    try {
      const r = await fetch(`/api/osint/username?q=${encodeURIComponent(q)}`, {
        signal: AbortSignal.timeout(60_000),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? 'Search failed'); return; }
      setResult(data);
    } catch (e: any) {
      if (e.name === 'AbortError' || e.name === 'TimeoutError') {
        setError('Request timed out. Try again.');
      } else {
        setError(e.message ?? 'Error');
      }
    }
    finally { setLoading(false); }
  }

  const allResults: any[] = result?.results ?? [];

  const verifiedFound    = allResults.filter(r => r.found === true).length;
  const verifiedNotFound = allResults.filter(r => r.found === false).length;
  const linkOnlyCount    = allResults.filter(r => r.linkOnly === true).length;
  const timedOut         = allResults.filter(r => r.found === null && !r.linkOnly).length;

  const categories = [...new Set(allResults.map(r => r.cat))].sort();

  const displayed = allResults.filter(r => {
    const statusOk = filter === 'all'     ? true
                   : filter === 'found'   ? r.found === true
                   : filter === 'notfound'? r.found === false
                   : filter === 'links'   ? r.linkOnly === true
                   : true;
    const catOk = catFilter === 'all' || r.cat === catFilter;
    return statusOk && catOk;
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 font-mono">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <header className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-primary"><Users size={22} /> Social Media OSINT</h1>
          <p className="text-muted-foreground text-xs">Username intelligence across 45+ platforms — verified checks + manual links.</p>
        </header>

        {/* Info box */}
        <div className="flex items-start gap-3 px-4 py-3 rounded border border-primary/20 bg-primary/5 text-xs text-muted-foreground leading-relaxed">
          <AlertTriangle size={13} className="text-primary shrink-0 mt-0.5" />
          <div>
            <strong className="text-foreground">How it works:</strong>{' '}
            Platforms with public APIs (GitHub, Reddit, DockerHub, HackerNews, Chess.com, etc.) return{' '}
            <span className="text-green-400">✓ Found</span> or <span className="text-red-400/70">✗ Not Found</span> with certainty.
            Platforms that always return 200 (Instagram, Twitter, etc.) show as{' '}
            <span className="text-blue-400">→ Link</span> for manual verification.
          </div>
        </div>

        {/* Search bar */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-card border border-border rounded px-3 py-2 focus-within:border-primary/50">
            <Search size={14} className="text-muted-foreground shrink-0" />
            <input value={username} onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && search()}
              placeholder="Enter username to investigate…"
              className="bg-transparent flex-1 text-sm text-primary font-mono outline-none placeholder:text-muted-foreground/40" />
          </div>
          <button onClick={search} disabled={loading || !username.trim()}
            className="px-4 py-2 bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary text-xs rounded transition-colors disabled:opacity-50 flex items-center gap-2">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
            {loading ? 'Scanning…' : 'Scan'}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-8 space-y-3">
            <Loader2 size={24} className="animate-spin mx-auto text-primary" />
            <p className="text-xs text-muted-foreground">Checking <span className="text-primary">{username}</span> across 45+ platforms…</p>
            <p className="text-[10px] text-muted-foreground/50">This takes ~10–20 seconds</p>
          </div>
        )}

        {error && <div className="text-red-400 text-xs border border-red-500/30 bg-red-950/20 rounded px-4 py-3 flex items-center gap-2"><AlertTriangle size={13} />{error}</div>}

        {result && !loading && (
          <div className="space-y-4">

            {/* Stats bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { count: verifiedFound,    label: 'Confirmed Found',  color: 'text-green-400',           border: 'border-green-500/20 bg-green-950/10' },
                { count: verifiedNotFound, label: 'Confirmed Absent', color: 'text-muted-foreground',    border: 'border-border/40 bg-black/10' },
                { count: linkOnlyCount,    label: 'Links to Check',   color: 'text-blue-400',            border: 'border-blue-500/20 bg-blue-950/10' },
                { count: timedOut,         label: 'Timed Out',        color: 'text-yellow-400/70',       border: 'border-yellow-500/20 bg-yellow-950/10' },
              ].map(({ count, label, color, border }) => (
                <div key={label} className={`p-3 rounded border ${border} text-center`}>
                  <div className={`text-2xl font-bold ${color}`}>{count}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex gap-1 flex-wrap">
                {([
                  { id: 'all',      label: `All (${allResults.length})` },
                  { id: 'found',    label: `Found (${verifiedFound})` },
                  { id: 'notfound', label: 'Not Found' },
                  { id: 'links',    label: `Links (${linkOnlyCount})` },
                ] as const).map(f => (
                  <button key={f.id} onClick={() => setFilter(f.id)}
                    className={`text-[10px] px-2.5 py-1 rounded border transition-colors ${filter === f.id ? 'border-primary/50 text-primary bg-primary/10' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="h-3 w-px bg-border hidden md:block" />

              {/* Category filter */}
              <div className="flex gap-1 flex-wrap">
                <button onClick={() => setCatFilter('all')}
                  className={`text-[10px] px-2.5 py-1 rounded border transition-colors ${catFilter === 'all' ? 'border-border text-foreground bg-card' : 'border-border/40 text-muted-foreground hover:text-foreground'}`}>
                  All cats
                </button>
                {categories.map(cat => (
                  <button key={cat} onClick={() => setCatFilter(cat)}
                    className={`text-[10px] px-2.5 py-1 rounded border transition-colors ${catFilter === cat ? 'border-primary/40 text-primary bg-primary/5' : 'border-border/40 text-muted-foreground hover:text-foreground'}`}>
                    <span className={CAT_COLORS[cat] ?? 'text-muted-foreground'}>{CAT_LABELS[cat] ?? cat}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Results grid */}
            {displayed.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">No results match this filter.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {displayed.map((r: any) => (
                  <div key={r.name} className={`flex items-center justify-between px-3 py-2.5 rounded border transition-colors ${
                    r.found === true  ? 'border-green-500/30 bg-green-950/10 hover:border-green-500/50'
                    : r.linkOnly      ? 'border-blue-500/20 bg-blue-950/5 hover:border-blue-500/40'
                    : r.found === false ? 'border-border/30 bg-black/5'
                    : 'border-border/20 bg-black/5'
                  }`}>
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Status icon */}
                      {r.found === true
                        ? <CheckCircle size={13} className="text-green-400 shrink-0" />
                        : r.linkOnly
                        ? <Link size={13} className="text-blue-400 shrink-0" />
                        : r.found === false
                        ? <XCircle size={13} className="text-muted-foreground/30 shrink-0" />
                        : <span className="text-muted-foreground/30 text-[10px] shrink-0 w-[13px] text-center">?</span>}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          {r.icon && <span className="text-[11px]">{r.icon}</span>}
                          <span className="text-xs font-bold text-foreground truncate">{r.name}</span>
                        </div>
                        <div className={`text-[9px] ${CAT_COLORS[r.cat] ?? 'text-muted-foreground'}`}>{CAT_LABELS[r.cat] ?? r.cat}</div>
                      </div>
                    </div>

                    {/* Action */}
                    <div className="shrink-0 ml-2 flex items-center gap-1">
                      {r.found === null && !r.linkOnly && (
                        <span className="text-[9px] text-muted-foreground/40">timeout</span>
                      )}
                      {(r.found === true || r.linkOnly) && (
                        <a href={r.url} target="_blank" rel="noopener noreferrer"
                          className={`flex items-center gap-1 text-[10px] tracking-wider border px-2 py-0.5 rounded transition-colors ${
                            r.found === true
                              ? 'text-primary/60 hover:text-primary border-primary/20 hover:border-primary/50'
                              : 'text-blue-400/60 hover:text-blue-400 border-blue-500/20 hover:border-blue-500/40'
                          }`}>
                          <ExternalLink size={9} />
                          {r.found === true ? 'visit' : 'check'}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Summary */}
            <div className="text-[10px] text-muted-foreground/50 text-center pt-2">
              Searched as <span className="text-primary font-bold">@{result.username}</span> · {allResults.length} platforms · {verifiedFound} confirmed active
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
