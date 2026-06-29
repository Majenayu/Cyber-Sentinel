import React, { useState } from 'react';
import { Radar, Search, Loader2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

type Tab = 'dns' | 'whois' | 'ports' | 'subdomains' | 'ssl';

export default function ReconPage() {
  const [tab, setTab] = useState<Tab>('dns');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  async function run() {
    const val = input.trim();
    if (!val) return;
    setLoading(true); setError(''); setResult(null);
    try {
      let r: Response;
      if (tab === 'dns') {
        r = await fetch('/api/recon/dns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: val }) });
      } else if (tab === 'whois') {
        r = await fetch('/api/recon/whois', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: val }) });
      } else if (tab === 'ports') {
        const [host, portList] = val.split(' ');
        const ports = portList ? portList.split(',').map(Number).filter(Boolean) : undefined;
        r = await fetch('/api/recon/port-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ host, ports }) });
      } else if (tab === 'subdomains') {
        r = await fetch('/api/recon/subdomains', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: val }) });
      } else {
        r = await fetch('/api/recon/ssl', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: val }) });
      }
      const data = await r!.json();
      if (!r!.ok) { setError(data.error ?? 'Request failed'); return; }
      setResult(data);
    } catch (e: any) { setError(e.message ?? 'Error'); }
    finally { setLoading(false); }
  }

  const TABS: Array<{ id: Tab; label: string; placeholder: string }> = [
    { id: 'dns', label: 'DNS Lookup', placeholder: 'domain.com' },
    { id: 'whois', label: 'WHOIS', placeholder: 'domain.com' },
    { id: 'ports', label: 'Port Check', placeholder: 'host.com [optional: 80,443,8080]' },
    { id: 'subdomains', label: 'Subdomains', placeholder: 'domain.com' },
    { id: 'ssl', label: 'SSL Grade', placeholder: 'domain.com' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 font-mono">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-primary"><Radar size={22} /> Network Recon Toolkit</h1>
          <p className="text-muted-foreground text-xs">DNS, WHOIS, Port Scanning, Subdomain Enumeration, SSL Grade checking.</p>
        </header>

        <div className="flex flex-wrap gap-1 border-b border-border pb-4">
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setResult(null); setError(''); }}
              className={`text-xs px-3 py-1.5 rounded border transition-colors ${tab === t.id ? 'border-primary/50 text-primary bg-primary/10' : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && run()}
            placeholder={TABS.find(t => t.id === tab)?.placeholder ?? ''}
            className="flex-1 bg-card border border-border rounded px-3 py-2 text-sm text-primary font-mono outline-none focus:border-primary/50 placeholder:text-muted-foreground/40" />
          <button onClick={run} disabled={loading || !input.trim()}
            className="px-4 py-2 bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary text-xs rounded transition-colors disabled:opacity-50 flex items-center gap-2">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
            Run
          </button>
        </div>

        {error && <div className="flex items-center gap-2 text-red-400 text-xs border border-red-500/30 bg-red-950/20 rounded px-4 py-3"><AlertTriangle size={14} />{error}</div>}

        {result && <ReconResult tab={tab} data={result} />}
      </div>
    </div>
  );
}

function ReconResult({ tab, data }: { tab: Tab; data: any }) {
  if (tab === 'dns') {
    return (
      <div className="space-y-3">
        {Object.entries(data.results as Record<string, any>).map(([type, records]) => (
          <div key={type} className="bg-card/50 border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-black/20 text-xs font-bold text-primary tracking-widest uppercase">{type}</div>
            <div className="p-4">
              {Array.isArray(records) ? records.map((r, i) => (
                <div key={i} className="text-xs text-primary font-mono py-0.5">
                  {typeof r === 'object' ? JSON.stringify(r) : String(r)}
                </div>
              )) : <div className="text-xs text-primary font-mono">{JSON.stringify(records)}</div>}
            </div>
          </div>
        ))}
        {Object.keys(data.errors ?? {}).length > 0 && (
          <div className="text-xs text-muted-foreground px-1">
            {Object.entries(data.errors).map(([k, v]) => <div key={k}><span className="text-muted-foreground">{k}:</span> <span className="text-red-400/70">{String(v)}</span></div>)}
          </div>
        )}
      </div>
    );
  }

  if (tab === 'whois') {
    return (
      <div className="space-y-4">
        <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-2 border-b border-border bg-black/20 text-xs font-bold text-primary tracking-widest uppercase">Registration Info</div>
          <div className="p-4 space-y-2 text-xs">
            {[['Domain', data.domain], ['Handle', data.handle], ['Registered', data.registered], ['Expires', data.expiry], ['Last Changed', data.lastChanged]].filter(([,v])=>v).map(([k,v])=>(
              <div key={String(k)} className="flex justify-between border-b border-border/40 pb-2 last:border-0">
                <span className="text-muted-foreground">{k}</span><span className="text-primary font-mono">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
        {data.nameservers?.length > 0 && (
          <div className="bg-card/50 border border-border rounded-lg p-4">
            <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Nameservers</div>
            {data.nameservers.map((ns: string) => <div key={ns} className="text-xs text-primary font-mono py-0.5">{ns}</div>)}
          </div>
        )}
        {data.entities?.length > 0 && (
          <div className="bg-card/50 border border-border rounded-lg p-4">
            <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-3">Registrant Entities</div>
            {data.entities.map((e: any, i: number) => (
              <div key={i} className="text-xs py-1 border-b border-border/40 last:border-0">
                <span className="text-primary">{e.name ?? 'Redacted'}</span>
                {e.org && <span className="text-muted-foreground ml-2">— {e.org}</span>}
                <span className="text-muted-foreground/60 ml-2">[{(e.roles??[]).join(', ')}]</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (tab === 'ports') {
    const open = data.results.filter((r: any) => r.open);
    const closed = data.results.filter((r: any) => !r.open);
    return (
      <div className="space-y-4">
        <div className="text-xs text-muted-foreground">{open.length} open / {closed.length} closed on {data.host}</div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {data.results.map((r: any) => (
            <div key={r.port} className={`p-2 rounded border text-center text-xs ${r.open ? 'border-green-500/40 bg-green-950/20 text-green-400' : 'border-border text-muted-foreground/40'}`}>
              <div className="font-bold font-mono">{r.port}</div>
              {r.open && r.latency != null && <div className="text-[10px]">{r.latency}ms</div>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tab === 'subdomains') {
    return (
      <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-2 border-b border-border bg-black/20 text-xs font-bold text-primary tracking-widest uppercase">
          {data.count} Subdomains Found
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 max-h-96 overflow-y-auto">
          {data.subdomains.map((s: string) => (
            <div key={s} className="text-xs text-primary font-mono truncate hover:text-clip">{s}</div>
          ))}
        </div>
      </div>
    );
  }

  if (tab === 'ssl') {
    const gradeColor: Record<string, string> = { A: 'text-green-400', B: 'text-yellow-400', C: 'text-orange-400', F: 'text-red-400', T: 'text-red-400' };
    const grade = data.grade?.[0] ?? 'N';
    return (
      <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-2 border-b border-border bg-black/20 text-xs font-bold text-primary tracking-widest uppercase">SSL Grade — {data.domain}</div>
        <div className="p-6 text-center">
          <div className={`text-7xl font-bold font-mono ${gradeColor[grade] ?? 'text-muted-foreground'}`}>{data.grade ?? data.status}</div>
          <div className="text-xs text-muted-foreground mt-2">{data.status}</div>
          {data.endpoints?.map((e: any, i: number) => (
            <div key={i} className="mt-4 text-xs text-left border border-border rounded p-3">
              <div className="flex justify-between"><span className="text-muted-foreground">IP</span><span className="text-primary">{e.ipAddress}</span></div>
              <div className="flex justify-between mt-1"><span className="text-muted-foreground">Grade</span><span className={gradeColor[e.grade?.[0]] ?? 'text-muted-foreground'}>{e.grade}</span></div>
              {e.statusMessage && <div className="text-muted-foreground/60 mt-1 text-[10px]">{e.statusMessage}</div>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
