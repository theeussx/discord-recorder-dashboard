import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsConfigPaths from 'vite-tsconfig-paths';
import { tanstackStart } from '@tanstack/start-vite-plugin';

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    react(),
    tanstackStart({
      server: { entry: 'src/server.ts' },
    }),
  ],
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
});
