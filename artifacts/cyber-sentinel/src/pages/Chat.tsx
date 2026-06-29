import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bot, User, Send, Plus, Trash2, MessageSquare, Terminal,
  Loader2, ChevronRight, ShieldAlert, ChevronLeft, BookmarkPlus, X, Save, Sparkles,
  ExternalLink, Download, Flag, Zap, FileText, Paperclip, Image, FileCode, XCircle,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | boolean | undefined | null)[]) {
  return twMerge(clsx(inputs));
}

interface ToolCard { tool: string; url: string; }

interface AttachedFile {
  name: string;
  type: 'image' | 'text';
  mimeType: string;
  base64?: string;
  textContent?: string;
  analysis?: string;
  analyzing?: boolean;
  error?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  isError?: boolean;
  provider?: string;
  reason?: string;
  toolCards?: ToolCard[];
  attachments?: { name: string; summary: string }[];
  judgeFallback?: boolean;
}

interface Session { id: string; title: string; createdAt: string; updatedAt: string; }
interface SaveModal { content: string; title: string; tags: string; }

const SESSION_TEMPLATES = [
  { label: 'Pentest Web App', prompt: 'Give me a complete web application penetration testing checklist. Include all phases: recon, scanning, enumeration, exploitation, post-exploitation. For each phase list the top tools and exact commands.' },
  { label: 'HTB/THM Box', prompt: 'I started a HackTheBox/TryHackMe machine. Walk me through a systematic methodology: initial nmap scan, service enumeration, web directory brute force, and common initial foothold techniques. Give exact commands.' },
  { label: 'Privilege Escalation', prompt: 'I have a low-privilege shell on a Linux machine. Give me a complete privilege escalation checklist: SUID/SGID, cron jobs, writable paths, sudo misconfigs, kernel exploits, credentials in files. Include the exact commands for each check.' },
  { label: 'Active Directory', prompt: 'I have a foothold on a Windows domain-joined machine. Walk me through Active Directory enumeration and attack path: BloodHound collection, Kerberoasting, AS-REP roasting, Pass-the-Hash, DCSync. Exact commands for each.' },
  { label: 'Hash Cracking', prompt: 'I have captured hashes. Give me a complete hash cracking guide with hashcat: how to identify hash types, the best wordlists and rules, mask attacks, and combo attacks. Include exact hashcat commands and modes.' },
  { label: 'Reverse Shell', prompt: 'I need to establish a reverse shell. Give me the best one-liners for: bash, Python, PHP, PowerShell, netcat, socat, and msfvenom payloads. Include listener setup on my side and how to stabilize/upgrade the shell.' },
];

const TOOL_DISPLAY: Record<string, { label: string; color: string }> = {
  nmap: { label: 'Nmap', color: 'text-blue-400 border-blue-400/30 bg-blue-400/5' },
  masscan: { label: 'Masscan', color: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/5' },
  gobuster: { label: 'Gobuster', color: 'text-green-400 border-green-400/30 bg-green-400/5' },
  ffuf: { label: 'FFUF', color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5' },
  nikto: { label: 'Nikto', color: 'text-orange-400 border-orange-400/30 bg-orange-400/5' },
  sqlmap: { label: 'SQLMap', color: 'text-red-400 border-red-400/30 bg-red-400/5' },
  burpsuite: { label: 'Burp Suite', color: 'text-orange-300 border-orange-300/30 bg-orange-300/5' },
  metasploit: { label: 'Metasploit', color: 'text-red-300 border-red-300/30 bg-red-300/5' },
  hashcat: { label: 'Hashcat', color: 'text-purple-400 border-purple-400/30 bg-purple-400/5' },
  john: { label: 'John', color: 'text-purple-300 border-purple-300/30 bg-purple-300/5' },
  hydra: { label: 'Hydra', color: 'text-pink-400 border-pink-400/30 bg-pink-400/5' },
  impacket: { label: 'Impacket', color: 'text-indigo-400 border-indigo-400/30 bg-indigo-400/5' },
  bloodhound: { label: 'BloodHound', color: 'text-red-400 border-red-400/30 bg-red-400/5' },
  linpeas: { label: 'LinPEAS', color: 'text-green-300 border-green-300/30 bg-green-300/5' },
  mimikatz: { label: 'Mimikatz', color: 'text-red-500 border-red-500/30 bg-red-500/5' },
  netcat: { label: 'Netcat', color: 'text-teal-400 border-teal-400/30 bg-teal-400/5' },
  subfinder: { label: 'Subfinder', color: 'text-cyan-300 border-cyan-300/30 bg-cyan-300/5' },
  nuclei: { label: 'Nuclei', color: 'text-yellow-300 border-yellow-300/30 bg-yellow-300/5' },
  feroxbuster: { label: 'Feroxbuster', color: 'text-green-400 border-green-400/30 bg-green-400/5' },
  chisel: { label: 'Chisel', color: 'text-gray-300 border-gray-300/30 bg-gray-300/5' },
};

function ToolCards({ cards }: { cards: ToolCard[] }) {
  if (!cards.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-primary/10">
      <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider w-full">Tools referenced:</span>
      {cards.map(c => {
        const display = TOOL_DISPLAY[c.tool] ?? { label: c.tool, color: 'text-primary border-primary/30 bg-primary/5' };
        return (
          <a key={c.tool} href={c.url} target="_blank" rel="noreferrer"
            className={cn('flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-mono transition-all hover:opacity-80', display.color)}>
            {display.label} <ExternalLink size={8} />
          </a>
        );
      })}
    </div>
  );
}

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
                  <button onClick={() => navigator.clipboard.writeText(code.trim())} className="text-[10px] text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover/code:opacity-100">copy</button>
                </div>
              )}
              <pre className={cn("bg-black/80 text-primary p-3 overflow-x-auto font-mono text-xs leading-relaxed border border-primary/10", lang ? "rounded-b rounded-tr" : "rounded")}>
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
      {streaming && <span className="inline-block w-1.5 h-3.5 bg-primary animate-pulse rounded-sm align-middle ml-0.5" />}
    </div>
  );
}

function ProviderBadge({ provider, reason }: { provider: string; reason?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded border border-primary/20 bg-primary/5 text-primary/60" title={reason}>
      <Zap size={7} /> {provider}
    </span>
  );
}

function AttachmentPreview({ files, onRemove }: { files: AttachedFile[]; onRemove: (i: number) => void }) {
  if (!files.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 px-1 mb-2">
      {files.map((f, i) => (
        <div key={i} className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-mono max-w-[200px]',
          f.error ? 'border-red-400/40 bg-red-400/5 text-red-400' :
          f.analyzing ? 'border-yellow-400/40 bg-yellow-400/5 text-yellow-400' :
          'border-primary/30 bg-primary/5 text-primary/80'
        )}>
          {f.type === 'image' ? <Image size={10} className="shrink-0" /> : <FileCode size={10} className="shrink-0" />}
          <span className="truncate">{f.name}</span>
          {f.analyzing && <Loader2 size={9} className="animate-spin shrink-0" />}
          {f.error && <span className="text-red-400 shrink-0" title={f.error}>!</span>}
          {!f.analyzing && (
            <button onClick={() => onRemove(i)} className="ml-0.5 hover:text-red-400 shrink-0 transition-colors">
              <XCircle size={10} />
            </button>
          )}
        </div>
      ))}
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
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [ctfMode, setCtfMode] = useState(false);
  const [modelMode, setModelMode] = useState<'best' | 'groq' | 'mistral'>('best');
  const [showTemplates, setShowTemplates] = useState(false);
  const [processingProviders, setProcessingProviders] = useState<string[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { fetchSessions(); }, []);
  useEffect(() => {
    if (currentSessionId) { fetchMessages(currentSessionId); if (window.innerWidth < 768) setShowSessionList(false); }
    else setMessages([]);
  }, [currentSessionId]);
  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/chat/sessions');
      const data = await res.json();
      const list: Session[] = Array.isArray(data) ? data : [];
      setSessions(list);
      if (list.length > 0 && !currentSessionId) setCurrentSessionId(list[0].id);
    } finally { setIsSessionsLoading(false); }
  };

  const fetchMessages = async (sid: string) => {
    try {
      const res = await fetch(`/api/chat/sessions/${sid}/messages`);
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch {}
  };

  const createSession = async (initialPrompt?: string) => {
    try {
      const now = new Date();
      const label = `Op_${now.toLocaleDateString('en-GB').replace(/\//g, '.')}_${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
      const res = await fetch('/api/chat/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: label }) });
      const s: Session = await res.json();
      setSessions(prev => [s, ...prev]);
      setCurrentSessionId(s.id);
      if (initialPrompt) setTimeout(() => { setInput(initialPrompt); setTimeout(() => inputRef.current?.focus(), 100); }, 200);
    } catch (e) { console.error(e); }
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this session?')) return;
    await fetch(`/api/chat/sessions/${id}`, { method: 'DELETE' });
    const updated = sessions.filter(s => s.id !== id);
    setSessions(updated);
    if (currentSessionId === id) setCurrentSessionId(updated.length > 0 ? updated[0].id : null);
  };

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (fileInputRef.current) fileInputRef.current.value = '';

    for (const file of files) {
      const isImage = file.type.startsWith('image/');
      const isText = file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.log') || file.name.endsWith('.md');

      if (!isImage && !isText) {
        setAttachedFiles(prev => [...prev, { name: file.name, type: 'text', mimeType: file.type, error: 'Unsupported file type. Use images or text/log files.' }]);
        continue;
      }

      const attached: AttachedFile = { name: file.name, type: isImage ? 'image' : 'text', mimeType: file.type, analyzing: isImage };
      setAttachedFiles(prev => [...prev, attached]);
      const idx = attachedFiles.length; // approximate index for update

      if (isImage) {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const dataUrl = ev.target?.result as string;

          // Compress/resize image via Canvas before sending (keeps base64 < 4MB)
          const compressImage = (src: string, maxDim = 1280, quality = 0.88): Promise<{ base64: string; mimeType: string }> =>
            new Promise((resolve) => {
              const img = new Image();
              img.onload = () => {
                const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
                const w = Math.round(img.width * scale);
                const h = Math.round(img.height * scale);
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0, w, h);
                const compressed = canvas.toDataURL('image/jpeg', quality);
                resolve({ base64: compressed.split(',')[1], mimeType: 'image/jpeg' });
              };
              img.onerror = () => resolve({ base64: src.split(',')[1], mimeType: file.type });
              img.src = src;
            });

          const { base64, mimeType: compressedMime } = await compressImage(dataUrl);

          // Update with base64 while analysis runs
          setAttachedFiles(prev => prev.map(f =>
            f.name === file.name && f.analyzing
              ? { ...f, base64, analyzing: true }
              : f
          ));

          // Call AI vision analysis
          try {
            const res = await fetch('/api/analyze/image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ base64, mimeType: compressedMime }),
            });
            const data = await res.json();
            if (!res.ok) {
              // Surface the actual error so user knows what failed
              const errNote = `[Image attached — vision analysis failed: ${data.error ?? res.status}]`;
              setAttachedFiles(prev => prev.map(f =>
                f.name === file.name && f.analyzing
                  ? { ...f, analyzing: false, analysis: errNote, error: data.error }
                  : f
              ));
            } else {
              const analysis = data.analysis ?? `[Image attached: ${file.name}]`;
              setAttachedFiles(prev => prev.map(f =>
                f.name === file.name && f.analyzing
                  ? { ...f, analyzing: false, analysis }
                  : f
              ));
            }
          } catch (err: any) {
            setAttachedFiles(prev => prev.map(f =>
              f.name === file.name && f.analyzing
                ? { ...f, analyzing: false, analysis: `[Image attached: ${file.name}]`, error: err.message }
                : f
            ));
          }
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const text = ev.target?.result as string;
          setAttachedFiles(prev => prev.map(f =>
            f.name === file.name && !f.textContent
              ? { ...f, textContent: text.slice(0, 8000) }
              : f
          ));
        };
        reader.readAsText(file);
      }
    }
  };

  const removeAttachment = (i: number) => {
    setAttachedFiles(prev => prev.filter((_, idx) => idx !== i));
  };

  const buildMessageWithAttachments = (text: string): string => {
    if (!attachedFiles.length) return text;
    const parts: string[] = [text];
    for (const f of attachedFiles) {
      if (f.error) continue;
      if (f.type === 'image' && f.analysis) {
        parts.push(`\n\n---\n[Attached image: ${f.name}]\n${f.analysis}`);
      } else if (f.type === 'text' && f.textContent) {
        parts.push(`\n\n---\n[Attached file: ${f.name}]\n\`\`\`\n${f.textContent}\n\`\`\``);
      }
    }
    return parts.join('');
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !currentSessionId || isLoading) return;

    const hasAnalyzing = attachedFiles.some(f => f.analyzing);
    if (hasAnalyzing) return;

    const fullContent = buildMessageWithAttachments(ctfMode ? `[CTF MODE] ${text}` : text);
    const attachmentSummaries = attachedFiles.filter(f => !f.error).map(f => ({ name: f.name, summary: f.analysis ? 'image analyzed' : 'text attached' }));

    const userMsgId = `user-${Date.now()}`;
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: text, attachments: attachmentSummaries.length ? attachmentSummaries : undefined }]);
    setInput('');
    setAttachedFiles([]);
    setIsLoading(true);
    setProcessingProviders([]);

    if (modelMode === 'best') {
      await sendBestAI(fullContent);
    } else {
      await sendStream(fullContent, modelMode);
    }
  };

  const sendBestAI = async (text: string) => {
    const streamingId = `streaming-${Date.now()}`;
    setMessages(prev => [...prev, { id: streamingId, role: 'assistant', content: '', streaming: true }]);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const response = await fetch(`/api/chat/sessions/${currentSessionId}/messages/best`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
        signal: abort.signal,
      });

      if (!response.ok || !response.body) throw new Error('Best-AI request failed');

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
            if (parsed.type === 'provider_result') {
              setProcessingProviders(prev => [...prev.filter(p => p !== parsed.name), parsed.name]);
            } else if (parsed.type === 'answer') {
              setMessages(prev => prev.map(m =>
                m.id === streamingId
                  ? { ...m, content: parsed.content, streaming: false, provider: parsed.provider, reason: parsed.reason, toolCards: parsed.toolCards ?? [] }
                  : m
              ));
              scrollToBottom();
            } else if (parsed.error) {
              setMessages(prev => prev.map(m =>
                m.id === streamingId
                  ? { ...m, content: `⚠ ${parsed.error}`, streaming: false, isError: true }
                  : m
              ));
            }
          } catch {}
        }
      }

      setMessages(prev => prev.map(m => m.id === streamingId ? { ...m, streaming: false } : m));
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        // Keep isLoading=true — sendStreamWithId will set it false when done
        setMessages(prev => prev.map(m =>
          m.id === streamingId ? { ...m, content: '', streaming: true, judgeFallback: true } : m
        ));
        setProcessingProviders([]);
        abortRef.current = null;
        await sendStreamWithId(text, streamingId);
        return;
      }
    } finally {
      setIsLoading(false);
      setProcessingProviders([]);
      abortRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  // sendStreamWithId reuses an existing message bubble (used when best-AI falls back)
  const sendStreamWithId = async (text: string, existingId: string) => {
    const abort = new AbortController();
    abortRef.current = abort;
    try {
      const response = await fetch(`/api/chat/sessions/${currentSessionId}/messages/stream`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }), signal: abort.signal,
      });
      if (!response.ok || !response.body) throw new Error('Stream failed');
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
              setMessages(prev => prev.map(m => m.id === existingId ? { ...m, content: m.content + parsed.text, streaming: true } : m));
              scrollToBottom();
            } else if (parsed.error) {
              setMessages(prev => prev.map(m =>
                m.id === existingId ? { ...m, content: `⚠ ${parsed.error}`, streaming: false, isError: true } : m
              ));
            }
          } catch {}
        }
      }
      setMessages(prev => prev.map(m => m.id === existingId ? { ...m, streaming: false } : m));
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages(prev => prev.map(m => m.id === existingId ? { ...m, content: 'System Error: Connection lost. Retry.', streaming: false, isError: true } : m));
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const sendStream = async (text: string, provider?: 'groq' | 'mistral') => {
    const streamingId = `streaming-${Date.now()}`;
    setMessages(prev => [...prev, { id: streamingId, role: 'assistant', content: '', streaming: true }]);
    const abort = new AbortController();
    abortRef.current = abort;
    try {
      const response = await fetch(`/api/chat/sessions/${currentSessionId}/messages/stream`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text, provider }), signal: abort.signal,
      });
      if (!response.ok || !response.body) throw new Error('Stream failed');
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
              setMessages(prev => prev.map(m => m.id === streamingId ? { ...m, content: m.content + parsed.text, streaming: true } : m));
              scrollToBottom();
            } else if (parsed.error) {
              setMessages(prev => prev.map(m =>
                m.id === streamingId ? { ...m, content: `⚠ ${parsed.error}`, streaming: false, isError: true } : m
              ));
            }
          } catch {}
        }
      }
      setMessages(prev => prev.map(m => m.id === streamingId ? { ...m, streaming: false } : m));
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages(prev => prev.map(m => m.id === streamingId ? { ...m, content: 'System Error: Connection lost. Retry.', streaming: false } : m));
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
    setProcessingProviders([]);
  };

  const enhanceInput = async () => {
    const text = input.trim();
    if (!text || isEnhancing || isLoading) return;
    setIsEnhancing(true);
    try {
      const res = await fetch('/api/chat/enhance-prompt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: text }) });
      const data = await res.json();
      if (data.enhanced) setInput(data.enhanced);
    } catch {}
    setIsEnhancing(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const exportSession = () => {
    const lines = messages.map(m => `## ${m.role === 'user' ? 'Operator' : 'Sentinel'}\n\n${m.content}`).join('\n\n---\n\n');
    const selectedSession = sessions.find(s => s.id === currentSessionId);
    const md = `# ${selectedSession?.title ?? 'Chat Session'}\n\nExported: ${new Date().toISOString()}\n\n---\n\n${lines}`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `${selectedSession?.title ?? 'session'}.md`; a.click();
  };

  const openSaveModal = (content: string) => {
    const firstLine = content.split('\n')[0].replace(/^#+\s*/, '').slice(0, 80);
    setSaveModal({ content, title: firstLine || 'Sentinel Response', tags: '' });
  };

  const handleSaveToVault = async () => {
    if (!saveModal) return;
    setIsSaving(true);
    try {
      await fetch('/api/knowledge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: saveModal.title, content: saveModal.content, tags: saveModal.tags ? saveModal.tags.split(',').map(t => t.trim()).filter(Boolean) : ['ai-ops'] }) });
      setSaveModal(null); setSaveSuccess(true); setTimeout(() => setSaveSuccess(false), 3000);
    } catch {}
    setIsSaving(false);
  };

  const hasAnalyzing = attachedFiles.some(f => f.analyzing);
  const selectedSession = sessions.find(s => s.id === currentSessionId);

  return (
    <div className="flex h-full overflow-hidden font-mono text-sm">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.txt,.log,.md,.csv,.json,.xml,.html,.py,.sh,.ps1,.bat,.conf,.cfg,.yaml,.yml"
        className="hidden"
        onChange={handleFileAttach}
      />

      {/* Save to Vault Modal */}
      {saveModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-card border border-primary/30 rounded-lg w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-primary text-sm flex items-center gap-2"><BookmarkPlus size={15} /> SAVE TO VAULT</h3>
              <button onClick={() => setSaveModal(null)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <input value={saveModal.title} onChange={e => setSaveModal({ ...saveModal, title: e.target.value })} className="w-full px-3 py-2 bg-black/50 border border-border rounded text-xs focus:outline-none focus:border-primary" placeholder="Entry title..." />
              <input value={saveModal.tags} onChange={e => setSaveModal({ ...saveModal, tags: e.target.value })} className="w-full px-3 py-2 bg-black/50 border border-border rounded text-xs focus:outline-none focus:border-primary" placeholder="Tags: nmap, recon, gobuster" />
              <div className="text-[10px] text-muted-foreground bg-black/30 border border-border rounded p-2 max-h-24 overflow-y-auto font-mono whitespace-pre-wrap">{saveModal.content.slice(0, 400)}{saveModal.content.length > 400 ? '…' : ''}</div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setSaveModal(null)} className="flex-1 py-2 text-xs border border-border rounded hover:bg-secondary transition-colors">Cancel</button>
              <button onClick={handleSaveToVault} disabled={isSaving || !saveModal.title} className="flex-1 py-2 text-xs font-bold bg-primary text-black rounded hover:bg-primary/80 disabled:opacity-30 flex items-center justify-center gap-1.5 transition-colors">
                {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save to Vault
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sessions panel */}
      <div className={cn('border-r border-border bg-card/20 flex flex-col shrink-0 transition-all duration-300', 'md:w-64 md:flex', showSessionList ? 'flex flex-col w-full md:w-64 absolute md:static inset-0 z-10 bg-background' : 'hidden md:flex')}>
        <div className="p-3 border-b border-border bg-black/20 flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2 text-xs"><MessageSquare size={14} className="text-primary" /> OPERATIONAL_LOGS</h2>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowTemplates(t => !t)} title="Session templates" className={cn("p-1.5 border rounded transition-colors text-xs", showTemplates ? "border-primary/50 text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-primary hover:border-primary/30")}>
              <FileText size={12} />
            </button>
            <button onClick={() => createSession()} title="New session" className="p-1.5 hover:bg-primary/20 text-primary border border-primary/30 rounded transition-colors"><Plus size={14} /></button>
          </div>
        </div>

        {/* Templates dropdown */}
        {showTemplates && (
          <div className="border-b border-border p-2 space-y-1 bg-black/30">
            <p className="text-[9px] text-muted-foreground/60 uppercase tracking-wider px-1 mb-1.5">Quick-start templates</p>
            {SESSION_TEMPLATES.map(t => (
              <button key={t.label} onClick={async () => { setShowTemplates(false); await createSession(); setTimeout(() => setInput(t.prompt), 400); }} className="w-full text-left px-2.5 py-1.5 text-[10px] rounded border border-transparent hover:border-primary/30 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors">
                → {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {isSessionsLoading ? <div className="p-4 text-center text-muted-foreground animate-pulse text-xs">LOADING...</div>
            : sessions.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-6">
                <Terminal size={28} className="text-muted-foreground opacity-20" />
                <p className="text-[11px] text-muted-foreground text-center">No sessions yet.</p>
                <button onClick={() => createSession()} className="w-full py-2 px-3 border border-primary/50 text-primary text-xs rounded hover:bg-primary/10 transition-colors">+ New Session</button>
              </div>
            ) : sessions.map(s => (
              <div key={s.id} onClick={() => setCurrentSessionId(s.id)}
                className={cn('group p-2.5 rounded cursor-pointer border transition-all flex items-center justify-between gap-2', currentSessionId === s.id ? 'bg-secondary/60 border-primary/30 text-primary' : 'border-transparent hover:bg-secondary/30 text-muted-foreground hover:text-foreground')}>
                <div className="flex items-center gap-2 truncate min-w-0"><Terminal size={12} className="shrink-0" /><span className="truncate text-[11px]">{s.title}</span></div>
                <button onClick={e => deleteSession(s.id, e)} className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-all shrink-0"><Trash2 size={11} /></button>
              </div>
            ))}
        </div>
      </div>

      {/* Chat area */}
      <div className={cn('flex-1 flex flex-col bg-background/50 relative min-w-0', showSessionList ? 'hidden md:flex' : 'flex')}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,255,102,0.02),transparent)] pointer-events-none" />

        {/* Top bar */}
        <div className="p-3 border-b border-border bg-card/10 flex items-center justify-between z-10 gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => setShowSessionList(true)} className="md:hidden p-1.5 border border-border rounded text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors shrink-0"><ChevronLeft size={14} /></button>
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_6px_rgba(0,255,102,0.6)] shrink-0" />
            <span className="font-bold text-xs uppercase truncate">AI_OPS_TERMINAL</span>
            {selectedSession && <><span className="text-muted-foreground/30 hidden md:inline">|</span><span className="text-[10px] text-muted-foreground hidden md:block truncate">{selectedSession.title}</span></>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {saveSuccess && <span className="text-primary text-[10px] animate-pulse">✓ Saved</span>}
            <button onClick={() => setCtfMode(m => !m)} title="CTF Mode" className={cn("hidden sm:flex items-center gap-1 px-2 py-1 text-[10px] rounded border transition-all", ctfMode ? "border-yellow-400/60 text-yellow-400 bg-yellow-400/10" : "border-border text-muted-foreground hover:border-primary/30 hover:text-primary")}>
              <Flag size={9} /> CTF
            </button>
            <div className="hidden sm:flex items-center rounded border border-border overflow-hidden text-[10px]">
              <button onClick={() => setModelMode('best')} title="Best-AI: queries all providers and picks the best answer" className={cn("flex items-center gap-1 px-2 py-1 transition-all", modelMode === 'best' ? "bg-primary/20 text-primary border-r border-primary/30" : "text-muted-foreground hover:text-primary border-r border-border")}><Zap size={9} /> Best</button>
              <button onClick={() => setModelMode('groq')} title="Groq only (streaming)" className={cn("flex items-center gap-1 px-2 py-1 transition-all", modelMode === 'groq' ? "bg-primary/20 text-primary border-r border-primary/30" : "text-muted-foreground hover:text-primary border-r border-border")}>Groq</button>
              <button onClick={() => setModelMode('mistral')} title="Mistral only" className={cn("flex items-center gap-1 px-2 py-1 transition-all", modelMode === 'mistral' ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-primary")}>Mistral</button>
            </div>
            {messages.length > 0 && (
              <button onClick={exportSession} title="Export session as Markdown" className="hidden sm:flex items-center gap-1 px-2 py-1 text-[10px] rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-all">
                <Download size={9} /> Export
              </button>
            )}
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className={cn("h-1.5 w-1.5 rounded-full inline-block", isLoading ? "bg-yellow-400 animate-pulse" : "bg-green-500")} />
              {isLoading ? 'Processing' : 'Ready'}
            </span>
          </div>
        </div>

        {/* Provider processing bar */}
        {isLoading && modelMode === 'best' && processingProviders.length > 0 && (
          <div className="px-4 py-1.5 bg-black/30 border-b border-border/50 flex items-center gap-2 flex-wrap">
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Querying:</span>
            {processingProviders.map(p => (
              <span key={p} className="text-[9px] px-1.5 py-0.5 rounded border border-primary/20 bg-primary/5 text-primary/70 flex items-center gap-1">
                <Loader2 size={7} className="animate-spin" /> {p}
              </span>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 md:p-5 space-y-4 md:space-y-5">
          {messages.length === 0 && !isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 opacity-40 min-h-[300px]">
              <Bot size={40} className="text-primary" />
              <div className="text-center space-y-1.5">
                <p className="font-bold text-primary text-sm tracking-wider">CYBER_SENTINEL_V2.0</p>
                <p className="text-[11px] max-w-xs">{currentSessionId ? 'Session active. Enter your directive.' : 'Create or select a session to begin.'}</p>
                {!currentSessionId && <button onClick={() => createSession()} className="mt-2 px-4 py-2 border border-primary/50 text-primary text-xs rounded hover:bg-primary/10 transition-colors">+ New Session</button>}
              </div>
              {currentSessionId && (
                <div className="grid grid-cols-2 gap-2 max-w-sm w-full opacity-60">
                  {SESSION_TEMPLATES.slice(0, 4).map(t => (
                    <button key={t.label} onClick={() => setInput(t.prompt)} className="text-left px-3 py-2 rounded border border-primary/20 text-[10px] text-primary/70 hover:bg-primary/10 hover:border-primary/40 transition-all">
                      → {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            messages.map(m => (
              <div key={m.id} className={cn('flex gap-2 md:gap-3 w-full group/msg', m.role === 'user' ? 'flex-row-reverse' : '')}>
                <div className={cn('h-7 w-7 rounded flex items-center justify-center border shrink-0 mt-0.5', m.role === 'user' ? 'bg-secondary/60 border-primary/20 text-primary' : 'bg-black border-primary/30 text-primary shadow-[0_0_8px_rgba(0,255,102,0.08)]')}>
                  {m.role === 'user' ? <User size={13} /> : <Bot size={13} />}
                </div>
                <div className={cn('flex flex-col gap-1 min-w-0', m.role === 'user' ? 'items-end max-w-[80%]' : 'items-start max-w-[92%] md:max-w-[85%]')}>
                  <div className={cn('p-3 rounded-lg border break-words w-full',
                    m.isError ? 'bg-red-950/30 border-red-500/30 text-red-400' :
                    m.role === 'user' ? 'bg-secondary/30 border-border text-foreground' : 'bg-black/40 border-primary/15 text-foreground/90'
                  )}>
                    <MessageContent content={m.content} streaming={m.streaming} />
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border/30">
                        {m.attachments.map((a, i) => (
                          <span key={i} className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded border border-primary/20 bg-primary/5 text-primary/50">
                            <Paperclip size={7} /> {a.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {m.toolCards && m.toolCards.length > 0 && !m.streaming && <ToolCards cards={m.toolCards} />}
                  </div>
                  <div className="flex items-center gap-2 px-1 flex-wrap">
                    <span className="text-[10px] text-muted-foreground/40 uppercase">
                      {m.role === 'user' ? 'Operator' : 'Sentinel'}{m.streaming && ' • processing…'}
                    </span>
                    {m.judgeFallback && !m.streaming && (
                      <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded border border-orange-400/30 bg-orange-400/5 text-orange-400/70" title="Best-AI judge failed; answered by fastest single provider">
                        ⚡ stream fallback
                      </span>
                    )}
                    {m.provider && !m.streaming && <ProviderBadge provider={m.provider} reason={m.reason} />}
                    {m.role === 'assistant' && !m.streaming && m.content && (
                      <button onClick={() => openSaveModal(m.content)} className="opacity-0 group-hover/msg:opacity-100 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary border border-transparent hover:border-primary/30 rounded px-1.5 py-0.5 transition-all">
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

        {/* Input area */}
        <div className="p-3 md:p-4 border-t border-border bg-card/5 z-10 shrink-0">
          {ctfMode && (
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <Flag size={10} className="text-yellow-400" />
              <span className="text-[10px] text-yellow-400/80">CTF mode active — responses tuned for capture-the-flag</span>
              <button onClick={() => setCtfMode(false)} className="ml-auto text-[10px] text-muted-foreground hover:text-foreground"><X size={10} /></button>
            </div>
          )}

          {/* Attachment previews */}
          <AttachmentPreview files={attachedFiles} onRemove={removeAttachment} />

          <form onSubmit={sendMessage} className="max-w-4xl mx-auto">
            <div className="relative flex items-center gap-1">
              <div className="absolute left-3 flex items-center pointer-events-none z-10">
                <ChevronRight className="text-primary/60" size={13} />
              </div>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={
                  hasAnalyzing ? 'Analyzing image…' :
                  currentSessionId ? (modelMode === 'best' ? 'Enter directive… Best-AI picks the top answer' : modelMode === 'mistral' ? 'Enter directive… Mistral only' : 'Enter directive… Groq streaming') :
                  'Create a session first…'
                }
                disabled={!currentSessionId || hasAnalyzing}
                className="flex-1 bg-black/50 border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-lg pl-8 pr-3 py-2.5 text-xs md:text-sm focus:outline-none transition-all placeholder:text-muted-foreground/25 font-mono"
              />
              <div className="flex items-center gap-1 shrink-0">
                {/* File attach button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!currentSessionId || isLoading}
                  title="Attach screenshot, image, or text file for analysis"
                  className={cn(
                    "h-8 w-8 rounded border flex items-center justify-center transition-all",
                    attachedFiles.length > 0
                      ? "border-primary/60 text-primary bg-primary/10"
                      : "border-border text-muted-foreground hover:border-primary/30 hover:text-primary disabled:opacity-30"
                  )}
                >
                  <Paperclip size={13} />
                </button>

                {isLoading ? (
                  <button type="button" onClick={stopStreaming} className="h-8 px-2 rounded border border-border text-[10px] text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">stop</button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={enhanceInput}
                      disabled={!input.trim() || isEnhancing || isLoading}
                      title="Enhance prompt — rewrites your query into a precise pentesting question"
                      className={cn("h-8 px-2 rounded border text-[10px] flex items-center gap-1 transition-all",
                        input.trim() && !isEnhancing ? "border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/10" : "border-border text-muted-foreground/30 cursor-not-allowed"
                      )}
                    >
                      {isEnhancing ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />} ✨
                    </button>
                    <button
                      type="submit"
                      disabled={!input.trim() || !currentSessionId || hasAnalyzing}
                      className="h-8 px-3 rounded bg-primary text-black text-[10px] font-bold hover:bg-primary/80 disabled:opacity-30 flex items-center gap-1 transition-all"
                    >
                      <Send size={10} /> Send
                    </button>
                  </>
                )}
              </div>
            </div>
            {attachedFiles.length > 0 && (
              <p className="text-[9px] text-muted-foreground/40 mt-1.5 px-1">
                {attachedFiles.filter(f => f.analyzing).length > 0
                  ? `Processing ${attachedFiles.filter(f => f.analyzing).length} file(s)…`
                  : `${attachedFiles.filter(f => !f.error).length} file(s) attached — analysis will be included in your message.`
                }
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
