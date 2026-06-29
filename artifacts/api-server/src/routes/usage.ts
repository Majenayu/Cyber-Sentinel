import { Router } from 'express';
import connectToDatabase from '../lib/mongodb';
import { getSnapshot } from '../lib/groq-ratelimit-cache';
import { getProviderSnapshot, KNOWN_LIMITS } from '../lib/ai-limits-cache';
import { getAvailableProviders } from '../lib/multi-ai';
import mongoose from 'mongoose';

const router = Router();

const PROVIDERS = [
  { key: 'groq',       label: 'Groq',         model: 'llama-3.3-70b-versatile',        configured: () => !!process.env.GROQ_API_KEY },
  { key: 'openrouter', label: 'OpenRouter',    model: 'llama-3.1-8b-instruct:free',     configured: () => !!process.env.OPENROUTER_API_KEY_1 },
  { key: 'gemini',     label: 'Gemini',        model: 'gemini-2.0-flash',               configured: () => !!process.env.GEMINI_API_KEY },
  { key: 'mistral',    label: 'Mistral',       model: 'mistral-small-latest',           configured: () => !!process.env.MISTRAL_API_KEY },
  { key: 'cohere',     label: 'Cohere',        model: 'command-r',                      configured: () => !!process.env.COHERE_API_KEY },
  { key: 'together',   label: 'Together AI',   model: 'Llama-3.3-70B-Instruct-Turbo-Free', configured: () => !!process.env.TOGETHER_API_KEY },
  { key: 'cloudflare', label: 'Cloudflare AI', model: 'llama-3.3-70b-fp8-fast',        configured: () => !!((process.env.CLOUDFLARE_AI_ACCOUNT_ID ?? process.env.OTHER_SECRET_1) && process.env.CLOUDFLARE_AI_API_TOKEN) },
];

router.get('/health/usage', async (_req, res) => {
  const result: Record<string, any> = { mongo: null, groq: getSnapshot(), providers: [] };

  try {
    await connectToDatabase();
    const db = mongoose.connection.db;
    if (db) {
      const stats = await db.stats();
      result.mongo = {
        dataSize: stats.dataSize ?? 0,
        storageSize: stats.storageSize ?? 0,
        indexSize: stats.indexSize ?? 0,
        objects: stats.objects ?? 0,
        collections: stats.collections ?? 0,
        fsTotalSize: stats.fsTotalSize ?? null,
        fsUsedSize: stats.fsUsedSize ?? null,
      };
    }
  } catch (err: any) {
    result.mongoError = err.message;
  }

  result.providers = PROVIDERS.map(p => ({
    key: p.key,
    label: p.label,
    model: p.model,
    configured: p.configured(),
    staticLimits: KNOWN_LIMITS[p.key] ?? {},
    snapshot: getProviderSnapshot(p.key),
  }));

  res.json(result);
});

/** Quick health-ping each configured provider with a tiny prompt and report pass/fail */
router.post('/health/providers/check', async (_req, res) => {
  const PING = 'Reply with exactly the word PONG and nothing else.';
  const SYSTEM = 'You are a health-check bot. Reply only with the single word PONG.';
  const providers = getAvailableProviders();

  if (providers.length === 0) {
    res.json({ results: [], error: 'No providers configured' });
    return;
  }

  // Run all checks in parallel with a 15s timeout each
  const checks = await Promise.allSettled(
    providers.map(async (p) => {
      const start = Date.now();
      const content = await Promise.race([
        p.call([{ role: 'user', content: PING }], SYSTEM),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout after 15s')), 15_000)),
      ]);
      return { name: p.name, key: p.providerKey, ok: true, latencyMs: Date.now() - start, response: (content as string).slice(0, 80) };
    })
  );

  const results = checks.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    return { name: providers[i].name, key: providers[i].providerKey, ok: false, latencyMs: null, error: String(r.reason?.message ?? r.reason).slice(0, 200) };
  });

  res.json({ results });
});

export default router;
