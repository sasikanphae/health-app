// Gentle "collecting merit" sounds, synthesised with Web Audio so there are no
// files to download: a small temple bell and a wooden fish (มู่ยู่ / mokugyo).
// Browsers only allow sound after a tap, and every call here comes from one.

let ctx = null;
function audio() {
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
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
