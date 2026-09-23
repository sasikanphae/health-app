import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dateKey, addDays, timeOn, isGymDay, emptyDay, readiness, tasksForDay, dueReminders,
} from '../js/health.js';

const settings = { waterGoal: 8, gymDays: [3] }; // Wednesdays
const checklist = [{ id: 'a' }, { id: 'b' }];
const WED = '2026-09-23';

test('date helpers use local dates', () => {
  assert.equal(dateKey(new Date(2026, 0, 2)), '2026-01-02');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(timeOn(WED, '07:30'), new Date(2026, 8, 23, 7, 30).getTime());
  assert.equal(isGymDay(WED, [3]), true);
  assert.equal(isGymDay(WED, [1, 5]), false);
});

test('readiness: well rested → hard', () => {
  const r = readiness({ sleepHours: '7-8', sleepQuality: 3, soreness: {}, stress: 1, energy: 5 });
  assert.equal(r.score, 100);
  assert.equal(r.level, 'hard');
  assert.deepEqual(r.reasons, []);
});

test('readiness: exhausted → rest', () => {
  const r = readiness({ sleepHours: 'lt5', sleepQuality: 1, soreness: { legs: 2, back: 2, arms: 2 }, stress: 5, energy: 1 });
  assert.equal(r.score, 0);
  assert.equal(r.level, 'rest');
  assert.deepEqual(r.verySore, ['legs', 'back', 'arms']);
  assert.ok(r.reasons.includes('นอนน้อย'));
});

test('readiness: very sore area caps a good day at light', () => {
  const r = readiness({ sleepHours: '7-8', sleepQuality: 3, soreness: { legs: 2 }, stress: 1, energy: 5 });
  assert.ok(r.score >= 70);
  assert.equal(r.level, 'light');
  assert.deepEqual(r.verySore, ['legs']);
});

test('readiness: under 5h sleep caps at light', () => {
  const r = readiness({ sleepHours: 'lt5', sleepQuality: 3, soreness: {}, stress: 1, energy: 5 });
  assert.equal(r.level, 'light');
});

test('tasksForDay adds gym prep only on gym days', () => {
  const day = { ...emptyDay(), water: 8, prep: ['a'] };
  const wed = tasksForDay({ day, key: WED, settings, checklist });
  assert.deepEqual(wed.map((t) => [t.type, t.done]), [
    ['checkin', false], ['water', true], ['mood', false], ['gym', false],
  ]);
  const thu = tasksForDay({ day, key: '2026-09-24', settings, checklist });
  assert.equal(thu.some((t) => t.type === 'gym'), false);
});

const reminders = [
  { id: 'c', type: 'checkin', time: '07:30', enabled: true },
  { id: 'w1', type: 'water', time: '10:00', enabled: true },
  { id: 'w2', type: 'water', time: '14:00', enabled: true },
  { id: 'm', type: 'mood', time: '20:30', enabled: false },
];
const at = (hhmm) => timeOn(WED, hhmm);
const due = (day, now, log) =>
  dueReminders({ reminders, day, key: WED, now, log, settings: { ...settings, gymDays: [] }, checklist })
    .map((d) => d.reminder.id);

test('dueReminders: only passed, enabled, unfinished tasks', () => {
  assert.deepEqual(due(emptyDay(), at('07:00')), []);
  assert.deepEqual(due(emptyDay(), at('09:00')), ['c']);
  assert.deepEqual(due({ ...emptyDay(), checkin: {} }, at('09:00')), []);
  assert.deepEqual(due(emptyDay(), at('21:00')), ['c', 'w2']); // mood disabled, latest water only
});

test('dueReminders: water satisfied by a glass after the reminder time', () => {
  const day = { ...emptyDay(), checkin: {}, water: 1, waterAt: [at('10:30')] };
  assert.deepEqual(due(day, at('11:00')), []);
  assert.deepEqual(due(day, at('14:05')), ['w2']);
  assert.deepEqual(due({ ...day, water: 8 }, at('14:05')), []);
});

test('dueReminders: snooze hides until time, then notifies again', () => {
  const day = { ...emptyDay(), checkin: {} };
  const log = { w2: { notifiedAt: at('14:00'), snoozeUntil: at('14:10') } };
  assert.deepEqual(due(day, at('14:05'), log), []);
  const [again] = dueReminders({
    reminders, day, key: WED, now: at('14:11'), log, settings: { ...settings, gymDays: [] }, checklist,
  });
  assert.equal(again.reminder.id, 'w2');
  assert.equal(again.notify, true);
});

test('dueReminders: skipping the latest does not resurface an earlier one', () => {
  const day = { ...emptyDay(), checkin: {} };
  assert.deepEqual(due(day, at('15:00'), { w2: { skipped: true } }), []);
});

test('dueReminders: already notified is shown but not re-notified', () => {
  const [d] = dueReminders({
    reminders, day: emptyDay(), key: WED, now: at('08:00'),
    log: { c: { notifiedAt: at('07:30') } }, settings: { ...settings, gymDays: [] }, checklist,
  });
  assert.equal(d.notify, false);
});
