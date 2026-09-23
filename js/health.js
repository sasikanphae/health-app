// Pure health calculations — no DOM access, so they can be unit tested in Node.

export const GOALS = {
  water: 8, // glasses (250 ml each)
  steps: 8000,
  sleep: 8, // hours
};

export function calcBMI(weightKg, heightCm) {
  const w = Number(weightKg);
  const h = Number(heightCm) / 100;
  if (!(w > 0) || !(h > 0)) return null;
  return Math.round((w / (h * h)) * 10) / 10;
}

// Thresholds follow the WHO Asian-population cut-offs used by the Thai MOPH.
export function bmiCategory(bmi) {
  if (bmi == null) return null;
  if (bmi < 18.5) return { label: 'น้ำหนักน้อย', level: 'warn' };
  if (bmi < 23) return { label: 'สมส่วน', level: 'good' };
  if (bmi < 25) return { label: 'น้ำหนักเกิน', level: 'warn' };
  if (bmi < 30) return { label: 'อ้วนระดับ 1', level: 'bad' };
  return { label: 'อ้วนระดับ 2', level: 'bad' };
}

// Mifflin-St Jeor basal metabolic rate, in kcal/day.
export function calcBMR({ weightKg, heightCm, age, sex }) {
  const w = Number(weightKg);
  const h = Number(heightCm);
  const a = Number(age);
  if (!(w > 0) || !(h > 0) || !(a > 0)) return null;
  const base = 10 * w + 6.25 * h - 5 * a;
  return Math.round(sex === 'female' ? base - 161 : base + 5);
}

export function progress(value, goal) {
  if (!(goal > 0)) return 0;
  return Math.max(0, Math.min(1, (Number(value) || 0) / goal));
}

// Local-date key (YYYY-MM-DD) so a day rolls over at local midnight, not UTC.
export function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function lastNDays(n, today = new Date()) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    days.push(dateKey(d));
  }
  return days;
}

export function emptyDay() {
  return { water: 0, steps: 0, sleep: 0, weight: null, mood: null };
}

// Number of consecutive days, ending today (or yesterday if today is not yet
// done), on which the water goal was met.
export function waterStreak(log, today = new Date()) {
  let streak = 0;
  let cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if ((log[dateKey(cursor)]?.water ?? 0) < GOALS.water) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while ((log[dateKey(cursor)]?.water ?? 0) >= GOALS.water) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
