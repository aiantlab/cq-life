import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'esnext',
    sourcemap: false,
  },
  server: {
    host: true,
    port: 5173,
  },
});
