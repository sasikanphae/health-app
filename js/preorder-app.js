// Screens for พรีออเดอร์พระ (preorder.html): batches, the queue of one batch, the
// order form (with "paste a list from LINE"), one order's bill, and backup.
// The rules live in preorder.js; this file only draws them and wires up taps.
import {
  STORAGE_KEY, STATUSES, normalizeStore, parseMoney, parseTiers, tiersText, allocate, orderBill,
  batchSummary, parsePaste, confirmText, queueText,
} from './preorder.js';

const app = document.getElementById('app');
const toastEl = document.getElementById('toast');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => `฿${(Number(n) || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })}`;
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const num = (n) => (Number(n) || 0).toLocaleString('th-TH');

let data = load();
const ui = { view: 'home', batchId: null, orderId: null, filter: 'all', draft: null };

function load() {
  try { return normalizeStore(JSON.parse(localStorage.getItem(STORAGE_KEY))); } catch { return normalizeStore(null); }
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { toast('บันทึกไม่สำเร็จ พื้นที่ในเครื่องอาจเต็ม'); }
}
let toastTimer;
function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
}
async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast('คัดลอกแล้ว วางในแชทได้เลย'); } catch {
    const t = document.createElement('textarea');
    t.value = text; document.body.append(t); t.select();
    document.execCommand('copy'); t.remove(); toast('คัดลอกแล้ว');
  }
}
async function share(text) {
  if (navigator.share) { try { await navigator.share({ text }); return; } catch { /* closed or unsupported */ } }
  copy(text);
}

const batchById = (id) => data.batches.find((b) => b.id === id);
const orderById = (id) => data.orders.find((o) => o.id === id);
const itemName = (b, id) => b.items.find((i) => i.id === id)?.name ?? '—';
function go(view, extra = {}) {
  Object.assign(ui, { view, ...extra });
  render();
  window.scrollTo(0, 0);
}
const top = (title, back) => `<header class="top">
  ${back ? `<button class="icon-btn" data-act="go" data-view="${back}" aria-label="กลับ">←</button>` : ''}
  <h1>${esc(title)}</h1></header>`;
const bar = (got, quota) => {
  if (!Number.isFinite(quota) || quota <= 0) return '';
  const pct = Math.min(100, Math.round((got / quota) * 100));
  return `<div class="bar" role="img" aria-label="จองแล้ว ${got} จาก ${quota}"><span style="width:${pct}%"></span></div>`;
};

// ---------- home: all batches ----------
function renderHome() {
  const cards = data.batches.slice().reverse().map((b) => {
    const s = batchSummary(b, data.orders);
    const quota = b.items.reduce((t, i) => t + (Number.isFinite(i.quota) ? i.quota : 0), 0);
    const unlimited = b.items.some((i) => !Number.isFinite(i.quota));
    return `<button class="card batch-card ${b.status === 'closed' ? 'dim' : ''}" data-act="openBatch" data-id="${b.id}">
      <div class="row between"><strong class="big-name">${esc(b.name)}</strong>
        <span class="tag ${b.status}">${b.status === 'closed' ? 'ปิดจอง' : 'เปิดจอง'}</span></div>
      <div class="stats">
        <div><b>${num(s.orders)}</b><span>คิว</span></div>
        <div><b>${num(s.coins)}${quota && !unlimited ? `<small>/${num(quota)}</small>` : ''}</b><span>เหรียญ</span></div>
        <div><b>${money(s.due)}</b><span>ค้างชำระ</span></div>
      </div>
      ${quota && !unlimited ? bar(s.coins, quota) : ''}
      ${s.waiting ? `<p class="small warn">คิวสำรอง ${num(s.waiting)} เหรียญ</p>` : ''}
    </button>`;
  }).join('');
  return `${top('พรีออเดอร์พระ')}
    <p class="lead">รับจองแต่ละรุ่น เรียงคิวให้เอง ตั้งราคาต่อเหรียญ ลูกค้าสั่งทีละหลายคนก็วางรายชื่อจากแชทได้เลย</p>
    <button class="btn primary big block" data-act="newBatch">+ เพิ่มรุ่นใหม่</button>
    ${cards || '<div class="card empty">ยังไม่มีรุ่นที่เปิดจอง เริ่มจากเพิ่มรุ่นแรกได้เลย</div>'}
    <div class="row wrap foot-tools">
      <button class="btn ghost sm" data-act="export">สำรองข้อมูล</button>
      <label class="btn ghost sm">นำข้อมูลกลับ<input type="file" accept="application/json" data-act="import" hidden></label>
      <a class="btn ghost sm" href="./">กลับแอปเหมียวสมาธิ</a>
    </div>
    <p class="small muted">ข้อมูลเก็บในเครื่องนี้เท่านั้น กด "สำรองข้อมูล" เป็นระยะ เผื่อเปลี่ยนเครื่องหรือล้างเบราว์เซอร์</p>`;
}

// ---------- one batch: stock + queue ----------
function renderBatch() {
  const b = batchById(ui.batchId);
  if (!b) return renderHome();
  const s = batchSummary(b, data.orders);
  const items = b.items.map((it) => {
    const a = s.alloc.items[it.id];
    const quota = Number.isFinite(it.quota) ? it.quota : null;
    const tiers = it.tiers.length ? `<span class="small muted"> · ${it.tiers.map((t) => `${t.min}+ = ${money(t.price)}`).join(' · ')}</span>` : '';
    return `<div class="item-row">
      <div class="row between"><span><b>${esc(it.name)}</b> ${money(it.price)}/เหรียญ${tiers}</span>
        <span class="num">${num(a.got)}${quota !== null ? `/${num(quota)}` : ''}</span></div>
      ${bar(a.got, quota)}
      <div class="small muted">${quota === null ? 'ไม่จำกัดจำนวน' : a.left > 0 ? `เหลือ ${num(a.left)} เหรียญ` : 'เต็มแล้ว'}${a.wait ? ` · <span class="warn">สำรอง ${num(a.wait)}</span>` : ''}</div>
    </div>`;
  }).join('');

  const all = data.orders.filter((o) => o.batchId === b.id).sort((x, y) => x.queue - y.queue);
  const shown = ui.filter === 'all' ? all.filter((o) => o.status !== 'cancelled')
    : ui.filter === 'due' ? all.filter((o) => o.status !== 'cancelled' && orderBill(b, o, s.alloc).due > 0)
    : ui.filter === 'wait' ? all.filter((o) => o.status !== 'cancelled' && orderBill(b, o, s.alloc).waiting > 0)
    : all.filter((o) => o.status === ui.filter);
  const rows = shown.map((o) => {
    const bill = orderBill(b, o, s.alloc);
    const people = new Set(o.lines.map((l) => l.who).filter(Boolean)).size;
    return `<button class="order-row ${o.status}" data-act="openOrder" data-id="${o.id}">
      <span class="q">${o.queue}</span>
      <span class="grow"><b>${esc(o.customer)}</b>${people > 1 ? ` <span class="small muted">${people} คน</span>` : ''}
        <span class="small muted block">${num(bill.coins)} เหรียญ${bill.waiting ? ` <span class="warn">+สำรอง ${bill.waiting}</span>` : ''} · ${money(bill.total)}${bill.due && o.status !== 'cancelled' ? ` · ค้าง ${money(bill.due)}` : ''}</span></span>
      <span class="tag ${o.status}">${STATUSES[o.status].short}</span>
    </button>`;
  }).join('');
  const chip = (k, label) => `<button class="chip" data-act="filter" data-f="${k}" aria-pressed="${ui.filter === k}">${label}</button>`;
  return `${top(b.name, 'home')}
    ${b.note ? `<p class="lead">${esc(b.note)}</p>` : ''}
    ${b.closeOn ? `<p class="small muted">ปิดจอง ${new Date(`${b.closeOn}T00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</p>` : ''}
    <div class="card fill-yellow">
      <div class="stats">
        <div><b>${num(s.orders)}</b><span>คิว · ${num(s.people)} คน</span></div>
        <div><b>${num(s.coins)}</b><span>เหรียญ</span></div>
        <div><b>${money(s.total)}</b><span>ยอดรวม</span></div>
      </div>
      <div class="row between small"><span>รับแล้ว ${money(s.paid)}</span><span>ค้างชำระ <b>${money(s.due)}</b></span></div>
    </div>
    <div class="card">${items || '<p class="muted">ยังไม่มีแบบ กด "แก้รุ่น" เพื่อเพิ่ม</p>'}</div>
    ${b.status === 'closed' ? '<p class="small warn">รุ่นนี้ปิดจองแล้ว ยังเพิ่มออเดอร์ได้ถ้าจำเป็น</p>' : ''}
    <button class="btn primary big block" data-act="newOrder" ${b.items.length ? '' : 'disabled'}>+ รับออเดอร์ (ได้คิวที่ ${b.nextQueue})</button>
    <div class="row wrap gap">
      <button class="btn sm" data-act="copyQueue">คัดลอกรายการคิว</button>
      <button class="btn sm" data-act="editBatch">แก้รุ่น / ราคา</button>
      <button class="btn sm" data-act="toggleClose">${b.status === 'closed' ? 'เปิดจองอีกครั้ง' : 'ปิดจอง'}</button>
    </div>
    <h2>คิวจอง</h2>
    <div class="chips">${chip('all', 'ทั้งหมด')}${chip('due', 'ค้างชำระ')}${chip('wait', 'มีสำรอง')}${chip('booked', 'จอง')}${chip('paid', 'ชำระแล้ว')}${chip('shipped', 'ส่งแล้ว')}${chip('cancelled', 'ยกเลิก')}</div>
    <div class="card list">${rows || '<p class="muted">ยังไม่มีออเดอร์ในกลุ่มนี้</p>'}</div>`;
}

// ---------- batch form ----------
// `typed` redraws the form from values not saved yet (after adding or removing a แบบ).
function renderBatchEdit(typed = null) {
  const b = ui.batchId ? batchById(ui.batchId) : null;
  const v = typed ?? b ?? { name: '', note: '', closeOn: '', items: [{ id: newId(), name: '', price: '', quota: null, tiers: [] }] };
  const used = new Set(b ? data.orders.filter((o) => o.batchId === b.id).flatMap((o) => o.lines.map((l) => l.itemId)) : []);
  const itemRows = v.items.map((it) => `<fieldset class="item-edit" data-item="${it.id}">
      <label><span>ชื่อแบบ / เนื้อ</span><input name="iname" value="${esc(it.name)}" placeholder="เช่น เนื้อทองแดง, เนื้อเงิน" maxlength="40" required></label>
      <div class="two">
        <label><span>ราคาต่อเหรียญ (บาท)</span><input name="iprice" inputmode="decimal" value="${it.price ?? ''}" required placeholder="500"></label>
        <label><span>จำนวนรับจอง</span><input name="iquota" inputmode="numeric" value="${Number.isFinite(it.quota) ? it.quota : ''}" placeholder="ไม่จำกัด"></label>
      </div>
      <label><span>ราคาเมื่อสั่งเยอะ (ไม่ใส่ก็ได้)</span><input name="itiers" value="${esc(tiersText(it.tiers))}" placeholder="เช่น 10:450, 50:400 = 10 เหรียญขึ้นไป 450"></label>
      ${used.has(it.id) ? '<p class="small muted">มีคนจองแบบนี้แล้ว ลบไม่ได้</p>' : `<button type="button" class="btn ghost sm" data-act="delItem" data-id="${it.id}">ลบแบบนี้</button>`}
    </fieldset>`).join('');
  return `${top(b ? 'แก้รุ่น' : 'เพิ่มรุ่นใหม่', b ? 'batch' : 'home')}
    <form class="card form" data-form="batch">
      <label><span>ชื่อรุ่น</span><input name="name" value="${esc(v.name)}" required maxlength="60" placeholder="เช่น เหรียญหลวงพ่อ… รุ่นมหาลาภ"></label>
      <label><span>รายละเอียด (ไม่ใส่ก็ได้)</span><textarea name="note" rows="2" maxlength="300" placeholder="วัด ปีที่สร้าง วันรับของ">${esc(v.note)}</textarea></label>
      <label><span>วันปิดจอง (ไม่ใส่ก็ได้)</span><input type="date" name="closeOn" value="${v.closeOn ?? ''}"></label>
      <h2>แบบที่เปิดจอง</h2>
      ${itemRows}
      <button type="button" class="btn sm" data-act="addItem">+ เพิ่มแบบ</button>
      <button class="btn primary big block">บันทึก</button>
      ${b ? '<button type="button" class="btn danger block" data-act="delBatch">ลบรุ่นนี้และออเดอร์ทั้งหมด</button>' : ''}
    </form>`;
}

function readBatchForm(form) {
  const items = [...form.querySelectorAll('[data-item]')].map((fs) => {
    const q = fs.querySelector('[name=iquota]').value.trim();
    const quota = q === '' ? null : Math.floor(parseMoney(q) ?? 0);
    return {
      id: fs.dataset.item,
      name: fs.querySelector('[name=iname]').value.trim(),
      price: parseMoney(fs.querySelector('[name=iprice]').value) ?? 0,
      quota,
      tiers: parseTiers(fs.querySelector('[name=itiers]').value),
    };
  });
  return {
    name: form.elements.namedItem('name').value.trim(), note: form.note.value.trim(), closeOn: form.closeOn.value || null, items,
  };
}

// ---------- order form ----------
function draftFrom(order, b) {
  if (order) return structuredClone({ ...order, prices: order.prices ?? {} });
  return {
    id: null, batchId: b.id, customer: '', contact: '', note: '', shipping: '', paid: '', prices: {}, status: 'booked',
    lines: [{ id: newId(), who: '', itemId: b.items[0]?.id, qty: 1 }],
  };
}

function renderOrderEdit() {
  const b = batchById(ui.batchId);
  const d = ui.draft;
  const many = b.items.length > 1;
  const opts = (sel) => b.items.map((it) => `<option value="${it.id}" ${it.id === sel ? 'selected' : ''}>${esc(it.name)}</option>`).join('');
  const lines = d.lines.map((l, i) => `<div class="line" data-line="${l.id}">
      <span class="n">${i + 1}</span>
      <input name="who" value="${esc(l.who)}" placeholder="ชื่อคนรับ" maxlength="60" aria-label="ชื่อคนที่ ${i + 1}">
      ${many ? `<select name="item" aria-label="แบบ" class="${l.guessed ? 'guessed' : ''}">${opts(l.itemId)}</select>` : `<input type="hidden" name="item" value="${b.items[0].id}">`}
      <input name="qty" type="number" min="1" max="9999" inputmode="numeric" value="${l.qty}" aria-label="จำนวนเหรียญ">
      <button type="button" class="icon-btn" data-act="delLine" data-id="${l.id}" aria-label="ลบแถว">✕</button>
    </div>`).join('');
  const guessed = d.lines.some((l) => l.guessed);
  const priceRows = b.items.map((it) => `<label class="inline"><span>${esc(it.name)} (ปกติ ${money(it.price)})</span>
      <input name="price-${it.id}" inputmode="decimal" value="${d.prices?.[it.id] ?? ''}" placeholder="ราคาปกติ"></label>`).join('');
  return `${top(d.id ? `แก้ออเดอร์ คิวที่ ${d.queue}` : `ออเดอร์ใหม่ คิวที่ ${b.nextQueue}`, d.id ? 'order' : 'batch')}
    <form class="card form" data-form="order">
      <label><span>ผู้สั่ง</span><input name="customer" value="${esc(d.customer)}" required maxlength="60" placeholder="ชื่อลูกค้า / ชื่อไลน์"></label>
      <label><span>ติดต่อ / ที่อยู่ส่ง (ไม่ใส่ก็ได้)</span><textarea name="contact" rows="2" maxlength="400" placeholder="เบอร์โทร ไลน์ ที่อยู่">${esc(d.contact)}</textarea></label>

      <details class="paste" ${d.lines.length <= 1 && !d.lines[0]?.who ? 'open' : ''}>
        <summary>วางรายชื่อจากแชท (สั่งทีละหลายคน)</summary>
        <p class="small muted">หนึ่งบรรทัดต่อหนึ่งคน เช่น <code>สมชาย 2</code>${many ? ` หรือ <code>สมหญิง ${esc(b.items[1].name)} 3</code>` : ''} ไม่ใส่จำนวน = 1 เหรียญ</p>
        <textarea name="paste" rows="5" placeholder="1. สมชาย 2&#10;2. สมหญิง 3&#10;3. ป้าแดง"></textarea>
        <button type="button" class="btn sm" data-act="paste">ใส่รายชื่อ</button>
      </details>

      <h2>รายชื่อ <span class="small muted">ชื่อว่าง = ของผู้สั่งเอง</span></h2>
      ${guessed ? `<p class="small warn">ช่องสีเหลือง: ข้อความไม่ได้บอกแบบ ใส่เป็น "${esc(b.items[0].name)}" ไว้ก่อน ตรวจอีกที</p>` : ''}
      <div class="lines">${lines}</div>
      <button type="button" class="btn sm" data-act="addLine">+ เพิ่มคน</button>

      <details ${Object.keys(d.prices ?? {}).length ? 'open' : ''}><summary>ราคาพิเศษสำหรับออเดอร์นี้</summary>
        <p class="small muted">ใส่เมื่อตกลงราคากับลูกค้าคนนี้ไว้ต่างจากปกติ (ราคาต่อเหรียญ)</p>${priceRows}</details>
      <div class="two">
        <label><span>ค่าส่ง (บาท)</span><input name="shipping" inputmode="decimal" value="${d.shipping ?? ''}" placeholder="0"></label>
        <label><span>รับเงินแล้ว (บาท)</span><input name="paid" inputmode="decimal" value="${d.paid ?? ''}" placeholder="0"></label>
      </div>
      <label><span>หมายเหตุ</span><input name="note" value="${esc(d.note)}" maxlength="200" placeholder="เช่น ขอเลขสวย รับเองที่วัด"></label>
      <div class="total" id="draft-total"></div>
      <button class="btn primary big block">${d.id ? 'บันทึก' : `บันทึก · ได้คิวที่ ${b.nextQueue}`}</button>
    </form>`;
}

function readDraft(form) {
  const b = batchById(ui.batchId);
  const d = ui.draft;
  d.customer = form.customer.value.trim();
  d.contact = form.contact.value.trim();
  d.note = form.note.value.trim();
  d.shipping = parseMoney(form.shipping.value) ?? '';
  d.paid = parseMoney(form.paid.value) ?? '';
  d.prices = {};
  for (const it of b.items) {
    const p = parseMoney(form[`price-${it.id}`]?.value ?? '');
    if (p !== null && form[`price-${it.id}`].value.trim() !== '') d.prices[it.id] = p;
  }
  const old = new Map(d.lines.map((l) => [l.id, l]));
  d.lines = [...form.querySelectorAll('[data-line]')].map((row) => ({
    id: row.dataset.line,
    who: row.querySelector('[name=who]').value.trim(),
    itemId: row.querySelector('[name=item]').value,
    qty: Math.max(1, Math.floor(Number(row.querySelector('[name=qty]').value) || 1)),
    guessed: old.get(row.dataset.line)?.guessed && old.get(row.dataset.line).itemId === row.querySelector('[name=item]').value,
  }));
  return d;
}

// The total as if this draft were saved now (its queue place decides the quota).
function updateDraftTotal() {
  const el = document.getElementById('draft-total');
  const form = app.querySelector('[data-form=order]');
  if (!el || !form) return;
  const b = batchById(ui.batchId);
  const d = readDraft(form);
  const probe = { ...d, id: d.id ?? '__draft', queue: d.queue ?? b.nextQueue };
  const orders = [...data.orders.filter((o) => o.id !== probe.id), probe];
  const bill = orderBill(b, probe, allocate(b, orders));
  el.innerHTML = `<div class="row between"><span>${num(d.lines.length)} คน · ${num(bill.coins)} เหรียญ</span><b class="num">${money(bill.total)}</b></div>
    ${bill.rows.map((r) => `<div class="small muted">${esc(r.item.name)} ${num(r.got)} × ${money(r.unit)}${r.wait ? ` · <span class="warn">เกินโควต้า ${r.wait} เหรียญ จะเข้าคิวสำรอง</span>` : ''}</div>`).join('')}
    ${bill.paid ? `<div class="small">คงเหลือ ${money(bill.due)}</div>` : ''}`;
}

// ---------- one order ----------
function renderOrder() {
  const o = orderById(ui.orderId);
  if (!o) return renderBatch();
  const b = batchById(o.batchId);
  const alloc = allocate(b, data.orders);
  const bill = orderBill(b, o, alloc);
  const many = b.items.length > 1;
  const lines = o.lines.map((l, i) => {
    const a = alloc.lines[l.id];
    return `<div class="row between line-view"><span>${i + 1}. ${esc(l.who || o.customer)}${many ? ` <span class="small muted">${esc(itemName(b, l.itemId))}</span>` : ''}</span>
      <span class="num">× ${l.qty}${a?.wait ? ` <span class="warn small">(สำรอง ${a.wait})</span>` : ''}</span></div>`;
  }).join('');
  const st = (k) => `<button class="chip" data-act="status" data-s="${k}" aria-pressed="${o.status === k}">${STATUSES[k].label}</button>`;
  return `${top(`คิวที่ ${o.queue} · ${o.customer}`, 'batch')}
    ${o.contact ? `<p class="lead pre">${esc(o.contact)}</p>` : ''}
    <div class="chips">${st('booked')}${st('paid')}${st('shipped')}${st('cancelled')}</div>
    <div class="card">${lines}</div>
    <div class="card fill-yellow">
      ${bill.rows.map((r) => `<div class="row between"><span>${esc(r.item.name)} ${num(r.got)} × ${money(r.unit)}</span><span class="num">${money(r.sum)}</span></div>`).join('')}
      ${bill.shipping ? `<div class="row between"><span>ค่าส่ง</span><span class="num">${money(bill.shipping)}</span></div>` : ''}
      <div class="row between total-line"><b>รวม ${num(bill.coins)} เหรียญ</b><b class="num">${money(bill.total)}</b></div>
      <div class="row between small"><span>รับแล้ว ${money(bill.paid)}</span><span>คงเหลือ <b>${money(bill.due)}</b></span></div>
      ${bill.waiting ? `<p class="small warn">รอคิวสำรอง ${bill.waiting} เหรียญ (ยังไม่คิดเงิน) ถ้าคิวก่อนหน้ายกเลิกจะได้ขึ้นมาเอง</p>` : ''}
    </div>
    ${bill.due > 0 && o.status !== 'cancelled' ? `<button class="btn lotus block" data-act="paidFull">รับเงินครบ ${money(bill.due)}</button>` : ''}
    ${o.note ? `<p class="small">หมายเหตุ: ${esc(o.note)}</p>` : ''}
    <div class="row wrap gap">
      <button class="btn primary sm grow" data-act="shareConfirm">ส่งยืนยันให้ลูกค้า</button>
      <button class="btn sm" data-act="copyConfirm">คัดลอก</button>
      <button class="btn sm" data-act="editOrder">แก้ออเดอร์</button>
    </div>
    <button class="btn ghost sm" data-act="delOrder">ลบออเดอร์นี้ (คิวที่ ${o.queue} จะว่างไว้ ไม่เลื่อนคิวอื่น)</button>`;
}

function render() {
  const views = { home: renderHome, batch: renderBatch, batchEdit: () => renderBatchEdit(), order: renderOrder, orderEdit: renderOrderEdit };
  app.innerHTML = (views[ui.view] ?? renderHome)();
  if (ui.view === 'orderEdit') updateDraftTotal();
}

// ---------- taps ----------
const actions = {
  go: (el) => go(el.dataset.view),
  openBatch: (el) => go('batch', { batchId: el.dataset.id, filter: 'all' }),
  openOrder: (el) => go('order', { orderId: el.dataset.id }),
  filter: (el) => { ui.filter = el.dataset.f; render(); },
  newBatch: () => go('batchEdit', { batchId: null }),
  editBatch: () => go('batchEdit'),
  addItem() {
    const form = app.querySelector('[data-form=batch]');
    const v = readBatchForm(form);
    v.items.push({ id: newId(), name: '', price: '', quota: null, tiers: [] });
    rerenderBatchForm(v);
  },
  delItem(el) {
    const form = app.querySelector('[data-form=batch]');
    const v = readBatchForm(form);
    if (v.items.length <= 1) { toast('ต้องมีอย่างน้อย 1 แบบ'); return; }
    v.items = v.items.filter((i) => i.id !== el.dataset.id);
    rerenderBatchForm(v);
  },
  delBatch() {
    const b = batchById(ui.batchId);
    if (!confirm(`ลบ "${b.name}" และออเดอร์ทั้งหมดของรุ่นนี้? กู้คืนไม่ได้`)) return;
    data.batches = data.batches.filter((x) => x.id !== b.id);
    data.orders = data.orders.filter((o) => o.batchId !== b.id);
    save(); go('home');
  },
  toggleClose() {
    const b = batchById(ui.batchId);
    b.status = b.status === 'closed' ? 'open' : 'closed';
    save(); render();
  },
  copyQueue: () => copy(queueText(batchById(ui.batchId), data.orders)),
  newOrder() {
    const b = batchById(ui.batchId);
    go('orderEdit', { draft: draftFrom(null, b) });
  },
  editOrder() {
    const o = orderById(ui.orderId);
    go('orderEdit', { draft: draftFrom(o, batchById(o.batchId)) });
  },
  addLine() {
    const form = app.querySelector('[data-form=order]');
    const d = readDraft(form);
    const last = d.lines.at(-1);
    d.lines.push({ id: newId(), who: '', itemId: last?.itemId ?? batchById(ui.batchId).items[0].id, qty: 1 });
    rerenderOrderForm(`[data-line="${d.lines.at(-1).id}"] [name=who]`);
  },
  delLine(el) {
    const form = app.querySelector('[data-form=order]');
    const d = readDraft(form);
    d.lines = d.lines.filter((l) => l.id !== el.dataset.id);
    if (!d.lines.length) d.lines.push({ id: newId(), who: '', itemId: batchById(ui.batchId).items[0].id, qty: 1 });
    rerenderOrderForm();
  },
  paste() {
    const form = app.querySelector('[data-form=order]');
    const text = form.paste.value;
    const d = readDraft(form);
    const { rows, skipped } = parsePaste(text, batchById(ui.batchId).items);
    if (!rows.length) { toast('ไม่เจอรายชื่อในข้อความ ลองหนึ่งบรรทัดต่อหนึ่งคน'); return; }
    // Replace the single empty starter row instead of keeping it above the list.
    d.lines = d.lines.filter((l) => l.who || d.lines.length > 1);
    d.lines.push(...rows.map((r) => ({ id: newId(), ...r })));
    rerenderOrderForm();
    const coins = rows.reduce((s, r) => s + r.qty, 0);
    toast(`ใส่ ${rows.length} คน ${coins} เหรียญ${skipped.length ? ` · ข้าม ${skipped.length} บรรทัด` : ''}`);
  },
  status(el) {
    const o = orderById(ui.orderId);
    const s = el.dataset.s;
    if (s === 'cancelled' && o.status !== 'cancelled' && !confirm(`ยกเลิกคิวที่ ${o.queue}? เหรียญจะถูกส่งต่อให้คิวสำรองถัดไป`)) return;
    o.status = s;
    save(); render();
  },
  paidFull() {
    const o = orderById(ui.orderId);
    const b = batchById(o.batchId);
    const bill = orderBill(b, o, allocate(b, data.orders));
    o.paid = bill.total;
    if (o.status === 'booked') o.status = 'paid';
    save(); render(); toast('บันทึกรับเงินแล้ว');
  },
  copyConfirm() {
    const o = orderById(ui.orderId);
    const b = batchById(o.batchId);
    copy(confirmText(b, o, allocate(b, data.orders)));
  },
  shareConfirm() {
    const o = orderById(ui.orderId);
    const b = batchById(o.batchId);
    share(confirmText(b, o, allocate(b, data.orders)));
  },
  delOrder() {
    const o = orderById(ui.orderId);
    if (!confirm(`ลบออเดอร์คิวที่ ${o.queue} ของ ${o.customer}? (ถ้าลูกค้าแค่ยกเลิก ใช้ปุ่ม "ยกเลิก" ดีกว่า จะเก็บประวัติไว้)`)) return;
    data.orders = data.orders.filter((x) => x.id !== o.id);
    save(); go('batch');
  },
  export() {
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `preorder-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
};

function rerenderBatchForm(v) {
  app.innerHTML = renderBatchEdit(v);
}
function rerenderOrderForm(focus) {
  const pasteOpen = app.querySelector('details.paste')?.open;
  app.innerHTML = renderOrderEdit();
  if (pasteOpen === false) app.querySelector('details.paste').open = false;
  updateDraftTotal();
  if (focus) app.querySelector(focus)?.focus();
}

app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.tagName === 'INPUT') return;
  const fn = actions[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el); }
});
app.addEventListener('input', (e) => {
  if (e.target.closest('[data-form=order]') && e.target.name !== 'paste') updateDraftTotal();
});
app.addEventListener('change', async (e) => {
  if (e.target.dataset.act !== 'import') return;
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const next = normalizeStore(JSON.parse(await file.text()));
    if (!confirm(`นำข้อมูลกลับ ${next.batches.length} รุ่น ${next.orders.length} ออเดอร์? ข้อมูลในเครื่องตอนนี้จะถูกแทนที่`)) return;
    data = next; save(); go('home'); toast('นำข้อมูลกลับแล้ว');
  } catch { toast('ไฟล์นี้อ่านไม่ได้'); }
});
app.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  if (form.dataset.form === 'batch') {
    const v = readBatchForm(form);
    v.items = v.items.filter((i) => i.name);
    if (!v.items.length) { toast('ใส่ชื่อแบบอย่างน้อย 1 แบบ'); return; }
    let b = ui.batchId ? batchById(ui.batchId) : null;
    if (b) Object.assign(b, v);
    else {
      b = { id: newId(), ...v, status: 'open', nextQueue: 1, createdAt: Date.now() };
      data.batches.push(b);
    }
    save(); go('batch', { batchId: b.id }); toast('บันทึกรุ่นแล้ว');
  } else if (form.dataset.form === 'order') {
    const b = batchById(ui.batchId);
    const d = readDraft(form);
    if (!d.customer) { toast('ใส่ชื่อผู้สั่งก่อน'); return; }
    const lines = d.lines.map(({ guessed, ...l }) => l);
    const clean = { ...d, lines, shipping: d.shipping === '' ? 0 : d.shipping, paid: d.paid === '' ? 0 : d.paid };
    delete clean.paste;
    if (d.id) {
      Object.assign(orderById(d.id), clean);
      save(); go('order', { orderId: d.id }); toast('บันทึกแล้ว');
    } else {
      const o = { ...clean, id: newId(), queue: b.nextQueue, at: Date.now() };
      b.nextQueue += 1;
      data.orders.push(o);
      save(); go('order', { orderId: o.id }); toast(`ได้คิวที่ ${o.queue}`);
    }
  }
});

render();
