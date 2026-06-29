import React, { useEffect, useRef } from 'react';
import { useTheme, THEMES } from '@/contexts/ThemeContext';

// Skull shape as a 2D mask (1 = bright/skull area, 0 = dim/background)
const SKULL_MASK: number[][] = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,0,0,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0,1,1,1,1,0,0],
  [0,0,0,1,1,1,0,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0,1,1,1,0,0],
  [0,0,0,1,1,0,0,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1,0,0],
  [0,0,0,1,1,0,0,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1,0,0],
  [0,0,0,1,1,1,0,0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0,0,1,1,1,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,0,0,0,1,1,1,0,0,1,1,1,1,0,0,0,1,1,1,1,1,0,0,1,1,1,0,0,0],
  [0,0,0,0,1,1,1,1,0,0,1,1,1,1,0,0,0,1,1,1,1,1,0,0,1,1,1,1,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const SKULL_ROWS = SKULL_MASK.length;
const SKULL_COLS = SKULL_MASK[0].length;

const CHARS = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモ0110DEAD0CODE0C0FF1N7HACK';

export default function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();
  const themeColor = THEMES.find(t => t.id === theme)?.color ?? '#00cc33';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const FONT_SIZE = 14;
    let animId: number;
    let cols = 0;
    let drops: number[] = [];

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
      cols = Math.floor(canvas!.width / FONT_SIZE);
      drops = Array.from({ length: cols }, () => Math.random() * -50);
    }

    resize();
    window.addEventListener('resize', resize);
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    // Parse hex color to rgb
    function hexToRgb(hex: string) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    }

    function draw() {
      const { r, g, b } = hexToRgb(themeColor);
      const w = canvas!.width;
      const h = canvas!.height;

      // Fade trail
      ctx!.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx!.fillRect(0, 0, w, h);

      ctx!.font = `${FONT_SIZE}px 'JetBrains Mono', monospace`;

      // Skull position — centered
      const skullPixelW = SKULL_COLS * FONT_SIZE;
      const skullPixelH = SKULL_ROWS * FONT_SIZE;
      const skullStartX = Math.floor((w - skullPixelW) / 2);
      const skullStartY = Math.floor((h - skullPixelH) / 2) - 20;

      for (let i = 0; i < drops.length; i++) {
        const x = i * FONT_SIZE;
        const y = drops[i] * FONT_SIZE;

        // Check if this column/row is in the skull mask
        const skullCol = Math.floor((x - skullStartX) / FONT_SIZE);
        const skullRow = Math.floor((y - skullStartY) / FONT_SIZE);
        const inSkull =
          skullCol >= 0 && skullCol < SKULL_COLS &&
          skullRow >= 0 && skullRow < SKULL_ROWS &&
          SKULL_MASK[skullRow][skullCol] === 1;

        if (inSkull) {
          // Skull area — bright, vivid
          ctx!.fillStyle = `rgba(255, 255, 255, 0.95)`;
          const char = CHARS[Math.floor(Math.random() * CHARS.length)];
          ctx!.fillText(char, x, y);
        } else {
          // Normal rain — use theme color
          const brightness = Math.random();
          if (brightness > 0.5) {
            ctx!.fillStyle = `rgba(${r}, ${g}, ${b}, 0.9)`;
          } else {
            ctx!.fillStyle = `rgba(${r}, ${g}, ${b}, 0.3)`;
          }
          const char = CHARS[Math.floor(Math.random() * CHARS.length)];
          ctx!.fillText(char, x, y);
        }

        // Reset drop when it goes off screen or randomly
        if (drops[i] * FONT_SIZE > h && Math.random() > 0.975) {
          drops[i] = Math.random() * -20;
        }
        drops[i] += 0.5;
      }

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [themeColor]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.15, zIndex: 0 }}
    />
  );
}
