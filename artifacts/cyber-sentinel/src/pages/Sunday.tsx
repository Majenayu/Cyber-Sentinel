import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Archive,
  ArrowDownToLine,
  Check,
  CheckCircle2,
  ChevronDown,
  Clipboard,
  Crosshair,
  FileText,
  Flag,
  Globe2,
  HardDriveDownload,
  LoaderCircle,
  LockKeyhole,
  Network,
  Play,
  Radio,
  RefreshCw,
  ShieldCheck,
  Square,
  TerminalSquare,
  Timer,
  X,
  Zap,
} from "lucide-react";

type RunMode = "dry-run" | "active";
type PhaseStatus = "queued" | "running" | "complete" | "skipped" | "failed";
type RunStatus = "queued" | "running" | "complete" | "stopped" | "failed";
type Severity = "high" | "medium" | "low" | "info";

type SundayPhase = {
  id: string;
  label: string;
  status: PhaseStatus;
  detail?: string;
  startedAt?: string;
  finishedAt?: string;
};

type Finding = {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  source: string;
};

type SundayRun = {
  id: string;
  target: string;
  scope: string;
  mode: RunMode;
  status: RunStatus;
  createdAt: string;
  updatedAt: string;
  currentPhase?: string;
  phases: SundayPhase[];
  findings: Finding[];
  summary?: { high: number; medium: number; low: number; info: number };
  report?: string;
};

type RunResponse = { run: SundayRun };
type LaunchResponse = { runId: string };

const PHASES = [
  {
    id: "authorization",
    label: "Authorization check",
    description: "Verify target and declared scope before any probe",
    icon: LockKeyhole,
  },
  {
    id: "passive-discovery",
    label: "Passive discovery",
    description: "Collect public DNS, certificate, and ownership signals",
    icon: Globe2,
  },
  {
    id: "service-mapping",
    label: "Service mapping",
    description: "Identify exposed services with safe, rate-limited checks",
    icon: Network,
  },
  {
    id: "exposure-review",
    label: "Exposure review",
    description: "Correlate observable exposure with defensive controls",
    icon: Crosshair,
  },
  {
    id: "findings-report",
    label: "Findings & report",
    description: "Normalize evidence and prepare an operator report",
    icon: FileText,
  },
] as const;

const severityStyles: Record<Severity, { color: string; bg: string; label: string }> = {
  high: { color: "text-red-300", bg: "border-red-500/40 bg-red-500/10", label: "HIGH" },
  medium: { color: "text-orange-300", bg: "border-orange-500/40 bg-orange-500/10", label: "MEDIUM" },
  low: { color: "text-yellow-200", bg: "border-yellow-500/30 bg-yellow-500/10", label: "LOW" },
  info: { color: "text-sky-300", bg: "border-sky-500/30 bg-sky-500/10", label: "INFO" },
};

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatElapsed(createdAt?: string, updatedAt?: string) {
  if (!createdAt) return "—";
  const start = new Date(createdAt).getTime();
  const end = updatedAt ? new Date(updatedAt).getTime() : Date.now();
  if (Number.isNaN(start) || Number.isNaN(end)) return "—";
  const seconds = Math.max(0, Math.floor((end - start) / 1000));
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
}

function StatusMark({ status }: { status: PhaseStatus | RunStatus }) {
  if (status === "running" || status === "queued") {
    return (
      <span className={`relative flex h-5 w-5 items-center justify-center ${status === "running" ? "text-red-300" : "text-zinc-600"}`}>
        {status === "running" && <span className="absolute h-5 w-5 animate-ping rounded-full bg-red-500/20" />}
        {status === "running" ? <Radio size={13} className="relative" /> : <span className="h-2 w-2 rounded-full border border-current" />}
      </span>
    );
  }
  if (status === "complete") return <CheckCircle2 size={17} className="text-emerald-400" />;
  if (status === "failed") return <AlertCircle size={17} className="text-red-400" />;
  if (status === "stopped") return <Square size={13} className="text-orange-300" />;
  if (status === "skipped") return <ChevronDown size={15} className="text-zinc-600" />;
  return <span className="h-2 w-2 rounded-full border border-zinc-600" />;
}

export default function Sunday() {
  const [target, setTarget] = useState("");
  const [scope, setScope] = useState("");
  const [mode, setMode] = useState<RunMode>("dry-run");
  const [selectedPhases, setSelectedPhases] = useState<string[]>(PHASES.map((phase) => phase.id));
  const [authorized, setAuthorized] = useState(false);
  const [run, setRun] = useState<SundayRun | null>(null);
  const [runId, setRunId] = useState("");
  const [report, setReport] = useState("");
  const [isLaunching, setIsLaunching] = useState(false);
  const [isLoadingRun, setIsLoadingRun] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const active = run?.status === "queued" || run?.status === "running";
  const selectedPhaseCount = selectedPhases.length;
  const summary = run?.summary ?? { high: 0, medium: 0, low: 0, info: 0 };

  const fetchRun = useCallback(async (id: string, quiet = false) => {
    if (!quiet) setIsLoadingRun(true);
    try {
      const response = await fetch(`/api/sunday/runs/${encodeURIComponent(id)}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error(`Run status returned ${response.status}`);
      const payload = (await response.json()) as RunResponse;
      setRun(payload.run);
      setRunId(payload.run.id);
      setTarget(payload.run.target);
      setScope(payload.run.scope);
      if (payload.run.report) setReport(payload.run.report);
      setError("");
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to retrieve run state.");
    } finally {
      if (!quiet) setIsLoadingRun(false);
    }
  }, []);

  useEffect(() => {
    if (!runId || !active) {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }
    void fetchRun(runId, true);
    pollRef.current = setInterval(() => void fetchRun(runId, true), 2500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [active, fetchRun, runId]);

  const togglePhase = (id: string) => {
    setSelectedPhases((current) =>
      current.includes(id) ? current.filter((phaseId) => phaseId !== id) : [...current, id],
    );
  };

  const launchRun = async () => {
    if (!target.trim() || !scope.trim() || !authorized || selectedPhases.length === 0) return;
    setIsLaunching(true);
    setError("");
    setNotice("");
    setReport("");
    try {
      const response = await fetch("/api/sunday/runs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: target.trim(),
          scope: scope.trim(),
          mode,
          phases: selectedPhases,
        }),
      });
      if (!response.ok) throw new Error(`Launch request returned ${response.status}`);
      const payload = (await response.json()) as LaunchResponse;
      setRunId(payload.runId);
      await fetchRun(payload.runId);
      setNotice(`Run ${payload.runId} accepted by Sunday.`);
    } catch (launchError) {
      setError(launchError instanceof Error ? launchError.message : "Unable to launch assessment.");
    } finally {
      setIsLaunching(false);
    }
  };

  const stopRun = async () => {
    if (!runId || !active) return;
    setIsStopping(true);
    setError("");
    try {
      const response = await fetch(`/api/sunday/runs/${encodeURIComponent(runId)}/stop`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error(`Stop request returned ${response.status}`);
      const payload = (await response.json()) as RunResponse;
      setRun(payload.run);
      setNotice("Assessment halted. Collected evidence remains available.");
    } catch (stopError) {
      setError(stopError instanceof Error ? stopError.message : "Unable to stop assessment.");
    } finally {
      setIsStopping(false);
    }
  };

  const loadReport = async () => {
    if (!runId) return;
    setIsLoadingReport(true);
    setError("");
    try {
      const response = await fetch(`/api/sunday/runs/${encodeURIComponent(runId)}/report`, {
        credentials: "include",
        headers: { Accept: "text/markdown, text/plain" },
      });
      if (!response.ok) throw new Error(`Report request returned ${response.status}`);
      setReport(await response.text());
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : "Unable to load report.");
    } finally {
      setIsLoadingReport(false);
    }
  };

  const copyReport = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Clipboard access was denied. Use the download action instead.");
    }
  };

  const downloadReport = () => {
    if (!report) return;
    const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sunday-${runId || "assessment"}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const timelinePhases = useMemo<SundayPhase[]>(
    () => run?.phases ?? selectedPhases.map((id) => PHASES.find((phase) => phase.id === id)).filter(Boolean).map((phase) => ({
      id: phase!.id,
      label: phase!.label,
      status: "queued" as PhaseStatus,
    })),
    [run?.phases, selectedPhases],
  );

  return (
    <div className="min-h-full bg-[#10090b] px-4 py-5 text-zinc-200 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1540px]">
        <header className="mb-5 flex flex-col gap-4 border-b border-red-950/80 pb-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-red-400/80">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
              <span>CyberSentinel / Sunday operator console</span>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h1 className="font-mono text-3xl font-bold tracking-tight text-red-50 sm:text-4xl">
                AUTONOMOUS ASSESSMENT
              </h1>
              <span className="font-mono text-xs uppercase tracking-[0.18em] text-red-500">authorization-first</span>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Coordinate safe reconnaissance, preserve operator control, and turn observable exposure into evidence.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px overflow-hidden border border-red-950 bg-red-950/70 font-mono text-[10px] uppercase tracking-wider sm:grid-cols-4">
            <div className="bg-[#170d10] px-4 py-3">
              <div className="text-zinc-600">Control plane</div>
              <div className="mt-1 flex items-center gap-2 text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Ready</div>
            </div>
            <div className="bg-[#170d10] px-4 py-3">
              <div className="text-zinc-600">Execution</div>
              <div className="mt-1 text-red-300">Dry-run default</div>
            </div>
            <div className="bg-[#170d10] px-4 py-3">
              <div className="text-zinc-600">Polling</div>
              <div className="mt-1 text-zinc-300">{active ? "2.5s interval" : "Standby"}</div>
            </div>
            <div className="bg-[#170d10] px-4 py-3">
              <div className="text-zinc-600">Operator</div>
              <div className="mt-1 text-zinc-300">Local session</div>
            </div>
          </div>
        </header>

        {(error || notice) && (
          <div
            className={`mb-5 flex items-start gap-3 border px-4 py-3 font-mono text-xs ${
              error ? "border-red-500/30 bg-red-500/10 text-red-200" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
            }`}
            data-testid={error ? "status-error" : "status-notice"}
          >
            {error ? <AlertCircle size={15} className="mt-0.5 shrink-0" /> : <Check size={15} className="mt-0.5 shrink-0" />}
            <span className="flex-1">{error || notice}</span>
            <button
              type="button"
              onClick={() => { setError(""); setNotice(""); }}
              className="text-current opacity-70 transition-opacity hover:opacity-100"
              aria-label="Dismiss status"
              data-testid="button-dismiss-status"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[minmax(360px,0.82fr)_minmax(0,1.7fr)]">
          <section className="border border-red-950 bg-[#150b0e] shadow-[0_18px_60px_rgba(0,0,0,0.25)]" data-testid="panel-launch">
            <div className="flex items-center justify-between border-b border-red-950 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center border border-red-500/30 bg-red-500/10 text-red-400">
                  <TerminalSquare size={16} />
                </div>
                <div>
                  <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-red-100">Mission brief</h2>
                  <p className="mt-0.5 text-[11px] text-zinc-600">Declare intent before dispatch</p>
                </div>
              </div>
              <span className="font-mono text-[10px] text-zinc-600">01 / 03</span>
            </div>

            <div className="space-y-5 p-5">
              <label className="block">
                <span className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  Target
                  <span className="text-red-400/70">required</span>
                </span>
                <input
                  value={target}
                  onChange={(event) => setTarget(event.target.value)}
                  placeholder="example.org or approved asset"
                  className="h-11 w-full border border-red-950 bg-[#0d0809] px-3 font-mono text-sm text-red-50 outline-none transition-colors placeholder:text-zinc-700 focus:border-red-500/60 focus:ring-1 focus:ring-red-500/20"
                  data-testid="input-target"
                />
              </label>

              <label className="block">
                <span className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  Scope / authorization note
                  <span className="text-red-400/70">required</span>
                </span>
                <textarea
                  value={scope}
                  onChange={(event) => setScope(event.target.value)}
                  placeholder="Assets, exclusions, ticket or engagement reference"
                  rows={3}
                  className="w-full resize-none border border-red-950 bg-[#0d0809] px-3 py-3 font-mono text-xs leading-5 text-red-50 outline-none transition-colors placeholder:text-zinc-700 focus:border-red-500/60 focus:ring-1 focus:ring-red-500/20"
                  data-testid="input-scope"
                />
              </label>

              <div>
                <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">Execution mode</span>
                <div className="grid grid-cols-2 gap-2">
                  {(["dry-run", "active"] as RunMode[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setMode(option)}
                      className={`border px-3 py-3 text-left transition-colors ${
                        mode === option ? "border-red-500/70 bg-red-500/10" : "border-red-950 bg-[#0d0809] hover:border-red-900"
                      }`}
                      data-testid={`button-mode-${option}`}
                    >
                      <span className={`block font-mono text-xs uppercase ${mode === option ? "text-red-200" : "text-zinc-500"}`}>
                        {option === "dry-run" ? "Dry-run" : "Active"}
                      </span>
                      <span className="mt-1 block text-[10px] leading-4 text-zinc-600">
                        {option === "dry-run" ? "Plan and observe only" : "Authorized probes only"}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2 font-mono text-[10px] text-zinc-600">
                  <ShieldCheck size={13} className="text-red-400/70" />
                  {mode === "dry-run" ? "No active probes will be dispatched." : "Active mode requires explicit authorization below."}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">Assessment phases</span>
                  <span className="font-mono text-[10px] text-red-400">{selectedPhaseCount}/{PHASES.length} selected</span>
                </div>
                <div className="space-y-1.5">
                  {PHASES.map((phase) => {
                    const Icon = phase.icon;
                    const checked = selectedPhases.includes(phase.id);
                    return (
                      <button
                        key={phase.id}
                        type="button"
                        onClick={() => togglePhase(phase.id)}
                        className={`flex w-full items-center gap-3 border px-3 py-2.5 text-left transition-colors ${
                          checked ? "border-red-950 bg-red-500/[0.06]" : "border-transparent bg-[#0d0809]/60 opacity-50 hover:opacity-80"
                        }`}
                        data-testid={`button-phase-${phase.id}`}
                      >
                        <span className={`flex h-5 w-5 items-center justify-center border ${checked ? "border-red-500/60 bg-red-500/15 text-red-300" : "border-zinc-700 text-zinc-700"}`}>
                          {checked && <Check size={12} />}
                        </span>
                        <Icon size={14} className={checked ? "text-red-400" : "text-zinc-600"} />
                        <span className="min-w-0 flex-1">
                          <span className={`block font-mono text-xs ${checked ? "text-zinc-200" : "text-zinc-600"}`}>{phase.label}</span>
                          <span className="mt-0.5 block truncate text-[10px] text-zinc-700">{phase.description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-3 border border-red-950 bg-[#0d0809] p-3">
                <input
                  type="checkbox"
                  checked={authorized}
                  onChange={(event) => setAuthorized(event.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-red-500"
                  data-testid="input-authorization"
                />
                <span className="text-[11px] leading-5 text-zinc-500">
                  I confirm this target is authorized and the scope above is accurate. Sunday will honor exclusions and retain a dry-run posture unless explicitly changed.
                </span>
              </label>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void launchRun()}
                  disabled={isLaunching || active || !target.trim() || !scope.trim() || !authorized || selectedPhaseCount === 0}
                  className="flex h-11 flex-1 items-center justify-center gap-2 bg-red-600 px-4 font-mono text-xs font-bold uppercase tracking-wider text-red-50 transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-red-950 disabled:text-red-800"
                  data-testid="button-launch-assessment"
                >
                  {isLaunching ? <LoaderCircle size={15} className="animate-spin" /> : <Play size={15} />}
                  {isLaunching ? "Dispatching..." : "Launch assessment"}
                </button>
                <button
                  type="button"
                  onClick={() => void stopRun()}
                  disabled={!active || isStopping}
                  className="flex h-11 items-center justify-center gap-2 border border-red-900 px-4 font-mono text-xs uppercase tracking-wider text-red-300 transition-colors hover:border-red-500 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:border-red-950 disabled:text-zinc-700"
                  data-testid="button-stop-assessment"
                >
                  {isStopping ? <LoaderCircle size={15} className="animate-spin" /> : <Square size={13} />}
                  Stop
                </button>
              </div>
            </div>
          </section>

          <section className="min-w-0 border border-red-950 bg-[#120a0c]" data-testid="panel-telemetry">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-red-950 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="relative flex h-8 w-8 items-center justify-center border border-red-500/30 bg-red-500/10 text-red-400">
                  {active && <span className="absolute inset-1 animate-pulse border border-red-500/30" />}
                  <Radio size={16} className="relative" />
                </div>
                <div>
                  <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-red-100">Live telemetry</h2>
                  <p className="mt-0.5 font-mono text-[10px] text-zinc-600">
                    {runId ? `RUN ${runId}` : "Awaiting dispatch"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider">
                <span className={`flex items-center gap-1.5 ${active ? "text-red-300" : run ? "text-zinc-400" : "text-zinc-600"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${active ? "animate-pulse bg-red-400" : "bg-zinc-600"}`} />
                  {run?.status ?? "standby"}
                </span>
                {run && (
                  <span className="flex items-center gap-1.5 border-l border-red-950 pl-3 text-zinc-600">
                    <Timer size={12} />
                    {formatElapsed(run.createdAt, active ? undefined : run.updatedAt)}
                  </span>
                )}
              </div>
            </div>

            <div className="grid gap-5 p-5 2xl:grid-cols-[1.25fr_0.75fr]">
              <div className="min-w-0">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">Phase timeline</h3>
                  {active && <span className="font-mono text-[10px] text-red-400/80">LIVE / polling</span>}
                </div>
                <div className="border border-red-950 bg-[#0d0809]">
                  {isLoadingRun && !run ? (
                    <div className="space-y-3 p-4" data-testid="skeleton-run">
                      {[1, 2, 3, 4].map((item) => <div key={item} className="h-12 animate-pulse border-l-2 border-red-950 bg-red-950/20" />)}
                    </div>
                  ) : timelinePhases.length ? (
                    <div className="divide-y divide-red-950/70">
                      {timelinePhases.map((phase, index) => (
                        <div key={phase.id} className="relative flex items-start gap-3 px-4 py-3.5" data-testid={`phase-row-${phase.id}`}>
                          {index < timelinePhases.length - 1 && (
                            <span className="absolute left-[24px] top-[39px] h-[calc(100%-22px)] w-px bg-red-950" />
                          )}
                          <div className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center bg-[#0d0809]">
                            <StatusMark status={phase.status} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className={`font-mono text-xs ${phase.status === "running" ? "text-red-200" : "text-zinc-300"}`}>{phase.label}</span>
                              <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-700">{phase.status}</span>
                            </div>
                            <p className="mt-1 text-[11px] leading-4 text-zinc-600">{phase.detail || (phase.status === "queued" ? "Queued for operator-approved execution." : "Sunday has not reported detail yet.")}</p>
                            {(phase.startedAt || phase.finishedAt) && (
                              <div className="mt-1.5 font-mono text-[9px] text-zinc-700">
                                {formatDate(phase.startedAt)} {phase.finishedAt ? `→ ${formatDate(phase.finishedAt)}` : "→ in progress"}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex min-h-[250px] flex-col items-center justify-center px-6 text-center">
                      <Archive size={28} className="mb-3 text-red-950" />
                      <p className="font-mono text-xs uppercase tracking-wider text-zinc-600">No active operation</p>
                      <p className="mt-2 max-w-xs text-[11px] leading-5 text-zinc-700">Complete the mission brief and dispatch Sunday to begin a controlled assessment.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="min-w-0">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">Finding summary</h3>
                  {run && <span className="font-mono text-[10px] text-zinc-600">{run.findings.length} observed</span>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(["high", "medium", "low", "info"] as Severity[]).map((severity) => (
                    <div key={severity} className={`border p-3 ${severityStyles[severity].bg}`} data-testid={`summary-${severity}`}>
                      <div className={`font-mono text-[10px] tracking-[0.16em] ${severityStyles[severity].color}`}>{severityStyles[severity].label}</div>
                      <div className={`mt-2 font-mono text-2xl font-bold ${severityStyles[severity].color}`}>{summary[severity]}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 border border-red-950 bg-[#0d0809] p-3">
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                    <span>Last server update</span>
                    <span className="text-zinc-400">{formatDate(run?.updatedAt)}</span>
                  </div>
                  <div className="mt-3 h-1 overflow-hidden bg-red-950">
                    <div
                      className={`h-full bg-red-500 transition-[width] duration-700 ${active ? "animate-pulse" : ""}`}
                      style={{ width: `${timelinePhases.length ? Math.round((timelinePhases.filter((phase) => phase.status === "complete").length / timelinePhases.length) * 100) : 0}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between font-mono text-[9px] text-zinc-700">
                    <span>COLLECTION PROGRESS</span>
                    <span>{timelinePhases.length ? Math.round((timelinePhases.filter((phase) => phase.status === "complete").length / timelinePhases.length) * 100) : 0}%</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
          <section className="border border-red-950 bg-[#120a0c]" data-testid="panel-findings">
            <div className="flex items-center justify-between border-b border-red-950 px-5 py-4">
              <div className="flex items-center gap-3">
                <Flag size={16} className="text-red-400" />
                <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-red-100">Observed findings</h2>
              </div>
              <span className="font-mono text-[10px] text-zinc-600">DEFENSIVE EVIDENCE</span>
            </div>
            <div>
              {run?.findings?.length ? (
                <div className="divide-y divide-red-950/70">
                  {run.findings.map((finding) => {
                    const severity = severityStyles[finding.severity];
                    return (
                      <article key={finding.id} className="px-5 py-4 transition-colors hover:bg-red-500/[0.025]" data-testid={`finding-${finding.id}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`border px-1.5 py-0.5 font-mono text-[9px] tracking-wider ${severity.bg} ${severity.color}`}>{severity.label}</span>
                          <span className="font-mono text-[10px] text-zinc-700">{finding.source}</span>
                        </div>
                        <h3 className="mt-2 text-sm font-medium text-zinc-200">{finding.title}</h3>
                        <p className="mt-1 max-w-3xl text-xs leading-5 text-zinc-500">{finding.detail}</p>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="flex min-h-[210px] flex-col items-center justify-center px-6 text-center">
                  <ShieldCheck size={29} className="mb-3 text-red-950" />
                  <p className="font-mono text-xs uppercase tracking-wider text-zinc-600">Evidence buffer empty</p>
                  <p className="mt-2 max-w-sm text-[11px] leading-5 text-zinc-700">Findings will appear here as Sunday completes safe collection phases. No assumptions are shown before evidence arrives.</p>
                </div>
              )}
            </div>
          </section>

          <section className="border border-red-950 bg-[#120a0c]" data-testid="panel-report">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-red-950 px-5 py-4">
              <div className="flex items-center gap-3">
                <FileText size={16} className="text-red-400" />
                <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-red-100">Operator report</h2>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void loadReport()}
                  disabled={!runId || isLoadingReport}
                  className="flex items-center gap-1.5 border border-red-950 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500 transition-colors hover:border-red-700 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                  data-testid="button-load-report"
                >
                  {isLoadingReport ? <LoaderCircle size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={copyReport}
                  disabled={!report}
                  className="flex items-center gap-1.5 border border-red-950 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500 transition-colors hover:border-red-700 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                  data-testid="button-copy-report"
                >
                  {copied ? <Check size={12} /> : <Clipboard size={12} />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={downloadReport}
                  disabled={!report}
                  className="flex items-center gap-1.5 border border-red-950 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500 transition-colors hover:border-red-700 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                  data-testid="button-download-report"
                >
                  <ArrowDownToLine size={12} />
                  Save
                </button>
              </div>
            </div>
            <div className="p-5">
              {report ? (
                <pre className="max-h-[330px] overflow-auto whitespace-pre-wrap border border-red-950 bg-[#0d0809] p-4 font-mono text-[11px] leading-5 text-zinc-400" data-testid="report-content">{report}</pre>
              ) : (
                <div className="flex min-h-[210px] flex-col items-center justify-center border border-dashed border-red-950/80 px-6 text-center">
                  <HardDriveDownload size={27} className="mb-3 text-red-950" />
                  <p className="font-mono text-xs uppercase tracking-wider text-zinc-600">Report not staged</p>
                  <p className="mt-2 max-w-sm text-[11px] leading-5 text-zinc-700">After a run is selected, request the server-generated markdown report for review, copy, or local retention.</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 border-t border-red-950 px-5 py-3 font-mono text-[10px] text-zinc-700">
              <Zap size={12} className="text-red-500/60" />
              Reports contain collected evidence only. Validate conclusions before distributing.
            </div>
          </section>
        </div>

        <footer className="mt-5 flex flex-col gap-2 border-t border-red-950/70 py-4 font-mono text-[10px] uppercase tracking-wider text-zinc-700 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2"><ShieldCheck size={12} className="text-red-500/60" />Authorization is the control boundary</span>
          <span>{run ? `Last run ${formatDate(run.updatedAt)}` : "No run selected"} · Sunday coordinator v0.1</span>
        </footer>
      </div>
    </div>
  );
}