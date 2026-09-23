// Pure logic — no DOM or storage access, so everything here is unit tested in Node.

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

export function isGymDay(key, gymDays) {
  return gymDays.includes(parseKey(key).getDay());
}

export function emptyDay() {
  return { water: 0, waterAt: [], mood: null, checkin: null, prep: [] };
}

// ---------- morning check-in ----------

export const SLEEP_HOURS = [
  { id: 'lt5', label: 'น้อยกว่า 5 ชม.', value: 0 },
  { id: '5-6', label: '5–6 ชม.', value: 0.35 },
  { id: '6-7', label: '6–7 ชม.', value: 0.65 },
  { id: '7-8', label: '7–8 ชม.', value: 1 },
  { id: '8+', label: 'มากกว่า 8 ชม.', value: 1 },
];

export const LEVELS = {
  hard: { label: 'เล่นหนักได้', icon: '💪' },
  light: { label: 'เล่นเบาๆ', icon: '🚶' },
  rest: { label: 'พักดีกว่า', icon: '🛌' },
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

// ---------- today's tasks ----------

export function prepDone(day, checklist) {
  return checklist.length > 0 && checklist.every((item) => day.prep.includes(item.id));
}

// Ordered list of tasks for a day; `done` decides which section the home screen shows it in.
export function tasksForDay({ day, key, settings, checklist }) {
  const tasks = [
    { type: 'checkin', done: day.checkin != null },
    { type: 'water', done: day.water >= settings.waterGoal },
    { type: 'mood', done: day.mood != null },
  ];
  if (isGymDay(key, settings.gymDays)) {
    tasks.push({ type: 'gym', done: prepDone(day, checklist) });
  }
  return tasks;
}

// ---------- reminders ----------

// Whether the thing a reminder asks for has been done since the reminder was set to fire.
function reminderSatisfied(r, at, ctx) {
  const { day, settings, gymDay, checklist } = ctx;
  switch (r.type) {
    case 'checkin': return day.checkin != null;
    case 'mood': return day.mood != null;
    case 'water': return day.water >= settings.waterGoal || day.waterAt.some((t) => t >= at);
    case 'gym': return !gymDay || prepDone(day, checklist);
    default: return true;
  }
}

// Reminders that should currently be showing for `key` (normally today).
// Only the latest-passed reminder of each type is considered, so snoozing or
// skipping the 14:00 water reminder doesn't bring the 10:00 one back.
// log: { [reminderId]: { snoozeUntil?, skipped?, notifiedAt? } } for that day.
export function dueReminders({ reminders, day, key, now, log = {}, settings, checklist }) {
  const ctx = { day, settings, checklist, gymDay: isGymDay(key, settings.gymDays) };
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
