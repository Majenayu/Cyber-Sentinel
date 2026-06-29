import React, { useState, useEffect } from 'react';
import { FileCode, Search, Plus, Trash2, Edit, Save, X, Copy, Terminal, Check, Loader2, Code2, ChevronLeft } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | boolean | undefined | null)[]) {
  return twMerge(clsx(inputs));
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
  const [showSidebar, setShowSidebar] = useState(false);

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
    if (!confirm('Delete this command?')) return;
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
      {/* Category sidebar overlay on mobile */}
      {showSidebar && (
        <div className="fixed inset-0 bg-black/60 z-20 md:hidden" onClick={() => setShowSidebar(false)} />
      )}

      {/* Category sidebar */}
      <div className={cn(
        "border-r border-border bg-card/30 flex flex-col shrink-0 z-30 transition-transform duration-300",
        "md:w-52 md:static md:translate-x-0",
        showSidebar ? "fixed inset-y-0 left-0 w-56 translate-x-0" : "hidden md:flex"
      )}>
        <div className="p-3 md:p-4 border-b border-border">
          <h2 className="font-semibold flex items-center gap-2 text-xs md:text-sm">
            <Code2 size={16} className="text-primary" /> Categories
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <button onClick={() => { setCategoryFilter(null); setShowSidebar(false); }}
            className={cn("w-full text-left px-3 py-2 rounded text-xs transition-colors", !categoryFilter ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
            All Categories
          </button>
          {categories.map(cat => (
            <button key={cat} onClick={() => { setCategoryFilter(cat); setShowSidebar(false); }}
              className={cn("w-full text-left px-3 py-2 rounded text-xs transition-colors capitalize", categoryFilter === cat ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="p-3 md:p-4 border-b border-border bg-card/20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => setShowSidebar(true)} className="md:hidden p-1.5 border border-border rounded text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors shrink-0">
              <Code2 size={14} />
            </button>
            <div className="relative flex-1 md:flex-none md:w-48">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <input placeholder="Search commands..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-black/50 border border-border rounded text-xs focus:outline-none focus:border-primary" />
            </div>
          </div>
          <button onClick={() => { resetForm(); setIsFormOpen(true); }}
            className="h-8 px-3 text-xs border border-primary/50 text-primary hover:bg-primary/20 rounded flex items-center gap-1 transition-colors shrink-0">
            <Plus size={13} /> New
          </button>
        </div>

        {isFormOpen && (
          <div className="p-3 md:p-4 border-b border-border bg-black/30 space-y-2.5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <input placeholder="Title" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="px-3 py-2 text-xs bg-secondary/50 border border-border rounded focus:outline-none focus:border-primary" />
              <input placeholder="Category" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="px-3 py-2 text-xs bg-secondary/50 border border-border rounded focus:outline-none focus:border-primary" />
            </div>
            <textarea placeholder="Command" value={formData.command} onChange={e => setFormData({ ...formData, command: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-black/50 border border-border rounded focus:outline-none focus:border-primary font-mono h-16 resize-none" />
            <input placeholder="Description (optional)" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-secondary/50 border border-border rounded focus:outline-none focus:border-primary" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setIsFormOpen(false); resetForm(); }} className="px-3 py-1.5 text-xs rounded hover:bg-secondary transition-colors flex items-center gap-1">
                <X size={12} /> Cancel
              </button>
              <button onClick={handleSave} disabled={isSaving || !formData.title || !formData.command}
                className="px-3 py-1.5 text-xs font-bold bg-primary text-black rounded hover:bg-primary/80 disabled:opacity-30 flex items-center gap-1 transition-colors">
                {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2.5">
          {isLoading ? (
            <div className="text-center py-16 text-primary text-xs"><Loader2 className="animate-spin inline mr-2" size={16} />Loading...</div>
          ) : filteredCommands.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-xs">No commands found. Save your first command.</div>
          ) : (
            filteredCommands.map(cmd => (
              <div key={cmd.id} className="bg-card/50 border border-border rounded-lg p-3 md:p-4 group hover:border-primary/30 transition-all">
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <Terminal size={13} className="text-primary shrink-0" />
                    <span className="font-bold text-xs">{cmd.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-secondary border border-border rounded text-muted-foreground uppercase shrink-0">{cmd.category}</span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => handleCopy(cmd.id, cmd.command)} className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors">
                      {copiedId === cmd.id ? <Check size={13} className="text-primary" /> : <Copy size={13} />}
                    </button>
                    <button onClick={() => handleEdit(cmd)} className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground transition-colors">
                      <Edit size={13} />
                    </button>
                    <button onClick={() => handleDelete(cmd.id)} className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <pre className="bg-black/60 text-primary p-2.5 md:p-3 rounded border border-primary/10 text-xs overflow-x-auto font-mono">{cmd.command}</pre>
                {cmd.description && <p className="text-[11px] text-muted-foreground mt-2">{cmd.description}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
