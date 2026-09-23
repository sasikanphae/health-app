// Offline support (network first, cache fallback) and notification button handling.
const CACHE = 'health-app-v7';
const ASSETS = [
  './',
  'index.html',
  'style.css',
  'js/app.js',
  'js/art.js',
  'js/body.js',
  'js/copy.js',
  'js/gym-data.js',
  'js/health.js',
  'js/icons.js',
  'js/insights.js',
  'js/lunar.js',
  'js/sound.js',
  'js/lifts.js',
  'js/life.js',
  'js/life-view.js',
  'js/meals.js',
  'js/planner.js',
  'js/store.js',
  'manifest.webmanifest',
  'icons/icon.svg',
];
// Google Fonts are cached too, so the app keeps its look offline.
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

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
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin !== location.origin && !FONT_HOSTS.includes(url.hostname)) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok || res.type === 'opaque') {
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
  const { id, type, ref } = e.notification.data ?? {};
  if (!id) return;
  const action = e.action || 'open';
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (wins.length) {
      wins[0].postMessage({ kind: 'reminder', id, type, ref, action });
      if (action === 'open') await wins[0].focus();
      return;
    }
    const url = `./?r=${encodeURIComponent(id)}&t=${encodeURIComponent(type)}&a=${action}`;
    await self.clients.openWindow(url);
  })());
});

// Swiped away without tapping: tell an open window so it can ask again later
// (Settings › เตือนซ้ำ). With no window open, the page repeats it on its own
// the next time it runs.
self.addEventListener('notificationclose', (e) => {
  const { id, type, ref } = e.notification.data ?? {};
  if (!id) return;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then((wins) => wins[0]?.postMessage({ kind: 'reminder', id, type, ref, action: 'dismissed' })));
});
