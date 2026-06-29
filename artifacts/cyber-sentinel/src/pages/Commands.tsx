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

  const fetchCommands = async () => {
    const res = await fetch('/api/commands');
    const data = await res.json();
    setCommands(Array.isArray(data) ? data : []);
  };

  useEffect(() => { fetchCommands().finally(() => setIsLoading(false)); }, []);

  const categories = ['All', ...CATEGORIES.filter(c => commands.some(cmd => cmd.category === c)), ...Array.from(new Set(commands.map(c => c.category))).filter(c => !CATEGORIES.includes(c))].filter((v, i, a) => a.indexOf(v) === i);

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
  const handleEdit = (cmd: any) => { setFormData({ title: cmd.title, command: cmd.command, description: cmd.description || '', category: cmd.category }); setEditingId(cmd.id); setIsFormOpen(true); };

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
    if (!confirm('Delete this command?')) return;
    await fetch(`/api/commands/${id}`, { method: 'DELETE' });
    await fetchCommands();
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(target ? substituteTarget(text, target) : text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const printCheatsheet = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const html = `<!DOCTYPE html><html><head><title>CyberSentinel Cheatsheet</title><style>body{font-family:monospace;background:#000;color:#00ff66;padding:20px}h1{color:#00ff66;border-bottom:1px solid #00ff66;padding-bottom:8px}h2{color:#00ff66;margin-top:24px;text-transform:uppercase;font-size:12px;letter-spacing:2px}pre{background:#111;border:1px solid #00ff6633;padding:12px;border-radius:4px;overflow-x:auto;font-size:12px;color:#00ff66}.desc{color:#888;font-size:11px;margin:4px 0 12px}.cmd-title{font-weight:bold;font-size:13px}</style></head><body><h1>⊛ CYBER SENTINEL — Command Cheatsheet</h1><p style="color:#888;font-size:11px">Generated: ${new Date().toLocaleString()}${target ? ` · Target: ${target}` : ''}</p>${Object.entries(groupedForCheatsheet).map(([cat, cmds]) => `<h2>[ ${cat} ]</h2>${cmds.map(c => `<div class="cmd-title">${c.title}</div>${c.description ? `<div class="desc">${c.description}</div>` : ''}<pre>${target ? substituteTarget(c.command, target) : c.command}</pre>`).join('')}`).join('')}</body></html>`;
    win.document.write(html);
    win.document.close();
    win.print();
  };

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

  return (
    <div className="flex h-full overflow-hidden font-mono">
      {showSidebar && <div className="fixed inset-0 bg-black/60 z-20 md:hidden" onClick={() => setShowSidebar(false)} />}

      {/* Category sidebar */}
      <div className={cn("border-r border-border bg-card/30 flex flex-col shrink-0 z-30 transition-transform duration-300", "md:w-52 md:static md:translate-x-0", showSidebar ? "fixed inset-y-0 left-0 w-56 translate-x-0" : "hidden md:flex")}>
        <div className="p-3 md:p-4 border-b border-border">
          <h2 className="font-semibold flex items-center gap-2 text-xs md:text-sm"><Code2 size={16} className="text-primary" /> Categories</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <button onClick={() => { setCategoryFilter(null); setShowSidebar(false); }} className={cn("w-full text-left px-3 py-2 rounded text-xs transition-colors", !categoryFilter ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>All</button>
          {CATEGORIES.filter(c => commands.some(cmd => cmd.category === c)).map(cat => (
            <button key={cat} onClick={() => { setCategoryFilter(cat); setShowSidebar(false); }} className={cn("w-full text-left px-3 py-2 rounded text-xs transition-colors capitalize", categoryFilter === cat ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
              {cat}
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
              <div className="relative flex-1 md:flex-none md:w-48">
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

        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2.5">
          {isLoading ? (
            <div className="text-center py-16 text-primary text-xs"><Loader2 className="animate-spin inline mr-2" size={16} />Loading...</div>
          ) : filteredCommands.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-xs">No commands found. Use <code className="text-primary">{'{{target}}'}</code> in commands for auto-fill.</div>
          ) : (
            filteredCommands.map(cmd => {
              const displayCommand = target ? substituteTarget(cmd.command, target) : cmd.command;
              const hasTarget = cmd.command.includes('{{target}}') || cmd.command.includes('{{TARGET}}') || cmd.command.includes('TARGET_IP') || cmd.command.includes('TARGET_URL');
              return (
                <div key={cmd.id} className="bg-card/50 border border-border rounded-lg p-3 md:p-4 group hover:border-primary/30 transition-all">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <Terminal size={13} className="text-primary shrink-0" />
                      <span className="font-bold text-xs">{cmd.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-secondary border border-border rounded text-muted-foreground uppercase shrink-0 capitalize">{cmd.category}</span>
                      {hasTarget && target && <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 border border-primary/30 rounded text-primary shrink-0">→ {target}</span>}
                      {hasTarget && !target && <span className="text-[10px] text-muted-foreground/40 flex items-center gap-0.5"><Target size={8} /> needs target</span>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => handleCopy(cmd.id, displayCommand)} className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors" title="Copy command">
                        {copiedId === cmd.id ? <Check size={13} className="text-primary" /> : <Copy size={13} />}
                      </button>
                      <button onClick={() => handleEdit(cmd)} className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors"><Edit size={13} /></button>
                      <button onClick={() => handleDelete(cmd.id)} className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <pre className={cn("text-primary p-2.5 md:p-3 rounded border text-xs overflow-x-auto font-mono transition-colors", target && hasTarget ? "bg-primary/5 border-primary/20" : "bg-black/60 border-primary/10")}>
                    {displayCommand}
                  </pre>
                  {cmd.description && <p className="text-[11px] text-muted-foreground mt-2">{cmd.description}</p>}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
