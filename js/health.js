// Pure logic shared across the app: dates, the morning check-in score, reminders.
// No DOM or storage access, so everything here is unit tested in Node.

// ---------- dates ----------

// Local-date key (YYYY-MM-DD) so a day rolls over at local midnight, not UTC.
export function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

// Epoch ms of "HH:MM" on the given local date.
export function timeOn(key, hhmm) {
  const [h, min] = hhmm.split(':').map(Number);
  const d = parseKey(key);
  d.setHours(h, min, 0, 0);
  return d.getTime();
}

export function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function fromMinutes(min) {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

// Small deterministic string hash, used to pick "random" but stable menus and messages.
export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function emptyDay() {
  return {
    water: 0,
    waterAt: [],
    checkin: null,
    meals: {}, // slot -> 'plan' | 'other'
    mealSwaps: {}, // slot -> how many times "change menu" was tapped
    ticks: {}, // other timeline items (wind-down, rest-day stretch)
    workout: null, // { done, sessionId, kind, focus, intensity, activity, at }
    active: null, // the session snapshot started via "today I'm going to the gym"
    sets: {}, // exercise id -> sets finished
    altSwaps: {}, // machine id -> alternative exercise id
    prep: [], // gym-bag checklist ids ticked today
    steps: null, // steps walked, typed in from the phone's step counter
    mood: null, // 1..5, one tap on the Today screen
    easy: false, // "วันนี้ไม่ไหว": every target softened for this day only
    holyKeep: false, // on วันพระ, the user chose to keep the planned hard session
    waterMet: false, // water goal reached (the goal of that day, remembered)
    stepsMet: false, // step goal reached
    celebrated: false, // everything on the timeline done (bell already rung)
  };
}

// ---------- morning check-in ----------

export const SLEEP_HOURS = [
  { id: 'lt5', label: 'น้อยกว่า 5 ชม.', value: 0 },
  { id: '5-6', label: '5–6 ชม.', value: 0.35 },
  { id: '6-7', label: '6–7 ชม.', value: 0.65 },
  { id: '7-8', label: '7–8 ชม.', value: 1 },
  { id: '8+', label: 'มากกว่า 8 ชม.', value: 1 },
];

// `mood` drives the mascot: bright / normal / sleepy.
export const LEVELS = {
  hard: { label: 'สดใส พร้อมลุย', icon: '✨', mood: 'bright' },
  light: { label: 'ปกติ ค่อยๆ ไป', icon: '🍵', mood: 'normal' },
  rest: { label: 'ง่วง ขอพักหน่อย', icon: '😴', mood: 'sleepy' },
};

const WEIGHTS = { sleepHours: 25, sleepQuality: 15, soreness: 20, stress: 15, energy: 25 };

// answers: { sleepHours: id, sleepQuality: 1..3, soreness: {part: 0..2}, stress: 1..5, energy: 1..5 }
// stress 5 = very stressed; energy 5 = full of energy.
export function readiness(answers) {
  const { sleepHours, sleepQuality, soreness = {}, stress, energy } = answers;
  const sleepH = SLEEP_HOURS.find((s) => s.id === sleepHours)?.value ?? 0.5;
  const sleepQ = (sleepQuality - 1) / 2;
  const soreSum = Object.values(soreness).reduce((a, b) => a + b, 0);
  const sore = Math.max(0, 1 - soreSum / 6);
  const stressC = (5 - stress) / 4;
  const energyC = (energy - 1) / 4;

  const score = Math.round(
    WEIGHTS.sleepHours * sleepH
    + WEIGHTS.sleepQuality * sleepQ
    + WEIGHTS.soreness * sore
    + WEIGHTS.stress * stressC
    + WEIGHTS.energy * energyC,
  );

  let level = score >= 70 ? 'hard' : score >= 45 ? 'light' : 'rest';
  const veryShortSleep = sleepHours === 'lt5';
  const verySore = Object.keys(soreness).filter((p) => soreness[p] >= 2);
  // A single strong warning sign caps the day at "light" even if the rest looks great.
  if (level === 'hard' && (veryShortSleep || verySore.length)) level = 'light';

  const reasons = [];
  if (sleepH < 0.65) reasons.push('นอนน้อย');
  if (sleepQuality === 1) reasons.push('หลับไม่ค่อยสนิท');
  if (stress >= 4) reasons.push('เครียดค่อนข้างมาก');
  if (energy <= 2) reasons.push('พลังงานต่ำ');

  return { score, level, verySore, reasons };
}

// ---------- reminders ----------

// Whether the thing a reminder asks for has been done since it was set to fire.
function reminderSatisfied(r, at, ctx) {
  const { day, waterGoal, workoutPending } = ctx;
  switch (r.type) {
    case 'checkin': return day.checkin != null;
    case 'water': return day.water >= waterGoal || day.waterAt.some((t) => t >= at);
    case 'workout': return !workoutPending;
    default: return true;
  }
}

// Reminders that should currently be showing for `key` (normally today).
// Only the latest-passed reminder of each type is considered, so snoozing or
// skipping the 14:00 water reminder doesn't bring the 10:00 one back.
// log: { [reminderId]: { snoozeUntil?, skipped?, notifiedAt? } } for that day.
export function dueReminders({ reminders, day, key, now, log = {}, waterGoal, workoutPending }) {
  const ctx = { day, waterGoal, workoutPending };
  const latest = new Map();
  for (const r of reminders) {
    if (!r.enabled) continue;
    const at = timeOn(key, r.time);
    if (at > now) continue;
    const prev = latest.get(r.type);
    if (!prev || at > prev.at) latest.set(r.type, { reminder: r, at });
  }

  const due = [];
  for (const { reminder, at } of latest.values()) {
    const s = log[reminder.id] ?? {};
    if (s.skipped) continue;
    if (s.snoozeUntil && now < s.snoozeUntil) continue;
    if (reminderSatisfied(reminder, at, ctx)) continue;
    const notify = !s.notifiedAt || (s.snoozeUntil != null && s.notifiedAt < s.snoozeUntil);
    due.push({ reminder, at, notify });
  }
  return due.sort((a, b) => a.at - b.at);
}
