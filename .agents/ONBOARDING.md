# Agent Onboarding — CyberSentinel

> **IMPORTANT — Read this file first and stop exploring.**
> This file contains everything you need. Do NOT read README.md, package.json, setup.sh, replit.nix, or any other files before asking the user what they want. Every extra file read costs AI credits. Ask first, act second.

---

## On import — the only correct flow

1. Ask the user ONE question: do they want to (a) get the app running, (b) make specific changes, or (c) leave it as imported?
2. If they say **leave it as imported** → mark the task complete immediately. Do nothing else.
3. If they say **get it running** → follow the "Running the app" section below.
4. If they say **make changes** → ask what changes and proceed.

Do NOT run `pnpm install`, set env vars, start workflows, read files, or verify anything before the user answers.

---

## What this project is

CyberSentinel is a cyberpunk cybersecurity ops dashboard — pnpm monorepo with:

| Artifact | Port | Description |
|---|---|---|
| `artifacts/cyber-sentinel` | **25629** | React + Vite frontend |
| `artifacts/api-server` | **8080** | Express 5 + MongoDB + Groq/Mistral |
| `artifacts/cyber-sentinel-mobile` | — | Expo / React Native |

Login operator ID: **`Majen`**

---

## Running the app

**Step 1 — Dependencies** (skip if `node_modules` already exists):
```bash
pnpm install
```

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

**Step 3 — `.replit` config** — should already be correct. Only rewrite if preview is blank:
- `[[ports]] localPort = 25629` → `externalPort = 80`
- `[userenv.development] PORT = "25629"` and `BASE_PATH = "/"`

The artifact system permanently injects `PORT=25629` into the web workflow — never use port 5000.

**Step 4 — Start workflows:**
```javascript
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
