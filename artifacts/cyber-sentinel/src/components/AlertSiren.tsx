import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

export default function AlertSiren() {
  const [active, setActive] = useState(false);
  const [lastCount, setLastCount] = useState<number | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const { data: intrusions = [] } = useQuery<any[]>({
    queryKey: ['intrusions'],
    queryFn: async () => { const r = await fetch('/api/auth/intrusions'); if (!r.ok) throw new Error('F'); return r.json(); },
    refetchInterval: 15_000,
  });

  function playSiren() {
    try {
      const ctx = new AudioContext();
      audioRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.5);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 1.0);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 1.5);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 2.0);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 2.5);
      osc.onended = () => ctx.close();
    } catch {}
  }

  useEffect(() => {
    const count = intrusions.length;
    if (lastCount === null) { setLastCount(count); return; }
    if (count > lastCount) {
      setActive(true);
      playSiren();
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setActive(false), 3500);
    }
    setLastCount(count);
  }, [intrusions.length]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center">
      <div
        className="absolute inset-0 animate-pulse"
        style={{ background: 'radial-gradient(ellipse at center, rgba(255,0,0,0.18) 0%, rgba(255,0,0,0.08) 50%, transparent 70%)' }}
      />
      <div className="absolute inset-x-0 top-0 h-1 bg-red-500 animate-pulse" style={{ boxShadow: '0 0 20px #ff0000' }} />
      <div className="absolute inset-x-0 bottom-0 h-1 bg-red-500 animate-pulse" style={{ boxShadow: '0 0 20px #ff0000' }} />

      <div
        className="relative text-center font-mono"
        style={{ animation: 'sirenPulse 0.4s ease-in-out infinite' }}
      >
        <div className="text-red-400 text-4xl font-black tracking-widest mb-2" style={{ textShadow: '0 0 30px #ff0000' }}>
          ⚠ INTRUSION DETECTED ⚠
        </div>
        <div className="text-red-300/80 text-sm tracking-[0.3em]">NEW HOSTILE IP LOGGED</div>
      </div>

      <style>{`
        @keyframes sirenPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.02); }
        }
      `}</style>
    </div>
  );
}
