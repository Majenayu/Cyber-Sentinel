import React, { useState, useEffect, useRef } from 'react';
import {
  Shield, ShieldOff, Ghost, Wifi, WifiOff, RefreshCw, Loader2,
  AlertTriangle, RotateCcw, Globe, Clock, CheckCircle, XCircle,
  Zap, Filter, Eye, EyeOff, Activity
} from 'lucide-react';

interface Proxy {
  ip: string;
  port: number;
  country: string;
  countryName: string;
  flag: string;
  uptime: number | null;
  speed: number | null;
  anonymity: string;
  protocols: string[];
}

interface GhostStatus {
  active: boolean;
  exitIp: string | null;
  proxy: { ip: string; port: number; country: string; countryName: string; flag: string } | null;
  activatedAt: string | null;
  rotationCount: number;
  nextRotation: string | null;
}

interface RotationEntry {
  minute: number;
  exitIp: string;
  proxyHost: string;
  proxyPort: number;
  country: string;
  flag: string;
  working: boolean;
}

const ANON_COLOR: Record<string, string> = {
  elite: 'text-green-400',
  anonymous: 'text-yellow-400',
  transparent: 'text-red-400',
  unknown: 'text-muted-foreground',
};

export default function StealthPage() {
  const [realIp, setRealIp] = useState<string | null>(null);
  const [realIpLoading, setRealIpLoading] = useState(false);

  // Ghost Mode state
  const [ghost, setGhost] = useState<GhostStatus>({ active: false, exitIp: null, proxy: null, activatedAt: null, rotationCount: 0, nextRotation: null });
  const [ghostActivating, setGhostActivating] = useState(false);
  const [ghostError, setGhostError] = useState('');
  const ghostPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Manual proxy list state
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [proxiesLoading, setProxiesLoading] = useState(false);
  const [proxiesError, setProxiesError] = useState('');
  const [proxyFilter, setProxyFilter] = useState('');
  const [selectedProxy, setSelectedProxy] = useState<Proxy | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectedIp, setConnectedIp] = useState<string | null>(null);
  const [connectError, setConnectError] = useState('');

  // Rotation state
  const [rotationBuilding, setRotationBuilding] = useState(false);
  const [rotationPlan, setRotationPlan] = useState<RotationEntry[]>([]);
  const [rotating, setRotating] = useState(false);
  const [rotationStep, setRotationStep] = useState(-1);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const rotationTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchRealIp();
    fetchGhostStatus();
    ghostPollRef.current = setInterval(fetchGhostStatus, 15000);
    return () => {
      if (ghostPollRef.current) clearInterval(ghostPollRef.current);
      stopRotation();
    };
  }, []);

  async function fetchRealIp() {
    setRealIpLoading(true);
    try {
      const r = await fetch('/api/stealth/myip');
      const d = await r.json();
      setRealIp(d.ip ?? 'Unavailable');
    } catch { setRealIp('Unavailable'); }
    finally { setRealIpLoading(false); }
  }

  async function fetchGhostStatus() {
    try {
      const r = await fetch('/api/ghost/status');
      const d = await r.json();
      setGhost(d);
    } catch {}
  }

  async function activateGhost() {
    setGhostActivating(true);
    setGhostError('');
    try {
      const r = await fetch('/api/ghost/on', { method: 'POST' });
      const d = await r.json();
      if (!r.ok) { setGhostError(d.error ?? 'Failed to activate'); return; }
      setGhost(prev => ({ ...prev, active: true, exitIp: d.exitIp, proxy: d.proxy }));
    } catch (e: any) { setGhostError(e.message ?? 'Network error'); }
    finally { setGhostActivating(false); }
  }

  async function deactivateGhost() {
    try {
      await fetch('/api/ghost/off', { method: 'POST' });
      setGhost(prev => ({ ...prev, active: false, exitIp: null, proxy: null }));
      setGhostError('');
    } catch {}
  }

  async function loadProxies() {
    setProxiesLoading(true);
    setProxiesError('');
    try {
      const r = await fetch('/api/stealth/proxies');
      const d = await r.json();
      if (!r.ok) { setProxiesError(d.error ?? 'Failed'); return; }
      setProxies(d.proxies ?? []);
    } catch (e: any) { setProxiesError(e.message ?? 'Network error'); }
    finally { setProxiesLoading(false); }
  }

  async function connectProxy() {
    if (!selectedProxy) return;
    setConnecting(true);
    setConnectError('');
    setConnectedIp(null);
    try {
      const r = await fetch('/api/stealth/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: selectedProxy.ip, port: selectedProxy.port }),
      });
      const d = await r.json();
      if (d.connected) { setConnectedIp(d.exitIp); }
      else { setConnectError(d.error ?? 'Proxy failed'); }
    } catch (e: any) { setConnectError(e.message ?? 'Error'); }
    finally { setConnecting(false); }
  }

  async function buildRotation() {
    if (proxies.length < 5) await loadProxies();
    setRotationBuilding(true);
    setRotationPlan([]);
    setRotationStep(-1);
    const candidates = [...proxies].sort(() => Math.random() - 0.5).slice(0, 10);
    try {
      const r = await fetch('/api/stealth/rotate-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proxies: candidates }),
      });
      const d = await r.json();
      if (!r.ok || !d.rotation?.length) { setRotationBuilding(false); return; }
      setRotationPlan(d.rotation);
      setRotationBuilding(false);
      startRotationTimer(d.rotation);
    } catch { setRotationBuilding(false); }
  }

  function startRotationTimer(plan: RotationEntry[]) {
    setRotating(true);
    let step = 0;
    setRotationStep(0);
    setSecondsLeft(60);
    rotationTimer.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          step++;
          if (step >= plan.length) { stopRotation(); return 0; }
          setRotationStep(step);
          return 60;
        }
        return s - 1;
      });
    }, 1000);
  }

  function stopRotation() {
    if (rotationTimer.current) { clearInterval(rotationTimer.current); rotationTimer.current = null; }
    setRotating(false);
    setRotationStep(-1);
    setSecondsLeft(0);
  }

  const filteredProxies = proxies.filter(p =>
    !proxyFilter ||
    p.countryName.toLowerCase().includes(proxyFilter.toLowerCase()) ||
    p.country.toLowerCase().includes(proxyFilter.toLowerCase()) ||
    p.ip.includes(proxyFilter)
  );

  const minutesSinceActivation = ghost.activatedAt
    ? Math.floor((Date.now() - new Date(ghost.activatedAt).getTime()) / 60000)
    : 0;

  const minutesToNextRotation = ghost.nextRotation
    ? Math.max(0, Math.ceil((new Date(ghost.nextRotation).getTime() - Date.now()) / 60000))
    : null;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 font-mono">
      <div className="max-w-5xl mx-auto space-y-6">

        <header className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-primary">
            <Ghost size={22} /> Ghost Mode — Proxy Routing
          </h1>
          <p className="text-muted-foreground text-xs">
            When Ghost Mode is active, ALL outbound server requests (OSINT, IP lookup, subdomain recon, breach checks, WHOIS) route through a real proxy. External services see the proxy IP — not your Render server's IP.
          </p>
        </header>

        {/* ── Ghost Mode Master Toggle ─────────────────────────────────── */}
        <div className={`rounded-lg border-2 p-6 transition-all duration-500 ${ghost.active ? 'border-primary/60 bg-primary/5 shadow-lg shadow-primary/10' : 'border-border bg-card/50'}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${ghost.active ? 'bg-primary animate-pulse' : 'bg-muted-foreground/30'}`} />
                <span className={`text-sm font-bold tracking-widest uppercase ${ghost.active ? 'text-primary' : 'text-muted-foreground'}`}>
                  Ghost Mode {ghost.active ? 'Active' : 'Inactive'}
                </span>
                {ghost.active && ghost.rotationCount > 0 && (
                  <span className="text-[10px] text-muted-foreground border border-border px-2 py-0.5 rounded">
                    {ghost.rotationCount} rotation{ghost.rotationCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {ghost.active && ghost.proxy && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-400 shrink-0" />
                    <span className="text-xs text-muted-foreground">All OSINT/recon exits through:</span>
                    <span className="text-sm font-bold text-green-400 font-mono">{ghost.exitIp}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground pl-5">
                    <span>via proxy {ghost.proxy.flag} {ghost.proxy.ip}:{ghost.proxy.port}</span>
                    <span>·</span>
                    <span>{ghost.proxy.countryName}</span>
                    {minutesSinceActivation > 0 && <><span>·</span><span>active {minutesSinceActivation}m</span></>}
                    {minutesToNextRotation !== null && <><span>·</span><Clock size={10} /><span>rotates in {minutesToNextRotation}m</span></>}
                  </div>
                </div>
              )}

              {!ghost.active && (
                <p className="text-xs text-muted-foreground pl-5">
                  Your server uses its own IP for all external requests. Activate to route through an anonymous proxy.
                </p>
              )}

              {ghostError && (
                <div className="flex items-center gap-2 text-red-400 text-[11px] pl-5">
                  <XCircle size={11} /> {ghostError}
                </div>
              )}
            </div>

            <div className="shrink-0">
              {!ghost.active ? (
                <button
                  onClick={activateGhost}
                  disabled={ghostActivating}
                  className="flex items-center gap-2 px-6 py-3 bg-primary/10 border border-primary/50 hover:bg-primary/20 text-primary text-sm font-bold rounded-lg transition-all disabled:opacity-50"
                >
                  {ghostActivating ? <Loader2 size={15} className="animate-spin" /> : <Ghost size={15} />}
                  {ghostActivating ? 'Finding proxy…' : 'Activate Ghost Mode'}
                </button>
              ) : (
                <button
                  onClick={deactivateGhost}
                  className="flex items-center gap-2 px-6 py-3 bg-red-950/20 border border-red-500/30 hover:bg-red-950/40 text-red-400 text-sm font-bold rounded-lg transition-all"
                >
                  <EyeOff size={15} />
                  Deactivate
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Info box */}
        <div className="flex items-start gap-3 px-4 py-3 rounded border border-yellow-500/20 bg-yellow-950/10 text-[11px] text-muted-foreground leading-relaxed">
          <AlertTriangle size={12} className="text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-yellow-300">What Ghost Mode protects:</strong> All server-side recon calls (crt.sh, AbuseIPDB, WHOIS, HIBP, HackerTarget, Shodan, ip-api.com) exit through the proxy — those services cannot trace requests back to your Render server. Auto-rotates the proxy every 5 minutes. Free proxies can be slow; if activation fails, try again.
          </div>
        </div>

        {/* Real IP display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card/50 border border-border rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Your Render Server IP</span>
              <button onClick={fetchRealIp} disabled={realIpLoading} className="text-muted-foreground hover:text-primary p-1 transition-colors">
                <RefreshCw size={10} className={realIpLoading ? 'animate-spin' : ''} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-muted-foreground" />
              {realIpLoading ? <Loader2 size={14} className="animate-spin text-primary" /> : <span className="text-base font-bold font-mono">{realIp ?? '—'}</span>}
            </div>
            <p className="text-[10px] text-muted-foreground/60">What external sites see without Ghost Mode.</p>
          </div>

          <div className={`bg-card/50 border rounded-lg p-4 space-y-2 transition-all ${ghost.active ? 'border-green-500/30 bg-green-950/5' : 'border-border'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Ghost Exit IP</span>
              <div className={`text-[9px] font-bold px-2 py-0.5 rounded border ${ghost.active ? 'border-green-500/30 text-green-400' : 'border-border text-muted-foreground/40'}`}>
                {ghost.active ? '● LIVE' : '○ IDLE'}
              </div>
            </div>
            {ghost.active && ghost.exitIp ? (
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-green-400" />
                <span className="text-base font-bold font-mono text-green-400">{ghost.exitIp}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground/40 text-xs">
                <WifiOff size={14} /> Activate Ghost Mode above
              </div>
            )}
            {ghost.proxy && (
              <p className="text-[10px] text-muted-foreground/60">via {ghost.proxy.flag} {ghost.proxy.ip}:{ghost.proxy.port}</p>
            )}
          </div>
        </div>

        {/* ── Manual Proxy Selector ─────────────────────────────────────── */}
        <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-black/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Wifi size={13} className="text-primary" />
              <span className="text-xs font-bold text-primary tracking-widest uppercase">Manual Proxy Test</span>
              {proxies.length > 0 && <span className="text-[10px] text-muted-foreground">({proxies.length} proxies)</span>}
            </div>
            <button
              onClick={loadProxies}
              disabled={proxiesLoading}
              className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary rounded transition-colors disabled:opacity-50"
            >
              {proxiesLoading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
              {proxiesLoading ? 'Fetching…' : proxies.length ? 'Refresh' : 'Load Proxy List'}
            </button>
          </div>

          {proxiesError && <div className="px-4 py-2 text-red-400 text-xs border-b border-border">{proxiesError}</div>}

          {proxies.length > 0 && (
            <div className="px-4 py-2 border-b border-border/50">
              <div className="flex items-center gap-2 bg-black/30 border border-border rounded px-3 py-1.5">
                <Filter size={10} className="text-muted-foreground" />
                <input
                  value={proxyFilter}
                  onChange={e => setProxyFilter(e.target.value)}
                  placeholder="Filter by country or IP…"
                  className="bg-transparent flex-1 text-xs outline-none text-foreground placeholder:text-muted-foreground/40"
                />
              </div>
            </div>
          )}

          {proxies.length > 0 ? (
            <div className="divide-y divide-border/30 max-h-60 overflow-y-auto">
              {filteredProxies.slice(0, 60).map((p) => (
                <div
                  key={`${p.ip}:${p.port}`}
                  onClick={() => { setSelectedProxy(p); setConnectedIp(null); setConnectError(''); }}
                  className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors text-xs ${selectedProxy?.ip === p.ip && selectedProxy?.port === p.port ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-secondary/20'}`}
                >
                  <span className="text-sm shrink-0">{p.flag}</span>
                  <span className="font-mono text-primary w-32 truncate">{p.ip}</span>
                  <span className="text-muted-foreground w-12 text-right shrink-0">{p.port}</span>
                  <span className="text-muted-foreground flex-1 truncate">{p.countryName}</span>
                  <span className={`text-[9px] uppercase tracking-widest shrink-0 ${ANON_COLOR[p.anonymity] ?? 'text-muted-foreground'}`}>{p.anonymity}</span>
                  {p.uptime != null && <span className="text-[9px] text-muted-foreground/40 shrink-0">{Math.round(p.uptime)}%</span>}
                </div>
              ))}
            </div>
          ) : !proxiesLoading && (
            <div className="px-4 py-6 text-center text-muted-foreground text-xs">
              Load the proxy list to manually test individual proxies.
            </div>
          )}

          {selectedProxy && (
            <div className="px-4 py-3 border-t border-border bg-black/10 flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                {selectedProxy.flag} <span className="text-primary font-mono">{selectedProxy.ip}:{selectedProxy.port}</span> — {selectedProxy.countryName}
                {connectedIp && <span className="text-green-400 ml-3">→ exit IP: <strong>{connectedIp}</strong></span>}
                {connectError && <span className="text-red-400 ml-3">{connectError}</span>}
              </div>
              <button
                onClick={connectProxy}
                disabled={connecting}
                className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/40 hover:bg-primary/20 text-primary text-xs rounded transition-colors disabled:opacity-50"
              >
                {connecting ? <Loader2 size={11} className="animate-spin" /> : <Activity size={11} />}
                {connecting ? 'Testing…' : 'Test Proxy'}
              </button>
            </div>
          )}
        </div>

        {/* ── 5-Minute Rotation ─────────────────────────────────────────── */}
        <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-black/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RotateCcw size={13} className="text-primary" />
              <span className="text-xs font-bold text-primary tracking-widest uppercase">Manual 5-Minute Rotation</span>
            </div>
            {rotating && (
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Clock size={10} className="text-primary animate-pulse" />
                Next hop in <span className="text-primary font-bold tabular-nums ml-1">{secondsLeft}s</span>
              </div>
            )}
          </div>
          <div className="p-4 space-y-3">
            <p className="text-[11px] text-muted-foreground">
              Tests up to 10 proxies, picks 5 that respond, then cycles through them — one per minute. Separate from Ghost Mode's automatic rotation.
            </p>
            {!rotating && !rotationBuilding ? (
              <button
                onClick={buildRotation}
                className="flex items-center gap-2 px-5 py-2 bg-primary/10 border border-primary/40 hover:bg-primary/20 text-primary text-xs rounded transition-colors"
              >
                <Zap size={12} />
                {proxies.length === 0 ? 'Fetch & Start Rotation' : 'Start 5-Hop Rotation'}
              </button>
            ) : rotationBuilding ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                <Loader2 size={13} className="animate-spin text-primary" />
                Testing proxies… 30–90 seconds
              </div>
            ) : (
              <button onClick={stopRotation} className="flex items-center gap-2 px-5 py-2 bg-red-950/20 border border-red-500/30 text-red-400 text-xs rounded">
                <XCircle size={12} /> Stop Rotation
              </button>
            )}

            {rotationPlan.length > 0 && (
              <div className="space-y-1.5">
                {rotationPlan.map((entry, i) => {
                  const isActive = rotating && rotationStep === i;
                  return (
                    <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded border text-xs transition-all ${isActive ? 'border-primary/50 bg-primary/10' : 'border-border/30'}`}>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold shrink-0 ${isActive ? 'border-primary text-primary animate-pulse' : 'border-border text-muted-foreground/40'}`}>
                        {entry.minute}
                      </div>
                      <span className="text-[10px] text-muted-foreground w-10 shrink-0">min {entry.minute}</span>
                      <span className={`font-bold font-mono text-[11px] flex-1 ${isActive ? 'text-green-400' : 'text-muted-foreground/60'}`}>{entry.exitIp}</span>
                      <span className="text-[10px] text-muted-foreground/40 shrink-0">via {entry.proxyHost}:{entry.proxyPort}</span>
                      <span className="text-[10px] shrink-0">{entry.flag}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Field guide */}
        <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-black/20">
            <span className="text-xs font-bold text-primary tracking-widest uppercase">Threat Model — What Ghost Mode Does & Doesn't Protect</span>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
            <div className="space-y-2">
              <div className="text-green-400 font-bold text-[10px] tracking-widest uppercase mb-1">✓ Protected with Ghost Mode</div>
              {[
                'crt.sh sees proxy IP, not Render server',
                'AbuseIPDB sees proxy IP on every check',
                'WHOIS / RDAP queries exit via proxy',
                'HIBP breach lookups via proxy',
                'Username OSINT checks via proxy',
                'IP geolocation lookups via proxy',
                'HackerTarget subdomain queries via proxy',
                'Auto-rotates proxy every 5 minutes',
              ].map(t => <div key={t} className="flex items-start gap-2 text-muted-foreground"><span className="text-green-400 shrink-0">✓</span>{t}</div>)}
            </div>
            <div className="space-y-2">
              <div className="text-red-400 font-bold text-[10px] tracking-widest uppercase mb-1">✗ Not Protected (requires Tor/VPN on device)</div>
              {[
                'Your ISP sees you connecting to Render',
                'Render logs your browser\'s real IP',
                'Your browser fingerprint (canvas, fonts, etc.)',
                'DNS leaks from your local network',
                'Cookies & session tracking on websites you visit directly',
                'Browser → Render connection is always visible to your ISP',
              ].map(t => <div key={t} className="flex items-start gap-2 text-muted-foreground"><span className="text-red-400 shrink-0">✗</span>{t}</div>)}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
