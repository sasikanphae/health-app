// src/data/dailyQuotes.ts is the source of truth. Browsers can't load
// TypeScript and this app has no build step, so this copies it to
// js/daily-quotes.js with the types stripped (content unchanged).
// Run after editing the quotes:  npm run quotes
import { readFileSync, writeFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

const src = new URL('../src/data/dailyQuotes.ts', import.meta.url);
const out = new URL('../js/daily-quotes.js', import.meta.url);
// Stripping leaves blanks where the types were; tidy them (tests check the data is identical).
export const toJs = (ts) => `// GENERATED from src/data/dailyQuotes.ts by scripts/build-quotes.mjs — edit the .ts, then run \`npm run quotes\`.\n${
  stripTypeScriptTypes(ts, { mode: 'strip' })
    .replace(/[^\S\n]+$/gm, '') // incl. the en-spaces left for multi-byte type text
    .replace(/(\S)[^\S\n]{2,}(?=[=){,])/g, '$1 ')
    .replace(/\((\w+)[^\S\n]+\)/g, '($1)')
    .replace(/^\n+/, '')
    .replace(/\n{3,}/g, '\n\n')}`;

if (import.meta.url === `file://${process.argv[1]}`) {
  writeFileSync(out, toJs(readFileSync(src, 'utf8')));
  console.log('wrote js/daily-quotes.js');
}
