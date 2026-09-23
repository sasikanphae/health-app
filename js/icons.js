// Single-weight line icons (24×24, stroke = currentColor). One visual language
// for the whole app: no fills, no colour of their own, same thin stroke everywhere.

const P = {
  lotus: '<path d="M12 19c-4 0-7-2.5-7-6 2.5 0 5 1.2 7 3.5 2-2.3 4.5-3.5 7-3.5 0 3.5-3 6-7 6Z"/><path d="M12 16.5c-1.6-1.8-2.2-4-2-6.5 1 .6 1.7 1.3 2 2 .3-.7 1-1.4 2-2 .2 2.5-.4 4.7-2 6.5Z"/><path d="M12 8V5"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  bowl: '<path d="M4 12h16a8 8 0 0 1-16 0Z"/><path d="M9 20h6M10 8c0-1.5 1-2 1-3.5M14 8c0-1.5 1-2 1-3.5"/>',
  dumbbell: '<path d="M6.5 8v8M17.5 8v8M4 10v4M20 10v4M6.5 12h11"/>',
  user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.8-3.8 3.6-6 7-6s6.2 2.2 7 6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
  sunrise: '<path d="M7 17a5 5 0 0 1 10 0M3 17h18M12 7V4M5.6 10.6 7 12M17 12l1.4-1.4M9.5 5.5 12 3l2.5 2.5"/>',
  sunset: '<path d="M7 17a5 5 0 0 1 10 0M3 17h18M12 4v4M5.6 10.6 7 12M17 12l1.4-1.4M9.5 5.5 12 8l2.5-2.5"/>',
  moon: '<path d="M19 14.5A7.5 7.5 0 1 1 9.5 5a6 6 0 0 0 9.5 9.5Z"/>',
  bed: '<path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="1.6"/>',
  drop: '<path d="M12 3.5c3 3.6 6 7 6 10.5a6 6 0 0 1-12 0c0-3.5 3-6.9 6-10.5Z"/>',
  steps: '<path d="M8 4.5c1.6 0 2.5 1.8 2.5 4S9.6 12 8 12s-2.5-1.3-2.5-3.5S6.4 4.5 8 4.5ZM16 10c1.6 0 2.5 1.8 2.5 4s-.9 3.5-2.5 3.5-2.5-1.3-2.5-3.5.9-4 2.5-4Z"/><path d="M6.5 15h3M14.5 20.5h3"/>',
  meal: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M16 3c-1.7 1-2.5 3-2.5 6H17V3Zm1 9v9"/>',
  stretch: '<circle cx="12" cy="5" r="1.8"/><path d="M5 9.5 12 10l7-.5M12 10v5l-4 5M12 15l4 5"/>',
  meditate: '<circle cx="12" cy="5.5" r="1.8"/><path d="M12 8.5v5M8 11.5l4 2 4-2M5 18.5c2-1.5 4.5-2 7-2s5 .5 7 2M7 16l3 2.5M17 16l-3 2.5"/>',
  walk: '<circle cx="13" cy="4.5" r="1.8"/><path d="m9 20 2.5-6 2.5 2v4M11.5 14l1-5-3.5 2-1.5 3M12.5 9l2.5 2.5 2.5.5"/>',
  run: '<circle cx="15" cy="4.5" r="1.8"/><path d="m6 20 3.5-3.5 2.5 1.5 1.5-4M8 11l3-3 3 1 2.5 3.5 2.5-.5M13.5 14l-2.5-2.5"/>',
  house: '<path d="M4 11 12 4l8 7v9H4Z"/><path d="M10 20v-5h4v5"/>',
  bag: '<path d="M5 8h14l-1 12H6Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  back: '<path d="M15 5 8 12l7 7"/>',
  next: '<path d="m9 5 7 7-7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  gift: '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M4 13h16M12 9v11M12 9c-1.5-3-5-3.5-5-1.2S10 9 12 9Zm0 0c1.5-3 5-3.5 5-1.2S14 9 12 9Z"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.8"/>',
  book: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5ZM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5Z"/>',
  camera: '<path d="M4 8h3.5L9 5.5h6L16.5 8H20v11H4Z"/><circle cx="12" cy="13" r="3.5"/>',
  timer: '<circle cx="12" cy="13.5" r="7"/><path d="M12 13.5V10M10 3h4M12 3v3.5"/>',
  swap: '<path d="M5 8h13l-3-3M19 16H6l3 3"/>',
  scale: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 10a4.5 4.5 0 0 1 7 0L12 12.5"/>',
  flame: '<path d="M12 21c-3.6 0-6-2.4-6-5.6 0-3.1 2.4-4.6 3.4-7.4.7 1.3 1.4 2 2.2 2.4.1-2.6 1-4.7 3.1-6.4-.3 3 1.3 4.8 2.4 6.7.6 1 .9 2.2.9 3.4C18 18.4 15.6 21 12 21Z"/>',
  heart: '<path d="M12 19.5s-7.5-4.4-7.5-9.7A4.3 4.3 0 0 1 12 7.5a4.3 4.3 0 0 1 7.5 2.3c0 5.3-7.5 9.7-7.5 9.7Z"/>',
  leaf: '<path d="M5 19c0-8.5 5.5-14 14-14 0 8.5-5.5 14-14 14Z"/><path d="M5 19 13 11"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".6"/>',
  shuffle: '<path d="M4 7h3.5c4.5 0 4.5 10 9 10H20M4 17h3.5c1.4 0 2.3-.9 3-2.2M13.5 9.2c.7-1.3 1.6-2.2 3-2.2H20M17.5 4.5 20 7l-2.5 2.5M17.5 14.5 20 17l-2.5 2.5"/>',
  pan: '<circle cx="10" cy="12" r="6"/><path d="M16 12h5"/>',
  coin: '<ellipse cx="12" cy="8" rx="6" ry="2.5"/><path d="M6 8v8c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V8M6 12c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5"/>',
  sparkle: '<path d="M12 4v4M12 16v4M4 12h4M16 12h4M7 7l1.5 1.5M15.5 15.5 17 17M17 7l-1.5 1.5M8.5 15.5 7 17"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
  sound: '<path d="M5 9.5h3l4-3.5v12l-4-3.5H5Z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  cloud: '<path d="M7 18a4 4 0 0 1-.4-8A5.5 5.5 0 0 1 17.3 9 4.5 4.5 0 0 1 17 18Z"/>',
  treadmill: '<path d="M3 17h15l3-9M16 11h4M5 20h13"/>',
  briefcase: '<rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M9 7.5V5.5h6v2M3.5 12.5h17"/>',
  door: '<path d="M6 20V4h10v16M3 20h18M13 12h.5"/><path d="M16 7h3v13"/>',
  receipt: '<path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5L6 21Z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  pill: '<rect x="3.5" y="9" width="17" height="6" rx="3" transform="rotate(-45 12 12)"/><path d="m9.9 9.9 4.2 4.2"/>',
  bus: '<rect x="5" y="4" width="14" height="13" rx="2"/><path d="M5 11h14M8 17v2.5M16 17v2.5"/><circle cx="8.5" cy="14" r=".6"/><circle cx="15.5" cy="14" r=".6"/>',
  pen: '<path d="M4 20l1-4L16 5l3 3L8 19Z"/><path d="M14 7l3 3"/>',
  cart: '<path d="M3 4h2.5l2 11h10l2-8H7"/><circle cx="9" cy="19" r="1.3"/><circle cx="16" cy="19" r="1.3"/>',
  medic: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/>',
  wallet: '<path d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4Z"/><path d="M4 7l11-3v3M15 13.5h2"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
  list: '<path d="M9 7h11M9 12h11M9 17h11"/><circle cx="5" cy="7" r=".7"/><circle cx="5" cy="12" r=".7"/><circle cx="5" cy="17" r=".7"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/>',
};

// Mood faces 1..5: from a tired frown to a small smile, all in the same thin line.
const MOUTHS = {
  1: '<path d="M8.5 16.5c1.2-1.5 5.8-1.5 7 0"/><path d="M8 9.5l2 1M16 9.5l-2 1"/>',
  2: '<path d="M9 16c1-.8 5-.8 6 0"/><circle cx="9.5" cy="10" r=".6"/><circle cx="14.5" cy="10" r=".6"/>',
  3: '<path d="M9 15.5h6"/><circle cx="9.5" cy="10" r=".6"/><circle cx="14.5" cy="10" r=".6"/>',
  4: '<path d="M9 14.5c1 1.2 5 1.2 6 0"/><circle cx="9.5" cy="10" r=".6"/><circle cx="14.5" cy="10" r=".6"/>',
  5: '<path d="M8.5 14c1.3 2 5.7 2 7 0"/><path d="M8.3 10.2c.6-.9 1.8-.9 2.4 0M13.3 10.2c.6-.9 1.8-.9 2.4 0"/>',
};

export function icon(name, { size = 22, label = '' } = {}) {
  const body = P[name];
  if (!body) return '';
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  return `<svg class="ic" viewBox="0 0 24 24" width="${size}" height="${size}" ${a11y}>${body}</svg>`;
}

export function moodIcon(v, { size = 26 } = {}) {
  return `<svg class="ic" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><circle cx="12" cy="12" r="9"/>${MOUTHS[v] ?? ''}</svg>`;
}
