// Offline support (network first, cache fallback) and notification button handling.
const CACHE = 'health-app-v19';
const ASSETS = [
  './',
  'index.html',
  'style.css',
  'img/badges/calendar.webp',
  'img/badges/cat-happy.webp',
  'img/badges/cat-sit.webp',
  'img/badges/cat-sleep.webp',
  'img/badges/check.webp',
  'img/badges/dumbbell.webp',
  'img/badges/grocery.webp',
  'img/badges/heart.webp',
  'img/badges/meal.webp',
  'img/badges/meditate.webp',
  'img/badges/money.webp',
  'img/badges/notes.webp',
  'img/badges/sleep.webp',
  'img/badges/steps.webp',
  'img/badges/water.webp',
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
  'js/inbox.js',
  'js/inbox-view.js',
  'js/arrange.js',
  'js/equipment.js',
  'js/memory.js',
  'js/why.js',
  'js/assistant-view.js',
  'js/suggest.js',
  'js/reschedule.js',
  'js/context.js',
  'js/magic-view.js',
  'js/meals.js',
  'js/planner.js',
  'js/store.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/badge-96.png',
  'icons/apple-touch-icon.png',
  'js/push-plan.js',
  'js/daily-quotes.js',
  'js/bell.js',
  'js/mala.js',
  'js/calm-view.js',
  'js/merit.js',
  'js/merit-view.js',
  'js/push-client.js',
  'js/push-view.js',
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
  // Same-origin files are always revalidated with the server (a cheap 304 when
  // unchanged): GitHub Pages lets browsers reuse files for 10 minutes, which
  // kept phones on the old version after an update.
  const net = url.origin === location.origin
    ? fetch(url.href, { cache: 'no-cache', credentials: 'same-origin' })
    : fetch(e.request);
  e.respondWith(
    net
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
    const url = `./?r=${encodeURIComponent(id)}&t=${encodeURIComponent(type)}&a=${action}${ref ? `&f=${encodeURIComponent(ref)}` : ''}`;
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

// ---------- push from the server (app closed) ----------
// The server only relays { id, at, c: check keys, s: local-text kind, p: ciphertext }.
// The text is decrypted here with the key the app stored in IndexedDB, and a
// reminder for something already done is dropped (the app re-syncs the server
// on every change; this is the backstop).
const PDB = 'meow-push';
function kv(key, value) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(PDB, 1);
    open.onupgradeneeded = () => open.result.createObjectStore('kv');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const tx = open.result.transaction('kv', value === undefined ? 'readonly' : 'readwrite');
      const r = value === undefined ? tx.objectStore('kv').get(key) : tx.objectStore('kv').put(value, key);
      tx.oncomplete = () => resolve(r.result);
      tx.onerror = () => reject(tx.error);
    };
  });
}
const b64d = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

async function unseal(p) {
  const key = await kv('aes');
  const raw = b64d(p);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.slice(0, 12) }, key, raw.slice(12));
  return JSON.parse(new TextDecoder().decode(pt));
}

// Same pace rule as the app (js/push-plan.js waterBehind).
function waterCheck(w, at) {
  const d = new Date(at);
  const frac = Math.min(1, Math.max(0, (d.getHours() * 60 + d.getMinutes() - 420) / 840));
  const expected = Math.round((w.goal || 0) * frac);
  return { behind: w.goal > 0 && expected - (w.have || 0) >= 2, expected };
}

const ICON = 'icons/icon-192.png';
const BADGE = 'icons/badge-96.png';

async function onPush(data) {
  if (data.kind === 'test') {
    return self.registration.showNotification('ทดสอบแจ้งเตือนจากเหมียวสมาธิ', {
      body: 'ถ้าเห็นข้อความนี้ตอนปิดแอปอยู่ แปลว่าแจ้งเตือนแบบ push ใช้ได้แล้ว', icon: ICON, badge: BADGE, tag: 'push-test',
    });
  }
  const snap = await kv('snap').catch(() => null);
  const baseId = String(data.id ?? '').split('#')[0];
  const date = baseId.split('@')[1] ?? '';
  let resolved = !!snap && ((data.c ?? []).some((k) => snap.done?.includes(k)) || snap.skipped?.includes(baseId));
  let note = null;
  try {
    note = await unseal(data.p);
  } catch { /* key gone (site data cleared): a neutral text below */ }
  if (data.s === 'water') {
    const w = snap?.date === date ? snap.water : { have: 0, goal: snap?.water?.goal ?? 8 };
    const c = waterCheck(w, data.at ?? Date.now());
    if (!c.behind) resolved = true;
    note = { ...(note ?? {}), title: `วันนี้ดื่มไป ${w.have} แก้ว ปกติเวลานี้ราว ${c.expected} แก้ว จิบสักแก้วไหม`, body: `เป้าวันนี้ ${w.goal} แก้ว · เตือนเฉพาะตอนที่ดื่มน้อยกว่าที่ควร` };
  }
  // A window is open and visible: the app shows its own card, no double buzz.
  const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const visible = wins.some((w) => w.visibilityState === 'visible');
  const tag = baseId || 'meow';
  if (resolved || visible) {
    // Browsers expect every push to show something; show it silently and take it
    // straight back so nothing stale reaches the user.
    await self.registration.showNotification('เหมียวสมาธิ', { tag: `quiet-${tag}`, silent: true, icon: ICON });
    (await self.registration.getNotifications({ tag: `quiet-${tag}` })).forEach((n) => n.close());
    if (visible && !resolved) wins[0].postMessage({ kind: 'push-refresh' });
    return;
  }
  const n = note ?? { title: 'แมวมีเรื่องเตือนไว้', body: 'แตะเพื่อเปิดดูในแอป' };
  return self.registration.showNotification(n.title, {
    body: n.body ?? '', tag, renotify: true, icon: ICON, badge: BADGE,
    data: { ...(n.data ?? {}), push: true }, actions: (n.actions ?? []).slice(0, 2),
  });
}

self.addEventListener('push', (e) => {
  let data = {};
  try {
    data = e.data?.json() ?? {};
  } catch { /* not JSON */ }
  e.waitUntil(onPush(data).catch(() => self.registration.showNotification('แมวมีเรื่องเตือนไว้', { body: 'แตะเพื่อเปิดดูในแอป', icon: ICON })));
});

// The browser rotated the subscription: re-register it with the server.
self.addEventListener('pushsubscriptionchange', (e) => {
  e.waitUntil((async () => {
    const auth = await kv('auth');
    if (!auth?.server) return;
    const cfg = await (await fetch(`${auth.server}/config`)).json();
    const sub = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64d(cfg.publicKey) });
    const res = await fetch(`${auth.server}/subscribe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub.toJSON() }) });
    if (res.ok) await kv('auth', { server: auth.server, ...(await res.json()) });
    // Jobs follow on the next app open (they live with the old id until then).
  })().catch(() => {}));
});
