import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Database, Wrench, FileCode, Bot, Settings, Activity, ShieldAlert,
  Terminal, Bug, Globe, ShieldOff, Key, Zap, Hash, Users, Radar,
  AlertTriangle, GitBranch, Mail, Fingerprint, Search, ChevronLeft, ChevronRight,
  Music, Radio
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTheme } from '@/contexts/ThemeContext';

function cn(...inputs: (string | boolean | undefined | null)[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  onNavigate?: () => void;
  onCommandPalette?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
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

function Clock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id); }, []);
  const pad = (n: number) => String(n).padStart(2, '0');
  const utc = `${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}:${pad(t.getUTCSeconds())}`;
  const local = `${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`;
  return (
    <div className="px-3 py-2 bg-primary/5 border border-primary/10 rounded text-[9px] font-mono space-y-0.5">
      <div className="flex justify-between items-center">
        <span className="text-muted-foreground/50 tracking-widest">UTC</span>
        <span className="text-primary tabular-nums">{utc}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-muted-foreground/50 tracking-widest">LCL</span>
        <span className="text-primary/70 tabular-nums">{local}</span>
      </div>
    </div>
  );
}

const MAIN_NAV = [
  { href: '/', label: 'Dashboard', icon: Activity, shortcut: 'G D' },
  { href: '/chat', label: 'AI Ops', icon: Bot, shortcut: 'G C' },
  { href: '/vault', label: 'Knowledge Base', icon: Database, shortcut: 'G K' },
  { href: '/tools', label: 'Tool Reference', icon: Wrench, shortcut: 'G T' },
  { href: '/commands', label: 'Saved Commands', icon: FileCode, shortcut: 'G M' },
  { href: '/intrusions', label: 'Intrusion Log', icon: ShieldAlert, shortcut: 'G I' },
];

const SECURITY_NAV = [
  { href: '/shells', label: 'Reverse Shells', icon: Terminal },
  { href: '/jwt', label: 'JWT Decoder', icon: Key },
  { href: '/payloads', label: 'Payload Library', icon: Zap },
  { href: '/hash', label: 'Hash Tools', icon: Hash },
  { href: '/dork', label: 'Dork Builder', icon: Search },
  { href: '/cve', label: 'CVE Search', icon: Bug },
  { href: '/ip-rep', label: 'IP Reputation', icon: Globe },
  { href: '/breach', label: 'Breach Checker', icon: ShieldOff },
];

const OSINT_NAV = [
  { href: '/recon', label: 'Network Recon', icon: Radar },
  { href: '/osint', label: 'Social OSINT', icon: Users },
  { href: '/typosquat', label: 'Typosquat Gen', icon: AlertTriangle },
  { href: '/email-header', label: 'Email Analyzer', icon: Mail },
  { href: '/fingerprint', label: 'Fingerprint', icon: Fingerprint },
  { href: '/skill-tree', label: 'Skill Tree', icon: GitBranch },
  { href: '/tracker', label: 'QR / Honeypot', icon: Radio },
];

export default function Sidebar({ onNavigate, onCommandPalette, collapsed: externalCollapsed, onToggleCollapse }: SidebarProps) {
  const [pathname] = useLocation();
  const { theme } = useTheme();
  const [secOpen, setSecOpen] = useState(true);
  const [osintOpen, setOsintOpen] = useState(false);
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  const collapsed = externalCollapsed ?? internalCollapsed;
  const toggleCollapse = onToggleCollapse ?? (() => setInternalCollapsed(c => !c));

  const NavItem = ({ href, label, icon: Icon, shortcut }: { href: string; label: string; icon: React.ElementType; shortcut?: string }) => {
    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
    return (
      <Link href={href}>
        <div onClick={onNavigate}
          title={collapsed ? label : undefined}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150 border cursor-pointer group",
            collapsed ? "justify-center px-2" : "",
            isActive
              ? "bg-primary/10 text-primary border-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"
          )}
        >
          <Icon size={15} className={isActive ? "text-primary shrink-0" : "text-muted-foreground shrink-0"} />
          {!collapsed && <span className="flex-1 truncate">{label}</span>}
          {!collapsed && shortcut && (
            <span className="text-[9px] text-muted-foreground/30 group-hover:text-muted-foreground/50 tracking-wider shrink-0">{shortcut}</span>
          )}
        </div>
      </Link>
    );
  };

  const SectionHeader = ({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) => {
    if (collapsed) return null;
    return (
      <button onClick={onToggle} className="w-full flex items-center justify-between px-3 py-1 text-[9px] text-muted-foreground/40 tracking-[0.2em] uppercase hover:text-muted-foreground/60 transition-colors">
        <span>{label}</span>
        <span className="text-[8px]">{open ? '▲' : '▼'}</span>
      </button>
    );
  };

  return (
    <div className={cn(
      "border-r border-border bg-card/50 flex flex-col h-screen shrink-0 font-mono transition-all duration-200",
      collapsed ? "w-14" : "w-64"
    )}>
      {/* Header */}
      <div className="h-16 flex items-center px-4 border-b border-border justify-between shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2.5 text-primary font-bold tracking-tight min-w-0">
            <span className="text-primary shrink-0"><SkullIcon size={20} /></span>
            <span className="text-base truncate">CyberSentinel_</span>
          </div>
        )}
        {collapsed && <SkullIcon size={20} className="text-primary mx-auto" />}
        <button onClick={toggleCollapse}
          className={cn("text-muted-foreground hover:text-primary transition-colors shrink-0", collapsed && "mx-auto")}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Clock */}
      {!collapsed && (
        <div className="px-3 pt-3 shrink-0">
          <Clock />
        </div>
      )}

      {/* Search / Command Palette */}
      {!collapsed && onCommandPalette && (
        <div className="px-3 pt-2 shrink-0">
          <button onClick={onCommandPalette}
            className="w-full flex items-center gap-2 px-3 py-1.5 bg-black/30 border border-border rounded text-xs text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors">
            <Search size={11} />
            <span className="flex-1 text-left">Search…</span>
            <kbd className="text-[9px] border border-border/50 rounded px-1">Ctrl+K</kbd>
          </button>
        </div>
      )}
      {collapsed && onCommandPalette && (
        <div className="px-1 pt-2 shrink-0">
          <button onClick={onCommandPalette} title="Search (Ctrl+K)"
            className="w-full flex justify-center p-2 text-muted-foreground hover:text-primary transition-colors">
            <Search size={15} />
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        {!collapsed && <SectionHeader label="Main" open={true} onToggle={() => {}} />}
        {MAIN_NAV.map(item => <NavItem key={item.href} {...item} />)}

        <div className="pt-2">
          <SectionHeader label="Security Tools" open={secOpen} onToggle={() => setSecOpen(o => !o)} />
          {(secOpen || collapsed) && SECURITY_NAV.map(item => <NavItem key={item.href} {...item} />)}
        </div>

        <div className="pt-2">
          <SectionHeader label="OSINT & Recon" open={osintOpen} onToggle={() => setOsintOpen(o => !o)} />
          {(osintOpen || collapsed) && OSINT_NAV.map(item => <NavItem key={item.href} {...item} />)}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-border bg-black/20 shrink-0 space-y-1">
        {!collapsed && (
          <div className="flex items-center gap-2 px-2 py-1 mb-1 rounded bg-primary/5 border border-primary/10">
            <Activity size={10} className="text-primary animate-pulse shrink-0" />
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold truncate">Opsec: [READY]</span>
          </div>
        )}

        <NavItem href="/settings" label="Settings" icon={Settings} />

        {!collapsed && (
          <div className="mt-2 text-[8px] text-muted-foreground/30 uppercase tracking-tighter text-center">
            V2.0.0-INTERNAL // CYBERSENTINEL
          </div>
        )}
      </div>
    </div>
  );
}
