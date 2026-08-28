// Emergency-only replacement for /sw.js. Serve with Cache-Control: no-store at the same scope.
// It removes LifeStreak caches and unregisters itself without touching localStorage/IndexedDB.
self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((names) => Promise.all(names.map((name) => caches.delete(name)))),
      self.registration.unregister(),
    ]).then(() =>
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((clients) => Promise.all(clients.map((client) => client.navigate(client.url))))
    )
  );
});
