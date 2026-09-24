// "วันนี้ทำอะไรดี?" and the "ทำไม?" explanations: how much free time there is
// right now, what's realistic in it, and why the cat suggests it.
// Pure functions only — tested in tests/suggest.test.js.
import { addDays } from './health.js';

const toMin = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const hm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
export const DAY_END = 21 * 60 + 30;

// Free time from `now` until the next fixed thing (or bedtime).
// fixed: [{ label, time: 'HH:MM', dur }]
export function freeWindow(nowMin, fixed = [], end = DAY_END) {
  const blocks = fixed.filter((f) => f.time).map((f) => ({ ...f, start: toMin(f.time), end: toMin(f.time) + (f.dur ?? 30) }));
  const inside = blocks.find((b) => b.start <= nowMin && nowMin < b.end);
  if (inside) return { minutes: 0, busyWith: inside.label, until: hm(inside.end) };
  const next = blocks.filter((b) => b.start > nowMin).sort((a, b) => a.start - b.start)[0];
  const stop = Math.min(next ? next.start : end, end);
  return { minutes: Math.max(0, stop - nowMin), until: next && next.start <= end ? hm(next.start) : null, untilLabel: next?.label ?? null };
}

// How often workouts that started near `min` actually happened (last 6 weeks).
export function workoutSuccess(days, today, min) {
  const starts = [];
  for (let i = 1; i <= 42; i++) {
    const d = days[addDays(today, -i)];
    if (!d?.workout?.done || d.workout.intensity === 'rest' || !d.workout.at) continue;
    const t = new Date(d.workout.at);
    starts.push(t.getHours() * 60 + t.getMinutes() - 45);
  }
  const near = starts.filter((s) => Math.abs(s - min) <= 75).length;
  return { near, total: starts.length, text: starts.length >= 3 && near >= 2 ? `เธอเคยออกกำลังกายสำเร็จช่วงนี้ ${near} ใน ${starts.length} ครั้งล่าสุด` : null };
}

// Just three things that are realistic right now, most useful first.
// ctx: { nowMin, free, energy, level, stress, easy, checkinDone, apptSoon, billsDue[], meals[],
//        workout: { pending, dur, title, success }, water: { have, goal }, tasks[], relaxDone }
export function whatNow(ctx) {
  const out = [];
  const add = (score, item) => out.push({ score, ...item });
  const free = ctx.free?.minutes ?? 0;
  const low = (ctx.energy != null && ctx.energy <= 2) || ctx.level === 'rest' || ctx.easy;
  const untilText = ctx.free?.until ? `ว่างถึง ${ctx.free.until}${ctx.free.untilLabel ? ` (ก่อน${ctx.free.untilLabel})` : ''}` : 'ช่วงนี้ไม่มีนัด';

  if (ctx.apptSoon) {
    add(100, { id: 'leave', act: 'leave', ref: ctx.apptSoon.leave, minutes: 5, title: `เตรียมตัวไป${ctx.apptSoon.title}`, why: `นัด ${ctx.apptSoon.time} น. เช็กของก่อนออกจะได้ไม่ลืม` });
  }
  if (!ctx.checkinDone && ctx.nowMin < 12 * 60) {
    add(80, { id: 'checkin', act: 'checkin', minutes: 1, title: 'เช็กอินตอนเช้า', why: 'ตอบ 5 ข้อ แมวจะรู้ว่าวันนี้ควรหนักหรือเบา' });
  }
  for (const b of ctx.billsDue ?? []) add(70, { id: `bill-${b.id}`, act: 'bill', ref: b.id, minutes: 2, title: `จ่าย${b.title}`, why: 'ครบกำหนดแล้ว ใช้เวลาแป๊บเดียว' });
  for (const m of ctx.meals ?? []) {
    if (m.done) continue;
    const d = ctx.nowMin - toMin(m.time);
    if (d >= -30 && d <= 90) add(75, { id: `meal-${m.slot}`, act: 'meal', ref: m.slot, minutes: 20, title: m.label, why: `ได้เวลามื้อแล้ว (${m.time})` });
  }
  const w = ctx.workout;
  if (w?.pending) {
    if (!low && free >= w.dur) {
      add(60 + (w.success ? 10 : 0), { id: 'workout', act: 'workout', minutes: w.dur, title: w.title, why: [untilText, w.success].filter(Boolean).join(' · ') });
    } else if (free >= 15) {
      add(low ? 50 : 40, { id: 'stretch', act: 'stretch', minutes: 10, title: 'ยืดเส้น 10 นาที', why: low ? 'พลังงานวันนี้น้อย ขยับเบาๆ ก็นับแล้ว' : `ว่างไม่พอสำหรับ${w.title} ยืดเส้นสั้นๆ แทนก่อน` });
    }
  }
  for (const t of ctx.tasks ?? []) {
    const dur = t.dur ?? 30;
    if (dur > Math.max(free, 15)) continue;
    if (low && dur > 30 && !t.urgent) continue; // tired: nothing big unless it can't wait
    let score = t.overdue ? 65 : 55;
    if (t.work && !low) score += 8;
    if (low && dur <= 15) score += 8;
    if (t.urgent) score += 10;
    add(score, { id: `task-${t.id}`, act: 'task', ref: t.id, minutes: dur, title: t.title, why: t.overdue ? 'ยกมาจากวันก่อน ทำตอนนี้จะได้โล่ง' : `${untilText} พอดีกับงานนี้` });
  }
  const water = ctx.water;
  if (water && water.goal) {
    const frac = Math.min(1, Math.max(0, (ctx.nowMin - 7 * 60) / (14 * 60)));
    const expected = Math.round(water.goal * frac);
    if (expected - water.have >= 2) add(50, { id: 'water', act: 'water', minutes: 1, title: 'ดื่มน้ำ 1 แก้ว', why: `ดื่มไป ${water.have} แก้ว ปกติเวลานี้ราว ${expected} แก้ว` });
  }
  if (!ctx.relaxDone && ((ctx.stress ?? 0) >= 4 || low)) add(low ? 58 : 45, { id: 'relax', act: 'relax', minutes: 5, title: 'พักหายใจ 5 นาที', why: low ? 'วันนี้ไม่ต้องเอา 100% พักสักนิดก่อน' : 'ความเครียดวันนี้สูง หายใจช้าๆ ช่วยได้' });

  const top = out.sort((a, b) => b.score - a.score).filter((x, i, arr) => arr.findIndex((y) => y.id === x.id) === i).slice(0, 3);
  if (!top.length) top.push({ score: 0, id: 'relax', act: 'relax', minutes: 5, title: 'พักหายใจ 5 นาที', why: 'ตอนนี้ไม่มีอะไรเร่ง พักสักครู่ได้เลย' });
  return top.map(({ score, ...x }) => x);
}
