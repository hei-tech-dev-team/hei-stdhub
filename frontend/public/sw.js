const CACHE = "hei-stdhub-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(["/", "/logo.png", "/manifest.json"]),
    ),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    Promise.all([
      clients.claim(),
      // Clean old caches
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      ),
    ]),
  );
});

self.addEventListener("push", (e) => {
  if (!e.data) return;

  let data;
  try {
    data = e.data.json();
  } catch {
    data = { title: "HEI STDhub", body: e.data.text() };
  }

  const options = {
    body: data.body || "",
    icon: data.icon || "/logo.png",
    badge: "/logo.png",
    tag: data.tag || "hei-notification",
    data: { url: data.url || "/" },
    vibrate: [200, 100, 200],
    renotify: true,
    requireInteraction: true,
  };

  e.waitUntil(
    self.registration.showNotification(data.title || "HEI STDhub", options),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = e.notification.data?.url || "/";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    }),
  );
});

// Keep SW alive on mobile for push delivery
self.addEventListener("message", (e) => {
  if (e.data === "ping") {
    e.source?.postMessage("pong");
  }
});
