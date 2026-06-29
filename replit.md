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

- Workflows start automatically: `artifacts/cyber-sentinel: web`, `artifacts/api-server: API Server`
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind v4 + wouter + shadcn/ui (cyberpunk dark theme, 12 hacker themes)
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
- Themes: 12 hacker color themes stored in localStorage via ThemeContext; CSS custom properties on `:root[data-theme]`
- PWA: manifest.json + sw.js (service worker) + skull SVG icons in public/ — installable on Android via Chrome

## Gotchas

- **Port conflict**: Only one API server workflow should run at a time. If you see `EADDRINUSE: 8080`, a duplicate workflow is competing. Kill stale processes with `fuser -k 8080/tcp`.
- The API server rebuilds on every `dev` start (esbuild bundle) — takes ~1–2s, normal behavior
- MongoDB connection is cached per-process; if MONGODB_URI changes, restart the API server workflow
- `CYBERSENTINEL_API_SECRET` is optional and **only enforced in production** (`NODE_ENV=production`). In development the API server is on localhost:8080 (not externally reachable), so no key is required.

## Troubleshooting — Preview Pane Blank / White Screen

This is the most common issue. Follow these steps in order:

### Step 1 — Make sure you are on the right tab
- In Replit, there is a **Preview** tab and a **Canvas** tab in the right panel.
- The Canvas tab shows embedded iframes — they can show a **cached blank page** even when the app is running fine.
- **Fix**: Click the **Preview** tab (not Canvas) to see the live web app.

### Step 2 — Hard refresh the preview
- Click inside the preview pane and press **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (Mac).
- This forces a cache-busting reload and should show the running app.

### Step 3 — Check which workflow is running
- Only the `artifacts/cyber-sentinel: web` workflow runs the **frontend** (Vite on port 5000).
- Only the `artifacts/api-server: API Server` workflow runs the **backend** (Express on port 8080).
- Both must be **RUNNING** (green dot). If either shows FAILED or STOPPED, click the workflow name and press Restart.

### Step 4 — Kill stale port processes
If the workflow shows it started but the page is still blank or you see a connection refused error:
```bash
fuser -k 5000/tcp 2>/dev/null; fuser -k 8080/tcp 2>/dev/null
```
Then restart both workflows.

### Step 5 — Check workflow logs for errors
Open each workflow in the Replit IDE and look for:
- `EADDRINUSE` → another process already owns the port → run step 4
- `Cannot find module` → pnpm install was not run → run `pnpm install` from the project root
- `vite: not found` → same as above

### Step 6 — Verify from the shell
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/
# Should print: 200

curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/health/status
# Should print: 200
```
If both return 200, the app is running — the issue is purely the browser cache. Go back to Step 2.

## PWA — Installing on Android

1. Open the app URL in **Chrome** on your Android phone.
2. Tap the **3-dot menu** (top right) → **"Add to home screen"** or **"Install app"**.
3. The skull icon appears on your home screen. The app opens fullscreen with no browser chrome.
4. The service worker (`public/sw.js`) caches the shell for offline use.

## Color Themes

12 hacker-aesthetic themes selectable from:
- **Sidebar** → color dot grid at the bottom of the nav
- **Settings page** → Appearance section

Themes: Matrix Green, Blood Red, Cyber Blue, Purple Haze, Orange Hack, Toxic Yellow, Neon Pink, Aqua Teal, Gold Rush, Ice White, Crimson Code, Royal Blue.

## User preferences

- Hacker/cyberpunk aesthetic throughout — dark backgrounds, monospace fonts, terminal-style UI
- All data backed by MongoDB — no hard limits on knowledge base, tools, or commands size
- Skull icon with matrix code as the app icon and logo
