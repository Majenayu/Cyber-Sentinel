import React, { useState } from 'react';
import { Globe, Search, AlertTriangle, Loader2, MapPin, Wifi } from 'lucide-react';
import MiniMap from '@/components/MiniMap';

export default function IpRepPage() {
  const [ip, setIp] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  async function lookup() {
    const addr = ip.trim();
    if (!addr) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await fetch(`/api/ip/reputation?ip=${encodeURIComponent(addr)}`);
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? 'Lookup failed'); return; }
      setResult(data);
    } catch (err: any) { setError(err.message ?? 'Network error'); }
    finally { setLoading(false); }
  }

  const SAMPLE_IPS = ['8.8.8.8', '1.1.1.1', '185.220.101.47', '45.33.32.156'];

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 font-mono">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-primary"><Globe size={22} /> IP Reputation</h1>
          <p className="text-muted-foreground text-xs">Geolocation, ISP, proxy detection, and abuse score for any IP address.</p>
        </header>

        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-card border border-border rounded px-3 py-2 focus-within:border-primary/50">
            <Search size={14} className="text-muted-foreground shrink-0" />
            <input value={ip} onChange={e => setIp(e.target.value)} onKeyDown={e => e.key === 'Enter' && lookup()}
              placeholder="Enter IP address…" className="bg-transparent flex-1 text-sm text-primary font-mono outline-none placeholder:text-muted-foreground/40" />
          </div>
          <button onClick={lookup} disabled={loading || !ip.trim()}
            className="px-4 py-2 bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary text-xs rounded transition-colors disabled:opacity-50 flex items-center gap-2">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
            Lookup
          </button>
        </div>

        <div className="flex flex-wrap gap-1">
          <span className="text-[10px] text-muted-foreground self-center mr-1">Samples:</span>
          {SAMPLE_IPS.map(s => (
            <button key={s} onClick={() => setIp(s)} className="text-[10px] px-2 py-0.5 border border-border rounded text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors font-mono">{s}</button>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-xs border border-red-500/30 bg-red-950/20 rounded px-4 py-3">
            <AlertTriangle size={14} />{error}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.geo && (
                <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
                  <div className="px-4 py-2 border-b border-border bg-black/20 text-xs font-bold text-primary tracking-widest uppercase flex items-center gap-2">
                    <MapPin size={12} /> Geolocation
                  </div>
                  <div className="p-4 space-y-2 text-xs">
                    {[
                      ['IP', result.ip],
                      ['Country', `${result.geo.country} (${result.geo.countryCode})`],
                      ['Region', result.geo.region],
                      ['City', result.geo.city],
                      ['Coordinates', `${result.geo.lat}, ${result.geo.lon}`],
                      ['Timezone', result.geo.timezone],
                      ['ISP', result.geo.isp],
                      ['Organization', result.geo.org],
                      ['ASN', result.geo.asn],
                      ['Proxy/VPN', String(result.geo.proxy)],
                      ['Hosting', String(result.geo.hosting)],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between border-b border-border/40 pb-2 last:border-0">
                        <span className="text-muted-foreground">{k}</span>
                        <span className={`text-primary font-mono ${k === 'Proxy/VPN' && v === 'true' ? 'text-yellow-400' : ''}`}>{v}</span>
                      </div>
                    ))}
                    <a href={`https://www.google.com/maps?q=${result.geo.lat},${result.geo.lon}`} target="_blank" rel="noopener noreferrer"
                      className="inline-block text-[10px] text-primary/60 hover:text-primary mt-1">
                      Open in Google Maps →
                    </a>
                  </div>
                </div>
              )}

              {result.abuse && (
                <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
                  <div className="px-4 py-2 border-b border-border bg-black/20 text-xs font-bold text-primary tracking-widest uppercase flex items-center gap-2">
                    <AlertTriangle size={12} /> AbuseIPDB Score
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Abuse Confidence</span>
                      <span className={`text-2xl font-bold font-mono ${result.abuse.abuseScore > 50 ? 'text-red-400' : result.abuse.abuseScore > 20 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {result.abuse.abuseScore}%
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className={`h-2 rounded-full ${result.abuse.abuseScore > 50 ? 'bg-red-500' : result.abuse.abuseScore > 20 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${result.abuse.abuseScore}%` }} />
                    </div>
                    <div className="space-y-1.5 text-xs">
                      {[
                        ['Total Reports', String(result.abuse.totalReports)],
                        ['Distinct Reporters', String(result.abuse.numDistinctUsers)],
                        ['Last Reported', result.abuse.lastReportedAt ? new Date(result.abuse.lastReportedAt).toLocaleDateString() : 'Never'],
                        ['Usage Type', result.abuse.usageType],
                        ['Domain', result.abuse.domain],
                        ['Tor Exit Node', String(result.abuse.isTor)],
                        ['Whitelisted', String(result.abuse.isWhitelisted)],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between border-b border-border/40 pb-1.5 last:border-0">
                          <span className="text-muted-foreground">{k}</span>
                          <span className="text-primary font-mono">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {result.shodan && (
                <div className="bg-card/50 border border-border rounded-lg overflow-hidden md:col-span-2">
                  <div className="px-4 py-2 border-b border-border bg-black/20 text-xs font-bold text-primary tracking-widest uppercase flex items-center gap-2">
                    <Wifi size={12} /> Shodan Data
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex flex-wrap gap-3 text-xs">
                      <div><span className="text-muted-foreground">OS: </span><span className="text-primary">{result.shodan.os ?? 'Unknown'}</span></div>
                      <div><span className="text-muted-foreground">Updated: </span><span className="text-primary">{result.shodan.lastUpdate ? new Date(result.shodan.lastUpdate).toLocaleDateString() : 'n/a'}</span></div>
                    </div>
                    {result.shodan.ports?.length > 0 && (
                      <div>
                        <div className="text-[10px] text-muted-foreground mb-2 tracking-widest uppercase">Open Ports</div>
                        <div className="flex flex-wrap gap-1">
                          {result.shodan.ports.map((p: number) => (
                            <span key={p} className="text-[10px] px-2 py-0.5 bg-primary/10 border border-primary/20 rounded text-primary font-mono">{p}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {result.shodan.vulns?.length > 0 && (
                      <div>
                        <div className="text-[10px] text-red-400 mb-2 tracking-widest uppercase">Known Vulnerabilities</div>
                        <div className="flex flex-wrap gap-1">
                          {result.shodan.vulns.map((v: string) => (
                            <span key={v} className="text-[10px] px-2 py-0.5 bg-red-950/30 border border-red-500/30 rounded text-red-400">{v}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {!result.abuse && <div className="text-xs text-yellow-400/70">Add ABUSEIPDB_KEY secret for abuse score data.</div>}
                  </div>
                </div>
              )}

              {!result.abuse && !result.shodan && result.geo && (
                <div className="bg-card/50 border border-border rounded-lg p-4 text-xs text-muted-foreground">
                  Add <code className="bg-black/30 px-1 rounded text-primary">ABUSEIPDB_KEY</code> secret for abuse scoring.
                </div>
              )}
            </div>

            {/* IP Location Map */}
            {result.geo && result.geo.lat && result.geo.lon && (
              <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
                <div className="px-4 py-2 border-b border-border bg-black/20 text-xs font-bold text-primary tracking-widest uppercase flex items-center gap-2">
                  <MapPin size={12} /> IP Location Map
                  <span className="text-muted-foreground font-normal text-[10px] ml-auto">
                    Scroll to zoom · Click marker for coordinates
                  </span>
                </div>
                <MiniMap lat={result.geo.lat} lon={result.geo.lon} ip={result.ip} height={300} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
