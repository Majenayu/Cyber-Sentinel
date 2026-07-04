---
name: Autonomous research system
description: How the daily self-training research pipeline works — architecture, constraints, and gotchas.
---

## Architecture

- `artifacts/api-server/src/lib/researcher.ts` — core pipeline: scrape → AI analyze → save to General KB + Tools + Commands
- `artifacts/api-server/src/lib/scheduler.ts` — schedules daily 3:00 AM run via `setTimeout` to first 3AM then `setInterval(24h)`
- `artifacts/api-server/src/routes/research.ts` — routes: GET `/api/research/status`, GET `/api/research/log`, POST `/api/research/run` (SSE)
- `artifacts/api-server/src/lib/models/ResearchLog.ts` — Mongoose model tracking each run; uses `{ suppressReservedKeysWarning: true }` schema option to silence 'errors' field warning
- `artifacts/cyber-sentinel/src/pages/Vault.tsx` — `ResearchModal` component + "Research" button in KB toolbar

## Key rules

**Why:** Run lock (`researchRunning` boolean in researcher.ts) prevents scheduler + manual trigger from running concurrently. Without it, parallel DB writes cause duplicate Tools/Commands.

**How to apply:** The lock is in `runResearch()` — if already running, it throws an error immediately. The route returns this as a terminal `{ type: 'error', message }` SSE event.

**Why:** `POST /api/research/run` never reads `req.body.sources`. Accepting arbitrary URLs would be an SSRF vector. Always use `RESEARCH_SOURCES` allowlist from researcher.ts.

## 'general' category

Added to:
- `Knowledge.ts` schema enum (alongside tool/technique/lesson/command)
- `TOOL_CATEGORIES` in Tools.tsx
- `CATEGORIES` in Commands.tsx

All content created by the research pipeline is saved with `category: 'general'`.

## Source pool

15 curated sites in `RESEARCH_SOURCES` array in researcher.ts. Per run: picks 3 sources not scraped in the last 6h (rotates through the pool over days). Polite 2.5s delay between sources.

## Content slice for AI prompt

Uses head+tail strategy for long content (first 5000 + last 3000 chars) so commands appearing late in long documents are captured.
