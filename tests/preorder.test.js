import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseTiers, unitPrice, allocate, orderBill, batchSummary, parsePaste, confirmText, queueText,
  normalizeStore, parseMoney,
} from '../js/preorder.js';

const batch = {
  id: 'b1', name: 'รุ่นมหาลาภ', status: 'open', nextQueue: 4,
  items: [
    { id: 'gold', name: 'เนื้อทองแดง', price: 500, quota: 5, tiers: [{ min: 3, price: 450 }, { min: 10, price: 400 }] },
    { id: 'silver', name: 'เนื้อเงิน', price: 1500, quota: null, tiers: [] },
  ],
};
const order = (id, queue, lines, extra = {}) => ({ id, batchId: 'b1', queue, customer: `ลูกค้า${queue}`, lines, prices: {}, status: 'booked', ...extra });

test('step prices are read from loose text and applied by quantity', () => {
  assert.deepEqual(parseTiers('10:400, 3=450 ๕๐:๓๕๐'), [{ min: 3, price: 450 }, { min: 10, price: 400 }, { min: 50, price: 350 }]);
  const it = batch.items[0];
  assert.equal(unitPrice(it, 1), 500);
  assert.equal(unitPrice(it, 3), 450);
  assert.equal(unitPrice(it, 12), 400);
  assert.equal(unitPrice(it, 12, 380), 380, 'an agreed price wins');
  assert.equal(parseMoney('๑,๒๐๐'), 1200);
});

test('quota is handed out in queue order and the rest waits', () => {
  const orders = [
    order('o2', 2, [{ id: 'l3', who: 'ป้าแดง', itemId: 'gold', qty: 4 }]),
    order('o1', 1, [{ id: 'l1', who: 'สมชาย', itemId: 'gold', qty: 2 }, { id: 'l2', who: 'สมหญิง', itemId: 'silver', qty: 1 }]),
    order('o3', 3, [{ id: 'l4', who: 'ลุงมี', itemId: 'gold', qty: 1 }]),
  ];
  const a = allocate(batch, orders);
  assert.deepEqual(a.lines.l1, { got: 2, wait: 0 });
  assert.deepEqual(a.lines.l3, { got: 3, wait: 1 });
  assert.deepEqual(a.lines.l4, { got: 0, wait: 1 });
  assert.deepEqual(a.items.gold, { booked: 7, got: 5, wait: 2, left: 0 });
  assert.equal(a.items.silver.left, Infinity);

  // Queue 1 cancels: the waiting coins move up by themselves.
  orders[1].status = 'cancelled';
  const b = allocate(batch, orders);
  assert.deepEqual(b.lines.l3, { got: 4, wait: 0 });
  assert.deepEqual(b.lines.l4, { got: 1, wait: 0 });
});

test('bill charges only coins that got in, with step price, shipping and payment', () => {
  const orders = [
    order('o1', 1, [{ id: 'l1', who: 'ก', itemId: 'gold', qty: 2 }]),
    order('o2', 2, [{ id: 'l2', who: 'ข', itemId: 'gold', qty: 2 }, { id: 'l3', who: 'ค', itemId: 'gold', qty: 2 }, { id: 'l4', who: 'ง', itemId: 'silver', qty: 1 }],
      { shipping: 50, paid: 1000 }),
  ];
  const a = allocate(batch, orders);
  const bill = orderBill(batch, orders[1], a);
  assert.equal(bill.coins, 4); // 3 gold + 1 silver
  assert.equal(bill.waiting, 1);
  assert.equal(bill.rows[0].unit, 450); // 3 gold coins → step price
  assert.equal(bill.total, 3 * 450 + 1500 + 50);
  assert.equal(bill.due, bill.total - 1000);

  const s = batchSummary(batch, orders);
  assert.equal(s.orders, 2);
  assert.equal(s.people, 4);
  assert.equal(s.coins, 6);
  assert.equal(s.waiting, 1);
  assert.equal(s.total, 2 * 500 + bill.total);
});

test('a list pasted from chat becomes one row per person', () => {
  const text = `1. สมชาย 2
2) สมหญิง เนื้อเงิน x3
- ป้าแดง
ลุงมี  ๔ เหรียญ

เนื้อเงิน 1
---`;
  const { rows, skipped } = parsePaste(text, batch.items);
  assert.deepEqual(rows, [
    { who: 'สมชาย', itemId: 'gold', qty: 2, guessed: true },
    { who: 'สมหญิง', itemId: 'silver', qty: 3, guessed: false },
    { who: 'ป้าแดง', itemId: 'gold', qty: 1, guessed: true },
    { who: 'ลุงมี', itemId: 'gold', qty: 4, guessed: true },
    { who: '', itemId: 'silver', qty: 1, guessed: false },
  ]);
  assert.deepEqual(skipped, ['---']);
  const one = parsePaste('สมชาย 2', [batch.items[0]]);
  assert.equal(one.rows[0].guessed, false, 'only one แบบ: nothing to guess');
});

test('texts for chat show queue, coins, waiting and money', () => {
  const orders = [
    order('o1', 1, [{ id: 'l1', who: 'สมชาย', itemId: 'gold', qty: 4 }]),
    order('o2', 2, [{ id: 'l2', who: 'ป้าแดง', itemId: 'gold', qty: 3 }, { id: 'l3', who: 'ลุงมี', itemId: 'silver', qty: 1 }]),
  ];
  const a = allocate(batch, orders);
  const c = confirmText(batch, orders[1], a);
  assert.match(c, /คิวที่ 2/);
  assert.match(c, /ป้าแดง – เนื้อทองแดง × 3 \(ได้ 1 · รอคิวสำรอง 2\)/);
  assert.match(c, /รวม 2 เหรียญ · 2,000 บาท/);
  const q = queueText(batch, orders);
  assert.match(q, /เนื้อทองแดง: จองได้ 5\/5 · สำรอง 2/);
  assert.match(q, /2\. ลูกค้า2 \(2 คน\) – 2 เหรียญ \(\+สำรอง 2\)/);
});

test('stored data is repaired and queue numbers never repeat', () => {
  const s = normalizeStore({ batches: [{ id: 'b1', name: 'x', items: [{ id: 'i' }], nextQueue: 1 }], orders: [{ id: 'o', batchId: 'b1', queue: 7, status: '???' }] });
  assert.equal(s.batches[0].nextQueue, 8);
  assert.deepEqual(s.batches[0].items[0].tiers, []);
  assert.equal(s.orders[0].status, 'booked');
  assert.deepEqual(normalizeStore(null), { version: 1, batches: [], orders: [] });
});
