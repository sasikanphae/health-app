// ทำบุญ (in the ลดความโกรธ tab): a small, warm reward loop tied to things the
// user already does — no competition, no streaks to lose, nothing to "miss".
//   • water goal reached on a day  → 1 เหรียญบุญ (coin) for that day
//   • coin → fish food → the growing fish gets one feed; 5 feeds = one size up;
//     fully grown → a new little fish swims in
//   • first check-in before 07:30 → that day's ตักบาตร scene opens; doing it counts
// Pure functions only — tested in tests/merit.test.js.
export const FEEDS_PER_LEVEL = 5;
export const MAX_LEVEL = 4; // 0 = fry … 4 = fully grown (20 feeds)
export const ALMS_BEFORE = '07:30';
export const FISH_COLORS = ['#f59e3b', '#f7d154', '#f06543', '#fffcf4', '#b9a7f5', '#8acff0'];

export const emptyMerit = (today) => ({
  since: today,
  spent: 0,
  earnedDays: [], // day keys whose coin was given (kept even if a glass is undone later)
  feeds: 0,
  fish: [{ id: 1, feeds: 0, color: 0, born: today }],
  alms: [], // day keys when the user put food in the bowl
});

// Coins ever earned: every day the water goal was met (the app's whole history counts,
// it was real effort) plus days already credited.
export function coinDays(days, merit) {
  const set = new Set(merit.earnedDays);
  for (const [k, d] of Object.entries(days)) if (d?.waterMet) set.add(k);
  return set;
}
export const coins = (days, merit) => Math.max(0, coinDays(days, merit).size - merit.spent);

export const fishLevel = (f) => Math.min(MAX_LEVEL, Math.floor(f.feeds / FEEDS_PER_LEVEL));
export const grown = (f) => fishLevel(f) >= MAX_LEVEL;

// Spend one coin on food. Returns the new merit and what happened, or null if no coin.
export function feed(merit, days, today) {
  if (coins(days, merit) < 1) return null;
  const fish = merit.fish.map((f) => ({ ...f }));
  let growing = fish.find((f) => !grown(f));
  if (!growing) { // everyone grown (shouldn't happen): a new fry arrives to eat
    growing = { id: Math.max(...fish.map((f) => f.id)) + 1, feeds: 0, color: fish.length % FISH_COLORS.length, born: today };
    fish.push(growing);
  }
  const before = fishLevel(growing);
  growing.feeds += 1;
  const after = fishLevel(growing);
  let newFish = null;
  if (grown(growing)) {
    newFish = { id: Math.max(...fish.map((f) => f.id)) + 1, feeds: 0, color: fish.length % FISH_COLORS.length, born: today };
    fish.push(newFish);
  }
  return {
    merit: { ...merit, spent: merit.spent + 1, feeds: merit.feeds + 1, fish },
    fed: growing.id, grewUp: after > before, fullyGrown: after === MAX_LEVEL && before < MAX_LEVEL, newFish,
  };
}

// Feeds left until the growing fish's next size.
export function nextGrowth(merit) {
  const g = merit.fish.find((f) => !grown(f));
  if (!g) return null;
  return { id: g.id, level: fishLevel(g), left: FEEDS_PER_LEVEL - (g.feeds % FEEDS_PER_LEVEL) };
}

const minutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// Is today's ตักบาตร open? Only if the day's FIRST check-in happened before 07:30
// on that same day. (Re-editing a check-in later keeps the first time.)
export function almsOpen(day, key) {
  const at = day?.checkin?.firstAt ?? day?.checkin?.at;
  if (!at) return false;
  const d = new Date(at);
  const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return k === key && d.getHours() * 60 + d.getMinutes() < minutes(ALMS_BEFORE);
}

export function giveAlms(merit, day, key) {
  if (!almsOpen(day, key) || merit.alms.includes(key)) return null;
  return { ...merit, alms: [...merit.alms, key] };
}
