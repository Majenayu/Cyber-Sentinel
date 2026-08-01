import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import {
  MonitorDot, Wifi, WifiOff, RefreshCw, Unplug, Maximize2, Minimize2,
  Loader2, ChevronDown, ChevronUp, Eye, EyeOff,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

// ── WebSocket URL for remote terminal ─────────────────────────────────────
function getWsUrl() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}/ws/remote-terminal`;
}

// ── Saved config ──────────────────────────────────────────────────────────
const STORAGE_KEY = 'cs-remote-term-config';
function loadConfig() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}
function saveConfig(cfg: { hostname: string; username: string }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

// ── Theme palettes (same as local TerminalPage) ───────────────────────────
const PALETTES: Record<string, Partial<import('@xterm/xterm').ITheme>> = {
  default: { background: '#0a0a0f', foreground: '#00ff41', cursor: '#00ff41', cursorAccent: '#0a0a0f', selectionBackground: '#00ff4133' },
  red:     { background: '#0d0000', foreground: '#ff2020', cursor: '#ff2020', cursorAccent: '#0d0000', selectionBackground: '#ff202033' },
  blue:    { background: '#000a1a', foreground: '#00aaff', cursor: '#00aaff', cursorAccent: '#000a1a', selectionBackground: '#00aaff33' },
  purple:  { background: '#0a000f', foreground: '#bf00ff', cursor: '#bf00ff', cursorAccent: '#0a000f', selectionBackground: '#bf00ff33' },
  gold:    { background: '#0f0a00', foreground: '#ffd700', cursor: '#ffd700', cursorAccent: '#0f0a00', selectionBackground: '#ffd70033' },
  cyan:    { background: '#000f0f', foreground: '#00ffcc', cursor: '#00ffcc', cursorAccent: '#000f0f', selectionBackground: '#00ffcc33' },
};

type ConnState = 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected';

export default function RemoteTerminalPage() {
  const { theme } = useTheme();

  // ── Connection form state ─────────────────────────────────────────────
  const saved = loadConfig();
  const [hostname, setHostname] = useState<string>(saved.hostname || 'renewal-items-able-hotel.trycloudflare.com');
  const [username, setUsername] = useState<string>(saved.username || 'sshuser');
  const [password, setPassword] = useState<string>('');
  const [showPass, setShowPass] = useState(false);
  const [formOpen, setFormOpen] = useState(true);

  // ── Terminal state ────────────────────────────────────────────────────
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [connState, setConnState] = useState<ConnState>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [fullscreen, setFullscreen] = useState(false);

  const palette = PALETTES[theme] ?? PALETTES.default;

  // ── Init xterm ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!termRef.current) return;
    const term = new XTerm({
      fontFamily: '"Cascadia Code", "JetBrains Mono", "Fira Code", monospace',
      fontSize: 14,
      cursorBlink: true,
      theme: palette,
      convertEol: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.loadAddon(new WebLinksAddon());
    term.open(termRef.current);
    fit.fit();
    xtermRef.current = term;
    fitRef.current = fit;

    // Show welcome banner
    term.writeln('\x1b[1;32m╔══════════════════════════════════════╗\x1b[0m');
    term.writeln('\x1b[1;32m║   CyberSentinel — Remote Terminal    ║\x1b[0m');
    term.writeln('\x1b[1;32m╚══════════════════════════════════════╝\x1b[0m');
    term.writeln('\x1b[90mEnter your Windows SSH credentials and click Connect.\x1b[0m');
    term.writeln('');

    const ro = new ResizeObserver(() => { try { fit.fit(); } catch {} });
    if (termRef.current) ro.observe(termRef.current);

    return () => {
      ro.disconnect();
      term.dispose();
      xtermRef.current = null;
      fitRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Update palette on theme change ────────────────────────────────────
  useEffect(() => {
    xtermRef.current?.options && (xtermRef.current.options.theme = palette);
  }, [palette]);

  // ── Connect ───────────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!hostname.trim() || !username.trim() || !password) {
      setStatusMsg('Fill in all fields.');
      return;
    }
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }

    setConnState('connecting');
    setStatusMsg('Connecting…');
    setFormOpen(false);
    saveConfig({ hostname: hostname.trim(), username: username.trim() });

    const term = xtermRef.current!;
    term.writeln(`\x1b[33m[→] Connecting to ${username.trim()}@${hostname.trim()} via Cloudflare Tunnel…\x1b[0m`);

    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      // Send initial config as first message
      ws.send(JSON.stringify({
        type: 'connect',
        hostname: hostname.trim(),
        username: username.trim(),
        password,
        cols: term.cols,
        rows: term.rows,
      }));
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data as string);
        if (msg.type === 'connected') {
          setConnState('connected');
          setStatusMsg('Connected');
          term.writeln('\x1b[32m[✓] SSH session established.\x1b[0m\r\n');
          // Forward keystrokes
          term.onData((data) => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'data', data }));
            }
          });
          // Forward resize
          term.onResize(({ cols, rows }) => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'resize', cols, rows }));
            }
          });
          return;
        }
        if (msg.type === 'error') {
          setConnState('error');
          setStatusMsg(msg.message || 'Connection failed');
          term.writeln(`\r\n\x1b[31m[✗] ${msg.message}\x1b[0m`);
          setFormOpen(true);
          return;
        }
      } catch {
        // Binary PTY data — write directly to terminal
        term.write(evt.data as string);
        return;
      }
      // Plaintext PTY data (not JSON)
      term.write(evt.data as string);
    };

    ws.onerror = () => {
      setConnState('error');
      setStatusMsg('WebSocket error');
      term.writeln('\r\n\x1b[31m[✗] WebSocket connection failed. Is the API server running?\x1b[0m');
      setFormOpen(true);
    };

    ws.onclose = (e) => {
      if (connState !== 'idle') {
        setConnState('disconnected');
        setStatusMsg('Disconnected');
        term.writeln(`\r\n\x1b[33m[⚡] Session closed (${e.code}).\x1b[0m`);
        setFormOpen(true);
      }
      wsRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostname, username, password]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnState('idle');
    setStatusMsg('');
    setFormOpen(true);
  }, []);

  // ── Resize on fullscreen toggle ───────────────────────────────────────
  useEffect(() => {
    setTimeout(() => { try { fitRef.current?.fit(); } catch {} }, 100);
  }, [fullscreen]);

  // ── Status badge ──────────────────────────────────────────────────────
  const badge = {
    idle:         { color: 'text-muted-foreground', Icon: WifiOff,   label: 'Not connected' },
    connecting:   { color: 'text-yellow-400',       Icon: Loader2,   label: 'Connecting…' },
    connected:    { color: 'text-green-400',         Icon: Wifi,      label: 'Connected' },
    error:        { color: 'text-red-400',           Icon: WifiOff,   label: statusMsg || 'Error' },
    disconnected: { color: 'text-orange-400',        Icon: WifiOff,   label: 'Disconnected' },
  }[connState];

  return (
    <div className={`flex flex-col h-full ${fullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/80 backdrop-blur shrink-0">
        <div className="flex items-center gap-2">
          <MonitorDot className="text-primary" size={18} />
          <span className="font-mono font-bold text-sm text-primary tracking-wider">REMOTE TERMINAL</span>
          <span className="text-muted-foreground text-xs font-mono hidden sm:inline">// Windows SSH</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Status */}
          <div className={`flex items-center gap-1.5 text-xs font-mono ${badge.color}`}>
            <badge.Icon size={13} className={connState === 'connecting' ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{badge.label}</span>
          </div>
          {connState === 'connected' && (
            <button onClick={disconnect} title="Disconnect"
              className="flex items-center gap-1 px-2 py-1 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-mono transition-colors">
              <Unplug size={12} /> <span className="hidden sm:inline">Disconnect</span>
            </button>
          )}
          <button onClick={() => setFormOpen(o => !o)} title="Toggle config"
            className="p-1.5 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors">
            {formOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={() => setFullscreen(f => !f)} title="Toggle fullscreen"
            className="p-1.5 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors">
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Connection form */}
      {formOpen && (
        <div className="border-b border-border bg-card/60 px-4 py-3 shrink-0">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1 min-w-[220px] flex-1">
              <label className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">Cloudflare Hostname</label>
              <input
                value={hostname}
                onChange={e => setHostname(e.target.value)}
                placeholder="xxx.trycloudflare.com"
                className="bg-background border border-border rounded px-3 py-1.5 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
              />
            </div>
            <div className="flex flex-col gap-1 w-32">
              <label className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">Username</label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="sshuser"
                className="bg-background border border-border rounded px-3 py-1.5 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
              />
            </div>
            <div className="flex flex-col gap-1 w-44 relative">
              <label className="text-[10px] font-mono text-muted-foreground tracking-widest uppercase">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && connect()}
                  placeholder="••••••••"
                  className="w-full bg-background border border-border rounded px-3 py-1.5 pr-8 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/60"
                />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
                  {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>
            <button
              onClick={connState === 'connected' ? disconnect : connect}
              disabled={connState === 'connecting'}
              className={`px-4 py-1.5 rounded border font-mono text-sm transition-colors ${
                connState === 'connected'
                  ? 'border-red-500/40 text-red-400 hover:bg-red-500/10'
                  : 'border-primary/50 text-primary hover:bg-primary/10 disabled:opacity-40'
              }`}>
              {connState === 'connecting' ? 'Connecting…' : connState === 'connected' ? 'Disconnect' : 'Connect'}
            </button>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground/50 mt-2">
            ⚡ Make sure cloudflared tunnel is running on your Windows machine first.
            Hostname changes every time you restart it.
          </p>
        </div>
      )}

      {/* xterm.js terminal */}
      <div className="flex-1 overflow-hidden p-2 bg-[#0a0a0f]">
        <div ref={termRef} className="h-full w-full" />
      </div>

      {/* Footer */}
      <div className="shrink-0 px-3 py-1 border-t border-border bg-background/60 flex items-center gap-4 text-[10px] font-mono text-muted-foreground/50">
        <span>SSH via Cloudflare Tunnel</span>
        {connState === 'connected' && <span className="text-green-400/70">● LIVE</span>}
        <span className="ml-auto">Android-friendly ✓</span>
      </div>
    </div>
  );
}
