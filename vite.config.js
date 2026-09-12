import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json' with { type: 'json' };
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  build: {
    chunkSizeWarningLimit: 3000, // Increase limit since extensions load instantly from local disk
    rollupOptions: {
      input: {
        dashboard: resolve(import.meta.dirname, 'dashboard.html'),
      },
    },
  },
})
