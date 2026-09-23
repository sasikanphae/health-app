// Weekly workout planner: builds the week from the user's profile, re-plans
// around missed days, and softens today's session after the morning check-in.
// Pure functions only — tested in tests/planner.test.js.
import { parseKey, addDays, toMinutes, fromMinutes } from './health.js';

export const GOALS = {
  lose: { label: 'ลดน้ำหนัก' },
  strong: { label: 'แข็งแรงขึ้น' },
  fit: { label: 'ฟิตทั่วไป' },
  habit: { label: 'อยากมีวินัย' },
};

export const SLOTS = {
  morning: { label: 'เช้า', hint: 'ก่อนเริ่มวัน', time: '06:30' },
  noon: { label: 'กลางวัน', hint: 'พักเที่ยง', time: '12:00' },
  evening: { label: 'เย็น', hint: 'หลังเลิกงาน', time: '18:00' },
  night: { label: 'ค่ำ', hint: 'หลังมื้อเย็น', time: '20:00' },
};

export const ACTIVITIES = {
  gym: { label: 'ยิม' },
  home: { label: 'เวทเบาที่บ้าน' },
  run: { label: 'วิ่ง' },
  walk: { label: 'เดิน' },
};

export const FOCUS = {
  lower: { label: 'ขาและก้น', parts: ['legs'] },
  upper: { label: 'อก หลัง ไหล่', parts: ['chest', 'back', 'shoulders', 'arms'] },
  full: { label: 'ทั้งตัว', parts: ['legs', 'chest', 'back', 'shoulders', 'arms'] },
};

export const INTENSITY = {
  hard: { label: 'วันหนัก', short: 'หนัก' },
  light: { label: 'วันเบา', short: 'เบา' },
  rest: { label: 'วันพัก', short: 'พัก' },
};

// Max sessions per week by goal; "habit" starts small so it's easy to keep up.
const CAPS = { lose: 5, strong: 5, fit: 4, habit: 3 };

// Session order for the week. Hard and light alternate; the planner never puts
// two hard days back to back or the same muscle group on consecutive days.
const PATTERNS = {
  lose: [['strength', 'hard'], ['cardio', 'light'], ['strength', 'hard'], ['cardio', 'hard'], ['cardio', 'light']],
  strong: [['strength', 'hard'], ['cardio', 'light'], ['strength', 'hard'], ['strength', 'light'], ['strength', 'hard']],
  fit: [['strength', 'hard'], ['cardio', 'light'], ['strength', 'hard'], ['cardio', 'light']],
  habit: [['strength', 'hard'], ['cardio', 'light'], ['strength', 'hard']],
};

export function weekStart(key) {
  const offset = (parseKey(key).getDay() + 6) % 7; // weeks start on Monday
  return addDays(key, -offset);
}

export function weekKeys(key) {
  const start = weekStart(key);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function weekTemplate(profile) {
  const pattern = PATTERNS[profile.goal] ?? PATTERNS.fit;
  const n = Math.min(profile.days.length, CAPS[profile.goal] ?? 4);
  const canStrength = profile.activities.some((a) => a === 'gym' || a === 'home');
  return pattern.slice(0, n).map(([kind, intensity], i) => ({
    id: `s${i}`,
    kind: canStrength ? kind : 'cardio',
    intensity,
  }));
}

const opposite = (focus) => (focus === 'lower' ? 'upper' : 'lower');

export function overlaps(a, b) {
  return a === 'full' || b === 'full' || a === b;
}

// Muscle focus for a strength session, given the day before and the last focus
// trained this week. Returns null when nothing fits (day before was full body).
function chooseFocus(prev, lastFocus, fullBody) {
  const prevFocus = prev?.kind === 'strength' ? prev.focus : null;
  if (prevFocus === 'full') return null;
  if (prevFocus) return opposite(prevFocus);
  if (fullBody) return 'full';
  return lastFocus ? opposite(lastFocus) : 'lower';
}

export function activityFor(session, activities) {
  const has = (a) => activities.includes(a);
  if (session.kind === 'strength') return has('gym') ? 'gym' : 'home';
  if (session.intensity === 'hard') {
    if (has('run')) return 'run';
    if (has('gym')) return 'gym';
    return has('walk') ? 'walk' : 'mobility';
  }
  if (has('walk')) return 'walk';
  if (has('run')) return 'run';
  return has('gym') ? 'gym' : 'mobility';
}

// Greedy placement of queued sessions onto available days, in order.
function assign(queue, available, keys, doneOn, fullBody) {
  const out = {};
  const q = [...queue];
  let lastFocus = null;
  for (const k of keys) {
    const done = doneOn(k);
    if (done) {
      if (done.kind === 'strength' && done.focus) lastFocus = done.focus;
      continue;
    }
    if (!available.has(k)) continue;
    const p = addDays(k, -1);
    const prev = out[p] ?? doneOn(p);
    // First pass keeps sessions as planned; second pass softens a hard session
    // that only clashes with yesterday's hard day, rather than leaving a gap.
    for (const soften of [false, true]) {
      const i = q.findIndex((s) => (soften || !(prev?.intensity === 'hard' && s.intensity === 'hard'))
        && (s.kind !== 'strength' || chooseFocus(prev, lastFocus, fullBody)));
      if (i < 0) continue;
      const s = q[i];
      const focus = s.kind === 'strength' ? chooseFocus(prev, lastFocus, fullBody) : null;
      if (focus) lastFocus = focus;
      const intensity = prev?.intensity === 'hard' && s.intensity === 'hard' ? 'light' : s.intensity;
      out[k] = { ...s, focus, intensity, ...(intensity !== s.intensity && { softened: true }) };
      q.splice(i, 1);
      break;
    }
  }
  return { out, leftover: q };
}

// Lighten a session after the morning check-in. `prev` is yesterday's done workout.
export function adjustForReadiness(session, checkin, prev, activities) {
  if (!session || !checkin) return session;
  const sore = checkin.answers?.soreness ?? {};
  const maxSore = (parts) => Math.max(0, ...parts.map((p) => sore[p] ?? 0));
  const easy = (reason) => ({
    ...session,
    kind: 'cardio',
    focus: null,
    intensity: 'light',
    activity: activities.includes('walk') ? 'walk' : 'mobility',
    adjusted: reason,
  });

  if (checkin.level === 'rest') {
    return { ...session, kind: 'cardio', focus: null, intensity: 'rest', activity: 'mobility', adjusted: 'rest' };
  }

  let s = { ...session };
  if (s.kind === 'strength') {
    const lv = maxSore(FOCUS[s.focus].parts);
    if (lv >= 2) {
      const alt = s.focus === 'full' ? null : opposite(s.focus);
      const blocked = alt && prev?.kind === 'strength' && overlaps(prev.focus, alt);
      if (alt && !blocked && maxSore(FOCUS[alt].parts) < 2) s = { ...s, focus: alt, adjusted: 'swap' };
      else return easy('sore');
    } else if (lv === 1 && s.intensity === 'hard') {
      s = { ...s, intensity: 'light', adjusted: 'sore-light' };
    }
  } else if (maxSore(['legs']) >= 2 && (s.activity === 'run' || s.intensity === 'hard')) {
    return easy('sore');
  }

  if (checkin.level === 'light' && s.intensity === 'hard') {
    s = { ...s, intensity: 'light', adjusted: s.adjusted ?? 'light' };
  }
  return s;
}

// The whole week, re-planned from today. Sessions not done on their day move
// forward automatically; if they no longer fit, light ones are dropped first.
export function planWeek({ profile, today, days }) {
  const keys = weekKeys(today);
  const template = weekTemplate(profile);
  const fullBody = template.filter((s) => s.kind === 'strength').length <= 2;
  const doneOn = (k) => (days[k]?.workout?.done ? days[k].workout : null);
  const isAvailable = (k) => profile.days.includes(parseKey(k).getDay());
  const doneIds = new Set(keys.map(doneOn).filter(Boolean).map((w) => w.sessionId));

  // The plan as if every session had happened on time, to spot what moved.
  const original = assign(template, new Set(keys.filter(isAvailable)), keys, () => null, fullBody).out;

  const openDays = keys.filter((k) => k >= today && isAvailable(k) && !doneOn(k));
  const queue = template.filter((s) => !doneIds.has(s.id));
  let dropped = 0;
  while (queue.length > openDays.length) {
    let i = queue.map((s) => s.intensity).lastIndexOf('light');
    if (i < 0) i = queue.length - 1;
    queue.splice(i, 1);
    dropped++;
  }
  let { out, leftover } = assign(queue, new Set(openDays), keys, doneOn, fullBody);

  // Soften today after the check-in, then re-plan the following days around
  // what today actually became (e.g. legs swapped to upper body).
  if (out[today]) {
    const planned = out[today];
    const adjusted = adjustForReadiness(
      { ...planned, activity: activityFor(planned, profile.activities) },
      days[today]?.checkin, doneOn(addDays(today, -1)), profile.activities,
    );
    out[today] = adjusted;
    if (adjusted.focus !== planned.focus || adjusted.kind !== planned.kind || adjusted.intensity !== planned.intensity) {
      const later = openDays.filter((k) => k > today);
      const rest = queue.filter((s) => s.id !== planned.id);
      const replanned = assign(rest, new Set(later), keys, (k) => (k === today ? adjusted : doneOn(k)), fullBody);
      out = { ...replanned.out, [today]: adjusted };
      leftover = replanned.leftover;
    }
  }
  dropped += leftover.length;

  const missed = Object.entries(original)
    .filter(([k, s]) => k < today && !doneIds.has(s.id)).length;

  const week = keys.map((k) => {
    const done = doneOn(k);
    let session = done ?? out[k] ?? null;
    if (session && !done && !session.activity) session = { ...session, activity: activityFor(session, profile.activities) };
    return {
      key: k,
      available: isAvailable(k),
      isToday: k === today,
      isPast: k < today,
      session,
      done: !!done,
      moved: !done && !!session && original[k]?.id !== session.id,
    };
  });

  return { week, missed, dropped };
}

// What to do when the user taps "today I'm going to the gym". On a gym day
// that's today's session; otherwise borrow the next strength session of the
// week (the planner then moves the rest around it) or a light full-body bonus.
export function gymSessionToday({ plan, today, days, profile }) {
  const t = plan.week.find((d) => d.isToday);
  if (t.session?.activity === 'gym') return t.session;
  const prevW = days[addDays(today, -1)]?.workout;
  const prev = prevW?.done ? prevW : null;
  const next = plan.week.find((d) => d.key > today && !d.done && d.session?.kind === 'strength')?.session;
  const s = next ? { ...next } : { id: `bonus-${today}`, kind: 'strength', intensity: 'light', focus: 'full' };
  if (prev?.kind === 'strength' && overlaps(prev.focus, s.focus)) {
    s.focus = prev.focus === 'full' ? 'full' : opposite(prev.focus);
  }
  if (prev?.intensity === 'hard') s.intensity = 'light';
  s.activity = 'gym';
  s.extra = true;
  return adjustForReadiness(s, days[today]?.checkin, prev, profile.activities);
}

// ---------- session contents ----------

const GYM_PROGRAM = {
  lower: ['leg-press', 'leg-extension', 'leg-curl'],
  upper: ['chest-press', 'lat-pulldown', 'seated-row', 'shoulder-press'],
  full: ['leg-press', 'chest-press', 'lat-pulldown', 'seated-row', 'leg-curl'],
};

const HOME_PROGRAM = {
  lower: ['squat', 'lunge', 'glute-bridge', 'calf-raise'],
  upper: ['pushup', 'bottle-row', 'bottle-press', 'plank'],
  full: ['squat', 'pushup', 'bottle-row', 'glute-bridge', 'plank'],
};

// Ordered exercise list for a session: big movements first, treadmill warm-up at the gym.
export function sessionItems(session) {
  if (!session) return [];
  if (session.adjusted === 'holy') return [{ id: 'meditate', role: 'main' }];
  if (session.intensity === 'rest' || session.activity === 'mobility') return [{ id: 'mobility', role: 'main' }];
  if (session.activity === 'gym') {
    if (session.kind === 'cardio') return [{ id: 'treadmill', role: 'main' }];
    return [{ id: 'treadmill', role: 'warmup' }, ...GYM_PROGRAM[session.focus].map((id) => ({ id, role: 'main' }))];
  }
  if (session.kind === 'strength') return HOME_PROGRAM[session.focus].map((id) => ({ id, role: 'main' }));
  return [{ id: `${session.activity}-${session.intensity === 'hard' ? 'hard' : 'light'}`, role: 'main' }];
}

const BASE = {
  strong: { sets: 3, reps: '8–10', rest: 90 },
  lose: { sets: 3, reps: '12–15', rest: 60 },
  fit: { sets: 3, reps: '10–12', rest: 75 },
  habit: { sets: 2, reps: '10–12', rest: 60 },
};

// Sets × reps for a strength exercise, scaled by the day's (possibly adjusted) intensity.
export function prescription(goal, intensity) {
  const b = BASE[goal] ?? BASE.fit;
  if (intensity === 'hard') return { ...b, load: 'น้ำหนักที่ทำครบทุกครั้งได้ โดยท่ายังสวย' };
  if (intensity === 'light') return { sets: Math.max(2, b.sets - 1), reps: b.reps, rest: b.rest, load: 'เบากว่าปกติราว 20–30%' };
  return { sets: 1, reps: b.reps, rest: b.rest, load: 'เบามากๆ แค่ขยับให้เลือดไหลเวียน' };
}

export function treadmillPlan(goal, intensity, role) {
  if (role === 'warmup') return { minutes: 5, text: 'เดินเร็ว 5–6 กม./ชม. ให้ตัวอุ่น' };
  if (intensity === 'hard') {
    return { minutes: goal === 'lose' ? 25 : 20, text: 'สลับวิ่ง 1 นาที (8–10 กม./ชม.) กับเดิน 1 นาที' };
  }
  if (intensity === 'rest') return { minutes: 10, text: 'เดินช้าๆ สบายๆ 4–5 กม./ชม.' };
  const minutes = goal === 'lose' ? 30 : goal === 'habit' ? 15 : 20;
  return { minutes, text: 'เดินเร็ว 5–6 กม./ชม. ปรับความชัน 3–5%' };
}

// ---------- the day's timeline ----------

// Items for the Today screen, sorted by time. Meal times shift around the workout slot.
export function dayTimeline({ profile, session }) {
  const slot = SLOTS[profile.slot] ?? SLOTS.evening;
  const workoutAt = toMinutes(slot.time);
  const meals = {
    b: profile.slot === 'morning' ? '07:45' : '07:30',
    l: profile.slot === 'noon' ? '13:00' : '12:00',
    d: profile.slot === 'evening' ? '19:30' : '18:30',
  };
  const items = [
    { id: 'checkin', time: profile.slot === 'morning' ? '06:00' : '07:00' },
    { id: 'meal-b', slot: 'b', time: meals.b },
    { id: 'meal-l', slot: 'l', time: meals.l },
    { id: 'meal-d', slot: 'd', time: meals.d },
    { id: 'winddown', time: '21:30' },
  ];
  if (session) {
    items.push({ id: 'workout', time: slot.time });
    // Snack after strength training, unless a real meal comes soon after anyway.
    const after = workoutAt + 60;
    const mealSoon = Object.values(meals).some((t) => toMinutes(t) >= workoutAt && toMinutes(t) <= after + 60);
    if (session.kind === 'strength' && !mealSoon) items.push({ id: 'meal-s', slot: 's', time: fromMinutes(after - 15) });
  } else {
    items.push({ id: 'rest', time: slot.time });
  }
  return items.sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
}
