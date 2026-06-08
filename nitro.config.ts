import { defineNitroConfig } from 'nitropack/config';

export default defineNitroConfig({
  // Gera um servidor Node.js real com HTTP listen — necessário para Render/VPS
  // O preset padrão 'cloudflare-module' exporta só um handler sem listen
  preset: 'node-server',
  output: {
    dir: 'dist',
    serverDir: 'dist/server',
  },
});

