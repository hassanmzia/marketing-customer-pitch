import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3064,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:4064',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:4064',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
