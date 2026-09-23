import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcBMI, bmiCategory, calcBMR, progress, dateKey, lastNDays, waterStreak, GOALS,
} from '../js/health.js';

test('calcBMI', () => {
  assert.equal(calcBMI(70, 175), 22.9);
  assert.equal(calcBMI(0, 175), null);
  assert.equal(calcBMI(70, ''), null);
});

test('bmiCategory uses Asian cut-offs', () => {
  assert.equal(bmiCategory(18.4).label, 'น้ำหนักน้อย');
  assert.equal(bmiCategory(22.9).label, 'สมส่วน');
  assert.equal(bmiCategory(23).label, 'น้ำหนักเกิน');
  assert.equal(bmiCategory(27).label, 'อ้วนระดับ 1');
  assert.equal(bmiCategory(30).label, 'อ้วนระดับ 2');
  assert.equal(bmiCategory(null), null);
});

test('calcBMR', () => {
  assert.equal(calcBMR({ weightKg: 70, heightCm: 175, age: 30, sex: 'male' }), 1649);
  assert.equal(calcBMR({ weightKg: 60, heightCm: 160, age: 30, sex: 'female' }), 1289);
  assert.equal(calcBMR({ weightKg: 60, heightCm: 160, age: 0, sex: 'female' }), null);
});

test('progress is clamped to 0..1', () => {
  assert.equal(progress(4, 8), 0.5);
  assert.equal(progress(20, 8), 1);
  assert.equal(progress(-1, 8), 0);
  assert.equal(progress(1, 0), 0);
});

test('dateKey and lastNDays use local dates', () => {
  const d = new Date(2026, 0, 2);
  assert.equal(dateKey(d), '2026-01-02');
  assert.deepEqual(lastNDays(3, d), ['2025-12-31', '2026-01-01', '2026-01-02']);
});

test('waterStreak', () => {
  const today = new Date(2026, 8, 23);
  const full = { water: GOALS.water };
  assert.equal(waterStreak({}, today), 0);
  // Today not finished yet: streak counts from yesterday.
  assert.equal(waterStreak({ '2026-09-22': full, '2026-09-21': full }, today), 2);
  assert.equal(waterStreak({ '2026-09-23': full, '2026-09-22': full, '2026-09-20': full }, today), 2);
});
