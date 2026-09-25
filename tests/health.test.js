import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dateKey, addDays, timeOn, toMinutes, fromMinutes, hash, emptyDay, readiness, dueReminders,
} from '../js/health.js';

const WED = '2026-09-23';

test('date helpers use local dates', () => {
  assert.equal(dateKey(new Date(2026, 0, 2)), '2026-01-02');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(timeOn(WED, '07:30'), new Date(2026, 8, 23, 7, 30).getTime());
  assert.equal(toMinutes('18:45'), 1125);
  assert.equal(fromMinutes(1125), '18:45');
});

test('hash is stable', () => {
  assert.equal(hash('abc'), hash('abc'));
  assert.notEqual(hash('abc'), hash('abd'));
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
});

test('readiness: very sore area or under 5h sleep caps a good day at light', () => {
  assert.equal(readiness({ sleepHours: '7-8', sleepQuality: 3, soreness: { legs: 2 }, stress: 1, energy: 5 }).level, 'light');
  assert.equal(readiness({ sleepHours: 'lt5', sleepQuality: 3, soreness: {}, stress: 1, energy: 5 }).level, 'light');
});

const reminders = [
  { id: 'c', type: 'checkin', time: '07:30', enabled: true },
  { id: 'w1', type: 'water', time: '10:00', enabled: true },
  { id: 'w2', type: 'water', time: '14:00', enabled: true },
  { id: 'k', type: 'workout', time: '17:30', enabled: true },
];
const at = (hhmm) => timeOn(WED, hhmm);
const run = (day, now, log, workoutPending = true) =>
  dueReminders({ reminders, day, key: WED, now, log, waterGoal: 8, workoutPending });
const due = (...args) => run(...args).map((d) => d.reminder.id);

test('dueReminders: only passed, unfinished tasks; latest water only', () => {
  assert.deepEqual(due(emptyDay(), at('07:00')), []);
  assert.deepEqual(due(emptyDay(), at('09:00')), ['c']);
  assert.deepEqual(due({ ...emptyDay(), checkin: {} }, at('09:00')), []);
  assert.deepEqual(due(emptyDay(), at('18:00')), ['c', 'w2', 'k']);
  assert.deepEqual(due(emptyDay(), at('18:00'), {}, false), ['c', 'w2']); // workout done / rest day
});

test('dueReminders: water satisfied by a glass after the reminder time', () => {
  const day = { ...emptyDay(), checkin: {}, water: 1, waterAt: [at('10:30')] };
  assert.deepEqual(due(day, at('11:00')), []);
  assert.deepEqual(due(day, at('14:05')), ['w2']);
});

test('dueReminders: snooze hides until time, then notifies again', () => {
  const day = { ...emptyDay(), checkin: {} };
  const log = { w2: { notifiedAt: at('14:00'), snoozeUntil: at('14:10') } };
  assert.deepEqual(due(day, at('14:05'), log), []);
  const [again] = run(day, at('14:11'), log);
  assert.equal(again.reminder.id, 'w2');
  assert.equal(again.notify, true);
});

test('dueReminders: skipping the latest does not resurface an earlier one', () => {
  assert.deepEqual(due({ ...emptyDay(), checkin: {} }, at('15:00'), { w2: { skipped: true } }), []);
});

test('water every N hours: slots in the window, reminds when on pace, not right after a glass, stops at the goal', async () => {
  const { waterIntervalReminders, dueReminders, timeOn: at } = await import('../js/health.js');
  const slots = waterIntervalReminders({ every: 90, from: '08:00', to: '20:00' });
  assert.deepEqual(slots.map((r) => r.time), ['08:00', '09:30', '11:00', '12:30', '14:00', '15:30', '17:00', '18:30', '20:00']);
  assert.deepEqual(waterIntervalReminders({ every: 0 }), []);
  const key = '2026-09-25';
  const day = (water, waterAt = []) => ({ water, waterAt, checkin: null });
  const due = (d, now) => dueReminders({ reminders: slots, day: d, key, now: at(key, now), log: {}, waterGoal: 8, workoutPending: false, repeatMs: 3600_000 });
  // 11:05, drank 4 glasses by 10:00 (ahead of pace): still reminded
  assert.equal(due(day(4, [at(key, '10:00')]), '11:05')[0]?.reminder.time, '11:00');
  // drank at 10:45 (within 20 min before 11:00): that slot is already covered
  assert.equal(due(day(4, [at(key, '10:45')]), '11:05').length, 0);
  // goal reached: quiet for the rest of the day
  assert.equal(due(day(8, [at(key, '09:00')]), '15:40').length, 0);
  // shown once already: no repeat of the same slot (the next slot is the repeat)
  const log = { 'r-wi-1100': { notifiedAt: at(key, '11:00') } };
  const r = dueReminders({ reminders: slots, day: day(4, []), key, now: at(key, '12:10'), log, waterGoal: 8, workoutPending: false, repeatMs: 3600_000 });
  assert.equal(r[0].notify, false);
});
