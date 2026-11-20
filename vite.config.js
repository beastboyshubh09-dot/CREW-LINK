import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'CrewLink',
        short_name: 'CrewLink',
        description: 'On-demand local crews for lifting and moving jobs',
        theme_color: '#176b5b',
        background_color: '#f5f7f4',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }]
      },
      workbox: { navigateFallback: '/offline.html' }
    })
  ]
});