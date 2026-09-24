// "แจ้งเตือนแม้ปิดแอป" (Settings card, the ask-first sheet, the iPhone guide)
// and keeping the push server's copy of upcoming reminders up to date.
// Nothing is sent anywhere until the user turns it on; everything stays off-able.
import { PUSH_CATS } from './push-plan.js';
import { PUSH_SERVER } from './push-config.js';
import {
  pushSupport, enablePush, disablePush, pushActive, syncJobs, saveSnapshot, serverTest, isIOS, isStandalone,
} from './push-client.js';

export function createPush(ctx) {
  const { state, esc } = ctx;
  const cfg = () => (state.settings.push ??= { on: false, server: '', cats: Object.fromEntries(Object.keys(PUSH_CATS).map((k) => [k, true])), discreet: false });
  const server = () => (cfg().server || PUSH_SERVER || '').trim();
  const ui = { active: false, busy: false, last: null, error: null, count: 0, next: null };
  let timer = null;

  const on = () => cfg().on && ui.active;
  // Categories the server takes care of right now (the page skips its own buzz for these).
  const covers = (cat) => on() && cfg().cats[cat] !== false;

  async function refreshActive() {
    try {
      ui.active = cfg().on && await pushActive(ctx.swReg());
    } catch {
      ui.active = false;
    }
    if (cfg().on && !ui.active && 'Notification' in window && Notification.permission === 'denied') {
      ui.error = 'การแจ้งเตือนถูกปิดในการตั้งค่าเครื่อง';
    }
    return ui.active;
  }

  // Upload the next week's reminders. Called after every change (debounced),
  // when the app goes to the background, and on start.
  async function sync({ keepalive = false } = {}) {
    if (!cfg().on) return;
    try {
      await saveSnapshot(ctx.snapshot());
      if (!ui.active && !(await refreshActive())) return;
      const jobs = ctx.jobs(cfg());
      let res;
      try {
        res = await syncJobs(jobs, ctx.snapshot(), { keepalive });
      } catch (e) {
        if (!keepalive || e.status) throw e;
        res = await syncJobs(jobs, ctx.snapshot()); // body too big for keepalive
      }
      Object.assign(ui, { last: Date.now(), error: null, count: res.stored, next: res.next });
    } catch (e) {
      ui.error = e.status === 401 ? 'เซิร์ฟเวอร์ไม่รู้จักเครื่องนี้แล้ว ลองปิดแล้วเปิดใหม่' : 'ส่งรายการเตือนไปเซิร์ฟเวอร์ไม่สำเร็จ (จะลองใหม่เอง)';
    }
    if (ctx.ui.view === 'settings') ctx.renderSettings();
  }
  const soon = () => {
    if (!cfg().on) return;
    clearTimeout(timer);
    timer = setTimeout(() => sync(), 4000);
  };

  // ---------- UI ----------
  const reasonText = {
    insecure: 'ต้องเปิดแอปผ่าน https (เช่น GitHub Pages) ถึงจะใช้แจ้งเตือนแบบ push ได้',
    unsupported: 'เบราว์เซอร์นี้ยังไม่รองรับการแจ้งเตือนแบบ push ลองใช้ Chrome, Edge, Firefox หรือ Safari รุ่นใหม่',
    'ios-old': 'iPhone ต้องเป็น iOS 16.4 ขึ้นไปถึงจะรับแจ้งเตือนได้ อัปเดตเครื่องแล้วลองใหม่นะ',
  };

  function iosGuide() {
    return `<div class="note">
      <b>บน iPhone ต้องเพิ่มแอปไว้ที่หน้าจอโฮมก่อน</b>
      <ol class="small steps-list">
        <li>เปิดหน้านี้ใน <b>Safari</b></li>
        <li>แตะปุ่ม <b>แชร์</b> (สี่เหลี่ยมมีลูกศรชี้ขึ้น)</li>
        <li>เลือก <b>เพิ่มไปยังหน้าจอโฮม</b> แล้วกด <b>เพิ่ม</b></li>
        <li>เปิดแอปจาก <b>ไอคอนแมว</b> บนหน้าจอโฮม แล้วกลับมาที่หน้านี้</li>
      </ol>
      <p class="small">ข้อมูลในแอปที่หน้าจอโฮมแยกจากใน Safari ถ้ามีข้อมูลอยู่แล้ว ใช้ "ส่งออก/นำเข้าข้อมูล" ด้านล่างย้ายไปได้</p>
    </div>`;
  }

  function card() {
    const c = cfg();
    const sup = pushSupport();
    const perm = 'Notification' in window ? Notification.permission : 'default';
    const when = (ms) => (ms ? new Date(ms).toLocaleString('th-TH', { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : '–');
    let body;
    if (!sup.ok && sup.reason === 'ios-install') body = iosGuide();
    else if (!sup.ok) body = `<p class="small">${reasonText[sup.reason]}</p>`;
    else if (!c.on) {
      body = `<p class="small">เด้งเตือนเหมือนแอปแชต แม้ปิดแอปหรือล็อกจออยู่: นัดหมาย บิล เช็กอิน ดื่มน้ำ และออกกำลังกายตอนที่ว่างจริง</p>
        ${perm === 'denied' ? '<p class="note small">เครื่องนี้ปิดการแจ้งเตือนของแอปไว้ เปิดได้ที่ การตั้งค่าเครื่อง › การแจ้งเตือน › เหมียวสมาธิ (หรือการตั้งค่าเว็บไซต์ในเบราว์เซอร์) แล้วกลับมากดอีกครั้ง</p>' : ''}
        ${server() ? '' : `<label class="small">ที่อยู่เซิร์ฟเวอร์แจ้งเตือน<input type="text" data-change="pushServer" placeholder="https://meow-push.xxx.workers.dev" value="${esc(c.server)}" inputmode="url" autocomplete="off"></label>
          <p class="muted small">ยังไม่ได้ตั้งเซิร์ฟเวอร์ ดูวิธีตั้ง (ฟรี ~10 นาที) ในไฟล์ server/README.md</p>`}
        <button class="btn primary block" data-act="pushAsk" ${server() ? '' : 'disabled'}>เปิดแจ้งเตือนแม้ปิดแอป</button>`;
    } else {
      body = `<p class="small">${ui.active ? `เปิดอยู่ · ส่งรายการล่าสุด ${when(ui.last)} · รอส่ง ${ui.count} รายการ · ครั้งถัดไป ${when(ui.next)}` : 'กำลังเชื่อมต่อ…'}</p>
        ${ui.error ? `<p class="note small">${esc(ui.error)}</p>` : ''}
        <div class="chips wrap" role="group" aria-label="เรื่องที่ให้เตือน">${Object.entries(PUSH_CATS).map(([k, v]) =>
          `<button class="chip sm" data-act="pushCat" data-k="${k}" aria-pressed="${c.cats[k] !== false}" title="${v.note}">${v.label}</button>`).join('')}</div>
        <div class="rem-row"><span class="grow">ซ่อนรายละเอียดบนหน้าจอล็อก<br><span class="small muted">เช่น "มีนัดหมายใกล้ถึงเวลา" แทนชื่อนัด</span></span>
          <label class="switch" aria-label="ซ่อนรายละเอียด"><input type="checkbox" data-act="pushDiscreet" ${c.discreet ? 'checked' : ''}><span></span></label></div>
        <div class="row wrap">
          <button class="btn soft" data-act="pushTest">ส่งทดสอบผ่านเซิร์ฟเวอร์</button>
          <button class="btn ghost" data-act="pushOff">ปิดแจ้งเตือนแม้ปิดแอป</button>
        </div>`;
    }
    return `<div class="card" id="push-card">
      <div class="row between"><h2>แจ้งเตือนแม้ปิดแอป</h2>${c.on && ui.active ? '<span class="badge accent">เปิดอยู่</span>' : ''}</div>
      ${body}
      <p class="muted small">ข้อมูลทั้งหมดยังอยู่ในเครื่อง เซิร์ฟเวอร์ได้แค่ "เวลา" กับข้อความที่ถูกเข้ารหัสในเครื่องนี้ (เซิร์ฟเวอร์อ่านไม่ได้) ปิดเมื่อไหร่ก็ลบออกจากเซิร์ฟเวอร์ทันที</p>
    </div>`;
  }

  // Ask-first sheet: explain before the OS pop-up (which can only be asked a few times).
  function renderAsk() {
    return `${ctx.sheetTop('แจ้งเตือนแม้ปิดแอป')}
      <div class="sheet-mascot">${ctx.mascot('bright', { size: 110 })}</div>
      <div class="question">ให้แมวเด้งเตือนได้ แม้ปิดแอปอยู่ไหม?</div>
      <div class="card">
        <ul class="soft-list small">
          <li><b>เตือนอะไร:</b> นัดหมาย บิลที่ใกล้ครบกำหนด เช็กอินตอนเช้า ดื่มน้ำ (เฉพาะตอนที่ดื่มน้อย) และออกกำลังกายช่วงที่ว่างจริง เลือกเปิด/ปิดทีละเรื่องได้</li>
          <li><b>ไม่รบกวน:</b> ไม่เตือนช่วง 21:30–07:00 (ยกเว้นนัดที่มีเวลา) · เรื่องที่ทำแล้วจะไม่เด้ง</li>
          <li><b>ส่งอะไรออกไป:</b> แค่เวลาที่ต้องเตือน กับข้อความที่เข้ารหัสในเครื่องนี้ เซิร์ฟเวอร์อ่านไม่ออก</li>
        </ul>
      </div>
      <p class="small center">กด "อนุญาต" แล้วเครื่องจะถามอีกครั้ง ให้กด <b>อนุญาต</b> (Allow)</p>
      <div class="sheet-foot">
        <button class="btn primary big block" data-act="pushEnable">อนุญาต</button>
        <button class="btn ghost block" data-act="back">ไว้ก่อน</button>
      </div>`;
  }

  const actions = {
    pushAsk: () => ctx.pushSheet({ type: 'pushAsk' }),
    pushEnable: async () => {
      if (ui.busy) return;
      ui.busy = true;
      try {
        const reg = ctx.swReg();
        if (!reg) throw new Error('no sw');
        const r = await enablePush(reg, server());
        if (!r.ok) {
          ctx.popSheet();
          ctx.toast(r.reason === 'denied' ? 'เครื่องปิดการแจ้งเตือนไว้ เปิดได้ในการตั้งค่าเครื่อง' : 'ยังไม่ได้อนุญาต ไว้เปิดทีหลังก็ได้');
          return;
        }
        cfg().on = true;
        ui.active = true;
        ctx.save();
        ctx.popSheet();
        await sync();
        ctx.toast(ui.error ? ui.error : 'เปิดแล้ว แมวจะเด้งเตือนแม้ปิดแอปอยู่');
      } catch {
        ctx.toast('เชื่อมต่อเซิร์ฟเวอร์แจ้งเตือนไม่ได้ ตรวจที่อยู่เซิร์ฟเวอร์อีกครั้ง');
      } finally {
        ui.busy = false;
        ctx.renderSettings();
      }
    },
    pushOff: async () => {
      await disablePush(ctx.swReg()).catch(() => {});
      cfg().on = false;
      ui.active = false;
      ctx.save();
      ctx.renderSettings();
      ctx.toast('ปิดแล้ว ลบรายการเตือนออกจากเซิร์ฟเวอร์แล้ว');
    },
    pushCat: (d) => {
      const c = cfg();
      c.cats[d.k] = c.cats[d.k] === false;
      ctx.save();
      ctx.renderSettings();
      soon();
    },
    pushDiscreet: () => {
      cfg().discreet = !cfg().discreet;
      ctx.save();
      soon();
    },
    pushTest: async () => {
      try {
        const r = await serverTest();
        ctx.toast(r.ok ? 'ส่งแล้ว ลองล็อกจอหรือสลับไปแอปอื่นดู' : `บริการ push ตอบกลับ ${r.status}`);
      } catch {
        ctx.toast('ส่งทดสอบไม่สำเร็จ ตรวจการเชื่อมต่อเซิร์ฟเวอร์');
      }
    },
  };
  const changes = {
    pushServer: (el) => {
      cfg().server = el.value.trim();
      ctx.save();
      ctx.renderSettings();
    },
  };

  // Start: re-check the subscription and upload once; re-upload when leaving the app.
  function start() {
    refreshActive().then(() => sync());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        clearTimeout(timer);
        sync({ keepalive: true });
      }
    });
    setInterval(() => sync(), 30 * 60_000); // the week ahead keeps rolling while the app stays open
  }

  return { card, renderAsk, actions, changes, soon, sync, start, covers, on, cfg, isIOS, isStandalone };
}
