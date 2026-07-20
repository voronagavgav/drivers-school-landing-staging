// ─────────────────────────────────────────────────────────────────────────────
// Landing v32 — «Архів»
// The landing IS a printed index/catalogue of the real question bank. Every
// number and every string of content below is extracted VERBATIM from
// prisma/dev.db at author time (category B, isPublished=1 AND isActive=1 AND
// archivedAt IS NULL) and hard-coded — the page is DB-free at runtime.
// Plates are the 60 human-approved restyled images in public/restyled-live/,
// all of which fall in sections §11–§15; every other section is a real index
// stub with its real published count.
// ─────────────────────────────────────────────────────────────────────────────

export const YEAR = 2026;
export const PRICE = 399; // one-time «доступ до іспиту» (config constant, per v30)

// Registration-free path — the genuine no-wall official question viewer (/q/[key]).
export const ANON_HREF = "/q/q_1_1";

// ── Real bank figures (sqlite3 counts, category B) ───────────────────────────
export const BANK = {
  total: 1757, // COUNT published+active+non-archived cat-B questions
  totalFmt: "1 757", // thin-space grouping, genitive-plural agreement → «питань»
  withImages: 986, // …of which carry an illustration (imageKey NOT NULL)
  withImagesFmt: "986",
  sections: 43, // distinct questionKey sections present (§1–§39, §44–§47)
  sectionRange: "§1–§47",
  plates: 60, // approved restyled cards shown in this index (public/restyled-live)
};

// ── Exam mechanics (official, from lib/constants DEFAULT_EXAM_*) ──────────────
export const EXAM = { questions: 20, minutes: 20, mistakes: 2 };

// A short human label per section (used in image alt text).
type Section = { n: number; title: string; count: number };

// ── The FIVE illustrated sections (§11–§15) — plates present ──────────────────
// keys are real public/restyled-live/<key>.png filenames === Question.imageKey,
// ordered in catalogue reading order.
export type PlateSection = Section & { cards: number; keys: string[] };

export const ILLUSTRATED: PlateSection[] = [
  {
    n: 11,
    title: "Розташування транспортних засобів на дорозі",
    count: 39,
    cards: 13,
    keys: [
      "11_1_0", "11_2_0", "11_3_0", "11_6_0", "11_8_0", "11_10_0", "11_11_0",
      "11_12_0", "11_13_0", "11_14_0", "11_15_0", "11_16_0", "11_17_0",
    ],
  },
  {
    n: 12,
    title: "Швидкість руху",
    count: 41,
    cards: 17,
    keys: [
      "12_1_0", "12_2_0", "12_5_0", "12_6_0", "12_7_0", "12_8_0", "12_9_1",
      "12_11_0", "12_12_0", "12_13_0", "12_14_0", "12_15_0", "12_16_0",
      "12_17_0", "12_18_0", "12_39_0", "12_41_0",
    ],
  },
  {
    n: 13,
    title: "Дистанція, інтервал, зустрічний роз'їзд",
    count: 13,
    cards: 5,
    keys: ["13_2_0", "13_3_0", "13_4_0", "13_6_0", "13_8_0"],
  },
  {
    n: 14,
    title: "Обгін",
    count: 56,
    cards: 5,
    keys: ["14_10_0", "14_11_0", "14_12_0", "14_13_0", "14_14_0"],
  },
  {
    n: 15,
    title: "Зупинка і стоянка",
    count: 97,
    cards: 20,
    keys: [
      "15_3_0", "15_10_0", "15_13_0", "15_14_0", "15_15_0", "15_20_0",
      "15_21_0", "15_22_0", "15_23_0", "15_31_0", "15_33_0", "15_35_0",
      "15_36_0", "15_37_0", "15_38_0", "15_39_0", "15_40_0", "15_41_0",
      "15_42_0", "15_45_0",
    ],
  },
];

// One printed-margin annotation per illustrated section — real product truths,
// nothing invented.
export const MARGIN: Record<number, string> = {
  11: "Ті самі питання, що в офіційному банку 2026 року. Нічого навчального «на кшталт».",
  12: "Без реєстрації. Відкрий будь-яку картку — і відповідай одразу.",
  13: "Кожна відповідь оновлює твій графік повторень: тему повертає тоді, коли ти починаєш її забувати.",
  14: `Іспит: ${EXAM.questions} питань · ${EXAM.minutes} хвилин · ${EXAM.mistakes} помилки. Третя — зупиняє спробу.`,
  15: "Зображення до питань — безкоштовно, як і весь банк. Платний лише шар аналітики.",
};

// ── THE ONE LIVE SPECIMEN — imageKey 14_10_0, question q_14_10 (verbatim) ─────
export const SPECIMEN = {
  section: 14,
  key: "14_10_0",
  questionKey: "q_14_10",
  topic: "Обгін",
  text: "Чи дозволено водієві чорного автомобіля виконати обгін у цій ситуації?",
  options: [
    { text: "Дозволено, переконавшись у відсутності зустрічних автомобілів.", correct: false },
    { text: "Дозволено, якщо швидкість автомобіля, що обганяється, менше ніж 30 км/год.", correct: false },
    { text: "Заборонено.", correct: true },
    { text: "Дозволено за умови виконання вимог з відповідей 1 і 2.", correct: false },
  ],
  right: "Так. Обгін тут заборонено — жоден із наведених винятків у цій ситуації не діє.",
  wrong: "Ще ні. Правильна відповідь — «Заборонено»: наведені винятки тут не застосовуються.",
  more: { label: "Далі в цьому розділі", href: "/q/q_14_11" },
  mark: "жива картка",
  hint: "натисни, щоб відповісти",
};

// ── The remaining 38 sections — real index stubs (no approved plate) ──────────
export const INDEX: Section[] = [
  { n: 1, title: "Загальні положення", count: 79 },
  { n: 2, title: "Обов'язки і права водіїв механічних транспортних засобів", count: 37 },
  { n: 3, title: "Рух транспортних засобів із спеціальними сигналами", count: 16 },
  { n: 4, title: "Обов'язки і права пішоходів", count: 26 },
  { n: 5, title: "Обов'язки і права пасажирів", count: 16 },
  { n: 6, title: "Вимоги до велосипедистів", count: 22 },
  { n: 7, title: "Вимоги до осіб, які керують гужовим транспортом, і погоничів тварин", count: 8 },
  { n: 8, title: "Регулювання дорожнього руху", count: 91 },
  { n: 9, title: "Попереджувальні сигнали", count: 60 },
  { n: 10, title: "Початок руху та зміна його напрямку", count: 76 },
  { n: 16, title: "Проїзд перехресть", count: 142 },
  { n: 17, title: "Переваги маршрутних транспортних засобів", count: 11 },
  { n: 18, title: "Проїзд пішохідних переходів і зупинок транспортних засобів", count: 19 },
  { n: 19, title: "Користування зовнішніми світловими приладами", count: 33 },
  { n: 20, title: "Рух через залізничні переїзди", count: 31 },
  { n: 21, title: "Перевезення пасажирів", count: 12 },
  { n: 22, title: "Перевезення вантажу", count: 6 },
  { n: 23, title: "Буксирування та експлуатація транспортних составів", count: 20 },
  { n: 24, title: "Навчальна їзда", count: 14 },
  { n: 25, title: "Рух транспортних засобів у колонах", count: 8 },
  { n: 26, title: "Рух у житловій та пішохідній зоні", count: 12 },
  { n: 27, title: "Рух по автомагістралях", count: 13 },
  { n: 28, title: "Рух по гірських дорогах і на крутих спусках", count: 8 },
  { n: 29, title: "Міжнародний рух", count: 1 },
  { n: 30, title: "Номерні, розпізнавальні знаки, написи і позначення", count: 14 },
  { n: 31, title: "Технічний стан транспортних засобів та їх обладнання", count: 18 },
  { n: 32, title: "Окремі питання дорожнього руху, що потребують узгодження", count: 5 },
  { n: 33, title: "Дорожні знаки", count: 357 },
  { n: 34, title: "Дорожня розмітка", count: 35 },
  { n: 35, title: "Основи безпечного водіння", count: 170 },
  { n: 36, title: "Основи права в області дорожнього руху", count: 8 },
  { n: 37, title: "Надання домедичної допомоги", count: 59 },
  { n: 38, title: "Етика водіння, культура та відпочинок водія", count: 14 },
  { n: 39, title: "Європротокол", count: 6 },
  { n: 44, title: "Додаткові питання щодо категорій B1, B — загальні", count: 16 },
  { n: 45, title: "Додаткові питання щодо категорій B1, B — будова і терміни", count: 32 },
  { n: 46, title: "Додаткові питання щодо категорій B1, B — юридична відповідальність", count: 9 },
  { n: 47, title: "Додаткові питання щодо категорій B1, B — безпека", count: 7 },
];

export const COPY = {
  brand: "Drivers School",

  masthead: {
    folioLeft: "Офіційний банк питань",
    folioRight: `Уклад. ${YEAR} · Категорія B`,
    kolontitul: "Покажчик",
    title: "Повний банк питань ПДР",
    subtitle: "Категорія B · легкові автомобілі",
    record: [
      { k: "Питань", v: BANK.totalFmt },
      { k: "З ілюстраціями", v: BANK.withImagesFmt },
      { k: "Розділів", v: `${BANK.sections}` },
      { k: "Діапазон", v: BANK.sectionRange },
      { k: "Карток у покажчику", v: `${BANK.plates}` },
      { k: "Оновлено", v: `${YEAR}` },
    ],
    lead:
      "Це не опис застосунку. Це сам банк, з якого ти вчишся: офіційні питання за 43 розділами. Відкрий будь-яку картку і відповідай — безкоштовно, без реєстрації.",
    openCta: { label: "Відкрити банк", href: ANON_HREF },
  },

  frontMatter: {
    note: "Розділи §11–§15 подано картками з ілюстраціями. Решта — покажчиком: реальні розділи з реальною кількістю питань, що відкривається безкоштовно.",
    plateLabel: "картка",
  },

  break: {
    line: "Далі — покажчик усіх розділів банку.",
    sub: "Плат тут немає. Кількість — справжня. Решта відкривається безкоштовно.",
  },

  indexHead: {
    title: "Покажчик розділів",
    note: "Кожен рядок — розділ офіційного банку та число опублікованих питань у ньому.",
  },

  colophon: {
    title: "Колофон",
    freeCta: { label: "Відкрити банк — без реєстрації", href: ANON_HREF },
    freeNote: "Усі 1 757 питань, зображення й симулятор іспиту — безкоштовно.",
    paid: `Доступ до іспиту — ${PRICE} ₴, один раз: шар аналітики й готовності. Не підписка, без автосписань. Це доступ до підготовки, а не гарантія.`,
    disclaimer:
      "Drivers School — навчальний застосунок для підготовки до теоретичного іспиту. Ми не є державним органом і не проводимо офіційний іспит. Питання наведено з навчальною метою.",
    imprint: `Уклад. за офіційним банком питань ${YEAR} · Категорія B`,
    copyright: `© ${YEAR} Drivers School`,
  },
} as const;

// Plate folio label from an imageKey: "14_10_0" → "14·10", "12_9_1" → "12·9".
export function plateLabel(key: string): string {
  const p = key.split("_");
  return `${p[0]}·${p[1]}`;
}

// SEO surfaces read the same figures.
export const SEO = {
  title: `Банк питань ПДР ${YEAR} — Категорія B · ${BANK.totalFmt} офіційних питань`,
  description: `Повний покажчик офіційного банку питань ПДР для категорії B: ${BANK.totalFmt} питань за ${BANK.sections} розділами, з ілюстраціями. Відкрий будь-яку картку і відповідай без реєстрації — безкоштовно.`,
};
