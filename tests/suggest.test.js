import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, emptyDay } from '../js/health.js';
import { freeWindow, workoutSuccess, whatNow } from '../js/suggest.js';

const TODAY = '2026-09-24';

test('free window until the next fixed thing', () => {
  const fixed = [{ label: 'ประชุมทีม', time: '16:00', dur: 60 }];
  assert.deepEqual(freeWindow(15 * 60 + 15, fixed), { minutes: 45, until: '16:00', untilLabel: 'ประชุมทีม' });
  assert.equal(freeWindow(16 * 60 + 10, fixed).minutes, 0); // in the meeting
  assert.equal(freeWindow(20 * 60, fixed).minutes, 90); // until bedtime
});

test('workout success near a time', () => {
  const days = {};
  for (const i of [1, 3, 5, 8]) days[addDays(TODAY, -i)] = { ...emptyDay(), workout: { done: true, intensity: 'hard', at: new Date(`${addDays(TODAY, -i)}T18:50:00`).getTime() } };
  const s = workoutSuccess(days, TODAY, 18 * 60);
  assert.equal(s.near, 4);
  assert.match(s.text, /สำเร็จช่วงนี้ 4 ใน 4/);
  assert.equal(workoutSuccess(days, TODAY, 7 * 60).text, null);
});

const base = (o = {}) => ({
  nowMin: 17 * 60, free: { minutes: 90, until: '18:30', untilLabel: 'มื้อเย็น' }, energy: 3, checkinDone: true,
  workout: { pending: true, dur: 45, title: 'ยิม · ทั้งตัว', success: 'เคยสำเร็จช่วงนี้บ่อย' },
  water: { have: 6, goal: 8 }, tasks: [], meals: [], billsDue: [], ...o,
});

test('only three things, most useful first, each with a reason', () => {
  const r = whatNow(base({ tasks: [{ id: 't1', title: 'ส่งรายงาน', work: true, dur: 30 }, { id: 't2', title: 'โทรหาแม่', dur: 10, overdue: true }], water: { have: 1, goal: 8 } }));
  assert.equal(r.length, 3);
  assert.equal(r[0].id, 'workout');
  assert.ok(r.every((x) => x.why && x.title && x.act));
  assert.ok(!r.some((x) => x.id === 'checkin'));
});

test('low energy: gentle options, small tasks first', () => {
  const r = whatNow(base({ energy: 1, tasks: [{ id: 'big', title: 'ทำสไลด์', work: true, dur: 60 }, { id: 'small', title: 'ตอบอีเมล', dur: 10 }] }));
  assert.ok(!r.some((x) => x.id === 'workout'));
  assert.ok(r.some((x) => x.id === 'stretch'));
  assert.ok(r.some((x) => x.id === 'task-small'));
  assert.ok(!r.some((x) => x.id === 'task-big')); // nothing big on a tired day
});

test('an appointment soon comes first; nothing to do still gives one gentle idea', () => {
  const r = whatNow(base({ apptSoon: { title: 'หาหมอฟัน', time: '17:30', leave: 'doctor' } }));
  assert.equal(r[0].id, 'leave');
  const none = whatNow({ nowMin: 15 * 60, free: { minutes: 0 }, checkinDone: true });
  assert.equal(none.length, 1);
  assert.equal(none[0].id, 'relax');
});

test('not enough time for the workout → a short stretch instead', () => {
  const r = whatNow(base({ free: { minutes: 20, until: '17:20' } }));
  assert.ok(r.some((x) => x.id === 'stretch'));
  assert.ok(!r.some((x) => x.id === 'workout'));
});
