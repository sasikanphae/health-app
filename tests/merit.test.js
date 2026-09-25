import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyMerit, coins, coinDays, feed, fishLevel, grown, nextGrowth, almsOpen, giveAlms, FEEDS_PER_LEVEL, MAX_LEVEL,
} from '../js/merit.js';

const today = '2026-09-24';
const at = (date, hm) => new Date(`${date}T${hm}:00`).getTime();

test('one coin per day the water goal was met; an undone glass never takes a credited coin back', () => {
  const m = { ...emptyMerit(today), earnedDays: ['2026-09-20'] };
  const days = { '2026-09-22': { waterMet: true }, '2026-09-23': { waterMet: false }, [today]: { waterMet: true } };
  assert.deepEqual([...coinDays(days, m)].sort(), ['2026-09-20', '2026-09-22', today]);
  assert.equal(coins(days, m), 3);
  assert.equal(coins(days, { ...m, spent: 5 }), 0); // never negative
});

test('feeding spends a coin; 5 feeds = one size up; fully grown brings a new fish', () => {
  let m = emptyMerit(today);
  const days = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`2026-08-${String(i + 1).padStart(2, '0')}`, { waterMet: true }]));
  const events = [];
  for (let i = 0; i < FEEDS_PER_LEVEL * MAX_LEVEL; i++) {
    const r = feed(m, days, today);
    m = r.merit;
    events.push(r);
  }
  assert.equal(m.spent, 20);
  assert.equal(coins(days, m), 10);
  assert.equal(events.filter((e) => e.grewUp).length, MAX_LEVEL);
  assert.ok(events[4].grewUp && !events[3].grewUp);
  assert.ok(events[19].fullyGrown && events[19].newFish);
  assert.equal(m.fish.length, 2);
  assert.ok(grown(m.fish[0]));
  assert.equal(fishLevel(m.fish[1]), 0);
  assert.deepEqual(nextGrowth(m), { id: 2, level: 0, left: 5 });
  // the next feed goes to the new fish
  assert.equal(feed(m, days, today).fed, 2);
});

test('no coin, no feeding', () => {
  assert.equal(feed(emptyMerit(today), {}, today), null);
});

test('ตักบาตร opens only when the first check-in of that day was before 07:30', () => {
  assert.equal(almsOpen({ checkin: { at: at(today, '07:29') } }, today), true);
  assert.equal(almsOpen({ checkin: { at: at(today, '07:30') } }, today), false);
  assert.equal(almsOpen({ checkin: { at: at(today, '09:00'), firstAt: at(today, '06:45') } }, today), true); // edited later
  assert.equal(almsOpen({ checkin: { at: at('2026-09-23', '06:00') } }, today), false); // yesterday's check-in
  assert.equal(almsOpen({}, today), false);
});

test('giving alms counts once per day', () => {
  const day = { checkin: { at: at(today, '06:30') } };
  const m1 = giveAlms(emptyMerit(today), day, today);
  assert.deepEqual(m1.alms, [today]);
  assert.equal(giveAlms(m1, day, today), null);
  assert.equal(giveAlms(emptyMerit(today), { checkin: { at: at(today, '08:00') } }, today), null);
});
