import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // Increase chunk warning limit and provide manual chunking to avoid
  // extremely large bundles that trigger PaaS warnings.
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000, // kB
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('@tanstack') || id.includes('@trpc') || id.includes('react')) {
              return 'vendor-core';
            }
            return 'vendor';
          }
        }
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  // Build the client located in `client/`
  root: path.resolve(import.meta.dirname, "client"),
  // Public assets are kept in client/public
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  server: {
    host: true,
    allowedHosts: ["localhost", "127.0.0.1", "wardizitto-recorder.onrender.com"],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
