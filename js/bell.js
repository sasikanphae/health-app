// ระฆังเตือนสติ (in the ลดความโกรธ tab): a big bell to strike whenever you like.
// No counts, no goals.
// Each strike: a singing-bowl sound (sound.js), the bell swings, a ring
// ripples out, the cat looks up, and a new short line appears.
import { mindfulBell, releaseAudioSession, haptic } from './sound.js';

export const BELL_LINES = [
  'กลับมาอยู่กับลมหายใจ',
  'หยุดสักครู่ แล้วรู้สึกถึงตอนนี้',
  'หายใจเข้า รู้ว่าหายใจเข้า',
  'หายใจออก ปล่อยไหล่ให้สบาย',
  'ฟังเสียงระฆังจนเงียบหายไป',
  'ตอนนี้ ตรงนี้ ก็พอแล้ว',
  'สังเกตเท้าที่แตะพื้นอยู่',
  'คลายหน้าผาก คลายกราม',
  'ความคิดมาแล้วก็ไป เหมือนเมฆ',
  'ไม่ต้องรีบ ไม่ต้องเก่ง แค่อยู่ตรงนี้',
  'รู้สึกถึงอากาศที่ผ่านปลายจมูก',
  'ยิ้มเล็กๆ ให้ตัวเองหนึ่งที',
  'ใจที่วิ่งวุ่น พักตรงนี้ได้',
  'ฟังเสียงรอบตัวสักสามเสียง',
  'ลมหายใจนี้ เป็นของเราเสมอ',
  'ทุกเสียงระฆัง คือการเริ่มใหม่',
];

// Next line: never the same one twice in a row. rand() is injectable for tests.
export function nextLine(prev, rand = Math.random, n = BELL_LINES.length) {
  if (n < 2) return 0;
  const i = Math.floor(rand() * (n - 1));
  return prev == null || i < prev ? i : i + 1;
}

const BELL_SVG = `<svg class="bell-svg" viewBox="0 0 120 120" aria-hidden="true">
  <path class="bell-hook" d="M60 8v10"/>
  <circle class="bell-knob" cx="60" cy="22" r="6"/>
  <path class="bell-body" d="M60 28c-20 0-30 16-30 34v16l-10 12h80l-10-12V62c0-18-10-34-30-34Z"/>
  <path class="bell-band" d="M34 72h52"/>
  <circle class="bell-clapper" cx="60" cy="100" r="8"/>
</svg>`;

export function createBell(ctx) {
  const ui = { line: null, catTimer: null };

  // The bell half of the "ลดความโกรธ" tab.
  function panel() {
    return `<div class="bell-page">
        <div class="bell-cat" aria-hidden="true">${ctx.mascot('normal', { size: 84 })}</div>
        <div class="bell-stage">
          <button class="bell-btn" data-act="bellStrike" aria-label="ตีระฆัง" aria-describedby="bell-line">${BELL_SVG}</button>
        </div>
        <p class="bell-line" id="bell-line" aria-live="polite">${ui.line == null ? 'แตะระฆังเมื่อไหร่ก็ได้' : BELL_LINES[ui.line]}</p>
        <p class="bell-hint small">กดกี่ครั้งก็ได้ ไม่มีเป้าหมาย ไม่มีการนับ</p>
      </div>`;
  }

  // Updates the DOM in place so a quick second strike never interrupts the first one's animation.
  function strike(el) {
    ctx.ui.userActed = true;
    mindfulBell();
    haptic(15);
    ui.line = nextLine(ui.line);
    const page = el.closest('.bell-page');
    const line = page.querySelector('.bell-line');
    line.textContent = BELL_LINES[ui.line];
    line.classList.remove('show');
    void line.offsetWidth; // restart the fade-in
    line.classList.add('show');

    el.classList.remove('swing');
    void el.offsetWidth;
    el.classList.add('swing');
    const ring = document.createElement('span');
    ring.className = 'bell-ripple';
    ring.addEventListener('animationend', () => ring.remove());
    el.parentElement.append(ring);

    // The cat looks up (eyes open, a little hop), then settles again.
    const cat = page.querySelector('.bell-cat');
    const img = cat.querySelector('img');
    img.src = 'img/badges/cat-happy.webp';
    cat.classList.remove('startle');
    void cat.offsetWidth;
    cat.classList.add('startle');
    clearTimeout(ui.catTimer);
    ui.catTimer = setTimeout(() => { img.src = 'img/badges/cat-sit.webp'; }, 2200);
  }

  const actions = {
    bellStrike: (d, el) => strike(el),
  };

  return { panel, actions, release: releaseAudioSession };
}
