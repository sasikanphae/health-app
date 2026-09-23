import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultState, normalize, migrateV1, migrateV2, pruneReminderLog,
} from '../js/store.js';

test('fresh state asks the first-run questions', () => {
  assert.equal(defaultState().profile, null);
});

test('normalize fills missing fields and profile food settings', () => {
  const s = normalize({
    days: { '2026-09-01': { water: 3 } },
    settings: { waterGoal: 10 },
    profile: { goal: 'lose', food: { budget: 'low' } },
  });
  assert.equal(s.settings.waterGoal, 10);
  assert.deepEqual(s.days['2026-09-01'].sets, {});
  assert.equal(s.profile.goal, 'lose');
  assert.equal(s.profile.food.budget, 'low');
  assert.deepEqual(s.profile.food.allergies, []);
});

test('normalize survives garbage', () => {
  assert.deepEqual(normalize(null), defaultState());
});

test('migrateV2 keeps check-ins, water, machine settings and checklist', () => {
  const s = migrateV2({
    days: { '2026-09-20': { water: 5, waterAt: [1], mood: 4, checkin: { score: 80 }, prep: ['c1'] } },
    machines: { 'leg-press': { fields: { พนักพิง: '5', ตำแหน่งเท้า: '' }, weight: 40, note: 'ok' } },
    settings: { waterGoal: 9, gymDays: [2, 4], reminders: [{ id: 'm', type: 'mood', time: '20:00', enabled: true }] },
    checklist: [{ id: 'x', text: 'ผ้า' }],
  });
  assert.equal(s.days['2026-09-20'].water, 5);
  assert.equal(s.days['2026-09-20'].checkin.score, 80);
  assert.equal(s.days['2026-09-20'].mood, 4);
  assert.deepEqual(s.machines['leg-press'], { seat: '5', weight: 40, note: 'ok', updatedAt: null });
  assert.equal(s.settings.waterGoal, 9);
  assert.deepEqual(s.legacyGymDays, [2, 4]);
  assert.deepEqual(s.checklist, [{ id: 'x', text: 'ผ้า' }]);
  assert.ok(s.settings.reminders.every((r) => r.type !== 'mood'));
});

test('old machine weights seed the lift log', () => {
  const s = normalize({ days: {}, machines: { 'chest-press': { seat: '4', weight: 20, updatedAt: new Date(2026, 8, 1).getTime() } } });
  assert.deepEqual(s.lifts['chest-press'], [{ date: '2026-09-01', weight: 20, sets: null, target: null, completed: null, intensity: 'hard' }]);
  assert.deepEqual(s.weights, []);
});

test('migrateV1 keeps water', () => {
  const s = migrateV1({ log: { '2026-09-20': { water: 5, steps: 900 } } });
  assert.equal(s.days['2026-09-20'].water, 5);
});

test('pruneReminderLog keeps today and yesterday only', () => {
  const s = defaultState();
  s.reminderLog = { '2026-09-21': {}, '2026-09-22': {}, '2026-09-23': {} };
  pruneReminderLog(s, '2026-09-23');
  assert.deepEqual(Object.keys(s.reminderLog).sort(), ['2026-09-22', '2026-09-23']);
});
