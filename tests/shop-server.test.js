// รับกดพระ routes on the Worker, against a real SQLite (as D1 is).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { handle } from '../server/src/worker.js';

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

function setup() {
  const env = { DB: fakeD1(), ALLOWED_ORIGINS: 'https://shop.example', SHOP_ADMIN_KEY: 'secret-key' };
  let now = 1_000;
  const call = async (method, path, body, key) => {
    const res = await handle(new Request(`https://w.example${path}`, {
      method,
      headers: { Origin: 'https://shop.example', 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    }), env, { now: now++ });
    return { status: res.status, data: await res.json() };
  };
  return { env, call };
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
