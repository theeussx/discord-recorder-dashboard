import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsConfigPaths from 'vite-tsconfig-paths';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { nitro } from 'nitro/vite';

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tanstackStart({ server: { entry: 'src/server.ts' } }),
    nitro({ preset: 'node-server' }),
    react(),
  ],
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
});
