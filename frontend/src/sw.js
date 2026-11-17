/**
 * HEI STDhub service worker (Workbox `injectManifest` source).
 *
 * Responsibilities:
 *  - precache the build-generated app shell (hashed JS/CSS/assets + index.html),
 *  - serve an offline fallback for SPA navigations,
 *  - cache static assets safely (never authenticated API responses),
 *  - keep Web Push working while only opening same-origin notification URLs.
 *
 * The Workbox build replaces `self.__WB_MANIFEST` with the list of emitted
 * assets, so this file stays readable while the cache list remains accurate
 * for every production build.
 */
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { resolveSameOriginNotificationUrl } from "./pwa/notification-url.js";

const APP_SHELL_CACHE = "hei-app-shell-v1";
const STATIC_CACHE = "hei-static-v1";
const IMAGE_CACHE = "hei-images-v1";
const FONT_CACHE = "hei-fonts-v1";
const INDEX_URL = new URL("/index.html", self.location.origin).href;

// Caches created by the previous custom service worker. They are not managed
// by Workbox, so delete them once after the upgrade to reclaim storage.
const LEGACY_CACHE_NAMES = ["hei-stdhub-v3", "hei-stdhub-static-v3"];

// Minimal inline offline page. It is only used when neither the network nor
// the precached `index.html` is available (i.e. before the first successful
// install), so it must be self-contained and dependency-free.
const OFFLINE_HTML = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Hors ligne — HEI STDhub</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0A1A33; color: #fff; font-family: system-ui, sans-serif; text-align: center; padding: 24px; }
      main { max-width: 420px; }
      h1 { font-size: 1.35rem; margin: 0 0 12px; }
      p { color: rgba(255,255,255,.72); line-height: 1.6; margin: 0 0 24px; }
      a { display: inline-block; padding: 10px 18px; border-radius: 12px; background: #DFA408; color: #0A1A33; font-weight: 700; text-decoration: none; }
    </style>
  </head>
  <body>
    <main>
      <h1>Vous êtes hors ligne</h1>
      <p>Reconnectez-vous à Internet pour accéder à HEI STDhub. Les pages déjà visitées restent disponibles.</p>
      <a href="/">Réessayer</a>
    </main>
  </body>
</html>`;

// Precache the app shell. Workbox injects the manifest at build time.
precacheAndRoute(self.__WB_MANIFEST);
// Remove precache entries from older builds; otherwise outdated hashed chunks
// accumulate in the user's cache forever.
cleanupOutdatedCaches();

// The service worker activates automatically: the previous implementation let
// any client post a "skip-waiting" message, which was a security issue (#139).
// Calling skipWaiting here keeps updates prompt without exposing a control
// channel to pages.
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      const cacheNames = await self.caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => LEGACY_CACHE_NAMES.includes(name))
          .map((name) => self.caches.delete(name)),
      );
    })(),
  );
});

/**
 * SPA navigations are network-first so a fresh deploy is picked up quickly.
 * Every navigation response is stored under `/index.html` (the shell) rather
 * than under its route URL, which keeps the cache small. When the network is
 * unavailable, Workbox falls back to that shell; the React router then renders
 * the requested route client-side.
 */
const navigationStrategy = new NetworkFirst({
  cacheName: APP_SHELL_CACHE,
  networkTimeoutSeconds: 4,
  plugins: [
    // Opaque responses are rejected (status 0 is only accepted for images, not
    // HTML); only successful basic responses are worth caching as a shell.
    new CacheableResponsePlugin({ statuses: [200] }),
    {
      // Collapse `/`, `/chat`, `/archives`, ... into a single cache entry.
      cacheKeyWillBeUsed: async () => new Request(INDEX_URL),
    },
  ],
});

const precachedShell = createHandlerBoundToURL("/index.html");

registerRoute(
  new NavigationRoute(
    async (context) => {
      try {
        return await navigationStrategy.handle(context);
      } catch {
        // Offline (or the network returned nothing usable): use the precached
        // shell so React Router can handle the route.
        try {
          return await precachedShell(context);
        } catch {
          return new Response(OFFLINE_HTML, {
            status: 503,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }
      }
    },
    // API calls must always hit the network; they must never receive the HTML
    // shell (which would break JSON parsing).
    { denylist: [/^\/api\//, /^\/push\//] },
  ),
);

// Non-precached same-origin JS/CSS (defensive: Vite normally precaches these).
// Hashed filenames make stale-while-revalidate safe: a URL always points to
// the same content.
registerRoute(
  ({ request, url }) =>
    url.origin === self.location.origin &&
    (request.destination === "script" || request.destination === "style"),
  new StaleWhileRevalidate({
    cacheName: STATIC_CACHE,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  }),
);

// Same-origin images only. Deliberately skip cross-origin/authenticated media
// so private files are not persisted in a shared cache.
registerRoute(
  ({ request, url }) => url.origin === self.location.origin && request.destination === "image",
  new CacheFirst({
    cacheName: IMAGE_CACHE,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  }),
);

// Fonts are immutable in practice and expensive to refetch on mobile.
registerRoute(
  ({ request }) => request.destination === "font",
  new CacheFirst({
    cacheName: FONT_CACHE,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  }),
);

/** Parse a push payload without letting malformed JSON break the event. */
function parsePushPayload(event) {
  if (!event.data) return {};
  try {
    const parsed = event.data.json();
    // Guard against non-object JSON (arrays, strings, numbers).
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    // Fallback to plain text payloads.
    return { body: event.data.text() };
  }
}

self.addEventListener("push", (event) => {
  const payload = parsePushPayload(event);

  const options = {
    body: payload.body || "",
    icon: payload.icon || "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    tag: payload.tag || "hei-notification",
    // Store the *raw* URL; it is sanitized again on click. Keeping the payload
    // untouched here means the notification data cannot be trusted implicitly.
    data: { url: payload.url || "/" },
    vibrate: [200, 100, 200],
    renotify: true,
    requireInteraction: true,
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || "HEI STDhub", options),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // Security (#139): never open a URL supplied by the push payload directly.
  // Cross-origin, non-HTTP and malformed targets fall back to the app root.
  const targetUrl = resolveSameOriginNotificationUrl(
    event.notification.data?.url,
    self.location.origin,
  );

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      const target = new URL(targetUrl, self.location.origin);
      const existing = clientList.find((client) => {
        if (!client.url) return false;
        try {
          return new URL(client.url).origin === target.origin;
        } catch {
          return false;
        }
      });

      if (existing) {
        await existing.focus();
        // Reuse the window and navigate it to the notification target when the
        // browser supports client.navigate (not available in every browser).
        if (typeof existing.navigate === "function") {
          try {
            await existing.navigate(target.href);
          } catch {
            // Focus alone is still useful if navigation is blocked.
          }
        }
        return;
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(target.href);
      }
    })(),
  );
});

// Ask open clients to re-subscribe when the browser rotates the subscription.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      clientList.forEach((client) => {
        client.postMessage({ type: "push-subscription-change" });
      });
    }),
  );
});

self.addEventListener("message", (event) => {
  // Health-check used by the app to verify the SW is alive.
  if (event.data === "ping") {
    event.source?.postMessage("pong");
    return;
  }

  // Keep the realtime socket in sync after the service worker reconnects.
  if (event.data?.type === "sync-socket") {
    event.waitUntil(
      self.clients.matchAll({ type: "window" }).then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({ type: "socket-sync-request" });
        });
      }),
    );
  }

  // NOTE: the legacy { type: "skip-waiting" } client control message was
  // intentionally removed (#139). Activation is handled by the SW lifecycle.
});
