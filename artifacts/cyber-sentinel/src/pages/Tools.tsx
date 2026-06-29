import React, { useState, useEffect } from 'react';
import { Wrench, ExternalLink, ChevronLeft, Loader2, Terminal, Code2, Trash2, Plus, X, Save } from 'lucide-react';

const TOOL_CATEGORIES = ['recon', 'web', 'exploitation', 'post-exploitation', 'passwords', 'active-directory', 'network', 'forensics', 'wireless', 'misc'];

function renderCheatsheet(content: string) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const match = part.match(/```(\w*)\n([\s\S]*?)```/);
      const code = match ? match[2] : part.slice(3, -3);
      return (
        <div key={i} className="relative group my-3 md:my-4">
          <pre className="bg-black text-primary p-3 md:p-4 rounded border border-primary/20 overflow-x-auto font-mono text-xs md:text-sm shadow-inner">
            <code>{code.trim()}</code>
          </pre>
          <button
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 px-2 text-[10px] bg-secondary border border-border rounded"
            onClick={() => navigator.clipboard.writeText(code.trim())}
          >Copy</button>
        </div>
      );
    }
    const formatted = part.split(/(\*\*[\s\S]*?\*\*)/g).map((sub, j) => {
      if (sub.startsWith('**') && sub.endsWith('**')) {
        return <strong key={j} className="text-foreground">{sub.slice(2, -2)}</strong>;
      }
      return sub;
    });
    return <div key={i} className="whitespace-pre-wrap mb-3 text-muted-foreground text-xs md:text-sm leading-relaxed">{formatted}</div>;
  });
}

function ToolDetail({ slug, onBack }: { slug: string; onBack: () => void }) {
  const [tool, setTool] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tools/${slug}`).then(r => r.json()).then(setTool).finally(() => setIsLoading(false));
  }, [slug]);

  if (isLoading || !tool) {
    return (
      <div className="flex-1 flex justify-center items-center font-mono text-primary text-sm">
        <Loader2 className="animate-spin mr-2" size={18} /> Loading module...
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col font-mono">
      <div className="p-4 md:p-6 border-b border-border bg-card/20 shrink-0">
        <button onClick={onBack} className="mb-3 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
          <ChevronLeft size={14} /> Back to registry
        </button>
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
          <div>
            <div className="flex items-center gap-2 md:gap-3 mb-2 flex-wrap">
              <Terminal className="text-primary shrink-0" size={20} />
              <h1 className="text-xl md:text-3xl font-bold">{tool.name}</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-primary/10 text-primary border border-primary/50 rounded">{tool.category}</span>
            </div>
            <p className="text-muted-foreground max-w-2xl text-xs md:text-sm">{tool.description}</p>
          </div>
          {tool.officialUrl && (
            <a href={tool.officialUrl} target="_blank" rel="noreferrer"
              className="self-start px-3 py-1.5 text-xs border border-border hover:border-primary rounded flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors shrink-0">
              <ExternalLink size={12} /> Docs
            </a>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-background/50">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4 flex items-center gap-2 font-semibold pb-2 border-b border-border text-xs md:text-sm">
            <Code2 className="text-primary" size={16} /> Cheatsheet / Syntax
          </div>
          {renderCheatsheet(tool.cheatsheet)}
        </div>
      </div>
    </div>
  );
}

interface AddToolForm {
  name: string;
  category: string;
  description: string;
  cheatsheet: string;
  officialUrl: string;
}

function AddToolModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<AddToolForm>({ name: '', category: '', description: '', cheatsheet: '', officialUrl: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!form.name || !form.category || !form.description || !form.cheatsheet) {
      setError('Name, category, description, and cheatsheet are required.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category,
          description: form.description.trim(),
          cheatsheet: form.cheatsheet.trim(),
          officialUrl: form.officialUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Failed to save tool.');
    }
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-card border border-primary/30 rounded-lg w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h3 className="font-bold text-primary text-sm flex items-center gap-2 font-mono"><Plus size={14} /> ADD_TOOL</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono">
          <div className="grid grid-cols-2 gap-2.5">
            <input
              placeholder="Tool name (e.g. Nikto)"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="col-span-2 px-3 py-2 text-xs bg-black/50 border border-border rounded focus:outline-none focus:border-primary"
            />
            <select
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
              className="px-3 py-2 text-xs bg-black/50 border border-border rounded focus:outline-none focus:border-primary"
            >
              <option value="">Category</option>
              {TOOL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              placeholder="Official URL (optional)"
              value={form.officialUrl}
              onChange={e => setForm({ ...form, officialUrl: e.target.value })}
              className="px-3 py-2 text-xs bg-black/50 border border-border rounded focus:outline-none focus:border-primary"
            />
          </div>
          <textarea
            placeholder="Description — one or two sentences about what this tool does"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2 text-xs bg-black/50 border border-border rounded focus:outline-none focus:border-primary resize-none h-16"
          />
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Cheatsheet (Markdown supported, use ``` for code blocks)</label>
            <textarea
              placeholder={`**Basic scan**\n\`\`\`bash\nnmap -sV -sC TARGET_IP\n\`\`\``}
              value={form.cheatsheet}
              onChange={e => setForm({ ...form, cheatsheet: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-black/50 border border-border rounded focus:outline-none focus:border-primary resize-none h-48 font-mono"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <div className="flex gap-2 p-4 border-t border-border shrink-0 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded hover:bg-secondary transition-colors">Cancel</button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 text-xs font-bold bg-primary text-black rounded hover:bg-primary/80 disabled:opacity-30 flex items-center gap-1.5 transition-colors"
          >
            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Add Tool
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ToolsPage() {
  const [tools, setTools] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchTools = () =>
    fetch('/api/tools').then(r => r.json()).then(data => setTools(Array.isArray(data) ? data : []));

  useEffect(() => { fetchTools().finally(() => setIsLoading(false)); }, []);

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!confirm(`Delete "${name}" from Tool Reference?`)) return;
    await fetch(`/api/tools/${id}`, { method: 'DELETE' });
    await fetchTools();
  };

  if (selectedSlug) return <ToolDetail slug={selectedSlug} onBack={() => setSelectedSlug(null)} />;

  return (
    <div className="flex-1 overflow-hidden flex flex-col font-mono">
      {showAddModal && (
        <AddToolModal
          onClose={() => setShowAddModal(false)}
          onSaved={fetchTools}
        />
      )}
      <div className="p-4 md:p-8 border-b border-border bg-card/20 shrink-0">
        <div className="max-w-6xl mx-auto flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl md:text-3xl font-bold flex items-center gap-2">
              <Wrench className="text-primary" size={22} /> sys.tools
            </h1>
            <p className="text-muted-foreground text-xs md:text-sm">Registry of verified penetration testing tools.</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="h-8 px-3 text-xs border border-primary/50 text-primary hover:bg-primary/20 rounded flex items-center gap-1 transition-colors shrink-0"
          >
            <Plus size={13} /> Add Tool
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <div className="flex justify-center items-center py-16 text-primary text-sm">
              <Loader2 className="animate-spin mr-2" size={18} /> Loading registry...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {tools.map(tool => (
                <div key={tool.id} onClick={() => setSelectedSlug(tool.slug)}
                  className="bg-card border border-border hover:border-primary/50 transition-all cursor-pointer group flex flex-col rounded-lg overflow-hidden p-4 md:p-6 relative">
                  <div className="flex justify-between items-start mb-2">
                    <Terminal className="text-muted-foreground group-hover:text-primary transition-colors" size={18} />
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 border border-border bg-secondary text-muted-foreground rounded uppercase font-bold">{tool.category}</span>
                      <button
                        onClick={e => handleDelete(e, tool.id, tool.name)}
                        title="Delete tool"
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <h2 className="text-base md:text-xl font-bold mt-2 group-hover:text-primary transition-colors">{tool.name}</h2>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{tool.description}</p>
                  <div className="mt-4 pt-3 border-t border-border/50">
                    <span className="text-[10px] text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <Code2 size={10} /> View Cheatsheet →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
