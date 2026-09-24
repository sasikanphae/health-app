import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, emptyDay } from '../js/health.js';
import {
  findPatterns, findHabit, weeklyStory, rewardProgress, sleepHoursOf, usedDay, monthlyStory, specialDay,
} from '../js/insights.js';

const TODAY = '2026-09-23'; // Wednesday
const profile = { days: [1, 2, 3, 4, 5], activities: ['gym'] };
const day = (o = {}) => ({ ...emptyDay(), ...o });
const ci = (sleepHours, extra = {}) => ({ answers: { sleepHours, sleepQuality: 2, soreness: {}, stress: 2, energy: 3, ...extra } });
const done = (activity = 'gym') => ({ done: true, activity, sessionId: 's0', kind: 'strength', intensity: 'hard' });

test('sleep hours from the check-in answer', () => {
  assert.equal(sleepHoursOf(ci('5-6')), 5.5);
  assert.equal(sleepHoursOf(null), null);
  assert.equal(usedDay(day()), false);
  assert.equal(usedDay(day({ water: 1 })), true);
});

test('short sleep followed by skipped training days → pattern', () => {
  const days = {};
  // Short nights on Mon 21, Wed 16, Mon 14 (followed by Tue/Thu/Tue training days with no workout).
  for (const k of ['2026-09-21', '2026-09-16', '2026-09-14']) days[k] = day({ checkin: ci('5-6') });
  const [p] = findPatterns({ days, profile, today: TODAY });
  assert.equal(p.id, 'short-sleep-skip');
  assert.match(p.text, /^ฉันสังเกตว่าช่วง 3 สัปดาห์ที่ผ่านมา วันที่นอนน้อยกว่า 6 ชม\. วันรุ่งขึ้นมักไม่ได้ไปยิม \(3 ใน 3 ครั้ง\)/);
  assert.equal(p.action, null);
});

test('no pattern when the evidence is thin or mixed', () => {
  const days = {};
  for (const k of ['2026-09-21', '2026-09-16', '2026-09-14']) days[k] = day({ checkin: ci('5-6') });
  days['2026-09-22'] = day({ workout: done() });
  days['2026-09-17'] = day({ workout: done() });
  assert.equal(findPatterns({ days, profile, today: TODAY }).length, 0);
  assert.equal(findPatterns({ days: {}, profile, today: TODAY }).length, 0);
});

test('exercise and mood pattern', () => {
  const days = {};
  for (let i = 1; i <= 3; i++) days[addDays(TODAY, -i)] = day({ mood: 5, workout: done() });
  for (let i = 4; i <= 6; i++) days[addDays(TODAY, -i)] = day({ mood: 3 });
  assert.ok(findPatterns({ days, profile, today: TODAY }).some((p) => p.id === 'workout-mood'));
});

test('habit: long gap since last workout, said kindly', () => {
  const days = { '2026-09-17': day({ workout: done() }) };
  const h = findHabit({ days, profile, today: TODAY, hour: 9 });
  assert.equal(h.id, 'gap');
  assert.match(h.text, /6 วัน/);
  assert.doesNotMatch(h.text, /ไม่ดี|ผิด|ขี้เกียจ/);
});

test('habit: breakfast often skipped on this weekday (mornings only)', () => {
  const days = { '2026-09-22': day({ workout: done() }) };
  for (const w of [1, 2, 3]) days[addDays(TODAY, -7 * w)] = day({ water: 2 }); // used, no breakfast
  const h = findHabit({ days, profile, today: TODAY, hour: 8 });
  assert.equal(h.id, 'skip-breakfast');
  assert.match(h.text, /วันพุธ/);
  assert.equal(findHabit({ days, profile, today: TODAY, hour: 15 }), null);
});

test('habit: many "not today" days → care message first', () => {
  const days = {};
  for (let i = 1; i <= 3; i++) days[addDays(TODAY, -i)] = day({ easy: true });
  assert.equal(findHabit({ days, profile, today: TODAY, hour: 8 }).id, 'many-easy');
});

test('weekly story is friendly prose with the right numbers', () => {
  const week = Array.from({ length: 7 }, (_, i) => addDays('2026-09-14', i));
  const prev = Array.from({ length: 7 }, (_, i) => addDays('2026-09-07', i));
  const days = {
    '2026-09-14': day({ checkin: ci('7-8'), workout: done(), waterMet: true, mood: 4 }),
    '2026-09-16': day({ checkin: ci('7-8'), workout: done('walk'), mood: 5 }),
    '2026-09-18': day({ checkin: ci('6-7'), workout: done(), easy: false }),
    '2026-09-19': day({ easy: true }),
    '2026-09-08': day({ checkin: ci('5-6') }),
  };
  const s = weeklyStory({ days, weekKeys: week, prevKeys: prev, profile });
  assert.equal(s.stats.workouts, 3);
  assert.equal(s.stats.gym, 2);
  assert.equal(s.stats.sleepAvg, 7.2);
  assert.ok(s.lines.some((l) => l.includes('ออกกำลังกายไป 3 ครั้ง (เข้ายิม 2 ครั้ง)')));
  assert.ok(s.lines.some((l) => l.includes('มากขึ้นกว่าสัปดาห์ก่อน')));
  assert.ok(s.lines.some((l) => l.includes('ไม่ไหว 1 วัน')));
  const empty = weeklyStory({ days: {}, weekKeys: week, prevKeys: prev, profile });
  assert.equal(empty.lines.length, 1);
});

test('gentle stretching does not count as a workout', () => {
  const days = { '2026-09-10': day({ workout: { done: true, activity: 'mobility', intensity: 'rest' } }) };
  assert.equal(rewardProgress({ metric: 'workout', target: 1, start: '2026-09-01' }, days, TODAY).count, 0);
});

test('reward progress counts from the start date', () => {
  const days = {
    '2026-09-01': day({ workout: done() }), // before start
    '2026-09-10': day({ workout: done() }),
    '2026-09-12': day({ workout: done('walk') }),
    '2026-09-15': day({ workout: done(), waterMet: true }),
  };
  const r = { metric: 'gym', target: 2, start: '2026-09-05' };
  assert.deepEqual(rewardProgress(r, days, TODAY), { count: 2, target: 2, pct: 1, left: 0, near: false, done: true });
  const r2 = { metric: 'workout', target: 4, start: '2026-09-05' };
  const p2 = rewardProgress(r2, days, TODAY);
  assert.equal(p2.count, 3);
  assert.equal(p2.near, false); // 75%
  assert.equal(rewardProgress({ ...r2, target: 3 }, days, TODAY).done, true);
  assert.equal(rewardProgress({ metric: 'water', target: 1, start: '2026-09-01' }, days, TODAY).done, true);
});

test('pattern offers to lighten today after another short night', () => {
  const days = {};
  for (const k of ['2026-09-21', '2026-09-16', '2026-09-14']) days[k] = day({ checkin: ci('5-6') });
  const [p] = findPatterns({ days, profile, today: TODAY, todayCheckin: ci('lt5') });
  assert.equal(p.action.id, 'lighten');
  assert.match(p.tip, /อยากให้ลดโปรแกรมลงไหม/);
});

test('monthly story: progress, comebacks and best day', () => {
  const days = {
    '2026-08-20': day({ workout: done() }),
    '2026-09-02': day({ workout: done(), waterMet: true, steps: 8000, mood: 5, stepsMet: true }),
    '2026-09-03': day({ water: 3, steps: 4000 }),
    '2026-09-10': day({ workout: done('walk'), steps: 6000 }),
    '2026-09-11': day({ easy: true }),
  };
  const s = monthlyStory({ days, ym: '2026-09' });
  assert.equal(s.stats.workouts, 2);
  assert.equal(s.stats.steps, 18000);
  assert.equal(s.stats.comebacks, 2); // back after Aug 20, and after Sep 2
  assert.equal(s.stats.best, '2026-09-02');
  assert.equal(s.stats.waterPct, 25);
  assert.ok(s.highlights[0].includes('กลับมาเริ่มใหม่ได้ 2 ครั้ง'));
  assert.ok(!s.lines.join(' ').match(/ไม่สำเร็จ|พลาด|ล้มเหลว/));
});

test('special day: occasional, never on tired days, at most weekly', () => {
  const options = { exercises: [{ id: 'lunge', name: 'ลันจ์' }], menus: [{ id: 'm1', name: 'แกงจืด' }] };
  const hits = [];
  for (let i = 1; i <= 30; i++) {
    const key = `2026-09-${String(i).padStart(2, '0')}`;
    if (specialDay({ key, options, lastSpecial: hits.at(-1) ?? null })) hits.push(key);
  }
  assert.ok(hits.length >= 2 && hits.length <= 5, `got ${hits.length}`);
  for (let i = 1; i < hits.length; i++) assert.ok(hits[i] >= addDays(hits[i - 1], 6));
  assert.equal(specialDay({ key: hits[0], options, easy: true }), null);
  assert.equal(specialDay({ key: hits[0], options, level: 'rest' }), null);
});
