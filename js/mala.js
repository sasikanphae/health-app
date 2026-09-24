// ลูกประคำ: 108 beads on a ring. Tap to move one bead, or drag around the
// ring like turning a real mala. No history is kept — each round lives only
// while the page is open. Pure functions only — tested in tests/mala.test.js.
export const BEADS = 108;
export const DRAG_STEP = 12; // degrees of dragging around the ring per bead

export const ROUND_LINES = [
  'ครบหนึ่งรอบแล้ว วันนี้ปล่อยวางได้มากขึ้นนะ',
  'ครบ 108 เม็ด ใจเย็นลงไปอีกนิดแล้ว',
  'หนึ่งรอบแห่งความใจดีกับตัวเอง',
  'ความโกรธมาแล้วก็ไป ตอนนี้ลมหายใจยังอยู่ตรงนี้',
  'เก่งมากที่ให้เวลากับใจตัวเอง',
];

// Move `by` beads forward; the round stops at BEADS until the user starts again.
export function advance(count, by = 1) {
  const next = Math.min(BEADS, count + Math.max(0, by));
  return { count: next, moved: next - count, done: next === BEADS && count < BEADS };
}

// Angle (degrees, 0 = top, clockwise) of a point relative to the ring centre.
export function angleOf(x, y, cx, cy) {
  const a = (Math.atan2(x - cx, cy - y) * 180) / Math.PI;
  return (a + 360) % 360;
}

// Dragging around the ring: clockwise movement turns beads. `carry` holds the
// part of a step not used yet; going back (anticlockwise) just eats the carry,
// like easing a real mala back a little without un-counting.
export function dragBeads(prevAngle, angle, carry = 0, step = DRAG_STEP) {
  let d = angle - prevAngle;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  const total = Math.max(0, carry + d);
  const beads = Math.floor(total / step);
  return { beads, carry: total - beads * step };
}

// Where bead i sits on the ring (before the ring turns), for drawing.
export function beadPos(i, r, c = 0) {
  const a = ((i / BEADS) * 360 - 90) * (Math.PI / 180);
  return { x: c + r * Math.cos(a), y: c + r * Math.sin(a) };
}
