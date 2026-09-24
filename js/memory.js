// Cat Memory: long-term things the cat remembers about its person — only what
// they allow, always with the reason, always editable and forgettable.
//
// Three sources:
//   observed  — learned from the diary; stays "pending" until the user says
//               "จำไว้" (nothing observed is used before that)
//   told      — the user said it ("จำไว้ว่า…", "ไม่ชอบ…")
//   corrected — the user fixed an inbox category; the word is remembered
// Pure functions only — tested in tests/memory.test.js.
import { addDays, parseKey, hash } from './health.js';

export const MEMORY_KINDS = {
  time: { label: 'เวลาที่สะดวกออกกำลังกาย', icon: 'clock' },
  food: { label: 'อาหารที่ชอบ / ไม่ค่อยชอบ', icon: 'meal' },
  busy: { label: 'วันที่มักยุ่ง', icon: 'calendar' },
  forget: { label: 'สิ่งที่มักหลุดลืม', icon: 'bell' },
  told: { label: 'สิ่งที่บอกแมวไว้', icon: 'pen' },
  rule: { label: 'สิ่งที่ตกลงกันไว้', icon: 'check' },
  inbox: { label: 'หมวดที่เคยแก้ใน "โยนไว้ก่อน"', icon: 'list' },
};

const WD = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัส', 'วันศุกร์', 'วันเสาร์'];
const hm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const toMin = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const pastKeys = (today, n) => Array.from({ length: n }, (_, i) => addDays(today, -(i + 1)));
const worked = (d) => !!d?.workout?.done && d.workout.intensity !== 'rest';

// ---------- observing ----------
// Returns candidates: [{ key, kind, text, why, value, evidence }]
// menus: { id: name }, bills: [{ id, title }], slotTime: 'HH:MM' the user picked.
export function observeMemories({ days, events = [], signals = [], today, slotTime = null, menus = {}, bills = [] }) {
  const out = [];

  // Workout time: when workouts actually happen (start ≈ 45 min before "done").
  const starts = pastKeys(today, 42).map((k) => days[k]).filter((d) => worked(d) && d.workout.at)
    .map((d) => {
      const t = new Date(d.workout.at);
      return Math.round((t.getHours() * 60 + t.getMinutes() - 45) / 30) * 30;
    });
  if (starts.length >= 3) {
    const mode = starts.reduce((best, s) => {
      const n = starts.filter((x) => Math.abs(x - s) <= 60).length;
      return n > best.n ? { s, n } : best;
    }, { s: null, n: 0 });
    if (mode.n / starts.length >= 0.6 && slotTime && Math.abs(mode.s - toMin(slotTime)) >= 90) {
      out.push({
        key: 'time:workout', kind: 'time', value: hm(mode.s),
        text: `ชอบออกกำลังกายช่วง ${hm(mode.s)} มากกว่า ${slotTime}`,
        why: `${mode.n} ใน ${starts.length} ครั้งล่าสุด ออกกำลังกายช่วงราว ${hm(mode.s)}`,
        evidence: mode.n,
      });
    }
  }

  // Food: menus eaten as planned again and again, and menus swapped away.
  const ate = {};
  const swapped = {};
  for (const k of pastKeys(today, 60)) {
    const d = days[k];
    for (const m of Object.values(d?.meals ?? {})) if (m.status === 'plan' && m.menuId) ate[m.menuId] = (ate[m.menuId] ?? 0) + 1;
    for (const id of d?.swappedMenus ?? []) swapped[id] = (swapped[id] ?? 0) + 1;
  }
  Object.entries(ate).filter(([id, n]) => n >= 3 && menus[id] && !swapped[id]).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .forEach(([id, n]) => out.push({ key: `food:like:${id}`, kind: 'food', value: { id, like: true }, text: `ชอบ${menus[id]}`, why: `กินตามแผนเมนูนี้ ${n} ครั้ง`, evidence: n }));
  Object.entries(swapped).filter(([id, n]) => n >= 2 && menus[id]).forEach(([id, n]) => out.push({
    key: `food:dislike:${id}`, kind: 'food', value: { id, like: false }, text: `ไม่ค่อยอยากกิน${menus[id]}`, why: `กดเปลี่ยนเมนูนี้ทิ้ง ${n} ครั้ง`, evidence: n,
  }));

  // Busy weekdays: 3 of the last 4 of that weekday had 2+ appointments/work, or was a "ไม่ไหว" day.
  for (let wd = 0; wd < 7; wd++) {
    const same = pastKeys(today, 35).filter((k) => parseKey(k).getDay() === wd).slice(0, 4);
    if (same.length < 4) continue;
    const busy = same.filter((k) => days[k]?.easy || events.filter((e) => e.date === k && (e.kind === 'work' || e.kind === 'appt')).length >= 2);
    if (busy.length >= 3) {
      out.push({ key: `busy:${wd}`, kind: 'busy', value: wd, text: `${WD[wd]}มักยุ่ง`, why: `${busy.length} ใน 4 สัปดาห์หลัง ${WD[wd]}มีนัดหรืองานหลายอย่าง หรือเป็นวันที่ไม่ไหว`, evidence: busy.length });
    }
  }

  // Easily forgotten: bills paid after the due day, reminders pushed back again and again.
  const recent = signals.filter((s) => s.date >= addDays(today, -60));
  for (const b of bills) {
    const late = recent.filter((s) => s.t === 'late-bill' && s.ref === b.id).length;
    if (late >= 2) out.push({ key: `forget:bill:${b.id}`, kind: 'forget', value: { bill: b.id }, text: `${b.title}มักจ่ายเลยวัน`, why: `จ่ายหลังวันครบกำหนด ${late} ครั้ง`, evidence: late });
  }
  const REM = { water: 'ดื่มน้ำ', checkin: 'เช็กอินตอนเช้า', workout: 'ออกกำลังกาย' };
  for (const [type, label] of Object.entries(REM)) {
    const n = recent.filter((s) => (s.t === 'skip' || s.t === 'snooze') && s.ref === type && s.date >= addDays(today, -14)).length;
    if (n >= 4) out.push({ key: `forget:rem:${type}`, kind: 'forget', value: { reminder: type }, text: `การเตือน${label}มักถูกเลื่อน`, why: `เลื่อนหรือข้าม ${n} ครั้งใน 2 สัปดาห์`, evidence: n });
  }
  return out;
}

// ---------- merging with what's stored ----------
// Observed candidates update or create "pending" items; the user's own words
// (told / corrected / edited) are never overwritten; forgotten keys are never
// learned again; a pending item whose evidence went away quietly disappears.
export function mergeMemories(items, candidates, { forgotten = {}, kindsOn = {}, now = Date.now() } = {}) {
  const cand = new Map(candidates.filter((c) => !forgotten[c.key] && kindsOn[c.kind] !== false).map((c) => [c.key, c]));
  const out = [];
  for (const it of items) {
    if (forgotten[it.key]) continue;
    const c = cand.get(it.key);
    cand.delete(it.key);
    if (it.source !== 'observed' || it.edited) out.push(it);
    else if (c) out.push({ ...it, text: c.text, why: c.why, value: c.value, evidence: c.evidence, updatedAt: now });
    else if (it.status === 'on') out.push(it); // confirmed: remembered until the user forgets it
  }
  for (const c of cand.values()) out.push({ ...c, id: c.key, source: 'observed', status: 'pending', at: now, updatedAt: now });
  return out;
}

// What's actually in use: confirmed, and its kind switched on.
export const activeMemories = (items, kindsOn = {}) => items.filter((i) => i.status === 'on' && kindsOn[i.kind] !== false);

// What the user said wins over what the cat observed.
export function preferredWorkoutTime(active) {
  const told = active.filter((i) => i.kind === 'told' && i.value?.workoutTime).sort((a, b) => b.at - a.at)[0];
  if (told) return { time: told.value.workoutTime, text: `ครั้งก่อนเธอบอกว่า${told.text}` };
  const m = active.find((i) => i.key === 'time:workout');
  return m ? { time: m.value, text: `แมวจำได้ว่าเธอ${m.text}` } : null;
}

// Menus to steer away from: swapped-away ones, and anything the user said
// they don't like ("ไม่ชอบผักชี" → menus whose name or ingredients mention it).
export function avoidedMenus(active, menus) {
  const ids = new Set(active.filter((i) => i.kind === 'food' && i.value?.like === false).map((i) => i.value.id));
  const words = active.filter((i) => i.kind === 'told' && i.value?.dislike).map((i) => i.value.dislike);
  for (const m of menus) {
    const hay = `${m.name} ${(m.ingredients ?? []).join(' ')}`;
    if (words.some((w) => w && hay.includes(w))) ids.add(m.id);
  }
  return [...ids];
}

export const busyWeekdays = (active) => new Set(active.filter((i) => i.kind === 'busy').map((i) => i.value));
export const hasRule = (active, id) => active.some((i) => i.key === `rule:${id}`);

// ---------- what the user tells the cat ----------
const TOLD_RE = /^(?:แมว)?(?:ช่วย)?จำไว้(?:ด้วย)?(?:นะ)?(?:ว่า)?\s*|^(?:ฉัน|เรา|ผม|หนู)?(?=(?:ไม่)?ชอบ)/;
export const isTold = (text) => /^(?:แมว)?(?:ช่วย)?จำไว้|^(?:ฉัน|เรา|ผม|หนู)?(?:ไม่)?ชอบ/.test(text.trim());

export function toldMemory(text, now = Date.now()) {
  const t = text.trim().replace(TOLD_RE, '').trim() || text.trim();
  const dis = t.match(/^ไม่(?:ค่อย)?ชอบ(?:กิน)?\s*(.+)$/);
  // "ชอบออกกำลังกายตอนเช้า" / "…ช่วง 18:00"
  let workoutTime = null;
  if (!dis && /ออกกำลัง|ยิม|วิ่ง|เดิน|เล่นเวท/.test(t)) {
    const exact = t.match(/(\d{1,2})[:.](\d{2})/);
    if (exact) workoutTime = `${exact[1].padStart(2, '0')}:${exact[2]}`;
    else workoutTime = [[/เช้า/, '07:00'], [/เที่ยง|กลางวัน/, '12:00'], [/เย็น/, '18:00'], [/ค่ำ|กลางคืน|ดึก/, '20:00']].find(([re]) => re.test(t))?.[1] ?? null;
  }
  const value = dis ? { dislike: dis[1].trim() } : workoutTime ? { workoutTime } : null;
  return {
    key: `told:${hash(t)}`, id: `told:${hash(t)}`, kind: 'told', source: 'told', status: 'on',
    text: t, why: 'เธอบอกแมวไว้เอง', value, at: now, updatedAt: now,
  };
}

// ---------- learning inbox categories from corrections ----------
// "ซื้อแชมพู" moved from shopping to ideas → remember the key word.
export function keyWord(title) {
  const t = String(title ?? '').trim();
  const first = t.split(/\s+/)[0];
  return (first.length >= 2 ? first : t).slice(0, 20);
}

export function correctionMemory(title, cat, catLabel, now = Date.now()) {
  const word = keyWord(title);
  return {
    key: `inbox:${word}`, id: `inbox:${word}`, kind: 'inbox', source: 'corrected', status: 'on',
    text: `"${word}" จัดเป็น${catLabel}`, why: `เคยย้าย "${title}" ไปหมวด${catLabel}`, value: { word, cat }, at: now, updatedAt: now,
  };
}

export const inboxRules = (active) => active.filter((i) => i.kind === 'inbox' && i.value?.word).map((i) => i.value);

// Apply learned words to freshly parsed inbox items (the longest word wins).
export function applyInboxRules(items, rules) {
  if (!rules.length) return items;
  const sorted = [...rules].sort((a, b) => b.word.length - a.word.length);
  return items.map((it) => {
    const r = sorted.find((x) => (it.raw ?? it.title ?? '').includes(x.word));
    return r && r.cat !== it.cat ? { ...it, cat: r.cat, conf: 'high', learned: true } : it;
  });
}
