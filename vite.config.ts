import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves a project repo from /<repo>/, so absolute asset paths
// resolve against the domain root and 404 — a blank page with no error. Set
// VITE_BASE=/qjume2/ for a Pages build; anywhere served from the root (the dev
// server, Firebase Hosting) needs nothing.
const base = process.env['VITE_BASE'] ?? '/';

// A portable build runs from a path it cannot know at build time, on a host
// with no rewrite rules — relative asset paths, and no service worker, whose
// scope would be wrong and whose cache would outlive the page. See src/router.
const isPortable = process.env['VITE_PORTABLE'] === 'true';

// `display: standalone` is a hard requirement, not a preference: iOS only
// delivers web push to a PWA installed via Add to Home Screen. See CLAUDE.md.
// start_url and scope follow the base, or an installed PWA would launch at a
// path that does not exist.
export default defineConfig({
  base: isPortable ? './' : base,
  plugins: [
    react(),
    ...(isPortable ? [] : [VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Qjume',
        short_name: 'Qjume',
        description: 'Join and run queues.',
        display: 'standalone',
        start_url: base,
        scope: base,
        background_color: '#ffffff',
        theme_color: '#1a1a1a',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      devOptions: { enabled: true, type: 'module' },
    })]),
  ],
  server: { port: 5173 },
});
