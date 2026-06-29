# CyberSentinel

A cybersecurity operations dashboard with AI-powered analysis, knowledge vault, tool reference, saved commands, and chat sessions — available as both a web app and mobile app.

## First-time setup (after importing from GitHub)

Run this once before anything else:
```
pnpm install
```

Then add the required secrets in the **Secrets** tab (the lock icon):

| Secret key | What it is |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string (e.g. `mongodb+srv://...`) |
| `GROQ_API_KEY` | Groq API key from console.groq.com |
| `MISTRAL_API_KEY` | Mistral API key (optional, used for Best-AI mode) |
| `CYBERSENTINEL_API_SECRET` | Any strong random string — locks the API (optional) |
| `SESSION_SECRET` | Any strong random string — signs session cookies |

After secrets are set, restart all workflows. Everything should be green on the dashboard.

## Run & Operate

- Workflows start automatically: `artifacts/cyber-sentinel: web`, `artifacts/api-server: API Server`, `artifacts/cyber-sentinel-mobile: expo`
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind v4 + wouter + shadcn/ui (cyberpunk dark theme)
- Mobile: Expo (React Native) with expo-router
- API: Express 5 + MongoDB (mongoose) + Groq SDK
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- Build: esbuild

## Where things live

- `artifacts/cyber-sentinel/` — React/Vite web app (served at `/`)
- `artifacts/cyber-sentinel-mobile/` — Expo mobile app
- `artifacts/api-server/` — Express API server (served at `/api`)
  - `src/routes/` — route handlers (stats, knowledge, commands, tools, chat, analyze, health)
  - `src/lib/mongodb.ts` — MongoDB connection
  - `src/lib/groq.ts` — Groq AI client
  - `src/lib/models/` — Mongoose models (Knowledge, Session, Command, Tool)
- `lib/api-spec/openapi.yaml` — OpenAPI source of truth
- `lib/api-client-react/` — generated React Query hooks
- `lib/api-zod/` — generated Zod schemas

## Architecture decisions

- MongoDB (via mongoose) is used for all data storage — not PostgreSQL/Drizzle
- Groq is the primary AI provider; Mistral is the secondary (Best-AI mode uses both)
- The web app proxies `/api` requests to the Express server via Vite dev proxy (port 8080)
- The API server listens on `API_PORT ?? 8080`; the artifact workflow does not set PORT for the API
- All artifacts use the shared pnpm workspace catalog for version pinning

## Gotchas

- **Port conflict**: Only one API server workflow should run at a time. If you see `EADDRINUSE: 8080`, a duplicate workflow is competing. Kill stale processes with `fuser -k 8080/tcp`.
- The API server rebuilds on every `dev` start (esbuild bundle) — takes ~1–2s, normal behavior
- MongoDB connection is cached per-process; if MONGODB_URI changes, restart the API server workflow
- `CYBERSENTINEL_API_SECRET` is optional — if set, every `/api` request must include `x-api-key: <secret>`; the Vite dev proxy forwards it automatically
