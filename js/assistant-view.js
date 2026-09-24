// The cat as a personal assistant: what it remembers (Cat Memory), the short
// "ครั้งนี้เพราะอะไร?" question after a plan slips twice, observations, and
// the rules the user agreed to. Logic lives in memory.js, why.js, insights.js.
import { icon } from './icons.js';
import { mascot } from './art.js';
import { addDays } from './health.js';
import {
  MEMORY_KINDS, observeMemories, mergeMemories, activeMemories, toldMemory, correctionMemory,
} from './memory.js';
import { WHY_REASONS, WHY_FIX, RULE_TEXT, whatToAsk, whyContext, whyPatterns } from './why.js';
import { findPatterns, sleepHoursOf } from './insights.js';
import { MENUS } from './meals.js';
import { SLOTS } from './planner.js';

export function createAssistant(ctx) {
  const { state, ui, esc } = ctx;
  const today = () => ctx.todayKey();
  const kindsOn = () => state.settings.memoryKinds ?? {};
  const changed = () => {
    ctx.save();
    ctx.render();
    ctx.renderSheet();
  };

  // ---------- memory ----------
  const menuNames = Object.fromEntries(MENUS.map((m) => [m.id, m.name]));
  function refresh(force = false) {
    const t = today();
    if (!force && state.memory.refreshedOn === t) return;
    state.memory.refreshedOn = t;
    if (state.settings.memory === false) return;
    const cand = observeMemories({
      days: state.days, events: state.events, signals: state.signals, today: t,
      slotTime: SLOTS[ctx.profile().slot]?.time ?? null, menus: menuNames, bills: state.bills,
    });
    state.memory.items = mergeMemories(state.memory.items, cand, { forgotten: state.memory.forgotten, kindsOn: kindsOn() });
    ctx.save();
  }
  const active = () => (state.settings.memory === false ? [] : activeMemories(state.memory.items, kindsOn()));
  const byKey = (key) => state.memory.items.find((i) => i.key === key);
  function remember(item) {
    state.memory.items = [...state.memory.items.filter((i) => i.key !== item.key), item];
    delete state.memory.forgotten[item.key];
  }
  function forget(key) {
    state.memory.items = state.memory.items.filter((i) => i.key !== key);
    state.memory.forgotten[key] = Date.now();
  }
  // Called by the inbox when the user moves an item to another category.
  function learnCorrection(title, cat, label) {
    if (state.settings.memory === false || kindsOn().inbox === false) return;
    remember(correctionMemory(title, cat, label));
  }
  function tell(text) {
    const m = toldMemory(text);
    remember(m);
    return m;
  }
  function agree(ruleId, why) {
    remember({
      key: `rule:${ruleId}`, id: `rule:${ruleId}`, kind: 'rule', source: 'told', status: 'on',
      text: RULE_TEXT[ruleId], why, value: ruleId, at: Date.now(), updatedAt: Date.now(),
    });
  }

  // ---------- observations (patterns) ----------
  function patterns(t) {
    if (state.settings.learn === false) return [];
    const seen = (id) => state.insightSeen[id] && ctx.daysSince(state.insightSeen[id], t.key) < 14;
    const agreed = (p) => p.action && p.action.id !== 'lighten' && p.action.id !== 'retime' && active().some((i) => i.key === `rule:${p.action.id}`);
    return [
      ...whyPatterns({ whyLog: state.whyLog, today: t.key }),
      ...findPatterns({ days: state.days, profile: t.p, today: t.key, todayCheckin: t.day.checkin }),
    ].filter((p) => !state.patternMuted[p.id] && !seen(p.id) && !agreed(p));
  }

  // ---------- why ----------
  function question() {
    if (state.settings.why === false) return null;
    return whatToAsk({
      days: state.days, events: state.events, whyLog: state.whyLog, today: today(),
      mutedUntil: state.settings.whyMutedUntil, askedOn: state.settings.whyAskedOn,
    });
  }

  function whyCard(t) {
    const done = t.day.whyDone;
    if (done && !done.closed) {
      const fix = WHY_FIX[done.reason];
      return `<div class="card why-card">
        <div class="small muted row"><span class="card-ic">${icon('heart', { size: 18 })}</span>ขอบคุณที่บอกนะ</div>
        <p class="head">${done.reason === 'skip' ? 'ไม่เป็นไรเลย ไว้ค่อยคุยกัน' : fix.text}</p>
        <div class="row wrap">
          ${done.reason !== 'skip' && fix.action ? `<button class="btn primary sm" data-act="patternAction" data-id="why-now" data-action="${fix.action.id}">${fix.action.label}</button>` : ''}
          <button class="btn ghost sm" data-act="whyClose">ปิด</button>
        </div>
      </div>`;
    }
    const q = question();
    if (!q) return '';
    return `<div class="card why-card">
      <div class="small muted row"><span class="card-ic">${icon('cloud', { size: 18 })}</span>${esc(q.title)}</div>
      <p class="head">ครั้งนี้เพราะอะไร?</p>
      <p class="small muted">ไม่ได้ว่าอะไรนะ แค่อยากจัดครั้งหน้าให้ง่ายขึ้น แตะเดียวพอ</p>
      <div class="chips">${Object.entries(WHY_REASONS).map(([k, l]) => `<button class="chip sm" data-act="whyAnswer" data-reason="${k}">${l}</button>`).join('')}</div>
      <button class="btn ghost sm gap-top" data-act="whyAnswer" data-reason="skip">ไม่อยากตอบ</button>
    </div>`;
  }

  function memoryCard() {
    if (state.settings.memory === false) return '';
    const p = state.memory.items.find((i) => i.status === 'pending' && kindsOn()[i.kind] !== false);
    if (!p) return '';
    return `<div class="card memory-card">
      <div class="small muted row"><span class="card-ic">${icon(MEMORY_KINDS[p.kind]?.icon ?? 'pen', { size: 18 })}</span>แมวสังเกตว่า…</div>
      <p class="head">${esc(p.text)}</p>
      <p class="small muted">เพราะ ${esc(p.why)} · ให้จำไว้ช่วยจัดครั้งหน้าไหม</p>
      <div class="row wrap">
        <button class="btn primary sm" data-act="memYes" data-key="${esc(p.key)}">จำไว้</button>
        <button class="btn ghost sm" data-act="memNo" data-key="${esc(p.key)}">ไม่ต้องจำ</button>
        <button class="link small" data-act="openMemory">แมวจำอะไรไว้บ้าง</button>
      </div>
    </div>`;
  }

  // One card for Today (the app shows at most one suggestion at a time).
  function suggestion(t) {
    return whyCard(t) || memoryCard();
  }

  // ---------- "แมวจำอะไรไว้บ้าง" ----------
  function renderMemory() {
    refresh(true);
    const on = state.settings.memory !== false;
    const items = state.memory.items;
    const pending = items.filter((i) => i.status === 'pending');
    const sw = (act, checked, label, extra = '') => `<label class="switch" aria-label="${label}"><input type="checkbox" data-act="${act}" ${extra} ${checked ? 'checked' : ''}><span></span></label>`;
    const row = (m) => {
      const editing = ui.memEdit === m.key;
      return `<div class="mem-row">
        ${editing ? `<form class="row" data-form="memEdit" data-key="${esc(m.key)}"><input type="text" name="mtext" value="${esc(m.text)}" maxlength="80" aria-label="แก้สิ่งที่แมวจำ"><button class="btn primary sm">บันทึก</button></form>`
    : `<div class="lr-title">${esc(m.text)}</div>`}
        <div class="small muted">จำเพราะ ${esc(m.why)}${m.edited ? ' · เธอแก้เอง' : ''}${m.status === 'pending' ? ' · รอเธอยืนยัน' : ''}</div>
        <div class="row wrap mem-actions">
          ${m.status === 'pending' ? `<button class="btn primary sm" data-act="memYes" data-key="${esc(m.key)}">จำไว้</button>` : ''}
          ${editing ? '' : `<button class="btn ghost sm" data-act="memEditOpen" data-key="${esc(m.key)}">แก้</button>`}
          <button class="btn ghost sm" data-act="memNo" data-key="${esc(m.key)}">ลืมเรื่องนี้</button>
          ${m.kind === 'forget' && m.value?.bill && m.status === 'on' ? `<button class="btn soft sm" data-act="memLead" data-id="${m.value.bill}">เตือนเร็วขึ้น 2 วัน</button>` : ''}
        </div>
      </div>`;
    };
    const kinds = Object.entries(MEMORY_KINDS).map(([k, meta]) => {
      const list = items.filter((i) => i.kind === k && i.status === 'on');
      const kOn = kindsOn()[k] !== false;
      return `<div class="mem-kind${kOn ? '' : ' off'}">
        <div class="rem-row"><span class="lr-ic">${icon(meta.icon, { size: 20 })}</span><span class="grow"><b>${meta.label}</b>${kOn ? '' : '<br><span class="small muted">พักไว้ ไม่เรียนรู้และไม่นำไปใช้</span>'}</span>
          ${sw('memKind', kOn, `เปิด/ปิด ${meta.label}`, `data-kind="${k}"`)}</div>
        ${list.map(row).join('') || '<p class="small muted mem-empty">ยังไม่มี</p>'}
      </div>`;
    }).join('');
    const pats = patterns(ctx.computeToday());
    return `${ctx.sheetTop('แมวจำอะไรไว้บ้าง')}
      <div class="sheet-mascot">${mascot('normal', { size: 84 })}</div>
      <p class="center small">แมวจำเฉพาะที่เธออนุญาต คิดในเครื่องนี้เท่านั้น<br>ทุกเรื่องบอกได้ว่าจำเพราะอะไร แก้ได้ ลืมได้ และปิดทีละเรื่องได้</p>
      <div class="card"><div class="rem-row"><span class="grow"><b>ให้แมวจำเรื่องต่างๆ</b><br><span class="small muted">ปิดแล้วแมวจะไม่เรียนรู้และไม่ใช้สิ่งที่จำไว้ (รายการเดิมยังดู/ลบได้)</span></span>
        ${sw('memMaster', on, 'เปิด/ปิดความจำของแมว')}</div></div>
      ${pending.length && on ? `<div class="card"><h2>รอเธอยืนยัน</h2><p class="small muted">แมวจะไม่ใช้เรื่องเหล่านี้จนกว่าเธอกด "จำไว้"</p>${pending.map(row).join('')}</div>` : ''}
      <div class="card">${kinds}</div>
      <div class="card">
        <h2>บอกแมวเพิ่ม</h2>
        <form class="row" data-form="memAdd"><input type="text" name="mtext" placeholder="เช่น ไม่ชอบกินผักชี, ชอบออกกำลังกายตอนเช้า" maxlength="80" required aria-label="บอกแมวเพิ่ม"><button class="btn soft sm">จำไว้</button></form>
        <p class="small muted">หรือพิมพ์ "จำไว้ว่า…" ในช่องโยนไว้ก่อนก็ได้</p>
      </div>
      <div class="card">
        <h2>ข้อสังเกตตอนนี้</h2>
        <p class="small muted">ข้อสังเกตจากพฤติกรรม ไม่ใช่คำวินิจฉัย</p>
        ${pats.length ? pats.map((p) => `<div class="mem-row"><div>${p.text}</div><div class="small muted">${p.tip}</div>
          <div class="row wrap mem-actions">${p.action ? `<button class="btn soft sm" data-act="patternAction" data-id="${p.id}" data-action="${p.action.id}">${p.action.label}</button>` : ''}
          <button class="btn ghost sm" data-act="patternMute" data-id="${p.id}">ไม่ต้องบอกเรื่องนี้อีก</button></div></div>`).join('')
    : '<p class="small muted">ยังไม่มีอะไรชัดพอจะบอก แมวจะรอจนเห็นซ้ำหลายครั้งก่อน</p>'}
        <div class="rem-row"><span class="grow">ให้แมวสังเกตแพทเทิร์น</span>${sw('learnToggle', state.settings.learn !== false, 'เปิด/ปิดการสังเกตแพทเทิร์น')}</div>
        <div class="rem-row"><span class="grow">ถาม "ครั้งนี้เพราะอะไร?" เมื่อแผนหลุดซ้ำ<br><span class="small muted">ตอบแล้ว ${state.whyLog.filter((w) => w.reason !== 'skip').length} ครั้ง</span></span>${sw('whyToggle', state.settings.why !== false, 'เปิด/ปิดคำถามเพราะอะไร')}</div>
        ${state.whyLog.length ? '<button class="btn ghost sm" data-act="whyClear">ลบคำตอบทั้งหมด</button>' : ''}
        <div class="rem-row"><span class="grow">ให้แมวจัดหมวด "โยนไว้ก่อน" เอง<br><span class="small muted">ปิดแล้วทุกอย่างจะให้ตรวจก่อนบันทึก</span></span>${sw('inboxAutoToggle', state.settings.inboxAuto !== false, 'เปิด/ปิดการจัดหมวดอัตโนมัติ')}</div>
      </div>
      ${Object.keys(state.memory.forgotten).length ? `<p class="small muted center">มี ${Object.keys(state.memory.forgotten).length} เรื่องที่ให้ลืมไว้ แมวจะไม่เรียนรู้ซ้ำ · <button class="link" data-act="memUnforget">ให้เรียนรู้ได้อีก</button></p>` : ''}
      <div class="sheet-foot"><button class="btn primary big block" data-act="back">เสร็จแล้ว</button></div>`;
  }

  function renderRetime() {
    const cur = ctx.profile().slot;
    return `${ctx.sheetTop('เลือกเวลาใหม่')}
      <div class="question">ช่วงไหนน่าจะสะดวกกว่า?</div>
      <div class="opts">${Object.entries(SLOTS).map(([k, sl]) => `<button class="opt" data-act="retimePick" data-v="${k}" aria-pressed="${cur === k}">
        <span>${sl.label}<small>${sl.hint} · ${sl.time}</small></span></button>`).join('')}</div>`;
  }

  const actions = {
    openMemory: () => ctx.pushSheet({ type: 'memory' }),
    memYes: (d) => {
      const m = byKey(d.key);
      if (!m) return;
      m.status = 'on';
      m.updatedAt = Date.now();
      changed();
      ctx.toast('จำไว้แล้ว แก้หรือลืมได้ทุกเมื่อที่ ของฉัน › แมวจำอะไรไว้บ้าง');
    },
    memNo: (d) => {
      const m = byKey(d.key);
      forget(d.key);
      changed();
      ctx.toast('ลืมแล้ว จะไม่จำเรื่องนี้อีก', () => {
        delete state.memory.forgotten[d.key];
        if (m) state.memory.items.push(m);
        changed();
      });
    },
    memEditOpen: (d) => {
      ui.memEdit = d.key;
      ctx.renderSheet();
      document.querySelector('#sheet [name=mtext]')?.focus();
    },
    memKind: (d, el) => {
      state.settings.memoryKinds = { ...kindsOn(), [d.kind]: el.checked };
      changed();
    },
    memMaster: (d, el) => {
      state.settings.memory = el.checked;
      changed();
      ctx.toast(el.checked ? 'แมวจะจำเฉพาะที่เธออนุญาต' : 'ปิดความจำแล้ว แมวจะไม่เรียนรู้และไม่ใช้สิ่งที่จำไว้');
    },
    memUnforget: () => {
      state.memory.forgotten = {};
      refresh(true);
      changed();
    },
    memLead: (d) => {
      const b = state.bills.find((x) => x.id === d.id);
      if (!b) return;
      b.lead = Math.min(10, (b.lead ?? 3) + 2);
      changed();
      ctx.toast(`จะเตือน${b.title}ล่วงหน้า ${b.lead} วัน`);
    },
    patternMute: (d) => {
      state.patternMuted[d.id] = true;
      changed();
    },
    whyToggle: (d, el) => {
      state.settings.why = el.checked;
      changed();
    },
    inboxAutoToggle: (d, el) => {
      state.settings.inboxAuto = el.checked;
      changed();
    },
    whyClear: () => {
      const before = state.whyLog;
      state.whyLog = [];
      changed();
      ctx.toast('ลบคำตอบทั้งหมดแล้ว', () => {
        state.whyLog = before;
        changed();
      });
    },
    whyAnswer: (d) => {
      const q = question();
      if (!q) return;
      const t = today();
      const day = state.days[q.date];
      const context = q.kind === 'workout'
        ? whyContext({ day, events: state.events, date: q.date, planTime: day?.plan?.time ?? null, sleepHours: sleepHoursOf(day?.checkin) })
        : null;
      state.whyLog.push({ id: ctx.newId(), kind: q.kind, key: q.key, date: q.date, ref: q.ref ?? null, reason: d.reason, context, at: Date.now() });
      state.whyLog = state.whyLog.slice(-300);
      state.settings.whyAskedOn = t;
      if (d.reason === 'skip') state.settings.whyMutedUntil = addDays(t, 3);
      ctx.editDay(t).whyDone = { reason: d.reason, kind: q.kind };
      ctx.sfx.knock();
      changed();
    },
    whyClose: () => {
      const day = ctx.editDay(today());
      if (day.whyDone) day.whyDone.closed = true;
      changed();
    },
    // Offers from observations and from the why card, all in one place.
    patternAction: (d) => {
      const key = today();
      const a = d.action;
      if (d.id && d.id !== 'why-now') state.insightSeen[d.id] = key;
      if (a === 'lighten') {
        ctx.editDay(key).lighten = true;
        changed();
        ctx.toast('ลดโปรแกรมวันนี้ให้แล้ว ไม่ต้องฝืนนะ', () => {
          delete ctx.editDay(key).lighten;
          changed();
        });
      } else if (a === 'retime') {
        ctx.pushSheet({ type: 'retime' });
      } else if (RULE_TEXT[a]) {
        agree(a, 'เธอกดตกลงจากข้อสังเกตของแมว');
        changed();
        ctx.toast('ตกลงตามนี้ แมวจะจัดให้เองครั้งหน้า · ยกเลิกได้ที่ แมวจำอะไรไว้บ้าง');
      }
      const day = ctx.editDay(key);
      if (d.id === 'why-now' && day.whyDone) {
        day.whyDone.closed = true;
        changed();
      }
    },
    retimePick: (d) => {
      const p = state.profile;
      if (!p) return;
      p.slot = d.v;
      ctx.popSheet();
      changed();
      ctx.toast(`เปลี่ยนเวลาออกกำลังกายเป็นช่วง${SLOTS[d.v].label}แล้ว แมวจัดตารางใหม่ให้`);
    },
  };

  const forms = {
    memEdit: (form) => {
      const m = byKey(form.dataset.key);
      const text = form.elements.mtext.value.trim();
      if (!m || !text) return;
      m.text = text;
      m.edited = true;
      m.status = 'on';
      m.updatedAt = Date.now();
      ui.memEdit = null;
      changed();
      ctx.toast('แก้แล้ว แมวจะจำแบบที่เธอแก้');
    },
    memAdd: (form) => {
      const text = form.elements.mtext.value.trim();
      if (!text) return;
      tell(text);
      form.elements.mtext.value = '';
      changed();
      ctx.toast('จำไว้แล้ว');
    },
  };

  return {
    refresh, active, patterns, suggestion, renderMemory, renderRetime, learnCorrection, tell, forget, actions, forms,
  };
}
