// Weight lifted on each machine, and what to try next time (simple progressive
// overload). Pure functions only — tested in tests/lifts.test.js.

// Bigger jumps on machines that move a lot of weight.
const STEP = { 'leg-press': 5 };
export const liftStep = (machineId) => STEP[machineId] ?? 2.5;

const roundTo = (n, step) => Math.max(step, Math.round(n / step) * step);

// history: [{ date, weight, sets, target, completed, intensity }], oldest first, one per day.
export function recordLift(history = [], entry) {
  const rest = history.filter((e) => e.date !== entry.date);
  return [...rest, entry].sort((a, b) => a.date.localeCompare(b.date));
}

// Suggested weight for today.
// - All sets done last time → add one step.
// - Missed sets twice in a row at the same weight → back off ~10% and build up again.
// - Otherwise → same weight.
// Progress is judged on normal/hard days; a light day just uses a lighter load.
export function suggestNext(history = [], { machineId, intensity = 'hard' } = {}) {
  const logged = history.filter((e) => Number.isFinite(e.weight) && e.weight > 0);
  if (!logged.length) return null;
  const step = liftStep(machineId);
  const hardDays = logged.filter((e) => e.intensity !== 'light' && e.intensity !== 'rest');
  const base = hardDays[hardDays.length - 1] ?? logged[logged.length - 1];

  let weight = base.weight;
  let reason;
  if (base.completed === true) {
    weight = base.weight + step;
    reason = `ครั้งก่อนทำครบทุกเซ็ต ลองเพิ่มอีก ${step} กก.`;
  } else if (base.completed === false) {
    const prev = hardDays[hardDays.length - 2];
    if (prev && prev.weight === base.weight && prev.completed === false) {
      weight = roundTo(base.weight * 0.9, step);
      reason = 'ไม่ครบ 2 ครั้งติด ลดลงนิดให้ท่าสวย แล้วค่อยไต่ใหม่';
    } else {
      reason = 'ครั้งก่อนยังไม่ครบ ลองน้ำหนักเดิมอีกรอบ';
    }
  } else {
    reason = 'ใช้น้ำหนักเดิมไปก่อน ถ้าทำครบทุกเซ็ต ครั้งหน้าแมวจะแนะนำให้เพิ่ม';
  }

  if (intensity === 'light' || intensity === 'rest') {
    const light = roundTo(weight * 0.75, step);
    return { weight: light, delta: light - base.weight, base: base.weight, reason: 'วันนี้วันเบา ใช้เบาลงราว 25% ไม่ต้องเพิ่ม' };
  }
  return { weight, delta: weight - base.weight, base: base.weight, reason };
}
