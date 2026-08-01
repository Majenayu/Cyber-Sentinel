import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { startScheduler } from "./lib/scheduler";
import { attachTerminalWs } from "./routes/terminal";
import { attachRemoteTerminalWs } from "./routes/remote-terminal";

// ── Required-secrets guard ────────────────────────────────────────────────────
// Exit cleanly (no crash-loop) when secrets haven't been added yet.
// This prevents burning compute credits on repeated failed restarts.
const missingSecrets: string[] = [];
if (!process.env.MONGODB_URI) missingSecrets.push("MONGODB_URI");
if (!process.env.GROQ_API_KEY) missingSecrets.push("GROQ_API_KEY");

if (missingSecrets.length > 0) {
  console.error(
    `\n⚠️  CyberSentinel API server cannot start — missing required secrets:\n` +
    missingSecrets.map(k => `   • ${k}`).join("\n") +
    `\n\nAdd them in the Replit Secrets tab (🔒 lock icon), then restart this workflow.\n`
  );
  process.exit(0); // clean exit — workflow will not auto-restart
}

// API_PORT is the dedicated port var for this service (avoids conflict with the Vite frontend
// which owns the global PORT env var in development). In production on Render/Railway, set
// API_PORT to match whatever the platform assigns (e.g. API_PORT=10000 alongside PORT=10000).
const rawPort = process.env["API_PORT"] ?? "8080";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid API_PORT value: "${rawPort}"`);
}

const server = createServer(app);

// ── WebSocket terminal ────────────────────────────────────────────────────────
attachTerminalWs(server);
attachRemoteTerminalWs(server);

server.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // ── Autonomous research scheduler ─────────────────────────────────────────
  // Fires daily at 3:00 AM to scrape security resources and grow the General KB.
  startScheduler();

  // ── Keep-alive self-ping ──────────────────────────────────────────────────
  // Render free tier spins down after ~15 min of inactivity. Ping our own
  // health endpoint every 14 min 59 s to stay awake.
  // Set RENDER_EXTERNAL_URL (auto-set by Render) or APP_URL to enable.
  const selfUrl = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL;
  if (selfUrl) {
    const PING_MS = 14 * 60 * 1000 + 59 * 1000; // 14 min 59 s
    const pingUrl = `${selfUrl.replace(/\/$/, "")}/api/healthz`;
    const ping = () =>
      fetch(pingUrl, { signal: AbortSignal.timeout(10_000) })
        .then(() => logger.info({ url: pingUrl }, "keep-alive ping ok"))
        .catch(err => logger.warn({ err, url: pingUrl }, "keep-alive ping failed"));

    // Fire immediately so the first interval doesn't leave a 15-min gap on restart
    ping();
    setInterval(ping, PING_MS);
    logger.info({ url: pingUrl, intervalMs: PING_MS }, "keep-alive ping scheduled");
  }
});
