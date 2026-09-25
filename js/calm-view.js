// แท็บ "ลดความโกรธ": ระฆังเตือนสติ and ลูกประคำ, switched with two sub-tabs.
// A free space to cool down: no goals, no scores, nothing saved or tracked —
// the bead count lives only while the app is open.
import { createBell } from './bell.js';
import { createMerit } from './merit-view.js';
import { BEADS, ROUND_LINES, advance, angleOf, dragBeads, beadPos } from './mala.js';
import { beadClick, blessing, haptic } from './sound.js';

const R = 132; // ring radius in the 320×320 drawing
const C = 160;
const STEP_DEG = 360 / BEADS;

export function createCalm(ctx) {
  const { $ } = ctx;
  const bell = createBell(ctx);
  const merit = createMerit(ctx);
  const ui = { tab: 'bell', count: 0, done: false, line: 0, clicks: true, drag: null };

  // ---------- ลูกประคำ ----------
  function ringSvg() {
    const beads = Array.from({ length: BEADS }, (_, i) => {
      const p = beadPos(i, R, C);
      return `<circle class="bead${i === 0 ? ' guru' : ''}" data-i="${i}" cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${i === 0 ? 7.5 : 3.6}"/>`;
    }).join('');
    // Tassel hangs from the guru bead (bead 0) and turns with the ring.
    const tassel = `<path class="tassel" d="M${C} ${C - R - 8}v-10M${C - 5} ${C - R - 18}l-3 -12M${C + 5} ${C - R - 18}l3 -12M${C} ${C - R - 18}v-13"/>`;
    return `<svg class="mala-svg" viewBox="-10 -30 340 360" aria-hidden="true">
      <circle class="mala-string" cx="${C}" cy="${C}" r="${R}"/>
      <g class="mala-ring" transform="rotate(${-ui.count * STEP_DEG} ${C} ${C})">${tassel}${beads}</g>
      <path class="mala-pointer" d="M${C - 9} ${C - R - 26}h18l-9 12Z"/>
    </svg>`;
  }

  function malaPanel() {
    return `<div class="mala-page">
      <div class="mala-stage${ui.done ? ' done' : ''}" id="mala-stage" role="button" tabindex="0"
        aria-label="ลูกประคำ ${ui.count} จาก ${BEADS} เม็ด แตะหรือกด Enter เพื่อเลื่อนเม็ด">
        ${ringSvg()}
        <div class="mala-count"><b class="num" id="mala-num">${ui.count}</b><span class="num">/${BEADS}</span>
          <small>${ui.done ? 'ครบแล้ว' : 'แตะ หรือปัดวนตามเข็ม'}</small></div>
      </div>
      ${ui.done ? `<div class="card fill-lime mala-done" role="status">
          <div class="row">${ctx.mascot('bright', { size: 64 })}<p class="grow head">${ROUND_LINES[ui.line]}</p></div>
          <button class="btn primary big block" data-act="malaReset">เริ่มรอบใหม่</button>
        </div>`
    : `<div class="mala-tools">
          <button class="chip" data-act="malaClicks" aria-pressed="${ui.clicks}">${ui.clicks ? 'เสียงคลิก: เปิด' : 'เสียงคลิก: ปิด'}</button>
          <button class="link small" data-act="malaReset">เริ่มนับใหม่</button>
        </div>`}
      <p class="bell-hint small">นับเพื่อให้ใจอยู่กับมือ ไม่ต้องให้ครบก็ได้ ไม่มีการเก็บสถิติ</p>
    </div>`;
  }

  // One or more beads forward: turn the ring, feel it, hear it. Updates in place
  // (no re-render) so dragging stays smooth.
  function step(by = 1) {
    if (ui.done) return;
    const r = advance(ui.count, by);
    if (!r.moved) return;
    ui.count = r.count;
    haptic(r.moved > 1 ? 12 : 8);
    if (ui.clicks) beadClick();
    const ring = document.querySelector('.mala-ring');
    if (ring) {
      turnTo(ring, -ui.count * STEP_DEG);
      for (let i = ui.count - r.moved; i < ui.count; i++) ring.querySelector(`[data-i="${i}"]`)?.classList.add('counted');
      ring.querySelectorAll('.bead.now').forEach((b) => b.classList.remove('now'));
      ring.querySelector(`[data-i="${ui.count % BEADS}"]`)?.classList.add('now');
    }
    const num = document.getElementById('mala-num');
    if (num) num.textContent = ui.count;
    document.getElementById('mala-stage')?.setAttribute('aria-label', `ลูกประคำ ${ui.count} จาก ${BEADS} เม็ด`);
    if (r.done) {
      ui.done = true;
      ui.line = Math.floor(Math.random() * ROUND_LINES.length);
      blessing();
      haptic(40);
      render();
    }
  }

  // Turn the ring smoothly around its own centre (SVG rotate keeps the pivot exact).
  let shown = 0;
  let raf = 0;
  function turnTo(ring, target) {
    cancelAnimationFrame(raf);
    const from = shown;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t0 = performance.now();
    const frame = (now) => {
      const k = reduce ? 1 : Math.min(1, (now - t0) / 160);
      shown = from + (target - from) * (1 - (1 - k) ** 3);
      ring.setAttribute('transform', `rotate(${shown.toFixed(2)} ${C} ${C})`);
      if (k < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  }

  function markBeads() {
    shown = -ui.count * STEP_DEG;
    const ring = document.querySelector('.mala-ring');
    if (!ring) return;
    for (let i = 0; i < ui.count; i++) ring.querySelector(`[data-i="${i}"]`)?.classList.add('counted');
    if (!ui.done) ring.querySelector(`[data-i="${ui.count}"]`)?.classList.add('now');
  }

  // Tap = one bead. Drag around the centre = turn the mala.
  function bindMala() {
    const stage = document.getElementById('mala-stage');
    if (!stage) return;
    const centre = () => {
      const r = stage.querySelector('.mala-svg').getBoundingClientRect();
      // The ring centre sits at (160,160) of the -10 -30 340 360 viewBox.
      return { x: r.left + (170 / 340) * r.width, y: r.top + (190 / 360) * r.height };
    };
    stage.addEventListener('pointerdown', (e) => {
      if (ui.done) return;
      const c = centre();
      ui.drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, angle: angleOf(e.clientX, e.clientY, c.x, c.y), carry: 0, moved: false, c };
      stage.setPointerCapture?.(e.pointerId);
    });
    stage.addEventListener('pointermove', (e) => {
      const d = ui.drag;
      if (!d || d.id !== e.pointerId) return;
      if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 8) return;
      d.moved = true;
      const a = angleOf(e.clientX, e.clientY, d.c.x, d.c.y);
      const r = dragBeads(d.angle, a, d.carry);
      d.angle = a;
      d.carry = r.carry;
      if (r.beads) step(r.beads);
      e.preventDefault();
    });
    const end = (e) => {
      const d = ui.drag;
      if (!d || d.id !== e.pointerId) return;
      ui.drag = null;
      if (!d.moved && e.type === 'pointerup') step(1);
    };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
    stage.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        step(1);
      }
    });
  }

  // ---------- the tab ----------
  function render() {
    const el = $('#view-calm');
    if (!el) return;
    el.innerHTML = `
      ${ctx.pageTitle('ลดความโกรธ', 'meditate')}
      <p class="calm-lead">โกรธได้ ไม่ผิดเลย ลองฟังเสียงระฆัง หรือนับลูกประคำสักพัก ให้ใจค่อยๆ เย็นลง</p>
      <div class="seg calm-seg" role="tablist" aria-label="เลือกวิธี">
        <button role="tab" data-act="calmTab" data-tab="bell" aria-selected="${ui.tab === 'bell'}">ระฆัง</button>
        <button role="tab" data-act="calmTab" data-tab="mala" aria-selected="${ui.tab === 'mala'}">ลูกประคำ</button>
        <button role="tab" data-act="calmTab" data-tab="merit" aria-selected="${ui.tab === 'merit'}">ทำบุญ</button>
      </div>
      ${{ bell: bell.panel, mala: malaPanel, merit: merit.panel }[ui.tab]()}`;
    if (ui.tab === 'mala') {
      markBeads();
      bindMala();
    }
  }

  const actions = {
    ...bell.actions,
    ...merit.actions,
    calmTab: (d) => {
      ui.tab = d.tab;
      render();
    },
    calmOpen: (d) => {
      ui.tab = d.tab ?? 'bell';
      ctx.showView('calm');
    },
    malaReset: () => {
      Object.assign(ui, { count: 0, done: false });
      render();
    },
    malaClicks: () => {
      ui.clicks = !ui.clicks;
      render();
    },
  };

  return { render, actions, release: bell.release };
}
