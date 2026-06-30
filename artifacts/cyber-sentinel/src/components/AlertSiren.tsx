import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

// ── Audio context singleton ─────────────────────────────────────────────────
// Mobile browsers block AudioContext unless it was created (or resumed) inside
// a user-gesture handler. We create it lazily on first tap, then keep it alive.
let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!sharedCtx || sharedCtx.state === 'closed') {
      sharedCtx = new AudioContext();
    }
    return sharedCtx;
  } catch {
    return null;
  }
}

function unlockAudio() {
  // Called on any user tap — resumes a suspended context so future siren
  // calls (triggered by polling, not a gesture) can still play.
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

function playSiren() {
  const ctx = getAudioContext();
  if (!ctx) return;

  // If still suspended (mobile never tapped), try to resume; if it fails the
  // sound just won't play — no crash.
  const play = () => {
    try {
      const gain = ctx.createGain();
      gain.connect(ctx.destination);

      // Two-tone wail: low → high → low → high
      const osc = ctx.createOscillator();
      osc.connect(gain);
      osc.type = 'sawtooth';

      const t = ctx.currentTime;
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(900, t + 0.45);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.90);
      osc.frequency.exponentialRampToValueAtTime(900, t + 1.35);
      osc.frequency.exponentialRampToValueAtTime(180, t + 1.80);

      // Loud enough for phone speakers
      gain.gain.setValueAtTime(0.55, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 2.1);

      osc.start(t);
      osc.stop(t + 2.1);
    } catch {}
  };

  if (ctx.state === 'suspended') {
    ctx.resume().then(play).catch(() => {});
  } else {
    play();
  }
}

export default function AlertSiren() {
  const [active, setActive] = useState(false);
  const lastCountRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Unlock audio on any tap anywhere in the document
  useEffect(() => {
    document.addEventListener('click',      unlockAudio, { once: false, passive: true });
    document.addEventListener('touchstart', unlockAudio, { once: false, passive: true });
    document.addEventListener('keydown',    unlockAudio, { once: false, passive: true });
    return () => {
      document.removeEventListener('click',      unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('keydown',    unlockAudio);
    };
  }, []);

  const { data: intrusions = [] } = useQuery<any[]>({
    queryKey: ['intrusions'],
    queryFn: async () => {
      const r = await fetch('/api/auth/intrusions');
      if (!r.ok) throw new Error('fetch failed');
      return r.json();
    },
    refetchInterval: 8_000, // check every 8 s instead of 15 — faster alert
  });

  useEffect(() => {
    const count = intrusions.length;
    if (lastCountRef.current === null) {
      lastCountRef.current = count;
      return;
    }
    if (count > lastCountRef.current) {
      setActive(true);
      playSiren();
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setActive(false), 3500);
    }
    lastCountRef.current = count;
  }, [intrusions.length]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center">
      {/* Background pulse */}
      <div
        className="absolute inset-0 animate-pulse"
        style={{ background: 'radial-gradient(ellipse at center, rgba(255,0,0,0.22) 0%, rgba(255,0,0,0.10) 50%, transparent 70%)' }}
      />
      {/* Top + bottom border flash */}
      <div className="absolute inset-x-0 top-0 h-1 bg-red-500 animate-pulse" style={{ boxShadow: '0 0 24px #ff0000' }} />
      <div className="absolute inset-x-0 bottom-0 h-1 bg-red-500 animate-pulse" style={{ boxShadow: '0 0 24px #ff0000' }} />

      {/* Center text */}
      <div className="relative text-center font-mono" style={{ animation: 'sirenPulse 0.4s ease-in-out infinite' }}>
        <div className="text-red-400 text-4xl font-black tracking-widest mb-2" style={{ textShadow: '0 0 30px #ff0000' }}>
          ⚠ INTRUSION DETECTED ⚠
        </div>
        <div className="text-red-300/80 text-sm tracking-[0.3em]">NEW HOSTILE IP LOGGED</div>
      </div>

      <style>{`
        @keyframes sirenPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.65; transform: scale(1.03); }
        }
      `}</style>
    </div>
  );
}
