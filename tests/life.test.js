import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  eventsOn, upcomingAppointments, billDueOn, billCycle, addMonths, lifeCandidates, lifeDue,
  expenseSummary, parseAmount, combinedShopping,
} from '../js/life.js';
import { timeOn, reminderState, dueReminders, emptyDay } from '../js/health.js';
import { normalize, defaultState } from '../js/store.js';

const at = (key, hhmm) => timeOn(key, hhmm);
const HOUR = 3_600_000;

test('eventsOn: untimed first, then by time', () => {
  const events = [
    { id: 'a', date: '2026-09-23', time: '14:00' },
    { id: 'b', date: '2026-09-23', time: null },
    { id: 'c', date: '2026-09-23', time: '09:30' },
    { id: 'd', date: '2026-09-24', time: '08:00' },
  ];
  assert.deepEqual(eventsOn(events, '2026-09-23').map((e) => e.id), ['b', 'c', 'a']);
});

test('upcomingAppointments skips done, past and non-appointments', () => {
  const events = [
    { id: 'a', kind: 'appt', date: '2026-10-01', time: '10:00' },
    { id: 'b', kind: 'appt', date: '2026-09-20' },
    { id: 'c', kind: 'work', date: '2026-09-25' },
    { id: 'd', kind: 'appt', date: '2026-09-24', done: true },
    { id: 'e', kind: 'appt', date: '2026-09-23', time: '16:00' },
  ];
  assert.deepEqual(upcomingAppointments(events, '2026-09-23').map((e) => e.id), ['e', 'a']);
});

test('bill due day is clamped to the month', () => {
  assert.equal(billDueOn({ day: 31 }, '2026-02'), '2026-02-28');
  assert.equal(billDueOn({ day: 31 }, '2026-09'), '2026-09-30');
  assert.equal(billDueOn({ day: 5 }, '2026-09'), '2026-09-05');
  assert.equal(addMonths('2026-12', 1), '2027-01');
  assert.equal(addMonths('2026-01', -1), '2025-12');
});

test('billCycle: soon, overdue, paid, and bills added after the due day', () => {
  const bill = { day: 25, lead: 3, createdOn: '2026-08-01', paid: { '2026-08': '2026-08-24' } };
  assert.deepEqual(
    (({ ym, status, daysLeft }) => ({ ym, status, daysLeft }))(billCycle(bill, '2026-09-23')),
    { ym: '2026-09', status: 'soon', daysLeft: 2 },
  );
  assert.equal(billCycle(bill, '2026-09-10').status, 'later');
  assert.equal(billCycle(bill, '2026-09-25').status, 'today');
  // September not paid → still overdue in October
  const oct = billCycle(bill, '2026-10-02');
  assert.equal(oct.ym, '2026-09');
  assert.equal(oct.status, 'overdue');
  // paid this month
  const paid = billCycle({ ...bill, paid: { ...bill.paid, '2026-09': '2026-09-22' } }, '2026-09-23');
  assert.equal(paid.status, 'paid');
  assert.equal(paid.next, '2026-10-25');
  // added on the 23rd for a bill due on the 5th: the first one is next month
  const fresh = billCycle({ day: 5, createdOn: '2026-09-23', paid: {} }, '2026-09-23');
  assert.equal(fresh.ym, '2026-10');
});

test('lifeCandidates: before the time, the evening before, and bills', () => {
  const today = '2026-09-23';
  const events = [
    { id: 'm', kind: 'work', date: today, time: '10:00', title: 'ประชุม' },
    { id: 'd', kind: 'appt', date: '2026-09-24', time: '09:00', title: 'หาหมอ' },
    { id: 'x', kind: 'work', date: today, time: '09:00', done: true },
    { id: 'n', kind: 'personal', date: today, time: null },
  ];
  const bills = [{ id: 'b', title: 'ค่าไฟ', day: 25, lead: 3, createdOn: '2026-01-01', paid: { '2026-08': 'x' } }];
  const at0930 = lifeCandidates({ events, bills, today, now: at(today, '09:50') });
  assert.deepEqual(at0930.map((c) => c.id), ['bill:b:2026-09', 'ev:m']); // work lead = 15 min
  assert.equal(at0930[0].repeat, false); // bill still 2 days away: heads-up only
  const evening = lifeCandidates({ events, bills, today, now: at(today, '19:05') });
  assert.ok(evening.some((c) => c.id === 'ev:d:eve' && c.repeat === false));
  const dueDay = lifeCandidates({ events: [], bills, today: '2026-09-25', now: at('2026-09-25', '09:00') });
  assert.equal(dueDay[0].repeat, true);
});

test('reminderState: snooze, skip and repeat after a dismissed notification', () => {
  const now = at('2026-09-23', '12:00');
  assert.deepEqual(reminderState(undefined, now), { notify: true });
  assert.equal(reminderState({ skipped: true }, now), null);
  assert.equal(reminderState({ snoozeUntil: now + 1 }, now), null);
  assert.deepEqual(reminderState({ notifiedAt: now - 30 * 60_000 }, now, HOUR), { notify: false });
  assert.deepEqual(reminderState({ notifiedAt: now - HOUR }, now, HOUR), { notify: true });
  assert.deepEqual(reminderState({ notifiedAt: now - 5 * HOUR }, now, 0), { notify: false }); // repeat off
});

test('health reminders repeat too, until done', () => {
  const key = '2026-09-23';
  const reminders = [{ id: 'c', type: 'checkin', time: '07:30', enabled: true }];
  const log = { c: { notifiedAt: at(key, '07:30') } };
  const args = { reminders, key, log, waterGoal: 8, workoutPending: false, repeatMs: HOUR };
  assert.equal(dueReminders({ ...args, day: emptyDay(), now: at(key, '08:00') })[0].notify, false);
  assert.equal(dueReminders({ ...args, day: emptyDay(), now: at(key, '08:31') })[0].notify, true);
  assert.equal(dueReminders({ ...args, day: { ...emptyDay(), checkin: {} }, now: at(key, '08:31') }).length, 0);
});

test('lifeDue drops paid bills and honours the log', () => {
  const today = '2026-09-25';
  const bills = [{ id: 'b', day: 25, createdOn: '2026-01-01', paid: { '2026-08': 'x' } }];
  const now = at(today, '11:00');
  const log = { 'bill:b:2026-09': { notifiedAt: at(today, '09:00') } };
  assert.equal(lifeDue({ events: [], bills, today, now, log, repeatMs: HOUR })[0].notify, true);
  assert.equal(lifeDue({ events: [], bills, today, now, log, repeatMs: 0 })[0].notify, false);
  const paid = [{ ...bills[0], paid: { ...bills[0].paid, '2026-09': today } }];
  assert.equal(lifeDue({ events: [], bills: paid, today, now, log }).length, 0);
});

test('expenseSummary: by category, and health on its own', () => {
  const x = (date, cat, amount) => ({ date, cat, amount });
  const s = expenseSummary([
    x('2026-09-01', 'food', 60), x('2026-09-02', 'food', 80), x('2026-09-03', 'gym', 900),
    x('2026-09-04', 'supplement', 450), x('2026-08-30', 'food', 999), x('2026-09-10', 'travel', 30),
  ], '2026-09');
  assert.equal(s.total, 1520);
  assert.deepEqual(s.byCat.map((c) => c.cat), ['gym', 'supplement', 'food', 'travel']);
  assert.equal(s.health.total, 1350);
  assert.deepEqual(s.health.byCat.map((c) => c.cat), ['gym', 'supplement']);
  assert.equal(s.count, 5);
});

test('parseAmount', () => {
  assert.equal(parseAmount('1,200'), 1200);
  assert.equal(parseAmount('฿ 99.5'), 99.5);
  assert.equal(parseAmount('0'), null);
  assert.equal(parseAmount('abc'), null);
  assert.equal(parseAmount(''), null);
});

test('combinedShopping: one list, to-buy first, staples after, bought last', () => {
  const list = combinedShopping({
    planItems: [{ name: 'อกไก่', count: 2 }, { name: 'น้ำปลา', count: 1, staple: true }, { name: 'ไข่', count: 1 }],
    planTicked: ['ไข่'],
    custom: [{ id: '1', text: 'ทิชชู่', done: false }, { id: '2', text: 'สบู่', done: true }],
  });
  assert.deepEqual(list.map((i) => i.name), ['ทิชชู่', 'อกไก่', 'น้ำปลา', 'สบู่', 'ไข่']);
  assert.equal(list.find((i) => i.name === 'อกไก่').from, 'plan');
});

test('store: new sections are created and old data keeps working', () => {
  const s = normalize({ ...defaultState(), leaveLists: undefined, events: null, bills: [{ id: 'b', day: 1 }] });
  assert.deepEqual(s.events, []);
  assert.deepEqual(s.bills[0].paid, {});
  assert.deepEqual(s.leaveLists.map((l) => l.id), ['work', 'doctor']);
  assert.equal(s.settings.repeatMin, 60);
  assert.deepEqual(normalize({ days: { '2026-09-01': { water: 2 } } }).days['2026-09-01'].leave, {});
});
