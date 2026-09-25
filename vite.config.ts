import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * The short commit SHA of whatever was checked out for this build - a
 * per-build number small enough to read at a glance and match against a
 * commit, without touching package.json's version (which nothing bumps).
 * Falls back to "dev" wherever there is no git history to read, e.g. a
 * tarball build.
 */
function buildVersion(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'dev';
  }
}

/** When this build happened, so the admin page can show how long it's been live. */
function buildTime(): string {
  return new Date().toISOString();
}

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
  define: {
    'import.meta.env.VITE_BUILD_VERSION': JSON.stringify(buildVersion()),
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(buildTime()),
  },
  plugins: [
    react(),
    ...(isPortable ? [] : [VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Without these a new build waits for every tab to close before it
        // takes over, so a returning visitor keeps being served the old one
        // and has to clear site data to see a fix. Activate at once and claim
        // the pages that are already open.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
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
