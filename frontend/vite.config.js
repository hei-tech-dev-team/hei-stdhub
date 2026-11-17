import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// The RBAC model (`shared/permissions.js`) is CommonJS so the backend can
// `require()` it, but Vite only executes ESM source files (and its CommonJS
// interop only covers `node_modules`). This plugin wraps that single shared
// file in an ESM shim for dev and build, so the React app consumes the very
// same permission model instead of duplicating it.
const sharedPermissionsPath = fileURLToPath(
  new URL("../shared/permissions.js", import.meta.url),
);

function sharedPermissionsPlugin() {
  return {
    name: "shared-permissions-esm",
    enforce: "pre",
    transform(code, id) {
      if (id.split("?")[0] !== sharedPermissionsPath) return null;
      return {
        // Prepend on the same line so original line numbers are preserved.
        // The shared module already declares its exports at top level, so we
        // only have to re-export them (keep in sync with shared/permissions.js).
        code:
          `const module = { exports: {} }; ${code}\n` +
          "export { can, canOwn, canModerateCommentOnOwnPost, ROLE_RANK };\n" +
          "export default module.exports;\n",
        map: null,
      };
    },
  };
}

export default defineConfig({
  plugins: [react(), sharedPermissionsPlugin()],
  plugins: [
    react(),
    VitePWA({
      // `injectManifest` lets us keep custom push/message handlers while
      // Workbox injects the hashed app-shell precache manifest at build time.
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      // Registration is done explicitly in `main.jsx` via workbox-window.
      injectRegister: false,
      // `public/manifest.json` remains the single source of truth; do not let
      // the plugin generate or inject a second manifest.
      manifest: false,
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,png,svg,ico,json,woff,woff2}"],
        // Never precache the SW itself, and skip deploy-only metadata files.
        globIgnores: ["**/sw.js", "**/robots.txt", "**/sitemap.xml"],
        // The emoji picker/PDF chunks are large; keep the limit generous but
        // bounded so a single huge asset cannot silently break install.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      devOptions: {
        // Dev uses Vite's live module graph; a SW cache would serve stale code.
        enabled: false,
      },
    }),
  ],
  define: {
    global: "globalThis",
  },
  server: {
    port: 5173,
    open: true,
    fs: {
      // The shared RBAC module lives outside the Vite root: allow the app
      // root (default) plus the `shared/` folder that holds it.
      allow: [".", "../shared"],
    },
  },
  build: {
    target: "es2020",
    sourcemap: false,
    rollupOptions: {
      output: {
        // Vite 8 (rolldown) only accepts manualChunks as a function.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          const chunks = {
            vendor: ["/react/", "/react-dom/", "/react-router-dom/", "/react-router/", "/scheduler/"],
            socket: ["/socket.io-client/", "/engine.io-client/", "/socket.io-parser/"],
            lucide: ["/lucide-react/"],
            fa: ["/@fortawesome/"],
            pdf: ["/jspdf/"],
            emoji: ["/emoji-picker-react/"],
          };
          for (const [name, pkgs] of Object.entries(chunks)) {
            if (pkgs.some((pkg) => id.includes(`/node_modules${pkg}`))) return name;
          }
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
});
