'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  User, 
  Send, 
  Plus, 
  Trash2, 
  MessageSquare, 
  Terminal, 
  Loader2, 
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionsLoading, setIsSessionsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (currentSessionId) {
      fetchMessages(currentSessionId);
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/chat/sessions');
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
      setIsSessionsLoading(false);
      if (data.length > 0 && !currentSessionId) {
        setCurrentSessionId(data[0].id);
      }
    } catch (e) {
      setIsSessionsLoading(false);
    }
  };

  const fetchMessages = async (sid: string) => {
    try {
      const res = await fetch(`/api/chat/sessions/${sid}/messages`);
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (e) {}
  };

  const createSession = async () => {
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `Session ${sessions.length + 1}` })
      });
      const newSession = await res.json();
      setSessions([...sessions, newSession]);
      setCurrentSessionId(newSession.id);
    } catch (e) {}
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this session?')) return;
    try {
      await fetch(`/api/chat/sessions/${id}`, { method: 'DELETE' });
      const updated = sessions.filter(s => s.id !== id);
      setSessions(updated);
      if (currentSessionId === id) {
        setCurrentSessionId(updated.length > 0 ? updated[0].id : null);
      }
    } catch (e) {}
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
    } catch (e) {
      setMessages(prev => [...prev, { 
        id: 'err', 
        role: 'assistant', 
        content: 'System Error: Failed to established connection with AI node.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full overflow-hidden font-mono text-sm">
      {/* Sessions Sidebar */}
      <div className="w-72 border-r border-border bg-card/20 flex flex-col shrink-0">
        <div className="p-4 border-b border-border bg-black/20 flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2">
            <MessageSquare size={16} className="text-primary" />
            OPERATIONAL_LOGS
          </h2>
          <button 
            onClick={createSession}
            className="p-1 hover:bg-primary/20 text-primary border border-primary/30 rounded transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isSessionsLoading ? (
            <div className="p-4 text-center text-muted-foreground animate-pulse text-xs">INITIALIZING_LOGS...</div>
          ) : sessions.length === 0 ? (
            <button 
              onClick={createSession}
              className="w-full p-4 border border-dashed border-border rounded text-muted-foreground hover:border-primary/50 hover:text-primary transition-all text-xs flex flex-col items-center gap-2"
            >
              <Terminal size={24} className="opacity-20" />
              NO_ACTIVE_SESSIONS
            </button>
          ) : (
            sessions.map(s => (
              <div 
                key={s.id}
                onClick={() => setCurrentSessionId(s.id)}
                className={cn(
                  "group p-3 rounded cursor-pointer border transition-all flex items-center justify-between",
                  currentSessionId === s.id 
                    ? "bg-secondary/50 border-primary/30 text-primary" 
                    : "border-transparent hover:bg-secondary/30 text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  <Terminal size={14} className={currentSessionId === s.id ? "text-primary" : "text-muted-foreground"} />
                  <span className="truncate">{s.title}</span>
                </div>
                <button 
                  onClick={(e) => deleteSession(s.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-background/50 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,255,102,0.03),transparent)] pointer-events-none" />
        
        <div className="p-4 border-b border-border bg-card/10 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(0,255,102,0.5)]" />
            <span className="font-bold tracking-tight">AI_OPS_TERMINAL</span>
            <span className="text-muted-foreground opacity-30">|</span>
            <span className="text-[10px] text-muted-foreground uppercase">
              {currentSessionId ? `Session ID: ${currentSessionId}` : 'Standby'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><ShieldAlert size={10} className="text-primary" /> Uncensored Mode</span>
            <span className="flex items-center gap-1 h-1.5 w-1.5 rounded-full bg-green-500" /> Connected
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-primary/10">
          {messages.length === 0 && !isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 opacity-50">
              <Bot size={48} className="text-primary animate-pulse" />
              <div className="text-center space-y-2">
                <p className="font-bold text-primary">CYBER_SENTINEL_V2.0</p>
                <p className="text-xs max-w-xs">Awaiting operational directives. I have full access to your Knowledge Vault and specialized pentesting toolsets.</p>
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div 
                key={m.id}
                className={cn(
                  "flex gap-4 max-w-4xl mx-auto",
                  m.role === 'user' ? "flex-row-reverse" : ""
                )}
              >
                <div className={cn(
                  "h-8 w-8 rounded flex items-center justify-center border shrink-0",
                  m.role === 'user' 
                    ? "bg-secondary/50 border-primary/20 text-primary" 
                    : "bg-black border-primary/40 text-primary shadow-[0_0_10px_rgba(0,255,102,0.1)]"
                )}>
                  {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={cn(
                  "flex flex-col space-y-2",
                  m.role === 'user' ? "items-end" : "items-start"
                )}>
                  <div className={cn(
                    "p-4 rounded-lg border leading-relaxed text-sm",
                    m.role === 'user'
                      ? "bg-secondary/30 border-border text-foreground"
                      : "bg-black/40 border-primary/20 text-foreground shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]"
                  )}>
                    <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-code:text-primary prose-pre:bg-black/60 prose-pre:border prose-pre:border-primary/10">
                      {m.content.split('\n').map((line: string, i: number) => (
                        <p key={i} className={line.startsWith('`') ? "font-mono" : ""}>{line}</p>
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground opacity-50 uppercase">
                    {m.role === 'user' ? 'Operator' : 'Sentinel'} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex gap-4 max-w-4xl mx-auto animate-pulse">
              <div className="h-8 w-8 rounded bg-black border border-primary/30 flex items-center justify-center">
                <Loader2 size={16} className="text-primary animate-spin" />
              </div>
              <div className="p-4 rounded-lg bg-black/40 border border-primary/10 w-32 border-dashed">
                <div className="flex gap-1">
                  <div className="h-1 w-1 bg-primary rounded-full animate-bounce" />
                  <div className="h-1 w-1 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="h-1 w-1 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 border-t border-border bg-card/5 space-y-4 z-10">
          <form onSubmit={sendMessage} className="max-w-4xl mx-auto relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <ChevronRight className="text-primary group-focus-within:translate-x-1 transition-transform" size={16} />
            </div>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={currentSessionId ? "Enter operational directive..." : "Initialize session to begin..."}
              disabled={!currentSessionId || isLoading}
              className="w-full bg-black/50 border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-lg pl-10 pr-16 py-3 text-sm focus:outline-none transition-all placeholder:text-muted-foreground/30 font-mono"
            />
            <div className="absolute inset-y-0 right-2 flex items-center">
              <button 
                type="submit"
                disabled={!input.trim() || !currentSessionId || isLoading}
                className="h-8 w-8 rounded bg-primary text-black flex items-center justify-center hover:bg-primary/80 disabled:opacity-30 disabled:hover:bg-primary transition-all shadow-[0_0_15px_rgba(0,255,102,0.2)]"
              >
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          </form>
          <div className="max-w-4xl mx-auto flex items-center justify-between text-[10px] text-muted-foreground px-2">
            <div className="flex gap-4">
              <span className="flex items-center gap-1"><div className="h-1 w-1 bg-primary rounded-full" /> CTRL+ENTER TO SEND</span>
              <span className="flex items-center gap-1"><div className="h-1 w-1 bg-primary rounded-full" /> SESSION_PERSISTENCE: ENABLED</span>
            </div>
            <div className="flex gap-4">
              <span>GROQ_INFRASTRUCTURE</span>
              <span>v2.4.0-STABLE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
