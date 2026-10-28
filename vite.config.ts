import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Rutas relativas: el build funciona servido desde cualquier carpeta.
  base: './',
  server: { port: 5173 },
  build: {
    // Phaser solo pesa ~1.2 MB minificado; no es un problema para este juego.
    chunkSizeWarningLimit: 2000,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
