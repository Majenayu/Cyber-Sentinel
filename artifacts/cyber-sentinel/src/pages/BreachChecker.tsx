import React, { useState } from 'react';
import { ShieldOff, Search, AlertTriangle, CheckCircle, Lock, Loader2 } from 'lucide-react';

export default function BreachChecker() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState('');

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

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 font-mono">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-primary"><ShieldOff size={22} /> Email Breach Checker</h1>
          <p className="text-muted-foreground text-xs">Check if an email address appears in known data breaches (powered by HaveIBeenPwned).</p>
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
              <strong>HIBP API Key required</strong> for full results. Add <code className="bg-black/30 px-1 rounded">HIBP_API_KEY</code> to your Replit Secrets.
              Get one at <a href="https://haveibeenpwned.com/API/Key" target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-300">haveibeenpwned.com/API/Key</a>.
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className={`flex items-center gap-3 px-5 py-4 rounded-lg border ${result.found ? 'border-red-500/40 bg-red-950/20' : 'border-green-500/40 bg-green-950/20'}`}>
              {result.found
                ? <AlertTriangle size={22} className="text-red-400 shrink-0" />
                : <CheckCircle size={22} className="text-green-400 shrink-0" />}
              <div>
                <div className={`font-bold text-sm ${result.found ? 'text-red-400' : 'text-green-400'}`}>
                  {result.found ? `⚠ PWNED in ${result.breachCount} breach${result.breachCount !== 1 ? 'es' : ''}` : '✓ Not found in any known breach'}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{result.email}</div>
              </div>
              {result.pasteCount > 0 && (
                <div className="ml-auto text-right">
                  <div className="text-xs text-red-400/70">{result.pasteCount} paste{result.pasteCount !== 1 ? 's' : ''}</div>
                  <div className="text-[10px] text-muted-foreground">found on pastebin-type sites</div>
                </div>
              )}
            </div>

            {result.breaches.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] text-muted-foreground tracking-widest uppercase">Breach Details</div>
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
      </div>
    </div>
  );
}
