// "อุปกรณ์ของฉัน": what equipment each place really has (home, the usual gym,
// any other), what each exercise needs, and how a workout is filtered so it
// only ever suggests exercises the user can actually do there.
// Pure functions only — tested in tests/equipment.test.js.
import { MACHINES, ALTERNATIVES, HOME_EXERCISES, ROUTINES } from './gym-data.js';

export const EQUIPMENT = {
  mat: { label: 'เสื่อ', group: 'basic' },
  bench: { label: 'ม้านั่ง', group: 'basic' },
  bottle: { label: 'ขวดน้ำ / ของหนักในบ้าน', group: 'basic' },
  dumbbell: { label: 'ดัมเบล', group: 'free' },
  barbell: { label: 'บาร์เบล + แร็ค', group: 'free' },
  kettlebell: { label: 'เคตเทิลเบล', group: 'free' },
  band: { label: 'ยางยืด', group: 'strap' },
  trx: { label: 'TRX / สายแขวน', group: 'strap' },
  ...Object.fromEntries(MACHINES.map((m) => [`m:${m.id}`, { label: m.th, group: 'machine' }])),
  smith: { label: 'Smith Machine', group: 'machine' },
  'assist-pullup': { label: 'เครื่องช่วยโหน', group: 'machine' },
  cable: { label: 'สถานีเคเบิล', group: 'machine' },
  bike: { label: 'จักรยานปั่น', group: 'machine' },
  elliptical: { label: 'เครื่องเดินวงรี', group: 'machine' },
};

export const EQUIP_GROUPS = [
  ['basic', 'พื้นฐาน'],
  ['free', 'น้ำหนักอิสระ'],
  ['strap', 'ยางยืด / สายแขวน'],
  ['machine', 'เครื่องในยิม'],
];

// A typical gym, used until the user says what theirs has.
export const TYPICAL_GYM = [
  ...MACHINES.map((m) => `m:${m.id}`), 'smith', 'assist-pullup', 'cable', 'bike', 'elliptical',
  'dumbbell', 'barbell', 'bench', 'mat',
];

export function defaultPlaces() {
  return [
    { id: 'home', name: 'ที่บ้าน', kind: 'home', equip: ['mat', 'bottle'], configured: false },
    { id: 'gym', name: 'ยิมที่ไปประจำ', kind: 'gym', equip: [...TYPICAL_GYM], configured: false },
  ];
}

// What each exercise needs: a list of options, any one of which is enough.
// [[]] = nothing but the body. Anything not listed needs nothing.
export const NEEDS = {
  ...Object.fromEntries(MACHINES.map((m) => [m.id, [[`m:${m.id}`]]])),
  'goblet-squat': [['dumbbell'], ['kettlebell']],
  'smith-squat': [['smith']],
  'barbell-squat': [['barbell']],
  'split-squat': [[]],
  'step-up': [['bench']],
  'db-rdl': [['dumbbell'], ['kettlebell'], ['barbell']],
  'kb-swing': [['kettlebell']],
  'glute-bridge-alt': [[]],
  'db-bench': [['dumbbell', 'bench']],
  'band-chest-press': [['band']],
  'pushup-alt': [[]],
  'assisted-pullup': [['assist-pullup']],
  'band-pulldown': [['band']],
  'db-row': [['dumbbell']],
  'cable-row': [['cable']],
  'trx-row': [['trx']],
  'band-row': [['band']],
  'db-shoulder-press': [['dumbbell']],
  'kb-press': [['kettlebell']],
  'lateral-raise': [['dumbbell'], ['band']],
  bike: [['bike']],
  elliptical: [['elliptical']],
  'bottle-row': [['bottle'], ['dumbbell'], ['kettlebell']],
  'bottle-press': [['bottle'], ['dumbbell'], ['kettlebell']],
};

export function canDo(id, equip) {
  const have = new Set(equip);
  const options = NEEDS[id] ?? [[]];
  return options.some((opt) => opt.every((e) => have.has(e)));
}

// The equipment an exercise uses at best, in words (for the library).
export function needsText(id) {
  const options = NEEDS[id] ?? [[]];
  if (options.some((o) => !o.length)) return 'ไม่ต้องใช้อุปกรณ์';
  return options.map((o) => o.map((e) => EQUIPMENT[e]?.label ?? e).join(' + ')).join(' หรือ ');
}

// Stand-ins, in order of preference: the machine's own alternatives first,
// then other moves for the same muscles. Bodyweight moves come last so
// there is always something.
const EXTRA = {
  'leg-press': ['split-squat', 'squat'],
  'leg-extension': ['lunge', 'squat'],
  'leg-curl': ['glute-bridge'],
  'chest-press': ['pushup'],
  'lat-pulldown': ['trx-row', 'band-row', 'bottle-row'],
  'seated-row': ['db-row', 'bottle-row'],
  'shoulder-press': ['bottle-press', 'band-chest-press'],
  treadmill: [],
  'bottle-row': ['db-row', 'trx-row', 'band-row', 'band-pulldown'],
  'bottle-press': ['db-shoulder-press', 'kb-press', 'pushup'],
};

export function substitutes(id) {
  const m = MACHINES.find((x) => x.id === id);
  return [...(m?.alternatives ?? []), ...(EXTRA[id] ?? [])];
}

// Stand-ins that work with this equipment (for "machine is taken").
export function playableSubstitutes(id, equip, exclude = []) {
  return substitutes(id).filter((s) => !exclude.includes(s) && canDo(s, equip));
}

const BODYWEIGHT = { lower: ['squat', 'lunge', 'glute-bridge', 'calf-raise'], upper: ['pushup', 'plank'], full: ['squat', 'pushup', 'glute-bridge', 'plank'] };

// Today's exercise list, filtered to this place. Each item keeps the planned
// id (`planned`) when it had to be swapped. Returns { items, swapped, dropped }.
export function resolveItems(items, equip, { focus = null, kind = null } = {}) {
  const out = [];
  let swapped = 0;
  let dropped = 0;
  const used = () => out.map((i) => i.id);
  for (const item of items) {
    if (canDo(item.id, equip)) {
      out.push(item);
      continue;
    }
    const sub = playableSubstitutes(item.id, equip, used())[0];
    if (sub) {
      out.push({ ...item, id: sub, planned: item.id });
      swapped++;
    } else if (item.role === 'main' && item.id === 'treadmill') {
      out.push({ ...item, id: 'indoor-light', planned: item.id });
      swapped++;
    } else dropped++;
  }
  // A strength day with nothing left becomes a bodyweight session for the same muscles.
  if (kind === 'strength' && !out.some((i) => i.role === 'main')) {
    for (const id of BODYWEIGHT[focus] ?? BODYWEIGHT.full) out.push({ id, role: 'main', planned: null });
  }
  return { items: out, swapped, dropped };
}

// Every exercise the library can show, with its muscles.
export function allExercises() {
  const list = [];
  for (const m of MACHINES) list.push({ id: m.id, kind: 'machine', name: m.th, sub: m.name, muscles: m.muscles, type: m.type });
  for (const [id, a] of Object.entries(ALTERNATIVES)) {
    const parent = MACHINES.find((m) => m.alternatives.includes(id));
    list.push({ id, kind: 'alt', name: a.name, sub: a.equip, muscles: parent?.muscles ?? { primary: [], secondary: [] }, type: parent?.type ?? 'strength' });
  }
  for (const [id, h] of Object.entries(HOME_EXERCISES)) list.push({ id, kind: 'home', name: h.name, sub: 'ที่บ้าน', muscles: h.muscles, type: 'strength' });
  for (const id of ['indoor-light', 'mobility']) list.push({ id, kind: 'routine', name: ROUTINES[id].name, sub: 'ที่ไหนก็ได้', muscles: { primary: [], secondary: [] }, type: 'cardio' });
  return list;
}

export function filterLibrary(list, { equip = null, muscle = null } = {}) {
  return list.filter((x) => (!equip || canDo(x.id, equip))
    && (!muscle || x.muscles.primary.includes(muscle) || x.muscles.secondary.includes(muscle)));
}
