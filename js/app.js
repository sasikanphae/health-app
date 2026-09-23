import {
  GOALS, calcBMI, bmiCategory, calcBMR, progress, dateKey, lastNDays, emptyDay, waterStreak,
} from './health.js';

const STORAGE_KEY = 'health-app:v1';
const MOODS = ['', '😫', '😕', '😐', '🙂', '😄'];
const $ = (sel) => document.querySelector(sel);

// ---------- storage ----------
function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (data && typeof data === 'object') return { profile: {}, log: {}, ...data };
  } catch { /* corrupted or unavailable storage: start fresh */ }
  return { profile: {}, log: {} };
}

const state = load();

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    toast('บันทึกไม่สำเร็จ: พื้นที่จัดเก็บไม่พร้อมใช้งาน');
  }
}

function today() {
  const key = dateKey();
  state.log[key] ??= emptyDay();
  return state.log[key];
}

function latestWeight() {
  const keys = Object.keys(state.log).sort().reverse();
  for (const k of keys) if (state.log[k].weight) return state.log[k].weight;
  return null;
}

// ---------- UI helpers ----------
let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

const fmt = (n) => Number(n).toLocaleString('th-TH');
const thaiDate = (key, opts) =>
  new Date(`${key}T00:00:00`).toLocaleDateString('th-TH', opts);

// ---------- render ----------
function renderToday() {
  const d = today();
  $('#today-label').textContent = thaiDate(dateKey(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  for (const field of ['water', 'steps', 'sleep']) {
    $(`#${field}-value`).textContent = fmt(d[field]);
    $(`#${field}-goal`).textContent = fmt(GOALS[field]);
    $(`#${field}-bar`).style.width = `${progress(d[field], GOALS[field]) * 100}%`;
  }
  $('#weight-value').textContent = d.weight ?? '–';

  document.querySelectorAll('[data-mood]').forEach((b) => {
    b.setAttribute('aria-checked', String(Number(b.dataset.mood) === d.mood));
  });

  const streak = waterStreak(state.log);
  $('#streak').textContent = streak > 0 ? `🔥 ${streak} วัน` : '';
}

function renderProfile() {
  const form = $('#profile-form');
  const { height = '', age = '', sex = 'female' } = state.profile;
  form.height.value = height;
  form.age.value = age;
  form.sex.value = sex;

  const weight = latestWeight();
  const bmi = calcBMI(weight, height);
  const cat = bmiCategory(bmi);
  $('#bmi-value').textContent = bmi ?? '–';
  const label = $('#bmi-label');
  label.textContent = cat?.label ?? '';
  label.className = `pill ${cat?.level ?? ''}`;
  $('#bmi-hint').hidden = bmi != null;

  const bmr = calcBMR({ weightKg: weight, heightCm: height, age, sex });
  $('#bmr-value').textContent = bmr ? fmt(bmr) : '–';
}

function renderHistory() {
  const days = lastNDays(7);
  const metric = $('#chart-metric').value;
  renderChart(days, metric);

  $('#history-table tbody').innerHTML = days.slice().reverse().map((k) => {
    const d = state.log[k] ?? emptyDay();
    return `<tr>
      <td>${thaiDate(k, { day: 'numeric', month: 'short' })}</td>
      <td>${d.water}</td><td>${fmt(d.steps)}</td><td>${d.sleep}</td>
      <td>${d.weight ?? '–'}</td><td>${MOODS[d.mood] || '–'}</td>
    </tr>`;
  }).join('');
}

function renderChart(days, metric) {
  const svg = $('#chart');
  const W = 320, H = 180, pad = { l: 36, r: 8, t: 12, b: 24 };
  const values = days.map((k) => state.log[k]?.[metric] ?? null);
  const goal = GOALS[metric];
  const present = values.filter((v) => v != null && v !== 0);

  let min = 0;
  let max = Math.max(goal ?? 0, ...present, 1);
  if (metric === 'weight' && present.length) {
    min = Math.floor(Math.min(...present) - 2);
    max = Math.ceil(Math.max(...present) + 2);
  }

  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const step = iw / days.length;
  const x = (i) => pad.l + step * i + step / 2;
  const y = (v) => pad.t + ih - ((v - min) / (max - min)) * ih;

  let out = `<line class="axis" x1="${pad.l}" x2="${W - pad.r}" y1="${pad.t + ih}" y2="${pad.t + ih}"/>`;
  for (const t of [min, (min + max) / 2, max]) {
    out += `<text x="${pad.l - 6}" y="${y(t) + 4}" text-anchor="end">${fmt(Math.round(t))}</text>`;
  }
  days.forEach((k, i) => {
    out += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${thaiDate(k, { weekday: 'short' })}</text>`;
  });

  if (metric === 'weight') {
    const pts = values.map((v, i) => (v ? [x(i), y(v)] : null)).filter(Boolean);
    if (pts.length > 1) out += `<polyline class="line" points="${pts.map((p) => p.join(',')).join(' ')}"/>`;
    for (const [px, py] of pts) out += `<circle class="dot" cx="${px}" cy="${py}" r="4"/>`;
    if (!pts.length) out += `<text x="${W / 2}" y="${H / 2}" text-anchor="middle">ยังไม่มีข้อมูลน้ำหนัก</text>`;
  } else {
    const bw = step * 0.55;
    values.forEach((v, i) => {
      if (!v) return;
      out += `<rect class="bar-rect" rx="4" x="${x(i) - bw / 2}" y="${y(v)}" width="${bw}" height="${pad.t + ih - y(v)}"/>`;
    });
    if (goal) out += `<line class="goal" x1="${pad.l}" x2="${W - pad.r}" y1="${y(goal)}" y2="${y(goal)}"/>`;
  }
  svg.innerHTML = out;
}

function renderAll() {
  renderToday();
  renderProfile();
  renderHistory();
}

// ---------- events ----------
document.querySelectorAll('[data-water]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const d = today();
    const before = d.water;
    d.water = Math.max(0, d.water + Number(btn.dataset.water));
    save();
    renderAll();
    if (before < GOALS.water && d.water >= GOALS.water) toast('🎉 ดื่มน้ำครบเป้าหมายแล้ว!');
  });
});

document.querySelectorAll('form[data-field]').forEach((form) => {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector('input');
    const value = Number(input.value);
    if (input.value === '' || !input.checkValidity()) {
      toast('กรุณากรอกตัวเลขให้ถูกต้อง');
      return;
    }
    today()[form.dataset.field] = value;
    input.value = '';
    save();
    renderAll();
    toast('บันทึกแล้ว ✓');
  });
});

document.querySelectorAll('[data-mood]').forEach((btn) => {
  btn.addEventListener('click', () => {
    today().mood = Number(btn.dataset.mood);
    save();
    renderAll();
  });
});

$('#profile-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target;
  if (!f.checkValidity()) {
    f.reportValidity();
    return;
  }
  state.profile = {
    height: f.height.value ? Number(f.height.value) : '',
    age: f.age.value ? Number(f.age.value) : '',
    sex: f.sex.value,
  };
  save();
  renderAll();
  toast('บันทึกข้อมูลส่วนตัวแล้ว');
});

$('#chart-metric').addEventListener('change', renderHistory);

$('#export-btn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `health-data-${dateKey()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

$('#reset-btn').addEventListener('click', () => {
  if (!confirm('ต้องการลบข้อมูลทั้งหมดใช่หรือไม่? ไม่สามารถกู้คืนได้')) return;
  state.profile = {};
  state.log = {};
  save();
  renderAll();
  toast('ล้างข้อมูลแล้ว');
});

document.querySelectorAll('.tabs [data-view]').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tabs [data-view]').forEach((t) =>
      t.setAttribute('aria-selected', String(t === tab)));
    document.querySelectorAll('.view').forEach((v) =>
      v.classList.toggle('active', v.id === `view-${tab.dataset.view}`));
    window.scrollTo(0, 0);
  });
});

// Re-render when the app comes back to the foreground so a new day starts fresh.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') renderAll();
});

renderAll();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
