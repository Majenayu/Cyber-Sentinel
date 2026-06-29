# Agent Onboarding — CyberSentinel

Read this file **first** after importing from GitHub. It tells you the exact state of the project, what always needs to be done on a fresh import, and what to watch out for.

---

## Step 1 — Install dependencies (always required)

```bash
pnpm install
```

`node_modules` is never committed to Git. This must run before anything else or workflows will fail with `ERR_MODULE_NOT_FOUND`.

---

## Step 2 — Set secrets (always required on a fresh Replit)

The following secrets must be set in the Replit Secrets panel before the app will work. Use `requestSecrets` to ask the user for any that are missing:

| Secret key | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | ✅ Yes | MongoDB Atlas connection string |
| `GROQ_API_KEY` | ✅ Yes | Groq AI (primary LLM provider) |
| `MISTRAL_API_KEY` | ⬜ Optional | Mistral AI (secondary, used in Best-AI mode) |
| `CYBERSENTINEL_API_SECRET` | ⬜ Optional | Locks the API in **production only** — dev ignores it |
| `SESSION_SECRET` | ⬜ Optional | Signs session cookies |

---

## Step 3 — Set environment variables (always required)

```javascript
// Run via CodeExecution
await setEnvVars({ environment: "development", values: { BASE_PATH: "/", PORT: "5000" } });
```

- `PORT=5000` is **required** — Replit's preview proxy reads `[userenv.development] PORT` to know which port to forward to the iframe. The webview workflow must use port 5000, and this env var must match.
- `BASE_PATH` is required by `vite.config.ts` or Vite will throw on startup.
- The API server uses `API_PORT` (not `PORT`) to avoid conflict with the frontend's port slot.

---

## Step 4 — Start workflows

The three main workflows are artifact-managed and start automatically:

| Workflow name | Port | What it does |
|---|---|---|
| `artifacts/api-server: API Server` | 8080 | Express API + MongoDB + AI |
| `artifacts/cyber-sentinel: web` | 25629 | React/Vite frontend |
| `artifacts/cyber-sentinel-mobile: expo` | auto | Expo mobile app |

**Important:** After setting secrets, restart `artifacts/cyber-sentinel: web` so the Vite proxy picks up `CYBERSENTINEL_API_SECRET`:

```javascript
await restartWorkflow({ workflowName: "artifacts/cyber-sentinel: web", timeout: 45 });
```

---

## Known issues & fixes on fresh import

### Port conflict (EADDRINUSE 8080)
**Symptom:** `artifacts/api-server: API Server` fails with `EADDRINUSE`.  
**Cause:** A stale process or a duplicate workflow is already holding port 8080.  
**Fix:**
```bash
fuser -k 8080/tcp
```
Then restart the API Server workflow.

### All API calls return 401
**Symptom:** Dashboard shows no data; browser console shows 401s; API logs show 401 on every `/api/*` route.  
**Cause:** This should not happen in development — the API secret middleware is only active when `NODE_ENV=production`. If it does happen, check that the API server is running with `NODE_ENV=development` (the workflow sets this via `export NODE_ENV=development` in the dev command). If someone accidentally set `NODE_ENV=production` in the env vars, remove it.  
**Note:** `CYBERSENTINEL_API_SECRET` is only enforced in production builds. In development the API is open on localhost:8080 which is not reachable externally.

### pnpm install fails with `@workspace/db not found`
**Cause:** Old phantom dependency left in `package.json`.  
**Fix:** Remove `"@workspace/db": "workspace:*"` and `"drizzle-orm": "catalog:"` from `artifacts/api-server/package.json`, then re-run `pnpm install`.  
**Status: Already fixed in this repo** as of June 2026.

### `.migration-backup/*` workflows fail
These are backup copies with no `node_modules`. They are expected to fail and can be ignored. Do not attempt to fix them.

---

## Architecture at a glance

```
artifacts/
  api-server/          Express 5 + MongoDB + Groq/Mistral
    src/routes/        stats, knowledge, commands, tools, chat, analyze, health
    src/lib/models/    Command, Knowledge, Session, Tool (Mongoose schemas)
  cyber-sentinel/      React + Vite + Tailwind + Shadcn (cyberpunk theme)
    src/pages/         Dashboard, Chat, Vault, Tools, Commands, Settings
  cyber-sentinel-mobile/ Expo (React Native)
lib/
  api-spec/            openapi.yaml — source of truth for the API contract
  api-client-react/    Generated TanStack Query hooks (from openapi.yaml via Orval)
  api-zod/             Generated Zod schemas
```

- API server listens on `process.env.API_PORT ?? 8080` — uses a dedicated var to avoid conflict with the global `PORT` env var that belongs to the Vite frontend workflow. **In production (Render/Railway), set `API_PORT` to match the platform-assigned port** (render.yaml already does this with `API_PORT=10000`).
- Vite proxy: all `/api/*` requests from frontend → `http://localhost:8080`
- Vite proxy forwards `x-api-key: $CYBERSENTINEL_API_SECRET` when the secret is set (implemented in vite.config.ts proxy headers)

---

## To regenerate API client after changing openapi.yaml

```bash
pnpm --filter @workspace/api-spec run codegen
```

This regenerates `lib/api-client-react/src/generated/api.ts` and `lib/api-zod/`.

---

## Pending work / backlog

- [ ] Gemini AI provider not wired into `multi-ai.ts` (only Groq + Mistral are active)
- [ ] No authentication layer — single-tenant, protected only by `CYBERSENTINEL_API_SECRET`
- [ ] MongoDB text indexes not created — search uses basic regex, will slow down as vault grows
- [ ] Mobile app missing AI Ops streaming chat and Knowledge Vault scraping
- [ ] `useCount`/`lastUsed` on commands are tracked but no UI sort by "most used" / "recently used"
- [ ] Tool seeding is hardcoded in `src/lib/seed-tools.ts` — only 9 tools seeded on first run
