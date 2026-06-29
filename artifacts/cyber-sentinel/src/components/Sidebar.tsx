import React from 'react';
import { Link, useLocation } from 'wouter';
import { Database, Wrench, FileCode, Bot, Settings, Activity } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTheme } from '@/contexts/ThemeContext';

function cn(...inputs: (string | boolean | undefined | null)[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  onNavigate?: () => void;
}

function SkullIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="16" cy="13" rx="10" ry="10" fill="currentColor" opacity="0.9"/>
      <ellipse cx="10.5" cy="21" rx="3.5" ry="2" fill="currentColor" opacity="0.9"/>
      <ellipse cx="21.5" cy="21" rx="3.5" ry="2" fill="currentColor" opacity="0.9"/>
      <rect x="10" y="20" width="12" height="6" rx="1.5" fill="currentColor" opacity="0.9"/>
      <ellipse cx="16" cy="26" rx="5.5" ry="1.5" fill="currentColor" opacity="0.9"/>
      <ellipse cx="12.5" cy="14" rx="3" ry="3.5" fill="black" opacity="0.85"/>
      <ellipse cx="19.5" cy="14" rx="3" ry="3.5" fill="black" opacity="0.85"/>
      <path d="M14.5 19.5 L17.5 19.5 L16.8 22 L15.2 22 Z" fill="black" opacity="0.7"/>
      <rect x="11" y="23" width="2" height="2.5" rx="0.5" fill="black" opacity="0.7"/>
      <rect x="14.5" y="23" width="3" height="3" rx="0.5" fill="black" opacity="0.7"/>
      <rect x="19" y="23" width="2" height="2.5" rx="0.5" fill="black" opacity="0.7"/>
    </svg>
  );
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const [pathname] = useLocation();
  const { theme } = useTheme();

  const navItems = [
    { href: '/', label: 'Dashboard', icon: Activity },
    { href: '/chat', label: 'AI Ops', icon: Bot },
    { href: '/vault', label: 'Knowledge Base', icon: Database },
    { href: '/tools', label: 'Tool Reference', icon: Wrench },
    { href: '/commands', label: 'Saved Commands', icon: FileCode },
  ];

  return (
    <div className="w-64 border-r border-border bg-card/50 flex flex-col h-screen shrink-0 font-mono">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <div className="flex items-center gap-2.5 text-primary font-bold tracking-tight">
          <span className="text-primary"><SkullIcon size={22} /></span>
          <span className="text-lg">CyberSentinel_</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <div
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-200 border cursor-pointer",
                  isActive
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"
                )}
              >
                <item.icon size={16} className={isActive ? "text-primary" : "text-muted-foreground"} />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border bg-black/20">
        <div className="flex items-center gap-2 px-2 py-1 mb-3 rounded bg-primary/5 border border-primary/10">
          <Activity size={12} className="text-primary animate-pulse" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
            Opsec: [READY]
          </span>
        </div>

        <Link href="/settings">
          <div onClick={onNavigate} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer">
            <Settings size={16} />
            <span>Settings</span>
          </div>
        </Link>
        <div className="mt-3 text-[9px] text-muted-foreground/50 uppercase tracking-tighter text-center">
          V1.0.4-INTERNAL // BY DEEPMIND
        </div>
      </div>
    </div>
  );
}
