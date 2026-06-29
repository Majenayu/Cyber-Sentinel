import app from "./app";
import { logger } from "./lib/logger";

// API_PORT is the dedicated port var for this service (avoids conflict with the Vite frontend
// which owns the global PORT env var in development). In production on Render/Railway, set
// API_PORT to match whatever the platform assigns (e.g. API_PORT=10000 alongside PORT=10000).
const rawPort = process.env["API_PORT"] ?? "8080";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
