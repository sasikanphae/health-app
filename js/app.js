import {
  dateKey, parseKey, addDays, isGymDay, emptyDay, readiness, tasksForDay, dueReminders,
  prepDone, SLEEP_HOURS, LEVELS,
} from './health.js';
import {
  TASKS, MOODS, BODY_PARTS, SORENESS, SLEEP_QUALITY, STRESS, ENERGY, LEVEL_ADVICE, WEEKDAYS,
  MACHINES, MACHINE_GROUPS, GUIDE_TIPS,
} from './data.js';
import { load, save as persist, newId, normalize, defaultState } from './store.js';

const state = load();
const ui = {
  view: 'home',
  viewDate: dateKey(), // the day being logged on the home screen (can be in the past)
  lastToday: dateKey(),
  gymGroup: 'all',
  prepEdit: false,
  wizard: null,
  machine: null,
};
let swReg = null;

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const todayKey = () => dateKey();
const thaiDate = (key, opts = { weekday: 'long', day: 'numeric', month: 'long' }) =>
  parseKey(key).toLocaleDateString('th-TH', opts);
const hhmm = (ms) => new Date(ms).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
const partLabel = (id) => BODY_PARTS.find((p) => p.id === id)?.label ?? id;

function save() {
  try {
    persist(state);
  } catch {
    toast('บันทึกไม่สำเร็จ: พื้นที่จัดเก็บเต็มหรือถูกปิดไว้');
  }
}

const getDay = (key) => state.days[key] ?? emptyDay();
function editDay(key) {
  state.days[key] ??= emptyDay();
  return state.days[key];
}

// ---------- toast with undo ----------
let toastTimer;
let undoFn = null;
function toast(msg, undo) {
  $('#toast-text').textContent = msg;
  undoFn = undo ?? null;
  $('#toast-undo').hidden = !undo;
  $('#toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, undo ? 4500 : 2200);
}
function hideToast() {
  $('#toast').classList.remove('show');
  undoFn = null;
}
$('#toast-undo').addEventListener('click', () => {
  const fn = undoFn;
  hideToast();
  fn?.();
});

// ---------- logging ----------
function addWater(key, delta, { quiet = false } = {}) {
  const day = editDay(key);
  if (delta > 0) {
    day.water += 1;
    day.waterAt.push(Date.now());
  } else if (day.water > 0) {
    day.water -= 1;
    day.waterAt.pop();
  } else {
    return;
  }
  save();
  render();
  if (delta > 0 && !quiet) {
    const goal = state.settings.waterGoal;
    toast(day.water === goal ? `ครบ ${goal} แก้วแล้ว เยี่ยม 🎉` : `ดื่มน้ำแก้วที่ ${day.water} แล้ว`,
      () => addWater(key, -1, { quiet: true }));
  }
}

function setMood(key, value) {
  const day = editDay(key);
  const prev = day.mood;
  day.mood = value;
  save();
  render();
  const m = MOODS.find((x) => x.value === value);
  toast(`บันทึกอารมณ์: ${m.emoji} ${m.label}`, () => {
    editDay(key).mood = prev;
    save();
    render();
  });
}

// ---------- rendering: home ----------
function readinessCard(key, checkin) {
  const lv = LEVELS[checkin.level];
  const sore = checkin.verySore.length
    ? `<div class="small">เลี่ยงส่วนที่เมื่อยมาก: ${checkin.verySore.map(partLabel).join(', ')}</div>` : '';
  return `<button class="task ready ${checkin.level}" data-act="checkin" data-date="${key}">
    <div class="score-wrap"><div class="score" style="--p:${checkin.score}"></div><b>${checkin.score}</b></div>
    <div class="grow">
      <div class="muted small">ความพร้อม${key === todayKey() ? 'วันนี้' : ''} · แตะเพื่อแก้</div>
      <div class="level">${lv.icon} ${lv.label}</div>
      ${sore}
    </div>
  </button>`;
}

function taskHtml(task, key, day) {
  const t = TASKS[task.type];
  const done = task.done ? ' done' : '';
  const head = (sub, extra = '') => `<div class="task-head">
    <span class="task-icon">${t.icon}</span>
    <div class="grow"><div class="task-title">${t.label}</div>${sub ? `<div class="muted small">${sub}</div>` : ''}</div>
    ${extra}</div>`;

  switch (task.type) {
    case 'checkin':
      return `<button class="task${done}" data-act="checkin" data-date="${key}">
        ${head('5 คำถามสั้นๆ แตะตอบข้อละครั้ง', '<span class="chev">›</span>')}</button>`;
    case 'water': {
      const goal = state.settings.waterGoal;
      const glasses = Array.from({ length: Math.max(goal, day.water) }, (_, i) =>
        `<span class="${i < day.water ? 'full' : ''}">🥛</span>`).join('');
      return `<div class="card task${done}">
        ${head(`${day.water} / ${goal} แก้ว`, `
          <button class="icon-btn" data-act="water" data-n="-1" data-date="${key}" aria-label="ลบ 1 แก้ว" ${day.water ? '' : 'disabled'}>−</button>
          <button class="btn primary big" data-act="water" data-n="1" data-date="${key}">+1 แก้ว</button>`)}
        <div class="glasses" aria-hidden="true">${glasses}</div>
      </div>`;
    }
    case 'mood': {
      const cur = MOODS.find((m) => m.value === day.mood);
      return `<div class="card task${done}">
        ${head(cur ? `${cur.label} · แตะเพื่อเปลี่ยน` : 'แตะอีโมจิที่ตรงที่สุด')}
        ${moodButtons(key, day.mood)}
      </div>`;
    }
    case 'gym': {
      const n = state.checklist.filter((c) => day.prep.includes(c.id)).length;
      const note = day.checkin?.level === 'rest' ? ' · วันนี้แนะนำให้พัก ข้ามได้' : '';
      return `<button class="task${done}" data-act="tab" data-view="prep">
        ${head(`${n} / ${state.checklist.length} ชิ้น${note}`, '<span class="chev">›</span>')}</button>`;
    }
    default: return '';
  }
}

function moodButtons(key, selected) {
  return `<div class="emojis" role="group" aria-label="อารมณ์">${MOODS.map((m) =>
    `<button data-act="mood" data-v="${m.value}" data-date="${key}" aria-label="${m.label}"
      aria-pressed="${m.value === selected}">${m.emoji}</button>`).join('')}</div>`;
}

function renderHome() {
  const key = ui.viewDate;
  const isToday = key === todayKey();
  const day = getDay(key);
  let tasks = tasksForDay({ day, key, settings: state.settings, checklist: state.checklist });
  // Gym prep is about getting out the door today; it makes no sense to backfill.
  if (!isToday) tasks = tasks.filter((t) => t.type !== 'gym');
  // Once checked in, the readiness card replaces the check-in task.
  const todo = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done && t.type !== 'checkin');

  $('#view-home').innerHTML = `
    <div class="datebar">
      <button class="icon-btn" data-act="dateShift" data-n="-1" aria-label="วันก่อนหน้า">‹</button>
      <label class="datepick grow center">
        <b>${isToday ? 'วันนี้' : thaiDate(key, { weekday: 'long' })}</b>
        <span class="muted small">${thaiDate(key, { day: 'numeric', month: 'long', year: 'numeric' })} ▾</span>
        <input type="date" data-change="date" value="${key}" max="${todayKey()}" aria-label="เลือกวันที่">
      </label>
      <button class="icon-btn" data-act="dateShift" data-n="1" aria-label="วันถัดไป" ${isToday ? 'disabled' : ''}>›</button>
    </div>
    ${isToday ? '' : `<div class="backfill"><span>กำลังบันทึกย้อนหลัง</span><button data-act="dateToday">กลับไปวันนี้</button></div>`}
    ${day.checkin ? readinessCard(key, day.checkin) : ''}
    <div class="section-title">${isToday ? 'ยังไม่ได้ทำ' : 'ยังไม่ได้บันทึก'}</div>
    ${todo.length ? todo.map((t) => taskHtml(t, key, day)).join('')
    : `<div class="all-done"><b>🌿</b>${isToday ? 'ครบแล้วสำหรับวันนี้ พักได้เลย' : 'วันนี้บันทึกครบแล้ว'}</div>`}
    ${done.length ? `<div class="section-title">ทำแล้ว</div>${done.map((t) => taskHtml(t, key, day)).join('')}` : ''}
  `;
}

// ---------- rendering: reminders ----------
function currentDue(now = Date.now()) {
  const key = todayKey();
  return dueReminders({
    reminders: state.settings.reminders,
    day: getDay(key),
    key,
    now,
    log: state.reminderLog[key] ?? {},
    settings: state.settings,
    checklist: state.checklist,
  });
}

function alertHtml(r) {
  const key = todayKey();
  const t = TASKS[r.type];
  const main = {
    water: `<button class="btn primary big block" data-act="water" data-n="1" data-date="${key}">ดื่มแล้ว +1 แก้ว</button>`,
    mood: moodButtons(key, null).replace('class="emojis"', 'class="emojis all-on"'),
    checkin: `<button class="btn primary big block" data-act="checkin" data-date="${key}">เริ่มเช็กอิน</button>`,
    gym: '<button class="btn primary big block" data-act="tab" data-view="prep">เปิดเช็กลิสต์</button>',
  }[r.type];
  return `<div class="alert" role="alert">
    <div class="row between"><span class="alert-title">⏰ ${t.reminder}</span><span class="muted small">${r.time} น.</span></div>
    <div style="margin-top:8px">${main}</div>
    <div class="actions">
      <button class="btn" data-act="snooze" data-id="${r.id}" data-min="10">เลื่อน 10 นาที</button>
      <button class="btn" data-act="snooze" data-id="${r.id}" data-min="60">1 ชั่วโมง</button>
      <button class="btn plain" data-act="skip" data-id="${r.id}">ข้ามครั้งนี้</button>
    </div>
  </div>`;
}

function renderAlerts(due = currentDue()) {
  $('#alerts').innerHTML = due.map((d) => alertHtml(d.reminder)).join('');
}

function reminderEntry(id) {
  const log = (state.reminderLog[todayKey()] ??= {});
  return (log[id] ??= {});
}

function snooze(id, minutes) {
  const until = Date.now() + minutes * 60_000;
  reminderEntry(id).snoozeUntil = until;
  save();
  renderAlerts();
  toast(`จะเตือนอีกครั้งตอน ${hhmm(until)} น.`);
}

function skip(id) {
  const entry = reminderEntry(id);
  entry.skipped = true;
  save();
  renderAlerts();
  toast('ข้ามครั้งนี้แล้ว', () => {
    delete reminderEntry(id).skipped;
    save();
    renderAlerts();
  });
}

function notify(r) {
  if (document.visibilityState === 'visible') {
    navigator.vibrate?.(200);
    return;
  }
  if (!swReg || !('Notification' in window) || Notification.permission !== 'granted') return;
  const t = TASKS[r.type];
  const actions = [{ action: 'snooze', title: 'เลื่อน 10 นาที' }];
  if (r.type === 'water') actions.unshift({ action: 'water', title: 'ดื่มแล้ว +1' });
  swReg.showNotification(`${t.icon} ${t.reminder}`, {
    body: 'แตะเพื่อบันทึก หรือกดเลื่อนเตือน',
    tag: r.id,
    renotify: true,
    icon: 'icons/icon.svg',
    data: { id: r.id, type: r.type },
    actions,
  }).catch(() => {});
}

function tick() {
  const key = todayKey();
  if (key !== ui.lastToday) {
    // A new day started while the app was open; follow it unless the user is backfilling.
    if (ui.viewDate === ui.lastToday) ui.viewDate = key;
    ui.lastToday = key;
    render();
  }
  const due = currentDue();
  let changed = false;
  for (const d of due) {
    if (!d.notify) continue;
    reminderEntry(d.reminder.id).notifiedAt = Date.now();
    notify(d.reminder);
    changed = true;
  }
  if (changed) save();
  renderAlerts(due);
}

// Handles taps on notification buttons (via the service worker) and ?r= links.
function handleReminderAction({ id, type, action }) {
  const key = todayKey();
  if (action === 'snooze') return snooze(id, 10);
  if (action === 'water') return addWater(key, 1);
  ui.viewDate = key;
  if (type === 'gym') return showView('prep');
  showView('home');
  if (type === 'checkin' && !getDay(key).checkin) openCheckin(key);
}

// ---------- sheet ----------
function openSheet() {
  if ($('#sheet').hidden) history.pushState({ sheet: true }, '');
  $('#sheet').hidden = false;
  document.body.style.overflow = 'hidden';
}
function hideSheet() {
  $('#sheet').hidden = true;
  document.body.style.overflow = '';
  ui.wizard = null;
  ui.machine = null;
  render();
}
function closeSheet() {
  // Go through history so the phone's back button and the ✕ behave the same.
  if (history.state?.sheet) history.back();
  else hideSheet();
}
window.addEventListener('popstate', () => {
  if (!$('#sheet').hidden) hideSheet();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('#sheet').hidden) closeSheet();
});

// ---------- morning check-in ----------
const STEPS = [
  { field: 'sleepHours', q: 'เมื่อคืนนอนไปกี่ชั่วโมง?', options: SLEEP_HOURS.map((s) => ({ value: s.id, emoji: '🌙', label: s.label })) },
  { field: 'sleepQuality', q: 'หลับดีแค่ไหน?', options: SLEEP_QUALITY },
  { field: 'soreness', q: 'ตอนนี้เมื่อยตรงไหนบ้าง?' },
  { field: 'stress', q: 'ความเครียดตอนนี้?', options: STRESS },
  { field: 'energy', q: 'พลังงานตอนนี้?', options: ENERGY },
];

function openCheckin(key) {
  const existing = getDay(key).checkin;
  ui.wizard = {
    key,
    step: 0,
    answers: existing ? structuredClone(existing.answers) : { soreness: {} },
  };
  openSheet();
  renderWizard();
}

function finishCheckin() {
  const w = ui.wizard;
  const result = readiness(w.answers);
  editDay(w.key).checkin = { answers: w.answers, ...result, at: Date.now() };
  save();
  w.step = STEPS.length;
  renderWizard();
}

function renderWizard() {
  const w = ui.wizard;
  if (!w) return;
  const body = $('#sheet-body');
  const isPast = w.key !== todayKey();

  if (w.step >= STEPS.length) {
    const c = getDay(w.key).checkin;
    const lv = LEVELS[c.level];
    body.innerHTML = `
      <div class="sheet-top"><span></span><button class="icon-btn" data-act="sheetClose" aria-label="ปิด">✕</button></div>
      <div class="result ready ${c.level}">
        <p class="muted">${isPast ? `ความพร้อม ${thaiDate(w.key)}` : 'ความพร้อมวันนี้'}</p>
        <div class="score-wrap"><div class="score" style="--p:${c.score}"></div><b>${c.score}</b></div>
        <div class="level">${lv.icon} ${lv.label}</div>
      </div>
      <div class="card">
        <p>${LEVEL_ADVICE[c.level]}</p>
        ${c.verySore.length ? `<p><b>เลี่ยงส่วนที่เมื่อยมาก:</b> ${c.verySore.map(partLabel).join(', ')}</p>` : ''}
        ${c.reasons.length ? `<p class="muted small">ปัจจัยที่ทำให้คะแนนลดลง: ${c.reasons.join(' · ')}</p>` : ''}
      </div>
      <p class="muted small center">เป็นคำแนะนำคร่าวๆ ฟังร่างกายตัวเองเป็นหลัก ถ้ามีอาการเจ็บหรือผิดปกติควรปรึกษาแพทย์</p>
      <div class="sheet-foot">
        <button class="btn primary big block" data-act="sheetClose">เสร็จ</button>
        <button class="btn plain block" data-act="wizRestart">แก้คำตอบ</button>
      </div>`;
    return;
  }

  const step = STEPS[w.step];
  const dots = STEPS.map((_, i) => `<i class="${i <= w.step ? 'on' : ''}"></i>`).join('');
  let content;
  let foot = '';
  if (step.field === 'soreness') {
    const s = w.answers.soreness;
    content = `<p class="muted">แตะส่วนที่เมื่อย แตะซ้ำเพื่อเพิ่มระดับ</p>
      <div class="sore-grid">${BODY_PARTS.map((p) => {
        const lv = s[p.id] ?? 0;
        return `<button class="sore" data-act="wizSore" data-part="${p.id}" data-level="${lv}">
          <b>${p.label}</b><small>${SORENESS[lv]}</small></button>`;
      }).join('')}</div>`;
    const any = Object.values(s).some((v) => v > 0);
    foot = `<div class="sheet-foot"><button class="btn primary big block" data-act="wizNext">${any ? 'ต่อไป' : 'ไม่เมื่อยเลย · ต่อไป'}</button></div>`;
  } else {
    const cur = w.answers[step.field];
    content = `<div class="options">${step.options.map((o) =>
      `<button class="option" data-act="wizPick" data-v="${o.value}" aria-pressed="${o.value === cur}">
        <span class="emo">${o.emoji}</span>${o.label}</button>`).join('')}</div>`;
  }

  body.innerHTML = `
    <div class="sheet-top">
      <button class="icon-btn" data-act="wizBack" aria-label="ย้อนกลับ">‹</button>
      <div class="dots" aria-label="ข้อ ${w.step + 1} จาก ${STEPS.length}">${dots}</div>
      <button class="icon-btn" data-act="sheetClose" aria-label="ปิด">✕</button>
    </div>
    ${isPast ? `<p class="muted small center">บันทึกย้อนหลังของ${thaiDate(w.key)}</p>` : ''}
    <div class="question">${step.q}</div>
    ${content}
    ${foot}`;
}

function wizardNext() {
  const w = ui.wizard;
  if (w.step === STEPS.length - 1) finishCheckin();
  else {
    w.step += 1;
    renderWizard();
  }
}

// ---------- rendering: gym guide ----------
function sorenessFor(machine) {
  const soreness = getDay(todayKey()).checkin?.answers.soreness ?? {};
  return Math.max(0, ...machine.parts.map((p) => soreness[p] ?? 0));
}

function soreBadge(machine) {
  const lv = sorenessFor(machine);
  if (lv === 2) return '<span class="badge bad">เมื่อยมาก · เลี่ยงวันนี้</span>';
  if (lv === 1) return '<span class="badge warn">เมื่อยนิดหน่อย · เล่นเบา</span>';
  return '';
}

function savedSummary(id) {
  const m = state.machines[id];
  if (!m) return '';
  const parts = Object.entries(m.fields ?? {}).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`);
  if (m.weight) parts.push(`${m.weight} กก.`);
  return parts.join(' · ');
}

function renderGym() {
  const list = MACHINES.filter((m) => ui.gymGroup === 'all' || m.group === ui.gymGroup);
  const groups = [{ id: 'all', label: 'ทั้งหมด' }, ...MACHINE_GROUPS];
  $('#view-gym').innerHTML = `
    <h1>คู่มือเครื่องเล่น</h1>
    <p class="muted small">แตะเครื่องเพื่อดูวิธีปรับ ท่าที่ถูก และค่าที่บันทึกไว้</p>
    <div class="row wrap" style="margin:10px 0">${groups.map((g) =>
      `<button class="chip" data-act="gymGroup" data-group="${g.id}" aria-pressed="${ui.gymGroup === g.id}">${g.label}</button>`).join('')}</div>
    ${list.map((m) => {
      const mine = savedSummary(m.id);
      return `<button class="task machine" data-act="machine" data-id="${m.id}">
        <div class="row between"><div class="grow">
          <div class="task-title">${m.th}</div>
          <div class="muted small">${m.name} · ${m.muscles.map((x) => x.split(' (')[0]).join(', ')}</div>
        </div><span class="chev">›</span></div>
        <div class="row wrap" style="margin-top:6px">${soreBadge(m)}${mine ? `<span class="badge mine">ของฉัน: ${esc(mine)}</span>` : ''}</div>
      </button>`;
    }).join('')}
    <div class="card"><h2>เคล็ดลับทั่วไป</h2><ul>${GUIDE_TIPS.map((t) => `<li>${t}</li>`).join('')}</ul></div>`;
}

function openMachine(id) {
  ui.machine = id;
  openSheet();
  renderMachine();
}

function renderMachine() {
  const m = MACHINES.find((x) => x.id === ui.machine);
  if (!m) return;
  const mine = state.machines[m.id] ?? {};
  $('#sheet-body').innerHTML = `
    <div class="sheet-top">
      <button class="icon-btn" data-act="sheetClose" aria-label="ย้อนกลับ">‹</button>
      <span class="muted small">คู่มือเครื่องเล่น</span><span style="width:44px"></span>
    </div>
    <h1>${m.th}</h1>
    <p class="muted">${m.name}</p>
    <div class="row wrap">${soreBadge(m)}</div>
    <div class="tags" style="margin:10px 0">${m.muscles.map((x) => `<span>${x}</span>`).join('')}</div>

    <form class="card form-grid" data-form="machine" data-id="${m.id}">
      <h2>ค่าของฉัน</h2>
      ${m.fields.map((f, i) => `<label>${f}
        <input type="text" name="f${i}" value="${esc(mine.fields?.[f])}" placeholder="เช่น 4 หรือ รูที่ 3" autocomplete="off"></label>`).join('')}
      <label>น้ำหนัก (กก.)
        <div class="row">
          <button type="button" class="btn" data-act="machineWeight" data-n="-2.5" aria-label="ลด 2.5 กก.">−2.5</button>
          <input type="number" name="weight" inputmode="decimal" step="0.5" min="0" value="${esc(mine.weight)}" class="grow center">
          <button type="button" class="btn" data-act="machineWeight" data-n="2.5" aria-label="เพิ่ม 2.5 กก.">+2.5</button>
        </div></label>
      <label>โน้ต<textarea name="note" placeholder="เช่น เซ็ตสุดท้ายยังไหว เพิ่มได้">${esc(mine.note)}</textarea></label>
      <button class="btn primary big block">บันทึกค่า</button>
      ${mine.updatedAt ? `<p class="muted small center">บันทึกล่าสุด ${thaiDate(dateKey(new Date(mine.updatedAt)), { day: 'numeric', month: 'short' })}</p>` : ''}
    </form>

    <div class="card"><h2>วิธีปรับเครื่อง</h2><ol>${m.setup.map((s) => `<li>${s}</li>`).join('')}</ol></div>
    <div class="card"><h2>ท่าที่ถูกต้อง</h2><ul>${m.form.map((s) => `<li>${s}</li>`).join('')}</ul></div>
    <div class="card"><h2>ข้อผิดพลาดที่พบบ่อย</h2><ul>${m.mistakes.map((s) => `<li>${s}</li>`).join('')}</ul></div>`;
}

// ---------- rendering: gym prep checklist ----------
function renderPrep() {
  const key = todayKey();
  const day = getDay(key);
  const total = state.checklist.length;
  const n = state.checklist.filter((c) => day.prep.includes(c.id)).length;
  const gymToday = isGymDay(key, state.settings.gymDays);
  const allDone = prepDone(day, state.checklist);

  $('#view-prep').innerHTML = `
    <div class="row between"><h1>เตรียมของไปยิม</h1>
      <button class="btn plain" data-act="prepEdit">${ui.prepEdit ? 'เสร็จ' : 'แก้ไขรายการ'}</button></div>
    ${gymToday ? '' : '<p class="muted small">วันนี้ไม่ใช่วันเข้ายิมที่ตั้งไว้ แต่ใช้เช็กลิสต์ได้ตามปกติ</p>'}
    <p class="muted">${allDone ? 'ครบแล้ว พร้อมไปได้เลย 🎉' : `หยิบแล้ว ${n} / ${total} ชิ้น`}</p>
    <div class="progress"><div style="width:${total ? (n / total) * 100 : 0}%"></div></div>
    <div style="margin-top:8px">
    ${state.checklist.map((c) => {
      const checked = day.prep.includes(c.id);
      if (ui.prepEdit) {
        return `<div class="check"><span class="label grow">${esc(c.text)}</span>
          <button class="icon-btn" data-act="prepDelete" data-id="${c.id}" aria-label="ลบ ${esc(c.text)}">✕</button></div>`;
      }
      return `<button class="check" role="checkbox" aria-checked="${checked}" data-act="prepToggle" data-id="${c.id}">
        <span class="box">${checked ? '✓' : ''}</span><span class="label">${esc(c.text)}</span></button>`;
    }).join('')}
    </div>
    ${ui.prepEdit ? `<form class="row" data-form="prepAdd" style="margin-top:8px">
        <input type="text" name="text" placeholder="เพิ่มของที่ต้องเตรียม" required maxlength="60" autocomplete="off">
        <button class="btn primary">เพิ่ม</button></form>`
    : (n ? '<button class="btn plain block" data-act="prepReset">ล้างเครื่องหมายทั้งหมด</button>' : '')}`;
}

// ---------- rendering: settings ----------
function renderSettings() {
  const s = state.settings;
  const order = [1, 2, 3, 4, 5, 6, 0];
  const reminders = [...s.reminders].sort((a, b) => a.time.localeCompare(b.time));
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  const permText = {
    granted: '✅ เปิดการแจ้งเตือนแล้ว',
    denied: '🚫 การแจ้งเตือนถูกปิดไว้ เปิดได้ในการตั้งค่าของเบราว์เซอร์',
    default: 'ยังไม่ได้เปิดการแจ้งเตือนของระบบ',
    unsupported: 'เบราว์เซอร์นี้ยังไม่รองรับการแจ้งเตือน (บน iPhone ต้อง "เพิ่มไปยังหน้าจอโฮม" ก่อน)',
  }[perm];

  $('#view-settings').innerHTML = `
    <h1>ตั้งค่า</h1>

    <div class="card">
      <h2>เป้าหมายดื่มน้ำต่อวัน</h2>
      <div class="stepper">
        <button class="btn" data-act="goal" data-n="-1" aria-label="ลดเป้า">−</button>
        <b>${s.waterGoal}</b><span>แก้ว (${(s.waterGoal * 0.25).toFixed(s.waterGoal % 4 ? 2 : 0)} ลิตร)</span>
        <button class="btn" data-act="goal" data-n="1" aria-label="เพิ่มเป้า">+</button>
      </div>
    </div>

    <div class="card">
      <h2>วันเข้ายิม</h2>
      <p class="muted small">วันที่เลือกจะมีรายการ "เตรียมของไปยิม" ในหน้าแรก</p>
      <div class="weekdays">${order.map((d) =>
        `<button class="chip" data-act="gymDay" data-d="${d}" aria-pressed="${s.gymDays.includes(d)}">${WEEKDAYS[d]}</button>`).join('')}</div>
    </div>

    <div class="card">
      <h2>การแจ้งเตือน</h2>
      <p class="small">${permText}</p>
      ${perm === 'default' ? '<button class="btn primary block" data-act="notifyEnable">เปิดการแจ้งเตือน</button>' : ''}
      ${perm === 'granted' ? '<button class="btn block" data-act="notifyTest">ลองส่งแจ้งเตือน</button>' : ''}
      <p class="muted small">การแจ้งเตือนจะเด้งขณะที่แอพเปิดอยู่หรือพับไว้เบื้องหลัง ถ้าปิดแอพไปแล้ว รายการที่ถึงเวลาจะรออยู่ด้านบนเมื่อเปิดแอพครั้งถัดไป</p>
      <h3>เวลาเตือน</h3>
      ${reminders.map((r) => `<div class="rem-row">
        <span class="task-icon">${TASKS[r.type].icon}</span>
        <label class="grow rem-time"><span class="small muted">${TASKS[r.type].label}</span>
          <input type="time" value="${r.time}" data-change="remTime" data-id="${r.id}"></label>
        <label class="switch" aria-label="เปิด/ปิด"><input type="checkbox" data-change="remEnabled" data-id="${r.id}" ${r.enabled ? 'checked' : ''}><span></span></label>
        <button class="icon-btn" data-act="remDelete" data-id="${r.id}" aria-label="ลบเวลาเตือน">✕</button>
      </div>`).join('') || '<p class="muted small">ยังไม่มีเวลาเตือน</p>'}
      <form class="row" data-form="remAdd" style="margin-top:10px">
        <select name="type" aria-label="ประเภท">${Object.entries(TASKS).map(([k, t]) =>
          `<option value="${k}">${t.icon} ${t.short}</option>`).join('')}</select>
        <input type="time" name="time" value="12:00" required aria-label="เวลา" style="width:auto;min-width:120px">
        <button class="btn primary">เพิ่ม</button>
      </form>
    </div>

    <div class="card">
      <h2>ข้อมูล</h2>
      <p class="muted small">ข้อมูลทั้งหมดเก็บอยู่ในเครื่องนี้เท่านั้น แนะนำให้ส่งออกเก็บไว้เป็นระยะ</p>
      <div class="row wrap">
        <button class="btn grow" data-act="export">ส่งออก</button>
        <label class="btn grow center" style="display:grid;place-items:center">นำเข้า
          <input type="file" accept="application/json" data-change="import" hidden></label>
        <button class="btn danger grow" data-act="reset">ล้างข้อมูล</button>
      </div>
    </div>
    <p class="muted small center">แอพนี้ใช้ติดตามสุขภาพเบื้องต้น ไม่สามารถใช้แทนคำแนะนำของแพทย์ได้</p>`;
}

// ---------- view switching ----------
function showView(view) {
  ui.view = view;
  document.querySelectorAll('.tabs [data-view]').forEach((t) =>
    t.setAttribute('aria-selected', String(t.dataset.view === view)));
  document.querySelectorAll('.view').forEach((v) =>
    v.classList.toggle('active', v.id === `view-${view}`));
  if (!$('#sheet').hidden) {
    // Close synchronously (not via history.back) so a sheet opened right after isn't closed by a late popstate.
    if (history.state?.sheet) history.replaceState(null, '');
    hideSheet();
  } else {
    render();
  }
  window.scrollTo(0, 0);
}

function render() {
  renderHome();
  renderGym();
  renderPrep();
  renderSettings();
  renderAlerts();
  if (ui.machine) renderMachine();
}

// ---------- events ----------
const actions = {
  tab: (d) => showView(d.view),
  water: (d) => addWater(d.date ?? ui.viewDate, Number(d.n)),
  mood: (d) => setMood(d.date ?? ui.viewDate, Number(d.v)),
  checkin: (d) => openCheckin(d.date ?? ui.viewDate),
  dateShift: (d) => {
    const next = addDays(ui.viewDate, Number(d.n));
    if (next <= todayKey()) ui.viewDate = next;
    renderHome();
  },
  dateToday: () => {
    ui.viewDate = todayKey();
    renderHome();
  },
  snooze: (d) => snooze(d.id, Number(d.min)),
  skip: (d) => skip(d.id),

  sheetClose: () => closeSheet(),
  wizPick: (d) => {
    const w = ui.wizard;
    const field = STEPS[w.step].field;
    w.answers[field] = field === 'sleepHours' ? d.v : Number(d.v);
    renderWizard();
    setTimeout(wizardNext, 180); // brief pause so the tap visibly registers
  },
  wizSore: (d) => {
    const s = ui.wizard.answers.soreness;
    s[d.part] = ((s[d.part] ?? 0) + 1) % SORENESS.length;
    renderWizard();
  },
  wizNext: () => wizardNext(),
  wizBack: () => {
    const w = ui.wizard;
    if (w.step === 0) closeSheet();
    else {
      w.step -= 1;
      renderWizard();
    }
  },
  wizRestart: () => {
    ui.wizard.step = 0;
    renderWizard();
  },

  gymGroup: (d) => {
    ui.gymGroup = d.group;
    renderGym();
  },
  machine: (d) => openMachine(d.id),
  machineWeight: (d, el) => {
    const input = el.closest('form').weight;
    input.value = Math.max(0, (Number(input.value) || 0) + Number(d.n));
  },

  prepToggle: (d) => {
    const day = editDay(todayKey());
    const wasDone = prepDone(day, state.checklist);
    day.prep = day.prep.includes(d.id) ? day.prep.filter((x) => x !== d.id) : [...day.prep, d.id];
    save();
    render();
    if (!wasDone && prepDone(day, state.checklist)) toast('ของครบแล้ว ไปยิมได้เลย 💪');
  },
  prepReset: () => {
    const day = editDay(todayKey());
    const prev = day.prep;
    day.prep = [];
    save();
    render();
    toast('ล้างเครื่องหมายแล้ว', () => {
      editDay(todayKey()).prep = prev;
      save();
      render();
    });
  },
  prepEdit: () => {
    ui.prepEdit = !ui.prepEdit;
    renderPrep();
  },
  prepDelete: (d) => {
    const idx = state.checklist.findIndex((c) => c.id === d.id);
    const [item] = state.checklist.splice(idx, 1);
    save();
    render();
    toast(`ลบ "${item.text}" แล้ว`, () => {
      state.checklist.splice(idx, 0, item);
      save();
      render();
    });
  },

  goal: (d) => {
    state.settings.waterGoal = Math.min(20, Math.max(1, state.settings.waterGoal + Number(d.n)));
    save();
    render();
  },
  gymDay: (d) => {
    const n = Number(d.d);
    const days = state.settings.gymDays;
    state.settings.gymDays = days.includes(n) ? days.filter((x) => x !== n) : [...days, n];
    save();
    render();
  },
  remDelete: (d) => {
    const list = state.settings.reminders;
    const idx = list.findIndex((r) => r.id === d.id);
    const [r] = list.splice(idx, 1);
    save();
    render();
    toast(`ลบเวลาเตือน ${r.time} น. แล้ว`, () => {
      list.splice(idx, 0, r);
      save();
      render();
    });
  },
  notifyEnable: async () => {
    await Notification.requestPermission();
    renderSettings();
  },
  notifyTest: () => {
    if (!swReg) return toast('ยังเตรียมระบบแจ้งเตือนไม่เสร็จ ลองใหม่อีกครั้ง');
    swReg.showNotification('🔔 ทดสอบการแจ้งเตือน', {
      body: 'ถ้าเห็นข้อความนี้ แปลว่าการแจ้งเตือนใช้งานได้',
      icon: 'icons/icon.svg',
      tag: 'test',
    }).catch(() => toast('ส่งแจ้งเตือนไม่สำเร็จ'));
  },
  export: () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `health-backup-${todayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  reset: () => {
    if (!confirm('ลบข้อมูลทั้งหมดและกลับไปใช้ค่าเริ่มต้นใช่ไหม? กู้คืนไม่ได้')) return;
    replaceState(defaultState());
    toast('ล้างข้อมูลแล้ว');
  },
};

function replaceState(next) {
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, next);
  save();
  render();
}

const changes = {
  date: (el) => {
    if (el.value && el.value <= todayKey()) ui.viewDate = el.value;
    renderHome();
  },
  remTime: (el) => {
    const r = state.settings.reminders.find((x) => x.id === el.dataset.id);
    if (!r || !el.value) return;
    r.time = el.value;
    // A new time is a fresh reminder for today.
    delete state.reminderLog[todayKey()]?.[r.id];
    save();
    render();
  },
  remEnabled: (el) => {
    const r = state.settings.reminders.find((x) => x.id === el.dataset.id);
    if (!r) return;
    r.enabled = el.checked;
    save();
    render();
  },
  import: async (el) => {
    const file = el.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || typeof data !== 'object' || !data.days) throw new Error('bad file');
      if (!confirm('แทนที่ข้อมูลปัจจุบันด้วยไฟล์นี้ใช่ไหม?')) return;
      replaceState(normalize(data));
      toast('นำเข้าข้อมูลแล้ว');
    } catch {
      toast('ไฟล์ไม่ถูกต้อง');
    } finally {
      el.value = '';
    }
  },
};

const forms = {
  machine: (form) => {
    const m = MACHINES.find((x) => x.id === form.dataset.id);
    const fields = {};
    m.fields.forEach((f, i) => { fields[f] = form[`f${i}`].value.trim(); });
    const weight = form.weight.value === '' ? null : Number(form.weight.value);
    state.machines[m.id] = { fields, weight, note: form.note.value.trim(), updatedAt: Date.now() };
    save();
    render();
    toast('บันทึกค่าเครื่องแล้ว ✓');
  },
  prepAdd: (form) => {
    const text = form.text.value.trim();
    if (!text) return;
    state.checklist.push({ id: newId(), text });
    save();
    renderPrep();
    $('#view-prep input[name="text"]')?.focus();
  },
  remAdd: (form) => {
    state.settings.reminders.push({ id: newId(), type: form.type.value, time: form.time.value, enabled: true });
    save();
    render();
    toast(`เพิ่มเวลาเตือน ${form.time.value} น. แล้ว`);
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  actions[el.dataset.act]?.(el.dataset, el, e);
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-change]');
  if (el) changes[el.dataset.change]?.(el);
});
document.addEventListener('submit', (e) => {
  const form = e.target.closest('[data-form]');
  if (!form) return;
  e.preventDefault();
  forms[form.dataset.form]?.(form);
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') tick();
});

// ---------- start ----------
render();
tick();
setInterval(tick, 20_000);

// Links opened from a notification when no window was open: ?r=<id>&t=<type>&a=<action>
const params = new URLSearchParams(location.search);
if (params.has('r')) {
  history.replaceState(null, '', location.pathname);
  handleReminderAction({ id: params.get('r'), type: params.get('t'), action: params.get('a') });
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js')
    .then(() => navigator.serviceWorker.ready)
    .then((reg) => { swReg = reg; })
    .catch(() => {});
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data?.kind === 'reminder') handleReminderAction(e.data);
  });
}
