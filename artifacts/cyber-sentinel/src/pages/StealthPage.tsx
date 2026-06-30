import React, { useState, useEffect, useRef } from 'react';
import {
  Shield, ShieldOff, Wifi, WifiOff, RefreshCw, Loader2, AlertTriangle,
  RotateCcw, Globe, Clock, CheckCircle, XCircle, Zap, Search, Filter
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

  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [proxiesLoading, setProxiesLoading] = useState(false);
  const [proxiesError, setProxiesError] = useState('');
  const [proxyFilter, setProxyFilter] = useState('');
  const [selectedProxy, setSelectedProxy] = useState<Proxy | null>(null);

  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connectedIp, setConnectedIp] = useState<string | null>(null);
  const [connectError, setConnectError] = useState('');

  const [rotating, setRotating] = useState(false);
  const [rotationBuilding, setRotationBuilding] = useState(false);
  const [rotationPlan, setRotationPlan] = useState<RotationEntry[]>([]);
  const [rotationStep, setRotationStep] = useState(-1);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const rotationTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { fetchRealIp(); }, []);

  async function fetchRealIp() {
    setRealIpLoading(true);
    try {
      const r = await fetch('/api/stealth/myip');
      const d = await r.json();
      setRealIp(d.ip ?? 'Unavailable');
    } catch { setRealIp('Unavailable'); }
    finally { setRealIpLoading(false); }
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
    setConnected(false);
    setConnectedIp(null);
    try {
      const r = await fetch('/api/stealth/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: selectedProxy.ip, port: selectedProxy.port }),
      });
      const d = await r.json();
      if (d.connected) {
        setConnected(true);
        setConnectedIp(d.exitIp);
      } else {
        setConnectError(d.error ?? 'Proxy failed');
      }
    } catch (e: any) { setConnectError(e.message ?? 'Error'); }
    finally { setConnecting(false); }
  }

  function disconnect() {
    setConnected(false);
    setConnectedIp(null);
    setConnectError('');
  }

  async function buildRotation() {
    if (proxies.length < 5) {
      await loadProxies();
    }
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
      if (!r.ok || !d.rotation?.length) {
        setRotationPlan([]);
        setRotationBuilding(false);
        return;
      }
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
          if (step >= plan.length) {
            stopRotation();
            return 0;
          }
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

  useEffect(() => () => stopRotation(), []);

  const filteredProxies = proxies.filter(p =>
    !proxyFilter ||
    p.countryName.toLowerCase().includes(proxyFilter.toLowerCase()) ||
    p.country.toLowerCase().includes(proxyFilter.toLowerCase()) ||
    p.ip.includes(proxyFilter)
  );

  const currentHop = rotationStep >= 0 && rotationStep < rotationPlan.length ? rotationPlan[rotationStep] : null;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 font-mono">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-primary">
            <Shield size={22} /> Stealth Mode — Real Proxy Routing
          </h1>
          <p className="text-muted-foreground text-xs">
            Route your server's outbound requests through real HTTP proxies. External services see the proxy's IP, not your server. No API key needed — uses live public proxy lists.
          </p>
        </header>

        <div className="flex items-start gap-3 px-4 py-3 rounded border border-yellow-500/20 bg-yellow-950/10 text-xs text-muted-foreground leading-relaxed">
          <AlertTriangle size={13} className="text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-yellow-300">How this works:</strong> When you connect a proxy, your server's HTTP requests go through that proxy first — so sites like crt.sh, AbuseIPDB, etc. see the proxy's IP. Free proxies can be slow or unstable; test a few if one fails.
          </div>
        </div>

        {/* Real IP + Connected IP side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card/50 border border-border rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Your Real Server IP</span>
              <button onClick={fetchRealIp} disabled={realIpLoading} className="text-muted-foreground hover:text-primary p-1 transition-colors">
                <RefreshCw size={11} className={realIpLoading ? 'animate-spin' : ''} />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <Globe size={18} className="text-muted-foreground shrink-0" />
              {realIpLoading
                ? <Loader2 size={16} className="animate-spin text-primary" />
                : <span className="text-lg font-bold text-foreground font-mono">{realIp ?? '—'}</span>}
            </div>
            <p className="text-[10px] text-muted-foreground/60">This is what external services see without any proxy.</p>
          </div>

          <div className={`bg-card/50 border rounded-lg p-5 space-y-3 transition-all ${connected ? 'border-green-500/40 bg-green-950/5' : 'border-border'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Exit IP via Proxy</span>
              <div className={`text-[9px] font-bold tracking-widest px-2 py-0.5 rounded border ${connected ? 'border-green-500/40 text-green-400 bg-green-950/20' : 'border-border text-muted-foreground'}`}>
                {connected ? '● LIVE' : '○ IDLE'}
              </div>
            </div>
            {connected && connectedIp ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-400 shrink-0" />
                  <span className="text-lg font-bold text-green-400 font-mono">{connectedIp}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  via {selectedProxy?.flag} {selectedProxy?.ip}:{selectedProxy?.port} — {selectedProxy?.countryName}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground/40">
                <WifiOff size={16} />
                <span className="text-xs">Select and test a proxy below</span>
              </div>
            )}
            {connectError && (
              <div className="flex items-center gap-2 text-red-400 text-[11px]">
                <XCircle size={12} />
                {connectError}
              </div>
            )}
          </div>
        </div>

        {/* Proxy Selector */}
        <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-black/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Wifi size={14} className="text-primary" />
              <span className="text-xs font-bold text-primary tracking-widest uppercase">Live Proxy List</span>
              {proxies.length > 0 && <span className="text-[10px] text-muted-foreground">({proxies.length} proxies loaded)</span>}
            </div>
            <button
              onClick={loadProxies}
              disabled={proxiesLoading}
              className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary rounded transition-colors disabled:opacity-50"
            >
              {proxiesLoading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
              {proxiesLoading ? 'Fetching…' : proxies.length ? 'Refresh' : 'Fetch Live Proxies'}
            </button>
          </div>

          {proxiesError && (
            <div className="px-4 py-3 text-red-400 text-xs border-b border-border">{proxiesError}</div>
          )}

          {proxies.length > 0 && (
            <div className="px-4 py-3 border-b border-border/50">
              <div className="flex items-center gap-2 bg-black/30 border border-border rounded px-3 py-1.5">
                <Filter size={11} className="text-muted-foreground" />
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
            <div className="divide-y divide-border/30 max-h-72 overflow-y-auto">
              {filteredProxies.slice(0, 60).map((p, i) => (
                <div
                  key={`${p.ip}:${p.port}`}
                  onClick={() => { setSelectedProxy(p); setConnected(false); setConnectError(''); setConnectedIp(null); }}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors text-xs ${selectedProxy?.ip === p.ip && selectedProxy?.port === p.port ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-secondary/20'}`}
                >
                  <span className="text-base shrink-0">{p.flag}</span>
                  <span className="font-mono text-primary w-32 truncate">{p.ip}</span>
                  <span className="text-muted-foreground w-12 text-right shrink-0">{p.port}</span>
                  <span className="text-muted-foreground flex-1 truncate">{p.countryName}</span>
                  <span className={`text-[9px] uppercase tracking-widest shrink-0 ${ANON_COLOR[p.anonymity] ?? 'text-muted-foreground'}`}>{p.anonymity}</span>
                  {p.uptime != null && <span className="text-[9px] text-muted-foreground/50 shrink-0">{Math.round(p.uptime)}% up</span>}
                </div>
              ))}
            </div>
          ) : !proxiesLoading && (
            <div className="px-4 py-8 text-center text-muted-foreground text-xs">
              Click "Fetch Live Proxies" to load real proxy servers from around the world.
            </div>
          )}

          {selectedProxy && (
            <div className="px-4 py-3 border-t border-border bg-black/10 flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                Selected: <span className="text-primary font-mono">{selectedProxy.flag} {selectedProxy.ip}:{selectedProxy.port}</span> — {selectedProxy.countryName}
              </div>
              <div className="flex gap-2">
                {!connected ? (
                  <button
                    onClick={connectProxy}
                    disabled={connecting}
                    className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/40 hover:bg-primary/20 text-primary text-xs rounded transition-colors disabled:opacity-50"
                  >
                    {connecting ? <Loader2 size={12} className="animate-spin" /> : <Shield size={12} />}
                    {connecting ? 'Testing proxy…' : 'Connect & Verify'}
                  </button>
                ) : (
                  <button
                    onClick={disconnect}
                    className="flex items-center gap-2 px-4 py-1.5 bg-red-950/20 border border-red-500/30 hover:bg-red-950/40 text-red-400 text-xs rounded transition-colors"
                  >
                    <ShieldOff size={12} />
                    Disconnect
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* IP Rotation */}
        <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-black/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RotateCcw size={14} className="text-primary" />
              <span className="text-xs font-bold text-primary tracking-widest uppercase">5-Minute Real IP Rotation</span>
            </div>
            {rotating && (
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Clock size={11} className="text-primary animate-pulse" />
                Next hop in <span className="text-primary font-bold tabular-nums ml-1">{secondsLeft}s</span>
              </div>
            )}
          </div>
          <div className="p-4 space-y-4">
            <p className="text-[11px] text-muted-foreground">
              Tests 5 real working proxies, then cycles through them — one per minute for 5 minutes. Each hop is a verified proxy IP from a real server. Requires proxy list to be loaded first.
            </p>

            {!rotating && !rotationBuilding ? (
              <button
                onClick={buildRotation}
                disabled={rotationBuilding}
                className="flex items-center gap-2 px-5 py-2 bg-primary/10 border border-primary/40 hover:bg-primary/20 text-primary text-xs rounded transition-colors disabled:opacity-50"
              >
                <Zap size={13} />
                {proxies.length === 0 ? 'Fetch Proxies & Start Rotation' : 'Find 5 Working Proxies & Rotate'}
              </button>
            ) : rotationBuilding ? (
              <div className="flex items-center gap-3 text-xs text-muted-foreground py-2">
                <Loader2 size={14} className="animate-spin text-primary" />
                Testing proxies to find 5 working ones… this may take 30–60 seconds
              </div>
            ) : (
              <button
                onClick={stopRotation}
                className="flex items-center gap-2 px-5 py-2 bg-red-950/20 border border-red-500/30 hover:bg-red-950/40 text-red-400 text-xs rounded transition-colors"
              >
                <XCircle size={13} />
                Stop Rotation
              </button>
            )}

            {rotationPlan.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-2">
                  Rotation Schedule — {rotationPlan.length} working proxies found
                </div>
                {rotationPlan.map((entry, i) => {
                  const isActive = rotating && rotationStep === i;
                  const isPast = rotating ? rotationStep > i : !rotating && rotationStep === -1 && rotationPlan.length > 0;
                  return (
                    <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded border text-xs transition-all ${isActive ? 'border-primary/50 bg-primary/10' : isPast ? 'border-green-500/20 bg-green-950/5 opacity-50' : 'border-border/40'}`}>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold shrink-0 ${isActive ? 'border-primary text-primary animate-pulse' : isPast ? 'border-green-500/40 text-green-400' : 'border-border text-muted-foreground/40'}`}>
                        {isPast && !rotating ? '✓' : entry.minute}
                      </div>
                      <span className="text-[10px] text-muted-foreground w-12 shrink-0">min {entry.minute}</span>
                      <span className={`font-bold font-mono text-[11px] flex-1 ${isActive ? 'text-green-400' : 'text-muted-foreground/70'}`}>{entry.exitIp}</span>
                      <span className="text-[10px] text-muted-foreground/50 shrink-0">via {entry.proxyHost}:{entry.proxyPort}</span>
                      <span className="text-[10px] shrink-0">{entry.flag} {entry.country}</span>
                    </div>
                  );
                })}
                {!rotating && rotationPlan.length > 0 && rotationStep === -1 && (
                  <div className="text-center text-xs text-green-400/70 py-1">✓ Rotation complete</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Field guide */}
        <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-black/20">
            <span className="text-xs font-bold text-primary tracking-widest uppercase">Real Anonymization — Field Guide</span>
          </div>
          <div className="p-4 space-y-3 text-[11px] text-muted-foreground">
            {[
              { title: 'Tor Browser', desc: 'Routes through 3 random Tor nodes. Free, battle-tested, but slow. Best for high-risk browsing and .onion sites.', badge: 'Free', color: 'text-purple-400' },
              { title: 'Mullvad VPN', desc: 'No-log, RAM-only servers, accepts anonymous payment (cash/Monero). Audited. WireGuard. €5/mo.', badge: 'Paid', color: 'text-green-400' },
              { title: 'ProtonVPN', desc: 'Swiss privacy law, open-source clients, free tier available. Strong for everyday use.', badge: 'Free/Paid', color: 'text-blue-400' },
              { title: 'Whonix', desc: 'Linux distro forcing ALL traffic through Tor at OS level — even malware cannot leak your real IP. Runs in VirtualBox.', badge: 'Free', color: 'text-yellow-400' },
              { title: 'Residential Proxies', desc: 'IPs assigned to real ISP customers — harder to block than datacenter proxies. Used by red teams for recon (Oxylabs, Bright Data).', badge: 'Paid', color: 'text-orange-400' },
            ].map(item => (
              <div key={item.title} className="flex gap-3 py-2 border-b border-border/30 last:border-0">
                <div className="shrink-0 w-32">
                  <div className="text-foreground font-bold text-[11px]">{item.title}</div>
                  <span className={`text-[9px] ${item.color}`}>{item.badge}</span>
                </div>
                <div className="leading-relaxed">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
