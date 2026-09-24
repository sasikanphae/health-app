// Gentle "collecting merit" sounds, synthesised with Web Audio so there are no
// files to download: a small temple bell and a wooden fish (มู่ยู่ / mokugyo).
// Browsers only allow sound after a tap, and every call here comes from one.

let ctx = null;
function audio() {
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    // iOS also reports 'interrupted' after a call or when the app was in the background.
    if (ctx.state !== 'running') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

// ---------- ระฆังเตือนสติ: a singing bowl / temple gong ----------
// A low fundamental plus the bowl's inharmonic overtones. Each partial is a
// pair of slightly detuned sines, so it gently "wah-wahs" like a real bowl,
// and higher partials fade sooner. A short filtered-noise tap is the mallet.
// Every strike builds its own nodes: striking again layers a new ring over
// the old one, which keeps fading on its own. A shared limiter keeps stacked
// strikes from clipping.
export const BOWL_PARTIALS = [
  // [ratio to fundamental, level, beat Hz, decay as a share of `length`]
  [1, 1, 0.9, 1],
  [2.76, 0.42, 1.6, 0.62],
  [5.18, 0.2, 2.4, 0.38],
  [8.4, 0.08, 3.1, 0.22],
];
const limiters = new WeakMap();
function bus(a) {
  let node = limiters.get(a);
  if (!node) {
    node = a.createDynamicsCompressor();
    node.threshold.value = -10;
    node.knee.value = 6;
    node.ratio.value = 12;
    node.attack.value = 0.003;
    node.release.value = 0.25;
    node.connect(a.destination);
    limiters.set(a, node);
  }
  return node;
}

// Schedules one strike on any AudioContext (also an OfflineAudioContext, for tests).
export function bowlStrike(a, { at = a.currentTime, pitch = 174, volume = 0.55, length = 8, dest = bus(a) } = {}) {
  const out = a.createGain();
  out.gain.value = volume;
  out.connect(dest);
  BOWL_PARTIALS.forEach(([ratio, level, beat, share]) => {
    const decay = length * share;
    for (const side of [-1, 1]) {
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = 'sine';
      o.frequency.value = pitch * ratio + (side * beat) / 2;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(level / 2, at + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
      o.connect(g).connect(out);
      o.start(at);
      o.stop(at + decay + 0.05);
    }
  });
  // Mallet: 30 ms of band-passed noise.
  const n = Math.round(a.sampleRate * 0.03);
  const buf = a.createBuffer(1, n, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
  const src = a.createBufferSource();
  src.buffer = buf;
  const bp = a.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = pitch * 12;
  bp.Q.value = 1.2;
  const ng = a.createGain();
  ng.gain.value = 0.25;
  src.connect(bp).connect(ng).connect(out);
  src.start(at);
  return at + length;
}

// The bell page asks iOS to play even with the ring/silent switch on (Safari 17+),
// since the user pressed the bell to hear it. Other sounds keep the default.
export function mindfulBell(opts) {
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
  } catch { /* older Safari */ }
  const a = audio();
  if (!a) return false;
  bowlStrike(a, opts);
  return true;
}
export function releaseAudioSession() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'auto';
  } catch { /* older Safari */ }
}

// Temple bell: a few inharmonic partials with a long, soft decay.
export function bell({ pitch = 523, volume = 0.18, length = 2.6 } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  const out = a.createGain();
  out.gain.value = volume;
  out.connect(a.destination);
  [[1, 1], [2.76, 0.45], [5.4, 0.2], [8.93, 0.08]].forEach(([ratio, level], i) => {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = 'sine';
    o.frequency.value = pitch * ratio;
    const decay = length / (1 + i * 0.8);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + decay + 0.05);
  });
}

// Wooden fish: a short hollow knock that drops slightly in pitch.
export function woodblock({ volume = 0.35 } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(820, t);
  o.frequency.exponentialRampToValueAtTime(560, t + 0.06);
  g.gain.setValueAtTime(volume, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + 0.2);
}

// Two soft bells, for finishing everything or reaching a reward.
export function blessing() {
  bell({ pitch: 523 });
  setTimeout(() => bell({ pitch: 784, volume: 0.12 }), 260);
}
