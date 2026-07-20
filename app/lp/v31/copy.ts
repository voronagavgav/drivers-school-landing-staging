// ─────────────────────────────────────────────────────────────────────────────
// Landing v31 — «Термінал»
// The landing IS a working exam terminal: 5 real official cat-B questions with
// restyled images, answered in-place, then an honest verdict against the real
// exam mechanics. NO marketing sections.
//
// ALL question text / options / correct answers are VERBATIM from prisma/dev.db
// (category B, isPublished=1 AND isActive=1 AND archivedAt IS NULL). Extracted at
// author time via sqlite3 — this module is DB-FREE at runtime. Images are the
// approved restyled files in public/restyled-live/. Every number here is real:
// exam mechanics (20 / 20 / 2) + the real cat-B bank count (1757) + topic count.
// ─────────────────────────────────────────────────────────────────────────────

export const YEAR = 2026;

// Real published counts — verified against dev.db 2026-07-17.
export const BANK_B = 1757; // published cat-B questions
export const BANK_B_FMT = "1 757";
export const TOPICS = 65;

// Official exam mechanics (real, fixed by the state theory exam).
export const EXAM = {
  questions: 20,
  minutes: 20,
  maxErrors: 2,
} as const;

export const PRICE = 399; // one-time «доступ до іспиту» (config constant)

// Registration-free path — the anon official-question viewer (v30 convention).
export const ANON_TRY_HREF = "/q/q_1_1";

// Paid access funnel entry (appears once, quietly).
export const ACCESS_HREF = "/register";

export const BRAND = "Drivers School";

// ── The 5 real questions (verbatim from dev.db) ──────────────────────────────
// `correct` index points at the verbatim option that has isCorrect=1 in the DB.
// `context` is one honest line consistent with that answer key.
export type Q = {
  key: string;
  imageKey: string;
  topic: string;
  text: string;
  imageAlt: string;
  options: string[];
  correct: number;
  context: string;
};

export const QUESTIONS: Q[] = [
  {
    key: "q_12_2",
    imageKey: "12_2_0",
    topic: "Швидкість руху",
    text: "З якою максимальною швидкістю дозволено рух водієві зі стажем менш ніж два роки?",
    imageAlt:
      "Легковий автомобіль на заміській дорозі, що в'їжджає в населений пункт «Яблуневе».",
    options: ["60 км/год.", "70 км/год.", "80 км/год.", "90 км/год.", "50 км/год."],
    correct: 1,
    context:
      "Водієві зі стажем до двох років не можна перевищувати 70 км/год — незалежно від типу дороги чи дозвільних знаків.",
  },
  {
    key: "q_11_13",
    imageKey: "11_13_0",
    topic: "Розташування на дорозі",
    text: "Чи може даний транспортний засіб рухатися по крайній лівій смузі?",
    imageAlt:
      "Трактор із причепом посеред дороги; праворуч на узбіччі — круглий знак обмеження швидкості «40».",
    options: [
      "Може завжди.",
      "Не може, тому що завжди повинен рухатися якнайближче до правого краю проїзної частини.",
      "Може рухатися у разі перестроювання перед поворотом ліворуч або розворотом.",
    ],
    correct: 2,
    context:
      "Крайня ліва смуга — тільки для перестроювання перед поворотом ліворуч чи розворотом, а не для постійного руху.",
  },
  {
    key: "q_14_11",
    imageKey: "14_11_0",
    topic: "Обгін",
    text: "Чи дозволено водієві сірого автомобіля виконати обгін білого?",
    imageAlt:
      "Двосмугова заміська дорога: попереду синій трактор, за ним білий автомобіль, ще далі — сірий автомобіль.",
    options: ["Дозволено.", "Заборонено.", "Дозволено тільки в населеному пункті."],
    correct: 1,
    context:
      "Не можна обганяти транспортний засіб, який сам виконує обгін: білий уже пішов на обгін трактора.",
  },
  {
    key: "q_15_37",
    imageKey: "15_37_0",
    topic: "Зупинка і стоянка",
    text: "Який з водіїв правильно зупинив свій транспортний засіб на дорозі з двостороннім рухом за межами населеного пункту?",
    imageAlt:
      "Дорога з двостороннім рухом за межами населеного пункту: синій автомобіль ліворуч біля узбіччя, червоний — на проїзній частині праворуч.",
    options: [
      "Водій червоного автомобіля.",
      "Водій синього автомобіля.",
      "Обидва водії.",
    ],
    correct: 1,
    context:
      "За межами населеного пункту зупинятися дозволено лише на узбіччі — саме там зупинився синій автомобіль.",
  },
  {
    key: "q_13_8",
    imageKey: "13_8_0",
    topic: "Зустрічний роз'їзд",
    text: "Яким правилом повинні керуватися водії в разі обмеженого зустрічного роз'їзду на ділянках доріг, позначених знаками «Крутий підйом» і «Крутий спуск»?",
    imageAlt:
      "Два попереджувальні знаки-трикутники: «Крутий підйом» і «Крутий спуск», обидва з позначкою «10%».",
    options: [
      "Водій, на смузі руху якого є перешкода, повинен дати дорогу.",
      "Водій транспортного засобу, габарити якого заважають зустрічному роз'їзду, повинен дати дорогу.",
      "Відповіді 1 і 2.",
      "Водій транспортного засобу, що рухається на спуск, повинен дати дорогу.",
    ],
    correct: 3,
    context:
      "На крутій ділянці поступається той, хто їде на спуск: рушити знову вгору важче, тому перевагу має водій на підйомі.",
  },
];

// ── Static copy ──────────────────────────────────────────────────────────────
export const COPY = {
  brand: BRAND,
  bankLine: "офіційний банк питань 2026",
  boot: "Пробний блок · 5 питань",
  ui: {
    stub: "Питання",
    of: "з",
    correctTag: "Правильно",
    wrongTag: "Помилка",
    correctAnswerLead: "Правильна відповідь",
    next: "Далі",
    finish: "Підсумок",
  },
  // marginalia — annotations on the machine, tied to REAL mechanics
  margin: {
    fsrs: "кожна відповідь оновлює графік повторень",
    exam: `${EXAM.questions} питань · ${EXAM.minutes} хвилин · ${EXAM.maxErrors} помилки`,
    bank: `${BANK_B_FMT} питань категорії B`,
  },
  verdict: {
    lead: "Пробний блок пройдено",
    scoreOf: "з",
    // honest framing against real exam mechanics — bands, never a pass/fail promise
    bands: {
      high: "П'ять із п'яти в пробному блоці. Але п'ять — це не двадцять: справжній іспит перевіряє ширше.",
      mid: `Непогано для розминки. На справжньому іспиті — ${EXAM.questions} питань і не більше ${EXAM.maxErrors} помилок за ${EXAM.minutes} хвилин.`,
      low: "Тут можна помилятися — це тренування, а не іспит. Саме для цього воно й потрібне.",
    },
    mechanics: `На реальному іспиті — ${EXAM.questions} питань і максимум ${EXAM.maxErrors} помилки за ${EXAM.minutes} хвилин. Це лише розминка, а не гарантія.`,
    ctaPrimary: "Продовжити безкоштовно",
    ctaPrimaryAria: "продовжити безкоштовно, без реєстрації",
    access: `Повний доступ до іспиту — ${PRICE} ₴, один раз. Не підписка.`,
    accessAria: "доступ до іспиту, разова оплата",
    restart: "Пройти блок ще раз",
  },
  disclaimer:
    "Drivers School — навчальний застосунок для підготовки до теоретичного іспиту. Ми не є державним органом і не проводимо офіційний іспит. Питання наведено з навчальною метою.",
} as const;

// SEO surfaces.
export const SEO = {
  title: "Пробний іспит ПДР 2026 — 5 офіційних питань онлайн",
  description: `Складіть пробний блок із 5 справжніх питань категорії B з офіційного банку 2026 — з поясненням до кожного. Далі — ${BANK_B_FMT} питань і симулятор іспиту (${EXAM.questions} питань · ${EXAM.minutes} хвилин · ${EXAM.maxErrors} помилки) безкоштовно.`,
};
