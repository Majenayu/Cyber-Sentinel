import React, { useState, useEffect } from 'react';
import { Settings, Database, Bot, Shield, Terminal, Trash2, Info, Keyboard, Activity, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface HealthStatus {
  database: string;
  ai: string;
  encryption: string;
}

export default function SettingsPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    fetch('/api/health/status')
      .then(r => r.json())
      .then(d => { setHealth(d); setHealthLoading(false); })
      .catch(() => setHealthLoading(false));
  }, []);

  const clearSessions = async () => {
    if (!confirm('Delete ALL chat sessions? This cannot be undone.')) return;
    setClearing(true);
    try {
      const res = await fetch('/api/chat/sessions');
      const sessions = await res.json();
      await Promise.all(sessions.map((s: any) => fetch(`/api/chat/sessions/${s.id}`, { method: 'DELETE' })));
      setCleared(true);
      setTimeout(() => setCleared(false), 3000);
    } catch {}
    setClearing(false);
  };

  const StatusDot = ({ value }: { value: string }) => {
    if (healthLoading) return <Loader2 size={12} className="animate-spin text-muted-foreground" />;
    const ok = value === 'ONLINE' || value === 'AES-256 ACTIVE';
    return (
      <span className={`flex items-center gap-1.5 font-bold text-xs ${ok ? 'text-primary' : 'text-red-400'}`}>
        {ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
        {value}
      </span>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 font-mono">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Settings className="text-primary" size={24} />
            sys.settings
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm">Configuration and system diagnostics.</p>
        </header>

        {/* System Status */}
        <section className="bg-card/50 border border-border rounded-lg overflow-hidden">
          <div className="p-3 md:p-4 border-b border-border bg-black/20 font-bold flex items-center gap-2 text-xs">
            <Activity size={14} className="text-primary" /> SYSTEM STATUS
          </div>
          <div className="p-4 space-y-3">
            {[
              ['Core Database (MongoDB)', health?.database ?? '...'],
              ['AI Module (Groq)', health?.ai ?? '...'],
              ['Encryption', health?.encryption ?? '...'],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between items-center border-b border-border pb-3 last:border-0 last:pb-0 text-xs">
                <span className="text-muted-foreground">{label}</span>
                <StatusDot value={val} />
              </div>
            ))}
          </div>
        </section>

        {/* About */}
        <section className="bg-card/50 border border-border rounded-lg overflow-hidden">
          <div className="p-3 md:p-4 border-b border-border bg-black/20 font-bold flex items-center gap-2 text-xs">
            <Info size={14} className="text-primary" /> ABOUT
          </div>
          <div className="p-4 space-y-3 text-xs">
            {[
              ['Application', 'CyberSentinel v2.0'],
              ['AI Model', 'Groq · LLaMA-3.3-70B-Versatile'],
              ['Mode', 'Streaming SSE · Knowledge-Augmented'],
              ['Frontend', 'React + Vite + TailwindCSS'],
              ['Backend', 'Express 5 + MongoDB + Mongoose'],
              ['Purpose', 'Personal pentesting operations hub'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center border-b border-border pb-3 last:border-0 last:pb-0">
                <span className="text-muted-foreground">{k}</span>
                <span className="text-foreground font-mono">{v}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Keyboard Shortcuts */}
        <section className="bg-card/50 border border-border rounded-lg overflow-hidden">
          <div className="p-3 md:p-4 border-b border-border bg-black/20 font-bold flex items-center gap-2 text-xs">
            <Keyboard size={14} className="text-primary" /> KEYBOARD SHORTCUTS
          </div>
          <div className="p-4 space-y-3 text-xs">
            {[
              ['Enter', 'Send message in AI Ops chat'],
              ['Click code block "copy"', 'Copy command to clipboard'],
              ['Hover message', 'Reveal Save-to-Vault button'],
              ['Trash icon', 'Delete session / entry'],
            ].map(([key, action]) => (
              <div key={key} className="flex justify-between items-center border-b border-border pb-3 last:border-0 last:pb-0">
                <kbd className="px-2 py-0.5 bg-black/60 border border-border rounded text-primary">{key}</kbd>
                <span className="text-muted-foreground text-right ml-4">{action}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Data Management */}
        <section className="bg-card/50 border border-border rounded-lg overflow-hidden">
          <div className="p-3 md:p-4 border-b border-border bg-black/20 font-bold flex items-center gap-2 text-xs">
            <Database size={14} className="text-primary" /> DATA MANAGEMENT
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground">Clear All Chat Sessions</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Permanently deletes all AI Ops chat logs. Knowledge Vault is unaffected.</p>
              </div>
              <button
                onClick={clearSessions}
                disabled={clearing}
                className="ml-4 px-3 py-1.5 text-xs border border-red-400/40 text-red-400 hover:bg-red-400/10 rounded flex items-center gap-1.5 transition-colors disabled:opacity-40 shrink-0"
              >
                {clearing ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                {cleared ? 'Cleared!' : 'Clear Sessions'}
              </button>
            </div>
          </div>
        </section>

        <p className="text-[10px] text-muted-foreground/30 text-center pb-4">
          CYBER_SENTINEL_V2.0 // BY DEEPMIND // PERSONAL USE ONLY
        </p>
      </div>
    </div>
  );
}
