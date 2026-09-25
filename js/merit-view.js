// "ทำบุญ" in the ลดความโกรธ tab: a summary (หน้ารวมบุญ), the fish pond and the
// morning ตักบาตร scene. Original, friendly drawings (a pond, fish, a rice pot and
// the app's cat) — no real religious imagery. No pressure: nothing here says
// "you missed"; things simply open when they're ready.
import {
  emptyMerit, coins, coinDays, feed, fishLevel, nextGrowth, almsOpen, giveAlms, FISH_COLORS, MAX_LEVEL, ALMS_BEFORE,
} from './merit.js';
import { bell as bellSound, haptic } from './sound.js';

const LEVEL_NAMES = ['ลูกปลา', 'ปลาน้อย', 'ปลาวัยรุ่น', 'ปลาโต', 'ปลาโตเต็มที่'];
const SHOW_MAX = 10; // fish drawn in the pond (the count shows them all)

function fishSvg(f, i) {
  const lv = fishLevel(f);
  const s = 0.55 + lv * 0.16;
  const color = FISH_COLORS[f.color % FISH_COLORS.length];
  const y = 70 + ((i * 37) % 90);
  const dur = 9 + ((i * 5) % 7);
  return `<g class="fish" data-id="${f.id}" style="--y:${y}px;--dur:${dur}s;--delay:${-i * 2.3}s">
    <g transform="scale(${s.toFixed(2)})">
      <path d="M-26 0 L-40 -11 L-37 0 L-40 11 Z" fill="${color}" stroke="#111" stroke-width="3" stroke-linejoin="round"/>
      <ellipse cx="0" cy="0" rx="28" ry="14" fill="${color}" stroke="#111" stroke-width="3"/>
      <path d="M-4 -13 q6 -9 14 -2" fill="${color}" stroke="#111" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="15" cy="-3" r="3.2" fill="#111"/>
      ${lv >= 2 ? '<path d="M-8 -6 q4 6 0 12" fill="none" stroke="#111" stroke-width="2.5" stroke-linecap="round"/>' : ''}
    </g></g>`;
}

const POND = `<path class="pond-water" d="M40 70 C40 30 110 18 170 22 C250 26 312 40 314 92 C316 150 270 196 176 198 C84 200 30 170 34 118 C36 98 40 86 40 70 Z"/>
  <g class="pad"><circle cx="78" cy="60" r="17"/><path d="M78 60 L95 52"/></g>
  <g class="pad"><circle cx="276" cy="160" r="14"/><path d="M276 160 L262 150"/></g>
  <g class="pad"><circle cx="286" cy="70" r="10"/><path d="M286 70 L296 64"/></g>
  <path class="ripple-line" d="M120 150 q12 -6 24 0 M200 110 q10 -5 20 0"/>`;

const ALMS_SCENE = `<svg class="alms-svg" viewBox="0 0 320 180" aria-hidden="true">
  <rect class="alms-sky" x="0" y="0" width="320" height="180" rx="16"/>
  <circle class="alms-sun" cx="248" cy="120" r="40"/>
  <path class="alms-ground" d="M0 130 H320 V164 a16 16 0 0 1 -16 16 H16 a16 16 0 0 1 -16 -16 Z"/>
  <g class="alms-pot">
    <ellipse cx="150" cy="134" rx="38" ry="7" class="alms-stand"/>
    <path d="M114 96 C114 136 186 136 186 96 Z" class="alms-bowl"/>
    <path d="M110 96 H190" class="alms-rim"/>
  </g>
  <g class="alms-rice">
    <circle cx="150" cy="40" r="8"/><circle cx="136" cy="30" r="7"/><circle cx="164" cy="28" r="7"/>
  </g>
  <g class="alms-spark"><path d="M104 70 l6 0 M107 67 l0 6 M196 64 l6 0 M199 61 l0 6 M150 56 l6 0 M153 53 l0 6"/></g>
</svg>`;

export function createMerit(ctx) {
  const { state } = ctx;
  const merit = () => (state.merit ??= emptyMerit(ctx.todayKey()));

  function summary(m, c) {
    return `<div class="trio">
      <div class="card fill-sky"><span class="small">ปลาในบ่อ</span><span class="stat-big">${m.fish.length}<small> ตัว</small></span></div>
      <div class="card fill-orange"><span class="small">ตักบาตรมาแล้ว</span><span class="stat-big">${m.alms.length}<small> ครั้ง</small></span></div>
      <div class="card fill-yellow"><span class="small">เหรียญบุญ</span><span class="stat-big">${c}<small> เหรียญ</small></span></div>
    </div>`;
  }

  function pondCard(m, c) {
    const key = ctx.todayKey();
    const day = ctx.getDay(key);
    const goal = ctx.waterGoal();
    const g = nextGrowth(m);
    const fish = m.fish.slice(-SHOW_MAX);
    return `<div class="card pond-card">
      <div class="row between"><h2>บ่อปลา</h2><span class="coin-pill">${ctx.icon('coin', { size: 18 })}<b class="num">${c}</b></span></div>
      <div class="pond-stage">
        <svg class="pond-svg" viewBox="0 0 340 220" role="img" aria-label="บ่อปลา มีปลา ${m.fish.length} ตัว">${POND}<g class="fish-school">${fish.map(fishSvg).join('')}</g><g class="pellets"></g></svg>
      </div>
      <p class="small">${g ? `ปลาตัวที่กำลังโต: ${LEVEL_NAMES[g.level]} · ให้อาหารอีก ${g.left} ครั้งจะโตขึ้น` : ''}</p>
      <button class="btn primary big block" data-act="pondFeed" ${c ? '' : 'disabled'}>${ctx.icon('coin', { size: 20 })}ใช้ 1 เหรียญ ให้อาหารปลา</button>
      <p class="small muted-page">ได้เหรียญบุญ 1 เหรียญทุกวันที่ดื่มน้ำครบเป้า ${day.waterMet ? '· วันนี้ได้แล้ว' : `· วันนี้ดื่มไป <b class="num">${day.water}/${goal}</b> แก้ว`}</p>
    </div>`;
  }

  function almsCard(m) {
    const key = ctx.todayKey();
    const open = almsOpen(ctx.getDay(key), key);
    const done = m.alms.includes(key);
    return `<div class="card alms-card${open ? '' : ' closed'}${done ? ' given' : ''}">
      <div class="row between"><h2>ตักบาตรตอนเช้า</h2><span class="small"><b class="num">${m.alms.length}</b> ครั้ง</span></div>
      <div class="alms-stage">${ALMS_SCENE}<div class="alms-cat">${ctx.mascot(open ? 'bright' : 'normal', { size: 72 })}</div></div>
      ${open && !done ? '<button class="btn primary big block" data-act="almsGive">ใส่บาตร</button>' : ''}
      <p class="small">${done ? `วันนี้ใส่บาตรแล้ว อนุโมทนาด้วยนะ · ตักบาตรมาแล้ว ${m.alms.length} ครั้ง`
    : open ? 'เช็กอินแต่เช้า ฉากตักบาตรเปิดให้แล้ว'
      : `ในวันที่เช็กอินก่อน ${ALMS_BEFORE} น. ฉากนี้จะเปิดให้ในวันนั้น`}</p>
    </div>`;
  }

  function panel() {
    const m = merit();
    const c = coins(state.days, m);
    return `<div class="merit-page">
      <h2 class="merit-h">รวมบุญ</h2>
      ${summary(m, c)}
      ${pondCard(m, c)}
      ${almsCard(m)}
      <p class="bell-hint small">ทำเมื่อพร้อม ไม่มีอันดับ ไม่มีการเปรียบเทียบกับใคร</p>
    </div>`;
  }

  // Pellets drop, the fed fish wiggles — then the pond redraws (maybe bigger, maybe a newcomer).
  function playFeed(r) {
    const svg = document.querySelector('.pond-svg');
    const pellets = svg?.querySelector('.pellets');
    if (pellets) {
      for (let i = 0; i < 6; i++) {
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        p.setAttribute('cx', String(120 + Math.random() * 100));
        p.setAttribute('cy', String(40 + Math.random() * 20));
        p.setAttribute('r', '4');
        p.setAttribute('class', 'pellet');
        p.style.animationDelay = `${i * 60}ms`;
        pellets.append(p);
      }
      svg.querySelector(`.fish[data-id="${r.fed}"]`)?.classList.add('eat');
    }
    const msg = r.newFish ? 'ปลาโตเต็มที่แล้ว มีปลาตัวใหม่มาเพิ่ม'
      : r.grewUp ? 'ปลาโตขึ้นอีกขั้นแล้ว' : 'ปลากินอาหารแล้ว';
    setTimeout(() => {
      ctx.render();
      ctx.toast(msg);
    }, 1100);
  }

  const actions = {
    pondFeed: () => {
      const key = ctx.todayKey();
      const r = feed(merit(), state.days, key);
      if (!r) return;
      // Coins come from the water history; keep the credited days so an undone glass can't take one back.
      r.merit.earnedDays = [...coinDays(state.days, merit())];
      state.merit = r.merit;
      ctx.save();
      haptic(10);
      if (state.settings.sound) ctx.sfx.knock();
      playFeed(r);
    },
    almsGive: () => {
      const key = ctx.todayKey();
      const m = giveAlms(merit(), ctx.getDay(key), key);
      if (!m) return;
      state.merit = m;
      ctx.save();
      haptic(20);
      document.querySelector('.alms-card')?.classList.add('giving');
      bellSound({ pitch: 440, volume: 0.12 });
      setTimeout(() => ctx.render(), 1500);
    },
  };

  return { panel, actions };
}

export { MAX_LEVEL };
