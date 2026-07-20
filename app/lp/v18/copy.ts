// Landing variant v18 — «Бланк» (exam answer-sheet). ALL visible copy in Ukrainian.
// Single source of truth for the route. Hero headline A/B are swappable SLOTS of
// fixed structure (one line each, similar character budget) — pick ACTIVE below.

// Registration-free anonymous play: the public, no-auth, answerable official question
// page (app/q/[key]). q_1_1 = official question 1.1 (stable content key). Every
// «Спробувати без реєстрації» / free-content link resolves here — NEVER /register or /login.
export const ANON_TRY_HREF = "/q/q_1_1";

// One constant for the bank count (2322 vs vodiy 2321 — verify before print; single source).
export const STATS = {
  bankCount: 2322,
  topics: 65,
  examQuestions: 20,
  examMinutes: 20,
  examMaxErrors: 2,
  price: 399,
  retakeFee: 250,
  schoolLow: 2999,
  schoolHigh: 7000,
  updatedYear: 2026,
};

export const BRAND = "Drivers School";

export const NAV = {
  loginLabel: "Увійти",
  loginHref: "/login",
  // Mobile header swaps «Увійти» for a zero-friction try affordance (points at the anon question).
  tryLabel: "Спробувати",
  tryHref: ANON_TRY_HREF,
};

// ── Section 1 · БЛАНК — the one screen ──────────────────────────────────────
export const HERO = {
  formTitle: "Бланк готовності",
  formCode: "форма · ПДР · 2026",
  // A/B headline slots — same line count, similar budget, interchange with zero layout change.
  headlineA: "Дізнайся, чи ти справді готовий до іспиту.", // dial-first
  headlineB: "Склади іспит з першого разу — бо ти готовий.", // plan-first
  activeHeadline: "A" as "A" | "B",
  subhead: "Тренер готовності до теоретичного іспиту — не ще один збірник тестів.",
  // Printed epigraph line — the enemy hook, visible without scroll.
  epigraph: "Лише 1 з 5 складає з першої спроби · 21,5%, дані 2026 року.",
};

// Поле 1 «Питання» — one real official question, answered in place.
export const QUIZ = {
  fieldLabel: "Питання",
  fieldNote: "офіційна база · без реєстрації",
  question:
    "Чи дозволено водієві розпочинати обгін, якщо транспортний засіб попереду подав сигнал лівого повороту?",
  options: [
    { key: "a", text: "Так, якщо зустрічна смуга вільна", correct: false },
    { key: "b", text: "Ні, обгін заборонено", correct: true },
    { key: "c", text: "Так, з увімкненою аварійною сигналізацією", correct: false },
  ],
  correctNote: "Правильно. Показник готовності реагує.",
  wrongNote: "Тут можна помилятися — це тренування, а не іспит.",
  explanation:
    "Обганяти не можна, коли той, кого обганяєш, увімкнув лівий поворот: він теж збирається виїхати ліворуч. Пояснення відкрите до кожного питання — безкоштовно.",
};

// Поле 2 «Готовність» — the mini-dial demo.
export const DIAL = {
  fieldLabel: "Готовність",
  caption: "Це не % пройденого.",
  demoNote:
    "Демонстрація механіки. Справжній показник — каліброване P(скласти) за десятками твоїх відповідей; він чесно падає, коли знання згасає.",
  zeroLabel: "поки що немає даних",
  // The show reacts to correctness — up on a right answer, DOWN on a wrong one (honesty-as-texture).
  afterCorrect: "перша відповідь зарахована — показник реагує",
  afterWrong: "показник реагує і на помилки",
};

// Поле 3 «Дата іспиту» — date-anchored plan preview.
export const PLAN = {
  fieldLabel: "Дата іспиту",
  hint: "Обери дату — план надрукується під неї.",
  daysWord: (n: number) => `${n} ${pluralDay(n)} до іспиту`,
  perDayWord: (n: number) => `≈ ${n} питань на день`,
  intensive: "інтенсив",
  // Shown instead of a raw number when the date is too close for an honest per-day quota.
  intensiveNote: "Дата дуже близько — план стисне пріоритети до найпровальніших тем.",
  topicsLead: "Спершу — найпровальніші теми:",
  topics: [
    "жести регулювальника",
    "нерегульовані перехрестя",
    "кільцеві розв'язки",
    "розмітка",
    "домедична допомога",
  ],
  // One line to the just-failed visitor (highest-anxiety segment). No day-figure (unverified).
  retaker: "Щойно завалив? Признач нову дату — план перебудується під неї.",
  fsrsNote: "Інтервали розставляє FSRS — повторюєш саме тоді, коли ось-ось забув.",
};

// Поле 4 — the submit field.
export const CTA = {
  primary: "Почати безкоштовно",
  primaryHref: "/register",
  secondary: "Спробувати без реєстрації",
  secondaryHref: ANON_TRY_HREF,
  reassure: ["без картки", "прогрес зберігається", "усе безкоштовно"],
};

// Margin stamps (proof chips) — printed marginalia.
export const STAMPS = [
  { big: `${STATS.bankCount}`, small: "офіційні питання" },
  { big: `${STATS.topics}`, small: "тем" },
  { big: "2026", small: "оновлено" },
  { big: `${STATS.examQuestions}·${STATS.examMinutes}·${STATS.examMaxErrors}`, small: "питань · хв · помилки" },
];

// ── Section 2 · ЗВОРОТНИЙ БІК — ledger + price ──────────────────────────────
export const LEDGER = {
  sectionTitle: "Зворотний бік",
  sectionSub: "Що безкоштовно, а за що — один платіж.",
  freeHead: "Безкоштовно",
  freeAlways: "назавжди",
  free: [
    "усі офіційні питання",
    "пояснення до кожного",
    "зображення до задач",
    "симулятор іспиту",
  ],
  paidHead: `${STATS.price} ₴`,
  paidOnce: "один раз",
  paidTitle: "Доступ до іспиту",
  paid: [
    "деталізація готовності",
    "FSRS-план до твоєї дати",
    "нагадування до повторень",
    "аналітика помилок",
  ],
  bind: "Прив'язано до твого іспиту, а не до календаря.",
  negation: "Не підписка. Без автосписань.",
  // Anchors.
  anchors: [
    `Дешевше за одну провалену спробу — перескладання коштує ${STATS.retakeFee} ₴.`,
    `Автошкола за теорію бере ${STATS.schoolLow.toLocaleString("uk-UA")}–${STATS.schoolHigh.toLocaleString("uk-UA")} ₴.`,
  ],
  // Completion fail-safe slot (final wording pends L1). Never a pass promise; the word is
  // always negated with «не » on its own source line below.
  failsafe:
    "Пройшов увесь план і все одно не склав? Напиши нам — розберемось разом. Це підтримка, а не гарантія результату.",
  trustBand: ["прогрес не зникає", "без автосписань", "одна ціна"],
  stamp: { line1: "ДОСТУП", line2: "ДО ІСПИТУ", line3: "· один раз ·" },
  cta: "Почати безкоштовно",
};

// ── Section 3 · ПРИМІТКИ — disclosures + footer ─────────────────────────────
export const FAQ = {
  sectionTitle: "Примітки",
  sectionSub: "Дрібний шрифт — там, де йому й місце на бланку.",
  items: [
    {
      q: "Чому це не підписка?",
      a: "Тому що ти платиш один раз за доступ до свого іспиту. Немає автопродовження, немає щомісячних списань, немає пастки зі скасуванням. Заплатив — користуєшся до свого іспиту.",
    },
    {
      q: "Що саме безкоштовно?",
      a: "Усі офіційні питання, пояснення до кожного, зображення до задач і симулятор іспиту. Контент не ховається за оплатою. Платний лише шар аналітики: деталізація готовності, план і нагадування.",
    },
    {
      q: "Це офіційний іспит?",
      a: "Ні. Це навчальний застосунок для підготовки на основі офіційних питань. Ми не проводимо іспит і не пов'язані з державними органами — просто допомагаємо підготуватися.",
    },
    {
      q: "Як рахується готовність?",
      a: "Ми оцінюємо каліброване P(скласти) за твоїми реальними відповідями, а не за відсотком пройденого. Знання без повторення згасає — і цифра чесно падає, доки ти не повернешся.",
    },
    {
      q: "Ви гарантуєте, що я складу?",
      a: "Ні, ми не даємо гарантію складання — жоден чесний інструмент не може її дати. Якщо ти пройшов увесь план і все одно не склав — напиши нам, розберемось разом.",
    },
    {
      q: "Я щойно завалив. Чим це поможе?",
      a: "Признач нову дату іспиту — план перебудується під неї й почне з тих тем, де ти помилявся. Повторний вихід — найкращий момент, щоб закрити слабкі місця точково.",
    },
  ],
};

// Mobile mode-launcher rows — direct task entry (free → anon play, план → register).
export const LAUNCHER = {
  title: "Почати одразу",
  rows: [
    { title: "Тренування за темами", sub: "Офіційні питання", href: ANON_TRY_HREF },
    // Label matches the destination: the anon route serves one official question, not a full
    // 20/20 simulator (that runs inside the app). Don't promise a simulator on a single-question page.
    { title: "Спробувати питання", sub: "офіційна база · без реєстрації", href: ANON_TRY_HREF },
    { title: "Мій план до іспиту", sub: "FSRS під твою дату", href: "/register" },
  ],
};

export const FOOTER = {
  wordmark: BRAND,
  tagline: "Тренер готовності до теоретичного іспиту ПДР.",
  disclaimer:
    "Навчальний застосунок для підготовки до теоретичного іспиту. Не є офіційним іспитом і не пов'язаний із державними органами. Питання — на основі чинної офіційної бази.",
  contactLabel: "Зв'язок",
  contactEmail: "hello@drivers.school",
  cols: [
    {
      head: "Продукт",
      links: [
        { label: "Тренування", href: ANON_TRY_HREF },
        { label: "Спробувати питання", href: ANON_TRY_HREF },
        { label: "Мій план", href: "/register" },
        { label: "Увійти", href: "/login" },
      ],
    },
    {
      head: "Іспит",
      links: [
        { label: "Питання й відповіді", href: "#primitky" },
        { label: "Скільки коштує", href: "#zvorotnyj" },
        { label: "Готовність", href: "#blank" },
      ],
    },
  ],
  updated: `Базу оновлено ${STATS.updatedYear}`,
  rights: `© ${STATS.updatedYear} ${BRAND}`,
};

function pluralDay(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "дні";
  return "днів";
}
