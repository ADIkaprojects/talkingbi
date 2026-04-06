import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const apiTarget = "http://127.0.0.1:8000";

  return {
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      // In development, forward /chat /data /charts /insights /session → FastAPI on :8000
      "/chat":     { target: apiTarget, changeOrigin: true },
      "/data":     { target: apiTarget, changeOrigin: true },
      "/charts":   { target: apiTarget, changeOrigin: true },
      "/insights": { target: apiTarget, changeOrigin: true },
      "/voice":    { target: apiTarget, changeOrigin: true, ws: true },
      "/sessions": { target: apiTarget, changeOrigin: true },
      "/session":  { target: apiTarget, changeOrigin: true },
      "/health":   { target: apiTarget, changeOrigin: true },
      "/llm":      { target: apiTarget, changeOrigin: true },
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  };
});
