import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsConfigPaths from 'vite-tsconfig-paths';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tanstackStart({
      server: { entry: 'src/server.ts' },
      // Força o preset node-server — o padrão cloudflare não faz listen()
      nitro: {
        preset: 'node-server',
        output: {
          dir: '.output',
          serverDir: '.output/server',
        },
      },
    }),
    react(),
  ],
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
});
