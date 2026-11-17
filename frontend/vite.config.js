import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
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
