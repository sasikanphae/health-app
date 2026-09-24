import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseInbox, parseTime, parseDate, splitClauses, needsReview, guessExpense } from '../js/inbox.js';

const TODAY = '2026-09-24'; // Thursday
const NOW = new Date(2026, 8, 24, 10, 0).getTime();
const parse = (t) => parseInbox(t, { today: TODAY, now: NOW });
const brief = (items) => items.map((i) => [i.cat, i.title, i.date, i.time]);

test('one spoken sentence becomes an appointment, a shopping item and a reminder', () => {
  const items = parse('พรุ่งนี้บ่ายสองต้องไปโรงพยาบาล แล้วก่อนออกจากบ้านอย่าลืมซื้ออาหารแมว');
  assert.deepEqual(brief(items), [
    ['appt', 'ไปโรงพยาบาล', '2026-09-25', '14:00'],
    ['shop', 'อาหารแมว', null, null],
    ['remind', 'ซื้ออาหารแมว ก่อนออกจากบ้าน', '2026-09-25', '13:00'],
  ]);
  assert.equal(items[0].apptType, 'doctor');
  assert.equal(needsReview(items), true);
});

test('the examples from the inbox', () => {
  assert.deepEqual(brief(parse('ซื้อแชมพู')), [['shop', 'แชมพู', null, null]]);
  assert.deepEqual(brief(parse('พรุ่งนี้โทรหาแม่')), [['remind', 'โทรหาแม่', '2026-09-25', null]]);
  const [h] = parse('ปวดหลังวันนี้');
  assert.deepEqual([h.cat, h.title, h.part], ['health', 'ปวดหลัง', 'back']);
  const [m] = parse('ค่าแท็กซี่ 120');
  assert.deepEqual([m.cat, m.amount, m.expCat], ['money', 120, 'travel']);
  assert.equal(parse('ไอเดียทำสวนผักบนระเบียง')[0].cat, 'idea');
  assert.equal(parse('ประชุมทีมวันศุกร์ 10 โมง')[0].cat, 'work');
});

test('unclear text is kept as an idea without extra taps', () => {
  const items = parse('ต้นไม้ที่ระเบียง');
  assert.equal(items[0].cat, 'idea');
  assert.equal(needsReview(items), false);
  assert.equal(needsReview(parse('ซื้อแชมพู')), false);
  assert.equal(needsReview(parse('นัดหมอฟัน')), true); // appointment without a date
});

test('Thai spoken times', () => {
  const t = (s) => parseTime(s, NOW)?.time;
  assert.equal(t('บ่ายสอง'), '14:00');
  assert.equal(t('บ่ายโมงครึ่ง'), '13:30');
  assert.equal(t('สองทุ่ม'), '20:00');
  assert.equal(t('ทุ่มนึง'), '19:00');
  assert.equal(t('เก้าโมง'), '09:00');
  assert.equal(t('สามโมงเช้า'), '09:00');
  assert.equal(t('ห้าโมงเย็น'), '17:00');
  assert.equal(t('สี่โมง'), '16:00');
  assert.equal(t('เที่ยง'), '12:00');
  assert.equal(t('ตีห้า'), '05:00');
  assert.equal(t('14.30 น.'), '14:30');
  assert.equal(t('อีก 30 นาที'), '10:30');
  assert.equal(t('ตอนเย็น'), '18:00');
  assert.equal(t('ออกกำลังกาย 1 ชั่วโมง'), undefined);
});

test('Thai dates', () => {
  const d = (s) => parseDate(s, TODAY)?.date;
  assert.equal(d('มะรืนนี้'), '2026-09-26');
  assert.equal(d('วันศุกร์'), '2026-09-25');
  assert.equal(d('ศุกร์หน้า'), '2026-10-02');
  assert.equal(d('วันจันทร์'), '2026-09-28');
  assert.equal(d('อาทิตย์หน้า'), '2026-09-28'); // next week (starts Monday)
  assert.equal(d('12 ต.ค.'), '2026-10-12');
  assert.equal(d('วันที่ 3'), '2026-10-03'); // already past this month
});

test('splitting keeps a clause together and lists shopping items', () => {
  assert.deepEqual(splitClauses('ซื้อนม แล้วก็โทรหาพี่'), ['ซื้อนม', 'โทรหาพี่']);
  assert.deepEqual(parse('ซื้อนม ไข่ กับขนมปัง').map((i) => i.title), ['นม', 'ไข่', 'ขนมปัง']);
  assert.equal(parse('กินข้าวเสร็จแล้ว').length, 1);
});

test('expense guesses', () => {
  assert.equal(guessExpense('ค่าฟิตเนสเดือนนี้'), 'gym');
  assert.equal(guessExpense('วิตามินซี'), 'supplement');
  assert.equal(guessExpense('ข้าวมันไก่'), 'food');
  assert.equal(parse('ข้าวมันไก่ 50 บาท')[0].amount, 50);
});
