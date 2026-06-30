const CACHE = 'cybersentinel-v2';
const STATIC = ['/'];

// ── Install: pre-cache shell ────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting()),
  );
});

// ── Activate: clean old caches ──────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// ── Fetch: network-first, cache fallback ───────────────────────────────────
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('/api/')) return; // never cache API
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});

// ── Push: show notification ─────────────────────────────────────────────────
self.addEventListener('push', e => {
  let data = { title: '⚠ CyberSentinel', body: 'Intrusion attempt detected!', url: '/intrusions', tag: 'intrusion' };
  try { if (e.data) data = { ...data, ...e.data.json() }; } catch {}

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:      data.body,
      icon:      '/icon-192.svg',
      badge:     '/icon-192.svg',
      tag:       data.tag || 'intrusion',
      renotify:  true,
      vibrate:   [200, 100, 200, 100, 200],
      data:      { url: data.url || '/intrusions' },
    }),
  );
});

// ── Notification click: focus or open app ──────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      const match = cs.find(c => c.url.includes(self.location.origin));
      if (match) {
        match.navigate(target);
        return match.focus();
      }
      return clients.openWindow(target);
    }),
  );
});
