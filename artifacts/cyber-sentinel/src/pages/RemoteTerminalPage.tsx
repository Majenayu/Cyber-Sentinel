import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import {
  MonitorDot, Wifi, WifiOff, Unplug, Maximize2, Minimize2,
  Loader2, ChevronDown, ChevronUp, Eye, EyeOff, Sparkles, X,
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

// ── Theme palettes ─────────────────────────────────────────────────────────
const PALETTES: Record<string, Partial<import('@xterm/xterm').ITheme>> = {
  default: { background: '#0a0a0f', foreground: '#00ff41', cursor: '#00ff41', cursorAccent: '#0a0a0f', selectionBackground: '#00ff4133' },
  red:     { background: '#0d0000', foreground: '#ff2020', cursor: '#ff2020', cursorAccent: '#0d0000', selectionBackground: '#ff202033' },
  blue:    { background: '#000a1a', foreground: '#00aaff', cursor: '#00aaff', cursorAccent: '#000a1a', selectionBackground: '#00aaff33' },
  purple:  { background: '#0a000f', foreground: '#bf00ff', cursor: '#bf00ff', cursorAccent: '#0a000f', selectionBackground: '#bf00ff33' },
  gold:    { background: '#0f0a00', foreground: '#ffd700', cursor: '#ffd700', cursorAccent: '#0f0a00', selectionBackground: '#ffd70033' },
  cyan:    { background: '#000f0f', foreground: '#00ffcc', cursor: '#00ffcc', cursorAccent: '#000f0f', selectionBackground: '#00ffcc33' },
};

// ── Category badge colours ────────────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  network:  'bg-blue-500/20 text-blue-300',
  security: 'bg-red-500/20 text-red-300',
  file:     'bg-yellow-500/20 text-yellow-300',
  system:   'bg-green-500/20 text-green-300',
  process:  'bg-purple-500/20 text-purple-300',
  archive:  'bg-orange-500/20 text-orange-300',
  search:   'bg-cyan-500/20 text-cyan-300',
  text:     'bg-pink-500/20 text-pink-300',
  help:     'bg-gray-500/20 text-gray-300',
};

type ConnState   = 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected';
type Suggestion  = { name: string; desc: string; category: string; ai?: boolean };

// ── Fetch AI suggestions from the server ──────────────────────────────────
async function fetchAiSuggestionsRemote(input: string, username: string): Promise<Suggestion[]> {
  try {
    const res = await fetch('/api/terminal/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, platform: 'windows', username }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.suggestions)
      ? data.suggestions.map((s: Suggestion) => ({ ...s, ai: true }))
      : [];
  } catch {
    return [];
  }
}

export default function RemoteTerminalPage() {
  const { theme } = useTheme();

  // ── Connection form state ─────────────────────────────────────────────
  const saved = loadConfig();
  const [hostname, setHostname] = useState<string>(saved.hostname || '');
  const [username, setUsername] = useState<string>(saved.username || 'pgayu');
  const [password, setPassword] = useState<string>('');
  const [showPass, setShowPass] = useState(false);
  const [formOpen, setFormOpen] = useState(true);

  // ── Terminal refs ─────────────────────────────────────────────────────
  const termRef   = useRef<HTMLDivElement>(null);
  const xtermRef  = useRef<XTerm | null>(null);
  const fitRef    = useRef<FitAddon | null>(null);
  const wsRef     = useRef<WebSocket | null>(null);

  // Track whether a session was ever established (used in ws.onclose to avoid
  // "Disconnected" flash when the socket closes before connecting).
  const hasConnectedRef = useRef(false);

  // Hold disposables for term.onData / term.onResize — prevents accumulation on reconnect.
  const termListenersRef = useRef<{ data: { dispose(): void }; resize: { dispose(): void } } | null>(null);

  // ── AI suggestion refs (mutable, safe inside onData closure) ──────────
  const inputBufRef    = useRef('');           // what the user has typed on the current line
  const suggestionsRef = useRef<Suggestion[]>([]);
  const sugSelRef      = useRef(-1);           // keyboard-selected index (-1 = none)
  const aiDebounceRef  = useRef<ReturnType<typeof setTimeout>>();
  const aiInputRef     = useRef('');           // stale-check snapshot

  // ── Connection / AI UI state ──────────────────────────────────────────
  const [connState,  setConnState]  = useState<ConnState>('idle');
  const [statusMsg,  setStatusMsg]  = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [suggestionsState, setSuggestionsState] = useState<Suggestion[]>([]);
  const [sugSelected,      setSugSelected]      = useState(-1);
  const [aiLoading,        setAiLoading]        = useState(false);

  // Helper: update both ref (for onData closure) and React state (for render).
  const setSuggestions = useCallback((s: Suggestion[]) => {
    suggestionsRef.current = s;
    setSuggestionsState(s);
  }, []);

  const dismissSuggestions = useCallback(() => {
    clearTimeout(aiDebounceRef.current);
    setSuggestions([]);
    setSugSelected(-1);
    sugSelRef.current = -1;
    setAiLoading(false);
  }, [setSuggestions]);

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
    fitRef.current   = fit;

    term.writeln('\x1b[1;32m╔══════════════════════════════════════╗\x1b[0m');
    term.writeln('\x1b[1;32m║   CyberSentinel — Remote Terminal    ║\x1b[0m');
    term.writeln('\x1b[1;32m╚══════════════════════════════════════╝\x1b[0m');
    term.writeln('\x1b[90mEnter your Windows SSH credentials and click Connect.\x1b[0m');
    term.writeln('\x1b[90mOnce connected, AI suggestions appear as you type.\x1b[0m');
    term.writeln('');

    const ro = new ResizeObserver(() => { try { fit.fit(); } catch {} });
    if (termRef.current) ro.observe(termRef.current);

    return () => {
      ro.disconnect();
      term.dispose();
      xtermRef.current = null;
      fitRef.current   = null;
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

    // Dispose lingering listeners from previous session.
    if (termListenersRef.current) {
      termListenersRef.current.data.dispose();
      termListenersRef.current.resize.dispose();
      termListenersRef.current = null;
    }
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }

    // Reset per-session state.
    hasConnectedRef.current  = false;
    inputBufRef.current      = '';
    suggestionsRef.current   = [];
    sugSelRef.current        = -1;
    clearTimeout(aiDebounceRef.current);
    setSuggestionsState([]);
    setSugSelected(-1);
    setAiLoading(false);

    setConnState('connecting');
    setStatusMsg('Connecting…');
    setFormOpen(false);
    saveConfig({ hostname: hostname.trim(), username: username.trim() });

    const term = xtermRef.current!;
    term.writeln(`\x1b[33m[→] Connecting to ${username.trim()}@${hostname.trim()} via Cloudflare Tunnel…\x1b[0m`);

    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'connect',
        hostname: hostname.trim(),
        username: username.trim(),
        password,
        cols: term.cols,
        rows: term.rows,
      }));
    };

    // Capture username for use inside onData closure (already in deps).
    const capturedUsername = username.trim();

    // ── AI trigger (debounced, 400ms) ──────────────────────────────────
    function triggerAiSuggest(input: string) {
      const trimmed = input.trim();
      if (trimmed.length < 2) {
        clearTimeout(aiDebounceRef.current);
        setSuggestions([]);
        setAiLoading(false);
        return;
      }
      clearTimeout(aiDebounceRef.current);
      setAiLoading(true);
      const snapshot = trimmed;
      aiInputRef.current = snapshot;
      aiDebounceRef.current = setTimeout(async () => {
        const results = await fetchAiSuggestionsRemote(snapshot, capturedUsername);
        if (aiInputRef.current !== snapshot) return; // stale — a newer keystroke arrived
        setSuggestions(results);
        setAiLoading(false);
      }, 400);
    }

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data as string);

        if (msg.type === 'connected') {
          hasConnectedRef.current = true;
          setConnState('connected');
          setStatusMsg('Connected');
          term.writeln('\x1b[32m[✓] SSH session established. AI suggestions active — type to get hints.\x1b[0m\r\n');

          // Dispose any previous listeners before registering new ones.
          if (termListenersRef.current) {
            termListenersRef.current.data.dispose();
            termListenersRef.current.resize.dispose();
          }

          // ── Keystroke handler with AI integration ──────────────────
          const dataDisp = term.onData((data) => {
            const sock = wsRef.current;
            if (!sock || sock.readyState !== WebSocket.OPEN) return;

            // Tab + suggestions → accept top/selected suggestion
            if (data === '\t' && suggestionsRef.current.length > 0) {
              const idx = sugSelRef.current >= 0 ? sugSelRef.current : 0;
              const pick = suggestionsRef.current[idx];
              if (pick) {
                sock.send(JSON.stringify({ type: 'data', data: '\x15' })); // Ctrl+U erase line
                sock.send(JSON.stringify({ type: 'data', data: pick.name }));
                inputBufRef.current  = pick.name;
                suggestionsRef.current = [];
                sugSelRef.current    = -1;
                setSuggestionsState([]);
                setSugSelected(-1);
                clearTimeout(aiDebounceRef.current);
                setAiLoading(false);
                return;
              }
            }

            // Arrow Up with suggestions → navigate up
            if (data === '\x1b[A' && suggestionsRef.current.length > 0) {
              const next = Math.max(-1, sugSelRef.current - 1);
              sugSelRef.current = next;
              setSugSelected(next);
              return; // don't send to SSH
            }
            // Arrow Down with suggestions → navigate down
            if (data === '\x1b[B' && suggestionsRef.current.length > 0) {
              const next = Math.min(suggestionsRef.current.length - 1, sugSelRef.current + 1);
              sugSelRef.current = next;
              setSugSelected(next);
              return;
            }

            // Escape → dismiss suggestions (still forward Escape to shell)
            if (data === '\x1b') {
              if (suggestionsRef.current.length > 0) {
                suggestionsRef.current = [];
                sugSelRef.current = -1;
                setSuggestionsState([]);
                setSugSelected(-1);
                clearTimeout(aiDebounceRef.current);
                setAiLoading(false);
              }
            }

            // Track input buffer for AI context
            if (data === '\x7f' || data === '\b') {
              // Backspace
              inputBufRef.current = inputBufRef.current.slice(0, -1);
              triggerAiSuggest(inputBufRef.current);
            } else if (data === '\r' || data === '\n' || data === '\x03' || data === '\x15') {
              // Enter / Ctrl+C / Ctrl+U — clear buffer and suggestions
              inputBufRef.current = '';
              suggestionsRef.current = [];
              sugSelRef.current = -1;
              setSuggestionsState([]);
              setSugSelected(-1);
              clearTimeout(aiDebounceRef.current);
              setAiLoading(false);
            } else if (data.length === 1 && data.charCodeAt(0) >= 32) {
              // Printable character
              inputBufRef.current += data;
              triggerAiSuggest(inputBufRef.current);
            }

            // Always forward to SSH
            sock.send(JSON.stringify({ type: 'data', data }));
          });

          const resizeDisp = term.onResize(({ cols, rows }) => {
            if (wsRef.current?.readyState === WebSocket.OPEN)
              wsRef.current.send(JSON.stringify({ type: 'resize', cols, rows }));
          });

          termListenersRef.current = { data: dataDisp, resize: resizeDisp };
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
        // Not JSON — raw PTY bytes
        term.write(evt.data as string);
        return;
      }
      // Plaintext PTY data
      term.write(evt.data as string);
    };

    ws.onerror = () => {
      setConnState('error');
      setStatusMsg('WebSocket error');
      term.writeln('\r\n\x1b[31m[✗] WebSocket connection failed. Is the API server running?\x1b[0m');
      setFormOpen(true);
    };

    ws.onclose = (e) => {
      if (hasConnectedRef.current || connState !== 'idle') {
        setConnState('disconnected');
        setStatusMsg('Disconnected');
        term.writeln(`\r\n\x1b[33m[⚡] Session closed (${e.code}).\x1b[0m`);
        setFormOpen(true);
      }
      wsRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostname, username, password, setSuggestions]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnState('idle');
    setStatusMsg('');
    setFormOpen(true);
    dismissSuggestions();
  }, [dismissSuggestions]);

  // ── Accept a suggestion by click ──────────────────────────────────────
  const acceptSuggestion = useCallback((pick: Suggestion) => {
    const sock = wsRef.current;
    if (!sock || sock.readyState !== WebSocket.OPEN) return;
    sock.send(JSON.stringify({ type: 'data', data: '\x15' }));
    sock.send(JSON.stringify({ type: 'data', data: pick.name }));
    inputBufRef.current = pick.name;
    dismissSuggestions();
    xtermRef.current?.focus();
  }, [dismissSuggestions]);

  // ── Resize on fullscreen toggle ───────────────────────────────────────
  useEffect(() => {
    setTimeout(() => { try { fitRef.current?.fit(); } catch {} }, 100);
  }, [fullscreen]);

  // ── Status badge ──────────────────────────────────────────────────────
  const badge = {
    idle:         { color: 'text-muted-foreground', Icon: WifiOff, label: 'Not connected' },
    connecting:   { color: 'text-yellow-400',       Icon: Loader2, label: 'Connecting…' },
    connected:    { color: 'text-green-400',         Icon: Wifi,    label: 'Connected' },
    error:        { color: 'text-red-400',           Icon: WifiOff, label: statusMsg || 'Error' },
    disconnected: { color: 'text-orange-400',        Icon: WifiOff, label: 'Disconnected' },
  }[connState];

  const showSuggestions = suggestionsState.length > 0 || aiLoading;

  return (
    <div className={`flex flex-col h-full ${fullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background/80 backdrop-blur shrink-0">
        <div className="flex items-center gap-2">
          <MonitorDot className="text-primary" size={18} />
          <span className="font-mono font-bold text-sm text-primary tracking-wider">REMOTE TERMINAL</span>
          <span className="text-muted-foreground text-xs font-mono hidden sm:inline">// Windows SSH</span>
          {connState === 'connected' && (
            <span className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-primary/60 border border-primary/20 rounded px-1.5 py-0.5">
              <Sparkles size={9} /> AI
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
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

      {/* ── Connection form ── */}
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
                placeholder="pgayu"
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

      {/* ── Terminal area (relative so suggestion overlay can be positioned) ── */}
      <div className="flex-1 overflow-hidden relative">
        {/* xterm canvas */}
        <div className="p-2 bg-[#0a0a0f] h-full w-full">
          <div ref={termRef} className="h-full w-full" />
        </div>

        {/* ── AI Suggestion overlay ── */}
        {showSuggestions && connState === 'connected' && (
          <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-primary/20 bg-background/95 backdrop-blur max-h-56 flex flex-col">
            {/* Overlay header */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 shrink-0">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-primary/70">
                <Sparkles size={10} className={aiLoading ? 'animate-pulse' : ''} />
                {aiLoading && suggestionsState.length === 0
                  ? 'AI thinking…'
                  : 'AI Suggestions (Windows + HTB)'}
                {!aiLoading && suggestionsState.length > 0 && (
                  <span className="text-muted-foreground/50 ml-1">
                    Tab=accept · ↑↓=navigate · Esc=dismiss
                  </span>
                )}
              </div>
              <button onClick={dismissSuggestions}
                className="text-muted-foreground hover:text-primary p-0.5 rounded transition-colors">
                <X size={12} />
              </button>
            </div>

            {/* Suggestion rows */}
            <div className="overflow-y-auto">
              {suggestionsState.length > 0
                ? suggestionsState.map((s, i) => (
                  <div
                    key={i}
                    onPointerDown={(e) => { e.preventDefault(); acceptSuggestion(s); }}
                    className={`flex items-start gap-2 px-3 py-2 cursor-pointer transition-colors border-b border-border/20 last:border-0 ${
                      i === sugSelected
                        ? 'bg-primary/10 border-l-2 border-l-primary'
                        : 'hover:bg-muted/40 border-l-2 border-l-transparent'
                    }`}>
                    {/* Command name */}
                    <span className="font-mono text-xs text-foreground whitespace-nowrap shrink-0 pt-px">
                      {s.name}
                    </span>
                    {/* Description */}
                    <span className="text-[11px] text-muted-foreground flex-1 leading-tight pt-px truncate">
                      {s.desc}
                    </span>
                    {/* Badges */}
                    <div className="flex items-center gap-1 shrink-0">
                      {s.ai && (
                        <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-primary/15 text-primary flex items-center gap-0.5">
                          <Sparkles size={8} /> AI
                        </span>
                      )}
                      <span className={`text-[9px] font-mono px-1 py-0.5 rounded ${CAT_COLORS[s.category] ?? CAT_COLORS.system}`}>
                        {s.category}
                      </span>
                    </div>
                  </div>
                ))
                : /* Loading skeleton */
                  [0, 1, 2].map(i => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 border-b border-border/20 last:border-0">
                      <div className="h-3 w-48 rounded bg-muted/50 animate-pulse" />
                      <div className="h-3 flex-1 rounded bg-muted/30 animate-pulse" />
                    </div>
                  ))
              }
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="shrink-0 px-3 py-1 border-t border-border bg-background/60 flex items-center gap-4 text-[10px] font-mono text-muted-foreground/50">
        <span>SSH via Cloudflare Tunnel</span>
        {connState === 'connected' && <span className="text-green-400/70">● LIVE</span>}
        {connState === 'connected' && (
          <span className="flex items-center gap-1 text-primary/40">
            <Sparkles size={9} /> AI-powered suggestions (Windows + HTB paths)
          </span>
        )}
        <span className="ml-auto">Android-friendly ✓</span>
      </div>
    </div>
  );
}
