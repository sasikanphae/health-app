import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MENUS, candidates, pickMeal, dayMeals, mealDayType, shoppingList, isAllowed,
} from '../js/meals.js';

const food = (over = {}) => ({ mode: 'mix', allergies: [], avoid: [], budget: 'mid', ...over });

test('menu data is well formed', () => {
  const ids = new Set();
  for (const m of MENUS) {
    assert.ok(!ids.has(m.id), `duplicate ${m.id}`);
    ids.add(m.id);
    assert.ok(m.slots.length && m.price > 0 && m.emoji);
    if (m.src === 'cook') assert.ok(m.steps.length >= 2 && m.steps.length <= 4 && m.ingredients.length, m.id);
    else assert.ok(m.tip, m.id);
  }
});

test('allergies and diet are never broken', () => {
  const f = food({ allergies: ['egg', 'seafood'], avoid: ['pork'] });
  for (const slot of ['b', 'l', 'd', 's']) {
    for (const m of candidates(f, slot)) {
      assert.ok(!m.allergens.includes('egg') && !m.allergens.includes('seafood'), m.id);
      assert.ok(!m.meats.includes('pork'), m.id);
    }
  }
  const veg = food({ avoid: ['veg'] });
  for (const m of candidates(veg, 'l')) assert.equal(m.meats.length, 0, m.id);
});

test('mode picks where the food comes from', () => {
  assert.ok(candidates(food({ mode: 'cook' }), 'd').every((m) => m.src === 'cook'));
  assert.ok(candidates(food({ mode: 'buy' }), 'l').every((m) => m.src !== 'cook'));
  assert.ok(candidates(food({ mode: 'mix' }), 'l').every((m) => m.src !== 'cook'));
});

test('budget is respected when possible', () => {
  assert.ok(candidates(food({ budget: 'low', mode: 'buy' }), 'l').every((m) => m.price <= 50));
});

test('training day prefers high-protein, rest day prefers light', () => {
  for (let i = 0; i < 10; i++) {
    const key = `2026-09-${10 + i}`;
    assert.equal(pickMeal({ key, slot: 'l', food: food(), dayType: 'protein' }).protein, 'high');
    assert.equal(pickMeal({ key, slot: 'l', food: food(), dayType: 'light' }).light, true);
  }
});

test('picks are stable, and "change menu" gives a different dish', () => {
  const args = { key: '2026-09-23', slot: 'd', food: food(), dayType: 'normal' };
  assert.equal(pickMeal(args).id, pickMeal(args).id);
  assert.notEqual(pickMeal(args).id, pickMeal({ ...args, swap: 1 }).id);
});

test('dayMeals avoids repeating a dish within a day', () => {
  const meals = dayMeals({ key: '2026-09-23', food: food({ mode: 'buy' }), dayType: 'protein', slots: ['l', 'd'] });
  assert.notEqual(meals.l.id, meals.d.id);
});

test('mealDayType', () => {
  assert.equal(mealDayType({ kind: 'strength', intensity: 'light' }), 'protein');
  assert.equal(mealDayType({ kind: 'cardio', intensity: 'light' }), 'normal');
  assert.equal(mealDayType({ kind: 'cardio', intensity: 'rest' }), 'light');
  assert.equal(mealDayType(null), 'light');
});

test('shoppingList counts cook ingredients, staples last', () => {
  const byId = (id) => MENUS.find((m) => m.id === id);
  const list = shoppingList([
    { b: byId('khai-jiao'), l: byId('kaprao-chicken'), d: byId('garlic-chicken') },
    { d: byId('chicken-fried-rice') },
  ]);
  const names = list.map((i) => i.name);
  assert.ok(!names.includes('ไข่ดาว'));
  assert.equal(list.find((i) => i.name === 'อกไก่').count, 2);
  const firstStaple = list.findIndex((i) => i.staple);
  assert.ok(list.slice(firstStaple).every((i) => i.staple));
});

test('isAllowed', () => {
  const m = MENUS.find((x) => x.id === 'somtam-chicken');
  assert.equal(isAllowed(m, food({ allergies: ['peanut'] })), false);
  assert.equal(isAllowed(m, food()), true);
});
