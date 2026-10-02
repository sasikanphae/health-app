// รับกดพระ: the shared part of the CF-pressing service, on the same Worker + D1.
//
// The seller lists the รุ่น (batches) they will press CF for, each with its
// แบบ (items: name, price per coin, a suggested fee). Customers open a plain
// web page (no login), say how many coins they want and the fee per coin they
// offer, or ask the seller to go press a รุ่น that isn't listed yet. Every
// request joins the queue in the order it arrived. The seller accepts or
// declines, then marks how many coins they actually got.
//
// Customer routes (JSON, no login):
//   GET  /shop/batches                      → { batches } open batches, with queue length
//   POST /shop/orders  { batchId | wish, customer, contact, lines: [{ itemId, qty, fee }], note } → { id, token }
//   POST /shop/mine    { tickets: [{ id, token }] }  → { orders } the caller's own requests, with status and queue place
//   POST /shop/cancel  { id, token }        → cancels a request that is still waiting
// Seller routes need  Authorization: Bearer <SHOP_ADMIN_KEY>  (a Worker secret):
//   GET    /shop/admin                      → { batches, orders } everything
//   PUT    /shop/admin/batches/<id>         { name, note, releaseAt, status, items }
//   DELETE /shop/admin/batches/<id>
//   POST   /shop/admin/orders/<id>          { status?, got?, reply? }
//   DELETE /shop/admin/orders/<id>
import { b64u } from './webpush.js';

export const SHOP_LIMITS = { lines: 50, qty: 9999, fee: 1_000_000, text: 200, note: 1000, tickets: 100, items: 30, orders: 2000 };
export const ORDER_STATUSES = ['pending', 'accepted', 'got', 'missed', 'declined', 'cancelled'];
const ACTIVE = "status NOT IN ('declined', 'cancelled')";

const sha256 = async (text) => b64u.encode(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const int = (v, min, max) => (Number.isFinite(Number(v)) ? Math.min(max, Math.max(min, Math.round(Number(v)))) : null);
const money = (v) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.min(SHOP_LIMITS.fee, Math.round(Number(v) * 100) / 100) : null);
const idOk = (s) => typeof s === 'string' && /^[\w-]{1,40}$/.test(s);

export function cleanItems(items) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, SHOP_LIMITS.items).filter((it) => idOk(it?.id) && str(it.name, 80)).map((it) => ({
    id: it.id, name: str(it.name, 80), price: money(it.price) ?? 0, fee: money(it.fee),
  }));
}

const batchOut = (r) => ({
  id: r.id, name: r.name, note: r.note, releaseAt: r.release_at, status: r.status,
  items: JSON.parse(r.items || '[]'), created: r.created, updated: r.updated,
});
const orderOut = (r) => ({
  id: r.id, batchId: r.batch_id, wish: r.wish, customer: r.customer, contact: r.contact,
  lines: JSON.parse(r.lines || '[]'), note: r.note, status: r.status, got: r.got ? JSON.parse(r.got) : null,
  reply: r.reply, created: r.created, updated: r.updated,
});

// Place in the queue: 1 + active requests for the same batch (or the same
// "other batch" pool) that arrived earlier.
async function queuePlace(db, o) {
  if (o.status === 'declined' || o.status === 'cancelled') return null;
  const same = o.batch_id ? 'batch_id = ?' : 'batch_id IS NULL';
  const args = o.batch_id ? [o.batch_id, o.created, o.created, o.id] : [o.created, o.created, o.id];
  const row = await db.prepare(`SELECT count(*) AS n FROM shop_orders WHERE ${same} AND ${ACTIVE}
    AND (created < ? OR (created = ? AND id < ?))`).bind(...args).first();
  return (row?.n ?? 0) + 1;
}

export async function handleShop(req, env, cors, json, now) {
  const db = env.DB;
  const url = new URL(req.url);
  const path = url.pathname;
  const body = req.method === 'GET' || req.method === 'DELETE' ? null : await req.json().catch(() => null);

  if (req.method === 'GET' && path === '/shop/batches') {
    const { results = [] } = await db.prepare(`SELECT b.*, (SELECT count(*) FROM shop_orders o WHERE o.batch_id = b.id AND o.${ACTIVE}) AS queued
      FROM shop_batches b WHERE b.status = 'open' ORDER BY b.created`).all();
    return json({ batches: results.map((r) => ({ ...batchOut(r), queued: r.queued })) }, 200, cors);
  }

  if (req.method === 'POST' && path === '/shop/orders') {
    const customer = str(body?.customer, 80);
    const contact = str(body?.contact, SHOP_LIMITS.text);
    const note = str(body?.note, SHOP_LIMITS.note);
    if (!customer) return json({ error: 'ใส่ชื่อก่อนส่ง' }, 400, cors);
    const raw = Array.isArray(body?.lines) ? body.lines.slice(0, SHOP_LIMITS.lines) : [];
    let batchId = null;
    let wish = null;
    let lines;
    if (body?.batchId) {
      if (!idOk(body.batchId)) return json({ error: 'ไม่พบรุ่นนี้' }, 400, cors);
      const b = await db.prepare('SELECT * FROM shop_batches WHERE id = ?').bind(body.batchId).first();
      if (!b || b.status !== 'open') return json({ error: 'รุ่นนี้ปิดรับแล้ว' }, 409, cors);
      const items = new Set(JSON.parse(b.items || '[]').map((i) => i.id));
      batchId = b.id;
      lines = raw.filter((l) => items.has(l?.itemId)).map((l) => ({
        itemId: l.itemId, qty: int(l.qty, 0, SHOP_LIMITS.qty) ?? 0, fee: money(l.fee) ?? 0, who: str(l.who, 80),
      })).filter((l) => l.qty > 0);
    } else {
      wish = str(body?.wish, SHOP_LIMITS.text);
      if (!wish) return json({ error: 'บอกชื่อรุ่นที่อยากให้ไปกด' }, 400, cors);
      lines = raw.map((l) => ({ itemId: null, qty: int(l?.qty, 0, SHOP_LIMITS.qty) ?? 0, fee: money(l?.fee) ?? 0, who: str(l?.who, 80) }))
        .filter((l) => l.qty > 0);
    }
    if (!lines.length) return json({ error: 'ใส่จำนวนอย่างน้อย 1 องค์' }, 400, cors);
    const total = await db.prepare('SELECT count(*) AS n FROM shop_orders').first();
    if ((total?.n ?? 0) >= SHOP_LIMITS.orders) return json({ error: 'ตอนนี้รับคำขอเต็มแล้ว ติดต่อร้านโดยตรง' }, 503, cors);
    const id = b64u.encode(crypto.getRandomValues(new Uint8Array(12)));
    const token = b64u.encode(crypto.getRandomValues(new Uint8Array(18)));
    await db.prepare(`INSERT INTO shop_orders (id, batch_id, wish, customer, contact, lines, note, token_hash, status, got, reply, created, updated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, '', ?, ?)`)
      .bind(id, batchId, wish, customer, contact, JSON.stringify(lines), note, await sha256(token), now, now).run();
    const row = await db.prepare('SELECT * FROM shop_orders WHERE id = ?').bind(id).first();
    return json({ id, token, queue: await queuePlace(db, row) }, 200, cors);
  }

  if (req.method === 'POST' && path === '/shop/mine') {
    const tickets = Array.isArray(body?.tickets) ? body.tickets.slice(0, SHOP_LIMITS.tickets) : [];
    const orders = [];
    for (const t of tickets) {
      if (!idOk(t?.id) || typeof t.token !== 'string') continue;
      const r = await db.prepare('SELECT * FROM shop_orders WHERE id = ?').bind(t.id).first();
      if (!r || r.token_hash !== await sha256(t.token)) continue;
      const b = r.batch_id ? await db.prepare('SELECT name, items FROM shop_batches WHERE id = ?').bind(r.batch_id).first() : null;
      orders.push({ ...orderOut(r), queue: await queuePlace(db, r), batchName: b?.name ?? null, items: b ? JSON.parse(b.items || '[]') : [] });
    }
    return json({ orders }, 200, cors);
  }

  if (req.method === 'POST' && path === '/shop/cancel') {
    if (!idOk(body?.id) || typeof body.token !== 'string') return json({ error: 'bad ticket' }, 400, cors);
    const r = await db.prepare('SELECT * FROM shop_orders WHERE id = ?').bind(body.id).first();
    if (!r || r.token_hash !== await sha256(body.token)) return json({ error: 'not found' }, 404, cors);
    if (r.status !== 'pending') return json({ error: 'ร้านรับงานแล้ว ยกเลิกเองไม่ได้ ติดต่อร้านโดยตรง' }, 409, cors);
    await db.prepare("UPDATE shop_orders SET status = 'cancelled', updated = ? WHERE id = ?").bind(now, r.id).run();
    return json({ ok: true }, 200, cors);
  }

  // ---------- seller ----------
  if (!path.startsWith('/shop/admin')) return json({ error: 'not found' }, 404, cors);
  if (!env.SHOP_ADMIN_KEY) return json({ error: 'ยังไม่ได้ตั้งรหัสร้าน (SHOP_ADMIN_KEY)' }, 503, cors);
  const m = /^Bearer (.+)$/.exec(req.headers.get('Authorization') ?? '');
  if (!m || await sha256(m[1]) !== await sha256(env.SHOP_ADMIN_KEY)) return json({ error: 'รหัสร้านไม่ถูกต้อง' }, 401, cors);

  if (req.method === 'GET' && path === '/shop/admin') {
    const b = await db.prepare('SELECT * FROM shop_batches ORDER BY created').all();
    const o = await db.prepare('SELECT * FROM shop_orders ORDER BY created, id').all();
    return json({ batches: (b.results ?? []).map(batchOut), orders: (o.results ?? []).map(orderOut), now }, 200, cors);
  }

  const bm = /^\/shop\/admin\/batches\/([\w-]{1,40})$/.exec(path);
  if (bm && req.method === 'PUT') {
    const name = str(body?.name, 120);
    if (!name) return json({ error: 'ใส่ชื่อรุ่น' }, 400, cors);
    const status = body?.status === 'closed' ? 'closed' : 'open';
    await db.prepare(`INSERT INTO shop_batches (id, name, note, release_at, items, status, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, note = excluded.note, release_at = excluded.release_at,
      items = excluded.items, status = excluded.status, updated = excluded.updated`)
      .bind(bm[1], name, str(body?.note, SHOP_LIMITS.note), str(body?.releaseAt, 40), JSON.stringify(cleanItems(body?.items)), status, now, now).run();
    return json({ ok: true }, 200, cors);
  }
  if (bm && req.method === 'DELETE') {
    await db.prepare('DELETE FROM shop_batches WHERE id = ?').bind(bm[1]).run();
    return json({ ok: true }, 200, cors);
  }

  const om = /^\/shop\/admin\/orders\/([\w-]{1,40})$/.exec(path);
  if (om && req.method === 'POST') {
    const r = await db.prepare('SELECT * FROM shop_orders WHERE id = ?').bind(om[1]).first();
    if (!r) return json({ error: 'not found' }, 404, cors);
    const status = ORDER_STATUSES.includes(body?.status) ? body.status : r.status;
    let got = r.got;
    if (body && 'got' in body) {
      const g = {};
      for (const [k, v] of Object.entries(body.got ?? {})) if (/^[\w-]{1,40}$/.test(k)) g[k] = int(v, 0, SHOP_LIMITS.qty) ?? 0;
      got = body.got ? JSON.stringify(g) : null;
    }
    const reply = body && 'reply' in body ? str(body.reply, SHOP_LIMITS.note) : r.reply;
    await db.prepare('UPDATE shop_orders SET status = ?, got = ?, reply = ?, updated = ? WHERE id = ?').bind(status, got, reply, now, r.id).run();
    return json({ ok: true }, 200, cors);
  }
  if (om && req.method === 'DELETE') {
    await db.prepare('DELETE FROM shop_orders WHERE id = ?').bind(om[1]).run();
    return json({ ok: true }, 200, cors);
  }
  return json({ error: 'not found' }, 404, cors);
}
