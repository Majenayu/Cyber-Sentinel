import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Briefcase,
  Eye,
  Mic,
  MicOff,
  ExternalLink,
  ThumbsUp,
  X,
  Plus,
  Trash2,
  Bot,
  User,
  Loader2,
  Send,
  Building2,
  Zap,
  Radio,
  Search,
  SlidersHorizontal,
  Download,
  Volume2,
  VolumeX,
  Pause,
  Play,
  RefreshCw,
} from "lucide-react";

// ── Types & API ────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "" : "http://localhost:5000");

interface Job {
  _id: string;
  title: string;
  company: string;
  description: string;
  link: string;
  relevanceScore: number;
  status: "applied" | "liked" | "rejected" | null;
  createdAt: string;
}

interface Watcher {
  _id: string;
  url: string;
  companyName?: string;
  targetRole: string;
  atsType?: string;
  negativeKeywords?: string[];
}

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
}

const api = {
  getMatches: () => fetch(`${API_BASE}/api/matches`).then(r => r.json()),
  getWatchers: () => fetch(`${API_BASE}/api/watchers`).then(r => r.json()),
  addWatcher: (data: { url?: string; company?: string; targetRole?: string }) =>
    fetch(`${API_BASE}/api/watchers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(async (r) => {
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed to add watcher");
      return data;
    }),
  deleteWatcher: (id: string) => fetch(`${API_BASE}/api/watchers/${id}`, { method: 'DELETE' }).then(r => r.json()),
  sendFeedback: (id: string, isPositive: boolean, reason: string) => fetch(`${API_BASE}/api/matches/${id}/feedback`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isPositive, reason })
  }).then(r => r.json()),
  voiceCommand: (text: string) => fetch(`${API_BASE}/api/voice-command`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text })
  }).then(r => r.json()),
  cleanupJunk: () => fetch(`${API_BASE}/api/cleanup-junk`, { method: 'POST' }).then(r => r.json()),
  getDailyBriefing: () => fetch(`${API_BASE}/api/daily-briefing`).then(r => r.json()),
  getVapidKey: () => fetch(`${API_BASE}/api/vapid-public-key`).then(r => r.json()),
  pushSubscribe: (sub: PushSubscription) => fetch(`${API_BASE}/api/push-subscribe`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub.toJSON())
  }).then(r => r.json()),
  scanNow: () => fetch(`${API_BASE}/api/scan-now`, { method: 'POST' }).then(r => r.json()),
};

// ── Shared glass styles ────────────────────────────────────────────────────────

const glass: React.CSSProperties = {
  background: "rgba(22, 33, 62, 0.75)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.3)",
};

const glassInput: React.CSSProperties = {
  background: "rgba(10, 15, 30, 0.6)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  color: "#e2e8f0",
  outline: "none",
};

function scoreColor(score: number) {
  if (score >= 90)
    return { text: "#10b981", bg: "rgba(16,185,129,0.12)", bd: "rgba(16,185,129,0.35)" };
  if (score >= 80)
    return { text: "#6366f1", bg: "rgba(99,102,241,0.12)", bd: "rgba(99,102,241,0.35)" };
  return { text: "#f59e0b", bg: "rgba(245,158,11,0.12)", bd: "rgba(245,158,11,0.35)" };
}

// ── Push Notification Helper ───────────────────────────────────────────────────
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
  return arr;
}

// ── Root ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab] = useState<"jobs" | "watchers" | "assistant">("jobs");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [watchers, setWatchers] = useState<Watcher[]>([]);
  const [watcherInput, setWatcherInput] = useState("");
  const [watcherRole, setWatcherRole] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: "assistant", content: "Hi, I'm Sunday Mac 47. Tell me a company name (like Stripe or Microsoft) or say 'watch Software Engineer at Google' — I'll find their careers page and monitor it for you." }
  ]);
  const [textInput, setTextInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [addingWatcher, setAddingWatcher] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCompany, setFilterCompany] = useState("all");
  const [minRelevance, setMinRelevance] = useState(60);
  const [sortBy, setSortBy] = useState<"relevance" | "date">("relevance");

  // PWA install
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [pushEnabled, setPushEnabled] = useState(false);

  // Voice readout
  const [isReading, setIsReading] = useState(false);
  const [readingPaused, setReadingPaused] = useState(false);
  const [readoutTranscript, setReadoutTranscript] = useState<string[]>([]);
  const [showReadout, setShowReadout] = useState(false);

  const loadData = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const [m, w] = await Promise.all([api.getMatches(), api.getWatchers()]);
      setJobs(m.map((job: any) => ({
        ...job,
        status: (job.feedback?.status === 'pending' || !job.feedback) ? null : (job.feedback?.status === 'positive' ? 'liked' : 'rejected')
      })));
      setWatchers(w);
    } catch (e) {
      console.error("Data load failed", e);
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Live WebSocket sync
    let ws: WebSocket;
    try {
      ws = new WebSocket(API_BASE.replace('http', 'ws'));
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'NEW_JOBS' || data.type === 'SYNC') {
          loadData();
        }
      };
    } catch (e) { console.warn("WebSocket failed:", e); }

    // PWA install prompt
    const handler = (e: any) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);

    // Service worker push messages (daily briefing auto-read)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'DAILY_BRIEFING' || event.data?.type === 'READ_ALOUD') {
          readJobsAloud(event.data.jobs);
        }
      });
    }

    return () => {
      ws?.close();
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [loadData]);

  // Subscribe to push notifications
  useEffect(() => {
    (async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (existing) { setPushEnabled(true); return; }
      } catch (e) { console.warn("Push check failed:", e); }
    })();
  }, []);

  const enablePush = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await api.getVapidKey();
      if (!publicKey) { alert("Push not configured on server"); return; }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await api.pushSubscribe(sub);
      setPushEnabled(true);
    } catch (e) {
      console.error("Push subscribe failed:", e);
    }
  };

  const installApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') setInstallPrompt(null);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleJobAction = useCallback(async (id: string, action: Job["status"]) => {
    setJobs(prev =>
      prev.map(j => (j._id === id ? { ...j, status: action } : j))
    );
    if (action === 'liked') {
      await api.sendFeedback(id, true, "Interested");
    } else if (action === 'rejected') {
      await api.sendFeedback(id, false, "Manual rejection from dashboard");
    }
  }, []);

  const addWatcher = async () => {
    if (!watcherInput.trim()) return;
    setAddingWatcher(true);
    try {
      const payload: { url?: string; company?: string; targetRole?: string } = {};
      const input = watcherInput.trim();
      if (/^https?:\/\//i.test(input) || /^[\w.-]+\.[a-z]{2,}/i.test(input)) {
        payload.url = input;
      } else {
        payload.company = input;
      }
      if (watcherRole.trim()) payload.targetRole = watcherRole.trim();
      const newWatcher = await api.addWatcher(payload);
      setWatchers(prev => [newWatcher, ...prev]);
      setWatcherInput("");
      setWatcherRole("");
      loadData();
    } catch (e) {
      console.error("Add watcher failed", e);
    } finally {
      setAddingWatcher(false);
    }
  };

  const removeWatcher = async (id: string) => {
    try {
      await api.deleteWatcher(id);
      setWatchers(prev => prev.filter(w => w._id !== id));
    } catch (e) {
      console.error("Delete watcher failed", e);
    }
  };

  // ── Voice Readout ──────────────────────────────────────────────────────────
  const readJobsAloud = useCallback((briefingJobs: any[]) => {
    if (!('speechSynthesis' in window) || briefingJobs.length === 0) return;
    window.speechSynthesis.cancel();
    setIsReading(true);
    setReadingPaused(false);
    setShowReadout(true);
    setReadoutTranscript([]);

    const lines: string[] = [
      "Good morning! Here is your daily job briefing from Sunday Mac 47.",
    ];
    briefingJobs.forEach((job, i) => {
      lines.push(`Job ${i + 1}: ${job.title} at ${job.company}. Match score: ${job.relevanceScore} percent.`);
    });
    lines.push("That's all for today. Good luck with your applications!");

    let index = 0;
    const speakNext = () => {
      if (index >= lines.length) {
        setIsReading(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(lines[index]);
      utterance.rate = 0.95;
      utterance.pitch = 1;
      setReadoutTranscript(prev => [...prev, lines[index]]);
      utterance.onend = () => { index++; speakNext(); };
      utterance.onerror = () => { index++; speakNext(); };
      window.speechSynthesis.speak(utterance);
    };
    speakNext();
  }, []);

  const toggleReadPause = () => {
    if (readingPaused) {
      window.speechSynthesis.resume();
      setReadingPaused(false);
    } else {
      window.speechSynthesis.pause();
      setReadingPaused(true);
    }
  };

  const stopReading = () => {
    window.speechSynthesis.cancel();
    setIsReading(false);
    setReadingPaused(false);
  };

  const triggerBriefing = async () => {
    try {
      const briefing = await api.getDailyBriefing();
      readJobsAloud(briefing);
    } catch (e) {
      console.error("Briefing failed:", e);
    }
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now(), role: "user", content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);
    try {
      const data = await api.voiceCommand(text);
      setMessages(prev => [
        ...prev,
        { id: Date.now() + 1, role: "assistant", content: data.reply },
      ]);
      loadData();
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(data.reply);
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      setMessages(prev => [
        ...prev,
        { id: Date.now() + 1, role: "assistant", content: "Sorry, I had trouble connecting to the server." },
      ]);
    } finally {
      setIsProcessing(false);
    }
  }, [loadData]);

  const toggleListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      const r = new SR();
      r.continuous = false;
      r.interimResults = false;
      r.onstart = () => setIsListening(true);
      r.onend = () => setIsListening(false);
      r.onresult = (e: any) => sendMessage(e.results[0][0].transcript);
      r.start();
      recognitionRef.current = r;
    }
  }, [isListening, sendMessage]);

  // ── Filter logic ───────────────────────────────────────────────────────────
  const companies = [...new Set(jobs.map(j => j.company))].sort();
  const filteredJobs = jobs
    .filter(j => {
      if (j.status === 'rejected') return false;
      if (filterCompany !== "all" && j.company !== filterCompany) return false;
      if (j.relevanceScore < minRelevance) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!j.title.toLowerCase().includes(q) && !j.company.toLowerCase().includes(q) && !j.description.toLowerCase().includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "relevance") return b.relevanceScore - a.relevanceScore;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const tabs = [
    { id: "jobs" as const, label: "Jobs", Icon: Briefcase },
    { id: "watchers" as const, label: "Watchers", Icon: Eye },
    { id: "assistant" as const, label: "Assistant", Icon: Radio },
  ];

  return (
    <div
      className="w-full h-screen overflow-hidden flex flex-col"
      style={{
        background: "#0a0f1e",
        fontFamily: "'Outfit', sans-serif",
        position: "relative",
      }}
    >
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-20%", left: "-15%", width: "65%", height: "65%", background: "radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "-20%", right: "-15%", width: "65%", height: "65%", background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)" }} />
      </div>

      {/* Voice Readout Overlay */}
      <AnimatePresence>
        {showReadout && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)" }}
          >
            <div className="max-w-lg w-full rounded-3xl p-8" style={glass}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.4)" }}>
                  <Volume2 size={22} color="#10b981" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: "#e2e8f0" }}>Daily Job Briefing</h2>
                  <p className="text-xs" style={{ color: "#475569" }}>{isReading ? (readingPaused ? "Paused" : "Reading aloud...") : "Complete"}</p>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto mb-6 space-y-2" style={{ scrollbarWidth: "thin" }}>
                {readoutTranscript.map((line, i) => (
                  <p key={i} className="text-sm" style={{ color: i === readoutTranscript.length - 1 ? "#e2e8f0" : "#64748b" }}>{line}</p>
                ))}
              </div>

              <div className="flex items-center gap-3">
                {isReading && (
                  <button onClick={toggleReadPause} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "rgba(99,102,241,0.2)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }}>
                    {readingPaused ? <><Play size={14} /> Resume</> : <><Pause size={14} /> Pause</>}
                  </button>
                )}
                <button onClick={() => { stopReading(); setShowReadout(false); }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>
                  <X size={14} /> {isReading ? "Stop" : "Close"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="flex-shrink-0 relative z-20 px-4 sm:px-6 py-3" style={{ ...glass, borderRadius: 0, borderTop: "none", borderLeft: "none", borderRight: "none" }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.18)", border: "1px solid rgba(99,102,241,0.4)" }}>
              <Zap size={15} color="#818cf8" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-none" style={{ color: "#e2e8f0" }}>Sunday Mac 47</div>
              <div className="text-xs mt-0.5" style={{ color: "#475569" }}>AI Job Navigator</div>
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "rgba(10,15,30,0.7)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {tabs.map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)} className="relative flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200" style={{ color: activeTab === id ? "#ffffff" : "#4b5563" }}>
                {activeTab === id && <motion.div layoutId="nav-pill" className="absolute inset-0 rounded-lg" style={{ background: "rgba(99,102,241,0.22)", border: "1px solid rgba(99,102,241,0.38)" }} transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
                <Icon size={13} className="relative z-10" />
                <span className="relative z-10 hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {installPrompt && (
              <button onClick={installApp} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>
                <Download size={12} /> Install
              </button>
            )}
            {!pushEnabled && (
              <button onClick={enablePush} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
                <Volume2 size={12} /> Enable Alerts
              </button>
            )}
            <button onClick={triggerBriefing} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }}>
              <Volume2 size={12} /> Briefing
            </button>
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#10b981", boxShadow: "0 0 6px rgba(16,185,129,0.7)" }} />
            <span className="text-xs" style={{ color: "#475569" }}>{watchers.length} live</span>
          </div>
        </div>
      </nav>

      <div className="flex-1 relative z-10 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === "jobs" && (
            <JobsTab key="jobs" jobs={filteredJobs} allJobs={jobs} loading={loadingJobs} onAction={handleJobAction}
              searchQuery={searchQuery} onSearch={setSearchQuery} filterCompany={filterCompany} onFilterCompany={setFilterCompany}
              minRelevance={minRelevance} onMinRelevance={setMinRelevance} sortBy={sortBy} onSort={setSortBy}
              companies={companies} onCleanup={async () => { await api.cleanupJunk(); loadData(); }} onScanNow={async () => { await api.scanNow(); loadData(); }} />
          )}
          {activeTab === "watchers" && (
            <WatchersTab key="watchers" watchers={watchers} input={watcherInput} role={watcherRole}
              adding={addingWatcher} onInputChange={setWatcherInput} onRoleChange={setWatcherRole} onAdd={addWatcher} onRemove={removeWatcher} />
          )}
          {activeTab === "assistant" && (
            <AssistantTab key="assistant" messages={messages} isListening={isListening} isProcessing={isProcessing}
              textInput={textInput} onTextChange={setTextInput} onSend={() => { sendMessage(textInput); setTextInput(""); }}
              onToggleListen={toggleListening} messagesEndRef={messagesEndRef} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Components ────────────────────────────────────────────────────────────────

function JobsTab({ jobs, allJobs, loading, onAction, searchQuery, onSearch, filterCompany, onFilterCompany, minRelevance, onMinRelevance, sortBy, onSort, companies, onCleanup, onScanNow }: any) {
  const [showFilters, setShowFilters] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="h-full overflow-y-auto px-4 sm:px-6 py-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: "#e2e8f0" }}>Matched Jobs</h1>
            <p className="text-sm mt-0.5" style={{ color: "#475569" }}>{jobs.length} of {allJobs.length} shown · AI ranked</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onScanNow} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium" style={{ background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" }}>
              <RefreshCw size={12} /> Scan Now
            </button>
            <button onClick={onCleanup} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium" style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}>
              <Trash2 size={12} /> Cleanup
            </button>
            <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium" style={{ background: showFilters ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.08)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.25)" }}>
              <SlidersHorizontal size={12} /> Filters
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2 mb-3 rounded-xl px-4 py-2.5" style={glass}>
          <Search size={14} color="#475569" />
          <input type="text" placeholder="Search jobs by title, company, or description..." value={searchQuery} onChange={e => onSearch(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm" style={{ color: "#e2e8f0" }} />
          {searchQuery && <button onClick={() => onSearch("")}><X size={14} color="#475569" /></button>}
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
              <div className="rounded-2xl p-5" style={glass}>
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[180px]">
                    <label className="text-xs font-medium mb-1.5 block" style={{ color: "#64748b" }}>Company</label>
                    <select value={filterCompany} onChange={e => onFilterCompany(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ ...glassInput, appearance: "auto" as any }}>
                      <option value="all">All Companies</option>
                      {companies.map((c: string) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <label className="text-xs font-medium mb-1.5 block" style={{ color: "#64748b" }}>Min Relevance: {minRelevance}%</label>
                    <input type="range" min={50} max={100} value={minRelevance} onChange={e => onMinRelevance(Number(e.target.value))} className="w-full accent-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-xs font-medium mb-1.5 block" style={{ color: "#64748b" }}>Sort By</label>
                    <div className="flex gap-1">
                      <button onClick={() => onSort("relevance")} className="flex-1 px-3 py-2 rounded-lg text-xs font-medium" style={{ background: sortBy === "relevance" ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.05)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)" }}>Score</button>
                      <button onClick={() => onSort("date")} className="flex-1 px-3 py-2 rounded-lg text-xs font-medium" style={{ background: sortBy === "date" ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.05)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)" }}>Newest</button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 gap-4">
            <Loader2 size={28} className="animate-spin" style={{ color: "#6366f1" }} />
            <span className="text-sm" style={{ color: "#475569" }}>Gathering matches...</span>
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 gap-4">
            <Briefcase size={32} style={{ color: "#374151" }} />
            <p className="text-sm" style={{ color: "#475569" }}>No jobs match your filters. Try widening your search.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {jobs.map((job: any, i: number) => (
              <JobCard key={job._id} job={job} index={i} onAction={onAction} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function JobCard({ job, index, onAction }: any) {
  const sc = scoreColor(job.relevanceScore);
  const rejected = job.status === "rejected";
  return (
    <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: rejected ? 0.3 : 1, y: 0 }} className="rounded-2xl p-5" style={{ ...glass }}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.28)", color: "#818cf8" }}>
          {job.company.substring(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-base leading-snug" style={{ color: "#e2e8f0" }}>{job.title}</h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                <span className="flex items-center gap-1 text-sm" style={{ color: "#94a3b8" }}><Building2 size={11} />{job.company}</span>
              </div>
            </div>
            <div className="flex-shrink-0 px-3 py-2 rounded-xl text-center" style={{ background: sc.bg, border: `1px solid ${sc.bd}` }}>
              <div className="text-base font-bold leading-none" style={{ color: sc.text }}>{job.relevanceScore}%</div>
              <div className="text-xs mt-0.5" style={{ color: sc.text, opacity: 0.65 }}>match</div>
            </div>
          </div>
          <p className="text-sm mt-3" style={{ color: "#94a3b8", lineHeight: 1.5 }}>{job.description}</p>
          <div className="flex items-center gap-2 mt-4">
            <ActionBtn onClick={() => window.open(job.link, '_blank')} active={job.status === "applied"} variant="primary" icon={<ExternalLink size={12} />} label="Apply" />
            <ActionBtn onClick={() => onAction(job._id, "liked")} active={job.status === "liked"} variant="success" icon={<ThumbsUp size={12} />} label="Save" />
            <div className="ml-auto">
              <ActionBtn onClick={() => onAction(job._id, "rejected")} active={job.status === "rejected"} variant="danger" icon={<X size={12} />} label="Reject" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function WatchersTab({ watchers, input, role, adding, onInputChange, onRoleChange, onAdd, onRemove }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="h-full overflow-y-auto px-4 sm:px-6 py-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold mb-2" style={{ color: "#e2e8f0" }}>Job Watchers</h1>
        <p className="text-sm mb-6" style={{ color: "#475569" }}>
          Enter a company name (e.g. Stripe, Microsoft) or a careers URL. Leave role empty to monitor all postings.
        </p>
        <div className="rounded-2xl p-6 mb-7" style={glass}>
          <div className="flex flex-wrap gap-3">
            <input type="text" placeholder="Company name or careers URL" value={input} onChange={e => onInputChange(e.target.value)}
              onKeyDown={e => e.key === "Enter" && onAdd()} style={glassInput} className="flex-1 min-w-[200px] px-4 py-2.5 rounded-xl text-sm" />
            <input type="text" placeholder="Target role (optional — all jobs)" value={role} onChange={e => onRoleChange(e.target.value)}
              onKeyDown={e => e.key === "Enter" && onAdd()} style={glassInput} className="flex-1 min-w-[160px] px-4 py-2.5 rounded-xl text-sm" />
            <button onClick={onAdd} disabled={adding || !input.trim()}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-50"
              style={{ background: "rgba(99,102,241,0.85)" }}>
              {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {adding ? "Resolving..." : "Add Watcher"}
            </button>
          </div>
        </div>
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
          {watchers.map((w: any) => (
            <div key={w._id} className="flex items-center justify-between p-4 rounded-2xl" style={glass}>
              <div className="min-w-0 pr-3">
                <p className="font-semibold text-sm" style={{ color: "#e2e8f0" }}>
                  {w.companyName || w.url}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
                  {w.targetRole === "*" || !w.targetRole ? "All roles" : w.targetRole}
                  {w.atsType ? ` · ${w.atsType}` : ""}
                </p>
                <p className="text-xs mt-1 truncate" style={{ color: "#64748b" }}>{w.url}</p>
              </div>
              <button onClick={() => onRemove(w._id)} className="text-slate-600 hover:text-red-500 transition-colors flex-shrink-0"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function AssistantTab({ messages, isListening, isProcessing, textInput, onTextChange, onSend, onToggleListen, messagesEndRef }: any) {
  return (
    <div className="h-full flex flex-col max-w-3xl mx-auto px-4 sm:px-6">
      <div className="flex-1 overflow-y-auto py-8" style={{ scrollbarWidth: "none" }}>
        <div className="flex flex-col gap-4">
          {messages.map((m: any) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[85%] p-4 rounded-2xl" style={{ ...glass, background: m.role === 'user' ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)' }}>
                <p className="text-sm leading-relaxed" style={{ color: "#cbd5e1" }}>{m.content}</p>
              </div>
            </div>
          ))}
          {isProcessing && <Loader2 size={18} className="animate-spin text-slate-600" />}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="pb-8">
        <div className="flex items-center gap-3 p-2 rounded-2xl" style={glass}>
          <button onClick={onToggleListen} className={`p-3 rounded-xl transition-all ${isListening ? 'bg-emerald-500/20 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-slate-800/40 text-slate-400'}`}>
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <input type="text" placeholder="Ask Sunday Mac 47 anything..." value={textInput} onChange={e => onTextChange(e.target.value)} onKeyDown={e => e.key === 'Enter' && onSend()}
            className="flex-1 bg-transparent border-none outline-none text-sm text-slate-200 py-2" />
          <button onClick={onSend} className="p-3 bg-indigo-500 text-white rounded-xl"><Send size={18} /></button>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ onClick, active, variant, icon, label }: any) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all"
      style={{ background: active ? '#6366f1' : 'rgba(99,102,241,0.05)', color: active ? '#fff' : '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
      {icon}{label}
    </button>
  );
}
