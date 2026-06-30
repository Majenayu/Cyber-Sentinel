# CyberSentinel

A cyberpunk cybersecurity operations dashboard with AI-powered threat analysis, knowledge vault, saved commands, tool reference, chat sessions, and a live intrusion detection system with interactive world map.

Available as a **web app** (React + Vite) and **mobile app** (Expo/React Native).

---

## Quick Setup (after cloning from GitHub)

### 1. Install dependencies

```bash
pnpm install
```

> **Requires pnpm.** If you don't have it: `npm install -g pnpm`
> **Requires Node.js 20+.** Recommended: Node.js 24.

### 2. Set environment secrets

Add these in your environment (`.env` file for local dev, or Replit Secrets tab):

| Key | Required | Description |
|-----|----------|-------------|
| `MONGODB_URI` | **Yes** | MongoDB Atlas connection string (`mongodb+srv://...`) |
| `GROQ_API_KEY` | **Yes** | Groq API key — get one free at [console.groq.com](https://console.groq.com) |
| `MISTRAL_API_KEY` | No | Mistral API key — enables Best-AI mode (queries both providers in parallel) |
| `SMTP_PASSWORD` | No | Gmail App Password — enables email alerts on intrusion attempts |
| `CYBERSENTINEL_API_SECRET` | No | Any strong random string — secures the API in production |
| `SESSION_SECRET` | No | Any strong random string — signs session cookies |

Also set this environment variable (not secret):

| Key | Value | Description |
|-----|-------|-------------|
| `SMTP_EMAIL` | `pgayushraipc@gmail.com` | Gmail address used to send intrusion alert emails |

### 3. Start the app

Run both of these in separate terminals:

```bash
# Terminal 1 — API server (port 8080)
pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend (port 5000 or auto-assigned)
pnpm --filter @workspace/cyber-sentinel run dev
```

Then open the URL shown in Terminal 2 in your browser.

**Login:** Enter operator ID `Majen` at the boot screen to access the dashboard.

---

## Replit Setup

If you opened this project in Replit:

1. Run `pnpm install` in the Shell once
2. Add secrets in the **Secrets** tab (lock icon) — see table above
3. Add `SMTP_EMAIL` in the **Environment Variables** tab
4. Both workflows (`artifacts/cyber-sentinel: web` and `artifacts/api-server: API Server`) start automatically
5. Hard-refresh the Preview pane if it shows blank: **Ctrl+Shift+R**

---

## Features

- **Dashboard** — live stats, health monitor, AI model status, intrusion alert strip
- **AI Chat** — multi-session chat with Groq (llama-3) + optional Mistral; Best-AI mode queries both
- **Knowledge Vault** — searchable notes with URL scraping and AI summarization
- **Saved Commands** — templated shell commands with `{{target}}` auto-substitution
- **Tool Reference** — searchable security tool catalog
- **Intrusion Log** (`/intrusions`) — live interactive world threat map + detailed attacker records
- **IP Reputation** — geolocation, ISP, proxy/VPN detection, AbuseIPDB score, embedded location map
- **CVE Search** — real-time CVE lookup
- **Network Recon** — port scan, DNS, WHOIS, traceroute
- **Payload Library** — XSS, SQLi, LFI, XXE, SSRF payloads
- **Social OSINT** — username enumeration across platforms
- **Breach Checker** — HaveIBeenPwned breach search
- **JWT Analyzer** — decode, verify, and forge JWT tokens
- **Hash Tool** — generate and crack hashes
- **Google Dork Builder** — dorking query generator
- **QR Tracker / Honeypot** — track who scans your QR codes
- **Email Header Analyzer** — parse and analyze email headers
- **Browser Fingerprint** — display your own browser fingerprint
- **Settings** — 12 hacker color themes, API key status, system info
- **PWA** — installable on Android via Chrome (skull icon, fullscreen, offline shell cache)

---

## Interactive Maps

### Threat Map (Intrusions page)

A full Leaflet.js world map (CartoDB Dark Matter tiles — **no API key needed**) showing:

- Red dots for every attacker IP — size scales with number of attempts
- Dashed arc lines from each attacker back to your server
- Click any dot for full attacker profile: IP, country, city, ISP, browser, OS, screen info, all IDs attempted
- Scroll to zoom from world level down to street level
- Server pin location: New Delhi, India (edit `SERVER_LAT`/`SERVER_LON` in `ThreatMapLeaflet.tsx`)

### IP Location Map (IP Reputation page)

A mini embedded map below the IP lookup results:
- Centers on the IP's exact coordinates
- Zoom from city level to street level
- Red pulsing marker with IP label

---

## Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | pnpm workspaces |
| Runtime | Node.js 24, TypeScript 5.9 |
| Frontend | React 19, Vite 7, Tailwind v4, shadcn/ui, wouter |
| Maps | Leaflet 1.9, react-leaflet 5 (CartoDB Dark Matter tiles) |
| Mobile | Expo (React Native), expo-router |
| API | Express 5, mongoose (MongoDB) |
| AI | Groq SDK (primary), Mistral (secondary) |
| Email | nodemailer via Gmail SMTP |
| API codegen | Orval (from OpenAPI spec) |
| Build | esbuild (API), Vite (frontend) |

---

## Project Structure

```
/
├── artifacts/
│   ├── cyber-sentinel/          # React/Vite web app
│   │   └── src/
│   │       ├── components/
│   │       │   ├── ThreatMapLeaflet.tsx  # Interactive world threat map
│   │       │   ├── MiniMap.tsx           # IP location mini-map
│   │       │   ├── HackerLoader.tsx      # Boot screen + auth gate
│   │       │   └── Sidebar.tsx           # Navigation
│   │       └── pages/
│   │           ├── Dashboard.tsx
│   │           ├── Intrusions.tsx        # Uses ThreatMapLeaflet
│   │           └── IpRepPage.tsx         # Uses MiniMap
│   ├── cyber-sentinel-mobile/   # Expo mobile app
│   └── api-server/              # Express API
│       └── src/
│           ├── routes/          # All API routes
│           └── lib/
│               ├── mongodb.ts
│               ├── groq.ts
│               └── models/      # Mongoose models
├── lib/
│   ├── api-spec/
│   │   └── openapi.yaml         # OpenAPI spec (source of truth)
│   ├── api-client-react/        # Generated React Query hooks
│   └── api-zod/                 # Generated Zod schemas
├── replit.md                    # Replit-specific docs
└── README.md                    # This file
```

---

## Common Commands

```bash
# Install all packages
pnpm install

# Start API server (dev)
pnpm --filter @workspace/api-server run dev

# Start web frontend (dev)
pnpm --filter @workspace/cyber-sentinel run dev

# Start mobile app
pnpm --filter @workspace/cyber-sentinel-mobile run dev

# Full typecheck
pnpm run typecheck

# Regenerate API client from OpenAPI spec
pnpm --filter @workspace/api-spec run codegen
```

---

## Email Alerts Setup

Intrusion attempts trigger email alerts to `pgayushrai@gmail.com`. To enable:

1. Enable 2-Step Verification on your Google account
2. Go to [myaccount.google.com](https://myaccount.google.com) → Security → App passwords
3. Create an App Password for Mail (name it `CyberSentinel`)
4. Copy the 16-character code and set it as the `SMTP_PASSWORD` secret (no spaces)

If `SMTP_PASSWORD` is missing, the app still works — attempts are logged to MongoDB, email is just skipped.

---

## Troubleshooting

### App won't start / blank screen

```bash
# Kill stale processes
fuser -k 5000/tcp 2>/dev/null
fuser -k 8080/tcp 2>/dev/null

# Then restart both servers
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/cyber-sentinel run dev
```

### API server EADDRINUSE: 8080

Only one API server should run at a time. Kill the stale one:
```bash
fuser -k 8080/tcp
```

### pnpm install fails / Cannot find module

```bash
pnpm install
```

Run this from the project root any time after pulling new changes.

### Maps not showing / leaflet CSS missing

```bash
pnpm install
```

Leaflet is in `artifacts/cyber-sentinel/package.json`. If it's missing from `node_modules`, re-running `pnpm install` from the root fixes it.

### MongoDB connection fails

- Check that `MONGODB_URI` is set correctly
- Make sure your IP is whitelisted in MongoDB Atlas Network Access (or use 0.0.0.0/0 for dev)
- Restart the API server after changing `MONGODB_URI`

---

## Auth / Login Gate

The boot screen only accepts operator ID **`Majen`**. Any wrong attempt:
- Is logged to MongoDB with full attacker fingerprint (IP, geolocation, browser, OS, screen, etc.)
- Triggers an email alert (if `SMTP_PASSWORD` is configured)
- Appears on the live threat map at `/intrusions`

To change the accepted operator ID, edit `HackerLoader.tsx`.
