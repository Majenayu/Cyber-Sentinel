import React, { useEffect, useRef, useState, useCallback } from 'react';

const IDLE_MS = 120_000; // 2 minutes

export default function GlitchScreensaver() {
  const [active, setActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | undefined>(undefined);

  const reset = useCallback(() => {
    clearTimeout(timerRef.current);
    if (active) setActive(false);
    timerRef.current = setTimeout(() => setActive(true), IDLE_MS);
  }, [active]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'click'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    timerRef.current = setTimeout(() => setActive(true), IDLE_MS);
    return () => {
      events.forEach(e => window.removeEventListener(e, reset));
      clearTimeout(timerRef.current);
    };
  }, [reset]);

  useEffect(() => {
    if (!active) { if (animRef.current) cancelAnimationFrame(animRef.current); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d')!;
    const cols = Math.floor(canvas.width / 14);
    const rows = Math.floor(canvas.height / 18);
    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    const grid = Array.from({ length: cols }, () => Array.from({ length: rows }, () => ({ c: chars[Math.floor(Math.random() * chars.length)], bright: Math.random() < 0.1 })));
    let glitch = 0;

    function draw() {
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(0, 0, canvas!.width, canvas!.height);

      // Glitch horizontal slices
      if (Math.random() < 0.06) {
        glitch = Math.floor(Math.random() * canvas!.height);
        const sliceH = Math.floor(Math.random() * 40) + 5;
        const offset = (Math.random() - 0.5) * 80;
        const imgData = ctx.getImageData(0, glitch, canvas!.width, sliceH);
        ctx.putImageData(imgData, offset, glitch);
        ctx.putImageData(imgData, -offset, glitch + 2);
      }

      for (let col = 0; col < cols; col++) {
        for (let row = 0; row < rows; row++) {
          const cell = grid[col][row];
          if (Math.random() < 0.01) {
            cell.c = chars[Math.floor(Math.random() * chars.length)];
            cell.bright = Math.random() < 0.15;
          }
          const x = col * 14, y = row * 18 + 18;
          ctx.font = `bold 13px monospace`;
          const isGlitchRow = Math.abs(y - glitch) < 50;
          if (cell.bright || isGlitchRow) {
            ctx.fillStyle = isGlitchRow ? `rgba(255,${Math.floor(Math.random() * 100)},${Math.floor(Math.random() * 100)},0.9)` : '#ffffff';
            ctx.shadowColor = cell.bright ? '#00ff00' : '#ff0000';
            ctx.shadowBlur = 8;
          } else {
            ctx.fillStyle = `rgba(0,${150 + Math.random() * 105},0,${0.4 + Math.random() * 0.3})`;
            ctx.shadowBlur = 0;
          }
          ctx.fillText(cell.c, x, y);
        }
      }

      // "SYSTEM IDLE" overlay
      const t = Date.now() / 1000;
      const blink = Math.sin(t * 2) > 0;
      if (blink) {
        ctx.font = 'bold 48px monospace';
        ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 30;
        ctx.fillStyle = '#ff2222';
        ctx.textAlign = 'center';
        ctx.fillText('SYSTEM IDLE', canvas!.width / 2, canvas!.height / 2);
        ctx.font = '16px monospace';
        ctx.fillStyle = '#ff2222';
        ctx.fillText('MOVE MOUSE OR PRESS ANY KEY TO RESUME', canvas!.width / 2, canvas!.height / 2 + 60);
        ctx.textAlign = 'left';
        ctx.shadowBlur = 0;
      }

      animRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [active]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[300]" onClick={() => setActive(false)}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
