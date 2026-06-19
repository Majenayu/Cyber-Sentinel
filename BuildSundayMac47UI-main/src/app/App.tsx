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
  MapPin,
  DollarSign,
  Clock,
  Zap,
  Radio,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  salary: string;
  matchScore: number;
  posted: string;
  tags: string[];
  status: "applied" | "liked" | "rejected" | null;
  logo: string;
}

interface Watcher {
  id: number;
  url: string;
  role: string;
}

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
}

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

// ── Mock data ──────────────────────────────────────────────────────────────────

const MOCK_JOBS: Job[] = [
  {
    id: 1,
    title: "Senior Frontend Engineer",
    company: "Vercel",
    location: "Remote",
    salary: "$160k – $220k",
    matchScore: 94,
    posted: "2h ago",
    tags: ["React", "TypeScript", "Next.js", "Tailwind"],
    status: null,
    logo: "V",
  },
  {
    id: 2,
    title: "Staff Software Engineer",
    company: "Linear",
    location: "San Francisco, CA",
    salary: "$200k – $280k",
    matchScore: 91,
    posted: "5h ago",
    tags: ["React", "Node.js", "GraphQL", "TypeScript"],
    status: null,
    logo: "Li",
  },
  {
    id: 3,
    title: "Frontend Platform Engineer",
    company: "Stripe",
    location: "Remote",
    salary: "$180k – $250k",
    matchScore: 88,
    posted: "1d ago",
    tags: ["React", "TypeScript", "Performance", "CI/CD"],
    status: null,
    logo: "St",
  },
  {
    id: 4,
    title: "Lead UI Engineer",
    company: "Figma",
    location: "New York, NY",
    salary: "$170k – $240k",
    matchScore: 85,
    posted: "1d ago",
    tags: ["React", "Canvas API", "WebGL", "TypeScript"],
    status: null,
    logo: "Fi",
  },
  {
    id: 5,
    title: "Principal Engineer, Design Systems",
    company: "Shopify",
    location: "Remote",
    salary: "$190k – $270k",
    matchScore: 79,
    posted: "2d ago",
    tags: ["React", "Design Systems", "Accessibility", "CSS"],
    status: null,
    logo: "Sh",
  },
  {
    id: 6,
    title: "Senior React Engineer",
    company: "Notion",
    location: "San Francisco, CA",
    salary: "$155k – $210k",
    matchScore: 76,
    posted: "3d ago",
    tags: ["React", "TypeScript", "Real-time", "Collaboration"],
    status: null,
    logo: "No",
  },
];

const INITIAL_WATCHERS: Watcher[] = [
  { id: 1, url: "linkedin.com/jobs", role: "Senior Frontend Engineer" },
  { id: 2, url: "greenhouse.io", role: "Staff Engineer" },
  { id: 3, url: "lever.co", role: "Lead UI Engineer" },
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: 1,
    role: "assistant",
    content:
      "Hi, I'm Sunday Mac 47. I can help you find jobs, summarize listings, and give you career advice. Tap the mic or type below.",
  },
];

function getAIResponse(query: string): string {
  const q = query.toLowerCase();
  if (q.includes("job") || q.includes("match") || q.includes("listing"))
    return "You have 6 matched jobs. Your top match is Senior Frontend Engineer at Vercel with a 94% score. Want me to help you craft an application?";
  if (q.includes("apply") || q.includes("cover") || q.includes("application"))
    return "I can draft a tailored cover letter. Based on your profile, I'd highlight React architecture expertise and TypeScript performance optimization. Shall I start with Vercel?";
  if (q.includes("salary") || q.includes("pay") || q.includes("comp"))
    return "Market data shows Senior Frontend Engineers earn $160k–$240k for remote roles in 2026. Your profile aligns with the upper quartile — I'd recommend a floor of $185k.";
  if (q.includes("watch") || q.includes("monitor") || q.includes("alert"))
    return "You have 3 active watchers on LinkedIn, Greenhouse, and Lever. In the past 24 hours I found 12 new listings matching your criteria. Want me to filter by match score?";
  if (q.includes("interview") || q.includes("prep"))
    return "For Senior Frontend roles, focus on: React rendering optimization, system design for web apps, and TypeScript type safety patterns. Want a mock interview session?";
  return "Got it. Based on your profile and current market conditions, I recommend targeting Series B+ product companies with strong engineering cultures. Should I refine your active watchers?";
}

function scoreColor(score: number) {
  if (score >= 90)
    return { text: "#10b981", bg: "rgba(16,185,129,0.12)", bd: "rgba(16,185,129,0.35)" };
  if (score >= 80)
    return { text: "#6366f1", bg: "rgba(99,102,241,0.12)", bd: "rgba(99,102,241,0.35)" };
  return { text: "#f59e0b", bg: "rgba(245,158,11,0.12)", bd: "rgba(245,158,11,0.35)" };
}

// ── Root ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab] = useState<"jobs" | "watchers" | "assistant">("jobs");
  const [jobs, setJobs] = useState<Job[]>(MOCK_JOBS);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [watchers, setWatchers] = useState<Watcher[]>(INITIAL_WATCHERS);
  const [watcherUrl, setWatcherUrl] = useState("");
  const [watcherRole, setWatcherRole] = useState("");
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [textInput, setTextInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const t = setTimeout(() => setLoadingJobs(false), 1100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleJobAction = useCallback((id: number, action: Job["status"]) => {
    setJobs(prev =>
      prev.map(j => (j.id === id ? { ...j, status: j.status === action ? null : action } : j))
    );
  }, []);

  const addWatcher = () => {
    if (!watcherUrl.trim() || !watcherRole.trim()) return;
    setWatchers(prev => [
      ...prev,
      { id: Date.now(), url: watcherUrl.trim(), role: watcherRole.trim() },
    ]);
    setWatcherUrl("");
    setWatcherRole("");
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now(), role: "user", content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);
    try {
      let reply = getAIResponse(text);
      try {
        const res = await fetch("http://localhost:5000/api/voice-command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: text }),
          signal: AbortSignal.timeout(2500),
        });
        if (res.ok) {
          const data = await res.json();
          reply = data.response ?? reply;
        }
      } catch {
        /* use mock */
      }
      await new Promise(r => setTimeout(r, 700));
      setMessages(prev => [
        ...prev,
        { id: Date.now() + 1, role: "assistant", content: reply },
      ]);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const toggleListening = useCallback(() => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      sendMessage("Voice recognition is not supported in this browser. Please type your query.");
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const r = new SR();
    r.continuous = false;
    r.interimResults = false;
    r.lang = "en-US";
    r.onstart = () => setIsListening(true);
    r.onend = () => setIsListening(false);
    r.onerror = () => setIsListening(false);
    r.onresult = (e: any) => sendMessage(e.results[0][0].transcript);
    r.start();
    recognitionRef.current = r;
  }, [isListening, sendMessage]);

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
      {/* Ambient radial gradients */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-20%",
            left: "-15%",
            width: "65%",
            height: "65%",
            background:
              "radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-20%",
            right: "-15%",
            width: "65%",
            height: "65%",
            background:
              "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Navigation */}
      <nav
        className="flex-shrink-0 relative z-20 px-6 py-3"
        style={{
          ...glass,
          borderRadius: 0,
          borderTop: "none",
          borderLeft: "none",
          borderRight: "none",
        }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: "rgba(99,102,241,0.18)",
                border: "1px solid rgba(99,102,241,0.4)",
              }}
            >
              <Zap size={15} color="#818cf8" />
            </div>
            <div>
              <div
                className="text-sm font-semibold leading-none"
                style={{ color: "#e2e8f0" }}
              >
                Sunday Mac 47
              </div>
              <div className="text-xs mt-0.5" style={{ color: "#475569" }}>
                AI Job Navigator
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div
            className="flex items-center gap-1 p-1 rounded-xl"
            style={{
              background: "rgba(10,15,30,0.7)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {tabs.map(({ id, label, Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className="relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                  style={{ color: active ? "#ffffff" : "#4b5563" }}
                >
                  {active && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-lg"
                      style={{
                        background: "rgba(99,102,241,0.22)",
                        border: "1px solid rgba(99,102,241,0.38)",
                      }}
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <Icon size={13} className="relative z-10" />
                  <span className="relative z-10">{label}</span>
                </button>
              );
            })}
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{
                background: "#10b981",
                boxShadow: "0 0 6px rgba(16,185,129,0.7)",
                animation: "pulse 2s ease-in-out infinite",
              }}
            />
            <span className="text-xs" style={{ color: "#475569" }}>
              {watchers.length} watchers live
            </span>
          </div>
        </div>
      </nav>

      {/* Page body */}
      <div className="flex-1 relative z-10 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === "jobs" && (
            <JobsTab
              key="jobs"
              jobs={jobs}
              loading={loadingJobs}
              onAction={handleJobAction}
            />
          )}
          {activeTab === "watchers" && (
            <WatchersTab
              key="watchers"
              watchers={watchers}
              url={watcherUrl}
              role={watcherRole}
              onUrlChange={setWatcherUrl}
              onRoleChange={setWatcherRole}
              onAdd={addWatcher}
              onRemove={id => setWatchers(prev => prev.filter(w => w.id !== id))}
            />
          )}
          {activeTab === "assistant" && (
            <AssistantTab
              key="assistant"
              messages={messages}
              isListening={isListening}
              isProcessing={isProcessing}
              textInput={textInput}
              onTextChange={setTextInput}
              onSend={() => {
                sendMessage(textInput);
                setTextInput("");
              }}
              onToggleListen={toggleListening}
              messagesEndRef={messagesEndRef}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Jobs Tab ───────────────────────────────────────────────────────────────────

function JobsTab({
  jobs,
  loading,
  onAction,
}: {
  jobs: Job[];
  loading: boolean;
  onAction: (id: number, action: Job["status"]) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.28 }}
      className="h-full overflow-y-auto px-6 py-6"
      style={{ scrollbarWidth: "none" }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: "#e2e8f0" }}>
              Matched Jobs
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "#475569" }}>
              {jobs.filter(j => j.status !== "rejected").length} active · sorted by match score
            </p>
          </div>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.22)",
              color: "#10b981",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full inline-block"
              style={{ background: "#10b981", boxShadow: "0 0 5px rgba(16,185,129,0.6)" }}
            />
            Live monitoring
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 gap-4">
            <Loader2 size={28} className="animate-spin" style={{ color: "#6366f1" }} />
            <span className="text-sm" style={{ color: "#475569" }}>
              Fetching your matches…
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {jobs.map((job, i) => (
              <JobCard key={job.id} job={job} index={i} onAction={onAction} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function JobCard({
  job,
  index,
  onAction,
}: {
  job: Job;
  index: number;
  onAction: (id: number, action: Job["status"]) => void;
}) {
  const sc = scoreColor(job.matchScore);
  const rejected = job.status === "rejected";

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: rejected ? 0.3 : 1, y: 0 }}
      transition={{ duration: 0.42, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl p-5"
      style={{ ...glass, filter: rejected ? "grayscale(0.5)" : "none" }}
    >
      <div className="flex items-start gap-4">
        {/* Company logotype */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold"
          style={{
            background: "rgba(99,102,241,0.15)",
            border: "1px solid rgba(99,102,241,0.28)",
            color: "#818cf8",
            letterSpacing: "0.02em",
          }}
        >
          {job.logo}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-base leading-snug" style={{ color: "#e2e8f0" }}>
                {job.title}
              </h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                <span className="flex items-center gap-1 text-sm" style={{ color: "#94a3b8" }}>
                  <Building2 size={11} />
                  {job.company}
                </span>
                <span className="flex items-center gap-1 text-sm" style={{ color: "#94a3b8" }}>
                  <MapPin size={11} />
                  {job.location}
                </span>
                <span className="flex items-center gap-1 text-sm" style={{ color: "#94a3b8" }}>
                  <DollarSign size={11} />
                  {job.salary}
                </span>
                <span className="flex items-center gap-1 text-xs" style={{ color: "#374151" }}>
                  <Clock size={10} />
                  {job.posted}
                </span>
              </div>
            </div>

            {/* Match badge */}
            <div
              className="flex-shrink-0 px-3 py-2 rounded-xl text-center"
              style={{ background: sc.bg, border: `1px solid ${sc.bd}`, minWidth: 62 }}
            >
              <div className="text-base font-bold leading-none" style={{ color: sc.text }}>
                {job.matchScore}%
              </div>
              <div className="text-xs mt-0.5" style={{ color: sc.text, opacity: 0.65 }}>
                match
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {job.tags.map(t => (
              <span
                key={t}
                className="px-2 py-0.5 rounded-md text-xs"
                style={{
                  background: "rgba(99,102,241,0.08)",
                  border: "1px solid rgba(99,102,241,0.18)",
                  color: "#818cf8",
                }}
              >
                {t}
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4">
            <ActionBtn
              onClick={() => onAction(job.id, "applied")}
              active={job.status === "applied"}
              variant="primary"
              icon={<ExternalLink size={12} />}
              label={job.status === "applied" ? "Applied" : "Apply"}
            />
            <ActionBtn
              onClick={() => onAction(job.id, "liked")}
              active={job.status === "liked"}
              variant="success"
              icon={<ThumbsUp size={12} />}
              label="Save"
            />
            <div className="ml-auto">
              <ActionBtn
                onClick={() => onAction(job.id, "rejected")}
                active={job.status === "rejected"}
                variant="danger"
                icon={<X size={12} />}
                label="Dismiss"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ActionBtn({
  onClick,
  active,
  variant,
  icon,
  label,
}: {
  onClick: () => void;
  active: boolean;
  variant: "primary" | "success" | "danger";
  icon: React.ReactNode;
  label: string;
}) {
  const map = {
    primary: {
      bg: active ? "#6366f1" : "rgba(99,102,241,0.12)",
      color: active ? "#fff" : "#818cf8",
      border: "rgba(99,102,241,0.38)",
    },
    success: {
      bg: active ? "rgba(16,185,129,0.18)" : "transparent",
      color: active ? "#10b981" : "#374151",
      border: active ? "rgba(16,185,129,0.45)" : "rgba(255,255,255,0.08)",
    },
    danger: {
      bg: active ? "rgba(239,68,68,0.12)" : "transparent",
      color: active ? "#ef4444" : "#374151",
      border: active ? "rgba(239,68,68,0.38)" : "rgba(255,255,255,0.08)",
    },
  };
  const s = map[variant];

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {icon}
      {label}
    </button>
  );
}

// ── Watchers Tab ───────────────────────────────────────────────────────────────

function WatchersTab({
  watchers,
  url,
  role,
  onUrlChange,
  onRoleChange,
  onAdd,
  onRemove,
}: {
  watchers: Watcher[];
  url: string;
  role: string;
  onUrlChange: (v: string) => void;
  onRoleChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (id: number) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.28 }}
      className="h-full overflow-y-auto px-6 py-6"
      style={{ scrollbarWidth: "none" }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold" style={{ color: "#e2e8f0" }}>
            Job Watchers
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#475569" }}>
            Monitor job boards and receive alerts for new matches
          </p>
        </div>

        {/* Add form */}
        <div className="rounded-2xl p-6 mb-7" style={glass}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: "#64748b" }}>
            Add New Watcher
          </h3>
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Job board URL  (e.g. greenhouse.io)"
              value={url}
              onChange={e => onUrlChange(e.target.value)}
              onKeyDown={e => e.key === "Enter" && onAdd()}
              className="flex-1 min-w-52 px-4 py-2.5 rounded-xl text-sm placeholder:text-slate-600 transition-colors"
              style={glassInput}
            />
            <input
              type="text"
              placeholder="Target role  (e.g. Senior Engineer)"
              value={role}
              onChange={e => onRoleChange(e.target.value)}
              onKeyDown={e => e.key === "Enter" && onAdd()}
              className="flex-1 min-w-52 px-4 py-2.5 rounded-xl text-sm placeholder:text-slate-600 transition-colors"
              style={glassInput}
            />
            <button
              onClick={onAdd}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 active:scale-95"
              style={{
                background: "rgba(99,102,241,0.85)",
                border: "1px solid rgba(99,102,241,0.55)",
                boxShadow: "0 4px 16px rgba(99,102,241,0.25)",
              }}
            >
              <Plus size={14} />
              Add Watcher
            </button>
          </div>
        </div>

        {/* Watcher grid */}
        <div>
          <h3
            className="text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: "#374151" }}
          >
            Active Watchers · {watchers.length}
          </h3>
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
          >
            <AnimatePresence>
              {watchers.map(w => (
                <motion.div
                  key={w.id}
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.22 }}
                  className="flex items-center gap-3 p-4 rounded-2xl"
                  style={glass}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: "rgba(16,185,129,0.1)",
                      border: "1px solid rgba(16,185,129,0.22)",
                    }}
                  >
                    <Eye size={14} color="#10b981" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: "#e2e8f0" }}>
                      {w.role}
                    </div>
                    <div className="text-xs truncate mt-0.5" style={{ color: "#374151" }}>
                      {w.url}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="w-1.5 h-1.5 rounded-full inline-block"
                      style={{
                        background: "#10b981",
                        boxShadow: "0 0 5px rgba(16,185,129,0.6)",
                      }}
                    />
                    <button
                      onClick={() => onRemove(w.id)}
                      className="p-1.5 rounded-lg transition-colors duration-150"
                      style={{ color: "#374151" }}
                      onMouseEnter={e =>
                        ((e.currentTarget as HTMLElement).style.color = "#ef4444")
                      }
                      onMouseLeave={e =>
                        ((e.currentTarget as HTMLElement).style.color = "#374151")
                      }
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {watchers.length === 0 && (
            <div className="text-center py-20" style={{ color: "#374151" }}>
              <Eye size={36} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No watchers yet. Add one above to start monitoring.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Assistant Tab ──────────────────────────────────────────────────────────────

function AssistantTab({
  messages,
  isListening,
  isProcessing,
  textInput,
  onTextChange,
  onSend,
  onToggleListen,
  messagesEndRef,
}: {
  messages: Message[];
  isListening: boolean;
  isProcessing: boolean;
  textInput: string;
  onTextChange: (v: string) => void;
  onSend: () => void;
  onToggleListen: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.28 }}
      className="h-full flex flex-col px-6 py-6"
    >
      <div className="max-w-2xl mx-auto w-full flex flex-col h-full">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold" style={{ color: "#e2e8f0" }}>
            Voice Assistant
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#475569" }}>
            Powered by Sunday Mac 47
          </p>
        </div>

        {/* Mic button */}
        <div className="flex justify-center mb-5">
          <div className="relative flex items-center justify-center">
            {isListening && (
              <>
                <motion.div
                  className="absolute rounded-full"
                  style={{ width: 100, height: 100, border: "2px solid rgba(16,185,129,0.5)" }}
                  animate={{ scale: [1, 1.6, 2.1], opacity: [0.7, 0.25, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                />
                <motion.div
                  className="absolute rounded-full"
                  style={{ width: 100, height: 100, border: "2px solid rgba(16,185,129,0.35)" }}
                  animate={{ scale: [1, 1.35, 1.75], opacity: [0.5, 0.18, 0] }}
                  transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    ease: "easeOut",
                    delay: 0.35,
                  }}
                />
              </>
            )}

            <motion.button
              onClick={onToggleListen}
              className="relative w-24 h-24 rounded-full flex items-center justify-center"
              style={{
                background: isListening
                  ? "rgba(16,185,129,0.18)"
                  : "rgba(99,102,241,0.18)",
                border: `2px solid ${
                  isListening ? "rgba(16,185,129,0.65)" : "rgba(99,102,241,0.5)"
                }`,
                boxShadow: isListening
                  ? "0 0 48px rgba(16,185,129,0.32), 0 0 80px rgba(16,185,129,0.12)"
                  : "0 0 32px rgba(99,102,241,0.22)",
                transition: "all 0.35s ease",
              }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.95 }}
            >
              {isListening ? (
                <MicOff size={30} color="#10b981" />
              ) : (
                <Mic size={30} color="#818cf8" />
              )}
            </motion.button>
          </div>
        </div>

        {/* Status */}
        <div className="text-center mb-5 h-5">
          <AnimatePresence mode="wait">
            <motion.span
              key={isListening ? "l" : isProcessing ? "p" : "i"}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="text-sm"
              style={{
                color: isListening ? "#10b981" : isProcessing ? "#818cf8" : "#374151",
              }}
            >
              {isListening
                ? "Listening… speak now"
                : isProcessing
                ? "Processing your query…"
                : "Tap mic to speak or type below"}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Chat */}
        <div
          className="flex-1 overflow-y-auto rounded-2xl p-4 mb-4 flex flex-col gap-3"
          style={{ ...glass, scrollbarWidth: "none" }}
        >
          <AnimatePresence initial={false}>
            {messages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28 }}
                className={`flex items-end gap-2.5 ${
                  msg.role === "user" ? "flex-row-reverse" : ""
                }`}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background:
                      msg.role === "user"
                        ? "rgba(99,102,241,0.18)"
                        : "rgba(16,185,129,0.12)",
                    border:
                      msg.role === "user"
                        ? "1px solid rgba(99,102,241,0.38)"
                        : "1px solid rgba(16,185,129,0.28)",
                  }}
                >
                  {msg.role === "user" ? (
                    <User size={13} color="#818cf8" />
                  ) : (
                    <Bot size={13} color="#10b981" />
                  )}
                </div>
                <div
                  className="max-w-xs md:max-w-sm px-4 py-3 rounded-2xl text-sm leading-relaxed"
                  style={{
                    background:
                      msg.role === "user"
                        ? "rgba(99,102,241,0.15)"
                        : "rgba(22,33,62,0.85)",
                    border:
                      msg.role === "user"
                        ? "1px solid rgba(99,102,241,0.28)"
                        : "1px solid rgba(255,255,255,0.06)",
                    color: "#e2e8f0",
                    borderBottomRightRadius: msg.role === "user" ? 4 : undefined,
                    borderBottomLeftRadius: msg.role === "assistant" ? 4 : undefined,
                  }}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}

            {isProcessing && (
              <motion.div
                key="typing"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-end gap-2.5"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "rgba(16,185,129,0.12)",
                    border: "1px solid rgba(16,185,129,0.28)",
                  }}
                >
                  <Bot size={13} color="#10b981" />
                </div>
                <div
                  className="px-4 py-3 rounded-2xl"
                  style={{
                    background: "rgba(22,33,62,0.85)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderBottomLeftRadius: 4,
                  }}
                >
                  <div className="flex gap-1.5 items-center h-4">
                    {[0, 1, 2].map(i => (
                      <motion.span
                        key={i}
                        className="block w-1.5 h-1.5 rounded-full"
                        style={{ background: "#10b981" }}
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.55, repeat: Infinity, delay: i * 0.12 }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Text input */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type your query…"
            value={textInput}
            onChange={e => onTextChange(e.target.value)}
            onKeyDown={e => e.key === "Enter" && onSend()}
            className="flex-1 px-4 py-3 rounded-xl text-sm placeholder:text-slate-600 transition-colors"
            style={glassInput}
          />
          <button
            onClick={onSend}
            disabled={!textInput.trim() || isProcessing}
            className="px-4 py-3 rounded-xl transition-all duration-200 disabled:opacity-30 active:scale-95"
            style={{
              background: "rgba(99,102,241,0.2)",
              border: "1px solid rgba(99,102,241,0.38)",
              color: "#818cf8",
            }}
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
