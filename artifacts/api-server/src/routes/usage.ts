import { Router } from 'express';
import connectToDatabase from '../lib/mongodb';
import { getSnapshot } from '../lib/groq-ratelimit-cache';
import { getProviderSnapshot, KNOWN_LIMITS } from '../lib/ai-limits-cache';
import mongoose from 'mongoose';

const router = Router();

const PROVIDERS = [
  {
    key: 'groq',
    label: 'Groq',
    model: 'llama-3.3-70b-versatile',
    configured: () => !!process.env.GROQ_API_KEY,
  },
  {
    key: 'openrouter',
    label: 'OpenRouter',
    model: 'deepseek-r1-0528:free',
    configured: () => !!process.env.OPENROUTER_API_KEY_1,
  },
  {
    key: 'gemini',
    label: 'Gemini',
    model: 'gemini-1.5-flash',
    configured: () => !!process.env.GEMINI_API_KEY,
  },
  {
    key: 'mistral',
    label: 'Mistral',
    model: 'mistral-small-latest',
    configured: () => !!process.env.MISTRAL_API_KEY,
  },
  {
    key: 'cohere',
    label: 'Cohere',
    model: 'command-r',
    configured: () => !!process.env.COHERE_API_KEY,
  },
  {
    key: 'together',
    label: 'Together AI',
    model: 'Llama-3.3-70B-Instruct-Turbo-Free',
    configured: () => !!process.env.TOGETHER_API_KEY,
  },
  {
    key: 'cloudflare',
    label: 'Cloudflare AI',
    model: 'llama-3.3-70b-fp8-fast',
    configured: () => !!((process.env.CLOUDFLARE_AI_ACCOUNT_ID ?? process.env.OTHER_SECRET_1) && process.env.CLOUDFLARE_AI_API_TOKEN),
  },
];

router.get('/health/usage', async (_req, res) => {
  const result: Record<string, any> = {
    mongo: null,
    groq: getSnapshot(),
    providers: [],
  };

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

export default router;
