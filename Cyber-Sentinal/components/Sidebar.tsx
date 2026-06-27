'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Terminal, 
  Database, 
  Wrench, 
  FileCode, 
  Bot, 
  Settings,
  Activity
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Dashboard', icon: Terminal },
    { href: '/chat', label: 'AI Ops', icon: Bot },
    { href: '/vault', label: 'Knowledge Base', icon: Database },
    { href: '/tools', label: 'Tool Reference', icon: Wrench },
    { href: '/commands', label: 'Saved Commands', icon: FileCode },
  ];

  return (
    <div className="w-64 border-r border-border bg-card/50 flex flex-col h-screen shrink-0 font-mono">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <div className="flex items-center gap-2 text-primary font-bold tracking-tight">
          <Terminal size={20} className="text-primary" />
          <span className="text-lg">CyberSentinel_</span>
        </div>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className="block group">
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-200 border",
                  isActive 
                    ? "bg-primary/10 text-primary border-primary/20" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"
                )}
              >
                <item.icon size={16} className={isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"} />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border bg-black/20">
        <div className="flex items-center gap-2 px-2 py-1 mb-4 rounded bg-primary/5 border border-primary/10">
          <Activity size={12} className="text-primary animate-pulse" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
            Opsec: [READY]
          </span>
        </div>
        
        <Link href="/settings" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
          <Settings size={16} />
          <span>Settings</span>
        </Link>
        
        <div className="mt-4 text-[9px] text-muted-foreground/50 uppercase tracking-tighter text-center">
          V1.0.4-INTERNAL // BY DEEPMIND
        </div>
      </div>
    </div>
  );
}
