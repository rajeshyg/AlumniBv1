import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
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
    // Add error overlay
    hmr: {
      overlay: true,
    },
  },
});
