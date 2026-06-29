import React, { useState, useEffect } from 'react';
import { Settings, Database, Bot, Shield, Terminal, Trash2, Info, Keyboard, Activity, CheckCircle, XCircle, Loader2, Layers, Gauge, RefreshCw } from 'lucide-react';

interface HealthStatus {
  database: string;
  ai: string;
  encryption: string;
}

interface MongoStats {
  dataSize: number;
  storageSize: number;
  indexSize: number;
  objects: number;
  collections: number;
  fsTotalSize: number | null;
  fsUsedSize: number | null;
}

interface GroqSnapshot {
  limitRequestsPerMinute: number | null;
  remainingRequestsPerMinute: number | null;
  limitTokensPerMinute: number | null;
  remainingTokensPerMinute: number | null;
  limitRequestsPerDay: number | null;
  remainingRequestsPerDay: number | null;
  capturedAt: number | null;
}

interface UsageData {
  mongo: MongoStats | null;
  groq: GroqSnapshot;
  mongoError?: string;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function ProgressBar({ value, max, label }: { value: number; max: number; label?: string }) {
  const used = max - value;
  const usedPct = max > 0 ? (used / max) * 100 : 0;
  const displayPct = Math.round(usedPct * 10) / 10;
  const barWidth = Math.max(usedPct, usedPct > 0 ? 1.5 : 0);

  const barColor =
    usedPct > 85 ? 'bg-red-400' :
    usedPct > 60 ? 'bg-yellow-400' :
    'bg-primary';

  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex justify-between items-center text-[10px] text-muted-foreground">
          <span>{label}</span>
          <span className={usedPct > 85 ? 'text-red-400 font-bold' : 'text-foreground'}>
            {used.toLocaleString()} used / {max.toLocaleString()} limit
          </span>
        </div>
      )}
      <div className="h-2.5 w-full bg-black/60 border border-border/60 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${barWidth}%`, minWidth: usedPct > 0 ? '4px' : '0' }}
        />
      </div>
      <div className="flex justify-between text-[10px]">
        <span className="text-muted-foreground/60">{value.toLocaleString()} remaining</span>
        <span className={usedPct > 85 ? 'text-red-400 font-bold' : 'text-primary font-mono'}>{displayPct}% used</span>
      </div>
    </div>
  );
}

function BytesBar({ used, total, label }: { used: number; total: number; label: string }) {
  const pct = total > 0 ? (used / total) * 100 : 0;
  const displayPct = pct < 0.1 ? '<0.1' : String(Math.round(pct * 10) / 10);
  const barWidth = Math.max(pct, pct > 0 ? 1.5 : 0);
  const barColor = pct > 85 ? 'bg-red-400' : pct > 60 ? 'bg-yellow-400' : 'bg-primary';

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-[10px] text-muted-foreground">
        <span>{label}</span>
        <span className="text-foreground">{formatBytes(used)} / {formatBytes(total)}</span>
      </div>
      <div className="h-2.5 w-full bg-black/60 border border-border/60 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${barWidth}%`, minWidth: pct > 0 ? '4px' : '0' }}
        />
      </div>
      <div className="flex justify-between text-[10px]">
        <span className="text-muted-foreground/60">{formatBytes(total - used)} free</span>
        <span className={pct > 85 ? 'text-red-400 font-bold' : 'text-primary font-mono'}>{displayPct}% used</span>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [deduping, setDeduping] = useState(false);
  const [dedupResult, setDedupResult] = useState<{ toolsRemoved: number; commandsRemoved: number } | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);

  const fetchUsage = () => {
    setUsageLoading(true);
    fetch('/api/health/usage')
      .then(r => r.json())
      .then(d => { setUsage(d); setUsageLoading(false); })
      .catch(() => setUsageLoading(false));
  };

  const runDeduplicate = async () => {
    setDeduping(true);
    setDedupResult(null);
    try {
      const res = await fetch('/api/analyze/deduplicate', { method: 'POST' });
      const data = await res.json();
      setDedupResult(data);
      setTimeout(() => setDedupResult(null), 6000);
    } catch {}
    setDeduping(false);
  };

  useEffect(() => {
    fetch('/api/health/status')
      .then(r => r.json())
      .then(d => { setHealth(d); setHealthLoading(false); })
      .catch(() => setHealthLoading(false));
    fetchUsage();
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

  const groq = usage?.groq;
  const hasGroqData = groq?.capturedAt !== null && groq?.limitRequestsPerMinute !== null;
  const mongo = usage?.mongo;

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

        {/* Usage & Limits */}
        <section className="bg-card/50 border border-border rounded-lg overflow-hidden">
          <div className="p-3 md:p-4 border-b border-border bg-black/20 font-bold flex items-center justify-between text-xs">
            <span className="flex items-center gap-2"><Gauge size={14} className="text-primary" /> USAGE &amp; LIMITS</span>
            <button
              onClick={fetchUsage}
              disabled={usageLoading}
              className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
              title="Refresh"
            >
              <RefreshCw size={12} className={usageLoading ? 'animate-spin' : ''} />
              <span className="text-[10px]">refresh</span>
            </button>
          </div>

          <div className="p-4 space-y-5">
            {/* MongoDB Storage */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <Database size={12} className="text-primary" /> MongoDB Storage
              </div>
              {usageLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 size={11} className="animate-spin" /> Loading storage stats…
                </div>
              ) : usage?.mongoError ? (
                <p className="text-xs text-red-400">{usage.mongoError}</p>
              ) : mongo ? (
                (() => {
                  const ATLAS_FREE_LIMIT = 512 * 1024 * 1024;
                  const totalUsed = mongo.fsTotalSize && mongo.fsUsedSize
                    ? mongo.fsUsedSize
                    : mongo.dataSize + mongo.indexSize;
                  const total = mongo.fsTotalSize ?? ATLAS_FREE_LIMIT;
                  return (
                    <div className="space-y-4">
                      <BytesBar
                        used={totalUsed}
                        total={total}
                        label={mongo.fsTotalSize ? "Storage used" : "Storage used (vs 512 MB free tier limit)"}
                      />
                      <BytesBar used={mongo.dataSize} total={total} label="Data size" />
                      <BytesBar used={mongo.indexSize} total={total} label="Index size" />
                      <div className="flex justify-between text-[10px] text-muted-foreground/60 border-t border-border/30 pt-2">
                        <span>{mongo.objects.toLocaleString()} documents · {mongo.collections} collections</span>
                        <span>{formatBytes(mongo.storageSize)} on disk</span>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <p className="text-xs text-muted-foreground">No storage data available.</p>
              )}
            </div>

            <div className="border-t border-border/40" />

            {/* Groq Rate Limits */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <Bot size={12} className="text-primary" /> Groq API Rate Limits
              </div>
              {usageLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 size={11} className="animate-spin" /> Loading rate limit data…
                </div>
              ) : !hasGroqData ? (
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Rate limit data not yet captured.</p>
                  <p className="text-[10px]">Send a message in AI Ops to populate live usage stats — Groq returns limits in response headers.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {groq!.limitRequestsPerMinute !== null && groq!.remainingRequestsPerMinute !== null && (
                    <ProgressBar
                      value={groq!.remainingRequestsPerMinute!}
                      max={groq!.limitRequestsPerMinute!}
                      label="Requests / minute"
                    />
                  )}
                  {groq!.limitTokensPerMinute !== null && groq!.remainingTokensPerMinute !== null && (
                    <ProgressBar
                      value={groq!.remainingTokensPerMinute!}
                      max={groq!.limitTokensPerMinute!}
                      label="Tokens / minute"
                    />
                  )}
                  {groq!.limitRequestsPerDay !== null && groq!.remainingRequestsPerDay !== null && (
                    <ProgressBar
                      value={groq!.remainingRequestsPerDay!}
                      max={groq!.limitRequestsPerDay!}
                      label="Requests / day"
                    />
                  )}
                  {groq!.capturedAt && (
                    <p className="text-[10px] text-muted-foreground/50">
                      Last updated: {new Date(groq!.capturedAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              )}
            </div>
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
                <p className="text-xs font-bold text-foreground">Deduplicate Tools &amp; Commands</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Scans for duplicate tool references and saved commands, keeps the richest version, removes the rest.
                </p>
                {dedupResult && (
                  <p className="text-[10px] text-primary mt-1 font-bold">
                    ✓ Removed {dedupResult.toolsRemoved} duplicate tool(s) and {dedupResult.commandsRemoved} duplicate command(s).
                  </p>
                )}
              </div>
              <button
                onClick={runDeduplicate}
                disabled={deduping}
                className="ml-4 px-3 py-1.5 text-xs border border-primary/40 text-primary hover:bg-primary/10 rounded flex items-center gap-1.5 transition-colors disabled:opacity-40 shrink-0"
              >
                {deduping ? <Loader2 size={11} className="animate-spin" /> : <Layers size={11} />}
                {deduping ? 'Running…' : 'Deduplicate'}
              </button>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4">
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
