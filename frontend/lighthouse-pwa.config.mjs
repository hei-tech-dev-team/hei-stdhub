/**
 * Lighthouse config used by Lighthouse CI.
 *
 * Lighthouse 12 removed the built-in PWA category and its installability,
 * service-worker and offline audits. This config adds a small `pwa` category
 * built from custom audits so the CI checks keep covering those regressions
 * while still using the current, supported Lighthouse release.
 */
export default {
  extends: "lighthouse:default",
  artifacts: [
    {
      id: "PwaSnapshot",
      gatherer: "./lighthouse/pwa-snapshot-gatherer.mjs",
    },
  ],
  audits: [
    "./lighthouse/pwa-manifest-audit.mjs",
    "./lighthouse/pwa-service-worker-audit.mjs",
    "./lighthouse/pwa-offline-shell-audit.mjs",
  ],
  categories: {
    pwa: {
      title: "PWA",
      description:
        "Installability and offline app-shell checks removed by Lighthouse 12 are verified here.",
      supportedModes: ["navigation"],
      auditRefs: [
        { id: "pwa-manifest", weight: 2 },
        { id: "pwa-service-worker", weight: 2 },
        { id: "pwa-offline-shell", weight: 1 },
      ],
    },
  },
};
