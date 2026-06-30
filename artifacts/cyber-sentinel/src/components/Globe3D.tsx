import React, { useRef, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Globe, RefreshCw, ShieldAlert, MapPin } from 'lucide-react';

interface Intrusion { _id: string; ip: string; country: string; city: string; lat: number; lon: number; attempts: number; lastSeen: string; }

// Simplified continent polygons [lon, lat]
const CONTINENTS: number[][][] = [
  // North America
  [[-168,72],[-140,60],[-130,55],[-125,48],[-124,37],[-117,32],[-110,25],[-92,18],[-83,10],[-77,8],[-82,9],[-87,16],[-97,19],[-106,20],[-117,22],[-118,29],[-120,34],[-124,47],[-142,60],[-153,60],[-163,64],[-168,72]],
  // Greenland
  [[-74,77],[-20,77],[-18,70],[-38,60],[-52,62],[-57,68],[-74,77]],
  // South America
  [[-82,9],[-77,7],[-75,-3],[-72,-15],[-68,-22],[-67,-55],[-65,-55],[-60,-52],[-55,-34],[-48,-28],[-40,-20],[-35,-8],[-35,0],[-52,2],[-62,10],[-72,12],[-82,9]],
  // Europe
  [[-10,36],[10,36],[15,37],[25,36],[28,40],[36,42],[40,43],[42,47],[30,52],[25,60],[20,65],[15,70],[5,59],[-5,48],[-10,43],[-10,36]],
  // Africa
  [[-18,15],[52,15],[52,-26],[35,-35],[20,-35],[15,-17],[-18,15]],
  // Asia
  [[25,70],[50,70],[80,75],[100,72],[140,72],[145,45],[145,25],[120,20],[105,10],[100,2],[95,5],[80,8],[65,22],[50,28],[40,36],[36,47],[28,40],[25,70]],
  // Australia
  [[114,-22],[120,-18],[128,-14],[136,-12],[145,-14],[154,-22],[150,-38],[142,-38],[130,-33],[115,-34],[114,-22]],
  // Japan (approximate)
  [[130,31],[135,34],[140,38],[142,40],[141,44],[136,44],[132,33],[130,31]],
  // UK + Ireland
  [[-8,51],[-5,58],[-2,60],[2,58],[0,52],[-3,50],[-8,51]],
  // Scandinavia
  [[5,58],[10,63],[15,70],[28,72],[30,65],[25,60],[20,58],[10,58],[5,58]],
  // Indonesia / SE Asia islands (rough)
  [[95,5],[108,0],[120,-8],[130,-8],[134,-2],[136,0],[130,1],[120,2],[110,5],[100,6],[95,5]],
  // New Zealand
  [[166,-45],[174,-37],[174,-41],[170,-46],[166,-45]],
];

function pointInPolygon(lon: number, lat: number, poly: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi))
      inside = !inside;
  }
  return inside;
}

function isOnLand(lon: number, lat: number): boolean {
  return CONTINENTS.some(p => pointInPolygon(lon, lat, p));
}

function latLonToXYZ(lat: number, lon: number, r: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return [-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta)];
}

function rotateY(x: number, y: number, z: number, a: number): [number, number, number] {
  return [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
}

function project(x: number, y: number, z: number, cx: number, cy: number, R: number) {
  const fov = 2.2;
  const scale = R * fov / (fov + z / R + 1);
  return { sx: cx + x * (R / R) * scale / R * R, sy: cy - y * scale / R * R, vis: z < R * 0.1, depth: (z + R) / (2 * R) };
}

// Pre-compute land dots at startup
const LAND_DOTS: Array<{ la: number; lo: number; land: boolean }> = [];
for (let la = -80; la <= 80; la += 4) {
  for (let lo = -180; lo < 180; lo += 4) {
    LAND_DOTS.push({ la, lo, land: isOnLand(lo, la) });
  }
}

interface Props { height?: number; }

export default function Globe3D({ height = 320 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotY = useRef(0.4);
  const animRef = useRef<number | undefined>(undefined);

  const { data: intrusions = [], isFetching, refetch } = useQuery<Intrusion[]>({
    queryKey: ['intrusions'],
    queryFn: async () => { const r = await fetch('/api/auth/intrusions'); if (!r.ok) throw new Error('Failed'); return r.json(); },
    refetchInterval: 30_000,
  });

  const totalAttempts = intrusions.reduce((s, i) => s + i.attempts, 0);
  const validDots = intrusions.filter(i => i.lat !== 0 || i.lon !== 0);
  const [hovered, setHovered] = useState<Intrusion | null>(null);

  // Resize handler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    return () => ro.disconnect();
  }, []);

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    function draw() {
      const dpr = devicePixelRatio || 1;
      const W = canvas!.clientWidth;
      const H = canvas!.clientHeight;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const cx = W / 2, cy = H / 2;
      const R = Math.min(W, H) * 0.40;
      const t = Date.now() / 1000;
      const rot = rotY.current;

      // Deep space background circle
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.4);
      bg.addColorStop(0, 'rgba(0,8,20,0.95)');
      bg.addColorStop(0.7, 'rgba(0,4,12,0.7)');
      bg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.4, 0, Math.PI * 2); ctx.fill();

      // Outer atmosphere glow (layered)
      for (const [r2, alpha] of [[1.18, 0.08], [1.12, 0.12], [1.06, 0.18]]) {
        const atm = ctx.createRadialGradient(cx - R * 0.1, cy - R * 0.1, R * 0.7, cx, cy, R * (r2 as number));
        atm.addColorStop(0, `rgba(180,20,20,0)`);
        atm.addColorStop(0.7, `rgba(200,30,10,${alpha})`);
        atm.addColorStop(1, `rgba(255,60,10,0)`);
        ctx.fillStyle = atm;
        ctx.beginPath(); ctx.arc(cx, cy, R * (r2 as number), 0, Math.PI * 2); ctx.fill();
      }

      // Globe base fill
      const fill = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
      fill.addColorStop(0, 'rgba(0,18,45,0.98)');
      fill.addColorStop(0.6, 'rgba(0,8,22,0.98)');
      fill.addColorStop(1, 'rgba(0,3,10,0.98)');
      ctx.fillStyle = fill;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

      // Globe clip
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();

      // Land & ocean dots
      for (const { la, lo, land } of LAND_DOTS) {
        const [gx, gy, gz] = latLonToXYZ(la, lo, 1);
        const [rx, ry, rz] = rotateY(gx, gy, gz, rot);
        if (rz > 0.05) continue;
        const depth = (-rz + 1) / 2;
        const sx = cx + rx * R, sy = cy - ry * R;
        if (land) {
          const a = 0.3 + depth * 0.7;
          ctx.beginPath(); ctx.arc(sx, sy, 1.4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(30,160,80,${a})`;
          ctx.fill();
        } else {
          ctx.beginPath(); ctx.arc(sx, sy, 0.6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(20,60,120,${0.15 + depth * 0.2})`;
          ctx.fill();
        }
      }

      // Latitude rings (very subtle)
      for (let la = -60; la <= 60; la += 30) {
        ctx.beginPath();
        let first = true;
        for (let lo = -180; lo <= 180; lo += 2) {
          const [gx, gy, gz] = latLonToXYZ(la, lo, 1);
          const [rx, ry, rz] = rotateY(gx, gy, gz, rot);
          if (rz > 0) { first = true; continue; }
          const sx = cx + rx * R, sy = cy - ry * R;
          first ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy);
          first = false;
        }
        ctx.strokeStyle = 'rgba(40,100,180,0.10)'; ctx.lineWidth = 0.5; ctx.stroke();
      }

      // Server node (London ~0,51)
      const [svx, svy, svz] = latLonToXYZ(51, 0, 1);
      const [srx, sry, srz] = rotateY(svx, svy, svz, rot);
      const serverVis = srz < 0;

      if (serverVis) {
        const ssx = cx + srx * R, ssy = cy - sry * R;
        // Server pulse rings
        for (let p = 0; p < 3; p++) {
          const phase = ((t * 0.6 + p * 0.33) % 1);
          ctx.beginPath(); ctx.arc(ssx, ssy, 4 + phase * 16, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(0,200,120,${0.5 * (1 - phase)})`; ctx.lineWidth = 1; ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(ssx, ssy, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#00ff88'; ctx.fill();
        ctx.beginPath(); ctx.arc(ssx, ssy, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff'; ctx.fill();
      }

      // Attack arcs and hostile IPs
      for (const intr of validDots) {
        const [ax, ay, az] = latLonToXYZ(intr.lat, intr.lon, 1);
        const [arx, ary, arz] = rotateY(ax, ay, az, rot);
        if (arz > 0.05) continue;
        const asx = cx + arx * R, asy = cy - ary * R;

        // Pulsing rings (3 rings per attacker)
        for (let p = 0; p < 3; p++) {
          const phase = ((t * 1.2 + p * 0.33 + intr.lat * 0.1) % 1);
          const pr = 5 + phase * 18;
          ctx.beginPath(); ctx.arc(asx, asy, pr, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255,30,10,${0.7 * (1 - phase)})`; ctx.lineWidth = 0.8; ctx.stroke();
        }

        // Dot
        const dr = Math.min(7, 3.5 + Math.log2(intr.attempts + 1));
        const dGrad = ctx.createRadialGradient(asx, asy, 0, asx, asy, dr);
        dGrad.addColorStop(0, '#ffffff');
        dGrad.addColorStop(0.4, '#ff4422');
        dGrad.addColorStop(1, 'rgba(255,30,10,0.3)');
        ctx.beginPath(); ctx.arc(asx, asy, dr, 0, Math.PI * 2);
        ctx.fillStyle = dGrad; ctx.fill();

        // Arc to server
        if (serverVis) {
          const ssx = cx + srx * R, ssy = cy - sry * R;
          const dx = ssx - asx, dy = ssy - asy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const mx = (asx + ssx) / 2 - dy * 0.4, my = (asy + ssy) / 2 + dx * 0.4;

          // Arc trail
          ctx.beginPath(); ctx.moveTo(asx, asy);
          ctx.quadraticCurveTo(mx, my, ssx, ssy);
          ctx.strokeStyle = 'rgba(255,40,20,0.06)'; ctx.lineWidth = 0.8;
          ctx.setLineDash([4, 8]); ctx.stroke(); ctx.setLineDash([]);

          // Animated particles along arc
          for (let p = 0; p < 2; p++) {
            const phase = ((t * 0.4 + p * 0.5 + intr.lat * 0.05) % 1);
            const bx = (1 - phase) * (1 - phase) * asx + 2 * (1 - phase) * phase * mx + phase * phase * ssx;
            const by = (1 - phase) * (1 - phase) * asy + 2 * (1 - phase) * phase * my + phase * phase * ssy;
            ctx.beginPath(); ctx.arc(bx, by, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,80,40,${0.9 - phase * 0.5})`; ctx.fill();
          }
        }
      }

      ctx.restore();

      // Globe edge glow
      const edge = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R);
      edge.addColorStop(0, 'transparent');
      edge.addColorStop(0.6, 'rgba(40,80,180,0.05)');
      edge.addColorStop(1, 'rgba(80,120,220,0.25)');
      ctx.fillStyle = edge;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

      // Specular highlight (top-left)
      const spec = ctx.createRadialGradient(cx - R * 0.38, cy - R * 0.38, 0, cx - R * 0.38, cy - R * 0.38, R * 0.55);
      spec.addColorStop(0, 'rgba(120,180,255,0.09)');
      spec.addColorStop(1, 'transparent');
      ctx.fillStyle = spec;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

      // Globe outline
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(60,110,200,0.30)'; ctx.lineWidth = 1.2; ctx.stroke();

      rotY.current += 0.0015;
    }

    function loop() { draw(); animRef.current = requestAnimationFrame(loop); }
    loop();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [intrusions]);

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
          <span className="text-[10px] text-muted-foreground">{totalAttempts} total attempt{totalAttempts !== 1 ? 's' : ''}</span>
          <button onClick={() => refetch()} className="text-muted-foreground hover:text-primary transition-colors">
            <RefreshCw size={11} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="relative" style={{ height, background: '#000508' }}>
        <canvas ref={canvasRef} className="w-full h-full" style={{ display: 'block' }} />
        {intrusions.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
            <ShieldAlert size={20} className="text-primary/20" />
            <span className="text-[10px] tracking-widest text-muted-foreground/30">NO INTRUSIONS LOGGED</span>
          </div>
        )}
        {/* Corner brackets */}
        {['top-2 left-2 border-t border-l', 'top-2 right-2 border-t border-r', 'bottom-2 left-2 border-b border-l', 'bottom-2 right-2 border-b border-r'].map((cls, i) => (
          <div key={i} className={`absolute w-4 h-4 pointer-events-none ${cls} border-primary/25`} />
        ))}
        {/* Legend */}
        <div className="absolute bottom-3 right-4 flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#00ff88]" />
            <span className="text-[8px] text-muted-foreground/60 tracking-widest">SERVER</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[8px] text-muted-foreground/60 tracking-widest">ATTACKER</span>
          </div>
        </div>
      </div>

      {intrusions.length > 0 && (
        <div className="px-4 py-2 border-t border-border/50 bg-black/30 flex items-center gap-4 overflow-x-auto">
          <span className="text-[9px] tracking-[0.3em] text-muted-foreground/50 shrink-0">HOSTILE:</span>
          {intrusions.slice(0, 6).map(item => (
            <div key={item._id} className="flex items-center gap-1.5 shrink-0">
              <MapPin size={8} className="text-red-500" />
              <span className="text-[9px] text-red-400/80 tracking-wider">{item.ip}</span>
              <span className="text-[9px] text-muted-foreground/40">({item.country})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
