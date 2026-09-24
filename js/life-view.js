// Screens for the everyday helper: the "ธุระ" tab, the leave-the-house,
// to-do/appointment and bill sheets, the quick-note panel, and the life items
// that join today's timeline and the reminder cards. The data rules live in
// life.js; this file only draws them and wires up taps.
import { icon } from './icons.js';
import { mascot } from './art.js';
import { addDays, parseKey } from './health.js';
import {
  EVENT_KINDS, APPT_TYPES, DEFAULT_LEAD, EXPENSE_CATS, HEALTH_CATS, eventsOn, upcomingAppointments,
  billCycle, monthOf, addMonths, daysBetween, expenseSummary, parseAmount, combinedShopping,
} from './life.js';

const baht = (n) => `฿${n.toLocaleString('th-TH', { maximumFractionDigits: 2 })}`;
const LEADS = [[0, 'ตรงเวลา'], [15, '15 นาที'], [30, '30 นาที'], [60, '1 ชั่วโมง'], [120, '2 ชั่วโมง']];
const BILL_LEADS = [1, 3, 5, 7];
const BILL_NAMES = ['ค่าไฟ', 'ค่าน้ำ', 'ค่าเน็ต', 'ค่าโทรศัพท์', 'บัตรเครดิต', 'ค่าเช่า', 'ประกัน'];

export function createLife(ctx) {
  const { state, ui, esc } = ctx;
  ui.lifeTab ??= 'plan';
  const $ = (sel) => document.querySelector(sel);
  const today = () => ctx.todayKey();
  const shortDate = (key) => parseKey(key).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' });
  function dayLabel(key) {
    const d = daysBetween(today(), key);
    if (d === 0) return 'วันนี้';
    if (d === 1) return 'พรุ่งนี้';
    if (d === -1) return 'เมื่อวาน';
    return shortDate(key);
  }
  const when = (e) => `${dayLabel(e.date)}${e.time ? ` ${e.time} น.` : ''}`;
  const eventById = (id) => state.events.find((e) => e.id === id);
  const billById = (id) => state.bills.find((b) => b.id === id);
  const changed = () => {
    ctx.save();
    ctx.render();
    ctx.renderSheet();
  };

  // ---------- leave-the-house checklists ----------
  // The gym bag keeps living in state.checklist / day.prep (the workout screen uses it too).
  const leaveLists = () => [{ id: 'gym', name: 'ไปยิม', icon: 'dumbbell', items: state.checklist, fixed: true }, ...state.leaveLists];
  const listById = (id) => leaveLists().find((l) => l.id === id) ?? leaveLists()[0];
  const ticksOf = (day, id) => (id === 'gym' ? day.prep : day.leave?.[id] ?? []);
  function setTicks(id, ids) {
    const day = ctx.editDay(today());
    if (id === 'gym') day.prep = ids;
    else (day.leave ??= {})[id] = ids;
  }
  // A health appointment today suggests "ไปหาหมอ"; otherwise the last one used.
  function suggestedLeave() {
    const appt = eventsOn(state.events, today()).find((e) => e.kind === 'appt' && !e.done && APPT_TYPES[e.apptType]?.leave);
    if (appt && leaveLists().some((l) => l.id === APPT_TYPES[appt.apptType].leave)) return APPT_TYPES[appt.apptType].leave;
    return leaveLists().some((l) => l.id === state.settings.lastLeave) ? state.settings.lastLeave : leaveLists()[0].id;
  }

  function renderLeave(s) {
    const list = listById(s.id);
    const ticks = ticksOf(ctx.getDay(today()), list.id);
    const n = list.items.filter((i) => ticks.includes(i.id)).length;
    const all = n > 0 && n === list.items.length;
    const chips = leaveLists().map((l) => `<button class="chip" data-act="leavePick" data-id="${l.id}" aria-pressed="${l.id === list.id}">
      ${icon(l.icon ?? 'door', { size: 18 })}${esc(l.name)}</button>`).join('');
    const rows = list.items.map((i) => {
      const on = ticks.includes(i.id);
      return `<div class="check-row"><button class="check" role="checkbox" aria-checked="${on}" data-act="leaveTick" data-list="${list.id}" data-id="${i.id}">
        <span class="box">${on ? '✓' : ''}</span><span class="label">${esc(i.text)}</span></button>
        <button class="icon-btn" data-act="leaveItemDel" data-list="${list.id}" data-id="${i.id}" aria-label="ลบ ${esc(i.text)}">${icon('x', { size: 16 })}</button></div>`;
    }).join('');
    return `${ctx.sheetTop('ออกจากบ้าน')}
      <div class="sheet-mascot">${mascot(all ? 'bright' : 'normal', { size: 84 })}</div>
      <div class="question">${all ? 'ของครบแล้ว เดินทางปลอดภัยนะ' : 'จะไปไหนดี?'}</div>
      <div class="chips">${chips}
        <button class="chip" data-act="leaveAdding" aria-pressed="${!!s.adding}">${icon('plus', { size: 18 })}ปลายทางใหม่</button></div>
      ${s.adding ? `<form class="row gap-top" data-form="leaveNew">
        <input type="text" name="name" placeholder="เช่น ไปเที่ยว ไปตลาด ไปรับลูก" required maxlength="30" autocomplete="off">
        <button class="btn primary sm">สร้าง</button></form>` : ''}
      <div class="card gap-top">
        <div class="row between"><h2 class="flush">${esc(list.name)}</h2><span class="muted small">${n}/${list.items.length}</span></div>
        ${rows || '<p class="muted">ยังไม่มีของในลิสต์นี้ เพิ่มด้านล่างได้เลย</p>'}
        <form class="row gap-top" data-form="leaveItemAdd" data-list="${list.id}">
          <input type="text" name="text" placeholder="เพิ่มของที่ต้องพก" required maxlength="60" autocomplete="off">
          <button class="btn soft sm">เพิ่ม</button></form>
      </div>
      <div class="row wrap">
        ${n ? `<button class="btn ghost sm" data-act="leaveReset" data-id="${list.id}">เริ่มติ๊กใหม่</button>` : ''}
        ${list.fixed ? '' : `<button class="btn ghost sm" data-act="leaveDel" data-id="${list.id}">ลบปลายทางนี้</button>`}
      </div>
      <div class="sheet-foot"><button class="btn ${all ? 'primary' : 'soft'} big block" data-act="back">${all ? 'ออกเดินทาง' : 'ปิด'}</button></div>`;
  }

  // ---------- to-dos and appointments ----------
  function renderEvent(s) {
    const e = s.id ? eventById(s.id) : null;
    const v = e ?? { kind: s.kind ?? 'personal', title: '', date: s.date ?? today(), time: '', apptType: 'doctor' };
    const lead = e?.remind === false ? 'off' : String(e?.lead ?? DEFAULT_LEAD[v.kind]);
    const radio = (name, val, label, checked, ic = '') => `<label class="chip">${ic ? icon(ic, { size: 18 }) : ''}
      <input type="radio" name="${name}" value="${val}" ${checked ? 'checked' : ''}>${label}</label>`;
    return `${ctx.sheetTop(e ? 'แก้รายการ' : 'เพิ่มรายการ')}
      <form class="form-stack" data-form="eventSave" data-id="${e?.id ?? ''}">
        <div class="chips" role="radiogroup" aria-label="ประเภท">${Object.entries(EVENT_KINDS).map(([k, x]) =>
          radio('kind', k, x.label, v.kind === k, x.icon)).join('')}</div>
        <label><span class="field-label">เรื่องอะไร</span>
          <input type="text" name="title" required maxlength="80" value="${esc(v.title)}" placeholder="เช่น ส่งงาน ประชุมทีม ไปรับพัสดุ" autocomplete="off"></label>
        <div class="appt-only"><div class="field-label">นัดเรื่อง</div>
          <div class="chips">${Object.entries(APPT_TYPES).map(([k, x]) => radio('apptType', k, x.label, (v.apptType ?? 'other') === k)).join('')}</div></div>
        <div class="form-grid two">
          <label><span class="small muted">วันที่</span><input type="date" name="date" value="${v.date}" required></label>
          <label><span class="small muted">เวลา (ไม่ใส่ก็ได้)</span><input type="time" name="time" value="${v.time ?? ''}"></label>
        </div>
        <label><span class="small muted">เตือนก่อนเวลา</span>
          <select name="lead">${LEADS.map(([m, l]) => `<option value="${m}" ${lead === String(m) ? 'selected' : ''}>${l}</option>`).join('')}
            <option value="off" ${lead === 'off' ? 'selected' : ''}>ไม่ต้องเตือน</option></select></label>
        <p class="small muted appt-only">นัดหมายจะเตือนตอนหนึ่งทุ่มของคืนก่อนวันนัดด้วย ถ้าไม่ใส่เวลาจะเตือนตอน 8 โมงเช้าของวันนัด</p>
        <div class="sheet-foot">
          <button class="btn primary big block">บันทึก</button>
          ${e ? `<button type="button" class="btn ghost block" data-act="eventDel" data-id="${e.id}">ลบรายการนี้</button>` : ''}
        </div>
      </form>`;
  }

  // ---------- bills ----------
  function renderBill(s) {
    const b = s.id ? billById(s.id) : null;
    const v = b ?? { title: '', day: '', amount: '', lead: 3 };
    return `${ctx.sheetTop(b ? 'แก้บิล' : 'เพิ่มบิลประจำเดือน')}
      <form class="form-stack" data-form="billSave" data-id="${b?.id ?? ''}">
        <label><span class="field-label">บิลอะไร</span>
          <input type="text" name="title" list="bill-names" required maxlength="40" value="${esc(v.title)}" placeholder="เช่น ค่าไฟ ค่าเน็ต บัตรเครดิต" autocomplete="off"></label>
        <datalist id="bill-names">${BILL_NAMES.map((n) => `<option value="${n}">`).join('')}</datalist>
        <div class="form-grid two">
          <label><span class="small muted">จ่ายทุกวันที่</span><input type="number" name="day" inputmode="numeric" min="1" max="31" required value="${v.day}" placeholder="1–31"></label>
          <label><span class="small muted">ประมาณ (บาท)</span><input type="text" name="amount" inputmode="decimal" value="${v.amount ?? ''}" placeholder="ไม่ใส่ก็ได้"></label>
        </div>
        <label><span class="small muted">เตือนล่วงหน้า</span>
          <select name="lead">${BILL_LEADS.map((d) => `<option value="${d}" ${Number(v.lead) === d ? 'selected' : ''}>${d} วัน</option>`).join('')}</select></label>
        <p class="small muted">เตือนตอน 9 โมงเช้าทุกวันจนกว่าจะกด "จ่ายแล้ว" · ถ้าใส่จำนวนเงินไว้ ตอนกดจ่ายแล้วจะจดเป็นรายจ่ายให้ด้วย</p>
        <div class="sheet-foot">
          <button class="btn primary big block">บันทึก</button>
          ${b ? `<button type="button" class="btn ghost block" data-act="billDel" data-id="${b.id}">ลบบิลนี้</button>` : ''}
        </div>
      </form>`;
  }

  function billStatusText(c) {
    if (c.paid) return `จ่ายแล้ว · รอบหน้า ${shortDate(c.next)}`;
    if (c.status === 'overdue') return `ยังไม่ได้จ่าย (ผ่านมา ${-c.daysLeft} วัน) จ่ายตอนสะดวกได้เลย`;
    if (c.status === 'today') return 'ครบกำหนดวันนี้';
    return `อีก ${c.daysLeft} วัน · ${shortDate(c.due)}`;
  }

  function payBill(id) {
    const b = billById(id);
    const c = billCycle(b, today());
    if (c.paid) return;
    b.paid[c.ym] = today();
    let exp = null;
    if (b.amount) {
      exp = { id: ctx.newId(), date: today(), cat: 'bill', amount: b.amount, at: Date.now(), note: b.title };
      state.expenses.push(exp);
    }
    ctx.sfx.knock();
    changed();
    ctx.toast(exp ? `จ่าย${b.title}แล้ว · จดรายจ่าย ${baht(b.amount)} ให้ด้วย` : `จ่าย${b.title}แล้ว`, () => {
      delete b.paid[c.ym];
      if (exp) state.expenses = state.expenses.filter((x) => x.id !== exp.id);
      changed();
    });
  }

  function toggleEvent(id) {
    const e = eventById(id);
    e.done = !e.done;
    e.doneAt = e.done ? Date.now() : null;
    if (e.done) ctx.sfx.knock();
    changed();
  }

  // ---------- the ธุระ tab ----------
  const listRow = ({ ic, title, sub, act, id, side = '', alert = false }) => `<div class="list-row${alert ? ' due' : ''}">
    <span class="lr-ic">${icon(ic)}</span>
    <button class="plain grow" data-act="${act}" data-id="${id}"><span class="lr-title">${title}</span><span class="small muted">${sub}</span></button>
    ${side}</div>`;

  function planPane() {
    const t = today();
    const appts = upcomingAppointments(state.events, t);
    const tasks = state.events
      .filter((e) => e.kind !== 'appt' && !e.done && e.date >= addDays(t, -7))
      .sort((a, b) => `${a.date}${a.time ?? ''}`.localeCompare(`${b.date}${b.time ?? ''}`));
    const bills = state.bills.map((b) => ({ b, c: billCycle(b, t) }))
      .sort((x, y) => (x.c.paid - y.c.paid) || x.c.due.localeCompare(y.c.due));
    return `
      <div class="card">
        <h2>ออกจากบ้าน</h2>
        <p class="small muted">เลือกปลายทาง แล้วเช็กของก่อนออก</p>
        <div class="chips">${leaveLists().map((l) => `<button class="chip" data-act="leaveOpen" data-id="${l.id}">${icon(l.icon ?? 'door', { size: 18 })}${esc(l.name)}</button>`).join('')}</div>
      </div>
      <div class="card">
        <div class="row between"><h2 class="flush">นัดหมาย</h2><button class="btn ghost sm" data-act="eventNew" data-kind="appt">${icon('plus', { size: 18 })}เพิ่ม</button></div>
        ${appts.length ? appts.slice(0, 10).map((e) => listRow({
          ic: 'calendar', title: esc(e.title), act: 'eventEdit', id: e.id, alert: e.date === t,
          sub: `${when(e)} · ${APPT_TYPES[e.apptType]?.label ?? 'นัดหมาย'}`,
        })).join('') : '<p class="muted small">ยังไม่มีนัด หาหมอ ตรวจสุขภาพ ฉีดวัคซีน จดไว้ที่นี่ได้เลย</p>'}
      </div>
      <div class="card">
        <div class="row between"><h2 class="flush">งานและธุระ</h2><button class="btn ghost sm" data-act="eventNew" data-kind="work">${icon('plus', { size: 18 })}เพิ่ม</button></div>
        ${tasks.length ? tasks.slice(0, 12).map((e) => listRow({
          ic: EVENT_KINDS[e.kind]?.icon ?? 'list', title: esc(e.title), act: 'eventEdit', id: e.id, alert: e.date < t,
          sub: `${e.date < t ? `ยกมาจาก${dayLabel(e.date)} · ทำเมื่อพร้อม` : when(e)} · ${EVENT_KINDS[e.kind]?.label ?? ''}`,
          side: `<button class="tick" role="checkbox" aria-checked="false" aria-label="ทำแล้ว" data-act="evTick" data-id="${e.id}">✓</button>`,
        })).join('') : '<p class="muted small">ไม่มีอะไรรออยู่ สบายใจได้</p>'}
      </div>
      <div class="card">
        <div class="row between"><h2 class="flush">บิลประจำเดือน</h2><button class="btn ghost sm" data-act="billNew">${icon('plus', { size: 18 })}เพิ่ม</button></div>
        ${bills.length ? bills.map(({ b, c }) => listRow({
          ic: 'receipt', title: esc(b.title), act: 'billEdit', id: b.id, alert: c.status === 'overdue' || c.status === 'today',
          sub: `ทุกวันที่ ${b.day}${b.amount ? ` · ~${baht(b.amount)}` : ''} · ${billStatusText(c)}`,
          side: c.paid ? `<span class="muted">${icon('check', { size: 18 })}</span>` : `<button class="btn soft sm" data-act="billPaid" data-id="${b.id}">จ่ายแล้ว</button>`,
        })).join('') : '<p class="muted small">ค่าไฟ ค่าเน็ต บัตรเครดิต ใส่ไว้ แมวจะเตือนก่อนถึงวันจ่าย</p>'}
      </div>`;
  }

  function moneyPane() {
    const t = today();
    const sel = ui.expCat;
    const grid = Object.entries(EXPENSE_CATS).map(([k, c]) => `<button class="cat" data-act="expCat" data-cat="${k}" aria-pressed="${sel === k}">
      ${icon(c.icon)}<span>${c.label}</span></button>`).join('');
    const todays = state.expenses.filter((x) => x.date === t).sort((a, b) => b.at - a.at);
    const ym = ui.expMonth ?? monthOf(t);
    const sum = expenseSummary(state.expenses, ym);
    const [y, m] = ym.split('-').map(Number);
    const monthLabel = new Date(y, m - 1, 1).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
    const max = Math.max(1, ...sum.byCat.map((s) => s.amount));
    const bar = (s) => `<div class="bar-row">
      <span class="bar-label">${icon(EXPENSE_CATS[s.cat]?.icon ?? 'coin', { size: 18 })}${EXPENSE_CATS[s.cat]?.label ?? s.cat}</span>
      <span class="bar-val">${baht(s.amount)}</span>
      <div class="bar" aria-hidden="true"><i style="width:${(s.amount / max) * 100}%"></i></div></div>`;
    const healthRows = HEALTH_CATS.map((k) => {
      const s = sum.health.byCat.find((x) => x.cat === k);
      return `<div class="row between hl-row"><span>${icon(EXPENSE_CATS[k].icon, { size: 18 })} ${EXPENSE_CATS[k].label}</span><span>${s ? baht(s.amount) : '—'}</span></div>`;
    }).join('');
    const share = sum.total ? Math.round((sum.health.total / sum.total) * 100) : 0;
    return `
      <div class="card">
        <h2>จดรายจ่าย</h2>
        <p class="small muted">แตะหมวด แล้วใส่จำนวนเงิน แค่นั้นเอง</p>
        <div class="cat-grid">${grid}</div>
        ${sel ? `<form class="row gap-top" data-form="expense">
          <input type="text" name="amount" inputmode="decimal" placeholder="${EXPENSE_CATS[sel].label} กี่บาท?" required autocomplete="off" aria-label="จำนวนเงิน">
          <button class="btn primary">บันทึก</button></form>` : ''}
        ${todays.length ? `<h3>วันนี้ · ${baht(todays.reduce((a, x) => a + x.amount, 0))}</h3>
          ${todays.map((x) => `<div class="row exp-row"><span class="muted">${icon(EXPENSE_CATS[x.cat]?.icon ?? 'coin', { size: 18 })}</span>
            <span class="grow">${EXPENSE_CATS[x.cat]?.label ?? x.cat}${x.note ? ` <span class="muted small">${esc(x.note)}</span>` : ''}</span><b>${baht(x.amount)}</b>
            <button class="icon-btn" data-act="expDel" data-id="${x.id}" aria-label="ลบรายการนี้">${icon('x', { size: 16 })}</button></div>`).join('')}` : ''}
      </div>
      <div class="card">
        <div class="row between">
          <button class="icon-btn" data-act="expMonth" data-n="-1" aria-label="เดือนก่อน">${icon('back', { size: 18 })}</button>
          <h2 class="flush">${monthLabel}</h2>
          <button class="icon-btn" data-act="expMonth" data-n="1" aria-label="เดือนถัดไป" ${ym >= monthOf(t) ? 'disabled' : ''}>${icon('next', { size: 18 })}</button>
        </div>
        <div class="center money-total"><div class="stat-value">${baht(sum.total)}</div><div class="small muted">${sum.count} รายการ</div></div>
        ${sum.byCat.length ? sum.byCat.map(bar).join('') : '<p class="muted small center">เดือนนี้ยังไม่ได้จด</p>'}
      </div>
      <div class="card">
        <h2>${icon('heart', { size: 20 })} ค่าใช้จ่ายด้านสุขภาพ</h2>
        <div class="row between"><span class="stat-value">${baht(sum.health.total)}</span>
          <span class="small muted">${sum.total ? `${share}% ของทั้งเดือน` : ''}</span></div>
        ${healthRows}
        <p class="small muted">ลงทุนกับสุขภาพ ไม่ใช่ค่าใช้จ่ายเปล่าๆ นะเหมียว</p>
      </div>`;
  }

  function shopPane() {
    const { items, ws } = ctx.planShopping();
    const list = combinedShopping({ planItems: items, planTicked: state.shopping[ws] ?? [], custom: state.shopList });
    const left = list.filter((i) => !i.done).length;
    const row = (i) => `<div class="check-row"><button class="check" role="checkbox" aria-checked="${i.done}" data-act="shopItem" data-key="${esc(i.key)}">
      <span class="box">${i.done ? '✓' : ''}</span><span class="label">${esc(i.name)}</span>
      <span class="count muted small">${i.from === 'plan' ? `แผนอาหาร${i.staple ? ' · ติดครัว' : ''}` : 'ของใช้'}</span></button>
      ${i.from === 'home' ? `<button class="icon-btn" data-act="shopDel" data-id="${i.id}" aria-label="ลบ ${esc(i.name)}">${icon('x', { size: 16 })}</button>` : ''}</div>`;
    return `
      <div class="card">
        <div class="row between"><h2 class="flush">ของที่ต้องซื้อ</h2><span class="muted small">เหลือ ${left} อย่าง</span></div>
        <p class="small muted">รวมของจากแผนอาหาร (ถึงสิ้นสัปดาห์) กับของใช้ในบ้านไว้ที่เดียว</p>
        <form class="row" data-form="shopAdd">
          <input type="text" name="text" placeholder="เพิ่มของใช้ เช่น ทิชชู่ น้ำยาล้างจาน" required maxlength="60" autocomplete="off">
          <button class="btn soft sm">เพิ่ม</button></form>
        <div class="gap-top">${list.length ? list.map(row).join('') : '<p class="muted">ไม่มีอะไรต้องซื้อ</p>'}</div>
        ${state.shopList.some((c) => c.done) ? '<button class="btn ghost sm" data-act="shopClear">ล้างของใช้ที่ซื้อแล้ว</button>' : ''}
      </div>`;
  }

  // Everything thrown into "โยนไว้ก่อน" (with its category, fixable) and the ideas/notes.
  function notesPane() {
    const notes = [...state.notes].sort((a, b) => b.at - a.at);
    const log = ctx.inboxPane();
    if (!notes.length && !log) {
      return `<div class="empty">${mascot('normal', { size: 96 })}
        <p class="muted">ยังไม่มีอะไรเลย พิมพ์หรือพูดใส่ช่อง "โยนไว้ก่อน" หรือแตะปุ่มดินสอมุมขวาล่าง ได้จากทุกหน้า</p>
        <button class="btn soft" data-act="noteOpen">${icon('pen', { size: 18 })}โยนไว้ก่อน</button></div>`;
    }
    return `${log}
      ${notes.length ? `<h3>ไอเดียและโน้ต</h3>${notes.map((n) => `<div class="card note-card">
        <button class="plain grow" data-act="noteEdit" data-id="${n.id}">
          <span class="note-text">${esc(n.text)}</span>
          <span class="small muted">${dayLabel(ctx.dateKeyOf(n.at))} ${new Date(n.at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span></button>
        <button class="icon-btn" data-act="noteDel" data-id="${n.id}" aria-label="ลบโน้ต">${icon('x', { size: 16 })}</button></div>`).join('')}` : ''}`;
  }

  function renderLife() {
    const tabs = [['plan', 'นัดและบิล'], ['money', 'รายจ่าย'], ['shop', 'ซื้อของ'], ['notes', 'โยนไว้']];
    const body = { plan: planPane, money: moneyPane, shop: shopPane, notes: notesPane }[ui.lifeTab] ?? planPane;
    $('#view-life').innerHTML = `
      <div class="view-head"><h1>ธุระ</h1></div>
      <div class="seg" role="tablist" aria-label="หมวด">${tabs.map(([k, l]) =>
        `<button role="tab" aria-selected="${ui.lifeTab === k}" data-act="lifeTab" data-tab="${k}">${l}</button>`).join('')}</div>
      ${body()}`;
  }

  // ---------- today: life items join the timeline ----------
  function todayItems(key) {
    const items = eventsOn(state.events, key).map((e) => ({ life: 'event', id: `ev-${e.id}`, time: e.time || null, done: !!e.done, ev: e }));
    for (const b of state.bills) {
      const c = billCycle(b, key);
      const paidToday = Object.values(b.paid).includes(key);
      if (paidToday) items.push({ life: 'bill', id: `bill-${b.id}`, time: null, done: true, bill: b, cycle: c });
      else if (!c.paid && (c.status === 'today' || c.status === 'overdue')) items.push({ life: 'bill', id: `bill-${b.id}`, time: null, done: false, bill: b, cycle: c });
    }
    return items;
  }

  function timelineItem(it, isNow) {
    const cls = `tl${it.done ? ' done' : ''}${isNow ? ' now' : ''}`;
    let ic;
    let title;
    let sub;
    let tick;
    let actions = '';
    if (it.life === 'event') {
      const e = it.ev;
      ic = EVENT_KINDS[e.kind]?.icon ?? 'list';
      title = esc(e.title);
      sub = e.kind === 'appt' ? `นัดหมาย · ${APPT_TYPES[e.apptType]?.label ?? ''}` : EVENT_KINDS[e.kind]?.label ?? '';
      tick = `<button class="tick" role="checkbox" aria-checked="${it.done}" aria-label="ทำแล้ว" data-act="evTick" data-id="${e.id}">✓</button>`;
      const leave = APPT_TYPES[e.apptType]?.leave;
      if (e.kind === 'appt' && leave && !it.done) actions = `<button class="btn soft" data-act="leaveOpen" data-id="${leave}">${icon('door', { size: 18 })}เช็กของก่อนออก</button>`;
    } else {
      const { bill: b, cycle: c } = it;
      ic = 'receipt';
      title = `จ่าย${esc(b.title)}`;
      sub = `${it.done ? 'จ่ายแล้ว' : billStatusText(c)}${b.amount ? ` · ~${baht(b.amount)}` : ''}`;
      tick = `<button class="tick" role="checkbox" aria-checked="${it.done}" aria-label="จ่ายแล้ว" data-act="billPaid" data-id="${b.id}" ${it.done ? 'disabled' : ''}>✓</button>`;
    }
    if (it.moved && !it.done) sub += ` <span class="badge">${it.planned ? `แมวย้ายจาก ${it.planned}` : 'แมวหาเวลาให้'}</span>`;
    const editAct = it.life === 'event' ? `data-act="eventEdit" data-id="${it.ev.id}"` : `data-act="billEdit" data-id="${it.bill.id}"`;
    return `<li class="${cls}">
      <span class="tl-time">${it.time ?? 'วันนี้'}</span><span class="tl-dot"></span>
      <div class="tl-card">
        <div class="tl-head">
          <span class="tl-emoji">${icon(ic)}</span>
          <div class="grow" ${editAct} role="button" tabindex="0"><div class="tl-title">${title}</div><div class="tl-sub">${sub}</div></div>
          ${tick}
        </div>
        ${actions ? `<div class="tl-actions">${actions}</div>` : ''}
      </div></li>`;
  }

  // ---------- reminder cards and notifications ----------
  function alertInfo(c) {
    if (c.kind === 'event') {
      const e = eventById(c.ref);
      const text = { tomorrow: `พรุ่งนี้มีนัด: ${e.title}`, today: `วันนี้มีนัด: ${e.title}`, soon: `${e.title} ${e.time} น.` }[c.stage];
      const leave = APPT_TYPES[e.apptType]?.leave;
      const main = c.stage === 'tomorrow'
        ? (leave ? `<button class="btn primary big block" data-act="leaveOpen" data-id="${leave}">เตรียมของไว้ก่อน</button>` : '')
        : `<button class="btn primary big block" data-act="evTick" data-id="${e.id}">ทำแล้ว</button>`;
      return { text, time: e.time ? `${e.time} น.` : dayLabel(e.date), main };
    }
    const b = billById(c.ref);
    const text = c.stage === 'overdue' ? `${b.title} ยังรอจ่ายอยู่ ไม่เป็นไร จ่ายตอนสะดวกนะ`
      : c.stage === 'today' ? `วันนี้ครบกำหนดจ่าย${b.title}` : `อีก ${c.daysLeft} วันถึงวันจ่าย${b.title}`;
    return { text, time: shortDate(c.due), main: `<button class="btn primary big block" data-act="billPaid" data-id="${b.id}">จ่ายแล้ว</button>` };
  }

  // Only items that still exist (an event or bill may have been deleted since).
  const alive = (c) => (c.kind === 'event' ? !!eventById(c.ref) : !!billById(c.ref));

  // ---------- quick note ----------
  function openNote(id = null) {
    const el = $('#quicknote');
    ui.noteEdit = id;
    const n = id ? state.notes.find((x) => x.id === id) : null;
    el.hidden = false;
    const ta = el.querySelector('textarea');
    ta.value = n ? n.text : ui.noteDraft ?? '';
    el.querySelector('.qn-title').textContent = n ? 'แก้โน้ต' : 'โยนไว้ก่อน';
    el.querySelector('[data-act=mic]')?.toggleAttribute('hidden', !!n || state.settings.mic === false);
    ta.focus();
  }
  function closeNote() {
    if (document.querySelector('#quicknote.listening')) return;
    const el = $('#quicknote');
    if (!ui.noteEdit) ui.noteDraft = el.querySelector('textarea').value;
    el.hidden = true;
    ui.noteEdit = null;
  }

  const actions = {
    lifeTab: (d) => {
      ui.lifeTab = d.tab;
      renderLife();
    },
    leaveOpen: (d) => ctx.pushSheet({ type: 'leave', id: d.id || suggestedLeave() }),
    leavePick: (d) => {
      state.settings.lastLeave = d.id;
      ctx.save();
      ctx.replaceSheet({ type: 'leave', id: d.id });
    },
    leaveAdding: () => ctx.replaceSheet({ ...ctx.topSheet(), adding: !ctx.topSheet().adding }),
    leaveTick: (d) => {
      const list = listById(d.list);
      const ticks = ticksOf(ctx.getDay(today()), list.id);
      const next = ticks.includes(d.id) ? ticks.filter((x) => x !== d.id) : [...ticks, d.id];
      setTicks(list.id, next);
      ctx.save();
      ctx.renderSheet();
      if (list.items.length && list.items.every((i) => next.includes(i.id)) && !ticks.includes(d.id)) {
        ctx.sfx.bell();
        ctx.toast('ของครบ! เดินทางปลอดภัยนะ');
      }
    },
    leaveItemDel: (d) => {
      const list = listById(d.list);
      const idx = list.items.findIndex((i) => i.id === d.id);
      const [item] = list.items.splice(idx, 1);
      changed();
      ctx.toast(`ลบ "${item.text}" แล้ว`, () => {
        list.items.splice(idx, 0, item);
        changed();
      });
    },
    leaveReset: (d) => {
      setTicks(d.id, []);
      changed();
    },
    leaveDel: (d) => {
      const idx = state.leaveLists.findIndex((l) => l.id === d.id);
      const [list] = state.leaveLists.splice(idx, 1);
      ctx.replaceSheet({ type: 'leave', id: 'gym' });
      changed();
      ctx.toast(`ลบปลายทาง "${list.name}" แล้ว`, () => {
        state.leaveLists.splice(idx, 0, list);
        changed();
      });
    },
    eventNew: (d) => ctx.pushSheet({ type: 'event', kind: d.kind || 'personal', date: d.date || undefined }),
    eventEdit: (d) => ctx.pushSheet({ type: 'event', id: d.id }),
    eventDel: (d) => {
      const idx = state.events.findIndex((e) => e.id === d.id);
      const [e] = state.events.splice(idx, 1);
      ctx.popSheet();
      changed();
      ctx.toast(`ลบ "${e.title}" แล้ว`, () => {
        state.events.splice(idx, 0, e);
        changed();
      });
    },
    evTick: (d) => toggleEvent(d.id),
    billNew: () => ctx.pushSheet({ type: 'bill' }),
    billEdit: (d) => ctx.pushSheet({ type: 'bill', id: d.id }),
    billDel: (d) => {
      const idx = state.bills.findIndex((b) => b.id === d.id);
      const [b] = state.bills.splice(idx, 1);
      ctx.popSheet();
      changed();
      ctx.toast(`ลบบิล "${b.title}" แล้ว`, () => {
        state.bills.splice(idx, 0, b);
        changed();
      });
    },
    billPaid: (d) => payBill(d.id),
    expQuick: () => {
      ui.lifeTab = 'money';
      ctx.showView('life');
    },
    expCat: (d) => {
      ui.expCat = ui.expCat === d.cat ? null : d.cat;
      renderLife();
      $('#view-life [name=amount]')?.focus();
    },
    expDel: (d) => {
      const idx = state.expenses.findIndex((x) => x.id === d.id);
      const [x] = state.expenses.splice(idx, 1);
      changed();
      ctx.toast(`ลบ ${baht(x.amount)} แล้ว`, () => {
        state.expenses.splice(idx, 0, x);
        changed();
      });
    },
    expMonth: (d) => {
      const cur = monthOf(today());
      const next = addMonths(ui.expMonth ?? cur, Number(d.n));
      ui.expMonth = next >= cur ? null : next;
      renderLife();
    },
    shopItem: (d) => {
      const [from, ref] = [d.key.slice(0, 4), d.key.slice(5)];
      if (from === 'home') {
        const c = state.shopList.find((x) => x.id === ref);
        c.done = !c.done;
      } else {
        const { ws } = ctx.planShopping();
        const set = new Set(state.shopping[ws] ?? []);
        if (set.has(ref)) set.delete(ref);
        else set.add(ref);
        state.shopping = { [ws]: [...set] }; // only this week matters
      }
      changed();
    },
    shopDel: (d) => {
      state.shopList = state.shopList.filter((c) => c.id !== d.id);
      changed();
    },
    shopClear: () => {
      const before = state.shopList;
      state.shopList = before.filter((c) => !c.done);
      changed();
      ctx.toast('ล้างของที่ซื้อแล้ว', () => {
        state.shopList = before;
        changed();
      });
    },
    noteOpen: () => openNote(),
    noteEdit: (d) => openNote(d.id),
    noteClose: () => closeNote(),
    noteDel: (d) => {
      const idx = state.notes.findIndex((n) => n.id === d.id);
      const [n] = state.notes.splice(idx, 1);
      changed();
      ctx.toast('ลบโน้ตแล้ว', () => {
        state.notes.splice(idx, 0, n);
        changed();
      });
    },
  };

  const forms = {
    leaveNew: (form) => {
      const name = form.elements.name.value.trim();
      if (!name) return;
      const list = { id: ctx.newId(), name, icon: 'door', items: [] };
      state.leaveLists.push(list);
      state.settings.lastLeave = list.id;
      ctx.save();
      ctx.replaceSheet({ type: 'leave', id: list.id });
      ctx.render();
    },
    leaveItemAdd: (form) => {
      const text = form.elements.text.value.trim();
      if (!text) return;
      listById(form.dataset.list).items.push({ id: ctx.newId(), text });
      changed();
      document.querySelector('#sheet [data-form=leaveItemAdd] input')?.focus();
    },
    eventSave: (form) => {
      const title = form.elements.title.value.trim();
      if (!title || !form.elements.date.value) return;
      const kind = form.elements.kind.value || 'personal';
      const lead = form.elements.lead.value;
      const data = {
        kind, title, date: form.elements.date.value, time: form.elements.time.value || null,
        apptType: kind === 'appt' ? form.elements.apptType.value || 'other' : null,
        remind: lead !== 'off', lead: lead === 'off' ? null : Number(lead),
      };
      const id = form.dataset.id;
      if (id) Object.assign(eventById(id), data);
      else state.events.push({ id: ctx.newId(), done: false, createdAt: Date.now(), ...data });
      // A changed time is a fresh reminder.
      if (id) for (const log of Object.values(state.reminderLog)) for (const k of Object.keys(log)) if (k.startsWith(`ev:${id}`)) delete log[k];
      ctx.popSheet();
      changed();
      ctx.toast(`บันทึก "${title}" · ${dayLabel(data.date)}${data.time ? ` ${data.time} น.` : ''}`);
      ctx.tick();
    },
    billSave: (form) => {
      const title = form.elements.title.value.trim();
      const day = Math.round(Number(form.elements.day.value));
      if (!title || !(day >= 1 && day <= 31)) return;
      const data = { title, day, amount: parseAmount(form.elements.amount.value), lead: Number(form.elements.lead.value) };
      const id = form.dataset.id;
      if (id) Object.assign(billById(id), data);
      else state.bills.push({ id: ctx.newId(), createdOn: today(), paid: {}, ...data });
      ctx.popSheet();
      changed();
      ctx.toast(`บันทึกบิล${title} ทุกวันที่ ${day}`);
      ctx.tick();
    },
    expense: (form) => {
      const amount = parseAmount(form.elements.amount.value);
      if (!amount || !ui.expCat) {
        ctx.toast('ใส่จำนวนเงินเป็นตัวเลขนะ');
        return;
      }
      const x = { id: ctx.newId(), date: today(), cat: ui.expCat, amount, at: Date.now() };
      state.expenses.push(x);
      ui.expCat = null;
      ctx.sfx.knock();
      changed();
      ctx.toast(`จด ${EXPENSE_CATS[x.cat].label} ${baht(amount)} แล้ว`, () => {
        state.expenses = state.expenses.filter((e) => e.id !== x.id);
        changed();
      });
    },
    shopAdd: (form) => {
      const text = form.elements.text.value.trim();
      if (!text) return;
      state.shopList.push({ id: ctx.newId(), text, done: false });
      changed();
      $('#view-life [data-form=shopAdd] input')?.focus();
    },
    note: (form) => {
      const text = form.elements.text.value.trim();
      if (!text) {
        closeNote();
        return;
      }
      const n = ui.noteEdit ? state.notes.find((x) => x.id === ui.noteEdit) : null;
      ui.noteDraft = '';
      form.elements.text.value = '';
      closeNote();
      if (!n) {
        // Anything typed here goes through "โยนไว้ก่อน" and gets a category.
        ctx.inboxSubmit(text);
        return;
      }
      n.text = text;
      n.editedAt = Date.now();
      changed();
      ctx.toast('แก้โน้ตแล้ว');
    },
  };

  return {
    renderLife, renderLeave, renderEvent, renderBill, todayItems, timelineItem, alertInfo, alive,
    openNote, closeNote, actions, forms,
  };
}
