import React, { useEffect, useRef, useState } from 'react';
import { useTheme, THEMES } from '@/contexts/ThemeContext';

const CHARS = '01アイウエカキクサシスタチツハヒフ0xDEAD0xC0DE0xFF01100110HACK';

function MiniMatrixRain({ color }: { color: string }) {
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

    let animId: number;
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    function draw() {
      ctx!.fillStyle = 'rgba(0,0,0,0.06)';
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);
      ctx!.font = `${FONT}px 'JetBrains Mono', monospace`;

      for (let i = 0; i < drops.length; i++) {
        const bright = Math.random() > 0.85;
        ctx!.fillStyle = bright
          ? `rgba(255,255,255,0.9)`
          : `rgba(${r},${g},${b},${0.3 + Math.random() * 0.6})`;
        const ch = CHARS[Math.floor(Math.random() * CHARS.length)];
        ctx!.fillText(ch, i * FONT, drops[i] * FONT);
        if (drops[i] * FONT > canvas!.height && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 0.6;
      }
      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [color]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.6 }}
    />
  );
}

function SkullSVG({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 120" width="120" height="120" className="drop-shadow-[0_0_24px_currentColor]" style={{ color }}>
      <defs>
        <filter id="ldr-glow">
          <feGaussianBlur stdDeviation="3" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <ellipse cx="60" cy="50" rx="38" ry="38" fill={color} filter="url(#ldr-glow)" opacity="0.95"/>
      <ellipse cx="38" cy="74" rx="14" ry="7" fill={color}/>
      <ellipse cx="82" cy="74" rx="14" ry="7" fill={color}/>
      <rect x="38" y="70" width="44" height="22" rx="4" fill={color}/>
      <ellipse cx="60" cy="92" rx="20" ry="6" fill={color}/>
      <ellipse cx="47" cy="52" rx="11" ry="13" fill="black" opacity="0.9"/>
      <ellipse cx="73" cy="52" rx="11" ry="13" fill="black" opacity="0.9"/>
      <path d="M54 70 L66 70 L63 80 L57 80 Z" fill="black" opacity="0.8"/>
      <ellipse cx="60" cy="70" rx="5" ry="2.5" fill="black" opacity="0.8"/>
      <rect x="40" y="80" width="7" height="9" rx="2" fill="black" opacity="0.8"/>
      <rect x="51" y="80" width="7" height="10" rx="2" fill="black" opacity="0.8"/>
      <rect x="62" y="80" width="7" height="10" rx="2" fill="black" opacity="0.8"/>
      <rect x="73" y="80" width="7" height="9" rx="2" fill="black" opacity="0.8"/>
    </svg>
  );
}

const BOOT_LINES = [
  '> INITIALIZING CYBERSENTINEL_OS...',
  '> LOADING KNOWLEDGE_VAULT...',
  '> CONNECTING TO AI_ENGINE...',
  '> MOUNTING TOOL_REGISTRY...',
  '> DECRYPTING SESSION_STORE...',
  '> OPSEC CHECKS PASSED ✓',
  '> SYSTEM READY',
];

interface HackerLoaderProps {
  onDone: () => void;
}

export default function HackerLoader({ onDone }: HackerLoaderProps) {
  const { theme } = useTheme();
  const color = THEMES.find(t => t.id === theme)?.color ?? '#00cc33';

  const [lineIdx, setLineIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const total = 1600;
    const step = total / BOOT_LINES.length;

    const lineTimer = setInterval(() => {
      setLineIdx(i => {
        if (i + 1 >= BOOT_LINES.length) { clearInterval(lineTimer); return i; }
        return i + 1;
      });
    }, step);

    const progTimer = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(progTimer); return 100; }
        return p + 2;
      });
    }, total / 50);

    const doneTimer = setTimeout(() => {
      setFading(true);
      setTimeout(onDone, 500);
    }, total + 200);

    return () => {
      clearInterval(lineTimer);
      clearInterval(progTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black font-mono"
      style={{
        transition: 'opacity 0.5s ease',
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? 'none' : 'all',
      }}
    >
      <MiniMatrixRain color={color} />

      <div className="relative z-10 flex flex-col items-center gap-6 px-6 w-full max-w-md">
        <SkullSVG color={color} />

        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-[0.3em] uppercase" style={{ color }}>
            CYBERSENTINEL
          </h1>
          <p className="text-xs tracking-widest mt-1" style={{ color, opacity: 0.6 }}>
            AI OPERATIONS HUB // CLASSIFIED
          </p>
        </div>

        <div className="w-full space-y-1 text-left">
          {BOOT_LINES.slice(0, lineIdx + 1).map((line, i) => (
            <div
              key={i}
              className="text-[11px] tracking-wide"
              style={{ color: i === lineIdx ? color : `${color}66` }}
            >
              {line}
              {i === lineIdx && (
                <span className="animate-pulse ml-1">▮</span>
              )}
            </div>
          ))}
        </div>

        <div className="w-full space-y-1">
          <div className="flex justify-between text-[10px]" style={{ color, opacity: 0.5 }}>
            <span>SYS.BOOT</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full rounded-full transition-all duration-100"
              style={{
                width: `${progress}%`,
                backgroundColor: color,
                boxShadow: `0 0 8px ${color}`,
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 w-full mt-2">
          {['MEMORY', 'THREADS', 'OPSEC'].map((label, i) => (
            <div
              key={label}
              className="border rounded p-2 text-center"
              style={{ borderColor: `${color}33`, backgroundColor: `${color}08` }}
            >
              <div className="text-[9px] tracking-widest mb-1" style={{ color, opacity: 0.5 }}>{label}</div>
              <div className="text-xs font-bold" style={{ color }}>
                {i === 0 ? '2.4GB' : i === 1 ? '16' : 'AES-256'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
