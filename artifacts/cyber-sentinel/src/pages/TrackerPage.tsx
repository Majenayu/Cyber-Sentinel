import React, { useState } from 'react';
import { Radio, Plus, Copy, Check, Loader2, ExternalLink, RefreshCw } from 'lucide-react';

interface TrackItem { id: string; type: string; label: string; hitCount: number; createdAt: string; }

function CopyBtn({ text }: { text: string }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 1500); }}
      className="p-1 text-muted-foreground hover:text-primary transition-colors">
      {c ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
    </button>
  );
}

export default function TrackerPage() {
  const [tab, setTab] = useState<'qr' | 'honeypot'>('qr');
  const [label, setLabel] = useState('');
  const [redirect, setRedirect] = useState('https://google.com');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [list, setList] = useState<TrackItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [statsId, setStatsId] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  async function create() {
    setLoading(true); setResult(null);
    const body = tab === 'qr' ? { label, redirectUrl: redirect } : { label };
    const r = await fetch(`/api/tracker/${tab}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await r.json();
    setResult(data);
    setLoading(false);
    fetchList();
  }

  async function fetchList() {
    setListLoading(true);
    const r = await fetch('/api/tracker/list');
    const data = await r.json();
    setList(data);
    setListLoading(false);
  }

  async function fetchStats(id: string, type: string) {
    setStatsId(id); setStats(null);
    const r = await fetch(`/api/tracker/${type}/${id}/stats`);
    const data = await r.json();
    setStats(data);
  }

  React.useEffect(() => { fetchList(); }, []);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 font-mono">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-primary"><Radio size={22} /> QR Tracker & Honeypot Generator</h1>
          <p className="text-muted-foreground text-xs">Generate tracking QR codes and honeypot pixels. Log visitor IP, device, and geolocation.</p>
        </header>

        <div className="flex gap-1 border-b border-border pb-3">
          {(['qr', 'honeypot'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setResult(null); }}
              className={`px-4 py-1.5 text-xs rounded border transition-colors ${tab === t ? 'border-primary/50 text-primary bg-primary/10' : 'border-border text-muted-foreground hover:text-foreground'}`}>
              {t === 'qr' ? 'QR Code Tracker' : 'Honeypot Pixel'}
            </button>
          ))}
        </div>

        <div className="bg-card/50 border border-border rounded-lg p-5 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-black/30 border border-border rounded px-3 py-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest w-16 shrink-0">Label</span>
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="My tracking link"
                className="bg-transparent flex-1 text-sm text-primary font-mono outline-none placeholder:text-muted-foreground/40" />
            </div>
            {tab === 'qr' && (
              <div className="flex items-center gap-2 bg-black/30 border border-border rounded px-3 py-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest w-16 shrink-0">Redirect</span>
                <input value={redirect} onChange={e => setRedirect(e.target.value)} placeholder="https://google.com"
                  className="bg-transparent flex-1 text-sm text-primary font-mono outline-none placeholder:text-muted-foreground/40" />
              </div>
            )}
          </div>

          <button onClick={create} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary text-xs rounded transition-colors disabled:opacity-50">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Generate {tab === 'qr' ? 'QR Tracker' : 'Honeypot Pixel'}
          </button>

          {result && !result.error && (
            <div className="bg-black/40 border border-primary/20 rounded-lg p-4 space-y-3">
              <div className="text-[10px] text-primary tracking-widest uppercase font-bold">Generated Successfully</div>

              {tab === 'qr' && result.qrImageUrl && (
                <div className="flex gap-4 items-start">
                  <img src={result.qrImageUrl} alt="QR Code" className="w-32 h-32 border border-primary/20 rounded" />
                  <div className="space-y-2 flex-1 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Track URL:</span>
                      <span className="text-primary font-mono text-[10px] break-all">{result.trackUrl}</span>
                      <CopyBtn text={result.trackUrl} />
                    </div>
                    <div className="text-muted-foreground">Redirects to: <span className="text-primary">{result.redirectUrl}</span></div>
                    <div className="text-muted-foreground">ID: <span className="text-primary font-mono">{result.id}</span></div>
                    <button onClick={() => fetchStats(result.id, 'qr')} className="text-[10px] text-primary/60 hover:text-primary transition-colors">View stats →</button>
                  </div>
                </div>
              )}

              {tab === 'honeypot' && (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-24">Pixel URL:</span>
                    <span className="text-primary font-mono text-[10px] break-all flex-1">{result.pixelUrl}</span>
                    <CopyBtn text={result.pixelUrl} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-24">Link URL:</span>
                    <span className="text-primary font-mono text-[10px] break-all flex-1">{result.linkUrl}</span>
                    <CopyBtn text={result.linkUrl} />
                  </div>
                  <div className="text-muted-foreground text-[10px]">
                    Embed the pixel as &lt;img src="{result.pixelUrl}" width="1" height="1"&gt; in emails or pages.
                  </div>
                  <button onClick={() => fetchStats(result.id, 'honeypot')} className="text-[10px] text-primary/60 hover:text-primary transition-colors">View stats →</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats panel */}
        {statsId && stats && (
          <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-black/20 flex items-center justify-between text-xs">
              <span className="font-bold text-primary tracking-widest uppercase">Stats: {statsId}</span>
              <span className="text-muted-foreground">{stats.hits} hits</span>
            </div>
            <div className="divide-y divide-border/40 max-h-64 overflow-y-auto">
              {(stats.log ?? []).map((h: any, i: number) => (
                <div key={i} className="px-4 py-2 text-xs flex flex-wrap gap-4">
                  <span className="text-primary font-mono">{h.ip}</span>
                  <span className="text-muted-foreground">{h.city}, {h.country}</span>
                  <span className="text-muted-foreground/60">{h.isp}</span>
                  <span className="text-muted-foreground/40 ml-auto">{new Date(h.timestamp).toLocaleString()}</span>
                </div>
              ))}
              {stats.hits === 0 && <div className="px-4 py-6 text-center text-xs text-muted-foreground">No visits yet</div>}
            </div>
          </div>
        )}

        {/* Existing trackers list */}
        <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-2 border-b border-border bg-black/20 flex items-center justify-between">
            <span className="text-xs font-bold text-primary tracking-widest uppercase">All Trackers</span>
            <button onClick={fetchList} className="text-muted-foreground hover:text-primary transition-colors">
              <RefreshCw size={12} className={listLoading ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="divide-y divide-border/40">
            {list.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">No trackers yet</div>
            ) : list.map(item => (
              <div key={item.id} className="px-4 py-2.5 flex items-center gap-4 text-xs hover:bg-secondary/10 transition-colors">
                <span className={`text-[9px] px-1.5 py-0.5 rounded border ${item.type === 'qr' ? 'border-blue-500/30 text-blue-400' : 'border-orange-500/30 text-orange-400'}`}>
                  {item.type.toUpperCase()}
                </span>
                <span className="flex-1 text-foreground truncate">{item.label || item.id}</span>
                <span className="text-primary font-bold">{item.hitCount}</span>
                <span className="text-muted-foreground/50">hits</span>
                <button onClick={() => fetchStats(item.id, item.type)} className="text-[10px] text-primary/60 hover:text-primary transition-colors">stats</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
