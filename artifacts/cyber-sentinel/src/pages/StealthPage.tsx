import React, { useState, useEffect, useRef } from 'react';
import { Shield, ShieldOff, Wifi, WifiOff, RefreshCw, MapPin, Loader2, AlertTriangle, RotateCcw, Globe, Clock } from 'lucide-react';

interface VpnLocation {
  country: string;
  city: string;
  code: string;
  lat: number;
  lon: number;
}

interface RotationEntry {
  minute: number;
  ip: string;
  location: VpnLocation;
}

const FLAG: Record<string, string> = {
  NL: '🇳🇱', DE: '🇩🇪', CH: '🇨🇭', SE: '🇸🇪', FI: '🇫🇮', NO: '🇳🇴',
  US: '🇺🇸', CA: '🇨🇦', GB: '🇬🇧', FR: '🇫🇷', JP: '🇯🇵', SG: '🇸🇬',
  AU: '🇦🇺', BR: '🇧🇷', RO: '🇷🇴', IS: '🇮🇸', PA: '🇵🇦', MX: '🇲🇽',
};

export default function StealthPage() {
  const [realIp, setRealIp] = useState<string | null>(null);
  const [realIpLoading, setRealIpLoading] = useState(false);
  const [locations, setLocations] = useState<VpnLocation[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const [vpnConnected, setVpnConnected] = useState(false);
  const [vpnConnecting, setVpnConnecting] = useState(false);
  const [vpnIp, setVpnIp] = useState<string | null>(null);
  const [vpnLocation, setVpnLocation] = useState<VpnLocation | null>(null);

  const [rotating, setRotating] = useState(false);
  const [rotationPlan, setRotationPlan] = useState<RotationEntry[]>([]);
  const [rotationStep, setRotationStep] = useState(-1);
  const [rotationSecondsLeft, setRotationSecondsLeft] = useState(0);
  const rotationTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const rotationStepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchLocations();
    fetchRealIp();
  }, []);

  async function fetchRealIp() {
    setRealIpLoading(true);
    try {
      const r = await fetch('/api/stealth/myip');
      const d = await r.json();
      setRealIp(d.ip ?? 'Unknown');
    } catch {
      setRealIp('Unavailable');
    } finally {
      setRealIpLoading(false);
    }
  }

  async function fetchLocations() {
    try {
      const r = await fetch('/api/stealth/locations');
      const d = await r.json();
      setLocations(d.locations ?? []);
    } catch {}
  }

  async function connectVpn() {
    setVpnConnecting(true);
    try {
      const r = await fetch('/api/stealth/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationIndex: selectedIdx }),
      });
      const d = await r.json();
      if (d.connected) {
        setVpnIp(d.ip);
        setVpnLocation(d.location);
        setVpnConnected(true);
      }
    } catch {}
    finally { setVpnConnecting(false); }
  }

  function disconnectVpn() {
    setVpnConnected(false);
    setVpnIp(null);
    setVpnLocation(null);
  }

  async function startRotation() {
    setRotating(true);
    setRotationStep(-1);
    setRotationPlan([]);
    try {
      const r = await fetch('/api/stealth/rotate');
      const d = await r.json();
      const plan: RotationEntry[] = d.rotation ?? [];
      setRotationPlan(plan);
      if (plan.length === 0) { setRotating(false); return; }

      let step = 0;
      setRotationStep(0);
      setRotationSecondsLeft(60);

      function tick() {
        setRotationSecondsLeft(s => {
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
      }

      rotationTimer.current = setInterval(tick, 1000);
    } catch { setRotating(false); }
  }

  function stopRotation() {
    if (rotationTimer.current) { clearInterval(rotationTimer.current); rotationTimer.current = null; }
    if (rotationStepTimer.current) { clearTimeout(rotationStepTimer.current); rotationStepTimer.current = null; }
    setRotating(false);
    setRotationStep(-1);
    setRotationSecondsLeft(0);
  }

  useEffect(() => () => stopRotation(), []);

  const currentRotEntry = rotationStep >= 0 && rotationStep < rotationPlan.length ? rotationPlan[rotationStep] : null;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 font-mono">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2 text-primary">
            <Shield size={22} /> Stealth Mode
          </h1>
          <p className="text-muted-foreground text-xs">
            VPN location simulator and IP rotation tool. Visualise exit-node identity switching for OpSec planning and network anonymization research.
          </p>
        </header>

        <div className="flex items-start gap-3 px-4 py-3 rounded border border-yellow-500/20 bg-yellow-950/10 text-xs text-muted-foreground leading-relaxed">
          <AlertTriangle size={13} className="text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-yellow-300">Educational simulation only.</strong> The VPN and IP rotation features display simulated exit-node IPs for OpSec planning and anonymization research. For real operational anonymity, use <span className="text-primary">Tor Browser</span>, a trusted no-log VPN (Mullvad, ProtonVPN), or a commercial proxy service. Your actual server IP is shown in the panel below.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card/50 border border-border rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Real Server IP</span>
              <button onClick={fetchRealIp} disabled={realIpLoading} className="text-muted-foreground hover:text-primary transition-colors p-1">
                <RefreshCw size={11} className={realIpLoading ? 'animate-spin' : ''} />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <Globe size={18} className="text-primary shrink-0" />
              {realIpLoading
                ? <Loader2 size={16} className="animate-spin text-primary" />
                : <span className="text-lg font-bold text-primary font-mono">{realIp ?? '—'}</span>
              }
            </div>
            <p className="text-[10px] text-muted-foreground/60">This is your actual outbound IP address as seen by external services.</p>
          </div>

          <div className={`bg-card/50 border rounded-lg p-5 space-y-3 transition-colors ${vpnConnected ? 'border-green-500/40' : 'border-border'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground tracking-widest uppercase">VPN Status</span>
              <div className={`text-[9px] font-bold tracking-widest px-2 py-0.5 rounded border ${vpnConnected ? 'border-green-500/40 text-green-400 bg-green-950/20' : 'border-border text-muted-foreground'}`}>
                {vpnConnected ? '● CONNECTED' : '○ DISCONNECTED'}
              </div>
            </div>
            {vpnConnected && vpnLocation && (
              <div className="flex items-center gap-2">
                <span className="text-2xl">{FLAG[vpnLocation.code] ?? '🌐'}</span>
                <div>
                  <div className="text-sm font-bold text-green-400">{vpnIp}</div>
                  <div className="text-[10px] text-muted-foreground">{vpnLocation.city}, {vpnLocation.country}</div>
                </div>
              </div>
            )}
            {!vpnConnected && (
              <div className="flex items-center gap-2 text-muted-foreground/40">
                <WifiOff size={16} />
                <span className="text-xs">Not connected</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-black/20 flex items-center gap-2">
            <Wifi size={14} className="text-primary" />
            <span className="text-xs font-bold text-primary tracking-widest uppercase">VPN Location</span>
          </div>
          <div className="p-4 space-y-4">
            <p className="text-[11px] text-muted-foreground">Select an exit node location and click Connect. The simulated IP shown represents what your traffic would appear as through that node.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
              <button
                onClick={() => setSelectedIdx(null)}
                className={`flex flex-col items-center gap-1 p-2 rounded border text-xs transition-colors ${selectedIdx === null ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground'}`}
              >
                <span className="text-lg">🎲</span>
                <span className="text-[10px] font-bold">Random</span>
              </button>
              {locations.map((loc, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedIdx(i)}
                  className={`flex flex-col items-center gap-1 p-2 rounded border text-xs transition-colors ${selectedIdx === i ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground'}`}
                >
                  <span className="text-lg">{FLAG[loc.code] ?? '🌐'}</span>
                  <span className="text-[10px] font-bold truncate w-full text-center">{loc.city}</span>
                  <span className="text-[9px] opacity-60">{loc.code}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              {!vpnConnected ? (
                <button
                  onClick={connectVpn}
                  disabled={vpnConnecting}
                  className="flex items-center gap-2 px-5 py-2 bg-primary/10 border border-primary/40 hover:bg-primary/20 text-primary text-xs rounded transition-colors disabled:opacity-50"
                >
                  {vpnConnecting ? <Loader2 size={13} className="animate-spin" /> : <Shield size={13} />}
                  {vpnConnecting ? 'Connecting…' : 'Connect'}
                </button>
              ) : (
                <button
                  onClick={disconnectVpn}
                  className="flex items-center gap-2 px-5 py-2 bg-red-950/20 border border-red-500/30 hover:bg-red-950/40 text-red-400 text-xs rounded transition-colors"
                >
                  <ShieldOff size={13} />
                  Disconnect
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-black/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RotateCcw size={14} className="text-primary" />
              <span className="text-xs font-bold text-primary tracking-widest uppercase">IP Rotation</span>
            </div>
            {rotating && rotationStep >= 0 && (
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Clock size={11} className="text-primary animate-pulse" />
                <span>Next rotation in <span className="text-primary font-bold tabular-nums">{rotationSecondsLeft}s</span></span>
              </div>
            )}
          </div>
          <div className="p-4 space-y-4">
            <p className="text-[11px] text-muted-foreground">
              Simulates rotating through 5 different exit-node IPs, one per minute, for up to 5 minutes total — the same pattern used by automated recon tools to evade rate limiting and IP-based blocks.
            </p>

            {!rotating ? (
              <button
                onClick={startRotation}
                className="flex items-center gap-2 px-5 py-2 bg-primary/10 border border-primary/40 hover:bg-primary/20 text-primary text-xs rounded transition-colors"
              >
                <RotateCcw size={13} />
                Start 5-Minute Rotation
              </button>
            ) : (
              <button
                onClick={stopRotation}
                className="flex items-center gap-2 px-5 py-2 bg-red-950/20 border border-red-500/30 hover:bg-red-950/40 text-red-400 text-xs rounded transition-colors"
              >
                <RefreshCw size={13} />
                Stop Rotation
              </button>
            )}

            {rotationPlan.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] text-muted-foreground tracking-widest uppercase mb-2">Rotation Schedule</div>
                {rotationPlan.map((entry, i) => {
                  const isActive = rotating && rotationStep === i;
                  const isPast = rotating ? rotationStep > i : false;
                  const isFuture = rotating ? rotationStep < i : true;
                  return (
                    <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded border text-xs transition-all ${isActive ? 'border-primary/50 bg-primary/10' : isPast ? 'border-green-500/20 bg-green-950/5 opacity-60' : 'border-border/40'}`}>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold shrink-0 ${isActive ? 'border-primary text-primary animate-pulse' : isPast ? 'border-green-500/40 text-green-400' : 'border-border text-muted-foreground/40'}`}>
                        {isPast ? '✓' : entry.minute}
                      </div>
                      <span className="text-[10px] text-muted-foreground w-16 shrink-0">min {entry.minute}</span>
                      <span className={`font-bold font-mono text-[11px] ${isActive ? 'text-primary' : isPast ? 'text-green-400/70' : 'text-muted-foreground/60'}`}>{entry.ip}</span>
                      <span className="ml-auto text-[10px] text-muted-foreground/60">{FLAG[entry.location.code] ?? ''} {entry.location.city}</span>
                    </div>
                  );
                })}
                {!rotating && rotationStep === -1 && rotationPlan.length > 0 && (
                  <div className="text-center text-xs text-green-400 py-2">✓ Rotation complete</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-card/50 border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-black/20">
            <span className="text-xs font-bold text-primary tracking-widest uppercase">Real Anonymization — Field Guide</span>
          </div>
          <div className="p-4 space-y-3 text-[11px] text-muted-foreground">
            {[
              { title: 'Tor Browser', desc: 'Routes traffic through 3 random Tor nodes. Free, battle-tested, but slow. Best for high-risk browsing and .onion sites.', badge: 'Free', color: 'text-purple-400' },
              { title: 'Mullvad VPN', desc: 'No-log, RAM-only servers, accepts anonymous payment (cash/Monero). Audited. WireGuard protocol. €5/mo.', badge: 'Paid', color: 'text-green-400' },
              { title: 'ProtonVPN', desc: 'Swiss privacy law, open-source clients, free tier available. Strong for everyday use. Integrates with ProtonMail.', badge: 'Free/Paid', color: 'text-blue-400' },
              { title: 'Whonix', desc: 'Linux distro that forces ALL traffic through Tor at the OS level — even malware cannot leak your real IP. Runs in VirtualBox.', badge: 'Free', color: 'text-yellow-400' },
              { title: 'Residential Proxies', desc: 'IP addresses assigned to real ISP customers — harder to block than datacenter IPs. Used by red teams for recon. Various providers (Oxylabs, Bright Data).', badge: 'Paid', color: 'text-orange-400' },
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
