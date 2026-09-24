import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BELL_LINES, nextLine } from '../js/bell.js';

test('each strike shows a different line than the one before', () => {
  let prev = null;
  let seed = 0.123;
  const rand = () => { seed = (seed * 9301 + 0.49297) % 1; return seed; };
  const seen = new Set();
  for (let i = 0; i < 500; i++) {
    const next = nextLine(prev, rand);
    assert.ok(next >= 0 && next < BELL_LINES.length);
    assert.notEqual(next, prev);
    seen.add(next);
    prev = next;
  }
  assert.equal(seen.size, BELL_LINES.length); // every line comes up
});

test('extremes of the random source stay in range and still avoid a repeat', () => {
  assert.equal(nextLine(0, () => 0), 1);
  assert.equal(nextLine(BELL_LINES.length - 1, () => 0.9999), BELL_LINES.length - 2);
  assert.equal(nextLine(null, () => 0.9999), BELL_LINES.length - 2);
});
