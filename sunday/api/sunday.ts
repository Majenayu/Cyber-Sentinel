import { Router } from "express";
import dns from "dns/promises";
import net from "net";
import { randomUUID } from "crypto";

const router = Router();

type RunMode = "dry-run" | "active";
type RunStatus = "queued" | "running" | "complete" | "stopped" | "failed";
type PhaseStatus = "queued" | "running" | "complete" | "skipped" | "failed";
type Severity = "high" | "medium" | "low" | "info";

type Phase = {
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
  phases: Phase[];
  findings: Finding[];
  summary: Record<Severity, number>;
  report?: string;
  stopRequested?: boolean;
};

const PHASE_CATALOG = [
  { id: "authorization", label: "Authorization check" },
  { id: "passive-discovery", label: "Passive discovery" },
  { id: "service-mapping", label: "Service mapping" },
  { id: "exposure-review", label: "Exposure review" },
  { id: "findings-report", label: "Findings & report" },
] as const;

const PORTS = [22, 80, 443, 8080, 8443];
const runs = new Map<string, SundayRun>();

function now() {
  return new Date().toISOString();
}

function publicHost(input: string) {
  const value = String(input ?? "").trim();
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password || parsed.port) return null;
  const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return null;
  if (net.isIP(host)) {
    const octets = host.split(".").map(Number);
    const privateV4 = octets[0] === 10 || octets[0] === 127 || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) || (octets[0] === 192 && octets[1] === 168) || (octets[0] === 169 && octets[1] === 254);
    if (privateV4 || host === "0.0.0.0") return null;
  }
  if (!/^[a-z0-9.-]+$/i.test(host) || host.length > 253) return null;
  return host;
}

function createPhases(selected: string[]): Phase[] {
  return selected.map(id => {
    const catalog = PHASE_CATALOG.find(phase => phase.id === id);
    return { id, label: catalog?.label ?? id, status: "queued" };
  });
}

function addFinding(run: SundayRun, severity: Severity, title: string, detail: string, source: string) {
  const finding = { id: randomUUID().slice(0, 8), severity, title, detail, source };
  run.findings.push(finding);
  run.summary[severity] += 1;
}

function touch(run: SundayRun) {
  run.updatedAt = now();
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function resolveHost(host: string) {
  try {
    return await dns.lookup(host, { all: true });
  } catch {
    return [];
  }
}

async function checkPort(host: string, port: number) {
  return new Promise<boolean>(resolve => {
    const socket = new net.Socket();
    const finish = (open: boolean) => {
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(1800);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, host);
  });
}

async function runSunday(run: SundayRun) {
  run.status = "running";
  touch(run);

  for (const phase of run.phases) {
    if (run.stopRequested) break;
    run.currentPhase = phase.id;
    phase.status = "running";
    phase.startedAt = now();
    touch(run);

    try {
      if (phase.id === "authorization") {
        phase.detail = run.mode === "dry-run"
          ? "Dry-run: authorization declaration recorded; no target request made."
          : "Target accepted as a public host. Active collection remains bounded to the selected safe checks.";
      } else if (run.mode === "dry-run") {
        phase.detail = "Dry-run: phase planned and logged; no network probe dispatched.";
      } else if (phase.id === "passive-discovery") {
        const addresses = await resolveHost(run.target);
        phase.detail = addresses.length ? `Resolved ${addresses.length} address record${addresses.length === 1 ? "" : "s"} for ${run.target}.` : "No address records returned.";
        if (!addresses.length) addFinding(run, "medium", "Target did not resolve", "The target returned no A or AAAA records during collection.", "DNS lookup");
        else addFinding(run, "info", "Public DNS resolution observed", `${addresses.map(address => address.address).join(", ")} returned during collection.`, "DNS lookup");
      } else if (phase.id === "service-mapping") {
        const results = await Promise.all(PORTS.map(async port => ({ port, open: await checkPort(run.target, port) })));
        const open = results.filter(result => result.open).map(result => result.port);
        phase.detail = open.length ? `Observed responsive TCP services on ${open.join(", ")}.` : "No responsive ports in the bounded service set.";
        for (const port of open) addFinding(run, port === 22 || port === 8080 || port === 8443 ? "low" : "info", `TCP service responded on ${port}`, "A connection was accepted during a bounded reachability check. Service identity was not inferred.", "TCP reachability");
      } else if (phase.id === "exposure-review") {
        const hasWeb = await checkPort(run.target, 443);
        phase.detail = hasWeb ? "HTTPS reachability observed; review TLS, headers, and application controls separately." : "No HTTPS response observed in the bounded check.";
        if (hasWeb) addFinding(run, "info", "HTTPS endpoint reachable", "Reachability alone is not evidence of a vulnerability. Continue with authenticated, application-specific review.", "Exposure review");
      } else if (phase.id === "findings-report") {
        phase.detail = "Evidence normalized and operator report staged.";
      }
      phase.status = "complete";
    } catch (error: any) {
      phase.status = "failed";
      phase.detail = error?.message ?? "Phase failed without additional detail.";
      addFinding(run, "low", `${phase.label} did not complete`, phase.detail ?? "No additional detail was recorded.", "Sunday coordinator");
    }
    phase.finishedAt = now();
    touch(run);
    await sleep(250);
  }

  if (run.stopRequested) {
    for (const phase of run.phases) if (phase.status === "queued" || phase.status === "running") phase.status = "skipped";
    run.status = "stopped";
  } else if (run.phases.every(phase => phase.status === "complete")) {
    run.status = "complete";
  } else {
    run.status = "failed";
  }
  run.currentPhase = undefined;
  run.report = buildReport(run);
  touch(run);
}

function buildReport(run: SundayRun) {
  const lines = [
    "# Sunday Assessment Report",
    "",
    `- **Run:** ${run.id}`,
    `- **Target:** ${run.target}`,
    `- **Mode:** ${run.mode}`,
    `- **Status:** ${run.status}`,
    `- **Scope declaration:** ${run.scope}`,
    `- **Created:** ${run.createdAt}`,
    "",
    "## Safety boundary",
    "",
    "Sunday collected only the bounded, operator-selected phases. It did not execute payloads, fuzzing, exploitation, persistence, or credential actions.",
    "",
    "## Phase results",
    "",
    ...run.phases.map(phase => `- **${phase.label}:** ${phase.status} — ${phase.detail ?? "No detail recorded."}`),
    "",
    "## Findings",
    "",
    ...(run.findings.length ? run.findings.map(finding => `- **${finding.severity.toUpperCase()} — ${finding.title}:** ${finding.detail} _(source: ${finding.source})_`) : ["- No findings were recorded."]),
    "",
    "Validate all conclusions against the target owner's change window and evidence before distribution.",
  ];
  return lines.join("\n");
}

router.post("/sunday/runs", (req, res) => {
  const { target, scope, mode = "dry-run", phases } = req.body ?? {};
  const host = publicHost(target);
  if (!host) { res.status(400).json({ error: "target must be a public domain or host without credentials, ports, or private-network address" }); return; }
  if (typeof scope !== "string" || scope.trim().length < 8 || scope.length > 2000) { res.status(400).json({ error: "scope authorization note is required and must be 8–2000 characters" }); return; }
  if (mode !== "dry-run" && mode !== "active") { res.status(400).json({ error: "mode must be dry-run or active" }); return; }
  const requested = Array.isArray(phases) ? phases.filter((id: unknown): id is string => typeof id === "string" && PHASE_CATALOG.some(phase => phase.id === id)) : PHASE_CATALOG.map(phase => phase.id);
  const selected = [...new Set(requested)];
  if (!selected.length) { res.status(400).json({ error: "at least one valid phase is required" }); return; }

  const timestamp = now();
  const run: SundayRun = {
    id: `SUN-${randomUUID().slice(0, 8).toUpperCase()}`,
    target: host,
    scope: scope.trim(),
    mode,
    status: "queued",
    createdAt: timestamp,
    updatedAt: timestamp,
    phases: createPhases(selected),
    findings: [],
    summary: { high: 0, medium: 0, low: 0, info: 0 },
  };
  runs.set(run.id, run);
  void runSunday(run);
  res.status(202).json({ runId: run.id });
});

router.get("/sunday/runs/:id", (req, res) => {
  const run = runs.get(req.params.id);
  if (!run) { res.status(404).json({ error: "Sunday run not found" }); return; }
  res.json({ run });
});

router.post("/sunday/runs/:id/stop", (req, res) => {
  const run = runs.get(req.params.id);
  if (!run) { res.status(404).json({ error: "Sunday run not found" }); return; }
  if (run.status === "queued" || run.status === "running") run.stopRequested = true;
  res.json({ run });
});

router.get("/sunday/runs/:id/report", (req, res) => {
  const run = runs.get(req.params.id);
  if (!run) { res.status(404).type("text/plain").send("Sunday run not found"); return; }
  res.type("text/markdown").send(run.report ?? buildReport(run));
});

export default router;