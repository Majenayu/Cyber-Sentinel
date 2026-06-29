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

Check which secrets already exist, then request any that are missing:

```javascript
// Run via CodeExecution
const status = await viewEnvVars({ type: "secret" });
console.log(JSON.stringify(status));
```

| Secret key | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | ✅ Yes | MongoDB Atlas connection string (`mongodb+srv://...`) |
| `GROQ_API_KEY` | ✅ Yes | Groq AI — primary LLM provider |
| `MISTRAL_API_KEY` | ⬜ Optional | Mistral AI — secondary provider (Best-AI mode). See format note below. |
| `SESSION_SECRET` | ⬜ Optional | Signs session cookies |
| `CYBERSENTINEL_API_SECRET` | ⬜ Optional | Locks the API — **production only**, dev ignores it |

Request missing required secrets:

```javascript
return await requestSecrets({
  keys: ["MONGODB_URI", "GROQ_API_KEY"],
  userMessage: "Both are required for the API server to start."
});
```

> ⚠️ Never ask users to paste secret values into chat. Always use `requestSecrets`.

### Mistral API key format

Mistral keys from [console.mistral.ai](https://console.mistral.ai) → **API Keys** → **Create new key** are plain alphanumeric strings — they do **not** start with `sk-`. If a key starts with `sk-` it is an OpenAI-format key and will always return `401 Unauthorized` from Mistral, even though the model name is correct.

- ✅ Valid format: `AbCdEfGhIjKlMnOpQrStUvWxYz012345` (random hex/alphanumeric, no prefix)
- ❌ Invalid: `sk-abc123...` — this is an OpenAI key, not Mistral

**Model in use:** `mistral-small-latest` — this is the correct free-tier model. Do not change it to `open-mistral-7b` or `open-mixtral-8x7b`; those require a paid plan and return 401 on free accounts.

---

## Step 3 — Set environment variables (always required)

```javascript
// Run via CodeExecution
await setEnvVars({ environment: "development", values: { BASE_PATH: "/", PORT: "25629" } });
```

| Variable | Value | Why |
|---|---|---|
| `BASE_PATH` | `/` | Required by `vite.config.ts` — Vite throws on startup without it |
| `PORT` | `25629` | The Replit artifact system permanently assigns this port to the web artifact. Set it here to match. Do **not** change to 5000. |

> **The API server uses `API_PORT` (not `PORT`)** to avoid conflict with the frontend's port. It defaults to 8080 and does not need to be set manually in development.

---

## Step 4 — Verify `.replit` configuration

The `.replit` file must match the configuration below exactly. If it has been reset or corrupted, rewrite it using `verifyAndReplaceDotReplit`.

**Critical requirements (all must be present and correct):**

1. **`[[ports]]`** — maps `localPort = 25629` to `externalPort = 80`. This is what Replit's proxy reads to forward the preview iframe. Without it the preview is always blank.
2. **`runButton`** — must point to `"artifacts/cyber-sentinel: web"` (the workflow with `outputType = "webview"`). A parent parallel-launcher workflow has no webview output and produces a blank preview.
3. **Metadata ordering** — `[workflows.workflow.metadata]` must appear **before** `[[workflows.workflow.tasks]]` in each workflow block. TOML associates a subtable with the preceding array-of-tables element; wrong order = metadata silently ignored.
4. **`waitForPort = 25629`** on the Vite shell task.
5. **`PORT = "25629"`** in `[userenv.development]`.

Correct `.replit` (copy verbatim if you need to reset it):

```toml
modules = ["nodejs-20", "web", "bash"]

[[ports]]
localPort = 25629
externalPort = 80

[workflows]
runButton = "artifacts/cyber-sentinel: web"

[[workflows.workflow]]
name = "artifacts/api-server: API Server"
author = "agent"

[workflows.workflow.metadata]
outputType = "console"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "cd artifacts/api-server && pnpm run dev 2>&1 | pnpm exec pino-pretty"
waitForPort = 8080

[[workflows.workflow]]
name = "artifacts/cyber-sentinel: web"
author = "agent"

[workflows.workflow.metadata]
outputType = "webview"

[[workflows.workflow.tasks]]
task = "workflow.run"
args = "artifacts/api-server: API Server"

[[workflows.workflow.tasks]]
task = "shell.exec"
args = "cd artifacts/cyber-sentinel && pnpm run dev"
waitForPort = 25629

[agent]
stack = "BEST_EFFORT_FALLBACK"
expertMode = true

[postMerge]
path = "scripts/post-merge.sh"
timeoutMs = 20000

[nix]
channel = "stable-25_05"

[userenv]

[userenv.shared]
NODE_ENV = "development"

[userenv.development]
PORT = "25629"
BASE_PATH = "/"
```

---

## Step 5 — Start workflows

```javascript
// Run via CodeExecution — start web workflow (it also starts the API server as a dependency)
await restartWorkflow({ workflowName: "artifacts/cyber-sentinel: web", timeout: 45 });
```

| Workflow | Port | Output |
|---|---|---|
| `artifacts/cyber-sentinel: web` | 25629 | webview (Run button) |
| `artifacts/api-server: API Server` | 8080 | console |

After both are running, verify health:

```bash
curl http://localhost:8080/api/health/status
# Expected: {"database":"ONLINE","ai":"ONLINE","encryption":"AES-256 ACTIVE"}
```

---

## Known issues & fixes

### Preview pane is blank (white page)

**Symptom:** App serves HTTP 200, but `.replit.dev` preview iframe shows nothing.

**Cause A — HMR WebSocket blocked (most common):** Vite injects an HMR client into every page that opens a WebSocket back to the raw dev port. The Replit proxy only exposes HTTPS on port 443 — the direct WebSocket is blocked, the Vite client stalls, React never mounts.

**Fix A:** Already applied in `artifacts/cyber-sentinel/vite.config.ts`:
```ts
hmr: process.env.REPL_ID ? { clientPort: 443 } : true,
```
The `REPL_ID` guard is required — without it, localhost access also tries port 443 and fails. **Do not remove this.**

**Cause B — `[[ports]]` missing or wrong port:** If `[[ports]]` maps the wrong `localPort`, the proxy has nowhere to point.

**Fix B:** Ensure `[[ports]] localPort = 25629` is present (see Step 4).

**Cause C — `runButton` points to a parent workflow:** A parallel launcher workflow has no `outputType = "webview"` so the preview pane shows nothing.

**Fix C:** Set `runButton = "artifacts/cyber-sentinel: web"`.

---

### API server fails with `EADDRINUSE: 8080`

**Symptom:** `artifacts/api-server: API Server` fails immediately on start.

**Cause:** A stale process from a previous run is still holding port 8080.

**Fix:** Restart the workflow a second time — the stale process usually exits between restarts. If it persists, find and kill the PID:

```bash
# fuser and lsof are not available in this Nix environment — use /proc instead
grep -r ":1F90" /proc/net/tcp6 2>/dev/null   # 1F90 = hex for 8080
# Note the inode, then find the process: ls -la /proc/*/fd | grep <inode>
# kill <PID>
```

---

### Artifact system overrides PORT — do not fight it

**Critical:** The Replit artifact system permanently injects `PORT=25629` into the `artifacts/cyber-sentinel` web workflow at the process level. This overrides:
- `[userenv.development]` settings
- Inline shell prefixes like `PORT=5000 pnpm run dev`

**Rule:** Always configure for port 25629. Never attempt to force port 5000.

---

### All API calls return 401

**Cause:** `CYBERSENTINEL_API_SECRET` enforcement is only active when `NODE_ENV=production`. In development the API is on localhost:8080 (not externally reachable), so no key is required. If 401s appear in development, check that `NODE_ENV` is not accidentally set to `production` in the shared env vars.

---

### `.migration-backup/*` workflows fail

These are backup copies with no `node_modules`. Expected to fail — ignore them entirely.

---

### pnpm install fails with `@workspace/db not found`

**Status: Already fixed** as of June 2026. The phantom dependency (`"@workspace/db": "workspace:*"` and `"drizzle-orm": "catalog:"`) has been removed from `artifacts/api-server/package.json`.

---

## Architecture at a glance

```
artifacts/
  api-server/              Express 5 + MongoDB + Groq/Mistral
    src/routes/            stats, knowledge, commands, tools, chat, analyze, health
    src/lib/models/        Command, Knowledge, Session, Tool (Mongoose schemas)
    src/lib/groq.ts        Groq AI client + SYSTEM_PROMPT export
    src/lib/multi-ai.ts    Best-answer mode — queries all providers in parallel
  cyber-sentinel/          React + Vite + Tailwind v4 + shadcn/ui (cyberpunk theme)
    src/pages/             Dashboard, Chat, Vault, Tools, Commands, Settings
    vite.config.ts         HMR clientPort fix + /api proxy to localhost:8080
  cyber-sentinel-mobile/   Expo (React Native)
lib/
  api-spec/                openapi.yaml — source of truth for the API contract
  api-client-react/        Generated TanStack Query hooks (Orval from openapi.yaml)
  api-zod/                 Generated Zod schemas
```

**Key facts:**
- API server listens on `process.env.API_PORT ?? 8080`. Uses a dedicated var to avoid conflict with `PORT` (owned by the web artifact). In production on Render, `render.yaml` sets both `PORT=10000` and `API_PORT=10000`.
- Vite proxy: all `/api/*` requests from the frontend → `http://localhost:8080`
- Vite proxy injects `x-api-key: $CYBERSENTINEL_API_SECRET` as an upstream header when the secret is set (see `vite.config.ts` proxy config)
- Best-AI mode queries Groq + Mistral in parallel; a judge picks the winner. `SYSTEM_PROMPT` must be exported from `groq.ts` for `multi-ai.ts` to import it.
- KB scraping uses Cheerio; KB entries have a `sources[]` array field (legacy `source` string still supported)
- Commands support `{{target}}`, `TARGET_IP`, `TARGET_URL` placeholder substitution

---

## To regenerate the API client after changing `openapi.yaml`

```bash
pnpm --filter @workspace/api-spec run codegen
```

Regenerates `lib/api-client-react/src/generated/api.ts` and `lib/api-zod/`.

---

## Pending work / backlog

- [ ] Gemini AI provider not wired into `multi-ai.ts` (only Groq + Mistral are active)
- [ ] No authentication layer — single-tenant, protected only by `CYBERSENTINEL_API_SECRET` in production
- [ ] MongoDB text indexes not created — search uses basic regex, will slow down as vault grows
- [ ] Mobile app missing AI Ops streaming chat and Knowledge Vault scraping
- [ ] `useCount`/`lastUsed` on commands are tracked but no UI sort by "most used" / "recently used"
- [ ] Tool seeding is hardcoded in `src/lib/seed-tools.ts` — only 9 tools seeded on first run
