/* ====================================================================
   v23 — «Без зірочок» / honest ledger.
   ALL visible copy lives here (one exported surface). Every figure comes
   from STATS so a bank revision or price-arm swap is a one-line bump —
   copy, <title>, meta and JSON-LD all read the same constant.
   Copy discipline: no urgency/scarcity, no discounts/strikethroughs,
   «підписк» only negated same-line, «гаранті» stem avoided entirely,
   no «ГСЦ МВС» attribution, price transparent, UA-scoped moat only.
==================================================================== */

export const REGISTER_HREF = "/register";
export const LOGIN_HREF = "/login";
/* Genuinely registration-free path — a single official question, playable
   with zero account. NEVER /login or /register. */
export const ANON_TRY_HREF = "/q/q_1_1";

/* Single source of truth for every number on the page. */
export const STATS = {
  bankCount: 2322,
  bankCountLabel: "2322",
  topics: 65,
  year: 2026,
  price: 399,
  priceLabel: "399",
  currency: "₴",
  retakeFee: 250,
  autoschoolLow: "2 999",
  autoschoolHigh: "7 000",
  firstPassShort: "1 з 5",
  firstPassPct: "21,5%",
  failShort: "4 з 5",
  stateUsers: "900 тисяч",
  exam: { questions: 20, minutes: 20, errors: 2 },
} as const;

export const BRAND = {
  name: "Drivers School",
  tagline: "Тренер готовності до іспиту ПДР",
};

/* ---- HERO ---------------------------------------------------------- */
/* A/B slot: A = plan/date-led, B = dial/readiness-led. Both share line
   counts & structure; CTA labels and chips NEVER vary between variants.
   `active` selects which headline+sub ship (structure is identical). */
export const HERO = {
  active: "A" as "A" | "B",
  variants: {
    /* headline is a segmented run-on (Stripe two-tone device): each segment
       carries an optional tone so the JSX renders the tint without hardcoding
       the copy — flipping `active` swaps the whole line. */
    A: {
      headline: [
        { t: "Все, що вони продають" },
        { t: " — тут ", tone: "muted" as const },
        { t: "безкоштовно.", tone: "acc" as const },
      ],
      sub: `Питання, пояснення й симулятор — 0 ${STATS.currency}. Платиш лише за готовність до свого іспиту.`,
    },
    B: {
      headline: [
        { t: "Не відсотки. " },
        { t: "Готовність.", tone: "acc" as const },
      ],
      sub: `Питання, пояснення й симулятор — 0 ${STATS.currency}. Платиш лише за готовність до свого іспиту.`,
    },
  },
  /* first ruled ledger line, visible without scroll */
  hookLabel: "Перший запис",
  hook: "Лише 1 з 5 складає теорію з першої спроби",
  hookNote: "за даними 2026 року",
  chips: ["Без реєстрації", "Офіційні питання 2026", "FSRS-план до іспиту"],
  ctaPrimary: "Почати безкоштовно",
  ctaSecondary: "Спробувати без реєстрації",
  /* live «перший запис у відомості» — a real official question. Answering
     it prints the page's first honest row + ticks the readiness meter. */
  question: {
    ledgerTitle: "Перший запис у відомості",
    prompt:
      "Яка максимальна швидкість руху легкового автомобіля в населеному пункті?",
    options: ["40 км/год", "50 км/год", "60 км/год", "70 км/год"],
    correct: 1,
    rowAnswered: "1 питання · відповідь зараховано",
    meterLabel: "метр готовності",
    meterDemoTag: "приклад",
    correctToast: "Вірно. Так само рахується вся готовність.",
    wrongToast: "Дозволено 50 км/год. Тут можна помилятися — це тренування.",
  },
} as const;

/* ---- ВІДОМІСТЬ 1 — free forever ------------------------------------ */
export const FREE_LEDGER = {
  h2: "Офіційні питання ПДР 2026 — безкоштовно",
  title: "Що безкоштовно — назавжди",
  sub: "Доступ до тестів нічого не коштує на ринку. Ми не беремо за це грошей.",
  amount: "0 ₴",
  amountNote: "назавжди",
  rows: [
    { label: `Усі ${STATS.bankCountLabel} офіційні питання`, note: `повна база, оновлена ${STATS.year}` },
    { label: "Пояснення до кожної відповіді", note: "чому саме так — видно одразу" },
    { label: "Зображення до питань", note: "знаки, розмітка, ситуації" },
    {
      label: "Симулятор іспиту — як на іспиті",
      note: "20 питань · 20 хвилин · 2 помилки",
      flagship: true,
    },
  ],
  footnote: "Жодне питання не сховане за оплатою. Ніколи.",
} as const;

/* ---- ВІДОМІСТЬ 2 — готовність vs % --------------------------------- */
export const READINESS = {
  h2: "Як рахується готовність до іспиту",
  title: "Готовність, а не відсотки",
  sub: "Дві колонки однієї відомості. Одна дивиться назад, друга — на твій іспит.",
  /* the numbers in this section are illustrative — labelled honestly */
  demoTag: "приклад",
  left: {
    label: "% пройденого",
    caption: "Скільки питань ти вже бачив. Дивиться назад.",
    value: "82%",
    valueNote: "пройдено з бази",
  },
  right: {
    label: "Готовність до іспиту",
    caption: "Це не % пройденого.",
    valueNote: "ймовірність скласти зараз",
    decayNote: "Може падати — і це чесно.",
  },
  moat: "Жоден перевірений український сервіс не показує калібровану ймовірність складання.",
} as const;

/* ---- ПРИМІТКА ДО АУДИТУ — mechanism -------------------------------- */
export const MECHANISM = {
  h2: "Механізм: офіційні питання, FSRS-план, калібрування",
  title: "Примітка до аудиту",
  sub: "Уся математика — на видноті. Жодного «розумного помічника» без пояснень.",
  steps: [
    {
      n: "01",
      title: "Відповідаєш на офіційні питання",
      body: "Кожна відповідь — запис у відомості. Помилки не караються, а враховуються.",
    },
    {
      n: "02",
      title: "FSRS планує повторення до твоєї дати",
      body: "Алгоритм інтервальних повторень FSRS вибудовує план так, щоб ти був готовий саме на іспит.",
    },
    {
      n: "03",
      title: "Дил калібрується за реальними результатами",
      body: "Готовність звіряється з фактичними складаннями. Число чесне, а не намальоване.",
    },
  ],
} as const;

/* ---- ТВОЯ ДАТА — exam-date picker ---------------------------------- */
export const DATE = {
  h2: "План підготовки до дати іспиту",
  title: "Твоя дата іспиту",
  sub: "Постав дату — і план стисне себе під неї. Не звички, не серії. Конкретний день.",
  inputLabel: "Дата іспиту",
  perDayLabel: "питань/день",
  /* pluralized in the component: день / дні / днів */
  daysOne: "день",
  daysFew: "дні",
  daysMany: "днів",
  daysSuffix: "до іспиту",
  weeksLabel: "план до дати",
  estimateTag: "орієнтир",
  intensiveLabel: "інтенсив",
  intensiveNote: "Менше тижня — більше повторень щодня й коротші сесії. План підлаштується, без паніки.",
  emptyState: "Ще не знаєш дату? Це орієнтир — постав свій день, і план перерахується.",
  fallbackDays: 21,
  /* honest ceiling for the per-day preview: a spaced plan is repetition, not
     «вся база ÷ дні», so the preview never claims an implausible pace. */
  perDayCeil: 45,
  frame: "Це доступ до іспиту — прив'язаний до твого дня, а не до календаря.",
} as const;

/* ---- ВІДОМІСТЬ 3 — loss interlude (dark band) ---------------------- */
export const LOSS = {
  h2: "Скільки коштує не готуватись",
  title: "Відомість збитку",
  /* headline as segments so numerals get the `.num` treatment and the copy
     stays here (no hardcoding in JSX). `num` marks a mono amount token. */
  lineA: [
    { t: "Кожна спроба — " },
    { t: `${STATS.retakeFee} ${STATS.currency}`, num: true as const },
    { t: "." },
  ],
  lineB: [
    { t: `${STATS.failShort}`, num: true as const },
    { t: " провалюють першу." },
  ],
  resolve: "Дешевше за одну провалену спробу.",
  reference: `Автошкола, теорія: ${STATS.autoschoolLow} – ${STATS.autoschoolHigh} ${STATS.currency}.`,
  referenceNote: "Чесний орієнтир — не знижка й не порівняння цін.",
  cta: "Скласти з першого разу",
} as const;

/* ---- ПІДСУМОК — pricing 399 ---------------------------------------- */
export const PRICING = {
  h2: "Скільки коштує доступ до іспиту",
  title: "Підсумок відомості",
  price: STATS.priceLabel,
  currency: STATS.currency,
  once: "один раз",
  frame: "Доступ до іспиту",
  frameNote: "Прив'язано до твого іспиту, а не до календаря.",
  freeTitle: "Безкоштовно — назавжди",
  free: [
    `Усі ${STATS.bankCountLabel} офіційні питання`,
    "Пояснення до кожної відповіді",
    "Зображення до питань",
    "Симулятор 20 · 20 · 2 — як на іспиті",
  ],
  paidTitle: "Платний доступ — це інтелект",
  paid: [
    "Деталізація дилу готовності",
    "FSRS-план до твоєї дати",
    "Нагадування, коли час повторити",
    "Аналітика помилок",
  ],
  negation: "Не підписка. Без автосписань.",
  trustBand: ["прогрес не зникає", "без автосписань", "одна ціна"],
  /* completion-tied fail-safe — one honest sentence, no «гаранті» stem.
     Exact legal wording pends L1. */
  failsafe:
    "Пройшов увесь план, але не склав — наступна спроба з нами безкоштовна.",
  cta: "Відкрити доступ до іспиту",
  ctaFree: "Спершу — безкоштовно",
} as const;

/* ---- БАЗА — proof звірка ------------------------------------------- */
export const PROOF = {
  h2: "Офіційна база ПДР 2026 — звірка",
  title: "База — звірка",
  sub: "Числа, які можна перевірити.",
  freshBadge: "база актуальна",
  rows: [
    { value: STATS.bankCountLabel, label: "офіційні питання" },
    { value: String(STATS.topics), label: "тем" },
    { value: String(STATS.year), label: "оновлено" },
  ],
  /* reserved calibration-report line — ships EMPTY of claims */
  reserved: {
    label: "Коли дил показує 90+, складають…",
    value: "з'явиться з реальними результатами",
  },
  retaker: "Не склав? Повернись у вікні перескладання — план перерахується під нову дату.",
} as const;

/* ---- FAQ ----------------------------------------------------------- */
export const FAQ = {
  h2: "Часті запитання про підготовку до ПДР",
  title: "Заперечення — по пунктах",
  items: [
    {
      q: "Чому не підписка?",
      a: "Іспит — це фініш, а не звичка. Ти готуєшся до конкретного дня, складаєш і йдеш. Тому тут разова ціна, не підписка й без автосписань.",
    },
    {
      q: "Що безкоштовно назавжди?",
      a: `Усі ${STATS.bankCountLabel} офіційні питання, пояснення, зображення та симулятор іспиту 20·20·2. Доступ до тестів ми не продаємо — він вільний.`,
    },
    {
      q: "Чи це офіційний іспит?",
      a: "Ні. Drivers School — навчальний застосунок для підготовки. Це не державний сервіс і не офіційне складання.",
    },
    {
      q: "Як рахується готовність?",
      a: "Це калібрована ймовірність скласти зараз: FSRS планує повторення, а число звіряється з реальними результатами. Тому воно може й падати — це чесно.",
    },
    {
      q: "Чи зникне мій прогрес?",
      a: "Ні. Прогрес зберігається за тобою. Жодних скидань і жодних вікон, після яких усе обнуляється.",
    },
    {
      q: "Скільки коштує і як платити?",
      a: `${STATS.priceLabel} ${STATS.currency} один раз, оплата на сайті. Ціна велика й проста — без зірочок і без дрібного шрифту.`,
    },
    {
      q: "Що входить у платний доступ?",
      a: "Лише інтелект над твоїми даними: деталізація дилу готовності, FSRS-план до дати, нагадування й аналітика помилок. Питання й пояснення залишаються безкоштовними.",
    },
    {
      q: "Чи будуть автосписання?",
      a: "Ні. Це не підписка — платиш один раз, і все. Нічого не спишеться саме.",
    },
    {
      q: "А якщо я не складу?",
      a: "Якщо ти пройшов увесь план, але не склав — наступна спроба з нами безкоштовна. Точні умови ми фіналізуємо перед запуском.",
    },
    {
      q: "Чи потрібна реєстрація, щоб спробувати?",
      a: "Ні. Можна відкрити питання й відповісти прямо зараз, без акаунта.",
    },
    {
      q: "Скільки часу треба на підготовку?",
      a: "Залежить від твоєї дати. Постав день іспиту — і план покаже, скільки питань на день, щоб встигнути спокійно.",
    },
  ],
} as const;

/* ---- ФІНАЛЬНИЙ CTA + режими ---------------------------------------- */
export const FINAL = {
  title: "Відкрий відомість.",
  sub: "Почни безкоштовно. Плати лише за готовність.",
  ctaPrimary: "Почати безкоштовно",
  ctaSecondary: "Спробувати без реєстрації",
  modesLabel: "Одразу до діла",
  modes: [
    { label: "Тренування", note: "офіційні питання", href: REGISTER_HREF },
    { label: "Симулятор іспиту", note: "20 · 20 · 2", href: REGISTER_HREF },
    { label: "Мій план", note: "до твоєї дати", href: REGISTER_HREF },
  ],
} as const;

/* ---- ФУТЕР --------------------------------------------------------- */
export const FOOTER = {
  wordmark: BRAND.name,
  columns: [
    {
      title: "Продукт",
      links: [
        { label: "Почати", href: REGISTER_HREF },
        { label: "Спробувати питання", href: ANON_TRY_HREF },
        { label: "Увійти", href: LOGIN_HREF },
      ],
    },
    {
      title: "Підготовка",
      links: [
        { label: "Симулятор іспиту", href: REGISTER_HREF },
        { label: "План до дати", href: REGISTER_HREF },
        { label: "Готовність", href: REGISTER_HREF },
      ],
    },
  ],
  /* load-bearing legal line — the closing ruled row of the book */
  disclaimer:
    "Drivers School — навчальний застосунок для підготовки до теоретичного іспиту ПДР. Це не державний орган і не офіційне складання. Питання наведено з навчальною метою.",
  rights: `© ${STATS.year} ${BRAND.name}`,
} as const;

/* Meta (server layout consumes these). */
export const META = {
  title: `Тести ПДР ${STATS.year} онлайн — тренер готовності до іспиту | ${BRAND.name}`,
  description: `${STATS.bankCountLabel} офіційні питання, пояснення та симулятор іспиту (${STATS.exam.questions} питань · ${STATS.exam.minutes} хвилин · ${STATS.exam.errors} помилки) — безкоштовно, без реєстрації. Тренер, що рахує твою готовність до іспиту ПДР.`,
} as const;
