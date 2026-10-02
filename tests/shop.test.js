import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderMoney, replyText, batchRollup, queueNumbers, parseNum } from '../js/shop.js';

const batch = { id: 'b1', name: 'รุ่นมหาลาภ', items: [{ id: 'cu', name: 'เนื้อทองแดง', price: 500, fee: 100 }, { id: 'ag', name: 'เนื้อเงิน', price: 1500, fee: 300 }] };
const order = (id, created, lines, extra = {}) => ({ id, batchId: 'b1', customer: `ลูกค้า ${id}`, lines, status: 'pending', created, reply: '', ...extra });

test('money: asked amounts before the CF, only coins obtained after "กดได้"', () => {
  const o = order('a', 1, [{ itemId: 'cu', qty: 3, fee: 150 }, { itemId: 'ag', qty: 1, fee: 300 }]);
  assert.deepEqual(orderMoney(o, batch.items), { wanted: 4, coins: 4, price: 3000, fee: 750, total: 3750 });
  const done = { ...o, status: 'got', got: { cu: 2, ag: 0 } };
  assert.deepEqual(orderMoney(done, batch.items), { wanted: 4, coins: 2, price: 1000, fee: 300, total: 1300 });
  const wish = { id: 'w', batchId: null, wish: 'รุ่นแรก', lines: [{ itemId: null, qty: 2, fee: 500 }], status: 'got', got: { wish0: 1 } };
  assert.equal(orderMoney(wish, []).fee, 500);
  assert.equal(parseNum('๑,๕๐๐ บาท'), 1500);
});

test('queue numbers per batch skip cancelled and declined requests', () => {
  const orders = [
    order('c', 3, []), order('a', 1, [], { status: 'cancelled' }), order('b', 2, []),
    { id: 'w', batchId: null, lines: [], status: 'pending', created: 0 },
  ];
  assert.deepEqual(queueNumbers(orders), { w: 1, b: 1, c: 2 });
});

test('roll-up adds coins and fees per แบบ; reply text reads like a chat message', () => {
  const orders = [
    order('a', 1, [{ itemId: 'cu', qty: 3, fee: 150 }]),
    order('b', 2, [{ itemId: 'cu', qty: 2, fee: 200 }, { itemId: 'ag', qty: 1, fee: 300 }], { status: 'accepted' }),
    order('x', 3, [{ itemId: 'cu', qty: 9, fee: 999 }], { status: 'declined' }),
  ];
  const r = batchRollup(batch, orders);
  assert.equal(r.count, 2);
  assert.deepEqual(r.items.map((i) => [i.qty, i.fee, i.maxFee]), [[5, 850, 200], [1, 300, 300]]);
  const t = replyText({ ...orders[1], status: 'got', got: { cu: 2, ag: 1 }, reply: 'โอนได้เลย' }, batch, 1);
  assert.match(t, /ลูกค้า b · คิวที่ 1/);
  assert.match(t, /เนื้อทองแดง × 2 องค์ · ค่ากด 200 บาท\/องค์ → ได้ 2/);
  assert.match(t, /ค่ากด 700 บาท/);
  assert.match(t, /รวม 3,200 บาท/);
  assert.match(t, /โอนได้เลย$/);
});
