import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// `display: standalone` is a hard requirement, not a preference: iOS only
// delivers web push to a PWA installed via Add to Home Screen. See CLAUDE.md.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Qjume',
        short_name: 'Qjume',
        description: 'Join and run queues.',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        background_color: '#ffffff',
        theme_color: '#1a1a1a',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      devOptions: { enabled: true, type: 'module' },
    }),
  ],
  server: { port: 5173 },
});
