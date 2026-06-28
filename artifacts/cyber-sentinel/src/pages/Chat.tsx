import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bot, User, Send, Plus, Trash2, MessageSquare, Terminal,
  Loader2, ChevronRight, ShieldAlert, ChevronLeft, BookmarkPlus, X, Save,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | boolean | undefined | null)[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

interface Session {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface SaveModal {
  content: string;
  title: string;
  tags: string;
}

/** Renders markdown-ish content: code blocks + bold */
function MessageContent({ content, streaming }: { content: string; streaming?: boolean }) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return (
    <div className="space-y-2">
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const match = part.match(/```(\w*)\n?([\s\S]*?)```/);
          const lang = match?.[1] ?? '';
          const code = match?.[2] ?? part.slice(3, -3);
          return (
            <div key={i} className="relative group/code">
              {lang && (
                <div className="flex items-center justify-between bg-black/80 px-3 py-1 rounded-t border border-primary/10 border-b-0">
                  <span className="text-[10px] text-primary/60 uppercase font-mono">{lang}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(code.trim())}
                    className="text-[10px] text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover/code:opacity-100"
                  >
                    copy
                  </button>
                </div>
              )}
              <pre className={cn(
                "bg-black/80 text-primary p-3 overflow-x-auto font-mono text-xs leading-relaxed border border-primary/10",
                lang ? "rounded-b rounded-tr" : "rounded"
              )}>
                <code>{code.trim()}</code>
              </pre>
            </div>
          );
        }
        const segments = part.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i} className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap break-words">
            {segments.map((seg, j) =>
              seg.startsWith('**') && seg.endsWith('**')
                ? <strong key={j} className="text-foreground font-semibold">{seg.slice(2, -2)}</strong>
                : seg
            )}
          </p>
        );
      })}
      {streaming && (
        <span className="inline-block w-1.5 h-3.5 bg-primary animate-pulse rounded-sm align-middle ml-0.5" />
      )}
    </div>
  );
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionsLoading, setIsSessionsLoading] = useState(true);
  const [showSessionList, setShowSessionList] = useState(true);
  const [saveModal, setSaveModal] = useState<SaveModal | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { fetchSessions(); }, []);

  useEffect(() => {
    if (currentSessionId) {
      fetchMessages(currentSessionId);
      if (window.innerWidth < 768) setShowSessionList(false);
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/chat/sessions');
      const data = await res.json();
      const list: Session[] = Array.isArray(data) ? data : [];
      setSessions(list);
      if (list.length > 0 && !currentSessionId) setCurrentSessionId(list[0].id);
    } finally {
      setIsSessionsLoading(false);
    }
  };

  const fetchMessages = async (sid: string) => {
    try {
      const res = await fetch(`/api/chat/sessions/${sid}/messages`);
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch {}
  };

  const createSession = async () => {
    try {
      const now = new Date();
      const label = `Op_${now.toLocaleDateString('en-GB').replace(/\//g, '.')}_${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: label }),
      });
      const s: Session = await res.json();
      setSessions(prev => [s, ...prev]);
      setCurrentSessionId(s.id);
    } catch (e) { console.error(e); }
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this session?')) return;
    await fetch(`/api/chat/sessions/${id}`, { method: 'DELETE' });
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    if (currentSessionId === id) {
      setCurrentSessionId(updated.length > 0 ? updated[0].id : null);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !currentSessionId || isLoading) return;

    const userMsgId = `user-${Date.now()}`;
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: text }]);
    setInput('');
    setIsLoading(true);

    const streamingId = `streaming-${Date.now()}`;
    setMessages(prev => [...prev, { id: streamingId, role: 'assistant', content: '', streaming: true }]);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const response = await fetch(`/api/chat/sessions/${currentSessionId}/messages/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
        signal: abort.signal,
      });

      if (!response.ok || !response.body) throw new Error('Stream request failed');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (payload === '[DONE]') continue;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.text) {
              setMessages(prev => prev.map(m =>
                m.id === streamingId
                  ? { ...m, content: m.content + parsed.text, streaming: true }
                  : m
              ));
              scrollToBottom();
            }
          } catch {}
        }
      }

      setMessages(prev => prev.map(m =>
        m.id === streamingId ? { ...m, streaming: false } : m
      ));
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages(prev => prev.map(m =>
          m.id === streamingId
            ? { ...m, content: 'System Error: Connection to AI node lost. Please retry.', streaming: false }
            : m
        ));
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const stopStreaming = () => {
    abortRef.current?.abort();
    setMessages(prev => prev.map(m => m.streaming ? { ...m, streaming: false } : m));
    setIsLoading(false);
  };

  const openSaveModal = (content: string) => {
    const firstLine = content.split('\n')[0].replace(/^#+\s*/, '').slice(0, 80);
    setSaveModal({ content, title: firstLine || 'Sentinel Response', tags: '' });
  };

  const handleSaveToVault = async () => {
    if (!saveModal) return;
    setIsSaving(true);
    try {
      await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: saveModal.title,
          content: saveModal.content,
          tags: saveModal.tags ? saveModal.tags.split(',').map(t => t.trim()).filter(Boolean) : ['ai-ops'],
        }),
      });
      setSaveModal(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {}
    setIsSaving(false);
  };

  const selectedSession = sessions.find(s => s.id === currentSessionId);

  return (
    <div className="flex h-full overflow-hidden font-mono text-sm">

      {/* Save to Vault Modal */}
      {saveModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-card border border-primary/30 rounded-lg w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-primary text-sm flex items-center gap-2">
                <BookmarkPlus size={15} /> SAVE TO KNOWLEDGE VAULT
              </h3>
              <button onClick={() => setSaveModal(null)} className="text-muted-foreground hover:text-foreground">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Title</label>
                <input
                  value={saveModal.title}
                  onChange={e => setSaveModal({ ...saveModal, title: e.target.value })}
                  className="w-full px-3 py-2 bg-black/50 border border-border rounded text-xs focus:outline-none focus:border-primary"
                  placeholder="Entry title..."
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Tags (comma separated)</label>
                <input
                  value={saveModal.tags}
                  onChange={e => setSaveModal({ ...saveModal, tags: e.target.value })}
                  className="w-full px-3 py-2 bg-black/50 border border-border rounded text-xs focus:outline-none focus:border-primary"
                  placeholder="e.g. nmap, recon, gobuster"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Preview</label>
                <div className="text-[10px] text-muted-foreground bg-black/30 border border-border rounded p-2 max-h-24 overflow-y-auto font-mono whitespace-pre-wrap">
                  {saveModal.content.slice(0, 400)}{saveModal.content.length > 400 ? '…' : ''}
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setSaveModal(null)}
                className="flex-1 py-2 text-xs border border-border rounded hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveToVault}
                disabled={isSaving || !saveModal.title}
                className="flex-1 py-2 text-xs font-bold bg-primary text-black rounded hover:bg-primary/80 disabled:opacity-30 flex items-center justify-center gap-1.5 transition-colors"
              >
                {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Save to Vault
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sessions panel */}
      <div className={cn(
        'border-r border-border bg-card/20 flex flex-col shrink-0 transition-all duration-300',
        'md:w-64 md:flex',
        showSessionList
          ? 'flex flex-col w-full md:w-64 absolute md:static inset-0 z-10 bg-background'
          : 'hidden md:flex',
      )}>
        <div className="p-3 border-b border-border bg-black/20 flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2 text-xs">
            <MessageSquare size={14} className="text-primary" /> OPERATIONAL_LOGS
          </h2>
          <button
            onClick={createSession}
            title="New session"
            className="p-1.5 hover:bg-primary/20 text-primary border border-primary/30 rounded transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {isSessionsLoading ? (
            <div className="p-4 text-center text-muted-foreground animate-pulse text-xs">LOADING...</div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-6">
              <Terminal size={28} className="text-muted-foreground opacity-20" />
              <p className="text-[11px] text-muted-foreground text-center">No sessions yet.</p>
              <button onClick={createSession} className="w-full py-2 px-3 border border-primary/50 text-primary text-xs rounded hover:bg-primary/10 transition-colors">
                + New Session
              </button>
            </div>
          ) : (
            sessions.map(s => (
              <div
                key={s.id}
                onClick={() => setCurrentSessionId(s.id)}
                className={cn(
                  'group p-2.5 rounded cursor-pointer border transition-all flex items-center justify-between gap-2',
                  currentSessionId === s.id
                    ? 'bg-secondary/60 border-primary/30 text-primary'
                    : 'border-transparent hover:bg-secondary/30 text-muted-foreground hover:text-foreground',
                )}
              >
                <div className="flex items-center gap-2 truncate min-w-0">
                  <Terminal size={12} className="shrink-0" />
                  <span className="truncate text-[11px]">{s.title}</span>
                </div>
                <button
                  onClick={e => deleteSession(s.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-all shrink-0"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className={cn(
        'flex-1 flex flex-col bg-background/50 relative min-w-0',
        showSessionList ? 'hidden md:flex' : 'flex',
      )}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,255,102,0.02),transparent)] pointer-events-none" />

        {/* Top bar */}
        <div className="p-3 border-b border-border bg-card/10 flex items-center justify-between z-10 gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setShowSessionList(true)}
              className="md:hidden p-1.5 border border-border rounded text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors shrink-0"
            >
              <ChevronLeft size={14} />
            </button>
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_6px_rgba(0,255,102,0.6)] shrink-0" />
            <span className="font-bold text-xs uppercase truncate">AI_OPS_TERMINAL</span>
            {selectedSession && (
              <>
                <span className="text-muted-foreground/30 hidden md:inline">|</span>
                <span className="text-[10px] text-muted-foreground hidden md:block truncate">{selectedSession.title}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground shrink-0">
            {saveSuccess && (
              <span className="text-primary animate-pulse">✓ Saved to Vault</span>
            )}
            <span className="hidden sm:flex items-center gap-1"><ShieldAlert size={9} className="text-primary" /> Uncensored</span>
            <span className="flex items-center gap-1">
              <span className={cn("h-1.5 w-1.5 rounded-full inline-block", isLoading ? "bg-yellow-400 animate-pulse" : "bg-green-500")} />
              {isLoading ? 'Generating' : 'Ready'}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 md:p-5 space-y-4 md:space-y-5">
          {messages.length === 0 && !isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-3 opacity-40 min-h-[300px]">
              <Bot size={40} className="text-primary" />
              <div className="text-center space-y-1.5">
                <p className="font-bold text-primary text-sm tracking-wider">CYBER_SENTINEL_V2.0</p>
                <p className="text-[11px] max-w-xs">
                  {currentSessionId ? 'Session active. Enter your directive.' : 'Create or select a session to begin.'}
                </p>
                {!currentSessionId && (
                  <button onClick={createSession} className="mt-2 px-4 py-2 border border-primary/50 text-primary text-xs rounded hover:bg-primary/10 transition-colors">
                    + New Session
                  </button>
                )}
              </div>
            </div>
          ) : (
            messages.map(m => (
              <div key={m.id} className={cn('flex gap-2 md:gap-3 w-full group/msg', m.role === 'user' ? 'flex-row-reverse' : '')}>
                <div className={cn(
                  'h-7 w-7 rounded flex items-center justify-center border shrink-0 mt-0.5',
                  m.role === 'user'
                    ? 'bg-secondary/60 border-primary/20 text-primary'
                    : 'bg-black border-primary/30 text-primary shadow-[0_0_8px_rgba(0,255,102,0.08)]',
                )}>
                  {m.role === 'user' ? <User size={13} /> : <Bot size={13} />}
                </div>

                <div className={cn(
                  'flex flex-col gap-1 min-w-0',
                  m.role === 'user' ? 'items-end max-w-[80%]' : 'items-start max-w-[92%] md:max-w-[85%]',
                )}>
                  <div className={cn(
                    'p-3 rounded-lg border break-words',
                    m.role === 'user'
                      ? 'bg-secondary/30 border-border text-foreground'
                      : 'bg-black/40 border-primary/15 text-foreground/90',
                  )}>
                    <MessageContent content={m.content} streaming={m.streaming} />
                  </div>
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-[10px] text-muted-foreground/40 uppercase">
                      {m.role === 'user' ? 'Operator' : 'Sentinel'}
                      {m.streaming && ' • streaming…'}
                    </span>
                    {m.role === 'assistant' && !m.streaming && m.content && (
                      <button
                        onClick={() => openSaveModal(m.content)}
                        title="Save to Knowledge Vault"
                        className="opacity-0 group-hover/msg:opacity-100 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary border border-transparent hover:border-primary/30 rounded px-1.5 py-0.5 transition-all"
                      >
                        <BookmarkPlus size={10} /> save
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 md:p-4 border-t border-border bg-card/5 z-10 shrink-0">
          <form onSubmit={sendMessage} className="max-w-4xl mx-auto relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <ChevronRight className="text-primary/60" size={13} />
            </div>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={currentSessionId ? 'Enter operational directive…' : 'Create a session first…'}
              disabled={!currentSessionId}
              className="w-full bg-black/50 border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-lg pl-8 pr-24 py-2.5 text-xs md:text-sm focus:outline-none transition-all placeholder:text-muted-foreground/25 font-mono"
            />
            <div className="absolute inset-y-0 right-2 flex items-center gap-1">
              {isLoading && (
                <button
                  type="button"
                  onClick={stopStreaming}
                  className="h-7 px-2 rounded border border-border text-[10px] text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
                >
                  stop
                </button>
              )}
              <button
                type="submit"
                disabled={!input.trim() || !currentSessionId || isLoading}
                className="h-7 w-7 rounded bg-primary text-black flex items-center justify-center hover:bg-primary/80 disabled:opacity-25 transition-all shadow-[0_0_12px_rgba(0,255,102,0.15)]"
              >
                {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              </button>
            </div>
          </form>
          <p className="max-w-4xl mx-auto mt-1.5 text-[10px] text-muted-foreground/35 text-center md:text-left">
            GROQ • LLAMA-3.3-70B • STREAMING ENABLED • KNOWLEDGE VAULT CONTEXT INJECTION • WIN+LINUX COMMANDS
          </p>
        </div>
      </div>
    </div>
  );
}
