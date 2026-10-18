import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/velocitrack/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['brand/*.{svg,png,ico}'],
      manifest: {
        name: 'VelociTrack',
        short_name: 'VelociTrack',
        description: 'Your local measurement workspace.',
        theme_color: '#08796e',
        background_color: '#f6f7f4',
        display: 'standalone',
        start_url: '/velocitrack/',
        scope: '/velocitrack/',
        icons: [
          {
            src: 'brand/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'brand/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        navigateFallbackAllowlist: [/^\/velocitrack\/(?:index\.html)?$/],
      },
    }),
  ],
  server: { host: '127.0.0.1', strictPort: true },
  build: { sourcemap: false, chunkSizeWarningLimit: 700 },
});
