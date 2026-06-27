'use client';

import React from 'react';
import { BookOpen, Terminal, Code, ExternalLink, Shield, Search, Cpu } from 'lucide-react';

const tools = [
  {
    name: 'Gobuster',
    category: 'Web Enumeration',
    description: 'Brute-force URIs (directories and files) and DNS subdomains with high-speed multithreading.',
    flags: [
      { flag: 'dir', desc: 'Directory/file mode' },
      { flag: '-u', desc: 'Target URL' },
      { flag: '-w', desc: 'Wordlist path' },
      { flag: '-x', desc: 'Extensions (.php,.txt)' },
    ],
    example: 'gobuster dir -u http://10.10.10.121/ -w /usr/share/wordlists/dirb/common.txt',
    htbLink: 'https://academy.hackthebox.com/module/77/section/727'
  },
  {
    name: 'ffuf',
    category: 'Web Enumeration',
    description: 'Fast web fuzzer written in Go. Ideal for directory discovery and parameter fuzzing.',
    flags: [
      { flag: '-u', desc: 'URL with FUZZ' },
      { flag: '-w', desc: 'Wordlist path' },
      { flag: '-mc', desc: 'Match HTTP codes' },
    ],
    example: 'ffuf -u http://10.10.10.121/FUZZ -w /wordlists/common.txt',
    htbLink: 'https://academy.hackthebox.com/module/54'
  },
  {
    name: 'Nmap',
    category: 'Network Recon',
    description: 'Industry standard network discovery and security auditing utility.',
    flags: [
      { flag: '-sV', desc: 'Service version info' },
      { flag: '-sC', desc: 'Run default scripts' },
      { flag: '-p-', desc: 'Scan all 65k ports' },
      { flag: '-A', desc: 'Aggressive mode' },
    ],
    example: 'nmap -sV -sC -p- 10.10.10.121',
    htbLink: 'https://academy.hackthebox.com/module/19'
  },
  {
    name: 'Whatweb',
    category: 'Web Enumeration',
    description: 'Identifies technologies (CMS, JS libraries, platforms) running on a web server.',
    flags: [
      { flag: '--no-errors', desc: 'Quiet mode' },
      { flag: '-v', desc: 'Verbose output' },
    ],
    example: 'whatweb 10.10.10.121',
    htbLink: 'https://academy.hackthebox.com/module/77'
  }
];

export default function CrashCourse() {
  return (
    <div className="flex-1 p-8 font-mono animate-in fade-in duration-700">
      <header className="flex items-center justify-between mb-10 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BookOpen className="text-primary" size={28} />
            <span>sys.crash_course</span>
          </h1>
          <p className="text-muted-foreground text-[10px] uppercase tracking-widest mt-1">
            Tactical Reference Library // Protocol: [REFERENCE_ONLY]
          </p>
        </div>
        <div className="text-[10px] font-bold text-primary px-3 py-1 bg-primary/5 border border-primary/20 rounded">
          MODULES_LOADED: 04
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tools.map((tool) => (
          <div key={tool.name} className="bg-card/20 border border-border rounded-lg p-6 flex flex-col hover:border-primary/40 transition-all group">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded border border-primary/20">
                  <Terminal size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors">{tool.name}</h2>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-primary/60 font-bold">{tool.category}</p>
                </div>
              </div>
              <a 
                href={tool.htbLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-white flex items-center gap-1.5 text-[10px] transition-colors"
              >
                HTB_ACADEMY <ExternalLink size={12} />
              </a>
            </div>

            <p className="text-sm text-gray-400 mb-8 leading-relaxed border-l border-white/5 pl-4 h-12 overflow-hidden">
              {tool.description}
            </p>

            <div className="space-y-6 mt-auto">
              <div className="grid grid-cols-2 gap-3">
                {tool.flags.slice(0, 4).map((f) => (
                  <div key={f.flag} className="p-2 bg-black/40 rounded border border-white/5 group-hover:border-primary/10 transition-colors">
                    <code className="text-primary text-xs font-bold">{f.flag}</code>
                    <p className="text-[9px] text-muted-foreground mt-0.5 uppercase tracking-tighter">{f.desc}</p>
                  </div>
                ))}
              </div>

              <div className="relative group/payload">
                <div className="flex items-center justify-between mb-2 px-1">
                  <p className="text-[9px] font-bold text-white/30 uppercase flex items-center gap-1.5">
                    <Code size={10} /> Reference_Payload
                  </p>
                  <button 
                    onClick={() => navigator.clipboard.writeText(tool.example)}
                    className="text-[9px] font-bold text-primary/50 hover:text-primary transition-colors cursor-pointer"
                  >
                    [COPY_BUFFER]
                  </button>
                </div>
                <div className="p-4 bg-black/80 border border-primary/10 rounded font-mono text-[11px] text-primary/80 overflow-x-auto shadow-inner">
                  {tool.example}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 p-8 border border-dashed border-white/5 rounded-lg flex flex-col items-center gap-4 text-center">
        <Cpu size={32} className="text-primary/10" />
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-loose">
          Awaiting more telemetry. Ingest notes via the Knowledge Vault to expand this library automagically.
        </p>
      </div>
    </div>
  );
}
