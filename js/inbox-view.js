// "โยนไว้ก่อน" on screen: the bar on Today, the check-before-saving sheet,
// filing each item where it belongs (events, shopping, expenses, health
// notes, ideas), voice input, and the history where a wrong category can be
// fixed. Parsing rules live in inbox.js.
import { icon } from './icons.js';
import { readiness } from './health.js';
import { parseInbox, needsReview, INBOX_CATS } from './inbox.js';
import { EXPENSE_CATS, APPT_TYPES } from './life.js';
import { applyInboxRules, inboxRules } from './memory.js';

const EVENT_KIND = { appt: 'appt', work: 'work', remind: 'personal' };
const TIMED = new Set(['appt', 'work', 'remind']);

export function createInbox(ctx) {
  const { state, ui, esc } = ctx;
  const $ = (sel) => document.querySelector(sel);
  const today = () => ctx.todayKey();
  const changed = () => {
    ctx.save();
    ctx.render();
  };

  // ---------- filing ----------
  function noteSoreness(day, part) {
    if (day.checkin) {
      const answers = structuredClone(day.checkin.answers);
      answers.soreness = { ...answers.soreness, [part]: Math.max(answers.soreness?.[part] ?? 0, 2) };
      day.checkin = { ...day.checkin, answers, ...readiness(answers) };
    } else {
      day.pendingSore = { ...(day.pendingSore ?? {}), [part]: 2 };
    }
  }

  function file(item) {
    const id = ctx.newId();
    const t = today();
    if (item.cat === 'memory') {
      const m = ctx.assistant.tell(item.title);
      return { type: 'memory', id: m.key };
    }
    if (TIMED.has(item.cat)) {
      state.events.push({
        id, kind: EVENT_KIND[item.cat], title: item.title, date: item.date || t, time: item.time || null,
        apptType: item.cat === 'appt' ? item.apptType || 'other' : null, remind: true, lead: null, done: false,
        createdAt: Date.now(), from: 'inbox',
      });
      return { type: 'event', id };
    }
    if (item.cat === 'shop') {
      state.shopList.push({ id, text: item.title, done: false });
      return { type: 'shop', id };
    }
    if (item.cat === 'money') {
      state.expenses.push({ id, date: item.date || t, cat: item.expCat || 'other', amount: Number(item.amount), at: Date.now(), note: item.title });
      return { type: 'expense', id };
    }
    if (item.cat === 'health') {
      const date = item.date || t;
      const day = ctx.editDay(date);
      (day.health ??= []).push({ id, text: item.title, part: item.part || null, at: Date.now() });
      if (item.part && date === t) noteSoreness(day, item.part);
      return { type: 'health', id, date };
    }
    state.notes.push({ id, text: item.title, at: Date.now() });
    return { type: 'note', id };
  }

  function unfile(ref) {
    if (!ref) return;
    const drop = (key) => { state[key] = state[key].filter((x) => x.id !== ref.id); };
    if (ref.type === 'event') drop('events');
    else if (ref.type === 'shop') drop('shopList');
    else if (ref.type === 'expense') drop('expenses');
    else if (ref.type === 'note') drop('notes');
    else if (ref.type === 'memory') ctx.assistant.forget(ref.id);
    else if (ref.type === 'health') {
      const day = state.days[ref.date];
      if (day?.health) day.health = day.health.filter((h) => h.id !== ref.id);
    }
  }

  function fileLogged(item, raw) {
    const entry = { id: ctx.newId(), raw, item: { ...item }, ref: file(item), at: Date.now() };
    state.inbox.unshift(entry);
    state.inbox.length = Math.min(state.inbox.length, 200);
    return entry;
  }

  const whereText = (item) => ({
    appt: 'ไปอยู่ในนัดหมาย และเตือนก่อนเวลา',
    work: 'ไปอยู่ในรายการของวันนั้น',
    remind: 'ไปอยู่ในรายการของวันนั้น และเตือนตามเวลา',
    shop: 'เพิ่มในลิสต์ของที่ต้องซื้อ',
    money: 'จดเป็นรายจ่าย',
    health: item.part ? 'จดในบันทึกสุขภาพ และแมวจะเลี่ยงท่าที่ใช้ส่วนนั้นให้' : 'จดในบันทึกสุขภาพของวันนั้น',
    idea: 'เก็บไว้ในโน้ต',
    memory: 'แมวจำไว้ ดู แก้ หรือลืมได้ที่ ของฉัน › แมวจำอะไรไว้บ้าง',
  }[item.cat]);

  // ---------- input ----------
  function submit(text, { voice = false } = {}) {
    const raw = String(text ?? '').trim();
    if (!raw) return false;
    // Words the user corrected before are filed the way they taught the cat.
    const items = applyInboxRules(parseInbox(raw, { today: today(), now: Date.now() }), inboxRules(ctx.assistant.active()));
    if (!items.length) return false;
    if (!voice && state.settings.inboxAuto !== false && !needsReview(items)) {
      const entry = fileLogged(items[0], raw);
      ctx.sfx.knock();
      changed();
      ctx.toast(`จัดเป็น "${INBOX_CATS[entry.item.cat].label}" แล้ว`, () => {
        unfile(entry.ref);
        state.inbox = state.inbox.filter((e) => e.id !== entry.id);
        changed();
      });
      return true;
    }
    ctx.pushSheet({ type: 'review', raw, items: items.map((i) => ({ ...i })) });
    return true;
  }

  // ---------- Today: the bar ----------
  const micOn = () => state.settings.mic !== false;
  function bar() {
    const last = state.inbox[0];
    const recent = last && Date.now() - last.at < 10 * 60_000;
    return `<form class="inbox-bar" data-form="inbox" role="search" aria-label="โยนไว้ก่อน">
      <input type="text" name="text" placeholder="โยนไว้ก่อน… พิมพ์อะไรก็ได้" autocomplete="off" enterkeyhint="done" aria-label="โยนไว้ก่อน พิมพ์อะไรก็ได้">
      ${micOn() ? `<button type="button" class="icon-btn mic" data-act="mic" aria-label="พูดแทนพิมพ์">${icon('mic')}</button>` : ''}
      <button class="btn primary sm">ใส่</button>
    </form>
    ${recent ? `<div class="inbox-last small"><span class="muted">ล่าสุด:</span> ${esc(last.item.title)} → ${INBOX_CATS[last.item.cat].label}
      <button class="link" data-act="rvEdit" data-id="${last.id}">เปลี่ยน</button></div>`
    : state.inbox.length ? '' : '<p class="inbox-hint small muted">เช่น "พรุ่งนี้บ่ายสองไปหาหมอ แล้วซื้ออาหารแมว" แมวแยกและจัดหมวดให้เอง</p>'}`;
  }

  // ---------- review sheet ----------
  function card(item, i, s) {
    const chip = ([k, c]) => `<button class="chip sm" data-act="rvCat" data-i="${i}" data-cat="${k}" aria-pressed="${item.cat === k}">${icon(c.icon, { size: 16 })}${c.label}</button>`;
    let fields = '';
    if (TIMED.has(item.cat)) {
      fields = `<div class="form-grid two">
        <label><span class="small muted">วันที่</span><input type="date" data-rv="date" data-i="${i}" value="${item.date ?? ''}"></label>
        <label><span class="small muted">เวลา (ไม่ใส่ก็ได้)</span><input type="time" data-rv="time" data-i="${i}" value="${item.time ?? ''}"></label></div>`;
      if (item.cat === 'appt') {
        fields += `<label><span class="small muted">นัดเรื่อง</span><select data-rv="apptType" data-i="${i}">${Object.entries(APPT_TYPES).map(([k, a]) =>
          `<option value="${k}" ${(item.apptType ?? 'other') === k ? 'selected' : ''}>${a.label}</option>`).join('')}</select></label>`;
      }
    } else if (item.cat === 'money') {
      fields = `<div class="form-grid two">
        <label><span class="small muted">จำนวนเงิน (บาท)</span><input type="text" inputmode="decimal" data-rv="amount" data-i="${i}" value="${item.amount ?? ''}"></label>
        <label><span class="small muted">หมวด</span><select data-rv="expCat" data-i="${i}">${Object.entries(EXPENSE_CATS).map(([k, c]) =>
          `<option value="${k}" ${(item.expCat ?? 'other') === k ? 'selected' : ''}>${c.label}</option>`).join('')}</select></label></div>`;
    }
    return `<div class="card rv-card">
      <div class="row between"><div class="chips">${Object.entries(INBOX_CATS).sort(([a], [b]) => (b === item.cat) - (a === item.cat)).map(chip).join('')}</div>
        ${!s.replace && s.items.length > 1 ? `<button class="icon-btn" data-act="rvDel" data-i="${i}" aria-label="ไม่เอาอันนี้">${icon('x', { size: 16 })}</button>` : ''}</div>
      <input type="text" class="gap-top" data-rv="title" data-i="${i}" value="${esc(item.title)}" aria-label="ข้อความ">
      ${fields}
      <p class="small muted">${item.learned ? 'จัดหมวดตามที่เธอเคยแก้ไว้ · ' : ''}${whereText(item)}</p>
    </div>`;
  }

  function renderReview(s) {
    const n = s.items.length;
    return `${ctx.sheetTop(s.replace ? 'เปลี่ยนหมวด' : 'ตรวจก่อนบันทึก')}
      ${s.raw ? `<p class="quote">“${esc(s.raw)}”</p>` : ''}
      <div class="question">${s.replace ? 'ย้ายไปหมวดไหนดี?' : n > 1 ? `แมวแยกได้ ${n} เรื่อง` : 'แมวจัดให้แบบนี้'}</div>
      <p class="center small muted">แตะหมวดเพื่อเปลี่ยน แก้ข้อความได้ แล้วค่อยกดบันทึก</p>
      ${s.items.map((item, i) => card(item, i, s)).join('')}
      <div class="sheet-foot">
        <button class="btn primary big block" data-act="rvSave">${s.replace ? 'บันทึก' : n > 1 ? `บันทึกทั้ง ${n} อย่าง` : 'บันทึก'}</button>
        <button class="btn ghost block" data-act="back">ยกเลิก</button>
      </div>`;
  }

  function problem(item) {
    if (!String(item.title ?? '').trim()) return 'มีรายการที่ยังไม่มีข้อความ';
    if (item.cat === 'appt' && !item.date) return `ใส่วันที่ของนัด "${item.title}" ก่อนนะ`;
    if (item.cat === 'money' && !(Number(String(item.amount).replace(/,/g, '')) > 0)) return `ใส่จำนวนเงินของ "${item.title}" ก่อนนะ`;
    return null;
  }

  // ---------- voice ----------
  let rec = null;
  function setListening(on) {
    $('#quicknote')?.classList.toggle('listening', on);
    document.querySelectorAll('[data-act=mic]').forEach((b) => b.setAttribute('aria-pressed', String(on)));
    const title = $('#quicknote .qn-title');
    if (title) title.textContent = on ? 'กำลังฟัง… พูดได้เลย' : 'โยนไว้ก่อน';
  }
  function startVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      ctx.toast('เครื่องนี้ใช้ไมค์ในแอปไม่ได้ ลองกดไมค์บนคีย์บอร์ดแทนนะ');
      ctx.openPanel();
      return;
    }
    if (rec) {
      rec.stop();
      return;
    }
    ctx.openPanel();
    const ta = $('#quicknote textarea');
    let heard = '';
    try {
      rec = new SR();
    } catch {
      ctx.toast('เปิดไมค์ไม่ได้ ลองพิมพ์หรือใช้ไมค์บนคีย์บอร์ดแทนนะ');
      return;
    }
    rec.lang = 'th-TH';
    rec.interimResults = true;
    rec.onresult = (e) => {
      heard = Array.from(e.results).map((r) => r[0].transcript).join(' ');
      if (ta) ta.value = heard;
    };
    rec.onerror = (e) => {
      ctx.toast(e.error === 'not-allowed' || e.error === 'service-not-allowed'
        ? 'ยังไม่ได้อนุญาตให้ใช้ไมค์ อนุญาตได้ที่การตั้งค่าเบราว์เซอร์'
        : 'ฟังไม่ชัด ลองพูดอีกครั้งนะ');
    };
    rec.onend = () => {
      rec = null;
      setListening(false);
      if (heard.trim()) {
        if (ta) ta.value = '';
        ui.noteDraft = '';
        ctx.closePanel();
        submit(heard, { voice: true });
      }
    };
    rec.start();
    setListening(true);
  }

  // ---------- history (ธุระ › โยนไว้) ----------
  function logPane() {
    const entries = state.inbox.slice(0, 60);
    if (!entries.length) return '';
    const when = (ms) => new Date(ms).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    return `<div class="card">
      <h2>โยนไว้ล่าสุด</h2>
      <p class="small muted">แมวจัดหมวดให้แล้ว ถ้าผิดแตะ "เปลี่ยน" ได้เลย</p>
      ${entries.map((e) => `<div class="list-row">
        <span class="lr-ic">${icon(INBOX_CATS[e.item.cat].icon)}</span>
        <div class="grow"><span class="lr-title">${esc(e.item.title)}</span><br><span class="small muted">${INBOX_CATS[e.item.cat].label} · ${when(e.at)}</span></div>
        <button class="btn ghost sm" data-act="rvEdit" data-id="${e.id}">เปลี่ยน</button></div>`).join('')}
    </div>`;
  }

  const actions = {
    mic: () => startVoice(),
    rvCat: (d) => {
      const s = ctx.topSheet();
      const item = s.items[Number(d.i)];
      item.cat = d.cat;
      if (TIMED.has(d.cat) && !item.date) item.date = d.cat === 'appt' ? null : today();
      if (d.cat === 'appt') item.apptType ??= 'other';
      ctx.renderSheet();
    },
    rvDel: (d) => {
      const s = ctx.topSheet();
      s.items.splice(Number(d.i), 1);
      if (!s.items.length) ctx.popSheet();
      else ctx.renderSheet();
    },
    rvEdit: (d) => {
      const e = state.inbox.find((x) => x.id === d.id);
      if (e) ctx.pushSheet({ type: 'review', replace: e.id, raw: e.raw, items: [{ ...e.item }] });
    },
    rvSave: () => {
      const s = ctx.topSheet();
      const items = s.items.map((i) => ({ ...i, title: String(i.title ?? '').trim(), amount: i.amount != null ? Number(String(i.amount).replace(/,/g, '')) : null }));
      const bad = items.map(problem).find(Boolean);
      if (bad) {
        ctx.toast(bad);
        return;
      }
      if (s.replace) {
        const e = state.inbox.find((x) => x.id === s.replace);
        const moved = e.item.cat !== items[0].cat;
        unfile(e.ref);
        e.item = items[0];
        e.ref = file(items[0]);
        // Learn from the correction, so next time it's filed right.
        if (moved && items[0].cat !== 'memory') ctx.assistant.learnCorrection(items[0].title, items[0].cat, INBOX_CATS[items[0].cat].label);
      } else {
        for (const item of items) fileLogged(item, s.raw);
      }
      ctx.popSheet();
      ctx.sfx.knock();
      changed();
      ctx.toast(s.replace ? `ย้ายไป "${INBOX_CATS[items[0].cat].label}" แล้ว` : `บันทึก ${items.length} อย่างแล้ว แมวจำให้เอง`);
    },
  };

  const forms = {
    inbox: (form) => {
      const input = form.elements.text;
      if (submit(input.value)) input.value = '';
    },
  };

  // Typing in the review sheet goes straight into the sheet state, so tapping a
  // category chip (which re-renders) never loses what was typed.
  function onInput(el) {
    const s = ctx.topSheet();
    if (s?.type !== 'review') return;
    const item = s.items[Number(el.dataset.i)];
    if (item) item[el.dataset.rv] = el.value || (el.dataset.rv === 'time' || el.dataset.rv === 'date' ? null : el.value);
  }

  return { bar, renderReview, submit, logPane, actions, forms, onInput, startVoice };
}
