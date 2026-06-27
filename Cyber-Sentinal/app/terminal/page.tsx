'use client';

import React, { useState } from 'react';
import { Terminal as TerminalIcon, Copy, RefreshCw, Layers, Target, ChevronRight, Hash } from 'lucide-react';

const toolkit = {
  nmap: {
    name: 'Nmap',
    description: 'Network Scanner',
    options: [
      { label: 'Service Version', flag: '-sV' },
      { label: 'Default Scripts', flag: '-sC' },
      { label: 'All Ports', flag: '-p-' },
      { label: 'OS Detection', flag: '-O' },
      { label: 'Fast Scan', flag: '-T4' },
    ]
  },
  gobuster: {
    name: 'Gobuster',
    description: 'Directory Brute-forcer',
    options: [
      { label: 'Directory Mode', flag: 'dir' },
      { label: 'Common Wordlist', flag: '-w /usr/share/wordlists/dirb/common.txt' },
      { label: 'Follow Redirects', flag: '-r' },
      { label: 'No Errors', flag: '--no-errors' },
    ]
  }
};

export default function CommandLab() {
  const [selectedTool, setSelectedTool] = useState('nmap');
  const [target, setTarget] = useState('10.10.10.121');
  const [activeFlags, setActiveFlags] = useState<string[]>([]);

  const toggleFlag = (flag: string) => {
    setActiveFlags(prev => 
      prev.includes(flag) ? prev.filter(f => f !== flag) : [...prev, flag]
    );
  };

  const currentTool = toolkit[selectedTool as keyof typeof toolkit];
  const generatedCommand = `${selectedTool} ${activeFlags.join(' ')} ${selectedTool === 'gobuster' && !activeFlags.includes('dir') ? 'dir ' : ''}${selectedTool === 'gobuster' ? '-u ' : ''}${target}`;

  return (
    <div className="flex-1 p-8 font-mono animate-in fade-in duration-700">
      <header className="flex items-center justify-between mb-10 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-primary">
            <TerminalIcon size={28} />
            <span>sys.command_lab</span>
          </h1>
          <p className="text-muted-foreground text-[10px] uppercase tracking-widest mt-1">
            Visual Payload Synthesizer // PROTOCOL: [ACTIVE_SCAN]
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-primary/5 border border-primary/20 rounded">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
          <span className="text-[10px] font-bold text-primary">READY_FOR_SYNTHESIS</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <section className="bg-card/20 border border-border rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border bg-black/20 flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
              <Layers size={14} className="text-primary/50" /> Select Core Tool
            </div>
            <div className="p-4 space-y-2">
              {Object.keys(toolkit).map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedTool(key);
                    setActiveFlags([]);
                  }}
                  className={`w-full text-left p-3 rounded flex items-center justify-between border transition-all ${
                    selectedTool === key 
                      ? 'bg-primary/5 border-primary/30 text-primary' 
                      : 'bg-black/20 border-white/5 text-muted-foreground hover:border-white/10'
                  }`}
                >
                  <span className="font-bold text-xs uppercase tracking-widest">{toolkit[key as keyof typeof toolkit].name}</span>
                  <ChevronRight size={14} className={selectedTool === key ? "opacity-100" : "opacity-0"} />
                </button>
              ))}
            </div>
          </section>

          <section className="bg-card/20 border border-border rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border bg-black/20 flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
              <Target size={14} className="text-primary/50" /> Target Parameters
            </div>
            <div className="p-4">
              <div className="relative group">
                 <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/30 group-focus-within:text-primary transition-colors">
                    <Hash size={14} />
                 </div>
                 <input 
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="IPV4 / DOMAIN"
                  className="w-full bg-black/40 border border-white/10 p-3 pl-10 rounded focus:border-primary outline-none text-sm transition-all"
                />
              </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <section className="bg-card/20 border border-border rounded-lg overflow-hidden flex flex-col h-full min-h-[400px]">
            <div className="p-4 border-b border-border bg-black/20 flex items-center justify-between">
               <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                  <TerminalIcon size={14} className="text-primary/50" /> {currentTool.name} flag_telemetry
               </div>
               <button 
                 onClick={() => setActiveFlags([])}
                 className="text-[9px] font-bold text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                >
                 <RefreshCw size={10} /> RESET_ALL
               </button>
            </div>
            
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentTool.options.map((opt) => (
                <button
                  key={opt.flag}
                  onClick={() => toggleFlag(opt.flag)}
                  className={`p-4 rounded border text-left transition-all relative overflow-hidden group ${
                    activeFlags.includes(opt.flag)
                      ? 'bg-primary/5 border-primary/40'
                      : 'bg-black/20 border-white/5 hover:border-white/10'
                  }`}
                >
                  {activeFlags.includes(opt.flag) && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                  )}
                  <p className={`text-[10px] font-bold mb-1 transition-colors ${activeFlags.includes(opt.flag) ? 'text-primary' : 'text-foreground'}`}>
                    {opt.label.toUpperCase()}
                  </p>
                  <code className="text-[11px] text-muted-foreground font-mono">{opt.flag}</code>
                </button>
              ))}
            </div>

            <div className="mt-auto p-6 bg-black/40 border-t border-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em]">
                  Generated_Payload
                </h2>
                <button 
                  onClick={() => navigator.clipboard.writeText(generatedCommand)}
                  className="flex items-center gap-2 text-[10px] text-primary hover:text-white font-bold transition-all"
                >
                  <Copy size={12} /> COPY_TO_CLIPBOARD
                </button>
              </div>
              <div className="p-6 bg-black rounded border border-primary/20 text-lg group shadow-inner relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10 flex items-center justify-between">
                  <code className="text-primary break-all">
                    <span className="text-white/20 mr-2">$</span>
                    {generatedCommand}
                  </code>
                  <div className="w-2 h-6 bg-primary animate-pulse ml-4 shadow-[0_0_8px_rgba(0,255,0,0.5)]"></div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
