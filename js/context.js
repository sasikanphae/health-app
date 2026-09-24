// Contextual reminders: instead of "18:00 Workout", remind when it actually
// fits — using only what's already in the app (free time left, what's not done
// yet, learned patterns). No location. Each reminder says why it appeared.
// Pure functions only — tested in tests/context.test.js.
export const QUIET = { from: 21 * 60 + 30, to: 7 * 60 };
export const MAX_PER_DAY = 4;

const toMin = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// ctx: { nowMin, free: { minutes, until, untilLabel }, easy, level,
//        workout: { pending, dur, title, planTime, prefTime, success },
//        water: { have, goal }, tasks: [{ id, title, dur }], sentToday }
export function contextReminders(ctx) {
  const { nowMin } = ctx;
  if (nowMin >= QUIET.from || nowMin < QUIET.to) return [];
  if ((ctx.sentToday ?? 0) >= MAX_PER_DAY) return [];
  const free = ctx.free?.minutes ?? 0;
  if (free <= 0) return []; // never during an appointment or meeting
  const until = ctx.free?.until ? `ไม่มีนัดจนถึง ${ctx.free.until}${ctx.free.untilLabel ? ` (${ctx.free.untilLabel})` : ''}` : 'ช่วงนี้ไม่มีอะไรในตาราง';
  const out = [];

  const w = ctx.workout;
  if (w?.pending && !ctx.easy && ctx.level !== 'rest') {
    const anchor = toMin(w.prefTime ?? w.planTime ?? '18:00');
    if (free >= w.dur && nowMin >= anchor - 90 && nowMin <= 20 * 60 + 30) {
      out.push({
        id: 'cx:workout', sub: 'workout',
        text: `ตอนนี้ว่างราว ${Math.min(free, 180)} นาที และวันนี้ยังไม่ได้ออกกำลังกาย อยากเริ่มเลยไหม?`,
        why: [until, `วันนี้มีแผน: ${w.title} (ราว ${w.dur} นาที)`, w.prefTime ? `เธอชอบออกกำลังกายช่วง ${w.prefTime}` : null, w.success].filter(Boolean),
      });
    }
  }

  const water = ctx.water;
  if (water?.goal && free >= 5) {
    const frac = Math.min(1, Math.max(0, (nowMin - 7 * 60) / (14 * 60)));
    const expected = Math.round(water.goal * frac);
    if (expected - water.have >= 2) {
      out.push({
        id: 'cx:water', sub: 'water',
        text: `วันนี้ดื่มไป ${water.have} แก้ว ปกติเวลานี้ราว ${expected} แก้ว จิบสักแก้วไหม`,
        why: [`เป้าวันนี้ ${water.goal} แก้ว`, `เวลานี้ควรได้ราว ${expected} แก้ว แต่บันทึกไว้ ${water.have} แก้ว`, until],
      });
    }
  }

  const task = (ctx.tasks ?? []).find((t) => (t.dur ?? 30) <= free);
  if (task && free >= 30 && nowMin >= 9 * 60 && nowMin <= 20 * 60) {
    out.push({
      id: `cx:task:${task.id}`, sub: 'task', ref: task.id,
      text: `ว่างอยู่ราว ${Math.min(free, 180)} นาที ทำ "${task.title}" เลยไหม?`,
      why: [until, `"${task.title}" ยังไม่ได้ทำ และน่าจะใช้ราว ${task.dur ?? 30} นาที`],
    });
  }
  return out;
}
