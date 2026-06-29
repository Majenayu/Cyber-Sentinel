---
name: Artifact workflow port conflicts
description: How artifact-managed workflows interact with .replit-defined workflows and port assignment rules.
---

## The Rule
Artifact workflows (`artifacts/xxx: yyy`) inherit env vars from `[userenv.development]` in `.replit`. If `PORT=25629` is set there, any artifact workflow that doesn't override PORT will try to bind 25629.

## The Problem
`.replit` defines `Start application` (PORT=25629) and `API Server` (API_PORT=8080). Artifact workflows `artifacts/cyber-sentinel: web` and `artifacts/api-server: API Server` use the same ports from env, causing conflicts when both sets run simultaneously.

## Replit Preview Blank Page (Vite HMR WebSocket)
**Symptom:** `localhost:5000` returns 200 and screenshot tool shows the app, but `.replit.dev` preview is blank white.
**Cause:** Vite injects an HMR client into every page that opens a WebSocket back to the raw dev port (5000). The Replit proxy only exposes port 443 (HTTPS) — the direct WebSocket to 5000 is blocked, the Vite client never initialises, React never mounts.
**Fix:** `hmr: { clientPort: 443 }` in `server` block of `vite.config.ts`. Already applied — do not remove.

**Why:** Without this, every page load through the Replit proxy produces a silent blank — the HTML loads fine but JS execution stalls waiting for the Vite client WebSocket that never connects.

**How to apply:** Add to any Vite project deployed on Replit:
```ts
server: { hmr: { clientPort: 443 } }
```

## The Fix Applied
- `artifacts/api-server/src/index.ts`: uses `API_PORT ?? "8080"` — never use the frontend PORT as API port fallback.
- `[userenv.development] PORT` must be `"5000"` — Replit's preview proxy reads this to know which port to forward to the webview iframe. If it's set to anything else (e.g. 25629), the preview panel goes blank even though the server is healthy.
- The web workflow command must NOT hardcode `PORT=5000` — it should inherit PORT from the environment so `.replit` and the command stay in sync.
- When artifact workflows fail due to port conflict, remove the `.replit`-defined duplicate workflows (`Start application`, `API Server`) via `removeWorkflow()` to free ports, then restart the artifact workflows.

## API Secret — Dev vs Production
`CYBERSENTINEL_API_SECRET` is read in `app.ts` as `process.env.NODE_ENV === 'production' ? process.env.CYBERSENTINEL_API_SECRET : undefined`. The secret gate is disabled in development. Vite proxy `headers` object (inside the proxy target config) DOES inject upstream request headers — this is correct for forwarding `x-api-key` to the API server.

## Production Port Fix (render.yaml)
`render.yaml` sets `PORT=10000` but api-server uses `API_PORT`. The fix is to add `API_PORT=10000` alongside `PORT=10000` in render.yaml. Never make api-server use `PORT` as a fallback — the global PORT belongs to the Vite frontend workflow.

## configureWorkflow Limitation
At 10/10 workflow limit, `configureWorkflow` cannot update even EXISTING workflows — it always throws "Workflow limit exceeded". The 4 `.migration-backup/*` artifact-managed workflows cannot be deleted either. The only escape is `removeWorkflow()` on non-artifact workflows.

**Why:** Artifact-managed workflows (those with the `artifacts/` prefix) are created by the artifact system and count toward the limit permanently.

**How to apply:** If the workflow system is stuck at 10/10 and you need to reconfigure: remove `.replit`-defined non-artifact workflows first (they can be re-created later), then restart the artifact workflow with the right environment.
