import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, emptyDay } from '../js/health.js';
import { whatToAsk, whyContext, whyPatterns, missedWorkout } from '../js/why.js';

const TODAY = '2026-09-24';
const day = (o = {}) => ({ ...emptyDay(), ...o });
const miss = () => day({ plan: { w: true, time: '18:00' } });

test('asks only after the second miss, once, and not on "not today" days', () => {
  const days = { [addDays(TODAY, -1)]: miss() };
  assert.equal(whatToAsk({ days, today: TODAY }), null); // first slip: just life
  days[addDays(TODAY, -5)] = miss();
  const q = whatToAsk({ days, today: TODAY });
  assert.equal(q.kind, 'workout');
  assert.equal(q.date, addDays(TODAY, -1));
  assert.equal(whatToAsk({ days, today: TODAY, whyLog: [{ kind: 'workout', key: q.key, reason: 'sleep' }] }), null);
  assert.equal(whatToAsk({ days, today: TODAY, askedOn: TODAY }), null);
  assert.equal(whatToAsk({ days, today: TODAY, mutedUntil: addDays(TODAY, 2) }), null);
  assert.equal(missedWorkout(day({ plan: { w: true }, easy: true })), false);
  assert.equal(missedWorkout(day({ plan: { w: true }, workout: { done: true, intensity: 'hard' } })), false);
});

test('asks about a task that keeps moving', () => {
  const q = whatToAsk({ days: {}, today: TODAY, events: [{ id: 'e1', title: 'ส่งรายงาน', moved: 2, date: TODAY }] });
  assert.equal(q.kind, 'task');
  assert.match(q.title, /เลื่อนมา 2 รอบ/);
});

test('context: meeting in the afternoon before the workout', () => {
  const events = [{ date: TODAY, time: '16:00', kind: 'work' }];
  const c = whyContext({ day: day(), events, date: TODAY, planTime: '18:00', sleepHours: 5.5 });
  assert.equal(c.afterMeeting, true);
  assert.equal(c.shortSleep, true);
  assert.equal(whyContext({ day: day(), events, date: TODAY, planTime: '07:00' }).afterMeeting, false);
});

test('patterns from answers: top reason, and slips after meetings', () => {
  const log = [
    { kind: 'workout', date: '2026-09-20', reason: 'work', context: { afterMeeting: true } },
    { kind: 'workout', date: '2026-09-15', reason: 'work', context: { afterMeeting: true } },
    { kind: 'workout', date: '2026-09-10', reason: 'work', context: { afterMeeting: false } },
    { kind: 'workout', date: '2026-09-05', reason: 'tired', context: { afterMeeting: true } },
  ];
  const ps = whyPatterns({ whyLog: log, today: TODAY });
  const top = ps.find((p) => p.id === 'why-work');
  assert.match(top.text, /^ฉันสังเกตว่า.*งานเยอะ \(3 ใน 4 ครั้ง\)/);
  assert.equal(top.action.id, 'busy-light');
  const after = ps.find((p) => p.id === 'why-after-meeting');
  assert.match(after.text, /^ฉันสังเกตว่า/);
  assert.equal(after.action.id, 'meeting-move');
  assert.equal(whyPatterns({ whyLog: log.slice(0, 2), today: TODAY }).length, 0); // too little to say anything
  for (const p of ps) assert.ok(!/โรค|วินิจฉัย|อาการป่วย/.test(p.text));
});
