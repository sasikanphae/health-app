import { emptyDay, dateKey, addDays } from './health.js';
import { GYM_BAG } from './gym-data.js';
import { DEFAULT_LEAVE_LISTS } from './life.js';
import { defaultPlaces } from './equipment.js';

export const STORAGE_KEY = 'health-app:v3';
const V2_KEY = 'health-app:v2';
const V1_KEY = 'health-app:v1';
const REMINDER_TYPES = ['checkin', 'water', 'workout'];

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function defaultProfile(gymDays) {
  return {
    goal: 'fit',
    days: gymDays?.length ? [...gymDays] : [1, 3, 5],
    slot: 'evening',
    activities: ['gym', 'walk'],
    food: { mode: 'mix', allergies: [], avoid: [], budget: 'mid' },
    body: null, // { height, age, sex, activity, weightGoal } — weight lives in state.weights
  };
}

export function defaultState() {
  return {
    version: 3,
    profile: null, // set by the first-run questions
    days: {},
    settings: {
      waterGoal: 8,
      sound: true, // bell / wooden-fish sounds when something is done
      holyDays: true, // show วันพระ and suggest calm activities on those days
      repeatMin: 60, // re-send a reminder that was dismissed without being done (0 = off)
      learn: true, // pattern engine + habits (on-device only); can be turned off in Privacy
      mic: true, // show the microphone button (speech goes through the browser's own service)
      travel: { on: false }, // travel mode: { on, since, until|null }
      memory: true, // Cat Memory on/off (everything it remembers stays visible and deletable)
      memoryKinds: {}, // per-kind switches: { time, food, busy, forget, told, rule, inbox } (missing = on)
      why: true, // ask "ครั้งนี้เพราะอะไร?" after a plan slips twice
      whyMutedUntil: null,
      whyAskedOn: null,
      inboxAuto: true, // file clear inbox items straight away (off = always check first)
      assist: {}, // Phase 2B switches: { magic, autoArrange, whatNow, reschedule, context } (missing = on)
      gymPlace: 'gym', // which place a gym day happens at
      homePlace: 'home', // which place a home workout happens at
      reminders: [
        { id: 'r-checkin', type: 'checkin', time: '07:30', enabled: true },
        { id: 'r-water1', type: 'water', time: '10:00', enabled: true },
        { id: 'r-water2', type: 'water', time: '14:00', enabled: true },
        { id: 'r-workout', type: 'workout', time: '17:30', enabled: true },
      ],
    },
    checklist: GYM_BAG.map((text, i) => ({ id: `c${i + 1}`, text })),
    machines: {}, // id -> { seat, weight, note, updatedAt } (the latest settings)
    lifts: {}, // machine id -> [{ date, weight, sets, target, completed, intensity }]
    weights: [], // body weight log: [{ date, kg }]
    shopping: {}, // week start key -> [ticked item names]
    achClaimed: {}, // week start key -> [achievement ids the user collected]
    rewards: [], // [{ id, title, metric, target, start, claimedAt, nearNotified, doneNotified }]
    insightSeen: {}, // pattern id -> date the user said "got it"
    storySeen: null, // week start key of the last weekly story the user opened
    reminderLog: {},
    // everyday helper
    leaveLists: defaultLeaveLists(), // destinations other than the gym (its bag is `checklist`)
    events: [], // [{ id, kind: work|appt|personal, title, date, time|null, apptType?, done, doneAt? }]
    bills: [], // [{ id, title, day, amount|null, lead, createdOn, paid: { 'YYYY-MM': date } }]
    expenses: [], // [{ id, date, cat, amount, at }]
    notes: [], // [{ id, text, at, editedAt? }]
    shopList: [], // household items added by hand: [{ id, text, done }]
    places: defaultPlaces(), // "อุปกรณ์ของฉัน": [{ id, name, kind: home|gym, equip: [ids], configured }]
    memory: { items: [], forgotten: {}, refreshedOn: null }, // Cat Memory (see memory.js)
    whyLog: [], // answers to "ครั้งนี้เพราะอะไร?": [{ id, kind, key, date, ref, reason, context, at }]
    signals: [], // small events to learn from: [{ t: skip|snooze|late-bill, ref, date }]
    patternMuted: {}, // observation id -> true ("ไม่ต้องบอกเรื่องนี้อีก")
    inbox: [], // "โยนไว้ก่อน" history: [{ id, raw, item, ref: { type, id, date? }, at }]
    lastSpecial: null, // date of the last "special day" suggestion
    wrappedSeen: null, // 'YYYY-MM' of the last monthly story opened from Today
  };
}

export function defaultLeaveLists() {
  return DEFAULT_LEAVE_LISTS.map((l) => ({
    id: l.id, name: l.name, icon: l.icon, items: l.items.map((text, i) => ({ id: `${l.id}${i + 1}`, text })),
  }));
}

// Fill in anything missing so older or hand-edited data keeps working.
export function normalize(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;
  const state = {
    ...base,
    ...raw,
    version: 3,
    settings: { ...base.settings, ...raw.settings },
    days: {},
  };
  state.settings.reminders = state.settings.reminders.filter((r) => REMINDER_TYPES.includes(r.type));
  if (raw.profile) {
    const p = defaultProfile();
    state.profile = { ...p, ...raw.profile, food: { ...p.food, ...raw.profile.food } };
  }
  for (const [key, day] of Object.entries(raw.days ?? {})) {
    state.days[key] = { ...emptyDay(), ...day };
  }
  if (!Array.isArray(state.weights)) state.weights = [];
  for (const k of ['events', 'bills', 'expenses', 'notes', 'shopList', 'inbox', 'whyLog', 'signals']) {
    if (!Array.isArray(state[k])) state[k] = [];
  }
  if (!Array.isArray(state.leaveLists)) state.leaveLists = defaultLeaveLists();
  if (!Array.isArray(state.places) || !state.places.length) state.places = defaultPlaces();
  state.memory = { items: [], forgotten: {}, refreshedOn: null, ...(state.memory ?? {}) };
  if (!Array.isArray(state.memory.items)) state.memory.items = [];
  state.settings.memoryKinds ??= {};
  if (!state.patternMuted || typeof state.patternMuted !== 'object') state.patternMuted = {};
  for (const b of state.bills) b.paid ??= {};
  if (!Array.isArray(state.rewards)) state.rewards = [];
  if (!state.insightSeen || typeof state.insightSeen !== 'object') state.insightSeen = {};
  if (!state.lifts || typeof state.lifts !== 'object') state.lifts = {};
  // Machine weights saved before the lift log existed become its first entry.
  for (const [id, m] of Object.entries(state.machines)) {
    if (!state.lifts[id]?.length && Number.isFinite(m.weight) && m.weight > 0) {
      const date = m.updatedAt ? dateKey(new Date(m.updatedAt)) : dateKey();
      state.lifts[id] = [{ date, weight: m.weight, sets: null, target: null, completed: null, intensity: 'hard' }];
    }
  }
  return state;
}

// v2: days had water/checkin/prep; machines stored { fields: {label: value}, weight, note };
// reminders included mood and gym-prep types; settings.gymDays held the gym weekdays.
export function migrateV2(v2) {
  const state = defaultState();
  for (const [key, d] of Object.entries(v2?.days ?? {})) {
    state.days[key] = {
      ...emptyDay(),
      water: d.water ?? 0,
      waterAt: d.waterAt ?? [],
      checkin: d.checkin ?? null,
      mood: d.mood ?? null,
    };
  }
  for (const [id, m] of Object.entries(v2?.machines ?? {})) {
    const seat = Object.values(m.fields ?? {}).find(Boolean) ?? '';
    state.machines[id] = { seat, weight: m.weight ?? null, note: m.note ?? '', updatedAt: m.updatedAt ?? null };
  }
  if (v2?.settings?.waterGoal) state.settings.waterGoal = v2.settings.waterGoal;
  if (Array.isArray(v2?.checklist) && v2.checklist.length) state.checklist = v2.checklist;
  // Remembered so the first-run questions can start from the old gym days.
  state.legacyGymDays = v2?.settings?.gymDays ?? null;
  return normalize(state);
}

export function migrateV1(v1) {
  const state = defaultState();
  for (const [key, entry] of Object.entries(v1?.log ?? {})) {
    state.days[key] = { ...emptyDay(), water: entry.water ?? 0 };
  }
  return state;
}

// Reminder snooze/skip state only matters for today; drop older entries.
export function pruneReminderLog(state, today = dateKey()) {
  const keep = new Set([today, addDays(today, -1)]);
  for (const key of Object.keys(state.reminderLog)) {
    if (!keep.has(key)) delete state.reminderLog[key];
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw));
    const v2 = localStorage.getItem(V2_KEY);
    if (v2) return migrateV2(JSON.parse(v2));
    const v1 = localStorage.getItem(V1_KEY);
    if (v1) return migrateV1(JSON.parse(v1));
  } catch { /* corrupted or unavailable storage: start fresh */ }
  return defaultState();
}

export function save(state) {
  pruneReminderLog(state);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ---------- machine photos (IndexedDB: too big for localStorage) ----------

let dbPromise = null;
function db() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open('health-app', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('photos');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx(mode, fn) {
  const store = (await db()).transaction('photos', mode).objectStore('photos');
  return new Promise((resolve, reject) => {
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const photos = {
  put: (id, blob) => tx('readwrite', (s) => s.put(blob, id)),
  delete: (id) => tx('readwrite', (s) => s.delete(id)),
  async all() {
    const keys = await tx('readonly', (s) => s.getAllKeys());
    const out = {};
    for (const k of keys) out[k] = await tx('readonly', (s) => s.get(k));
    return out;
  },
};

// Shrink a camera photo so storage stays small (longest side 1000px, JPEG).
export async function resizePhoto(file, max = 1000) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
}
