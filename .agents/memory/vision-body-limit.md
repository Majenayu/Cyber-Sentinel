---
name: Vision API body size
description: Express body limit + Groq vision model usage for image analysis
---

## Rule
Always set `express.json({ limit: '20mb' })` and `express.urlencoded({ limit: '20mb' })` in app.ts. The default 100kb limit silently drops base64-encoded screenshot bodies — the request returns a 413 or is truncated with no useful error, causing the frontend to silently fall back to `[Image attached: filename]`.

**Why:** A typical 1920×1080 PNG screenshot is 2–5MB as base64. The Express default kills it before it reaches the route handler. The silence is the dangerous part — no log entry, no clear error.

**How to apply:** Any time image upload or base64 data is added to the API, confirm the body limit is already 20mb in `app.ts`.

## Groq vision endpoint
- Use native `fetch` to call `https://api.groq.com/openai/v1/chat/completions` — the Groq TS SDK does not properly type the `image_url` content array
- Primary model: `llama-3.2-11b-vision-preview`; fallback: `llama-3.2-90b-vision-preview`
- Image content format: `{ type: 'image_url', image_url: { url: 'data:image/jpeg;base64,...' } }`
- Live in `artifacts/api-server/src/routes/analyze.ts` at `POST /analyze/image`

## Client-side compression
Before sending, compress with Canvas: resize to max 1280px, convert to JPEG at 0.88 quality. This keeps base64 payload under ~400KB regardless of original size.
