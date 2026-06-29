import React, { useState } from 'react';
import { GitBranch, Lock, Unlock, ChevronRight } from 'lucide-react';

interface Skill {
  id: string;
  label: string;
  desc: string;
  level: number;
  unlocked: boolean;
  children?: string[];
}

const TREE: Skill[] = [
  { id: 'root', label: 'Ethical Hacking', desc: 'Foundation of all offensive security', level: 0, unlocked: true },
  { id: 'recon', label: 'Reconnaissance', desc: 'Passive and active information gathering', level: 1, unlocked: true },
  { id: 'scanning', label: 'Network Scanning', desc: 'Nmap, Masscan, port discovery', level: 1, unlocked: true },
  { id: 'vuln', label: 'Vuln Assessment', desc: 'Identify exploitable weaknesses', level: 2, unlocked: true },
  { id: 'webapps', label: 'Web App Hacking', desc: 'OWASP Top 10, Burp Suite', level: 2, unlocked: false },
  { id: 'exploitation', label: 'Exploitation', desc: 'Metasploit, custom exploits', level: 3, unlocked: false },
  { id: 'privesc-linux', label: 'Linux PrivEsc', desc: 'SUID, cron, kernel, sudo exploits', level: 3, unlocked: false },
  { id: 'privesc-win', label: 'Windows PrivEsc', desc: 'Token impersonation, registry, ACLs', level: 3, unlocked: false },
  { id: 'ad', label: 'Active Directory', desc: 'Kerberoasting, DCSync, BloodHound', level: 4, unlocked: false },
  { id: 'lateral', label: 'Lateral Movement', desc: 'Pass-the-hash, WMI, PsExec', level: 4, unlocked: false },
  { id: 'exfil', label: 'Data Exfiltration', desc: 'DNS tunneling, covert channels', level: 4, unlocked: false },
  { id: 'persistence', label: 'Persistence', desc: 'Backdoors, scheduled tasks, registry', level: 4, unlocked: false },
  { id: 'malware', label: 'Malware Dev', desc: 'Shellcode, droppers, AV evasion', level: 5, unlocked: false },
  { id: 'c2', label: 'C2 Frameworks', desc: 'Cobalt Strike, Sliver, Empire', level: 5, unlocked: false },
  { id: 'cloud', label: 'Cloud Hacking', desc: 'AWS/GCP/Azure attack paths', level: 5, unlocked: false },
  { id: 'red', label: 'Red Team Ops', desc: 'Full kill-chain ops, OPSEC', level: 6, unlocked: false },
  { id: 'iot', label: 'IoT / Embedded', desc: 'Firmware, UART, JTAG, radio', level: 5, unlocked: false },
  { id: 'mobile', label: 'Mobile Hacking', desc: 'Android/iOS app analysis', level: 4, unlocked: false },
  { id: 'crypto', label: 'Cryptography', desc: 'RSA, ECC, hash attacks', level: 3, unlocked: false },
  { id: 'forensics', label: 'Digital Forensics', desc: 'Memory dumps, disk imaging', level: 3, unlocked: false },
];

const COLORS = [
  'border-primary/60 bg-primary/10 text-primary',
  'border-blue-500/50 bg-blue-950/20 text-blue-400',
  'border-purple-500/50 bg-purple-950/20 text-purple-400',
  'border-orange-500/50 bg-orange-950/20 text-orange-400',
  'border-yellow-500/50 bg-yellow-950/20 text-yellow-400',
  'border-red-500/50 bg-red-950/20 text-red-400',
  'border-pink-500/50 bg-pink-950/20 text-pink-400',
];

const LOCKED = 'border-border/30 bg-black/20 text-muted-foreground/40';

export default function SkillTree() {
  const [skills, setSkills] = useState(TREE);
  const [selected, setSelected] = useState<Skill | null>(null);

  function toggle(id: string) {
    setSkills(prev => prev.map(s => s.id === id ? { ...s, unlocked: !s.unlocked } : s));
  }

  const byLevel = Array.from({ length: 7 }, (_, i) => skills.filter(s => s.level === i));
  const unlocked = skills.filter(s => s.unlocked).length;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 font-mono">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold flex items-center gap-2 text-primary"><GitBranch size={22} /> Pentesting Skill Tree</h1>
            <p className="text-muted-foreground text-xs">Track your offensive security progress. Click any node to unlock/lock it.</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{unlocked}/{skills.length}</div>
            <div className="text-[10px] text-muted-foreground">skills unlocked</div>
            <div className="mt-1 w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(unlocked / skills.length) * 100}%` }} />
            </div>
          </div>
        </header>

        <div className="overflow-x-auto pb-4">
          <div className="flex gap-6 min-w-max">
            {byLevel.map((levelSkills, level) => (
              <div key={level} className="flex flex-col gap-3 items-center">
                <div className="text-[9px] text-muted-foreground/50 tracking-[0.2em] uppercase">Tier {level}</div>
                <div className="flex flex-col gap-3">
                  {levelSkills.map(skill => (
                    <button
                      key={skill.id}
                      onClick={() => { toggle(skill.id); setSelected(skill); }}
                      className={`w-44 p-3 rounded-lg border text-left transition-all hover:scale-105 ${skill.unlocked ? COLORS[level % COLORS.length] : LOCKED}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold truncate">{skill.label}</span>
                        {skill.unlocked ? <Unlock size={11} className="shrink-0 ml-1" /> : <Lock size={11} className="shrink-0 ml-1" />}
                      </div>
                      <p className="text-[10px] leading-relaxed opacity-80">{skill.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-muted-foreground/50 text-center">
          Click nodes to mark skills as learned · Scroll horizontally to see all tiers
        </div>

        {selected && (
          <div className="bg-card/50 border border-border rounded-lg p-4 text-xs">
            <div className="flex items-center gap-2 mb-2">
              <ChevronRight size={13} className="text-primary" />
              <span className="font-bold text-primary">{selected.label}</span>
              <span className="text-muted-foreground">Tier {selected.level}</span>
            </div>
            <p className="text-muted-foreground">{selected.desc}</p>
          </div>
        )}
      </div>
    </div>
  );
}
