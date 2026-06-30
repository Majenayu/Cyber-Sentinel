# CyberSentinel

A cybersecurity operations dashboard with AI-powered analysis, knowledge vault, tool reference, saved commands, chat sessions, and a live intrusion detection system — available as both a web app and mobile app.

## First-time setup (after importing from GitHub)

Run this once before anything else:
```
pnpm install
```

Then add the required secrets in the **Secrets** tab (the lock icon):

| Secret key | Required? | What it is |
|---|---|---|
| `MONGODB_URI` | **Required** | MongoDB Atlas connection string (e.g. `mongodb+srv://...`) |
| `GROQ_API_KEY` | **Required** | Groq API key from console.groq.com |
| `MISTRAL_API_KEY` | Optional | Mistral API key — used for Best-AI mode (queries both providers) |
| `CYBERSENTINEL_API_SECRET` | Optional | Any strong random string — locks the API in production |
| `SESSION_SECRET` | Optional | Any strong random string — signs session cookies |
| `SMTP_PASSWORD` | Optional | Gmail App Password for email alert sending (see below) |

Then add these in the **Environment Variables** tab (not Secrets — these are not sensitive):

| Env var key | Value | What it is |
|---|---|---|
| `SMTP_EMAIL` | `pgayushraipc@gmail.com` | Gmail address that sends intrusion alert emails |

After secrets and env vars are set, restart all workflows. Everything should be green on the dashboard.

---

## Email Alerts — Intrusion Detection Setup

The app logs every failed login attempt to MongoDB and sends an email alert to `pgayushrai@gmail.com` whenever someone types a wrong operator ID.

**`SMTP_EMAIL`** is already set to `pgayushraipc@gmail.com` (the sender address).

**`SMTP_PASSWORD`** must be a **Gmail App Password** — NOT your regular Gmail password. To get one:

1. Go to [myaccount.google.com](https://myaccount.google.com) → **Security**
2. Enable **2-Step Verification** if not already on
3. Search for **"App passwords"** in the search bar
4. Click **App passwords** → choose app: **Mail**, device: **Other** → type `CyberSentinel`
5. Google will show a **16-character code** (e.g. `abcd efgh ijkl mnop`)
6. Add that code as the `SMTP_PASSWORD` secret in Replit (no spaces)

If `SMTP_PASSWORD` is missing or wrong, the app still works — intrusion attempts are still logged to MongoDB, email alerts are just silently skipped.

**Troubleshooting email:**
- Check spam folder for the first email — Gmail sometimes filters unknown senders
- If `SMTP_PASSWORD` changes, restart the `artifacts/api-server: API Server` workflow
- Email is sent via `nodemailer` using Gmail SMTP (`smtp.gmail.com:587`)
- Alert subject: `🚨 [CYBERSENTINEL] NEW INTRUSION ATTEMPT — <IP>` (first time) or `⚠️ REPEAT INTRUSION — <IP> (N attempts)` (subsequent)

---

## Run & Operate

- Workflows start automatically: `artifacts/cyber-sentinel: web`, `artifacts/api-server: API Server`
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

---

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind v4 + wouter + shadcn/ui (cyberpunk dark theme, 12 hacker themes)
- Maps: Leaflet 1.9 + react-leaflet 5 — interactive threat map and IP location map (CartoDB Dark Matter tiles, no API key required)
- Mobile: Expo (React Native) with expo-router
- API: Express 5 + MongoDB (mongoose) + Groq SDK + nodemailer
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)
- Build: esbuild

---

## Where things live

- `artifacts/cyber-sentinel/` — React/Vite web app (served at `/`)
  - `src/components/HackerLoader.tsx` — full-screen loading + username gate
  - `src/components/ThreatMapLeaflet.tsx` — full interactive world map (Leaflet), used on Intrusions page
  - `src/components/MiniMap.tsx` — small Leaflet map for single-IP location, used on IP Reputation page
  - `src/components/Globe3D.tsx` — retired 3D canvas globe (no longer rendered, kept for reference)
  - `src/pages/Intrusions.tsx` — intrusion log dashboard with live threat map at top
  - `src/pages/IpRepPage.tsx` — IP reputation lookup with embedded location map below results
  - `src/pages/Dashboard.tsx` — simplified dashboard, no globe; has intrusion strip button → /intrusions
  - `src/index.css` — global styles including scrollbar hide (`scrollbar-width: none`)
- `artifacts/cyber-sentinel-mobile/` — Expo mobile app
- `artifacts/api-server/` — Express API server (served at `/api`)
  - `src/routes/` — route handlers (stats, knowledge, commands, tools, chat, analyze, health, intrusion)
  - `src/routes/intrusion.ts` — `POST /api/auth/intrusion` + `GET /api/auth/intrusions`
  - `src/lib/mongodb.ts` — MongoDB connection
  - `src/lib/groq.ts` — Groq AI client
  - `src/lib/models/` — Mongoose models (Knowledge, Session, Command, Tool, Intrusion)
- `lib/api-spec/openapi.yaml` — OpenAPI source of truth
- `lib/api-client-react/` — generated React Query hooks
- `lib/api-zod/` — generated Zod schemas

---

## Architecture decisions

- MongoDB (via mongoose) is used for all data storage — not PostgreSQL/Drizzle
- Groq is the primary AI provider; Mistral is the secondary (Best-AI mode uses both)
- The web app proxies `/api` requests to the Express server via Vite dev proxy (port 8080)
- The API server listens on `API_PORT ?? 8080`; the artifact workflow does not set PORT for the API
- All artifacts use the shared pnpm workspace catalog for version pinning
- Themes: 12 hacker color themes stored in localStorage via ThemeContext; CSS custom properties on `:root[data-theme]`
- PWA: manifest.json + sw.js (service worker) + skull SVG icons in public/ — installable on Android via Chrome
- Intrusion tracking: IP geolocation via `ip-api.com` (free, no key required); email via Gmail SMTP + nodemailer
- Maps: Leaflet (not Google Maps, not Mapbox) — uses free CartoDB Dark Matter tiles, requires no API key
- Scrollbars: hidden globally via CSS (`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`) — pages remain scrollable

---

## Interactive Maps

### Threat Map (Intrusions page — `/intrusions`)

`ThreatMapLeaflet.tsx` renders a full-width interactive world map (height 480px by default):

- **Tile layer**: CartoDB Dark Matter (dark background, no API key needed)
- **Red dots**: one per attacker IP, radius grows with `attempts` count (min 4px, max 15px)
- **Dashed arc lines**: from each attacker location to the server (New Delhi, 28.6139°N 77.2090°E)
- **Click a dot**: popup shows all attacker fields (IP, country, region, city, timezone, ISP, org, coords, attempts, IDs tried, browser, OS, platform, language, screen, cores, RAM, first/last seen, Google Maps link)
- **Green server marker**: pulsing ring animation at the server location
- **Auto-fit**: map zooms to fit all attackers on first load
- **Scroll to zoom** from world level (zoom 2) down to street level (zoom 18)
- Live data from `GET /api/auth/intrusions`, auto-refreshes every 30s

### IP Location Map (IP Reputation page — `/ip-rep`)

`MiniMap.tsx` renders a 300px tall embedded map below the IP lookup results:

- Same CartoDB Dark Matter tiles
- Red pulsing marker at the IP's lat/lon
- Starts at zoom level 10 (city view), user can scroll to zoom to street level
- Only renders when `lat` and `lon` are non-zero in the geo response
- Clicking the marker shows the IP and exact coordinates

### Changing the server location

The server marker is hardcoded in `ThreatMapLeaflet.tsx`:
```ts
const SERVER_LAT = 28.6139; // New Delhi, India
const SERVER_LON = 77.2090;
```
Edit these two constants to move it.

---

## Intrusion Detection System

Every failed login attempt (wrong operator ID on the loader screen) is captured and stored in MongoDB:

| Field | Source | Description |
|---|---|---|
| `ip` | Server (`req.headers['x-forwarded-for']`) | Real IP address of the attacker |
| `country`, `city`, `region` | ip-api.com lookup | Geolocation of the IP |
| `isp`, `org` | ip-api.com lookup | Internet provider and organization |
| `lat`, `lon` | ip-api.com lookup | GPS coordinates (plotted on threat map) |
| `browser`, `os` | Parsed from User-Agent header | Browser and operating system |
| `platform`, `language` | Browser `navigator` API | Device platform and language |
| `screenResolution`, `colorDepth` | Browser `screen` API | Display characteristics |
| `cores`, `memory` | Browser `navigator` API | CPU core count and RAM |
| `cookieEnabled`, `doNotTrack` | Browser `navigator` API | Privacy settings |
| `plugins` | Browser `navigator.plugins` | Installed browser plugins |
| `attemptedIds` | Form input | All operator IDs the attacker tried |
| `attempts` | Counter | Total attempts from this IP (all-time) |
| `firstSeen`, `lastSeen` | Server timestamps | Timeline of activity |

View all logged intrusions at `/intrusions` in the sidebar ("Intrusion Log"). All attacker IPs are plotted on the live threat map.

---

## Gotchas

- **Port conflict**: Only one API server workflow should run at a time. If you see `EADDRINUSE: 8080`, a duplicate workflow is competing. Kill stale processes with `fuser -k 8080/tcp`.
- The API server rebuilds on every `dev` start (esbuild bundle) — takes ~1–2s, normal behavior
- MongoDB connection is cached per-process; if MONGODB_URI changes, restart the API server workflow
- `CYBERSENTINEL_API_SECRET` is optional and **only enforced in production** (`NODE_ENV=production`). In development the API server is on localhost:8080 (not externally reachable), so no key is required.
- `SMTP_PASSWORD` must be a **Gmail App Password**, not your Gmail login password. Regular passwords will fail with "Username and Password not accepted".
- Intrusion geolocation calls `ip-api.com` with a 4-second timeout — on slow networks the lookup may be skipped and location will show "Unknown". Attackers without valid lat/lon are NOT plotted on the threat map.
- **Leaflet CSS**: both `ThreatMapLeaflet.tsx` and `MiniMap.tsx` import `leaflet/dist/leaflet.css`. This is normal — Vite deduplicates it. Do not remove these imports or the map controls will break.
- **Globe3D.tsx** is no longer rendered anywhere. It exists in `src/components/` but is not imported by any page. Do not re-add it to Dashboard or Intrusions — the replacement is `ThreatMapLeaflet.tsx`.
- **react-leaflet v5** requires the `MapContainer` to be inside a DOM element with a defined height — always pass `style={{ height: '100%', width: '100%' }}` to the container and ensure its parent has a fixed height.
- **`lib/api-client-react` has no build script** — the TypeScript error about `dist/index.d.ts` on Dashboard.tsx is pre-existing and harmless. Vite resolves the source directly at dev time.

---

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
- Only the `artifacts/cyber-sentinel: web` workflow runs the **frontend** (Vite, typically port 5000 or 25629).
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
- `Failed to load url leaflet/dist/leaflet.css` → leaflet not installed → run `pnpm install` from root

### Step 6 — Verify from the shell
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/health/status
# Should print: 200 or 304
```
If it returns 200, the API is running. If the frontend port is not 5000, check the Vite workflow log for the actual port.

---

## Loader / Auth Screen

- The loader screen shows a full-screen red world map background with matrix rain animation
- After loading completes, a username gate appears: **only `Majen` is accepted**
- Any wrong username attempt is silently logged to MongoDB + triggers an email alert
- The world map image is at `artifacts/cyber-sentinel/public/worldmap-bg.png`

---

## PWA — Installing on Android

1. Open the app URL in **Chrome** on your Android phone.
2. Tap the **3-dot menu** (top right) → **"Add to home screen"** or **"Install app"**.
3. The skull icon appears on your home screen. The app opens fullscreen with no browser chrome.
4. The service worker (`public/sw.js`) caches the shell for offline use.

---

## Color Themes

12 hacker-aesthetic themes selectable from the **Settings page** → Appearance section.

Themes: Matrix Green, Blood Red, Cyber Blue, Purple Haze, Orange Hack, Toxic Yellow, Neon Pink, Aqua Teal, Gold Rush, Ice White, Crimson Code, Royal Blue.

---

## User preferences

- Hacker/cyberpunk aesthetic throughout — dark backgrounds, monospace fonts, terminal-style UI
- All data backed by MongoDB — no hard limits on knowledge base, tools, or commands size
- Skull icon with matrix code as the app icon and logo
- Theme selector only in Settings page (removed from sidebar)
- Login gate: only operator ID "Majen" grants access
- Intrusion alert emails go to pgayushrai@gmail.com, sent from pgayushraipc@gmail.com
- Scrollbars hidden globally (pages still scrollable)
- Interactive Leaflet maps, not Globe3D — do not revert to the 3D canvas globe
