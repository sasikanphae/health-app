import { test } from 'node:test';
import assert from 'node:assert/strict';
import { holyDays, isHolyDay, phaseJDE } from '../js/lunar.js';

const utc = (jde) => new Date((jde - 2440587.5) * 86_400_000).toISOString();

test('phase times match known moon phases (within an hour)', () => {
  // Total solar eclipse new moon: 2024-04-08 18:21 UTC.
  const k = 300; // lunation number of the April 2024 new moon
  const t = new Date(utc(phaseJDE(k))).getTime();
  assert.ok(Math.abs(t - Date.UTC(2024, 3, 8, 18, 21)) < 3_600_000, utc(phaseJDE(k)));
  // Full moon (Makha Bucha 2025): 2025-02-12 13:53 UTC.
  const kf = 310.5; // full moon of lunation 310 (February 2025)
  const tf = new Date(utc(phaseJDE(kf))).getTime();
  assert.ok(Math.abs(tf - Date.UTC(2025, 1, 12, 13, 53)) < 3_600_000, utc(phaseJDE(kf)));
});

test('holy days use the Thai date of each phase', () => {
  const feb = holyDays('2025-02-01', '2025-02-28');
  assert.equal(feb['2025-02-12']?.phase, 'full'); // วันมาฆบูชา 2025
  const apr = holyDays('2024-04-01', '2024-04-30');
  assert.equal(apr['2024-04-09']?.phase, 'new'); // 18:21 UTC = 01:21 next day in Thailand
});

test('about four holy days a month, roughly a week apart', () => {
  const days = Object.keys(holyDays('2026-01-01', '2026-12-31')).sort();
  assert.ok(days.length >= 48 && days.length <= 51, `${days.length}`);
  for (let i = 1; i < days.length; i++) {
    const gap = (new Date(days[i]) - new Date(days[i - 1])) / 86_400_000;
    assert.ok(gap >= 6 && gap <= 9, `${days[i - 1]} → ${days[i]}`);
  }
  assert.equal(isHolyDay('2025-02-12'), true);
  assert.equal(isHolyDay('2025-02-13'), false);
});
