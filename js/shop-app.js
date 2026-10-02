// Customer page for รับกดพระ (shop.html): the รุ่น the seller presses CF for,
// a request form per รุ่น (coins + offered fee per coin), "please go press
// another รุ่น", and the customer's own requests with their status.
// Tickets ({ id, token }) stay in this browser so only this customer sees them.
import { STATUS, baht, parseNum, orderMoney, lineName, lineKey, api } from './shop.js';

const app = document.getElementById('app');
const toastEl = document.getElementById('toast');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KEY = 'shop:v1';

const local = (() => {
  try { return { me: { customer: '', contact: '' }, tickets: [], ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return { me: { customer: '', contact: '' }, tickets: [] }; }
})();
const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(local)); } catch { /* private mode: tickets last for this visit */ } };

const ui = { batches: null, mine: [], error: '', sending: false };
let toastTimer;
function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
}
const when = (s) => {
  if (!s) return '';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

async function load() {
  try {
    const [b, m] = await Promise.all([
      api('/shop/batches'),
      local.tickets.length ? api('/shop/mine', { method: 'POST', body: { tickets: local.tickets } }) : { orders: [] },
    ]);
    ui.batches = b.batches;
    ui.mine = m.orders.sort((x, y) => y.created - x.created);
    ui.error = '';
  } catch {
    ui.error = 'ต่อร้านไม่ได้ตอนนี้ ลองใหม่อีกครั้ง';
    ui.batches ??= [];
  }
  render();
}

function meCard() {
  return `<section class="card">
    <h2 class="flush">ข้อมูลของคุณ</h2>
    <div class="two">
      <label><span>ชื่อ / ชื่อไลน์</span><input id="me-customer" data-me="customer" value="${esc(local.me.customer)}" maxlength="80" placeholder="เช่น พี่หนึ่ง" autocomplete="name"></label>
      <label><span>ติดต่อกลับ</span><input id="me-contact" data-me="contact" value="${esc(local.me.contact)}" maxlength="200" placeholder="ไลน์ไอดี / เบอร์" autocomplete="tel"></label>
    </div>
    <p class="small muted">ใช้กับทุกคำขอ ร้านจะติดต่อกลับทางนี้</p>
  </section>`;
}

function batchCard(b) {
  const rows = b.items.map((it) => `<div class="pick" data-item="${it.id}">
      <div class="pick-name"><b>${esc(it.name)}</b>
        <span class="small muted">${it.price ? `ราคาพระ ${baht(it.price)}/องค์` : ''}${it.fee != null ? `${it.price ? ' · ' : ''}ค่ากดแนะนำ ${baht(it.fee)}/องค์` : ''}</span></div>
      <label><span>จำนวน (องค์)</span><input id="q-${b.id}-${it.id}" name="qty" type="number" min="0" max="9999" inputmode="numeric" placeholder="0"></label>
      <label><span>ค่ากดที่ให้/องค์</span><input id="f-${b.id}-${it.id}" name="fee" inputmode="decimal" value="${it.fee ?? ''}" placeholder="บาท"></label>
    </div>`).join('');
  return `<form class="card batch" data-form="order" data-batch="${b.id}">
    <div class="row between wrap"><h2 class="flush">${esc(b.name)}</h2>${b.queued ? `<span class="tag">จองแล้ว ${b.queued} คิว</span>` : ''}</div>
    ${b.releaseAt ? `<p class="small"><b>วันกด:</b> ${esc(when(b.releaseAt))}</p>` : ''}
    ${b.note ? `<p class="small muted pre">${esc(b.note)}</p>` : ''}
    <div class="picks">${rows}</div>
    <label><span>หมายเหตุ (ไม่ใส่ก็ได้)</span><textarea id="n-${b.id}" name="note" rows="2" maxlength="1000" placeholder="เช่น รายชื่อคนรับ ขอเลขสวย"></textarea></label>
    <div class="total" data-total></div>
    <button class="btn primary big block" ${ui.sending ? 'disabled' : ''}>ส่งคำขอกดรุ่นนี้</button>
  </form>`;
}

function wishCard() {
  return `<form class="card" data-form="wish">
    <h2 class="flush">ขอให้ไปกดรุ่นอื่น</h2>
    <p class="small muted">รุ่นที่ไม่มีในรายการ บอกชื่อรุ่นหรือแปะลิงก์โพสต์ ร้านจะตอบกลับว่ารับไหม</p>
    <label><span>รุ่นอะไร / ลิงก์</span><input id="w-name" name="wish" maxlength="200" required placeholder="เช่น เหรียญหลวงพ่อ… รุ่นแรก วัด…"></label>
    <div class="two">
      <label><span>จำนวน (องค์)</span><input id="w-qty" name="qty" type="number" min="1" max="9999" inputmode="numeric" required placeholder="1"></label>
      <label><span>ค่ากดที่ให้/องค์</span><input id="w-fee" name="fee" inputmode="decimal" required placeholder="บาท"></label>
    </div>
    <label><span>หมายเหตุ (ไม่ใส่ก็ได้)</span><textarea id="w-note" name="note" rows="2" maxlength="1000" placeholder="เช่น เนื้อไหน วันเวลาที่เปิดกด"></textarea></label>
    <button class="btn block" ${ui.sending ? 'disabled' : ''}>ส่งคำขอ</button>
  </form>`;
}

function mineCard() {
  if (!ui.mine.length) return '';
  const rows = ui.mine.map((o) => {
    const m = orderMoney(o, o.items);
    const lines = o.lines.map((l, i) => `<li>${esc(lineName(l, o.items, o))} × ${l.qty} · ค่ากด ${baht(l.fee)}/องค์${o.status === 'got' && o.got ? ` → <b>ได้ ${o.got[lineKey(l, i)] ?? 0}</b>` : ''}</li>`).join('');
    return `<div class="mine ${o.status}">
      <div class="row between wrap"><b>${esc(o.batchName ?? `ขอให้ไปกด: ${o.wish}`)}</b><span class="tag ${o.status}">${STATUS[o.status]?.short ?? o.status}</span></div>
      <div class="small muted">${STATUS[o.status]?.label ?? ''}${o.queue ? ` · คิวที่ ${o.queue}` : ''} · ส่งเมื่อ ${new Date(o.created).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
      <ul>${lines}</ul>
      <div class="small">${o.status === 'got' ? 'ที่ต้องจ่าย' : 'ประมาณ'}: ${m.price ? `ค่าพระ ${baht(m.price)} + ` : ''}ค่ากด ${baht(m.fee)}${m.price ? ` = <b>${baht(m.total)}</b>` : ''}</div>
      ${o.reply ? `<p class="reply pre">ร้าน: ${esc(o.reply)}</p>` : ''}
      ${o.status === 'pending' ? `<button class="btn ghost sm" data-act="cancel" data-id="${o.id}">ยกเลิกคำขอนี้</button>` : ''}
    </div>`;
  }).join('');
  return `<section class="card" id="mine">
    <div class="row between"><h2 class="flush">คำขอของฉัน</h2><button class="btn sm" data-act="refresh">อัปเดต</button></div>
    ${rows}
  </section>`;
}

function render() {
  if (ui.batches === null) { app.innerHTML = '<p class="lead">กำลังโหลดรุ่นที่เปิดรับกด…</p>'; return; }
  const batches = ui.batches.map(batchCard).join('');
  app.innerHTML = `<header class="top"><h1>รับกดพระ</h1></header>
    <p class="lead">เลือกรุ่นที่อยากให้กด ใส่จำนวนองค์และค่ากดที่ให้ต่อองค์ แล้วกดส่ง ร้านจะยืนยันกลับ คิวเรียงตามเวลาที่ส่ง</p>
    ${ui.error ? `<p class="card warn-card">${esc(ui.error)} <button class="btn sm" data-act="refresh">ลองใหม่</button></p>` : ''}
    ${mineCard()}
    ${meCard()}
    <h2>รุ่นที่เปิดรับกด</h2>
    ${batches || '<div class="card empty">ตอนนี้ยังไม่มีรุ่นที่เปิดรับ ส่งคำขอให้ไปกดรุ่นที่อยากได้ด้านล่างได้เลย</div>'}
    ${wishCard()}`;
  for (const f of app.querySelectorAll('[data-form=order]')) updateTotal(f);
}

function readLines(form) {
  const b = ui.batches.find((x) => x.id === form.dataset.batch);
  return [...form.querySelectorAll('[data-item]')].map((row) => ({
    itemId: row.dataset.item,
    qty: Math.floor(parseNum(row.querySelector('[name=qty]').value) ?? 0),
    fee: parseNum(row.querySelector('[name=fee]').value) ?? 0,
    price: b.items.find((i) => i.id === row.dataset.item)?.price ?? 0,
  })).filter((l) => l.qty > 0);
}
function updateTotal(form) {
  const el = form.querySelector('[data-total]');
  const lines = readLines(form);
  if (!lines.length) { el.innerHTML = ''; return; }
  const coins = lines.reduce((s, l) => s + l.qty, 0);
  const price = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const fee = lines.reduce((s, l) => s + l.qty * l.fee, 0);
  el.innerHTML = `<div class="row between"><span>${coins} องค์</span><b class="num">${baht(price + fee)}</b></div>
    <div class="small muted">${price ? `ค่าพระ ${baht(price)} + ` : ''}ค่ากด ${baht(fee)} (จ่ายตามที่กดได้จริง)</div>`;
}

function needMe() {
  if (local.me.customer.trim()) return false;
  toast('ใส่ชื่อของคุณก่อนส่ง');
  document.getElementById('me-customer')?.focus();
  return true;
}

async function send(body) {
  ui.sending = true;
  try {
    const r = await api('/shop/orders', { method: 'POST', body: { ...body, customer: local.me.customer, contact: local.me.contact } });
    local.tickets.push({ id: r.id, token: r.token });
    keep();
    toast(`ส่งแล้ว ได้คิวที่ ${r.queue} รอร้านยืนยัน`);
    ui.sending = false;
    await load();
    document.getElementById('mine')?.scrollIntoView({ behavior: 'smooth' });
  } catch (e) {
    ui.sending = false;
    toast(e.message || 'ส่งไม่สำเร็จ ลองใหม่อีกครั้ง');
    render();
  }
}

app.addEventListener('input', (e) => {
  const f = e.target.closest('[data-form=order]');
  if (f) updateTotal(f);
  const k = e.target.dataset.me;
  if (k) { local.me[k] = e.target.value; keep(); }
});
app.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  if (ui.sending || needMe()) return;
  if (form.dataset.form === 'order') {
    const lines = readLines(form).map(({ price, ...l }) => l);
    if (!lines.length) { toast('ใส่จำนวนอย่างน้อย 1 องค์'); return; }
    send({ batchId: form.dataset.batch, lines, note: form.note.value });
  } else if (form.dataset.form === 'wish') {
    const qty = Math.floor(parseNum(form.qty.value) ?? 0);
    if (qty < 1) { toast('ใส่จำนวนอย่างน้อย 1 องค์'); return; }
    send({ wish: form.wish.value, lines: [{ qty, fee: parseNum(form.fee.value) ?? 0 }], note: form.note.value });
  }
});
app.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  if (el.dataset.act === 'refresh') { load(); return; }
  if (el.dataset.act === 'cancel') {
    if (el.dataset.sure !== '1') { el.dataset.sure = '1'; el.textContent = 'แตะอีกครั้งเพื่อยืนยันยกเลิก'; return; }
    const t = local.tickets.find((x) => x.id === el.dataset.id);
    try {
      await api('/shop/cancel', { method: 'POST', body: t });
      toast('ยกเลิกแล้ว');
    } catch (err) { toast(err.message); }
    load();
  }
});
// Statuses change on the seller's side: look again now and then while the page is open.
// Skipped while the customer is typing an order, so nothing they entered is lost.
const typing = () => app.contains(document.activeElement)
  || [...app.querySelectorAll('form [name=qty], form [name=wish], form [name=note]')].some((i) => i.value.trim());
setInterval(() => {
  if (document.visibilityState === 'visible' && !typing()) load();
}, 60_000);

render();
load();
