import { Router } from 'express';
import connectToDatabase from '../lib/mongodb';
import { getSnapshot } from '../lib/groq-ratelimit-cache';
import mongoose from 'mongoose';

const router = Router();

router.get('/health/usage', async (_req, res) => {
  const result: Record<string, any> = {
    mongo: null,
    groq: getSnapshot(),
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

  res.json(result);
});

export default router;
