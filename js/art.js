// Hand-built SVG artwork: the meditating-cat mascot, line drawings of the gym
// machines, and the front/back muscle map. Colours come from CSS classes so
// everything follows the theme (and dark mode).

// ---------- mascot ----------
// A minimal line-drawn cat sitting in meditation. One colour (currentColor),
// one stroke weight; mood is told by shape only: eyes, ears and posture.

const FACES = {
  // Bright: eyes open, ears up, three small lines of light.
  bright: {
    ears: 'M43 33 41 15 54 27M77 33 79 15 66 27',
    eyes: '<circle cx="52.5" cy="44" r="1.6" class="m-dot"/><circle cx="67.5" cy="44" r="1.6" class="m-dot"/>',
    extra: 'M92 24l4-4M95 33h6M86 16l1-6',
    tilt: '',
  },
  // Normal: calm half-closed eyes (ตาหยี).
  normal: {
    ears: 'M43 33 41 15 54 27M77 33 79 15 66 27',
    eyes: '<path d="M49 44.5q3.5 3 7 0M64 44.5q3.5 3 7 0"/>',
    extra: '',
    tilt: '',
  },
  // Sleepy: ears drooping to the sides, eyes closed, head leaning, a small z.
  sleepy: {
    ears: 'M42 36 29 29 45 27M78 36 91 29 75 27',
    eyes: '<path d="M49 46h7M64 46h7"/>',
    extra: 'M88 16h6l-6 7h6M97 7h4l-4 5h4',
    tilt: 'rotate(-6 60 44)',
  },
};

export function mascot(mood = 'normal', { size = 120, label = 'แมวนั่งสมาธิ' } = {}) {
  const f = FACES[mood] ?? FACES.normal;
  return `<svg class="mascot mood-${mood}" viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-label="${label}">
    <g transform="${f.tilt}">
      <path d="${f.ears}"/>
      <path d="M40 40c0-12 9-19 20-19s20 7 20 19c0 11-9 18-20 18s-20-7-20-18Z"/>
      ${f.eyes}
      <path d="M57 51l3 2 3-2"/>
    </g>
    <path d="M47 58c-8 8-12 20-10 36M73 58c8 8 12 20 10 36"/>
    <path d="M30 98c8-5 20-7 30-7s22 2 30 7c-8 5-20 7-30 7s-22-2-30-7Z"/>
    <path d="M52 86c5 4 11 4 16 0"/>
    <path d="M86 99c9 0 13-5 12-13"/>
    ${f.extra ? `<path d="${f.extra}"/>` : ''}
  </svg>`;
}

// ---------- machine line art ----------

function arrow(x1, y1, x2, y2) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = 9;
  const p = (d) => `${(x2 - h * Math.cos(a + d)).toFixed(1)} ${(y2 - h * Math.sin(a + d)).toFixed(1)}`;
  return `<path class="ma-move" d="M${x1} ${y1} L${x2} ${y2}"/><path class="ma-head" d="M${p(-0.5)} L${x2} ${y2} L${p(0.5)}"/>`;
}

// Curved arrow from (x1,y1) to (x2,y2) bending through control point (cx,cy).
function arc(x1, y1, cx, cy, x2, y2) {
  const a = Math.atan2(y2 - cy, x2 - cx);
  const h = 9;
  const p = (d) => `${(x2 - h * Math.cos(a + d)).toFixed(1)} ${(y2 - h * Math.sin(a + d)).toFixed(1)}`;
  return `<path class="ma-move" d="M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}"/><path class="ma-head" d="M${p(-0.5)} L${x2} ${y2} L${p(0.5)}"/>`;
}

function stack(x, y, w, h) {
  let plates = '';
  for (let py = y + 12; py < y + h - 4; py += 10) plates += `<path class="ma-thin" d="M${x + 4} ${py} H${x + w - 4}"/>`;
  return `<path class="ma-frame" d="M${x - 6} 150 V${y - 10} M${x + w + 6} 150 V${y - 10} M${x - 10} ${y - 10} H${x + w + 10}"/>
    <rect class="ma-stack" x="${x}" y="${y}" width="${w}" height="${h}" rx="4"/>${plates}
    <circle class="ma-pin" cx="${x + w / 2}" cy="${y + h * 0.55}" r="3.5"/>`;
}

const seat = (x, y, w = 48) => `<rect class="ma-pad" x="${x}" y="${y}" width="${w}" height="11" rx="5"/>
  <path class="ma-frame" d="M${x + w / 2} ${y + 11} V150 M${x + 6} 150 H${x + w - 6}"/>`;

const MACHINE_ART = {
  'leg-press': () => `
    <path class="ma-frame" d="M24 146 H214"/>
    <path class="ma-frame" d="M58 140 L196 44 M70 146 L206 54"/>
    <rect class="ma-pad" x="30" y="118" width="54" height="12" rx="6"/>
    <rect class="ma-pad" x="26" y="70" width="13" height="56" rx="6" transform="rotate(-28 32 126)"/>
    <g transform="rotate(-35 170 70)"><rect class="ma-stack" x="150" y="46" width="42" height="54" rx="6"/>
      <circle class="ma-pin" cx="146" cy="73" r="7"/></g>
    <circle class="ma-thin" cx="132" cy="98" r="10"/>
    ${arrow(112, 104, 146, 80)}`,
  'leg-extension': () => `
    ${stack(178, 34, 28, 104)}
    ${seat(46, 98, 64)}
    <rect class="ma-pad" x="42" y="40" width="13" height="62" rx="6"/>
    <path class="ma-frame" d="M48 102 L48 150"/>
    <circle class="ma-pivot" cx="118" cy="104" r="6"/>
    <path class="ma-frame" d="M118 104 L124 138"/>
    <circle class="ma-pad" cx="126" cy="140" r="8"/>
    <path class="ma-thin" d="M124 104 C150 96 168 70 178 60"/>
    ${arc(142, 144, 164, 136, 160, 104)}`,
  'leg-curl': () => `
    ${stack(178, 34, 28, 104)}
    ${seat(46, 104, 64)}
    <rect class="ma-pad" x="42" y="46" width="13" height="62" rx="6"/>
    <rect class="ma-pad" x="66" y="82" width="46" height="10" rx="5"/>
    <path class="ma-frame" d="M112 87 H122"/>
    <circle class="ma-pivot" cx="120" cy="104" r="6"/>
    <path class="ma-frame" d="M120 104 L140 96"/>
    <circle class="ma-pad" cx="144" cy="95" r="8"/>
    ${arc(156, 100, 164, 128, 140, 142)}`,
  'lat-pulldown': () => `
    ${stack(178, 44, 28, 94)}
    <path class="ma-frame" d="M172 34 H74 M172 34 V150"/>
    <circle class="ma-pivot" cx="80" cy="38" r="6"/>
    <path class="ma-thin" d="M80 44 V66 M86 38 H176"/>
    <path class="ma-frame" d="M36 70 Q80 60 124 70"/>
    <path class="ma-frame" d="M32 66 L38 78 M128 66 L122 78"/>
    <rect class="ma-pad" x="54" y="102" width="50" height="10" rx="5"/>
    <path class="ma-frame" d="M79 112 V122"/>
    ${seat(55, 124, 48)}
    ${arrow(138, 72, 138, 110)}`,
  'seated-row': () => `
    ${stack(182, 38, 26, 100)}
    ${seat(34, 114, 52)}
    <rect class="ma-pad" x="104" y="70" width="12" height="46" rx="6"/>
    <path class="ma-frame" d="M110 116 V150 M110 70 V60 H170"/>
    <circle class="ma-pivot" cx="150" cy="60" r="6"/>
    <path class="ma-frame" d="M150 60 L132 92"/>
    <path class="ma-frame" d="M126 88 L138 96"/>
    ${arrow(162, 104, 112, 104)}`,
  'chest-press': () => `
    ${stack(182, 38, 26, 100)}
    ${seat(58, 116, 50)}
    <rect class="ma-pad" x="52" y="44" width="13" height="74" rx="6"/>
    <circle class="ma-pivot" cx="72" cy="40" r="6"/>
    <path class="ma-frame" d="M72 40 Q100 44 124 78"/>
    <path class="ma-frame" d="M124 70 V88"/>
    <path class="ma-thin" d="M78 40 H176"/>
    ${arrow(134, 60, 170, 60)}`,
  'shoulder-press': () => `
    ${stack(182, 38, 26, 100)}
    ${seat(58, 116, 50)}
    <rect class="ma-pad" x="52" y="40" width="13" height="78" rx="6"/>
    <circle class="ma-pivot" cx="64" cy="32" r="6"/>
    <path class="ma-frame" d="M64 32 Q96 30 110 48"/>
    <path class="ma-frame" d="M110 42 V60"/>
    <path class="ma-thin" d="M70 32 H176"/>
    ${arrow(128, 70, 128, 28)}`,
  treadmill: () => `
    <rect class="ma-stack" x="26" y="122" width="170" height="16" rx="8"/>
    <circle class="ma-pin" cx="36" cy="130" r="5"/><circle class="ma-pin" cx="186" cy="130" r="5"/>
    <path class="ma-frame" d="M176 122 L196 60"/>
    <rect class="ma-pad" x="174" y="40" width="46" height="22" rx="6" transform="rotate(-12 197 51)"/>
    <path class="ma-frame" d="M192 72 L140 82"/>
    <path class="ma-frame" d="M30 146 H200"/>
    ${arrow(150, 112, 70, 112)}`,
};

export function machineArt(id) {
  const draw = MACHINE_ART[id];
  if (!draw) return '';
  return `<svg class="machine-art" viewBox="0 0 240 160" role="img" aria-label="ภาพลายเส้นเครื่อง">${draw()}</svg>`;
}

// ---------- muscle map ----------

// Shapes for the left half of a figure centred on x=0; mirrored for the right side.
const FRONT = {
  shoulders: '<ellipse cx="-27" cy="45" rx="8" ry="7"/>',
  chest: '<ellipse cx="-10" cy="53" rx="11" ry="8"/>',
  biceps: '<ellipse cx="-31" cy="62" rx="5" ry="11"/>',
  abs: '<rect x="-9" y="64" width="9" height="27" rx="3"/>',
  quads: '<ellipse cx="-10" cy="130" rx="7.5" ry="21"/>',
};
const BACK = {
  traps: '<path d="M0 34 L-15 43 L0 57 Z"/>',
  reardelts: '<ellipse cx="-27" cy="45" rx="8" ry="7"/>',
  midback: '<rect x="-8" y="47" width="8" height="19" rx="3"/>',
  lats: '<ellipse cx="-15" cy="67" rx="8" ry="14"/>',
  triceps: '<ellipse cx="-31" cy="62" rx="5" ry="11"/>',
  lowerback: '<rect x="-8" y="78" width="8" height="12" rx="3"/>',
  glutes: '<ellipse cx="-10" cy="100" rx="10" ry="9"/>',
  hamstrings: '<ellipse cx="-10" cy="132" rx="7.5" ry="20"/>',
  calves: '<ellipse cx="-10" cy="176" rx="6" ry="14"/>',
};

const SILHOUETTE = `
  <circle cx="0" cy="18" r="12"/>
  <rect x="-5" y="28" width="10" height="9"/>
  <rect x="-23" y="35" width="46" height="60" rx="13"/>
  <rect x="-21" y="86" width="42" height="24" rx="9"/>
  <rect x="-37" y="39" width="12" height="38" rx="6"/><rect x="25" y="39" width="12" height="38" rx="6"/>
  <rect x="-39" y="75" width="10" height="34" rx="5"/><rect x="29" y="75" width="10" height="34" rx="5"/>
  <rect x="-19" y="104" width="17" height="54" rx="8"/><rect x="2" y="104" width="17" height="54" rx="8"/>
  <rect x="-17" y="156" width="13" height="46" rx="6"/><rect x="4" y="156" width="13" height="46" rx="6"/>`;

function figure(cx, shapes, primary, secondary, label, labels) {
  const regions = Object.entries(shapes).map(([id, shape]) => {
    const cls = primary.includes(id) ? 'mm-primary' : secondary.includes(id) ? 'mm-secondary' : 'mm-idle';
    // With labels, each region is a button (the library's body-map filter).
    const tap = labels ? ` data-act="bmPick" data-m="${id}" role="button" tabindex="0" aria-label="${labels[id]}" aria-pressed="${primary.includes(id)}"` : '';
    return `<g class="${cls}${labels ? ' mm-tap' : ''}"${tap}>${shape}<g transform="scale(-1 1)">${shape}</g></g>`;
  }).join('');
  return `<g transform="translate(${cx} 6)"><g class="mm-body">${SILHOUETTE}</g>${regions}</g>
    <text class="mm-label" x="${cx}" y="228" text-anchor="middle">${label}</text>`;
}

// labels: { muscleId: name } makes every region tappable (data-act="bmPick").
export function muscleMap({ primary = [], secondary = [], labels = null } = {}) {
  return `<svg class="muscle-map" viewBox="0 0 240 236" ${labels ? 'role="group" aria-label="แตะกล้ามเนื้อเพื่อกรองท่า"' : 'role="img" aria-label="ภาพกล้ามเนื้อที่ใช้ ด้านหน้าและด้านหลัง"'}>
    ${figure(62, FRONT, primary, secondary, 'ด้านหน้า', labels)}
    ${figure(178, BACK, primary, secondary, 'ด้านหลัง', labels)}
  </svg>`;
}
