import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bmi, bmiInfo, bmr, tdee, calorieTarget, waterGoal, stepGoal, logWeight, latestWeight,
  weightTrend, isValidBody, defaultWeightGoal, daysSince,
} from '../js/body.js';

const person = { weight: 70, height: 165, age: 30, sex: 'female', activity: 'light', weightGoal: 'keep' };

test('BMI with Asian cut-offs', () => {
  assert.equal(bmi(70, 165), 25.7);
  assert.equal(bmiInfo(18.4).key, 'under');
  assert.equal(bmiInfo(22.9).key, 'normal');
  assert.equal(bmiInfo(23).key, 'over');
  assert.equal(bmiInfo(25.7).key, 'obese1');
  assert.equal(bmiInfo(30).key, 'obese2');
});

test('BMR (Mifflin-St Jeor) and TDEE', () => {
  assert.equal(bmr(person), 1420); // 700 + 1031.25 - 150 - 161
  assert.equal(bmr({ ...person, sex: 'male' }), 1586);
  assert.equal(tdee(1420, 'light'), 1953);
  assert.equal(tdee(1420, 'sedentary'), 1704);
});

test('calorie target per weight goal, rounded to 50', () => {
  assert.equal(calorieTarget(person).kcal, 1950);
  assert.equal(calorieTarget({ ...person, weightGoal: 'lose' }).kcal, 1450);
  assert.equal(calorieTarget({ ...person, weightGoal: 'gain' }).kcal, 2250);
});

test('calorie deficit never goes below BMR / 1200', () => {
  const small = { weight: 48, height: 150, age: 60, sex: 'female', activity: 'sedentary', weightGoal: 'lose' };
  const r = calorieTarget(small);
  assert.ok(r.kcal >= Math.max(1200, r.bmr) - 25, `${r.kcal}`);
  assert.ok(r.note);
});

test('no deficit for teens or for people already under the BMI range', () => {
  assert.equal(calorieTarget({ ...person, age: 16, weightGoal: 'lose' }).goal, 'keep');
  assert.equal(calorieTarget({ ...person, weight: 48, weightGoal: 'lose' }).goal, 'keep');
});

test('water goal: ~33 ml/kg, more on training days', () => {
  assert.deepEqual(waterGoal(70), { ml: 2300, extra: 0, glasses: 10 });
  assert.equal(waterGoal(70, 'hard').ml, 2800);
  assert.equal(waterGoal(70, 'light').ml, 2550);
  assert.equal(waterGoal(30).ml, 1500); // floor
});

test('step goal follows activity and readiness', () => {
  assert.equal(stepGoal('light'), 7000);
  assert.equal(stepGoal('light', 'hard'), 8500);
  assert.equal(stepGoal('light', 'rest'), 4000);
  assert.equal(stepGoal('sedentary', 'rest'), 3000);
});

test('weight log keeps one entry per day, sorted', () => {
  let log = logWeight([], '2026-09-10', 70.04);
  log = logWeight(log, '2026-09-01', 71);
  log = logWeight(log, '2026-09-10', 69.8);
  assert.deepEqual(log, [{ date: '2026-09-01', kg: 71 }, { date: '2026-09-10', kg: 69.8 }]);
  assert.deepEqual(latestWeight(log), { date: '2026-09-10', kg: 69.8 });
});

test('weight trend: rolling average and 30-day change', () => {
  const log = [
    { date: '2026-08-20', kg: 72 },
    { date: '2026-09-01', kg: 71 },
    { date: '2026-09-02', kg: 72 },
    { date: '2026-09-20', kg: 70 },
  ];
  const { points, change } = weightTrend(log, '2026-09-23');
  assert.equal(points.length, 4);
  assert.equal(points[2].avg, 71.5); // Sep 1 + Sep 2
  assert.equal(points[3].avg, 70);
  assert.equal(change, -1); // Sep 1 avg 71 → Sep 20 avg 70
  assert.equal(weightTrend([{ date: '2026-09-20', kg: 70 }], '2026-09-23').change, null);
});

test('validation and helpers', () => {
  assert.equal(isValidBody(person, 70), true);
  assert.equal(isValidBody({ ...person, height: 50 }, 70), false);
  assert.equal(isValidBody(person, NaN), false);
  assert.equal(defaultWeightGoal('lose'), 'lose');
  assert.equal(defaultWeightGoal('strong'), 'gain');
  assert.equal(defaultWeightGoal('fit'), 'keep');
  assert.equal(daysSince('2026-09-20', '2026-09-23'), 3);
});
