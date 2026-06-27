'use client';

import React, { useState, useEffect } from 'react';
import { FileCode, Search, Plus, Trash2, Edit, Save, X, Copy, Terminal, Check, Loader2, Code2 } from 'lucide-react';

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
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

  const fetchCommands = async () => {
    const res = await fetch('/api/commands');
    const data = await res.json();
    setCommands(Array.isArray(data) ? data : []);
  };

  useEffect(() => { fetchCommands().finally(() => setIsLoading(false)); }, []);

  const categories = Array.from(new Set(commands.map(c => c.category))).sort();

  const filteredCommands = commands.filter(c => {
    const matchesSearch = !searchQuery ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !categoryFilter || c.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const resetForm = () => { setFormData({ title: '', command: '', description: '', category: '' }); setEditingId(null); };

  const handleEdit = (cmd: any) => {
    setFormData({ title: cmd.title, command: cmd.command, description: cmd.description || '', category: cmd.category });
    setEditingId(cmd.id);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const payload = { title: formData.title, command: formData.command, description: formData.description || undefined, category: formData.category || 'uncategorized' };
    try {
      if (editingId) {
        await fetch(`/api/commands/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } else {
        await fetch('/api/commands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      }
      setIsFormOpen(false);
      resetForm();
      await fetchCommands();
    } catch {}
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this saved command?')) return;
    await fetch(`/api/commands/${id}`, { method: 'DELETE' });
    await fetchCommands();
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex h-full overflow-hidden font-mono">
      {/* Sidebar Filters */}
      <div className="w-64 border-r border-border bg-card/30 flex flex-col shrink-0">
        <div className="p-4 border-b border-border space-y-4">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <FileCode size={18} className="text-primary" /> Filters
          </h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Search cmds..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-black/50 border border-border rounded text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div onClick={() => setCategoryFilter(null)} className={cn('p-2 rounded-md cursor-pointer text-sm transition-colors border', categoryFilter === null ? 'bg-primary/20 text-primary border-primary/30' : 'text-muted-foreground hover:bg-secondary border-transparent')}>
            [ ALL CATEGORIES ]
          </div>
          {categories.map(cat => (
            <div key={cat} onClick={() => setCategoryFilter(cat)} className={cn('p-2 rounded-md cursor-pointer text-sm transition-colors flex justify-between items-center border', categoryFilter === cat ? 'bg-secondary text-foreground border-border' : 'text-muted-foreground hover:bg-secondary/50 border-transparent')}>
              <span className="truncate">{cat}</span>
              <span className="text-[10px] px-1.5 bg-black/30 rounded">{commands.filter(c => c.category === cat).length}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-background/50 overflow-hidden flex flex-col relative">
        <div className="p-6 border-b border-border flex justify-between items-center bg-card/20 shrink-0">
          <h1 className="text-2xl font-bold">sys.commands</h1>
          <button onClick={() => { resetForm(); setIsFormOpen(true); }} className="px-4 py-2 bg-primary text-black font-bold text-sm rounded hover:bg-primary/80 flex items-center gap-2 transition-colors">
            <Plus size={16} /> Store Command
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-4 pb-20">
            {isLoading ? (
              <div className="text-center py-10 text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Loading registry...
              </div>
            ) : filteredCommands.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground border border-dashed border-border rounded-lg bg-black/20">
                <Terminal size={48} className="mx-auto mb-4 opacity-20" />
                <p>No commands matched your query.</p>
              </div>
            ) : filteredCommands.map(cmd => (
              <div key={cmd.id} className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between py-3 px-4 border-b border-border/50 bg-secondary/30">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-base">{cmd.title}</span>
                    <span className="text-[10px] px-2 py-0.5 border border-primary/30 text-primary bg-primary/5 rounded uppercase font-bold">{cmd.category}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(cmd)} className="p-1.5 hover:bg-secondary rounded transition-colors"><Edit size={14} /></button>
                    <button onClick={() => handleDelete(cmd.id)} className="p-1.5 text-destructive hover:bg-destructive/20 rounded transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
                {cmd.description && (
                  <div className="px-4 py-2 text-sm text-muted-foreground border-b border-border/30 bg-card/50">{cmd.description}</div>
                )}
                <div className="relative group">
                  <pre className="p-4 bg-black font-mono text-sm text-primary overflow-x-auto m-0 shadow-inner"><code>{cmd.command}</code></pre>
                  <button className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 px-3 text-xs bg-secondary border border-border rounded flex items-center gap-1.5" onClick={() => handleCopy(cmd.id, cmd.command)}>
                    {copiedId === cmd.id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Slide-in Form Panel */}
        <div className={cn('absolute top-0 right-0 h-full w-96 bg-card border-l border-primary/50 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col z-10', isFormOpen ? 'translate-x-0' : 'translate-x-full')}>
          <div className="p-4 border-b border-border flex justify-between items-center bg-black/20">
            <h3 className="font-bold text-primary flex items-center gap-2"><Terminal size={18} /> {editingId ? 'EDIT_PAYLOAD' : 'NEW_PAYLOAD'}</h3>
            <button onClick={() => setIsFormOpen(false)} className="p-1.5 hover:bg-destructive/20 hover:text-destructive rounded transition-colors"><X size={16} /></button>
          </div>
          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            {[{ label: 'Identifier / Title', key: 'title', placeholder: 'e.g. Nmap Fast Scan' }, { label: 'Category', key: 'category', placeholder: 'e.g. recon, enum, web' }].map(field => (
              <div key={field.key} className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase font-bold">{field.label}</label>
                <input
                  value={formData[field.key as keyof typeof formData]}
                  onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 bg-black/50 border border-border rounded text-sm focus:outline-none focus:border-primary"
                />
              </div>
            ))}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground uppercase font-bold flex items-center gap-1.5"><Code2 size={11} className="text-primary" /> Raw Command</label>
              <textarea
                value={formData.command}
                onChange={e => setFormData({ ...formData, command: e.target.value })}
                placeholder="nmap -sV -sC -p- $TARGET"
                rows={5}
                className="w-full px-3 py-2 bg-black border border-primary/30 text-primary rounded text-sm font-mono resize-none focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground uppercase font-bold">Notes / Description (Optional)</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description of what this command does..."
                rows={3}
                className="w-full px-3 py-2 bg-black/50 border border-border rounded text-sm resize-none focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div className="p-4 border-t border-border bg-black/20">
            <button
              onClick={handleSave}
              disabled={!formData.title || !formData.command || !formData.category || isSaving}
              className="w-full py-3 font-bold bg-primary hover:bg-primary/80 text-black rounded flex items-center justify-center gap-2 disabled:opacity-30 transition-colors"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Commit to Registry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
