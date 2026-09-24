import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arrangeDay, weatherAdapt, travelProfile, travelSession, postponable, isOutdoor } from '../js/arrange.js';

const base = () => [
  { id: 'checkin', kind: 'checkin', label: 'เช็กอิน', time: '07:00', done: true },
  { id: 'meal-l', kind: 'meal', label: 'มื้อกลางวัน', time: '12:00', dur: 30 },
  { id: 'relax', kind: 'relax', label: 'พักหายใจ', time: '15:00', dur: 10 },
  { id: 'workout', kind: 'workout', label: 'วิ่ง', time: '18:00', dur: 30, outdoor: true },
  { id: 'meal-d', kind: 'meal', label: 'มื้อเย็น', time: '19:30', dur: 30 },
  { id: 'winddown', kind: 'winddown', label: 'เตรียมนอน', time: '21:30' },
];
const ctx = (o = {}) => ({ now: 8 * 60, hasCheckin: true, energy: 3, ...o });

test('nothing to change → says so', () => {
  const r = arrangeDay(base(), ctx());
  assert.equal(r.changes.length, 0);
  assert.ok(r.notes.some((n) => n.includes('ลงตัว')));
});

test('workout moves around an appointment, with a reason', () => {
  const items = [...base(), { id: 'ev-1', kind: 'event', label: 'หาหมอ', time: '17:30', dur: 60, fixed: true, buffer: true }];
  const r = arrangeDay(items, ctx());
  const c = r.changes.find((x) => x.id === 'workout');
  assert.ok(c, 'workout moved');
  assert.match(c.reason, /หาหมอ/);
  assert.ok(c.to >= '18:30' || c.to <= '16:30');
});

test('lunch clashing with a meeting moves after it', () => {
  const items = [...base(), { id: 'ev-2', kind: 'event', label: 'ประชุม', time: '11:30', dur: 60, fixed: true }];
  const r = arrangeDay(items, ctx());
  assert.equal(r.changes.find((x) => x.id === 'meal-l')?.to, '12:30');
});

test('hot weather moves an outdoor run out of the midday sun', () => {
  const items = base().map((i) => (i.id === 'workout' ? { ...i, time: '12:30' } : i));
  const r = arrangeDay(items, ctx({ weather: 'hot' }));
  const c = r.changes.find((x) => x.id === 'workout');
  assert.equal(c.to, '18:00');
  assert.match(c.reason, /ร้อน/);
});

test('short sleep: earlier bedtime and no late workout', () => {
  const items = base().map((i) => (i.id === 'workout' ? { ...i, time: '20:30' } : i));
  const r = arrangeDay(items, ctx({ sleepHours: 5.5 }));
  assert.equal(r.times.winddown, '21:00');
  assert.ok(r.times.workout < '20:00');
  assert.ok(r.notes[0].includes('นอนน้อย'));
});

test('a missed workout time moves later instead of disappearing', () => {
  const r = arrangeDay(base(), ctx({ now: 18 * 60 + 40 }));
  assert.ok(r.times.workout >= '18:45');
  assert.match(r.changes.find((x) => x.id === 'workout').reason, /ไม่เป็นไร/);
});

test('tasks without a time get a slot; low energy takes only two', () => {
  const tasks = ['a', 'b', 'c'].map((x) => ({ id: `t-${x}`, kind: 'task', label: x, time: null, dur: 30, work: true }));
  const r = arrangeDay([...base(), ...tasks], ctx());
  assert.equal(Object.keys(r.times).filter((k) => k.startsWith('t-')).length, 3);
  assert.equal(r.times['t-a'], '09:00');
  const low = arrangeDay([...base(), ...tasks], ctx({ energy: 1 }));
  assert.equal(Object.keys(low.times).filter((k) => k.startsWith('t-')).length, 2);
  assert.ok(low.notes.some((n) => n.includes('พรุ่งนี้')));
});

test('weather and travel adaptations', () => {
  const run = { id: 's1', kind: 'cardio', intensity: 'hard', activity: 'run' };
  assert.equal(weatherAdapt(run, 'rain').activity, 'indoor');
  assert.equal(weatherAdapt(run, 'hot').intensity, 'light');
  assert.equal(weatherAdapt({ ...run, activity: 'gym' }, 'rain').activity, 'gym');
  assert.equal(isOutdoor({ activity: 'walk', intensity: 'light' }), true);
  const p = travelProfile({ activities: ['gym', 'run'], food: { mode: 'cook' } });
  assert.deepEqual(p.activities, ['run', 'home']);
  assert.equal(p.food.mode, 'buy');
  assert.equal(travelSession({ intensity: 'hard' }).intensity, 'light');
});

test('not-today mode postpones only non-urgent work and errands', () => {
  const ev = (id, kind, o = {}) => ({ id, kind, date: '2026-09-24', done: false, ...o });
  const ids = postponable([
    ev('w', 'work'), ev('p', 'personal'), ev('u', 'work', { urgent: true }), ev('a', 'appt'),
    ev('d', 'work', { done: true }), ev('x', 'work', { date: '2026-09-25' }),
  ], '2026-09-24').map((e) => e.id);
  assert.deepEqual(ids, ['w', 'p']);
});

test('memory: remembered workout time and the meeting rule', () => {
  const r = arrangeDay(base(), ctx({ prefTime: '19:00', prefText: 'แมวจำได้ว่าเธอชอบออกกำลังกายช่วง 19:00 มากกว่า 18:00' }));
  const c = r.changes.find((x) => x.id === 'workout');
  assert.equal(c.to, '19:00');
  assert.match(c.reason, /แมวจำได้ว่าเธอชอบ/);
  const items = [...base(), { id: 'ev-m', kind: 'event', label: 'ประชุมทีม', time: '16:00', dur: 60, fixed: true, meeting: true }];
  const m = arrangeDay(items, ctx({ now: 7 * 60, meetingMove: true }));
  assert.equal(m.times.workout, '07:00');
  assert.match(m.changes.find((x) => x.id === 'workout').reason, /ตามที่ตกลงกันไว้/);
  assert.equal(arrangeDay(items, ctx({ now: 7 * 60 })).times.workout, '18:00'); // no rule, no move
});
