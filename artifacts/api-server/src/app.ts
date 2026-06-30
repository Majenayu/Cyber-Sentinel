import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

// Trust the first proxy hop (Render load balancer, Cloudflare, etc.)
// This makes req.ip and x-forwarded-for work correctly in production.
app.set('trust proxy', 1);

// CORS — in production, lock to the RENDER_EXTERNAL_URL or ALLOWED_ORIGIN env var
const allowedOrigins: string[] = [];
if (process.env.ALLOWED_ORIGIN) {
  allowedOrigins.push(...process.env.ALLOWED_ORIGIN.split(',').map(o => o.trim()));
}
if (process.env.RENDER_EXTERNAL_URL) {
  allowedOrigins.push(process.env.RENDER_EXTERNAL_URL.replace(/\/$/, ''));
}

app.use(
  cors(
    allowedOrigins.length > 0
      ? {
          origin: (origin, callback) => {
            // Allow same-origin requests (no origin = server-to-server or curl)
            if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
            callback(new Error(`CORS: origin ${origin} not allowed`));
          },
          credentials: true,
        }
      : undefined // dev: wide-open
  )
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Optional API secret guard — only enforced in production against *external* callers.
// In development the API binds to localhost:8080 (not externally reachable), so no key needed.
// In production monolith mode (Express serves both frontend + API on the same domain),
// same-origin browser requests must be allowed through without the key — the Vite dev proxy
// that injected x-api-key doesn't exist in the production build.
const API_SECRET =
  process.env.NODE_ENV === 'production'
    ? process.env.CYBERSENTINEL_API_SECRET
    : undefined;

// Own-origin detection: Render sets RENDER_EXTERNAL_URL automatically; ALLOWED_ORIGIN is a
// fallback for other hosts. Requests whose Origin matches our own URL are same-origin frontend calls.
const ownOrigins = new Set<string>(
  [
    process.env.RENDER_EXTERNAL_URL,
    ...(process.env.ALLOWED_ORIGIN?.split(',').map(o => o.trim()) ?? []),
  ]
    .filter(Boolean)
    .map(o => (o as string).replace(/\/$/, ''))
);

if (API_SECRET) {
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    // Always allow health checks without auth
    if (req.path === '/healthz' || req.path === '/health/status') return next();

    const origin = req.headers['origin'] as string | undefined;

    // Allow requests with no Origin header (server-to-server, curl, health probes)
    // and requests from our own frontend domain (monolith mode: frontend + API same host).
    if (!origin || ownOrigins.has(origin)) return next();

    const provided =
      req.headers['x-api-key'] ??
      req.headers['authorization']?.replace(/^bearer\s+/i, '');
    if (provided !== API_SECRET) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next();
  });
}

app.use("/api", router);

if (process.env.NODE_ENV === "production") {
  const frontendDist = path.resolve(__dirname, "../../cyber-sentinel/dist/public");
  app.use(express.static(frontendDist));
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

export default app;
