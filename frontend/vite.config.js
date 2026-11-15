import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
