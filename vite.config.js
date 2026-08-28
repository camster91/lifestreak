import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
let revision = process.env.GITHUB_SHA || process.env.LIFESTREAK_BUILD_REVISION || '';
if (!revision) {
  try {
    revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    revision = 'unknown';
  }
}

const buildIdentityPlugin = {
  name: 'lifestreak-build-identity',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify({
        app: 'LifeStreak',
        version: packageJson.version,
        revision,
      }),
    });
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    buildIdentityPlugin,
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-maskable-512x512.png'],
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      manifest: {
        name: 'LifeStreak — Habit Tracker',
        short_name: 'LifeStreak',
        description: 'A private, local-first habit and routine tracker.',
        theme_color: '#4A6FA4',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        categories: ['lifestyle', 'health', 'productivity'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Today',
            short_name: 'Today',
            description: "Open today's habits",
            url: '/',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'Collections',
            short_name: 'Collections',
            description: 'Open specialist LifeStreak collections',
            url: '/?legacy=1',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
          },
        ],
        // Keep the original specialist share workflow available through Collections.
        share_target: {
          action: '/share?legacy=1',
          method: 'GET',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
          },
        },
        screenshots: [
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'LifeStreak Today habit view',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,json,css,html,ico,png,svg,woff,woff2,ttf}'],
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: true,
        navigationPreload: false,
      },

      // Development options
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3009',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
