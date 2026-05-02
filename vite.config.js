import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Strict 5174 so the Cloudflare tunnel for dev-outsystem.isums.pro can
    // rely on a fixed port. Manager FE owns 5173 (dev.isums.pro).
    host: true,
    port: 5174,
    strictPort: true,
    // Vite 5.1+ rejects unknown Host headers by default; the tunnel sets
    // Host=dev-outsystem.isums.pro. Include prod hostname too so the same
    // config works for a preview deploy.
    allowedHosts: [
      "dev-outsystem.isums.pro",
      "outsystem.isums.pro",
      "localhost",
      "127.0.0.1",
    ],
    // HMR client must know it's reaching the dev server over public HTTPS
    // (port 443) rather than localhost:5174 directly.
    hmr: {
      host: "dev-outsystem.isums.pro",
      protocol: "wss",
      clientPort: 443,
    },
  },
});
