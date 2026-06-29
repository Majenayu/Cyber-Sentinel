# CyberSentinel

A cybersecurity operations dashboard with AI-powered analysis, knowledge vault, tool reference, saved commands, and chat sessions — available as both a web app and mobile app.

## Run & Operate

- Workflows start automatically: `artifacts/cyber-sentinel: web`, `artifacts/api-server: API Server`, `artifacts/cyber-sentinel-mobile: expo`
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required secrets: `MONGODB_URI` (MongoDB Atlas connection string), `GROQ_API_KEY` (Groq AI API key)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind v4 + wouter + shadcn/ui (cyberpunk dark theme)
- Mobile: Expo (React Native) with expo-router
- API: Express 5 + MongoDB (mongoose) + Groq SDK
- Validation: Zod, drizzle-zod
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- Build: esbuild

## Where things live

- `artifacts/cyber-sentinel/` — React/Vite web app (served at `/`)
- `artifacts/cyber-sentinel-mobile/` — Expo mobile app (served at `/cyber-sentinel-mobile/`)
- `artifacts/api-server/` — Express API server (served at `/api`)
  - `src/routes/` — route handlers (stats, knowledge, commands, tools, chat, analyze, health)
  - `src/lib/mongodb.ts` — MongoDB connection
  - `src/lib/groq.ts` — Groq AI client
  - `src/lib/models/` — Mongoose models (Knowledge, Session, Command, Tool)
- `lib/api-spec/openapi.yaml` — OpenAPI source of truth
- `lib/api-client-react/` — generated React Query hooks
- `lib/api-zod/` — generated Zod schemas

## Architecture decisions

- MongoDB (via mongoose) is used for all data storage — not PostgreSQL/Drizzle (Drizzle ORM packages exist in scaffold but are unused by this app)
- Groq is the AI provider for chat and security analysis
- The web app proxies `/api` requests to the Express server via Vite dev proxy (port 8080)
- All artifacts use the shared pnpm workspace catalog for version pinning

## Product

- **Dashboard**: Live stats (knowledge entries, tools, commands, sessions) + system status
- **AI Ops (Chat)**: Groq-powered AI security assistant with session history
- **Knowledge Base**: CRUD for security documentation entries with tags
- **Tool Reference**: Catalog of security tools with details
- **Saved Commands**: Library of useful terminal/CLI commands
- **Settings**: Configure API keys and UI preferences

## Gotchas

- The API server rebuilds on every `dev` start (esbuild bundle) — takes ~1s, normal behavior
- MongoDB connection is cached per-process; if MONGODB_URI changes, restart the API server workflow
- The `lib/db/` (Drizzle/PostgreSQL) package exists in the scaffold but is not used by this app

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
