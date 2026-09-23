import {
  dateKey, parseKey, emptyDay, readiness, dueReminders, SLEEP_HOURS, LEVELS,
} from './health.js';
import {
  GOALS, SLOTS, ACTIVITIES, FOCUS, INTENSITY, planWeek, gymSessionToday, sessionItems,
  prescription, treadmillPlan, dayTimeline, weekStart,
} from './planner.js';
import {
  MEAL_SLOTS, FOOD_MODES, BUDGETS, ALLERGIES, AVOID, SOURCES, MENUS, dayMeals, mealDayType,
  shoppingList, DAY_TYPE_LABEL,
} from './meals.js';
import {
  MACHINES, ALTERNATIVES, ROUTINES, MUSCLES, BODY_PARTS, exerciseInfo, machineById,
} from './gym-data.js';
import { mascot, machineArt, muscleMap } from './art.js';
import {
  greeting, cheer, LEVEL_ADVICE, ADJUST_TEXT, REMINDER_TEXT,
} from './copy.js';
import {
  load, save as persist, newId, normalize, defaultState, defaultProfile, photos, resizePhoto,
} from './store.js';

const WEEKDAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const SORENESS = ['ไม่เมื่อย', 'เมื่อยนิดหน่อย', 'เมื่อยมาก'];

const state = load();
const ui = {
  view: 'today',
  lastToday: dateKey(),
  sheets: [], // stack of full-screen sheets; mirrors browser history so "back" works
  foodDay: null,
  weekOpen: null,
  showAlts: false,
  timer: null,
  photoUrls: {},
};
let swReg = null;

// ---------- helpers ----------
const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const todayKey = () => dateKey();
const thaiDate = (key, opts = { weekday: 'long', day: 'numeric', month: 'long' }) =>
  parseKey(key).toLocaleDateString('th-TH', opts);
const hhmm = (ms) => new Date(ms).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
const partLabel = (id) => BODY_PARTS.find((p) => p.id === id)?.label ?? id;
const profile = () => state.profile ?? defaultProfile(state.legacyGymDays);

function save() {
  try {
    persist(state);
  } catch {
    toast('บันทึกไม่สำเร็จ พื้นที่ในเครื่องอาจเต็ม');
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
  toastTimer = setTimeout(hideToast, undo ? 4500 : 2400);
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

// ---------- the plan for today ----------
function computeToday() {
  const key = todayKey();
  const p = profile();
  const plan = planWeek({ profile: p, today: key, days: state.days });
  const entry = plan.week.find((d) => d.isToday);
  const day = getDay(key);
  // Once a workout is started, keep that exact session for the rest of the day.
  const session = entry.done ? entry.session : (day.active ?? entry.session);
  return { key, p, plan, entry, day, session, done: entry.done };
}

function mealsFor(key, session) {
  const p = profile();
  const day = getDay(key);
  const slots = dayTimeline({ profile: p, session }).filter((i) => i.slot).map((i) => i.slot);
  const meals = dayMeals({ key, food: p.food, dayType: mealDayType(session), slots, swaps: day.mealSwaps });
  // A meal already ticked keeps the menu it was ticked with.
  for (const slot of slots) {
    const id = day.meals[slot]?.menuId;
    if (id) meals[slot] = MENUS.find((m) => m.id === id) ?? meals[slot];
  }
  return { slots, meals };
}

function sessionTitle(s) {
  if (!s) return 'วันพัก';
  if (s.intensity === 'rest' || s.activity === 'mobility') return 'ยืดเส้นสบายๆ';
  if (s.kind === 'strength') return `${s.activity === 'gym' ? 'ยิม' : 'เวทที่บ้าน'} · ${FOCUS[s.focus].label}`;
  if (s.activity === 'gym') return 'ลู่วิ่ง · คาร์ดิโอ';
  return ROUTINES[sessionItems(s)[0].id]?.name ?? 'ออกกำลังกาย';
}

function sessionEmoji(s) {
  if (!s) return '🌙';
  if (s.intensity === 'rest' || s.activity === 'mobility') return '🧘';
  return { gym: '🏋️', home: '🏠', run: '🏃', walk: '🚶' }[s.activity] ?? '✨';
}

function intensityChip(s) {
  const lv = s ? (s.intensity === 'rest' ? 'rest' : s.intensity) : 'rest';
  return `<span class="lvl-chip lvl-${lv}">${INTENSITY[lv].label}</span>`;
}

// Exercise id actually shown for a session item (after "machine is taken" swaps).
const currentId = (day, itemId) => day.altSwaps[itemId] ?? itemId;

function rxFor(day, item, session) {
  const info = exerciseInfo(currentId(day, item.id));
  const goal = profile().goal;
  if (info.type === 'cardio' || info.type === 'timed') {
    if (info.kind === 'routine') return { timed: true, sets: 1, minutes: info.minutes, text: info.name };
    const tp = treadmillPlan(goal, session.intensity, item.role);
    const text = info.kind === 'alt' ? 'ความหนักพอให้หายใจแรงขึ้น แต่ยังคุยได้' : tp.text;
    return { timed: true, sets: 1, minutes: tp.minutes, text };
  }
  const r = prescription(goal, session.intensity === 'rest' ? 'rest' : session.intensity);
  return info.type === 'hold' ? { ...r, reps: '20–40 วินาที' } : r;
}

const setsDone = (day, itemId) => day.sets[itemId] ?? 0;
const itemDone = (day, item, session) => setsDone(day, item.id) >= rxFor(day, item, session).sets;

// ---------- actions: logging ----------
function addWater(delta) {
  const day = editDay(todayKey());
  if (delta > 0) {
    day.water += 1;
    day.waterAt.push(Date.now());
  } else if (day.water > 0) {
    day.water -= 1;
    day.waterAt.pop();
  } else return;
  save();
  render();
  if (delta > 0) {
    const goal = state.settings.waterGoal;
    toast(day.water === goal ? `ครบ ${goal} แก้ว! น้ำบุญเต็มแก้ว 💧` : `แก้วที่ ${day.water} แล้ว ${cheer()}`, () => addWater(-1));
  }
}

function setMeal(slot, status) {
  const key = todayKey();
  const t = computeToday();
  const { meals } = mealsFor(key, t.session);
  const day = editDay(key);
  const prev = day.meals[slot];
  day.meals[slot] = { status, menuId: meals[slot]?.id ?? null };
  save();
  render();
  toast(status === 'plan' ? `กินตามแผนแล้ว ${cheer()}` : 'กินอย่างอื่นก็โอเค แมวไม่ว่าเลย 👌', () => {
    if (prev) editDay(key).meals[slot] = prev;
    else delete editDay(key).meals[slot];
    save();
    render();
  });
}

function swapMeal(key, slot) {
  const day = editDay(key);
  day.mealSwaps[slot] = (day.mealSwaps[slot] ?? 0) + 1;
  delete day.meals[slot];
  save();
  render();
}

function completeWorkout(session) {
  const key = todayKey();
  const day = editDay(key);
  if (day.workout?.done || !session) return;
  day.workout = {
    done: true,
    sessionId: session.id,
    kind: session.kind,
    focus: session.focus ?? null,
    intensity: session.intensity,
    activity: session.activity,
    title: sessionTitle(session),
    at: Date.now(),
  };
  save();
  render();
  toast('ออกกำลังกายเสร็จแล้ว! บุญพุ่ง 🎉', () => {
    editDay(key).workout = null;
    save();
    render();
  });
}

function undoWorkout() {
  const day = editDay(todayKey());
  const prev = day.workout;
  day.workout = null;
  save();
  render();
  toast('เอาเครื่องหมายออกแล้ว', () => {
    editDay(todayKey()).workout = prev;
    save();
    render();
  });
}

// Start today's workout: gym via "today I'm going to the gym", anything else via the timeline.
function startSession({ gym = false } = {}) {
  const t = computeToday();
  const day = editDay(t.key);
  if (!t.done) {
    if (!day.active) {
      const s = gym ? gymSessionToday({ plan: t.plan, today: t.key, days: state.days, profile: t.p }) : t.session;
      if (!s) return;
      day.active = s;
      save();
    } else if (gym && day.active.activity !== 'gym') {
      // Planned a walk but went to the gym after all.
      day.active = gymSessionToday({ plan: t.plan, today: t.key, days: state.days, profile: t.p });
      day.sets = {};
      save();
    }
  }
  pushSheet({ type: 'session' });
}

function finishSet(itemId) {
  const t = computeToday();
  const day = editDay(t.key);
  const item = sessionItems(t.session).find((i) => i.id === itemId);
  if (!item) return;
  const rx = rxFor(day, item, t.session);
  day.sets[itemId] = Math.min(rx.sets, setsDone(day, itemId) + 1);
  autoSaveMachineForm();
  save();
  const allDone = sessionItems(t.session).every((i) => itemDone(day, i, t.session));
  if (allDone) {
    stopTimer();
    completeWorkout(t.session);
  } else if (day.sets[itemId] < rx.sets) {
    startTimer(rx.rest, `พักก่อนเซ็ตที่ ${day.sets[itemId] + 1}`);
    toast(`จบเซ็ตที่ ${day.sets[itemId]} ${cheer()}`);
  } else {
    toast(`ครบเครื่องนี้แล้ว ${cheer()}`);
  }
  renderSheet();
  render();
}

function undoSet(itemId) {
  const day = editDay(todayKey());
  day.sets[itemId] = Math.max(0, setsDone(day, itemId) - 1);
  save();
  renderSheet();
  render();
}

// ---------- rest timer ----------
let timerLoop = null;
let audio = null;
function startTimer(seconds, label, onDone) {
  try {
    audio ??= new AudioContext();
  } catch { /* no audio support: vibration + toast still work */ }
  ui.timer = { end: Date.now() + seconds * 1000, total: seconds * 1000, label, onDone };
  clearInterval(timerLoop);
  timerLoop = setInterval(renderTimer, 250);
  renderTimer();
}

function stopTimer() {
  ui.timer = null;
  clearInterval(timerLoop);
  renderTimer();
}

function beep() {
  if (!audio) return;
  const o = audio.createOscillator();
  const g = audio.createGain();
  o.frequency.value = 880;
  g.gain.setValueAtTime(0.15, audio.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.6);
  o.connect(g).connect(audio.destination);
  o.start();
  o.stop(audio.currentTime + 0.6);
}

function renderTimer() {
  const el = $('#timer');
  const t = ui.timer;
  document.body.classList.toggle('timer-on', !!t);
  if (!t) {
    el.hidden = true;
    return;
  }
  const left = Math.max(0, t.end - Date.now());
  if (left === 0) {
    const done = t.onDone;
    stopTimer();
    navigator.vibrate?.([200, 100, 200]);
    beep();
    toast(done ? 'ครบเวลาแล้ว เก่งมาก! 🎉' : 'หมดเวลาพัก ลุยเซ็ตต่อไป! 🐾');
    done?.();
    return;
  }
  const s = Math.ceil(left / 1000);
  const text = s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}`;
  el.hidden = false;
  el.innerHTML = `
    <div class="timer-ring" style="--p:${(left / t.total) * 100}"><b>${text}</b></div>
    <div class="grow"><div class="head">${esc(t.label)}</div><div class="muted small">หายใจลึกๆ ดื่มน้ำสักอึก</div></div>
    <button class="btn sm soft" data-act="timerAdd">+15 วิ</button>
    <button class="btn sm primary" data-act="timerSkip">ข้าม</button>`;
}

// ---------- sheets (stack + history) ----------
function pushSheet(sheet) {
  ui.sheets.push(sheet);
  history.pushState({ sheet: ui.sheets.length }, '');
  $('#sheet').scrollTop = 0;
  renderSheet();
}

function replaceSheet(sheet) {
  ui.sheets[ui.sheets.length - 1] = sheet;
  $('#sheet').scrollTop = 0;
  renderSheet();
}

const topSheet = () => ui.sheets[ui.sheets.length - 1];
const popSheet = () => history.back();

window.addEventListener('popstate', () => {
  const depth = history.state?.sheet ?? 0;
  const closed = ui.sheets.slice(depth);
  ui.sheets.length = Math.min(ui.sheets.length, depth);
  // Closing the first-run questions early just uses the defaults (editable later).
  if (closed.some((s) => s.type === 'onboard') && !state.profile) {
    state.profile = defaultProfile(state.legacyGymDays);
    save();
    toast('ใช้ค่าเริ่มต้นไปก่อน แก้ได้ในตั้งค่า');
  }
  ui.showAlts = false;
  renderSheet();
  render();
});

function renderSheet() {
  const s = topSheet();
  const el = $('#sheet');
  el.hidden = !s;
  document.body.style.overflow = s ? 'hidden' : '';
  if (!s) return;
  $('#sheet-body').innerHTML = {
    onboard: renderOnboard,
    checkin: renderCheckin,
    session: renderSession,
    exercise: renderExercise,
  }[s.type](s);
}

const sheetTop = (title = '', { close = '‹' } = {}) => `
  <div class="sheet-top">
    <button class="icon-btn" data-act="back" aria-label="ย้อนกลับ">${close}</button>
    <span class="head">${title}</span>
    <span style="min-width:48px"></span>
  </div>`;

// ---------- first-run questions ----------
const OB_LAST = 5;

function openOnboard(edit = false) {
  const base = state.profile ?? defaultProfile(state.legacyGymDays);
  pushSheet({ type: 'onboard', step: edit ? 1 : 0, edit, draft: structuredClone(base) });
}

function renderOnboard(s) {
  const d = s.draft;
  const dots = [1, 2, 3, 4].map((i) => `<i class="${i <= s.step ? 'on' : ''}"></i>`).join('');
  const top = s.step > 0 && s.step < OB_LAST
    ? `<div class="sheet-top"><button class="icon-btn" data-act="obBack" aria-label="ย้อนกลับ">‹</button><div class="dots">${dots}</div><span style="width:48px"></span></div>`
    : '';
  const cat = (mood, size = 120) => `<div class="sheet-mascot">${mascot(mood, { size })}</div>`;
  const value = (field) => field.split('.').reduce((o, k) => o[k], d);
  const opt = (field, v, label, emoji, sub = '') => `
    <button class="opt" data-act="obPick" data-field="${field}" data-v="${v}" aria-pressed="${value(field) === v}">
      <span class="emo">${emoji}</span><span>${label}${sub ? `<small>${sub}</small>` : ''}</span></button>`;
  const multi = (field, v, label) =>
    `<button class="chip" data-act="obToggle" data-field="${field}" data-v="${v}" aria-pressed="${value(field).includes(v)}">${label}</button>`;

  switch (s.step) {
    case 0:
      return `${cat('bright', 170)}
        <div class="question">สวัสดีเหมียว~</div>
        <p class="center">ฉันชื่อ <b>เหมียวสมาธิ</b> จะช่วยจัดตารางออกกำลังกายกับอาหารให้เอง<br>ขอถามสั้นๆ 4 เรื่อง ไม่ถึง 1 นาที</p>
        <div class="sheet-foot">
          <button class="btn primary big block" data-act="obNext">เริ่มเลย 🐾</button>
          <button class="btn ghost block" data-act="obSkip">ข้ามไปก่อน ใช้ค่าเริ่มต้น</button>
        </div>`;
    case 1:
      return `${top}${cat('normal', 100)}
        <div class="question">อยากได้อะไรจากการออกกำลังกาย?</div>
        <div class="opts">${Object.entries(GOALS).map(([k, g]) => opt('goal', k, g.label, g.emoji)).join('')}</div>`;
    case 2:
      return `${top}
        <div class="question">ว่างวันไหน ช่วงไหนบ้าง?</div>
        <div class="field-label">วันที่พอว่าง (เลือกได้หลายวัน)</div>
        <div class="weekdays">${WEEK_ORDER.map((n) => multi('days', n, WEEKDAYS[n])).join('')}</div>
        <div class="field-label">ช่วงเวลาที่สะดวก</div>
        <div class="opts two">${Object.entries(SLOTS).map(([k, sl]) => opt('slot', k, sl.label, { morning: '🌅', noon: '☀️', evening: '🌇', night: '🌙' }[k], `${sl.hint} · ${sl.time}`)).join('')}</div>
        <div class="sheet-foot"><button class="btn primary big block" data-act="obNext" ${d.days.length ? '' : 'disabled'}>ต่อไป</button></div>`;
    case 3:
      return `${top}${cat('bright', 100)}
        <div class="question">ชอบขยับตัวแบบไหน?</div>
        <p class="center muted">เลือกได้หลายอย่าง</p>
        <div class="opts two">${Object.entries(ACTIVITIES).map(([k, a]) => `
          <button class="opt" data-act="obToggle" data-field="activities" data-v="${k}" aria-pressed="${d.activities.includes(k)}">
            <span class="emo">${a.emoji}</span><span>${a.label}</span></button>`).join('')}</div>
        <div class="sheet-foot"><button class="btn primary big block" data-act="obNext" ${d.activities.length ? '' : 'disabled'}>ต่อไป</button></div>`;
    case 4:
      return `${top}
        <div class="question">เรื่องกินล่ะ?</div>
        <div class="field-label">ส่วนใหญ่ได้อาหารจากไหน</div>
        <div class="opts">${Object.entries(FOOD_MODES).map(([k, m]) => opt('food.mode', k, m.label, m.emoji)).join('')}</div>
        <div class="field-label">แพ้อะไรไหม</div>
        <div class="chips">${Object.entries(ALLERGIES).map(([k, l]) => multi('food.allergies', k, l)).join('')}</div>
        <div class="field-label">ไม่กินอะไร</div>
        <div class="chips">${Object.entries(AVOID).map(([k, l]) => multi('food.avoid', k, l)).join('')}</div>
        <div class="field-label">งบต่อมื้อ</div>
        <div class="opts">${Object.entries(BUDGETS).map(([k, b]) => opt('food.budget', k, b.label, { low: '🪙', mid: '💰', high: '💎' }[k], b.hint)).join('')}</div>
        <div class="sheet-foot"><button class="btn primary big block" data-act="obFinish">เสร็จแล้ว ✨</button></div>`;
    default: {
      const plan = planWeek({ profile: state.profile, today: todayKey(), days: state.days });
      const n = plan.week.filter((w) => w.session).length;
      return `${cat('bright', 170)}
        <div class="question">เรียบร้อยเหมียว!</div>
        <p class="center">แมวจัดตารางให้แล้ว สัปดาห์นี้ออกกำลังกาย <b>${n} วัน</b><br>สลับหนัก-เบา-พัก พร้อมเมนูอาหารทุกมื้อ</p>
        <p class="center muted small">พลาดวันไหนก็ไม่ต้องห่วง แมวจะย้ายตารางให้เอง</p>
        <div class="sheet-foot"><button class="btn primary big block" data-act="back">ไปดูวันนี้กัน 🪷</button></div>`;
    }
  }
}

// ---------- morning check-in ----------
const CHECKIN_STEPS = [
  { field: 'sleepHours', q: 'เมื่อคืนนอนไปกี่ชั่วโมง?', options: SLEEP_HOURS.map((s) => ({ value: s.id, emoji: '🌙', label: s.label })) },
  { field: 'sleepQuality', q: 'หลับสบายแค่ไหน?', options: [{ value: 1, emoji: '😣', label: 'หลับๆ ตื่นๆ' }, { value: 2, emoji: '😐', label: 'พอใช้' }, { value: 3, emoji: '😴', label: 'หลับสบายมาก' }] },
  { field: 'soreness', q: 'ตอนนี้เมื่อยตรงไหนบ้าง?' },
  { field: 'stress', q: 'ความเครียดตอนนี้?', options: [{ value: 1, emoji: '😌', label: 'สบายมาก' }, { value: 2, emoji: '🙂', label: 'นิดหน่อย' }, { value: 3, emoji: '😐', label: 'ปานกลาง' }, { value: 4, emoji: '😟', label: 'ค่อนข้างมาก' }, { value: 5, emoji: '😖', label: 'มากๆ' }] },
  { field: 'energy', q: 'พลังงานตอนนี้?', options: [{ value: 1, emoji: '🪫', label: 'หมดแรง' }, { value: 2, emoji: '😪', label: 'ต่ำ' }, { value: 3, emoji: '😐', label: 'กลางๆ' }, { value: 4, emoji: '🙂', label: 'ดี' }, { value: 5, emoji: '⚡', label: 'เต็มหลอด' }] },
];

function openCheckin() {
  const existing = getDay(todayKey()).checkin;
  pushSheet({ type: 'checkin', step: 0, answers: existing ? structuredClone(existing.answers) : { soreness: {} } });
}

function finishCheckin(s) {
  const result = readiness(s.answers);
  editDay(todayKey()).checkin = { answers: s.answers, ...result, at: Date.now() };
  save();
  replaceSheet({ ...s, step: CHECKIN_STEPS.length });
  render();
}

function renderCheckin(s) {
  if (s.step >= CHECKIN_STEPS.length) {
    const c = getDay(todayKey()).checkin;
    const lv = LEVELS[c.level];
    const t = computeToday();
    const adj = t.session?.adjusted ? `<p class="note">${ADJUST_TEXT[t.session.adjusted]}</p>` : '';
    return `${sheetTop('', { close: '✕' })}
      <div class="sheet-mascot">${mascot(lv.mood, { size: 150 })}</div>
      <div class="center lvl-${c.level}">
        <div class="score-ring" style="--p:${c.score}"><b>${c.score}</b></div>
        <div class="question" style="margin:4px 0">${lv.icon} ${lv.label}</div>
      </div>
      <div class="card">
        <p>${LEVEL_ADVICE[c.level]}</p>
        <p><b>แผนวันนี้:</b> ${sessionEmoji(t.session)} ${sessionTitle(t.session)}</p>
        ${adj}
        ${c.verySore.length ? `<p class="small">พักส่วนที่เมื่อยมาก: ${c.verySore.map(partLabel).join(', ')}</p>` : ''}
        ${c.reasons.length ? `<p class="muted small">ที่คะแนนลดลงเพราะ: ${c.reasons.join(' · ')}</p>` : ''}
      </div>
      <p class="muted small center">เป็นคำแนะนำคร่าวๆ ฟังร่างกายตัวเองเป็นหลัก ถ้าเจ็บหรือผิดปกติควรปรึกษาแพทย์</p>
      <div class="sheet-foot">
        <button class="btn primary big block" data-act="back">เข้าใจแล้ว 🐾</button>
        <button class="btn ghost block" data-act="ciRestart">แก้คำตอบ</button>
      </div>`;
  }

  const step = CHECKIN_STEPS[s.step];
  const dots = CHECKIN_STEPS.map((_, i) => `<i class="${i <= s.step ? 'on' : ''}"></i>`).join('');
  let content;
  let foot = '';
  if (step.field === 'soreness') {
    const sore = s.answers.soreness;
    content = `<p class="center muted">แตะส่วนที่เมื่อย แตะซ้ำเพื่อเพิ่มระดับ</p>
      <div class="sore-grid">${BODY_PARTS.map((p) => {
        const lv = sore[p.id] ?? 0;
        return `<button class="sore" data-act="ciSore" data-part="${p.id}" data-level="${lv}"><b>${p.label}</b><small>${SORENESS[lv]}</small></button>`;
      }).join('')}</div>`;
    const any = Object.values(sore).some((v) => v > 0);
    foot = `<div class="sheet-foot"><button class="btn primary big block" data-act="ciNext">${any ? 'ต่อไป' : 'ไม่เมื่อยเลย · ต่อไป'}</button></div>`;
  } else {
    const cur = s.answers[step.field];
    content = `<div class="opts">${step.options.map((o) => `
      <button class="opt" data-act="ciPick" data-v="${o.value}" aria-pressed="${o.value === cur}"><span class="emo">${o.emoji}</span>${o.label}</button>`).join('')}</div>`;
  }
  return `
    <div class="sheet-top">
      <button class="icon-btn" data-act="ciBack" aria-label="ย้อนกลับ">‹</button>
      <div class="dots" aria-label="ข้อ ${s.step + 1} จาก ${CHECKIN_STEPS.length}">${dots}</div>
      <button class="icon-btn" data-act="back" aria-label="ปิด">✕</button>
    </div>
    <div class="sheet-mascot">${mascot('normal', { size: 90 })}</div>
    <div class="question">${step.q}</div>
    ${content}${foot}`;
}

// ---------- workout session ----------
function thumbFor(id) {
  const info = exerciseInfo(id);
  if (info.kind === 'machine') {
    return ui.photoUrls[id] ? `<img src="${ui.photoUrls[id]}" alt="">` : machineArt(id);
  }
  return info.emoji ?? '🔁';
}

const infoName = (info) => info.th ?? info.name;

function renderSession() {
  const t = computeToday();
  const s = t.session;
  if (!s) return `${sheetTop('วันนี้')}<p class="center">วันนี้ไม่มีโปรแกรม พักได้เต็มที่เลย 🌙</p>`;
  const items = sessionItems(s);
  const isGym = s.activity === 'gym';
  const doneCount = items.filter((i) => itemDone(t.day, i, s)).length;
  const prep = isGym ? `
    <details class="card"><summary class="head">🎒 ของครบยัง? (${state.checklist.filter((c) => t.day.prep.includes(c.id)).length}/${state.checklist.length})</summary>
      ${state.checklist.map((c) => {
        const on = t.day.prep.includes(c.id);
        return `<button class="check" role="checkbox" aria-checked="${on}" data-act="prepToggle" data-id="${c.id}"><span class="box">${on ? '✓' : ''}</span><span class="label">${esc(c.text)}</span></button>`;
      }).join('')}
    </details>` : '';

  const list = items.map((item, i) => {
    const id = currentId(t.day, item.id);
    const info = exerciseInfo(id);
    const rx = rxFor(t.day, item, s);
    const done = itemDone(t.day, item, s);
    const progress = rx.timed ? `${rx.minutes} นาที` : `${setsDone(t.day, item.id)}/${rx.sets}`;
    const swapped = id !== item.id ? ' <span class="badge lotus">ท่าทดแทน</span>' : '';
    const role = item.role === 'warmup' ? ' <span class="badge gold">วอร์มอัพ</span>' : '';
    return `<button class="session-item${done ? ' done' : ''}" data-act="openExercise" data-id="${item.id}" data-session="1">
      <span class="thumb">${thumbFor(id)}</span>
      <span class="grow"><span class="num">${i + 1}.</span> <b>${esc(infoName(info))}</b><br>
        <span class="muted small">${rx.timed ? rx.text : `${rx.sets} เซ็ต × ${rx.reps}`}</span>${role}${swapped}</span>
      <span class="head">${done ? '✅' : progress}</span>
    </button>`;
  }).join('');

  return `${sheetTop(isGym ? 'วันนี้ไปยิม' : 'ออกกำลังกายวันนี้')}
    <div class="hero">
      ${mascot(t.day.checkin ? LEVELS[t.day.checkin.level].mood : 'normal', { size: 96 })}
      <div class="bubble grow">
        <b>${sessionEmoji(s)} ${sessionTitle(s)}</b><br>${intensityChip(s)}
        ${s.extra ? '<div class="small muted">วันนี้ไม่ได้อยู่ในตาราง แมวยืมโปรแกรมถัดไปมาให้ แล้วจะจัดวันอื่นใหม่เอง</div>' : ''}
      </div>
    </div>
    ${s.adjusted ? `<p class="note">${ADJUST_TEXT[s.adjusted]}</p>` : ''}
    ${!t.day.checkin ? '<div class="note gold row between"><span>ยังไม่ได้เช็กอิน ใช้ความหนักมาตรฐานไปก่อนนะ</span><button class="btn sm soft" data-act="checkin">เช็กอิน</button></div>' : ''}
    ${prep}
    <p class="muted small">เล่นตามลำดับจากบนลงล่าง แตะเพื่อดูวิธีเล่น · ทำแล้ว ${doneCount}/${items.length}</p>
    ${list}
    <div class="sheet-foot">
      ${t.done ? '<p class="center head">เสร็จแล้ววันนี้ เก่งมาก 🎉</p>'
    : `<button class="btn primary big block" data-act="finishWorkout">${doneCount === items.length ? 'จบวันนี้ ✓' : 'พอแค่นี้ก่อน (ก็เก่งแล้ว) ✓'}</button>`}
    </div>`;
}

// ---------- exercise detail ----------
function lastUsed(id) {
  const m = state.machines[id];
  if (!m || (!m.seat && m.weight == null)) return null;
  return m;
}

function nextButton(t, baseId) {
  const next = sessionItems(t.session).find((i) => i.id !== baseId && !itemDone(t.day, i, t.session));
  return next
    ? `<button class="btn primary big block" data-act="openExercise" data-id="${next.id}" data-session="1" data-replace="1">
        ไปต่อ: ${esc(infoName(exerciseInfo(currentId(t.day, next.id))))} ›</button>`
    : '<button class="btn primary big block" data-act="back">กลับไปดูโปรแกรม</button>';
}

function renderExercise(sheet) {
  const t = computeToday();
  const inSession = sheet.session && !!t.session;
  const baseId = sheet.id;
  const id = inSession ? currentId(t.day, baseId) : baseId;
  const info = exerciseInfo(id);
  const machine = info.kind === 'machine' ? info : null;
  const parent = info.kind === 'alt' ? machineById(info.parent) : null;
  const item = inSession ? sessionItems(t.session).find((i) => i.id === baseId) : null;
  const ol = (arr) => `<ol>${arr.map((x) => `<li>${x}</li>`).join('')}</ol>`;

  // --- picture: the user's own photo, or the line drawing ---
  let picture;
  if (machine) {
    const photo = ui.photoUrls[id];
    picture = `<div class="art-box">${photo ? `<img src="${photo}" alt="รูปเครื่อง ${esc(machine.th)} ในยิมของฉัน">` : machineArt(id)}</div>
      <div class="photo-actions">
        <label class="btn soft sm">📷 ${photo ? 'เปลี่ยนรูป' : 'ใส่รูปเครื่องจริงในยิม'}
          <input type="file" accept="image/*" capture="environment" data-change="photo" data-id="${id}" hidden></label>
        ${photo ? `<button class="btn ghost sm" data-act="photoDelete" data-id="${id}">ใช้ภาพลายเส้น</button>` : ''}
      </div>`;
  } else {
    picture = `<div class="art-box" style="font-size:4rem">${info.emoji ?? '🔁'}</div>`;
  }

  // --- sets × reps, scaled by today's readiness (only inside today's workout) ---
  let rxCard = '';
  if (item) {
    const rx = rxFor(t.day, item, t.session);
    const n = setsDone(t.day, baseId);
    const complete = n >= rx.sets;
    if (rx.timed) {
      rxCard = `<div class="card rx">
        <div class="rx-main">${rx.minutes} นาที</div><p>${esc(rx.text)}</p>
        ${complete ? `<p class="head">เสร็จแล้ว ✅</p>${nextButton(t, baseId)}` : `
          <div class="stack">
            <button class="btn primary big block" data-act="timedStart" data-id="${baseId}" data-min="${rx.minutes}">⏱️ เริ่มจับเวลา ${rx.minutes} นาที</button>
            <button class="btn soft block" data-act="finishSet" data-id="${baseId}">เสร็จแล้ว ✓</button>
          </div>`}
      </div>`;
    } else {
      const lv = t.session.intensity === 'rest' ? 'rest' : t.session.intensity;
      rxCard = `<div class="card rx">
        <div class="muted small">วันนี้ ${INTENSITY[lv].label}${t.day.checkin ? ` · ความพร้อม ${t.day.checkin.score}` : ''}</div>
        <div class="rx-main">${rx.sets} เซ็ต × ${rx.reps}</div>
        <p class="small">${rx.load} · พักเซ็ตละ ${rx.rest} วินาที</p>
        <div class="sets">${Array.from({ length: rx.sets }, (_, i) => `<span class="${i < n ? 'on' : ''}">${i < n ? '✓' : i + 1}</span>`).join('')}</div>
        ${complete ? `<p class="head">ครบแล้ว! 🎉</p>${nextButton(t, baseId)}`
    : `<button class="btn primary big block" data-act="finishSet" data-id="${baseId}">จบเซ็ตที่ ${n + 1} ✓ แล้วเริ่มพัก</button>`}
        ${n > 0 ? `<button class="btn ghost sm" data-act="undoSet" data-id="${baseId}">ลบเซ็ตล่าสุด</button>` : ''}
      </div>`;
    }
  } else if (machine || info.kind === 'home') {
    const r = prescription(profile().goal, 'hard');
    rxCard = machine?.type === 'cardio'
      ? '<p class="muted small center">ในวันออกกำลังกาย แมวจะบอกเวลาและความเร็วให้ตามแผน</p>'
      : `<p class="muted small center">ปกติ ${r.sets} เซ็ต × ${r.reps} · แมวปรับตามความพร้อมในวันที่เล่นจริง</p>`;
  }

  // --- my settings (machines only) ---
  let mine = '';
  if (machine) {
    const m = state.machines[id] ?? {};
    const last = lastUsed(id);
    const step = machine.type === 'cardio' ? 0.5 : 2.5;
    const unit = machine.type === 'cardio' ? 'กม./ชม.' : 'กก.';
    const lastText = last ? [
      last.seat ? `${machine.seatLabel.split(' (')[0]} <b>${esc(last.seat)}</b>` : '',
      last.weight != null ? `<b>${last.weight}</b> ${unit}` : '',
    ].filter(Boolean).join(' · ') : '';
    mine = `<form class="card form-grid" data-form="machine" data-id="${id}">
      <h2>ค่าที่ฉันตั้ง</h2>
      ${last ? `<div class="last">ครั้งล่าสุด${last.updatedAt ? ` (${thaiDate(dateKey(new Date(last.updatedAt)), { day: 'numeric', month: 'short' })})` : ''}<br>${lastText}</div>`
    : '<p class="muted small">ยังไม่เคยจด ตั้งเสร็จแล้วบันทึกไว้ ครั้งหน้าไม่ต้องจำเอง</p>'}
      <label>${machine.seatLabel}<input type="text" name="seat" value="${esc(m.seat)}" placeholder="เช่น 4" autocomplete="off"></label>
      <label>${machine.weightLabel}
        <div class="stepper">
          <button type="button" class="btn soft" data-act="stepWeight" data-n="-${step}" aria-label="ลด ${step}">−</button>
          <input type="number" name="weight" inputmode="decimal" step="0.5" min="0" value="${m.weight ?? ''}" class="grow">
          <button type="button" class="btn soft" data-act="stepWeight" data-n="${step}" aria-label="เพิ่ม ${step}">+</button>
        </div></label>
      <label>โน้ต<textarea name="note" placeholder="เช่น เซ็ตสุดท้ายยังไหว ครั้งหน้าเพิ่มได้">${esc(m.note)}</textarea></label>
      <button class="btn primary block">บันทึกค่า</button>
      ${item ? '<p class="muted small center">กดจบเซ็ตแล้ว แมวจดค่าให้อัตโนมัติด้วย</p>' : ''}
    </form>`;
  }

  // --- muscles ---
  const mus = info.muscles ?? { primary: [], secondary: [] };
  const muscles = mus.primary.length ? `<div class="card"><h2>กล้ามเนื้อที่ใช้</h2>
    ${muscleMap(mus)}
    <div class="legend">
      ${mus.primary.map((x) => `<span class="badge lotus"><span class="dot" style="background:var(--lotus-strong)"></span>${MUSCLES[x]}</span>`).join('')}
      ${mus.secondary.map((x) => `<span class="badge"><span class="dot" style="background:var(--lotus)"></span>${MUSCLES[x]}</span>`).join('')}
    </div>
    <p class="muted small center">สีเข้ม = ใช้หลัก · สีอ่อน = ช่วยออกแรง</p></div>` : '';

  // --- step by step ---
  const how = machine ? `<div class="card"><h2>วิธีเล่นทีละขั้น</h2>
      <div class="steps-h">1. ปรับเครื่อง</div>${ol(machine.setup)}
      <div class="steps-h">2. ท่าเริ่มต้น</div>${ol(machine.start)}
      <div class="steps-h">3. การเคลื่อนไหว</div>${ol(machine.move)}
      <div class="steps-h">4. การหายใจ</div><p>🌬️ ${machine.breath}</p></div>
    <div class="card"><h2>ข้อผิดพลาดที่พบบ่อย</h2>
      ${machine.mistakes.map((x) => `<div class="mistake"><span>❌ ${x.wrong}</span><span>✅ ${x.fix}</span></div>`).join('')}</div>`
    : `<div class="card"><h2>วิธีทำ</h2>${info.equip ? `<p class="muted small">อุปกรณ์: ${info.equip}</p>` : ''}${ol(info.how)}</div>`;

  // --- alternatives when the machine is taken ---
  let alts = '';
  if (parent && inSession) {
    alts = `<div class="card"><p>กำลังเล่นท่าทดแทนของ <b>${parent.th}</b></p>
      <button class="btn soft block" data-act="unswap" data-id="${baseId}">กลับไปใช้${parent.th}</button></div>`;
  } else if (machine) {
    alts = `<div class="card"><button class="btn soft block" data-act="toggleAlts" aria-expanded="${ui.showAlts}">🔁 เครื่องไม่ว่าง? ดูท่าทดแทน</button>
      ${ui.showAlts ? machine.alternatives.map((aid) => {
        const a = ALTERNATIVES[aid];
        return `<div class="alt"><b>${a.name}</b><div class="muted small">อุปกรณ์: ${a.equip}</div>${ol(a.how)}
          ${inSession ? `<button class="btn lotus block" data-act="swap" data-id="${baseId}" data-alt="${aid}">เล่นท่านี้แทน</button>` : ''}</div>`;
      }).join('') : ''}</div>`;
  }

  return `${sheetTop(esc(infoName(info)))}
    ${machine ? `<p class="muted center" style="margin:-6px 0 8px">${machine.name}</p>` : ''}
    ${picture}${rxCard}${mine}${muscles}${how}${alts}`;
}

function autoSaveMachineForm() {
  const form = document.querySelector('#sheet form[data-form="machine"]');
  if (form) saveMachine(form, { quiet: true });
}

function saveMachine(form, { quiet = false } = {}) {
  const id = form.dataset.id;
  const seat = form.seat.value.trim();
  const weight = form.weight.value === '' ? null : Number(form.weight.value);
  const note = form.note.value.trim();
  const prev = state.machines[id] ?? {};
  if (quiet && (!seat && weight == null)) return;
  if (quiet && prev.seat === seat && prev.weight === weight && (prev.note ?? '') === note) return;
  state.machines[id] = { seat, weight, note, updatedAt: Date.now() };
  save();
  if (!quiet) {
    toast('จดไว้ให้แล้ว ครั้งหน้าไม่ต้องจำ 📝');
    renderSheet();
    render();
  }
}

// ---------- views ----------
function renderToday() {
  const t = computeToday();
  const timeline = dayTimeline({ profile: t.p, session: t.session });
  const { meals } = mealsFor(t.key, t.session);
  const isDone = (it) => {
    if (it.id === 'checkin') return !!t.day.checkin;
    if (it.slot) return !!t.day.meals[it.slot];
    if (it.id === 'workout') return t.done;
    return !!t.day.ticks[it.id];
  };
  const items = timeline.map((it) => ({ ...it, done: isDone(it) }));
  const done = items.filter((i) => i.done).length;
  const nowIdx = items.findIndex((i) => !i.done);
  const mood = t.day.checkin ? LEVELS[t.day.checkin.level].mood : 'normal';
  const msg = greeting({
    key: t.key, mood, checkedIn: !!t.day.checkin, done, total: items.length,
    isRestDay: !t.session, missed: t.plan.missed, hour: new Date().getHours(),
  });
  const goal = state.settings.waterGoal;
  const glasses = Array.from({ length: Math.max(goal, t.day.water) }, (_, i) =>
    `<span class="${i < t.day.water ? 'full' : ''}">💧</span>`).join('');
  const hasGym = t.p.activities.includes('gym');

  $('#view-today').innerHTML = `
    <div class="hero">
      ${mascot(mood, { size: 128 })}
      <div class="grow">
        <div class="bubble">${msg}</div>
        <div class="hero-meta">
          <span class="muted small">${thaiDate(t.key)}</span>
          ${t.day.checkin ? `<span class="lvl-chip lvl-${t.day.checkin.level}">${LEVELS[t.day.checkin.level].icon} ${t.day.checkin.score}</span>` : ''}
          <span class="badge gold">ทำแล้ว ${done}/${items.length}</span>
        </div>
      </div>
    </div>
    <div class="water">
      <span class="glasses" aria-label="ดื่มน้ำ ${t.day.water} จาก ${goal} แก้ว">${glasses}</span>
      <button class="icon-btn" data-act="water" data-n="-1" aria-label="ลบ 1 แก้ว" ${t.day.water ? '' : 'disabled'}>−</button>
      <button class="btn primary" data-act="water" data-n="1">+1 แก้ว</button>
    </div>
    ${hasGym && !t.done ? '<div class="gym-cta"><button class="btn lotus big block" data-act="goGym">🏋️ วันนี้ไปยิม</button></div>' : ''}
    <ol class="timeline">${items.map((it, i) => timelineItem(it, t, meals, i === nowIdx)).join('')}</ol>`;
}

function timelineItem(it, t, meals, isNow) {
  const cls = `tl${it.done ? ' done' : ''}${isNow ? ' now' : ''}`;
  const tick = (act, extra = '') =>
    `<button class="tick" role="checkbox" aria-checked="${it.done}" aria-label="ทำแล้ว" data-act="${act}" ${extra}>✓</button>`;
  let emoji;
  let title;
  let sub = '';
  let actions = '';
  let tickBtn;
  let editable = false;

  if (it.id === 'checkin') {
    const c = t.day.checkin;
    emoji = '☀️';
    title = 'เช็กอินตอนเช้า';
    sub = c ? `ความพร้อม ${c.score} · ${LEVELS[c.level].label} · แตะเพื่อแก้` : '5 คำถาม แตะตอบข้อละครั้ง';
    actions = '<button class="btn primary" data-act="checkin">เริ่มเช็กอิน</button>';
    tickBtn = tick('checkin');
    editable = !!c;
  } else if (it.slot) {
    const m = meals[it.slot];
    const status = t.day.meals[it.slot]?.status;
    emoji = m?.emoji ?? '🍽️';
    title = `${MEAL_SLOTS[it.slot].label}: ${m ? esc(m.name) : 'เลือกกินตามสะดวก'}`;
    sub = status === 'plan' ? 'กินตามนี้แล้ว 👍' : status === 'other' ? 'กินอย่างอื่น ก็โอเค 👌'
      : m ? `${SOURCES[m.src].emoji} ${SOURCES[m.src].label} · ~฿${m.price}` : '';
    actions = `<button class="btn primary" data-act="meal" data-slot="${it.slot}" data-v="plan">กินตามนี้แล้ว</button>
      <button class="btn soft" data-act="meal" data-slot="${it.slot}" data-v="other">กินอย่างอื่น</button>
      <button class="btn ghost sm" data-act="swapMeal" data-slot="${it.slot}">🔄 เปลี่ยนเมนู</button>`;
    tickBtn = tick('mealTick', `data-slot="${it.slot}"`);
  } else if (it.id === 'workout') {
    const s = t.session;
    emoji = sessionEmoji(s);
    title = sessionTitle(s);
    sub = `${intensityChip(s)}${t.entry.moved && !t.done ? ' <span class="badge dusk">ย้ายมาจากวันก่อน</span>' : ''}`;
    if (s.adjusted && !t.done) sub += `<div class="note">${ADJUST_TEXT[s.adjusted]}</div>`;
    actions = s.activity === 'gym'
      ? '<button class="btn lotus" data-act="goGym">🏋️ วันนี้ไปยิม</button>'
      : '<button class="btn primary" data-act="startSession">เริ่มเลย</button>';
    tickBtn = tick('workoutTick');
  } else if (it.id === 'rest') {
    emoji = '🌙';
    title = 'วันพัก';
    sub = 'ยืดเส้นเบาๆ 10 นาทีถ้าอยาก ไม่ทำก็ไม่เป็นไร';
    actions = '<button class="btn soft" data-act="openExercise" data-id="mobility">ดูท่ายืดเส้น</button>';
    tickBtn = tick('tick', 'data-id="rest"');
  } else {
    emoji = '🛏️';
    title = 'วางมือถือ เตรียมนอน';
    sub = 'นอนพอ พรุ่งนี้แมวจะได้สดใส';
    tickBtn = tick('tick', 'data-id="winddown"');
  }

  return `<li class="${cls}">
    <span class="tl-time">${it.time}</span><span class="tl-dot"></span>
    <div class="tl-card">
      <div class="tl-head">
        <span class="tl-emoji">${emoji}</span>
        <div class="grow" ${editable ? 'data-act="checkin" role="button" tabindex="0"' : ''}>
          <div class="tl-title">${title}</div><div class="tl-sub">${sub}</div></div>
        ${tickBtn}
      </div>
      ${actions ? `<div class="tl-actions">${actions}</div>` : ''}
    </div></li>`;
}

function renderWeek() {
  const t = computeToday();
  const { week, missed, dropped } = t.plan;
  const note = missed > 0
    ? `พลาดไป ${missed} วัน ไม่เป็นไรเลย แมวย้ายตารางให้แล้ว${dropped ? ` (ตัดวันเบาออก ${dropped} วัน พักเยอะหน่อยก็ได้บุญ)` : ''} 🐾`
    : 'สลับวันหนัก วันเบา วันพัก และไม่เล่นกล้ามเนื้อเดิมติดกัน 🪷';
  $('#view-week').innerHTML = `
    <div class="view-head"><h1>ตารางสัปดาห์นี้</h1></div>
    <div class="hero">${mascot('normal', { size: 84 })}<div class="bubble grow small">${note}</div></div>
    ${week.map((d) => {
      const s = d.isToday ? t.session : d.session;
      const date = parseKey(d.key);
      let title;
      if (d.done) title = `${sessionEmoji(s)} ${esc(getDay(d.key).workout?.title ?? sessionTitle(s))}`;
      else if (s) title = `${sessionEmoji(s)} ${sessionTitle(s)}`;
      else title = d.isPast && d.available ? '🌙 พักไป' : '🌙 วันพัก';
      const chips = s ? `${intensityChip(s)}${d.moved ? ' <span class="badge dusk">ย้ายมา</span>' : ''}` : '';
      const open = ui.weekOpen === d.key && s;
      const detail = open ? `<span class="wd-list">${sessionItems(s).map((i) => infoName(exerciseInfo(i.id))).join(' → ')}</span>` : '';
      return `<button class="week-day${d.isToday ? ' today' : ''}${d.isPast ? ' past' : ''}" data-act="weekOpen" data-key="${d.key}" aria-expanded="${!!open}">
        <span class="wd-date">${WEEKDAYS[date.getDay()]}<b>${date.getDate()}</b></span>
        <span><span class="wd-title">${title}</span><br>${chips}${d.isToday ? ' <span class="badge gold">วันนี้</span>' : ''}</span>
        <span class="head">${d.done ? '✅' : ''}</span>${detail}
      </button>`;
    }).join('')}
    <button class="btn soft block" data-act="editProfile">✏️ เปลี่ยนวันว่าง เป้าหมาย หรือกิจกรรม</button>`;
}

function renderFood() {
  const t = computeToday();
  const key = ui.foodDay ?? t.key;
  const entry = t.plan.week.find((d) => d.key === key) ?? t.entry;
  const session = key === t.key ? t.session : entry.session;
  const { slots, meals } = mealsFor(key, session);
  const day = getDay(key);
  const canTick = key === t.key;
  const food = t.p.food;

  const cards = slots.map((slot) => {
    const m = meals[slot];
    const status = day.meals[slot]?.status;
    if (!m) {
      return `<div class="card meal"><div class="head">${MEAL_SLOTS[slot].emoji} ${MEAL_SLOTS[slot].label}</div>
        <p class="muted">ไม่มีเมนูที่ตรงกับเงื่อนไข เลือกกินตามสะดวกเลยนะ</p></div>`;
    }
    return `<div class="card meal${status ? ' done' : ''}">
      <div class="row between wrap"><span class="muted small">${MEAL_SLOTS[slot].emoji} ${MEAL_SLOTS[slot].label}</span>
        <span class="badge">${SOURCES[m.src].emoji} ${SOURCES[m.src].label} · ~฿${m.price}</span></div>
      <div class="row"><span class="meal-emoji">${m.emoji}</span><span class="meal-name grow">${esc(m.name)}</span></div>
      ${m.steps ? `<ol>${m.steps.map((x) => `<li>${x}</li>`).join('')}</ol>` : `<p class="small">💡 ${m.tip}</p>`}
      ${status ? `<p class="head">${status === 'plan' ? 'กินตามนี้แล้ว 👍' : 'กินอย่างอื่น ก็โอเค 👌'}</p>` : ''}
      <div class="tl-actions">
        ${canTick && !status ? `<button class="btn primary" data-act="meal" data-slot="${slot}" data-v="plan">กินตามนี้แล้ว</button>
          <button class="btn soft" data-act="meal" data-slot="${slot}" data-v="other">กินอย่างอื่น</button>` : ''}
        ${!status && key >= t.key ? `<button class="btn ghost sm" data-act="swapMeal" data-slot="${slot}" data-key="${key}">🔄 เปลี่ยนเมนู</button>` : ''}
      </div>
    </div>`;
  }).join('');

  // Shopping list: home-cooked meals from today to the end of the week.
  const ws = weekStart(t.key);
  const rest = t.plan.week.filter((d) => d.key >= t.key)
    .map((d) => mealsFor(d.key, d.isToday ? t.session : d.session).meals);
  const list = shoppingList(rest);
  const ticked = new Set(state.shopping[ws] ?? []);
  const row = (i) => `<button class="check" role="checkbox" aria-checked="${ticked.has(i.name)}" data-act="shopToggle" data-name="${esc(i.name)}">
    <span class="box">${ticked.has(i.name) ? '✓' : ''}</span><span class="label">${esc(i.name)}</span><span class="count muted small">${i.count} มื้อ</span></button>`;
  const main = list.filter((i) => !i.staple);
  const staples = list.filter((i) => i.staple);

  $('#view-food').innerHTML = `
    <div class="view-head"><h1>แผนอาหาร</h1></div>
    <p class="muted small">ไม่ต้องนับแคลอรี่ แค่กดว่ากินตามนี้ หรือกินอย่างอื่นก็พอ</p>
    <div class="day-strip">${t.plan.week.map((d) => {
      const dt = parseKey(d.key);
      return `<button data-act="foodDay" data-key="${d.key}" aria-pressed="${d.key === key}">${WEEKDAYS[dt.getDay()]}<b>${dt.getDate()}</b></button>`;
    }).join('')}</div>
    <div class="note gold">${DAY_TYPE_LABEL[mealDayType(session)]} · ${sessionEmoji(session)} ${sessionTitle(session)}</div>
    ${food.allergies.length ? `<p class="small muted">⚠️ ร้านตามสั่งมักใส่ซอสหอยนางรม น้ำปลา หรือถั่ว บอกร้านทุกครั้งว่าแพ้${food.allergies.map((a) => ALLERGIES[a]).join(', ')}</p>` : ''}
    ${cards}
    <div class="card">
      <h2>🛒 ของที่ต้องซื้อ (ถึงสิ้นสัปดาห์)</h2>
      ${main.length ? main.map(row).join('') : '<p class="muted">สัปดาห์นี้ไม่ต้องซื้อของเข้าบ้านเลย ซื้อกินสบายๆ 🛍️</p>'}
      ${staples.length ? `<h3>ของติดครัว (มีแล้วข้ามได้)</h3>${staples.map(row).join('')}` : ''}
    </div>`;
}

function renderGym() {
  const t = computeToday();
  const preview = t.done ? null : (t.day.active ?? gymSessionToday({ plan: t.plan, today: t.key, days: state.days, profile: t.p }));
  $('#view-gym').innerHTML = `
    <div class="view-head"><h1>ยิม</h1></div>
    <div class="card">
      <div class="hero">${mascot(t.day.checkin ? LEVELS[t.day.checkin.level].mood : 'bright', { size: 90 })}
        <div class="grow">${t.done ? '<b>วันนี้ออกกำลังกายแล้ว เก่งมาก 🎉</b>'
    : `<b>โปรแกรมวันนี้</b><br>${sessionTitle(preview)}<br>${intensityChip(preview)}`}</div></div>
      ${t.done ? '' : '<button class="btn lotus big block" data-act="goGym" style="margin-top:12px">🏋️ วันนี้ไปยิม</button>'}
    </div>
    <h2>คู่มือเครื่องเล่น</h2>
    <p class="muted small">แตะเครื่องเพื่อดูวิธีเล่น กล้ามเนื้อที่ใช้ และค่าที่ตั้งไว้ · ใส่รูปเครื่องจริงในยิมได้</p>
    <div class="machine-grid">${MACHINES.map((m) => {
      const last = lastUsed(m.id);
      return `<button class="machine-card" data-act="openExercise" data-id="${m.id}">
        <span class="thumb">${thumbFor(m.id)}</span>
        <b class="head">${m.th}</b>
        <span class="muted small">${last ? `ล่าสุด: ${esc(last.seat || '-')} · ${last.weight ?? '-'} ${m.type === 'cardio' ? 'กม./ชม.' : 'กก.'}` : m.name}</span>
      </button>`;
    }).join('')}</div>
    <div class="card"><h2>เคล็ดลับจากแมว</h2><ul>
      <li>เริ่มจากน้ำหนักที่ทำได้ครบ โดยท่ายังสวย</li>
      <li>หายใจออกตอนออกแรง หายใจเข้าตอนผ่อน</li>
      <li>เจ็บแปลบหรือปวดที่ข้อต่อ ให้หยุดทันที</li>
    </ul></div>`;
}

function renderSettings() {
  const p = profile();
  const s = state.settings;
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  const permText = {
    granted: '✅ เปิดการแจ้งเตือนแล้ว',
    denied: '🚫 การแจ้งเตือนถูกปิดไว้ เปิดได้ในการตั้งค่าของเบราว์เซอร์',
    default: 'ยังไม่ได้เปิดการแจ้งเตือนของระบบ',
    unsupported: 'เบราว์เซอร์นี้ยังไม่รองรับการแจ้งเตือน (บน iPhone ต้อง "เพิ่มไปยังหน้าจอโฮม" ก่อน)',
  }[perm];
  const reminders = [...s.reminders].sort((a, b) => a.time.localeCompare(b.time));

  $('#view-settings').innerHTML = `
    <div class="view-head"><h1>ตั้งค่า</h1></div>
    <div class="card">
      <h2>ข้อมูลของฉัน</h2>
      <p>${GOALS[p.goal].emoji} ${GOALS[p.goal].label}</p>
      <p>📅 ว่าง ${WEEK_ORDER.filter((n) => p.days.includes(n)).map((n) => WEEKDAYS[n]).join(' ')} · ช่วง${SLOTS[p.slot].label}</p>
      <p>${p.activities.map((a) => `${ACTIVITIES[a].emoji} ${ACTIVITIES[a].label}`).join(' · ')}</p>
      <p>${FOOD_MODES[p.food.mode].emoji} ${FOOD_MODES[p.food.mode].label} · งบ${BUDGETS[p.food.budget].label}
        ${p.food.allergies.length ? ` · แพ้${p.food.allergies.map((a) => ALLERGIES[a]).join(', ')}` : ''}
        ${p.food.avoid.length ? ` · ${p.food.avoid.map((a) => AVOID[a]).join(', ')}` : ''}</p>
      <button class="btn soft block" data-act="editProfile">✏️ แก้คำตอบ</button>
    </div>

    <div class="card">
      <h2>เป้าดื่มน้ำต่อวัน</h2>
      <div class="stepper">
        <button class="btn soft" data-act="goal" data-n="-1" aria-label="ลดเป้า">−</button>
        <b class="head grow center">${s.waterGoal} แก้ว</b>
        <button class="btn soft" data-act="goal" data-n="1" aria-label="เพิ่มเป้า">+</button>
      </div>
    </div>

    <div class="card">
      <h2>🎒 ของที่ต้องเตรียมไปยิม</h2>
      ${state.checklist.map((c) => `<div class="row"><span class="grow">${esc(c.text)}</span>
        <button class="icon-btn" data-act="prepDelete" data-id="${c.id}" aria-label="ลบ ${esc(c.text)}">✕</button></div>`).join('')}
      <form class="row" data-form="prepAdd" style="margin-top:8px">
        <input type="text" name="text" placeholder="เพิ่มของ" required maxlength="60" autocomplete="off">
        <button class="btn primary sm">เพิ่ม</button></form>
    </div>

    <div class="card">
      <h2>การแจ้งเตือน</h2>
      <p class="small">${permText}</p>
      ${perm === 'default' ? '<button class="btn primary block" data-act="notifyEnable">เปิดการแจ้งเตือน</button>' : ''}
      ${perm === 'granted' ? '<button class="btn soft block" data-act="notifyTest">ลองส่งแจ้งเตือน</button>' : ''}
      <p class="muted small">เด้งเตือนขณะที่แอปเปิดอยู่หรือพับไว้ ถ้าปิดแอปไป รายการที่ถึงเวลาจะรออยู่ด้านบนตอนเปิดครั้งถัดไป</p>
      ${reminders.map((r) => `<div class="rem-row">
        <span class="tl-emoji">${REMINDER_TEXT[r.type].icon}</span>
        <label class="grow rem-time"><span class="small muted">${REMINDER_TEXT[r.type].label}</span>
          <input type="time" value="${r.time}" data-change="remTime" data-id="${r.id}"></label>
        <label class="switch" aria-label="เปิด/ปิด"><input type="checkbox" data-change="remEnabled" data-id="${r.id}" ${r.enabled ? 'checked' : ''}><span></span></label>
        <button class="icon-btn" data-act="remDelete" data-id="${r.id}" aria-label="ลบเวลาเตือน">✕</button>
      </div>`).join('')}
      <form class="row" data-form="remAdd" style="margin-top:10px">
        <select name="type" aria-label="ประเภท">${Object.entries(REMINDER_TEXT).map(([k, r]) => `<option value="${k}">${r.icon} ${r.label}</option>`).join('')}</select>
        <input type="time" name="time" value="12:00" required aria-label="เวลา" style="width:auto;min-width:120px">
        <button class="btn primary sm">เพิ่ม</button>
      </form>
    </div>

    <div class="card">
      <h2>ข้อมูล</h2>
      <p class="muted small">ข้อมูลทั้งหมดเก็บในเครื่องนี้เท่านั้น ส่งออกเก็บไว้เป็นระยะก็ดีนะ</p>
      <div class="row wrap">
        <button class="btn soft grow" data-act="export">ส่งออก</button>
        <label class="btn soft grow">นำเข้า<input type="file" accept="application/json" data-change="import" hidden></label>
        <button class="btn danger grow" data-act="reset">ล้างข้อมูล</button>
      </div>
    </div>
    <p class="muted small center">แอปนี้ช่วยจัดตารางสุขภาพเบื้องต้น ไม่สามารถใช้แทนคำแนะนำของแพทย์หรือผู้ฝึกสอนได้</p>`;
}

// ---------- reminders ----------
function currentDue(now = Date.now()) {
  const t = computeToday();
  return dueReminders({
    reminders: state.settings.reminders,
    day: t.day,
    key: t.key,
    now,
    log: state.reminderLog[t.key] ?? {},
    waterGoal: state.settings.waterGoal,
    workoutPending: !!t.session && !t.done,
  });
}

function alertHtml(r) {
  const x = REMINDER_TEXT[r.type];
  const main = {
    water: '<button class="btn primary big block" data-act="water" data-n="1">ดื่มแล้ว +1 แก้ว</button>',
    checkin: '<button class="btn primary big block" data-act="checkin">เริ่มเช็กอิน</button>',
    workout: '<button class="btn lotus big block" data-act="startFromAlert">ไปกันเลย</button>',
  }[r.type];
  return `<div class="alert" role="alert">
    <div class="row between"><span class="alert-title">${x.icon} ${x.text}</span><span class="muted small">${r.time} น.</span></div>
    <div style="margin-top:8px">${main}</div>
    <div class="actions">
      <button class="btn soft" data-act="snooze" data-id="${r.id}" data-min="10">เลื่อน 10 นาที</button>
      <button class="btn soft" data-act="snooze" data-id="${r.id}" data-min="60">1 ชั่วโมง</button>
      <button class="btn ghost" data-act="skip" data-id="${r.id}">ข้ามครั้งนี้</button>
    </div>
  </div>`;
}

// Only the most recent reminder gets a card, so opening the app late never
// greets the user with a wall of "you haven't done this" cards.
function renderAlerts(due = currentDue()) {
  const latest = due[due.length - 1];
  $('#alerts').innerHTML = state.profile && latest ? alertHtml(latest.reminder) : '';
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
  toast(`โอเค จะเตือนอีกทีตอน ${hhmm(until)} น. 😴`);
}

function skip(id) {
  reminderEntry(id).skipped = true;
  save();
  renderAlerts();
  toast('ข้ามครั้งนี้ ไม่เป็นไรเลย', () => {
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
  const x = REMINDER_TEXT[r.type];
  const actions = [{ action: 'snooze', title: 'เลื่อน 10 นาที' }];
  if (r.type === 'water') actions.unshift({ action: 'water', title: 'ดื่มแล้ว +1' });
  swReg.showNotification(`${x.icon} ${x.text}`, {
    body: 'แตะเพื่อเปิด หรือกดเลื่อนเตือนได้ 🐾',
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
    ui.lastToday = key;
    ui.foodDay = null;
    render();
  }
  if (!state.profile) return;
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

function handleReminderAction({ id, type, action }) {
  if (action === 'snooze') return snooze(id, 10);
  if (action === 'water') return addWater(1);
  showView('today');
  if (type === 'checkin' && !getDay(todayKey()).checkin) openCheckin();
  if (type === 'workout') startSession({ gym: computeToday().session?.activity === 'gym' });
}

// ---------- view switching ----------
function showView(view) {
  ui.view = view;
  document.querySelectorAll('.tabs [data-view]').forEach((t) =>
    t.setAttribute('aria-selected', String(t.dataset.view === view)));
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${view}`));
  render();
  window.scrollTo(0, 0);
}

function render() {
  if (!state.profile) {
    $('#view-today').innerHTML = `<div class="sheet-mascot">${mascot('normal', { size: 160 })}</div>
      <button class="btn primary big block" data-act="openOnboard">เริ่มตั้งค่า 🐾</button>`;
    renderAlerts();
    return;
  }
  renderToday();
  renderWeek();
  renderFood();
  renderGym();
  renderSettings();
  renderAlerts();
}

// ---------- events ----------
const actions = {
  tab: (d) => showView(d.view),
  back: () => popSheet(),
  openOnboard: () => openOnboard(),
  editProfile: () => openOnboard(true),

  // first-run questions
  obNext: () => {
    const s = topSheet();
    replaceSheet({ ...s, step: s.step + 1 });
  },
  obBack: () => {
    const s = topSheet();
    if (s.step <= (s.edit ? 1 : 0)) popSheet();
    else replaceSheet({ ...s, step: s.step - 1 });
  },
  obSkip: () => {
    state.profile = defaultProfile(state.legacyGymDays);
    save();
    popSheet();
  },
  obPick: (d) => {
    const s = topSheet();
    const [a, b] = d.field.split('.');
    if (b) s.draft[a][b] = d.v;
    else s.draft[a] = d.v;
    renderSheet();
    if (d.field === 'goal') setTimeout(() => actions.obNext(), 200); // single question: move on by itself
  },
  obToggle: (d) => {
    const s = topSheet();
    const [a, b] = d.field.split('.');
    const v = d.field === 'days' ? Number(d.v) : d.v;
    const list = b ? s.draft[a][b] : s.draft[a];
    const next = list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
    if (b) s.draft[a][b] = next;
    else s.draft[a] = next;
    renderSheet();
  },
  obFinish: () => {
    const s = topSheet();
    state.profile = s.draft;
    delete state.legacyGymDays;
    save();
    render();
    if (s.edit) {
      popSheet();
      toast('แมวจัดตารางใหม่ให้แล้ว 🐾');
    } else replaceSheet({ ...s, step: OB_LAST });
  },

  // check-in
  checkin: () => openCheckin(),
  ciPick: (d) => {
    const s = topSheet();
    const field = CHECKIN_STEPS[s.step].field;
    s.answers[field] = field === 'sleepHours' ? d.v : Number(d.v);
    renderSheet();
    setTimeout(() => actions.ciNext(), 180); // brief pause so the tap visibly registers
  },
  ciSore: (d) => {
    const sore = topSheet().answers.soreness;
    sore[d.part] = ((sore[d.part] ?? 0) + 1) % SORENESS.length;
    renderSheet();
  },
  ciNext: () => {
    const s = topSheet();
    if (s?.type !== 'checkin' || s.step >= CHECKIN_STEPS.length) return;
    if (s.step === CHECKIN_STEPS.length - 1) finishCheckin(s);
    else replaceSheet({ ...s, step: s.step + 1 });
  },
  ciBack: () => {
    const s = topSheet();
    if (s.step === 0) popSheet();
    else replaceSheet({ ...s, step: s.step - 1 });
  },
  ciRestart: () => replaceSheet({ ...topSheet(), step: 0 }),

  // today
  water: (d) => addWater(Number(d.n)),
  meal: (d) => setMeal(d.slot, d.v),
  mealTick: (d) => {
    if (getDay(todayKey()).meals[d.slot]) {
      delete editDay(todayKey()).meals[d.slot];
      save();
      render();
    } else setMeal(d.slot, 'plan');
  },
  swapMeal: (d) => swapMeal(d.key ?? todayKey(), d.slot),
  tick: (d) => {
    const day = editDay(todayKey());
    day.ticks[d.id] = !day.ticks[d.id];
    save();
    render();
    if (day.ticks[d.id]) toast(cheer());
  },
  workoutTick: () => {
    const t = computeToday();
    if (t.done) undoWorkout();
    else completeWorkout(t.session);
  },
  goGym: () => startSession({ gym: true }),
  startSession: () => startSession(),
  startFromAlert: () => startSession({ gym: computeToday().session?.activity === 'gym' }),
  snooze: (d) => snooze(d.id, Number(d.min)),
  skip: (d) => skip(d.id),

  // workout
  openExercise: (d) => {
    ui.showAlts = false;
    const sheet = { type: 'exercise', id: d.id, session: d.session === '1' };
    if (d.replace) replaceSheet(sheet);
    else pushSheet(sheet);
  },
  finishSet: (d) => finishSet(d.id),
  undoSet: (d) => undoSet(d.id),
  timedStart: (d) => {
    const { id } = d;
    startTimer(Number(d.min) * 60, 'จับเวลาคาร์ดิโอ', () => finishSet(id));
  },
  timerAdd: () => {
    if (!ui.timer) return;
    ui.timer.end += 15_000;
    ui.timer.total += 15_000;
    renderTimer();
  },
  timerSkip: () => stopTimer(),
  finishWorkout: () => {
    completeWorkout(computeToday().session);
    popSheet();
  },
  toggleAlts: () => {
    ui.showAlts = !ui.showAlts;
    renderSheet();
  },
  swap: (d) => {
    editDay(todayKey()).altSwaps[d.id] = d.alt;
    save();
    ui.showAlts = false;
    $('#sheet').scrollTop = 0;
    renderSheet();
    toast('เปลี่ยนเป็นท่าทดแทนแล้ว 🔁');
  },
  unswap: (d) => {
    delete editDay(todayKey()).altSwaps[d.id];
    save();
    renderSheet();
  },
  stepWeight: (d, el) => {
    const input = el.closest('form').weight;
    input.value = Math.max(0, Math.round(((Number(input.value) || 0) + Number(d.n)) * 10) / 10);
  },
  photoDelete: async (d) => {
    try {
      await photos.delete(d.id);
    } catch { /* already gone */ }
    if (ui.photoUrls[d.id]) URL.revokeObjectURL(ui.photoUrls[d.id]);
    delete ui.photoUrls[d.id];
    renderSheet();
    render();
  },
  prepToggle: (d) => {
    const day = editDay(todayKey());
    day.prep = day.prep.includes(d.id) ? day.prep.filter((x) => x !== d.id) : [...day.prep, d.id];
    save();
    renderSheet();
    if (state.checklist.every((c) => day.prep.includes(c.id))) toast('ของครบ! ออกเดินทางได้ 🎒');
  },

  // week & food
  weekOpen: (d) => {
    ui.weekOpen = ui.weekOpen === d.key ? null : d.key;
    renderWeek();
  },
  foodDay: (d) => {
    ui.foodDay = d.key;
    renderFood();
  },
  shopToggle: (d) => {
    const ws = weekStart(todayKey());
    const list = new Set(state.shopping[ws] ?? []);
    if (list.has(d.name)) list.delete(d.name);
    else list.add(d.name);
    state.shopping = { [ws]: [...list] }; // only this week matters
    save();
    renderFood();
  },

  // settings
  goal: (d) => {
    state.settings.waterGoal = Math.min(20, Math.max(1, state.settings.waterGoal + Number(d.n)));
    save();
    render();
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
    swReg.showNotification('🐾 ทดสอบแจ้งเตือนจากเหมียวสมาธิ', {
      body: 'ถ้าเห็นข้อความนี้ แปลว่าแจ้งเตือนใช้งานได้',
      icon: 'icons/icon.svg',
      tag: 'test',
    }).catch(() => toast('ส่งแจ้งเตือนไม่สำเร็จ'));
  },
  export: () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `meow-health-${todayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  reset: () => {
    if (!confirm('ลบข้อมูลทั้งหมดและเริ่มใหม่ใช่ไหม? กู้คืนไม่ได้นะ')) return;
    replaceState(defaultState());
    openOnboard();
  },
};

function replaceState(next) {
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, next);
  save();
  render();
}

const changes = {
  photo: async (el) => {
    const file = el.files?.[0];
    if (!file) return;
    const { id } = el.dataset;
    try {
      const blob = await resizePhoto(file);
      await photos.put(id, blob);
      if (ui.photoUrls[id]) URL.revokeObjectURL(ui.photoUrls[id]);
      ui.photoUrls[id] = URL.createObjectURL(blob);
      toast('ใส่รูปเครื่องจริงแล้ว 📷');
      renderSheet();
      render();
    } catch {
      toast('บันทึกรูปไม่สำเร็จ ลองใหม่อีกครั้งนะ');
    } finally {
      el.value = '';
    }
  },
  remTime: (el) => {
    const r = state.settings.reminders.find((x) => x.id === el.dataset.id);
    if (!r || !el.value) return;
    r.time = el.value;
    delete state.reminderLog[todayKey()]?.[r.id]; // a new time is a fresh reminder for today
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
  machine: (form) => saveMachine(form),
  prepAdd: (form) => {
    const text = form.text.value.trim();
    if (!text) return;
    state.checklist.push({ id: newId(), text });
    save();
    render();
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
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && ui.sheets.length) popSheet();
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"][data-act]')) {
    e.preventDefault();
    e.target.click();
  }
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
  if (document.visibilityState === 'visible') {
    tick();
    renderTimer();
  }
});

// ---------- start ----------
history.replaceState(null, '');
render();
if (!state.profile) openOnboard();
tick();
setInterval(tick, 20_000);

photos.all().then((all) => {
  for (const [id, blob] of Object.entries(all)) ui.photoUrls[id] = URL.createObjectURL(blob);
  if (Object.keys(all).length) {
    render();
    renderSheet();
  }
}).catch(() => { /* IndexedDB unavailable: line drawings only */ });

// Links opened from a notification when no window was open: ?r=<id>&t=<type>&a=<action>
const params = new URLSearchParams(location.search);
if (params.has('r') && state.profile) {
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
