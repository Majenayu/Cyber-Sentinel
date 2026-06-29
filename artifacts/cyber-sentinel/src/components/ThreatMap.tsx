import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ShieldAlert, Globe, RefreshCw } from 'lucide-react';
import { useTheme, THEMES } from '@/contexts/ThemeContext';

interface Intrusion {
  _id: string;
  ip: string;
  country: string;
  city: string;
  lat: number;
  lon: number;
  attempts: number;
  browser: string;
  os: string;
  lastSeen: string;
}

function latLonToXY(lat: number, lon: number, w: number, h: number) {
  const x = ((lon + 180) / 360) * w;
  const y = ((90 - lat) / 180) * h;
  return { x, y };
}

export default function ThreatMap() {
  const { theme } = useTheme();
  const color = THEMES[theme]?.color ?? '#00cc33';
  const rgb = color.replace('#', '').match(/.{2}/g)!.map(h => parseInt(h, 16)).join(',');

  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 600, h: 300 });
  const [hovered, setHovered] = useState<Intrusion | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [tick, setTick] = useState(0);

  const { data: intrusions = [], isFetching, refetch } = useQuery<Intrusion[]>({
    queryKey: ['intrusions'],
    queryFn: async () => {
      const r = await fetch('/api/auth/intrusions');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDims({ w: Math.max(width, 300), h: Math.max(height, 180) });
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1200);
    return () => clearInterval(id);
  }, []);

  const validDots = intrusions.filter(i => i.lat !== 0 || i.lon !== 0);
  const totalAttempts = intrusions.reduce((s, i) => s + i.attempts, 0);

  return (
    <div className="bg-card/50 border border-border rounded-lg overflow-hidden font-mono">
      <div className="px-4 py-3 border-b border-border bg-black/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe size={15} className="text-primary" />
          <span className="text-xs font-bold tracking-widest uppercase text-foreground">
            Live Threat Map
          </span>
          {intrusions.length > 0 && (
            <span className="text-[9px] px-2 py-0.5 border border-red-500/40 text-red-400 tracking-widest animate-pulse">
              {intrusions.length} HOSTILE IP{intrusions.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground tracking-wider">
            {totalAttempts} total attempts
          </span>
          <button
            onClick={() => refetch()}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <RefreshCw size={11} className={isFetching ? 'animate-spin' : ''} />
          </button>
          <Link href="/intrusions">
            <span className="text-[9px] text-primary/60 hover:text-primary tracking-widest cursor-pointer border border-primary/20 hover:border-primary/50 px-2 py-0.5 transition-all">
              VIEW ALL →
            </span>
          </Link>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative w-full"
        style={{ height: 240, background: '#050505' }}
      >
        {/* World map background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'url(/worldmap-bg.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.28) saturate(1.6)',
            opacity: 1,
          }}
        />

        {/* Grid lines overlay */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.07 }}>
          {[...Array(9)].map((_, i) => (
            <line key={`h${i}`} x1="0" y1={`${(i + 1) * 10}%`} x2="100%" y2={`${(i + 1) * 10}%`} stroke={color} strokeWidth="0.5" />
          ))}
          {[...Array(19)].map((_, i) => (
            <line key={`v${i}`} x1={`${(i + 1) * 5}%`} y1="0" x2={`${(i + 1) * 5}%`} y2="100%" stroke={color} strokeWidth="0.5" />
          ))}
        </svg>

        {/* Dots SVG */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox={`0 0 ${dims.w} ${dims.h}`}
          preserveAspectRatio="none"
        >
          <defs>
            <radialGradient id="redPulse" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ff2222" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ff0000" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Attack arc lines from an imaginary "target" center */}
          {validDots.slice(0, 8).map((item, idx) => {
            const { x, y } = latLonToXY(item.lat, item.lon, dims.w, dims.h);
            const cx = dims.w * 0.5;
            const cy = dims.h * 0.5;
            const phase = ((tick + idx) % 4) / 4;
            const px = cx + (x - cx) * phase;
            const py = cy + (y - cy) * phase;
            return (
              <g key={`arc-${item._id}`}>
                <line
                  x1={x} y1={y} x2={cx} y2={cy}
                  stroke="rgba(255,30,30,0.08)"
                  strokeWidth="0.5"
                  strokeDasharray="3 6"
                />
                <circle cx={px} cy={py} r="2.5" fill="rgba(255,60,60,0.7)" />
              </g>
            );
          })}

          {validDots.map((item, idx) => {
            const { x, y } = latLonToXY(item.lat, item.lon, dims.w, dims.h);
            const pulsePhase = ((tick + idx * 3) % 3) / 3;
            const pulseR = 4 + pulsePhase * 14;
            const pulseOpacity = 0.55 * (1 - pulsePhase);
            const r = Math.min(5, 3 + Math.log2(item.attempts + 1));

            return (
              <g
                key={item._id}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  setHovered(item);
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) {
                    setTooltipPos({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                    });
                  }
                }}
                onMouseLeave={() => setHovered(null)}
                onMouseMove={(e) => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) {
                    setTooltipPos({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                    });
                  }
                }}
              >
                {/* Pulse ring */}
                <circle cx={x} cy={y} r={pulseR} fill="none" stroke="#ff2222" strokeWidth="1" opacity={pulseOpacity} />
                {/* Core dot */}
                <circle cx={x} cy={y} r={r} fill="#ff2222" opacity={0.9} />
                {/* White center */}
                <circle cx={x} cy={y} r={r * 0.35} fill="#ffffff" opacity={0.85} />
              </g>
            );
          })}
        </svg>

        {/* Empty state */}
        {intrusions.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <ShieldAlert size={22} style={{ color: `rgba(${rgb},0.3)` }} />
            <span className="text-[10px] tracking-widest text-muted-foreground/60">NO INTRUSIONS LOGGED</span>
          </div>
        )}

        {/* Hover tooltip */}
        {hovered && (
          <div
            className="absolute z-20 pointer-events-none"
            style={{
              left: Math.min(tooltipPos.x + 12, dims.w - 180),
              top: Math.max(tooltipPos.y - 80, 4),
              minWidth: 170,
            }}
          >
            <div
              className="p-2.5 space-y-1"
              style={{
                background: 'rgba(5,5,5,0.95)',
                border: '1px solid rgba(255,30,30,0.6)',
                boxShadow: '0 0 20px rgba(255,0,0,0.2)',
              }}
            >
              <div className="text-[11px] text-red-400 font-bold tracking-widest">{hovered.ip}</div>
              <div className="text-[10px] text-muted-foreground">{hovered.city}, {hovered.country}</div>
              <div className="text-[9px] text-muted-foreground/70">{hovered.browser} / {hovered.os}</div>
              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <span className="text-[9px] text-muted-foreground/50 tracking-wider">ATTEMPTS</span>
                <span className="text-[11px] text-red-400 font-bold">{hovered.attempts}</span>
              </div>
            </div>
          </div>
        )}

        {/* Corner brackets */}
        {['top-0 left-0 border-t border-l', 'top-0 right-0 border-t border-r', 'bottom-0 left-0 border-b border-l', 'bottom-0 right-0 border-b border-r'].map((cls, i) => (
          <div key={i} className={`absolute w-4 h-4 pointer-events-none ${cls}`} style={{ borderColor: `rgba(${rgb},0.4)` }} />
        ))}

        {/* Scanline */}
        <div className="absolute inset-x-0 top-0 h-full pointer-events-none"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)',
          }}
        />
      </div>

      {/* Bottom legend — most recent hits */}
      {intrusions.length > 0 && (
        <div className="px-4 py-2 border-t border-border/50 bg-black/30 flex items-center gap-4 overflow-x-auto">
          <span className="text-[9px] tracking-[0.3em] text-muted-foreground/50 shrink-0">RECENT:</span>
          {intrusions.slice(0, 5).map(item => (
            <div key={item._id} className="flex items-center gap-1.5 shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[9px] text-red-400/80 tracking-wider">{item.ip}</span>
              <span className="text-[9px] text-muted-foreground/40">({item.country})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
