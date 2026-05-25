import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    global: "globalThis",
  },
  server: {
    host: true,
    port: 5174,
    strictPort: true,
    allowedHosts: [
      "dev-outsystem.isums.pro",
      "outsystem.isums.pro",
      "localhost",
      "127.0.0.1",
    ],
    hmr: {
      host: "dev-outsystem.isums.pro",
      protocol: "wss",
      clientPort: 443,
    },
  },
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.js"],
    css: false,
    include: ["src/**/*.{test,spec}.{js,jsx}"],
    pool: "threads",
    poolOptions: {
      threads: { singleThread: true, isolate: false },
    },
    testTimeout: 15000,
    hookTimeout: 30000,
  },
});
