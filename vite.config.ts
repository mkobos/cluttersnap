import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      workbox: {
        additionalManifestEntries: [
          { url: '/models/clutter_model.onnx', revision: process.env.VITE_MODEL_VERSION ?? null }
        ],
        maximumFileSizeToCacheInBytes: 100 * 1024 * 1024
      },
      manifest: {
        name: 'Clutter Detector',
        short_name: 'Clutter',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  optimizeDeps: {
    exclude: ['onnxruntime-web']
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
});
