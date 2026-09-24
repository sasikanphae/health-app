// Reading the diary back: patterns between sleep, food, exercise and mood,
// recurring habits the mascot can gently mention, the weekly story, and
// progress towards self-set rewards. Pure functions — tests/insights.test.js.
import { addDays, parseKey } from './health.js';

const WEEKDAY_NAMES = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัส', 'วันศุกร์', 'วันเสาร์'];

// Hours for each check-in sleep answer (middle of the range).
const SLEEP_HOURS_VALUE = { lt5: 4.5, '5-6': 5.5, '6-7': 6.5, '7-8': 7.5, '8+': 8.5 };
export const sleepHoursOf = (checkin) => SLEEP_HOURS_VALUE[checkin?.answers?.sleepHours] ?? null;

// Gentle stretching/meditation (tired check-in, "not today", วันพระ) is kind to
// the body but isn't counted as a workout for rewards and summaries.
const workedOut = (d) => !!d?.workout?.done && d.workout.intensity !== 'rest';
const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const round1 = (n) => Math.round(n * 10) / 10;

// A day counts as "recorded" if the user touched the app at all that day.
export function usedDay(d) {
  if (!d) return false;
  return !!(d.checkin || d.water > 0 || Object.keys(d.meals ?? {}).length || d.workout || d.mood || d.steps != null || d.easy);
}

function pastKeys(today, n) {
  return Array.from({ length: n }, (_, i) => addDays(today, -(i + 1)));
}

// ---------- 1. patterns ----------

// Patterns only surface when they're clear: enough occurrences and a real gap.
// Always worded as the cat's own observation ("ฉันสังเกตว่า…"), never a
// diagnosis. When the pattern matters for today (e.g. another short night),
// it comes with an offer (`action`) the user can accept in one tap.
// todayCheckin: this morning's check-in, if any.
export function findPatterns({ days, profile, today, lookback = 21, todayCheckin = null }) {
  const keys = pastKeys(today, lookback); // newest first, today excluded
  const isPlanDay = (k) => profile.days.includes(parseKey(k).getDay());
  const move = profile.activities.includes('gym') ? 'ไปยิม' : 'ออกกำลังกาย';
  const span = lookback >= 21 && lookback % 7 === 0 ? `${lookback / 7} สัปดาห์` : `${lookback} วัน`;
  const todaySleep = sleepHoursOf(todayCheckin);
  const out = [];

  // Short sleep → next training day skipped. Uses the most recent occurrences.
  const shortNights = keys.filter((k) => {
    const h = sleepHoursOf(days[k]?.checkin);
    const next = addDays(k, 1);
    return h != null && h < 6 && next < today && isPlanDay(next);
  }).slice(0, 5);
  if (shortNights.length >= 3) {
    const skipped = shortNights.filter((k) => !workedOut(days[addDays(k, 1)])).length;
    if (skipped / shortNights.length >= 0.66) {
      out.push({
        id: 'short-sleep-skip',
        strength: skipped / shortNights.length,
        text: `ฉันสังเกตว่าช่วง ${span}ที่ผ่านมา วันที่นอนน้อยกว่า 6 ชม. วันรุ่งขึ้นมักไม่ได้${move} (${skipped} ใน ${shortNights.length} ครั้ง)`,
        tip: todaySleep != null && todaySleep < 6
          ? 'เมื่อคืนก็นอนน้อยเหมือนกัน วันนี้อยากให้ลดโปรแกรมลงไหม'
          : `คืนก่อนวัน${move === 'ไปยิม' ? 'เข้ายิม' : 'ออกกำลังกาย'} ลองวางมือถือเร็วขึ้นสักครึ่งชั่วโมงดูไหม`,
        action: todaySleep != null && todaySleep < 6 ? { id: 'lighten', label: 'ลดโปรแกรมวันนี้' } : null,
      });
    }
  }

  // Good sleep → more energy the next morning (same check-in).
  const withSleep = keys.map((k) => days[k]?.checkin).filter((c) => sleepHoursOf(c) != null && c.answers.energy);
  const goodE = withSleep.filter((c) => sleepHoursOf(c) >= 7).map((c) => c.answers.energy);
  const shortE = withSleep.filter((c) => sleepHoursOf(c) < 6).map((c) => c.answers.energy);
  if (goodE.length >= 3 && shortE.length >= 3 && avg(goodE) - avg(shortE) >= 1) {
    out.push({
      id: 'sleep-energy',
      strength: Math.min(1, (avg(goodE) - avg(shortE)) / 2),
      text: 'ฉันสังเกตว่าเช้าที่นอนได้ 7 ชม.ขึ้นไป พลังงานดีกว่าเช้าที่นอนน้อยอย่างเห็นได้ชัด',
      tip: 'การนอนคือตัวช่วยที่ถูกที่สุดเลยนะ',
    });
  }

  // Exercise → better mood.
  const moodOn = keys.filter((k) => days[k]?.mood && workedOut(days[k])).map((k) => days[k].mood);
  const moodOff = keys.filter((k) => days[k]?.mood && !workedOut(days[k])).map((k) => days[k].mood);
  if (moodOn.length >= 3 && moodOff.length >= 3 && avg(moodOn) - avg(moodOff) >= 0.6) {
    out.push({
      id: 'workout-mood',
      strength: Math.min(1, (avg(moodOn) - avg(moodOff)) / 1.5),
      text: 'ฉันสังเกตว่าวันที่ได้ออกกำลังกาย อารมณ์ดีกว่าวันอื่นอย่างเห็นได้ชัด',
      tip: 'วันที่ใจไม่ค่อยดี ลองขยับเบาๆ สัก 10 นาทีก็อาจช่วยได้',
    });
  }

  // Breakfast → better mood.
  const moodBreakfast = keys.filter((k) => days[k]?.mood && days[k].meals?.b).map((k) => days[k].mood);
  const moodNoBreakfast = keys.filter((k) => days[k]?.mood && usedDay(days[k]) && !days[k].meals?.b).map((k) => days[k].mood);
  if (moodBreakfast.length >= 3 && moodNoBreakfast.length >= 3 && avg(moodBreakfast) - avg(moodNoBreakfast) >= 0.6) {
    out.push({
      id: 'breakfast-mood',
      strength: Math.min(1, (avg(moodBreakfast) - avg(moodNoBreakfast)) / 1.5),
      text: 'ฉันสังเกตว่าวันที่ได้กินมื้อเช้า อารมณ์ทั้งวันดีกว่าวันที่ไม่ได้กิน',
      tip: 'มื้อเช้าง่ายๆ แค่นมกับกล้วยก็นับนะ',
    });
  }

  // High stress → exercise skipped on training days.
  const stressDays = keys.filter((k) => days[k]?.checkin && isPlanDay(k));
  const high = stressDays.filter((k) => days[k].checkin.answers.stress >= 4);
  const low = stressDays.filter((k) => days[k].checkin.answers.stress <= 2);
  if (high.length >= 3 && low.length >= 3) {
    const rate = (ks) => ks.filter((k) => workedOut(days[k])).length / ks.length;
    if (rate(low) - rate(high) >= 0.4) {
      out.push({
        id: 'stress-skip',
        strength: rate(low) - rate(high),
        text: `ฉันสังเกตว่าวันที่เครียดมาก มักไม่ได้${move}`,
        tip: todayCheckin?.answers?.stress >= 4
          ? 'วันนี้ก็เครียดอยู่ อยากให้เปลี่ยนเป็นเดินเล่นเบาๆ แทนไหม'
          : 'วันเครียดๆ ไม่ต้องเล่นหนัก แค่เดินเล่น 10 นาทีก็ช่วยคลายได้',
        action: todayCheckin?.answers?.stress >= 4 ? { id: 'lighten', label: 'เปลี่ยนเป็นแบบเบา' } : null,
      });
    }
  }

  return out.sort((a, b) => b.strength - a.strength);
}

// ---------- 2. habits the mascot remembers ----------

export function findHabit({ days, profile, today, hour }) {
  // Several "not today" days lately → care, not pressure.
  const easyCount = pastKeys(today, 7).filter((k) => days[k]?.easy).length;
  if (easyCount >= 3) {
    return { id: 'many-easy', text: `สัปดาห์นี้เหนื่อยไป ${easyCount} วัน แมวเข้าใจนะ ลองนอนเร็วขึ้นสักหน่อยไหม ใจดีกับตัวเองเข้าไว้` };
  }

  // Long gap since the last workout (only if they have worked out before).
  const recent = pastKeys(today, 60);
  const last = recent.find((k) => workedOut(days[k]));
  if (last && !workedOut(days[today])) {
    const gap = Math.round((parseKey(today) - parseKey(last)) / 86_400_000);
    if (gap >= 4) {
      return { id: 'gap', text: `ไม่ได้ขยับมา ${gap} วันแล้ว แมวคิดถึงนะ วันนี้เดินเล่นสัก 10 นาทีก็นับเป็นบุญแล้ว` };
    }
  }

  // Breakfast often skipped on this weekday (checked in the morning only).
  if (hour < 11 && !days[today]?.meals?.b) {
    const same = [1, 2, 3, 4].map((w) => addDays(today, -7 * w)).filter((k) => usedDay(days[k]));
    const skipped = same.filter((k) => !days[k].meals?.b).length;
    if (same.length >= 3 && skipped >= 3) {
      const name = WEEKDAY_NAMES[parseKey(today).getDay()];
      return { id: 'skip-breakfast', text: `${name}ทีไร มักยุ่งจนไม่ได้กินมื้อเช้า วันนี้ลองหยิบนมกับกล้วยติดมือไว้ไหม เบาๆ ก็ยังดี` };
    }
  }

  return null;
}

// ---------- 5. weekly story ----------

// weekKeys: the 7 days of the week; prevKeys: the week before (for comparison).
export function weeklyStory({ days, weekKeys, prevKeys, profile, weights = [], until }) {
  const keys = weekKeys.filter((k) => !until || k <= until);
  const ds = keys.map((k) => days[k]).filter(Boolean);
  const used = ds.filter(usedDay);
  const workouts = ds.filter(workedOut);
  const gym = workouts.filter((d) => d.workout.activity === 'gym').length;
  const easy = ds.filter((d) => d.easy).length;
  const sleep = ds.map((d) => sleepHoursOf(d.checkin)).filter((h) => h != null);
  const prevSleep = prevKeys.map((k) => sleepHoursOf(days[k]?.checkin)).filter((h) => h != null);
  const water = ds.filter((d) => d.waterMet).length;
  const moods = ds.map((d) => d.mood).filter(Boolean);
  const wIn = weights.filter((w) => w.date >= keys[0] && w.date <= keys[keys.length - 1]);

  const lines = [];
  if (!used.length) {
    return {
      lines: ['สัปดาห์นี้แทบไม่ได้แวะมาเลย ไม่เป็นไรนะ ชีวิตวุ่นก็มีบ้าง แมวยังนั่งรออยู่ตรงนี้เสมอ'],
      stats: { workouts: 0, gym: 0, easy: 0, sleepAvg: null, water: 0, moodAvg: null },
    };
  }

  const n = workouts.length;
  const move = gym ? ` (เข้ายิม ${gym} ครั้ง)` : '';
  if (n === 0) lines.push('สัปดาห์นี้เป็นสัปดาห์พักยาว ร่างกายได้ชาร์จแบตเต็มที่');
  else if (n <= 2) lines.push(`ขยับตัวไป ${n} ครั้ง${move} ทุกครั้งนับหมดนะ`);
  else lines.push(`ออกกำลังกายไป ${n} ครั้ง${move} เก่งมากกก`);

  if (sleep.length) {
    const a = round1(avg(sleep));
    let cmp = '';
    if (prevSleep.length) {
      const diff = a - avg(prevSleep);
      if (diff >= 0.3) cmp = ' นอนมากขึ้นกว่าสัปดาห์ก่อน ดีมากเลย';
      else if (diff <= -0.3) cmp = ' น้อยลงกว่าสัปดาห์ก่อนนิดนึง ลองเข้านอนเร็วขึ้นอีกหน่อยนะ';
      else cmp = ' ใกล้เคียงกับสัปดาห์ก่อน';
    }
    lines.push(`นอนเฉลี่ยราว ${a} ชม.${cmp}`);
  } else {
    lines.push('สัปดาห์นี้ไม่ค่อยได้เช็กอินตอนเช้า ไม่เป็นไร แมวยังรอฟังอยู่นะ');
  }

  if (water) lines.push(`ดื่มน้ำครบเป้า ${water} วัน`);
  if (moods.length >= 2) {
    const m = avg(moods);
    lines.push(m >= 4 ? 'อารมณ์โดยรวมสดใสดี' : m >= 3 ? 'อารมณ์โดยรวมกลางๆ สบายๆ' : 'ใจเหนื่อยไปหลายวัน ขอกอดทีนึงนะ');
  }
  if (easy) lines.push(`มีวันที่ไม่ไหว ${easy} วัน และเธอก็ใจดีกับตัวเองพอที่จะพัก นั่นแหละเก่งแล้ว`);
  if (wIn.length >= 2) {
    const diff = round1(wIn[wIn.length - 1].kg - wIn[0].kg);
    if (diff !== 0) lines.push(`น้ำหนักขยับ ${diff > 0 ? '+' : '−'}${Math.abs(diff)} กก. (ขึ้นลงรายวันเป็นเรื่องปกตินะ)`);
  }

  const planned = profile.days.length;
  if (n >= Math.min(3, planned)) lines.push('สัปดาห์หน้าไปต่อแบบนี้ได้เลย แมวภูมิใจมาก');
  else if (n > 0) lines.push('สัปดาห์หน้าลองเพิ่มอีกแค่ครั้งเดียวพอ ไม่ต้องหักโหม');
  else lines.push('สัปดาห์หน้าเริ่มจากเดินเล่น 10 นาทีก็พอ ค่อยเป็นค่อยไป');

  return {
    lines,
    stats: {
      workouts: n, gym, easy, water,
      sleepAvg: sleep.length ? round1(avg(sleep)) : null,
      moodAvg: moods.length ? round1(avg(moods)) : null,
    },
  };
}

// ---------- 7. self-set rewards ----------

export const REWARD_METRICS = {
  gym: { label: 'เข้ายิม', unit: 'ครั้ง' },
  workout: { label: 'ออกกำลังกาย', unit: 'ครั้ง' },
  checkin: { label: 'เช็กอินตอนเช้า', unit: 'วัน' },
  water: { label: 'ดื่มน้ำครบเป้า', unit: 'วัน' },
  steps: { label: 'เดินครบเป้า', unit: 'วัน' },
};

const METRIC_TEST = {
  gym: (d) => workedOut(d) && d.workout.activity === 'gym',
  workout: workedOut,
  checkin: (d) => !!d?.checkin,
  water: (d) => !!d?.waterMet,
  steps: (d) => !!d?.stepsMet,
};

// reward: { id, title, metric, target, start (date key) }
export function rewardProgress(reward, days, today) {
  const test = METRIC_TEST[reward.metric] ?? (() => false);
  const count = Object.keys(days).filter((k) => k >= reward.start && k <= today && test(days[k])).length;
  const target = Math.max(1, reward.target);
  const pct = Math.min(1, count / target);
  return { count, target, pct, left: Math.max(0, target - count), near: pct >= 0.8 && count < target, done: count >= target };
}

// ---------- monthly wrapped ----------

// A month told as a story: progress, not perfection. ym: 'YYYY-MM'.
export function monthlyStory({ days, ym, weights = [] }) {
  const keys = Object.keys(days).filter((k) => k.startsWith(ym)).sort();
  const ds = keys.map((k) => [k, days[k]]);
  const used = ds.filter(([, d]) => usedDay(d));
  const workouts = ds.filter(([, d]) => workedOut(d));
  const gym = workouts.filter(([, d]) => d.workout.activity === 'gym').length;
  const steps = ds.reduce((a, [, d]) => a + (d.steps ?? 0), 0);
  const waterDays = ds.filter(([, d]) => d.waterMet).length;
  const waterPct = used.length ? Math.round((waterDays / used.length) * 100) : 0;
  const easy = ds.filter(([, d]) => d.easy).length;

  // Coming back after 3+ days without exercise counts as a win, every time.
  const allKeys = Object.keys(days).filter((k) => workedOut(days[k])).sort();
  let comebacks = 0;
  for (let i = 1; i < allKeys.length; i++) {
    if (!allKeys[i].startsWith(ym)) continue;
    const gap = Math.round((parseKey(allKeys[i]) - parseKey(allKeys[i - 1])) / 86_400_000);
    if (gap >= 4) comebacks++;
  }

  // Best day: the one where the most good things happened.
  const score = (d) => (workedOut(d) ? 2 : 0) + (d.waterMet ? 1 : 0) + (d.stepsMet ? 1 : 0)
    + Object.values(d.meals ?? {}).filter((m) => m.status).length * 0.5 + (d.mood ?? 0) / 5;
  const best = used.reduce((b, [k, d]) => (!b || score(d) > b.s ? { k, s: score(d) } : b), null);

  const prevYm = (() => {
    const [y, m] = ym.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();
  const prevWorkouts = Object.keys(days).filter((k) => k.startsWith(prevYm) && workedOut(days[k])).length;
  const wIn = weights.filter((w) => w.date.startsWith(ym));

  const lines = [];
  if (!used.length) {
    return { lines: ['เดือนนี้แทบไม่ได้แวะมาเลย ไม่เป็นไรนะ ชีวิตวุ่นก็มีบ้าง เดือนหน้าแมวยังอยู่ตรงนี้'], highlights: [], stats: { workouts: 0, steps: 0, waterPct: 0, comebacks: 0 } };
  }
  const n = workouts.length;
  if (n) {
    let l = `เดือนนี้ขยับตัวไป ${n} ครั้ง${gym ? ` (เข้ายิม ${gym} ครั้ง)` : ''}`;
    if (prevWorkouts && n > prevWorkouts) l += ` มากกว่าเดือนก่อน ${n - prevWorkouts} ครั้งด้วย`;
    lines.push(l);
  } else lines.push('เดือนนี้เป็นเดือนพักร่างกาย แค่แวะมาดูแลตัวเองก็นับแล้ว');
  if (steps) lines.push(`เดินรวม ${steps.toLocaleString('th-TH')} ก้าว${steps >= 100000 ? ' เท่ากับเดินข้ามเมืองได้หลายรอบเลย' : ''}`);
  if (waterDays) lines.push(`ดื่มน้ำครบเป้า ${waterPct}% ของวันที่บันทึก`);
  if (easy) lines.push(`มีวันที่ไม่ไหว ${easy} วัน และเลือกพักอย่างใจดีกับตัวเอง`);
  if (wIn.length >= 2) {
    const diff = round1(wIn[wIn.length - 1].kg - wIn[0].kg);
    if (diff) lines.push(`น้ำหนักขยับ ${diff > 0 ? '+' : '−'}${Math.abs(diff)} กก. ตลอดเดือน`);
  }

  const highlights = [];
  if (comebacks) highlights.push(`กลับมาเริ่มใหม่ได้ ${comebacks} ครั้งหลังจากหยุดไป นี่แหละความเก่งจริงๆ`);
  if (best && best.s >= 2) highlights.push(`วันที่ดีที่สุด: ${parseKey(best.k).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' })}`);
  highlights.push(n >= 8 ? 'เดือนหน้าไปต่อแบบสบายๆ แบบนี้ได้เลย' : 'เดือนหน้าแค่เพิ่มอีกนิดเดียวก็พอ ไม่ต้องสมบูรณ์แบบ');

  return { lines, highlights, stats: { workouts: n, gym, steps, waterPct, comebacks, easy, best: best?.k ?? null } };
}

// ---------- special day ----------

export const ROUTE_IDEAS = [
  'เดินเส้นทางใหม่ที่ไม่เคยไป เช่น เลี้ยวซอยถัดไปแทนซอยเดิม',
  'ลงรถก่อนถึงที่หมายหนึ่งป้าย แล้วเดินชมวิวไปแทน',
  'ชวนใครสักคนไปเดินเล่นสวนสาธารณะใกล้บ้าน',
  'เดินไปร้านกาแฟหรือตลาดที่ไม่เคยแวะ',
];

// Now and then (roughly once a week, never on tired days or วันพระ) the cat
// suggests something new: an exercise, a menu, or a walking route.
// options: { exercises: [{ id, name }], menus: [{ id, name }] } — not tried recently.
export function specialDay({ key, lastSpecial = null, easy = false, level = null, holy = false, options = {}, seed = 0 }) {
  if (easy || level === 'rest' || holy) return null;
  if (lastSpecial && Math.round((parseKey(key) - parseKey(lastSpecial)) / 86_400_000) < 6) return null;
  const h = [...key].reduce((a, c) => (a * 31 + c.charCodeAt(0) + seed) % 9973, 7);
  if (h % 3 !== 0) return null;
  const kinds = [];
  if (options.exercises?.length) kinds.push('exercise');
  if (options.menus?.length) kinds.push('menu');
  kinds.push('route');
  const kind = kinds[h % kinds.length];
  if (kind === 'exercise') {
    const x = options.exercises[h % options.exercises.length];
    return { id: `special-${key}`, kind, ref: x.id, title: `ลองท่าใหม่: ${x.name}`, text: 'ท่าที่ยังไม่เคยเล่น ลองสักเซ็ตให้ร่างกายได้เจออะไรใหม่ๆ' };
  }
  if (kind === 'menu') {
    const m = options.menus[h % options.menus.length];
    return { id: `special-${key}`, kind, ref: m.id, title: `ลองเมนูใหม่: ${m.name}`, text: 'เปลี่ยนมื้อเย็นเป็นเมนูที่ยังไม่เคยกินในแผน กันเบื่อ' };
  }
  return { id: `special-${key}`, kind: 'route', ref: null, title: 'ลองเส้นทางเดินใหม่', text: ROUTE_IDEAS[h % ROUTE_IDEAS.length] };
}

// ---------- badges for the rewards wall ----------
// Behaviours done well over the last 7 days (today included). Each badge says
// how close it is, so a locked one reads as "almost", never as failure.
export function achievements({ days, expenses = [], today }) {
  const keys = Array.from({ length: 7 }, (_, i) => addDays(today, -i));
  const ds = keys.map((k) => days[k]).filter(Boolean);
  const count = (fn) => ds.filter(fn).length;
  const sleep = ds.map((d) => sleepHoursOf(d.checkin)).filter((h) => h != null);
  const ym = today.slice(0, 7);
  const dayN = Number(today.slice(8));
  const [y, m] = ym.split('-').map(Number);
  const prev = new Date(y, m - 2, 1);
  const prevYm = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
  const spent = (p) => expenses.filter((x) => x.date.startsWith(p) && Number(x.date.slice(8)) <= dayN).reduce((a, x) => a + x.amount, 0);
  const prevSpent = spent(prevYm);
  const out = [
    { id: 'steady', label: 'ทำสม่ำเสมอ', badge: 'check', n: count(usedDay), target: 5, unit: 'วัน' },
    { id: 'mover', label: 'ขยันขยับ', badge: 'dumbbell', n: count(workedOut), target: 3, unit: 'ครั้ง' },
    { id: 'hydrated', label: 'สุขภาพดี', badge: 'water', n: count((d) => d.waterMet), target: 4, unit: 'วันน้ำครบ' },
    { id: 'calm', label: 'ผ่อนคลาย', badge: 'meditate', n: count((d) => d.ticks?.relax || d.workout?.activity === 'mobility' || (d.mood ?? 0) >= 4), target: 3, unit: 'วัน' },
    { id: 'sleeper', label: 'นอนดี', badge: 'sleep', n: sleep.filter((h) => h >= 7).length, target: 3, unit: 'คืน 7 ชม.+' },
    { id: 'saver', label: 'ประหยัดได้', badge: 'money', n: prevSpent > 0 && spent(ym) <= prevSpent ? 1 : 0, target: 1, unit: '', note: prevSpent > 0 ? 'ใช้เงินไม่เกินช่วงเดียวกันเดือนก่อน' : 'จดรายจ่ายสักเดือนก่อน แล้วจะเทียบให้' },
  ];
  return out.map((a) => ({ ...a, earned: a.n >= a.target }));
}
