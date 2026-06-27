import React, { useState, useEffect } from 'react';
import { Wrench, ExternalLink, ChevronLeft, Loader2, Terminal, Code2 } from 'lucide-react';

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

export default function ToolsPage() {
  const [tools, setTools] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/tools').then(r => r.json()).then(data => setTools(Array.isArray(data) ? data : [])).finally(() => setIsLoading(false));
  }, []);

  if (selectedSlug) return <ToolDetail slug={selectedSlug} onBack={() => setSelectedSlug(null)} />;

  return (
    <div className="flex-1 overflow-hidden flex flex-col font-mono">
      <div className="p-4 md:p-8 border-b border-border bg-card/20 shrink-0">
        <div className="max-w-6xl mx-auto space-y-1">
          <h1 className="text-xl md:text-3xl font-bold flex items-center gap-2">
            <Wrench className="text-primary" size={22} /> sys.tools
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm">Registry of verified penetration testing tools.</p>
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
                  className="bg-card border border-border hover:border-primary/50 transition-all cursor-pointer group flex flex-col rounded-lg overflow-hidden p-4 md:p-6">
                  <div className="flex justify-between items-start mb-2">
                    <Terminal className="text-muted-foreground group-hover:text-primary transition-colors" size={18} />
                    <span className="text-[10px] px-2 py-0.5 border border-border bg-secondary text-muted-foreground rounded uppercase font-bold">{tool.category}</span>
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
