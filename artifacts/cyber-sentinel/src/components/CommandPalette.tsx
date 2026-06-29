import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import {
  Activity, Bot, Database, Wrench, FileCode, ShieldAlert, Settings,
  Terminal, Search, Bug, Globe, ShieldOff, Key, Zap, Hash, Users,
  Radar, AlertTriangle, GitBranch, Mail, Fingerprint
} from 'lucide-react';

interface Command {
  id: string;
  label: string;
  desc: string;
  icon: React.ElementType;
  action: () => void;
  shortcut?: string;
  group: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: Props) {
  const [, navigate] = useLocation();
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const go = useCallback((path: string) => { navigate(path); onClose(); }, [navigate, onClose]);

  const commands: Command[] = [
    { id: 'dashboard', label: 'Dashboard', desc: 'System overview', icon: Activity, action: () => go('/'), shortcut: 'G D', group: 'Navigation' },
    { id: 'chat', label: 'AI Ops', desc: 'AI-powered chat', icon: Bot, action: () => go('/chat'), shortcut: 'G C', group: 'Navigation' },
    { id: 'vault', label: 'Knowledge Base', desc: 'Intelligence vault', icon: Database, action: () => go('/vault'), shortcut: 'G K', group: 'Navigation' },
    { id: 'tools', label: 'Tool Reference', desc: 'Security tools', icon: Wrench, action: () => go('/tools'), shortcut: 'G T', group: 'Navigation' },
    { id: 'commands', label: 'Saved Commands', desc: 'Terminal commands', icon: FileCode, action: () => go('/commands'), shortcut: 'G M', group: 'Navigation' },
    { id: 'intrusions', label: 'Intrusion Log', desc: 'Hostile activity', icon: ShieldAlert, action: () => go('/intrusions'), shortcut: 'G I', group: 'Navigation' },
    { id: 'settings', label: 'Settings', desc: 'Configuration', icon: Settings, action: () => go('/settings'), group: 'Navigation' },
    { id: 'shells', label: 'Reverse Shells', desc: 'One-click shell payloads', icon: Terminal, action: () => go('/shells'), group: 'Security Tools' },
    { id: 'jwt', label: 'JWT Decoder', desc: 'Decode and inspect JWTs', icon: Key, action: () => go('/jwt'), group: 'Security Tools' },
    { id: 'payloads', label: 'Payload Library', desc: 'XSS, SQLi, LFI, SSRF…', icon: Zap, action: () => go('/payloads'), group: 'Security Tools' },
    { id: 'hash', label: 'Hash Tools', desc: 'Identify and compute hashes', icon: Hash, action: () => go('/hash'), group: 'Security Tools' },
    { id: 'dork', label: 'Dork Builder', desc: 'Google hacking queries', icon: Search, action: () => go('/dork'), group: 'Security Tools' },
    { id: 'cve', label: 'CVE Search', desc: 'NVD vulnerability database', icon: Bug, action: () => go('/cve'), group: 'Security Tools' },
    { id: 'iprep', label: 'IP Reputation', desc: 'Geolocation and abuse score', icon: Globe, action: () => go('/ip-rep'), group: 'Security Tools' },
    { id: 'breach', label: 'Breach Checker', desc: 'HaveIBeenPwned lookup', icon: ShieldOff, action: () => go('/breach'), group: 'Security Tools' },
    { id: 'recon', label: 'Network Recon', desc: 'DNS, WHOIS, ports, SSL', icon: Radar, action: () => go('/recon'), group: 'Security Tools' },
    { id: 'osint', label: 'Social OSINT', desc: 'Username across 35+ platforms', icon: Users, action: () => go('/osint'), group: 'Security Tools' },
    { id: 'typo', label: 'Typosquat Gen', desc: 'Domain typosquat variants', icon: AlertTriangle, action: () => go('/typosquat'), group: 'Security Tools' },
    { id: 'email', label: 'Email Analyzer', desc: 'Parse raw email headers', icon: Mail, action: () => go('/email-header'), group: 'Security Tools' },
    { id: 'fp', label: 'Fingerprint Inspector', desc: 'Your browser fingerprint', icon: Fingerprint, action: () => go('/fingerprint'), group: 'Security Tools' },
    { id: 'skill', label: 'Skill Tree', desc: 'Pentesting progress tracker', icon: GitBranch, action: () => go('/skill-tree'), group: 'Security Tools' },
  ];

  const filtered = q.trim()
    ? commands.filter(c => c.label.toLowerCase().includes(q.toLowerCase()) || c.desc.toLowerCase().includes(q.toLowerCase()) || c.group.toLowerCase().includes(q.toLowerCase()))
    : commands;

  useEffect(() => { setIdx(0); }, [q]);
  useEffect(() => { if (open) { setQ(''); setIdx(0); setTimeout(() => inputRef.current?.focus(), 50); } }, [open]);

  const runIdx = useCallback((i: number) => { filtered[i]?.action(); setQ(''); }, [filtered]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter') { e.preventDefault(); runIdx(idx); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, filtered, idx, onClose, runIdx]);

  useEffect(() => {
    const el = listRef.current?.children[idx] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [idx]);

  if (!open) return null;

  const groups = [...new Set(filtered.map(c => c.group))];

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl mx-4 bg-card border border-border rounded-xl shadow-2xl overflow-hidden font-mono"
        style={{ boxShadow: '0 0 60px rgba(0,0,0,0.8), 0 0 1px var(--primary)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-black/30">
          <Search size={16} className="text-muted-foreground shrink-0" />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search commands, pages, tools…"
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50" />
          <kbd className="text-[10px] text-muted-foreground/50 border border-border rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        <div ref={listRef} className="max-h-96 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">No results for "{q}"</div>
          ) : (
            groups.map(group => (
              <div key={group}>
                <div className="px-4 pt-3 pb-1 text-[10px] text-muted-foreground/50 tracking-widest uppercase">{group}</div>
                {filtered.filter(c => c.group === group).map((cmd) => {
                  const globalIdx = filtered.indexOf(cmd);
                  return (
                    <div key={cmd.id}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${globalIdx === idx ? 'bg-primary/10 border-l-2 border-primary' : 'hover:bg-secondary/30 border-l-2 border-transparent'}`}
                      onMouseEnter={() => setIdx(globalIdx)}
                      onClick={() => runIdx(globalIdx)}
                    >
                      <cmd.icon size={15} className={globalIdx === idx ? 'text-primary' : 'text-muted-foreground'} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground">{cmd.label}</div>
                        <div className="text-xs text-muted-foreground truncate">{cmd.desc}</div>
                      </div>
                      {cmd.shortcut && (
                        <div className="flex gap-1">
                          {cmd.shortcut.split(' ').map(k => (
                            <kbd key={k} className="text-[10px] text-muted-foreground/50 border border-border rounded px-1.5 py-0.5">{k}</kbd>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-border bg-black/20 flex items-center gap-4 text-[10px] text-muted-foreground/50">
          <span><kbd className="border border-border rounded px-1">↑↓</kbd> navigate</span>
          <span><kbd className="border border-border rounded px-1">↵</kbd> open</span>
          <span><kbd className="border border-border rounded px-1">Esc</kbd> close</span>
          <span className="ml-auto">Ctrl+K to open</span>
        </div>
      </div>
    </div>
  );
}
