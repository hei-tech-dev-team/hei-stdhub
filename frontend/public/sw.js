const CACHE = "hei-stdhub-v2";
const PRECACHE_URLS = ["/logo.png", "/manifest.json"];

const shouldCache = (request, response) => {
  if (request.method !== "GET" || !response.ok || response.type !== "basic") return false;
  const url = new URL(request.url);
  return (
    url.origin === self.location.origin &&
    ["/logo.png", "/logo-browser.png", "/logo-pwa.png", "/manifest.json"].includes(url.pathname)
  );
};

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(PRECACHE_URLS),
    ),
  );
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
  if (e.request.method !== "GET") return;

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        if (shouldCache(e.request, response)) {
          caches.open(CACHE).then((cache) => cache.put(e.request, response.clone()));
        }
        return response;
      })
      .catch(() => caches.match(e.request)),
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
