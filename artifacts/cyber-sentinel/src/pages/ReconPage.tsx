import React, { useState } from 'react';
import { Radar, Search, Loader2, AlertTriangle, RefreshCw, Shield, CheckCircle, XCircle } from 'lucide-react';

type Tab = 'dns' | 'whois' | 'ports' | 'subdomains' | 'ssl';

const PORT_LABELS: Record<number, string> = {
  21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS',
  80: 'HTTP', 110: 'POP3', 143: 'IMAP', 389: 'LDAP', 443: 'HTTPS',
  445: 'SMB', 465: 'SMTPS', 587: 'SMTP/TLS', 993: 'IMAPS', 995: 'POP3S',
  1433: 'MSSQL', 1521: 'Oracle', 3306: 'MySQL', 3389: 'RDP',
  5432: 'PostgreSQL', 5900: 'VNC', 6379: 'Redis', 8080: 'HTTP-Alt',
  8443: 'HTTPS-Alt', 8888: 'HTTP-Alt2', 9200: 'Elastic', 27017: 'MongoDB',
  6443: 'K8s', 2375: 'Docker', 2376: 'Docker-TLS',
};

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
        const parts = val.trim().split(/\s+/);
        const host = parts[0];
        const ports = parts[1] ? parts[1].split(',').map(Number).filter(Boolean) : undefined;
        r = await fetch('/api/recon/port-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ host, ports }) });
      } else if (tab === 'subdomains') {
        r = await fetch('/api/recon/subdomains', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: val }) });
      } else {
        // SSL can take up to 90s — use no timeout
        r = await fetch('/api/recon/ssl', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: val }),
          signal: AbortSignal.timeout(120_000) });
      }
      const data = await r!.json();
      if (!r!.ok) { setError(data.error ?? 'Request failed'); return; }
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

  const TABS: Array<{ id: Tab; label: string; placeholder: string; hint?: string }> = [
    { id: 'dns',        label: 'DNS Lookup',   placeholder: 'domain.com' },
    { id: 'whois',      label: 'WHOIS',        placeholder: 'domain.com' },
    { id: 'ports',      label: 'Port Scan',    placeholder: 'host.com  or  host.com 22,80,443,8080', hint: 'Separate optional custom ports with commas after a space' },
    { id: 'subdomains', label: 'Subdomains',   placeholder: 'domain.com' },
    { id: 'ssl',        label: 'SSL Grade',    placeholder: 'domain.com', hint: 'Powered by Qualys SSL Labs — may take 30–90s for first scan' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 font-mono">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-primary"><Radar size={22} /> Network Recon Toolkit</h1>
          <p className="text-muted-foreground text-xs">DNS lookup · WHOIS · Port scanner · Subdomain enumeration · SSL/TLS grade analysis</p>
        </header>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 border-b border-border pb-4">
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setResult(null); setError(''); }}
              className={`text-xs px-3 py-1.5 rounded border transition-colors ${tab === t.id ? 'border-primary/50 text-primary bg-primary/10' : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !loading && run()}
              placeholder={TABS.find(t => t.id === tab)?.placeholder ?? ''}
              className="flex-1 bg-card border border-border rounded px-3 py-2 text-sm text-primary font-mono outline-none focus:border-primary/50 placeholder:text-muted-foreground/40" />
            <button onClick={run} disabled={loading || !input.trim()}
              className="px-4 py-2 bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary text-xs rounded transition-colors disabled:opacity-50 flex items-center gap-2">
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
              {loading ? (tab === 'ssl' ? 'Scanning (up to 90s)…' : 'Running…') : 'Run'}
            </button>
          </div>
          {TABS.find(t => t.id === tab)?.hint && (
            <p className="text-[10px] text-muted-foreground/60 px-1">{TABS.find(t => t.id === tab)?.hint}</p>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs border border-red-500/30 bg-red-950/20 rounded px-4 py-3">
            <AlertTriangle size={14} className="shrink-0" />{error}
          </div>
        )}

        {result && <ReconResult tab={tab} data={result} onRetry={run} />}
      </div>
    </div>
  );
}

function Row({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between border-b border-border/40 pb-2 last:border-0 gap-4">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`text-primary text-right break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-2 border-b border-border bg-black/20 text-xs font-bold text-primary tracking-widest uppercase">{title}</div>
      <div className="p-4 space-y-2 text-xs">{children}</div>
    </div>
  );
}

function ReconResult({ tab, data, onRetry }: { tab: Tab; data: any; onRetry: () => void }) {
  if (tab === 'dns') {
    return (
      <div className="space-y-3">
        {Object.entries(data.results as Record<string, any>).map(([type, records]) => (
          <div key={type} className="bg-card/50 border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-black/20 text-xs font-bold text-primary tracking-widest uppercase">{type}</div>
            <div className="p-4 space-y-1">
              {type === 'MX' && Array.isArray(records) ? (
                records.map((r: any, i: number) => (
                  <div key={i} className="text-xs text-primary font-mono py-0.5 flex gap-4">
                    <span className="text-muted-foreground w-12 shrink-0">P={r.priority}</span>
                    <span>{r.exchange}</span>
                  </div>
                ))
              ) : type === 'SOA' && records && typeof records === 'object' ? (
                <div className="space-y-1">
                  {Object.entries(records as Record<string,any>).map(([k, v]) => (
                    <div key={k} className="flex gap-4 text-xs">
                      <span className="text-muted-foreground w-28 shrink-0 capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="text-primary font-mono">{String(v)}</span>
                    </div>
                  ))}
                </div>
              ) : type === 'TXT' && Array.isArray(records) ? (
                records.map((r: any, i: number) => (
                  <div key={i} className="text-xs text-primary font-mono py-0.5 break-all text-green-400/80 bg-black/20 px-2 py-1 rounded">{String(r)}</div>
                ))
              ) : Array.isArray(records) ? (
                records.map((r: any, i: number) => (
                  <div key={i} className="text-xs text-primary font-mono py-0.5">
                    {typeof r === 'object' ? JSON.stringify(r) : String(r)}
                  </div>
                ))
              ) : (
                <div className="text-xs text-primary font-mono">{JSON.stringify(records)}</div>
              )}
            </div>
          </div>
        ))}
        {Object.keys(data.errors ?? {}).length > 0 && (
          <div className="text-xs text-muted-foreground px-1 space-y-0.5">
            {Object.entries(data.errors).map(([k, v]) => (
              <div key={k}><span className="text-muted-foreground/60">{k}:</span> <span className="text-red-400/70">{String(v)}</span></div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (tab === 'whois') {
    return (
      <div className="space-y-4">
        <Section title="Registration Info">
          {[
            ['Domain', data.domain],
            ['Handle', data.handle],
            ['Registered', data.registered ? new Date(data.registered).toUTCString() : null],
            ['Expires', data.expiry ? new Date(data.expiry).toUTCString() : null],
            ['Last Changed', data.lastChanged ? new Date(data.lastChanged).toUTCString() : null],
            ['DNSSEC', data.secureDns ? (data.secureDns.delegationSigned ? '✓ Signed' : '✗ Not signed') : null],
          ].filter(([,v])=>v).map(([k,v])=> <Row key={String(k)} label={String(k)} value={String(v)} />)}
          {data.status?.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {(data.status as string[]).map(s => (
                <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary/70 font-mono">{s}</span>
              ))}
            </div>
          )}
        </Section>

        {data.nameservers?.length > 0 && (
          <Section title="Nameservers">
            {data.nameservers.map((ns: string) => <div key={ns} className="text-xs text-primary font-mono">{ns}</div>)}
          </Section>
        )}

        {data.entities?.length > 0 && (
          <Section title="Registrant Entities">
            {data.entities.map((e: any, i: number) => (
              <div key={i} className="py-2 border-b border-border/40 last:border-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-primary font-bold">{e.name ?? 'Redacted'}</span>
                  <span className="text-[9px] text-muted-foreground/60 border border-border/40 px-1.5 py-0.5 rounded">
                    {(e.roles ?? []).join(', ')}
                  </span>
                </div>
                {e.org && <div className="text-muted-foreground text-[10px]">Org: {e.org}</div>}
                {e.email && <div className="text-muted-foreground text-[10px]">Email: {e.email}</div>}
                {e.phone && <div className="text-muted-foreground text-[10px]">Phone: {e.phone}</div>}
              </div>
            ))}
          </Section>
        )}
      </div>
    );
  }

  if (tab === 'ports') {
    const open = data.results.filter((r: any) => r.open);
    const closed = data.results.filter((r: any) => !r.open);
    return (
      <div className="space-y-4">
        {/* Summary */}
        <div className="flex items-center gap-6 text-xs">
          <span className="text-green-400 font-bold">{open.length} open</span>
          <span className="text-muted-foreground">{closed.length} closed/filtered</span>
          <span className="text-muted-foreground/60">on {data.host}</span>
        </div>

        {/* Open ports highlighted */}
        {open.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-2">Open Ports</div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {open.map((r: any) => (
                <div key={r.port} className="px-3 py-2 rounded border border-green-500/40 bg-green-950/20 flex items-center justify-between">
                  <div>
                    <div className="text-green-400 font-bold font-mono text-sm">{r.port}</div>
                    <div className="text-[10px] text-green-400/60">{r.service || PORT_LABELS[r.port] || 'unknown'}</div>
                  </div>
                  <div className="text-right">
                    {r.latency != null && <div className="text-[10px] text-muted-foreground">{r.latency}ms</div>}
                    <div className="text-[9px] text-green-500">OPEN</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All ports grid */}
        <div className="space-y-2">
          <div className="text-[10px] text-muted-foreground tracking-widest uppercase">All Scanned Ports</div>
          <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-1.5">
            {data.results.map((r: any) => (
              <div key={r.port} className={`p-1.5 rounded border text-center ${r.open ? 'border-green-500/40 bg-green-950/20' : 'border-border/30 bg-black/10'}`}>
                <div className={`font-bold font-mono text-xs ${r.open ? 'text-green-400' : 'text-muted-foreground/30'}`}>{r.port}</div>
                <div className={`text-[8px] truncate ${r.open ? 'text-green-400/60' : 'text-muted-foreground/20'}`}>{r.service || PORT_LABELS[r.port] || ''}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-[10px] text-muted-foreground/50 italic">{data.note}</div>
      </div>
    );
  }

  if (tab === 'subdomains') {
    return (
      <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-2 border-b border-border bg-black/20 flex items-center justify-between">
          <div className="text-xs font-bold text-primary tracking-widest uppercase">
            {data.count} Subdomains Found
          </div>
          <div className="text-[10px] text-muted-foreground">via {data.source}</div>
        </div>
        {data.count === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-xs">No subdomains found via certificate transparency logs.</div>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 max-h-96 overflow-y-auto">
            {data.subdomains.map((s: string) => (
              <div key={s} className="text-xs text-primary font-mono truncate hover:text-clip py-0.5 flex items-center gap-1">
                <span className="text-muted-foreground/30 text-[9px]">›</span> {s}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (tab === 'ssl') {
    const gradeColor: Record<string, string> = {
      'A+': 'text-green-300', A: 'text-green-400', B: 'text-yellow-400',
      C: 'text-orange-400', D: 'text-orange-500', F: 'text-red-400', T: 'text-red-400',
    };
    const grade = data.grade;
    const isInProgress = data.status !== 'READY' && data.status !== 'ERROR';

    return (
      <div className="space-y-4">
        {/* Status */}
        {isInProgress && (
          <div className="flex items-center gap-3 px-4 py-3 rounded border border-yellow-500/30 bg-yellow-950/10 text-xs">
            <Shield size={14} className="text-yellow-400 shrink-0" />
            <div className="flex-1">
              <span className="text-yellow-400 font-bold">Analysis still running</span>
              <span className="text-muted-foreground ml-2">{data.statusMessage ?? 'Qualys SSL Labs is scanning…'}</span>
            </div>
            <button onClick={onRetry} className="flex items-center gap-1 text-yellow-400/70 hover:text-yellow-400 border border-yellow-500/30 rounded px-2 py-1 transition-colors">
              <RefreshCw size={11} /> Retry
            </button>
          </div>
        )}

        {grade && (
          <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-2 border-b border-border bg-black/20 text-xs font-bold text-primary tracking-widest uppercase">SSL Grade — {data.domain}</div>
            <div className="p-6 text-center">
              <div className={`text-8xl font-bold font-mono ${gradeColor[grade] ?? 'text-muted-foreground'}`}>{grade}</div>
              <div className="text-xs text-muted-foreground mt-2">{data.status}</div>
            </div>
          </div>
        )}

        {data.endpoints?.length > 0 && (
          <div className="space-y-2">
            {data.endpoints.map((e: any, i: number) => (
              <div key={i} className="bg-card/50 border border-border rounded-lg p-4 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-mono">{e.ipAddress}</span>
                  <span className={`text-xl font-bold font-mono ${gradeColor[e.grade?.[0]] ?? 'text-muted-foreground'}`}>
                    {e.grade ?? (e.progress != null ? `${e.progress}%` : '—')}
                  </span>
                </div>
                {e.hasWarnings && <div className="text-yellow-400/70 text-[10px]">⚠ Has warnings</div>}
                {e.isExceptional && <div className="text-green-400/70 text-[10px]">★ Exceptional configuration</div>}
                {e.statusMessage && <div className="text-muted-foreground/60 text-[10px]">{e.statusMessage}</div>}
              </div>
            ))}
          </div>
        )}

        {!grade && !isInProgress && (
          <div className="text-center py-6 text-muted-foreground text-xs">
            {data.status === 'ERROR' ? 'SSL analysis failed for this domain.' : 'No grade data returned yet.'}
          </div>
        )}
      </div>
    );
  }

  return null;
}
