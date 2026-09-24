import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BEADS, advance, angleOf, dragBeads, beadPos, ROUND_LINES } from '../js/mala.js';

test('108 beads; a round completes exactly once and stops there', () => {
  assert.equal(BEADS, 108);
  assert.deepEqual(advance(41), { count: 42, moved: 1, done: false });
  assert.deepEqual(advance(107), { count: 108, moved: 1, done: true });
  assert.deepEqual(advance(108), { count: 108, moved: 0, done: false }); // already complete: nothing more
  assert.deepEqual(advance(100, 20), { count: 108, moved: 8, done: true });
  assert.deepEqual(advance(10, -3), { count: 10, moved: 0, done: false });
});

test('angles: 0 at the top, clockwise', () => {
  assert.equal(Math.round(angleOf(100, 0, 100, 100)), 0);
  assert.equal(Math.round(angleOf(200, 100, 100, 100)), 90);
  assert.equal(Math.round(angleOf(100, 200, 100, 100)), 180);
  assert.equal(Math.round(angleOf(0, 100, 100, 100)), 270);
});

test('dragging clockwise turns a bead every 12°, across the 0° line too', () => {
  assert.deepEqual(dragBeads(0, 30), { beads: 2, carry: 6 });
  assert.deepEqual(dragBeads(350, 10, 0), { beads: 1, carry: 8 }); // wrapped past the top
  const r = dragBeads(10, 350, 8); // back 20°: eats the carry, never un-counts
  assert.deepEqual(r, { beads: 0, carry: 0 });
  // A full clockwise turn in small moves = 30 beads.
  let carry = 0, beads = 0, a = 0;
  for (let i = 0; i < 72; i++) { const r2 = dragBeads(a, (a + 5) % 360, carry); beads += r2.beads; carry = r2.carry; a = (a + 5) % 360; }
  assert.equal(beads, 30);
});

test('bead 0 sits at the top of the ring, bead 27 at the right', () => {
  const p0 = beadPos(0, 100, 150);
  assert.ok(Math.abs(p0.x - 150) < 1e-9 && Math.abs(p0.y - 50) < 1e-9);
  const p27 = beadPos(27, 100, 150);
  assert.ok(Math.abs(p27.x - 250) < 1e-9 && Math.abs(p27.y - 150) < 1e-9);
  assert.ok(ROUND_LINES.length >= 3);
});
