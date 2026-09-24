// Why Analysis: when a plan slips more than once, ask one short, kind question
// ("ครั้งนี้เพราะอะไร?", one tap to answer), then look for patterns in the
// answers and offer a fix next time — never blame.
// Pure functions only — tested in tests/why.test.js.
import { addDays, parseKey } from './health.js';

export const WHY_REASONS = {
  sleep: 'นอนน้อย',
  work: 'งานเยอะ',
  tired: 'ไม่มีแรง',
  weather: 'อากาศ',
  time: 'เวลาไม่เหมาะ',
  other: 'อื่นๆ',
};

// A kind next step for each answer.
export const WHY_FIX = {
  sleep: { text: 'วันที่นอนน้อย แมวจะลดโปรแกรมให้เองเลยไหม', action: { id: 'short-sleep-light', label: 'ลดให้เองเลย' } },
  work: { text: 'วันที่งานเยอะ แมวจะจัดโปรแกรมให้สั้นและเบาลงเองไหม', action: { id: 'busy-light', label: 'จัดให้เบาลงเอง' } },
  tired: { text: 'วันนี้ลองเบาลงก่อนไหม ขยับนิดเดียวก็นับแล้ว', action: { id: 'lighten', label: 'วันนี้เบาลง' } },
  weather: { text: 'วันฝนตกหรือร้อนจัด แตะบอกในหน้า "จัดวันนี้ให้ฉัน" แมวจะเปลี่ยนเป็นในบ้านให้', action: null },
  time: { text: 'ลองเปลี่ยนช่วงเวลาออกกำลังกายดูไหม', action: { id: 'retime', label: 'เลือกเวลาใหม่' } },
  other: { text: 'ไม่เป็นไรเลย เดี๋ยวเราจัดใหม่', action: null },
};

const worked = (d) => !!d?.workout?.done && d.workout.intensity !== 'rest';
// A planned workout that didn't happen, on a day that counts (not a "ไม่ไหว" day).
export const missedWorkout = (d) => !!d?.plan?.w && !worked(d) && !d.easy;

// What to ask about today, if anything. At most one question a day; never the
// same thing twice; quiet for a while after "ไม่อยากตอบ"; only after the
// second slip (a single miss is just life).
export function whatToAsk({ days, events = [], whyLog = [], today, mutedUntil = null, askedOn = null }) {
  if (askedOn === today || (mutedUntil && today < mutedUntil)) return null;
  const asked = (kind, key) => whyLog.some((w) => w.kind === kind && w.key === key);
  const y = addDays(today, -1);
  if (missedWorkout(days[y]) && !asked('workout', y)) {
    const misses = Array.from({ length: 14 }, (_, i) => addDays(today, -(i + 1))).filter((k) => missedWorkout(days[k])).length;
    if (misses >= 2) return { kind: 'workout', key: y, date: y, title: 'เมื่อวานไม่ได้ออกกำลังกายตามแผน' };
  }
  const task = events.find((e) => !e.done && (e.moved ?? 0) >= 2 && e.date >= today && !asked('task', `${e.id}:${e.moved}`));
  if (task) return { kind: 'task', key: `${task.id}:${task.moved}`, ref: task.id, date: today, title: `"${task.title}" เลื่อนมา ${task.moved} รอบแล้ว` };
  return null;
}

// Context saved with an answer, so patterns can be found later without asking more.
export function whyContext({ day, events = [], date, planTime = null, sleepHours = null }) {
  const pt = planTime ? Number(planTime.slice(0, 2)) * 60 + Number(planTime.slice(3)) : null;
  const before = events.filter((e) => e.date === date && e.time && (e.kind === 'work' || e.kind === 'appt'))
    .map((e) => Number(e.time.slice(0, 2)) * 60 + Number(e.time.slice(3)));
  return {
    weekday: parseKey(date).getDay(),
    planTime,
    afterMeeting: pt != null && before.some((s) => s >= 12 * 60 && s < pt && pt - s <= 240),
    shortSleep: sleepHours != null && sleepHours < 6,
    busy: events.filter((e) => e.date === date && (e.kind === 'work' || e.kind === 'appt')).length >= 2 || !!day?.easy,
  };
}

// Patterns from the answers, worded as observations, each with a next step.
export function whyPatterns({ whyLog, today, lookback = 60 }) {
  const from = addDays(today, -lookback);
  const ws = whyLog.filter((w) => w.kind === 'workout' && w.date >= from && w.reason && w.reason !== 'skip');
  const out = [];
  if (ws.length >= 3) {
    const counts = {};
    for (const w of ws) counts[w.reason] = (counts[w.reason] ?? 0) + 1;
    const [top, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (n >= 3 && n / ws.length >= 0.5 && top !== 'other') {
      out.push({
        id: `why-${top}`, strength: n / ws.length,
        text: `ฉันสังเกตว่าช่วงนี้วันที่ไม่ได้ออกกำลังกาย ส่วนใหญ่เป็นเพราะ${WHY_REASONS[top]} (${n} ใน ${ws.length} ครั้ง)`,
        tip: WHY_FIX[top].text, action: WHY_FIX[top].action,
      });
    }
    const after = ws.filter((w) => w.context?.afterMeeting).length;
    if (after >= 2 && after / ws.length >= 0.6) {
      out.push({
        id: 'why-after-meeting', strength: after / ws.length,
        text: `ฉันสังเกตว่าเธอมักพลาดออกกำลังกายในวันที่มีประชุมหรือนัดช่วงบ่าย-เย็น (${after} ใน ${ws.length} ครั้ง)`,
        tip: 'วันแบบนั้น แมวย้ายไปออกกำลังกายช่วงเช้าให้เองดีไหม',
        action: { id: 'meeting-move', label: 'ย้ายเป็นช่วงเช้าให้เอง' },
      });
    }
  }
  return out.sort((a, b) => b.strength - a.strength);
}

// Rules the user agreed to, as memories (shown in "แมวจำอะไรไว้บ้าง").
export const RULE_TEXT = {
  'meeting-move': 'วันที่มีประชุมหรือนัดช่วงบ่าย-เย็น ย้ายออกกำลังกายไปช่วงเช้า',
  'short-sleep-light': 'วันที่นอนน้อยกว่า 6 ชม. ลดโปรแกรมให้เบาลงเอง',
  'busy-light': 'วันที่งานเยอะ จัดโปรแกรมให้เบาลงเอง',
};
