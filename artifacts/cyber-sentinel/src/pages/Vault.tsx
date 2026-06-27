import React, { useState, useEffect } from 'react';
import { Search, Plus, FileText, Trash2, Edit, Save, X, ExternalLink, Loader2, ChevronLeft } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | boolean | undefined | null)[]) {
  return twMerge(clsx(inputs));
}

function renderContent(content: string) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const match = part.match(/```(\w*)\n([\s\S]*?)```/);
      const code = match ? match[2] : part.slice(3, -3);
      return (
        <pre key={i} className="bg-black/80 text-primary p-3 md:p-4 rounded border border-border overflow-x-auto my-3 md:my-4 font-mono text-xs md:text-sm shadow-inner">
          <code>{code.trim()}</code>
        </pre>
      );
    }
    return <div key={i} className="whitespace-pre-wrap mb-3 text-xs md:text-sm">{part}</div>;
  });
}

export default function VaultPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '', source: '', tags: '' });
  const [showList, setShowList] = useState(true);

  const fetchEntries = async (q?: string) => {
    const url = q ? `/api/knowledge?q=${encodeURIComponent(q)}` : '/api/knowledge';
    try {
      const res = await fetch(url);
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch {}
  };

  useEffect(() => { fetchEntries().finally(() => setIsLoading(false)); }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length === 0 || searchQuery.length > 2) fetchEntries(searchQuery || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectedEntry = entries.find(e => e.id === selectedId);

  useEffect(() => {
    if (isEditing && selectedEntry) {
      setFormData({ title: selectedEntry.title, content: selectedEntry.content, source: selectedEntry.source || '', tags: (selectedEntry.tags ?? []).join(', ') });
    } else if (isCreating) {
      setFormData({ title: '', content: '', source: '', tags: '' });
    }
  }, [isEditing, isCreating]);

  const handleSave = async () => {
    setIsSaving(true);
    const payload = {
      title: formData.title, content: formData.content,
      source: formData.source || undefined,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : []
    };
    try {
      if (isCreating) {
        const res = await fetch('/api/knowledge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const newEntry = await res.json();
        setIsCreating(false);
        await fetchEntries();
        setSelectedId(newEntry.id);
        setShowList(false);
      } else if (isEditing && selectedId) {
        await fetch(`/api/knowledge/${selectedId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        setIsEditing(false);
        await fetchEntries();
      }
    } catch {}
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    await fetch(`/api/knowledge/${id}`, { method: 'DELETE' });
    setSelectedId(null);
    setShowList(true);
    await fetchEntries();
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setIsEditing(false);
    setIsCreating(false);
    if (window.innerWidth < 768) setShowList(false);
  };

  return (
    <div className="flex h-full overflow-hidden font-mono">
      {/* List panel */}
      <div className={cn(
        "border-r border-border bg-card/30 flex flex-col shrink-0 transition-all",
        "md:w-72 md:flex",
        showList ? "flex flex-col w-full md:w-72 absolute md:static inset-0 z-10 bg-background" : "hidden md:flex"
      )}>
        <div className="p-3 md:p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2 text-xs md:text-sm"><FileText size={16} className="text-primary" /> Knowledge</h2>
            <button onClick={() => { setIsCreating(true); setIsEditing(false); setSelectedId(null); setShowList(false); }}
              className="h-7 px-2 text-xs border border-primary/50 text-primary hover:bg-primary/20 rounded flex items-center gap-1 transition-colors">
              <Plus size={12} /> New
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-black/50 border border-border rounded text-xs focus:outline-none focus:border-primary" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? <div className="p-4 text-center text-xs text-muted-foreground">Loading...</div>
            : entries.length === 0 ? <div className="p-4 text-center text-xs text-muted-foreground">No entries. Create your first record.</div>
            : entries.map(entry => (
              <div key={entry.id} onClick={() => handleSelect(entry.id)}
                className={cn('p-3 rounded-md cursor-pointer transition-all border', selectedId === entry.id && !isCreating ? 'bg-secondary border-primary/30' : 'border-transparent hover:bg-secondary/50')}>
                <div className="font-medium text-xs truncate">{entry.title}</div>
                <div className="flex gap-1 mt-1.5 overflow-hidden">
                  {(entry.tags ?? []).slice(0, 3).map((tag: string) => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-background border border-border rounded text-muted-foreground">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Detail/edit panel */}
      <div className={cn(
        "flex-1 bg-background/50 overflow-hidden flex flex-col min-w-0",
        showList ? "hidden md:flex" : "flex"
      )}>
        {(isCreating || isEditing) ? (
          <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button onClick={() => { setIsCreating(false); setIsEditing(false); setShowList(true); }} className="md:hidden p-1 border border-border rounded text-muted-foreground hover:text-primary hover:border-primary/50">
                  <ChevronLeft size={16} />
                </button>
                <h2 className="text-base md:text-xl text-primary font-bold">{isCreating ? 'CREATE_ENTRY' : 'EDIT_ENTRY'}</h2>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setIsCreating(false); setIsEditing(false); if (window.innerWidth < 768) setShowList(true); }}
                  className="px-3 py-1.5 text-xs rounded hover:bg-secondary transition-colors flex items-center gap-1">
                  <X size={12} /> Cancel
                </button>
                <button onClick={handleSave} disabled={isSaving || !formData.title || !formData.content}
                  className="px-3 py-1.5 text-xs font-bold bg-primary text-black rounded hover:bg-primary/80 disabled:opacity-30 flex items-center gap-1 transition-colors">
                  {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
                </button>
              </div>
            </div>
            <div className="space-y-3 flex-1 flex flex-col min-h-0">
              <input placeholder="Title" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2.5 text-sm bg-secondary/50 border border-border rounded focus:outline-none focus:border-primary" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input placeholder="Tags (comma separated)" value={formData.tags} onChange={e => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-secondary/50 border border-border rounded focus:outline-none focus:border-primary" />
                <input placeholder="Source URL (optional)" value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-secondary/50 border border-border rounded focus:outline-none focus:border-primary" />
              </div>
              <textarea placeholder="Content (markdown supported)..." value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })}
                className="flex-1 w-full resize-none border border-border text-xs p-3 bg-black/30 focus:outline-none focus:border-primary rounded font-mono min-h-[200px] md:min-h-0" />
            </div>
          </div>
        ) : selectedEntry ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b border-border p-4 md:p-6 bg-card/20 shrink-0">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <button onClick={() => setShowList(true)} className="md:hidden p-1 border border-border rounded text-muted-foreground hover:text-primary shrink-0">
                      <ChevronLeft size={14} />
                    </button>
                    <h1 className="text-lg md:text-2xl font-bold truncate">{selectedEntry.title}</h1>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(selectedEntry.tags ?? []).map((tag: string) => (
                      <span key={tag} className="px-2 py-0.5 bg-secondary text-[10px] font-mono rounded border border-border">#{tag}</span>
                    ))}
                  </div>
                  {selectedEntry.source && (
                    <a href={selectedEntry.source} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                      <ExternalLink size={10} /> Source
                    </a>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setIsEditing(true)} className="px-2 py-1.5 text-xs border border-border hover:border-primary rounded flex items-center gap-1 transition-colors">
                    <Edit size={11} /> Edit
                  </button>
                  <button onClick={() => handleDelete(selectedEntry.id)} className="px-2 py-1.5 text-xs border border-border text-destructive hover:bg-destructive/20 rounded flex items-center gap-1 transition-colors">
                    <Trash2 size={11} /> Del
                  </button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="max-w-4xl mx-auto">{renderContent(selectedEntry.content)}</div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-3 opacity-40">
            <FileText size={40} />
            <p className="text-xs">Select an entry or create a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
