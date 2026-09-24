// เหมียวสมาธิ push server — a Cloudflare Worker + D1 (SQLite).
//
// The app keeps all its data on the phone. To remind the user while the app
// is closed, it uploads a short list of jobs: { id, at, payload }. `payload`
// is a JSON string whose text was encrypted ON THE PHONE with a key the server
// never sees, so this server only knows "some reminder at 17:30".
// A cron trigger runs every minute and sends what's due as a Web Push.
//
// Routes (JSON):
//   GET    /config      → { publicKey }
//   POST   /subscribe   { subscription } → { id, token }
//   PUT    /jobs        { jobs: [{ id, at, payload }] }   (replaces all of this device's jobs)
//   POST   /test        → sends one test push now
//   DELETE /subscribe   → forget this device and its jobs
// Authenticated routes need  Authorization: Bearer <id>.<token>
import { sendPush, b64u } from './webpush.js';

export const LIMITS = { jobs: 300, payload: 3000, horizonDays: 8, lateMs: 2 * 3600_000, perRun: 200, tries: 3 };

const json = (data, status, cors) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors } });

async function sha256(text) {
  return b64u.encode(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

function corsFor(req, env) {
  const origin = req.headers.get('Origin') ?? '';
  const allowed = (env.ALLOWED_ORIGINS ?? '*').split(',').map((s) => s.trim());
  const ok = allowed.includes('*') || allowed.includes(origin);
  return ok ? {
    'Access-Control-Allow-Origin': allowed.includes('*') ? '*' : origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  } : null;
}

async function authed(req, db) {
  const m = /^Bearer ([\w-]+)\.([\w-]+)$/.exec(req.headers.get('Authorization') ?? '');
  if (!m) return null;
  const sub = await db.prepare('SELECT * FROM subs WHERE id = ?').bind(m[1]).first();
  if (!sub || sub.token_hash !== await sha256(m[2])) return null;
  return sub;
}

const vapidOf = (env) => ({ publicKey: env.VAPID_PUBLIC_KEY, privateJwk: env.VAPID_PRIVATE_JWK, subject: env.VAPID_SUBJECT ?? 'mailto:admin@example.com' });
const subscriptionOf = (row) => ({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } });

function validSubscription(s) {
  try {
    const u = new URL(s?.endpoint);
    return u.protocol === 'https:' && typeof s.keys?.p256dh === 'string' && typeof s.keys?.auth === 'string'
      && s.keys.p256dh.length < 200 && s.keys.auth.length < 100 && s.endpoint.length < 1000;
  } catch {
    return false;
  }
}

export async function handle(req, env, deps = {}) {
  const cors = corsFor(req, env);
  if (!cors) return new Response('forbidden origin', { status: 403 });
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  const db = env.DB;
  const url = new URL(req.url);
  const now = deps.now ?? Date.now();

  if (req.method === 'GET' && url.pathname === '/config') return json({ publicKey: env.VAPID_PUBLIC_KEY }, 200, cors);

  if (req.method === 'POST' && url.pathname === '/subscribe') {
    const body = await req.json().catch(() => null);
    if (!validSubscription(body?.subscription)) return json({ error: 'bad subscription' }, 400, cors);
    const s = body.subscription;
    const id = (await sha256(s.endpoint)).slice(0, 32);
    const token = b64u.encode(crypto.getRandomValues(new Uint8Array(24)));
    await db.prepare(`INSERT INTO subs (id, endpoint, p256dh, auth, token_hash, created, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, token_hash = excluded.token_hash, last_seen = excluded.last_seen`)
      .bind(id, s.endpoint, s.keys.p256dh, s.keys.auth, await sha256(token), now, now).run();
    return json({ id, token }, 200, cors);
  }

  const sub = await authed(req, db);
  if (!sub) return json({ error: 'unauthorized' }, 401, cors);

  if (req.method === 'PUT' && url.pathname === '/jobs') {
    const body = await req.json().catch(() => null);
    const jobs = Array.isArray(body?.jobs) ? body.jobs : null;
    if (!jobs || jobs.length > LIMITS.jobs) return json({ error: 'bad jobs' }, 400, cors);
    const max = now + LIMITS.horizonDays * 86_400_000;
    const rows = jobs.filter((j) => typeof j.id === 'string' && j.id.length <= 120 && Number.isFinite(j.at) && j.at > now - 60_000 && j.at < max
      && typeof j.payload === 'string' && j.payload.length <= LIMITS.payload);
    const stmts = [
      db.prepare('DELETE FROM jobs WHERE sub_id = ?').bind(sub.id),
      db.prepare('UPDATE subs SET last_seen = ? WHERE id = ?').bind(now, sub.id),
      ...rows.map((j) => db.prepare('INSERT OR REPLACE INTO jobs (sub_id, job_id, at, payload, tries) VALUES (?, ?, ?, ?, 0)').bind(sub.id, j.id, Math.round(j.at), j.payload)),
    ];
    await db.batch(stmts);
    return json({ ok: true, stored: rows.length, next: rows.length ? Math.min(...rows.map((j) => j.at)) : null }, 200, cors);
  }

  if (req.method === 'POST' && url.pathname === '/test') {
    const status = await sendPush(subscriptionOf(sub), JSON.stringify({ kind: 'test', at: now }), vapidOf(env), { ttl: 600, urgency: 'high', fetchImpl: deps.fetch });
    if (status === 404 || status === 410) await forget(db, sub.id);
    return json({ ok: status >= 200 && status < 300, status }, 200, cors);
  }

  if (req.method === 'DELETE' && url.pathname === '/subscribe') {
    await forget(db, sub.id);
    return json({ ok: true }, 200, cors);
  }
  return json({ error: 'not found' }, 404, cors);
}

async function forget(db, id) {
  await db.batch([db.prepare('DELETE FROM jobs WHERE sub_id = ?').bind(id), db.prepare('DELETE FROM subs WHERE id = ?').bind(id)]);
}

// Every minute: send what's due. Too-late jobs (server was down) are dropped,
// a gone subscription is forgotten, a busy push service gets a few retries.
export async function runDue(env, { now = Date.now(), fetchImpl } = {}) {
  const db = env.DB;
  await db.prepare('DELETE FROM jobs WHERE at < ?').bind(now - LIMITS.lateMs).run();
  const { results = [] } = await db.prepare(`SELECT j.sub_id, j.job_id, j.at, j.payload, j.tries, s.endpoint, s.p256dh, s.auth
    FROM jobs j JOIN subs s ON s.id = j.sub_id WHERE j.at <= ? ORDER BY j.at LIMIT ?`).bind(now, LIMITS.perRun).all();
  const gone = new Set();
  let sent = 0;
  for (const r of results) {
    if (gone.has(r.sub_id)) continue;
    let status;
    try {
      status = await sendPush(subscriptionOf(r), r.payload, vapidOf(env), { ttl: 4 * 3600, urgency: 'high', fetchImpl });
    } catch {
      status = 0;
    }
    if (status === 404 || status === 410) {
      gone.add(r.sub_id);
      await forget(db, r.sub_id);
    } else if ((status === 0 || status === 429 || status >= 500) && r.tries + 1 < LIMITS.tries) {
      await db.prepare('UPDATE jobs SET tries = tries + 1, at = ? WHERE sub_id = ? AND job_id = ?').bind(now + 60_000, r.sub_id, r.job_id).run();
    } else {
      if (status >= 200 && status < 300) sent++;
      await db.prepare('DELETE FROM jobs WHERE sub_id = ? AND job_id = ?').bind(r.sub_id, r.job_id).run();
    }
  }
  // Devices not seen for 60 days: the app was probably removed.
  await db.prepare('DELETE FROM subs WHERE last_seen < ?').bind(now - 60 * 86_400_000).run();
  await db.prepare('DELETE FROM jobs WHERE sub_id NOT IN (SELECT id FROM subs)').run();
  return { due: results.length, sent };
}

export default {
  fetch: (req, env) => handle(req, env),
  scheduled: (event, env, ctx) => ctx.waitUntil(runDue(env)),
};
