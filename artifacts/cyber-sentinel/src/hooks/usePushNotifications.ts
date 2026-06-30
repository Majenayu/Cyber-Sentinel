import { useState, useEffect, useRef, useCallback } from 'react';

export type PushStatus = 'idle' | 'requesting' | 'subscribed' | 'denied' | 'unsupported' | 'error';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const bytes = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) bytes[i] = rawData.charCodeAt(i);
  return bytes.buffer;
}

async function doSubscribe(): Promise<PushStatus> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported';
  }

  // Check existing permission first — don't re-ask if denied
  if (Notification.permission === 'denied') return 'denied';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';

  const reg = await navigator.serviceWorker.ready;

  // Fetch VAPID key
  const res = await fetch('/api/push/vapid-public-key');
  if (!res.ok) throw new Error('Failed to fetch VAPID key');
  const { publicKey } = await res.json();
  if (!publicKey) throw new Error('No VAPID public key');

  // Reuse or create subscription
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  // Save to server
  const saveRes = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub.toJSON()),
  });
  if (!saveRes.ok) throw new Error('Failed to save subscription');

  return 'subscribed';
}

async function checkSubscribed(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch { return false; }
}

export function usePushNotifications(active: boolean) {
  const [status, setStatus] = useState<PushStatus>('idle');
  const [testResult, setTestResult] = useState<string | null>(null);
  const attempted = useRef(false);

  // Auto-subscribe once active (after intro animation)
  useEffect(() => {
    if (!active || attempted.current) return;
    attempted.current = true;

    if (!('Notification' in window)) { setStatus('unsupported'); return; }
    if (Notification.permission === 'denied') { setStatus('denied'); return; }

    // Check if already subscribed
    checkSubscribed().then(already => {
      if (already) {
        // Re-register with server in case it lost the sub
        doSubscribe().then(s => setStatus(s)).catch(() => setStatus('error'));
      } else if (Notification.permission === 'granted') {
        // Permission already granted — subscribe silently without prompting
        doSubscribe().then(s => setStatus(s)).catch(() => setStatus('error'));
      } else {
        setStatus('idle'); // Wait for user to manually tap the bell
      }
    });
  }, [active]);

  const subscribe = useCallback(async () => {
    setStatus('requesting');
    try {
      const s = await doSubscribe();
      setStatus(s);
    } catch (err) {
      console.error('[push] subscribe failed:', err);
      setStatus('error');
    }
  }, []);

  const sendTest = useCallback(async () => {
    setTestResult('sending…');
    try {
      const res = await fetch('/api/push/test', { method: 'POST' });
      const data = await res.json();
      if (data.sent > 0) {
        setTestResult(`✓ Sent to ${data.sent} device${data.sent !== 1 ? 's' : ''}`);
      } else {
        setTestResult('No subscriptions saved yet — tap Enable first');
      }
    } catch {
      setTestResult('Test failed — check connection');
    }
    setTimeout(() => setTestResult(null), 4000);
  }, []);

  return { status, testResult, subscribe, sendTest };
}
