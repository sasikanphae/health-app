// วันพระ (Buddhist holy days) from the moon's phases.
//
// The Thai lunar calendar is arithmetic and usually agrees with the sky, but it
// can differ by a day. Here each holy day is the Thai-time (UTC+7) date of the
// astronomical phase: first quarter ≈ ขึ้น 8 ค่ำ, full moon ≈ ขึ้น 15 ค่ำ,
// last quarter ≈ แรม 8 ค่ำ, new moon ≈ แรม 14/15 ค่ำ. The app says it's an estimate.
//
// Phase times: Jean Meeus, Astronomical Algorithms, ch. 49 (main periodic terms;
// accurate to within minutes, far below the day resolution needed here).

const RAD = Math.PI / 180;
const sin = (deg) => Math.sin(deg * RAD);
const cos = (deg) => Math.cos(deg * RAD);

export const PHASES = {
  new: { label: 'แรม 15 ค่ำ', short: 'แรม 15' },
  first: { label: 'ขึ้น 8 ค่ำ', short: 'ขึ้น 8' },
  full: { label: 'ขึ้น 15 ค่ำ', short: 'ขึ้น 15' },
  last: { label: 'แรม 8 ค่ำ', short: 'แรม 8' },
};

// Julian Ephemeris Day of phase k (integer = new moon, +.25 first quarter, +.5 full, +.75 last).
export function phaseJDE(k) {
  const T = k / 1236.85;
  let jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T * T;
  const E = 1 - 0.002516 * T;
  const M = 2.5534 + 29.1053567 * k;
  const Mp = 201.5643 + 385.81693528 * k + 0.0107582 * T * T;
  const F = 160.7108 + 390.67050284 * k - 0.0016118 * T * T;
  const O = 124.7746 - 1.56375588 * k;
  const frac = ((k % 1) + 1) % 1;

  if (frac === 0 || frac === 0.5) {
    const full = frac === 0.5;
    jde += (full ? -0.40614 : -0.4072) * sin(Mp)
      + (full ? 0.17302 : 0.17241) * E * sin(M)
      + (full ? 0.01614 : 0.01608) * sin(2 * Mp)
      + (full ? 0.01043 : 0.01039) * sin(2 * F)
      + (full ? 0.00734 : 0.00739) * E * sin(Mp - M)
      - (full ? 0.00515 : 0.00514) * E * sin(Mp + M)
      + (full ? 0.00209 : 0.00208) * E * E * sin(2 * M)
      - 0.00111 * sin(Mp - 2 * F)
      - 0.00057 * sin(Mp + 2 * F)
      + 0.00056 * E * sin(2 * Mp + M)
      - 0.00042 * sin(3 * Mp)
      + 0.00042 * E * sin(M + 2 * F)
      + 0.00038 * E * sin(M - 2 * F)
      - 0.00024 * E * sin(2 * Mp - M)
      - 0.00017 * sin(O);
  } else {
    jde += -0.62801 * sin(Mp)
      + 0.17172 * E * sin(M)
      - 0.01183 * E * sin(Mp + M)
      + 0.00862 * sin(2 * Mp)
      + 0.00804 * sin(2 * F)
      + 0.00454 * E * sin(Mp - M)
      + 0.00204 * E * E * sin(2 * M)
      - 0.0018 * sin(Mp - 2 * F)
      - 0.0007 * sin(Mp + 2 * F)
      - 0.0004 * sin(3 * Mp)
      - 0.00034 * E * sin(2 * Mp - M)
      + 0.00032 * E * sin(M + 2 * F)
      + 0.00032 * E * sin(M - 2 * F)
      - 0.00028 * E * E * sin(Mp + 2 * M)
      - 0.00017 * sin(O);
    const W = 0.00306 - 0.00038 * E * cos(M) + 0.00026 * cos(Mp)
      - 0.00002 * cos(Mp - M) + 0.00002 * cos(Mp + M) + 0.00002 * cos(2 * F);
    jde += frac === 0.25 ? W : -W;
  }
  return jde;
}

// Date key (YYYY-MM-DD) in Thai time for a Julian day.
function thaiDateKey(jde) {
  const ms = (jde - 2440587.5) * 86_400_000 + 7 * 3_600_000;
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

const PHASE_BY_FRAC = { 0: 'new', 0.25: 'first', 0.5: 'full', 0.75: 'last' };

// { 'YYYY-MM-DD': { phase, label } } for every holy day between two date keys (inclusive).
export function holyDays(fromKey, toKey) {
  const yearOf = (key) => {
    const [y, m, d] = key.split('-').map(Number);
    return y + (m - 1) / 12 + (d - 1) / 365;
  };
  const kFrom = Math.floor((yearOf(fromKey) - 2000) * 12.3685) - 1;
  const kTo = Math.ceil((yearOf(toKey) - 2000) * 12.3685) + 1;
  const out = {};
  for (let k = kFrom; k <= kTo; k++) {
    for (const f of [0, 0.25, 0.5, 0.75]) {
      const key = thaiDateKey(phaseJDE(k + f));
      if (key >= fromKey && key <= toKey) {
        const phase = PHASE_BY_FRAC[f];
        out[key] = { phase, ...PHASES[phase] };
      }
    }
  }
  return out;
}

export const isHolyDay = (key) => !!holyDays(key, key)[key];
