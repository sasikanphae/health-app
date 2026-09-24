import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  canDo, resolveItems, playableSubstitutes, defaultPlaces, allExercises, filterLibrary, NEEDS, EQUIPMENT, needsText,
} from '../js/equipment.js';
import { sessionItems } from '../js/planner.js';
import { exerciseInfo } from '../js/gym-data.js';

test('every exercise in NEEDS exists and needs known equipment', () => {
  for (const [id, options] of Object.entries(NEEDS)) {
    assert.ok(exerciseInfo(id), id);
    for (const o of options) for (const e of o) assert.ok(EQUIPMENT[e], `${id}: ${e}`);
  }
  for (const x of allExercises()) assert.ok(exerciseInfo(x.id), x.id);
});

test('canDo: any one option is enough, bodyweight always works', () => {
  assert.equal(canDo('leg-press', []), false);
  assert.equal(canDo('leg-press', ['m:leg-press']), true);
  assert.equal(canDo('db-rdl', ['kettlebell']), true);
  assert.equal(canDo('db-bench', ['dumbbell']), false);
  assert.equal(canDo('db-bench', ['dumbbell', 'bench']), true);
  assert.equal(canDo('squat', []), true);
  assert.equal(canDo('walk-light', []), true);
  assert.equal(needsText('pushup'), 'ไม่ต้องใช้อุปกรณ์');
  assert.equal(needsText('db-rdl'), 'ดัมเบล หรือ เคตเทิลเบล หรือ บาร์เบล + แร็ค');
});

test('a gym day only suggests what this gym has', () => {
  const upper = sessionItems({ kind: 'strength', focus: 'upper', intensity: 'hard', activity: 'gym' });
  const equip = ['m:chest-press', 'dumbbell', 'bench', 'band'];
  const r = resolveItems(upper, equip, { focus: 'upper', kind: 'strength' });
  for (const i of r.items) assert.ok(canDo(i.id, equip), i.id);
  assert.deepEqual(r.items.map((i) => i.id), ['chest-press', 'band-pulldown', 'band-row', 'db-shoulder-press']);
  assert.equal(r.items[1].planned, 'lat-pulldown');
  assert.equal(r.dropped, 1); // no treadmill, bike or elliptical for the warm-up
});

test('nothing at all → bodyweight session for the same muscles', () => {
  const lower = sessionItems({ kind: 'strength', focus: 'lower', intensity: 'light', activity: 'gym' });
  const r = resolveItems(lower, [], { focus: 'lower', kind: 'strength' });
  assert.ok(r.items.length >= 3);
  for (const i of r.items) assert.ok(canDo(i.id, []), i.id);
  // no duplicates
  assert.equal(new Set(r.items.map((i) => i.id)).size, r.items.length);
});

test('home workout adapts to what is at home', () => {
  const upper = sessionItems({ kind: 'strength', focus: 'upper', intensity: 'hard', activity: 'home' });
  const withBottle = resolveItems(upper, ['bottle'], { focus: 'upper', kind: 'strength' });
  assert.equal(withBottle.swapped, 0);
  const trxOnly = resolveItems(upper, ['trx'], { focus: 'upper', kind: 'strength' });
  assert.ok(trxOnly.items.some((i) => i.id === 'trx-row'));
  assert.ok(trxOnly.items.every((i) => canDo(i.id, ['trx'])));
});

test('cardio: bike or elliptical instead of the treadmill, else cardio at home', () => {
  const cardio = sessionItems({ kind: 'cardio', intensity: 'light', activity: 'gym' });
  assert.equal(resolveItems(cardio, ['bike']).items[0].id, 'bike');
  assert.equal(resolveItems(cardio, []).items[0].id, 'indoor-light');
});

test('machine taken: stand-ins come from the same place only', () => {
  assert.deepEqual(playableSubstitutes('seated-row', ['band', 'trx']), ['trx-row', 'band-row']);
  assert.deepEqual(playableSubstitutes('leg-press', ['dumbbell']), ['goblet-squat', 'split-squat', 'squat']);
  assert.deepEqual(playableSubstitutes('leg-press', ['dumbbell'], ['goblet-squat']), ['split-squat', 'squat']);
});

test('library filter by place and muscle', () => {
  const all = allExercises();
  const home = filterLibrary(all, { equip: defaultPlaces()[0].equip });
  assert.ok(home.every((x) => x.kind !== 'machine'));
  assert.ok(home.some((x) => x.id === 'bottle-row'));
  const glutes = filterLibrary(all, { muscle: 'glutes' });
  assert.ok(glutes.some((x) => x.id === 'leg-press') && glutes.some((x) => x.id === 'glute-bridge'));
  assert.ok(!glutes.some((x) => x.id === 'chest-press'));
});
