import { Audit } from "lighthouse";
import { pwaAuditResult } from "./pwa-audit-result.mjs";

/**
 * Replaces the removed `service-worker` audit: the production build must
 * register an active service worker that controls the tested page.
 */
class PwaServiceWorker extends Audit {
  static get meta() {
    return {
      id: "pwa-service-worker",
      title: "An active service worker controls the page",
      failureTitle: "No active service worker controls the page",
      description:
        "The production bundle registers src/sw.js with skipWaiting() and clients.claim(); a fresh page load must therefore be controlled by the active worker.",
      requiredArtifacts: ["PwaSnapshot"],
    };
  }

  static audit(artifacts) {
    const worker = artifacts.PwaSnapshot.serviceWorker;
    return pwaAuditResult([
      {
        name: "Service worker is registered",
        ok: worker.registered,
        detail: worker.error ?? undefined,
      },
      {
        name: "Service worker is activated",
        ok: worker.active,
      },
      {
        name: "Service worker controls the page",
        ok: worker.controlling,
      },
    ]);
  }
}

export default PwaServiceWorker;
