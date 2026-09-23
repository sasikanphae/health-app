import { DEFAULT_CHECKLIST } from './data.js';
import { emptyDay, dateKey, addDays } from './health.js';

export const STORAGE_KEY = 'health-app:v2';
const LEGACY_KEY = 'health-app:v1';

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function defaultState() {
  return {
    version: 2,
    days: {},
    settings: {
      waterGoal: 8,
      gymDays: [1, 3, 5],
      reminders: [
        { id: 'r-checkin', type: 'checkin', time: '07:30', enabled: true },
        { id: 'r-water1', type: 'water', time: '10:00', enabled: true },
        { id: 'r-water2', type: 'water', time: '14:00', enabled: true },
        { id: 'r-water3', type: 'water', time: '17:00', enabled: true },
        { id: 'r-gym', type: 'gym', time: '17:30', enabled: true },
        { id: 'r-mood', type: 'mood', time: '20:30', enabled: true },
      ],
    },
    checklist: DEFAULT_CHECKLIST.map((text, i) => ({ id: `c${i + 1}`, text })),
    machines: {},
    reminderLog: {},
  };
}

// Fill in anything missing so older or hand-edited data keeps working.
export function normalize(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;
  const state = {
    ...base,
    ...raw,
    settings: { ...base.settings, ...raw.settings },
    days: {},
  };
  for (const [key, day] of Object.entries(raw.days ?? {})) {
    state.days[key] = { ...emptyDay(), ...day };
  }
  return state;
}

// v1 stored { profile, log: { date: { water, mood, steps, sleep, weight } } }.
export function migrateV1(v1) {
  const state = defaultState();
  for (const [key, entry] of Object.entries(v1?.log ?? {})) {
    state.days[key] = { ...emptyDay(), water: entry.water ?? 0, mood: entry.mood ?? null };
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
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) return migrateV1(JSON.parse(legacy));
  } catch { /* corrupted or unavailable storage: start fresh */ }
  return defaultState();
}

export function save(state) {
  pruneReminderLog(state);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
