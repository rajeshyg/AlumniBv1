import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    sourcemap: true,
  },
  server: {
    open: true,
    host: true,
    port: 3000,
    proxy: {
      '/admin-emails.csv': 'http://localhost:3001',
      '/api': 'http://localhost:3001',
      '/update-admin-roles': 'http://localhost:3001'
    },
    hmr: {
      overlay: true,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});

