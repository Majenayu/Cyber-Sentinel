import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { TerminalIcon, Wifi, WifiOff, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

// Resolve the WebSocket URL relative to the API server
function getWsUrl() {
  const apiBase = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
  if (apiBase.startsWith('http')) {
    return apiBase.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws/terminal';
  }
  // Same-origin: use current host but point at API port 8080
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = location.hostname;
  return `${proto}//${host}:8080/ws/terminal`;
}

// Theme-aware xterm colour palettes
const PALETTES: Record<string, Partial<import('@xterm/xterm').ITheme>> = {
  default: {
    background: '#0a0a0f',
    foreground: '#00ff41',
    cursor: '#00ff41',
    cursorAccent: '#0a0a0f',
    selectionBackground: '#00ff4133',
    black: '#0a0a0f', brightBlack: '#333',
    red: '#ff003c', brightRed: '#ff3355',
    green: '#00ff41', brightGreen: '#39ff14',
    yellow: '#ffd700', brightYellow: '#ffee00',
    blue: '#0066ff', brightBlue: '#1a8cff',
    magenta: '#ff00cc', brightMagenta: '#ff44dd',
    cyan: '#00ccff', brightCyan: '#33ddff',
    white: '#cccccc', brightWhite: '#ffffff',
  },
  red: {
    background: '#0d0000',
    foreground: '#ff2020',
    cursor: '#ff2020',
    cursorAccent: '#0d0000',
    selectionBackground: '#ff202033',
    black: '#0d0000', brightBlack: '#3d0000',
    red: '#ff2020', brightRed: '#ff5555',
    green: '#ff6600', brightGreen: '#ff8822',
    yellow: '#ff9900', brightYellow: '#ffbb00',
    blue: '#cc0044', brightBlue: '#ff0055',
    magenta: '#ff00aa', brightMagenta: '#ff44cc',
    cyan: '#ff4400', brightCyan: '#ff6633',
    white: '#cc8888', brightWhite: '#ffaaaa',
  },
  blue: {
    background: '#000a1a',
    foreground: '#00aaff',
    cursor: '#00aaff',
    cursorAccent: '#000a1a',
    selectionBackground: '#00aaff33',
    black: '#000a1a', brightBlack: '#001a33',
    red: '#ff3366', brightRed: '#ff5577',
    green: '#00ff99', brightGreen: '#33ffaa',
    yellow: '#ffcc00', brightYellow: '#ffdd33',
    blue: '#00aaff', brightBlue: '#33bbff',
    magenta: '#aa00ff', brightMagenta: '#cc33ff',
    cyan: '#00ddff', brightCyan: '#33eeff',
    white: '#aaccee', brightWhite: '#cceeff',
  },
  purple: {
    background: '#0a000f',
    foreground: '#cc00ff',
    cursor: '#cc00ff',
    cursorAccent: '#0a000f',
    selectionBackground: '#cc00ff33',
    black: '#0a000f', brightBlack: '#220033',
    red: '#ff003c', brightRed: '#ff3355',
    green: '#00ff99', brightGreen: '#33ffaa',
    yellow: '#ffcc00', brightYellow: '#ffdd33',
    blue: '#6600ff', brightBlue: '#8833ff',
    magenta: '#cc00ff', brightMagenta: '#dd44ff',
    cyan: '#00ccff', brightCyan: '#33ddff',
    white: '#cc99ee', brightWhite: '#eeccff',
  },
};

function getPalette(theme: string): Partial<import('@xterm/xterm').ITheme> {
  if (theme.includes('red') || theme.includes('blood')) return PALETTES.red;
  if (theme.includes('blue') || theme.includes('ice') || theme.includes('ocean')) return PALETTES.blue;
  if (theme.includes('purple') || theme.includes('ultra')) return PALETTES.purple;
  return PALETTES.default;
}

// Mobile shortcut keys toolbar
const MOBILE_KEYS = [
  { label: 'Tab', send: '\t' },
  { label: 'Ctrl+C', send: '\x03' },
  { label: 'Ctrl+L', send: '\x0c' },
  { label: 'Ctrl+D', send: '\x04' },
  { label: '↑', send: '\x1b[A' },
  { label: '↓', send: '\x1b[B' },
  { label: '←', send: '\x1b[D' },
  { label: '→', send: '\x1b[C' },
];

export default function TerminalPage() {
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth < 768;
  const { theme } = useTheme();

  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnecting(true);
    setError('');

    const ws = new WebSocket(getWsUrl());
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setConnecting(false);
      setError('');
      // Send initial resize
      const term = xtermRef.current;
      if (term) {
        ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
      }
    };

    ws.onmessage = (ev) => {
      const term = xtermRef.current;
      if (!term) return;
      if (ev.data instanceof ArrayBuffer) {
        term.write(new Uint8Array(ev.data));
      } else {
        term.write(ev.data);
      }
    };

    ws.onerror = () => {
      setConnected(false);
      setConnecting(false);
      setError('WebSocket error — is the API server running?');
    };

    ws.onclose = () => {
      setConnected(false);
      setConnecting(false);
    };
  }, []);

  // Init xterm once
  useEffect(() => {
    if (!termRef.current) return;

    const palette = getPalette(theme);
    const fontSize = isMobile ? 13 : 14;

    const term = new XTerm({
      theme: palette,
      fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", "Courier New", monospace',
      fontSize,
      lineHeight: 1.25,
      cursorBlink: true,
      cursorStyle: 'block',
      allowProposedApi: true,
      scrollback: 5000,
      convertEol: false,
    });

    const fitAddon = new FitAddon();
    const linksAddon = new WebLinksAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(linksAddon);
    term.open(termRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    term.onData((data) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    // Resize observer
    const ro = new ResizeObserver(() => {
      try {
        fitAddon.fit();
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
        }
      } catch { /* ignore */ }
    });
    if (termRef.current) ro.observe(termRef.current);

    term.writeln('\x1b[32m╔════════════════════════════════════════╗\x1b[0m');
    term.writeln('\x1b[32m║   \x1b[1;32mCYBERSENTINEL — Operator Terminal\x1b[0;32m   ║\x1b[0m');
    term.writeln('\x1b[32m╚════════════════════════════════════════╝\x1b[0m');
    term.writeln('\x1b[90mConnecting to server shell…\x1b[0m\r\n');

    return () => {
      ro.disconnect();
      term.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Connect on mount, cleanup on unmount
  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  // Re-fit on fullscreen toggle
  useEffect(() => {
    setTimeout(() => { try { fitAddonRef.current?.fit(); } catch { /* */ } }, 100);
  }, [fullscreen]);

  const sendKey = (seq: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(seq);
    xtermRef.current?.focus();
  };

  return (
    <div className={`flex flex-col h-full bg-background font-mono ${fullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 h-12 border-b border-border bg-card/60 shrink-0">
        <TerminalIcon size={16} className="text-primary shrink-0" />
        <span className="text-primary font-bold text-sm tracking-widest uppercase">Operator Terminal</span>
        <div className="flex items-center gap-1.5 ml-2">
          {connected
            ? <><Wifi size={11} className="text-green-400" /><span className="text-[10px] text-green-400">CONNECTED</span></>
            : connecting
              ? <><RefreshCw size={11} className="text-yellow-400 animate-spin" /><span className="text-[10px] text-yellow-400">CONNECTING…</span></>
              : <><WifiOff size={11} className="text-red-400" /><span className="text-[10px] text-red-400">DISCONNECTED</span></>
          }
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={connect}
            disabled={connecting}
            className="flex items-center gap-1.5 px-3 py-1 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors text-xs disabled:opacity-40"
          >
            <RefreshCw size={11} className={connecting ? 'animate-spin' : ''} />
            {connected ? 'Reconnect' : 'Connect'}
          </button>
          <button
            onClick={() => setFullscreen(f => !f)}
            className="p-1.5 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-red-950/40 border-b border-red-900/40 text-red-400 text-xs font-mono shrink-0">
          ⚠ {error}
        </div>
      )}

      {/* Mobile shortcut toolbar */}
      {isMobile && (
        <div className="flex gap-1 px-2 py-1.5 bg-card/40 border-b border-border overflow-x-auto shrink-0 scrollbar-none">
          {MOBILE_KEYS.map((k) => (
            <button
              key={k.label}
              onPointerDown={(e) => { e.preventDefault(); sendKey(k.send); }}
              className="flex-shrink-0 px-3 py-1.5 rounded border border-border text-primary bg-primary/5 hover:bg-primary/15 active:bg-primary/25 text-xs font-mono transition-colors touch-manipulation select-none"
            >
              {k.label}
            </button>
          ))}
        </div>
      )}

      {/* xterm container */}
      <div
        ref={termRef}
        className="flex-1 min-h-0 p-2"
        style={{ background: getPalette(theme).background ?? '#0a0a0f' }}
        onClick={() => xtermRef.current?.focus()}
      />

      {/* Desktop status footer */}
      {!isMobile && (
        <div className="flex items-center gap-4 px-4 py-1.5 border-t border-border bg-card/30 shrink-0 text-[10px] text-muted-foreground/40 font-mono">
          <span>SHELL: bash</span>
          <span>PTY: script-shim</span>
          <span>SERVER: Replit Linux</span>
          <span className="ml-auto">Ctrl+C = interrupt · Ctrl+L = clear · Ctrl+D = exit</span>
        </div>
      )}
    </div>
  );
}
