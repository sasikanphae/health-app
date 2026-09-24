import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toJs } from '../scripts/build-quotes.mjs';
import {
  DAILY_QUOTES, getDayOfYear, getQuoteByDate, getRandomQuote, getTodayQuote,
} from '../js/daily-quotes.js';

test('js/daily-quotes.js is up to date with src/data/dailyQuotes.ts (run `npm run quotes`)', () => {
  const ts = readFileSync(new URL('../src/data/dailyQuotes.ts', import.meta.url), 'utf8');
  assert.equal(readFileSync(new URL('../js/daily-quotes.js', import.meta.url), 'utf8'), toJs(ts));
});

test('one quote for every day of the year, each with text, author, tag and category', () => {
  assert.equal(DAILY_QUOTES.length, 365);
  assert.deepEqual([...new Set(DAILY_QUOTES.map((q) => q.dayOfYear))].sort((a, b) => a - b), Array.from({ length: 365 }, (_, i) => i + 1));
  for (const q of DAILY_QUOTES) assert.ok(q.quote && q.author && q.tag && q.category, `quote ${q.id}`);
});

test('the quote follows the local calendar day', () => {
  assert.equal(getDayOfYear(new Date(2026, 0, 1)), 1);
  assert.equal(getDayOfYear(new Date(2026, 11, 31, 23, 59)), 365);
  assert.equal(getQuoteByDate(new Date(2026, 1, 1)).dayOfYear, 32);
  assert.equal(getQuoteByDate(new Date(2028, 11, 31)).dayOfYear, 365); // day 366 of a leap year
  assert.equal(getTodayQuote().dayOfYear, getDayOfYear(new Date()));
  assert.ok(DAILY_QUOTES.includes(getRandomQuote()));
});

test('the generated file carries exactly the same quotes as the .ts source', async () => {
  const ts = await import('../src/data/dailyQuotes.ts');
  assert.deepEqual(DAILY_QUOTES, ts.DAILY_QUOTES);
});
