// "โยนไว้ก่อน": turn whatever the user types or says into tidy items.
// One sentence can hold several things ("พรุ่งนี้บ่ายสองไปโรงพยาบาล แล้วก่อน
// ออกจากบ้านอย่าลืมซื้ออาหารแมว") — it is split into clauses, each clause gets
// a date/time and a category. Everything runs on-device with simple Thai
// keyword rules; the user always sees (and can fix) the result.
// Pure functions only — tested in tests/inbox.test.js.
import { addDays, parseKey, dateKey } from './health.js';
import { isTold } from './memory.js';

export const INBOX_CATS = {
  appt: { label: 'ปฏิทิน / นัด', icon: 'calendar' },
  remind: { label: 'การเตือน', icon: 'bell' },
  work: { label: 'งาน', icon: 'briefcase' },
  shop: { label: 'ของที่ต้องซื้อ', icon: 'cart' },
  money: { label: 'การเงิน', icon: 'wallet' },
  health: { label: 'บันทึกสุขภาพ', icon: 'heart' },
  idea: { label: 'ไอเดีย', icon: 'sparkle' },
  memory: { label: 'ให้แมวจำไว้', icon: 'pen' },
};

// ---------- numbers and times ----------

const WORD_NUM = [
  ['สิบเอ็ด', 11], ['สิบสอง', 12], ['สิบ', 10], ['หนึ่ง', 1], ['นึง', 1], ['สอง', 2], ['สาม', 3], ['สี่', 4],
  ['ห้า', 5], ['หก', 6], ['เจ็ด', 7], ['แปด', 8], ['เก้า', 9],
];
const N = `(\\d{1,2}|${WORD_NUM.map(([w]) => w).join('|')})`;
const num = (s) => (s == null || s === '' ? null : /^\d+$/.test(s) ? Number(s) : WORD_NUM.find(([w]) => w === s)?.[1] ?? null);
const hm = (h, m = 0) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
const half = (s) => (s ? 30 : 0);

// Each rule: [regex, (match) => 'HH:MM' | null]. First match wins.
const TIME_RULES = [
  [/(\d{1,2})[:.](\d{2})(?!\d)(?!\s*บาท)\s*(?:น\.|นาฬิกา)?/, (m) => (+m[1] < 24 && +m[2] < 60 ? hm(+m[1], +m[2]) : null)],
  [/เที่ยงคืน/, () => '00:00'],
  [/เที่ยง(ครึ่ง)?(?!คืน)/, (m) => hm(12, half(m[1]))],
  [new RegExp(`บ่าย\\s*${N}?\\s*(โมง)?\\s*(ครึ่ง)?`), (m) => {
    const n = num(m[1]);
    if (n == null && !m[2]) return null; // plain "บ่าย" is handled as a period below
    return hm(12 + (n ?? 1), half(m[3]));
  }],
  [new RegExp(`${N}?\\s*ทุ่ม\\s*(ครึ่ง)?`), (m) => hm(18 + (num(m[1]) ?? 1), half(m[2]))],
  [new RegExp(`ตี\\s*${N}\\s*(ครึ่ง)?`), (m) => (num(m[1]) <= 5 ? hm(num(m[1]), half(m[2])) : null)],
  [new RegExp(`${N}?\\s*โมง\\s*(เช้า|เย็น)?\\s*(ครึ่ง)?`), (m) => {
    const n = num(m[1]);
    const part = m[2];
    if (n == null) return part === 'เช้า' ? hm(7, half(m[3])) : null; // "โมงเช้า" = 7 am
    if (part === 'เย็น') return n <= 6 ? hm(n + 12, half(m[3])) : null;
    if (part === 'เช้า') return hm(n <= 5 ? n + 6 : n, half(m[3])); // สามโมงเช้า = 9 am
    return hm(n >= 6 ? n : n + 12, half(m[3])); // สี่โมง = 4 pm, เก้าโมง = 9 am
  }],
];

// Parts of the day when no exact time was said.
const PERIODS = [
  [/เช้านี้|ตอนเช้า|พรุ่งนี้เช้า/, '09:00'], [/ตอนสาย|สายๆ/, '10:30'], [/ตอนบ่าย|บ่ายนี้|บ่ายๆ|พรุ่งนี้บ่าย/, '14:00'],
  [/ตอนเย็น|เย็นนี้|พรุ่งนี้เย็น/, '18:00'], [/ตอนค่ำ|คืนนี้|ตอนกลางคืน/, '20:00'],
];

export function parseTime(text, now = null) {
  const rel = text.match(new RegExp(`อีก\\s*(ครึ่ง|${N})\\s*(นาที|ชั่วโมง|ชม\\.?)`));
  if (rel && now != null) {
    const n = rel[1] === 'ครึ่ง' ? 0.5 : num(rel[2]);
    const mins = rel[3] === 'นาที' ? n : n * 60;
    const d = new Date(now + mins * 60_000);
    return { time: hm(d.getHours(), d.getMinutes()), match: rel[0], date: dateKey(d) };
  }
  for (const [re, fn] of TIME_RULES) {
    const m = text.match(re);
    const time = m && fn(m);
    if (time) return { time, match: m[0] };
  }
  for (const [re, time] of PERIODS) {
    const m = text.match(re);
    if (m) return { time, match: m[0], fuzzy: true };
  }
  return null;
}

// ---------- dates ----------

const WEEKDAYS = [['อาทิตย์', 0], ['จันทร์', 1], ['อังคาร', 2], ['พุธ', 3], ['พฤหัสบดี', 4], ['พฤหัส', 4], ['ศุกร์', 5], ['เสาร์', 6]];
const MONTHS = [
  ['มกราคม', 1], ['กุมภาพันธ์', 2], ['มีนาคม', 3], ['เมษายน', 4], ['พฤษภาคม', 5], ['มิถุนายน', 6], ['กรกฎาคม', 7],
  ['สิงหาคม', 8], ['กันยายน', 9], ['ตุลาคม', 10], ['พฤศจิกายน', 11], ['ธันวาคม', 12],
  ['ม.ค.', 1], ['ก.พ.', 2], ['มี.ค.', 3], ['เม.ย.', 4], ['พ.ค.', 5], ['มิ.ย.', 6], ['ก.ค.', 7], ['ส.ค.', 8],
  ['ก.ย.', 9], ['ต.ค.', 10], ['พ.ย.', 11], ['ธ.ค.', 12],
];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function parseDate(text, today) {
  let m;
  if ((m = text.match(/มะรืน(นี้)?/))) return { date: addDays(today, 2), match: m[0] };
  if ((m = text.match(/พรุ่งนี้/))) return { date: addDays(today, 1), match: m[0] };
  if ((m = text.match(/วันนี้|คืนนี้|เย็นนี้|เช้านี้|บ่ายนี้/))) return { date: today, match: m[0].startsWith('วัน') ? m[0] : '' };
  const monthRe = MONTHS.map(([w]) => esc(w)).join('|');
  if ((m = text.match(new RegExp(`(?:วันที่\\s*)?(\\d{1,2})\\s*(${monthRe})`)))) {
    const month = MONTHS.find(([w]) => w === m[2])[1];
    const t = parseKey(today);
    let y = t.getFullYear();
    let key = dateKey(new Date(y, month - 1, +m[1]));
    if (key < today) key = dateKey(new Date(++y, month - 1, +m[1]));
    return { date: key, match: m[0] };
  }
  if ((m = text.match(/วันที่\s*(\d{1,2})/))) {
    const t = parseKey(today);
    let key = dateKey(new Date(t.getFullYear(), t.getMonth(), +m[1]));
    if (key < today) key = dateKey(new Date(t.getFullYear(), t.getMonth() + 1, +m[1]));
    return { date: key, match: m[0] };
  }
  if ((m = text.match(/(?<!วัน)(สัปดาห์|อาทิตย์)หน้า/))) {
    const cur = parseKey(today).getDay();
    return { date: addDays(today, 7 - ((cur + 6) % 7)), match: m[0] };
  }
  const wdRe = WEEKDAYS.map(([w]) => w).join('|');
  if ((m = text.match(new RegExp(`(?:วัน)?(${wdRe})(\\s*หน้า)?`)))) {
    const target = WEEKDAYS.find(([w]) => w === m[1])[1];
    const cur = parseKey(today).getDay();
    let delta = (target - cur + 7) % 7;
    if (m[2]) {
      // "ศุกร์หน้า" = that day in next week (weeks start on Monday)
      const monOffset = (cur + 6) % 7;
      const targetOffset = (target + 6) % 7;
      delta = 7 - monOffset + targetOffset;
    }
    return { date: addDays(today, delta), match: m[0] };
  }
  return null;
}

// ---------- money ----------

const AMOUNT_RE = /(\d[\d,]*(?:\.\d+)?)\s*(?:บาท|฿|บ\.)|฿\s*(\d[\d,]*(?:\.\d+)?)/;
export function parseAmount(text) {
  const m = text.match(AMOUNT_RE);
  if (m) {
    const n = Number((m[1] ?? m[2]).replace(/,/g, ''));
    return n > 0 ? { amount: n, match: m[0] } : null;
  }
  // "ค่าแท็กซี่ 120", "กาแฟ 65": a spending word followed by a bare number.
  const loose = text.match(/(\d[\d,]*(?:\.\d+)?)\s*$/);
  if (loose && !/ซื้อ|โมง|ทุ่ม|นาฬิกา|วันที่|:/.test(text) && (/^ค่า/.test(text) || guessExpense(text) !== 'other')) {
    const n = Number(loose[1].replace(/,/g, ''));
    return n > 0 ? { amount: n, match: loose[0] } : null;
  }
  return null;
}

const EXPENSE_GUESS = [
  ['bill', /ค่าไฟ|ค่าน้ำประปา|ค่าเน็ต|ค่าโทร|บัตรเครดิต|ค่าเช่า|ประกัน|ค่าส่วนกลาง/],
  ['gym', /ยิม|ฟิตเนส|เทรนเนอร์|คลาส(?:โยคะ|ออกกำลัง)?|โยคะ/],
  ['supplement', /วิตามิน|เวย์|อาหารเสริม|คอลลาเจน|โปรตีน|น้ำมันปลา/],
  ['doctor', /หมอ|ยา|โรงพยาบาล|คลินิก|ทำฟัน|ตรวจ/],
  ['travel', /แท็กซี่|taxi|วิน|รถ|bts|mrt|น้ำมัน|grab|bolt|ทางด่วน|เดินทาง|ตั๋ว/i],
  ['stuff', /แชมพู|สบู่|ทิชชู่|ของใช้|ผงซักฟอก|ยาสีฟัน|น้ำยา/],
  ['fun', /หนัง|เกม|คอนเสิร์ต|เที่ยว|ของขวัญ/],
  ['food', /ข้าว|กาแฟ|ชา|อาหาร|ขนม|ก๋วยเตี๋ยว|ส้มตำ|มื้อ|ชานม|น้ำดื่ม|ผลไม้|หมูกระทะ|บุฟเฟ่ต์/],
];
export const guessExpense = (text) => EXPENSE_GUESS.find(([, re]) => re.test(text))?.[0] ?? 'other';

// ---------- categories ----------

const DOCTOR_RE = /หาหมอ|โรงพยาบาล|รพ\.|คลินิก|หมอฟัน|ทำฟัน|ขูดหินปูน|ตรวจสุขภาพ|ตรวจเลือด|ฉีดวัคซีน|วัคซีน|พบแพทย์|หมอนัด/;
const APPT_RE = /นัด|สัมภาษณ์|ตัดผม|ทำเล็บ/;
const SYMPTOM_RE = /ปวด|เจ็บ|เวียนหัว|มึนหัว|เป็นไข้|ตัวร้อน|ไอ(?!เดีย|ศกรีม|ติม|ที|แพด)|น้ำมูก|ท้องเสีย|ท้องผูก|คลื่นไส้|นอนไม่หลับ|เมื่อย|ผื่น|คัน|เหนื่อยง่าย|ใจสั่น/;
const SHOP_RE = /ซื้อ|หมดแล้ว|หมดบ้าน|(?<=\S)หมด$|เติมของ/;
const IDEA_RE = /ไอเดีย|อยากลอง|น่าจะลอง|คิดว่าจะ|ลองทำ|บันทึกไว้|จดไว้/;
const WORK_RE = /ประชุม|ส่งงาน|รายงาน|งาน|อีเมล|เมล|ลูกค้า|พรีเซนต์|เดดไลน์|deadline|meeting|สไลด์|โปรเจกต์|เอกสาร/i;
const REMIND_RE = /โทร|อย่าลืม|เตือน|ไปรับ|ส่งของ|พัสดุ|รดน้ำ|กินยา|จ่าย|โอน|คืน|จอง|ต่ออายุ|ไปส่ง/;

const BODY = [['back', /หลัง|เอว/], ['legs', /ขา|เข่า|น่อง|ก้น|สะโพก/], ['shoulders', /ไหล่|บ่า|คอ(?!ย)/], ['arms', /แขน|ข้อมือ|ศอก/], ['chest', /หน้าอก|อก/], ['core', /ท้อง/]];

function apptType(text) {
  if (/ฟัน|หินปูน/.test(text)) return 'dentist';
  if (/วัคซีน/.test(text)) return 'vaccine';
  if (/ตรวจสุขภาพ|ตรวจเลือด/.test(text)) return 'checkup';
  if (DOCTOR_RE.test(text)) return 'doctor';
  return 'other';
}

// Filler that shouldn't end up in a title.
const FILLER = [/^(?:แล้ว|ก็|และ|คือ|จะ)\s*/, /ช่วยเตือน(?:ให้)?(?:หน่อย)?/, /เตือน(?:ให้)?(?:หน่อย)?/, /อย่าลืม/, /ต้อง/, /(?:ด้วย|หน่อย)?(?:นะ|น้า|นะคะ|นะครับ|ครับ|ค่ะ|คะ)$/, /ด้วย$/, /หน่อย$/];
function tidy(text, remove = []) {
  let t = text;
  for (const r of remove) if (r) t = t.replace(r, ' ');
  for (const f of FILLER) t = t.replace(f, ' ');
  return t.replace(/\s+/g, ' ').trim();
}

// ---------- splitting ----------

const STARTERS = 'ก่อน|ต้อง|พรุ่งนี้|มะรืน|วันนี้|คืนนี้|ซื้อ|โทร|จ่าย|นัด|อย่าลืม|ช่วย|ไป';
const SPLIT_RE = new RegExp(`\\s*(?:\\n|;|,|\\sและ\\s|และ(?=\\s*(?:${STARTERS}))|แล้วก็|แล้ว(?=\\s*(?:${STARTERS}))|อีกเรื่อง(?:คือ)?)\\s*`);
const SOFT_SPLIT_RE = /\s+(?=ซื้อ|โทร|จ่าย|นัด|อย่าลืม|พรุ่งนี้|มะรืน)/;

export function splitClauses(text) {
  return text.split(SPLIT_RE)
    .flatMap((c) => (c ?? '').split(SOFT_SPLIT_RE))
    .map((c) => c.trim())
    .filter((c) => c.length > 1);
}

// ---------- one clause → item(s) ----------

function classify(clause, { date, time, amount }) {
  if (isTold(clause)) return { cat: 'memory', conf: 'high' };
  if (IDEA_RE.test(clause) && !date && !time && !amount) return { cat: 'idea', conf: 'high' };
  if ((DOCTOR_RE.test(clause) || APPT_RE.test(clause)) && !SHOP_RE.test(clause)) return { cat: 'appt', conf: date ? 'high' : 'mid' };
  if (amount) return { cat: 'money', conf: 'high' };
  if (SYMPTOM_RE.test(clause) && !time) return { cat: 'health', conf: 'high' };
  if (SHOP_RE.test(clause)) return { cat: 'shop', conf: 'high' };
  if (WORK_RE.test(clause)) return { cat: 'work', conf: 'high' };
  if (REMIND_RE.test(clause) || date || time) return { cat: 'remind', conf: 'high' };
  return { cat: 'idea', conf: 'low' };
}

// Shopping clauses can list several things: "ซื้อแชมพู สบู่ กับยาสีฟัน".
function shopItems(clause, remove) {
  let t = tidy(clause, remove);
  t = t.replace(/^.*?ซื้อ\s*/, '').replace(/(?:หมดแล้ว|หมดบ้าน|หมด)$/, '').replace(/^(?:ก่อนออกจากบ้าน|ก่อนออกไป|ก่อนกลับบ้าน)\s*/, '');
  return t.split(/\s*(?:กับ|และ|,|\s)\s*/).map((s) => s.trim()).filter((s) => s.length > 1);
}

export function parseInbox(text, { today, now = null } = {}) {
  const items = [];
  let ctx = { date: null, time: null };
  for (const clause of splitClauses(String(text ?? ''))) {
    const d = parseDate(clause, today);
    const t = parseTime(clause, now);
    const a = parseAmount(clause);
    const beforeLeaving = /ก่อนออกจากบ้าน|ก่อนออกไป|ก่อนไป/.test(clause);
    const date = t?.date ?? d?.date ?? (t && ctx.date) ?? null;
    const { cat, conf } = classify(clause, { date, time: t?.time, amount: a });
    const remove = [d?.match, t?.match, a?.match].filter(Boolean);
    const base = { date, time: t?.time ?? null, raw: clause, conf };

    if (cat === 'shop') {
      const names = shopItems(clause, remove);
      for (const name of names.length ? names : [tidy(clause, remove)]) items.push({ ...base, cat: 'shop', title: name, date: null, time: null });
      // "ก่อนออกจากบ้าน…" right after a timed plan: also remind an hour before leaving.
      if (beforeLeaving && ctx.time) {
        const [h, m] = ctx.time.split(':').map(Number);
        const mins = Math.max(6 * 60, h * 60 + m - 60);
        items.push({ ...base, cat: 'remind', title: `ซื้อ${names.join(' ')} ก่อนออกจากบ้าน`, date: ctx.date, time: hm(Math.floor(mins / 60), mins % 60) });
      }
    } else if (cat === 'money') {
      const title = tidy(clause, remove) || 'รายจ่าย';
      items.push({ ...base, cat, title, amount: a.amount, expCat: guessExpense(clause), date: date ?? today, time: null });
    } else if (cat === 'health') {
      const part = BODY.find(([, re]) => re.test(clause))?.[0] ?? null;
      items.push({ ...base, cat, title: tidy(clause, [d?.match]), part, date: date ?? today, time: null });
    } else if (cat === 'memory') {
      items.push({ ...base, cat, title: clause.trim(), date: null, time: null });
    } else if (cat === 'idea') {
      items.push({ ...base, cat, title: tidy(clause), date: null, time: null });
    } else {
      const title = tidy(clause, remove) || clause;
      items.push({ ...base, cat, title, apptType: cat === 'appt' ? apptType(clause) : null, date: date ?? (cat === 'appt' ? null : today) });
    }
    if (date) ctx = { date, time: t?.time ?? null };
  }
  return items;
}

// One thing with nothing missing is filed straight away (an unclear one is
// kept as an idea; the user can move it with one tap). Several things, or an
// appointment without a date, get the check-before-saving sheet.
export function needsReview(items) {
  if (items.length !== 1) return true;
  const [i] = items;
  return (i.cat === 'appt' && !i.date) || (i.conf !== 'high' && i.cat !== 'idea');
}
