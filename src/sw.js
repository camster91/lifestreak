import { precacheAndRoute, cleanupOutdatedCaches, matchPrecache } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { sanitizeSameOriginPath } from './utils/safeNavigation.js';

// Precache all assets from vite build
precacheAndRoute(self.__WB_MANIFEST);

// Clean old caches on activation
cleanupOutdatedCaches();

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Updates wait until the user selects Update Now. This avoids replacing the running app while a
// form or local transaction is in progress.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// ── Notification click handler ────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Only allow same-origin relative paths (blocks open-redirect phishing)
  const path = sanitizeSameOriginPath(event.notification.data?.url || '/', self.location.origin);
  const urlToOpen = new URL(path, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(urlToOpen);
    })
  );
});

// ── Runtime caching strategies ───────────────────────────────────

// App assets — StaleWhileRevalidate
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'ls-pages-cache',
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      {
        handlerDidError: async () => matchPrecache('/offline.html'),
      },
    ],
  })
);

registerRoute(
  ({ request, url }) => self.location.origin === url.origin && request.mode !== 'navigate',
  new StaleWhileRevalidate({
    cacheName: 'ls-assets-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  })
);

// Images — CacheFirst
registerRoute(
  ({ url }) => /\.(?:png|jpg|jpeg|svg|gif|webp)$/.test(url.pathname),
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  })
);

// Fonts — CacheFirst
registerRoute(
  ({ url }) => /\.(?:woff|woff2|ttf|otf|eot)$/.test(url.pathname),
  new CacheFirst({
    cacheName: 'fonts-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  })
);

// Google Fonts stylesheets — StaleWhileRevalidate
registerRoute(
  ({ url }) => url.hostname === 'fonts.googleapis.com',
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-stylesheets',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 })],
  })
);

// Google Fonts webfonts — CacheFirst
registerRoute(
  ({ url }) => url.hostname === 'fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  })
);

// API — StaleWhileRevalidate
registerRoute(
  ({ url }) => url.hostname.startsWith('api.'),
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  })
);
