// Seller page for รับกดพระ (shop-admin.html): the requests coming in per รุ่น,
// in queue order (or highest fee first), accept / decline, then mark how many
// coins the CF got; and the รุ่น list customers see.
// The seller password (SHOP_ADMIN_KEY on the Worker) stays in this browser.
import {
  SERVER, STATUS, baht, parseNum, orderMoney, lineName, lineKey, replyText, batchRollup, queueNumbers, api,
} from './shop.js';

const app = document.getElementById('app');
const toastEl = document.getElementById('toast');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const KEY = 'shop-admin:v1';

const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY)) ?? {}; } catch { return {}; } })();
const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { /* the key lasts for this visit */ } };
const server = () => saved.server || SERVER;

const ui = { tab: 'orders', batch: null, filter: 'open', sort: 'queue', data: null, error: '', edit: null, gotFor: null, sure: null };
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
    t.value = text; document.body.append(t); t.select(); document.execCommand('copy'); t.remove(); toast('คัดลอกแล้ว');
  }
}
const call = (path, opts = {}) => api(path, { ...opts, key: saved.key, server: server() });
const when = (s) => {
  if (!s) return '';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};
const ago = (ms) => new Date(ms).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

async function load() {
  if (!saved.key) { render(); return; }
  try {
    ui.data = await call('/shop/admin');
    ui.error = '';
  } catch (e) {
    if (e.status === 401) { delete saved.key; keep(); toast('รหัสร้านไม่ถูกต้อง'); }
    ui.error = e.message || 'ต่อเซิร์ฟเวอร์ไม่ได้';
  }
  render();
}

// ---------- login ----------
function renderLogin() {
  return `<header class="top"><h1>หน้าร้าน รับกดพระ</h1></header>
    <form class="card form" data-form="login">
      <label><span>รหัสร้าน</span><input id="login-key" name="key" type="password" required autocomplete="current-password" placeholder="รหัสที่ตั้งไว้ในเซิร์ฟเวอร์ (SHOP_ADMIN_KEY)"></label>
      <details><summary>ที่อยู่เซิร์ฟเวอร์</summary>
        <label><span>เปลี่ยนเมื่อใช้เซิร์ฟเวอร์อื่น</span><input id="login-server" name="server" value="${esc(server())}"></label></details>
      <button class="btn primary big block">เข้าหน้าร้าน</button>
      ${ui.error ? `<p class="small warn">${esc(ui.error)}</p>` : ''}
    </form>
    <p class="small muted">ยังไม่ได้ตั้งรหัส? ดูวิธีใน server/README.md หัวข้อ "รับกดพระ"</p>`;
}

// ---------- requests ----------
function orderCard(o, batch, q) {
  const items = batch?.items ?? [];
  const m = orderMoney(o, items);
  const lines = o.lines.map((l, i) => `<li>${esc(lineName(l, items, o))}${l.who ? ` <span class="muted">(${esc(l.who)})</span>` : ''}
      × <b>${l.qty}</b> · ค่ากด <b>${baht(l.fee)}</b>/องค์${o.status === 'got' && o.got ? ` → ได้ <b>${o.got[lineKey(l, i)] ?? 0}</b>` : ''}</li>`).join('');
  const editing = ui.gotFor === o.id;
  const acts = {
    pending: `<button class="btn primary sm" data-act="set" data-s="accepted" data-id="${o.id}">รับงาน</button>
      <button class="btn sm" data-act="set" data-s="declined" data-id="${o.id}">ไม่รับ</button>`,
    accepted: `<button class="btn lotus sm" data-act="gotOpen" data-id="${o.id}">กดได้</button>
      <button class="btn sm" data-act="set" data-s="missed" data-id="${o.id}">กดไม่ทัน</button>`,
    got: `<button class="btn sm" data-act="gotOpen" data-id="${o.id}">แก้จำนวนที่ได้</button>`,
    missed: `<button class="btn sm" data-act="set" data-s="accepted" data-id="${o.id}">กลับเป็นรับงาน</button>`,
    declined: `<button class="btn sm" data-act="set" data-s="pending" data-id="${o.id}">กลับเป็นรอยืนยัน</button>`,
    cancelled: '',
  }[o.status] ?? '';
  const gotForm = editing ? `<form class="got-form" data-form="got" data-id="${o.id}">
      ${o.lines.map((l, i) => `<label class="inline-num"><span>${esc(lineName(l, items, o))} (ขอ ${l.qty})</span>
        <input id="got-${o.id}-${i}" name="${esc(lineKey(l, i))}" type="number" min="0" max="9999" inputmode="numeric" value="${o.got?.[lineKey(l, i)] ?? l.qty}"></label>`).join('')}
      <label><span>ข้อความถึงลูกค้า (ไม่ใส่ก็ได้)</span><input id="reply-${o.id}" name="reply" maxlength="1000" value="${esc(o.reply)}" placeholder="เช่น โอนได้ที่ … ส่งของวันที่ …"></label>
      <div class="row"><button class="btn primary sm grow">บันทึกว่ากดได้</button><button type="button" class="btn ghost sm" data-act="gotClose">ปิด</button></div>
    </form>` : '';
  return `<article class="order ${o.status}">
    <div class="row">
      <span class="q">${q ?? '–'}</span>
      <div class="grow"><b>${esc(o.customer)}</b>${o.contact ? ` <button class="link small" data-act="copyContact" data-id="${o.id}">${esc(o.contact)}</button>` : ''}
        <div class="small muted">${ago(o.created)}${o.wish ? ` · ขอรุ่น: <b>${esc(o.wish)}</b>` : ''}</div></div>
      <span class="tag ${o.status}">${STATUS[o.status]?.short ?? o.status}</span>
    </div>
    <ul>${lines}</ul>
    <div class="small">${m.price ? `ค่าพระ ${baht(m.price)} · ` : ''}ค่ากดรวม <b>${baht(m.fee)}</b>${m.price ? ` · รวม ${baht(m.total)}` : ''}${o.status === 'got' ? '' : ` (ถ้ากดได้ครบ ${m.wanted} องค์)`}</div>
    ${o.note ? `<p class="small pre note">📝 ${esc(o.note)}</p>` : ''}
    ${o.reply && !editing ? `<p class="small reply pre">ตอบไว้: ${esc(o.reply)}</p>` : ''}
    ${gotForm}
    <div class="row wrap acts">${acts}
      <button class="btn sm" data-act="copyReply" data-id="${o.id}">คัดลอกข้อความ</button>
      <button class="btn ghost sm" data-act="del" data-id="${o.id}">${ui.sure === `del:${o.id}` ? 'แตะอีกครั้งเพื่อลบ' : 'ลบ'}</button>
    </div>
  </article>`;
}

function renderOrders() {
  const { batches, orders } = ui.data;
  const q = queueNumbers(orders);
  const live = (o) => o.status !== 'declined' && o.status !== 'cancelled';
  const pendingOf = (pred) => orders.filter((o) => pred(o) && o.status === 'pending').length;
  const shownBatches = batches.filter((b) => b.status === 'open' || orders.some((o) => o.batchId === b.id && live(o)));
  if (!ui.batch || (ui.batch !== '__wish' && ui.batch !== '__all' && !batches.some((b) => b.id === ui.batch))) ui.batch = '__all';
  const chip = (id, label, n) => `<button class="chip" data-act="pickBatch" data-id="${id}" aria-pressed="${ui.batch === id}">${esc(label)}${n ? ` <span class="dot">${n}</span>` : ''}</button>`;
  const batchChips = [chip('__all', 'ทุกรุ่น', pendingOf(() => true)),
    ...shownBatches.map((b) => chip(b.id, b.name, pendingOf((o) => o.batchId === b.id))),
    chip('__wish', 'ขอรุ่นอื่น', pendingOf((o) => !o.batchId))].join('');
  const byBatch = orders.filter((o) => ui.batch === '__all' || (ui.batch === '__wish' ? !o.batchId : o.batchId === ui.batch));
  const byStatus = byBatch.filter((o) => ({
    open: live(o) && o.status !== 'got' && o.status !== 'missed',
    pending: o.status === 'pending',
    done: o.status === 'got' || o.status === 'missed',
    off: !live(o),
  }[ui.filter]));
  const feeOf = (o) => Math.max(0, ...o.lines.map((l) => Number(l.fee) || 0));
  const list = [...byStatus].sort(ui.sort === 'fee' ? (a, b) => feeOf(b) - feeOf(a) || a.created - b.created : (a, b) => a.created - b.created);
  const batchById = (id) => batches.find((b) => b.id === id);
  const sel = batchById(ui.batch);
  const roll = sel ? batchRollup(sel, orders) : null;
  const rollCard = roll ? `<div class="card fill-yellow">
      <div class="row between wrap"><b>${esc(sel.name)}</b><span class="small">${roll.count} คิว${sel.releaseAt ? ` · กด ${esc(when(sel.releaseAt))}` : ''}</span></div>
      ${roll.items.map((r) => `<div class="row between small roll"><span>${esc(r.item.name)}: ขอรวม <b>${r.qty}</b> องค์</span>
        <span>ค่ากดรวม <b>${baht(r.fee)}</b>${r.qty ? ` · เฉลี่ย ${baht(Math.round(r.fee / r.qty))}/องค์ · สูงสุด ${baht(r.maxFee)}` : ''}</span></div>`).join('')}
      <button class="btn sm gap-top" data-act="copySummary">คัดลอกสรุปคิวรุ่นนี้</button>
    </div>` : '';
  const f = (k, label) => `<button class="chip sm" data-act="filter" data-f="${k}" aria-pressed="${ui.filter === k}">${label}</button>`;
  return `<div class="chips scroll">${batchChips}</div>
    ${rollCard}
    <div class="row between wrap">
      <div class="chips">${f('open', 'ต้องทำ')}${f('pending', 'รอยืนยัน')}${f('done', 'เสร็จแล้ว')}${f('off', 'ยกเลิก/ไม่รับ')}</div>
      <button class="chip sm" data-act="sort">${ui.sort === 'fee' ? 'เรียง: ค่ากดสูงสุด' : 'เรียง: ตามคิว'}</button>
    </div>
    <div class="orders">${list.map((o) => orderCard(o, batchById(o.batchId), q[o.id])).join('') || '<div class="card empty">ไม่มีคำขอในกลุ่มนี้</div>'}</div>`;
}

// ---------- batches ----------
function renderBatches() {
  const { batches, orders } = ui.data;
  if (ui.edit) return renderBatchForm();
  const link = new URL('shop.html', location.href).href;
  const cards = batches.slice().reverse().map((b) => {
    const r = batchRollup(b, orders);
    return `<div class="card ${b.status === 'closed' ? 'dim' : ''}">
      <div class="row between wrap"><b class="big-name">${esc(b.name)}</b><span class="tag ${b.status}">${b.status === 'open' ? 'เปิดรับ' : 'ปิดรับ'}</span></div>
      ${b.releaseAt ? `<div class="small">วันกด ${esc(when(b.releaseAt))}</div>` : ''}
      <div class="small muted">${b.items.map((i) => `${esc(i.name)} ${baht(i.price)}${i.fee != null ? ` · ค่ากดแนะนำ ${baht(i.fee)}` : ''}`).join('<br>')}</div>
      <div class="small">${r.count} คิว · ขอรวม ${r.items.reduce((s, x) => s + x.qty, 0)} องค์</div>
      <div class="row wrap acts">
        <button class="btn sm" data-act="editBatch" data-id="${b.id}">แก้</button>
        <button class="btn sm" data-act="toggleBatch" data-id="${b.id}">${b.status === 'open' ? 'ปิดรับ' : 'เปิดรับอีกครั้ง'}</button>
        <button class="btn ghost sm" data-act="delBatch" data-id="${b.id}">${ui.sure === `delBatch:${b.id}` ? 'แตะอีกครั้งเพื่อลบ' : 'ลบ'}</button>
      </div>
    </div>`;
  }).join('');
  return `<button class="btn primary big block" data-act="newBatch">+ เพิ่มรุ่นที่รับกด</button>
    <div class="card"><b>ลิงก์หน้าลูกค้า</b><p class="small muted break">${esc(link)}</p>
      <button class="btn sm" data-act="copyLink">คัดลอกลิงก์ไปแปะในไลน์</button></div>
    ${cards || '<div class="card empty">ยังไม่มีรุ่น เพิ่มรุ่นแรกที่จะรับกดได้เลย</div>'}`;
}

function renderBatchForm() {
  const v = ui.edit;
  const rows = v.items.map((it) => `<fieldset class="item-edit" data-item="${it.id}">
      <label><span>แบบ / เนื้อ</span><input id="in-${it.id}" name="iname" value="${esc(it.name)}" maxlength="80" placeholder="เช่น เนื้อทองแดง"></label>
      <div class="two">
        <label><span>ราคาพระ/องค์</span><input id="ip-${it.id}" name="iprice" inputmode="decimal" value="${it.price ?? ''}" placeholder="บาท"></label>
        <label><span>ค่ากดแนะนำ/องค์</span><input id="if-${it.id}" name="ifee" inputmode="decimal" value="${it.fee ?? ''}" placeholder="ไม่ใส่ก็ได้"></label>
      </div>
      <button type="button" class="btn ghost sm" data-act="delItem" data-id="${it.id}">ลบแบบนี้</button>
    </fieldset>`).join('');
  return `<form class="card form" data-form="batch">
      <h2 class="flush">${v.isNew ? 'เพิ่มรุ่นที่รับกด' : 'แก้รุ่น'}</h2>
      <label><span>ชื่อรุ่น</span><input id="b-name" name="name" required maxlength="120" value="${esc(v.name)}" placeholder="เช่น เหรียญหลวงพ่อ… รุ่นมหาลาภ"></label>
      <label><span>วันเวลาที่เปิดกด</span><input id="b-release" name="releaseAt" type="datetime-local" value="${esc(v.releaseAt)}"></label>
      <label><span>รายละเอียดถึงลูกค้า</span><textarea id="b-note" name="note" rows="3" maxlength="1000" placeholder="เช่น วัด… กดผ่านเพจ… ส่งของประมาณ…">${esc(v.note)}</textarea></label>
      <h2>แบบที่รับกด</h2>
      ${rows}
      <button type="button" class="btn sm" data-act="addItem">+ เพิ่มแบบ</button>
      <label class="check"><input id="b-open" type="checkbox" name="open" ${v.status !== 'closed' ? 'checked' : ''}> เปิดให้ลูกค้าเห็นและส่งคำขอ</label>
      <button class="btn primary big block">บันทึก</button>
      <button type="button" class="btn ghost block" data-act="cancelEdit">ยกเลิก</button>
    </form>`;
}

function readBatchForm(form) {
  return {
    ...ui.edit,
    name: form.elements.namedItem('name').value.trim(),
    releaseAt: form.releaseAt.value,
    note: form.note.value.trim(),
    status: form.open.checked ? 'open' : 'closed',
    items: [...form.querySelectorAll('[data-item]')].map((fs) => ({
      id: fs.dataset.item,
      name: fs.querySelector('[name=iname]').value.trim(),
      price: parseNum(fs.querySelector('[name=iprice]').value) ?? 0,
      fee: fs.querySelector('[name=ifee]').value.trim() === '' ? null : parseNum(fs.querySelector('[name=ifee]').value),
    })),
  };
}

function render() {
  if (!saved.key) { app.innerHTML = renderLogin(); return; }
  if (!ui.data) {
    app.innerHTML = `<header class="top"><h1>หน้าร้าน</h1></header><p class="lead">${ui.error ? `${esc(ui.error)} <button class="btn sm" data-act="refresh">ลองใหม่</button>` : 'กำลังโหลด…'}</p>`;
    return;
  }
  const pending = ui.data.orders.filter((o) => o.status === 'pending').length;
  const tab = (k, label) => `<button role="tab" class="tab" data-act="tab" data-tab="${k}" aria-selected="${ui.tab === k}">${label}</button>`;
  app.innerHTML = `<header class="top between"><h1>หน้าร้าน</h1><button class="btn sm" data-act="refresh">อัปเดต</button></header>
    ${ui.error ? `<p class="small warn">${esc(ui.error)}</p>` : ''}
    <div class="tabs" role="tablist">${tab('orders', `คำขอ${pending ? ` (${pending} ใหม่)` : ''}`)}${tab('batches', 'รุ่นที่รับกด')}</div>
    ${ui.tab === 'orders' ? renderOrders() : renderBatches()}
    <div class="row wrap foot-tools"><button class="btn ghost sm" data-act="logout">ออกจากหน้าร้าน</button><a class="btn ghost sm" href="shop.html">ดูหน้าลูกค้า</a></div>`;
}

// ---------- actions ----------
const orderById = (id) => ui.data.orders.find((o) => o.id === id);
const batchById = (id) => ui.data.batches.find((b) => b.id === id);
async function save(path, body, method = 'POST', done = 'บันทึกแล้ว') {
  try { await call(path, { method, body }); toast(done); } catch (e) { toast(e.message); }
  await load();
}

const actions = {
  refresh: () => load(),
  tab: (el) => { ui.tab = el.dataset.tab; ui.edit = null; render(); },
  pickBatch: (el) => { ui.batch = el.dataset.id; render(); },
  filter: (el) => { ui.filter = el.dataset.f; render(); },
  sort: () => { ui.sort = ui.sort === 'fee' ? 'queue' : 'fee'; render(); },
  set: (el) => save(`/shop/admin/orders/${el.dataset.id}`, { status: el.dataset.s }, 'POST', STATUS[el.dataset.s].short),
  gotOpen: (el) => { ui.gotFor = el.dataset.id; render(); app.querySelector('[data-form=got] input')?.focus(); },
  gotClose: () => { ui.gotFor = null; render(); },
  copyContact: (el) => copy(orderById(el.dataset.id).contact),
  copyReply(el) {
    const o = orderById(el.dataset.id);
    copy(replyText(o, batchById(o.batchId), queueNumbers(ui.data.orders)[o.id]));
  },
  copySummary() {
    const b = batchById(ui.batch);
    const q = queueNumbers(ui.data.orders);
    const rows = ui.data.orders.filter((o) => o.batchId === b.id && q[o.id]).sort((x, y) => q[x.id] - q[y.id])
      .map((o) => `${q[o.id]}. ${o.customer} – ${o.lines.map((l) => `${lineName(l, b.items, o)} ${l.qty}`).join(', ')} · ${STATUS[o.status].short}`);
    copy([`📋 คิวกด ${b.name}`, ...rows].join('\n'));
  },
  async del(el) {
    if (ui.sure !== `del:${el.dataset.id}`) { ui.sure = `del:${el.dataset.id}`; render(); return; }
    ui.sure = null;
    await save(`/shop/admin/orders/${el.dataset.id}`, null, 'DELETE', 'ลบแล้ว');
  },
  newBatch: () => { ui.edit = { id: newId(), isNew: true, name: '', note: '', releaseAt: '', status: 'open', items: [{ id: newId(), name: '', price: '', fee: null }] }; render(); },
  editBatch: (el) => { ui.edit = structuredClone(batchById(el.dataset.id)); render(); },
  cancelEdit: () => { ui.edit = null; render(); },
  addItem() {
    ui.edit = readBatchForm(app.querySelector('[data-form=batch]'));
    ui.edit.items.push({ id: newId(), name: '', price: '', fee: null });
    render();
  },
  delItem(el) {
    ui.edit = readBatchForm(app.querySelector('[data-form=batch]'));
    ui.edit.items = ui.edit.items.filter((i) => i.id !== el.dataset.id);
    render();
  },
  toggleBatch(el) {
    const b = batchById(el.dataset.id);
    save(`/shop/admin/batches/${b.id}`, { ...b, status: b.status === 'open' ? 'closed' : 'open' }, 'PUT', b.status === 'open' ? 'ปิดรับแล้ว' : 'เปิดรับแล้ว');
  },
  async delBatch(el) {
    if (ui.sure !== `delBatch:${el.dataset.id}`) { ui.sure = `delBatch:${el.dataset.id}`; render(); return; }
    ui.sure = null;
    await save(`/shop/admin/batches/${el.dataset.id}`, null, 'DELETE', 'ลบรุ่นแล้ว (คำขอเดิมยังอยู่)');
  },
  copyLink: () => copy(new URL('shop.html', location.href).href),
  logout: () => { delete saved.key; keep(); ui.data = null; render(); },
};

app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = actions[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el); }
});
app.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  if (form.dataset.form === 'login') {
    saved.key = form.key.value.trim();
    if (form.server?.value.trim()) saved.server = form.server.value.trim();
    keep();
    load();
  } else if (form.dataset.form === 'got') {
    const o = orderById(form.dataset.id);
    const got = {};
    o.lines.forEach((l, i) => { got[lineKey(l, i)] = Math.floor(parseNum(form.elements.namedItem(lineKey(l, i)).value) ?? 0); });
    ui.gotFor = null;
    const none = Object.values(got).every((n) => n === 0);
    await save(`/shop/admin/orders/${o.id}`, { status: none ? 'missed' : 'got', got, reply: form.reply.value }, 'POST', none ? 'บันทึกว่ากดไม่ทัน' : 'บันทึกว่ากดได้');
  } else if (form.dataset.form === 'batch') {
    const v = readBatchForm(form);
    v.items = v.items.filter((i) => i.name);
    if (!v.name) { toast('ใส่ชื่อรุ่น'); return; }
    if (!v.items.length) { toast('ใส่แบบอย่างน้อย 1 แบบ'); return; }
    ui.edit = null;
    await save(`/shop/admin/batches/${v.id}`, v, 'PUT', 'บันทึกรุ่นแล้ว');
  }
});
// New requests arrive while the page is open: look again every 30 seconds, unless the seller is typing.
setInterval(() => {
  if (document.visibilityState === 'visible' && saved.key && !ui.edit && !ui.gotFor && !app.contains(document.activeElement)) load();
}, 30_000);

render();
load();
