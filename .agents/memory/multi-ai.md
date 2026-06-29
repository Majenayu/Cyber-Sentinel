---
name: Multi-AI best-answer engine
description: How the multi-provider AI system works and what to keep consistent
---

The engine lives in `artifacts/api-server/src/lib/multi-ai.ts`.

**How it works:** `getBestAnswer()` calls all configured providers in parallel via `Promise.allSettled`, then uses a judge prompt (via first available Groq key) to pick the winner by index. Returns `{ content, provider, reason }`.

**Why:** User has 9 API keys (Groq x2, OpenRouter x2, Gemini, Mistral, Cohere, Together, Cloudflare). Goal is best quality answer, not round-robin.

**How to apply:** 
- Chat route `/chat/sessions/:id/messages/best` uses this. Streaming mode `/stream` still uses single Groq.
- SYSTEM_PROMPT must remain exported (`export const SYSTEM_PROMPT`) from `groq.ts` so multi-ai.ts and chat.ts can import it.
- Toggle in Chat UI: `useBestAI` state. BEST-AI = parallel, SINGLE = streaming Groq only.
- Provider badge shown on each assistant message when best-AI was used.
