// Push notifications that arrive with the app closed: the phone can't run our
// code on a timer, so the app hands a small push server a list of "at this
// time, show this" jobs. This file decides WHICH reminders become jobs and WHEN.
// The texts are encrypted on the device before upload (see push-client.js),
// so the server only ever sees times and opaque blobs.
// Pure functions only — tested in tests/push-plan.test.js.
import { addDays } from './health.js';
import { lifeCandidates } from './life.js';
import { freeWindow } from './suggest.js';
import { QUIET, MAX_PER_DAY } from './context.js';

const toMin = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const hm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
export const timeOn = (date, time) => new Date(`${date}T${time}:00`).getTime();
const minOf = (ms) => {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
};
const dayOf = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const quiet = (ms) => {
  const m = minOf(ms);
  return m >= QUIET.from || m < QUIET.to;
};

// Categories the user can switch on/off one by one (Settings › แจ้งเตือนแม้ปิดแอป).
export const PUSH_CATS = {
  appt: { label: 'นัดหมาย', note: 'ก่อนถึงเวลานัด และคืนก่อนวันนัด' },
  task: { label: 'งานและธุระที่มีเวลา', note: 'ตามเวลาที่ตั้งไว้' },
  bill: { label: 'บิลที่ต้องจ่าย', note: '09:00 ก่อนถึงกำหนดตามที่ตั้งไว้' },
  checkin: { label: 'เช็กอินตอนเช้า', note: 'ตามเวลาในรายการเตือน' },
  water: { label: 'ดื่มน้ำ', note: 'เตือนเฉพาะตอนที่ดื่มน้อยกว่าที่ควร' },
  workout: { label: 'ออกกำลังกาย', note: 'ช่วงที่ว่างก่อนเวลาที่ชอบ' },
};
export const HORIZON_DAYS = 7; // appointments and bills this far ahead
const HEALTH_DAYS = 2; // health reminders only today and tomorrow: no nagging an idle user
const MAX_REPEATS = 3;
export const CX_WATER_TIMES = ['11:00', '15:00', '18:00'];

// Did the water check at `at` find the user behind? Shared with sw.js (copied there).
export function waterBehind({ have = 0, goal = 0 }, at) {
  const frac = Math.min(1, Math.max(0, (minOf(at) - 7 * 60) / (14 * 60)));
  const expected = Math.round(goal * frac);
  return { behind: goal > 0 && expected - have >= 2, expected };
}

// First slot, from `from` in 30-minute steps, where the workout fits between
// the day's fixed appointments (the same free-time rule as "วันนี้ทำอะไรดี?").
function workoutSlot(fixed, from, dur, latest = 20 * 60 + 30) {
  for (let m = Math.ceil(from / 15) * 15; m <= latest; m += 30) {
    const f = freeWindow(m, fixed);
    if (f.minutes >= dur) return { min: m, free: f };
  }
  return null;
}

// ctx: {
//   now, today, cats: { appt, task, bill, checkin, water, workout },
//   events, bills, reminders (settings), log (today's reminderLog), repeatMin,
//   status: { checkin, water, waterGoal, workoutPending, easy },   // today
//   contextOn, workout: { title, dur, planTime, prefTime } | null, sentToday,
// }
// Returns jobs: { id, at, kind, check[], ...candidate } (texts are added by the app).
export function pushCandidates(ctx) {
  const { now, today, cats = {}, events = [], bills = [], reminders = [], log = {}, status = {} } = ctx;
  const repeatMs = (ctx.repeatMin ?? 0) * 60_000;
  const out = [];
  const add = (job) => out.push(job);

  // --- appointments, timed tasks, bills: this week ---
  for (let i = 0; i < HORIZON_DAYS; i++) {
    const d = addDays(today, i);
    for (const c of lifeCandidates({ events, bills, today: d, now: Infinity })) {
      const ev = c.kind === 'event' ? events.find((e) => e.id === c.ref) : null;
      const cat = c.kind === 'bill' ? 'bill' : ev?.kind === 'appt' ? 'appt' : 'task';
      if (!cats[cat]) continue;
      const check = c.kind === 'bill' ? [c.id] : [`ev:${c.ref}`]; // bill ids carry their month: bill:<id>:<ym>
      add({ ...c, id: `${c.id}@${d}`, base: c.id, date: d, cat, check });
    }
  }

  // --- check-in and (if not contextual) fixed water/workout times ---
  for (let i = 0; i < HEALTH_DAYS; i++) {
    const d = addDays(today, i);
    for (const r of reminders) {
      if (!r.enabled || !cats[r.type]) continue;
      // contextual ones below replace fixed water/workout times — except "every N hours" water
      if (r.type !== 'checkin' && ctx.contextOn && !r.interval) continue;
      if (r.type === 'workout' && (i > 0 || !status.workoutPending || status.easy)) continue;
      if (i === 0 && r.type === 'checkin' && status.checkin) continue;
      add({ id: `${r.id}@${d}`, base: r.id, date: d, at: timeOn(d, r.time), kind: 'health', type: r.type, cat: r.type, reminder: r, repeat: !r.noRepeat, check: [`${r.type}:${d}`], ...(r.interval ? { sub: 'water-every' } : {}) });
    }
  }

  // --- contextual: workout in a real free slot, water only when behind ---
  if (ctx.contextOn) {
    if (cats.workout && ctx.workout && status.workoutPending && !status.easy) {
      const w = ctx.workout;
      const anchor = toMin(w.prefTime ?? w.planTime ?? '18:00');
      const fixed = events.filter((e) => e.date === today && e.time && !e.done)
        .map((e) => ({ label: e.title, time: e.time, dur: e.kind === 'appt' ? 60 : 30 }));
      const slot = workoutSlot(fixed, Math.max(anchor - 60, minOf(now) + 5), w.dur ?? 45);
      if (slot) {
        add({
          id: `cx:workout@${today}`, base: 'cx:workout', date: today, at: timeOn(today, hm(slot.min)), kind: 'cx', sub: 'workout', cat: 'workout', repeat: false,
          freeMin: Math.min(slot.free.minutes, 180), until: slot.free.until, untilLabel: slot.free.untilLabel, check: [`workout:${today}`],
        });
      }
    }
    if (cats.water && !ctx.waterInterval) { // "every N hours" mode replaces the pace checks
      for (let i = 0; i < HEALTH_DAYS; i++) {
        const d = addDays(today, i);
        for (const t of CX_WATER_TIMES) {
          add({ id: `cx:water:${t}@${d}`, base: 'cx:water', date: d, at: timeOn(d, t), kind: 'cx', sub: 'water', cat: 'water', repeat: false, check: [`water:${d}`] });
        }
      }
    }
  }

  // --- today's log: skipped stays quiet, snoozed moves, repeats if set ---
  const jobs = [];
  for (const j of out) {
    let at = j.at;
    if (j.date === today) {
      const e = log[j.base] ?? {};
      if (e.skipped) continue;
      if (e.snoozeUntil && e.snoozeUntil > now) at = Math.max(at, e.snoozeUntil);
      else if (e.notifiedAt && j.kind !== 'cx') { // contextual checks re-evaluate each time (capped per day below)
        // Already shown today. Repeat later (if the user set เตือนซ้ำ), a few times at most.
        if (!(j.repeat && repeatMs)) continue;
        const first = Math.floor((now - e.notifiedAt) / repeatMs) + 1;
        for (let k = first; k < first + MAX_REPEATS; k++) {
          const rAt = e.notifiedAt + k * repeatMs;
          if (!quiet(rAt) && dayOf(rAt) === j.date) jobs.push({ ...j, id: `${j.id}#${k}`, at: rAt, repeatN: k });
        }
        continue;
      } else if (at <= now) continue; // missed while closed: the app shows it on open
    }
    if (at <= now) continue;
    // Quiet hours: only a timed appointment's own heads-up may break them.
    if (quiet(at) && !(j.kind === 'event' && j.stage === 'soon' && j.cat === 'appt')) continue;
    jobs.push({ ...j, at });
    if (j.repeat && repeatMs && j.kind !== 'cx') {
      for (let k = 1; k <= MAX_REPEATS; k++) {
        const rAt = at + k * repeatMs;
        if (!quiet(rAt) && dayOf(rAt) === dayOf(at)) jobs.push({ ...j, id: `${j.id}#${k}`, at: rAt, repeatN: k });
      }
    }
  }

  // Contextual nudges: at most MAX_PER_DAY a day, counting what was already sent today.
  const perDay = {};
  return jobs.sort((a, b) => a.at - b.at).filter((j) => {
    if (j.kind !== 'cx') return true;
    const used = (perDay[j.date] ??= j.date === today ? (ctx.sentToday ?? 0) : 0);
    if (used >= MAX_PER_DAY) return false;
    perDay[j.date] = used + 1;
    return true;
  });
}

// What the service worker needs to know when a push arrives, so a reminder for
// something already done never shows (the app also re-syncs, this is the backstop).
// Keys match the jobs' `check` entries.
export function pushSnapshot({ today, events = [], bills = [], status = {}, log = {} }) {
  const done = [];
  for (const e of events) if (e.done) done.push(`ev:${e.id}`);
  for (const b of bills) for (const ym of Object.keys(b.paid ?? {})) done.push(`bill:${b.id}:${ym}`);
  if (status.checkin) done.push(`checkin:${today}`);
  if (!status.workoutPending) done.push(`workout:${today}`);
  if (status.waterGoal && status.water >= status.waterGoal) done.push(`water:${today}`);
  const skipped = Object.entries(log).filter(([, v]) => v.skipped).map(([k]) => `${k}@${today}`);
  return { date: today, done, skipped, water: { have: status.water ?? 0, goal: status.waterGoal ?? 0, lastAt: status.waterLastAt ?? null }, at: Date.now() };
}
