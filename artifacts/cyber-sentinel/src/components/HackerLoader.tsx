import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme, THEMES } from '@/contexts/ThemeContext';

const CHARS = '01アイウエカキクサシスタチツハヒフ0xDEAD0xC0DE0xFF01100110';

function MatrixBg({ color }: { color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const FONT = 13;
    const cols = Math.floor(canvas.width / FONT);
    const drops = Array.from({ length: cols }, () => Math.random() * -60);
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    let animId: number;
    function draw() {
      ctx!.fillStyle = 'rgba(0,0,0,0.07)';
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);
      ctx!.font = `${FONT}px monospace`;
      for (let i = 0; i < drops.length; i++) {
        const bright = Math.random() > 0.88;
        ctx!.fillStyle = bright ? `rgba(255,255,255,0.8)` : `rgba(${r},${g},${b},${0.2 + Math.random() * 0.5})`;
        ctx!.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], i * FONT, drops[i] * FONT);
        if (drops[i] * FONT > canvas!.height && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 0.5;
      }
      animId = requestAnimationFrame(draw);
    }
    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [color]);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ opacity: 0.4 }} />;
}

function WorldMap({ color, scanX }: { color: string; scanX: number }) {
  const dots = [
    { x: 220, y: 90, label: 'MOSCOW' },
    { x: 420, y: 130, label: 'TOKYO' },
    { x: 160, y: 160, label: 'LONDON' },
    { x: 95, y: 170, label: 'NYC' },
    { x: 310, y: 200, label: 'DUBAI' },
    { x: 380, y: 220, label: 'DELHI' },
    { x: 110, y: 240, label: 'SAO PAULO' },
    { x: 430, y: 240, label: 'BEIJING' },
    { x: 470, y: 300, label: 'SYDNEY' },
    { x: 170, y: 120, label: 'BERLIN' },
    { x: 75, y: 145, label: 'CHICAGO' },
    { x: 310, y: 145, label: 'RIYADH' },
  ];

  return (
    <svg viewBox="0 0 560 340" width="100%" height="100%" className="overflow-visible">
      <defs>
        <filter id="glow-map">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="dot-glow">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id="scan-grad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="40%" stopColor={color} stopOpacity="0.08" />
          <stop offset="50%" stopColor={color} stopOpacity="0.35" />
          <stop offset="60%" stopColor={color} stopOpacity="0.08" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <clipPath id="map-clip">
          <rect x="0" y="0" width="560" height="340" />
        </clipPath>
      </defs>

      {/* Grid lines */}
      {[0, 56, 112, 168, 224, 280, 336, 392, 448, 504, 560].map(x => (
        <line key={`v${x}`} x1={x} y1={0} x2={x} y2={340} stroke={color} strokeOpacity={0.06} strokeWidth={0.5} />
      ))}
      {[0, 34, 68, 102, 136, 170, 204, 238, 272, 306, 340].map(y => (
        <line key={`h${y}`} x1={0} y1={y} x2={560} y2={y} stroke={color} strokeOpacity={0.06} strokeWidth={0.5} />
      ))}

      {/* Continent outlines — simplified */}
      {/* North America */}
      <path d="M 55 60 L 80 55 L 110 58 L 130 70 L 140 90 L 135 120 L 120 145 L 100 160 L 80 155 L 60 140 L 45 120 L 40 95 Z"
        fill="none" stroke={color} strokeWidth={1.2} strokeOpacity={0.55} filter="url(#glow-map)" />
      {/* South America */}
      <path d="M 90 165 L 115 160 L 130 175 L 135 200 L 130 240 L 115 265 L 100 270 L 88 255 L 82 230 L 80 205 L 82 180 Z"
        fill="none" stroke={color} strokeWidth={1.2} strokeOpacity={0.55} filter="url(#glow-map)" />
      {/* Europe */}
      <path d="M 155 55 L 185 50 L 210 55 L 220 70 L 215 90 L 195 100 L 175 105 L 158 95 L 148 78 Z"
        fill="none" stroke={color} strokeWidth={1.2} strokeOpacity={0.55} filter="url(#glow-map)" />
      {/* Africa */}
      <path d="M 165 110 L 210 108 L 235 120 L 245 150 L 248 185 L 240 220 L 220 240 L 200 245 L 180 235 L 162 210 L 155 175 L 155 145 L 158 120 Z"
        fill="none" stroke={color} strokeWidth={1.2} strokeOpacity={0.55} filter="url(#glow-map)" />
      {/* Asia */}
      <path d="M 225 48 L 290 42 L 360 48 L 420 60 L 455 80 L 460 110 L 440 140 L 400 160 L 360 165 L 310 160 L 270 150 L 235 135 L 218 110 L 218 80 Z"
        fill="none" stroke={color} strokeWidth={1.2} strokeOpacity={0.55} filter="url(#glow-map)" />
      {/* Australia */}
      <path d="M 415 240 L 460 235 L 490 248 L 498 270 L 490 295 L 460 305 L 430 298 L 410 278 L 408 258 Z"
        fill="none" stroke={color} strokeWidth={1.2} strokeOpacity={0.55} filter="url(#glow-map)" />
      {/* Japan */}
      <path d="M 448 88 L 460 82 L 468 90 L 462 100 L 452 98 Z"
        fill="none" stroke={color} strokeWidth={1} strokeOpacity={0.5} />

      {/* Connection lines between dots */}
      {dots.slice(0, 6).map((d, i) => (
        <line key={`conn${i}`}
          x1={dots[i].x} y1={dots[i].y}
          x2={dots[(i + 3) % dots.length].x} y2={dots[(i + 3) % dots.length].y}
          stroke={color} strokeOpacity={0.1} strokeWidth={0.5} strokeDasharray="3,6" />
      ))}

      {/* Scan beam */}
      <rect
        x={scanX - 80}
        y={0}
        width={160}
        height={340}
        fill="url(#scan-grad)"
        clipPath="url(#map-clip)"
      />
      {/* Scan line */}
      <line x1={scanX} y1={0} x2={scanX} y2={340} stroke={color} strokeOpacity={0.6} strokeWidth={1} />

      {/* Target dots */}
      {dots.map((dot, i) => {
        const isScanned = dot.x < scanX;
        return (
          <g key={i} filter={isScanned ? "url(#dot-glow)" : undefined}>
            <circle cx={dot.x} cy={dot.y} r={isScanned ? 5 : 3} fill="none"
              stroke={color} strokeWidth={isScanned ? 1.5 : 0.8} strokeOpacity={isScanned ? 0.9 : 0.35} />
            <circle cx={dot.x} cy={dot.y} r={isScanned ? 2.5 : 1.5}
              fill={color} fillOpacity={isScanned ? 0.9 : 0.25} />
            {isScanned && (
              <>
                <circle cx={dot.x} cy={dot.y} r={8} fill="none"
                  stroke={color} strokeWidth={0.6} strokeOpacity={0.35} />
                <text x={dot.x + 8} y={dot.y - 4} fontSize={6} fill={color} fillOpacity={0.7}
                  fontFamily="monospace">{dot.label}</text>
              </>
            )}
          </g>
        );
      })}

      {/* Corner brackets */}
      <path d="M 8 8 L 8 24 M 8 8 L 24 8" stroke={color} strokeWidth={1.5} strokeOpacity={0.7} fill="none" />
      <path d="M 552 8 L 552 24 M 552 8 L 536 8" stroke={color} strokeWidth={1.5} strokeOpacity={0.7} fill="none" />
      <path d="M 8 332 L 8 316 M 8 332 L 24 332" stroke={color} strokeWidth={1.5} strokeOpacity={0.7} fill="none" />
      <path d="M 552 332 L 552 316 M 552 332 L 536 332" stroke={color} strokeWidth={1.5} strokeOpacity={0.7} fill="none" />
    </svg>
  );
}

interface HackerLoaderProps {
  onDone: () => void;
}

export default function HackerLoader({ onDone }: HackerLoaderProps) {
  const { theme } = useTheme();
  const color = THEMES.find(t => t.id === theme)?.color ?? '#00cc33';

  const [phase, setPhase] = useState<'loading' | 'auth'>('loading');
  const [progress, setProgress] = useState(0);
  const [scanX, setScanX] = useState(0);
  const [statusText, setStatusText] = useState('INITIALIZING...');
  const [fading, setFading] = useState(false);

  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const STATUS_STEPS = [
    { at: 10, text: 'SCANNING GLOBAL NETWORK...' },
    { at: 25, text: 'DETECTING THREAT VECTORS...' },
    { at: 40, text: 'MAPPING TARGET NODES...' },
    { at: 58, text: 'DECRYPTING CHANNELS...' },
    { at: 74, text: 'BYPASSING FIREWALLS...' },
    { at: 88, text: 'ESTABLISHING SECURE LINK...' },
    { at: 100, text: 'ACCESS READY' },
  ];

  useEffect(() => {
    if (phase !== 'loading') return;
    const total = 3500;

    const progInterval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(progInterval); return 100; }
        return Math.min(100, p + (Math.random() * 2.5 + 0.5));
      });
    }, total / 80);

    const scanInterval = setInterval(() => {
      setScanX(x => {
        const next = x + 3.5;
        return next > 560 ? 0 : next;
      });
    }, 16);

    const doneTimer = setTimeout(() => {
      setProgress(100);
      setStatusText('ACCESS READY');
      clearInterval(scanInterval);
      setTimeout(() => setPhase('auth'), 600);
    }, total);

    return () => {
      clearInterval(progInterval);
      clearInterval(scanInterval);
      clearTimeout(doneTimer);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'loading') return;
    const matched = [...STATUS_STEPS].reverse().find(s => progress >= s.at);
    if (matched) setStatusText(matched.text);
  }, [progress, phase]);

  useEffect(() => {
    if (phase === 'auth') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [phase]);

  const handleSubmit = useCallback(() => {
    if (username === 'Majen') {
      setFading(true);
      setTimeout(onDone, 500);
    } else {
      setError('ACCESS DENIED // INVALID OPERATOR ID');
      setShake(true);
      setUsername('');
      setTimeout(() => { setShake(false); setError(''); }, 1200);
    }
  }, [username, onDone]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black font-mono overflow-hidden"
      style={{ transition: 'opacity 0.5s ease', opacity: fading ? 0 : 1, pointerEvents: fading ? 'none' : 'all' }}
    >
      <MatrixBg color={color} />

      <div className="relative z-10 flex flex-col items-center w-full max-w-2xl px-4 gap-4">

        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-1">
            <div className="h-px w-16 bg-gradient-to-r from-transparent" style={{ backgroundImage: `linear-gradient(to right, transparent, ${color})` }} />
            <span className="text-[10px] tracking-[0.4em] uppercase" style={{ color, opacity: 0.6 }}>
              GLOBAL OPS CENTER
            </span>
            <div className="h-px w-16" style={{ backgroundImage: `linear-gradient(to left, transparent, ${color})` }} />
          </div>
          <h1 className="text-3xl font-bold tracking-[0.35em] uppercase" style={{ color, textShadow: `0 0 20px ${color}88` }}>
            CYBERSENTINEL
          </h1>
          <p className="text-[11px] tracking-[0.3em] mt-0.5" style={{ color, opacity: 0.5 }}>
            {phase === 'loading' ? 'AI OPERATIONS HUB // CLASSIFIED' : 'SYSTEM ONLINE // AUTHENTICATION REQUIRED'}
          </p>
        </div>

        {/* World Map */}
        <div
          className="w-full rounded border overflow-hidden relative"
          style={{
            borderColor: `${color}33`,
            backgroundColor: `${color}06`,
            boxShadow: `0 0 30px ${color}18, inset 0 0 60px ${color}05`,
            height: '240px',
          }}
        >
          {/* Map header bar */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-1.5 border-b"
            style={{ borderColor: `${color}22`, backgroundColor: `${color}0a` }}>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
              <span className="text-[9px] tracking-widest uppercase" style={{ color, opacity: 0.7 }}>GLOBAL THREAT MAP</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[9px] tracking-widest" style={{ color, opacity: 0.5 }}>
                {phase === 'loading' ? statusText : '12 NODES MAPPED'}
              </span>
              <div className="flex gap-1">
                {['#', '+', '×'].map((s, i) => (
                  <span key={i} className="text-[9px] px-1" style={{ color, opacity: 0.4 }}>{s}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="absolute inset-0 pt-7">
            <WorldMap color={color} scanX={phase === 'loading' ? scanX : 560} />
          </div>

          {/* Scan line for auth phase */}
          {phase === 'auth' && (
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: `linear-gradient(180deg, ${color}00 0%, ${color}04 50%, ${color}00 100%)` }} />
          )}
        </div>

        {/* Loading phase */}
        {phase === 'loading' && (
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between text-[10px]" style={{ color, opacity: 0.6 }}>
              <span className="flex items-center gap-2">
                <span className="animate-pulse">▮</span>
                {statusText}
              </span>
              <span className="font-bold">{Math.floor(progress)}%</span>
            </div>
            <div className="relative w-full h-3 rounded-sm overflow-hidden border" style={{ borderColor: `${color}30`, backgroundColor: `${color}0a` }}>
              {/* Animated stripes */}
              <div className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `repeating-linear-gradient(90deg, ${color} 0px, ${color} 8px, transparent 8px, transparent 16px)`,
                  backgroundSize: '24px 100%',
                  animation: 'stripe-scroll 0.4s linear infinite',
                }} />
              <div
                className="relative h-full rounded-sm transition-all duration-150"
                style={{
                  width: `${progress}%`,
                  backgroundColor: color,
                  boxShadow: `0 0 12px ${color}, 0 0 24px ${color}66`,
                }}
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'NODES', value: `${Math.floor(progress / 8.5)}/12` },
                { label: 'THREATS', value: `${Math.floor(progress / 20)}` },
                { label: 'OPSEC', value: 'AES-256' },
                { label: 'STATUS', value: progress < 100 ? 'SCANNING' : 'READY' },
              ].map(({ label, value }) => (
                <div key={label} className="border rounded px-2 py-1.5 text-center" style={{ borderColor: `${color}22`, backgroundColor: `${color}07` }}>
                  <div className="text-[8px] tracking-widest mb-0.5" style={{ color, opacity: 0.45 }}>{label}</div>
                  <div className="text-[10px] font-bold" style={{ color }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Auth phase */}
        {phase === 'auth' && (
          <div
            className="w-full border rounded p-5 space-y-4"
            style={{
              borderColor: `${color}40`,
              backgroundColor: `${color}07`,
              boxShadow: `0 0 20px ${color}15`,
              animation: shake ? 'shake 0.4s ease' : undefined,
            }}
          >
            <div className="text-center space-y-1">
              <p className="text-[11px] tracking-[0.3em] uppercase" style={{ color, opacity: 0.5 }}>
                IDENTITY VERIFICATION REQUIRED
              </p>
              <p className="text-base font-bold tracking-widest uppercase" style={{ color }}>
                ENTER OPERATOR ID
              </p>
            </div>

            <div className="relative">
              <div className="flex items-center border rounded overflow-hidden"
                style={{ borderColor: error ? '#ff3333' : `${color}60`, backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <span className="px-3 text-sm font-bold select-none" style={{ color, opacity: 0.6 }}>ID:_</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="TYPE OPERATOR ID"
                  autoComplete="off"
                  spellCheck={false}
                  className="flex-1 bg-transparent py-3 pr-4 text-sm tracking-widest uppercase outline-none placeholder:opacity-30"
                  style={{
                    color,
                    caretColor: color,
                    fontFamily: 'monospace',
                  }}
                />
              </div>
              {error && (
                <p className="mt-1.5 text-[10px] tracking-wider text-center" style={{ color: '#ff4444' }}>
                  {error}
                </p>
              )}
            </div>

            <button
              onClick={handleSubmit}
              className="w-full py-2.5 rounded text-sm font-bold tracking-[0.3em] uppercase transition-all duration-150 border"
              style={{
                color: '#000',
                backgroundColor: color,
                borderColor: color,
                boxShadow: `0 0 16px ${color}66`,
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 0 28px ${color}`)}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = `0 0 16px ${color}66`)}
            >
              AUTHENTICATE →
            </button>

            <p className="text-center text-[9px] tracking-widest" style={{ color, opacity: 0.3 }}>
              UNAUTHORIZED ACCESS WILL BE LOGGED AND PROSECUTED
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes stripe-scroll {
          from { background-position: 0 0; }
          to { background-position: 24px 0; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-8px); }
          80% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}
