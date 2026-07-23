import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    target: "es2020",
    outDir: path.resolve(__dirname, "../src/omni_api/web/static"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("element-china-area-data")) {
            return "china-region-data";
          }
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("react-router") ||
            id.includes("/scheduler/")
          ) {
            return "vendor-react";
          }
          if (id.includes("date-fns") || id.includes("react-day-picker")) {
            return "vendor-date";
          }
          if (id.includes("lucide-react")) {
            return "vendor-icons";
          }
        },
      },
    },
  },
});
