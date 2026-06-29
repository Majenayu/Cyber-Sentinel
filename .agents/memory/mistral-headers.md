---
name: Mistral rate-limit header names
description: Mistral's API uses non-standard header names for rate limits — not the x-ratelimit-limit-requests convention
---

# Mistral Rate-Limit Header Names

## The rule
Mistral does NOT use the standard `x-ratelimit-limit-requests` / `x-ratelimit-limit-tokens` header names used by OpenAI, Groq, and others.

## Actual headers (captured from live responses, June 2026)
| Mistral header | Standard equivalent |
|---|---|
| `x-ratelimit-limit-req-minute` | `x-ratelimit-limit-requests` |
| `x-ratelimit-remaining-req-minute` | `x-ratelimit-remaining-requests` |
| `x-ratelimit-limit-tokens-minute` | `x-ratelimit-limit-tokens` |
| `x-ratelimit-remaining-tokens-minute` | `x-ratelimit-remaining-tokens` |
| `x-ratelimit-tokens-query-cost` | (no standard equivalent) |

**Why:** Mistral uses abbreviated `-req-` instead of `-requests-` and drops the per/hyphen before the time window.

**How to apply:** These names are already registered in `artifacts/api-server/src/lib/ai-limits-cache.ts` under the "Mistral-specific" comment block. If Mistral live progress bars show as empty/dim in the Settings page, check that block is still present.

## Free tier limits observed
- 50 req/min
- 50,000 tokens/min
- 500,000 tokens/month (static, not in headers)

## Groq decommissioned models (June 2026)
- `llama3-8b-8192` → 400 error, decommissioned
- `llama3-70b-8192` → 400 error, decommissioned
- Active models: `llama-3.3-70b-versatile` (primary), `llama-3.1-8b-instant` (fallback)
