import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import {
  TerminalIcon, Wifi, WifiOff, RefreshCw,
  Maximize2, Minimize2, ArrowRightLeft, Info, X,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  getSuggestions, getTranslation, getCommandInfo,
  CATEGORY_LABELS, type CommandInfo,
} from '@/data/terminal-commands';

// ── WebSocket URL (proxied through Vite → same origin) ──────────────────
function getWsUrl() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}/ws/terminal`;
}

// ── Theme-aware xterm palettes ────────────────────────────────────────────
const PALETTES: Record<string, Partial<import('@xterm/xterm').ITheme>> = {
  default: {
    background: '#0a0a0f', foreground: '#00ff41', cursor: '#00ff41',
    cursorAccent: '#0a0a0f', selectionBackground: '#00ff4133',
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
    background: '#0d0000', foreground: '#ff2020', cursor: '#ff2020',
    cursorAccent: '#0d0000', selectionBackground: '#ff202033',
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
    background: '#000a1a', foreground: '#00aaff', cursor: '#00aaff',
    cursorAccent: '#000a1a', selectionBackground: '#00aaff33',
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
    background: '#0a000f', foreground: '#cc00ff', cursor: '#cc00ff',
    cursorAccent: '#0a000f', selectionBackground: '#cc00ff33',
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

// ── Mobile shortcut toolbar ───────────────────────────────────────────────
const MOBILE_KEYS = [
  { label: 'Tab',    send: '\t' },
  { label: 'Ctrl+C', send: '\x03' },
  { label: 'Ctrl+L', send: '\x0c' },
  { label: 'Ctrl+D', send: '\x04' },
  { label: '↑',      send: '\x1b[A' },
  { label: '↓',      send: '\x1b[B' },
  { label: '←',      send: '\x1b[D' },
  { label: '→',      send: '\x1b[C' },
];

// ── Types ─────────────────────────────────────────────────────────────────
interface Suggestion { name: string; desc: string; category: string; usage?: string; }
interface SummaryState { command: string; info: CommandInfo; translated: string | null; }

// ── Component ─────────────────────────────────────────────────────────────
export default function TerminalPage() {
  const termRef        = useRef<HTMLDivElement>(null);
  const xtermRef       = useRef<XTerm | null>(null);
  const fitAddonRef    = useRef<FitAddon | null>(null);
  const wsRef          = useRef<WebSocket | null>(null);
  const containerRef   = useRef<HTMLDivElement>(null);

  // Input tracking refs (never cause re-render)
  const inputBufRef        = useRef('');       // current typed line
  const cmdRunningRef      = useRef(false);    // true while command executing
  const lastCmdRef         = useRef('');       // command that was last sent
  const lastTranslatedRef  = useRef<string | null>(null);
  const outputBufRef       = useRef('');       // rolling output buffer for prompt detection
  const summaryTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sugSelRef          = useRef(-1);       // keyboard-selected suggestion index

  // System commands fetched from server (compgen -c) — all executables on $PATH
  const systemCommandsRef = useRef<string[]>([]);

  // UI state
  const [connected, setConnected]           = useState(false);
  const [connecting, setConnecting]         = useState(false);
  const [error, setError]                   = useState('');
  const [fullscreen, setFullscreen]         = useState(false);
  const [suggestions, setSuggestions]       = useState<Suggestion[]>([]);
  const [sugSelected, setSugSelected]       = useState(-1);
  const [translation, setTranslation]       = useState<string | null>(null); // banner
  const [summary, setSummary]               = useState<SummaryState | null>(null);
  const [showSummary, setShowSummary]       = useState(false);

  const { theme } = useTheme();
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth < 768;
  const palette  = getPalette(theme);

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Detect common syntax mistakes and return a correction suggestion.
   * Examples: "ipconfig/all" → "ipconfig /all", "ping-4" → "ping -4"
   */
  const getSyntaxFix = useCallback((input: string): Suggestion | null => {
    const t = input.trim();
    if (!t || t.includes(' ')) return null; // only single-word mistakes

    // cmd/flag → cmd /flag  (slash without space, e.g. ipconfig/all)
    const slashM = t.match(/^([a-zA-Z][a-zA-Z0-9_-]*)\/(.+)$/);
    if (slashM) {
      const fixed = `${slashM[1]} /${slashM[2]}`;
      return {
        name: fixed,
        desc: `⚡ Syntax fix: "${t}" → "${fixed}"  (add space before /)`,
        category: 'fix',
      };
    }

    // cmd-flag → cmd -flag  (dash without space, e.g. ping-4, ls-la)
    // Exclude legitimate hyphenated command names (e.g. traceroute, git-log)
    const dashM = t.match(/^([a-zA-Z]{2,})-([0-9].*)$/);
    if (dashM) {
      const fixed = `${dashM[1]} -${dashM[2]}`;
      return {
        name: fixed,
        desc: `⚡ Syntax fix: "${t}" → "${fixed}"  (add space before flag)`,
        category: 'fix',
      };
    }

    // cmd--flag → cmd --flag
    const dblDashM = t.match(/^([a-zA-Z][a-zA-Z0-9_-]*)--([a-zA-Z].+)$/);
    if (dblDashM) {
      const fixed = `${dblDashM[1]} --${dblDashM[2]}`;
      return {
        name: fixed,
        desc: `⚡ Syntax fix: "${t}" → "${fixed}"`,
        category: 'fix',
      };
    }

    return null;
  }, []);

  /**
   * Combined suggestions: syntax fixes first, then DB entries, then any
   * matching executables from the server's compgen list.
   */
  const getExtendedSuggestions = useCallback((input: string, max = 7): Suggestion[] => {
    const trimmed = input.trim();
    if (!trimmed) return [];

    const results: Suggestion[] = [];

    // 1. Syntax fix hint (always first if applicable)
    const fix = getSyntaxFix(trimmed);
    if (fix) results.push(fix);

    // 2. Rich DB suggestions
    const dbSugs = getSuggestions(trimmed, max);
    for (const s of dbSugs) {
      if (!results.find(r => r.name === s.name)) results.push(s);
    }

    // 3. System commands fallback (fill up to max)
    if (results.length < max && systemCommandsRef.current.length > 0) {
      const firstWord = trimmed.toLowerCase().split(/\s+/)[0];
      const alreadyHave = new Set(results.map(r => r.name));
      let added = 0;
      for (const cmd of systemCommandsRef.current) {
        if (added >= max - results.length) break;
        if (
          cmd !== firstWord &&
          cmd.startsWith(firstWord) &&
          !alreadyHave.has(cmd)
        ) {
          results.push({
            name: cmd,
            desc: 'Available on this system — run with --help for details',
            category: 'system',
          });
          alreadyHave.add(cmd);
          added++;
        }
      }
    }

    return results.slice(0, max);
  }, [getSyntaxFix]);

  /** Show translation banner briefly */
  const flashTranslation = useCallback((note: string) => {
    setTranslation(note);
    setTimeout(() => setTranslation(null), 3500);
  }, []);

  /** Dismiss summary after delay */
  const scheduleSummaryDismiss = useCallback((ms = 9000) => {
    if (summaryTimerRef.current) clearTimeout(summaryTimerRef.current);
    summaryTimerRef.current = setTimeout(() => setShowSummary(false), ms);
  }, []);

  // ── WebSocket / xterm connection ─────────────────────────────────────────

  const connect = useCallback(() => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    setConnecting(true);
    setError('');
    inputBufRef.current = '';
    setSuggestions([]);

    const ws = new WebSocket(getWsUrl());
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setConnecting(false);
      setError('');
      const term = xtermRef.current;
      if (term) ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
      // Request full list of executables for universal suggestions
      ws.send(JSON.stringify({ type: 'get_commands' }));
    };

    ws.onmessage = (ev) => {
      const term = xtermRef.current;
      if (!term) return;

      // ── Intercept JSON control messages before writing to terminal ─────
      if (typeof ev.data === 'string' && ev.data.trimStart().startsWith('{')) {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'commands_list' && Array.isArray(msg.commands)) {
            // Store system commands; dedupe against DB keys
            systemCommandsRef.current = (msg.commands as string[]).filter(
              (c: string) => typeof c === 'string' && c.length > 0
            );
            return; // Don't write JSON to terminal
          }
        } catch { /* not a control message — fall through */ }
      }

      // Write raw bytes / text to xterm
      if (ev.data instanceof ArrayBuffer) {
        term.write(new Uint8Array(ev.data));
      } else {
        term.write(ev.data as string);
      }

      // ── Detect prompt return → show summary ──────────────────────────
      if (cmdRunningRef.current) {
        const chunk = ev.data instanceof ArrayBuffer
          ? new TextDecoder().decode(ev.data as ArrayBuffer)
          : ev.data as string;

        // Keep last 300 chars — enough to catch a split prompt
        outputBufRef.current = (outputBufRef.current + chunk).slice(-300);

        // Our prompt contains [CS] — distinctive enough
        if (outputBufRef.current.includes('[CS]')) {
          cmdRunningRef.current = false;
          outputBufRef.current  = '';

          const rawCmd   = lastCmdRef.current.trim();
          const effCmd   = lastTranslatedRef.current ?? rawCmd;
          const info     = getCommandInfo(effCmd);

          if (info && rawCmd) {
            setSummary({ command: rawCmd, info, translated: lastTranslatedRef.current });
            setShowSummary(true);
            scheduleSummaryDismiss();
          }
        }
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
  }, [scheduleSummaryDismiss]);

  // ── xterm init ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!termRef.current) return;
    const fontSize = isMobile ? 13 : 14;

    const term = new XTerm({
      theme: palette,
      fontFamily: '"Fira Code","Cascadia Code","JetBrains Mono","Courier New",monospace',
      fontSize,
      lineHeight: 1.25,
      cursorBlink: true,
      cursorStyle: 'block',
      allowProposedApi: true,
      scrollback: 5000,
      convertEol: false,
    });

    const fitAddon   = new FitAddon();
    const linksAddon = new WebLinksAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(linksAddon);
    term.open(termRef.current);
    fitAddon.fit();

    xtermRef.current   = term;
    fitAddonRef.current = fitAddon;

    // ── Intercept keystrokes ──────────────────────────────────────────────
    term.onData((data) => {
      const ws = wsRef.current;

      // ── Enter key ──────────────────────────────────────────────
      if (data === '\r' || data === '\n') {
        const raw    = inputBufRef.current.trim();
        const transl = raw ? getTranslation(raw) : null;

        if (transl) {
          // Erase current line on server (Ctrl+U), then send translated command
          ws?.send('\x15');
          ws?.send(transl.linux + '\r');
          flashTranslation(transl.note);
          lastTranslatedRef.current = transl.linux;
        } else {
          ws?.send(data);
          lastTranslatedRef.current = null;
        }

        lastCmdRef.current    = raw;
        cmdRunningRef.current = raw.length > 0;
        outputBufRef.current  = '';
        inputBufRef.current   = '';
        setSuggestions([]);
        setSugSelected(-1);
        sugSelRef.current = -1;
        return;
      }

      // ── Tab: accept top suggestion ────────────────────────────
      if (data === '\t') {
        const sugs = getExtendedSuggestions(inputBufRef.current, 7);
        const idx  = sugSelRef.current >= 0 ? sugSelRef.current : 0;
        if (sugs.length > 0) {
          const pick = sugs[idx];
          // Erase current input (Ctrl+U) and type the suggestion name
          ws?.send('\x15');
          ws?.send(pick.name);
          inputBufRef.current = pick.name;
          setSuggestions(getExtendedSuggestions(pick.name, 7));
          setSugSelected(-1);
          sugSelRef.current = -1;
          return;
        }
        // No suggestions: forward Tab (shell completion)
        ws?.send(data);
        return;
      }

      // ── Arrow Up/Down: navigate suggestions ───────────────────
      if (data === '\x1b[A' || data === '\x1b[B') {
        const sugs = getExtendedSuggestions(inputBufRef.current, 7);
        if (sugs.length > 0) {
          const dir   = data === '\x1b[A' ? -1 : 1;
          const next  = Math.max(-1, Math.min(sugs.length - 1, sugSelRef.current + dir));
          sugSelRef.current = next;
          setSugSelected(next);
          return; // Don't forward — prevent shell history nav when suggestions open
        }
        // No suggestions: forward for shell history
        ws?.send(data);
        return;
      }

      // ── Escape: close suggestions ─────────────────────────────
      if (data === '\x1b') {
        setSuggestions([]);
        setSugSelected(-1);
        sugSelRef.current = -1;
        ws?.send(data);
        return;
      }

      // ── Ctrl+C: clear state ───────────────────────────────────
      if (data === '\x03') {
        inputBufRef.current   = '';
        cmdRunningRef.current = false;
        setSuggestions([]);
        setSugSelected(-1);
        sugSelRef.current = -1;
        ws?.send(data);
        return;
      }

      // ── Backspace ─────────────────────────────────────────────
      if (data === '\x7f' || data === '\b') {
        inputBufRef.current = inputBufRef.current.slice(0, -1);
        setSuggestions(getSuggestions(inputBufRef.current, 6));
        sugSelRef.current = -1;
        setSugSelected(-1);
        ws?.send(data);
        return;
      }

      // ── Printable character ───────────────────────────────────
      if (data >= ' ') {
        inputBufRef.current += data;
        const sugs = getSuggestions(inputBufRef.current, 6);
        setSuggestions(sugs);
        sugSelRef.current = -1;
        setSugSelected(-1);
      }

      // Always forward to server
      ws?.send(data);
    });

    // Resize observer
    const ro = new ResizeObserver(() => {
      try {
        fitAddon.fit();
        const ws = wsRef.current;
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
        }
      } catch { /* ignore */ }
    });
    if (termRef.current) ro.observe(termRef.current);

    term.writeln('\x1b[32m╔═══════════════════════════════════════════╗\x1b[0m');
    term.writeln('\x1b[32m║  \x1b[1;32mCYBERSENTINEL — Operator Terminal v2\x1b[0;32m   ║\x1b[0m');
    term.writeln('\x1b[32m╚═══════════════════════════════════════════╝\x1b[0m');
    term.writeln('\x1b[90mTip: Type any command — suggestions appear as you type.\x1b[0m');
    term.writeln('\x1b[90mWindows/Mac commands are auto-converted to Linux.\x1b[0m\r\n');
    term.writeln('\x1b[90mConnecting to server shell…\x1b[0m\r\n');

    return () => {
      ro.disconnect();
      term.dispose();
      xtermRef.current   = null;
      fitAddonRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { connect(); return () => { wsRef.current?.close(); }; }, [connect]);
  useEffect(() => { setTimeout(() => { try { fitAddonRef.current?.fit(); } catch { /**/ } }, 100); }, [fullscreen]);

  const sendKey = (seq: string) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) ws.send(seq);
    xtermRef.current?.focus();
  };

  const acceptSuggestion = (name: string) => {
    const ws = wsRef.current;
    ws?.send('\x15');     // Ctrl+U clear line
    ws?.send(name);
    inputBufRef.current = name;
    setSuggestions(getSuggestions(name, 6));
    setSugSelected(-1);
    sugSelRef.current = -1;
    xtermRef.current?.focus();
  };

  // Accent colour derived from palette for suggestion/summary borders
  const accentColor = (palette.foreground ?? '#00ff41') as string;
  const bgColor     = (palette.background ?? '#0a0a0f') as string;

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full bg-background font-mono ${fullscreen ? 'fixed inset-0 z-50' : ''}`}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 h-12 border-b border-border bg-card/60 shrink-0">
        <TerminalIcon size={16} className="text-primary shrink-0" />
        <span className="text-primary font-bold text-sm tracking-widest uppercase">Operator Terminal</span>

        <div className="flex items-center gap-1.5 ml-2">
          {connected
            ? <><Wifi size={11} className="text-green-400" /><span className="text-[10px] text-green-400">CONNECTED</span></>
            : connecting
              ? <><RefreshCw size={11} className="text-yellow-400 animate-spin" /><span className="text-[10px] text-yellow-400">CONNECTING…</span></>
              : <><WifiOff size={11} className="text-red-400" /><span className="text-[10px] text-red-400">DISCONNECTED</span></>}
        </div>

        {/* Universal badge */}
        <div className="ml-3 hidden sm:flex items-center gap-1 px-2 py-0.5 rounded border border-border/40 bg-primary/5 text-[10px] text-muted-foreground/60">
          <ArrowRightLeft size={9} />
          <span>Universal (Win/Mac→Linux)</span>
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

      {/* ── Error banner ────────────────────────────────────────────────── */}
      {error && (
        <div className="px-4 py-2 bg-red-950/40 border-b border-red-900/40 text-red-400 text-xs font-mono shrink-0">
          ⚠ {error}
        </div>
      )}

      {/* ── Translation flash banner ─────────────────────────────────────── */}
      {translation && (
        <div
          className="flex items-center gap-2 px-4 py-1.5 border-b text-xs font-mono shrink-0 transition-all"
          style={{ borderColor: accentColor + '40', background: accentColor + '10', color: accentColor }}
        >
          <ArrowRightLeft size={11} className="shrink-0" />
          <span>Auto-translated: <strong>{translation}</strong></span>
        </div>
      )}

      {/* ── Mobile toolbar ───────────────────────────────────────────────── */}
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

      {/* ── Main terminal area ───────────────────────────────────────────── */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        {/* xterm canvas */}
        <div
          ref={termRef}
          className="flex-1 min-h-0 p-2"
          style={{ background: bgColor }}
          onClick={() => { xtermRef.current?.focus(); }}
        />

        {/* ── Suggestion overlay ─────────────────────────────────────────── */}
        {suggestions.length > 0 && (
          <div
            className="absolute bottom-0 left-0 right-0 border-t font-mono z-20 max-h-52 overflow-y-auto"
            style={{ borderColor: accentColor + '30', background: bgColor + 'f0' }}
          >
            {/* Header row */}
            <div
              className="flex items-center justify-between px-3 py-1 border-b text-[10px] uppercase tracking-widest select-none"
              style={{ borderColor: accentColor + '20', color: accentColor + '70' }}
            >
              <span className="flex items-center gap-1.5">
                <Info size={9} />
                Suggestions · Tab to accept · ↑↓ to navigate · Esc to dismiss
              </span>
              <button
                className="hover:opacity-70 transition-opacity"
                onPointerDown={(e) => { e.preventDefault(); setSuggestions([]); xtermRef.current?.focus(); }}
              >
                <X size={10} />
              </button>
            </div>

            {suggestions.map((s, i) => {
              const selected = i === sugSelected;
              return (
                <div
                  key={s.name}
                  className="flex items-start gap-3 px-3 py-2 cursor-pointer transition-colors select-none"
                  style={{
                    background: selected ? accentColor + '18' : 'transparent',
                    borderLeft: selected ? `2px solid ${accentColor}` : '2px solid transparent',
                  }}
                  onPointerDown={(e) => { e.preventDefault(); acceptSuggestion(s.name); }}
                >
                  {/* Command name */}
                  <span
                    className="font-bold text-sm shrink-0 w-36 truncate"
                    style={{ color: selected ? accentColor : accentColor + 'cc' }}
                  >
                    {s.name}
                  </span>

                  {/* Description */}
                  <span className="text-xs text-muted-foreground/80 flex-1 truncate leading-5">
                    {s.desc}
                  </span>

                  {/* Category badge */}
                  <span
                    className="text-[10px] shrink-0 px-1.5 py-0.5 rounded border"
                    style={{ borderColor: accentColor + '25', color: accentColor + '70' }}
                  >
                    {CATEGORY_LABELS[s.category] ?? s.category}
                  </span>
                </div>
              );
            })}

            {/* Usage hint for selected suggestion */}
            {sugSelected >= 0 && suggestions[sugSelected]?.usage && (
              <div
                className="px-3 py-1.5 border-t text-[11px] font-mono"
                style={{ borderColor: accentColor + '20', color: accentColor + '90' }}
              >
                <span className="opacity-60">Example: </span>
                <span>{suggestions[sugSelected].usage}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Post-command Summary panel ──────────────────────────────────── */}
      {showSummary && summary && (
        <div
          className="shrink-0 border-t font-mono text-xs"
          style={{ borderColor: accentColor + '35', background: accentColor + '08' }}
        >
          <div
            className="flex items-center justify-between px-4 py-1 border-b"
            style={{ borderColor: accentColor + '20' }}
          >
            <div className="flex items-center gap-2" style={{ color: accentColor + 'aa' }}>
              <Info size={10} />
              <span className="uppercase tracking-widest text-[10px]">What just happened</span>
              {summary.translated && (
                <span
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px]"
                  style={{ background: accentColor + '15', color: accentColor + '90' }}
                >
                  <ArrowRightLeft size={9} />
                  ran as: {summary.translated}
                </span>
              )}
            </div>
            <button
              className="opacity-40 hover:opacity-70 transition-opacity"
              style={{ color: accentColor }}
              onClick={() => setShowSummary(false)}
            >
              <X size={11} />
            </button>
          </div>

          <div className="px-4 py-2.5 space-y-1">
            {/* Command echoed */}
            <div className="flex items-center gap-2">
              <span style={{ color: accentColor + '60' }} className="text-[11px]">$</span>
              <code style={{ color: accentColor + 'cc' }} className="text-[12px]">{summary.command}</code>
            </div>
            {/* 2-line description */}
            <p className="text-muted-foreground/80 leading-relaxed pl-4">
              {summary.info.summary}
            </p>
          </div>
        </div>
      )}

      {/* ── Desktop status footer ────────────────────────────────────────── */}
      {!isMobile && (
        <div className="flex items-center gap-4 px-4 py-1.5 border-t border-border bg-card/30 shrink-0 text-[10px] text-muted-foreground/40 font-mono">
          <span>SHELL: bash</span>
          <span>PTY: script-shim</span>
          <span>SERVER: Replit Linux</span>
          <span className="ml-auto">Tab=suggest · ↑↓=navigate · Esc=dismiss · Ctrl+C=interrupt · Ctrl+L=clear</span>
        </div>
      )}
    </div>
  );
}
