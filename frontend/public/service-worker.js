const CACHE_NAME = "sunday-mac-47-v2";
const urlsToCache = ["/", "/index.html"];

// ── Install ────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// ── Activate ───────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch (Network-first, fallback to cache) ───────────────────────────────
self.addEventListener("fetch", (event) => {
  if (event.request.url.includes("/api/")) return; // Don't cache API calls
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ── Push Notification ──────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { type: "ALERT", message: event.data.text() };
  }

  if (data.type === "DAILY_BRIEFING" && data.jobs && data.jobs.length > 0) {
    const jobList = data.jobs.slice(0, 5).map((j) => `${j.title} at ${j.company}`).join(", ");
    const title = "☀️ Morning Job Briefing";
    const body = `${data.jobs.length} top jobs: ${jobList}`;

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: "/icon-512.png",
        badge: "/icon-512.png",
        tag: "daily-briefing",
        data: data,
        actions: [
          { action: "read-aloud", title: "🔊 Read Aloud" },
          { action: "open", title: "📱 Open App" },
        ],
        requireInteraction: true,
      })
    );

    // Also post to clients for auto-read
    event.waitUntil(
      self.clients.matchAll({ type: "window" }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "DAILY_BRIEFING", jobs: data.jobs });
        });
      })
    );
  }
});

// ── Notification Click ─────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "read-aloud") {
    // Post to client to trigger speech
    event.waitUntil(
      self.clients.matchAll({ type: "window" }).then((clients) => {
        if (clients.length > 0) {
          clients[0].postMessage({ type: "READ_ALOUD", jobs: event.notification.data.jobs });
          clients[0].focus();
        } else {
          self.clients.openWindow("/?readAloud=1");
        }
      })
    );
  } else {
    event.waitUntil(
      self.clients.matchAll({ type: "window" }).then((clients) => {
        if (clients.length > 0) {
          clients[0].focus();
        } else {
          self.clients.openWindow("/");
        }
      })
    );
  }
});
