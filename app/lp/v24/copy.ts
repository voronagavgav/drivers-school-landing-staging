/* ====================================================================
   v24 — «Прямим текстом» / drenched-oxblood manifesto.
   ALL visible copy lives here (one exported surface). Every figure comes
   from STATS so a bank revision or price-arm swap is a one-line bump —
   copy, <title>, meta and JSON-LD all read the same constant.

   Copy discipline (machine-gated + house law):
   · no urgency / scarcity / countdowns / live tickers
   · no discounts / strikethroughs / phantom savings
   · «підписк» only in a negated form («Не підписка», «Без підписок») —
     negation token on the SAME source line as the stem
   · «гаранті» stem only ever adjacent to «не » on the same source line
   · no «ГСЦ МВС» attribution — «офіційні питання» + learning-tool disclaimer
   · price transparent; moat claim UA-scoped only
   · every fail-stat resolves into a calm next step
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
  exam: { questions: 20, minutes: 20, errors: 2, pass: 18 },
} as const;

export const BRAND = {
  name: "Drivers School",
  tagline: "Тренер готовності до іспиту ПДР",
};

/* ---- SEO surface (feeds layout metadata + JSON-LD) ----------------- */
export const META = {
  title: "Тести ПДР 2026 онлайн — тренер готовності до іспиту",
  description:
    "2322 офіційні питання ПДР, пояснення, зображення та симулятор 20/20/2 — безкоштовно. Калібрована ймовірність скласти та FSRS-план до твоєї дати іспиту. 399 ₴ один раз.",
};

/* ---- HERO — декларація + доказ №1 ---------------------------------- */
/* A/B slot: A = declaration/plan-led, B = dial/readiness-led. Both share
   line counts & structure; the CTA labels and proof chips NEVER vary. The
   <h1> is one declarative line (≤8 words, period); the sub is one line. */
export const HERO = {
  active: "A" as "A" | "B",
  variants: {
    A: {
      headline: "Питання не в доступі до тестів.",
      sub: "Доступ у всіх. Готовність — ні. Її можна виміряти.",
    },
    B: {
      headline: "Склади з першого разу — бо знаєш, що готовий.",
      sub: "Не відсотки пройденого. Калібрована ймовірність скласти.",
    },
  },
  hook: `Лише ${STATS.firstPassShort} складає теорію з першої спроби — за даними ${STATS.year} року.`,
  chips: ["без реєстрації", `${STATS.bankCountLabel} офіційні питання`, `оновлено ${STATS.year}`],
  ctaPrimary: "Почати безкоштовно",
  ctaSecondary: "Увійти",
  anonLink: "Спробувати без реєстрації",
  /* The live «Доказ №1» exhibit — one official-format question, answerable
     in-viewport with zero account. Factual ПДР content, illustrative. */
  proofLabel: "Доказ №1",
  proofNote: "Жива офіційна база — грай без акаунта.",
  demo: {
    prompt: "З якого віку дозволено керувати транспортними засобами категорії «B»?",
    options: [
      { text: "з 16 років", correct: false },
      { text: "з 18 років", correct: true },
      { text: "з 21 року", correct: false },
    ],
    correctNote: "Правильно. І одразу видно, чому — це і є навчання, а не іспит.",
    wrongNote: "Тут можна помилятися — це тренування, а не іспит. Ось пояснення.",
    /* Real one-line explanation shown live under the verdict — proves the
       free-explanations promise (теза 4) at the very first proof point. */
    explain: "Категорію «B» (легкові авто) дозволено керувати з 18 років.",
    meterCaption: "Готовність рахується з першої відповіді",
    /* Honest data-sufficiency framing — the real dial refuses a number before
       20 answers, so we never print a fabricated readiness % here. */
    meterCaptionAnswered: "1 з 20 відповідей до першого заміру готовності",
  },
};

/* ---- ТЕЗА 1 — Доступ ≠ готовність ---------------------------------- */
export const THESIS1 = {
  n: "01",
  h2: "Доступ до тестів — це ще не готовність",
  bigA: STATS.stateUsers,
  bigALabel: "тренуються безкоштовно",
  bigB: STATS.failShort,
  bigBLabel: "провалюють першу спробу",
  claim: "900 тисяч тренуються безкоштовно — і 4 з 5 провалюють.",
  resolution:
    "Безкоштовна база вже є у всіх. Її не бракує. Бракує відповіді на одне питання: чи ти готовий саме сьогодні.",
};

/* ---- ТЕЗА 2 — Готовність можна виміряти ---------------------------- */
export const THESIS2 = {
  n: "02",
  h2: "Як рахується готовність до іспиту",
  claim: "Готовність — це число. І воно може падати.",
  dialCaption: "Це не % пройденого",
  dialSub: "Калібрована ймовірність скласти іспит саме сьогодні — вона росте й падає разом із тобою.",
  moat:
    "Жоден перевірений український сервіс не показує калібровану ймовірність складання. Ми показуємо.",
  decayNote: "Пропустив кілька днів — дил чесно просів. Це і є чесність: число не бреше.",
};

/* ---- ТЕЗА 3 — Механізм треба називати ------------------------------ */
export const THESIS3 = {
  n: "03",
  h2: "Механізм, який ми називаємо вголос",
  claim: "Ми називаємо механізм. Уся категорія каже «розумно».",
  steps: [
    {
      k: "01",
      t: "Відповідаєш на офіційні питання",
      d: "Ті самі 2322 питання, що й на іспиті. Без демо, без замінників.",
    },
    {
      k: "02",
      t: "FSRS планує повторення до твоєї дати",
      d: "Інтервальне повторення веде кожне питання так, щоб воно було свіжим саме на іспиті.",
    },
    {
      k: "03",
      t: "Дил калібрується за реальними результатами",
      d: "Ймовірність скласти уточнюється щоразу — за твоїми відповідями, не за здогадками.",
    },
  ],
};

/* ---- ТЕЗА 4 — Все, що можна віддати, — віддаємо -------------------- */
export const THESIS4 = {
  n: "04",
  h2: "Симулятор іспиту ПДР — 20 питань, 20 хвилин, 2 помилки",
  claim: "Усе, що можна віддати безкоштовно, — віддаємо.",
  freeList: [
    "усі 2322 офіційні питання",
    "пояснення до кожного",
    "зображення до питань",
    "симулятор іспиту 20 / 20 / 2",
  ],
  simChips: [
    { v: STATS.exam.questions, l: "питань" },
    { v: STATS.exam.minutes, l: "хвилин" },
    { v: STATS.exam.errors, l: "помилки" },
  ],
  simRule: `Як на іспиті: щонайменше ${STATS.exam.pass} з ${STATS.exam.questions}, третя помилка завершує спробу.`,
  simFree: "Симулятор — безкоштовно.",
  wedge: "Пояснення тут не за стіною оплати. Ніколи.",
};

/* ---- ТВОЯ ДАТА — від переконань до плану --------------------------- */
export const DATE = {
  h2: "План підготовки до дати іспиту",
  claim: "Твоя дата перетворює переконання на план.",
  prompt: "Коли твій іспит?",
  perDayBase: "питань на день",
  intensiveNote: "Менше тижня — інтенсив. План згущується, повторення теж.",
  noDate: "Ще не знаєш дати? Почни без неї — план підстроїться, щойно з'явиться.",
  hinge: "Прив'язано до твого іспиту, а не до календаря.",
};

/* ---- ТЕЗА 5 — Ціна — не пастка ------------------------------------- */
export const PRICING = {
  n: "05",
  h2: "Ціна ПДР-тренера — 399 ₴ один раз",
  claim: "Ціна — не пастка.",
  loss: `Кожна спроба — ${STATS.retakeFee} ₴. ${STATS.failShort} провалюють першу.`,
  free: {
    title: "Безкоштовно назавжди",
    items: [
      "усі 2322 офіційні питання",
      "пояснення до кожного",
      "зображення до питань",
      "симулятор іспиту 20 / 20 / 2",
    ],
  },
  paid: {
    title: "Доступ до іспиту",
    price: STATS.priceLabel,
    unit: "один раз",
    frame: "Прив'язано до твого іспиту, а не до календаря.",
    items: [
      "деталізація дилу готовності",
      "FSRS-план до твоєї дати",
      "нагадування за реальними результатами",
      "аналітика помилок",
    ],
    /* «підписк» stem carried with its «Не/Без» negation on THIS one line. */
    negation: "Не підписка. Без автосписань.",
    trust: ["прогрес не зникає", "без автосписань", "одна ціна"],
    cta: "Отримати доступ",
    cheaper: "Дешевше за одну провалену спробу.",
    anchor: `Автошкола за теорію бере ${STATS.autoschoolLow}–${STATS.autoschoolHigh} ₴. Тут — одна плата.`,
  },
};

/* ---- БАЗА — на чому це стоїть -------------------------------------- */
export const PROOF = {
  h2: "Офіційні питання ПДР 2026",
  claim: "На чому це стоїть.",
  facts: [
    { v: STATS.bankCountLabel, l: "офіційні питання" },
    { v: String(STATS.topics), l: "тем" },
    { v: `оновлено ${STATS.year}`, l: "база актуальна" },
  ],
  /* RESERVED — ships with NO aggregate outcome claim until real PassOutcome
     calibration data exists (cold-start honesty). */
  reserved: {
    label: "Скоро",
    text: "Коли назбираємо реальні результати — покажемо, як дил передбачає складання. Поки що чесно порожньо.",
  },
  retaker: "Не склав цього разу? Повертайся — план перебудується під нову дату.",
};

/* ---- FAQ — чесні відповіді (feeds visible accordion + FAQPage JSON-LD) */
export const FAQ = {
  h2: "Чесні відповіді",
  items: [
    {
      q: "Чому не підписка?",
      /* «підписк» stem — «Не/Без» negation kept on the same source line. */
      a: "Бо підготовка до іспиту — це скінченний спринт до однієї дати, а не звичка на роки. Одна ціна, без підписок і автосписань. Заплатив раз — і все.",
    },
    {
      q: "Що безкоштовно назавжди?",
      a: "Усі 2322 офіційні питання, пояснення до кожного, зображення та симулятор іспиту 20 / 20 / 2. Це не тріал і не приманка — це просто безкоштовно.",
    },
    {
      q: "Це офіційний іспит?",
      a: "Ні. Це навчальний тренажер на основі офіційних питань. Сам іспит складають у сервісному центрі — ми готуємо до нього.",
    },
    {
      q: "Як рахується готовність?",
      a: "Це калібрована ймовірність скласти, а не відсоток пройденого. FSRS планує повторення до твоєї дати, а дил уточнюється за твоїми реальними відповідями — тому число може й падати.",
    },
    {
      q: "Чи зникне мій прогрес?",
      a: "Ні. Прогрес зберігається, без автосписань і без прихованих умов. Ти завжди бачиш, за що заплатив.",
    },
    {
      q: "Що я отримую за 399 ₴?",
      a: "Інтелект над твоїми відповідями: деталізацію дилу готовності, FSRS-план до дати, нагадування та аналітику помилок. Питання, пояснення й симулятор лишаються безкоштовними.",
    },
    {
      q: "Ви гарантуєте, що я складу?",
      /* «гаранті» stem sits with «не » on this same source line. */
      a: "Ні — це не гарантія, а чесний інструмент. Ми не обіцяємо результат: ми показуємо, наскільки ти готовий, і ведемо до дати. Рішення складати — за тобою.",
    },
    {
      q: "Скільки коштує спроба іспиту?",
      a: `Кожна офіційна спроба — ${STATS.retakeFee} ₴, і ${STATS.failShort} провалюють першу. Одна плата тут дешевша за одну провалену спробу.`,
    },
    {
      q: "Треба реєструватися, щоб спробувати?",
      a: "Ні. Одне офіційне питання можна пройти прямо тут, без акаунта. Реєстрація потрібна лише щоб зберігати прогрес і бачити дил.",
    },
    {
      q: "Чим ви кращі за безкоштовну державну базу?",
      a: "Держбаза дає доступ до питань — і 900 тисяч користувачів це підтверджують. Але доступ ≠ готовність. Ми додаємо каліброване число готовності та план до дати, чого держбаза не показує.",
    },
  ],
};

/* ---- ФІНАЛЬНИЙ CTA + режими ---------------------------------------- */
export const FINAL = {
  restate: "Питання не в доступі до тестів.",
  restateSub: "Питання — чи ти готовий. Виміряй це сьогодні.",
  ctaPrimary: "Почати безкоштовно",
  ctaSecondary: "Увійти",
  modesTitle: "Одразу до справи",
  modes: [
    { t: "Тренування", d: "офіційні питання по темах", href: ANON_TRY_HREF },
    { t: "Симулятор іспиту", d: "20 / 20 / 2 — як на іспиті", href: REGISTER_HREF },
    { t: "Мій план", d: "підготовка до твоєї дати", href: REGISTER_HREF },
  ],
};

/* ---- ФУТЕР — підпис ------------------------------------------------- */
export const FOOTER = {
  wordmark: BRAND.name,
  columns: [
    {
      title: "Продукт",
      links: [
        { t: "Тренування", href: ANON_TRY_HREF },
        { t: "Симулятор іспиту", href: REGISTER_HREF },
        { t: "Ціна", href: REGISTER_HREF },
      ],
    },
    {
      title: "Акаунт",
      links: [
        { t: "Почати безкоштовно", href: REGISTER_HREF },
        { t: "Увійти", href: LOGIN_HREF },
      ],
    },
  ],
  /* Load-bearing legal surface — learning-tool disclaimer, set plainly. */
  disclaimer:
    "Drivers School — навчальний тренажер для підготовки до теоретичного іспиту ПДР. Ми не є державним органом і не проводимо офіційний іспит. Питання наведено з навчальною метою.",
  copyright: `© ${STATS.year} ${BRAND.name}`,
};
