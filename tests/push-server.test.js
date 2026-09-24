// Push server: RFC 8291 encryption round-trip, VAPID signature, and the
// worker's subscribe → jobs → cron flow against a real SQLite (as D1 is).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { encryptPayload, vapidHeader, generateVapidKeys, b64u } from '../server/src/webpush.js';
import { handle, runDue } from '../server/src/worker.js';

const enc = new TextEncoder();
const dec = new TextDecoder();

// A browser's side of a subscription.
async function userAgent() {
  const kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const auth = crypto.getRandomValues(new Uint8Array(16));
  const p256dh = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
  return { kp, keys: { p256dh: b64u.encode(p256dh), auth: b64u.encode(auth) }, rawPub: p256dh, auth };
}

async function hkdf(salt, ikm, info, len) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8));
}
const cat = (...p) => Uint8Array.from(p.flatMap((x) => [...x]));

// What the browser does on receipt (RFC 8291 §3.4, RFC 8188 §2), written out step by step.
async function decryptAsBrowser(body, ua) {
  const salt = body.slice(0, 16);
  const rs = new DataView(body.buffer, body.byteOffset + 16, 4).getUint32(0);
  const idlen = body[20];
  const asPub = body.slice(21, 21 + idlen);
  const ct = body.slice(21 + idlen);
  assert.equal(rs, 4096);
  assert.equal(idlen, 65);
  const asKey = await crypto.subtle.importKey('raw', asPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey }, ua.kp.privateKey, 256));
  const ikm = await hkdf(ua.auth, ecdh, cat(enc.encode('WebPush: info\0'), ua.rawPub, asPub), 32);
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  const pt = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, ct));
  let end = pt.length - 1;
  while (pt[end] === 0) end--;
  assert.equal(pt[end], 2, 'last-record delimiter');
  return dec.decode(pt.slice(0, end));
}

test('payload encryption round-trips as a browser would decrypt it (aes128gcm)', async () => {
  const ua = await userAgent();
  const msg = JSON.stringify({ id: 'ev:1@2026-10-26', p: 'ข้อความภาษาไทย 🐱' });
  const body = await encryptPayload(msg, ua.keys);
  assert.equal(await decryptAsBrowser(body, ua), msg);
});

test('VAPID header: ES256 JWT for the push service origin, verifiable with the public key', async () => {
  const keys = await generateVapidKeys();
  const h = await vapidHeader('https://fcm.googleapis.com/fcm/send/abc', { ...keys, subject: 'mailto:a@b.c' }, 1_800_000_000_000);
  const m = /^vapid t=([\w-]+)\.([\w-]+)\.([\w-]+), k=([\w-]+)$/.exec(h);
  assert.ok(m);
  const claims = JSON.parse(dec.decode(b64u.decode(m[2])));
  assert.equal(claims.aud, 'https://fcm.googleapis.com');
  assert.equal(claims.exp, 1_800_000_000 + 12 * 3600);
  const pub = await crypto.subtle.importKey('raw', b64u.decode(m[4]), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  assert.ok(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, b64u.decode(m[3]), enc.encode(`${m[1]}.${m[2]}`)));
});

// D1-shaped wrapper over node:sqlite.
function fakeD1() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../server/schema.sql', import.meta.url), 'utf8'));
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    run: async () => { db.prepare(sql).run(...args); return { success: true }; },
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    first: async () => db.prepare(sql).get(...args) ?? null,
  });
  return {
    raw: db,
    prepare: (sql) => stmt(sql),
    batch: async (list) => { db.exec('BEGIN'); try { for (const s of list) await s.run(); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; } },
  };
}

test('worker: subscribe, upload jobs, cron sends only what is due, gone devices are forgotten', async () => {
  const keys = await generateVapidKeys();
  const env = { DB: fakeD1(), VAPID_PUBLIC_KEY: keys.publicKey, VAPID_PRIVATE_JWK: JSON.stringify(keys.privateJwk), ALLOWED_ORIGINS: 'https://app.example' };
  const ua = await userAgent();
  const origin = { Origin: 'https://app.example', 'Content-Type': 'application/json' };
  const call = (method, path, body, token) => handle(new Request(`https://push.example${path}`, {
    method, headers: { ...origin, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined,
  }), env, { now: 1_000_000 });

  assert.equal((await handle(new Request('https://push.example/config', { headers: { Origin: 'https://evil.example' } }), env)).status, 403);
  assert.equal((await (await call('GET', '/config')).json()).publicKey, keys.publicKey);

  const subscription = { endpoint: 'https://push.example-service.com/send/xyz', keys: ua.keys };
  const { id, token } = await (await call('POST', '/subscribe', { subscription })).json();
  const auth = `${id}.${token}`;
  assert.equal((await call('PUT', '/jobs', { jobs: [] }, `${id}.wrong`)).status, 401);

  const jobs = [
    { id: 'a', at: 1_060_000, payload: JSON.stringify({ id: 'a', p: 'x' }) },
    { id: 'b', at: 5_000_000, payload: JSON.stringify({ id: 'b', p: 'y' }) },
    { id: 'bad', at: 1_000_000 + 30 * 86_400_000, payload: '{}' }, // beyond the horizon
  ];
  const put = await (await call('PUT', '/jobs', { jobs }, auth)).json();
  assert.equal(put.stored, 2);

  const sent = [];
  const fetchImpl = async (url, init) => { sent.push({ url, init }); return new Response(null, { status: 201 }); };
  assert.deepEqual(await runDue(env, { now: 1_100_000, fetchImpl }), { due: 1, sent: 1 });
  assert.equal(sent[0].url, subscription.endpoint);
  assert.equal(sent[0].init.headers['Content-Encoding'], 'aes128gcm');
  assert.equal(await decryptAsBrowser(sent[0].init.body, ua), jobs[0].payload);
  assert.equal(env.DB.raw.prepare('SELECT count(*) n FROM jobs').get().n, 1);

  // Re-upload replaces everything (a job the user finished disappears).
  await call('PUT', '/jobs', { jobs: [jobs[1]] }, auth);
  assert.deepEqual(env.DB.raw.prepare('SELECT job_id FROM jobs').all().map((r) => r.job_id), ['b']);

  // The push service says the subscription is gone → device and jobs forgotten.
  const gone = async () => new Response(null, { status: 410 });
  await runDue(env, { now: 5_100_000, fetchImpl: gone });
  assert.equal(env.DB.raw.prepare('SELECT count(*) n FROM subs').get().n, 0);
});

test('worker: a job far too late (server was down) is dropped, not sent hours later', async () => {
  const keys = await generateVapidKeys();
  const env = { DB: fakeD1(), VAPID_PUBLIC_KEY: keys.publicKey, VAPID_PRIVATE_JWK: JSON.stringify(keys.privateJwk) };
  env.DB.raw.prepare("INSERT INTO subs VALUES ('s','https://p.example/x','k','a','h',0,?)").run(10 * 3600_000);
  env.DB.raw.prepare("INSERT INTO jobs VALUES ('s','old',?,'{}',0)").run(1 * 3600_000);
  let calls = 0;
  await runDue(env, { now: 10 * 3600_000, fetchImpl: async () => { calls++; return new Response(null, { status: 201 }); } });
  assert.equal(calls, 0);
  assert.equal(env.DB.raw.prepare('SELECT count(*) n FROM jobs').get().n, 0);
});
