// รับกดพระ: shared rules for the customer page (shop.html) and the seller page
// (shop-admin.html). The data lives on the Worker (server/src/shop.js).
// Pure functions only — tested in tests/shop.test.js.
import { PUSH_SERVER } from './push-config.js';

export const SERVER = PUSH_SERVER;

export const STATUS = {
  pending: { label: 'รอร้านยืนยัน', short: 'รอยืนยัน' },
  accepted: { label: 'ร้านรับงานแล้ว รอวันกด', short: 'รับงานแล้ว' },
  got: { label: 'กดได้แล้ว', short: 'กดได้' },
  missed: { label: 'กดไม่ทัน', short: 'กดไม่ทัน' },
  declined: { label: 'ร้านไม่รับงานนี้', short: 'ไม่รับ' },
  cancelled: { label: 'ยกเลิกแล้ว', short: 'ยกเลิก' },
};

export const baht = (n) => `${(Number(n) || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })} บาท`;
export const toDigits = (s) => String(s ?? '').replace(/[๐-๙]/g, (d) => String('๐๑๒๓๔๕๖๗๘๙'.indexOf(d))).replace(/,/g, '');
export function parseNum(s) {
  const n = Number.parseFloat(toDigits(s).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export const itemOf = (items, id) => (items ?? []).find((i) => i.id === id) ?? null;
export const lineKey = (l, i) => l.itemId ?? `wish${i}`;
export const lineName = (l, items, order) => (l.itemId ? itemOf(items, l.itemId)?.name ?? 'แบบที่ถูกลบ' : order?.wish ?? 'รุ่นที่ขอ');

// Money for one request. Before the CF: what was asked (qty × price, qty × fee).
// After "กดได้": only the coins actually obtained count.
export function orderMoney(order, items) {
  const done = order.status === 'got' && order.got;
  let coins = 0; let price = 0; let fee = 0; let wanted = 0;
  order.lines.forEach((l, i) => {
    const n = done ? Number(order.got[lineKey(l, i)] ?? 0) : Number(l.qty) || 0;
    const unit = l.itemId ? Number(itemOf(items, l.itemId)?.price) || 0 : 0;
    wanted += Number(l.qty) || 0;
    coins += n;
    price += n * unit;
    fee += n * (Number(l.fee) || 0);
  });
  return { wanted, coins, price, fee, total: price + fee };
}

// What the seller sends back in chat.
export function replyText(order, batch, queue) {
  const items = batch?.items ?? [];
  const m = orderMoney(order, items);
  const out = [`🙏 ${batch?.name ?? `ขอให้ไปกด: ${order.wish}`}`, `${order.customer}${queue ? ` · คิวที่ ${queue}` : ''}`, `สถานะ: ${STATUS[order.status]?.label ?? order.status}`, ''];
  order.lines.forEach((l, i) => {
    const got = order.status === 'got' && order.got ? ` → ได้ ${order.got[lineKey(l, i)] ?? 0}` : '';
    out.push(`• ${lineName(l, items, order)}${l.who ? ` (${l.who})` : ''} × ${l.qty} องค์ · ค่ากด ${baht(l.fee)}/องค์${got}`);
  });
  out.push('');
  if (m.price) out.push(`ค่าพระ ${baht(m.price)}`);
  out.push(`ค่ากด ${baht(m.fee)}`);
  if (m.price) out.push(`รวม ${baht(m.total)}`);
  if (order.reply) out.push('', order.reply);
  return out.join('\n');
}

// Per-batch roll-up for the seller: coins wanted and fees offered per แบบ.
export function batchRollup(batch, orders) {
  const per = {};
  for (const it of batch.items) per[it.id] = { item: it, qty: 0, fee: 0, orders: 0, maxFee: 0 };
  let count = 0;
  for (const o of orders) {
    if (o.batchId !== batch.id || o.status === 'declined' || o.status === 'cancelled') continue;
    count++;
    for (const l of o.lines) {
      const p = per[l.itemId];
      if (!p) continue;
      p.qty += Number(l.qty) || 0;
      p.fee += (Number(l.qty) || 0) * (Number(l.fee) || 0);
      p.orders++;
      p.maxFee = Math.max(p.maxFee, Number(l.fee) || 0);
    }
  }
  return { count, items: Object.values(per) };
}

// Queue numbers as the server counts them: active requests per batch, oldest first.
export function queueNumbers(orders) {
  const out = {};
  const seen = {};
  for (const o of [...orders].sort((a, b) => a.created - b.created || (a.id < b.id ? -1 : 1))) {
    if (o.status === 'declined' || o.status === 'cancelled') continue;
    const k = o.batchId ?? '__wish';
    seen[k] = (seen[k] ?? 0) + 1;
    out[o.id] = seen[k];
  }
  return out;
}

export async function api(path, { method = 'GET', body, key, server = SERVER } = {}) {
  const res = await fetch(`${server.replace(/\/$/, '')}${path}`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(key ? { Authorization: `Bearer ${key}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `เซิร์ฟเวอร์ตอบ ${res.status}`), { status: res.status });
  return data;
}
