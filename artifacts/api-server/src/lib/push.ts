import webpush from 'web-push';
import { logger } from './logger';

const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY  ?? '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? '';
const VAPID_SUBJECT     = process.env.VAPID_SUBJECT     ?? 'mailto:admin@cybersentinel.local';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export { VAPID_PUBLIC_KEY };

export interface PushPayload {
  title: string;
  body:  string;
  icon?: string;
  url?:  string;
  tag?:  string;
}

/**
 * Send a push notification to a single subscription object.
 * Returns true on success, false on failure (invalid/expired subs return false).
 */
export async function sendPush(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: PushPayload,
): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: subscription.keys },
      JSON.stringify(payload),
    );
    return true;
  } catch (err: any) {
    // 404/410 = subscription expired/unsubscribed — caller should delete it
    if (err?.statusCode === 404 || err?.statusCode === 410) return false;
    logger.warn({ err, endpoint: subscription.endpoint }, 'push send error');
    return false;
  }
}
