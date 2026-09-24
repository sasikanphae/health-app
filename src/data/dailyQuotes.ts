export interface DailyQuote {
  id: number;
  dayOfYear: number; // 1 to 365
  quote: string;
  author: string;
  category: 'Mindfulness' | 'Rest & Recovery' | 'Strength & Resilience' | 'Habits & Growth' | 'Inner Peace' | 'Self Care' | 'Nature & Harmony';
  tag: 'ศิลปินแห่งชาติ' | 'กวีซีไรต์' | 'ปราชญ์/กวีไทย' | 'สากล/ระดับโลก' | 'ปรัชญาตะวันออก';
}

export const DAILY_QUOTES: DailyQuote[] = [
  // --- มกราคม (DAYS 1-31) ---
  {
    id: 1,
    dayOfYear: 1,
    quote: "เช้าวันใหม่คือแผ่นกระดาษว่างเปล่า ให้เราเขียนความใส่ใจลงในทุกๆ ก้าว",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Habits & Growth",
    tag: "กวีซีไรต์"
  },
  {
    id: 2,
    dayOfYear: 2,
    quote: "กายอยู่กับงาน ใจอยู่กับปัจจุบัน ทีละก้าวอย่างตั้งมั่น คือพลังที่ยั่งยืน",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Mindfulness",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 3,
    dayOfYear: 3,
    quote: "ความแข็งแรงของชีวิต ไม่ใช่การไม่เคยล้ม แต่คือจังหวะลมหายใจที่ไม่ยอมแพ้",
    author: "อังคาร จันทาทิพย์",
    category: "Strength & Resilience",
    tag: "กวีซีไรต์"
  },
  {
    id: 4,
    dayOfYear: 4,
    quote: "ลมหายใจเข้าพาเรากลับบ้าน ลมหายใจออกเติมความเบาให้ร่างกาย",
    author: "ติช นัท ฮันห์ (Thich Nhat Hanh)",
    category: "Mindfulness",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 5,
    dayOfYear: 5,
    quote: "เรียนรู้จากธรรมชาติ ยืดหยุ่นแต่ไม่เปราะบาง อ่อนน้อมแต่แฝงด้วยความเข้มแข็ง",
    author: "วีระ สุดสังข์",
    category: "Nature & Harmony",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 6,
    dayOfYear: 6,
    quote: "สุขภาพคือบทเพลงของร่างกายที่ลื่นไหล เมื่อจิตวิญญาณภายในได้รับการดูแล",
    author: "คาลิล ยิบราน (Kahlil Gibran)",
    category: "Inner Peace",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 7,
    dayOfYear: 7,
    quote: "ทำใจให้สว่างเรืองดั่งเพชร แม้เผชิญมรสุม ใจก็ไม่มัวหมอง",
    author: "อังคาร กัลยาณพงศ์",
    category: "Strength & Resilience",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 8,
    dayOfYear: 8,
    quote: "คุณภาพของชีวิต ขึ้นอยู่กับคุณภาพของความคิดที่คุณเลือกดูแลในแต่ละวัน",
    author: "มาร์คุส ออเรลิอุส (Marcus Aurelius)",
    category: "Mindfulness",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 9,
    dayOfYear: 9,
    quote: "หยาดน้ำย้อยหยดทีละหยด ยังสลักหินได้ด้วยเวลา ร่างกายและจิตใจก็เช่นกัน",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Habits & Growth",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 10,
    dayOfYear: 10,
    quote: "ผ่อนคลายความเครียดรวบรวมพลัง ใจสงบแล้วจึงเดินหน้า",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Rest & Recovery",
    tag: "กวีซีไรต์"
  },
  {
    id: 11,
    dayOfYear: 11,
    quote: "สิ่งที่ยิ่งใหญ่ไม่ได้เกิดจากความฉับพลัน แต่เกิดจากการร้อยเรียงสิ่งเล็กๆ ในทุกวัน",
    author: "วินเซนต์ แวน โก๊ะ (Vincent van Gogh)",
    category: "Habits & Growth",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 12,
    dayOfYear: 12,
    quote: "รดน้ำให้ต้นไม้อย่างอดทน ความสุขของการเติบโตอยู่ที่การเฝ้ามอง",
    author: "วีระ สุดสังข์",
    category: "Nature & Harmony",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 13,
    dayOfYear: 13,
    quote: "ความสุขที่แท้จริงเริ่มต้นขึ้น เมื่อเราเริ่มใส่ใจและถนอมกายใจของตนเอง",
    author: "เลโอ ตอลสตอย (Leo Tolstoy)",
    category: "Self Care",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 14,
    dayOfYear: 14,
    quote: "ร้อยรัดสติไว้กับลมหายใจ ทุกความวุ่นวายจะค่อยๆ คลายลง",
    author: "อังคาร จันทาทิพย์",
    category: "Mindfulness",
    tag: "กวีซีไรต์"
  },
  {
    id: 15,
    dayOfYear: 15,
    quote: "ทรัพย์สินประการแรกและยิ่งใหญ่ที่สุดของมนุษย์ คือ สุขภาพ",
    author: "ราล์ฟ วอลโด เอเมอร์สัน (R.W. Emerson)",
    category: "Self Care",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 16,
    dayOfYear: 16,
    quote: "เมื่อเราอยู่อย่างรู้เท่าทัน ร่างกายจะเป็นสปา จิตใจจะเป็นอาราม",
    author: "พุทธทาสภิกขุ",
    category: "Inner Peace",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 17,
    dayOfYear: 17,
    quote: "สายน้ำที่ไม่หยุดไหลย่อมสะอาด สุขภาพที่ได้รับฝึกฝนย่อมแข็งแกร่ง",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Habits & Growth",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 18,
    dayOfYear: 18,
    quote: "ให้เวลาร่างกายได้พักผ่อน ดั่งแผ่นดินที่พักฟื้นหลังเก็บเกี่ยว",
    author: "เฮนรี เดวิด ธอโร (H.D. Thoreau)",
    category: "Rest & Recovery",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 19,
    dayOfYear: 19,
    quote: "เสียงกระซิบของสายลมเตือนให้รู้ว่า ชั่วขณะนี้คือช่วงเวลาที่ดีที่สุด",
    author: "อังคาร กัลยาณพงศ์",
    category: "Mindfulness",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 20,
    dayOfYear: 20,
    quote: "ชีวิตคือการเดินทางไกล อย่าแบกน้ำหนักที่ไม่จำเป็นไว้ในใจ",
    author: "เสกสรรค์ ประเสริฐกุล",
    category: "Inner Peace",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 21,
    dayOfYear: 21,
    quote: "จงยิ้มให้ตัวเองในกระจก เพราะความรักครั้งสำคัญที่สุดคือการรักตัวเอง",
    author: "คาลิล ยิบราน (Kahlil Gibran)",
    category: "Self Care",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 22,
    dayOfYear: 22,
    quote: "ก้าวเล็กๆ ในวันนี้ รวมกันเป็นเส้นทางไกลอันงดงามในวันหน้า",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Habits & Growth",
    tag: "กวีซีไรต์"
  },
  {
    id: 23,
    dayOfYear: 23,
    quote: "ความสงบภายในคือเกราะคุ้มกันความวุ่นวายภายนอกได้ดีที่สุด",
    author: "เซเนกา (Seneca)",
    category: "Inner Peace",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 24,
    dayOfYear: 24,
    quote: "เมื่อเราหายใจเข้าด้วยความตระหนักรู้ กายและใจจะประสานเป็นหนึ่ง",
    author: "ติช นัท ฮันห์ (Thich Nhat Hanh)",
    category: "Mindfulness",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 25,
    dayOfYear: 25,
    quote: "ความสมบูรณ์แบบไม่มีอยู่จริง มีเพียงการพัฒนาตนด้วยความเมตตา",
    author: "วีระ สุดสังข์",
    category: "Self Care",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 26,
    dayOfYear: 26,
    quote: "จงดูแลร่างกายของคุณ เพราะมันคือ tempat เดียวที่คุณต้องอาศัยอยู่ตลอดชีวิต",
    author: "จิม โรห์น (Jim Rohn)",
    category: "Self Care",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 27,
    dayOfYear: 27,
    quote: "ความอดทนคือรากแก้วของความแข็งแรง ทั้งกายและใจ",
    author: "อังคาร จันทาทิพย์",
    category: "Strength & Resilience",
    tag: "กวีซีไรต์"
  },
  {
    id: 28,
    dayOfYear: 28,
    quote: "ปล่อยให้การนอนหลับชะล้างความล้า ดั่งฝนพรำชำระล้างฝุ่นเมือง",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Rest & Recovery",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 29,
    dayOfYear: 29,
    quote: "การออกกำลังกายคือคำขอบคุณที่มอบให้แก่ร่างกายที่ทำงานหนัก",
    author: "ว.วชิรเมธี",
    category: "Self Care",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 30,
    dayOfYear: 30,
    quote: "ท่ามกลางความเร่งรีบ ให้ใจเราคงความสงบดั่งศูนย์กลางของพายุ",
    author: "เล่าจื๊อ (Lao Tzu)",
    category: "Inner Peace",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 31,
    dayOfYear: 31,
    quote: "สิบนิ้วเรียบประสาน สูดลมเข้าลึก ยิ้มรับวันใหม่ด้วยใจอ่อนโยน",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Mindfulness",
    tag: "กวีซีไรต์"
  },

  // --- กุมภาพันธ์ (DAYS 32-59) ---
  {
    id: 32,
    dayOfYear: 32,
    quote: "ความเมตติต่อตนเอง คือจุดเริ่มต้นของสุขภาพดีทุกประการ",
    author: "พุทธทาสภิกขุ",
    category: "Self Care",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 33,
    dayOfYear: 33,
    quote: "ไม้ใหญ่เติบโตจากเมล็ดเล็กๆ วินัยสุขภาพเริ่มจากก้าวเล็กๆ ในวันนี้",
    author: "ขงจื๊อ (Confucius)",
    category: "Habits & Growth",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 34,
    dayOfYear: 34,
    quote: "ฟังเสียงร่างกายพูดเมื่อมันเหนื่อย อย่ารอให้มันร้องไห้ด้วยความเจ็บป่วย",
    author: "วีระ สุดสังข์",
    category: "Rest & Recovery",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 35,
    dayOfYear: 35,
    quote: "มองดอกไม้บานโดยไม่เร่งรัด เรียนรู้ที่จะเติบโตในจังหวะของตนเอง",
    author: "อังคาร กัลยาณพงศ์",
    category: "Nature & Harmony",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 36,
    dayOfYear: 36,
    quote: "การดื่มน้ำสะอาดและรับอากาศบริสุทธิ์ คือยารักษาโรคที่ดีที่สุดจากธรรมชาติ",
    author: "ฮิปโปเครติส (Hippocrates)",
    category: "Self Care",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 37,
    dayOfYear: 37,
    quote: "สติคือร่มคอยบดบังความวุ่นวาย ใจสงบย่อมผ่องใสแม้ยามแดดจัด",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Mindfulness",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 38,
    dayOfYear: 38,
    quote: "บาดแผลเปรียบเสมือนรอยร้าวที่เปิดทางให้แสงสว่างเข้าถึงใจ",
    author: "รูมี (Rumi)",
    category: "Strength & Resilience",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 39,
    dayOfYear: 39,
    quote: "ทุกยามเย็นที่พระอาทิตย์ตก เตือนเราว่าการพักผ่อนเป็นเรื่องธรรมชาติ",
    author: "อังคาร จันทาทิพย์",
    category: "Rest & Recovery",
    tag: "กวีซีไรต์"
  },
  {
    id: 40,
    dayOfYear: 40,
    quote: "ความสุขไม่ได้อยู่ที่จุดหมาย แต่อยู่ในทุกจังหวะก้าวระหว่างทาง",
    author: "เสกสรรค์ ประเสริฐกุล",
    category: "Mindfulness",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 41,
    dayOfYear: 41,
    quote: "จิตใจเหมือนผืนน้ำ ยามนิ่งสงบจะสะท้อนความงดงามของฟ้า",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Inner Peace",
    tag: "กวีซีไรต์"
  },
  {
    id: 42,
    dayOfYear: 42,
    quote: "การรักษาสมดุลชีวิต ไม่ใช่การหยุดเคลื่อนไหว แต่คือการทรงตัวท่ามกลางการเคลื่อนไหว",
    author: "อัลเบิร์ต ไอน์สไตน์ (Albert Einstein)",
    category: "Nature & Harmony",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 43,
    dayOfYear: 43,
    quote: "ยิ้มให้ความพยายามของตัวเองในวันนี้ ไม่ว่าจะเล็กน้อยเพียงใด",
    author: "ว.วชิรเมธี",
    category: "Self Care",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 44,
    dayOfYear: 44,
    quote: "เมื่อใจไม่แบก ความหนักของโลกก็ลดลงครึ่งหนึ่ง",
    author: "พุทธทาสภิกขุ",
    category: "Inner Peace",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 45,
    dayOfYear: 45,
    quote: "อย่าเปรียบเทียบฤดูกาลของตนเองกับผู้อื่น ทุกคนมีเวลาบานสะพรั่งของตน",
    author: "วีระ สุดสังข์",
    category: "Nature & Harmony",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 46,
    dayOfYear: 46,
    quote: "จังหวะหัวใจที่สม่ำเสมอ คือคำยืนยันว่าชีวิตกำลังสร้างปฏิหาริย์อยู่ทุกวินาที",
    author: "คาลิล ยิบราน (Kahlil Gibran)",
    category: "Mindfulness",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 47,
    dayOfYear: 47,
    quote: "กล้าที่จะช้าลง เพื่อให้จิตวิญญาณตามร่างกายได้ทัน",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Rest & Recovery",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 48,
    dayOfYear: 48,
    quote: "พลังใจอันเข้มแข็ง เติบโตมาจากความอดทนในวันที่เงียบเหงา",
    author: "อังคาร จันทาทิพย์",
    category: "Strength & Resilience",
    tag: "กวีซีไรต์"
  },
  {
    id: 49,
    dayOfYear: 49,
    quote: "สูดอากาศบริสุทธิ์เข้าปอด ปล่อยความกังวลออกไปพร้อมลมหายใจ",
    author: "ติช นัท ฮันห์ (Thich Nhat Hanh)",
    category: "Mindfulness",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 50,
    dayOfYear: 50,
    quote: "การปฏิเสธสิ่งที่ทำลายสุขภาพ คือการเซย์เยสให้ความรักตัวเอง",
    author: "ราล์ฟ วอลโด เอเมอร์สัน (R.W. Emerson)",
    category: "Self Care",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 51,
    dayOfYear: 51,
    quote: "สายฝนที่ตกลงมา นำพาความสดชื่นสู่ต้นไม้ ฉันใด รอยยิ้ม ก็นำพาพลังสู่ใจ ฉันนั้น",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Nature & Harmony",
    tag: "กวีซีไรต์"
  },
  {
    id: 52,
    dayOfYear: 52,
    quote: "เมื่อกายผ่อนคลาย ความคิดจะแจ่มใส ดั่งท้องฟ้าไร้เมฆหมอง",
    author: "อังคาร กัลยาณพงศ์",
    category: "Rest & Recovery",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 53,
    dayOfYear: 53,
    quote: "รักษาวินัยเล็กๆ ทุกวัน ดีกว่าสร้างปาฏิหาริย์เพียงครั้งเดียว",
    author: "มาร์คุส ออเรลิอุส (Marcus Aurelius)",
    category: "Habits & Growth",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 54,
    dayOfYear: 54,
    quote: "เปิดหน้าต่างรับแสงแดดยามเช้า เติมพลังชีวาให้ทุกอณูร่างกาย",
    author: "วีระ สุดสังข์",
    category: "Self Care",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 55,
    dayOfYear: 55,
    quote: "ความสงบไม่ได้เกิดจากการไม่มีปัญหา แต่เกิดจากการเคารพตนเองในยามมีปัญหา",
    author: "เสกสรรค์ ประเสริฐกุล",
    category: "Strength & Resilience",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 56,
    dayOfYear: 56,
    quote: "เดินให้ช้าลง ชิมรสอาหารให้ชัดขึ้น ชื่นชมชีวิตให้มากขึ้น",
    author: "ติช นัท ฮันห์ (Thich Nhat Hanh)",
    category: "Mindfulness",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 57,
    dayOfYear: 57,
    quote: "ต้นไม้ใหญ่ไม่อาจโตได้ในวันเดียว สุขภาพที่สมบูรณ์เกิดจากการสะสม",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Habits & Growth",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 58,
    dayOfYear: 58,
    quote: "โอบกอดข้อบกพร่องของตัวเองด้วยความอ่อนโยน",
    author: "รูมี (Rumi)",
    category: "Self Care",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 59,
    dayOfYear: 59,
    quote: "ให้ทุกการขยับร่างกาย เป็นการเฉลิมฉลองชีวิต",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Self Care",
    tag: "กวีซีไรต์"
  },

  // --- มีนาคม (DAYS 60-90) ---
  {
    id: 60,
    dayOfYear: 60,
    quote: "เมื่อใจไม่ตื่นตระหนก ร่างกายจะซ่อมแซมตัวเองได้ดีที่สุด",
    author: "พุทธทาสภิกขุ",
    category: "Rest & Recovery",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 61,
    dayOfYear: 61,
    quote: "หยาดเหงื่อที่ไหลออก คือความอิดโรยที่ถูกขับออกจากร่างกาย",
    author: "วีระ สุดสังข์",
    category: "Habits & Growth",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 62,
    dayOfYear: 62,
    quote: "ความเข้มแข็งเริ่มต้นที่ความคิด ความแข็งแรงเริ่มต้นที่การลงมือทำ",
    author: "อังคาร จันทาทิพย์",
    category: "Strength & Resilience",
    tag: "กวีซีไรต์"
  },
  {
    id: 63,
    dayOfYear: 63,
    quote: "จงเป็นดั่งไผ่ที่ลู่ตามลม ยืดหยุ่นแต่ไม่เคยหักโค่น",
    author: "เล่าจื๊อ (Lao Tzu)",
    category: "Nature & Harmony",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 64,
    dayOfYear: 64,
    quote: "มองโลกด้วยสายตาเอ็ดดู และมองตัวเองด้วยความเข้าใจ",
    author: "ว.วชิรเมธี",
    category: "Self Care",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 65,
    dayOfYear: 65,
    quote: "หลับตาลงและรับรู้ถึงความเงียบสงบอันลึกซึ้งภายใน",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Inner Peace",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 66,
    dayOfYear: 66,
    quote: "ทุกการเช็คอินในวันนี้ คือการมอบของขวัญให้ตัวเองในอนาคต",
    author: "ราล์ฟ วอลโด เอเมอร์สัน (R.W. Emerson)",
    category: "Habits & Growth",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 67,
    dayOfYear: 67,
    quote: "เมื่อเราอยู่ใกล้ธรรมชาติ จิตใจจะได้รับการบำบัดอย่างหมดจด",
    author: "เฮนรี เดวิด ธอโร (H.D. Thoreau)",
    category: "Nature & Harmony",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 68,
    dayOfYear: 68,
    quote: "ความเพียรพยายามวันละนิด ปลูกฝังเป็นนิสัยอันถาวร",
    author: "อังคาร กัลยาณพงศ์",
    category: "Habits & Growth",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 69,
    dayOfYear: 69,
    quote: "ผ่อนคลายไหล่ ปล่อยฟันไม่กรามแน่น สูดลมหายใจลึกๆ",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Rest & Recovery",
    tag: "กวีซีไรต์"
  },
  {
    id: 70,
    dayOfYear: 70,
    quote: "ร่างกายคือวัดอันทรงเกียรติ จงดูแลดูแลรักษามันอย่างศักดิ์สิทธิ์",
    author: "คาลิล ยิบราน (Kahlil Gibran)",
    category: "Self Care",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 71,
    dayOfYear: 71,
    quote: "จิตใจที่แจ่มใสอาศัยอยู่ในร่างกายที่สมบูรณ์",
    author: "จูเวนัล (Juvenal)",
    category: "Mindfulness",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 72,
    dayOfYear: 72,
    quote: "ความเงียบคือบทเพลงบำบัดที่ดีที่สุดสำหรับหัวใจที่เหนื่อยล้า",
    author: "เสกสรรค์ ประเสริฐกุล",
    category: "Rest & Recovery",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 73,
    dayOfYear: 73,
    quote: "ทุกครั้งที่ล้มลง พื้นดินคือสิ่งรองรับ ให้เราดันตัวขึ้นใหม่",
    author: "อังคาร จันทาทิพย์",
    category: "Strength & Resilience",
    tag: "กวีซีไรต์"
  },
  {
    id: 74,
    dayOfYear: 74,
    quote: "วางเรื่องของเมื่อวานไว้ และอย่าเพิ่งแบกเรื่องของพรุ่งนี้",
    author: "พุทธทาสภิกขุ",
    category: "Mindfulness",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 75,
    dayOfYear: 75,
    quote: "การดื่มน้ำครึ่งแก้ว อยู่ที่ใจมองว่ามันพร่องหรือเต็ม",
    author: "ว.วชิรเมธี",
    category: "Inner Peace",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 76,
    dayOfYear: 76,
    quote: "ความพยายามในการดูแลตัวเอง ไม่เคยเป็นเรื่องเสียเวลา",
    author: "วีระ สุดสังข์",
    category: "Self Care",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 77,
    dayOfYear: 77,
    quote: "ยิ้มให้ความสุขเล็กๆ ที่เกิดขึ้นระหว่างวัน",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Inner Peace",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 78,
    dayOfYear: 78,
    quote: "การฝึกสติคือน้ำทิพย์ชโลมใจในยามแห้งแล้ง",
    author: "ติช นัท ฮันห์ (Thich Nhat Hanh)",
    category: "Mindfulness",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 79,
    dayOfYear: 79,
    quote: "ให้โอกาสร่างกายได้เคลื่อนไหว ให้โอกาสใจได้พักผ่อน",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Rest & Recovery",
    tag: "กวีซีไรต์"
  },
  {
    id: 80,
    dayOfYear: 80,
    quote: "ความสุขไม่ใช่โชคลาภ แต่เป็นพฤติกรรมที่เราเลือกปฏิบัติ",
    author: "อริสโตเติล (Aristotle)",
    category: "Habits & Growth",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 81,
    dayOfYear: 81,
    quote: "การมีชีวิตอยู่อย่าง健康 คือชัยชนะประจำวันที่เงียบเชียบแต่ยิ่งใหญ่",
    author: "อังคาร จันทาทิพย์",
    category: "Self Care",
    tag: "กวีซีไรต์"
  },
  {
    id: 82,
    dayOfYear: 82,
    quote: "ดูแลความคิดในยามที่คุณอยู่คนเดียว ดูแลพฤติกรรมในยามที่คุณอยู่กับผู้อื่น",
    author: "อังคาร กัลยาณพงศ์",
    category: "Mindfulness",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 83,
    dayOfYear: 83,
    quote: "เปิดรับพลังงานดีๆ ด้วยจิตใจที่เปิดกว้าง",
    author: "วินเซนต์ แวน โก๊ะ (Vincent van Gogh)",
    category: "Inner Peace",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 84,
    dayOfYear: 84,
    quote: "การพักผ่อนไม่ใช่การขี้เกียจ แต่คือการชาร์จแบตเตอรี่ชีวิต",
    author: "วีระ สุดสังข์",
    category: "Rest & Recovery",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 85,
    dayOfYear: 85,
    quote: "ในความเงียบสงบ เราจะยินเสียงใจตนเองชัดเจนที่สุด",
    author: "เสกสรรค์ ประเสริฐกุล",
    category: "Inner Peace",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 86,
    dayOfYear: 86,
    quote: "ก้าวยาวเกินไปอาจล้ม ก้าวสั้นสม่ำเสมอเดินได้ไกลกว่า",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Habits & Growth",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 87,
    dayOfYear: 87,
    quote: "ความงดงามของชีวิตซ่อนอยู่ในรายละเอียดเล็กๆ",
    author: "คาลิล ยิบราน (Kahlil Gibran)",
    category: "Mindfulness",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 88,
    dayOfYear: 88,
    quote: "อภัยให้ความผิดพลาดของตัวเองในอดีต แล้วเริ่มใหม่ในวันนี้",
    author: "ว.วชิรเมธี",
    category: "Self Care",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 89,
    dayOfYear: 89,
    quote: "ทุกเช้าคือโอกาสในการรีเซ็ตพลังงานชีวิต",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Habits & Growth",
    tag: "กวีซีไรต์"
  },
  {
    id: 90,
    dayOfYear: 90,
    quote: "สุขภาพดีเริ่มต้นที่ความพอใจในสิ่งที่มี และดูแลสิ่งที่มีให้ดีที่สุด",
    author: "พุทธทาสภิกขุ",
    category: "Self Care",
    tag: "ปราชญ์/กวีไทย"
  },

  // --- เมษายน (DAYS 91-120) ---
  {
    id: 91,
    dayOfYear: 91,
    quote: "ความสงบผ่อนคลายคือยาวิเศษ บำบัดโรคร้ายในใจให้จางหาย",
    author: "อังคาร กัลยาณพงศ์",
    category: "Inner Peace",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 92,
    dayOfYear: 92,
    quote: "การยืดเส้นยืดสาย ยืดหยุ่นทั้งกายและผ่อนคลายจิตใจ",
    author: "วีระ สุดสังข์",
    category: "Self Care",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 93,
    dayOfYear: 93,
    quote: "ความเข้มแข็งไม่ได้อยู่ที่กล้ามเนื้อ แต่อยู่ที่ความตั้งใจที่ไม่ยอมถอย",
    author: "อังคาร จันทาทิพย์",
    category: "Strength & Resilience",
    tag: "กวีซีไรต์"
  },
  {
    id: 94,
    dayOfYear: 94,
    quote: "หายใจลึกๆ เพื่อดึงตัวเองกลับมาสู่ช่วงเวลานี้",
    author: "ติช นัท ฮันห์ (Thich Nhat Hanh)",
    category: "Mindfulness",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 95,
    dayOfYear: 95,
    quote: "ต้นไม้ที่ราก ลึก ย่อมทนทานต่อพายุใหญ่ สุขภาพที่แข็งแกร่งก็เช่นกัน",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Strength & Resilience",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 96,
    dayOfYear: 96,
    quote: "ให้ธรรมชาติชำระล้างความกังวลในจิตใจ",
    author: "เฮนรี เดวิด ธอโร (H.D. Thoreau)",
    category: "Nature & Harmony",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 97,
    dayOfYear: 97,
    quote: "กินอย่างตั้งใจ ดื่มอย่างรู้รส นอนอย่างมีสติ",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Mindfulness",
    tag: "กวีซีไรต์"
  },
  {
    id: 98,
    dayOfYear: 98,
    quote: "การนอนหลับอย่างเต็มอิ่ม คือการให้รางวัลอันมีค่าที่สุดแก่ร่างกาย",
    author: "มาร์คุส ออเรลิอุส (Marcus Aurelius)",
    category: "Rest & Recovery",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 99,
    dayOfYear: 99,
    quote: "ความอ่อนโยนต่อตนเอง เปลี่ยนโลกใบยุ่งเหยิงให้น่าอยู่ขึ้น",
    author: "รูมี (Rumi)",
    category: "Self Care",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 100,
    dayOfYear: 100,
    quote: "ร้อยวันที่เดินหน้าด้วยความใสใจ สร้างรากฐานชีวิตที่มั่นคง",
    author: "วีระ สุดสังข์",
    category: "Habits & Growth",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 101,
    dayOfYear: 101,
    quote: "จิตใจเป็นนาย กายเป็นบ่าว นำทางจิตใจไปในทิศทางที่สดใส",
    author: "พุทธทาสภิกขุ",
    category: "Mindfulness",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 102,
    dayOfYear: 102,
    quote: "อย่ากลัวการขยับช้าๆ จงกลัวการหยุดนิ่งอยู่กับที่",
    author: "ขงจื๊อ (Confucius)",
    category: "Habits & Growth",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 103,
    dayOfYear: 103,
    quote: "ทุกอุปสรรคคือครูที่สอนให้เราแข็งแกร่งและอดทนขึ้น",
    author: "อังคาร จันทาทิพย์",
    category: "Strength & Resilience",
    tag: "กวีซีไรต์"
  },
  {
    id: 104,
    dayOfYear: 104,
    quote: "ความสงบที่แท้จริง อยู่ภายในใจเราเสมอ เพียงแค่นิ่งพอจะมองเห็น",
    author: "เสกสรรค์ ประเสริฐกุล",
    category: "Inner Peace",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 105,
    dayOfYear: 105,
    quote: "เติมพลังด้วยอาหารดี เติมจิตใจด้วยความคิดบวก",
    author: "ว.วชิรเมธี",
    category: "Self Care",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 106,
    dayOfYear: 106,
    quote: "จังหวะชีวิตที่สอดคล้องกับธรรมชาติ นำมาซึ่งความผาสุก",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Nature & Harmony",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 107,
    dayOfYear: 107,
    quote: "คำชมเชยที่ดีที่สุด คือรอยยิ้มที่คุณมอบให้ตัวเองตอนเช็คอินสำเร็จ",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Self Care",
    tag: "กวีซีไรต์"
  },
  {
    id: 108,
    dayOfYear: 108,
    quote: "ความสุขไม่ได้ไกลเกินเอิน แค่สูดลมหายใจเข้าลึกๆ แล้วรู้สึกถึงชีวิต",
    author: "คาลิล ยิบราน (Kahlil Gibran)",
    category: "Mindfulness",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 109,
    dayOfYear: 109,
    quote: "การยิ้มช่วยลดแรงตึงเครียดของกล้ามเนื้อบนใบหน้าและจิตใจ",
    author: "อังคาร กัลยาณพงศ์",
    category: "Rest & Recovery",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 110,
    dayOfYear: 110,
    quote: "สะสมความถดถอยวันละนิด จะนำไปสู่ชัยชนะอันยิ่งใหญ่",
    author: "ราล์ฟ วอลโด เอเมอร์สัน (R.W. Emerson)",
    category: "Habits & Growth",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 111,
    dayOfYear: 111,
    quote: "ดูแลร่างกายให้เหมือนสวนดอกไม้ รดน้ำ พรวนดิน และดึงวัชพืชแห่งความเครียดออกไป",
    author: "วีระ สุดสังข์",
    category: "Self Care",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 112,
    dayOfYear: 112,
    quote: "เมื่อเราให้อภัย ความหนักในใจก็มลายสิ้น",
    author: "เลโอ ตอลสตอย (Leo Tolstoy)",
    category: "Inner Peace",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 113,
    dayOfYear: 113,
    quote: "ไม่มีใครส่องสว่างได้ตลอดเวลา ยอมรับยามค่ำคืนและพักผ่อน",
    author: "อังคาร จันทาทิพย์",
    category: "Rest & Recovery",
    tag: "กวีซีไรต์"
  },
  {
    id: 114,
    dayOfYear: 114,
    quote: "สติคือเพื่อนแท้ที่ไม่เคยทอดทิ้งเราไปไหน",
    author: "ติช นัท ฮันห์ (Thich Nhat Hanh)",
    category: "Mindfulness",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 115,
    dayOfYear: 115,
    quote: "ชีวิตงดงามเสมอเมื่อมองด้วยหัวใจที่กตัญญูต่อสุขภาพ",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Inner Peace",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 116,
    dayOfYear: 116,
    quote: "เดินรับลมเช้า สัมผัสความสว่างสดใสของโลกใบนี้",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Nature & Harmony",
    tag: "กวีซีไรต์"
  },
  {
    id: 117,
    dayOfYear: 117,
    quote: "สร้างภูมิคุ้มกันใจด้วยการคิดบวก สร้างภูมิคุ้มกันกายด้วยการขยับขับเคลื่อน",
    author: "ว.วชิรเมธี",
    category: "Strength & Resilience",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 118,
    dayOfYear: 118,
    quote: "ร่างกายที่ได้เคลื่อนไหว ย่อมปลอดโปร่งดั่งสายน้ำไหล",
    author: "เล่าจื๊อ (Lao Tzu)",
    category: "Habits & Growth",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 119,
    dayOfYear: 119,
    quote: "ความใจเย็นคือความเข้มแข็งขั้นสูง",
    author: "เซเนกา (Seneca)",
    category: "Inner Peace",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 120,
    dayOfYear: 120,
    quote: "สี่เดือนแห่งการตั้งใจ ผลลัพธ์งดงามเริ่มปรากฏในกายและใจ",
    author: "วีระ สุดสังข์",
    category: "Habits & Growth",
    tag: "ปราชญ์/กวีไทย"
  },

  // --- พฤษภาคม (DAYS 121-151) ---
  {
    id: 121,
    dayOfYear: 121,
    quote: "สายฝนนำความสดชื่นมาสู่แผ่นดิน การพักผ่อนนำความสดชื่นมาสู่จิตใจ",
    author: "อังคาร กัลยาณพงศ์",
    category: "Rest & Recovery",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 122,
    dayOfYear: 122,
    quote: "หัวใจที่เปี่ยมด้วยความหวัง คือเครื่องยนต์ที่ไม่มีวันหมดแรง",
    author: "อังคาร จันทาทิพย์",
    category: "Strength & Resilience",
    tag: "กวีซีไรต์"
  },
  {
    id: 123,
    dayOfYear: 123,
    quote: "ทุกการเคลื่อนไหวสร้างพลัง ทุกการหยุดนิ่งสร้างสมาธิ",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Mindfulness",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 124,
    dayOfYear: 124,
    quote: "เมื่อใจสงบ โลกทั้งใบจะสงบตาม",
    author: "พุทธทาสภิกขุ",
    category: "Inner Peace",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 125,
    dayOfYear: 125,
    quote: "จงอ่อนโยนกับตนเอง ในวันที่อะไรๆ ไม่เป็นไปตามแผน",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Self Care",
    tag: "กวีซีไรต์"
  },
  {
    id: 126,
    dayOfYear: 126,
    quote: "ความสมบูรณ์แบบไม่ได้หมายถึงการไร้ที่ติ แต่คือการยอมรับตามความเป็นจริง",
    author: "วินเซนต์ แวน โก๊ะ (Vincent van Gogh)",
    category: "Self Care",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 127,
    dayOfYear: 127,
    quote: "ให้ธรรมชาติสอนเราเรื่องความอดทนและการผลิบาน",
    author: "วีระ สุดสังข์",
    category: "Nature & Harmony",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 128,
    dayOfYear: 128,
    quote: "การหายใจเข้าคือการรับความรัก การหายใจออกคือการแบ่งปันความรัก",
    author: "ติช นัท ฮันห์ (Thich Nhat Hanh)",
    category: "Mindfulness",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 129,
    dayOfYear: 129,
    quote: "ไม่มีสิ่งใดมีค่าไปกว่าความรู้สึกสบายใจและร่างกายที่ปราศจากโรค",
    author: "เสกสรรค์ ประเสริฐกุล",
    category: "Self Care",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 130,
    dayOfYear: 130,
    quote: "เมื่อเราให้เวลากับสุขภาพ สุขภาพจะคืนเวลาชีวิตให้แก่เรา",
    author: "มาร์คุส ออเรลิอุส (Marcus Aurelius)",
    category: "Habits & Growth",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 131,
    dayOfYear: 131,
    quote: "ลดความเร็วลงนิด เพื่อซึมซับความสุขข้างทาง",
    author: "ว.วชิรเมธี",
    category: "Mindfulness",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 132,
    dayOfYear: 132,
    quote: "รอยยิ้มสดใส ยิ่งสะท้อนจิตใจที่แข็งแรง",
    author: "คาลิล ยิบราน (Kahlil Gibran)",
    category: "Inner Peace",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 133,
    dayOfYear: 133,
    quote: "พักสายตาจากหน้าจอ มองออกไปที่ทิวไม้สีเขียวขจี",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Rest & Recovery",
    tag: "กวีซีไรต์"
  },
  {
    id: 134,
    dayOfYear: 134,
    quote: "ความพยายามเล็กๆ ที่สม่ำเสมอ สามารถสร้างการเปลี่ยนแปลงอันใหญ่หลวง",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Habits & Growth",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 135,
    dayOfYear: 135,
    quote: "ยอมรับยามอ่อนแอ เพื่อให้ร่างกายได้เติบโตแข็งแรงขึ้น",
    author: "อังคาร จันทาทิพย์",
    category: "Strength & Resilience",
    tag: "กวีซีไรต์"
  },
  {
    id: 136,
    dayOfYear: 136,
    quote: "เปิดอกรับความสุขบริสุทธิ์จากการมีสุขภาพดี",
    author: "ราล์ฟ วอลโด เอเมอร์สัน (R.W. Emerson)",
    category: "Self Care",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 137,
    dayOfYear: 137,
    quote: "เสียงหยดฝนโปรดปราน สลัดความล้าออกจากหัวใจ",
    author: "อังคาร กัลยาณพงศ์",
    category: "Rest & Recovery",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 138,
    dayOfYear: 138,
    quote: "จิตที่ฝึกดีแล้ว นำความสุขมาให้ทั้งกายและใจ",
    author: "พุทธทาสภิกขุ",
    category: "Mindfulness",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 139,
    dayOfYear: 139,
    quote: "การยิ้มให้ผู้อื่น เริ่มต้นจากการยิ้มให้ตัวเองก่อน",
    author: "วีระ สุดสังข์",
    category: "Self Care",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 140,
    dayOfYear: 140,
    quote: "ชีวิตสั้นเกินกว่าจะเสียเวลาไปกับความเครียดที่ไม่จำเป็น",
    author: "รูมี (Rumi)",
    category: "Inner Peace",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 141,
    dayOfYear: 141,
    quote: "ก้าวไปข้างหน้าทีละ步 ไม่ต้องรีบแต่ไม่เคยหยุดเดิน",
    author: "ขงจื๊อ (Confucius)",
    category: "Habits & Growth",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 142,
    dayOfYear: 142,
    quote: "ความเพียรในการดูแลตนเอง คือการลงทุนที่สมบูรณ์แบบที่สุด",
    author: "เสกสรรค์ ประเสริฐกุล",
    category: "Habits & Growth",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 143,
    dayOfYear: 143,
    quote: "ปล่อยความคาดหวังลงชั่วคราว ร่างกายจะสัมผัสได้ถึงความเบา",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Rest & Recovery",
    tag: "กวีซีไรต์"
  },
  {
    id: 144,
    dayOfYear: 144,
    quote: "เมื่อเราอยู่กับปัจจุบัน อนาคตจะดูแลตัวมันเอง",
    author: "ติช นัท ฮันห์ (Thich Nhat Hanh)",
    category: "Mindfulness",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 145,
    dayOfYear: 145,
    quote: "ความเข้มแข็งไม่ได้แปลว่าไม่รอด แต่คือการฟื้นตัวได้ทุกครั้ง",
    author: "อังคาร จันทาทิพย์",
    category: "Strength & Resilience",
    tag: "กวีซีไรต์"
  },
  {
    id: 146,
    dayOfYear: 146,
    quote: "สุขภาพดีไม่ใช่ความโชคดี แต่เป็นผลจากการกระทำอย่างใสใจ",
    author: "ว.วชิรเมธี",
    category: "Self Care",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 147,
    dayOfYear: 147,
    quote: "ต้นไผ่เอนตามลม แต่รากยังยึดแน่นกับแผ่นดิน",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Nature & Harmony",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 148,
    dayOfYear: 148,
    quote: "ฟังความต้องการของร่างกาย ดื่มน้ำเมื่อหิว พักเมื่อเหนื่อย",
    author: "วีระ สุดสังข์",
    category: "Self Care",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 149,
    dayOfYear: 149,
    quote: "สงบจิตสงบใจ รับรู้จังหวะลมหายใจเข้าออก",
    author: "อังคาร กัลยาณพงศ์",
    category: "Mindfulness",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 150,
    dayOfYear: 150,
    quote: "ความกังวลล่วงหน้าไม่ช่วยแก้ปัญหา มีแต่จะบั่นทอนสุขภาพ",
    author: "มาร์คุส ออเรลิอุส (Marcus Aurelius)",
    category: "Inner Peace",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 151,
    dayOfYear: 151,
    quote: "เฉลิมฉลองทุกความสำเร็จเล็กๆ บนเส้นทางสุขภาพของคุณ",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Habits & Growth",
    tag: "กวีซีไรต์"
  },

  // --- มิถุนายม (DAYS 152-181) ---
  {
    id: 152,
    dayOfYear: 152,
    quote: "เมื่อเรานอนหลับอย่างเพียงพอ สมองจะจัดระเบียบความคิดใหม่อย่างแจ่มใส",
    author: "เสกสรรค์ ประเสริฐกุล",
    category: "Rest & Recovery",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 153,
    dayOfYear: 153,
    quote: "ความเข้มแข็งเริ่มต้นจากภายใน แล้วเปล่งประกายออกมาภายนอก",
    author: "อังคาร จันทาทิพย์",
    category: "Strength & Resilience",
    tag: "กวีซีไรต์"
  },
  {
    id: 154,
    dayOfYear: 154,
    quote: "เดินอย่างตระหนักรู้ ทุกก้าวคือการทำสมาธิบนแผ่นดิน",
    author: "ติช นัท ฮันห์ (Thich Nhat Hanh)",
    category: "Mindfulness",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 155,
    dayOfYear: 155,
    quote: "หัวใจที่เบาโปร่ง คือยาวิเศษอันดับหนึ่ง",
    author: "พุทธทาสภิกขุ",
    category: "Inner Peace",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 156,
    dayOfYear: 156,
    quote: "อย่าลืมยิ้มให้ตัวเองเมื่อผ่านพ้นวันอันหนักหน่วง",
    author: "วีระ สุดสังข์",
    category: "Self Care",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 157,
    dayOfYear: 157,
    quote: "ร่างกายที่สดชื่น ย่อมนำพาความคิดที่สร้างสรรค์",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Habits & Growth",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 158,
    dayOfYear: 158,
    quote: "ธรรมชาติไม่เคยรีบร้อน แต่ทุกสิ่งก็สำเร็จลงได้ด้วยดี",
    author: "เล่าจื๊อ (Lao Tzu)",
    category: "Nature & Harmony",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 159,
    dayOfYear: 159,
    quote: "ให้อาหารกายด้วยสารอาหาร ให้อาหารใจด้วยความงดงาม",
    author: "คาลิล ยิบราน (Kahlil Gibran)",
    category: "Self Care",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 160,
    dayOfYear: 160,
    quote: "การยืดกล้ามเนื้อยามเช้า คือการตื่นขึ้นของพลังงานชีวิต",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Self Care",
    tag: "กวีซีไรต์"
  },
  {
    id: 161,
    dayOfYear: 161,
    quote: "เมื่อเรายอมรับปัจจุบัน ความอึดอัดขัดเคืองจะเลือนหาย",
    author: "ว.วชิรเมธี",
    category: "Mindfulness",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 162,
    dayOfYear: 162,
    quote: "จิตใจเข้มแข็งเพราะผ่านมรสุม ร่างกายแข็งแรงเพราะผ่านการฝึกฝน",
    author: "อังคาร จันทาทิพย์",
    category: "Strength & Resilience",
    tag: "กวีซีไรต์"
  },
  {
    id: 163,
    dayOfYear: 163,
    quote: "ความสงบผ่อนคลายไม่ได้อยู่ไกล แค่กลับมาอยู่กับลมหายใจ",
    author: "อังคาร กัลยาณพงศ์",
    category: "Inner Peace",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 164,
    dayOfYear: 164,
    quote: "การพักผ่อนอย่างมีคุณภาพ คือการสะสมพลังไว้ฝ่าฟันวันพรุ่งนี้",
    author: "เสกสรรค์ ประเสริฐกุล",
    category: "Rest & Recovery",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 165,
    dayOfYear: 165,
    quote: "วินัยคือการเลือกสิ่งที่ต้องการที่สุด มากกว่าสิ่งที่ต้องการตอนนี้",
    author: "มาร์คุส ออเรลิอุส (Marcus Aurelius)",
    category: "Habits & Growth",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 166,
    dayOfYear: 166,
    quote: "ให้ทุกวันเป็นโอกาสในการเรียนรู้และปรับปรุงตัวเอง",
    author: "วีระ สุดสังข์",
    category: "Habits & Growth",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 167,
    dayOfYear: 167,
    quote: "ความผ่อนคลายกล้ามเนื้อ ส่งผลโดยตรงต่อความผ่อนคลายทางจิตใจ",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Rest & Recovery",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 168,
    dayOfYear: 168,
    quote: "รักษาร่างกายให้บริสุทธิ์ ดั่งสระน้ำกลางป่าอันใสสะอาด",
    author: "เฮนรี เดวิด ธอโร (H.D. Thoreau)",
    category: "Nature & Harmony",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 169,
    dayOfYear: 169,
    quote: "เมื่อใจสงบ ความงดงามของโลกจะปรากฏชัดขึ้น",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Inner Peace",
    tag: "กวีซีไรต์"
  },
  {
    id: 170,
    dayOfYear: 170,
    quote: "ความเมตตาต่อตนเอง คือจุดเริ่มต้นของความเมตตาต่อโลก",
    author: "รูมี (Rumi)",
    category: "Self Care",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 171,
    dayOfYear: 171,
    quote: "ความสุขสงบยามเช้า เติมไฟให้เราก้าวผ่านได้ทั้งวัน",
    author: "อังคาร กัลยาณพงศ์",
    category: "Mindfulness",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 172,
    dayOfYear: 172,
    quote: "อย่ายอมแพ้เมื่อเห็นผลลัพธ์ช้า สิ่งงดงามต้องใช้เวลาเติบโต",
    author: "อังคาร จันทาทิพย์",
    category: "Strength & Resilience",
    tag: "กวีซีไรต์"
  },
  {
    id: 173,
    dayOfYear: 173,
    quote: "ปล่อยวางความคิดรบกวน แล้วฟังเสียงจังหวะหัวใจ",
    author: "ติช นัท ฮันห์ (Thich Nhat Hanh)",
    category: "Mindfulness",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 174,
    dayOfYear: 174,
    quote: "สุขภาพดีคือนิเวศวิทยาภายในที่สมบูรณ์",
    author: "วีระ สุดสังข์",
    category: "Nature & Harmony",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 175,
    dayOfYear: 175,
    quote: "ยิ้มรับวันใหม่ด้วยความกตัญญูที่ยังมีลมหายใจ",
    author: "พุทธทาสภิกขุ",
    category: "Inner Peace",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 176,
    dayOfYear: 176,
    quote: "การดื่มน้ำสะอาดช่วยให้เซลล์ในร่างกายได้ตื่นตัวและสดชื่น",
    author: "ว.วชิรเมธี",
    category: "Self Care",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 177,
    dayOfYear: 177,
    quote: "ชีวิตคือศิลปะแห่งการรักษาสมดุล ระหว่างการทำงานและการพักผ่อน",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Rest & Recovery",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 178,
    dayOfYear: 178,
    quote: "สิบนิ้วผสาน สูดลมหายใจเข้าลึก ผ่อนคลายหัวไหล่",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Mindfulness",
    tag: "กวีซีไรต์"
  },
  {
    id: 179,
    dayOfYear: 179,
    quote: "ไม่มีอะไรยั่งยืน แม้แต่ความเหนื่อยล้า วันนี้จะผ่านไปเสมอ",
    author: "เสกสรรค์ ประเสริฐกุล",
    category: "Strength & Resilience",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 180,
    dayOfYear: 180,
    quote: "ครึ่งปีผ่านไป ขอบคุณตัวเองที่ตั้งใจดูแลสุขภาพมาตลอด",
    author: "วีระ สุดสังข์",
    category: "Habits & Growth",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 181,
    dayOfYear: 181,
    quote: "ร่างกายที่สมบูรณ์ เป็นบ้านที่น่าอยู่ที่สุดสำหรับจิตวิญญาณ",
    author: "คาลิล ยิบราน (Kahlil Gibran)",
    category: "Self Care",
    tag: "สากล/ระดับโลก"
  },

  // --- กรกฎาคม (DAYS 182-212) ---
  {
    id: 182,
    dayOfYear: 182,
    quote: "เริ่มต้นก้าวสู่ครึ่งปีหลังด้วยหัวใจที่เบาสบายและมุ่งมั่น",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Habits & Growth",
    tag: "กวีซีไรต์"
  },
  {
    id: 183,
    dayOfYear: 183,
    quote: "ลมหายใจยาวๆ คือยาระงับความตื่นตระหนกจากธรรมชาติ",
    author: "อังคาร จันทาทิพย์",
    category: "Mindfulness",
    tag: "กวีซีไรต์"
  },
  {
    id: 184,
    dayOfYear: 184,
    quote: "ความสงบใจช่วยส่องสว่างให้เห็นแนวทางแก้ไขปัญหา",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Inner Peace",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 185,
    dayOfYear: 185,
    quote: "การนอนหลับตรงเวลา คือการเคารพจังหวะชีวภาพของตนเอง",
    author: "วีระ สุดสังข์",
    category: "Rest & Recovery",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 186,
    dayOfYear: 186,
    quote: "ผ่อนคลายร่างกายลง ดั่งใบไม้วางตัวบนผืนน้ำ",
    author: "อังคาร กัลยาณพงศ์",
    category: "Rest & Recovery",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 187,
    dayOfYear: 187,
    quote: "ความรักตนเองที่แท้จริง คือการเลือกสิ่งที่ดีต่อสุขภาพกายและใจ",
    author: "ราล์ฟ วอลโด เอเมอร์สัน (R.W. Emerson)",
    category: "Self Care",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 188,
    dayOfYear: 188,
    quote: "เมื่อเราใจกว้างขวาง ร่างกายจะรู้สึกผ่อนคลายไร้แรงกดดัน",
    author: "พุทธทาสภิกขุ",
    category: "Inner Peace",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 189,
    dayOfYear: 189,
    quote: "การฝึกสติช่วยให้เราไม่เป็นทาสของอารมณ์ชั่ววูบ",
    author: "ติช นัท ฮันห์ (Thich Nhat Hanh)",
    category: "Mindfulness",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 190,
    dayOfYear: 190,
    quote: "ให้ทุกการออกกำลังกาย เป็นการระบายความเครียดสะสม",
    author: "ว.วชิรเมธี",
    category: "Self Care",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 191,
    dayOfYear: 191,
    quote: "เข้มแข็งดั่งภูเขา มั่นคงท่ามกลางการเปลี่ยนแปลง",
    author: "อังคาร จันทาทิพย์",
    category: "Strength & Resilience",
    tag: "กวีซีไรต์"
  },
  {
    id: 192,
    dayOfYear: 192,
    quote: "ความพยายามในการเปลี่ยนแปลงตนเอง โครงสร้างชีวิตจะค่อยๆ เปลี่ยนตาม",
    author: "เสกสรรค์ ประเสริฐกุล",
    category: "Habits & Growth",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 193,
    dayOfYear: 193,
    quote: "มองฟ้ากว้างใหญ่ ปล่อยใจให้โปร่งเบา",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Nature & Harmony",
    tag: "กวีซีไรต์"
  },
  {
    id: 194,
    dayOfYear: 194,
    quote: "ชีวิตเรียบง่าย นำมาซึ่งความสงบสุขที่ยั่งยืน",
    author: "เฮนรี เดวิด ธอโร (H.D. Thoreau)",
    category: "Inner Peace",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 195,
    dayOfYear: 195,
    quote: "ดูแลสุขภาพเหมือนการปลูกต้นไม้ ต้องรดน้ำใส่ปุ๋ยทุกวัน",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Habits & Growth",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 196,
    dayOfYear: 196,
    quote: "ความอ่อนน้อมถ่อมตน ช่วยลดความขัดแย้งในจิตใจ",
    author: "เล่าจื๊อ (Lao Tzu)",
    category: "Inner Peace",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 197,
    dayOfYear: 197,
    quote: "เปิดโอกาสให้ตัวเองได้พักผ่อน โดยไร้ความรู้สึกผิด",
    author: "วีระ สุดสังข์",
    category: "Rest & Recovery",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 198,
    dayOfYear: 198,
    quote: "จิตที่เปี่ยมด้วยสติ ย่อมรู้เท่าทันความตึงเครียด",
    author: "อังคาร กัลยาณพงศ์",
    category: "Mindfulness",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 199,
    dayOfYear: 199,
    quote: "ยิ้มให้ตัวเอง ยิ้มให้โลก แล้วโลกจะยิ้มตอบกลับมา",
    author: "คาลิล ยิบราน (Kahlil Gibran)",
    category: "Self Care",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 200,
    dayOfYear: 200,
    quote: "สองร้อยวันแห่งวินัย คุณกำลังสร้างร่างใหม่ที่แข็งแกร่งกว่าเดิม",
    author: "อังคาร จันทาทิพย์",
    category: "Habits & Growth",
    tag: "กวีซีไรต์"
  },
  {
    id: 201,
    dayOfYear: 201,
    quote: "ความสุขไม่ได้ซ่อนอยู่ในอนาคต แต่มันอยู่ในปัจจุบันขณะนี้",
    author: "ติช นัท ฮันห์ (Thich Nhat Hanh)",
    category: "Mindfulness",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 202,
    dayOfYear: 202,
    quote: "จิตใจสดใสดั่งน้ำค้างยามเช้า บนยอดหญ้าเขียวสด",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Nature & Harmony",
    tag: "กวีซีไรต์"
  },
  {
    id: 203,
    dayOfYear: 203,
    quote: "ความแข็งแรงของหัวใจ เติบโตจากการผ่านพ้นอุปสรรค",
    author: "มาร์คุส ออเรลิอุส (Marcus Aurelius)",
    category: "Strength & Resilience",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 204,
    dayOfYear: 204,
    quote: "หยุดพักสายตา หายใจเข้าลึกๆ และยิ้มให้ชีวิต",
    author: "ว.วชิรเมธี",
    category: "Rest & Recovery",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 205,
    dayOfYear: 205,
    quote: "สุขภาพดีไม่ใช่ของขวัญ แต่คือสิ่งที่เราสร้างด้วยตนเอง",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Self Care",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 206,
    dayOfYear: 206,
    quote: "ให้ทุกวันเป็นวันดูแลตัวเองด้วยความเคารพ",
    author: "วีระ สุดสังข์",
    category: "Self Care",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 207,
    dayOfYear: 207,
    quote: "ความสงบในจิตใจ คือจุดเริ่มต้นของปัญญาและสุขภาพดี",
    author: "พุทธทาสภิกขุ",
    category: "Inner Peace",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 208,
    dayOfYear: 208,
    quote: "ชีวิตคือการเต้นรำไปตามจังหวะของการเติบโตและหยุดพัก",
    author: "รูมี (Rumi)",
    category: "Nature & Harmony",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 209,
    dayOfYear: 209,
    quote: "ฟังเสียงลมหายใจเข้าออก ดั่งคลื่นทะเลกระทบฝั่งสม่ำเสมอ",
    author: "อังคาร กัลยาณพงศ์",
    category: "Mindfulness",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 210,
    dayOfYear: 210,
    quote: "ลุกขึ้นขยับร่างกาย ขับไล่ความขี้เกียจและความซึมเซา",
    author: "เสกสรรค์ ประเสริฐกุล",
    category: "Habits & Growth",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 211,
    dayOfYear: 211,
    quote: "ใจเข้มแข็งไม่หวาดหวั่น แม้ต้องเดินผ่านพายุฝน",
    author: "อังคาร จันทาทิพย์",
    category: "Strength & Resilience",
    tag: "กวีซีไรต์"
  },
  {
    id: 212,
    dayOfYear: 212,
    quote: "รับฟังข่าวสารพอประมาณ เพื่อไม่ให้ใจรับภาระเกินไป",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Inner Peace",
    tag: "กวีซีไรต์"
  },

  // --- สิงหาคม (DAYS 213-243) ---
  {
    id: 213,
    dayOfYear: 213,
    quote: "การดื่มน้ำสะอาดอย่างพอเพียง คือการเติมชีวิตชีวาให้เซลล์นับล้าน",
    author: "วีระ สุดสังข์",
    category: "Self Care",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 214,
    dayOfYear: 214,
    quote: "สติช่วยชะลอความโกรธ ความสงบช่วยชะลอโรคภัย",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Mindfulness",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 215,
    dayOfYear: 215,
    quote: "โอบกอดความเหนื่อยล้าด้วยความเข้าใจ แล้วพักผ่อนให้เพียงพอ",
    author: "ติช นัท ฮันห์ (Thich Nhat Hanh)",
    category: "Rest & Recovery",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 216,
    dayOfYear: 216,
    quote: "ร่างกายที่ได้รับการดูแล ย่อมคุ้มครองจิตใจให้อยู่เย็นเป็นสุข",
    author: "คาลิล ยิบราน (Kahlil Gibran)",
    category: "Self Care",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 217,
    dayOfYear: 217,
    quote: "ความสุขไม่ได้เกิดจากการมีทุกอย่าง แต่เกิดจากการพอใจในสิ่งที่มี",
    author: "ว.วชิรเมธี",
    category: "Inner Peace",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 218,
    dayOfYear: 218,
    quote: "ก้าวเล็กๆ ในวันนี้ จะนำไปสู่ชัยชนะใหญ่ในวันข้างหน้า",
    author: "อังคาร จันทาทิพย์",
    category: "Habits & Growth",
    tag: "กวีซีไรต์"
  },
  {
    id: 219,
    dayOfYear: 219,
    quote: "ให้เวลากับธรรมชาติ เพื่อเติมเต็มพลังงานชีวิต",
    author: "เฮนรี เดวิด ธอโร (H.D. Thoreau)",
    category: "Nature & Harmony",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 220,
    dayOfYear: 220,
    quote: "ปล่อยความวุ่นวายภายนอก แล้วกลับคืนสู่ความสงบภายใน",
    author: "อังคาร กัลยาณพงศ์",
    category: "Inner Peace",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 221,
    dayOfYear: 221,
    quote: "การยิ้มช่วยหลั่งสารแห่งความสุข ทำให้ร่างกายรู้สึกผ่อนคลาย",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Rest & Recovery",
    tag: "กวีซีไรต์"
  },
  {
    id: 222,
    dayOfYear: 222,
    quote: "จิตใจเป็นตัวกำหนดคุณภาพของร่างกาย จงเลือกดูแลด้วยความคิดบวก",
    author: "มาร์คุส ออเรลิอุส (Marcus Aurelius)",
    category: "Mindfulness",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 223,
    dayOfYear: 223,
    quote: "อภัยให้ตัวเองเมื่อทำไม่ได้ตามเป้า แล้วเริ่มใหม่ด้วยความเมตตา",
    author: "วีระ สุดสังข์",
    category: "Self Care",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 224,
    dayOfYear: 224,
    quote: "ความอดทนอดกลั้น เป็นคุณธรรมนำพาไปสู่ความสำเร็จในการดูแลสุขภาพ",
    author: "เสกสรรค์ ประเสริฐกุล",
    category: "Strength & Resilience",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 225,
    dayOfYear: 225,
    quote: "การหายใจเข้ายาวๆ คือการเติมออกซิเจนบริสุทธิ์ให้สมอง",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Mindfulness",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 226,
    dayOfYear: 226,
    quote: "สติคือดวงประทีป ส่องสว่างให้เห็นความจริงของชีวิต",
    author: "พุทธทาสภิกขุ",
    category: "Mindfulness",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 227,
    dayOfYear: 227,
    quote: "ยืดหยุ่นดั่งไผ่ในลมบก ปรับตัวได้ทุกสถานการณ์",
    author: "เล่าจื๊อ (Lao Tzu)",
    category: "Nature & Harmony",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 228,
    dayOfYear: 228,
    quote: "การเดินชมสวนยามเย็น ช่วยลดแรงตึงเครียดของวัน",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Rest & Recovery",
    tag: "กวีซีไรต์"
  },
  {
    id: 229,
    dayOfYear: 229,
    quote: "ทุกยาดเหงื่อที่สูญเสียไป คือการสร้างความแข็งแกร่งใหม่ขึ้นมา",
    author: "อังคาร จันทาทิพย์",
    category: "Habits & Growth",
    tag: "กวีซีไรต์"
  },
  {
    id: 230,
    dayOfYear: 230,
    quote: "ความสุขไม่ได้ซ่อนอยู่ในที่ไกล แต่อยู่ที่การใส่ใจสิ่งรอบตัว",
    author: "ว.วชิรเมธี",
    category: "Inner Peace",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 231,
    dayOfYear: 231,
    quote: "ดูแลร่างกายดั่งวิหารแห่งสติปัญญา",
    author: "คาลิล ยิบราน (Kahlil Gibran)",
    category: "Self Care",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 232,
    dayOfYear: 232,
    quote: "ความผ่อนคลายจิตใจ ส่งผลดีต่อระบบภูมิคุ้มกันของร่างกาย",
    author: "วีระ สุดสังข์",
    category: "Rest & Recovery",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 233,
    dayOfYear: 233,
    quote: "ท้องฟ้ายังมีเปลี่ยนสี จิตใจย่อมมีความยืดหยุ่นในการปรับตัว",
    author: "อังคาร กัลยาณพงศ์",
    category: "Nature & Harmony",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 234,
    dayOfYear: 234,
    quote: "การทำสิ่งดีๆ ให้ตัวเองวันละนิด สร้างคุณค่าที่ยิ่งใหญ่ให้ชีวิต",
    author: "ราล์ฟ วอลโด เอเมอร์สัน (R.W. Emerson)",
    category: "Habits & Growth",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 235,
    dayOfYear: 235,
    quote: "เมื่อเราก้าวข้ามความขี้เกียจ เราจะพบกับความภูมิใจในตนเอง",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Strength & Resilience",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 236,
    dayOfYear: 236,
    quote: "อยู่กับปัจจุบันขณะ เพราะนี่คือช่วงเวลาเดียวที่คุณมีอยู่จริง",
    author: "ติช นัท ฮันห์ (Thich Nhat Hanh)",
    category: "Mindfulness",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 237,
    dayOfYear: 237,
    quote: "การพักผ่อนด้วยการนอนหลับ คือยาบำรุงสุขภาพที่ดีที่สุด",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Rest & Recovery",
    tag: "กวีซีไรต์"
  },
  {
    id: 238,
    dayOfYear: 238,
    quote: "จิตใจสงบเยือกเย็น ย่อมเอาชนะความวุ่นวายทั้งปวง",
    author: "เสกสรรค์ ประเสริฐกุล",
    category: "Inner Peace",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 239,
    dayOfYear: 239,
    quote: "ให้เกียรติและเคารพความขยันของตนเองในการดูแลสุขภาพ",
    author: "วีระ สุดสังข์",
    category: "Self Care",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 240,
    dayOfYear: 240,
    quote: "สุขภาพดีไม่ใช่ความบังเอิญ แต่เกิดจากการตัดสินใจเลือกในทุกวัน",
    author: "อังคาร จันทาทิพย์",
    category: "Habits & Growth",
    tag: "กวีซีไรต์"
  },
  {
    id: 241,
    dayOfYear: 241,
    quote: "เมื่อใจเราว่างเปล่าจากความกังวล ร่างกายจะเบาสบาย",
    author: "พุทธทาสภิกขุ",
    category: "Inner Peace",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 242,
    dayOfYear: 242,
    quote: "เปิดอกรับความรักและความใส่ใจจากผู้คนรอบข้าง",
    author: "รูมี (Rumi)",
    category: "Self Care",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 243,
    dayOfYear: 243,
    quote: "การยิ้มให้ผู้อื่น เริ่มต้นจากจิตใจที่เบิกบานและมีสุขภาพดี",
    author: "ว.วชิรเมธี",
    category: "Inner Peace",
    tag: "ปราชญ์/กวีไทย"
  },

  // --- กันยายน (DAYS 244-273) ---
  {
    id: 244,
    dayOfYear: 244,
    quote: "จังหวะของก้าวเดินที่สม่ำเสมอ ช่วยทำสมาธิได้อย่างอัศจรรย์",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Mindfulness",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 245,
    dayOfYear: 245,
    quote: "สายน้ำไหลไม่ย้อนกลับ ให้เวลาชีวิตได้รับการดูแลอย่างดีที่สุด",
    author: "อังคาร กัลยาณพงศ์",
    category: "Habits & Growth",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 246,
    dayOfYear: 246,
    quote: "การออกกำลังกายยามเช้า เติมสดชื่นให้ตลอดทั้งวัน",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Self Care",
    tag: "กวีซีไรต์"
  },
  {
    id: 247,
    dayOfYear: 247,
    quote: "เข้มแข็งเมื่อเจออุปสรรค อ่อนโยนเมื่อดูแลตนเอง",
    author: "อังคาร จันทาทิพย์",
    category: "Strength & Resilience",
    tag: "กวีซีไรต์"
  },
  {
    id: 248,
    dayOfYear: 248,
    quote: "การฝึกหายใจลึกๆ ช่วยผ่อนคลายระบบประสาทและจิตใจ",
    author: "ติช นัท ฮันห์ (Thich Nhat Hanh)",
    category: "Rest & Recovery",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 249,
    dayOfYear: 249,
    quote: "ปรับเปลี่ยนสิ่งรอบตัวให้เอื้อต่อการมีสุขภาพดี",
    author: "วีระ สุดสังข์",
    category: "Habits & Growth",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 250,
    dayOfYear: 250,
    quote: "ความสงบภายในคือสมบัติอันล้ำค่าที่ไม่มีใครย่งชิงไปได้",
    author: "เสกสรรค์ ประเสริฐกุล",
    category: "Inner Peace",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 251,
    dayOfYear: 251,
    quote: "การกินอาหารที่ดีต่อสุขภาพ คือการบอกรักร่างกายผ่านโภชนาการ",
    author: "ว.วชิรเมธี",
    category: "Self Care",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 252,
    dayOfYear: 252,
    quote: "ต้นไม้สลัดใบเพื่อเตรียมพร้อมรับฤดูใหม่ ใจเราสลัดความเครียดเพื่อรับพลังใหม่",
    author: "เฮนรี เดวิด ธอโร (H.D. Thoreau)",
    category: "Nature & Harmony",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 253,
    dayOfYear: 253,
    quote: "ความเพียรในการฝึกฝนร่างกาย นำพาไปสู่จิตใจที่แข็งแกร่ง",
    author: "มาร์คุส ออเรลิอุส (Marcus Aurelius)",
    category: "Strength & Resilience",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 254,
    dayOfYear: 254,
    quote: "พักสายตาและเพลิดเพลินกับความเงียบสงบในยามเย็น",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Rest & Recovery",
    tag: "กวีซีไรต์"
  },
  {
    id: 255,
    dayOfYear: 255,
    quote: "สติช่วยรักษาสมดุล ไม่ให้เราเอนเอียงไปตามอารมณ์ชั่ววูบ",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Mindfulness",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 256,
    dayOfYear: 256,
    quote: "โอบกอดธรรมชาติ และปล่อยให้ธรรมชาติบำบัดรักษาเรา",
    author: "อังคาร กัลยาณพงศ์",
    category: "Nature & Harmony",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 257,
    dayOfYear: 257,
    quote: "การตื่นนอนตรงเวลา ช่วยสร้างจังหวะชีวภาพที่แข็งแรง",
    author: "วีระ สุดสังข์",
    category: "Habits & Growth",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 258,
    dayOfYear: 258,
    quote: "ความสุขแท้จริง เกิดขึ้นเมื่อกายและใจทำงานสอดประสานกัน",
    author: "คาลิล ยิบราน (Kahlil Gibran)",
    category: "Inner Peace",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 259,
    dayOfYear: 259,
    quote: "จงภูมิใจในทุกๆ ก้าวที่คุณตั้งใจเพื่อสุขภาพของตัวเอง",
    author: "อังคาร จันทาทิพย์",
    category: "Self Care",
    tag: "กวีซีไรต์"
  },
  {
    id: 260,
    dayOfYear: 260,
    quote: "เมื่อเราปล่อยวางความยึดติด จิตใจจะสัมผัสได้ถึงอิสรภาพ",
    author: "พุทธทาสภิกขุ",
    category: "Inner Peace",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 261,
    dayOfYear: 261,
    quote: "การดื่มน้ำสะอาดช่วยล้างพิษ และเติมความสดชื่นให้ร่างกาย",
    author: "ว.วชิรเมธี",
    category: "Self Care",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 262,
    dayOfYear: 262,
    quote: "ชีวิตเปรียบเหมือนการปั่นจักรยาน เพื่อทรงตัวได้เราต้องเคลื่อนที่ต่อไป",
    author: "อัลเบิร์ต ไอน์สไตน์ (Albert Einstein)",
    category: "Habits & Growth",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 263,
    dayOfYear: 263,
    quote: "สูดลมหายใจเข้าเพื่อรับพลังงานดีๆ ถอนหายใจออกเพื่อปล่อยความเครียด",
    author: "ติช นัท ฮันห์ (Thich Nhat Hanh)",
    category: "Mindfulness",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 264,
    dayOfYear: 264,
    quote: "พักผ่อนในคืนนี้ด้วยจิตใจที่สงบและปล่อยวาง",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Rest & Recovery",
    tag: "กวีซีไรต์"
  },
  {
    id: 265,
    dayOfYear: 265,
    quote: "ความเข้มแข็งซ่อนอยู่ในความอ่อนโยนต่อตนเอง",
    author: "เสกสรรค์ ประเสริฐกุล",
    category: "Strength & Resilience",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 266,
    dayOfYear: 266,
    quote: "การดูแลสุขภาพคือการวางรากฐานอันมั่นคงให้ชีวิต",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Habits & Growth",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 267,
    dayOfYear: 267,
    quote: "สร้างรอยยิ้มสดใสจากจิตใจที่ได้รับการดูแลอย่างดี",
    author: "วีระ สุดสังข์",
    category: "Self Care",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 268,
    dayOfYear: 268,
    quote: "เมื่อกายผ่อนคลาย ความคิดจะแจ่มใสและลึกซึ้งขึ้น",
    author: "อังคาร กัลยาณพงศ์",
    category: "Rest & Recovery",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 269,
    dayOfYear: 269,
    quote: "ความสุขเกิดจากการใช้ชีวิตอย่างสอดคล้องกับธรรมชาติ",
    author: "เล่าจื๊อ (Lao Tzu)",
    category: "Nature & Harmony",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 270,
    dayOfYear: 270,
    quote: "อย่าให้ความเครียดสะสม กวาดมันออกไปด้วยลมหายใจเข้าออก",
    author: "อังคาร จันทาทิพย์",
    category: "Mindfulness",
    tag: "กวีซีไรต์"
  },
  {
    id: 271,
    dayOfYear: 271,
    quote: "ให้เกียรติการเดินทางของตนเอง แม้ก้าวเดินจะช้ากว่าผู้อื่น",
    author: "ราล์ฟ วอลโด เอเมอร์สัน (R.W. Emerson)",
    category: "Self Care",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 272,
    dayOfYear: 272,
    quote: "การยืดเหยียดร่างกาย ช่วยให้พลังงานไหลเวียนได้อย่างสะดวก",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Self Care",
    tag: "กวีซีไรต์"
  },
  {
    id: 273,
    dayOfYear: 273,
    quote: "เก้าเดือนแห่งความตั้งใจ คุณกำลังกลายเป็นคนที่แข็งแรงและสดใสขึ้น",
    author: "วีระ สุดสังข์",
    category: "Habits & Growth",
    tag: "ปราชญ์/กวีไทย"
  },

  // --- ตุลาคม (DAYS 274-304) ---
  {
    id: 274,
    dayOfYear: 274,
    quote: "สายลมยามเช้าพัดพาความสดชื่นมาให้ เติมพลังให้พร้อมรับวันใหม่",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Nature & Harmony",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 275,
    dayOfYear: 275,
    quote: "การมีสติอยู่กับทุกก้าวเดิน ทำให้เราสัมผัสถึงความงดงามของชีวิต",
    author: "ติช นัท ฮันห์ (Thich Nhat Hanh)",
    category: "Mindfulness",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 276,
    dayOfYear: 276,
    quote: "พักผ่อนเพื่อเติมเต็ม ไม่ใช่พักผ่อนเพราะหมดหวัง",
    author: "อังคาร จันทาทิพย์",
    category: "Rest & Recovery",
    tag: "กวีซีไรต์"
  },
  {
    id: 277,
    dayOfYear: 277,
    quote: "การปฏิเสธความวุ่นวายภายนอก คือการดูแลพื้นที่สงบภายใน",
    author: "เสกสรรค์ ประเสริฐกุล",
    category: "Inner Peace",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 278,
    dayOfYear: 278,
    quote: "ยิ้มรับอุปสรรค ด้วยความมั่นใจในความแข็งแกร่งของตนเอง",
    author: "ว.วชิรเมธี",
    category: "Strength & Resilience",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 279,
    dayOfYear: 279,
    quote: "การกินอย่างมีสติ ช่วยให้เรารับรู้ถึงคุณค่าของสารอาหาร",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Self Care",
    tag: "กวีซีไรต์"
  },
  {
    id: 280,
    dayOfYear: 280,
    quote: "ร่างกายที่แข็งแรง คือขอบเขตอันมั่นคงของชีวิต",
    author: "มาร์คุส ออเรลิอุส (Marcus Aurelius)",
    category: "Habits & Growth",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 281,
    dayOfYear: 281,
    quote: "จิตใจเบาโปร่ง ย่อมปราศจากโรคร้ายบั่นทอน",
    author: "อังคาร กัลยาณพงศ์",
    category: "Inner Peace",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 282,
    dayOfYear: 282,
    quote: "รับฟังเสียงเตือนจากร่างกาย และตอบสนองด้วยความเมตตา",
    author: "วีระ สุดสังข์",
    category: "Self Care",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 283,
    dayOfYear: 283,
    quote: "เมื่อเรานอนหลับดี จิตใจจะผ่องใสและเปี่ยมด้วยปัญญา",
    author: "พุทธทาสภิกขุ",
    category: "Rest & Recovery",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 284,
    dayOfYear: 284,
    quote: "หัวใจอันบริสุทธิ์ นำพาความสุขสงบมาสู่ชีวิต",
    author: "คาลิล ยิบราน (Kahlil Gibran)",
    category: "Inner Peace",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 285,
    dayOfYear: 285,
    quote: "ขยับขยายก้าวเดินวันละนิด รวมกันเป็นระยะทางอันยิ่งใหญ่",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Habits & Growth",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 286,
    dayOfYear: 286,
    quote: "ความสงบผ่อนคลายยามค่ำคืน เป็นยาฟื้นฟูพลังชีวิต",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Rest & Recovery",
    tag: "กวีซีไรต์"
  },
  {
    id: 287,
    dayOfYear: 287,
    quote: "เมื่อเรามีความอดทน ผลลัพธ์งดงามจะปรากฏตามมา",
    author: "อังคาร จันทาทิพย์",
    category: "Strength & Resilience",
    tag: "กวีซีไรต์"
  },
  {
    id: 288,
    dayOfYear: 288,
    quote: "ความสุขเกิดขึ้นได้ในทุกยาม เมื่อเรามีสติรับรู้",
    author: "ติช นัท ฮันห์ (Thich Nhat Hanh)",
    category: "Mindfulness",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 289,
    dayOfYear: 289,
    quote: "ปรับสมดุลชีวิต ระหว่างการทุ่มเทและการปล่อยวาง",
    author: "วีระ สุดสังข์",
    category: "Nature & Harmony",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 290,
    dayOfYear: 290,
    quote: "ร่างกายของเราเป็นสิ่งอัศจรรย์ จงดูแลมันด้วยความขอบคุณ",
    author: "ราล์ฟ วอลโด เอเมอร์สัน (R.W. Emerson)",
    category: "Self Care",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 291,
    dayOfYear: 291,
    quote: "จิตใจมั่นคงดั่งหินผา ไม่สั่นคลอนไปตามกระแสลม",
    author: "เสกสรรค์ ประเสริฐกุล",
    category: "Strength & Resilience",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 292,
    dayOfYear: 292,
    quote: "หลับตาลงลึกๆ แล้วสัมผัสถึงความเงียบสงบในตนเอง",
    author: "อังคาร กัลยาณพงศ์",
    category: "Inner Peace",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 293,
    dayOfYear: 293,
    quote: "การดื่มน้ำสะอาดและรับลมบริสุทธิ์ เติมความสดชื่นให้ปอด",
    author: "ว.วชิรเมธี",
    category: "Self Care",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 294,
    dayOfYear: 294,
    quote: "สร้างนิสัยดีๆ ทีละอย่าง จนกลายเป็นวิถีชีวิตถาวร",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Habits & Growth",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 295,
    dayOfYear: 295,
    quote: "อภัยให้ผู้อื่น ปล่อยความโกรธออกจากหัวใจ",
    author: "พุทธทาสภิกขุ",
    category: "Inner Peace",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 296,
    dayOfYear: 296,
    quote: "ผ่อนคลายไหล่และใบหน้า ลมหายใจเข้าออกผ่อนคลาย",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Rest & Recovery",
    tag: "กวีซีไรต์"
  },
  {
    id: 297,
    dayOfYear: 297,
    quote: "ความพยายามในการดูแลตนเอง เป็นการแสดงความรักอันลึกซึ้ง",
    author: "อังคาร จันทาทิพย์",
    category: "Self Care",
    tag: "กวีซีไรต์"
  },
  {
    id: 298,
    dayOfYear: 298,
    quote: "ความสงบที่แท้จริง ไม่ได้เกิดจากสิ่งแวดล้อม แต่เกิดจากจิตใจ",
    author: "เฮนรี เดวิด ธอโร (H.D. Thoreau)",
    category: "Inner Peace",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 299,
    dayOfYear: 299,
    quote: "ให้ทุกวันเป็นโอกาสในการฟื้นฟูสภาพร่างกายและจิตใจ",
    author: "วีระ สุดสังข์",
    category: "Rest & Recovery",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 300,
    dayOfYear: 300,
    quote: "สามร้อยวันแห่งวินัย คุณได้พิสูจน์แล้วว่าความพยายามไม่เคยทรยศใคร",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Habits & Growth",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 301,
    dayOfYear: 301,
    quote: "ยิ้มสดใสรับลมหนาวแรกที่พัดมาเยือน",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Nature & Harmony",
    tag: "กวีซีไรต์"
  },
  {
    id: 302,
    dayOfYear: 302,
    quote: "เมื่อใจสงบ ความคิดสร้างสรรค์จะพรั่งพรูออกมา",
    author: "อังคาร กัลยาณพงศ์",
    category: "Inner Peace",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 303,
    dayOfYear: 303,
    quote: "ความสุขไม่ได้เกิดจากการตามหา แต่เกิดจากการตระหนักรู้",
    author: "ติช นัท ฮันห์ (Thich Nhat Hanh)",
    category: "Mindfulness",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 304,
    dayOfYear: 304,
    quote: "ให้โอกาสร่างกายได้ซ่อมแซมตนเอง ด้วยการนอนหลับพักผ่อนอย่างพอเพียง",
    author: "ว.วชิรเมธี",
    category: "Rest & Recovery",
    tag: "ปราชญ์/กวีไทย"
  },

  // --- พฤศจิกายน (DAYS 305-334) ---
  {
    id: 305,
    dayOfYear: 305,
    quote: "ความเข้มแข็งของจิตใจ สะท้อนออกทางสายตาที่มุ่งมั่น",
    author: "อังคาร จันทาทิพย์",
    category: "Strength & Resilience",
    tag: "กวีซีไรต์"
  },
  {
    id: 306,
    dayOfYear: 306,
    quote: "ให้ธรรมชาติช่วยเติมเต็มพลังจิตวิญญาณของคุณ",
    author: "คาลิล ยิบราน (Kahlil Gibran)",
    category: "Nature & Harmony",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 307,
    dayOfYear: 307,
    quote: "การยืดกล้ามเนื้อและออกกำลังกาย ช่วยขับเคลื่อนพลังชีวิตให้ไหลเวียน",
    author: "วีระ สุดสังข์",
    category: "Self Care",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 308,
    dayOfYear: 308,
    quote: "ทุกจังหวะลมหายใจ คือโอกาสในการเริ่มต้นใหม่เสมอ",
    author: "พุทธทาสภิกขุ",
    category: "Mindfulness",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 309,
    dayOfYear: 309,
    quote: "การดูแลสุขภาพคือของขวัญที่ดีที่สุดที่เรามอบให้แก่ผู้คนที่เรารัก",
    author: "เสกสรรค์ ประเสริฐกุล",
    category: "Self Care",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 310,
    dayOfYear: 310,
    quote: "สะสมสุขภาพดีทีละนิด ดั่งการหยอดกระปุกออมสินชีวิต",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Habits & Growth",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 311,
    dayOfYear: 311,
    quote: "ผ่อนคลายสมอง วางความกังวลไว้ข้างนอกแล้วหลับตาพักผ่อน",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Rest & Recovery",
    tag: "กวีซีไรต์"
  },
  {
    id: 312,
    dayOfYear: 312,
    quote: "ความเข้มแข็งแท้จริง คือการลุกขึ้นมาใหม่ได้เสมอหลังจากล้มลง",
    author: "มาร์คุส ออเรลิอุส (Marcus Aurelius)",
    category: "Strength & Resilience",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 313,
    dayOfYear: 313,
    quote: "มองดอกไม้ริมทาง และเรียนรู้ความงดงามของการอยู่อย่างเงียบสงบ",
    author: "อังคาร กัลยาณพงศ์",
    category: "Nature & Harmony",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 314,
    dayOfYear: 314,
    quote: "ทุกยามเช้าคือกระดานใหม่ ให้เราเขียนสิ่งดีๆ ลงไปในชีวิต",
    author: "ว.วชิรเมธี",
    category: "Habits & Growth",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 315,
    dayOfYear: 315,
    quote: "เมื่อสติมา ปัญญาจะเกิด และความเครียดจะมลายไป",
    author: "ติช นัท ฮันห์ (Thich Nhat Hanh)",
    category: "Mindfulness",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 316,
    dayOfYear: 316,
    quote: "การดื่มน้ำสะอาดช่วยให้ร่างกายและสมองทำงานได้อย่างมีประสิทธิภาพ",
    author: "วีระ สุดสังข์",
    category: "Self Care",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 317,
    dayOfYear: 317,
    quote: "ให้เกียรติจังหวะชีวิตของตนเอง ไม่ต้องรีบร้อนแข่งกับใคร",
    author: "ราล์ฟ วอลโด เอเมอร์สัน (R.W. Emerson)",
    category: "Inner Peace",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 318,
    dayOfYear: 318,
    quote: "ความสงบผ่อนคลายจิตใจ นำมาซึ่งสุขภาพกายอันสมบูรณ์",
    author: "อังคาร จันทาทิพย์",
    category: "Inner Peace",
    tag: "กวีซีไรต์"
  },
  {
    id: 319,
    dayOfYear: 319,
    quote: "เดินชมธรรมชาติตอนเย็น ชะล้างความเมื่อยล้าออกจากจิตใจ",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Rest & Recovery",
    tag: "กวีซีไรต์"
  },
  {
    id: 320,
    dayOfYear: 320,
    quote: "การรักษาวินัยในทุกวัน สร้างปาฏิหาริย์แห่งสุขภาพอันยั่งยืน",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Habits & Growth",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 321,
    dayOfYear: 321,
    quote: "เมื่อเราอยู่กับปัจจุบัน อดีตและอนาคตจะไม่สามารถทำร้ายเราได้",
    author: "พุทธทาสภิกขุ",
    category: "Mindfulness",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 322,
    dayOfYear: 322,
    quote: "ความอ่อนโยนต่อตนเอง เปลี่ยนความตึงเครียดเป็นความผ่อนคลาย",
    author: "รูมี (Rumi)",
    category: "Self Care",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 323,
    dayOfYear: 323,
    quote: "ให้ความขยันในการดูแลตัวเอง นำพาเราไปสู่ชีวิตที่สดใส",
    author: "เสกสรรค์ ประเสริฐกุล",
    category: "Habits & Growth",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 324,
    dayOfYear: 324,
    quote: "จินตนาการถึงความสดชื่นแข็งแรง แล้วลงมือทำให้เกิดขึ้นจริง",
    author: "วีระ สุดสังข์",
    category: "Strength & Resilience",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 325,
    dayOfYear: 325,
    quote: "เสียงกระซิบของสายลมยามเย็น เตือนให้เราวางความกังวลลง",
    author: "อังคาร กัลยาณพงศ์",
    category: "Rest & Recovery",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 326,
    dayOfYear: 326,
    quote: "ความสุขไม่ได้ไกลเกินเอิน มันซ่อนอยู่ในความสงบใจยามนี้",
    author: "ว.วชิรเมธี",
    category: "Inner Peace",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 327,
    dayOfYear: 327,
    quote: "การยิ้มช่วยลดแรงตึงเครียดของกล้ามเนื้อ และสร้างบรรยากาศที่ดี",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Self Care",
    tag: "กวีซีไรต์"
  },
  {
    id: 328,
    dayOfYear: 328,
    quote: "ร่างกายของเราทรงคุณค่า จงดูแลมันด้วยอาหารและความรัก",
    author: "คาลิล ยิบราน (Kahlil Gibran)",
    category: "Self Care",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 329,
    dayOfYear: 329,
    quote: "สติคือเข็มทิศ นำพาชีวิตไปในทิศทางที่ถูกต้อง",
    author: "ติช นัท ฮันห์ (Thich Nhat Hanh)",
    category: "Mindfulness",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 330,
    dayOfYear: 330,
    quote: "สิบเอ็ดเดือนแห่งความมุ่งมั่น คุณได้กลายเป็นเวอร์ชันที่ดีขึ้นของตนเอง",
    author: "อังคาร จันทาทิพย์",
    category: "Habits & Growth",
    tag: "กวีซีไรต์"
  },

  // --- ธันวาคม (DAYS 331-365) ---
  {
    id: 331,
    dayOfYear: 331,
    quote: "เข้าสู่เดือนสุดท้ายของปี ด้วยจิตใจที่เปี่ยมด้วยความขอบคุณและพลังงานบวก",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Inner Peace",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 332,
    dayOfYear: 332,
    quote: "สูดอากาศบริสุทธิ์ยามฤดูหนาว เติมความสดชื่นให้ปอดและหัวใจ",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Nature & Harmony",
    tag: "กวีซีไรต์"
  },
  {
    id: 333,
    dayOfYear: 333,
    quote: "ความเพียรในการฝึกฝนตนเอง ส่องสว่างดั่งดวงดาวในยามค่ำคืน",
    author: "อังคาร กัลยาณพงศ์",
    category: "Strength & Resilience",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 334,
    dayOfYear: 334,
    quote: "ให้โอกาสร่างกายได้ผ่อนคลายความเครียดสะสมตลอดทั้งปี",
    author: "วีระ สุดสังข์",
    category: "Rest & Recovery",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 335,
    dayOfYear: 335,
    quote: "จิตใจเบาโปร่ง คือชัยชนะที่ยิ่งใหญ่ที่สุดของชีวิต",
    author: "พุทธทาสภิกขุ",
    category: "Inner Peace",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 336,
    dayOfYear: 336,
    quote: "การดื่มน้ำสะอาดอย่างสม่ำเสมอ คือยาลดความเมื่อยล้าจากธรรมชาติ",
    author: "ว.วชิรเมธี",
    category: "Self Care",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 337,
    dayOfYear: 337,
    quote: "มองกลับไปที่ก้าวเดินที่ผ่านมา ด้วยความภาคภูมิใจในความพยายาม",
    author: "อังคาร จันทาทิพย์",
    category: "Habits & Growth",
    tag: "กวีซีไรต์"
  },
  {
    id: 338,
    dayOfYear: 338,
    quote: "โอบกอดช่วงเวลาแห่งความสงบยามค่ำคืนด้วยสติและรอยยิ้ม",
    author: "ติช นัท ฮันห์ (Thich Nhat Hanh)",
    category: "Rest & Recovery",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 339,
    dayOfYear: 339,
    quote: "การฝึกสติทำให้เราเห็นความงดงามในสิ่งธรรมดาๆ รอบตัว",
    author: "เสกสรรค์ ประเสริฐกุล",
    category: "Mindfulness",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 340,
    dayOfYear: 340,
    quote: "สร้างภูมิคุ้มกันใจด้วยความรักและความเมตตาต่อตนเอง",
    author: "ราล์ฟ วอลโด เอเมอร์สัน (R.W. Emerson)",
    category: "Self Care",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 341,
    dayOfYear: 341,
    quote: "ให้ทุกวันเป็นการเฉลิมฉลองการมีชีวิตและสุขภาพที่ดี",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Habits & Growth",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 342,
    dayOfYear: 342,
    quote: "ยืดเหยียดร่างกายเพื่อคลายความเมื่อยล้า และเติมพลังชีวิตใหม่",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Self Care",
    tag: "กวีซีไรต์"
  },
  {
    id: 343,
    dayOfYear: 343,
    quote: "เมื่อจิตใจผ่อนคลาย การนอนหลับจะลึกซึ้งและตื่นขึ้นด้วยความสดชื่น",
    author: "วีระ สุดสังข์",
    category: "Rest & Recovery",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 344,
    dayOfYear: 344,
    quote: "ความสงบในจิตใจ นำพาความสว่างสดใสมาสู่ใบหน้าและดวงตา",
    author: "คาลิล ยิบราน (Kahlil Gibran)",
    category: "Inner Peace",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 345,
    dayOfYear: 345,
    quote: "อภัยให้ความผิดพลาดในอดีต ยิ้มรับความพร้อมในปัจจุบัน",
    author: "ว.วชิรเมธี",
    category: "Inner Peace",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 346,
    dayOfYear: 346,
    quote: "การดูแลสุขภาพอย่างสม่ำเสมอ คือคำสัญญาที่คุณรักษาไว้กับตัวเอง",
    author: "อังคาร จันทาทิพย์",
    category: "Habits & Growth",
    tag: "กวีซีไรต์"
  },
  {
    id: 347,
    dayOfYear: 347,
    quote: "สายน้ำไหลผ่านหิน ร่างกายแข็งแกร่งผ่านการออกกำลังกายสม่ำเสมอ",
    author: "อังคาร กัลยาณพงศ์",
    category: "Strength & Resilience",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 348,
    dayOfYear: 348,
    quote: "สติคือเกราะคุ้มกันจิตใจจากมรสุมความเครียด",
    author: "พุทธทาสภิกขุ",
    category: "Mindfulness",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 349,
    dayOfYear: 349,
    quote: "ให้เวลาตนเองได้สัมผัสกับความเงียบสงบในธรรมชาติ",
    author: "เฮนรี เดวิด ธอโร (H.D. Thoreau)",
    category: "Nature & Harmony",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 350,
    dayOfYear: 350,
    quote: "สามร้อยห้าสิบวันแห่งวินัย คุณได้กลายเป็นไอดอลของตัวเองแล้ว",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Habits & Growth",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 351,
    dayOfYear: 351,
    quote: "ผ่อนคลายกล้ามเนื้อ หายใจเข้าลึกๆ ยิ้มรับความสงบยามนี้",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Rest & Recovery",
    tag: "กวีซีไรต์"
  },
  {
    id: 352,
    dayOfYear: 352,
    quote: "ความเข้มแข็งไม่ได้อยู่ที่กล้ามเนื้อ แต่อยู่ที่ความตั้งใจจริง",
    author: "วีระ สุดสังข์",
    category: "Strength & Resilience",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 353,
    dayOfYear: 353,
    quote: "เมื่อเราก้าวผ่านอุปสรรค เราจะพบว่าตนเองแกร่งกว่าที่คิด",
    author: "เสกสรรค์ ประเสริฐกุล",
    category: "Strength & Resilience",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 354,
    dayOfYear: 354,
    quote: "ความสุขที่แท้จริง อยู่ที่การได้อยู่กับปัจจุบันอย่างมีสติ",
    author: "ติช นัท ฮันห์ (Thich Nhat Hanh)",
    category: "Mindfulness",
    tag: "ปรัชญาตะวันออก"
  },
  {
    id: 355,
    dayOfYear: 355,
    quote: "ขอบคุณร่างกายที่อดทนและทำหน้าที่อย่างดีตลอดปีที่ผ่านมา",
    author: "อังคาร จันทาทิพย์",
    category: "Self Care",
    tag: "กวีซีไรต์"
  },
  {
    id: 356,
    dayOfYear: 356,
    quote: "สุขภาพดีคือสมบัติอันล้ำค่าที่เงินทองไม่อาจซื้อหาได้",
    author: "ว.วชิรเมธี",
    category: "Self Care",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 357,
    dayOfYear: 357,
    quote: "ความสงบสุขในใจ ส่องสว่างให้เห็นโลกในมุมงดงาม",
    author: "อังคาร กัลยาณพงศ์",
    category: "Inner Peace",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 358,
    dayOfYear: 358,
    quote: "ให้ทุกการนอนหลับ เป็นการฟื้นฟูพลังงานชีวิตเตรียมพร้อมรับปีใหม่",
    author: "ไพวรินทร์ ขาวงาม",
    category: "Rest & Recovery",
    tag: "กวีซีไรต์"
  },
  {
    id: 359,
    dayOfYear: 359,
    quote: "ความอดทนและวินัย สะท้อนความสำเร็จอันงดงาม",
    author: "มาร์คุส ออเรลิอุส (Marcus Aurelius)",
    category: "Habits & Growth",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 360,
    dayOfYear: 360,
    quote: "สร้างสรรค์ชีวิตที่มีคุณภาพ เริ่มต้นด้วยการเลือกดูแลสุขภาพตนเอง",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Self Care",
    tag: "ศิลปินแห่งชาติ"
  },
  {
    id: 361,
    dayOfYear: 361,
    quote: "ปล่อยความเครียดของปีเก่า ยิ้มต้อนรับความสดใสในหัวใจ",
    author: "วีระ สุดสังข์",
    category: "Inner Peace",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 362,
    dayOfYear: 362,
    quote: "ความรักตนเองเริ่มต้นจากการยอมรับ และปฏิบัติตนด้วยความเมตตา",
    author: "คาลิล ยิบราน (Kahlil Gibran)",
    category: "Self Care",
    tag: "สากล/ระดับโลก"
  },
  {
    id: 363,
    dayOfYear: 363,
    quote: "เมื่อจิตสงบ สุขภาพกายและใจจะเปล่งประกายความงดงามออกมา",
    author: "พุทธทาสภิกขุ",
    category: "Inner Peace",
    tag: "ปราชญ์/กวีไทย"
  },
  {
    id: 364,
    dayOfYear: 364,
    quote: "ขอบคุณตัวเองทุกๆ วัน สำหรับความมุ่งมั่นที่ทรงคุณค่า",
    author: "อังคาร จันทาทิพย์",
    category: "Self Care",
    tag: "กวีซีไรต์"
  },
  {
    id: 365,
    dayOfYear: 365,
    quote: "365 วันแห่งการดูแลตนเอง คือบทกวีอันงดงามที่สุดที่คุณมอบให้แก่ชีวิต",
    author: "เนาวรัตน์ พงษ์ไพบูลย์",
    category: "Habits & Growth",
    tag: "ศิลปินแห่งชาติ"
  }
];

// --- HELPER FUNCTIONS FOR YOUR APP ---

/**
 * คำนวณหาลำดับวันของปี (1-365/366) จาก Date object
 */
export function getDayOfYear(date: Date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime() + (start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000;
  const oneDay = 1000 * 60 * 60 * 24;
  const day = Math.floor(diff / oneDay);
  return day > 365 ? 365 : day; // Cap at 365 for standard dataset
}

/**
 * ดึงคำคมประจำวันปัจจุบัน
 */
export function getTodayQuote(): DailyQuote {
  const dayIndex = getDayOfYear();
  return DAILY_QUOTES.find((q) => q.dayOfYear === dayIndex) || DAILY_QUOTES[0];
}

/**
 * ดึงคำคมตามวันที่ระบุ
 */
export function getQuoteByDate(date: Date): DailyQuote {
  const dayIndex = getDayOfYear(date);
  return DAILY_QUOTES.find((q) => q.dayOfYear === dayIndex) || DAILY_QUOTES[0];
}

/**
 * สุ่มคำคม (สำหรับกรณีผู้ใช้กด Random หรือเช็คอินซ้ำในวันเดิม)
 */
export function getRandomQuote(): DailyQuote {
  const randomIndex = Math.floor(Math.random() * DAILY_QUOTES.length);
  return DAILY_QUOTES[randomIndex];
}

/**
 * ดึงคำคมตามหมวดหมู่
 */
export function getQuotesByCategory(category: DailyQuote['category']): DailyQuote[] {
  return DAILY_QUOTES.filter((q) => q.category === category);
}