// Browser side of "แจ้งเตือนแม้ปิดแอป": permission, push subscription, and
// uploading the week's reminders to the push server — with their texts
// encrypted here first. The AES key never leaves this phone: it lives in
// IndexedDB, where the service worker reads it to decrypt when a push arrives.
const DB = 'meow-push';
const STORE = 'kv';

function idb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function kvGet(key) {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const r = db.transaction(STORE).objectStore(STORE).get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function kvSet(key, value) {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    if (value === undefined) tx.objectStore(STORE).delete(key);
    else tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

const b64u = {
  encode: (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  decode: (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0)),
};

export const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;

// What this phone/browser can do right now, and what the user must do first.
export function pushSupport() {
  if (!window.isSecureContext) return { ok: false, reason: 'insecure' };
  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    return { ok: false, reason: isIOS() && !isStandalone() ? 'ios-install' : 'unsupported' };
  }
  if (!('PushManager' in window)) return { ok: false, reason: isIOS() ? (isStandalone() ? 'ios-old' : 'ios-install') : 'unsupported' };
  return { ok: true, reason: null };
}

async function aesKey() {
  let key = await kvGet('aes');
  if (!key) {
    key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); // not extractable
    await kvSet('aes', key);
  }
  return key;
}

async function seal(obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(), new TextEncoder().encode(JSON.stringify(obj)));
  const out = new Uint8Array(12 + ct.byteLength);
  out.set(iv);
  out.set(new Uint8Array(ct), 12);
  return b64u.encode(out);
}

const api = async (server, path, { method = 'GET', body, auth, keepalive = false } = {}) => {
  const res = await fetch(`${server.replace(/\/+$/, '')}${path}`, {
    method,
    keepalive,
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth.id}.${auth.token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw Object.assign(new Error(`server ${res.status}`), { status: res.status });
  return res.json();
};

// Ask the OS (must run inside a tap), then subscribe with the server's VAPID key.
export async function enablePush(reg, server) {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return { ok: false, reason: perm === 'denied' ? 'denied' : 'dismissed' };
  const { publicKey } = await api(server, '/config');
  const old = await reg.pushManager.getSubscription();
  const oldKey = old?.options?.applicationServerKey ? b64u.encode(old.options.applicationServerKey) : null;
  if (old && oldKey !== publicKey) await old.unsubscribe(); // server keys changed
  const sub = (old && oldKey === publicKey) ? old : await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u.decode(publicKey) });
  const auth = await api(server, '/subscribe', { method: 'POST', body: { subscription: sub.toJSON() } });
  await kvSet('auth', { server, ...auth });
  await aesKey();
  return { ok: true };
}

export async function disablePush(reg) {
  const auth = await kvGet('auth').catch(() => null);
  if (auth) await api(auth.server, '/subscribe', { method: 'DELETE', auth }).catch(() => {});
  await (await reg?.pushManager.getSubscription())?.unsubscribe().catch(() => {});
  await kvSet('auth', undefined);
}

// Is this device still subscribed? (the user may have revoked permission in OS settings)
export async function pushActive(reg) {
  if (!reg || Notification.permission !== 'granted') return false;
  const [sub, auth] = await Promise.all([reg.pushManager.getSubscription(), kvGet('auth').catch(() => null)]);
  return !!(sub && auth);
}

// jobs: [{ id, at, check[], sub?, note: { title, body, data, actions } }]
export async function syncJobs(jobs, snapshot, { keepalive = false } = {}) {
  await kvSet('snap', snapshot);
  const auth = await kvGet('auth');
  if (!auth) throw new Error('not subscribed');
  const payloads = await Promise.all(jobs.map(async (j) => ({
    id: j.id,
    at: j.at,
    payload: JSON.stringify({ id: j.id, at: j.at, c: j.check, s: j.sub ?? null, p: await seal(j.note) }),
  })));
  return api(auth.server, '/jobs', { method: 'PUT', body: { jobs: payloads }, auth, keepalive });
}

export const saveSnapshot = (snapshot) => kvSet('snap', snapshot);

export async function serverTest() {
  const auth = await kvGet('auth');
  if (!auth) throw new Error('not subscribed');
  return api(auth.server, '/test', { method: 'POST', auth });
}
