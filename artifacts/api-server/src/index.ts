import app from "./app";
import { logger } from "./lib/logger";

// API_PORT is the dedicated port var for this service (avoids conflict with the Vite frontend
// which owns the global PORT env var in development). In production on Render/Railway, set
// API_PORT to match whatever the platform assigns (e.g. API_PORT=10000 alongside PORT=10000).
const rawPort = process.env["API_PORT"] ?? "8080";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid API_PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

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
