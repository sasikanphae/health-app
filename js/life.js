// Everyday helper: to-dos and appointments, monthly bills, quick expenses,
// leave-the-house checklists and the shopping list. Pure functions only —
// tested in tests/life.test.js.
import { addDays, timeOn, reminderState } from './health.js';

export const EVENT_KINDS = {
  work: { label: 'งาน', icon: 'briefcase' },
  appt: { label: 'นัดหมาย', icon: 'calendar' },
  personal: { label: 'ธุระส่วนตัว', icon: 'list' },
};

// Health appointments suggest the "ไปหาหมอ" checklist on the day.
export const APPT_TYPES = {
  doctor: { label: 'หาหมอ', leave: 'doctor' },
  checkup: { label: 'ตรวจสุขภาพ', leave: 'doctor' },
  vaccine: { label: 'ฉีดวัคซีน', leave: 'doctor' },
  dentist: { label: 'หาหมอฟัน', leave: 'doctor' },
  other: { label: 'อื่นๆ', leave: null },
};

// Minutes before a timed item that the reminder fires.
export const DEFAULT_LEAD = { work: 15, personal: 15, appt: 60 };

export const EXPENSE_CATS = {
  food: { label: 'อาหาร', icon: 'meal' },
  travel: { label: 'เดินทาง', icon: 'bus' },
  stuff: { label: 'ของใช้', icon: 'bag' },
  bill: { label: 'บิล', icon: 'receipt' },
  fun: { label: 'พักผ่อน', icon: 'sparkle' },
  gym: { label: 'ฟิตเนส', icon: 'dumbbell', health: true },
  supplement: { label: 'อาหารเสริม', icon: 'pill', health: true },
  doctor: { label: 'หาหมอ/ยา', icon: 'medic', health: true },
  other: { label: 'อื่นๆ', icon: 'coin' },
};
export const HEALTH_CATS = Object.keys(EXPENSE_CATS).filter((k) => EXPENSE_CATS[k].health);

export const DEFAULT_LEAVE_LISTS = [
  {
    id: 'work', name: 'ไปทำงาน', icon: 'briefcase',
    items: ['กุญแจบ้าน', 'กระเป๋าเงิน', 'บัตรพนักงาน', 'โน้ตบุ๊ก + ที่ชาร์จ', 'ขวดน้ำ'],
  },
  {
    id: 'doctor', name: 'ไปหาหมอ', icon: 'medic',
    items: ['บัตรประชาชน', 'บัตรประกัน / สิทธิ์รักษา', 'ใบนัด', 'ยาที่กินอยู่', 'จดอาการและคำถามที่อยากถาม'],
  },
];

// ---------- events (work, appointments, errands) ----------

// Timed items first by time; items without a time go first ("ทั้งวัน").
export function eventsOn(events, key) {
  return events
    .filter((e) => e.date === key)
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
}

export function upcomingAppointments(events, today, days = 90) {
  const until = addDays(today, days);
  return events
    .filter((e) => e.kind === 'appt' && !e.done && e.date >= today && e.date <= until)
    .sort((a, b) => `${a.date}${a.time ?? ''}`.localeCompare(`${b.date}${b.time ?? ''}`));
}

// ---------- bills (repeat every month on the same day) ----------

export const monthOf = (key) => key.slice(0, 7);

export function addMonths(ym, n) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function daysInMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

// Due day 31 in a 30-day month is the 30th, and so on.
export function billDueOn(bill, ym) {
  const day = Math.min(bill.day, daysInMonth(ym));
  return `${ym}-${String(day).padStart(2, '0')}`;
}

export function daysBetween(from, to) {
  return Math.round((new Date(`${to}T00:00:00`) - new Date(`${from}T00:00:00`)) / 86_400_000);
}

// The bill cycle that matters today: last month's if still unpaid, else this
// month's; once this month is paid (or the bill was added after this month's
// due date) the next month's.
export function billCycle(bill, today) {
  const paid = bill.paid ?? {};
  const created = bill.createdOn ?? today;
  const ym = monthOf(today);
  const prev = addMonths(ym, -1);
  const prevDue = billDueOn(bill, prev);
  let cycle;
  if (prevDue >= created && !paid[prev]) cycle = prev;
  else if (paid[ym]) return { ym, due: billDueOn(bill, ym), paid: true, status: 'paid', next: billDueOn(bill, addMonths(ym, 1)) };
  else if (billDueOn(bill, ym) >= created) cycle = ym;
  else cycle = addMonths(ym, 1);
  const due = billDueOn(bill, cycle);
  const daysLeft = daysBetween(today, due);
  const lead = bill.lead ?? 3;
  const status = daysLeft < 0 ? 'overdue' : daysLeft === 0 ? 'today' : daysLeft <= lead ? 'soon' : 'later';
  return { ym: cycle, due, paid: false, status, daysLeft };
}

// ---------- reminders for events and bills ----------

// Everything that should be reminding the user right now (before snooze/skip).
// repeat:false marks heads-ups (the evening before, bills still days away):
// they notify once and are not repeated through the day.
export function lifeCandidates({ events, bills, today, now, evening = '19:00', morning = '08:00', billTime = '09:00' }) {
  const out = [];
  const tomorrow = addDays(today, 1);
  for (const e of events) {
    if (e.done || e.remind === false) continue;
    if (e.date === today) {
      if (e.time) {
        const lead = e.lead ?? DEFAULT_LEAD[e.kind] ?? 15;
        out.push({ id: `ev:${e.id}`, kind: 'event', ref: e.id, at: timeOn(today, e.time) - lead * 60_000, repeat: true, stage: 'soon' });
      } else if (e.kind === 'appt') {
        out.push({ id: `ev:${e.id}`, kind: 'event', ref: e.id, at: timeOn(today, morning), repeat: true, stage: 'today' });
      }
    } else if (e.kind === 'appt' && e.date === tomorrow) {
      out.push({ id: `ev:${e.id}:eve`, kind: 'event', ref: e.id, at: timeOn(today, evening), repeat: false, stage: 'tomorrow' });
    }
  }
  for (const b of bills) {
    const c = billCycle(b, today);
    if (c.paid || c.status === 'later') continue;
    out.push({
      id: `bill:${b.id}:${c.ym}`, kind: 'bill', ref: b.id, at: timeOn(today, billTime),
      repeat: c.daysLeft <= 0, stage: c.status, due: c.due, daysLeft: c.daysLeft,
    });
  }
  return out.filter((c) => c.at <= now).sort((a, b) => a.at - b.at);
}

export function lifeDue({ events, bills, today, now, log = {}, repeatMs = 0 }) {
  const due = [];
  for (const c of lifeCandidates({ events, bills, today, now })) {
    const st = reminderState(log[c.id], now, c.repeat ? repeatMs : 0);
    if (st) due.push({ ...c, notify: st.notify });
  }
  return due;
}

// ---------- expenses ----------

export function expenseSummary(expenses, ym) {
  const inMonth = expenses.filter((x) => x.date.startsWith(ym));
  const sums = {};
  for (const x of inMonth) {
    const s = (sums[x.cat] ??= { cat: x.cat, amount: 0, count: 0 });
    s.amount += x.amount;
    s.count += 1;
  }
  const byCat = Object.values(sums).sort((a, b) => b.amount - a.amount);
  const total = byCat.reduce((t, s) => t + s.amount, 0);
  const healthByCat = byCat.filter((s) => EXPENSE_CATS[s.cat]?.health);
  const health = { total: healthByCat.reduce((t, s) => t + s.amount, 0), byCat: healthByCat };
  return { total, byCat, health, count: inMonth.length };
}

// Amounts typed as "120", "1,200" or "99.50".
export function parseAmount(text) {
  const n = Number(String(text ?? '').replace(/[,\s฿]/g, ''));
  return Number.isFinite(n) && n > 0 && n < 10_000_000 ? Math.round(n * 100) / 100 : null;
}

// ---------- shopping: meal plan + household items in one list ----------

export function combinedShopping({ planItems, planTicked = [], custom = [] }) {
  const ticked = new Set(planTicked);
  const plan = planItems.map((i) => ({
    key: `plan:${i.name}`, name: i.name, from: 'plan', count: i.count, staple: !!i.staple, done: ticked.has(i.name),
  }));
  const home = custom.map((c) => ({ key: `home:${c.id}`, id: c.id, name: c.text, from: 'home', done: !!c.done }));
  const rank = (i) => (i.done ? 2 : i.staple ? 1 : 0);
  return [...home, ...plan].sort((a, b) => rank(a) - rank(b));
}
