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
    leave: {}, // leave-the-house list id -> item ids ticked today (the gym bag uses prep)
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
  hard: { label: 'สดใส พร้อมลุย', icon: 'sun', mood: 'bright' },
  light: { label: 'ปกติ ค่อยๆ ไป', icon: 'leaf', mood: 'normal' },
  rest: { label: 'ง่วง ขอพักหน่อย', icon: 'moon', mood: 'sleepy' },
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
    // grace: a glass shortly before the reminder already counts (interval mode: 20 min)
    case 'water': return day.water >= waterGoal || day.waterAt.some((t) => t >= at - (r.grace ?? 0) * 60_000);
    case 'workout': return !workoutPending;
    default: return true;
  }
}

// Reminders that should currently be showing for `key` (normally today).
// Only the latest-passed reminder of each type is considered, so snoozing or
// skipping the 14:00 water reminder doesn't bring the 10:00 one back.
// log: { [reminderId]: { snoozeUntil?, skipped?, notifiedAt? } } for that day.
// Snooze/skip/repeat for one reminder today. null = stay quiet for now;
// otherwise notify says whether to (re)send a notification.
// repeatMs > 0: a reminder that was sent but not acted on (the notification
// was dismissed or ignored) is sent again after that long.
export function reminderState(s = {}, now, repeatMs = 0) {
  if (s.skipped) return null;
  if (s.snoozeUntil && now < s.snoozeUntil) return null;
  const notify = !s.notifiedAt
    || (s.snoozeUntil != null && s.notifiedAt < s.snoozeUntil)
    || (repeatMs > 0 && now - s.notifiedAt >= repeatMs);
  return { notify };
}

export function dueReminders({ reminders, day, key, now, log = {}, waterGoal, workoutPending, repeatMs = 0 }) {
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
    const st = reminderState(log[reminder.id], now, reminder.noRepeat ? 0 : repeatMs);
    if (!st || reminderSatisfied(reminder, at, ctx)) continue;
    due.push({ reminder, at, notify: st.notify });
  }
  return due.sort((a, b) => a.at - b.at);
}

// "เตือนดื่มน้ำทุก N ชั่วโมง": one water reminder per slot between from and to.
// Reminds even when on pace; stops once the day's goal is met; a glass within
// the 20 minutes before a slot counts, so no nag right after drinking. Each slot
// is its own reminder, so they never repeat (the next slot is the repeat).
export const WATER_EVERY = [0, 60, 90, 120]; // 0 = smart mode (only when behind)
export function waterIntervalReminders({ every = 0, from = '08:00', to = '20:00' } = {}) {
  if (!every) return [];
  const toMin = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const out = [];
  for (let m = toMin(from); m <= toMin(to); m += every) {
    const time = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    out.push({ id: `r-wi-${time.replace(':', '')}`, type: 'water', time, enabled: true, grace: 20, noRepeat: true, interval: true });
  }
  return out;
}
