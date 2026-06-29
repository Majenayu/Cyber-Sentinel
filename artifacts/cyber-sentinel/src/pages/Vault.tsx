import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, FileText, Trash2, Edit, Save, X, ExternalLink, Loader2, ChevronLeft, Tag, Sparkles, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Link, Globe, Download, Upload, Wand2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | boolean | undefined | null)[]) {
  return twMerge(clsx(inputs));
}

function renderContent(content: string) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const match = part.match(/```(\w*)\n?([\s\S]*?)```/);
      const lang = match?.[1] ?? '';
      const code = match?.[2] ?? part.slice(3, -3);
      return (
        <div key={i} className="relative group/code my-3 md:my-4">
          {lang && (
            <div className="flex items-center justify-between bg-black/80 px-3 py-1 rounded-t border border-primary/10 border-b-0">
              <span className="text-[10px] text-primary/60 uppercase font-mono">{lang}</span>
              <button onClick={() => navigator.clipboard.writeText(code.trim())} className="text-[10px] text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover/code:opacity-100">copy</button>
            </div>
          )}
          <pre className={cn("bg-black/80 text-primary p-3 md:p-4 overflow-x-auto font-mono text-xs md:text-sm shadow-inner border border-primary/10", lang ? "rounded-b rounded-tr" : "rounded")}>
            <code>{code.trim()}</code>
          </pre>
        </div>
      );
    }
    return <div key={i} className="whitespace-pre-wrap mb-3 text-xs md:text-sm leading-relaxed">{part}</div>;
  });
}

interface AnalyzeEvent {
  type: string; total?: number; current?: number; title?: string; tags?: string[];
  toolsAdded?: number; commandsAdded?: number; totalTags?: number; totalTools?: number;
  totalCommands?: number; errors?: string[]; message?: string; error?: string; id?: string;
}

interface EntryResult {
  title: string; tags: string[]; toolsAdded: number; commandsAdded: number; error?: string;
}

function AnalyzeModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(0);
  const [currentTitle, setCurrentTitle] = useState('');
  const [results, setResults] = useState<EntryResult[]>([]);
  const [summary, setSummary] = useState<{ tags: number; tools: number; commands: number } | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const start = async () => {
    setRunning(true); setDone(false); setError(null); setResults([]); setSummary(null); setCurrent(0); setTotal(0);
    abortRef.current = new AbortController();
    try {
      const res = await fetch('/api/analyze/knowledge', { method: 'POST', signal: abortRef.current.signal });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event: AnalyzeEvent = JSON.parse(line.slice(6));
            if (event.type === 'start') setTotal(event.total ?? 0);
            else if (event.type === 'progress') { setCurrent(event.current ?? 0); setCurrentTitle(event.title ?? ''); }
            else if (event.type === 'entry_done') setResults(prev => [...prev, { title: event.title!, tags: event.tags ?? [], toolsAdded: event.toolsAdded ?? 0, commandsAdded: event.commandsAdded ?? 0 }]);
            else if (event.type === 'entry_error') setResults(prev => [...prev, { title: event.title!, tags: [], toolsAdded: 0, commandsAdded: 0, error: event.error }]);
            else if (event.type === 'done') { setSummary({ tags: event.totalTags ?? 0, tools: event.totalTools ?? 0, commands: event.totalCommands ?? 0 }); setDone(true); setRunning(false); onDone(); }
            else if (event.type === 'error') { setError(event.message ?? 'Unknown error'); setRunning(false); }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-lg font-mono shadow-2xl shadow-primary/10 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2"><Sparkles size={16} className="text-primary" /><span className="font-bold text-sm text-primary">AI.ANALYZE_VAULT</span></div>
          {!running && <button onClick={onClose} className="text-muted-foreground hover:text-primary transition-colors"><X size={16} /></button>}
        </div>
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {!running && !done && !error && (
            <div className="space-y-3 text-xs text-muted-foreground">
              <p>The AI will scan every entry and automatically:</p>
              <ul className="space-y-1 pl-3 border-l border-primary/30">
                <li className="text-primary/80">→ Add relevant tags to each entry</li>
                <li className="text-primary/80">→ Extract Tool References</li>
                <li className="text-primary/80">→ Extract Saved Commands</li>
              </ul>
            </div>
          )}
          {error && <div className="flex items-start gap-2 text-destructive text-xs p-3 border border-destructive/30 rounded bg-destructive/10"><AlertCircle size={14} className="shrink-0 mt-0.5" /><span>{error}</span></div>}
          {(running || done) && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{running ? `Processing: ${currentTitle || '...'}` : 'Complete'}</span>
                  <span>{current}/{total} — {pct}%</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                </div>
              </div>
              {done && summary && (
                <div className="grid grid-cols-3 gap-2">
                  {[{ label: 'Tags Added', value: summary.tags }, { label: 'Tools Created', value: summary.tools }, { label: 'Commands Saved', value: summary.commands }].map(({ label, value }) => (
                    <div key={label} className="bg-black/40 border border-primary/20 rounded p-3 text-center">
                      <div className="text-xl font-bold text-primary">{value}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>
              )}
              {results.length > 0 && (
                <div>
                  <button onClick={() => setShowDetails(d => !d)} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors">
                    {showDetails ? <ChevronUp size={10} /> : <ChevronDown size={10} />}{showDetails ? 'Hide' : 'Show'} details ({results.length})
                  </button>
                  {showDetails && (
                    <div className="mt-2 space-y-1 max-h-48 overflow-y-auto pr-1">
                      {results.map((r, i) => (
                        <div key={`${r.title}-${i}`} className={cn("flex items-start gap-2 text-[10px] p-2 rounded border", r.error ? "border-destructive/20 bg-destructive/5" : "border-border/50 bg-black/20")}>
                          {r.error ? <AlertCircle size={10} className="text-destructive shrink-0 mt-0.5" /> : <CheckCircle size={10} className="text-primary shrink-0 mt-0.5" />}
                          <div className="min-w-0"><div className="truncate text-foreground/80">{r.title}</div>
                            {r.error ? <div className="text-destructive/70">{r.error}</div> : <div className="text-muted-foreground">{r.tags.length > 0 && `tags: ${r.tags.slice(0, 4).join(', ')}`}{r.toolsAdded > 0 && ` · ${r.toolsAdded} tool(s)`}{r.commandsAdded > 0 && ` · ${r.commandsAdded} cmd(s)`}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-border shrink-0 flex gap-2 justify-end">
          {!running && !done && <><button onClick={onClose} className="px-3 py-1.5 text-xs rounded hover:bg-secondary transition-colors">Cancel</button><button onClick={start} className="px-4 py-1.5 text-xs font-bold bg-primary text-black rounded hover:bg-primary/80 flex items-center gap-1.5 transition-colors"><Sparkles size={12} /> Run Analysis</button></>}
          {running && <button onClick={() => { abortRef.current?.abort(); setRunning(false); }} className="px-3 py-1.5 text-xs border border-destructive/50 text-destructive rounded hover:bg-destructive/10 transition-colors">Stop</button>}
          {done && <button onClick={onClose} className="px-4 py-1.5 text-xs font-bold bg-primary text-black rounded hover:bg-primary/80 transition-colors">Done</button>}
        </div>
      </div>
    </div>
  );
}

interface ScrapeState { loading: boolean; error: string | null; }

function UrlIngestRow({ onScraped }: { onScraped: (data: { title: string; content: string; suggestedTags: string[] }) => void }) {
  const [url, setUrl] = useState('');
  const [state, setState] = useState<ScrapeState>({ loading: false, error: null });

  const scrape = async () => {
    if (!url.trim()) return;
    setState({ loading: true, error: null });
    try {
      const res = await fetch('/api/scrape/url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: url.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Scrape failed');
      onScraped(data);
      setUrl('');
    } catch (err: any) {
      setState({ loading: false, error: err.message });
      return;
    }
    setState({ loading: false, error: null });
  };

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <Globe size={11} className="absolute left-2.5 top-2.5 text-muted-foreground" />
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && scrape()}
            placeholder="Paste URL to auto-scrape content..."
            className="w-full pl-7 pr-3 py-2 text-xs bg-black/50 border border-border rounded focus:outline-none focus:border-primary"
          />
        </div>
        <button
          onClick={scrape}
          disabled={state.loading || !url.trim()}
          className="px-3 py-2 text-xs border border-primary/50 text-primary hover:bg-primary/20 rounded flex items-center gap-1 transition-colors disabled:opacity-40"
        >
          {state.loading ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
          {state.loading ? 'Scraping…' : 'Fetch'}
        </button>
      </div>
      {state.error && <p className="text-[10px] text-destructive">{state.error}</p>}
    </div>
  );
}

export default function VaultPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '', tags: '', sources: [''] });
  const [showList, setShowList] = useState(true);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showAnalyze, setShowAnalyze] = useState(false);
  const [isSimplifying, setIsSimplifying] = useState(false);
  const [simplifyingForm, setSimplifyingForm] = useState(false);

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
      if (searchQuery.length === 0 || searchQuery.length > 2) { fetchEntries(searchQuery || undefined); setActiveTag(null); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const allTags = Array.from(new Set(entries.flatMap(e => e.tags ?? []))).sort();
  const visibleEntries = activeTag ? entries.filter(e => (e.tags ?? []).includes(activeTag)) : entries;
  const selectedEntry = entries.find(e => e.id === selectedId);

  useEffect(() => {
    if (isEditing && selectedEntry) {
      const sources = selectedEntry.sources?.length ? selectedEntry.sources : (selectedEntry.source ? [selectedEntry.source] : ['']);
      setFormData({ title: selectedEntry.title, content: selectedEntry.content, tags: (selectedEntry.tags ?? []).join(', '), sources });
    } else if (isCreating) {
      setFormData({ title: '', content: '', tags: '', sources: [''] });
    }
  }, [isEditing, isCreating]);

  const handleSave = async () => {
    setIsSaving(true);
    const sources = formData.sources.filter(s => s.trim());
    const payload = {
      title: formData.title, content: formData.content,
      source: sources[0] ?? undefined,
      sources: sources.length ? sources : undefined,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
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
    setSelectedId(null); setShowList(true); await fetchEntries();
  };

  const handleSelect = (id: string) => {
    setSelectedId(id); setIsEditing(false); setIsCreating(false);
    if (window.innerWidth < 768) setShowList(false);
  };

  const handleScraped = (data: { title: string; content: string; suggestedTags: string[] }) => {
    const currentSources = formData.sources.filter(s => s.trim());
    setFormData(prev => ({
      ...prev,
      title: prev.title || data.title,
      content: prev.content ? prev.content + '\n\n---\n\n' + data.content : data.content,
      tags: prev.tags
        ? prev.tags
        : data.suggestedTags.join(', '),
    }));
  };

  const addSourceField = () => setFormData(prev => ({ ...prev, sources: [...prev.sources, ''] }));
  const updateSource = (i: number, val: string) => setFormData(prev => {
    const s = [...prev.sources]; s[i] = val; return { ...prev, sources: s };
  });
  const removeSource = (i: number) => setFormData(prev => ({ ...prev, sources: prev.sources.filter((_, idx) => idx !== i) }));

  const handleSimplify = async () => {
    if (!selectedId) return;
    setIsSimplifying(true);
    try {
      const res = await fetch(`/api/knowledge/${selectedId}/simplify`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Simplify failed');
      setEntries(prev => prev.map(e => e.id === selectedId ? { ...e, content: data.content } : e));
    } catch (err: any) {
      alert(`Simplify failed: ${err.message}`);
    }
    setIsSimplifying(false);
  };

  const handleSimplifyPreview = async () => {
    if (!formData.content.trim()) return;
    setSimplifyingForm(true);
    try {
      const res = await fetch('/api/knowledge/simplify-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: formData.title, content: formData.content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Simplify failed');
      setFormData(prev => ({ ...prev, content: data.content }));
    } catch (err: any) {
      alert(`Simplify failed: ${err.message}`);
    }
    setSimplifyingForm(false);
  };

  const exportVault = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `cybersentinel-vault-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  };

  return (
    <div className="flex h-full overflow-hidden font-mono">
      {showAnalyze && <AnalyzeModal onClose={() => setShowAnalyze(false)} onDone={() => fetchEntries()} />}

      {/* List panel */}
      <div className={cn("border-r border-border bg-card/30 flex flex-col shrink-0 transition-all", "md:w-72 md:flex", showList ? "flex flex-col w-full md:w-72 absolute md:static inset-0 z-10 bg-background" : "hidden md:flex")}>
        <div className="p-3 md:p-4 border-b border-border space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2 text-xs md:text-sm"><FileText size={16} className="text-primary" /> Knowledge</h2>
            <div className="flex items-center gap-1.5">
              <button onClick={exportVault} title="Export vault as JSON" className="h-7 px-2 text-xs border border-border text-muted-foreground hover:text-primary hover:border-primary/40 rounded flex items-center gap-1 transition-colors"><Upload size={11} /></button>
              <button onClick={() => setShowAnalyze(true)} title="AI: auto-tag, extract tools & commands" className="h-7 px-2 text-xs border border-primary/40 text-primary hover:bg-primary/20 rounded flex items-center gap-1 transition-colors"><Sparkles size={11} /> AI</button>
              <button onClick={() => { setIsCreating(true); setIsEditing(false); setSelectedId(null); setShowList(false); }} className="h-7 px-2 text-xs border border-primary/50 text-primary hover:bg-primary/20 rounded flex items-center gap-1 transition-colors"><Plus size={12} /> New</button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-8 pr-3 py-2 bg-black/50 border border-border rounded text-xs focus:outline-none focus:border-primary" />
          </div>
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
              {activeTag && <button onClick={() => setActiveTag(null)} className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-primary/20 text-primary border border-primary/40 transition-colors"><X size={8} /> clear</button>}
              {allTags.map(tag => (
                <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)} className={cn('flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border transition-colors', activeTag === tag ? 'bg-primary text-black border-primary font-bold' : 'bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-primary')}>
                  <Tag size={8} />#{tag}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? <div className="p-4 text-center text-xs text-muted-foreground">Loading...</div>
            : visibleEntries.length === 0 ? <div className="p-4 text-center text-xs text-muted-foreground">{activeTag ? `No entries tagged #${activeTag}.` : 'No entries. Create your first record.'}</div>
            : visibleEntries.map(entry => (
              <div key={entry.id} onClick={() => handleSelect(entry.id)} className={cn('p-3 rounded-md cursor-pointer transition-all border', selectedId === entry.id && !isCreating ? 'bg-secondary border-primary/30' : 'border-transparent hover:bg-secondary/50')}>
                <div className="font-medium text-xs truncate">{entry.title}</div>
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {(entry.tags ?? []).slice(0, 4).map((tag: string) => (
                    <span key={tag} className={cn('text-[10px] px-1.5 py-0.5 rounded border', activeTag === tag ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-background border-border text-muted-foreground')}>{tag}</span>
                  ))}
                </div>
              </div>
            ))}
        </div>
        <div className="p-2 border-t border-border text-[10px] text-muted-foreground/50 text-center">{visibleEntries.length} / {entries.length} entries{activeTag && ` · #${activeTag}`}</div>
      </div>

      {/* Detail/edit panel */}
      <div className={cn("flex-1 bg-background/50 overflow-hidden flex flex-col min-w-0", showList ? "hidden md:flex" : "flex")}>
        {(isCreating || isEditing) ? (
          <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button onClick={() => { setIsCreating(false); setIsEditing(false); setShowList(true); }} className="md:hidden p-1 border border-border rounded text-muted-foreground hover:text-primary hover:border-primary/50"><ChevronLeft size={16} /></button>
                <h2 className="text-base md:text-xl text-primary font-bold">{isCreating ? 'CREATE_ENTRY' : 'EDIT_ENTRY'}</h2>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setIsCreating(false); setIsEditing(false); if (window.innerWidth < 768) setShowList(true); }} className="px-3 py-1.5 text-xs rounded hover:bg-secondary transition-colors flex items-center gap-1"><X size={12} /> Cancel</button>
                <button onClick={handleSave} disabled={isSaving || !formData.title || !formData.content} className="px-3 py-1.5 text-xs font-bold bg-primary text-black rounded hover:bg-primary/80 disabled:opacity-30 flex items-center gap-1 transition-colors">{isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save</button>
              </div>
            </div>
            <div className="space-y-3">
              <input placeholder="Title" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2.5 text-sm bg-secondary/50 border border-border rounded focus:outline-none focus:border-primary" />
              <input placeholder="Tags (comma separated)" value={formData.tags} onChange={e => setFormData({ ...formData, tags: e.target.value })} className="w-full px-3 py-2 text-xs bg-secondary/50 border border-border rounded focus:outline-none focus:border-primary" />

              {/* Multi-URL sources */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Link size={9} /> Source URLs</label>
                  <button onClick={addSourceField} className="text-[10px] text-primary hover:underline">+ Add URL</button>
                </div>
                {formData.sources.map((src, i) => (
                  <div key={i} className="flex gap-1.5">
                    <input value={src} onChange={e => updateSource(i, e.target.value)} placeholder={`https://...`} className="flex-1 px-3 py-2 text-xs bg-secondary/50 border border-border rounded focus:outline-none focus:border-primary" />
                    {formData.sources.length > 1 && <button onClick={() => removeSource(i)} className="p-2 text-muted-foreground hover:text-destructive transition-colors"><X size={11} /></button>}
                  </div>
                ))}
                {/* URL auto-scrape */}
                <UrlIngestRow onScraped={handleScraped} />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Content</label>
                  <button
                    type="button"
                    onClick={handleSimplifyPreview}
                    disabled={simplifyingForm || !formData.content.trim()}
                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] border border-primary/40 text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-40"
                  >
                    {simplifyingForm ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />}
                    {simplifyingForm ? 'Simplifying…' : 'AI Simplify'}
                  </button>
                </div>
                <textarea
                  placeholder="Paste content, writeups, notes, commands — markdown supported..."
                  value={formData.content}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                  className="w-full resize-none border border-border text-xs p-3 bg-black/30 focus:outline-none focus:border-primary rounded font-mono min-h-[300px]"
                />
              </div>
            </div>
          </div>
        ) : selectedEntry ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="border-b border-border p-4 md:p-6 bg-card/20 shrink-0">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <button onClick={() => setShowList(true)} className="md:hidden p-1 border border-border rounded text-muted-foreground hover:text-primary shrink-0"><ChevronLeft size={14} /></button>
                    <h1 className="text-lg md:text-2xl font-bold break-words">{selectedEntry.title}</h1>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(selectedEntry.tags ?? []).map((tag: string) => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded border bg-primary/10 border-primary/30 text-primary">{tag}</span>
                    ))}
                  </div>
                  {/* Multiple source URLs */}
                  {(() => {
                    const srcs: string[] = selectedEntry.sources?.length ? selectedEntry.sources : (selectedEntry.source ? [selectedEntry.source] : []);
                    return srcs.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {srcs.map((s: string, i: number) => (
                          <a key={i} href={s} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-primary/70 hover:text-primary transition-colors">
                            <ExternalLink size={10} /> {new URL(s).hostname}
                          </a>
                        ))}
                      </div>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleSimplify}
                    disabled={isSimplifying}
                    title="AI: clean & simplify content into readable language"
                    className="h-8 px-2.5 text-xs border border-primary/40 text-primary hover:bg-primary/10 rounded flex items-center gap-1.5 transition-colors disabled:opacity-40"
                  >
                    {isSimplifying ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                    {isSimplifying ? 'Simplifying…' : 'Simplify'}
                  </button>
                  <button onClick={() => setIsEditing(true)} className="p-2 border border-border rounded text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"><Edit size={14} /></button>
                  <button onClick={() => handleDelete(selectedEntry.id)} className="p-2 border border-border rounded text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
              <div className="max-w-4xl mx-auto">{renderContent(selectedEntry.content)}</div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground opacity-30">
            <FileText size={40} className="mb-3" />
            <p className="text-sm">Select an entry or create a new one</p>
          </div>
        )}
      </div>
    </div>
  );
}
