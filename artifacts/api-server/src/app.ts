import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Optional API secret guard — only enforced in production.
// In development the API binds to localhost:8080 which is not externally reachable,
// so network isolation is sufficient and the secret would break the Vite dev proxy.
const API_SECRET =
  process.env.NODE_ENV === 'production'
    ? process.env.CYBERSENTINEL_API_SECRET
    : undefined;
if (API_SECRET) {
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    // Always allow health checks without auth
    if (req.path === '/healthz' || req.path === '/health/status') return next();
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
