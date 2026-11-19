import { Audit } from "lighthouse";
import { pwaAuditResult } from "./pwa-audit-result.mjs";

/**
 * Replaces the removed `works-offline` audit. The service worker serves a
 * precached /index.html for every SPA navigation when the network is down, so
 * verifying the precache is a stable offline-readiness check for CI.
 */
class PwaOfflineShell extends Audit {
  static get meta() {
    return {
      id: "pwa-offline-shell",
      title: "Offline app shell is precached",
      failureTitle: "Offline app shell is missing from the precache",
      description:
        "The service worker must precache /index.html and the app assets so login and public routes can render without a network connection or backend.",
      requiredArtifacts: ["PwaSnapshot"],
    };
  }

  static audit(artifacts) {
    const caches = artifacts.PwaSnapshot.caches;
    return pwaAuditResult([
      {
        name: "Cache Storage is available",
        ok: caches.names.length > 0 && !caches.error,
        detail: caches.error ?? undefined,
      },
      {
        name: "/index.html is precached for offline navigations",
        ok: caches.shellPrecached,
      },
      {
        name: "App assets are precached",
        ok: caches.assetCount >= 3,
        detail: `${caches.assetCount} entries`,
      },
    ]);
  }
}

export default PwaOfflineShell;
