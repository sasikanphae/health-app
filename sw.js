// Offline support (network first, cache fallback) and notification button handling.
const CACHE = 'health-app-v2';
const ASSETS = [
  './',
  'index.html',
  'style.css',
  'js/app.js',
  'js/health.js',
  'js/data.js',
  'js/store.js',
  'manifest.webmanifest',
  'icons/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })),
  );
});

// The page owns all data (localStorage), so actions are forwarded to an open
// window; if none is open, the app is opened with the action in the URL.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const { id, type } = e.notification.data ?? {};
  if (!id) return;
  const action = e.action || 'open';
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (wins.length) {
      wins[0].postMessage({ kind: 'reminder', id, type, action });
      if (action === 'open') await wins[0].focus();
      return;
    }
    const url = `./?r=${encodeURIComponent(id)}&t=${encodeURIComponent(type)}&a=${action}`;
    await self.clients.openWindow(url);
  })());
});
