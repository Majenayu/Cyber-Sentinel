import React, { useState } from 'react';
import { ShieldOff, Search, AlertTriangle, CheckCircle, Lock, Loader2, ExternalLink, Database } from 'lucide-react';

const MANUAL_CHECK_SITES = [
  { name: 'HaveIBeenPwned', url: 'https://haveibeenpwned.com/', desc: 'Most trusted — 10B+ records', free: true },
  { name: 'XposedOrNot', url: 'https://xposedornot.com/', desc: 'Free — real-time breach check', free: true },
  { name: 'DeHashed', url: 'https://dehashed.com/', desc: 'Detailed breach data, hashes', free: false },
  { name: 'BreachDirectory', url: 'https://breachdirectory.org/', desc: 'Free tier available', free: true },
  { name: 'LeakCheck', url: 'https://leakcheck.io/', desc: 'Real-time leak detection', free: false },
  { name: 'Snusbase', url: 'https://snusbase.com/', desc: 'Large breach database', free: false },
  { name: 'IntelX', url: 'https://intelx.io/', desc: 'Intelligence search engine', free: false },
  { name: 'Scylla.sh', url: 'https://scylla.sh/', desc: 'Open-source breach search', free: true },
  { name: 'GhostProject', url: 'https://ghostproject.fr/', desc: 'Password breach checker', free: true },
  { name: 'Illicit.services', url: 'https://illicit.services/', desc: 'Combined breach lookup', free: true },
  { name: 'LeakLookup', url: 'https://leak-lookup.com/', desc: 'Multi-source breach DB', free: false },
  { name: 'Hashes.org', url: 'https://hashes.org/', desc: 'Password hash lookup', free: true },
  { name: 'Avast BreachGuard', url: 'https://www.avast.com/hackcheck/', desc: 'Consumer breach check', free: true },
  { name: 'F-Secure', url: 'https://www.f-secure.com/en/identity-theft-checker', desc: 'Identity theft checker', free: true },
  { name: 'SpyCloud', url: 'https://spycloud.com/', desc: 'Enterprise breach analysis', free: false },
  { name: 'DataBreach.com', url: 'https://databreach.com/', desc: 'Breach news & lookup', free: true },
  { name: 'Pwnedpasswords', url: 'https://haveibeenpwned.com/Passwords', desc: 'Check if password was leaked', free: true },
  { name: 'Breach Detective', url: 'https://breachdetective.com/', desc: 'Breach lookup tool', free: true },
  { name: 'Malwarebytes', url: 'https://www.malwarebytes.com/digital-footprint/', desc: 'Digital footprint scan', free: true },
  { name: 'Keeper', url: 'https://www.keepersecurity.com/breachwatch.html', desc: 'Dark web monitoring', free: false },
  { name: 'Norton', url: 'https://us.norton.com/id-advisor/', desc: 'Identity advisor', free: true },
  { name: 'Bitdefender', url: 'https://www.bitdefender.com/solutions/identity-protection.html', desc: 'Identity protection', free: false },
  { name: 'epieos', url: 'https://epieos.com/', desc: 'OSINT — finds Google account linked to email', free: true },
  { name: 'Hunter.io', url: 'https://hunter.io/email-verifier/', desc: 'Email existence check', free: true },
];

export default function BreachChecker() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState('');
  const [showManual, setShowManual] = useState(false);

  async function check() {
    const e = email.trim();
    if (!e || !e.includes('@')) { setError('Enter a valid email address'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await fetch(`/api/breach?email=${encodeURIComponent(e)}`);
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? 'Check failed'); return; }
      setResult(data);
    } catch (err: any) {
      setError(err.message ?? 'Network error');
    } finally { setLoading(false); }
  }

  const totalBreaches = (result?.breachCount ?? 0) + (result?.xon?.breachCount ?? 0);
  const anyFound = result?.found || result?.xon?.found;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 font-mono">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-primary"><ShieldOff size={22} /> Email Breach Checker</h1>
          <p className="text-muted-foreground text-xs">Check if an email appears in known data breaches using multiple sources. Then verify manually with 24 additional tools below.</p>
        </header>

        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-card border border-border rounded px-3 py-2 focus-within:border-primary/50 transition-colors">
            <Search size={14} className="text-muted-foreground shrink-0" />
            <input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && check()}
              placeholder="victim@example.com"
              className="bg-transparent flex-1 text-sm text-primary font-mono outline-none placeholder:text-muted-foreground/40" />
          </div>
          <button onClick={check} disabled={loading}
            className="px-4 py-2 bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary text-xs rounded transition-colors disabled:opacity-50 flex items-center gap-2">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
            {loading ? 'Checking…' : 'Check'}
          </button>
        </div>

        {error && <div className="flex items-center gap-2 text-red-400 text-xs border border-red-500/30 bg-red-950/20 rounded px-4 py-3"><AlertTriangle size={14} />{error}</div>}

        {result?.needsApiKey && !result?.error && (
          <div className="flex items-start gap-3 text-xs border border-yellow-500/30 bg-yellow-950/20 rounded px-4 py-3 text-yellow-400">
            <Lock size={14} className="shrink-0 mt-0.5" />
            <div>
              <strong>HIBP API Key required</strong> for full breach list. Add <code className="bg-black/30 px-1 rounded">HIBP_API_KEY</code> to Replit Secrets.
              Get a free key at <a href="https://haveibeenpwned.com/API/Key" target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-300">haveibeenpwned.com/API/Key</a>.
              XposedOrNot results below are still available without any key.
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-5">
            <div className={`flex items-center gap-3 px-5 py-4 rounded-lg border ${anyFound ? 'border-red-500/40 bg-red-950/20' : 'border-green-500/40 bg-green-950/20'}`}>
              {anyFound
                ? <AlertTriangle size={22} className="text-red-400 shrink-0" />
                : <CheckCircle size={22} className="text-green-400 shrink-0" />}
              <div className="flex-1">
                <div className={`font-bold text-sm ${anyFound ? 'text-red-400' : 'text-green-400'}`}>
                  {anyFound
                    ? `⚠ PWNED — found in ${totalBreaches} known breach${totalBreaches !== 1 ? 'es' : ''}`
                    : '✓ Not found in checked databases'}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{result.email}</div>
              </div>
              {result.pasteCount > 0 && (
                <div className="text-right shrink-0">
                  <div className="text-xs text-red-400/70">{result.pasteCount} paste{result.pasteCount !== 1 ? 's' : ''}</div>
                  <div className="text-[10px] text-muted-foreground">found on paste sites</div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
                <div className="px-4 py-2 border-b border-border bg-black/20 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-primary tracking-widest uppercase">HaveIBeenPwned (HIBP)</span>
                  {result.needsApiKey && <span className="text-[10px] text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded">needs key</span>}
                  {!result.needsApiKey && <span className={`text-[10px] border px-1.5 py-0.5 rounded ${result.found ? 'text-red-400 border-red-500/30' : 'text-green-400 border-green-500/30'}`}>{result.found ? `${result.breachCount} breaches` : 'clean'}</span>}
                </div>
                <div className="px-4 py-3 text-xs text-muted-foreground">
                  {result.needsApiKey ? 'Add HIBP_API_KEY secret for full results.' : result.found ? `Found in ${result.breachCount} data breach${result.breachCount !== 1 ? 'es' : ''}${result.pasteCount > 0 ? ` and ${result.pasteCount} paste${result.pasteCount !== 1 ? 's' : ''}` : ''}.` : 'No breaches found in HIBP database.'}
                </div>
              </div>

              <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
                <div className="px-4 py-2 border-b border-border bg-black/20 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-primary tracking-widest uppercase">XposedOrNot</span>
                  {result.xon.error
                    ? <span className="text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 rounded">unavailable</span>
                    : <span className={`text-[10px] border px-1.5 py-0.5 rounded ${result.xon.found ? 'text-red-400 border-red-500/30' : 'text-green-400 border-green-500/30'}`}>{result.xon.found ? `${result.xon.breachCount} breaches` : 'clean'}</span>}
                </div>
                <div className="px-4 py-3 text-xs text-muted-foreground">
                  {result.xon.error
                    ? `XposedOrNot check unavailable: ${result.xon.error}`
                    : result.xon.found
                    ? (
                      <div>
                        Found in {result.xon.breachCount} breach{result.xon.breachCount !== 1 ? 'es' : ''}:
                        <div className="flex flex-wrap gap-1 mt-2">
                          {result.xon.breaches.map((b: string) => (
                            <span key={b} className="text-[10px] px-2 py-0.5 bg-red-950/30 border border-red-500/20 rounded text-red-400/80">{b}</span>
                          ))}
                        </div>
                      </div>
                    )
                    : 'No breaches found in XposedOrNot database.'}
                </div>
              </div>
            </div>

            {result.breaches.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] text-muted-foreground tracking-widest uppercase">HIBP Breach Details</div>
                {result.breaches.map((b: any) => (
                  <div key={b.name} className="bg-card/50 border border-border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-primary">{b.title}</div>
                        <div className="text-xs text-muted-foreground">{b.domain} · Breached: {b.breachDate}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm text-red-400 font-bold">{b.pwnCount?.toLocaleString()}</div>
                        <div className="text-[10px] text-muted-foreground">accounts</div>
                      </div>
                    </div>
                    {b.description && <p className="text-xs text-muted-foreground">{b.description}…</p>}
                    <div className="flex flex-wrap gap-1">
                      {(b.dataClasses ?? []).map((dc: string) => (
                        <span key={dc} className="text-[10px] px-2 py-0.5 bg-secondary border border-border rounded text-muted-foreground">{dc}</span>
                      ))}
                    </div>
                    {b.isSensitive && <div className="text-[10px] text-red-400/70">⚠ SENSITIVE BREACH</div>}
                  </div>
                ))}
              </div>
            )}

            {result.pastes.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] text-muted-foreground tracking-widest uppercase">Paste Exposures</div>
                {result.pastes.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between bg-card/50 border border-border rounded-lg px-4 py-2.5 text-xs">
                    <div>
                      <span className="text-primary">{p.source}</span>
                      {p.title && <span className="text-muted-foreground ml-2">— {p.title}</span>}
                    </div>
                    <div className="text-muted-foreground text-right">
                      {p.emailCount > 0 && <span>{p.emailCount.toLocaleString()} emails</span>}
                      {p.date && <span className="ml-3">{p.date.split('T')[0]}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
          <button onClick={() => setShowManual(!showManual)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-black/20 transition-colors text-left">
            <div className="flex items-center gap-2">
              <Database size={14} className="text-primary" />
              <span className="text-xs font-bold text-primary tracking-widest uppercase">Manual Verification — {MANUAL_CHECK_SITES.length} Breach Databases</span>
            </div>
            <span className="text-[10px] text-muted-foreground">{showManual ? '▲ hide' : '▼ show all sites'}</span>
          </button>

          {showManual && (
            <div className="border-t border-border">
              <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border/50">
                {email.trim() ? `Direct links to check "${email}" across ${MANUAL_CHECK_SITES.length} breach databases:` : 'Enter an email above, then expand this section for direct links to check it on each site.'}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/40">
                {MANUAL_CHECK_SITES.map((site, i) => (
                  <a key={site.name} href={site.url} target="_blank" rel="noopener noreferrer"
                    className={`flex items-center justify-between px-4 py-2.5 hover:bg-secondary/20 transition-colors group text-xs ${i % 2 === 0 && i === MANUAL_CHECK_SITES.length - 1 ? 'md:col-span-2' : ''}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <ExternalLink size={11} className="text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                      <div className="min-w-0">
                        <div className="text-foreground font-semibold">{site.name}</div>
                        <div className="text-muted-foreground text-[10px]">{site.desc}</div>
                      </div>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border shrink-0 ml-2 ${site.free ? 'text-green-400 border-green-500/30' : 'text-muted-foreground border-border'}`}>
                      {site.free ? 'free' : 'paid'}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
