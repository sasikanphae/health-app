// รับกดพระ: shows the Worker's pushes to customers (a request was accepted,
// declined, or its CF result was recorded). Scoped to ./shop* so it never
// touches the health app's own service worker (sw.js).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data?.json() ?? {}; } catch { /* not ours */ }
  const title = d.kind === 'shop' && d.title ? d.title : 'รับกดพระ';
  const body = d.kind === 'shop' && d.body ? d.body : 'คำขอของคุณมีอัปเดต แตะเพื่อดู';
  e.waitUntil(self.registration.showNotification(title, {
    body, tag: `shop-${d.id ?? 'update'}`, renotify: true,
    icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', data: { url: 'shop.html#mine' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url ?? 'shop.html', self.registration.scope).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = wins.find((w) => w.url.includes('/shop.html'));
    if (open) { await open.focus(); open.navigate?.(url); return; }
    await self.clients.openWindow(url);
  })());
});
