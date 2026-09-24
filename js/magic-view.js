// Phase 2B on screen: the "จัดการให้หน่อย" button (does the right thing for
// the page you're on), "วันนี้ทำอะไรดี?" (three things, now), smart
// rescheduling of slipped tasks, and the health / money summaries.
// Logic lives in suggest.js, reschedule.js, arrange.js.
import { icon } from './icons.js';
import { mascot } from './art.js';
import { addDays, parseKey } from './health.js';
import { whatNow } from './suggest.js';
import { slippedTasks, proposeSlot, quietestDay, needsResize, smallerStep } from './reschedule.js';
import { billCycle, expenseSummary, monthOf, addMonths, EXPENSE_CATS } from './life.js';

export function createMagic(ctx) {
  const { state, ui, esc } = ctx;
  const on = (k) => state.settings.assist?.[k] !== false;
  const today = () => ctx.todayKey();
  const nowMin = () => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  };
  const changed = () => {
    ctx.save();
    ctx.render();
    ctx.renderSheet();
  };
  const dayLabel = (key) => (key === today() ? 'วันนี้' : key === addDays(today(), 1) ? 'พรุ่งนี้'
    : parseKey(key).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' }));
  const baht = (n) => `฿${Math.round(n).toLocaleString('th-TH')}`;

  // ---------- "จัดการให้หน่อย": one button, the right job for each page ----------
  const JOBS = {
    today: 'จัดวันนี้ใหม่',
    gym: 'จัดสุขภาพวันนี้',
    me: 'จัดสุขภาพวันนี้',
    food: 'จัดเมนู',
    money: 'จัดรายจ่าย',
    life: 'จัดสิ่งที่ค้างอยู่',
    week: 'จัดสิ่งที่ค้างอยู่',
  };
  const jobFor = (view) => (view === 'life' && ui.lifeTab === 'money' ? 'money' : view);
  function updateFab() {
    const fab = document.querySelector('#fab-magic');
    if (!fab) return;
    const job = JOBS[jobFor(ui.view)];
    fab.hidden = !on('magic') || !job || !state.profile;
    fab.setAttribute('aria-label', `จัดการให้หน่อย: ${job ?? ''}`);
    fab.title = job ?? '';
  }

  function magic() {
    const job = jobFor(ui.view);
    if (job === 'today') {
      const r = ctx.arrangeApply({ quiet: true });
      ctx.toast(r.changes ? `จัดวันนี้ใหม่แล้ว ปรับ ${r.changes} อย่าง · ดูเหตุผลได้ที่ "ทำไม?"` : 'แผนวันนี้ลงตัวอยู่แล้ว ไม่ต้องขยับอะไร', r.undo);
    } else if (job === 'gym' || job === 'me') {
      ctx.arrangeApply({ quiet: true });
      ctx.pushSheet({ type: 'healthday' });
    } else if (job === 'food') foodMagic();
    else if (job === 'money') ctx.pushSheet({ type: 'moneyday' });
    else {
      const t = ctx.computeToday();
      if (!slipped(t, true).length) ctx.toast('ไม่มีอะไรค้างเลย สบายใจได้');
      else ctx.pushSheet({ type: 'reschedule' });
    }
  }

  // ---------- "วันนี้ทำอะไรดี?" ----------
  function renderWhatNow() {
    const t = ctx.computeToday();
    const c = ctx.nowContext(t);
    const picks = whatNow(c);
    const btn = (p) => {
      const map = {
        leave: `data-act="leaveOpen" data-id="${p.ref ?? ''}"`, checkin: 'data-act="checkin"', bill: `data-act="billPaid" data-id="${p.ref}"`,
        meal: `data-act="meal" data-slot="${p.ref}" data-v="plan"`, workout: 'data-act="startFromAlert"', stretch: 'data-act="openExercise" data-id="mobility"',
        task: `data-act="evTick" data-id="${p.ref}"`, water: 'data-act="water" data-n="1"', relax: 'data-act="openExercise" data-id="breathe"',
      };
      const label = { bill: 'จ่ายแล้ว', meal: 'กินแล้ว', task: 'ทำแล้ว', water: 'ดื่มแล้ว' }[p.act] ?? 'เริ่มเลย';
      return `<button class="btn primary sm" ${map[p.act]} data-close="1">${label}</button>`;
    };
    return `${ctx.sheetTop('วันนี้ทำอะไรดี?')}
      <div class="sheet-mascot">${mascot(c.level === 'rest' || c.easy ? 'sleepy' : 'normal', { size: 84 })}</div>
      <div class="question">${c.free.minutes > 0 ? `ตอนนี้ว่างราว ${Math.min(c.free.minutes, 240)} นาที` : 'ตอนนี้ติดธุระอยู่'}</div>
      <p class="center small muted">${c.free.until ? `จนถึง ${c.free.until}${c.free.untilLabel ? ` (${esc(c.free.untilLabel)})` : ''} · ` : ''}แมวเลือกมา 3 อย่างที่ทำได้จริงตอนนี้</p>
      ${picks.map((p, i) => `<div class="card pick">
        <div class="row between"><span class="pick-n">${i + 1}</span><div class="grow"><div class="head">${esc(p.title)}</div>
          <div class="small muted">ราว ${p.minutes} นาที · ${esc(p.why)}</div></div></div>
        <div class="row gap-top">${btn(p)}</div>
      </div>`).join('')}
      <p class="small muted center">ไม่ต้องทำครบทั้งสาม เลือกอันเดียวก็พอ</p>`;
  }

  // ---------- smart rescheduling ----------
  function slipped(t, all = false) {
    if (!on('reschedule')) return [];
    return slippedTasks(state.events, t.key, nowMin()).filter((e) => all || e.askedOn !== t.key);
  }
  const propose = (e, skip = 0) => proposeSlot(e, { events: state.events, today: today(), nowMin: nowMin(), busyWeekdays: ctx.busyWeekdays(), skip });
  const whenText = (e) => (e.date < today() ? `ตั้งไว้${dayLabel(e.date)}` : `ตั้งไว้ ${e.time} น.`);

  function rescheduleCard(t) {
    const e = slipped(t)[0];
    if (!e) return '';
    if (ui.rsFor === e.id) {
      const p = propose(e, ui.rsSkip ?? 0);
      return `<div class="card rs-card">
        <div class="small muted row"><span class="card-ic">${icon('clock', { size: 18 })}</span>หาเวลาใหม่ให้ "${esc(e.title)}"</div>
        <p class="head">${dayLabel(p.date)}${p.time ? ` ${p.time} น.` : ''}</p>
        <p class="small muted">เพราะ${esc(p.why)}</p>
        <div class="row wrap">
          <button class="btn primary sm" data-act="rsAccept" data-id="${e.id}">ตกลง</button>
          <button class="btn ghost sm" data-act="rsNext">หาเวลาอื่น</button>
        </div></div>`;
    }
    if (needsResize(e)) {
      return `<div class="card rs-card">
        <div class="small muted row"><span class="card-ic">${icon('clock', { size: 18 })}</span>"${esc(e.title)}" เลื่อนมา ${e.moved} รอบแล้ว</div>
        <p class="head">ไม่เป็นไรเลย ลองแบ่งให้เล็กลง หรือย้ายไปวันที่ว่างกว่าดีไหม?</p>
        <div class="row wrap">
          <button class="btn primary sm" data-act="rsSmaller" data-id="${e.id}">เริ่มแค่ 15 นาที</button>
          <button class="btn soft sm" data-act="rsQuiet" data-id="${e.id}">ย้ายไปวันที่ว่าง</button>
          <button class="btn ghost sm" data-act="rsDrop" data-id="${e.id}">ไม่ต้องทำแล้ว</button>
        </div></div>`;
    }
    return `<div class="card rs-card">
      <div class="small muted row"><span class="card-ic">${icon('clock', { size: 18 })}</span>"${esc(e.title)}" ยังไม่ได้ทำ (${whenText(e)})</div>
      <p class="head">งานนี้ยังสำคัญอยู่ไหม?</p>
      <div class="row wrap">
        <button class="btn primary sm" data-act="rsKeep" data-id="${e.id}">ยังสำคัญ หาเวลาให้หน่อย</button>
        <button class="btn ghost sm" data-act="rsDrop" data-id="${e.id}">ไม่ต้องแล้ว</button>
      </div></div>`;
  }

  function renderReschedule() {
    const t = ctx.computeToday();
    const list = slipped(t, true);
    const rows = list.map((e) => {
      const p = propose(e, (ui.rsSkips ?? {})[e.id] ?? 0);
      return `<div class="card rs-row">
        <div class="head">${esc(e.title)}</div>
        <div class="small muted">${whenText(e)}${e.moved ? ` · เลื่อนมาแล้ว ${e.moved} รอบ` : ''}</div>
        <p class="small">แมวเสนอ: <b>${dayLabel(p.date)}${p.time ? ` ${p.time} น.` : ''}</b> · ${esc(p.why)}</p>
        <div class="row wrap">
          ${needsResize(e) ? `<button class="btn soft sm" data-act="rsSmaller" data-id="${e.id}">เริ่มแค่ 15 นาที</button>` : ''}
          <button class="btn soft sm" data-act="rsAccept" data-id="${e.id}" data-skip="${(ui.rsSkips ?? {})[e.id] ?? 0}">ตกลง</button>
          <button class="btn ghost sm" data-act="rsNextRow" data-id="${e.id}">เวลาอื่น</button>
          <button class="btn ghost sm" data-act="rsDrop" data-id="${e.id}">ไม่ต้องแล้ว</button>
        </div></div>`;
    }).join('');
    return `${ctx.sheetTop('จัดสิ่งที่ค้างอยู่')}
      <div class="question">${list.length ? `มี ${list.length} อย่างที่ยังไม่ได้ทำ` : 'ไม่มีอะไรค้างแล้ว'}</div>
      <p class="center small muted">ไม่เป็นไรเลย เดี๋ยวเราจัดใหม่ · อันไหนไม่สำคัญแล้วกด "ไม่ต้องแล้ว" ได้</p>
      ${rows}
      <div class="sheet-foot">
        ${list.length ? '<button class="btn primary big block" data-act="rsAll">ใช้เวลาที่แมวเสนอทั้งหมด</button>' : ''}
        <button class="btn ghost block" data-act="back">ปิด</button>
      </div>`;
  }

  function moveTo(e, p) {
    e.date = p.date;
    e.time = p.time;
    e.moved = (e.moved ?? 0) + 1;
    e.askedOn = today();
  }

  // ---------- health summary ("จัดสุขภาพวันนี้") ----------
  function renderHealthDay() {
    const t = ctx.computeToday();
    const h = ctx.healthSummary(t);
    const row = (ic, title, sub, btn = '') => `<div class="list-row"><span class="lr-ic">${icon(ic)}</span>
      <div class="grow"><span class="lr-title">${title}</span><br><span class="small muted">${sub}</span></div>${btn}</div>`;
    return `${ctx.sheetTop('สุขภาพวันนี้')}
      <div class="sheet-mascot">${mascot(h.mood, { size: 84 })}</div>
      <div class="question">แมวจัดให้แล้ว</div>
      <div class="card">
        ${h.checkin ? row('sun', `ความพร้อม ${h.checkin.score}`, esc(h.checkin.label)) : row('sun', 'ยังไม่ได้เช็กอิน', 'ตอบ 5 ข้อ แมวจะปรับความหนักให้พอดี', '<button class="btn soft sm" data-act="checkin">เช็กอิน</button>')}
        ${h.workout ? row('dumbbell', `${esc(h.workout.title)} · ${h.workout.time} น.`, esc(h.workout.why), h.workout.done ? '' : '<button class="btn primary sm" data-act="startFromAlert" data-close="1">เริ่ม</button>') : row('moon', 'วันพัก', 'ยืดเส้นเบาๆ ถ้าอยาก')}
        ${row('drop', `น้ำ ${h.water.have}/${h.water.goal} แก้ว`, esc(h.water.note), '<button class="btn soft sm" data-act="water" data-n="1">+1</button>')}
        ${row('steps', `เดิน ${h.steps.toLocaleString('th-TH')} ก้าว`, 'เป้าปรับตามความพร้อมวันนี้')}
        ${h.meals.length ? row('meal', `มื้อที่เหลือ ${h.meals.length} มื้อ`, esc(h.meals.join(' · '))) : ''}
        ${row('bed', `เข้านอน ${h.bed} น.`, esc(h.bedWhy))}
      </div>
      <div class="sheet-foot"><button class="btn primary big block" data-act="back">เรียบร้อย</button></div>`;
  }

  // ---------- money summary ("จัดรายจ่าย") ----------
  function renderMoneyDay() {
    const key = today();
    const ym = monthOf(key);
    const dayN = Number(key.slice(8));
    const cur = expenseSummary(state.expenses, ym);
    const prevYm = addMonths(ym, -1);
    const prevSoFar = state.expenses.filter((x) => x.date.startsWith(prevYm) && Number(x.date.slice(8)) <= dayN).reduce((a, x) => a + x.amount, 0);
    const bills = state.bills.map((b) => ({ b, c: billCycle(b, key) })).filter(({ c }) => !c.paid && c.status !== 'later')
      .sort((a, b) => a.c.due.localeCompare(b.c.due));
    const top = cur.byCat[0];
    const lines = [];
    if (prevSoFar > 0) {
      const diff = cur.total - prevSoFar;
      lines.push(diff > 0 ? `ถึงวันนี้ใช้ไป ${baht(cur.total)} มากกว่าช่วงเดียวกันเดือนก่อน ${baht(diff)}` : `ถึงวันนี้ใช้ไป ${baht(cur.total)} น้อยกว่าช่วงเดียวกันเดือนก่อน ${baht(-diff)} เก่งมาก`);
    } else lines.push(`เดือนนี้จดไว้ ${baht(cur.total)} (${cur.count} รายการ)`);
    if (top && cur.total) lines.push(`ใช้กับ${EXPENSE_CATS[top.cat]?.label ?? top.cat}มากสุด ${Math.round((top.amount / cur.total) * 100)}%`);
    if (cur.health.total) lines.push(`ลงทุนกับสุขภาพ ${baht(cur.health.total)}`);
    const todayCount = state.expenses.filter((x) => x.date === key).length;
    if (!todayCount) lines.push('วันนี้ยังไม่ได้จด ถ้าจำได้พิมพ์ใส่ "โยนไว้ก่อน" เช่น "ข้าวเที่ยง 60" ได้เลย');
    return `${ctx.sheetTop('จัดรายจ่าย')}
      <div class="sheet-mascot">${mascot('normal', { size: 84 })}</div>
      ${bills.length ? `<div class="card"><h2>ต้องจ่ายเร็วๆ นี้</h2>${bills.map(({ b, c }) => `<div class="list-row"><span class="lr-ic">${icon('receipt')}</span>
        <div class="grow"><span class="lr-title">${esc(b.title)}</span><br><span class="small muted">${c.status === 'overdue' ? 'ยังรอจ่าย จ่ายตอนสะดวกนะ' : c.status === 'today' ? 'ครบกำหนดวันนี้' : `อีก ${c.daysLeft} วัน`}${b.amount ? ` · ~${baht(b.amount)}` : ''}</span></div>
        <button class="btn soft sm" data-act="billPaid" data-id="${b.id}">จ่ายแล้ว</button></div>`).join('')}</div>` : ''}
      <div class="card"><h2>ภาพรวมเดือนนี้</h2><ul class="soft-list">${lines.map((l) => `<li>${l}</li>`).join('')}</ul></div>
      <div class="sheet-foot"><button class="btn primary big block" data-act="back">เรียบร้อย</button></div>`;
  }

  // ---------- "จัดเมนู" ----------
  function foodMagic() {
    const r = ctx.refreshMenus();
    ctx.toast(r.swapped ? `จัดเมนูแล้ว เปลี่ยน ${r.swapped} มื้อไม่ให้ซ้ำกับวันก่อนๆ` : 'เมนูสัปดาห์นี้หลากหลายดีอยู่แล้ว', r.undo);
  }

  const actions = {
    magic: () => magic(),
    whatNow: () => ctx.pushSheet({ type: 'whatnow' }),
    rsKeep: (d) => {
      ui.rsFor = d.id;
      ui.rsSkip = 0;
      ctx.render();
    },
    rsNext: () => {
      ui.rsSkip = (ui.rsSkip ?? 0) + 1;
      ctx.render();
    },
    rsNextRow: (d) => {
      ui.rsSkips = { ...(ui.rsSkips ?? {}), [d.id]: ((ui.rsSkips ?? {})[d.id] ?? 0) + 1 };
      ctx.renderSheet();
    },
    rsAccept: (d) => {
      const e = state.events.find((x) => x.id === d.id);
      if (!e) return;
      const before = { date: e.date, time: e.time, moved: e.moved };
      const p = propose(e, Number(d.skip ?? ui.rsSkip ?? 0));
      moveTo(e, p);
      ui.rsFor = null;
      changed();
      ctx.toast(`ย้าย "${e.title}" ไป${dayLabel(p.date)}${p.time ? ` ${p.time} น.` : ''} แล้ว`, () => {
        Object.assign(e, before);
        changed();
      });
    },
    rsAll: () => {
      const t = ctx.computeToday();
      const list = slipped(t, true);
      const before = list.map((e) => ({ e, date: e.date, time: e.time, moved: e.moved }));
      for (const e of list) moveTo(e, propose(e, (ui.rsSkips ?? {})[e.id] ?? 0));
      ctx.popSheet();
      changed();
      ctx.toast(`จัดเวลาใหม่ให้ ${list.length} อย่างแล้ว`, () => {
        for (const b of before) Object.assign(b.e, { date: b.date, time: b.time, moved: b.moved });
        changed();
      });
    },
    rsSmaller: (d) => {
      const e = state.events.find((x) => x.id === d.id);
      if (!e) return;
      const p = propose({ ...e, kind: 'personal' });
      const step = { id: ctx.newId(), kind: e.kind, title: smallerStep(e.title), date: p.date, time: p.time, done: false, remind: true, lead: null, createdAt: Date.now(), from: 'resize', parent: e.id };
      state.events.push(step);
      const before = { date: e.date, time: e.time, moved: e.moved };
      e.date = quietestDay(state.events, today(), { busyWeekdays: ctx.busyWeekdays() });
      e.time = null;
      e.moved = 0;
      e.askedOn = today();
      changed();
      ctx.toast(`เพิ่ม "${step.title}" ${dayLabel(p.date)}${p.time ? ` ${p.time} น.` : ''} ที่เหลือค่อยทำ${dayLabel(e.date)}`, () => {
        state.events = state.events.filter((x) => x.id !== step.id);
        Object.assign(e, before);
        changed();
      });
    },
    rsQuiet: (d) => {
      const e = state.events.find((x) => x.id === d.id);
      if (!e) return;
      const before = { date: e.date, time: e.time, moved: e.moved };
      e.date = quietestDay(state.events, today(), { busyWeekdays: ctx.busyWeekdays() });
      e.time = null;
      e.moved = (e.moved ?? 0) + 1;
      e.askedOn = today();
      changed();
      ctx.toast(`ย้ายไป${dayLabel(e.date)} ซึ่งว่างที่สุดในสัปดาห์`, () => {
        Object.assign(e, before);
        changed();
      });
    },
    rsDrop: (d) => {
      const e = state.events.find((x) => x.id === d.id);
      if (!e) return;
      e.done = true;
      e.dropped = true;
      e.doneAt = Date.now();
      ui.rsFor = null;
      changed();
      ctx.toast(`เอา "${e.title}" ออกแล้ว ไม่เป็นไรเลย`, () => {
        e.done = false;
        delete e.dropped;
        changed();
      });
    },
    assistToggle: (d, el) => {
      state.settings.assist = { ...(state.settings.assist ?? {}), [d.k]: el.checked };
      ctx.save();
      ctx.render();
      updateFab();
    },
  };

  return {
    updateFab, rescheduleCard, renderWhatNow, renderReschedule, renderHealthDay, renderMoneyDay, actions, on,
  };
}
