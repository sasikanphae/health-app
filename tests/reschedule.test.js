import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slippedTasks, proposeSlot, quietestDay, needsResize, smallerStep } from '../js/reschedule.js';

const TODAY = '2026-09-24';

test('slipped tasks: earlier days, or an hour past today; appointments are not tasks', () => {
  const events = [
    { id: 'a', kind: 'work', date: '2026-09-22', done: false },
    { id: 'b', kind: 'personal', date: TODAY, time: '09:00', done: false },
    { id: 'c', kind: 'personal', date: TODAY, time: '13:30', done: false },
    { id: 'd', kind: 'appt', date: '2026-09-23', time: '10:00', done: false },
    { id: 'e', kind: 'work', date: '2026-09-23', done: true },
    { id: 'f', kind: 'work', date: '2026-09-23', dropped: true },
    { id: 'g', kind: 'work', title: 'ประชุมลูกค้า', date: '2026-09-23', time: '16:00', done: false },
  ];
  assert.deepEqual(slippedTasks(events, TODAY, 14 * 60).map((e) => e.id), ['a', 'b']);
});

test('proposes a free slot today, else tomorrow, never on top of a meeting', () => {
  const events = [
    { id: 't', kind: 'work', title: 'ส่งรายงาน', date: '2026-09-22' },
    { id: 'm', kind: 'work', date: TODAY, time: '15:00' },
  ];
  const s = proposeSlot(events[0], { events, today: TODAY, nowMin: 14 * 60 + 10 });
  assert.equal(s.date, TODAY);
  assert.equal(s.time, '16:00'); // 14:30 would overlap the 15:00 meeting
  assert.match(s.why, /วันนี้ยังว่าง/);
  const late = proposeSlot(events[0], { events, today: TODAY, nowMin: 20 * 60 + 30 });
  assert.equal(late.date, '2026-09-25');
  assert.equal(late.time, '09:00');
  const other = proposeSlot(events[0], { events, today: TODAY, nowMin: 14 * 60 + 10, skip: 1 });
  assert.notEqual(`${other.date} ${other.time}`, `${s.date} ${s.time}`);
});

test('quietest day avoids busy weekdays; resize after 3 moves', () => {
  const events = [{ date: '2026-09-25' }, { date: '2026-09-25' }, { date: '2026-09-26' }];
  assert.equal(quietestDay(events, TODAY), '2026-09-27');
  assert.equal(quietestDay([], TODAY, { busyWeekdays: new Set([5]) }), '2026-09-26');
  assert.equal(needsResize({ moved: 2 }), false);
  assert.equal(needsResize({ moved: 3 }), true);
  assert.equal(smallerStep('ทำสไลด์'), 'เริ่มทำสไลด์ 15 นาที');
});
