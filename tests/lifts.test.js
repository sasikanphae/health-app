import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordLift, suggestNext, liftStep } from '../js/lifts.js';

const e = (date, weight, completed, intensity = 'hard') => ({ date, weight, sets: 3, target: 3, completed, intensity });

test('recordLift keeps one entry per day', () => {
  let h = recordLift([], e('2026-09-10', 20, false));
  h = recordLift(h, e('2026-09-10', 20, true));
  h = recordLift(h, e('2026-09-01', 17.5, true));
  assert.deepEqual(h.map((x) => [x.date, x.completed]), [['2026-09-01', true], ['2026-09-10', true]]);
});

test('no history → no suggestion', () => {
  assert.equal(suggestNext([], { machineId: 'chest-press' }), null);
});

test('all sets done → add a step (bigger on leg press)', () => {
  assert.equal(suggestNext([e('2026-09-10', 20, true)], { machineId: 'chest-press' }).weight, 22.5);
  assert.equal(suggestNext([e('2026-09-10', 60, true)], { machineId: 'leg-press' }).weight, 65);
  assert.equal(liftStep('leg-press'), 5);
});

test('missed once → same; missed twice at same weight → back off ~10%', () => {
  assert.equal(suggestNext([e('2026-09-10', 20, false)], { machineId: 'chest-press' }).weight, 20);
  const twice = [e('2026-09-08', 30, false), e('2026-09-10', 30, false)];
  assert.equal(suggestNext(twice, { machineId: 'chest-press' }).weight, 27.5);
});

test('unknown completion (migrated data) → same weight', () => {
  assert.equal(suggestNext([{ date: '2026-09-01', weight: 20, completed: null }], { machineId: 'x' }).weight, 20);
});

test('light days use a lighter load and are ignored for progression', () => {
  const h = [e('2026-09-08', 20, true), e('2026-09-10', 15, true, 'light')];
  assert.equal(suggestNext(h, { machineId: 'chest-press' }).weight, 22.5); // based on the hard day
  assert.equal(suggestNext(h, { machineId: 'chest-press', intensity: 'light' }).weight, 17.5); // 22.5 × 0.75 ≈ 17.5
});
