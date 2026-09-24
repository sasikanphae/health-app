import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, emptyDay } from '../js/health.js';
import {
  observeMemories, mergeMemories, activeMemories, preferredWorkoutTime, avoidedMenus, busyWeekdays,
  toldMemory, isTold, correctionMemory, inboxRules, applyInboxRules, keyWord,
} from '../js/memory.js';

const TODAY = '2026-09-24';
const day = (o = {}) => ({ ...emptyDay(), ...o });
const workoutAt = (key, hh) => day({ workout: { done: true, intensity: 'hard', at: new Date(`${key}T${hh}:00`).getTime() } });

test('workout time: learned only when clear and different from the chosen slot', () => {
  const days = {};
  for (const i of [2, 4, 6, 9]) days[addDays(TODAY, -i)] = workoutAt(addDays(TODAY, -i), '18:50');
  const [m] = observeMemories({ days, today: TODAY, slotTime: '20:00' });
  assert.equal(m.key, 'time:workout');
  assert.equal(m.value, '18:00');
  assert.equal(m.text, 'ชอบออกกำลังกายช่วง 18:00 มากกว่า 20:00');
  assert.match(m.why, /4 ใน 4 ครั้งล่าสุด/);
  assert.equal(observeMemories({ days, today: TODAY, slotTime: '18:00' }).length, 0); // already the slot
});

test('food likes and dislikes', () => {
  const days = {};
  for (const i of [1, 3, 5]) days[addDays(TODAY, -i)] = day({ meals: { l: { status: 'plan', menuId: 'somtam' } } });
  days[addDays(TODAY, -2)] = day({ swappedMenus: ['fried'] });
  days[addDays(TODAY, -8)] = day({ swappedMenus: ['fried'] });
  const menus = { somtam: 'ส้มตำไก่ย่าง', fried: 'ไก่ทอด' };
  const got = observeMemories({ days, today: TODAY, menus }).map((m) => m.text);
  assert.deepEqual(got, ['ชอบส้มตำไก่ย่าง', 'ไม่ค่อยอยากกินไก่ทอด']);
});

test('busy weekday and easily forgotten things', () => {
  const days = {};
  const events = [];
  for (let w = 1; w <= 4; w++) {
    const k = addDays(TODAY, -7 * w); // Thursdays
    if (w < 4) events.push({ date: k, kind: 'work' }, { date: k, kind: 'appt' });
  }
  const signals = [{ t: 'late-bill', ref: 'b1', date: '2026-08-30' }, { t: 'late-bill', ref: 'b1', date: '2026-09-02' }];
  const got = observeMemories({ days, events, signals, today: TODAY, bills: [{ id: 'b1', title: 'ค่าไฟ' }] });
  assert.ok(got.some((m) => m.key === 'busy:4' && m.text === 'วันพฤหัสมักยุ่ง'));
  assert.ok(got.some((m) => m.key === 'forget:bill:b1' && m.text === 'ค่าไฟมักจ่ายเลยวัน'));
});

test('merge: observed stays pending, told/edited never overwritten, forgotten never returns', () => {
  const cand = [{ key: 'busy:3', kind: 'busy', text: 'วันพุธมักยุ่ง', why: 'x', value: 3 }];
  let items = mergeMemories([], cand, { now: 1 });
  assert.equal(items[0].status, 'pending');
  assert.equal(activeMemories(items).length, 0); // nothing used before the user says yes
  items = items.map((i) => ({ ...i, status: 'on' }));
  assert.equal(busyWeekdays(activeMemories(items)).has(3), true);
  // evidence gone: confirmed stays, pending goes
  assert.equal(mergeMemories(items, []).length, 1);
  assert.equal(mergeMemories([{ ...items[0], status: 'pending' }], []).length, 0);
  // edited text survives new evidence
  const edited = [{ ...items[0], text: 'พุธยุ่งช่วงบ่าย', edited: true }];
  assert.equal(mergeMemories(edited, cand)[0].text, 'พุธยุ่งช่วงบ่าย');
  // forgotten
  assert.equal(mergeMemories(items, cand, { forgotten: { 'busy:3': 1 } }).length, 0);
  // kind switched off: not learned, not used
  assert.equal(mergeMemories([], cand, { kindsOn: { busy: false } }).length, 0);
  assert.equal(activeMemories(items, { busy: false }).length, 0);
});

test('told memories and menus to avoid', () => {
  assert.equal(isTold('จำไว้ว่าไม่ชอบกินผักชี'), true);
  assert.equal(isTold('ซื้อผักชี'), false);
  const m = toldMemory('จำไว้ว่าไม่ชอบกินผักชี');
  assert.equal(m.text, 'ไม่ชอบกินผักชี');
  assert.deepEqual(m.value, { dislike: 'ผักชี' });
  const menus = [{ id: 'a', name: 'ต้มยำ', ingredients: ['ผักชี', 'กุ้ง'] }, { id: 'b', name: 'ข้าวผัด', ingredients: ['ไข่'] }];
  assert.deepEqual(avoidedMenus([m, { kind: 'food', status: 'on', value: { id: 'b', like: false } }], menus).sort(), ['a', 'b']);
  const pref = preferredWorkoutTime([{ key: 'time:workout', status: 'on', value: '18:00', text: 'ชอบออกกำลังกายช่วง 18:00 มากกว่า 20:00' }]);
  assert.equal(pref.time, '18:00');
  assert.equal(pref.text, 'แมวจำได้ว่าเธอชอบออกกำลังกายช่วง 18:00 มากกว่า 20:00');
  const told = toldMemory('ฉันชอบออกกำลังกายตอนเช้า');
  assert.deepEqual(told.value, { workoutTime: '07:00' });
  const both = preferredWorkoutTime([{ key: 'time:workout', status: 'on', value: '18:00', text: 'x' }, told]);
  assert.equal(both.time, '07:00');
  assert.equal(both.text, 'ครั้งก่อนเธอบอกว่าชอบออกกำลังกายตอนเช้า');
});

test('inbox learns from a correction', () => {
  assert.equal(keyWord('แชมพู'), 'แชมพู');
  assert.equal(keyWord('ประชุม ทีม'), 'ประชุม');
  const mem = correctionMemory('นัดตัดผม', 'remind', 'การเตือน');
  const rules = inboxRules([mem]);
  const fixed = applyInboxRules([{ cat: 'appt', raw: 'พรุ่งนี้นัดตัดผมบ่ายสาม', title: 'นัดตัดผม' }, { cat: 'shop', raw: 'ซื้อนม', title: 'นม' }], rules);
  assert.equal(fixed[0].cat, 'remind');
  assert.equal(fixed[0].learned, true);
  assert.equal(fixed[1].cat, 'shop');
});
