import React, { useRef, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Globe, RefreshCw, ShieldAlert } from 'lucide-react';
import { useTheme, THEMES } from '@/contexts/ThemeContext';

interface Intrusion { _id: string; ip: string; country: string; city: string; lat: number; lon: number; attempts: number; lastSeen: string; }

function latLonToVec3(lat: number, lon: number, r: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return [
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  ];
}

function project(x: number, y: number, z: number, rotY: number, cx: number, cy: number, scale: number): { sx: number; sy: number; visible: boolean } {
  const cosR = Math.cos(rotY), sinR = Math.sin(rotY);
  const rx = x * cosR + z * sinR;
  const ry = y;
  const rz = -x * sinR + z * cosR;
  return { sx: cx + rx * scale, sy: cy - ry * scale, visible: rz < 0 };
}

export default function Globe3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotY = useRef(0);
  const animRef = useRef<number>();
  const { theme } = useTheme();
  const color = THEMES[theme]?.color ?? '#00cc33';
  const [hovered, setHovered] = useState<Intrusion | null>(null);

  const { data: intrusions = [], isFetching, refetch } = useQuery<Intrusion[]>({
    queryKey: ['intrusions'],
    queryFn: async () => { const r = await fetch('/api/auth/intrusions'); if (!r.ok) throw new Error('Failed'); return r.json(); },
    refetchInterval: 30_000,
  });

  const totalAttempts = intrusions.reduce((s, i) => s + i.attempts, 0);
  const validDots = intrusions.filter(i => i.lat !== 0 || i.lon !== 0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    function hexToRgb(hex: string) {
      const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
      return `${r},${g},${b}`;
    }
    const rgb = hexToRgb(color);

    const GRID_LAT = 18, GRID_LON = 36;
    const gridPoints: Array<[number, number, number]> = [];
    for (let la = -80; la <= 80; la += 180 / GRID_LAT) {
      for (let lo = -180; lo < 180; lo += 360 / GRID_LON) {
        gridPoints.push(latLonToVec3(la, lo, 1));
      }
    }

    function draw() {
      const W = canvas!.width, H = canvas!.height;
      const cx = W / 2, cy = H / 2;
      const R = Math.min(W, H) * 0.38;

      ctx.clearRect(0, 0, W, H);

      // Atmosphere glow
      const grd = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.15);
      grd.addColorStop(0, `rgba(${rgb},0.04)`);
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.15, 0, Math.PI * 2); ctx.fill();

      // Grid dots
      for (const [gx, gy, gz] of gridPoints) {
        const { sx, sy, visible } = project(gx, gy, gz, rotY.current, cx, cy, R);
        if (!visible) continue;
        const depth = (-gz + 1) / 2;
        ctx.beginPath(); ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${depth * 0.25})`;
        ctx.fill();
      }

      // Latitude rings
      for (let la = -60; la <= 60; la += 30) {
        ctx.beginPath();
        let first = true;
        for (let lo = -180; lo <= 180; lo += 3) {
          const [gx, gy, gz] = latLonToVec3(la, lo, 1);
          const { sx, sy, visible } = project(gx, gy, gz, rotY.current, cx, cy, R);
          if (!visible) { first = true; continue; }
          first ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
          first = false;
        }
        ctx.strokeStyle = `rgba(${rgb},0.06)`; ctx.lineWidth = 0.5; ctx.stroke();
      }

      // Longitude meridians
      for (let lo = -180; lo < 180; lo += 30) {
        ctx.beginPath();
        let first = true;
        for (let la = -90; la <= 90; la += 3) {
          const [gx, gy, gz] = latLonToVec3(la, lo, 1);
          const { sx, sy, visible } = project(gx, gy, gz, rotY.current, cx, cy, R);
          if (!visible) { first = true; continue; }
          first ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
          first = false;
        }
        ctx.strokeStyle = `rgba(${rgb},0.06)`; ctx.lineWidth = 0.5; ctx.stroke();
      }

      // Globe outline
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${rgb},0.15)`; ctx.lineWidth = 1; ctx.stroke();

      // "Your server" point at center of globe (fixed)
      const serverLat = 0, serverLon = 0;
      const serverVec = latLonToVec3(serverLat, serverLon, 1);
      const server = project(...serverVec, rotY.current, cx, cy, R);
      if (server.visible) {
        ctx.beginPath(); ctx.arc(server.sx, server.sy, 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},0.9)`; ctx.fill();
        ctx.beginPath(); ctx.arc(server.sx, server.sy, 8, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rgb},0.4)`; ctx.lineWidth = 1; ctx.stroke();
      }

      // Attack arcs and dots
      const t = Date.now() / 1000;
      for (const intrusion of validDots) {
        const vec = latLonToVec3(intrusion.lat, intrusion.lon, 1);
        const { sx, sy, visible } = project(...vec, rotY.current, cx, cy, R);
        const srvP = project(...serverVec, rotY.current, cx, cy, R);

        if (visible) {
          // Pulsing ring
          const pulse = (Math.sin(t * 2 + intrusion.lat) + 1) / 2;
          const pR = 5 + pulse * 10;
          ctx.beginPath(); ctx.arc(sx, sy, pR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255,30,30,${0.5 * (1 - pulse)})`; ctx.lineWidth = 1; ctx.stroke();

          // Dot
          const dotR = Math.min(6, 3 + Math.log2(intrusion.attempts + 1));
          ctx.beginPath(); ctx.arc(sx, sy, dotR, 0, Math.PI * 2);
          ctx.fillStyle = '#ff2222'; ctx.fill();
          ctx.beginPath(); ctx.arc(sx, sy, dotR * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff'; ctx.fill();

          // Arc to server
          if (srvP.visible) {
            const phase = ((t * 0.5) % 1);
            const px = sx + (srvP.sx - sx) * phase;
            const py = sy + (srvP.sy - sy) * phase;

            ctx.beginPath();
            const mx = (sx + srvP.sx) / 2, my = (sy + srvP.sy) / 2 - 30;
            ctx.moveTo(sx, sy); ctx.quadraticCurveTo(mx, my, srvP.sx, srvP.sy);
            ctx.strokeStyle = 'rgba(255,30,30,0.08)'; ctx.lineWidth = 0.8; ctx.setLineDash([3, 6]); ctx.stroke();
            ctx.setLineDash([]);

            ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,60,60,0.8)'; ctx.fill();
          }
        }
      }

      rotY.current += 0.003;
    }

    function loop() { draw(); animRef.current = requestAnimationFrame(loop); }
    loop();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [intrusions, color]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.clientWidth * devicePixelRatio;
      canvas.height = canvas.clientHeight * devicePixelRatio;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    });
    ro.observe(canvas);
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="bg-card/50 border border-border rounded-lg overflow-hidden font-mono">
      <div className="px-4 py-3 border-b border-border bg-black/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe size={15} className="text-primary" />
          <span className="text-xs font-bold tracking-widest uppercase">Live Threat Globe</span>
          {intrusions.length > 0 && (
            <span className="text-[9px] px-2 py-0.5 border border-red-500/40 text-red-400 tracking-widest animate-pulse">
              {intrusions.length} HOSTILE IP{intrusions.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground">{totalAttempts} total attempts</span>
          <button onClick={() => refetch()} className="text-muted-foreground hover:text-primary transition-colors">
            <RefreshCw size={11} className={isFetching ? 'animate-spin' : ''} />
          </button>
          <Link href="/intrusions">
            <span className="text-[9px] text-primary/60 hover:text-primary tracking-widest cursor-pointer border border-primary/20 hover:border-primary/50 px-2 py-0.5 transition-all">VIEW ALL →</span>
          </Link>
        </div>
      </div>

      <div className="relative" style={{ height: 280, background: '#030303' }}>
        <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />
        {intrusions.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <ShieldAlert size={20} className="text-primary/30" />
            <span className="text-[10px] tracking-widest text-muted-foreground/40">NO INTRUSIONS LOGGED</span>
          </div>
        )}
        {['top-2 left-2 border-t border-l', 'top-2 right-2 border-t border-r', 'bottom-2 left-2 border-b border-l', 'bottom-2 right-2 border-b border-r'].map((cls, i) => (
          <div key={i} className={`absolute w-3 h-3 pointer-events-none ${cls} border-primary/20`} />
        ))}
      </div>

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
