// Hand-built SVG artwork: the meditating-cat mascot, line drawings of the gym
// machines, and the front/back muscle map. Colours come from CSS classes so
// everything follows the theme (and dark mode).

// ---------- mascot ----------

const FACES = {
  bright: {
    eyes: `<circle class="m-ink" cx="84" cy="84" r="6.5"/><circle class="m-ink" cx="116" cy="84" r="6.5"/>
      <circle class="m-shine" cx="86.5" cy="81.5" r="2.2"/><circle class="m-shine" cx="118.5" cy="81.5" r="2.2"/>`,
    mouth: '<path class="m-mouth" d="M92 96 q8 11 16 0 z"/>',
    extra: `<path class="m-spark" d="M36 58 l4 -10 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 z"/>
      <path class="m-spark" d="M158 46 l3 -7 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 z"/>
      <path class="m-spark small" d="M166 104 l2 -5 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 z"/>`,
    halo: true,
  },
  normal: {
    eyes: '<path class="m-line" d="M77 84 q7 7 14 0 M109 84 q7 7 14 0"/>',
    mouth: '<path class="m-line" d="M94 95 q3 4 6 0 q3 4 6 0"/>',
    extra: '',
    halo: true,
  },
  sleepy: {
    eyes: '<path class="m-line" d="M77 87 q7 3 14 0 M109 87 q7 3 14 0"/>',
    mouth: '<ellipse class="m-mouth" cx="100" cy="99" rx="3.5" ry="4.5"/>',
    extra: '<text class="m-zzz" x="146" y="52">z</text><text class="m-zzz big" x="158" y="36">Z</text>',
    halo: false,
  },
};

export function mascot(mood = 'normal', { size = 120, label = 'แมวน้อยนั่งสมาธิ' } = {}) {
  const f = FACES[mood] ?? FACES.normal;
  const petals = [-64, -32, 0, 32, 64]
    .map((a) => `<ellipse class="m-petal" cx="100" cy="150" rx="15" ry="30" transform="rotate(${a} 100 180)"/>`).join('');
  const tilt = mood === 'sleepy' ? 'rotate(-7 100 90)' : '';
  return `<svg class="mascot mood-${mood}" viewBox="0 0 200 200" width="${size}" height="${size}" role="img" aria-label="${label}">
    <circle class="m-aura" cx="100" cy="112" r="86"/>
    ${petals}
    <ellipse class="m-pad" cx="100" cy="180" rx="72" ry="12"/>
    <path class="m-body" d="M140 166 q34 -2 26 -32 q-4 -12 -14 -6"/>
    <path class="m-body" d="M62 170 Q56 112 100 104 Q144 112 138 170 Z"/>
    <ellipse class="m-belly" cx="100" cy="138" rx="19" ry="21"/>
    <ellipse class="m-body" cx="100" cy="168" rx="46" ry="14"/>
    <ellipse class="m-body" cx="92" cy="148" rx="10" ry="7.5"/>
    <ellipse class="m-body" cx="108" cy="148" rx="10" ry="7.5"/>
    <g transform="${tilt}">
      ${f.halo ? '<ellipse class="m-halo" cx="100" cy="26" rx="24" ry="6"/>' : ''}
      <path class="m-body" d="M66 72 L62 36 L94 56 Z M134 72 L138 36 L106 56 Z"/>
      <path class="m-ear" d="M70 64 L68 46 L84 57 Z M130 64 L132 46 L116 57 Z"/>
      <ellipse class="m-body" cx="100" cy="84" rx="41" ry="34"/>
      <path class="m-stripe" d="M93 55 v9 M100 52 v12 M107 55 v9"/>
      <circle class="m-blush" cx="76" cy="96" r="6.5"/><circle class="m-blush" cx="124" cy="96" r="6.5"/>
      ${f.eyes}
      <path class="m-nose" d="M96.5 90 h7 l-3.5 4 z"/>
      ${f.mouth}
      <path class="m-whisker" d="M61 91 h-15 M61 97 l-14 4 M139 91 h15 M139 97 l14 4"/>
    </g>
    ${f.extra}
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

function figure(cx, shapes, primary, secondary, label) {
  const regions = Object.entries(shapes).map(([id, shape]) => {
    const cls = primary.includes(id) ? 'mm-primary' : secondary.includes(id) ? 'mm-secondary' : 'mm-idle';
    return `<g class="${cls}">${shape}<g transform="scale(-1 1)">${shape}</g></g>`;
  }).join('');
  return `<g transform="translate(${cx} 6)"><g class="mm-body">${SILHOUETTE}</g>${regions}</g>
    <text class="mm-label" x="${cx}" y="228" text-anchor="middle">${label}</text>`;
}

export function muscleMap({ primary = [], secondary = [] } = {}) {
  return `<svg class="muscle-map" viewBox="0 0 240 236" role="img" aria-label="ภาพกล้ามเนื้อที่ใช้ ด้านหน้าและด้านหลัง">
    ${figure(62, FRONT, primary, secondary, 'ด้านหน้า')}
    ${figure(178, BACK, primary, secondary, 'ด้านหลัง')}
  </svg>`;
}
