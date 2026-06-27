'use client';

import React, { useState, useEffect } from 'react';
import { Search, Plus, FileText, Trash2, Edit, Save, X, ExternalLink, Loader2 } from 'lucide-react';

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

function renderContent(content: string) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const match = part.match(/```(\w*)\n([\s\S]*?)```/);
      const code = match ? match[2] : part.slice(3, -3);
      return (
        <pre key={i} className="bg-black/80 text-primary p-4 rounded border border-border overflow-x-auto my-4 font-mono text-sm shadow-inner">
          <code>{code.trim()}</code>
        </pre>
      );
    }
    return <div key={i} className="whitespace-pre-wrap mb-4">{part}</div>;
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
    const payload = { title: formData.title, content: formData.content, source: formData.source || undefined, tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [] };
    try {
      if (isCreating) {
        const res = await fetch('/api/knowledge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const newEntry = await res.json();
        setIsCreating(false);
        await fetchEntries();
        setSelectedId(newEntry.id);
      } else if (isEditing && selectedId) {
        await fetch(`/api/knowledge/${selectedId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        setIsEditing(false);
        await fetchEntries();
      }
    } catch {}
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this knowledge entry?')) return;
    await fetch(`/api/knowledge/${id}`, { method: 'DELETE' });
    setSelectedId(null);
    await fetchEntries();
  };

  return (
    <div className="flex h-full overflow-hidden font-mono">
      {/* Sidebar */}
      <div className="w-80 border-r border-border bg-card/30 flex flex-col shrink-0">
        <div className="p-4 border-b border-border space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2 text-sm"><FileText size={18} className="text-primary" /> Knowledge</h2>
            <button onClick={() => { setIsCreating(true); setIsEditing(false); setSelectedId(null); }} className="h-8 px-3 text-xs border border-primary/50 text-primary hover:bg-primary/20 rounded flex items-center gap-1 transition-colors">
              <Plus size={14} /> New
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input placeholder="Search database..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-black/50 border border-border rounded text-sm focus:outline-none focus:border-primary" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? <div className="p-4 text-center text-sm text-muted-foreground">Querying database...</div>
            : entries.length === 0 ? <div className="p-4 text-center text-sm text-muted-foreground">No records found.</div>
            : entries.map(entry => (
              <div key={entry.id} onClick={() => { setSelectedId(entry.id); setIsEditing(false); setIsCreating(false); }}
                className={cn('p-3 rounded-md cursor-pointer transition-all border', selectedId === entry.id && !isCreating ? 'bg-secondary border-primary/30' : 'border-transparent hover:bg-secondary/50')}>
                <div className="font-medium text-sm truncate">{entry.title}</div>
                <div className="flex gap-1 mt-2 overflow-hidden">
                  {(entry.tags ?? []).slice(0, 3).map((tag: string) => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-background border border-border rounded text-muted-foreground">{tag}</span>
                  ))}
                </div>
              </div>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 bg-background/50 overflow-hidden flex flex-col">
        {(isCreating || isEditing) ? (
          <div className="flex-1 flex flex-col p-6 max-w-4xl mx-auto w-full overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl text-primary font-bold">{isCreating ? 'CREATE_ENTRY' : 'EDIT_ENTRY'}</h2>
              <div className="flex gap-2">
                <button onClick={() => { setIsCreating(false); setIsEditing(false); }} className="px-4 py-2 text-sm rounded hover:bg-secondary transition-colors">
                  <X size={14} className="inline mr-1" /> Cancel
                </button>
                <button onClick={handleSave} disabled={isSaving || !formData.title || !formData.content} className="px-4 py-2 text-sm font-bold bg-primary text-black rounded hover:bg-primary/80 transition-colors disabled:opacity-30 flex items-center gap-2">
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Record
                </button>
              </div>
            </div>
            <div className="space-y-4 flex-1 flex flex-col min-h-0">
              <input placeholder="Record Title" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-3 text-lg bg-secondary/50 border border-border rounded focus:outline-none focus:border-primary" />
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Tags (comma separated)" value={formData.tags} onChange={e => setFormData({ ...formData, tags: e.target.value })} className="w-full px-3 py-2 text-sm bg-secondary/50 border border-border rounded focus:outline-none focus:border-primary" />
                <input placeholder="Source URL (optional)" value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })} className="w-full px-3 py-2 text-sm bg-secondary/50 border border-border rounded focus:outline-none focus:border-primary" />
              </div>
              <div className="flex-1 border border-border rounded overflow-hidden focus-within:border-primary transition-colors min-h-[200px]">
                <textarea placeholder="Markdown content goes here..." value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} className="w-full h-full resize-none border-0 text-sm p-4 bg-black/30 focus:outline-none font-mono" />
              </div>
            </div>
          </div>
        ) : selectedEntry ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b border-border p-6 bg-card/20">
              <div className="max-w-4xl mx-auto flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold mb-2">{selectedEntry.title}</h1>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(selectedEntry.tags ?? []).map((tag: string) => (
                      <span key={tag} className="px-2 py-1 bg-secondary text-xs font-mono rounded border border-border">#{tag}</span>
                    ))}
                  </div>
                  {selectedEntry.source && (
                    <a href={selectedEntry.source} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                      <ExternalLink size={12} /> Source Reference
                    </a>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setIsEditing(true)} className="px-3 py-1.5 text-xs border border-border hover:border-primary rounded flex items-center gap-1 transition-colors">
                    <Edit size={12} /> Edit
                  </button>
                  <button onClick={() => handleDelete(selectedEntry.id)} className="px-3 py-1.5 text-xs border border-border text-destructive hover:bg-destructive/20 hover:border-destructive rounded flex items-center gap-1 transition-colors">
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto prose prose-invert prose-p:text-foreground/80 prose-headings:text-foreground max-w-none text-sm leading-relaxed">
                {renderContent(selectedEntry.content)}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-3 opacity-40">
            <FileText size={48} />
            <p className="text-sm">Select a record to view details.</p>
          </div>
        )}
      </div>
    </div>
  );
}
