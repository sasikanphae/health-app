// Smart rescheduling: a missed task is never just "overdue". The cat asks if
// it still matters, finds a real free slot for it, and after the third move
// offers to make it smaller or put it on a quieter day.
// Pure functions only — tested in tests/reschedule.test.js.
import { addDays } from './health.js';

const toMin = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const hm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const DUR = { work: 60, appt: 60, personal: 30 };

// Meetings and calls happen at their time whether ticked or not: never "slipped".
const MEETING_RE = /ประชุม|meeting|คอล|call|สัมภาษณ์|สัมมนา|นัด/i;

// Tasks that slipped: from an earlier day, or today more than an hour past their time.
export function slippedTasks(events, today, nowMin) {
  return events.filter((e) => !e.done && !e.dropped && (e.kind === 'work' || e.kind === 'personal')
    && !(e.time && MEETING_RE.test(e.title ?? ''))
    && (e.date < today || (e.date === today && e.time && toMin(e.time) + 60 < nowMin)))
    .sort((a, b) => `${a.date}${a.time ?? ''}`.localeCompare(`${b.date}${b.time ?? ''}`));
}

// Fixed blocks of a day (appointments and timed work/errands).
const blocksOn = (events, date, skipId) => events.filter((e) => e.date === date && e.time && !e.done && e.id !== skipId)
  .map((e) => ({ start: toMin(e.time), end: toMin(e.time) + (DUR[e.kind] ?? 30) }));

function firstFree(blocks, dur, from, to) {
  for (let s = Math.ceil(from / 15) * 15; s + dur <= to; s += 15) {
    if (!blocks.some((b) => s < b.end && b.start < s + dur)) return s;
  }
  return null;
}

// Day in the next week with the least on it (for "ย้ายไปวันที่ว่าง").
export function quietestDay(events, today, { days = 7, busyWeekdays = new Set() } = {}) {
  let best = null;
  for (let i = 1; i <= days; i++) {
    const d = addDays(today, i);
    const load = events.filter((e) => e.date === d && !e.done).length + (busyWeekdays.has(new Date(`${d}T00:00:00`).getDay()) ? 2 : 0);
    if (!best || load < best.load) best = { date: d, load };
  }
  return best.date;
}

// A new time that really is free: today if there's room, else tomorrow, else
// the quietest day this week. Work goes in the morning, errands after work.
export function proposeSlot(event, { events, today, nowMin, busyWeekdays = new Set(), skip = 0 }) {
  const dur = DUR[event.kind] ?? 30;
  const options = [];
  const start = event.kind === 'work' ? 9 * 60 : 17 * 60;
  const todayFrom = Math.max(nowMin + 15, 8 * 60);
  const t = firstFree(blocksOn(events, today, event.id), dur, Math.max(todayFrom, event.kind === 'work' ? todayFrom : Math.min(start, 20 * 60)), 21 * 60);
  if (t != null) options.push({ date: today, time: hm(t), why: `วันนี้ยังว่างช่วง ${hm(t)}–${hm(t + dur)}` });
  const tomorrow = addDays(today, 1);
  const t2 = firstFree(blocksOn(events, tomorrow, event.id), dur, start, 21 * 60);
  if (t2 != null) options.push({ date: tomorrow, time: hm(t2), why: `พรุ่งนี้${event.kind === 'work' ? 'เช้า' : ''}ยังว่างช่วง ${hm(t2)}` });
  const q = quietestDay(events, today, { busyWeekdays });
  const t3 = firstFree(blocksOn(events, q, event.id), dur, start, 21 * 60);
  if (t3 != null && q !== tomorrow) options.push({ date: q, time: hm(t3), why: 'เป็นวันที่ว่างที่สุดในสัปดาห์นี้' });
  return options[Math.min(skip, options.length - 1)] ?? { date: tomorrow, time: null, why: 'พรุ่งนี้ ไม่ระบุเวลา' };
}

// After the third move: suggest a smaller first step instead of moving again.
export const needsResize = (event) => (event.moved ?? 0) >= 3;
export const smallerStep = (title) => `เริ่ม${title} 15 นาที`;
