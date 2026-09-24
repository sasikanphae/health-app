import {
  dateKey, parseKey, addDays, emptyDay, readiness, dueReminders, SLEEP_HOURS, LEVELS,
} from './health.js';
import {
  GOALS, SLOTS, ACTIVITIES, FOCUS, INTENSITY, planWeek, gymSessionToday, sessionItems,
  prescription, treadmillPlan, dayTimeline, weekStart,
} from './planner.js';
import {
  MEAL_SLOTS, FOOD_MODES, BUDGETS, ALLERGIES, AVOID, SOURCES, MENUS, dayMeals, mealDayType,
  shoppingList, DAY_TYPE_LABEL, candidates,
} from './meals.js';
import {
  MACHINES, ALTERNATIVES, ROUTINES, MUSCLES, BODY_PARTS, HOME_EXERCISES, exerciseInfo, machineById,
} from './gym-data.js';
import { mascot, machineArt, muscleMap } from './art.js';
import { icon, moodIcon } from './icons.js';
import { lifeDue, billCycle, billDueOn, monthOf, addMonths } from './life.js';
import {
  arrangeDay, weatherAdapt, travelProfile, travelSession, postponable, isOutdoor, WEATHER, WORKOUT_MINUTES, EVENT_MINUTES,
} from './arrange.js';
import { createInbox } from './inbox-view.js';
import { createLife } from './life-view.js';
import {
  ACTIVITY_LEVELS, WEIGHT_GOALS, SEXES, LIMITS, bmi, bmiInfo, calorieTarget, waterGoal, stepGoal,
  logWeight, latestWeight, weightTrend, isValidBody, defaultWeightGoal, daysSince,
} from './body.js';
import { recordLift, suggestNext } from './lifts.js';
import {
  findPatterns, findHabit, weeklyStory, rewardProgress, REWARD_METRICS, monthlyStory, specialDay, sleepHoursOf,
} from './insights.js';
import { holyDays } from './lunar.js';
import { bell, woodblock, blessing } from './sound.js';
import {
  greeting, cheer, pick, NIGHT_LINES, LEVEL_ADVICE, ADJUST_TEXT, REMINDER_TEXT,
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
// Travel mode: on until the user turns it off (or its end date passes).
const travelOn = (key = todayKey()) => {
  const tr = state.settings.travel;
  return !!tr?.on && (!tr.until || key <= tr.until);
};
// The profile the planners see: without gym and kitchen while travelling.
const planProfile = (key = todayKey()) => (travelOn(key) ? travelProfile(profile()) : profile());

// "ลดโปรแกรม" accepted from a pattern card: hard → light, light → stretching.
const lighten = (s) => (s.intensity === 'hard'
  ? { ...s, intensity: 'light', adjusted: 'pattern' }
  : { ...s, kind: 'cardio', focus: null, intensity: 'rest', activity: 'mobility', adjusted: 'pattern' });

function computeToday() {
  const key = todayKey();
  const p = planProfile(key);
  const plan = planWeek({ profile: p, today: key, days: state.days });
  const entry = plan.week.find((d) => d.isToday);
  const day = getDay(key);
  // Once a workout is started, keep that exact session for the rest of the day.
  let session = entry.done ? entry.session : (day.active ?? entry.session);
  const holy = state.settings.holyDays ? holyDays(key, key)[key] ?? null : null;
  const travel = travelOn(key);
  if (session && !entry.done) {
    if (day.easy) session = gentle(session, 'easy', key);
    else if (holy && !day.active && !day.holyKeep && session.intensity === 'hard') session = gentle(session, 'holy', key);
    else if (!day.active) {
      if (travel) session = travelSession(session);
      if (day.weather) session = weatherAdapt(session, day.weather);
      if (day.lighten) session = lighten(session);
    }
  }
  return { key, p, plan, entry, day, session, done: entry.done, holy, travel };
}

// A soft stand-in for today's session ("not today" mode, or a calm วันพระ).
// It gets its own id, so finishing it doesn't use up the planned session:
// the planner simply moves that one to a later day.
function gentle(session, reason, key) {
  return {
    ...session, id: `${reason}-${key}`, kind: 'cardio', focus: null, intensity: 'rest', activity: 'mobility', adjusted: reason,
  };
}

// Sounds are optional (Settings) and only ever follow a tap.
const sfx = {
  knock: () => state.settings.sound && woodblock(),
  bell: () => state.settings.sound && bell(),
  bless: () => state.settings.sound && blessing(),
};

function mealsFor(key, session) {
  const p = planProfile(key);
  const day = getDay(key);
  const slots = dayTimeline({ profile: p, session }).filter((i) => i.slot).map((i) => i.slot);
  const meals = dayMeals({ key, food: p.food, dayType: mealDayType(session), slots, swaps: day.mealSwaps });
  // "ลองเมนูใหม่" from a special day replaces that meal.
  for (const [slot, id] of Object.entries(day.mealPick ?? {})) {
    const m = MENUS.find((x) => x.id === id);
    if (m && slots.includes(slot)) meals[slot] = m;
  }
  // A meal already ticked keeps the menu it was ticked with.
  for (const slot of slots) {
    const id = day.meals[slot]?.menuId;
    if (id) meals[slot] = MENUS.find((m) => m.id === id) ?? meals[slot];
  }
  return { slots, meals };
}

// BMI, calorie, water and step targets from the body data and the latest weight.
// Recomputed on every render, so any change (new weight, check-in, workout) shows up everywhere.
function personal(t = computeToday()) {
  const b = t.p.body;
  const w = latestWeight(state.weights);
  if (!b || !w || !isValidBody(b, w.kg)) return null;
  const body = { ...b, weight: w.kg };
  const value = bmi(w.kg, b.height);
  const intensity = t.session && !t.done ? t.session.intensity : (t.done ? t.entry.session?.intensity : 'rest');
  let water = waterGoal(w.kg, intensity);
  let steps = stepGoal(b.activity, t.day.checkin?.level);
  if (t.day.easy) {
    const glasses = Math.max(6, Math.round(water.glasses * 0.75));
    water = { ml: glasses * 250, extra: 0, glasses, easy: true };
    steps = softSteps(steps);
  }
  return {
    body,
    latest: w,
    bmi: value,
    bmiInfo: bmiInfo(value),
    cal: calorieTarget(body),
    water,
    steps,
  };
}

const softSteps = (steps) => Math.max(2000, Math.round((steps * 0.5) / 500) * 500);

// Glasses of water for today: personal when body data exists, otherwise the manual setting.
function waterGoalToday(t = computeToday()) {
  const pers = personal(t);
  const hot = t.day.weather === 'hot' ? 2 : 0; // a hot day needs more water
  if (pers) return pers.water.glasses + hot;
  const goal = state.settings.waterGoal;
  return (t.day.easy ? Math.max(4, Math.round(goal * 0.75)) : goal) + hot;
}

function stepGoalToday(t = computeToday(), pers = personal(t)) {
  if (pers) return pers.steps;
  const goal = stepGoal('light', t.day.checkin?.level);
  return t.day.easy ? softSteps(goal) : goal;
}

function sessionTitle(s) {
  if (!s) return 'วันพัก';
  if (s.adjusted === 'holy') return ROUTINES.meditate.name;
  if (s.intensity === 'rest' || s.activity === 'mobility') return 'ยืดเส้นสบายๆ';
  if (s.kind === 'strength') return `${s.activity === 'gym' ? 'ยิม' : 'เวทที่บ้าน'} · ${FOCUS[s.focus].label}`;
  if (s.activity === 'gym') return 'ลู่วิ่ง · คาร์ดิโอ';
  return ROUTINES[sessionItems(s)[0].id]?.name ?? 'ออกกำลังกาย';
}

function sessionIconName(s) {
  if (!s) return 'moon';
  if (s.adjusted === 'holy') return 'meditate';
  if (s.intensity === 'rest' || s.activity === 'mobility') return 'stretch';
  return { gym: 'dumbbell', home: 'house', run: 'run', walk: 'walk' }[s.activity] ?? 'leaf';
}
const sessionEmoji = (s, size = 18) => icon(sessionIconName(s), { size });

// Line icons for the option lists (the data files carry labels only).
const OPTION_ICONS = {
  goal: { lose: 'scale', strong: 'dumbbell', fit: 'leaf', habit: 'target' },
  slot: { morning: 'sunrise', noon: 'sun', evening: 'sunset', night: 'moon' },
  activities: { gym: 'dumbbell', home: 'house', run: 'run', walk: 'walk' },
  'food.mode': { cook: 'pan', buy: 'bag', mix: 'shuffle' },
  'body.activity': { sedentary: 'house', light: 'walk', moderate: 'steps', active: 'run' },
  'body.weightGoal': { lose: 'scale', keep: 'leaf', gain: 'dumbbell' },
};
const MEAL_ICON = { cook: 'pan', shop: 'meal', store: 'bag' };

function exerciseIconName(info) {
  const id = info.id ?? '';
  if (id.startsWith('walk')) return 'walk';
  if (id.startsWith('run')) return 'run';
  if (id === 'meditate') return 'meditate';
  if (id === 'mobility') return 'stretch';
  if (info.type === 'timed' || info.type === 'cardio') return 'treadmill';
  return 'dumbbell';
}

// Thin SVG progress ring (score, rest timer). p is 0–100.
function ring(p, text, size = 120) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, p)) / 100);
  return `<svg class="ring" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
    <circle class="track" cx="50" cy="50" r="${r}"/>
    <circle class="value" cx="50" cy="50" r="${r}" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 50 50)"/>
    <text x="50" y="50" text-anchor="middle" dominant-baseline="central" font-size="${text.length > 3 ? 20 : 26}">${text}</text></svg>`;
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
  const goal = waterGoalToday();
  const day = editDay(todayKey());
  if (delta > 0) {
    day.water += 1;
    day.waterAt.push(Date.now());
  } else if (day.water > 0) {
    day.water -= 1;
    day.waterAt.pop();
  } else return;
  day.waterMet = day.water >= goal;
  save();
  render();
  if (delta > 0) {
    if (day.water === goal) sfx.bell();
    else sfx.knock();
    toast(day.water === goal ? `ครบ ${goal} แก้ว! น้ำบุญเต็มแก้ว` : `แก้วที่ ${day.water} แล้ว ${cheer()}`, () => addWater(-1));
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
  sfx.knock();
  toast(status === 'plan' ? `กินตามแผนแล้ว ${cheer()}` : 'กินอย่างอื่นก็โอเค แมวไม่ว่าเลย', () => {
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
  sfx.bell();
  toast('ออกกำลังกายเสร็จแล้ว! บุญพุ่ง', () => {
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
  // Going to the gym anyway on a "not today" day is the user's call.
  if (gym && day.easy) day.easy = false;
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
  logLift(currentId(day, itemId), day.sets[itemId], rx.sets, t.session.intensity);
  save();
  const allDone = sessionItems(t.session).every((i) => itemDone(day, i, t.session));
  if (allDone) {
    stopTimer();
    completeWorkout(t.session);
  } else if (day.sets[itemId] < rx.sets) {
    sfx.knock();
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
    toast(done ? 'ครบเวลาแล้ว เก่งมาก!' : 'หมดเวลาพัก ลุยเซ็ตต่อไป!');
    done?.();
    return;
  }
  const s = Math.ceil(left / 1000);
  const text = s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}`;
  el.hidden = false;
  el.innerHTML = `
    ${ring((left / t.total) * 100, text, 64)}
    <div class="grow"><div class="head">${esc(t.label)}</div><div class="muted small">หายใจลึกๆ ดื่มน้ำสักอึก</div></div>
    <button class="btn sm soft" data-act="timerAdd">+15 วิ</button>
    <button class="btn sm primary" data-act="timerSkip">ข้าม</button>`;
}

// ---------- sheets (stack + history) ----------
// Sheets close directly. Browser history is only an extra so the phone's back
// button closes a sheet; inside a frame (e.g. an embedded preview) the history
// is shared with the host page, so it isn't touched there at all.
const useHistory = (() => {
  try {
    return window.self === window.top;
  } catch {
    return false;
  }
})();

function pushSheet(sheet) {
  ui.sheets.push(sheet);
  if (useHistory) {
    try {
      history.pushState({ sheet: ui.sheets.length }, '');
    } catch { /* history unavailable: buttons still close sheets */ }
  }
  $('#sheet').scrollTop = 0;
  renderSheet();
}

function replaceSheet(sheet) {
  ui.sheets[ui.sheets.length - 1] = sheet;
  $('#sheet').scrollTop = 0;
  renderSheet();
}

const topSheet = () => ui.sheets[ui.sheets.length - 1];

function closeSheetsTo(depth) {
  if (depth >= ui.sheets.length) return;
  const closed = ui.sheets.splice(depth);
  // Closing the first-run questions early just uses the defaults (editable later).
  if (closed.some((s) => s.type === 'onboard') && !state.profile) {
    state.profile = defaultProfile(state.legacyGymDays);
    save();
    toast('ใช้ค่าเริ่มต้นไปก่อน แก้ได้ในตั้งค่า');
  }
  ui.showAlts = false;
  renderSheet();
  render();
}

function popSheet() {
  closeSheetsTo(ui.sheets.length - 1);
  // Drop the matching history entry; the popstate it fires is then a no-op.
  if (useHistory && (history.state?.sheet ?? 0) > ui.sheets.length) history.back();
}

window.addEventListener('popstate', () => {
  if (useHistory) closeSheetsTo(history.state?.sheet ?? 0);
});

function renderSheet() {
  const s = topSheet();
  const el = $('#sheet');
  el.hidden = !s;
  document.body.style.overflow = s ? 'hidden' : '';
  document.body.classList.toggle('sheet-open', !!s);
  if (!s) return;
  $('#sheet-body').innerHTML = {
    onboard: renderOnboard,
    checkin: renderCheckin,
    session: renderSession,
    exercise: renderExercise,
    arrange: renderArrange,
    wrapped: renderWrapped,
    review: inbox.renderReview,
    leave: life.renderLeave,
    event: life.renderEvent,
    bill: life.renderBill,
  }[s.type](s);
}

const sheetTop = (title = '', { close = '‹' } = {}) => `
  <div class="sheet-top">
    <button class="icon-btn" data-act="back" aria-label="ย้อนกลับ">${close}</button>
    <span class="head">${title}</span>
    <span style="min-width:48px"></span>
  </div>`;

// ---------- first-run questions ----------
const OB_LAST = 6;
const BODY_STEP = 2;

function onboardDraft() {
  const draft = structuredClone(state.profile ?? defaultProfile(state.legacyGymDays));
  draft.body ??= { height: '', age: '', sex: null, activity: 'light', weightGoal: defaultWeightGoal(draft.goal) };
  draft.weightKg = latestWeight(state.weights)?.kg ?? '';
  return draft;
}

function openOnboard(edit = false) {
  pushSheet({ type: 'onboard', step: edit ? 1 : 0, edit, draft: onboardDraft() });
}

// Just the body questions, from the "ของฉัน" screen.
function openBodyEdit() {
  pushSheet({ type: 'onboard', step: BODY_STEP, edit: true, bodyOnly: true, wgTouched: true, draft: onboardDraft() });
}

// Numbers typed into the body step, or null when something is missing or out of range.
function draftBody(d) {
  const body = { ...d.body, height: Number(d.body.height), age: Number(d.body.age) };
  const kg = Number(d.weightKg);
  return isValidBody(body, kg) ? { body, kg } : null;
}

function saveBody(d) {
  const parsed = draftBody(d);
  if (!parsed) return false;
  const latest = latestWeight(state.weights);
  if (!latest || latest.kg !== parsed.kg) state.weights = logWeight(state.weights, todayKey(), parsed.kg);
  return parsed.body;
}

function bodyStep(s, { top, opt }) {
  const d = s.draft;
  const num = (field, label, value, [lo, hi], unit) => `<label>${label}
    <input type="number" inputmode="decimal" data-input="${field}" value="${esc(value)}" min="${lo}" max="${hi}" step="${field === 'weightKg' ? 0.1 : 1}" placeholder="${unit}"></label>`;
  const head = s.bodyOnly
    ? `<div class="sheet-top"><button class="icon-btn" data-act="back" aria-label="ปิด">✕</button><span class="head">ข้อมูลร่างกาย</span><span style="width:48px"></span></div>`
    : top;
  const foot = s.bodyOnly
    ? '<button class="btn primary big block" data-act="obSaveBody">บันทึก</button>'
    : `<button class="btn primary big block" data-act="obBodyNext">ต่อไป</button>
       <button class="btn ghost block" data-act="obBodySkip">ข้ามส่วนนี้ไปก่อน</button>`;
  return `${head}
    <div class="question">ขอรู้จักร่างกายหน่อยนะ</div>
    <p class="center muted small">แมวจะคำนวณ BMI แคลอรี่ น้ำ และก้าวเดินให้ · ข้อมูลอยู่ในเครื่องนี้เท่านั้น</p>
    <div class="form-grid two">
      ${num('weightKg', 'น้ำหนัก (กก.)', d.weightKg, LIMITS.weight, 'เช่น 60')}
      ${num('height', 'ส่วนสูง (ซม.)', d.body.height, LIMITS.height, 'เช่น 160')}
      ${num('age', 'อายุ (ปี)', d.body.age, LIMITS.age, 'เช่น 30')}
      <div><div class="small muted">เพศ</div><div class="chips">${Object.entries(SEXES).map(([k, l]) =>
        `<button class="chip" data-act="obPick" data-field="body.sex" data-v="${k}" aria-pressed="${d.body.sex === k}">${l}</button>`).join('')}</div></div>
    </div>
    <div class="field-label">ในชีวิตประจำวัน ขยับตัวแค่ไหน</div>
    <div class="opts two">${Object.entries(ACTIVITY_LEVELS).map(([k, a]) => opt('body.activity', k, a.label, null, a.hint)).join('')}</div>
    <div class="field-label">อยากให้น้ำหนัก</div>
    <div class="opts">${Object.entries(WEIGHT_GOALS).map(([k, g]) => opt('body.weightGoal', k, g.label)).join('')}</div>
    <div class="sheet-foot">${foot}</div>`;
}

function renderOnboard(s) {
  const d = s.draft;
  const dots = [1, 2, 3, 4, 5].map((i) => `<i class="${i <= s.step ? 'on' : ''}"></i>`).join('');
  const top = s.step > 0 && s.step < OB_LAST
    ? `<div class="sheet-top"><button class="icon-btn" data-act="obBack" aria-label="ย้อนกลับ">‹</button><div class="dots">${dots}</div><span style="width:48px"></span></div>`
    : '';
  const cat = (mood, size = 120) => `<div class="sheet-mascot">${mascot(mood, { size })}</div>`;
  const value = (field) => field.split('.').reduce((o, k) => o?.[k], d);
  const opt = (field, v, label, _unused, sub = '') => {
    const ic = OPTION_ICONS[field]?.[v];
    return `
    <button class="opt" data-act="obPick" data-field="${field}" data-v="${v}" aria-pressed="${value(field) === v}">
      ${ic ? `<span class="emo">${icon(ic)}</span>` : ''}<span>${label}${sub ? `<small>${sub}</small>` : ''}</span></button>`;
  };
  const multi = (field, v, label) =>
    `<button class="chip" data-act="obToggle" data-field="${field}" data-v="${v}" aria-pressed="${value(field).includes(v)}">${label}</button>`;

  switch (s.step) {
    case 0:
      return `${cat('bright', 170)}
        <div class="question">สวัสดีเหมียว~</div>
        <p class="center">ฉันชื่อ <b>เหมียวสมาธิ</b> จะช่วยจำ ช่วยคิด และปรับแผนให้เอง<br>ขอถามสั้นๆ 5 เรื่อง ใช้เวลาราว 1 นาที</p>
        <label class="name-field"><span class="small muted">อยากให้แมวเรียกว่าอะไรดี (ไม่ใส่ก็ได้)</span>
          <input type="text" data-input="name" value="${esc(d.name ?? '')}" maxlength="20" autocomplete="nickname" placeholder="ชื่อเล่น"></label>
        <div class="sheet-foot">
          <button class="btn primary big block" data-act="obNext">เริ่มเลย</button>
          <button class="btn ghost block" data-act="obSkip">ข้ามไปก่อน ใช้ค่าเริ่มต้น</button>
        </div>`;
    case 1:
      return `${top}${cat('normal', 100)}
        <div class="question">อยากได้อะไรจากการออกกำลังกาย?</div>
        <div class="opts">${Object.entries(GOALS).map(([k, g]) => opt('goal', k, g.label)).join('')}</div>`;
    case 2:
      return bodyStep(s, { top, opt });
    case 3:
      return `${top}
        <div class="question">ว่างวันไหน ช่วงไหนบ้าง?</div>
        <div class="field-label">วันที่พอว่าง (เลือกได้หลายวัน)</div>
        <div class="weekdays">${WEEK_ORDER.map((n) => multi('days', n, WEEKDAYS[n])).join('')}</div>
        <div class="field-label">ช่วงเวลาที่สะดวก</div>
        <div class="opts two">${Object.entries(SLOTS).map(([k, sl]) => opt('slot', k, sl.label, null, `${sl.hint} · ${sl.time}`)).join('')}</div>
        <div class="sheet-foot"><button class="btn primary big block" data-act="obNext" ${d.days.length ? '' : 'disabled'}>ต่อไป</button></div>`;
    case 4:
      return `${top}${cat('bright', 100)}
        <div class="question">ชอบขยับตัวแบบไหน?</div>
        <p class="center muted">เลือกได้หลายอย่าง</p>
        <div class="opts two">${Object.entries(ACTIVITIES).map(([k, a]) => `
          <button class="opt" data-act="obToggle" data-field="activities" data-v="${k}" aria-pressed="${d.activities.includes(k)}">
            <span class="emo">${icon(OPTION_ICONS.activities[k])}</span><span>${a.label}</span></button>`).join('')}</div>
        <div class="sheet-foot"><button class="btn primary big block" data-act="obNext" ${d.activities.length ? '' : 'disabled'}>ต่อไป</button></div>`;
    case 5:
      return `${top}
        <div class="question">เรื่องกินล่ะ?</div>
        <div class="field-label">ส่วนใหญ่ได้อาหารจากไหน</div>
        <div class="opts">${Object.entries(FOOD_MODES).map(([k, m]) => opt('food.mode', k, m.label)).join('')}</div>
        <div class="field-label">แพ้อะไรไหม</div>
        <div class="chips">${Object.entries(ALLERGIES).map(([k, l]) => multi('food.allergies', k, l)).join('')}</div>
        <div class="field-label">ไม่กินอะไร</div>
        <div class="chips">${Object.entries(AVOID).map(([k, l]) => multi('food.avoid', k, l)).join('')}</div>
        <div class="field-label">งบต่อมื้อ</div>
        <div class="opts">${Object.entries(BUDGETS).map(([k, b]) => opt('food.budget', k, b.label, null, b.hint)).join('')}</div>
        <div class="sheet-foot"><button class="btn primary big block" data-act="obFinish">เสร็จแล้ว</button></div>`;
    default: {
      const plan = planWeek({ profile: state.profile, today: todayKey(), days: state.days });
      const n = plan.week.filter((w) => w.session).length;
      return `${cat('bright', 170)}
        <div class="question">เรียบร้อยเหมียว!</div>
        <p class="center">แมวจัดตารางให้แล้ว สัปดาห์นี้ออกกำลังกาย <b>${n} วัน</b><br>สลับหนัก-เบา-พัก พร้อมเมนูอาหารทุกมื้อ</p>
        <p class="center muted small">วันไหนไม่สะดวกก็ไม่เป็นไร แมวจะย้ายตารางให้เอง</p>
        <div class="sheet-foot"><button class="btn primary big block" data-act="back">ไปดูวันนี้กัน</button></div>`;
    }
  }
}

// ---------- morning check-in ----------
const CHECKIN_STEPS = [
  { field: 'sleepHours', q: 'เมื่อคืนนอนไปกี่ชั่วโมง?', options: SLEEP_HOURS.map((s) => ({ value: s.id, label: s.label })) },
  { field: 'sleepQuality', q: 'หลับสบายแค่ไหน?', options: [{ value: 1, label: 'หลับๆ ตื่นๆ' }, { value: 2, label: 'พอใช้' }, { value: 3, label: 'หลับสบายมาก' }] },
  { field: 'soreness', q: 'ตอนนี้เมื่อยตรงไหนบ้าง?' },
  { field: 'stress', q: 'ความเครียดตอนนี้?', options: [{ value: 1, label: 'สบายมาก' }, { value: 2, label: 'นิดหน่อย' }, { value: 3, label: 'ปานกลาง' }, { value: 4, label: 'ค่อนข้างมาก' }, { value: 5, label: 'มากๆ' }] },
  { field: 'energy', q: 'พลังงานตอนนี้?', options: [{ value: 1, label: 'หมดแรง' }, { value: 2, label: 'ต่ำ' }, { value: 3, label: 'กลางๆ' }, { value: 4, label: 'ดี' }, { value: 5, label: 'เต็มหลอด' }] },
];

function openCheckin() {
  const day = getDay(todayKey());
  const existing = day.checkin;
  // Anything already mentioned ("ปวดหลัง" in the inbox) is pre-filled.
  pushSheet({ type: 'checkin', step: 0, answers: existing ? structuredClone(existing.answers) : { soreness: { ...(day.pendingSore ?? {}) } } });
}

function finishCheckin(s) {
  const result = readiness(s.answers);
  editDay(todayKey()).checkin = { answers: s.answers, ...result, at: Date.now() };
  save();
  sfx.bell();
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
      <div class="center">
        ${ring(c.score, String(c.score), 112)}
        <div class="question" style="margin:12px 0 4px">${lv.label}</div>
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
        <button class="btn primary big block" data-act="back">เข้าใจแล้ว</button>
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
    const faces = { sleepQuality: (v) => [0, 2, 3, 5][v], stress: (v) => 6 - v, energy: (v) => v }[step.field];
    const withIc = step.options.map((o) => ({ ...o, ic: faces ? moodIcon(faces(o.value), { size: 24 }) : '' }));
    content = `<div class="opts">${withIc.map((o) => `
      <button class="opt" data-act="ciPick" data-v="${o.value}" aria-pressed="${o.value === cur}">${o.ic ? `<span class="emo">${o.ic}</span>` : ''}<span>${o.label}</span></button>`).join('')}</div>`;
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
  return icon(exerciseIconName(info), { size: 28 });
}

const infoName = (info) => info.th ?? info.name;

function renderSession() {
  const t = computeToday();
  const s = t.session;
  if (!s) return `${sheetTop('วันนี้')}<p class="center">วันนี้ไม่มีโปรแกรม พักได้เต็มที่เลย</p>`;
  const items = sessionItems(s);
  const isGym = s.activity === 'gym';
  const doneCount = items.filter((i) => itemDone(t.day, i, s)).length;
  const prep = isGym ? `
    <details class="card"><summary class="head">ของครบยัง? (${state.checklist.filter((c) => t.day.prep.includes(c.id)).length}/${state.checklist.length})</summary>
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
      <span class="head">${done ? '' : progress}</span>
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
      ${t.done ? '<p class="center head">เสร็จแล้ววันนี้ เก่งมาก</p>'
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
        <label class="btn soft sm">${photo ? 'เปลี่ยนรูป' : 'ใส่รูปเครื่องจริงในยิม'}
          <input type="file" accept="image/*" capture="environment" data-change="photo" data-id="${id}" hidden></label>
        ${photo ? `<button class="btn ghost sm" data-act="photoDelete" data-id="${id}">ใช้ภาพลายเส้น</button>` : ''}
      </div>`;
  } else {
    picture = `<div class="art-box">${icon(exerciseIconName(info), { size: 56 })}</div>`;
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
        ${complete ? `<p class="head">เสร็จแล้ว</p>${nextButton(t, baseId)}` : `
          <div class="stack">
            <button class="btn primary big block" data-act="timedStart" data-id="${baseId}" data-min="${rx.minutes}">เริ่มจับเวลา ${rx.minutes} นาที</button>
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
        ${complete ? `<p class="head">ครบแล้ว!</p>${nextButton(t, baseId)}`
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
    const history = state.lifts[id] ?? [];
    // Mid-workout the suggestion comes from earlier sessions only, so it doesn't
    // shift after every set; once this machine is done it looks ahead to next time.
    const forToday = item && setsDone(t.day, baseId) < rxFor(t.day, item, t.session).sets;
    const tip = machine.type !== 'strength' ? null : forToday
      ? suggestNext(history.filter((e) => e.date < t.key), { machineId: id, intensity: t.session.intensity })
      : suggestNext(history, { machineId: id, intensity: 'hard' });
    const suggestion = tip ? `<div class="suggest">
        <div class="small muted">${forToday ? 'แนะนำวันนี้' : 'ครั้งหน้าลองใช้'}</div>
        <div class="row between"><span class="stat-value">${kgText(tip.weight)} <small>กก.</small>
          ${tip.delta ? `<span class="badge ${tip.delta > 0 ? 'gold' : ''}">${tip.delta > 0 ? '+' : '−'}${kgText(Math.abs(tip.delta))}</span>` : ''}</span>
          ${forToday || !item ? `<button type="button" class="btn soft sm" data-act="useSuggest" data-kg="${tip.weight}">ใช้ค่านี้</button>` : ''}</div>
        <div class="small">${tip.reason}</div>
      </div>` : '';
    const recent = [...history].reverse().slice(0, 5);
    const log = recent.length ? `<details class="lift-log"${item ? '' : ' open'}><summary class="small muted">ประวัติน้ำหนักที่ยก</summary>
        <ul>${recent.map((e) => `<li><span>${shortDate(e.date)}</span><b>${kgText(e.weight)} กก.</b>
          <span class="muted small">${e.target ? `${e.sets}/${e.target} เซ็ต${e.completed ? ' ✓' : ''}${e.intensity === 'light' ? ' · วันเบา' : ''}` : 'จดไว้ก่อนหน้า'}</span></li>`).join('')}</ul>
      </details>` : '';
    mine = `<form class="card form-grid" data-form="machine" data-id="${id}">
      <h2>ค่าที่ฉันตั้ง</h2>
      ${suggestion}
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
      ${item ? '<p class="muted small center">กดจบเซ็ตแล้ว แมวจดน้ำหนักที่ใช้ให้อัตโนมัติด้วย</p>' : ''}
      ${log}
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
      <div class="steps-h">4. การหายใจ</div><p>${machine.breath}</p></div>
    <div class="card"><h2>จุดที่มักพลาดกันบ่อย</h2>
      ${machine.mistakes.map((x) => `<div class="mistake"><span>${x.wrong}</span><span>${x.fix}</span></div>`).join('')}</div>`
    : `<div class="card"><h2>วิธีทำ</h2>${info.equip ? `<p class="muted small">อุปกรณ์: ${info.equip}</p>` : ''}${ol(info.how)}</div>`;

  // --- alternatives when the machine is taken ---
  let alts = '';
  if (parent && inSession) {
    alts = `<div class="card"><p>กำลังเล่นท่าทดแทนของ <b>${parent.th}</b></p>
      <button class="btn soft block" data-act="unswap" data-id="${baseId}">กลับไปใช้${parent.th}</button></div>`;
  } else if (machine) {
    alts = `<div class="card"><button class="btn soft block" data-act="toggleAlts" aria-expanded="${ui.showAlts}">เครื่องไม่ว่าง? ดูท่าทดแทน</button>
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

// Remember what was lifted today on a strength machine, for next time's suggestion.
function logLift(id, sets, target, intensity) {
  const m = machineById(id);
  const weight = state.machines[id]?.weight;
  if (!m || m.type !== 'strength' || !(weight > 0)) return;
  state.lifts[id] = recordLift(state.lifts[id], {
    date: todayKey(), weight, sets, target, completed: sets >= target, intensity,
  });
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
    toast('จดไว้ให้แล้ว ครั้งหน้าไม่ต้องจำ');
    renderSheet();
    render();
  }
}

// ---------- views ----------
// ---------- today ----------
// Every item of a day in one list: health (check-in, meals, exercise, a short
// break, bedtime) and the user's own things (work, appointments, errands,
// bills). Times the cat suggested ("จัดวันนี้ให้ฉัน") override the defaults.
function dayItems(t) {
  const timeline = [...dayTimeline({ profile: t.p, session: t.session }), { id: 'relax', time: '15:30' }];
  if (t.day.special?.accepted && t.day.special.kind !== 'menu') timeline.push({ id: 'special', time: '17:00' });
  const isDone = (it) => {
    if (it.id === 'checkin') return !!t.day.checkin;
    if (it.slot) return !!t.day.meals[it.slot];
    if (it.id === 'workout') return t.done;
    return !!t.day.ticks[it.id];
  };
  const times = t.day.arranged?.times ?? {};
  const health = timeline.map((it) => ({ ...it, planned: it.time, time: times[it.id] ?? it.time, moved: !!times[it.id] && times[it.id] !== it.time, done: isDone(it) }));
  const lifeItems = life.todayItems(t.key).map((i) => (times[i.id] ? { ...i, planned: i.time, time: times[i.id], moved: true } : { ...i, planned: i.time }));
  const timed = [...health, ...lifeItems.filter((i) => i.time)].sort((a, b) => a.time.localeCompare(b.time));
  return [...lifeItems.filter((i) => !i.time), ...timed];
}

// Plain-language title of any item (night summary, arrange sheet).
function itemTitle(it, t, meals) {
  if (it.life === 'event') return it.ev.title;
  if (it.life === 'bill') return `จ่าย${it.bill.title}`;
  if (it.id === 'checkin') return 'เช็กอินตอนเช้า';
  if (it.slot) return MEAL_SLOTS[it.slot].label + (meals?.[it.slot] ? ` (${meals[it.slot].name})` : '');
  if (it.id === 'workout') return sessionTitle(t.session);
  if (it.id === 'relax') return ROUTINES.breathe.name;
  if (it.id === 'rest') return 'วันพัก';
  return 'วางมือถือ เตรียมนอน';
}

const candidatesForDinner = (t) => candidates(t.p.food, 'd');

const timeGreeting = (hour) => (hour < 5 ? 'ดึกแล้วนะ' : hour < 11 ? 'อรุณสวัสดิ์' : hour < 16 ? 'สวัสดีตอนบ่าย' : hour < 20 ? 'สวัสดีตอนเย็น' : 'ใกล้เวลาพักแล้ว');
const isNight = (hour) => hour >= 20 || hour < 4;
const learning = () => state.settings.learn !== false;

function renderToday() {
  const t = computeToday();
  const { meals } = mealsFor(t.key, t.session);
  const items = dayItems(t);
  const done = items.filter((i) => i.done).length;
  const nowIdx = items.findIndex((i) => !i.done);
  const hour = new Date().getHours();
  const night = isNight(hour);
  const mood = t.day.easy || night ? 'sleepy' : t.day.checkin ? LEVELS[t.day.checkin.level].mood : 'normal';
  const habit = learning() ? findHabit({ days: state.days, profile: t.p, today: t.key, hour }) : null;
  const msg = night ? pick(NIGHT_LINES, t.key) : greeting({
    key: t.key, mood, checkedIn: !!t.day.checkin, done, total: items.length,
    isRestDay: !t.session, missed: t.plan.missed, hour, easy: t.day.easy, habit, holy: t.holy,
  });
  const pers = personal(t);
  const goal = waterGoalToday(t);
  const name = state.profile?.name?.trim();

  // Everything done: ring the blessing once (only after a tap, never on page load).
  if (items.length && done === items.length && !t.day.celebrated && ui.userActed) {
    editDay(t.key).celebrated = true;
    save();
    sfx.bless();
  }
  const glasses = Array.from({ length: Math.max(goal, t.day.water) }, (_, i) =>
    `<i class="${i < t.day.water ? 'full' : ''}"></i>`).join('');
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;
  const arranged = t.day.arranged;

  $('#view-today').innerHTML = `
    <div class="hero">
      ${mascot(mood, { size: 112 })}
      <div class="grow">
        <h1 class="hello">${timeGreeting(hour)}${name ? ` ${esc(name)}` : ''}</h1>
        <div class="bubble">${msg}</div>
        <div class="hero-meta">
          <span class="muted small">${thaiDate(t.key)}</span>
          ${t.travel ? `<button class="chip-mini" data-act="travelToggle">${icon('bag', { size: 14 })}โหมดเดินทาง</button>` : ''}
          ${t.day.weather ? `<span class="chip-mini">${icon(WEATHER[t.day.weather].icon, { size: 14 })}${WEATHER[t.day.weather].label}</span>` : ''}
        </div>
      </div>
    </div>

    <div class="progress-line" role="status">
      <span class="count"><b>${done}/${items.length}</b> เสร็จแล้ว</span>
      <div class="pbar" aria-hidden="true"><div style="width:${pct}%"></div></div>
    </div>

    <div class="main-actions">
      <button class="btn primary" data-act="arrange">${icon('shuffle', { size: 18 })}จัดวันนี้ให้ฉัน</button>
      ${t.day.easy ? '<button class="btn soft" data-act="easyOff">กลับเป็นวันปกติ</button>'
    : `<button class="btn soft" data-act="easyOn">${icon('cloud', { size: 18 })}วันนี้ไม่ไหว</button>`}
    </div>
    ${arranged ? `<button class="arranged-note" data-act="arrange">${icon('check', { size: 16 })}แมวจัดวันนี้ให้แล้ว ${arranged.changes.length ? `· ปรับ ${arranged.changes.length} อย่าง` : ''} · ดูเหตุผล</button>` : ''}

    ${inbox.bar()}
    ${easyCard(t, pers, goal)}
    ${suggestionCard(t, { hour, night, items, meals })}

    <ol class="timeline">${items.map((it, i) => (it.life ? life.timelineItem(it, i === nowIdx) : timelineItem(it, t, meals, i === nowIdx))).join('')}</ol>

    <div class="card quick">
    <div class="water">
      <span class="label-ic">${icon('drop')}</span>
      <span class="grow">
        <span class="glasses" aria-hidden="true">${glasses}</span>
        <span class="small muted">${t.day.water}/${goal} แก้ว${pers?.water.extra ? ` · วันนี้ออกกำลังกาย +${pers.water.extra} มล.` : ''}${t.day.weather === 'hot' ? ' · อากาศร้อน +2 แก้ว' : ''}</span>
      </span>
      <button class="icon-btn" data-act="water" data-n="-1" aria-label="ลบ 1 แก้ว" ${t.day.water ? '' : 'disabled'}>−</button>
      <button class="btn primary" data-act="water" data-n="1">+1 แก้ว</button>
    </div>
    ${stepsRow(t, pers)}
    ${moodRow(t)}
    </div>
    <div class="tools two">
      <button class="tool" data-act="leaveOpen">${icon('door')}<span>ออกจากบ้าน</span></button>
      <button class="tool" data-act="expQuick">${icon('wallet')}<span>จดรายจ่าย</span></button>
    </div>`;
}

const MOODS = [
  { v: 1, l: 'แย่มาก' }, { v: 2, l: 'ไม่ค่อยดี' }, { v: 3, l: 'เฉยๆ' },
  { v: 4, l: 'ดี' }, { v: 5, l: 'ดีมาก' },
];

// One tap; feeds the patterns ("days you exercise, your mood is better").
function moodRow(t) {
  return `<div class="water mood-row" role="group" aria-label="วันนี้รู้สึกอย่างไร">
    <span class="label-ic">${icon('heart')}</span><span class="small muted nowrap">ใจวันนี้</span>
    <div class="moods">${MOODS.map((m) => `<button data-act="mood" data-v="${m.v}" aria-label="${m.l}" aria-pressed="${t.day.mood === m.v}">${moodIcon(m.v)}</button>`).join('')}</div>
  </div>`;
}

// "วันนี้ไม่ไหว": everything for today, softer. Only today; tomorrow is normal again.
function easyCard(t, pers, waterGoalNow) {
  if (!t.day.easy) return '';
  const moved = (t.day.postponed ?? []).map((id) => state.events.find((e) => e.id === id)).filter(Boolean);
  return `<div class="card easy-card">
    <div class="head">วันนี้ไม่ต้องเอา 100% ก็ได้</div>
    <ul class="soft-list small">
      <li>น้ำ ${waterGoalNow} แก้ว · เดิน ${stepGoalToday(t, pers).toLocaleString('th-TH')} ก้าว</li>
      <li>${t.session && !t.done ? 'ออกกำลังกาย → ยืดเส้น 10 นาที (ไม่ทำก็ได้)' : 'ไม่ต้องออกกำลังกาย'} · อาหารเบาๆ</li>
      ${moved.length ? `<li>เลื่อนไปพรุ่งนี้: ${moved.map((e) => esc(e.title)).join(', ')}</li>` : ''}
    </ul>
    <p class="small muted">โปรแกรมที่พักวันนี้ แมวย้ายไปวันอื่นให้เอง · นัดหมายกับงานด่วนยังอยู่ที่เดิม</p>
  </div>`;
}

// At most one suggestion at a time, most useful first, so Today stays calm.
function suggestionCard(t, { hour, night, items, meals }) {
  if (night) return nightCard(t, items, meals);
  if (t.holy) return holyCard(t);
  if (t.day.easy) return '';
  const patterns = learning()
    ? findPatterns({ days: state.days, profile: t.p, today: t.key, todayCheckin: t.day.checkin })
      .filter((p) => !state.insightSeen[p.id] || daysSince(state.insightSeen[p.id], t.key) >= 14)
    : [];
  const actionable = patterns.find((p) => p.action && !t.day.lighten);
  if (actionable) return patternCard(actionable);
  const sp = specialToday(t);
  if (sp) return specialCard(sp);
  const lastMonth = monthOf(addDays(`${monthOf(t.key)}-01`, -1));
  if (Number(t.key.slice(8)) <= 3 && state.wrappedSeen !== lastMonth && Object.keys(state.days).some((k) => k.startsWith(lastMonth))) {
    return `<button class="card story-teaser" data-act="openWrapped" data-ym="${lastMonth}">
      <span class="card-ic">${icon('book', { size: 20 })}</span><span class="grow"><span class="head">สรุปเดือนที่แล้วพร้อมแล้ว</span><br><span class="small muted">เรื่องเล่าสั้นๆ ของเดือนที่ผ่านมา</span></span><span class="chev">›</span></button>`;
  }
  const ws = weekStart(t.key);
  if (daysSince(ws, t.key) <= 1 && state.storySeen !== ws) {
    const prevWs = addDays(ws, -7);
    if (Array.from({ length: 7 }, (_, i) => addDays(prevWs, i)).some((k) => state.days[k])) {
      return `<button class="card story-teaser" data-act="openStory">
        <span class="card-ic">${icon('book', { size: 20 })}</span><span class="head grow">เรื่องเล่าสัปดาห์ที่แล้วพร้อมแล้ว</span><span class="chev">›</span></button>`;
    }
  }
  if (patterns[0]) return patternCard(patterns[0]);
  for (const r of state.rewards.filter((x) => !x.claimedAt)) {
    const pr = rewardProgress(r, state.days, t.key);
    if (!pr.near && !pr.done) continue;
    const m = REWARD_METRICS[r.metric];
    return `<div class="card reward-card">
      <div class="head row"><span class="card-ic">${icon('gift', { size: 20 })}</span>${pr.done ? `ครบแล้ว! ได้เวลา${esc(r.title)}` : `อีก ${pr.left} ${m.unit} จะได้${esc(r.title)}`}</div>
      ${progressBar(pr.pct, `${m.label} ${pr.count}/${pr.target} ${m.unit}`)}
      ${pr.done ? `<button class="btn primary sm" data-act="claimReward" data-id="${r.id}">รับรางวัลแล้ว</button>` : ''}
    </div>`;
  }
  return '';
}

function patternCard(p) {
  return `<div class="card insight">
    <div class="small muted row"><span class="card-ic">${icon('eye', { size: 18 })}</span>ข้อสังเกตจากแมว (ไม่ใช่คำวินิจฉัย)</div>
    <p class="head">${p.text}</p>
    <p class="small">${p.tip}</p>
    <div class="row wrap">
      ${p.action ? `<button class="btn primary sm" data-act="patternAction" data-id="${p.id}" data-action="${p.action.id}">${p.action.label}</button>` : ''}
      <button class="btn ghost sm" data-act="insightSeen" data-id="${p.id}">${p.action ? 'ไม่เป็นไร' : 'ขอบใจนะ'}</button>
    </div>
  </div>`;
}

function holyCard(t) {
  const swapped = t.session?.adjusted === 'holy';
  return `<div class="card holy-card">
    <div class="row"><span class="holy-mark" aria-hidden="true">${icon('lotus')}</span>
      <div class="grow"><div class="head">วันนี้วันพระ · ${t.holy.label}</div>
        <p class="small">${swapped ? 'แมวชวนนั่งสมาธิกับยืดเหยียดเบาๆ แทนวันเล่นหนัก โปรแกรมเดิมย้ายไปวันถัดไปให้แล้ว'
    : 'วันดีๆ สำหรับนั่งสมาธิสักครู่ หรือยืดเหยียดเบาๆ ให้ใจสงบ'}</p></div></div>
    ${swapped ? '<button class="btn ghost sm" data-act="holyKeep">ขอเล่นตามแผนเดิม</button>' : ''}
    ${t.day.holyKeep ? '<button class="btn ghost sm" data-act="holyCalm">กลับไปแบบเบาๆ ดีกว่า</button>' : ''}
  </div>`;
}

// ---------- special day: something new, now and then ----------
function specialToday(t) {
  if (t.day.special === 'no') return null;
  if (t.day.special) return t.day.special.accepted ? null : t.day.special;
  const recentIds = new Set();
  for (let i = 0; i < 30; i++) {
    const d = state.days[addDays(t.key, -i)];
    for (const m of Object.values(d?.meals ?? {})) if (m.menuId) recentIds.add(m.menuId);
  }
  const menus = candidatesForDinner(t).filter((m) => !recentIds.has(m.id)).map((m) => ({ id: m.id, name: m.name }));
  const tried = new Set(Object.values(state.days).flatMap((d) => Object.keys(d.sets ?? {})));
  const exercises = Object.entries(HOME_EXERCISES).filter(([id]) => !tried.has(id)).map(([id, x]) => ({ id, name: x.name }));
  return specialDay({
    key: t.key, lastSpecial: state.lastSpecial ?? null, easy: t.day.easy, level: t.day.checkin?.level, holy: !!t.holy,
    options: { exercises, menus },
  });
}

function specialCard(sp) {
  return `<div class="card special-card">
    <div class="small muted row"><span class="card-ic">${icon('sparkle', { size: 18 })}</span>วันพิเศษ · ลองอะไรใหม่ๆ ดูไหม</div>
    <p class="head">${esc(sp.title)}</p>
    <p class="small">${esc(sp.text)}</p>
    <div class="row wrap">
      <button class="btn primary sm" data-act="specialYes">ลองดู</button>
      <button class="btn ghost sm" data-act="specialNo">ไว้วันหลัง</button>
    </div>
  </div>`;
}

// ---------- night: a short look back and ahead ----------
function nightCard(t, items, meals) {
  const doneItems = items.filter((i) => i.done);
  const leftTasks = items.filter((i) => !i.done && i.life === 'event' && i.ev.kind !== 'appt');
  const workoutLeft = t.session && !t.done && !t.day.easy;
  const tomorrow = addDays(t.key, 1);
  const ahead = [
    ...state.events.filter((e) => e.date === tomorrow && !e.done).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
      .map((e) => `${e.time ? `${e.time} ` : ''}${esc(e.title)}`),
    ...state.bills.filter((b) => { const c = billCycle(b, tomorrow); return !c.paid && (c.status === 'today' || c.status === 'overdue'); })
      .map((b) => `จ่าย${esc(b.title)}`),
  ];
  const tw = t.plan.week.find((d) => d.key === tomorrow);
  if (tw?.session && !tw.done) ahead.push(`ออกกำลังกาย: ${sessionTitle(tw.session)}`);
  return `<div class="card night-card">
    <div class="small muted row"><span class="card-ic">${icon('moon', { size: 18 })}</span>สรุปก่อนนอน</div>
    <h3 class="flush-top">วันนี้ทำไปแล้ว ${doneItems.length} อย่าง</h3>
    ${doneItems.length ? `<ul class="soft-list small">${doneItems.slice(0, 5).map((i) => `<li>${esc(itemTitle(i, t, meals))}</li>`).join('')}${doneItems.length > 5 ? `<li class="muted">และอีก ${doneItems.length - 5} อย่าง</li>` : ''}</ul>`
    : '<p class="small">วันนี้ได้พักเต็มที่ ก็นับว่าดูแลตัวเองแล้ว</p>'}
    ${leftTasks.length || workoutLeft ? `<p class="small">ที่ยังไม่ได้ทำ ไม่เป็นไร เดี๋ยวเราจัดใหม่${workoutLeft ? ' · ออกกำลังกาย แมวย้ายไปวันถัดไปให้เอง' : ''}</p>
      ${leftTasks.length ? `<button class="btn soft sm" data-act="nightMove">ย้าย ${leftTasks.length} อย่างไปพรุ่งนี้</button>` : ''}` : ''}
    <h3>พรุ่งนี้มีอะไรรอ</h3>
    ${ahead.length ? `<ul class="soft-list small">${ahead.slice(0, 5).map((x) => `<li>${x}</li>`).join('')}</ul>` : '<p class="small muted">พรุ่งนี้ยังโล่ง นอนให้เต็มอิ่มได้เลย</p>'}
  </div>`;
}

// ---------- "จัดวันนี้ให้ฉัน" ----------
// The day as the arranger sees it: original times (not a previous arrangement),
// what can move, and how the user slept and feels.
function arrangeInputs(t) {
  const items = dayItems({ ...t, day: { ...t.day, arranged: null } });
  const d = new Date();
  const mapped = items.map((i) => {
    if (i.life === 'event') {
      const e = i.ev;
      if (!e.time) return e.kind === 'appt' ? null : { id: i.id, kind: 'task', label: e.title, time: null, dur: 30, work: e.kind === 'work', done: i.done };
      return { id: i.id, kind: 'event', label: e.title, time: e.time, dur: EVENT_MINUTES[e.kind] ?? 30, fixed: true, buffer: e.kind === 'appt', done: i.done };
    }
    if (i.life) return null; // bills have no time of day
    const kind = i.id === 'checkin' ? 'checkin' : i.slot ? 'meal' : i.id === 'workout' ? 'workout'
      : i.id === 'relax' ? 'relax' : i.id === 'winddown' ? 'winddown' : 'other';
    return {
      id: i.id, kind, label: itemTitle(i, t), time: i.time, done: i.done,
      dur: kind === 'workout' ? WORKOUT_MINUTES[t.session?.activity] ?? 45 : kind === 'relax' ? 10 : 30,
      outdoor: kind === 'workout' && isOutdoor(t.session), adjusted: kind === 'workout' ? t.session?.adjusted : null,
    };
  }).filter(Boolean);
  const c = t.day.checkin;
  return {
    items: mapped,
    ctx: {
      now: d.getHours() * 60 + d.getMinutes(), sleepHours: sleepHoursOf(c), energy: c?.answers?.energy ?? null,
      stress: c?.answers?.stress ?? null, level: c?.level ?? null, weather: t.day.weather ?? null, travel: t.travel, hasCheckin: !!c,
    },
  };
}

function renderArrange() {
  const t = computeToday();
  const { items, ctx } = arrangeInputs(t);
  const r = arrangeDay(items, ctx);
  const adj = t.session?.adjusted;
  const sessionNote = adj && ADJUST_TEXT[adj] && ['rain', 'hot', 'travel', 'pattern', 'light', 'rest', 'sore', 'swap', 'sore-light'].includes(adj)
    ? `<li>${ADJUST_TEXT[adj]}</li>` : '';
  const w = t.day.weather ?? 'none';
  const chip = (v, label, ic) => `<button class="chip" data-act="arrWeather" data-v="${v}" aria-pressed="${w === v}">${ic ? icon(ic, { size: 18 }) : ''}${label}</button>`;
  return `${sheetTop('จัดวันนี้ให้ฉัน')}
    <div class="sheet-mascot">${mascot(t.day.checkin ? LEVELS[t.day.checkin.level].mood : 'normal', { size: 84 })}</div>
    <div class="question">แมวคิดให้แล้ว</div>
    <p class="center small muted">ดูจากตารางวันนี้ งาน นัดหมาย ช่วงที่ว่าง การนอน พลังงาน และเป้าหมายของเธอ</p>
    <div class="card">
      <div class="small muted">วันนี้เป็นยังไงบ้าง (แตะบอกได้ ไม่บอกก็ได้)</div>
      <div class="chips gap-top">${chip('none', 'อากาศปกติ')}${chip('rain', 'ฝนตก', 'cloud')}${chip('hot', 'ร้อนจัด', 'sun')}
        <button class="chip" data-act="travelToggle" aria-pressed="${t.travel}">${icon('bag', { size: 18 })}กำลังเดินทาง</button></div>
    </div>
    <div class="card">
      <h2>สิ่งที่แมวจะปรับ</h2>
      ${r.changes.map((c) => `<div class="change">
        <div class="row between"><b>${esc(c.label)}</b><span class="nowrap">${c.from ?? 'ยังไม่มีเวลา'} → <b>${c.to}</b></span></div>
        <p class="small muted">${esc(c.reason)}</p></div>`).join('')}
      <ul class="soft-list small">${sessionNote}${r.notes.map((n) => `<li>${n}</li>`).join('')}</ul>
      ${!t.day.checkin ? '<button class="btn ghost sm" data-act="checkin">เช็กอินก่อน (1 นาที)</button>' : ''}
    </div>
    <div class="sheet-foot">
      <button class="btn primary big block" data-act="arrApply">ใช้แผนนี้</button>
      ${t.day.arranged ? '<button class="btn ghost block" data-act="arrReset">กลับเป็นแผนเดิม</button>'
    : '<button class="btn ghost block" data-act="arrCancel">ไม่เป็นไร ใช้แบบเดิม</button>'}
    </div>`;
}

// ---------- monthly wrapped ----------
const monthName = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
};

function renderWrapped(s) {
  const st = monthlyStory({ days: state.days, ym: s.ym, weights: state.weights });
  return `${sheetTop('สรุปเดือน')}
    <div class="sheet-mascot">${mascot('bright', { size: 110 })}</div>
    <div class="question">${monthName(s.ym)}</div>
    <div class="card story-text">${st.lines.map((l) => `<p>${l}</p>`).join('')}</div>
    ${st.highlights.length ? `<div class="card">${st.highlights.map((h) => `<p class="row">${icon('sparkle', { size: 18 })}<span>${h}</span></p>`).join('')}</div>` : ''}
    <p class="small muted center">ความก้าวหน้าสำคัญกว่าความสมบูรณ์แบบเสมอ</p>
    <div class="sheet-foot">
      <button class="btn soft big block" data-act="share" data-kind="month" data-ym="${s.ym}">${icon('heart', { size: 18 })}แชร์ให้คนสนิท</button>
      <button class="btn ghost block" data-act="back">ปิด</button>
    </div>`;
}

// Private sharing: the user picks the person in their own chat app. Nothing is posted anywhere.
async function share(text) {
  try {
    if (navigator.share) {
      await navigator.share({ title: 'ความคืบหน้าของฉัน', text });
      return;
    }
  } catch (e) {
    if (e?.name === 'AbortError') return;
  }
  try {
    await navigator.clipboard.writeText(text);
    toast('คัดลอกแล้ว วางในแชตให้คนสนิทได้เลย');
  } catch {
    toast('แชร์จากเครื่องนี้ไม่ได้');
  }
}

function shareText(kind, d) {
  if (kind === 'month') {
    const st = monthlyStory({ days: state.days, ym: d.ym, weights: state.weights });
    return `สรุปเดือน${monthName(d.ym)} ของฉัน\n${[...st.lines, ...st.highlights].map((l) => `· ${l}`).join('\n')}`;
  }
  const t = computeToday();
  const ws = weekStart(t.key);
  const wk = ui.storyWeek === 'prev' ? addDays(ws, -7) : ws;
  const keys = Array.from({ length: 7 }, (_, i) => addDays(wk, i));
  const prevKeys = keys.map((k) => addDays(k, -7));
  const st = weeklyStory({ days: state.days, weekKeys: keys, prevKeys, profile: t.p, weights: state.weights, until: t.key });
  return `สัปดาห์นี้ของฉัน\n${st.lines.map((l) => `· ${l}`).join('\n')}`;
}

function progressBar(pct, label) {
  const p = Math.round(pct * 100);
  return `<div class="pbar" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100" aria-label="${label}">
    <div style="width:${p}%"></div></div>
    <div class="row between small"><span class="muted">${label}</span><b>${p}%</b></div>`;
}

// Steps are typed in from the phone's own step counter (a web app can't read it).
function stepsRow(t, pers) {
  const goal = stepGoalToday(t, pers);
  const done = t.day.steps;
  const note = t.day.checkin ? { hard: 'วันนี้สดใส เพิ่มให้นิดนึง', light: '', rest: 'วันนี้ง่วง ลดให้แล้ว' }[t.day.checkin.level] : '';
  if (done != null && !ui.editSteps) {
    return `<button class="water steps" data-act="editSteps">
      <span class="label-ic">${icon('steps')}</span>
      <span class="grow">เดินไป <b>${done.toLocaleString('th-TH')}</b> / ${goal.toLocaleString('th-TH')} ก้าว
        ${done >= goal ? ' · ถึงเป้าแล้ว' : ''}</span><span class="small muted">แก้</span></button>`;
  }
  return `<form class="water steps" data-form="steps">
    <span class="label-ic">${icon('steps')}</span>
    <label class="grow">เป้าวันนี้ <b>${goal.toLocaleString('th-TH')}</b> ก้าว${note ? `<br><span class="small muted">${note}</span>` : ''}
      <input type="number" name="steps" inputmode="numeric" min="0" max="100000" placeholder="ใส่จำนวนก้าวจากมือถือ" value="${done ?? ''}" aria-label="จำนวนก้าววันนี้"></label>
    <button class="btn primary sm">บันทึก</button>
  </form>`;
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
    emoji = icon('sun');
    title = 'เช็กอินตอนเช้า';
    sub = c ? `ความพร้อม ${c.score} · ${LEVELS[c.level].label} · แตะเพื่อแก้` : '5 คำถาม แตะตอบข้อละครั้ง';
    actions = '<button class="btn primary" data-act="checkin">เริ่มเช็กอิน</button>';
    tickBtn = tick('checkin');
    editable = !!c;
  } else if (it.slot) {
    const m = meals[it.slot];
    const status = t.day.meals[it.slot]?.status;
    emoji = icon('meal');
    title = `${MEAL_SLOTS[it.slot].label}: ${m ? esc(m.name) : 'เลือกกินตามสะดวก'}`;
    sub = status === 'plan' ? 'กินตามนี้แล้ว' : status === 'other' ? 'กินอย่างอื่น ก็โอเค'
      : m ? `${SOURCES[m.src].label} · ~฿${m.price}` : '';
    actions = `<button class="btn primary" data-act="meal" data-slot="${it.slot}" data-v="plan">กินตามนี้แล้ว</button>
      <button class="btn soft" data-act="meal" data-slot="${it.slot}" data-v="other">กินอย่างอื่น</button>
      <button class="btn ghost sm" data-act="swapMeal" data-slot="${it.slot}">เปลี่ยนเมนู</button>`;
    tickBtn = tick('mealTick', `data-slot="${it.slot}"`);
  } else if (it.id === 'workout') {
    const s = t.session;
    emoji = sessionEmoji(s, 22);
    title = sessionTitle(s);
    sub = `${intensityChip(s)}${t.entry.moved && !t.done ? ' <span class="badge dusk">ย้ายมาจากวันก่อน</span>' : ''}`;
    // วันพระ and "not today" already explain themselves in their own card above.
    if (s.adjusted && !t.done && s.adjusted !== 'holy' && s.adjusted !== 'easy') sub += `<div class="note">${ADJUST_TEXT[s.adjusted]}</div>`;
    actions = s.activity === 'gym'
      ? '<button class="btn lotus" data-act="goGym">วันนี้ไปยิม</button>'
      : '<button class="btn primary" data-act="startSession">เริ่มเลย</button>';
    tickBtn = tick('workoutTick');
  } else if (it.id === 'relax') {
    emoji = icon('leaf');
    title = ROUTINES.breathe.name;
    sub = 'ลุกจากจอ ยืดตัว หายใจช้าๆ ดื่มน้ำสักอึก';
    actions = '<button class="btn soft" data-act="openExercise" data-id="breathe">ดูวิธี</button>';
    tickBtn = tick('tick', 'data-id="relax"');
  } else if (it.id === 'special') {
    const sp = t.day.special;
    emoji = icon('sparkle');
    title = esc(sp.title);
    sub = esc(sp.text);
    if (sp.kind === 'exercise') actions = `<button class="btn soft" data-act="openExercise" data-id="${sp.ref}">ดูวิธีเล่น</button>`;
    tickBtn = tick('tick', 'data-id="special"');
  } else if (it.id === 'rest') {
    emoji = icon('moon');
    title = 'วันพัก';
    sub = 'ยืดเส้นเบาๆ 10 นาทีถ้าอยาก ไม่ทำก็ไม่เป็นไร';
    actions = '<button class="btn soft" data-act="openExercise" data-id="mobility">ดูท่ายืดเส้น</button>';
    tickBtn = tick('tick', 'data-id="rest"');
  } else {
    emoji = icon('bed');
    title = 'วางมือถือ เตรียมนอน';
    sub = 'นอนพอ พรุ่งนี้แมวจะได้สดใส';
    tickBtn = tick('tick', 'data-id="winddown"');
  }

  if (it.moved && !it.done) sub += ` <span class="badge">แมวย้ายจาก ${it.planned}</span>`;
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

// ---------- life calendar ----------
// One calendar for everything, kept quiet: at most three small marks per day
// (appointment, bill, exercise). Tapping a day shows that day as a short list.
function workoutOn(key, t) {
  const done = state.days[key]?.workout;
  if (done?.done) return { title: done.title ?? sessionTitle(done), done: true };
  if (key < t.key) return null;
  const inWeek = t.plan.week.find((d) => d.key === key);
  if (inWeek) {
    const s = inWeek.isToday ? t.session : inWeek.session;
    return s ? { title: sessionTitle(s), done: false } : null;
  }
  // Later weeks: the usual plan, as a rough guide.
  const ws = weekStart(key);
  const s = planWeek({ profile: t.p, today: ws, days: {} }).week.find((d) => d.key === key)?.session;
  return s ? { title: sessionTitle(s), done: false, rough: true } : null;
}

function billsOn(key) {
  return state.bills.filter((b) => {
    if (Object.values(b.paid ?? {}).includes(key)) return true;
    const ym = key.slice(0, 7);
    return billDueOn(b, ym) === key && (b.createdOn ?? key) <= key;
  });
}

function renderWeek() {
  const t = computeToday();
  const ym = ui.calMonth ?? monthOf(t.key);
  const [y, m] = ym.split('-').map(Number);
  const first = `${ym}-01`;
  const n = new Date(y, m, 0).getDate();
  const last = `${ym}-${String(n).padStart(2, '0')}`;
  const holy = state.settings.holyDays ? holyDays(first, last) : {};
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7; // Monday first
  const sel = ui.calDay && ui.calDay.startsWith(ym) ? ui.calDay : (t.key.startsWith(ym) ? t.key : first);
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push('<span></span>');
  for (let d = 1; d <= n; d++) {
    const key = `${ym}-${String(d).padStart(2, '0')}`;
    const hasAppt = state.events.some((e) => e.date === key && e.kind === 'appt');
    const hasEvent = !hasAppt && state.events.some((e) => e.date === key);
    const hasBill = billsOn(key).length > 0;
    const w = workoutOn(key, t);
    const marks = [
      hasAppt ? '<i class="mk mk-appt"></i>' : hasEvent ? '<i class="mk mk-event"></i>' : '',
      hasBill ? '<i class="mk mk-bill"></i>' : '',
      w ? `<i class="mk mk-move${w.done ? ' done' : ''}"></i>` : '',
    ].join('');
    const label = [thaiDate(key, { day: 'numeric', month: 'long' }), hasAppt ? 'มีนัด' : hasEvent ? 'มีรายการ' : '', hasBill ? 'มีบิล' : '', w ? (w.done ? 'ออกกำลังกายแล้ว' : 'มีออกกำลังกาย') : '', holy[key] ? 'วันพระ' : ''].filter(Boolean).join(' ');
    cells.push(`<button class="cal-day${key === t.key ? ' today' : ''}${key === sel ? ' sel' : ''}${key < t.key ? ' past' : ''}" data-act="calDay" data-key="${key}" aria-label="${label}" aria-pressed="${key === sel}">
      <span>${d}${holy[key] ? '<i class="cal-holy" aria-hidden="true"></i>' : ''}</span><span class="marks" aria-hidden="true">${marks}</span></button>`);
  }

  $('#view-week').innerHTML = `
    <div class="view-head"><h1>ปฏิทิน</h1></div>
    <div class="card cal-card">
      <div class="row between">
        <button class="icon-btn" data-act="calMonth" data-n="-1" aria-label="เดือนก่อน">${icon('back', { size: 18 })}</button>
        <h2 class="flush">${monthName(ym)}</h2>
        <button class="icon-btn" data-act="calMonth" data-n="1" aria-label="เดือนถัดไป">${icon('next', { size: 18 })}</button>
      </div>
      <div class="cal">${['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'].map((w) => `<b>${w}</b>`).join('')}${cells.join('')}</div>
      <div class="legend cal-legend"><span><i class="mk mk-appt"></i>นัด</span><span><i class="mk mk-bill"></i>บิล</span><span><i class="mk mk-move"></i>ออกกำลังกาย</span>${state.settings.holyDays ? '<span><i class="cal-holy static"></i>วันพระ</span>' : ''}</div>
    </div>
    ${dayAgenda(sel, t, holy[sel])}
    <p class="small muted">${t.plan.missed > 0 ? 'บางวันได้พักไป ไม่เป็นไรเลย แมวย้ายตารางออกกำลังกายให้แล้ว' : 'ออกกำลังกายสลับหนัก-เบา-พัก แมวจัดและย้ายให้เองถ้าวันไหนไม่ได้ทำ'}</p>
    <button class="btn soft block" data-act="editProfile">เปลี่ยนวันว่าง เป้าหมาย หรือกิจกรรม</button>`;
}

// One day as a short list, all categories together.
function dayAgenda(key, t, holy) {
  const rows = [];
  const row = (time, ic, title, sub = '', done = false) => rows.push({ time, html: `<div class="ag-row${done ? ' done' : ''}">
    <span class="ag-time">${time ?? ''}</span><span class="lr-ic">${icon(ic, { size: 20 })}</span>
    <span class="grow"><span class="lr-title">${title}</span>${sub ? `<br><span class="small muted">${sub}</span>` : ''}</span></div>` });
  for (const e of state.events.filter((x) => x.date === key)) {
    row(e.time, EVENT_ICON[e.kind] ?? 'list', esc(e.title), e.kind === 'appt' ? 'นัดหมาย' : e.kind === 'work' ? 'งาน' : 'ธุระ / การเตือน', e.done);
  }
  for (const b of billsOn(key)) row(null, 'receipt', `จ่าย${esc(b.title)}`, b.amount ? `~฿${b.amount.toLocaleString('th-TH')}` : '', Object.values(b.paid ?? {}).includes(key));
  const w = workoutOn(key, t);
  if (w) row(key === t.key ? dayTimeline({ profile: t.p, session: t.session }).find((i) => i.id === 'workout')?.time : null, 'dumbbell', esc(w.title), w.rough ? 'แผนคร่าวๆ แมวจะจัดให้ละเอียดเมื่อถึงสัปดาห์นั้น' : '', w.done);
  if (t.plan.week.some((d) => d.key === key) && key >= t.key) {
    const { meals } = mealsFor(key, t.plan.week.find((d) => d.key === key)?.isToday ? t.session : t.plan.week.find((d) => d.key === key)?.session);
    const names = Object.values(meals).filter(Boolean).map((mm) => mm.name);
    if (names.length) row(null, 'meal', `มื้ออาหาร ${names.length} มื้อ`, esc(names.join(' · ')));
  }
  if (holy) row(null, 'lotus', `วันพระ · ${holy.label}`, 'วันดีๆ สำหรับทำอะไรเบาๆ ให้ใจสงบ');
  rows.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
  return `<div class="card">
    <div class="row between"><h2 class="flush">${key === t.key ? 'วันนี้' : thaiDate(key)}</h2>
      <button class="btn ghost sm" data-act="eventNew" data-kind="personal" data-date="${key}">${icon('plus', { size: 18 })}เพิ่ม</button></div>
    ${rows.length ? rows.map((r) => r.html).join('') : '<p class="muted small">ยังไม่มีอะไร วันโล่งๆ ก็ดีนะ</p>'}
    ${key === t.key ? '<button class="btn soft block gap-top" data-act="tab" data-view="today">ดูรายละเอียดในหน้าวันนี้</button>' : ''}
  </div>`;
}
const EVENT_ICON = { appt: 'calendar', work: 'briefcase', personal: 'bell' };

function renderFood() {
  const t = computeToday();
  const key = ui.foodDay ?? t.key;
  const entry = t.plan.week.find((d) => d.key === key) ?? t.entry;
  const session = key === t.key ? t.session : entry.session;
  const { slots, meals } = mealsFor(key, session);
  const day = getDay(key);
  const canTick = key === t.key;
  const food = t.p.food;
  const pers = personal(t);

  const cards = slots.map((slot) => {
    const m = meals[slot];
    const status = day.meals[slot]?.status;
    if (!m) {
      return `<div class="card meal"><div class="head">${MEAL_SLOTS[slot].label}</div>
        <p class="muted">ไม่มีเมนูที่ตรงกับเงื่อนไข เลือกกินตามสะดวกเลยนะ</p></div>`;
    }
    return `<div class="card meal${status ? ' done' : ''}">
      <div class="row between wrap"><span class="muted small">${MEAL_SLOTS[slot].label}</span>
        <span class="badge">${SOURCES[m.src].label} · ~฿${m.price}</span></div>
      <div class="row"><span class="tl-emoji">${icon(MEAL_ICON[m.src] ?? 'meal')}</span><span class="meal-name grow">${esc(m.name)}</span></div>
      ${m.steps ? `<ol>${m.steps.map((x) => `<li>${x}</li>`).join('')}</ol>` : `<p class="small">${m.tip}</p>`}
      ${status ? `<p class="head">${status === 'plan' ? 'กินตามนี้แล้ว' : 'กินอย่างอื่น ก็โอเค'}</p>` : ''}
      <div class="tl-actions">
        ${canTick && !status ? `<button class="btn primary" data-act="meal" data-slot="${slot}" data-v="plan">กินตามนี้แล้ว</button>
          <button class="btn soft" data-act="meal" data-slot="${slot}" data-v="other">กินอย่างอื่น</button>` : ''}
        ${!status && key >= t.key ? `<button class="btn ghost sm" data-act="swapMeal" data-slot="${slot}" data-key="${key}">เปลี่ยนเมนู</button>` : ''}
      </div>
    </div>`;
  }).join('');

  const shop = planShopping();
  const ticked = new Set(state.shopping[shop.ws] ?? []);
  const toBuy = shop.items.filter((i) => !i.staple && !ticked.has(i.name)).length + state.shopList.filter((c) => !c.done).length;

  $('#view-food').innerHTML = `
    <div class="view-head"><h1>แผนอาหาร</h1></div>
    <p class="muted small">ไม่ต้องนับแคลอรี่ แค่กดว่ากินตามนี้ หรือกินอย่างอื่นก็พอ</p>
    <div class="day-strip">${t.plan.week.map((d) => {
      const dt = parseKey(d.key);
      return `<button data-act="foodDay" data-key="${d.key}" aria-pressed="${d.key === key}">${WEEKDAYS[dt.getDay()]}<b>${dt.getDate()}</b></button>`;
    }).join('')}</div>
    <div class="note gold">${DAY_TYPE_LABEL[mealDayType(session)]} · ${sessionEmoji(session)} ${sessionTitle(session)}</div>
    ${pers ? `<p class="small muted">เป้าประมาณ ${pers.cal.kcal.toLocaleString('th-TH')} kcal/วัน ไม่ต้องนับ กินตามแผนนี้ก็ใกล้เคียงแล้ว</p>` : ''}
    ${food.allergies.length ? `<p class="small muted">ร้านตามสั่งมักใส่ซอสหอยนางรม น้ำปลา หรือถั่ว บอกร้านทุกครั้งว่าแพ้${food.allergies.map((a) => ALLERGIES[a]).join(', ')}</p>` : ''}
    ${cards}
    <button class="card story-teaser" data-act="openShop">
      <span class="card-ic">${icon('cart', { size: 20 })}</span>
      <span class="grow"><span class="head">ของที่ต้องซื้อ</span><br><span class="small muted">${toBuy ? `เหลือ ${toBuy} อย่าง · รวมของใช้ในบ้านไว้ด้วย` : 'ซื้อครบแล้ว'}</span></span>
      <span class="chev">›</span></button>`;
}

// Ingredients for home-cooked meals from today to the end of the week.
function planShopping() {
  const t = computeToday();
  const rest = t.plan.week.filter((d) => d.key >= t.key)
    .map((d) => mealsFor(d.key, d.isToday ? t.session : d.session).meals);
  return { items: shoppingList(rest), ws: weekStart(t.key) };
}

function renderGym() {
  const t = computeToday();
  const preview = t.done ? null : (t.day.active ?? gymSessionToday({ plan: t.plan, today: t.key, days: state.days, profile: t.p }));
  $('#view-gym').innerHTML = `
    <div class="view-head"><h1>ยิม</h1></div>
    <div class="card">
      <div class="hero">${mascot(t.day.checkin ? LEVELS[t.day.checkin.level].mood : 'bright', { size: 90 })}
        <div class="grow">${t.done ? '<b>วันนี้ออกกำลังกายแล้ว เก่งมาก</b>'
    : `<b>โปรแกรมวันนี้</b><br>${sessionTitle(preview)}<br>${intensityChip(preview)}`}</div></div>
      ${t.done ? '' : '<button class="btn lotus big block" data-act="goGym" style="margin-top:12px">วันนี้ไปยิม</button>'}
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

// ---------- "ของฉัน": personal numbers in one place ----------
const kgText = (n) => `${n.toLocaleString('th-TH', { maximumFractionDigits: 1 })}`;
const shortDate = (key) => thaiDate(key, { day: 'numeric', month: 'short' });

function renderMe() {
  const t = computeToday();
  const pers = personal(t);
  const p = t.p;
  const el = $('#view-me');
  if (!pers) {
    el.innerHTML = `
      <div class="view-head"><h1>ของฉัน</h1></div>
      <div class="card center">
        <div class="sheet-mascot">${mascot('normal', { size: 110 })}</div>
        <p>บอกน้ำหนัก ส่วนสูง อายุ และเพศหน่อย<br>แมวจะคำนวณ BMI แคลอรี่ น้ำ และก้าวเดินให้เอง</p>
        <button class="btn primary big block" data-act="editBody">กรอกข้อมูลร่างกาย</button>
      </div>
      ${storyCard(t)}${rewardsCard(t)}
      <button class="btn soft block" data-act="tab" data-view="settings">ตั้งค่าอื่นๆ</button>`;
    return;
  }

  const { bmi: b, bmiInfo: info, cal, water, steps, latest, body } = pers;
  const trend = weightTrend(state.weights, t.key);
  const since = daysSince(latest.date, t.key);
  const changeText = trend.change == null ? 'ชั่งอีกสักครั้งจะเห็นแนวโน้ม'
    : trend.change === 0 ? 'คงที่ในช่วง 30 วัน'
      : `${trend.change > 0 ? '+' : '−'}${kgText(Math.abs(trend.change))} กก. ใน 30 วัน`;
  const intensityWord = { hard: 'วันหนัก', light: 'วันเบา', rest: '' };

  el.innerHTML = `
    <div class="view-head"><h1>ของฉัน</h1></div>
    <div class="hero">${mascot(t.day.checkin ? LEVELS[t.day.checkin.level].mood : 'normal', { size: 84 })}
      <div class="bubble grow small">ตัวเลขทุกอย่างอัปเดตเองเมื่อชั่งน้ำหนัก เช็กอิน หรือออกกำลังกาย</div></div>

    <div class="stats">
      <div class="stat">
        <div class="stat-label">BMI</div>
        <div class="stat-value">${b.toFixed(1)}</div>
        <span class="badge ${info.key === 'normal' ? 'gold' : 'lotus'}">${info.label}</span>
      </div>
      <div class="stat">
        <div class="stat-label">แคลอรี่ต่อวัน</div>
        <div class="stat-value">${cal.kcal.toLocaleString('th-TH')}</div>
        <span class="small muted">kcal · ${WEIGHT_GOALS[cal.goal].label}</span>
      </div>
      <div class="stat">
        <div class="stat-label">น้ำวันนี้</div>
        <div class="stat-value">${(water.ml / 1000).toFixed(1)} <small>ลิตร</small></div>
        <span class="small muted">${water.glasses} แก้ว${water.extra ? ` · +${water.extra} มล. ${intensityWord[t.session?.intensity] ?? ''}` : ''}</span>
      </div>
      <div class="stat">
        <div class="stat-label">น้ำหนักล่าสุด</div>
        <div class="stat-value">${kgText(latest.kg)} <small>กก.</small></div>
        <span class="small muted">${since === 0 ? 'วันนี้' : `${since} วันก่อน`} · ${changeText}</span>
      </div>
      <div class="stat wide">
        <div class="stat-label">ก้าวเดินวันนี้</div>
        <div class="stat-value">${(t.day.steps ?? 0).toLocaleString('th-TH')} <small>/ ${steps.toLocaleString('th-TH')} ก้าว</small></div>
        <span class="small muted">เป้าปรับตามความพร้อม${t.day.checkin ? ` (${LEVELS[t.day.checkin.level].label})` : ' · เช็กอินแล้วแมวจะปรับให้'}</span>
      </div>
    </div>

    <div class="card">
      <h2>BMI ${b.toFixed(1)} · ${info.label}</h2>
      ${bmiScale(b)}
      <p>${info.text}</p>
      <p class="muted small">เกณฑ์สำหรับคนเอเชีย · BMI ดูแค่น้ำหนักกับส่วนสูง ไม่แยกกล้ามเนื้อกับไขมัน ใช้ดูคร่าวๆ พอ</p>
    </div>

    <div class="card">
      <h2>แคลอรี่ ${cal.kcal.toLocaleString('th-TH')} kcal/วัน</h2>
      <p class="small">ร่างกายใช้พลังงานตอนพัก (BMR) ~${cal.bmr.toLocaleString('th-TH')} kcal
        · รวมการขยับในชีวิตประจำวัน (TDEE) ~${cal.tdee.toLocaleString('th-TH')} kcal</p>
      <p class="small">${{ lose: 'ลดจาก TDEE ราว 500 kcal ≈ ลดได้ ~0.5 กก./สัปดาห์ แบบไม่หักโหม', keep: 'เท่ากับ TDEE เพื่อรักษาน้ำหนักไว้', gain: 'เพิ่มจาก TDEE ราว 300 kcal ให้กล้ามโตแบบไม่อ้วนเร็ว' }[cal.goal]}</p>
      ${cal.note ? `<p class="note">${cal.note}</p>` : ''}
      <p class="muted small">ไม่ต้องนับทุกคำ กินตามแผนอาหารก็ใกล้เคียงแล้ว</p>
    </div>

    <div class="card">
      <h2>น้ำหนัก</h2>
      <form class="stepper" data-form="weight">
        <button type="button" class="btn soft" data-act="stepKg" data-n="-0.1" aria-label="ลด 0.1 กก.">−</button>
        <input type="number" name="kg" inputmode="decimal" step="0.1" min="${LIMITS.weight[0]}" max="${LIMITS.weight[1]}" value="${latest.kg}" class="grow" aria-label="น้ำหนักวันนี้ (กก.)">
        <button type="button" class="btn soft" data-act="stepKg" data-n="0.1" aria-label="เพิ่ม 0.1 กก.">+</button>
        <button class="btn primary">บันทึก</button>
      </form>
      ${since >= 7 ? `<p class="note gold">ไม่ได้ชั่งมา ${since} วัน ชั่งตอนเช้าหลังตื่นนอนจะแม่นที่สุด ไม่ชั่งก็ไม่เป็นไรนะ</p>` : ''}
      ${weightChart(trend.points)}
    </div>

    ${storyCard(t)}${rewardsCard(t)}
    <div class="card">
      <h2>ข้อมูลร่างกาย</h2>
      <p>สูง ${body.height} ซม. · อายุ ${body.age} ปี · ${SEXES[body.sex]}</p>
      <p>${ACTIVITY_LEVELS[body.activity].label} · อยาก${WEIGHT_GOALS[p.body.weightGoal].label}</p>
      <button class="btn soft block" data-act="editBody">แก้ไข</button>
    </div>
    <button class="btn soft block" data-act="tab" data-view="settings">ตั้งค่าอื่นๆ</button>
    <p class="muted small center">ตัวเลขเป็นค่าประมาณจากสูตรมาตรฐาน ไม่ใช่คำแนะนำทางการแพทย์</p>`;
  bindChart(el.querySelector('.wchart'), trend.points);
}

// Weekly story: a few friendly sentences instead of a table.
function storyCard(t) {
  const ws = weekStart(t.key);
  const which = ui.storyWeek ?? 'this';
  const start = which === 'prev' ? addDays(ws, -7) : ws;
  const keys = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const prevKeys = keys.map((k) => addDays(k, -7));
  const story = weeklyStory({ days: state.days, weekKeys: keys, prevKeys, profile: t.p, weights: state.weights, until: t.key });
  if (which === 'prev' && state.storySeen !== ws) {
    state.storySeen = ws;
    save();
  }
  return `<div class="card story">
    <div class="row between wrap"><h2>เรื่องเล่าประจำสัปดาห์</h2>
      <div class="chips">
        <button class="chip" data-act="storyWeek" data-w="this" aria-pressed="${which === 'this'}">สัปดาห์นี้</button>
        <button class="chip" data-act="storyWeek" data-w="prev" aria-pressed="${which === 'prev'}">สัปดาห์ก่อน</button>
      </div></div>
    <p class="muted small">${shortDate(keys[0])} – ${shortDate(keys[6])}${which === 'this' ? ' (ยังไม่จบสัปดาห์)' : ''}</p>
    <div class="hero">${mascot(story.stats.workouts >= 3 ? 'bright' : 'normal', { size: 64 })}
      <div class="story-text">${story.lines.map((l) => `<p>${l}</p>`).join('')}</div></div>
    <button class="btn ghost sm" data-act="share" data-kind="week">${icon('heart', { size: 16 })}แชร์ให้คนสนิท</button>
  </div>
  <div class="card">
    <h2>สรุปรายเดือน</h2>
    <p class="small muted">เล่าเป็นเรื่องสั้นๆ เน้นความก้าวหน้า ไม่ใช่ความสมบูรณ์แบบ</p>
    <div class="row wrap">
      <button class="btn soft sm" data-act="openWrapped" data-ym="${monthOf(t.key)}">เดือนนี้</button>
      <button class="btn soft sm" data-act="openWrapped" data-ym="${addMonths(monthOf(t.key), -1)}">เดือนที่แล้ว</button>
    </div>
  </div>`;
}

// Self-set rewards with a progress bar each.
function rewardsCard(t) {
  const list = state.rewards.map((r) => {
    const pr = rewardProgress(r, state.days, t.key);
    const m = REWARD_METRICS[r.metric];
    return `<div class="reward${r.claimedAt ? ' claimed' : ''}">
      <div class="row between"><b>${esc(r.title)}</b>
        <button class="icon-btn" data-act="rewardDelete" data-id="${r.id}" aria-label="ลบเป้า ${esc(r.title)}">✕</button></div>
      <div class="small muted">เมื่อ${m.label}ครบ ${r.target} ${m.unit} · นับตั้งแต่ ${shortDate(r.start)}</div>
      ${progressBar(pr.pct, r.claimedAt ? `ได้รับรางวัลแล้ว ${shortDate(r.claimedAt)}` : pr.done ? 'ครบแล้ว! ไปรับรางวัลได้เลย' : `${pr.count}/${pr.target} ${m.unit} · อีก ${pr.left}`)}
      ${pr.done && !r.claimedAt ? `<button class="btn primary sm" data-act="claimReward" data-id="${r.id}">รับรางวัลแล้ว</button>` : ''}
    </div>`;
  }).join('');
  return `<div class="card">
    <h2>รางวัลที่ตั้งให้ตัวเอง</h2>
    ${list || '<p class="muted small">ตั้งรางวัลเล็กๆ ไว้ล่อใจตัวเองกัน เช่น "เข้ายิมครบ 20 ครั้ง ซื้อรองเท้าคู่ใหม่"</p>'}
    <form class="form-grid" data-form="reward">
      <label>ทำอะไร<select name="metric">${Object.entries(REWARD_METRICS).map(([k, m]) => `<option value="${k}">${m.label}</option>`).join('')}</select></label>
      <label>ครบกี่ครั้ง/วัน<input type="number" name="target" inputmode="numeric" min="1" max="365" value="20"></label>
      <label>รางวัลคือ<input type="text" name="title" maxlength="60" placeholder="เช่น ซื้อรองเท้าคู่ใหม่" autocomplete="off"></label>
      <button class="btn primary">ตั้งเป้ารางวัล</button>
    </form>
  </div>`;
}

// Where the BMI sits on the scale (Asian cut-offs), with a marker instead of colour-coding.
function bmiScale(value) {
  const lo = 15;
  const hi = 35;
  const pos = (v) => ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * 100;
  const cuts = [18.5, 23, 25, 30];
  return `<div class="bmi-scale" role="img" aria-label="BMI ${value.toFixed(1)} บนสเกล ${lo} ถึง ${hi}">
    <div class="bmi-track">${cuts.map((c) => `<i style="left:${pos(c)}%"></i>`).join('')}
      <b style="left:${pos(value)}%"></b></div>
    <div class="bmi-ticks">${cuts.map((c) => `<span style="left:${pos(c)}%">${c}</span>`).join('')}</div>
  </div>`;
}

// ---------- weight chart ----------
// Two series: each weigh-in (dots) and the 7-day rolling average (line), which
// shows the real trend through normal day-to-day swings.
const CH = { w: 340, h: 180, l: 38, r: 12, t: 12, b: 26 };

function chartScales(points) {
  const vals = points.flatMap((p) => [p.kg, p.avg]);
  let min = Math.floor((Math.min(...vals) - 0.5) * 2) / 2;
  let max = Math.ceil((Math.max(...vals) + 0.5) * 2) / 2;
  if (max - min < 2) {
    const mid = (max + min) / 2;
    min = Math.floor(mid - 1);
    max = Math.ceil(mid + 1);
  }
  const t0 = parseKey(points[0].date).getTime();
  const t1 = parseKey(points[points.length - 1].date).getTime();
  const span = t1 - t0 || 1;
  const x = (date) => (points.length === 1 ? (CH.l + CH.w - CH.r) / 2
    : CH.l + ((parseKey(date).getTime() - t0) / span) * (CH.w - CH.l - CH.r));
  const y = (v) => CH.t + (1 - (v - min) / (max - min)) * (CH.h - CH.t - CH.b);
  return { x, y, min, max };
}

function weightChart(points) {
  if (!points.length) return '<p class="muted small center">ยังไม่มีบันทึกน้ำหนัก ชั่งครั้งแรกแล้วกดบันทึกได้เลย</p>';
  const { x, y, min, max } = chartScales(points);
  const ticks = [min, (min + max) / 2, max];
  const grid = ticks.map((v) => `<line class="wc-grid" x1="${CH.l}" x2="${CH.w - CH.r}" y1="${y(v)}" y2="${y(v)}"/>
    <text class="wc-axis" x="${CH.l - 6}" y="${y(v) + 4}" text-anchor="end">${kgText(v)}</text>`).join('');
  const line = points.length > 1
    ? `<polyline class="wc-trend" points="${points.map((p) => `${x(p.date).toFixed(1)},${y(p.avg).toFixed(1)}`).join(' ')}"/>` : '';
  const dots = points.map((p) => `<circle class="wc-point" cx="${x(p.date).toFixed(1)}" cy="${y(p.kg).toFixed(1)}" r="4"/>`).join('');
  const first = points[0];
  const last = points[points.length - 1];
  const xLabels = `<text class="wc-axis" x="${x(first.date)}" y="${CH.h - 6}" text-anchor="${points.length > 1 ? 'start' : 'middle'}">${shortDate(first.date)}</text>
    ${points.length > 1 ? `<text class="wc-axis" x="${x(last.date)}" y="${CH.h - 6}" text-anchor="end">${shortDate(last.date)}</text>` : ''}`;
  const rows = [...points].reverse().slice(0, 14).map((p) =>
    `<tr><td>${shortDate(p.date)}</td><td>${kgText(p.kg)}</td><td>${kgText(p.avg)}</td></tr>`).join('');
  return `<div class="legend wc-legend">
      <span><i class="dot" style="background:var(--chart-point)"></i>ที่ชั่งแต่ละวัน</span>
      <span><i class="dash" style="background:var(--chart-trend)"></i>แนวโน้ม (เฉลี่ย 7 วัน)</span>
    </div>
    <div class="wchart" tabindex="0" role="img" aria-label="กราฟน้ำหนัก ${points.length} ครั้ง ล่าสุด ${kgText(last.kg)} กก. แนวโน้ม ${kgText(last.avg)} กก. ใช้ปุ่มลูกศรเลื่อนดูทีละวัน">
      <svg viewBox="0 0 ${CH.w} ${CH.h}" aria-hidden="true">
        ${grid}${xLabels}${line}
        <line class="wc-cross" x1="0" x2="0" y1="${CH.t}" y2="${CH.h - CH.b}" hidden/>
        ${dots}
        <circle class="wc-focus" r="6" hidden/>
      </svg>
      <div class="wc-tip" hidden></div>
    </div>
    <details class="wc-table"><summary class="small muted">ดูเป็นตาราง</summary>
      <table><thead><tr><th>วันที่</th><th>ชั่งได้ (กก.)</th><th>แนวโน้ม (กก.)</th></tr></thead><tbody>${rows}</tbody></table>
    </details>`;
}

// Crosshair + tooltip that snaps to the nearest weigh-in (pointer or arrow keys).
function bindChart(box, points) {
  if (!box || !points.length) return;
  const svg = box.querySelector('svg');
  const cross = svg.querySelector('.wc-cross');
  const focus = svg.querySelector('.wc-focus');
  const tip = box.querySelector('.wc-tip');
  const { x, y } = chartScales(points);
  let idx = points.length - 1;
  const show = (i) => {
    idx = i;
    const p = points[i];
    const px = x(p.date);
    cross.setAttribute('x1', px);
    cross.setAttribute('x2', px);
    focus.setAttribute('cx', px);
    focus.setAttribute('cy', y(p.kg));
    cross.hidden = false;
    focus.hidden = false;
    tip.hidden = false;
    tip.textContent = '';
    const d = document.createElement('b');
    d.textContent = thaiDate(p.date, { day: 'numeric', month: 'short', year: '2-digit' });
    tip.append(d, document.createElement('br'), `ชั่งได้ ${kgText(p.kg)} กก.`, document.createElement('br'), `แนวโน้ม ${kgText(p.avg)} กก.`);
    const left = (px / CH.w) * box.clientWidth;
    tip.style.left = `${Math.min(box.clientWidth - tip.offsetWidth, Math.max(0, left - tip.offsetWidth / 2))}px`;
  };
  const hide = () => {
    cross.hidden = true;
    focus.hidden = true;
    tip.hidden = true;
  };
  box.addEventListener('pointermove', (e) => {
    const r = svg.getBoundingClientRect();
    const vx = ((e.clientX - r.left) / r.width) * CH.w;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(x(p.date) - vx) < Math.abs(x(points[best].date) - vx)) best = i;
    });
    show(best);
  });
  box.addEventListener('pointerleave', hide);
  box.addEventListener('focus', () => show(idx));
  box.addEventListener('blur', hide);
  box.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(Math.max(0, idx - 1));
    else if (e.key === 'ArrowRight') show(Math.min(points.length - 1, idx + 1));
    else return;
    e.preventDefault();
  });
}

function renderSettings() {
  const p = profile();
  const pers = personal();
  const s = state.settings;
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';
  const permText = {
    granted: 'เปิดการแจ้งเตือนแล้ว',
    denied: 'การแจ้งเตือนถูกปิดไว้ เปิดได้ในการตั้งค่าของเบราว์เซอร์',
    default: 'ยังไม่ได้เปิดการแจ้งเตือนของระบบ',
    unsupported: 'เบราว์เซอร์นี้ยังไม่รองรับการแจ้งเตือน (บน iPhone ต้อง "เพิ่มไปยังหน้าจอโฮม" ก่อน)',
  }[perm];
  const reminders = [...s.reminders].sort((a, b) => a.time.localeCompare(b.time));

  $('#view-settings').innerHTML = `
    <div class="view-head"><button class="btn ghost sm" data-act="tab" data-view="me">‹ ของฉัน</button></div>
    <h1>ตั้งค่า</h1>
    <div class="card">
      <h2>ข้อมูลของฉัน</h2>
      <form class="row" data-form="name">
        <input type="text" name="nick" value="${esc(state.profile?.name ?? '')}" placeholder="ชื่อที่อยากให้แมวเรียก" maxlength="20" autocomplete="nickname" aria-label="ชื่อเล่น">
        <button class="btn soft sm">บันทึก</button></form>
      <p>${GOALS[p.goal].label}</p>
      <p>ว่าง ${WEEK_ORDER.filter((n) => p.days.includes(n)).map((n) => WEEKDAYS[n]).join(' ')} · ช่วง${SLOTS[p.slot].label}</p>
      <p>${p.activities.map((a) => ACTIVITIES[a].label).join(' · ')}</p>
      <p>${FOOD_MODES[p.food.mode].label} · งบ${BUDGETS[p.food.budget].label}
        ${p.food.allergies.length ? ` · แพ้${p.food.allergies.map((a) => ALLERGIES[a]).join(', ')}` : ''}
        ${p.food.avoid.length ? ` · ${p.food.avoid.map((a) => AVOID[a]).join(', ')}` : ''}</p>
      <button class="btn soft block" data-act="editProfile">แก้คำตอบ</button>
    </div>

    <div class="card">
      <h2>เป้าดื่มน้ำต่อวัน</h2>
      ${pers ? `<p>คำนวณจากน้ำหนักให้อัตโนมัติ: <b>${pers.water.glasses} แก้ว</b> (${(pers.water.ml / 1000).toFixed(1)} ลิตร) และเพิ่มให้ในวันออกกำลังกาย</p>`
    : `<div class="stepper">
        <button class="btn soft" data-act="goal" data-n="-1" aria-label="ลดเป้า">−</button>
        <b class="head grow center">${s.waterGoal} แก้ว</b>
        <button class="btn soft" data-act="goal" data-n="1" aria-label="เพิ่มเป้า">+</button>
      </div>
      <p class="muted small">กรอกข้อมูลร่างกายในหน้า "ของฉัน" แล้วแมวจะคำนวณให้เอง</p>`}
    </div>

    <div class="card">
      <h2>โหมดเดินทาง</h2>
      <div class="rem-row"><span class="grow">กำลังเดินทาง ไม่มียิมหรือครัว<br><span class="small muted">ใช้ท่าที่ไม่ต้องใช้เครื่อง เมนูซื้อง่าย และเป้าเบาลง</span></span>
        <label class="switch" aria-label="เปิด/ปิดโหมดเดินทาง"><input type="checkbox" data-act="travelToggle" ${travelOn() ? 'checked' : ''}><span></span></label></div>
      ${travelOn() ? `<label class="rem-row"><span class="grow small muted">กลับบ้านวันไหน (ไม่ใส่ก็ได้ ปิดเองได้ทุกเมื่อ)</span>
        <input type="date" data-change="travelUntil" value="${s.travel?.until ?? ''}" min="${todayKey()}" style="width:auto"></label>` : ''}
    </div>

    <div class="card">
      <h2>เสียงและวันพระ</h2>
      <div class="rem-row"><span class="grow">เสียงระฆัง/มู่ยู่ เมื่อทำรายการเสร็จ</span>
        <label class="switch" aria-label="เปิด/ปิดเสียง"><input type="checkbox" data-act="soundToggle" ${state.settings.sound ? 'checked' : ''}><span></span></label></div>
      <div class="rem-row"><span class="grow">แสดงวันพระ และชวนทำกิจกรรมเบาๆ ในวันพระ</span>
        <label class="switch" aria-label="เปิด/ปิดวันพระ"><input type="checkbox" data-act="holyToggle" ${state.settings.holyDays ? 'checked' : ''}><span></span></label></div>
    </div>

    <div class="card">
      <h2>ของที่ต้องเตรียมไปยิม</h2>
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
      <label class="rem-row"><span class="grow">เตือนซ้ำ ถ้าปิดแจ้งเตือนไปโดยยังไม่ได้ทำ<br><span class="small muted">ใช้กับทุกการเตือน รวมถึงนัดหมายและบิล</span></span>
        <select data-change="repeatMin" aria-label="เตือนซ้ำหลังจาก" style="width:auto">${REPEAT_OPTIONS.map((m) =>
          `<option value="${m}" ${(s.repeatMin || 0) === m ? 'selected' : ''}>${m ? `อีก ${repeatLabel(m)}` : 'ไม่เตือนซ้ำ'}</option>`).join('')}</select></label>
      ${reminders.map((r) => `<div class="rem-row">
        <span class="tl-emoji">${icon(REMINDER_TEXT[r.type].icon)}</span>
        <label class="grow rem-time"><span class="small muted">${REMINDER_TEXT[r.type].label}</span>
          <input type="time" value="${r.time}" data-change="remTime" data-id="${r.id}"></label>
        <label class="switch" aria-label="เปิด/ปิด"><input type="checkbox" data-change="remEnabled" data-id="${r.id}" ${r.enabled ? 'checked' : ''}><span></span></label>
        <button class="icon-btn" data-act="remDelete" data-id="${r.id}" aria-label="ลบเวลาเตือน">✕</button>
      </div>`).join('')}
      <form class="row" data-form="remAdd" style="margin-top:10px">
        <select name="type" aria-label="ประเภท">${Object.entries(REMINDER_TEXT).map(([k, r]) => `<option value="${k}">${r.label}</option>`).join('')}</select>
        <input type="time" name="time" value="12:00" required aria-label="เวลา" style="width:auto;min-width:120px">
        <button class="btn primary sm">เพิ่ม</button>
      </form>
    </div>

    ${privacyCard()}
    <p class="muted small center">แอปนี้ช่วยจัดตารางสุขภาพเบื้องต้น ไม่สามารถใช้แทนคำแนะนำของแพทย์หรือผู้ฝึกสอนได้</p>`;
}

// ---------- privacy ----------
// What's stored, one line each, each deletable. Nothing leaves the device.
const WIPE = {
  days: { label: 'บันทึกรายวัน (เช็กอิน น้ำ อารมณ์ มื้ออาหาร ออกกำลังกาย อาการ)', unit: 'วัน', count: () => Object.keys(state.days).length, run: () => { state.days = {}; } },
  body: { label: 'น้ำหนักตัวและข้อมูลร่างกาย', unit: 'ครั้ง', count: () => state.weights.length + (state.profile?.body ? 1 : 0), run: () => { state.weights = []; if (state.profile) state.profile.body = null; } },
  lifts: { label: 'น้ำหนักที่ยกและค่าเครื่องในยิม', unit: 'เครื่อง', count: () => new Set([...Object.keys(state.lifts), ...Object.keys(state.machines)]).size, run: () => { state.lifts = {}; state.machines = {}; } },
  photos: { label: 'รูปเครื่องในยิมที่ถ่ายเอง', unit: 'รูป', count: () => Object.keys(ui.photoUrls).length, noUndo: true },
  events: { label: 'นัดหมาย งาน และการเตือน', unit: 'รายการ', count: () => state.events.length, run: () => { state.events = []; } },
  bills: { label: 'บิลประจำเดือน', unit: 'บิล', count: () => state.bills.length, run: () => { state.bills = []; } },
  expenses: { label: 'รายจ่าย', unit: 'รายการ', count: () => state.expenses.length, run: () => { state.expenses = []; } },
  notes: { label: 'โน้ตและสิ่งที่โยนไว้', unit: 'รายการ', count: () => state.notes.length + state.inbox.length, run: () => { state.notes = []; state.inbox = []; } },
  shop: { label: 'ลิสต์ของที่ต้องซื้อ', unit: 'อย่าง', count: () => state.shopList.length, run: () => { state.shopList = []; state.shopping = {}; } },
};

function privacyCard() {
  const s = state.settings;
  const sw = (act, on, label) => `<label class="switch" aria-label="${label}"><input type="checkbox" data-act="${act}" ${on ? 'checked' : ''}><span></span></label>`;
  const off = (label, sub) => `<div class="rem-row"><span class="grow">${label}<br><span class="small muted">${sub}</span></span>
    <span class="chip-mini">ปิดอยู่</span></div>`;
  return `<div class="card" id="privacy">
    <h2>ข้อมูลและความเป็นส่วนตัว</h2>
    <p class="small">ทุกอย่างเก็บในเครื่องนี้เท่านั้น ไม่มีบัญชี ไม่ส่งขึ้นเซิร์ฟเวอร์ ไม่มีโฆษณา</p>
    <h3>แอปเก็บอะไรไว้บ้าง</h3>
    ${Object.entries(WIPE).map(([k, w]) => {
      const n = w.count();
      return `<div class="rem-row"><span class="grow">${w.label}<br><span class="small muted">${n ? `${n.toLocaleString('th-TH')} ${w.unit}` : 'ไม่มี'}</span></span>
        ${n ? `<button class="btn ${ui.confirmWipe === k ? 'danger' : 'ghost'} sm" data-act="wipe" data-what="${k}">${ui.confirmWipe === k ? 'แตะอีกครั้งเพื่อลบ' : 'ลบ'}</button>` : ''}</div>`;
    }).join('')}
    <h3>การเรียนรู้พฤติกรรม</h3>
    <div class="rem-row"><span class="grow">ให้แมวสังเกตแพทเทิร์นและนิสัย<br><span class="small muted">คิดในเครื่องนี้เท่านั้น เป็นข้อสังเกต ไม่ใช่คำวินิจฉัย ปิดแล้วแมวจะไม่ทักเรื่องแพทเทิร์น</span></span>
      ${sw('learnToggle', s.learn !== false, 'เปิด/ปิดการเรียนรู้พฤติกรรม')}</div>
    <h3>ไมโครโฟน</h3>
    <div class="rem-row"><span class="grow">แสดงปุ่มไมค์<br><span class="small muted">ใช้เฉพาะตอนกดปุ่ม เบราว์เซอร์จะส่งเสียงไปแปลงเป็นข้อความด้วยบริการของตัวเอง (เช่น Google หรือ Apple) แอปไม่เก็บเสียงไว้</span></span>
      ${sw('micToggle', s.mic !== false, 'เปิด/ปิดปุ่มไมค์')}</div>
    <h3>การเชื่อมต่อภายนอก</h3>
    <p class="small muted">แอปจะไม่เชื่อมต่ออะไรเอง เมื่อพร้อมจะถามก่อนทีละอย่าง และปิดได้ทุกเมื่อ</p>
    ${off('ปฏิทิน (Google / Apple)', 'ยังไม่เปิดให้เชื่อม · มาในเวอร์ชันถัดไป')}
    ${off('สภาพอากาศตามตำแหน่ง', 'ตอนนี้ใช้แบบแตะบอกเองในหน้า "จัดวันนี้ให้ฉัน"')}
    ${off('ข้อมูลสุขภาพจากนาฬิกาหรือมือถือ', 'ตอนนี้ใส่จำนวนก้าวเองในหน้าวันนี้')}
    <h3>สำรองข้อมูล</h3>
    <div class="row wrap">
      <button class="btn soft grow" data-act="export">ส่งออกทั้งหมด</button>
      <label class="btn soft grow">นำเข้า<input type="file" accept="application/json" data-change="import" hidden></label>
    </div>
    <button class="btn ${ui.confirmWipe === 'all' ? 'danger' : 'ghost'} block gap-top" data-act="wipe" data-what="all">${ui.confirmWipe === 'all' ? 'แตะอีกครั้ง: ลบทุกอย่างและเริ่มใหม่' : 'ลบข้อมูลทั้งหมด'}</button>
  </div>`;
}

async function wipePhotos() {
  for (const [id, url] of Object.entries(ui.photoUrls)) {
    await photos.delete(id).catch(() => {});
    URL.revokeObjectURL(url);
  }
  ui.photoUrls = {};
}

// ---------- reminders ----------
// Health reminders and life ones (appointments, to-dos, bills) share the same
// snooze / skip / repeat log. Each item: { id, at, notify, reminder? | kind+ref }.
function currentDue(now = Date.now()) {
  const t = computeToday();
  const log = state.reminderLog[t.key] ?? {};
  const repeatMs = (state.settings.repeatMin || 0) * 60_000;
  const health = dueReminders({
    reminders: state.settings.reminders,
    day: t.day,
    key: t.key,
    now,
    log,
    waterGoal: waterGoalToday(t),
    workoutPending: !!t.session && !t.done && !t.day.easy,
    repeatMs,
  }).map((d) => ({ id: d.reminder.id, at: d.at, notify: d.notify, reminder: d.reminder }));
  const lifeItems = lifeDue({ events: state.events, bills: state.bills, today: t.key, now, log, repeatMs }).filter(life.alive);
  return [...health, ...lifeItems].sort((a, b) => a.at - b.at);
}

// Text and main button for any due item.
function dueInfo(d) {
  if (d.reminder) {
    const r = d.reminder;
    return {
      text: REMINDER_TEXT[r.type].text,
      time: `${r.time} น.`,
      main: {
        water: '<button class="btn primary big block" data-act="water" data-n="1">ดื่มแล้ว +1 แก้ว</button>',
        checkin: '<button class="btn primary big block" data-act="checkin">เริ่มเช็กอิน</button>',
        workout: '<button class="btn lotus big block" data-act="startFromAlert">ไปกันเลย</button>',
      }[r.type],
    };
  }
  return life.alertInfo(d);
}

function alertHtml(d, more) {
  const x = dueInfo(d);
  return `<div class="alert" role="alert">
    <div class="row between"><span class="alert-title">${esc(x.text)}</span><span class="muted small nowrap">${x.time}</span></div>
    ${x.main ? `<div style="margin-top:8px">${x.main}</div>` : ''}
    <div class="actions">
      <button class="btn soft" data-act="snooze" data-id="${esc(d.id)}" data-min="10">เลื่อน 10 นาที</button>
      <button class="btn soft" data-act="snooze" data-id="${esc(d.id)}" data-min="60">1 ชั่วโมง</button>
      <button class="btn ghost" data-act="skip" data-id="${esc(d.id)}">ข้ามครั้งนี้</button>
    </div>
    ${more ? `<p class="small muted alert-more">ยังมีอีก ${more} เรื่องรออยู่ในรายการวันนี้</p>` : ''}
  </div>`;
}

// Only the most recent reminder gets a card, so opening the app late never
// greets the user with a wall of "you haven't done this" cards.
function renderAlerts(due = currentDue()) {
  const latest = due[due.length - 1];
  $('#alerts').innerHTML = state.profile && latest ? alertHtml(latest, due.length - 1) : '';
}

function reminderEntry(id) {
  const log = (state.reminderLog[todayKey()] ??= {});
  return (log[id] ??= {});
}

function snooze(id, minutes, { quiet = false } = {}) {
  const until = Date.now() + minutes * 60_000;
  reminderEntry(id).snoozeUntil = until;
  save();
  renderAlerts();
  if (!quiet) toast(`โอเค จะเตือนอีกทีตอน ${hhmm(until)} น.`);
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

function notify(d) {
  if (document.visibilityState === 'visible') {
    navigator.vibrate?.(200);
    return;
  }
  if (!swReg || !('Notification' in window) || Notification.permission !== 'granted') return;
  const x = dueInfo(d);
  const type = d.reminder?.type ?? d.kind;
  const actions = [{ action: 'snooze', title: 'เลื่อน 10 นาที' }];
  if (type === 'water') actions.unshift({ action: 'water', title: 'ดื่มแล้ว +1' });
  if (type === 'bill') actions.unshift({ action: 'done', title: 'จ่ายแล้ว' });
  if (type === 'event' && d.stage !== 'tomorrow') actions.unshift({ action: 'done', title: 'ทำแล้ว' });
  const repeat = state.settings.repeatMin;
  swReg.showNotification(x.text, {
    body: repeat ? `ถ้าปิดไปโดยยังไม่ได้ทำ แมวจะเตือนอีกครั้งใน ${repeatLabel(repeat)}` : 'แตะเพื่อเปิด หรือกดเลื่อนเตือนได้',
    tag: d.id,
    renotify: true,
    icon: 'icons/icon.svg',
    data: { id: d.id, type, ref: d.ref ?? null },
    actions,
  }).catch(() => {});
}

const REPEAT_OPTIONS = [0, 15, 30, 60, 120];
const repeatLabel = (m) => (m >= 60 ? `${m / 60} ชั่วโมง` : `${m} นาที`);

function tick() {
  const key = todayKey();
  if (key !== ui.lastToday) {
    ui.lastToday = key;
    ui.foodDay = null;
    render();
  }
  if (!state.profile) return;
  checkRewards();
  const due = currentDue();
  let changed = false;
  for (const d of due) {
    if (!d.notify) continue;
    reminderEntry(d.id).notifiedAt = Date.now();
    notify(d);
    changed = true;
  }
  if (changed) save();
  renderAlerts(due);
}

// Tell the user once when a reward is close, and once when it's reached.
function checkRewards() {
  const key = todayKey();
  let changed = false;
  for (const r of state.rewards.filter((x) => !x.claimedAt)) {
    const pr = rewardProgress(r, state.days, key);
    const m = REWARD_METRICS[r.metric];
    let msg = null;
    if (pr.done && !r.doneNotified) {
      r.doneNotified = true;
      msg = `ครบแล้ว! ได้เวลา${r.title}`;
    } else if (pr.near && !r.nearNotified) {
      r.nearNotified = true;
      msg = `อีก ${pr.left} ${m.unit} จะได้${r.title}แล้ว`;
    }
    if (!msg) continue;
    changed = true;
    toast(msg);
    if (document.visibilityState !== 'visible' && swReg && 'Notification' in window && Notification.permission === 'granted') {
      swReg.showNotification(msg, { body: 'แมวนับให้อยู่นะ', icon: 'icons/icon.svg', tag: `reward-${r.id}` }).catch(() => {});
    }
  }
  if (changed) save();
}

function handleReminderAction({ id, type, action, ref }) {
  if (action === 'snooze') return snooze(id, 10);
  if (action === 'water') return addWater(1);
  // Notification swiped away without doing it: ask again after the repeat time.
  if (action === 'dismissed') {
    if (state.settings.repeatMin) snooze(id, state.settings.repeatMin, { quiet: true });
    return;
  }
  const refId = ref ?? id.split(':')[1];
  if (action === 'done' && type === 'bill') return life.actions.billPaid({ id: refId });
  if (action === 'done' && type === 'event') {
    if (!state.events.find((e) => e.id === refId)?.done) life.actions.evTick({ id: refId });
    return;
  }
  showView('today');
  if (type === 'checkin' && !getDay(todayKey()).checkin) openCheckin();
  if (type === 'workout') startSession({ gym: computeToday().session?.activity === 'gym' });
}

// ---------- view switching ----------
function showView(view) {
  ui.view = view;
  document.querySelectorAll('.tabs [data-view]').forEach((t) =>
    t.setAttribute('aria-selected', String(t.dataset.view === (view === 'settings' ? 'me' : view))));
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${view}`));
  render();
  window.scrollTo(0, 0);
}

function render() {
  if (!state.profile) {
    $('#view-today').innerHTML = `<div class="sheet-mascot">${mascot('normal', { size: 160 })}</div>
      <button class="btn primary big block" data-act="openOnboard">เริ่มตั้งค่า</button>`;
    renderAlerts();
    return;
  }
  renderToday();
  renderWeek();
  renderFood();
  renderGym();
  renderMe();
  renderSettings();
  life.renderLife();
  renderAlerts();
  checkRewards();
}

const life = createLife({
  state, ui, esc, save, render, renderSheet, toast, pushSheet, replaceSheet, popSheet, topSheet, sheetTop,
  todayKey, getDay, editDay, sfx, newId, planShopping, showView,
  tick: () => tick(),
  dateKeyOf: (ms) => dateKey(new Date(ms)),
  inboxSubmit: (text) => inbox.submit(text),
  inboxPane: () => inbox.logPane(),
});

const inbox = createInbox({
  state, ui, esc, save, render, renderSheet, toast, pushSheet, popSheet, topSheet, sheetTop, todayKey, editDay, newId, sfx,
  openPanel: () => life.openNote(),
  closePanel: () => life.closeNote(),
});

// ---------- events ----------
const actions = {
  tab: (d) => showView(d.view),
  back: () => popSheet(),
  openOnboard: () => openOnboard(),
  editProfile: () => openOnboard(true),
  editBody: () => openBodyEdit(),

  // first-run questions
  obNext: () => {
    const s = topSheet();
    replaceSheet({ ...s, step: s.step + 1 });
  },
  obBack: () => {
    const s = topSheet();
    if (s.bodyOnly || s.step <= (s.edit ? 1 : 0)) popSheet();
    else replaceSheet({ ...s, step: s.step - 1 });
  },
  obSkip: () => {
    state.profile = { ...defaultProfile(state.legacyGymDays), name: topSheet().draft?.name ?? '' };
    save();
    popSheet();
  },
  obPick: (d) => {
    const s = topSheet();
    const [a, b] = d.field.split('.');
    if (b) s.draft[a][b] = d.v;
    else s.draft[a] = d.v;
    // The exercise goal suggests a weight goal until the user picks one themselves.
    if (d.field === 'goal' && !s.wgTouched) s.draft.body.weightGoal = defaultWeightGoal(d.v);
    if (d.field === 'body.weightGoal') s.wgTouched = true;
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
  obBodyNext: () => {
    const s = topSheet();
    if (!draftBody(s.draft)) {
      toast('กรอกน้ำหนัก ส่วนสูง อายุ และเพศให้ครบก่อนนะ (หรือกดข้ามไปก่อน)');
      return;
    }
    actions.obNext();
  },
  obBodySkip: () => {
    const s = topSheet();
    s.draft.skipBody = true;
    actions.obNext();
  },
  obSaveBody: () => {
    const s = topSheet();
    const body = saveBody(s.draft);
    if (!body) {
      toast('กรอกน้ำหนัก ส่วนสูง อายุ และเพศให้ครบก่อนนะ');
      return;
    }
    state.profile.body = body;
    save();
    popSheet();
    toast('คำนวณใหม่ให้แล้ว');
  },
  obFinish: () => {
    const s = topSheet();
    const { weightKg, skipBody, ...profileDraft } = s.draft;
    const body = skipBody ? null : saveBody(s.draft);
    state.profile = { ...profileDraft, body: body || null };
    delete state.legacyGymDays;
    save();
    render();
    if (s.edit) {
      popSheet();
      toast('แมวจัดตารางใหม่ให้แล้ว');
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
    if (day.ticks[d.id]) {
      sfx.knock();
      toast(cheer());
    }
  },
  workoutTick: () => {
    const t = computeToday();
    if (t.done) undoWorkout();
    else completeWorkout(t.session);
  },
  goGym: () => startSession({ gym: true }),
  mood: (d) => {
    const day = editDay(todayKey());
    const v = Number(d.v);
    day.mood = day.mood === v ? null : v;
    save();
    render();
    if (day.mood) sfx.knock();
  },
  // Low-energy day: softer targets, non-urgent work and errands move to tomorrow.
  easyOn: () => {
    const key = todayKey();
    const day = editDay(key);
    day.easy = true;
    const moved = postponable(state.events, key);
    for (const e of moved) {
      e.date = addDays(key, 1);
      e.postponedFrom = key;
    }
    day.postponed = moved.map((e) => e.id);
    save();
    render();
    sfx.bell();
    toast(moved.length ? `วันนี้ไม่ต้องเอา 100% ก็ได้ · เลื่อน ${moved.length} อย่างไปพรุ่งนี้` : 'วันนี้ไม่ต้องเอา 100% ก็ได้', () => actions.easyOff());
  },
  easyOff: () => {
    const key = todayKey();
    const day = editDay(key);
    day.easy = false;
    for (const id of day.postponed ?? []) {
      const e = state.events.find((x) => x.id === id);
      if (e && e.postponedFrom === key) {
        e.date = key;
        delete e.postponedFrom;
      }
    }
    day.postponed = [];
    save();
    render();
  },
  arrange: () => pushSheet({ type: 'arrange', orig: { weather: getDay(todayKey()).weather ?? null, travel: structuredClone(state.settings.travel ?? null) } }),
  arrWeather: (d) => {
    editDay(todayKey()).weather = d.v === 'none' ? null : d.v;
    save();
    render();
    renderSheet();
  },
  travelToggle: () => {
    const on = !travelOn();
    state.settings.travel = on ? { on: true, since: todayKey(), until: state.settings.travel?.until ?? null } : { on: false };
    save();
    render();
    renderSheet();
    toast(on ? 'เปิดโหมดเดินทาง: ไม่ต้องใช้ยิม เมนูซื้อง่าย เป้าเบาลง' : 'ปิดโหมดเดินทางแล้ว กลับบ้านปลอดภัยนะ');
  },
  arrApply: () => {
    const t = computeToday();
    const { items, ctx } = arrangeInputs(t);
    const r = arrangeDay(items, ctx);
    editDay(t.key).arranged = { ...r, at: Date.now() };
    popSheet();
    save();
    render();
    sfx.bell();
    toast(r.changes.length ? `จัดให้แล้ว ปรับ ${r.changes.length} อย่าง` : 'แผนเดิมลงตัวอยู่แล้ว');
  },
  arrCancel: () => {
    const s = topSheet();
    editDay(todayKey()).weather = s.orig.weather;
    state.settings.travel = s.orig.travel ?? { on: false };
    save();
    popSheet();
    render();
  },
  arrReset: () => {
    delete editDay(todayKey()).arranged;
    save();
    popSheet();
    render();
    toast('กลับเป็นแผนเดิมแล้ว');
  },
  patternAction: (d) => {
    if (d.action === 'lighten') editDay(todayKey()).lighten = true;
    state.insightSeen[d.id] = todayKey();
    save();
    render();
    toast('ลดโปรแกรมวันนี้ให้แล้ว ไม่ต้องฝืนนะ', () => {
      delete editDay(todayKey()).lighten;
      save();
      render();
    });
  },
  specialYes: () => {
    const t = computeToday();
    const sp = specialToday(t);
    if (!sp) return;
    const day = editDay(t.key);
    day.special = { ...sp, accepted: true };
    if (sp.kind === 'menu') day.mealPick = { ...(day.mealPick ?? {}), d: sp.ref };
    state.lastSpecial = t.key;
    save();
    render();
    sfx.bell();
    toast(sp.kind === 'menu' ? 'เปลี่ยนมื้อเย็นเป็นเมนูใหม่ให้แล้ว' : 'ใส่ไว้ในรายการวันนี้แล้ว');
  },
  specialNo: () => {
    const key = todayKey();
    editDay(key).special = 'no';
    state.lastSpecial = key;
    save();
    render();
  },
  openWrapped: (d) => {
    if (d.ym !== monthOf(todayKey())) state.wrappedSeen = d.ym;
    save();
    pushSheet({ type: 'wrapped', ym: d.ym });
  },
  share: (d) => share(shareText(d.kind, d)),
  nightMove: () => {
    const key = todayKey();
    const left = dayItems(computeToday()).filter((i) => !i.done && i.life === 'event' && i.ev.kind !== 'appt').map((i) => i.ev);
    for (const e of left) e.date = addDays(key, 1);
    save();
    render();
    toast(`ย้าย ${left.length} อย่างไปพรุ่งนี้แล้ว ไม่เป็นไรเลย`, () => {
      for (const e of left) e.date = key;
      save();
      render();
    });
  },
  holyKeep: () => {
    editDay(todayKey()).holyKeep = true;
    save();
    render();
    toast('โอเค เล่นตามแผนเดิมนะ สู้ๆ');
  },
  holyCalm: () => {
    editDay(todayKey()).holyKeep = false;
    save();
    render();
  },
  insightSeen: (d) => {
    state.insightSeen[d.id] = todayKey();
    save();
    renderToday();
  },
  openStory: () => {
    ui.storyWeek = 'prev';
    showView('me');
    document.querySelector('#view-me .story')?.scrollIntoView({ block: 'start' });
  },
  storyWeek: (d) => {
    ui.storyWeek = d.w;
    renderMe();
  },
  claimReward: (d) => {
    const r = state.rewards.find((x) => x.id === d.id);
    if (!r) return;
    r.claimedAt = todayKey();
    save();
    render();
    sfx.bless();
    toast(`ยินดีด้วย! ${r.title}`);
  },
  rewardDelete: (d) => {
    const idx = state.rewards.findIndex((x) => x.id === d.id);
    const [r] = state.rewards.splice(idx, 1);
    save();
    render();
    toast('ลบเป้ารางวัลแล้ว', () => {
      state.rewards.splice(idx, 0, r);
      save();
      render();
    });
  },
  soundToggle: () => {
    state.settings.sound = !state.settings.sound;
    save();
    renderSettings();
    sfx.bell();
  },
  holyToggle: () => {
    state.settings.holyDays = !state.settings.holyDays;
    save();
    render();
  },
  editSteps: () => {
    ui.editSteps = true;
    renderToday();
    $('#view-today input[name="steps"]')?.focus();
  },
  stepKg: (d, el) => {
    const input = el.closest('form').kg;
    input.value = Math.max(0, Math.round(((Number(input.value) || 0) + Number(d.n)) * 10) / 10);
  },
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
    toast('เปลี่ยนเป็นท่าทดแทนแล้ว');
  },
  unswap: (d) => {
    delete editDay(todayKey()).altSwaps[d.id];
    save();
    renderSheet();
  },
  useSuggest: (d, el) => {
    el.closest('form').weight.value = d.kg;
    toast(`ตั้งเป็น ${d.kg} กก. แล้ว`);
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
    if (state.checklist.every((c) => day.prep.includes(c.id))) toast('ของครบ! ออกเดินทางได้');
  },

  // week & food
  calDay: (d) => {
    ui.calDay = d.key;
    renderWeek();
  },
  calMonth: (d) => {
    const next = addMonths(ui.calMonth ?? monthOf(todayKey()), Number(d.n));
    ui.calMonth = next;
    ui.calDay = next === monthOf(todayKey()) ? todayKey() : `${next}-01`;
    renderWeek();
  },
  weekOpen: (d) => {
    ui.weekOpen = ui.weekOpen === d.key ? null : d.key;
    renderWeek();
  },
  foodDay: (d) => {
    ui.foodDay = d.key;
    renderFood();
  },
  openShop: () => {
    ui.lifeTab = 'shop';
    showView('life');
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
    swReg.showNotification('ทดสอบแจ้งเตือนจากเหมียวสมาธิ', {
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
  // Two taps to delete: the first arms the button, the second deletes.
  wipe: async (d) => {
    if (ui.confirmWipe !== d.what) {
      ui.confirmWipe = d.what;
      renderSettings();
      clearTimeout(ui.wipeTimer);
      ui.wipeTimer = setTimeout(() => {
        ui.confirmWipe = null;
        if (ui.view === 'settings') renderSettings();
      }, 5000);
      return;
    }
    ui.confirmWipe = null;
    if (d.what === 'all') {
      await wipePhotos();
      replaceState(defaultState());
      openOnboard();
      return;
    }
    const w = WIPE[d.what];
    if (d.what === 'photos') {
      await wipePhotos();
      render();
      toast('ลบรูปทั้งหมดแล้ว');
      return;
    }
    const snapshot = structuredClone(state);
    w.run();
    save();
    render();
    toast(`ลบ${w.label}แล้ว`, () => replaceState(snapshot));
  },
  learnToggle: (d, el) => {
    state.settings.learn = el.checked;
    save();
    render();
    toast(el.checked ? 'แมวจะคอยสังเกตให้ (คิดในเครื่องเท่านั้น)' : 'ปิดการเรียนรู้แล้ว แมวจะไม่ทักเรื่องแพทเทิร์น');
  },
  micToggle: (d, el) => {
    state.settings.mic = el.checked;
    save();
    render();
  },
};

function replaceState(next) {
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, next);
  save();
  render();
}

const changes = {
  travelUntil: (el) => {
    state.settings.travel = { ...state.settings.travel, until: el.value || null };
    save();
    render();
  },
  repeatMin: (el) => {
    state.settings.repeatMin = Number(el.value);
    save();
    toast(state.settings.repeatMin ? `จะเตือนซ้ำทุก ${repeatLabel(state.settings.repeatMin)} จนกว่าจะทำ` : 'ปิดการเตือนซ้ำแล้ว');
  },
  photo: async (el) => {
    const file = el.files?.[0];
    if (!file) return;
    const { id } = el.dataset;
    try {
      const blob = await resizePhoto(file);
      await photos.put(id, blob);
      if (ui.photoUrls[id]) URL.revokeObjectURL(ui.photoUrls[id]);
      ui.photoUrls[id] = URL.createObjectURL(blob);
      toast('ใส่รูปเครื่องจริงแล้ว');
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
  name: (form) => {
    if (!state.profile) return;
    state.profile.name = form.elements.nick.value.trim();
    save();
    render();
    toast(state.profile.name ? `สวัสดี ${state.profile.name}` : 'ลบชื่อแล้ว');
  },
  machine: (form) => saveMachine(form),
  reward: (form) => {
    const title = form.title.value.trim();
    const target = Number(form.target.value);
    if (!title || !(target >= 1 && target <= 365)) {
      toast('ใส่รางวัลและจำนวน (1–365) ก่อนนะ');
      return;
    }
    state.rewards.push({ id: newId(), title, metric: form.metric.value, target: Math.round(target), start: todayKey() });
    save();
    render();
    sfx.knock();
    toast('ตั้งเป้ารางวัลแล้ว แมวจะคอยนับให้');
  },
  steps: (form) => {
    const n = Number(form.steps.value);
    if (form.steps.value === '' || !Number.isFinite(n) || n < 0 || n > 100000) {
      toast('ใส่จำนวนก้าวเป็นตัวเลขนะ');
      return;
    }
    const day = editDay(todayKey());
    day.steps = Math.round(n);
    day.stepsMet = day.steps >= stepGoalToday();
    ui.editSteps = false;
    save();
    sfx.knock();
    render();
    toast(`จดแล้ว ${Math.round(n).toLocaleString('th-TH')} ก้าว ${cheer()}`);
  },
  weight: (form) => {
    const kg = Number(form.kg.value);
    if (!(kg >= LIMITS.weight[0] && kg <= LIMITS.weight[1])) {
      toast(`ใส่น้ำหนักระหว่าง ${LIMITS.weight[0]}–${LIMITS.weight[1]} กก.`);
      return;
    }
    const prev = state.weights;
    state.weights = logWeight(state.weights, todayKey(), kg);
    save();
    render();
    toast(`จดน้ำหนักแล้ว ${kg} กก.`, () => {
      state.weights = prev;
      save();
      render();
    });
  },
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

Object.assign(actions, life.actions, inbox.actions);
Object.assign(forms, life.forms, inbox.forms);

document.addEventListener('click', (e) => {
  ui.userActed = true;
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  actions[el.dataset.act]?.(el.dataset, el, e);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('#quicknote').hidden) life.closeNote();
  else if (e.key === 'Escape' && ui.sheets.length) popSheet();
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"][data-act]')) {
    e.preventDefault();
    e.target.click();
  }
});
// Typed values in the first-run form go straight into the draft, so tapping a
// chip (which re-renders the sheet) never loses what was typed.
document.addEventListener('input', (e) => {
  const rv = e.target.closest('[data-rv]');
  if (rv) {
    inbox.onInput(rv);
    return;
  }
  const el = e.target.closest('[data-input]');
  const s = topSheet();
  if (!el || s?.type !== 'onboard') return;
  if (el.dataset.input === 'name') s.draft.name = el.value.trim();
  else if (el.dataset.input === 'weightKg') s.draft.weightKg = el.value;
  else s.draft.body[el.dataset.input] = el.value;
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
const TAB_ICONS = { today: 'lotus', week: 'calendar', food: 'bowl', gym: 'dumbbell', life: 'list', me: 'user' };
for (const b of document.querySelectorAll('.tabs [data-view]')) b.insertAdjacentHTML('afterbegin', icon(TAB_ICONS[b.dataset.view]));
$('#fab-note').innerHTML = icon('pen');
$('#quicknote [data-act=mic]').innerHTML = `${icon('mic', { size: 18 })}พูด`;
if (useHistory) history.replaceState(null, '');
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
  if (useHistory) history.replaceState(null, '', location.pathname);
  handleReminderAction({ id: params.get('r'), type: params.get('t'), action: params.get('a') });
}

// Sandboxed frames throw on merely reading navigator.serviceWorker.
try {
  const sw = location.protocol !== 'file:' ? navigator.serviceWorker : null;
  if (sw) {
    sw.register('sw.js').then(() => sw.ready).then((reg) => { swReg = reg; }).catch(() => {});
    sw.addEventListener('message', (e) => {
      if (e.data?.kind === 'reminder') handleReminderAction(e.data);
    });
  }
} catch { /* no offline support or notification buttons here; everything else works */ }
