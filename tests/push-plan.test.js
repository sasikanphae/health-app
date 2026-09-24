import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pushCandidates, pushSnapshot, waterBehind, timeOn } from '../js/push-plan.js';

const today = '2026-10-26';
const allCats = { appt: true, task: true, bill: true, checkin: true, water: true, workout: true };
const reminders = [
  { id: 'r-checkin', type: 'checkin', time: '07:30', enabled: true },
  { id: 'r-water1', type: 'water', time: '10:00', enabled: true },
  { id: 'r-workout', type: 'workout', time: '17:30', enabled: true },
];
const base = (o = {}) => ({
  now: timeOn(today, '06:00'), today, cats: allCats, events: [], bills: [], reminders, log: {},
  status: { checkin: false, water: 0, waterGoal: 8, workoutPending: true, easy: false }, ...o,
});
const ids = (jobs) => jobs.map((j) => j.id);

test('appointment: heads-up before its time and the evening before', () => {
  const events = [{ id: 'e1', kind: 'appt', title: 'หาหมอฟัน', date: '2026-10-28', time: '10:00' }];
  const jobs = pushCandidates(base({ events }));
  const soon = jobs.find((j) => j.id === 'ev:e1@2026-10-28');
  assert.equal(soon.at, timeOn('2026-10-28', '09:00')); // 60 min lead for appointments
  assert.deepEqual(soon.check, ['ev:e1']);
  assert.equal(jobs.find((j) => j.id === 'ev:e1:eve@2026-10-27').at, timeOn('2026-10-27', '19:00'));
});

test('done events and switched-off categories are not scheduled', () => {
  const events = [
    { id: 'e1', kind: 'appt', title: 'นัด', date: today, time: '15:00', done: true },
    { id: 'e2', kind: 'work', title: 'ส่งงาน', date: today, time: '13:00' },
  ];
  const jobs = pushCandidates(base({ events, cats: { ...allCats, task: false } }));
  assert.ok(!ids(jobs).some((i) => i.startsWith('ev:')));
});

test('bills: 09:00 while within the lead, one job per day, check key carries the month', () => {
  const bills = [{ id: 'b1', title: 'ค่าไฟ', day: 28, lead: 3, createdOn: '2026-10-01' }];
  const jobs = pushCandidates(base({ bills })).filter((j) => j.kind === 'bill');
  assert.deepEqual(jobs.map((j) => j.date), ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']);
  assert.equal(jobs[0].at, timeOn(today, '09:00'));
  assert.deepEqual(jobs[0].check, ['bill:b1:2026-10']);
});

test('check-in today and tomorrow only (no nagging an idle user); skipped when already done', () => {
  let jobs = pushCandidates(base());
  assert.deepEqual(ids(jobs).filter((i) => i.startsWith('r-checkin')), ['r-checkin@2026-10-26', 'r-checkin@2026-10-27']);
  jobs = pushCandidates(base({ status: { checkin: true, workoutPending: true } }));
  assert.deepEqual(ids(jobs).filter((i) => i.startsWith('r-checkin')), ['r-checkin@2026-10-27']);
});

test('fixed workout reminder only today and only while a workout is pending', () => {
  assert.ok(ids(pushCandidates(base())).includes('r-workout@2026-10-26'));
  assert.ok(!ids(pushCandidates(base({ status: { workoutPending: false } }))).some((i) => i.startsWith('r-workout')));
  assert.ok(!ids(pushCandidates(base({ status: { workoutPending: true, easy: true } }))).some((i) => i.startsWith('r-workout')));
});

test('past, skipped and snoozed items follow today\'s log', () => {
  const now = timeOn(today, '12:00');
  const log = { 'r-workout': { skipped: true }, 'r-water1': { notifiedAt: timeOn(today, '10:00') } };
  let jobs = pushCandidates(base({ now, log }));
  assert.ok(!ids(jobs).some((i) => i.startsWith('r-workout@2026-10-26')));
  assert.ok(!ids(jobs).includes('r-water1@2026-10-26')); // shown already, no repeat set
  jobs = pushCandidates(base({ now, log, repeatMin: 60 }));
  assert.deepEqual(ids(jobs).filter((i) => i.startsWith('r-water1@2026-10-26')), ['r-water1@2026-10-26#3', 'r-water1@2026-10-26#4', 'r-water1@2026-10-26#5']);
  const snoozed = pushCandidates(base({ now, log: { 'r-workout': { snoozeUntil: timeOn(today, '18:10') } } }));
  assert.equal(snoozed.find((j) => j.id === 'r-workout@2026-10-26').at, timeOn(today, '18:10'));
});

test('quiet hours: nothing between 21:30 and 07:00 except a timed appointment', () => {
  const events = [
    { id: 'e1', kind: 'appt', title: 'รถไฟ', date: '2026-10-27', time: '06:30' },
    { id: 'e2', kind: 'personal', title: 'โทรหาแม่', date: '2026-10-27', time: '22:30' },
  ];
  const jobs = pushCandidates(base({ events, reminders: [] }));
  assert.ok(ids(jobs).includes('ev:e1@2026-10-27'));
  assert.ok(!ids(jobs).includes('ev:e2@2026-10-27'));
});

test('contextual: workout goes to a free slot before the preferred time, water checks replace fixed times', () => {
  const events = [{ id: 'm', kind: 'work', title: 'ประชุม', date: today, time: '16:30' }];
  const jobs = pushCandidates(base({
    now: timeOn(today, '09:00'), events, contextOn: true,
    workout: { title: 'ยิม', dur: 45, planTime: '18:00', prefTime: '17:00' },
  }));
  const w = jobs.find((j) => j.id === `cx:workout@${today}`);
  assert.equal(w.at, timeOn(today, '17:00')); // 16:00 only 30 min before the meeting; 16:30 in it; 17:00 free
  assert.deepEqual(w.check, [`workout:${today}`]);
  assert.ok(!ids(jobs).some((i) => i.startsWith('r-water1') || i.startsWith('r-workout')));
  assert.equal(jobs.filter((j) => j.sub === 'water' && j.date === today).length, 3);
});

test('contextual nudges are capped per day, counting what was already sent', () => {
  const jobs = pushCandidates(base({ now: timeOn(today, '09:00'), contextOn: true, sentToday: 3, workout: { title: 'เดิน', dur: 30, planTime: '18:00' } }));
  assert.equal(jobs.filter((j) => j.kind === 'cx' && j.date === today).length, 1);
});

test('water check: behind only when 2+ glasses under the pace for that time', () => {
  assert.equal(waterBehind({ have: 1, goal: 8 }, timeOn(today, '15:00')).behind, true);
  assert.equal(waterBehind({ have: 4, goal: 8 }, timeOn(today, '15:00')).behind, false);
});

test('snapshot lists what is done so the service worker can drop stale pushes', () => {
  const snap = pushSnapshot({
    today,
    events: [{ id: 'e1', done: true }, { id: 'e2' }],
    bills: [{ id: 'b1', paid: { '2026-10': '2026-10-20' } }],
    status: { checkin: true, workoutPending: false, water: 8, waterGoal: 8 },
    log: { 'r-water1': { skipped: true } },
  });
  assert.deepEqual(snap.done, ['ev:e1', 'bill:b1:2026-10', `checkin:${today}`, `workout:${today}`, `water:${today}`]);
  assert.deepEqual(snap.skipped, [`r-water1@${today}`]);
});

test('a contextual water check already shown in the app does not silence the later checks', () => {
  const jobs = pushCandidates(base({ now: timeOn(today, '12:00'), contextOn: true, log: { 'cx:water': { notifiedAt: timeOn(today, '11:00') } } }));
  assert.deepEqual(jobs.filter((j) => j.sub === 'water' && j.date === today).map((j) => j.id), [`cx:water:15:00@${today}`, `cx:water:18:00@${today}`]);
});
