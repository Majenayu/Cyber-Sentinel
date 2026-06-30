import { Router, type Request, type Response } from 'express';
import connectToDatabase from '../lib/mongodb';
import PushSubscription from '../lib/models/PushSubscription';
import { VAPID_PUBLIC_KEY, sendPush } from '../lib/push';

const router = Router();

// GET /api/push/vapid-public-key — frontend fetches this to subscribe
router.get('/push/vapid-public-key', (_req: Request, res: Response) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY || null });
});

// POST /api/push/subscribe — save or update a push subscription
router.post('/push/subscribe', async (req: Request, res: Response) => {
  try {
    const { endpoint, keys, expirationTime } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      res.status(400).json({ error: 'Invalid subscription object' });
      return;
    }
    await connectToDatabase();
    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { endpoint, keys, userAgent: req.headers['user-agent'] || '' },
      { upsert: true, new: true },
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

// DELETE /api/push/unsubscribe — remove a subscription
router.delete('/push/unsubscribe', async (req: Request, res: Response) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) { res.status(400).json({ error: 'endpoint required' }); return; }
    await connectToDatabase();
    await PushSubscription.deleteOne({ endpoint });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to remove subscription' });
  }
});

// POST /api/push/test — send a test notification to all subscriptions
router.post('/push/test', async (_req: Request, res: Response) => {
  try {
    await connectToDatabase();
    const subs = await PushSubscription.find().lean();
    if (!subs.length) { res.json({ sent: 0, message: 'No subscriptions registered' }); return; }

    const results = await Promise.all(
      subs.map(sub => sendPush(sub as any, {
        title: '🔒 CyberSentinel',
        body:  'Push notifications are working!',
        icon:  '/icon-192.svg',
        url:   '/intrusions',
        tag:   'test',
      })),
    );

    // Clean up expired subscriptions
    const expired = subs.filter((_, i) => !results[i]);
    if (expired.length) {
      await PushSubscription.deleteMany({ endpoint: { $in: expired.map(s => s.endpoint) } });
    }

    res.json({ sent: results.filter(Boolean).length, total: subs.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Test push failed' });
  }
});

export default router;
