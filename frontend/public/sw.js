const CACHE = "hei-stdhub-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      ),
    ]),
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() =>
        caches.match("/").then((r) => r || new Response("", { status: 503 })),
      ),
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((response) => {
        if (response.ok && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => new Response("", { status: 503 }));
    }),
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
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    }),
  );
});

self.addEventListener("pushsubscriptionchange", (e) => {
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: "push-subscription-change" });
      });
    }),
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "ping") {
    e.source?.postMessage("pong");
  }
  if (e.data?.type === "sync-socket") {
    clients.matchAll({ type: "window" }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: "socket-sync-request" });
      });
    });
  }
});
