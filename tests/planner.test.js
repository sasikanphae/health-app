import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, emptyDay } from '../js/health.js';
import {
  weekStart, weekKeys, weekTemplate, planWeek, adjustForReadiness, gymSessionToday,
  sessionItems, prescription, dayTimeline, overlaps,
} from '../js/planner.js';

const MON = '2026-09-21';
const profile = (over = {}) => ({
  goal: 'fit', days: [1, 2, 3, 4, 5], slot: 'evening', activities: ['gym', 'walk'], ...over,
});
const day = (over = {}) => ({ ...emptyDay(), ...over });
const done = (s) => day({ workout: { done: true, sessionId: s.id, kind: s.kind, focus: s.focus, intensity: s.intensity } });

// Hard days never follow hard days; strength focus never repeats on consecutive days.
function assertWeekRules(week) {
  for (let i = 1; i < week.length; i++) {
    const a = week[i - 1].session;
    const b = week[i].session;
    if (!a || !b) continue;
    assert.ok(!(a.intensity === 'hard' && b.intensity === 'hard'), `hard twice: ${week[i].key}`);
    if (a.kind === 'strength' && b.kind === 'strength') {
      assert.ok(!overlaps(a.focus, b.focus), `same muscles twice: ${week[i].key}`);
    }
  }
}

test('weekStart is Monday', () => {
  assert.equal(weekStart('2026-09-23'), MON);
  assert.equal(weekStart('2026-09-27'), MON); // Sunday belongs to the week before
  assert.equal(weekKeys('2026-09-23').length, 7);
});

test('template size follows goal cap and available days', () => {
  assert.equal(weekTemplate(profile({ goal: 'habit' })).length, 3);
  assert.equal(weekTemplate(profile({ goal: 'fit', days: [1, 3] })).length, 2);
  assert.equal(weekTemplate(profile({ goal: 'strong', days: [0, 1, 2, 3, 4, 5, 6] })).length, 5);
});

test('only run/walk → everything becomes cardio', () => {
  const t = weekTemplate(profile({ activities: ['run', 'walk'] }));
  assert.ok(t.every((s) => s.kind === 'cardio'));
});

test('fresh week alternates hard/light and muscle groups', () => {
  for (const goal of ['lose', 'strong', 'fit', 'habit']) {
    for (const days of [[1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5, 6], [1, 3, 5], [2, 3]]) {
      const { week } = planWeek({ profile: profile({ goal, days }), today: MON, days: {} });
      assertWeekRules(week);
      const n = week.filter((d) => d.session).length;
      assert.equal(n, weekTemplate(profile({ goal, days })).length, `${goal} ${days}`);
    }
  }
});

const summary = (week) => week.map((d) => d.session && `${d.session.kind}:${d.session.focus ?? d.session.activity}:${d.session.intensity}`);

test('Mon-Fri fit week: full body twice with walks in between', () => {
  const { week } = planWeek({ profile: profile(), today: MON, days: {} });
  assert.deepEqual(summary(week).slice(0, 5), ['strength:full:hard', 'cardio:walk:light', 'strength:full:hard', 'cardio:walk:light', null]);
});

test('Mon-Fri strong week alternates lower and upper body', () => {
  const { week } = planWeek({ profile: profile({ goal: 'strong' }), today: MON, days: {} });
  assert.deepEqual(summary(week).slice(0, 5), [
    'strength:lower:hard', 'cardio:walk:light', 'strength:upper:hard', 'strength:lower:light', 'strength:upper:hard',
  ]);
});

test('two strength days a week are full body', () => {
  const { week } = planWeek({ profile: profile({ days: [1, 4] }), today: MON, days: {} });
  assert.equal(week[0].session.focus, 'full');
});

test('missed day moves the session forward without asking', () => {
  const p = profile();
  const fresh = planWeek({ profile: p, today: MON, days: {} });
  const mondaySession = fresh.week[0].session;
  // Monday passed without a workout; now it's Tuesday.
  const tue = addDays(MON, 1);
  const { week, missed } = planWeek({ profile: p, today: tue, days: {} });
  assert.equal(missed, 1);
  assert.equal(week[0].session, null);
  assert.equal(week[1].session.id, mondaySession.id);
  assert.equal(week[1].moved, true);
  assertWeekRules(week);
});

test('done sessions are kept and not planned again', () => {
  const p = profile();
  const fresh = planWeek({ profile: p, today: MON, days: {} });
  const mon = fresh.week[0].session;
  const tue = addDays(MON, 1);
  const { week, missed } = planWeek({ profile: p, today: tue, days: { [MON]: done(mon) } });
  assert.equal(missed, 0);
  assert.equal(week[0].done, true);
  assert.ok(week.slice(1).every((d) => d.session?.id !== mon.id));
  assert.equal(week[1].moved, false);
});

test('too few days left: light sessions are dropped first', () => {
  const p = profile({ days: [1, 2, 3, 4, 5] });
  const fri = addDays(MON, 4);
  const { week, dropped } = planWeek({ profile: p, today: fri, days: {} });
  assert.equal(dropped, 3);
  assert.equal(week[4].session.intensity, 'hard');
});

test('missed days: remaining consecutive days are filled, softening back-to-back hard days', () => {
  const p = profile({ goal: 'strong', days: [1, 2, 3, 4, 5] });
  const wed = addDays(MON, 2);
  const { week, dropped } = planWeek({ profile: p, today: wed, days: {} });
  assert.deepEqual(week.slice(2, 5).map((d) => !!d.session), [true, true, true]);
  assert.equal(dropped, 2);
  assertWeekRules(week);
});

test('readiness: rest level turns today into gentle stretching', () => {
  const s = { id: 's0', kind: 'strength', focus: 'lower', intensity: 'hard', activity: 'gym' };
  const r = adjustForReadiness(s, { level: 'rest', answers: {} }, null, ['gym']);
  assert.equal(r.intensity, 'rest');
  assert.equal(r.activity, 'mobility');
  assert.equal(r.id, 's0');
});

test('readiness: light level softens a hard day', () => {
  const s = { id: 's0', kind: 'strength', focus: 'upper', intensity: 'hard', activity: 'gym' };
  const r = adjustForReadiness(s, { level: 'light', answers: { soreness: {} } }, null, ['gym']);
  assert.equal(r.intensity, 'light');
  assert.equal(r.adjusted, 'light');
});

test('readiness: very sore legs swap a leg day to upper body', () => {
  const s = { id: 's0', kind: 'strength', focus: 'lower', intensity: 'hard', activity: 'gym' };
  const r = adjustForReadiness(s, { level: 'hard', answers: { soreness: { legs: 2 } } }, null, ['gym']);
  assert.equal(r.focus, 'upper');
  assert.equal(r.adjusted, 'swap');
});

test('readiness: sore everywhere → easy walk', () => {
  const s = { id: 's0', kind: 'strength', focus: 'full', intensity: 'hard', activity: 'gym' };
  const r = adjustForReadiness(s, { level: 'light', answers: { soreness: { legs: 2, chest: 2 } } }, null, ['gym', 'walk']);
  assert.equal(r.kind, 'cardio');
  assert.equal(r.activity, 'walk');
});

test('planWeek applies today\'s check-in', () => {
  const days = { [MON]: day({ checkin: { level: 'light', answers: { soreness: {} } } }) };
  const { week } = planWeek({ profile: profile(), today: MON, days });
  assert.equal(week[0].session.intensity, 'light');
  assert.equal(week[0].session.adjusted, 'light');
});

test('after swapping sore legs to upper body, tomorrow is not upper body again', () => {
  const p = profile({ goal: 'strong', days: [1, 2, 3, 4, 5] });
  const days = { [MON]: day({ checkin: { level: 'hard', answers: { soreness: { legs: 2 } } } }) };
  const { week } = planWeek({ profile: p, today: MON, days });
  assert.equal(week[0].session.focus, 'upper');
  assertWeekRules(week);
});

test('gym on a rest day borrows the next strength session', () => {
  const p = profile({ days: [1, 3, 5] });
  const tue = addDays(MON, 1);
  const days = {};
  const plan = planWeek({ profile: p, today: tue, days });
  const s = gymSessionToday({ plan, today: tue, days, profile: p });
  assert.equal(s.activity, 'gym');
  assert.equal(s.kind, 'strength');
  assert.equal(s.extra, true);
  assert.ok(plan.week.some((d) => d.session?.id === s.id)); // it came from this week's plan
});

test('gym on a rest day after hard legs → light upper body', () => {
  const p = profile({ days: [1, 3, 5] });
  const tue = addDays(MON, 1);
  const days = { [MON]: done({ id: 's0', kind: 'strength', focus: 'lower', intensity: 'hard' }) };
  const plan = planWeek({ profile: p, today: tue, days });
  const s = gymSessionToday({ plan, today: tue, days, profile: p });
  assert.equal(s.focus, 'upper');
  assert.equal(s.intensity, 'light');
});

test('sessionItems: gym starts with treadmill warm-up, big lifts first', () => {
  const items = sessionItems({ kind: 'strength', focus: 'lower', activity: 'gym', intensity: 'hard' });
  assert.deepEqual(items.map((i) => i.id), ['treadmill', 'leg-press', 'leg-extension', 'leg-curl']);
  assert.equal(items[0].role, 'warmup');
  assert.deepEqual(sessionItems({ kind: 'cardio', activity: 'walk', intensity: 'light' }).map((i) => i.id), ['walk-light']);
  assert.deepEqual(sessionItems({ kind: 'cardio', activity: 'mobility', intensity: 'rest' }).map((i) => i.id), ['mobility']);
});

test('prescription scales with intensity', () => {
  assert.equal(prescription('strong', 'hard').sets, 3);
  assert.equal(prescription('strong', 'light').sets, 2);
  assert.equal(prescription('habit', 'light').sets, 2);
  assert.equal(prescription('fit', 'rest').sets, 1);
});

test('dayTimeline is sorted and adds a snack only when no meal follows soon', () => {
  const strength = { kind: 'strength', focus: 'lower', intensity: 'hard' };
  const evening = dayTimeline({ profile: profile({ slot: 'evening' }), session: strength }).map((i) => i.id);
  assert.deepEqual(evening, ['checkin', 'meal-b', 'meal-l', 'workout', 'meal-d', 'winddown']);
  const night = dayTimeline({ profile: profile({ slot: 'night' }), session: strength });
  assert.deepEqual(night.map((i) => i.id), ['checkin', 'meal-b', 'meal-l', 'meal-d', 'workout', 'meal-s', 'winddown']);
  const rest = dayTimeline({ profile: profile(), session: null }).map((i) => i.id);
  assert.ok(rest.includes('rest') && !rest.includes('workout'));
});
