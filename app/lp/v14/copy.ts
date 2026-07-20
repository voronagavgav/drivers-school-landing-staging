// All visible copy for landing variant v14 — «Пік форми» (sports-science periodization).
// Ukrainian. Hero headline/subhead are swappable A/B slots of fixed structure (2 lines each,
// one cobalt-accented token, one-line subhead — layout must tolerate length swaps).

export const BRAND = "Drivers School";

// Truthful anonymous-play entry: the public, no-auth, answerable official question page
// (app/q/[key]). q_1_49 = official question 1.49 — the SAME record transcribed verbatim
// into the hero quiz below, so the ghost CTA lands on the exact question just answered.
// Used by every «Спробувати без реєстрації» / free-content link.
export const ANON_TRY_HREF = "/q/q_1_49";

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
  planDays: 43,
  perDay: 25,
  readiness: 71,
  year: 2026,
};

type Token = { t: string; accent?: boolean };

// HERO — swappable A/B headline slots. Same line count (2), one cobalt token, similar char budget.
// A = plan/date-first (peak metaphor). B = dial/readiness-first.
export const HERO_VARIANTS = {
  A: {
    headline: [
      [{ t: "Вийди на " }, { t: "пік", accent: true }],
      [{ t: "до дня іспиту." }],
    ] as Token[][],
    subhead: "План веде твою готовність угору — і вона піка́є саме в день, коли ти складаєш.",
  },
  B: {
    headline: [
      [{ t: "Не відсотки." }],
      [{ t: "Готовність", accent: true }, { t: "." }],
    ] as Token[][],
    subhead: "Один чесний показник: чи ти справді готовий скласти теорію з першої спроби.",
  },
} as const;

export const HERO = {
  variant: "A" as keyof typeof HERO_VARIANTS,
  hook: "Лише 1 з 5 складає теорію з першої спроби — за даними 2026 року.",
  chips: [
    `${STATS.bankCount} офіційні питання`,
    `${STATS.examQuestions} питань · ${STATS.examMinutes} хв · ${STATS.examMaxErrors} помилки`,
    "Питання й симулятор — безкоштовно",
  ],
  ctaPrimary: "Почати безкоштовно",
  ctaSecondary: "Спробувати без реєстрації",
  peakFlag: "день іспиту",
  baseFlag: "старт",
  // Hero mechanic — ONE REAL official question, transcribed verbatim from the bank
  // (questionKey q_1_49; text + 3 options + correct key copied from prisma/dev.db).
  // Answered in-viewport, no network, meter ticks up. `number` = its real ПДР number;
  // the ghost CTA (ANON_TRY_HREF=/q/q_1_49) opens this exact record.
  quiz: {
    number: "1.49",
    label: "Одне питання. Без реєстрації.",
    question:
      "З якого боку дозволено виконати випередження на проїзній частині?",
    options: [
      { key: "a", text: "Тільки з лівого боку.", correct: false },
      { key: "b", text: "Тільки з правого боку.", correct: false },
      {
        key: "c",
        text: "З будь-якого боку по суміжній смузі з дотриманням безпечного інтервалу.",
        correct: true,
      },
    ],
    correctNote: "Правильно. Форма пішла вгору.",
    wrongNote: "Тут можна помилятися — це тренування, а не іспит.",
    meterLabel: "Форма",
  },
};

// READINESS DIAL DEMO
export const DIAL = {
  kicker: "Показник готовності",
  heading: "Одна чесна цифра замість сотні відсотків",
  caption: "Це не % пройденого.",
  body: "Ми рахуємо каліброване P(скласти) за твоїми реальними відповідями. Знання без повторення згасає — і цифра чесно падає, доки ти не повернешся у форму.",
  moat: "Жоден перевірений український сервіс не показує каліброваної ймовірності скласти й не називає рушій інтервального повторення. Ми показуємо.",
  toggleLabel: "Пропустив 3 дні",
  decayNote: "Без повторення форма спадає — цифра це визнає.",
  engine: "FSRS · інтервальне повторення",
  metricLabel: "P(скласти)",
};

// МЕХАНІЗМ 3-STEP STRIP — a real ordered sequence (numbers earned): база → повторення → пік.
export const MECHANISM = {
  kicker: "Як це працює",
  heading: "Періодизація, названа вголос",
  steps: [
    {
      n: "01",
      phase: "База",
      title: "Ти відповідаєш на офіційні питання",
      body: "Уся база — без реєстрації й без блокувань. Кожна відповідь стає даними про твою форму.",
    },
    {
      n: "02",
      phase: "Повторення",
      title: "FSRS планує повтори до твоєї дати",
      body: "Рушій інтервального повторення повертає складне саме тоді, коли воно от-от згасне.",
    },
    {
      n: "03",
      phase: "Пік",
      title: "Готовність калібрується за результатами",
      body: "Показник уточнюється за реальними відповідями й виводить тебе на пік до дня іспиту.",
    },
  ],
};

// EXAM-DATE PICKER
export const PICKER = {
  kicker: "Коли твій старт?",
  heading: "Постав дату — крива підлаштується",
  inputLabel: "Дата іспиту",
  planLabel: "План до іспиту",
  perDayLabel: "питань на день",
  daysLabel: "днів до піку",
  intensive: "Інтенсив — щільний графік до дати.",
  urgent: "Іспит зовсім скоро — режим інтенсиву.",
  calm: "Спокійний темп — час на пік є.",
  noDate: "Без дати теж працює — почни, а крива вибудується пізніше.",
  note: "Ніяких таймерів і зворотного відліку. Лише твій графік виходу на пік.",
};

// EXAM SIMULATOR PROMISE
export const SIMULATOR = {
  kicker: "Симулятор іспиту",
  heading: "Точно як на іспиті. І безкоштовно.",
  facts: [
    { big: "20", small: "питань" },
    { big: "20", small: "хвилин" },
    { big: "2", small: "помилки максимум" },
  ],
  body: "Третя помилка завершує іспит, ≥18/20 — склав, теорія дійсна рік. Ми відтворюємо алгоритм точно.",
  topicsLabel: "Найпровальніші теми",
  topics: [
    "жести регулювальника",
    "нерегульовані перехрестя",
    "кільцеві розв’язки",
    "розмітка",
    "домедична допомога",
  ],
  free: "Симулятор іспиту — повністю безкоштовний. Без переривань і блокувань.",
};

// LOSS-FRAME INTERSTITIAL (deep-navy full-bleed)
export const LOSS = {
  kicker: "Ціна фальстарту",
  line1: "Кожна спроба —",
  amount: "250 ₴",
  line2: "4 з 5 провалюють першу.",
  sub: "Це не таймер і не тиск. Просто цифра, повз яку веде спокійний шлях до піку.",
  cta: "Побудувати план",
};

// PRICING
export const PRICING = {
  kicker: "Доступ до іспиту",
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
  failsafe:
    "Пройшов увесь план і не склав офіційний іспит? Напиши нам — це підстрахування завершення, а не гарантія результату.",
  trust: ["прогрес не зникає", "без автосписань", "одна ціна"],
  cta: "Почати безкоштовно",
};

// HONEST PROOF / БАЗА
export const BASE = {
  kicker: "Чесна база",
  heading: "Що всередині",
  stats: [
    { big: "2322", small: "офіційні питання" },
    { big: "65", small: "тем" },
    { big: "2026", small: "оновлено" },
  ],
  fresh: "База актуальна",
  reserved:
    "Коли з’явиться достатньо реальних результатів, тут буде звіт калібрування: «Коли показник 90+ — складають …». Поки цифр немає — не вигадуємо їх.",
};

// FAQ
export const FAQ = {
  kicker: "Питання і відповіді",
  heading: "Чесні відповіді",
  items: [
    {
      q: "Чому не підписка?",
      a: "Тобі потрібно скласти один іспит, а не платити щомісяця. Доступ до іспиту — разовий платіж, без автосписань і без прихованих продовжень.",
    },
    {
      q: "Що безкоштовно?",
      a: "Усі 2322 офіційні питання, пояснення, зображення й симулятор іспиту — безкоштовно назавжди. Платний лише шар інтелекту: показник готовності та план.",
    },
    {
      q: "Це офіційний іспит?",
      a: "Ні. Це навчальний інструмент для підготовки до теоретичного іспиту. Ми не пов’язані з ГСЦ МВС і не проводимо іспит.",
    },
    {
      q: "Як рахується готовність?",
      a: "Каліброване P(скласти) за твоїми реальними відповідями. Знання згасає — тому показник може падати, доки ти не повториш матеріал.",
    },
    {
      q: "Чи зникне мій прогрес?",
      a: "Ні. Прогрес зберігається за твоїм акаунтом і не скидається платежем чи оновленням бази.",
    },
    {
      q: "Скільки коштує і за що?",
      a: "399 ₴ разово за доступ до іспиту: деталі показника готовності, FSRS-план, нагадування й аналітику помилок. Контент — безкоштовний.",
    },
    {
      q: "Ви гарантуєте, що я складу?",
      a: "Ні — це не гарантія результату. Ми чесно показуємо готовність, а не обіцяємо оцінку. Складання залежить від тебе.",
    },
    {
      q: "Я щойно не склав. Що робити?",
      a: "Повертайся всередині періоду перескладання: постав нову дату, і крива перебудується під найпровальніші для тебе теми.",
    },
    {
      q: "Чи можна без реєстрації?",
      a: "Так. Спробуй питання й симулятор одразу. Акаунт потрібен лише щоб зберегти прогрес і план.",
    },
    {
      q: "Наскільки свіжа база?",
      a: "Питання відповідають чинній офіційній базі 2026 року. Оновлення бази не стирає твій прогрес.",
    },
  ],
};

// FINAL CTA + mobile mode-launcher
export const FINAL = {
  heading: "Вийди на пік до дня іспиту.",
  sub: "Почни безкоштовно — крива вибудується, щойно поставиш дату.",
  ctaPrimary: "Почати безкоштовно",
  ctaSecondary: "Спробувати без реєстрації",
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
  disclaimer:
    "Drivers School — навчальний інструмент для підготовки до теоретичного іспиту. Ми не є офіційним іспитом і не пов’язані з ГСЦ МВС. Складання офіційного іспиту залежить від вас.",
  copyright: `© ${STATS.year} Drivers School`,
};

export const NAV = {
  wordmark: BRAND,
  login: "Увійти",
  register: "Почати",
};
