// All visible copy for landing variant v12 — «Табло» (split-flap departure board).
// Ukrainian. Hero headline/subhead are swappable A/B slots of fixed structure.

export const BRAND = "Drivers School";

// Truthful anonymous-play entry: the public, no-auth, answerable official question page
// (app/q/[key]) — a logged-out visitor answers a real question, no login wall. q_1_1 = official
// question 1.1 (stable content key). Used by every «Спробувати без реєстрації» / free-content link.
export const ANON_TRY_HREF = "/q/q_1_1";

// Numbers as constants (feed copy, meta, schema atomically).
export const STATS = {
  bankCount: 2322, // official questions — verify vs vodiy 2321 before print; single source
  topics: 65,
  firstTryPassPct: 21, // «1 з 5» — 21.5% 2026 YTD (ГСЦ МВС)
  retakeFeeUAH: 250,
  price: 399,
  examQuestions: 20,
  examMinutes: 20,
  examMaxErrors: 2,
  examDate: "2026-08-28", // default exam date; hero strip reads 28.08
  examDateLabel: "28.08",
  planDays: 43,
  readiness: 71,
  year: 2026,
};

// HERO — swappable A/B headline slots. Same line count (2), similar char budget.
// Variant A = plan/date-first. Variant B = dial/readiness-first.
export const HERO_VARIANTS = {
  A: {
    headline: ["Твоя дата.", "Твій план."],
    subhead: "Введи дату іспиту — і побач план підготовки саме до неї.",
  },
  B: {
    headline: ["Не відсотки.", "Готовність."],
    subhead: "Єдиний показник, що чесно каже: чи ти справді готовий скласти.",
  },
} as const;

export const HERO = {
  variant: "A" as keyof typeof HERO_VARIANTS,
  strip: ["ІСПИТ", "28.08", "ПЛАН", "43 ДНІ", "ГОТОВНІСТЬ", "71%"],
  sampleLabel: "ПРИКЛАД", // the strip is a sample board, not a live count (visitor has 0 answers yet)
  hook: "Лише 1 з 5 складає теорію з першої спроби — за даними 2026 року.",
  chips: [
    `${STATS.bankCount} офіційні питання`,
    `${STATS.examQuestions} питань · ${STATS.examMinutes} хв · ${STATS.examMaxErrors} помилки`,
    "Усе безкоштовно",
  ],
  ctaPrimary: "Почати безкоштовно",
  ctaSecondary: "Спробувати без реєстрації",
  // Hero mechanic — one real official-style question, answered in-viewport.
  quiz: {
    label: "СПРОБУЙ ЗАРАЗ · БЕЗ РЕЄСТРАЦІЇ",
    question: "Чи дозволено водієві розпочинати обгін, якщо транспортний засіб попереду подав сигнал лівого повороту?",
    options: [
      { key: "a", text: "Так, якщо дорога вільна", correct: false },
      { key: "b", text: "Ні, обгін заборонено", correct: true },
      { key: "c", text: "Так, з увімкненою аварійною сигналізацією", correct: false },
    ],
    correctNote: "Правильно. Готовність зросла.",
    wrongNote: "Тут можна помилятися — це тренування, а не іспит.",
    meterLabel: "ГОТОВНІСТЬ",
  },
};

// READINESS DIAL DEMO
export const DIAL = {
  eyebrow: "ГОТОВНІСТЬ",
  heading: "Один чесний показник замість сотні відсотків",
  caption: "Це не % пройденого.",
  body: "Ми рахуємо каліброване P(скласти) за твоїми реальними відповідями. Знання без повторення згасає — і цифра чесно падає, доки ти не повернешся.",
  moat: "Жоден перевірений український сервіс не показує каліброваної ймовірності скласти й не називає рушій інтервального повторення. Ми показуємо.",
  decayLabel: "БЕЗ ПОВТОРЕННЯ ЦИФРА ПАДАЄ",
  engine: "FSRS — інтервальне повторення",
};

// МЕХАНІЗМ 3-STEP STRIP
export const MECHANISM = {
  eyebrow: "ЯК ЦЕ ПРАЦЮЄ",
  heading: "Механізм, названий уголос",
  steps: [
    { n: "01", title: "Ти відповідаєш", body: "Офіційні питання з бази — без реєстрації, без блокувань." },
    { n: "02", title: "FSRS планує", body: "Рушій інтервального повторення будує план до твоєї дати." },
    { n: "03", title: "Дил калібрується", body: "Показник готовності уточнюється за реальними результатами." },
  ],
};

// EXAM-DATE PICKER
export const PICKER = {
  eyebrow: "ТВОЯ ДАТА",
  heading: "Обери дату — дошка перегорнеться",
  inputLabel: "Дата іспиту",
  planLabel: "ПЛАН ДО ІСПИТУ",
  perDayLabel: "питань на день",
  daysLabel: "днів",
  intensive: "Інтенсив — щільний графік до дати",
  urgent: "Іспит зовсім скоро — інтенсив",
  calm: "Спокійний темп — час є",
  noDate: "Без дати теж працює — почни, а план з’явиться пізніше.",
  note: "Ніяких таймерів і зворотного відліку. Лише твій план.",
};

// EXAM SIMULATOR PROMISE
export const SIMULATOR = {
  eyebrow: "СИМУЛЯТОР ІСПИТУ",
  heading: "Точно як на іспиті. І безкоштовно.",
  facts: [
    { big: "20", small: "питань" },
    { big: "20", small: "хвилин" },
    { big: "2", small: "помилки максимум" },
  ],
  body: "Третя помилка завершує іспит, ≥18/20 — склав, теорія дійсна рік. Ми відтворюємо алгоритм точно.",
  topicsLabel: "Найпровальніші теми",
  topics: ["жести регулювальника", "нерегульовані перехрестя", "кільцеві розв’язки", "розмітка", "домедична допомога"],
  free: "Симулятор іспиту — повністю безкоштовний. Без переривань і блокувань.",
};

// LOSS-FRAME INTERSTITIAL
export const LOSS = {
  line1: "Кожна спроба —",
  amount: "250 ₴",
  line2: "4 з 5 провалюють першу.",
  sub: "Дошка показує не таймер, а спокійний шлях повз цю цифру.",
  cta: "Побудувати план",
};

// PRICING
export const PRICING = {
  eyebrow: "ДОСТУП ДО ІСПИТУ",
  heading: "Одна ціна. Прив’язана до твого іспиту.",
  price: `${STATS.price} ₴`,
  priceNote: "Разовий платіж — не підписка, без автосписань.",
  anchor: "Дешевше за одну провалену спробу.",
  freeTitle: "Безкоштовно назавжди",
  free: [
    "Усі 2322 офіційні питання",
    "Пояснення до кожного питання",
    "Оновлені зображення",
    "Симулятор іспиту на час",
  ],
  paidTitle: "Доступ до іспиту — 399 ₴",
  paid: [
    "Показник готовності в деталях",
    "FSRS-план до твоєї дати",
    "Калібровані нагадування",
    "Аналітика помилок",
  ],
  negations: ["Не підписка", "Без автосписань", "Одна ціна"],
  failsafe: "Пройшов увесь план і не склав офіційний іспит? Напиши нам — це підстрахування завершення, а не гарантія результату.",
  cta: "Почати безкоштовно",
};

// HONEST PROOF / БАЗА
export const BASE = {
  eyebrow: "ЧЕСНА БАЗА",
  heading: "Що всередині",
  stats: [
    { big: "2322", small: "офіційні питання" },
    { big: "65", small: "тем" },
    { big: "2026", small: "оновлено" },
  ],
  fresh: "База актуальна",
  reserved: "Коли з’явиться достатньо реальних результатів, тут буде звіт калібрування: «Коли дил показує 90+ — складають …». Поки цифр немає — не вигадуємо їх.",
};

// FAQ
export const FAQ = {
  eyebrow: "ПИТАННЯ І ВІДПОВІДІ",
  heading: "Чесні відповіді",
  items: [
    { q: "Чому не підписка?", a: "Тобі потрібно скласти один іспит, а не платити щомісяця. Доступ до іспиту — разовий платіж, без автосписань і без прихованих продовжень." },
    { q: "Що безкоштовно?", a: "Усі 2322 офіційні питання, пояснення, зображення й симулятор іспиту — безкоштовно назавжди. Платний лише шар інтелекту: показник готовності та план." },
    { q: "Це офіційний іспит?", a: "Ні. Це навчальний інструмент для підготовки до теоретичного іспиту. Ми не пов’язані з ГСЦ МВС і не проводимо іспит." },
    { q: "Як рахується готовність?", a: "Каліброване P(скласти) за твоїми реальними відповідями. Знання згасає — тому показник може падати, доки ти не повториш матеріал." },
    { q: "Чи зникне мій прогрес?", a: "Ні. Прогрес зберігається за твоїм акаунтом і не скидається платежем чи оновленням бази." },
    { q: "Скільки коштує і за що?", a: "399 ₴ разово за доступ до іспиту: деталі показника готовності, FSRS-план, нагадування й аналітику помилок. Контент — безкоштовний." },
    { q: "Ви гарантуєте, що я складу?", a: "Ні — це не гарантія результату. Ми чесно показуємо готовність, а не обіцяємо оцінку. Складання залежить від тебе." },
    { q: "Я щойно не склав. Що робити?", a: "Повертайся всередині періоду перескладання: постав нову дату, і план перебудується під найпровальніші для тебе теми." },
    { q: "Чи можна без реєстрації?", a: "Так. Спробуй питання й симулятор одразу. Акаунт потрібен лише щоб зберегти прогрес і план." },
    { q: "Наскільки свіжа база?", a: "Питання відповідають чинній офіційній базі 2026 року. Оновлення бази не стирає твій прогрес." },
  ],
};

// FINAL CTA + mobile mode-launcher
export const FINAL = {
  heading: "Твоя дата. Твій план.",
  sub: "Почни безкоштовно — план з’явиться, щойно поставиш дату.",
  ctaPrimary: "Почати безкоштовно",
  ctaSecondary: "Спробувати без реєстрації",
  // Free content (training, simulator) → public anon question; account-only feature (plan) → register.
  modes: [
    { title: "Тренування", sub: "Офіційні питання за темами", href: ANON_TRY_HREF },
    { title: "Симулятор іспиту", sub: "20 питань · 20 хвилин", href: ANON_TRY_HREF },
    { title: "Мій план", sub: "FSRS до твоєї дати", href: "/register" },
  ],
};

// FOOTER
export const FOOTER = {
  wordmark: BRAND,
  tagline: "Тренер готовності, а не ще один збірник тестів.",
  // Every link resolves to a REAL route: free content → the public anon question, account features →
  // register. The «Компанія» legal/company column is intentionally omitted until its pages (Про нас /
  // Контакти / Умови / Конфіденційність) actually exist — legal links landing on a signup form deceive.
  columns: [
    {
      title: "Продукт",
      links: [
        { label: "Тренування", href: ANON_TRY_HREF },
        { label: "Симулятор іспиту", href: ANON_TRY_HREF },
        { label: "План до іспиту", href: "/register" },
        { label: "Показник готовності", href: "/register" },
      ],
    },
    {
      title: "База",
      links: [
        { label: "Офіційні питання", href: ANON_TRY_HREF },
        { label: "Пояснення", href: ANON_TRY_HREF },
        { label: "Теми", href: ANON_TRY_HREF },
        { label: "Оновлення", href: "/register" },
      ],
    },
  ],
  disclaimer: "Drivers School — навчальний інструмент для підготовки до теоретичного іспиту. Ми не є офіційним іспитом і не пов’язані з ГСЦ МВС. Складання офіційного іспиту залежить від вас.",
  copyright: `© ${STATS.year} Drivers School`,
};

export const NAV = {
  wordmark: BRAND,
  login: "Увійти",
  register: "Почати",
};
