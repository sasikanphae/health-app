import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contextReminders, MAX_PER_DAY } from '../js/context.js';

const ctx = (o = {}) => ({
  nowMin: 17 * 60 + 15, free: { minutes: 45, until: '18:00', untilLabel: 'ประชุม' }, level: 'light',
  workout: { pending: true, dur: 40, title: 'เวทที่บ้าน', planTime: '18:00' }, water: { have: 5, goal: 8 }, tasks: [], ...o,
});

test('workout reminder when there is really time, with its reasons', () => {
  const [r] = contextReminders(ctx());
  assert.equal(r.id, 'cx:workout');
  assert.equal(r.text, 'ตอนนี้ว่างราว 45 นาที และวันนี้ยังไม่ได้ออกกำลังกาย อยากเริ่มเลยไหม?');
  assert.ok(r.why.some((w) => w.includes('ไม่มีนัดจนถึง 18:00')));
  assert.equal(contextReminders(ctx({ free: { minutes: 20 } })).filter((x) => x.sub === 'workout').length, 0);
  assert.equal(contextReminders(ctx({ easy: true })).filter((x) => x.sub === 'workout').length, 0);
});

test('quiet hours, busy moments and the daily cap', () => {
  assert.deepEqual(contextReminders(ctx({ nowMin: 22 * 60 })), []);
  assert.deepEqual(contextReminders(ctx({ nowMin: 6 * 60 })), []);
  assert.deepEqual(contextReminders(ctx({ free: { minutes: 0, busyWith: 'ประชุม' } })), []);
  assert.deepEqual(contextReminders(ctx({ sentToday: MAX_PER_DAY })), []);
});

test('water when behind pace, tasks when a gap fits', () => {
  const r = contextReminders(ctx({ water: { have: 1, goal: 8 }, workout: null, tasks: [{ id: 'e1', title: 'ส่งรายงาน', dur: 30 }] }));
  const water = r.find((x) => x.sub === 'water');
  assert.match(water.text, /ดื่มไป 1 แก้ว/);
  const task = r.find((x) => x.sub === 'task');
  assert.equal(task.id, 'cx:task:e1');
  assert.match(task.text, /ทำ "ส่งรายงาน" เลยไหม/);
});
