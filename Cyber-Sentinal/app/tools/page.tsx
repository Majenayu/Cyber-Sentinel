'use client';

import React, { useState, useEffect } from 'react';
import { Wrench, ExternalLink, ChevronLeft, Loader2, Terminal, Copy, Check, Code2 } from 'lucide-react';

function renderCheatsheet(content: string) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const match = part.match(/```(\w*)\n([\s\S]*?)```/);
      const code = match ? match[2] : part.slice(3, -3);
      return (
        <div key={i} className="relative group my-4">
          <pre className="bg-black text-primary p-4 rounded border border-primary/20 overflow-x-auto font-mono text-sm shadow-inner">
            <code>{code.trim()}</code>
          </pre>
          <button
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2 text-xs bg-secondary border border-border rounded"
            onClick={() => navigator.clipboard.writeText(code.trim())}
          >
            Copy
          </button>
        </div>
      );
    }
    const formatted = part.split(/(\*\*[\s\S]*?\*\*)/g).map((sub, j) => {
      if (sub.startsWith('**') && sub.endsWith('**')) {
        return <strong key={j} className="text-foreground">{sub.slice(2, -2)}</strong>;
      }
      return sub;
    });
    return <div key={i} className="whitespace-pre-wrap mb-4 text-muted-foreground text-sm leading-relaxed">{formatted}</div>;
  });
}

function ToolDetail({ slug, onBack }: { slug: string; onBack: () => void }) {
  const [tool, setTool] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tools/${slug}`)
      .then(r => r.json())
      .then(setTool)
      .finally(() => setIsLoading(false));
  }, [slug]);

  if (isLoading || !tool) {
    return (
      <div className="flex-1 flex justify-center items-center font-mono text-primary">
        <Loader2 className="animate-spin mr-2" size={20} /> Loading module...
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col font-mono">
      <div className="p-6 border-b border-border bg-card/20 shrink-0">
        <div className="max-w-4xl mx-auto">
          <button onClick={onBack} className="mb-4 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            <ChevronLeft size={16} /> Back to registry
          </button>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Terminal className="text-primary" size={24} />
                <h1 className="text-3xl font-bold">{tool.name}</h1>
                <span className="px-2 py-0.5 text-xs font-bold uppercase bg-primary/10 text-primary border border-primary/50 rounded">{tool.category}</span>
              </div>
              <p className="text-muted-foreground max-w-2xl text-sm">{tool.description}</p>
            </div>
            {tool.officialUrl && (
              <a href={tool.officialUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 text-sm border border-border hover:border-primary rounded flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <ExternalLink size={14} /> Docs
              </a>
            )}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-8 bg-background/50">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 flex items-center gap-2 font-semibold pb-2 border-b border-border text-sm">
            <Code2 className="text-primary" size={18} /> Cheatsheet / Syntax
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
    fetch('/api/tools')
      .then(r => r.json())
      .then(data => setTools(Array.isArray(data) ? data : []))
      .finally(() => setIsLoading(false));
  }, []);

  if (selectedSlug) return <ToolDetail slug={selectedSlug} onBack={() => setSelectedSlug(null)} />;

  return (
    <div className="flex-1 overflow-hidden flex flex-col font-mono">
      <div className="p-8 border-b border-border bg-card/20 shrink-0">
        <div className="max-w-6xl mx-auto space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wrench className="text-primary" size={28} /> sys.tools
          </h1>
          <p className="text-muted-foreground text-sm">Registry of verified penetration testing tools and payloads.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <div className="flex justify-center items-center py-20 text-primary">
              <Loader2 className="animate-spin mr-2" size={20} /> Querying registry...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tools.map(tool => (
                <div
                  key={tool.id}
                  onClick={() => setSelectedSlug(tool.slug)}
                  className="bg-card border border-border hover:border-primary/50 transition-all cursor-pointer group flex flex-col rounded-lg overflow-hidden p-6"
                >
                  <div className="flex justify-between items-start mb-2">
                    <Terminal className="text-muted-foreground group-hover:text-primary transition-colors" size={20} />
                    <span className="text-[10px] px-2 py-0.5 border border-border bg-secondary text-muted-foreground rounded uppercase font-bold">{tool.category}</span>
                  </div>
                  <h2 className="text-xl font-bold mt-2 group-hover:text-primary transition-colors">{tool.name}</h2>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{tool.description}</p>
                  <div className="mt-auto pt-4 border-t border-border/50 mt-4">
                    <span className="text-xs text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                      <Code2 size={12} /> View Cheatsheet
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
