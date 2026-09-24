// "จัดวันนี้ให้ฉัน" (arrange my day), "วันนี้ไม่ไหว" (low-energy day), weather
// and travel adjustments. Simple, explainable rules: fixed things (appointments,
// timed work, meals) stay put; flexible things (exercise, errands without a
// time, a short break) move into the free gaps, and every move says why.
// Pure functions only — tested in tests/arrange.test.js.
import { toMinutes, fromMinutes, addDays } from './health.js';

export const WORKOUT_MINUTES = { gym: 60, home: 40, run: 30, walk: 35, indoor: 25, mobility: 15 };
export const EVENT_MINUTES = { appt: 60, work: 60, personal: 30 };
const DAY_START = 6 * 60;
const DAY_END = 21 * 60 + 30;
const STEP = 15;

export const WEATHER = {
  rain: { label: 'ฝนตก', icon: 'cloud' },
  hot: { label: 'ร้อนจัด', icon: 'sun' },
};

const OUTDOOR = new Set(['run', 'walk']);
export const isOutdoor = (session) => !!session && OUTDOOR.has(session.activity) && session.intensity !== 'rest';

// Rain: the same session indoors. Heat: keep it outside but lighter (the
// arranger also moves it out of the midday sun).
export function weatherAdapt(session, weather) {
  if (!isOutdoor(session) || !weather) return session;
  if (weather === 'rain') return { ...session, activity: 'indoor', adjusted: 'rain' };
  if (weather === 'hot') return { ...session, intensity: session.intensity === 'hard' ? 'light' : session.intensity, adjusted: 'hot' };
  return session;
}

// Travel: no gym and no kitchen. The profile the planners see is adjusted, so
// sessions become no-equipment ones and meals come from shops.
export function travelProfile(profile) {
  const acts = profile.activities.filter((a) => a !== 'gym');
  if (profile.activities.includes('gym') && !acts.includes('home')) acts.push('home');
  if (!acts.length) acts.push('walk');
  return { ...profile, activities: acts, food: { ...profile.food, mode: 'buy' } };
}
// ...and hard days become light ones while away.
export const travelSession = (session) => (session && session.intensity === 'hard'
  ? { ...session, intensity: 'light', adjusted: session.adjusted ?? 'travel' } : session);

// ---------- helpers ----------
const overlap = (a, b) => a.start < b.end && b.start < a.end;

function freeSlot(busy, dur, want, from, to = DAY_END) {
  // Nearest start to `want` (later first on ties) where [start, start+dur) is free.
  let best = null;
  for (let s = Math.max(from, DAY_START); s + dur <= to; s += STEP) {
    const slot = { start: s, end: s + dur };
    if (busy.some((b) => overlap(slot, b))) continue;
    const d = Math.abs(s - want) - (s >= want ? 0.5 : 0);
    if (!best || d < best.d) best = { start: s, d };
  }
  return best?.start ?? null;
}

const roundUp = (m) => Math.ceil(m / STEP) * STEP;

// ---------- arrange my day ----------
// items: [{ id, kind: checkin|meal|workout|event|task|relax|winddown, label, time|null,
//           dur, done, fixed, outdoor, urgent }]
// ctx: { now (minutes), sleepHours, energy (1–5), stress (1–5), level, weather, travel, hasCheckin }
export function arrangeDay(items, ctx) {
  const now = ctx.now ?? 0;
  const times = {};
  const changes = [];
  const notes = [];
  const lowEnergy = (ctx.energy != null && ctx.energy <= 2) || ctx.level === 'rest';
  const shortSleep = ctx.sleepHours != null && ctx.sleepHours < 6;

  if (!ctx.hasCheckin) notes.push('ยังไม่ได้เช็กอิน แมวเลยจัดจากตารางอย่างเดียว เช็กอินแล้วจะจัดได้แม่นขึ้น');
  if (shortSleep) notes.push('เมื่อคืนนอนน้อยกว่า 6 ชม. วันนี้เลยจัดแบบไม่หักโหม');
  else if (lowEnergy) notes.push('พลังงานวันนี้ต่ำ แมวเว้นช่องว่างให้พักมากขึ้น');

  const block = (i, time = i.time) => ({ id: i.id, start: toMinutes(time), end: toMinutes(time) + (i.dur ?? 30) });
  // Appointments and timed work never move; leave half an hour to get there.
  const fixed = items.filter((i) => i.fixed && i.time && !i.done).map((i) => {
    const b = block(i);
    return i.buffer ? { ...b, start: b.start - 30 } : b;
  });
  const busy = [...fixed];
  const move = (i, to, reason) => {
    times[i.id] = to;
    if (to !== i.time) changes.push({ id: i.id, label: i.label, from: i.time, to, reason });
  };

  // 1. Meals that clash with a fixed event move just after it (or before).
  for (const m of items.filter((i) => i.kind === 'meal' && !i.done && i.time)) {
    const b = block(m);
    const clash = fixed.find((f) => overlap(b, f));
    if (!clash || toMinutes(m.time) < now) {
      busy.push(b);
      continue;
    }
    const at = freeSlot(busy, m.dur ?? 30, clash.end, Math.max(now, clash.start - 120), clash.end + 150);
    if (at != null) {
      move(m, fromMinutes(at), `ช่วงนั้นมี "${items.find((x) => x.id === clash.id)?.label ?? 'นัด'}" เลยขยับมื้อให้ไม่ชนกัน`);
      busy.push({ start: at, end: at + (m.dur ?? 30) });
    } else busy.push(b);
  }

  // 2. Exercise: out of the midday heat, around fixed events, not skipped just because its time passed.
  const w = items.find((i) => i.kind === 'workout' && !i.done);
  if (w && w.time) {
    const dur = w.dur ?? 45;
    let want = toMinutes(w.time);
    const reasons = [];
    // Cat Memory: the time the user actually likes (confirmed by them).
    if (ctx.prefTime && ctx.prefTime !== w.time) {
      want = toMinutes(ctx.prefTime);
      reasons.push(ctx.prefText ?? `แมวจำได้ว่าเธอชอบช่วง ${ctx.prefTime}`);
    }
    // Agreed rule: a meeting in the afternoon usually means no workout after it → morning.
    if (ctx.meetingMove) {
      const meeting = items.find((i) => i.fixed && i.meeting && i.time && toMinutes(i.time) >= 12 * 60 && toMinutes(i.time) < want && want - toMinutes(i.time) <= 240);
      if (meeting && now < 9 * 60) {
        want = Math.max(6 * 60 + 30, roundUp(now));
        reasons.push(`วันนี้มี "${meeting.label}" ช่วงบ่าย ตามที่ตกลงกันไว้ ย้ายไปช่วงเช้าก่อน`);
      }
    }
    if (ctx.weather === 'hot' && w.outdoor && want >= 10 * 60 && want < 17 * 60) {
      want = now <= 6 * 60 + 30 ? 6 * 60 + 30 : 18 * 60;
      reasons.push('อากาศร้อนจัด เลยเลี่ยงแดดกลางวัน');
    }
    if (shortSleep && want >= 20 * 60) {
      want = 18 * 60;
      reasons.push('นอนน้อย ออกกำลังกายดึกจะทำให้หลับยาก');
    }
    let start = Math.max(want, roundUp(now));
    if (want < now) reasons.push('เลยเวลาเดิมมาแล้ว ไม่เป็นไร ย้ายไปช่วงที่ยังว่างให้');
    const clash = busy.find((b) => overlap({ start, end: start + dur }, b));
    if (clash) {
      const at = freeSlot(busy, dur, start, roundUp(now));
      if (at != null) {
        const label = items.find((x) => x.id === clash.id)?.label;
        reasons.push(label ? `ช่วงเดิมชนกับ "${label}"` : 'ช่วงเดิมไม่ว่าง');
        start = at;
      } else {
        start = null;
        notes.push('วันนี้ตารางแน่นมาก ถ้ามีเวลาแค่ 10 นาที ยืดเส้นสั้นๆ ก็นับแล้วนะ');
      }
    }
    if (start != null) {
      busy.push({ start, end: start + dur });
      const to = fromMinutes(start);
      if (to !== w.time) move(w, to, reasons.join(' · ') || 'หาช่วงที่ว่างพอดีให้');
      else times[w.id] = to;
    }
  }

  // 3. Errands and work without a time go into free gaps: work in the fresh
  //    morning, personal things around lunch or after work.
  const tasks = items.filter((i) => i.kind === 'task' && !i.done && !i.time);
  const limit = lowEnergy ? 2 : tasks.length;
  tasks.slice(0, limit).forEach((t) => {
    const dur = t.dur ?? 30;
    const want = t.work ? 9 * 60 : 17 * 60 + 30;
    const at = freeSlot(busy, dur, Math.max(want, roundUp(now)), roundUp(now));
    if (at == null) return;
    busy.push({ start: at, end: at + dur });
    move(t, fromMinutes(at), t.work ? 'งานที่ต้องใช้สมาธิ วางไว้ช่วงที่ยังสดอยู่' : 'ธุระเล็กๆ วางไว้ช่วงที่ว่าง');
  });
  if (tasks.length > limit) notes.push(`พลังงานน้อย แมวจัดให้แค่ ${limit} อย่างก่อน ที่เหลือพรุ่งนี้ค่อยว่ากันก็ได้`);

  // 4. A short break in the afternoon, where it fits; earlier on busy or tired days.
  const relax = items.find((i) => i.kind === 'relax' && !i.done);
  if (relax && relax.time) {
    const busyDay = fixed.length >= 3;
    const want = busyDay || lowEnergy || (ctx.stress ?? 0) >= 4 ? 14 * 60 : toMinutes(relax.time);
    const at = freeSlot(busy, relax.dur ?? 10, Math.max(want, roundUp(now)), roundUp(now));
    if (at != null && fromMinutes(at) !== relax.time) {
      move(relax, fromMinutes(at), busyDay ? 'วันนี้นัดเยอะ แทรกช่วงพักหายใจไว้ให้' : lowEnergy || (ctx.stress ?? 0) >= 4 ? 'พักเร็วขึ้นหน่อย ช่วยให้ไม่หมดแรงช่วงบ่าย' : 'ช่วงเดิมไม่ว่าง');
      busy.push({ start: at, end: at + (relax.dur ?? 10) });
    }
  }

  // 5. Bedtime: earlier after a short night.
  const wd = items.find((i) => i.kind === 'winddown' && !i.done);
  if (wd && shortSleep && toMinutes(wd.time) > 21 * 60) {
    move(wd, '21:00', 'เมื่อคืนนอนน้อย คืนนี้เข้านอนเร็วขึ้นครึ่งชั่วโมง');
  }

  if (ctx.travel) notes.push('โหมดเดินทาง: เมนูที่ซื้อง่าย และท่าที่ไม่ต้องใช้เครื่อง');
  if (!changes.length && notes.length <= 1) notes.push('แผนวันนี้ลงตัวอยู่แล้ว ไม่ต้องขยับอะไร');

  changes.sort((a, b) => toMinutes(a.to) - toMinutes(b.to));
  return { times, changes, notes };
}

// ---------- "วันนี้ไม่ไหว" ----------
// Work and errands that aren't urgent move to tomorrow. Appointments, bills and
// anything marked urgent stay.
export function postponable(events, today) {
  return events.filter((e) => e.date === today && !e.done && !e.urgent && (e.kind === 'work' || e.kind === 'personal'));
}
export const tomorrowOf = (today) => addDays(today, 1);
