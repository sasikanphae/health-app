// Personal numbers: BMI, BMR/TDEE, daily calorie / water / step targets, and
// the body-weight trend. Pure functions only — tested in tests/body.test.js.
import { addDays } from './health.js';

export const ACTIVITY_LEVELS = {
  sedentary: { label: 'นั่งเป็นส่วนใหญ่', hint: 'ทำงานโต๊ะ เดินน้อย', emoji: '🪑', factor: 1.2, steps: 5000 },
  light: { label: 'ขยับบ้าง', hint: 'เดินไปมาระหว่างวัน', emoji: '🚶', factor: 1.375, steps: 7000 },
  moderate: { label: 'ค่อนข้างแอคทีฟ', hint: 'ยืนหรือเดินบ่อย', emoji: '🛵', factor: 1.55, steps: 8000 },
  active: { label: 'แอคทีฟมาก', hint: 'งานใช้แรง เดินทั้งวัน', emoji: '🏗️', factor: 1.725, steps: 10000 },
};

export const WEIGHT_GOALS = {
  lose: { label: 'ลดน้ำหนัก', emoji: '📉', delta: -500 },
  keep: { label: 'คงที่', emoji: '⚖️', delta: 0 },
  gain: { label: 'เพิ่มน้ำหนัก/กล้าม', emoji: '📈', delta: 300 },
};

export const SEXES = { female: 'หญิง', male: 'ชาย' };

export const LIMITS = {
  weight: [25, 300],
  height: [100, 230],
  age: [13, 100],
};

// The exercise goal suggests a starting weight goal; the user can change it.
export function defaultWeightGoal(goal) {
  return { lose: 'lose', strong: 'gain' }[goal] ?? 'keep';
}

export function isValidBody(body, weight) {
  if (!body) return false;
  const inRange = (v, [lo, hi]) => Number.isFinite(v) && v >= lo && v <= hi;
  return inRange(weight, LIMITS.weight) && inRange(body.height, LIMITS.height)
    && inRange(body.age, LIMITS.age) && !!SEXES[body.sex] && !!ACTIVITY_LEVELS[body.activity];
}

export function bmi(weightKg, heightCm) {
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

// Asian cut-offs (used by the Thai Ministry of Public Health), worded kindly.
export function bmiInfo(value) {
  if (value < 18.5) return { key: 'under', label: 'น้ำหนักน้อยกว่าเกณฑ์', text: 'ร่างกายอยากได้พลังงานเพิ่มอีกนิด กินให้พอและเล่นเวทช่วยสร้างกล้ามได้ดี' };
  if (value < 23) return { key: 'normal', label: 'สมส่วน', text: 'อยู่ในช่วงที่ดีต่อสุขภาพ รักษาไว้แบบสบายๆ' };
  if (value < 25) return { key: 'over', label: 'ท้วมนิดๆ', text: 'เกินเกณฑ์มาเล็กน้อย ขยับตัวสม่ำเสมอก็ช่วยได้เยอะ' };
  if (value < 30) return { key: 'obese1', label: 'อ้วนระดับ 1', text: 'ค่อยๆ ลดทีละนิดดีต่อหัวใจและข้อเข่า ไม่ต้องรีบ' };
  return { key: 'obese2', label: 'อ้วนระดับ 2', text: 'ลดลงแค่ 5% ก็ช่วยสุขภาพได้มากแล้ว ปรึกษาแพทย์ร่วมด้วยจะดีมาก' };
}

// Mifflin-St Jeor, kcal/day at complete rest.
export function bmr({ weight, height, age, sex }) {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return Math.round(sex === 'female' ? base - 161 : base + 5);
}

export function tdee(bmrKcal, activity) {
  return Math.round(bmrKcal * (ACTIVITY_LEVELS[activity]?.factor ?? 1.2));
}

const round50 = (n) => Math.round(n / 50) * 50;

// Daily calorie target. A deficit never goes below BMR or 1,200/1,500 kcal,
// and is switched off for teens and for people already under the BMI range.
export function calorieTarget({ weight, height, age, sex, activity, weightGoal }) {
  const b = bmr({ weight, height, age, sex });
  const t = tdee(b, activity);
  let goal = WEIGHT_GOALS[weightGoal] ? weightGoal : 'keep';
  let note = null;
  if (goal === 'lose' && age < 18) {
    goal = 'keep';
    note = 'อายุต่ำกว่า 18 ปี ยังไม่ควรลดแคลอรี่ ใช้ค่าคงที่ไปก่อน ถ้าอยากลดควรปรึกษาแพทย์';
  } else if (goal === 'lose' && bmi(weight, height) < 18.5) {
    goal = 'keep';
    note = 'BMI ต่ำกว่าเกณฑ์อยู่แล้ว เลยตั้งเป็นคงที่ให้แทนการลด';
  }
  let kcal = t + WEIGHT_GOALS[goal].delta;
  if (goal === 'lose') {
    const floor = Math.max(b, sex === 'female' ? 1200 : 1500);
    if (kcal < floor) {
      kcal = floor;
      note = 'ไม่ลดต่ำกว่านี้ เพื่อให้ร่างกายยังมีแรงและปลอดภัย';
    }
  }
  return { kcal: round50(kcal), bmr: b, tdee: t, goal, note };
}

// ~33 ml per kg, plus a bit more on training days.
const WATER_EXTRA = { hard: 500, light: 250, rest: 0 };
export function waterGoal(weight, intensity) {
  const base = Math.min(4000, Math.max(1500, round50(weight * 33)));
  const extra = WATER_EXTRA[intensity] ?? 0;
  const ml = base + extra;
  return { ml, extra, glasses: Math.ceil(ml / 250) };
}

// Steps follow daily activity, scaled by how the body feels today.
const STEP_FACTOR = { hard: 1.2, light: 1, rest: 0.6 };
export function stepGoal(activity, readinessLevel) {
  const base = ACTIVITY_LEVELS[activity]?.steps ?? 7000;
  const steps = Math.round((base * (STEP_FACTOR[readinessLevel] ?? 1)) / 500) * 500;
  return Math.max(3000, steps);
}

// ---------- body weight log ----------

// entries: [{ date: 'YYYY-MM-DD', kg }] — one per day; the newest value for a day wins.
export function logWeight(entries, date, kg) {
  const rest = entries.filter((e) => e.date !== date);
  return [...rest, { date, kg: Math.round(kg * 10) / 10 }].sort((a, b) => a.date.localeCompare(b.date));
}

export const latestWeight = (entries) => (entries.length ? entries[entries.length - 1] : null);

// Points for the chart (last `days` days) with a 7-day rolling average, which
// smooths out normal day-to-day water swings so the trend is what stands out.
export function weightTrend(entries, today, days = 90) {
  const from = addDays(today, -(days - 1));
  const inRange = entries.filter((e) => e.date >= from && e.date <= today);
  const points = inRange.map((e) => {
    const windowFrom = addDays(e.date, -6);
    const win = entries.filter((x) => x.date >= windowFrom && x.date <= e.date);
    const avg = win.reduce((s, x) => s + x.kg, 0) / win.length;
    return { date: e.date, kg: e.kg, avg: Math.round(avg * 10) / 10 };
  });
  let change = null;
  const monthAgo = addDays(today, -30);
  const recent = points.filter((p) => p.date >= monthAgo);
  if (recent.length >= 2) change = Math.round((recent[recent.length - 1].avg - recent[0].avg) * 10) / 10;
  return { points, change };
}

export function daysSince(date, today) {
  const a = new Date(`${date}T00:00:00`);
  const b = new Date(`${today}T00:00:00`);
  return Math.round((b - a) / 86_400_000);
}
