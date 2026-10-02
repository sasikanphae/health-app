// รับกดพระ routes on the Worker, against a real SQLite (as D1 is).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { handle } from '../server/src/worker.js';
import { generateVapidKeys, b64u } from '../server/src/webpush.js';
import { statusNote } from '../server/src/shop.js';

function fakeD1() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../server/schema.sql', import.meta.url), 'utf8'));
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    run: async () => { db.prepare(sql).run(...args); return { success: true }; },
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    first: async () => db.prepare(sql).get(...args) ?? null,
  });
  return { raw: db, prepare: (sql) => stmt(sql), batch: async (list) => { for (const s of list) await s.run(); } };
}

function setup(extraEnv = {}) {
  const env = { DB: fakeD1(), ALLOWED_ORIGINS: 'https://shop.example', SHOP_ADMIN_KEY: 'secret-key', ...extraEnv };
  let now = 1_000;
  const pushed = [];
  const fetch = async (url, init) => { pushed.push({ url, init }); return new Response(null, { status: url.includes('gone') ? 410 : 201 }); };
  const call = async (method, path, body, key) => {
    const res = await handle(new Request(`https://w.example${path}`, {
      method,
      headers: { Origin: 'https://shop.example', 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    }), env, { now: now++, fetch });
    return { status: res.status, data: await res.json() };
  };
  return { env, call, pushed };
}

const batch = { name: 'รุ่นมหาลาภ', note: 'กด 20.00 น.', releaseAt: '2026-10-10T20:00', status: 'open',
  items: [{ id: 'cu', name: 'เนื้อทองแดง', price: 500, fee: 100 }, { id: 'ag', name: 'เนื้อเงิน', price: 1500, fee: 300 }] };

test('seller lists a batch; customers see it, order with an offered fee, and get queue places', async () => {
  const { call } = setup();
  assert.equal((await call('PUT', '/shop/admin/batches/b1', batch)).status, 401, 'no key');
  assert.equal((await call('PUT', '/shop/admin/batches/b1', batch, 'wrong')).status, 401);
  assert.equal((await call('PUT', '/shop/admin/batches/b1', batch, 'secret-key')).status, 200);

  const list = await call('GET', '/shop/batches');
  assert.equal(list.data.batches.length, 1);
  assert.deepEqual(list.data.batches[0].items.map((i) => i.fee), [100, 300]);
  assert.equal(list.data.batches[0].queued, 0);

  const a = await call('POST', '/shop/orders', { batchId: 'b1', customer: 'พี่หนึ่ง', contact: 'line: one', lines: [{ itemId: 'cu', qty: 3, fee: 150 }, { itemId: 'ag', qty: 0, fee: 1 }, { itemId: 'zz', qty: 9, fee: 1 }] });
  assert.equal(a.status, 200);
  assert.equal(a.data.queue, 1);
  const b = await call('POST', '/shop/orders', { batchId: 'b1', customer: 'เจ๊สม', lines: [{ itemId: 'ag', qty: 2, fee: 400 }] });
  assert.equal(b.data.queue, 2);
  const w = await call('POST', '/shop/orders', { wish: 'หลวงพ่อ… รุ่นแรก', customer: 'น้องบี', lines: [{ qty: 5, fee: 200 }] });
  assert.equal(w.data.queue, 1, 'other-batch wishes have their own queue');
  assert.equal((await call('POST', '/shop/orders', { batchId: 'b1', customer: '', lines: [{ itemId: 'cu', qty: 1 }] })).status, 400);
  assert.equal((await call('POST', '/shop/orders', { batchId: 'b1', customer: 'x', lines: [] })).status, 400);

  // Only the ticket holder sees their request; the unknown item and zero line were dropped.
  const mine = await call('POST', '/shop/mine', { tickets: [{ id: a.data.id, token: a.data.token }, { id: b.data.id, token: 'nope' }] });
  assert.equal(mine.data.orders.length, 1);
  assert.deepEqual(mine.data.orders[0].lines, [{ itemId: 'cu', qty: 3, fee: 150, who: '' }]);
  assert.equal(mine.data.orders[0].batchName, 'รุ่นมหาลาภ');
  assert.equal(mine.data.orders[0].status, 'pending');
  assert.equal(mine.data.orders[0].token_hash, undefined, 'never sent back');

  // Queue 1 cancels: queue 2 moves up.
  assert.equal((await call('POST', '/shop/cancel', { id: a.data.id, token: a.data.token })).status, 200);
  const mineB = await call('POST', '/shop/mine', { tickets: [{ id: b.data.id, token: b.data.token }] });
  assert.equal(mineB.data.orders[0].queue, 1);

  // Seller accepts, then marks what they got; the customer can no longer cancel.
  const all = await call('GET', '/shop/admin', null, 'secret-key');
  assert.equal(all.data.orders.length, 3);
  assert.equal((await call('POST', `/shop/admin/orders/${b.data.id}`, { status: 'accepted' }, 'secret-key')).status, 200);
  assert.equal((await call('POST', '/shop/cancel', { id: b.data.id, token: b.data.token })).status, 409);
  await call('POST', `/shop/admin/orders/${b.data.id}`, { status: 'got', got: { ag: 1 }, reply: 'ได้ 1 องค์ โอนได้เลย' }, 'secret-key');
  const done = (await call('POST', '/shop/mine', { tickets: [{ id: b.data.id, token: b.data.token }] })).data.orders[0];
  assert.equal(done.status, 'got');
  assert.deepEqual(done.got, { ag: 1 });
  assert.equal(done.reply, 'ได้ 1 องค์ โอนได้เลย');

  // Closed batches disappear from the customer page and refuse new orders.
  await call('PUT', '/shop/admin/batches/b1', { ...batch, status: 'closed' }, 'secret-key');
  assert.equal((await call('GET', '/shop/batches')).data.batches.length, 0);
  assert.equal((await call('POST', '/shop/orders', { batchId: 'b1', customer: 'x', lines: [{ itemId: 'cu', qty: 1 }] })).status, 409);
});

test('without a seller key set, seller routes stay shut', async () => {
  const { env, call } = setup();
  delete env.SHOP_ADMIN_KEY;
  assert.equal((await call('GET', '/shop/admin', null, 'anything')).status, 503);
  assert.equal((await call('GET', '/shop/batches')).status, 200);
});

test('customers who turn on notifications are pushed when the seller accepts or records the result', async () => {
  const keys = await generateVapidKeys();
  const { env, call, pushed } = setup({ VAPID_PUBLIC_KEY: keys.publicKey, VAPID_PRIVATE_JWK: JSON.stringify(keys.privateJwk) });
  await call('PUT', '/shop/admin/batches/b1', batch, 'secret-key');
  const a = (await call('POST', '/shop/orders', { batchId: 'b1', customer: 'พี่หนึ่ง', lines: [{ itemId: 'cu', qty: 3, fee: 150 }] })).data;
  const b = (await call('POST', '/shop/orders', { batchId: 'b1', customer: 'เจ๊สม', lines: [{ itemId: 'ag', qty: 1, fee: 300 }] })).data;

  // A browser's push subscription (real P-256 keys so the payload can be encrypted).
  const kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const subscription = { endpoint: 'https://push.example/one', keys: { p256dh: b64u.encode(await crypto.subtle.exportKey('raw', kp.publicKey)), auth: b64u.encode(crypto.getRandomValues(new Uint8Array(16))) } };
  const linked = await call('POST', '/shop/notify', { subscription, tickets: [{ id: a.id, token: a.token }, { id: b.id, token: 'wrong' }] });
  assert.equal(linked.data.linked, 1, 'only the ticket this browser holds');

  const acc = await call('POST', `/shop/admin/orders/${a.id}`, { status: 'accepted' }, 'secret-key');
  assert.equal(acc.data.notified, 1);
  assert.equal(pushed.length, 1);
  assert.equal(pushed[0].url, 'https://push.example/one');
  assert.match(pushed[0].init.headers.Authorization, /^vapid t=/);
  assert.equal((await call('POST', `/shop/admin/orders/${b.id}`, { status: 'accepted' }, 'secret-key')).data.notified, 0, 'not subscribed');
  assert.equal((await call('POST', `/shop/admin/orders/${a.id}`, { reply: 'แก้ข้อความ' }, 'secret-key')).data.notified, 0, 'no new status: no buzz');

  const all = (await call('GET', '/shop/admin', null, 'secret-key')).data.orders;
  assert.deepEqual(all.map((o) => o.push), [1, 0]);

  // A browser that went away (410) is forgotten.
  await call('POST', '/shop/notify', { subscription: { ...subscription, endpoint: 'https://push.example/gone' }, tickets: [{ id: a.id, token: a.token }] });
  await call('POST', `/shop/admin/orders/${a.id}`, { status: 'got', got: { cu: 2 } }, 'secret-key');
  assert.equal(env.DB.raw.prepare("SELECT count(*) n FROM shop_push WHERE endpoint LIKE '%gone'").get().n, 0);
  assert.equal(env.DB.raw.prepare('SELECT count(*) n FROM shop_push').get().n, 1);

  // Turning it off removes this browser from every request.
  await call('POST', '/shop/notify', { subscription, off: true });
  assert.equal(env.DB.raw.prepare('SELECT count(*) n FROM shop_push').get().n, 0);
});

test('notification texts say what changed and how much to transfer', () => {
  const b = { name: 'รุ่นมหาลาภ', items: JSON.stringify(batch.items) };
  const o = { status: 'got', lines: JSON.stringify([{ itemId: 'cu', qty: 3, fee: 150 }, { itemId: 'ag', qty: 1, fee: 300 }]), got: JSON.stringify({ cu: 2, ag: 1 }), reply: 'โอนได้เลย' };
  assert.deepEqual(statusNote(o, b, 1), { title: 'กดได้แล้ว! ได้ 3 องค์', body: 'รุ่นมหาลาภ · ยอดโอน 3,100 บาท · โอนได้เลย' });
  assert.deepEqual(statusNote({ ...o, status: 'accepted', reply: '' }, b, 2), { title: 'ร้านรับงานแล้ว 🙏', body: 'รุ่นมหาลาภ · 4 องค์ · คิวที่ 2' });
  assert.equal(statusNote({ ...o, status: 'missed', wish: 'รุ่นแรก', reply: '' }, null, null).body, 'ขอให้ไปกด: รุ่นแรก');
  assert.equal(statusNote({ ...o, status: 'pending' }, b, 1), null);
});
