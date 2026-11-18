const path = require("node:path");

/**
 * Lighthouse CI configuration for the frontend production build.
 *
 * Only backend-free routes are audited: CI has no API or database, and the
 * login/public pages render without a token or any network request on mount.
 * Assertions start as warnings so the first CI run records a baseline before
 * thresholds are tightened.
 */
module.exports = {
  ci: {
    collect: {
      // `vite preview` serves the same production bundle that is deployed.
      // A fixed port keeps the audited URLs stable across runs.
      startServerCommand: "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
      startServerReadyPattern: "Local:",
      startServerReadyTimeout: 30000,
      url: ["http://127.0.0.1:4173/login", "http://127.0.0.1:4173/server-error"],
      // Mobile emulation and simulated throttling are Lighthouse defaults;
      // three runs per URL smooth out CI timing variance.
      numberOfRuns: 3,
      settings: {
        // Lighthouse requires an absolute path for a custom config file.
        configPath: path.join(__dirname, "lighthouse-pwa.config.mjs"),
      },
    },
    assert: {
      // Thresholds calibrated from two baseline runs: mobile performance stayed
      // around 0.81, so 0.70 leaves room for CI timing variance. The median
      // aggregation ignores occasional single-run throttling outliers.
      // If a PWA audit ever proves flaky, downgrade that audit to `warn` and
      // remove it from the custom `pwa` category instead of lowering 1.0 here.
      assertions: {
        "categories:performance": ["error", { minScore: 0.7, aggregationMethod: "median" }],
        "categories:pwa": ["error", { minScore: 1, aggregationMethod: "median" }],
        "pwa-manifest": ["error", { minScore: 1, aggregationMethod: "median" }],
        "pwa-service-worker": ["error", { minScore: 1, aggregationMethod: "median" }],
        "pwa-offline-shell": ["error", { minScore: 1, aggregationMethod: "median" }],
      },
    },
    upload: {
      // No external service or token: keep reports in the workflow artifacts.
      target: "filesystem",
      outputDir: ".lighthouseci/reports",
    },
  },
};
