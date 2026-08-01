# Agent Onboarding — CyberSentinel

> **First: ask the user what they want.** Don't run installs, set env vars, start workflows, or verify config until the user asks for it. Just take a quick look at the project and ask. This saves AI credits.

---

## What this project is

CyberSentinel is a cyberpunk cybersecurity ops dashboard — pnpm monorepo with:

| Artifact | Port | Description |
|---|---|---|
| `artifacts/cyber-sentinel` | **25629** | React + Vite frontend (Run button) |
| `artifacts/api-server` | **8080** | Express 5 + MongoDB + Groq/Mistral |
| `artifacts/cyber-sentinel-mobile` | — | Expo / React Native |

---

## When the user wants to run the app

**Step 1 — Dependencies** (skip if `node_modules` already exists):
```bash
pnpm install
```
`post-merge.sh` runs this automatically after a task-agent merge, so it may already be done.

**Step 2 — Secrets** (check first, only request what's missing):

| Key | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | ✅ Yes | MongoDB Atlas (`mongodb+srv://...`) |
| `GROQ_API_KEY` | ✅ Yes | Groq AI — primary LLM |
| `MISTRAL_API_KEY` | No | Enables Best-AI mode |
| `SESSION_SECRET` | No | Signs session cookies |
| `CYBERSENTINEL_API_SECRET` | No | API lock — production only |

```javascript
// Check which secrets exist before requesting any
const status = await viewEnvVars({ type: "secret" });
console.log(JSON.stringify(status));
```

**Step 3 — `.replit` config** — should already be correct. Only rewrite if the preview is blank:

Critical values:
- `[[ports]] localPort = 25629` → `externalPort = 80`
- `runButton = "artifacts/cyber-sentinel: web"`
- `[userenv.development] PORT = "25629"` and `BASE_PATH = "/"`

The artifact system permanently injects `PORT=25629` into the web workflow — never try to use port 5000.

**Step 4 — Start workflows:**
```javascript
// Starts web + API server (it's a dependency)
await restartWorkflow({ workflowName: "artifacts/cyber-sentinel: web", timeout: 45 });
```

---

## Known issues (quick reference)

**Blank preview** → Vite HMR fix already applied in `vite.config.ts` (`hmr: { clientPort: 443 }`). If still blank, check `[[ports]]` has `localPort = 25629`.

**API returns 401** → Only enforced when `NODE_ENV=production`. In dev it's open.

**EADDRINUSE: 8080** → Restart the API workflow a second time; stale process exits between restarts.

**Decommissioned Groq models** (as of June 2026): `llama3-8b-8192`, `llama3-70b-8192` — already removed from codebase.

**Mistral rate-limit headers** use `x-ratelimit-*-req-minute` / `*-tokens-minute` (not the standard names).

---

## Architecture (quick reference)

```
artifacts/
  api-server/        Express 5 + MongoDB + Groq/Mistral
    src/lib/groq.ts  SYSTEM_PROMPT must be exported here (used by multi-ai.ts)
  cyber-sentinel/    React + Vite + Tailwind v4 + shadcn/ui
    vite.config.ts   HMR clientPort fix + /api proxy → localhost:8080
lib/
  api-spec/          openapi.yaml — source of truth for API contract
  api-client-react/  Generated TanStack Query hooks (run codegen after changing openapi.yaml)
```

API server uses `API_PORT` (not `PORT`) to avoid conflict with the web artifact's port. Defaults to 8080.
