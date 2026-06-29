import React, { createContext, useContext, useEffect, useState } from 'react';

export const THEMES = [
  { id: 'matrix',       name: 'Matrix Green',   color: '#00cc33', bg: '#060a06' },
  { id: 'blood-red',    name: 'Blood Red',       color: '#ff1a1a', bg: '#0a0404' },
  { id: 'cyber-blue',   name: 'Cyber Blue',      color: '#00aaff', bg: '#04060a' },
  { id: 'purple-haze',  name: 'Purple Haze',     color: '#aa00ff', bg: '#07040a' },
  { id: 'orange-hack',  name: 'Orange Hack',     color: '#ff6600', bg: '#0a0604' },
  { id: 'toxic-yellow', name: 'Toxic Yellow',    color: '#ccee00', bg: '#080a02' },
  { id: 'neon-pink',    name: 'Neon Pink',       color: '#ff00bb', bg: '#0a0408' },
  { id: 'aqua-teal',    name: 'Aqua Teal',       color: '#00ddcc', bg: '#030a09' },
  { id: 'gold-rush',    name: 'Gold Rush',       color: '#ffaa00', bg: '#0a0800' },
  { id: 'ice-white',    name: 'Ice White',       color: '#c0d8e8', bg: '#04060a' },
  { id: 'crimson',      name: 'Crimson Code',    color: '#cc0044', bg: '#0a0306' },
  { id: 'royal-blue',   name: 'Royal Blue',      color: '#4455ff', bg: '#04040a' },
] as const;

export type ThemeId = typeof THEMES[number]['id'];

interface ThemeCtx { theme: ThemeId; setTheme: (t: ThemeId) => void; }

const ThemeContext = createContext<ThemeCtx>({ theme: 'matrix', setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    try { return (localStorage.getItem('cs-theme') as ThemeId) || 'matrix'; } catch { return 'matrix'; }
  });

  const setTheme = (t: ThemeId) => {
    setThemeState(t);
    try { localStorage.setItem('cs-theme', t); } catch {}
  };

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'matrix') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() { return useContext(ThemeContext); }
