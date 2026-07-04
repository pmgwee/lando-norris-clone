import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Multi-page Vite app. Each route's HTML is the real Webflow page (1:1 reconstruction),
// served with its original CSS + the OFF+BRAND bundle. React is mounted as a thin layer
// (see src/main.tsx) for incremental adoption without disturbing the legacy DOM.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // 1.3 MB OFF+BRAND bundle + GLB/KTX2 assets live in public/ and are served as-is;
    // raise the chunk size warning so the build log stays clean.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      input: [
        resolve(__dirname, 'index.html'),
        resolve(__dirname, 'on-track.html'),
        resolve(__dirname, 'off-track.html'),
        resolve(__dirname, 'partnerships.html'),
        resolve(__dirname, 'calendar.html'),
        resolve(__dirname, 'legal/privacy-policy.html'),
        resolve(__dirname, 'legal/terms-conditions.html'),
      ],
    },
  },
  server: {
    port: 5173,
    open: '/',
  },
});
