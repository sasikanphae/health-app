// Meal plan: simple Thai menus from a made-to-order stall (ตามสั่ง), a
// convenience store, or a few steps at home. No calorie counting — menus are
// only nudged towards protein on training days and lighter food on rest days.
import { hash } from './health.js';

export const MEAL_SLOTS = {
  b: { label: 'มื้อเช้า' },
  l: { label: 'มื้อกลางวัน' },
  d: { label: 'มื้อเย็น' },
  s: { label: 'ของว่างหลังออกกำลัง' },
};

export const FOOD_MODES = {
  cook: { label: 'ทำเองเป็นส่วนใหญ่' },
  buy: { label: 'ซื้อกินเป็นหลัก' },
  mix: { label: 'ผสมกัน' },
};

export const BUDGETS = {
  low: { label: 'ประหยัด', hint: 'ไม่เกิน ~50 บาท/มื้อ', max: 50 },
  mid: { label: 'กลางๆ', hint: 'ไม่เกิน ~90 บาท/มื้อ', max: 90 },
  high: { label: 'สบายๆ', hint: 'ไม่จำกัด', max: Infinity },
};

export const ALLERGIES = {
  seafood: 'อาหารทะเล/ปลา',
  peanut: 'ถั่วลิสง',
  milk: 'นมวัว',
  egg: 'ไข่',
  wheat: 'แป้งสาลี',
  soy: 'ถั่วเหลือง',
};

export const AVOID = {
  pork: 'ไม่กินหมู',
  beef: 'ไม่กินเนื้อวัว',
  veg: 'มังสวิรัติ',
};

export const SOURCES = {
  shop: { label: 'ร้านตามสั่ง' },
  store: { label: 'ร้านสะดวกซื้อ' },
  cook: { label: 'ทำเอง' },
};

// Items most kitchens already have; listed separately on the shopping list.
export const STAPLES = new Set(['ข้าวสาร', 'น้ำมันพืช', 'น้ำปลา', 'ซีอิ๊วขาว', 'กระเทียม']);

// meats: pork / chicken / fish / seafood / beef (for "don't eat" and vegetarian filters)
// protein: high / mid; light: easy on the stomach, preferred on rest days
export const MENUS = [
  // ---- breakfast ----
  { id: 'joke', name: 'โจ๊กหมูใส่ไข่', slots: ['b'], src: 'shop', price: 45, protein: 'mid', light: true, allergens: ['egg'], meats: ['pork'], tip: 'ร้านโจ๊กหน้าปากซอย หรือโจ๊กคัพในร้านสะดวกซื้อก็ได้' },
  { id: 'khaotom-pla', name: 'ข้าวต้มปลา', slots: ['b', 'd'], src: 'shop', price: 60, protein: 'high', light: true, allergens: ['seafood'], meats: ['fish'], tip: 'ร้านข้าวต้มส่วนใหญ่มี ขอขิงกับขึ้นฉ่ายเพิ่มได้' },
  { id: 'egg-soymilk', name: 'ไข่ต้ม 2 ฟอง + นมถั่วเหลือง + กล้วย', slots: ['b', 's'], src: 'store', price: 45, protein: 'high', light: true, allergens: ['egg', 'soy'], meats: [], tip: 'หยิบไข่ต้มจากตู้แช่ กล้วยหอมมักอยู่ข้างเคาน์เตอร์' },
  { id: 'tuna-sandwich', name: 'แซนด์วิชทูน่า + นมจืด', slots: ['b'], src: 'store', price: 55, protein: 'high', light: false, allergens: ['seafood', 'wheat', 'milk', 'egg'], meats: ['fish'], tip: 'เลือกแบบขนมปังโฮลวีตถ้ามี' },
  { id: 'greek-yogurt', name: 'กรีกโยเกิร์ต + กล้วย', slots: ['b', 's'], src: 'store', price: 50, protein: 'high', light: true, allergens: ['milk'], meats: [], tip: 'เลือกรสธรรมชาติ หวานน้อย' },
  { id: 'sticky-chicken', name: 'ข้าวเหนียวไก่ย่าง', slots: ['b', 'l'], src: 'shop', price: 50, protein: 'high', light: false, allergens: [], meats: ['chicken'], tip: 'ขอเนื้ออก ข้าวเหนียวห่อเดียวพอ' },
  { id: 'soy-toast', name: 'นมถั่วเหลือง + ขนมปังโฮลวีต + กล้วย', slots: ['b'], src: 'store', price: 45, protein: 'mid', light: true, allergens: ['soy', 'wheat'], meats: [], tip: 'นมถั่วเหลืองสูตรหวานน้อยดีที่สุด' },
  {
    id: 'khai-jiao', name: 'ข้าวไข่เจียว', slots: ['b', 'd'], src: 'cook', price: 20, protein: 'mid', light: false, allergens: ['egg'], meats: [],
    steps: ['ตอกไข่ 2 ฟอง ใส่น้ำปลาเล็กน้อย ตีให้ฟู', 'ตั้งกระทะใส่น้ำมันให้ร้อน เทไข่ลงทอดจนเหลือง', 'กลับด้าน ตักเสิร์ฟกับข้าวสวย'],
    ingredients: ['ไข่ไก่', 'น้ำปลา', 'น้ำมันพืช', 'ข้าวสาร'],
  },
  {
    id: 'egg-toast', name: 'ขนมปังโฮลวีต + ไข่ดาว + นมจืด', slots: ['b'], src: 'cook', price: 30, protein: 'high', light: false, allergens: ['wheat', 'egg', 'milk'], meats: [],
    steps: ['ทอดไข่ดาวไฟกลาง', 'ปิ้งขนมปัง 2 แผ่น', 'กินคู่กับนมจืด 1 แก้ว'],
    ingredients: ['ขนมปังโฮลวีต', 'ไข่ไก่', 'นมจืด', 'น้ำมันพืช'],
  },
  {
    id: 'oat-soymilk', name: 'ข้าวโอ๊ตนมถั่วเหลือง + กล้วย', slots: ['b'], src: 'cook', price: 25, protein: 'mid', light: true, allergens: ['soy'], meats: [],
    steps: ['ต้มข้าวโอ๊ต 4 ช้อนกับนมถั่วเหลือง 1 กล่อง 2–3 นาที', 'หั่นกล้วยวางด้านบน'],
    ingredients: ['ข้าวโอ๊ต', 'นมถั่วเหลือง', 'กล้วยหอม'],
  },

  // ---- lunch / dinner: made-to-order stalls ----
  { id: 'kaprao-chicken', name: 'ข้าวกะเพราไก่ + ไข่ดาว', slots: ['l', 'd'], src: 'shop', price: 60, protein: 'high', light: false, allergens: ['egg'], meats: ['chicken'], tip: 'สั่ง "ไม่หวาน น้ำมันน้อย" ได้เลย' },
  { id: 'kaprao-pork', name: 'ข้าวกะเพราหมูสับ', slots: ['l', 'd'], src: 'shop', price: 50, protein: 'high', light: false, allergens: [], meats: ['pork'], tip: 'ขอเพิ่มถั่วฝักยาวหรือผักได้' },
  { id: 'kaprao-tofu', name: 'ข้าวกะเพราเต้าหู้ + ไข่ดาว', slots: ['l', 'd'], src: 'shop', price: 50, protein: 'mid', light: false, allergens: ['soy', 'egg'], meats: [], tip: 'บอกร้านว่า "ไม่ใส่ซอสหอย" ถ้ากินมังสวิรัติ' },
  { id: 'khao-man-kai', name: 'ข้าวมันไก่ต้ม', slots: ['l'], src: 'shop', price: 50, protein: 'high', light: false, allergens: ['soy'], meats: ['chicken'], tip: 'ขอเนื้ออก หนังน้อย' },
  { id: 'suki', name: 'สุกี้น้ำไก่', slots: ['l', 'd'], src: 'shop', price: 60, protein: 'high', light: true, allergens: ['egg', 'soy'], meats: ['chicken'], tip: 'สั่งแบบน้ำ เน้นผัก วุ้นเส้นน้อย' },
  { id: 'tomyum-chicken', name: 'ต้มยำไก่น้ำใส + ข้าว', slots: ['l', 'd'], src: 'shop', price: 60, protein: 'high', light: true, allergens: [], meats: ['chicken'], tip: 'แบบน้ำใสเบากว่าน้ำข้น' },
  { id: 'noodle-pork', name: 'ก๋วยเตี๋ยวน้ำใสลูกชิ้นหมู', slots: ['l', 'd'], src: 'shop', price: 50, protein: 'mid', light: true, allergens: [], meats: ['pork'], tip: 'เส้นเล็กหรือเส้นหมี่ เติมถั่วงอกผักเยอะๆ' },
  { id: 'yum-woonsen', name: 'ยำวุ้นเส้นกุ้ง', slots: ['l', 'd'], src: 'shop', price: 60, protein: 'mid', light: true, allergens: ['seafood'], meats: ['seafood'], tip: 'สั่งเผ็ดน้อยถ้าท้องไม่ค่อยดี' },
  { id: 'somtam-chicken', name: 'ส้มตำไทย + ไก่ย่าง + ข้าวเหนียว', slots: ['l', 'd'], src: 'shop', price: 90, protein: 'high', light: false, allergens: ['peanut', 'seafood'], meats: ['chicken'], tip: 'บอก "ไม่ใส่ถั่ว ไม่ใส่กุ้งแห้ง" ได้ถ้าแพ้' },

  // ---- lunch / dinner: convenience store ----
  { id: 'store-chicken-rice', name: 'อกไก่นุ่ม + ข้าวกล้องอุ่นร้อน', slots: ['l', 'd'], src: 'store', price: 65, protein: 'high', light: true, allergens: [], meats: ['chicken'], tip: 'ให้พนักงานอุ่นข้าวกล้องในตู้แช่' },
  { id: 'store-salad', name: 'สลัดอกไก่', slots: ['l', 'd'], src: 'store', price: 60, protein: 'high', light: true, allergens: ['egg'], meats: ['chicken'], tip: 'ใส่น้ำสลัดครึ่งซองก็อร่อยแล้ว' },
  { id: 'store-kaprao', name: 'ข้าวกะเพราไก่แช่แข็ง + ไข่ต้ม', slots: ['l', 'd'], src: 'store', price: 60, protein: 'high', light: false, allergens: ['egg'], meats: ['chicken'], tip: 'อุ่นไมโครเวฟตามฉลาก' },
  { id: 'store-veg-rice', name: 'ข้าวกล้องผัดผักเต้าหู้ (แช่แข็ง)', slots: ['l', 'd'], src: 'store', price: 45, protein: 'mid', light: true, allergens: ['soy'], meats: [], tip: 'ดูสัญลักษณ์มังสวิรัติบนกล่อง' },

  // ---- lunch / dinner: cook at home (a few steps) ----
  {
    id: 'garlic-chicken', name: 'อกไก่ผัดกระเทียม + ข้าว', slots: ['l', 'd'], src: 'cook', price: 40, protein: 'high', light: false, allergens: ['soy'], meats: ['chicken'],
    steps: ['หั่นอกไก่ชิ้นพอดีคำ หมักซีอิ๊วขาว 1 ช้อน', 'เจียวกระเทียมกับน้ำมันเล็กน้อยจนหอม', 'ใส่ไก่ผัดจนสุกทั่ว 5–6 นาที เสิร์ฟกับข้าวและแตงกวา'],
    ingredients: ['อกไก่', 'กระเทียม', 'ซีอิ๊วขาว', 'แตงกวา', 'น้ำมันพืช', 'ข้าวสาร'],
  },
  {
    id: 'tofu-soup', name: 'ต้มจืดเต้าหู้หมูสับ + ข้าว', slots: ['l', 'd'], src: 'cook', price: 40, protein: 'mid', light: true, allergens: ['soy', 'egg'], meats: ['pork'],
    steps: ['ต้มน้ำ 2 ถ้วย ปรุงซีอิ๊วขาวเล็กน้อย', 'ปั้นหมูสับเป็นก้อนเล็กใส่ลงไปจนสุก', 'ใส่เต้าหู้ไข่กับผักกาดขาว ต้มต่อ 3 นาที โรยต้นหอม'],
    ingredients: ['หมูสับ', 'เต้าหู้ไข่', 'ผักกาดขาว', 'ต้นหอม', 'ซีอิ๊วขาว', 'ข้าวสาร'],
  },
  {
    id: 'steamed-egg', name: 'ไข่ตุ๋น + ผักลวก + ข้าว', slots: ['d'], src: 'cook', price: 20, protein: 'mid', light: true, allergens: ['egg'], meats: [],
    steps: ['ตีไข่ 2 ฟองกับน้ำครึ่งถ้วย ใส่น้ำปลานิดหน่อย', 'ใส่ถ้วย นึ่งหรือเข้าไมโครเวฟไฟกลาง 2–3 นาทีจนเซ็ตตัว', 'ลวกบร็อกโคลีกินคู่กัน'],
    ingredients: ['ไข่ไก่', 'น้ำปลา', 'บร็อกโคลี', 'ข้าวสาร'],
  },
  {
    id: 'chicken-fried-rice', name: 'ข้าวผัดไข่อกไก่', slots: ['l', 'd'], src: 'cook', price: 35, protein: 'high', light: false, allergens: ['egg', 'soy'], meats: ['chicken'],
    steps: ['ผัดอกไก่หั่นเต๋ากับกระเทียมจนสุก', 'ตอกไข่ลงไปยีให้สุก', 'ใส่ข้าวสวย ปรุงซีอิ๊วขาว ผัดให้เข้ากัน'],
    ingredients: ['อกไก่', 'ไข่ไก่', 'กระเทียม', 'ซีอิ๊วขาว', 'น้ำมันพืช', 'ข้าวสาร'],
  },
  {
    id: 'mackerel', name: 'ปลาทูทอด + ผักบุ้งลวก + ข้าว', slots: ['l', 'd'], src: 'cook', price: 45, protein: 'high', light: false, allergens: ['seafood'], meats: ['fish'],
    steps: ['ซื้อปลาทูนึ่งจากตลาด', 'ทอดไฟกลางข้างละ 3–4 นาที', 'ลวกผักบุ้งกินคู่กับข้าว'],
    ingredients: ['ปลาทู', 'ผักบุ้ง', 'น้ำมันพืช', 'ข้าวสาร'],
  },
  {
    id: 'veg-stirfry', name: 'ผัดผักรวม + ไข่ต้ม + ข้าว', slots: ['l', 'd'], src: 'cook', price: 30, protein: 'mid', light: true, allergens: ['egg', 'soy'], meats: [],
    steps: ['ต้มไข่ 8 นาที', 'ผัดกระเทียม ใส่บร็อกโคลีกับแครอท ปรุงซีอิ๊วขาว ผัดไฟแรง 2–3 นาที', 'กินกับข้าวและไข่ต้ม'],
    ingredients: ['บร็อกโคลี', 'แครอท', 'ไข่ไก่', 'กระเทียม', 'ซีอิ๊วขาว', 'ข้าวสาร'],
  },

  // ---- post-workout snacks ----
  { id: 'boiled-eggs', name: 'ไข่ต้ม 2 ฟอง', slots: ['s'], src: 'store', price: 20, protein: 'high', light: true, allergens: ['egg'], meats: [], tip: 'กินภายใน 1 ชั่วโมงหลังเล่น' },
  { id: 'milk-banana', name: 'นมจืด + กล้วย', slots: ['s'], src: 'store', price: 30, protein: 'mid', light: true, allergens: ['milk'], meats: [], tip: 'นมรสจืดดีกว่ารสหวาน' },
  { id: 'soymilk-banana', name: 'นมถั่วเหลือง + กล้วย', slots: ['s'], src: 'store', price: 25, protein: 'mid', light: true, allergens: ['soy'], meats: [], tip: 'สูตรหวานน้อย' },
  { id: 'chicken-pack', name: 'อกไก่นุ่ม 1 ซอง', slots: ['s'], src: 'store', price: 40, protein: 'high', light: true, allergens: [], meats: ['chicken'], tip: 'เปิดกินได้เลยไม่ต้องอุ่น' },
];

const SLOT_SOURCES = {
  buy: { b: ['store', 'shop'], l: ['shop', 'store'], d: ['shop', 'store'], s: ['store'] },
  cook: { b: ['cook'], l: ['cook'], d: ['cook'], s: ['store'] },
  mix: { b: ['store', 'cook'], l: ['shop', 'store'], d: ['cook'], s: ['store'] },
};

export function isAllowed(menu, food) {
  if (menu.allergens.some((a) => food.allergies.includes(a))) return false;
  if (food.avoid.includes('veg') && menu.meats.length) return false;
  return !menu.meats.some((m) => food.avoid.includes(m));
}

// Menus that fit the user's food settings for a slot. Allergies and diet are
// hard rules; where to get it and budget are relaxed if nothing is left.
export function candidates(food, slot) {
  const safe = MENUS.filter((m) => m.slots.includes(slot) && isAllowed(m, food));
  const sources = SLOT_SOURCES[food.mode]?.[slot] ?? SLOT_SOURCES.mix[slot];
  const bySource = safe.filter((m) => sources.includes(m.src));
  let list = bySource.length ? bySource : safe;
  const max = BUDGETS[food.budget]?.max ?? Infinity;
  const byBudget = list.filter((m) => m.price <= max);
  if (byBudget.length) list = byBudget;
  return list;
}

// Training days lean on protein, rest days on lighter food.
export function mealDayType(session) {
  if (!session || session.intensity === 'rest') return 'light';
  return session.kind === 'strength' ? 'protein' : 'normal';
}

export const DAY_TYPE_LABEL = {
  protein: 'วันเล่นเวท เน้นโปรตีน',
  normal: 'วันคาร์ดิโอ กินปกติ',
  light: 'วันพัก กินเบาๆ',
};

export function pickMeal({ key, slot, food, dayType, swap = 0, exclude = [] }) {
  let list = candidates(food, slot);
  if (!list.length) return null;
  const preferred = list.filter((m) => (dayType === 'protein' ? m.protein === 'high' : dayType === 'light' ? m.light : true));
  if (preferred.length) list = preferred;
  const fresh = list.filter((m) => !exclude.includes(m.id));
  if (fresh.length) list = fresh;
  return list[(hash(`${key}:${slot}`) + swap) % list.length];
}

// One day's menus. `slots` comes from the day timeline (the snack only on strength days).
// avoid: menu ids to steer away from (Cat Memory); ignored if nothing else fits.
export function dayMeals({ key, food, dayType, slots, swaps = {}, avoid = [] }) {
  const out = {};
  const used = [];
  for (const slot of slots) {
    const m = pickMeal({ key, slot, food, dayType, swap: swaps[slot] ?? 0, exclude: [...used, ...avoid] });
    out[slot] = m;
    if (m) used.push(m.id);
  }
  return out;
}

// Ingredients for every home-cooked meal in the list of days' menus.
export function shoppingList(daysMeals) {
  const counts = new Map();
  for (const meals of daysMeals) {
    for (const m of Object.values(meals)) {
      if (m?.src !== 'cook') continue;
      for (const ing of m.ingredients) counts.set(ing, (counts.get(ing) ?? 0) + 1);
    }
  }
  return [...counts]
    .map(([name, count]) => ({ name, count, staple: STAPLES.has(name) }))
    .sort((a, b) => a.staple - b.staple || b.count - a.count || a.name.localeCompare(b.name, 'th'));
}
