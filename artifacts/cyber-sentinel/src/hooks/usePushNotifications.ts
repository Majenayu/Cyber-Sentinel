import { useEffect, useRef } from 'react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(ch => ch.charCodeAt(0)));
}

async function registerPush(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;

  // Ask for permission (no-op if already granted/denied)
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  const reg = await navigator.serviceWorker.ready;

  // Fetch VAPID public key
  const res = await fetch('/api/push/vapid-public-key');
  if (!res.ok) return;
  const { publicKey } = await res.json();
  if (!publicKey) return;

  // Check existing subscription first
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    // Already subscribed — make sure server knows about it
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(existing.toJSON()),
    }).catch(() => {});
    return;
  }

  // Subscribe
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription.toJSON()),
  });
}

/**
 * Call this hook once the user has authenticated.
 * It silently requests notification permission and registers the push subscription.
 * All errors are swallowed — push is a nice-to-have, never a blocker.
 */
export function usePushNotifications(active: boolean): void {
  const done = useRef(false);
  useEffect(() => {
    if (!active || done.current) return;
    done.current = true;
    registerPush().catch(() => {});
  }, [active]);
}
