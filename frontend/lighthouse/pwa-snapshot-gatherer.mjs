import { Gatherer } from "lighthouse";

/**
 * Reads PWA signals from the page after Lighthouse's normal navigation pass.
 *
 * Lighthouse 12 removed its built-in PWA gatherers and audits, so the checks
 * below are collected explicitly. They run in the main world (not Lighthouse's
 * isolated world) because service worker registrations and Cache Storage are
 * only reachable from the page's own context.
 */
async function collectPwaSnapshot() {
  /** @type {any} */
  const snapshot = {
    manifestHref: null,
    manifest: null,
    manifestError: null,
    icons: [],
    themeColor: null,
    serviceWorker: {
      registered: false,
      active: false,
      controlling: false,
      error: null,
    },
    caches: {
      names: [],
      assetCount: 0,
      shellPrecached: false,
      error: null,
    },
  };

  const message = (error) => (error instanceof Error ? error.message : String(error));

  // Manifest and icons: these are the browser's installability requirements.
  try {
    const link = document.querySelector('link[rel="manifest"]');
    if (!link) throw new Error("No <link rel=manifest> found");

    snapshot.manifestHref = link.href;
    const response = await fetch(link.href, { cache: "no-store" });
    if (!response.ok) throw new Error(`Manifest returned HTTP ${response.status}`);
    snapshot.manifest = await response.json();

    const icons = Array.isArray(snapshot.manifest.icons) ? snapshot.manifest.icons : [];
    snapshot.icons = await Promise.all(
      icons.map(async (icon) => {
        try {
          const iconResponse = await fetch(new URL(icon.src, location.href).href, {
            method: "HEAD",
            cache: "no-store",
          });
          return {
            src: icon.src,
            sizes: icon.sizes,
            ok: iconResponse.ok,
          };
        } catch (error) {
          return { src: icon.src, sizes: icon.sizes, ok: false, error: message(error) };
        }
      }),
    );

    snapshot.themeColor =
      document.querySelector('meta[name="theme-color"]')?.getAttribute("content") ?? null;
  } catch (error) {
    snapshot.manifestError = message(error);
  }

  // Service worker: the app uses skipWaiting() + clients.claim(), so a freshly
  // loaded page should be controlled without a second navigation. Allow a
  // short grace period because activation is asynchronous.
  try {
    if (!("serviceWorker" in navigator)) throw new Error("Service workers are unsupported");
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      snapshot.serviceWorker.registered = true;
      for (let attempt = 0; attempt < 40; attempt += 1) {
        snapshot.serviceWorker.active = registration.active?.state === "activated";
        snapshot.serviceWorker.controlling = Boolean(navigator.serviceWorker.controller);
        if (snapshot.serviceWorker.active && snapshot.serviceWorker.controlling) break;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
  } catch (error) {
    snapshot.serviceWorker.error = message(error);
  }

  // Offline readiness: verify that the app shell used by the service worker's
  // navigation fallback is precached. This is a stable proxy for an offline
  // reload and avoids interfering with Lighthouse's own network throttling.
  try {
    if (!("caches" in window)) throw new Error("Cache Storage is unsupported");
    snapshot.caches.names = await caches.keys();
    for (const name of snapshot.caches.names) {
      const cache = await caches.open(name);
      snapshot.caches.assetCount += (await cache.keys()).length;
      const shell = await cache.match("/index.html", { ignoreSearch: true });
      if (shell) snapshot.caches.shellPrecached = true;
    }
  } catch (error) {
    snapshot.caches.error = message(error);
  }

  return snapshot;
}

class PwaSnapshot extends Gatherer {
  meta = { supportedModes: ["navigation"] };

  async getArtifact(context) {
    return context.driver.executionContext.evaluate(collectPwaSnapshot, {
      args: [],
      useIsolation: false,
    });
  }
}

export default PwaSnapshot;
