// พรีออเดอร์พระ: one seller takes pre-orders for each รุ่น (batch). Customers often
// send one message ordering for many people, so an order has an orderer plus any
// number of rows (who · which แบบ · how many coins).
//   • Queue: every order gets the batch's next queue number and keeps it for good.
//     Each แบบ can have a quota; coins are handed out in queue order, what doesn't
//     fit waits (คิวสำรอง) and moves up by itself when an earlier order is cancelled.
//   • Price per coin: each แบบ has a price, optional step prices by quantity
//     ("10 เหรียญขึ้นไป 450"), and an order can carry its own agreed price.
// Pure functions only — tested in tests/preorder.test.js; preorder-app.js draws them.
export const STORAGE_KEY = 'preorder:v1';

export const STATUSES = {
  booked: { label: 'จองแล้ว', short: 'จอง' },
  paid: { label: 'ชำระแล้ว', short: 'ชำระ' },
  shipped: { label: 'ส่งแล้ว', short: 'ส่ง' },
  cancelled: { label: 'ยกเลิก', short: 'ยกเลิก' },
};

export const emptyStore = () => ({ version: 1, batches: [], orders: [] });

export function normalizeStore(raw) {
  const base = emptyStore();
  if (!raw || typeof raw !== 'object') return base;
  const batches = Array.isArray(raw.batches) ? raw.batches : [];
  const orders = Array.isArray(raw.orders) ? raw.orders : [];
  for (const b of batches) {
    b.items = Array.isArray(b.items) ? b.items : [];
    for (const it of b.items) it.tiers = Array.isArray(it.tiers) ? it.tiers : [];
    b.status ??= 'open';
    const top = Math.max(0, ...orders.filter((o) => o.batchId === b.id).map((o) => o.queue || 0));
    b.nextQueue = Math.max(Number(b.nextQueue) || 1, top + 1);
  }
  for (const o of orders) {
    o.lines = Array.isArray(o.lines) ? o.lines : [];
    o.prices ??= {};
    o.status = STATUSES[o.status] ? o.status : 'booked';
  }
  return { ...base, ...raw, version: 1, batches, orders };
}

// Thai digits → Arabic, commas out: "๑,๒๐๐" → "1200".
export const toDigits = (s) => String(s ?? '').replace(/[๐-๙]/g, (d) => String('๐๑๒๓๔๕๖๗๘๙'.indexOf(d))).replace(/,/g, '');

export function parseMoney(s) {
  const n = Number.parseFloat(toDigits(s).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

// "10:450, 50:400" or "10=450 50=400" → [{ min: 10, price: 450 }, { min: 50, price: 400 }]
export function parseTiers(text) {
  const out = [];
  for (const m of toDigits(text).matchAll(/(\d+)\s*[:=]\s*(\d+(?:\.\d+)?)/g)) {
    const min = Number(m[1]);
    const price = Number(m[2]);
    if (min > 1 && price >= 0 && !out.some((t) => t.min === min)) out.push({ min, price });
  }
  return out.sort((a, b) => a.min - b.min);
}
export const tiersText = (tiers) => (tiers ?? []).map((t) => `${t.min}:${t.price}`).join(', ');

// Price per coin for `qty` coins of one แบบ in one order.
export function unitPrice(item, qty, override) {
  if (Number.isFinite(override)) return override;
  let price = Number(item?.price) || 0;
  for (const t of item?.tiers ?? []) if (qty >= t.min) price = t.price;
  return price;
}

export const activeOrders = (orders, batchId) => orders
  .filter((o) => o.batchId === batchId && o.status !== 'cancelled')
  .sort((a, b) => a.queue - b.queue);

// Hand out each แบบ's quota in queue order.
// Returns { lines: { lineId: { got, wait } }, items: { itemId: { booked, got, wait, left } } }.
export function allocate(batch, orders) {
  const left = {};
  const items = {};
  for (const it of batch.items) {
    left[it.id] = Number.isFinite(it.quota) && it.quota >= 0 ? it.quota : Infinity;
    items[it.id] = { booked: 0, got: 0, wait: 0, left: left[it.id] };
  }
  const lines = {};
  for (const o of activeOrders(orders, batch.id)) {
    for (const l of o.lines) {
      const qty = Math.max(0, Math.floor(Number(l.qty) || 0));
      const room = left[l.itemId] ?? 0;
      const got = Math.min(qty, room);
      lines[l.id] = { got, wait: qty - got };
      if (items[l.itemId]) {
        left[l.itemId] -= got;
        items[l.itemId].booked += qty;
        items[l.itemId].got += got;
        items[l.itemId].wait += qty - got;
        items[l.itemId].left = left[l.itemId];
      }
    }
  }
  return { lines, items };
}

// Money for one order. Only coins that made it into the quota are charged;
// waiting coins are listed so the seller can tell the customer.
export function orderBill(batch, order, alloc) {
  const rows = [];
  for (const it of batch.items) {
    const ls = order.lines.filter((l) => l.itemId === it.id);
    if (!ls.length) continue;
    const got = ls.reduce((s, l) => s + (alloc?.lines[l.id]?.got ?? (Number(l.qty) || 0)), 0);
    const wait = ls.reduce((s, l) => s + (alloc?.lines[l.id]?.wait ?? 0), 0);
    const unit = unitPrice(it, got || wait, order.prices?.[it.id]);
    rows.push({ item: it, got, wait, unit, sum: got * unit });
  }
  const coins = rows.reduce((s, r) => s + r.got, 0);
  const waiting = rows.reduce((s, r) => s + r.wait, 0);
  const subtotal = rows.reduce((s, r) => s + r.sum, 0);
  const shipping = Number(order.shipping) || 0;
  const total = order.status === 'cancelled' ? 0 : subtotal + shipping;
  const paid = Number(order.paid) || 0;
  return { rows, coins, waiting, subtotal, shipping, total, paid, due: Math.max(0, total - paid) };
}

export function batchSummary(batch, orders) {
  const alloc = allocate(batch, orders);
  const list = activeOrders(orders, batch.id);
  let coins = 0; let waiting = 0; let total = 0; let paid = 0; let due = 0;
  const people = new Set();
  for (const o of list) {
    const b = orderBill(batch, o, alloc);
    coins += b.coins; waiting += b.waiting; total += b.total; paid += Math.min(b.paid, b.total); due += b.due;
    for (const l of o.lines) people.add((l.who || o.customer || '').trim());
  }
  return { alloc, orders: list.length, people: people.size, coins, waiting, total, paid, due };
}

// ---------- pasting a list from LINE / Facebook ----------
const UNITS = 'เหรียญ|องค์|ชิ้น|อัน|ตัว|ชุด|อย่าง|ea|pcs';
const QTY_END = new RegExp(`(?:[x×*]\\s*)?(\\d{1,4})\\s*(?:${UNITS})?\\s*$`, 'i');

function matchItem(text, items) {
  const low = text.toLowerCase();
  let best = null;
  for (const it of items) {
    const name = String(it.name ?? '').trim().toLowerCase();
    if (name && low.includes(name) && (!best || name.length > best.name.length)) best = { it, name };
  }
  return best;
}

// One person per line, e.g.
//   1. สมชาย 2            → สมชาย, first/only แบบ, 2 coins
//   สมหญิง เนื้อทองแดง x3  → สมหญิง, แบบ "เนื้อทองแดง", 3 coins
//   ป้าแดง                → ป้าแดง, 1 coin
// Returns { rows: [{ who, itemId, qty, guessed }], skipped: [lines that had nothing usable] }.
export function parsePaste(text, items) {
  const rows = [];
  const skipped = [];
  for (const raw of String(text ?? '').split(/\r?\n/)) {
    let line = toDigits(raw).replace(/\s+/g, ' ').trim();
    if (!line) continue;
    line = line.replace(/^(?:\d{1,3}\s*[.)\-:]|[-•*·])\s*/, '');
    let qty = 1;
    const q = line.match(QTY_END);
    if (q) { qty = Number(q[1]); line = line.slice(0, q.index).trim(); }
    let itemId = items[0]?.id ?? null;
    let guessed = items.length > 1;
    const hit = matchItem(line, items);
    if (hit) {
      itemId = hit.it.id;
      guessed = false;
      const at = line.toLowerCase().indexOf(hit.name);
      line = (line.slice(0, at) + line.slice(at + hit.name.length)).trim();
    }
    const who = line.replace(/^[\s,:\-=]+|[\s,:\-=]+$/g, '');
    if ((!who && !hit) || qty < 1) { skipped.push(raw.trim()); continue; }
    rows.push({ who, itemId, qty, guessed });
  }
  return { rows, skipped };
}

// ---------- text to copy into chat ----------
export const baht = (n) => `${(Number(n) || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })} บาท`;

export function confirmText(batch, order, alloc) {
  const bill = orderBill(batch, order, alloc);
  const name = (id) => batch.items.find((i) => i.id === id)?.name ?? '';
  const many = batch.items.length > 1;
  const out = [`🙏 ยืนยันการจอง ${batch.name}`, `คิวที่ ${order.queue} · ${order.customer}`];
  if (order.status === 'cancelled') out.push('สถานะ: ยกเลิกแล้ว');
  out.push('');
  order.lines.forEach((l, i) => {
    const a = alloc?.lines[l.id];
    const tail = a?.wait ? ` (ได้ ${a.got} · รอคิวสำรอง ${a.wait})` : '';
    out.push(`${i + 1}. ${l.who || order.customer}${many ? ` – ${name(l.itemId)}` : ''} × ${l.qty}${tail}`);
  });
  out.push('');
  for (const r of bill.rows) {
    if (r.got) out.push(`${r.item.name} ${r.got} เหรียญ × ${baht(r.unit)} = ${baht(r.sum)}`);
  }
  if (bill.shipping) out.push(`ค่าส่ง ${baht(bill.shipping)}`);
  out.push(`รวม ${bill.coins} เหรียญ · ${baht(bill.total)}`);
  if (bill.paid) out.push(`ชำระแล้ว ${baht(bill.paid)} · คงเหลือ ${baht(bill.due)}`);
  if (bill.waiting) out.push(`* รอคิวสำรอง ${bill.waiting} เหรียญ ถ้ามีคนยกเลิกจะได้ตามลำดับคิว (ยังไม่คิดเงินส่วนนี้)`);
  return out.join('\n');
}

export function queueText(batch, orders) {
  const alloc = allocate(batch, orders);
  const out = [`📋 คิวจอง ${batch.name}`];
  for (const it of batch.items) {
    const s = alloc.items[it.id];
    const quota = Number.isFinite(it.quota) ? `/${it.quota}` : '';
    out.push(`${it.name}: จองได้ ${s.got}${quota}${s.wait ? ` · สำรอง ${s.wait}` : ''}`);
  }
  out.push('');
  for (const o of activeOrders(orders, batch.id)) {
    const bill = orderBill(batch, o, alloc);
    const people = new Set(o.lines.map((l) => l.who).filter(Boolean)).size;
    const extra = bill.waiting ? ` (+สำรอง ${bill.waiting})` : '';
    const who = people > 1 ? ` (${people} คน)` : '';
    out.push(`${o.queue}. ${o.customer}${who} – ${bill.coins} เหรียญ${extra} · ${STATUSES[o.status].label}`);
  }
  return out.join('\n');
}
