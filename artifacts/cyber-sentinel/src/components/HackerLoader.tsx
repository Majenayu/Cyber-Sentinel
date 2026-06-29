import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme, THEMES } from '@/contexts/ThemeContext';

const CHARS = '01アイウエカキクサシスタチツハヒフ0xDEAD0xC0DE0xFF0110';

function MatrixBg({ color }: { color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const FONT = 14;
    const cols = Math.floor(canvas.width / FONT);
    const drops = Array.from({ length: cols }, () => Math.random() * -80);
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    let animId: number;
    function draw() {
      ctx!.fillStyle = 'rgba(0,0,0,0.055)';
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);
      ctx!.font = `${FONT}px monospace`;
      for (let i = 0; i < drops.length; i++) {
        const bright = Math.random() > 0.9;
        ctx!.fillStyle = bright
          ? `rgba(255,255,255,0.7)`
          : `rgba(${r},${g},${b},${0.15 + Math.random() * 0.4})`;
        ctx!.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], i * FONT, drops[i] * FONT);
        if (drops[i] * FONT > canvas!.height && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 0.4;
      }
      animId = requestAnimationFrame(draw);
    }
    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [color]);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.55, mixBlendMode: 'screen' }} />;
}

const STATUS_STEPS = [
  { at: 0,  text: 'INITIALIZING SYSTEM...' },
  { at: 12, text: 'SCANNING GLOBAL NETWORK...' },
  { at: 26, text: 'DETECTING THREAT VECTORS...' },
  { at: 42, text: 'MAPPING TARGET NODES...' },
  { at: 57, text: 'DECRYPTING CHANNELS...' },
  { at: 71, text: 'BYPASSING FIREWALLS...' },
  { at: 85, text: 'ESTABLISHING SECURE LINK...' },
  { at: 97, text: 'ACCESS READY' },
];

interface HackerLoaderProps {
  onDone: () => void;
}

export default function HackerLoader({ onDone }: HackerLoaderProps) {
  const { theme } = useTheme();
  const color = THEMES.find(t => t.id === theme)?.color ?? '#00cc33';

  const [phase, setPhase] = useState<'loading' | 'auth'>('loading');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('INITIALIZING SYSTEM...');
  const [fading, setFading] = useState(false);
  const [scanLineY, setScanLineY] = useState(0);

  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [authVisible, setAuthVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Hex color to rgb helper
  const hex = color.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const rgb = `${r},${g},${b}`;

  useEffect(() => {
    if (phase !== 'loading') return;
    const TOTAL = 3800;

    const progTimer = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(progTimer); return 100; }
        const rand = Math.random() * 2.2 + 0.3;
        return Math.min(100, p + rand);
      });
    }, TOTAL / 85);

    // Horizontal scan line
    const scanTimer = setInterval(() => {
      setScanLineY(y => (y + 1) % 100);
    }, 18);

    const doneTimer = setTimeout(() => {
      setProgress(100);
      setStatusText('ACCESS READY');
      clearInterval(scanTimer);
      setTimeout(() => {
        setPhase('auth');
        setTimeout(() => setAuthVisible(true), 80);
      }, 500);
    }, TOTAL);

    return () => {
      clearInterval(progTimer);
      clearInterval(scanTimer);
      clearTimeout(doneTimer);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'loading') return;
    const matched = [...STATUS_STEPS].reverse().find(s => progress >= s.at);
    if (matched) setStatusText(matched.text);
  }, [progress, phase]);

  useEffect(() => {
    if (phase === 'auth' && authVisible) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [phase, authVisible]);

  const logIntrusion = useCallback((attemptedId: string) => {
    try {
      fetch('/api/auth/intrusion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptedId,
          platform: navigator.platform,
          language: navigator.language,
          screenResolution: `${screen.width}x${screen.height}`,
          colorDepth: screen.colorDepth,
          cores: navigator.hardwareConcurrency || 0,
          memory: (navigator as any).deviceMemory || 0,
          cookieEnabled: navigator.cookieEnabled,
          doNotTrack: navigator.doNotTrack || 'Unspecified',
          plugins: Array.from(navigator.plugins || []).slice(0, 10).map((p: any) => p.name),
        }),
      }).catch(() => {});
    } catch { /* silent */ }
  }, []);

  const handleSubmit = useCallback(() => {
    if (username === 'Majen') {
      setFading(true);
      setTimeout(onDone, 600);
    } else {
      logIntrusion(username);
      setError('ACCESS DENIED // INVALID OPERATOR ID');
      setShake(true);
      setUsername('');
      setTimeout(() => { setShake(false); setError(''); }, 1300);
    }
  }, [username, onDone, logIntrusion]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black overflow-hidden font-mono"
      style={{ transition: 'opacity 0.6s ease', opacity: fading ? 0 : 1, pointerEvents: fading ? 'none' : 'all' }}
    >
      {/* ── World map — full-screen dominant background ── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/worldmap-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'brightness(1.35) saturate(2) contrast(1.1)',
          opacity: 1,
        }}
      />
      {/* Subtle center shadow only during auth to keep map visible */}
      <div className="absolute inset-0" style={{
        background: phase === 'auth'
          ? 'radial-gradient(ellipse 70% 65% at 50% 52%, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.05) 80%, rgba(0,0,0,0) 100%)'
          : 'radial-gradient(ellipse 65% 60% at 50% 52%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 70%, rgba(0,0,0,0) 100%)'
      }} />

      {/* Horizontal sweep scan line */}
      {phase === 'loading' && (
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            top: `${scanLineY}%`,
            height: '2px',
            background: `linear-gradient(90deg, transparent 0%, rgba(${rgb},0.0) 10%, rgba(${rgb},0.6) 50%, rgba(${rgb},0.0) 90%, transparent 100%)`,
            boxShadow: `0 0 12px rgba(${rgb},0.4)`,
            transition: 'none',
          }}
        />
      )}

      {/* Corner grid decoration lines */}
      <div className="absolute inset-4 pointer-events-none" style={{ border: `1px solid rgba(${rgb},0.12)` }} />
      {/* Corner brackets */}
      {[
        'top-4 left-4 border-t-2 border-l-2',
        'top-4 right-4 border-t-2 border-r-2',
        'bottom-4 left-4 border-b-2 border-l-2',
        'bottom-4 right-4 border-b-2 border-r-2',
      ].map((cls, i) => (
        <div key={i} className={`absolute w-8 h-8 pointer-events-none ${cls}`} style={{ borderColor: `rgba(${rgb},0.7)` }} />
      ))}

      {/* Matrix rain on top */}
      <MatrixBg color={color} />

      {/* ── Main UI (centered) ── */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6">

        {/* Title */}
        <div className="text-center select-none">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="h-px w-20" style={{ background: `linear-gradient(to right, transparent, rgba(${rgb},0.8))` }} />
            <span className="text-[10px] tracking-[0.5em] uppercase" style={{ color: `rgba(${rgb},0.55)` }}>
              AI OPERATIONS HUB
            </span>
            <div className="h-px w-20" style={{ background: `linear-gradient(to left, transparent, rgba(${rgb},0.8))` }} />
          </div>
          <h1
            className="text-4xl md:text-5xl font-bold tracking-[0.35em] uppercase"
            style={{ color, textShadow: `0 0 30px rgba(${rgb},0.7), 0 0 60px rgba(${rgb},0.3)` }}
          >
            CYBERSENTINEL
          </h1>
          <p className="text-[11px] tracking-[0.4em] mt-1.5 uppercase" style={{ color: `rgba(${rgb},0.45)` }}>
            CLASSIFIED // LEVEL-5 CLEARANCE
          </p>
        </div>

        {/* Loading phase */}
        {phase === 'loading' && (
          <div className="w-full max-w-xl">
            {/* Main loading frame — like the reference */}
            <div
              className="relative w-full"
              style={{
                border: `1px solid rgba(${rgb},0.5)`,
                boxShadow: `0 0 24px rgba(${rgb},0.2), inset 0 0 24px rgba(${rgb},0.04)`,
                padding: '18px 20px',
              }}
            >
              {/* Frame corner accents */}
              {['-top-px -left-px', '-top-px -right-px', '-bottom-px -left-px', '-bottom-px -right-px'].map((pos, i) => (
                <div key={i} className={`absolute w-3 h-3 ${pos}`}
                  style={{
                    borderTop: i < 2 ? `2px solid rgba(${rgb},0.9)` : 'none',
                    borderBottom: i >= 2 ? `2px solid rgba(${rgb},0.9)` : 'none',
                    borderLeft: i % 2 === 0 ? `2px solid rgba(${rgb},0.9)` : 'none',
                    borderRight: i % 2 === 1 ? `2px solid rgba(${rgb},0.9)` : 'none',
                  }}
                />
              ))}

              {/* Status row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="animate-pulse text-[10px]" style={{ color }}>▮</span>
                  <span className="text-[11px] tracking-widest uppercase" style={{ color: `rgba(${rgb},0.8)` }}>
                    {statusText}
                  </span>
                </div>
                <span className="text-sm font-bold tabular-nums" style={{ color }}>
                  {Math.floor(progress)}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="relative w-full h-4 overflow-hidden"
                style={{ background: `rgba(${rgb},0.08)`, border: `1px solid rgba(${rgb},0.25)` }}>
                {/* Animated stripes */}
                <div className="absolute inset-0 opacity-30" style={{
                  backgroundImage: `repeating-linear-gradient(90deg, rgba(${rgb},0.5) 0px, rgba(${rgb},0.5) 10px, transparent 10px, transparent 20px)`,
                  animation: 'stripe-scroll 0.5s linear infinite',
                }} />
                {/* Fill */}
                <div className="absolute inset-y-0 left-0 transition-all duration-150"
                  style={{
                    width: `${progress}%`,
                    background: `linear-gradient(90deg, rgba(${rgb},0.7), rgba(${rgb},1))`,
                    boxShadow: `0 0 16px rgba(${rgb},0.8), 0 0 32px rgba(${rgb},0.4)`,
                  }}
                />
              </div>

              {/* Bottom row */}
              <div className="flex items-center justify-between mt-2">
                <span className="text-[9px] tracking-[0.3em] uppercase" style={{ color: `rgba(${rgb},0.35)` }}>
                  SYS.BOOT // CYBERSENTINEL_OS
                </span>
                <span className="text-[9px] tracking-[0.2em] uppercase" style={{ color: `rgba(${rgb},0.35)` }}>
                  NODES: {Math.floor(progress / 8.5)}/12
                </span>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-2 mt-3">
              {[
                { label: 'MEMORY', value: '2.4GB' },
                { label: 'THREADS', value: '16' },
                { label: 'OPSEC', value: 'AES-256' },
                { label: 'STATUS', value: progress < 100 ? 'SCANNING' : 'READY' },
              ].map(({ label, value }) => (
                <div key={label} className="text-center py-1.5 px-2"
                  style={{ border: `1px solid rgba(${rgb},0.2)`, background: `rgba(${rgb},0.05)` }}>
                  <div className="text-[8px] tracking-widest mb-0.5 uppercase" style={{ color: `rgba(${rgb},0.4)` }}>{label}</div>
                  <div className="text-[10px] font-bold" style={{ color }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Auth phase */}
        {phase === 'auth' && (
          <div
            className="w-full max-w-md"
            style={{
              opacity: authVisible ? 1 : 0,
              transform: authVisible ? 'translateY(0)' : 'translateY(16px)',
              transition: 'opacity 0.4s ease, transform 0.4s ease',
              animation: shake ? 'shake 0.4s ease' : undefined,
            }}
          >
            <div
              className="relative p-6 space-y-5"
              style={{
                border: `1px solid rgba(${rgb},0.7)`,
                background: `rgba(0,0,0,0.45)`,
                backdropFilter: 'blur(2px)',
                boxShadow: `0 0 50px rgba(${rgb},0.25), inset 0 0 40px rgba(${rgb},0.06)`,
              }}
            >
              {/* Corner accents */}
              {['-top-px -left-px', '-top-px -right-px', '-bottom-px -left-px', '-bottom-px -right-px'].map((pos, i) => (
                <div key={i} className={`absolute w-4 h-4 ${pos}`}
                  style={{
                    borderTop: i < 2 ? `2px solid rgba(${rgb},0.9)` : 'none',
                    borderBottom: i >= 2 ? `2px solid rgba(${rgb},0.9)` : 'none',
                    borderLeft: i % 2 === 0 ? `2px solid rgba(${rgb},0.9)` : 'none',
                    borderRight: i % 2 === 1 ? `2px solid rgba(${rgb},0.9)` : 'none',
                  }}
                />
              ))}

              <div className="text-center space-y-1">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
                  <span className="text-[10px] tracking-[0.4em] uppercase" style={{ color: `rgba(${rgb},0.5)` }}>
                    SYSTEM ONLINE
                  </span>
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
                </div>
                <p className="text-xl font-bold tracking-[0.3em] uppercase" style={{ color, textShadow: `0 0 20px rgba(${rgb},0.6)` }}>
                  ENTER OPERATOR ID
                </p>
                <p className="text-[10px] tracking-widest uppercase" style={{ color: `rgba(${rgb},0.4)` }}>
                  IDENTITY VERIFICATION REQUIRED
                </p>
              </div>

              <div>
                <div className="flex items-center"
                  style={{
                    border: `1px solid ${error ? 'rgba(255,50,50,0.7)' : `rgba(${rgb},0.5)`}`,
                    background: 'rgba(0,0,0,0.6)',
                    boxShadow: error ? '0 0 12px rgba(255,50,50,0.2)' : `0 0 12px rgba(${rgb},0.1)`,
                  }}>
                  <span className="px-3 text-sm font-bold select-none" style={{ color: `rgba(${rgb},0.5)` }}>ID:_</span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="TYPE OPERATOR ID"
                    autoComplete="off"
                    spellCheck={false}
                    className="flex-1 bg-transparent py-3 pr-4 text-sm tracking-widest uppercase outline-none placeholder:opacity-25"
                    style={{ color, caretColor: color, fontFamily: 'monospace' }}
                  />
                </div>
                {error && (
                  <p className="mt-2 text-[10px] tracking-wider text-center" style={{ color: 'rgb(255,70,70)' }}>
                    {error}
                  </p>
                )}
              </div>

              <button
                onClick={handleSubmit}
                className="w-full py-3 text-sm font-bold tracking-[0.4em] uppercase transition-all duration-150"
                style={{
                  background: `rgba(${rgb},0.15)`,
                  border: `1px solid rgba(${rgb},0.6)`,
                  color,
                  boxShadow: `0 0 16px rgba(${rgb},0.2)`,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = `rgba(${rgb},0.25)`;
                  e.currentTarget.style.boxShadow = `0 0 28px rgba(${rgb},0.5)`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = `rgba(${rgb},0.15)`;
                  e.currentTarget.style.boxShadow = `0 0 16px rgba(${rgb},0.2)`;
                }}
              >
                AUTHENTICATE ACCESS →
              </button>

              <p className="text-center text-[9px] tracking-widest uppercase" style={{ color: `rgba(${rgb},0.25)` }}>
                UNAUTHORIZED ACCESS WILL BE LOGGED AND PROSECUTED
              </p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes stripe-scroll {
          from { background-position: 0 0; }
          to { background-position: 20px 0; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-12px); }
          35% { transform: translateX(12px); }
          55% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}

function getHueRotate(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  if (max !== min) {
    const d = max - min;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  const targetHue = h * 360;
  return (targetHue - 0 + 360) % 360;
}
