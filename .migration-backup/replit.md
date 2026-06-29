# CyberSentinel

A personal cybersecurity operations hub for penetration testers — AI chat with Groq LLaMA streaming, knowledge vault with tag filtering, tool cheatsheets, saved commands, and a real-time system health dashboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/cyber-sentinel run dev` — run the frontend (port from env)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Required Secrets

| Secret | Purpose |
|---|---|
| `GROQ_API_KEY` | Groq AI API (LLaMA-3.3-70B-Versatile) |
| `MONGODB_URI` | MongoDB Atlas connection string |

## Stack

- **Monorepo**: pnpm workspaces, Node.js 24, TypeScript 5.9
- **Frontend**: Vite + React 18, TailwindCSS, Wouter routing, shadcn/ui
- **API**: Express 5 (`artifacts/api-server`, port 8080)
- **DB**: MongoDB + Mongoose (lazy connection in `connectToDatabase()`)
- **AI**: Groq SDK with server-sent events (SSE) streaming
- **Mobile**: Expo companion at `artifacts/cyber-sentinel-mobile`

## Where Things Live

| Path | What it is |
|---|---|
| `artifacts/cyber-sentinel/src/pages/` | All 6 frontend pages |
| `artifacts/cyber-sentinel/src/components/Sidebar.tsx` | Navigation sidebar |
| `artifacts/api-server/src/routes/` | Express route handlers |
| `artifacts/api-server/src/lib/groq.ts` | Groq streaming + system prompt |
| `artifacts/api-server/src/lib/models/` | Mongoose models (Knowledge, Session, Command, Tool) |
| `artifacts/api-server/src/lib/mongodb.ts` | Lazy DB connection |

## Features

### AI Ops Chat (`/chat`)
- Real-time streaming via SSE (`POST /api/chat/sessions/:id/messages/stream`)
- Always provides **both Linux and Windows** command equivalents
- Injects relevant Knowledge Vault context into every prompt automatically
- Stop button cancels in-flight stream via `AbortController`
- **Save-to-Vault**: hover any AI response → click "save" → title/tags modal → saved to KB

### Knowledge Vault (`/vault`)
- Paste any text (HTB Academy content, writeups, commands) — saved as-is
- Code blocks render with syntax highlighting and copy button
- **Tag filtering**: clickable tag pills filter the entry list instantly
- Full-text search against title, content, and tags

### Tool Reference (`/tools`)
- 7 pentesting tools auto-seeded: Nmap, Gobuster, SQLmap, Hydra, Metasploit, Netcat, Burp Suite
- Each tool has a cheatsheet with Linux + Windows examples

### Saved Commands (`/commands`)
- Save one-liner commands with category labels
- Category drawer on mobile, sidebar on desktop
- One-click copy to clipboard

### Dashboard (`/`)
- Live stat cards (knowledge entries, tools, commands, sessions)
- **Real health check**: pings MongoDB and verifies Groq API key on load
- Recent tags overview

### Settings (`/settings`)
- Live system status (real DB + AI check)
- App info, keyboard shortcuts reference
- Clear all chat sessions button

## Architecture Decisions

- **SSE streaming over WebSockets**: simpler server implementation, no extra library, works through Replit proxy
- **Lazy MongoDB connection**: `connectToDatabase()` called per-request, not at startup — prevents crash if env var is missing at boot
- **Knowledge context injection**: AI buildMessages() queries KB with keywords extracted from user message, injects top 3 matches as context
- **Vite proxy**: frontend proxies `/api` → `localhost:8080` so there are no CORS issues in development
- **No authentication**: single-user personal tool, auth adds complexity with no benefit

## Gotchas

- MongoDB lazy connection means first request after cold start is slightly slower
- Groq streaming uses `for await` over the SDK iterator — the SSE endpoint manually flushes with `res.write()` + `res.flush()`
- Knowledge search uses MongoDB `$regex` — works fine for small datasets, would need Atlas Search for large collections
- The Replit proxy strips some headers; `allowedHosts: true` in Vite config is required

## User Preferences

- Always provide both Windows (PowerShell/cmd) AND Linux (bash) command examples in AI responses
- Knowledge Base should handle raw copy-pasted HTB Academy content (large text blocks with code)
- Personal use only — no authentication needed
