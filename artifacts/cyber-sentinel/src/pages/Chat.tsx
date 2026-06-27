'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bot, User, Send, Plus, Trash2, MessageSquare, Terminal, Loader2, ChevronRight, ShieldAlert, ChevronLeft
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | boolean | undefined | null)[]) {
  return twMerge(clsx(inputs));
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionsLoading, setIsSessionsLoading] = useState(true);
  const [showSessionList, setShowSessionList] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { fetchSessions(); }, []);

  useEffect(() => {
    if (currentSessionId) {
      fetchMessages(currentSessionId);
      // On mobile, auto-hide session list when a session is selected
      if (window.innerWidth < 768) setShowSessionList(false);
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/chat/sessions');
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setSessions(list);
      setIsSessionsLoading(false);
      if (list.length > 0 && !currentSessionId) setCurrentSessionId(list[0].id);
    } catch { setIsSessionsLoading(false); }
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
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `Op_${new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` })
      });
      const newSession = await res.json();
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
    } catch (e) { console.error(e); }
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this session?')) return;
    try {
      await fetch(`/api/chat/sessions/${id}`, { method: 'DELETE' });
      const updated = sessions.filter(s => s.id !== id);
      setSessions(updated);
      if (currentSessionId === id) setCurrentSessionId(updated.length > 0 ? updated[0].id : null);
    } catch {}
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentSessionId || isLoading) return;
    const userMsg = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);
    try {
      const res = await fetch(`/api/chat/sessions/${currentSessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: currentInput })
      });
      const aiMsg = await res.json();
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      setMessages(prev => [...prev, { id: 'err' + Date.now(), role: 'assistant', content: 'System Error: Failed to establish connection with AI node.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedSession = sessions.find(s => s.id === currentSessionId);

  return (
    <div className="flex h-full overflow-hidden font-mono text-sm">
      {/* Sessions sidebar — full width on mobile when shown, fixed width on desktop */}
      <div className={cn(
        "border-r border-border bg-card/20 flex flex-col shrink-0 transition-all duration-300",
        "md:w-72 md:flex",
        showSessionList ? "flex flex-col w-full md:w-72 absolute md:static inset-0 z-10 bg-background" : "hidden md:flex"
      )}>
        <div className="p-4 border-b border-border bg-black/20 flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2">
            <MessageSquare size={16} className="text-primary" /> OPERATIONAL_LOGS
          </h2>
          <button onClick={createSession} className="p-1.5 hover:bg-primary/20 text-primary border border-primary/30 rounded transition-colors">
            <Plus size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isSessionsLoading ? (
            <div className="p-4 text-center text-muted-foreground animate-pulse text-xs">INITIALIZING_LOGS...</div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center gap-4 p-6">
              <Terminal size={32} className="text-muted-foreground opacity-20" />
              <p className="text-xs text-muted-foreground text-center">No sessions yet. Create one to begin.</p>
              <button onClick={createSession} className="w-full py-2 px-4 border border-primary/50 text-primary text-xs rounded hover:bg-primary/10 transition-colors">
                + New Session
              </button>
            </div>
          ) : (
            sessions.map(s => (
              <div key={s.id} onClick={() => setCurrentSessionId(s.id)}
                className={cn("group p-3 rounded cursor-pointer border transition-all flex items-center justify-between",
                  currentSessionId === s.id ? "bg-secondary/50 border-primary/30 text-primary" : "border-transparent hover:bg-secondary/30 text-muted-foreground hover:text-foreground"
                )}>
                <div className="flex items-center gap-2 truncate">
                  <Terminal size={14} className={currentSessionId === s.id ? "text-primary" : "text-muted-foreground"} />
                  <span className="truncate text-xs">{s.title}</span>
                </div>
                <button onClick={(e) => deleteSession(s.id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-all shrink-0">
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className={cn(
        "flex-1 flex flex-col bg-background/50 relative min-w-0",
        showSessionList ? "hidden md:flex" : "flex"
      )}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,255,102,0.03),transparent)] pointer-events-none" />

        <div className="p-3 md:p-4 border-b border-border bg-card/10 flex items-center justify-between z-10 gap-2">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            {/* Back button on mobile */}
            <button
              onClick={() => setShowSessionList(true)}
              className="md:hidden p-1.5 border border-border rounded text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors shrink-0"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(0,255,102,0.5)] shrink-0" />
            <span className="font-bold tracking-tight text-xs md:text-sm truncate">AI_OPS_TERMINAL</span>
            <span className="text-muted-foreground opacity-30 hidden md:inline">|</span>
            <span className="text-[10px] text-muted-foreground uppercase hidden md:block truncate">
              {selectedSession ? selectedSession.title : 'Standby'}
            </span>
          </div>
          <div className="flex items-center gap-2 md:gap-4 text-[10px] text-muted-foreground shrink-0">
            <span className="hidden md:flex items-center gap-1"><ShieldAlert size={10} className="text-primary" /> Uncensored</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" /> Live</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 md:space-y-6">
          {messages.length === 0 && !isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 opacity-50 min-h-[300px]">
              <Bot size={40} className="text-primary animate-pulse" />
              <div className="text-center space-y-2">
                <p className="font-bold text-primary text-sm">CYBER_SENTINEL_V2.0</p>
                <p className="text-xs max-w-xs text-center">
                  {currentSessionId
                    ? "Session active. Enter your directive below."
                    : "Create or select a session to begin."}
                </p>
                {!currentSessionId && (
                  <button onClick={createSession} className="mt-2 px-4 py-2 border border-primary/50 text-primary text-xs rounded hover:bg-primary/10 transition-colors">
                    + New Session
                  </button>
                )}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={cn("flex gap-2 md:gap-4 max-w-4xl mx-auto w-full", m.role === 'user' ? "flex-row-reverse" : "")}>
                <div className={cn("h-7 w-7 md:h-8 md:w-8 rounded flex items-center justify-center border shrink-0",
                  m.role === 'user' ? "bg-secondary/50 border-primary/20 text-primary" : "bg-black border-primary/40 text-primary"
                )}>
                  {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className={cn("flex flex-col space-y-1 min-w-0 max-w-[85%] md:max-w-[90%]", m.role === 'user' ? "items-end" : "items-start")}>
                  <div className={cn("p-3 md:p-4 rounded-lg border text-xs md:text-sm leading-relaxed break-words",
                    m.role === 'user' ? "bg-secondary/30 border-border text-foreground" : "bg-black/40 border-primary/20 text-foreground"
                  )}>
                    <div className="whitespace-pre-wrap font-mono">{m.content}</div>
                  </div>
                  <span className="text-[10px] text-muted-foreground opacity-50 uppercase">
                    {m.role === 'user' ? 'Operator' : 'Sentinel'}
                  </span>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex gap-3 max-w-4xl mx-auto animate-pulse">
              <div className="h-7 w-7 md:h-8 md:w-8 rounded bg-black border border-primary/30 flex items-center justify-center shrink-0">
                <Loader2 size={14} className="text-primary animate-spin" />
              </div>
              <div className="p-3 md:p-4 rounded-lg bg-black/40 border border-primary/10 border-dashed">
                <div className="flex gap-1">
                  <div className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce" />
                  <div className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 md:p-6 border-t border-border bg-card/5 space-y-2 z-10">
          <form onSubmit={sendMessage} className="max-w-4xl mx-auto relative group">
            <div className="absolute inset-y-0 left-3 md:left-4 flex items-center pointer-events-none">
              <ChevronRight className="text-primary" size={14} />
            </div>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={currentSessionId ? "Enter operational directive..." : "Create a session first..."}
              disabled={!currentSessionId || isLoading}
              className="w-full bg-black/50 border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-lg pl-8 md:pl-10 pr-14 py-2.5 md:py-3 text-xs md:text-sm focus:outline-none transition-all placeholder:text-muted-foreground/30 font-mono"
            />
            <div className="absolute inset-y-0 right-2 flex items-center">
              <button type="submit" disabled={!input.trim() || !currentSessionId || isLoading}
                className="h-7 w-7 md:h-8 md:w-8 rounded bg-primary text-black flex items-center justify-center hover:bg-primary/80 disabled:opacity-30 transition-all">
                {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              </button>
            </div>
          </form>
          <div className="max-w-4xl mx-auto text-[10px] text-muted-foreground/50 text-center md:text-left">
            GROQ_INFRASTRUCTURE • LLAMA-3.3-70B • SESSION_PERSISTENCE: ENABLED
          </div>
        </div>
      </div>
    </div>
  );
}
