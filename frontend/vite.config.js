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
    minify: "esbuild",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          socket: ["socket.io-client"],
          lucide: ["lucide-react"],
          fa: ["@fortawesome/fontawesome-svg-core", "@fortawesome/free-solid-svg-icons"],
          pdf: ["jspdf"],
          emoji: ["emoji-picker-react"],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
});
