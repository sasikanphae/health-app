import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultState, normalize, migrateV1, pruneReminderLog } from '../js/store.js';

test('normalize fills missing fields', () => {
  const s = normalize({ days: { '2026-09-01': { water: 3 } }, settings: { waterGoal: 10 } });
  assert.equal(s.settings.waterGoal, 10);
  assert.deepEqual(s.settings.gymDays, defaultState().settings.gymDays);
  assert.deepEqual(s.days['2026-09-01'].waterAt, []);
  assert.equal(s.days['2026-09-01'].checkin, null);
  assert.ok(s.checklist.length > 0);
});

test('normalize survives garbage', () => {
  assert.deepEqual(normalize(null), defaultState());
});

test('migrateV1 keeps water and mood', () => {
  const s = migrateV1({ profile: { height: 170 }, log: { '2026-09-20': { water: 5, mood: 4, steps: 900 } } });
  assert.equal(s.days['2026-09-20'].water, 5);
  assert.equal(s.days['2026-09-20'].mood, 4);
  assert.equal(s.days['2026-09-20'].steps, undefined);
});

test('pruneReminderLog keeps today and yesterday only', () => {
  const s = defaultState();
  s.reminderLog = { '2026-09-21': {}, '2026-09-22': {}, '2026-09-23': {} };
  pruneReminderLog(s, '2026-09-23');
  assert.deepEqual(Object.keys(s.reminderLog).sort(), ['2026-09-22', '2026-09-23']);
});
