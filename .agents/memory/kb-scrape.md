---
name: KB URL ingestion and multi-source
description: How URL scraping and multiple source URLs work in Knowledge Base
---

**Scrape endpoint:** `POST /api/scrape/url` in `artifacts/api-server/src/routes/scrape.ts` (Cheerio-based, 10s timeout).

**Why:** User wanted to paste URLs instead of copying content manually. Multiple URLs per entry for references/mirrors.

**Schema note:** MongoDB Knowledge model only has `source: String`. The frontend sends `sources: string[]` + `source: sources[0]`. On read, frontend checks `entry.sources?.length ? entry.sources : (entry.source ? [entry.source] : [])` for backward compat. If schema is ever migrated, add `sources: [String]` to KnowledgeSchema.

**Auto-tag detection:** scrape.ts also exports `detectToolsInText(text)` — used by chat route to find tool references in AI responses and return clickable cards.
