// All visible copy for landing variant v28 — «Дві дороги» (parallel-paths narrative).
// Ukrainian. Visual system is NEW: night asphalt + road-marking paint (duotone) + ONE amber accent.
// Display: Arsenal 700 (native Ukrainian cyrillic). Body: Arsenal 400. Numerals: JetBrains Mono.
//
// The page runs two literal road lanes — «Сам» / «Автошкола» — down the screen, tracking two prep
// paths in parallel until they converge at the SAME 21,2% / 19,9% first-attempt odds; the third lane
// that opens is the product (the readiness dial). Amber is reserved: CTA pills, dial needle, третя смуга.
//
// Hero headline/subhead are swappable A/B slots of FIXED structure (2-line headline, one-line subhead,
// identical char budget). CTA labels + proof chips NEVER vary between variants.

export const BRAND = "Drivers School";

// Truthful anonymous-play entry: the public, no-auth, answerable official question page (app/q/[key]).
// q_15_10 = official question 15.10 — the SAME record transcribed verbatim into the hero quiz below,
// so the registration-free CTA lands on the exact question just answered, and its restyled image
// (served by /api/q-image) proves the «оновлені зображення» claim inside the simulator frame.
export const ANON_TRY_HREF = "/q/q_15_10";

// Numbers as constants (feed copy, meta, schema atomically — a bank revision or price-arm swap is a
// one-line bump). Verified 2026-07-16 per REFRESH/STRATEGY.
export const STATS = {
  bankCount: 2322, // official questions — count-checked; single source
  topics: 65,
  firstTryPct: "21,5", // «1 з 5» — 21.5% first-attempt pass, 2026 YTD; Ukrainian decimal comma
  firstTrySelf: "21,2", // self-prep first-attempt pass — the convergence spine
  firstTrySchool: "19,9", // автошкола first-attempt pass
  freeUsers: 900000, // state simulator «900 000+», re-confirmed 2026-07-16
  retakeFeeUAH: 250,
  schoolLowUAH: 2999, // автошкола theory reference floor (honest anchor)
  schoolHighUAH: 7000, // автошкола theory reference ceiling
  price: 399,
  examQuestions: 20,
  examMinutes: 20,
  examMaxErrors: 2,
  examPassMin: 18, // ≥18/20
  planPool: 600, // core plan pool the date-picker math schedules over (single source)
  year: 2026,
};

// Grouped-thousands form of the bank count — ONE display format everywhere (chips, pricing, FAQ, БАЗА)
// so «2322» and «2 322» never disagree across surfaces. The year is NEVER passed through this (a year
// is not a quantity and must render «2026», not «2 026»).
export const BANK_FMT = STATS.bankCount.toLocaleString("uk-UA");

type Token = { t: string; muted?: boolean };

// HERO — the two-tone run-on headline IS the page thesis and is shared across A/B (paint-white +
// graphite-white duotone; NO amber in the headline). Only the subhead swaps register: A = dial/
// readiness-first, B = plan/date-first. Same line counts, similar char budget.
export const HERO_VARIANTS = {
  A: {
    headline: [
      [{ t: "Сам чи в автошколі —" }],
      [{ t: "шанси майже ", muted: true }, { t: "однакові." }],
    ] as Token[][],
    subhead:
      "Різниця не в тому, де ти вчишся, а в тому, чи знаєш ти, що готовий. Один показник це показує.",
  },
  B: {
    headline: [
      [{ t: "Сам чи в автошколі —" }],
      [{ t: "шанси майже ", muted: true }, { t: "однакові." }],
    ] as Token[][],
    subhead:
      "Обидві дороги ведуть до однієї дати іспиту. Ми будуємо твій план саме до неї.",
  },
} as const;

export const HERO = {
  variant: "A" as keyof typeof HERO_VARIANTS,
  kicker: "дві дороги · один іспит",
  hook: `Лише 1 з 5 складає теорію з першої спроби — за даними ${STATS.year}.`,
  // Remainder of the hook AFTER the amber «1 з 5» token, so the chip prints the stat once (the amber
  // pill carries «1 з 5», this carries the rest) — never «1 з 5 Лише 1 з 5 …».
  hookLead: "складає теорію з першої спроби",
  laneSelf: "Сам",
  laneSchool: "Автошкола",
  chips: [
    `${BANK_FMT} офіційні питання`,
    `${STATS.examQuestions} питань · ${STATS.examMinutes} хв · ${STATS.examMaxErrors} помилки`,
    "Питання й симулятор — безкоштовно",
  ],
  ctaPrimary: "Почати безкоштовно",
  ctaSecondary: "Спробувати без реєстрації",
  // Hero mechanic — ONE REAL official question (questionKey q_15_10; text + 3 options + correct key +
  // restyled imageKey copied verbatim). Answered in-viewport, no network; a mini readiness meter ticks
  // up from 0 — the anti-hollow-free-tier statement. The card sits ON the centerline both lanes share.
  quiz: {
    number: "15.10",
    label: "Одне питання. На центральній смузі — те, що спільне для обох доріг.",
    imageKey: "15_10_0",
    question: "Чи дозволено водієві жовтого автомобіля зупинитися в цьому місці?",
    options: [
      { key: "a", text: "Тільки для посадки або висадки пасажирів.", correct: false },
      { key: "b", text: "Дозволено.", correct: true },
      { key: "c", text: "Заборонено.", correct: false },
    ],
    correctNote: "Правильно. Перша точка твоєї готовності — тут.",
    wrongNote: "Тут можна помилятися — це тренування, а не іспит.",
    // Hero mechanic is a FIRST DATA POINT, never a calibrated score: one answer fills one notch and
    // says so — a wrong answer records a point too, it does NOT move a «готовність %» (that would be
    // an uncalibrated readiness number, banned). The real dial needs many real answers.
    meterIdle: "Один клік — і зафіксуємо першу точку готовності.",
    meterFirst: "Перша відповідь зафіксована — показник готовності з’явиться після твоїх відповідей.",
    tryFull: "Відповісти без реєстрації",
  },
};

// ДВІ СМУГИ — mirrored parallel beats. Factual, muted, no mockery — both paths respected.
export const LANES = {
  heading: "Як готуються",
  sub: "Дві дороги йдуть поруч. Придивись — вони роблять одне й те саме.",
  self: {
    name: "Сам",
    tag: "самопідготовка",
    beats: [
      { head: "Безкоштовний симулятор", body: "Державний тренажер, 900 000+ користувачів. Питання відкриті всім." },
      { head: "Нескінченна купа питань", body: "Прокручуєш білети знову й знову — стільки, скільки витримаєш." },
      { head: "Жодного сигналу готовності", body: "Ніхто не каже, коли зупинитися. Ти просто здогадуєшся, що вже час." },
    ],
  },
  school: {
    name: "Автошкола",
    tag: "теоретичний курс",
    beats: [
      { head: `${STATS.schoolLowUAH.toLocaleString("uk-UA")}–${STATS.schoolHighUAH.toLocaleString("uk-UA")} ₴ за теорію`, body: "Оплачений курс: лекції, розклад, викладач у класі." },
      { head: "Лекції за програмою", body: "Той самий матеріал, той самий офіційний перелік питань." },
      { head: "Той самий тест у кінці", body: "На виході — точно такий іспит, як і в того, хто вчився сам." },
    ],
  },
  merge: "Обидві смуги ведуть до одних дверей.",
};

// ЗБІГ — convergence band (LIGHT interlude on the dark page). Oversized duo-stat; nothing else
// quantified appears here — this is the page's aha and must not be diluted.
export const CONVERGE = {
  kicker: "Збіг",
  self: { value: STATS.firstTrySelf, label: "складають самі — з першої спроби" },
  school: { value: STATS.firstTrySchool, label: "складають після автошколи — з першої" },
  reading:
    "Різниця не в тому, де ти вчишся, а в тому, чи знаєш ти, що готовий.",
  foot: "Обидві цифри — за офіційними даними першої спроби. Автошкола ледь зрушує шанс.",
};

// ТРЕТЯ СМУГА — the readiness dial opens as a new lane. VISIBLY DECAYS. Product UI = the only
// polychrome on the page (amber). Caption verbatim; UA-scoped moat line.
export const DIAL = {
  kicker: "Третя смуга",
  heading: "Показник готовності",
  lead:
    "Відкривається третя смуга — та, якої немає в жодної дороги. Один калібрований показник: чи ти справді готовий скласти з першої.",
  // Distinct from `lead` (the section sub) so the card body isn't a verbatim echo. Opens the demo in
  // its own register and flags itself as an example (see exampleTag) — 58% is illustrative, not a real
  // user's calibrated number.
  cardLead:
    "Показник тримається на твоїх реальних відповідях. Пропустив дні — він чесно падає, доки ти не повернешся.",
  exampleTag: "приклад",
  metricLabel: "шанс скласти",
  caption: "Це не % пройденого.",
  engine: "FSRS · інтервальне повторення",
  decayToggle: "Пропустив 3 дні",
  decayNote: "Без повторення знання згасає — і показник чесно падає, доки ти не повернешся.",
  moat:
    "Жоден перевірений український сервіс не показує каліброваної ймовірності скласти. Ми показуємо — і не ховаємо цифру, коли вона падає.",
};

// РОЗМІТКА МЕХАНІЗМУ — the one deliberate numbered sequence, drawn as road markings. Dash spacing
// widens at step 02 (spaced repetition literally drawn). Name FSRS + калібрування in plain words.
export const MECHANISM = {
  kicker: "Розмітка механізму",
  heading: "Як це працює під капотом",
  steps: [
    { no: "01", head: "Відповідаєш", body: "На офіційні питання — без реєстрації, як на іспиті." },
    { no: "02", head: "FSRS планує повторення", body: "Рушій інтервального повторення повертає складне саме перед тим, як воно згасне — до твоєї дати. Інтервали ростуть, коли пам’ять міцнішає." },
    { no: "03", head: "Дил калібрується", body: "Показник уточнюється за реальними результатами: відрізняє «вгадав» від «знаю напевно»." },
  ],
};

// ТВОЯ ДАТА — exam-date picker → shrinking «план до іспиту» preview. Narrative hinge: plants the
// «доступ до іспиту» frame the pricing card pays off.
export const DATE = {
  kicker: "Твоя дата",
  heading: "Обидві дороги ведуть до однієї дати",
  lead: "Постав дату іспиту — план стиснеться під неї. Ніяких таймерів, лише твій графік.",
  inputLabel: "Дата іспиту",
  planLabel: "План до іспиту",
  perDay: "питань на день",
  daysLeft: "днів до іспиту",
  intensive: "Інтенсив — щільний графік до дати.",
  urgent: "Іспит зовсім скоро — режим інтенсиву.",
  calm: "Спокійний темп — час є.",
  noDate: "Без дати теж працює — почни, а план вибудується пізніше.",
  invalid: "Обери майбутню дату — і план вибудується до неї.",
};

// СИМУЛЯТОР — 20/20/2 fidelity chips + «Симулятор — безкоштовно» wedge + a restyled question inside
// the simulator frame (quality proof).
export const SIMULATOR = {
  kicker: "Симулятор",
  heading: "Точно як на іспиті",
  facts: [
    { big: "20", small: "питань" },
    { big: "20", small: "хвилин" },
    { big: "2", small: "помилки максимум" },
  ],
  rule: "Третя помилка завершує іспит, ≥18/20 — склав. Ми відтворюємо алгоритм точно.",
  free: "Симулятор — безкоштовно. Без переривань і блокувань.",
  frameLabel: "Питання симулятора",
  frameCaption: "Оновлене зображення — чіткіше за скан із білета.",
};

// ЦІНА ПОВОРОТУ — loss band (LIGHT interlude). Calm resolution into the plan; no timers, no red.
export const LOSS = {
  kicker: "Ціна повороту не туди",
  amount: "250 ₴",
  line: "Кожна спроба —",
  after: "4 з 5 провалюють першу.",
  sub: "Це не таймер і не тиск. Просто цифра, повз яку веде спокійний план.",
  cta: "Побудувати план",
};

// ЦІНА — доступ до іспиту. Free column FIRST and LONGER; negations same-line grep-safe; trust band.
export const PRICING = {
  kicker: "Ціна",
  heading: "Плати за смугу, а не за дорогу",
  price: `${STATS.price} ₴`,
  once: "один раз",
  bind: "прив’язано до твого іспиту, а не до календаря",
  anchor: "Дешевше за одну провалену спробу.",
  schoolAnchor: `Автошкола за саму теорію — ${STATS.schoolLowUAH.toLocaleString("uk-UA")}–${STATS.schoolHighUAH.toLocaleString("uk-UA")} ₴.`,
  freeTitle: "Безкоштовно назавжди",
  free: [
    `Усі ${BANK_FMT} офіційні питання`,
    "Пояснення до кожного питання",
    "Оновлені зображення до питань",
    `Симулятор: ${STATS.examQuestions} питань · ${STATS.examMinutes} хв · ${STATS.examMaxErrors} помилки`,
    "Без реєстрації — почни одразу",
    "Прогрес зберігається за акаунтом",
  ],
  freeCta: "Спробувати без реєстрації",
  paidTitle: `Доступ до іспиту — ${STATS.price} ₴`,
  paid: [
    "Деталізація показника готовності",
    "FSRS-план до твоєї дати",
    "Калібровані нагадування",
    "Аналітика помилок",
  ],
  negations: ["Не підписка", "Без автосписань", "Одна ціна"],
  // guarantee-stem word kept on ONE unwrapped line with its negation «не » — grep-safe.
  failsafe:
    "Пройшов увесь план і не склав офіційний іспит? Напиши нам — це підстрахування завершення, а не гарантія результату.",
  trust: ["прогрес не зникає", "без автосписань", "одна ціна"],
  cta: "Почати безкоштовно",
};

// БАЗА + FAQ. Same array feeds FAQPage JSON-LD. Reserved calibration slot ships EMPTY of claims.
export const BASE = {
  kicker: "База",
  stats: [
    { value: STATS.bankCount, label: "офіційні питання" },
    { value: STATS.topics, label: "тем" },
    // Year rendered as a STRING so the page's number-formatter never groups it into «2 026».
    { value: String(STATS.year), label: "оновлено" },
  ],
  fresh: "база актуальна",
  reservedTitle: "Звіт калібрування",
  reservedTag: "поки порожньо — чесно",
  reserved:
    "Коли зберемо достатньо реальних результатів іспитів — тут стоятиме число: «Коли показник 90+ — складають …». Поки цифри немає, ми її не вигадуємо.",
};

export const FAQ = {
  heading: "Питання до методу",
  items: [
    {
      q: "Чи це офіційний іспит?",
      a: "Ні. Це навчальний інструмент для підготовки до теоретичного іспиту. Ми не проводимо офіційний іспит і не пов’язані з державними органами.",
    },
    {
      q: "Якщо шанси однакові, навіщо мені ви?",
      a: "Бо ні автошкола, ні самопідготовка не кажуть, коли ти справді готовий. Ми показуємо калібрований показник готовності — те, чого немає в жодної з двох доріг.",
    },
    {
      q: "Як рахується готовність?",
      a: "Каліброване P(скласти) за твоїми реальними відповідями через рушій FSRS. Знання згасає — тому показник може падати, доки ти не повториш матеріал. Це не % пройденого.",
    },
    {
      q: "Що таке FSRS?",
      a: "Названий рушій інтервального повторення. Він планує, коли повернути кожне питання — саме перед тим, як воно от-от згасне з пам’яті, — і стискає план під твою дату іспиту.",
    },
    {
      q: "Чому не підписка?",
      a: "Тобі потрібно скласти один іспит, а не платити щомісяця. Доступ до іспиту — разовий платіж, без автосписань і без прихованих продовжень.",
    },
    {
      q: "Що безкоштовно?",
      a: `Усі ${BANK_FMT} офіційні питання, пояснення, зображення й симулятор іспиту — безкоштовно назавжди. Платний лише шар інтелекту: деталі показника, FSRS-план, нагадування й аналітика помилок.`,
    },
    {
      q: "Звідки ви знаєте, що показник чесний?",
      a: "Він калібрується за реальними результатами: відрізняє здогад (25% при 4 варіантах) від упевненого знання. Коли зберемо достатньо результатів іспитів, покажемо звіт калібрування з реальним числом — не раніше.",
    },
    {
      q: "Чи зникне мій прогрес?",
      a: "Ні. Прогрес зберігається за твоїм акаунтом і не скидається платежем чи оновленням бази.",
    },
    {
      q: "Ви гарантуєте, що я складу?",
      a: "Ні — це не гарантія результату. Ми чесно показуємо готовність, а не обіцяємо оцінку. Складання залежить від тебе.",
    },
    {
      q: "Я щойно не склав. Що робити?",
      a: "Повертайся всередині періоду перескладання: постав нову дату, і план перебудується під найпровальніші для тебе теми.",
    },
    {
      q: "Скільки коштує і за що?",
      a: `${STATS.price} ₴ разово за доступ до іспиту: деталі показника готовності, FSRS-план, нагадування й аналітику помилок. Увесь контент — безкоштовний.`,
    },
  ],
};

// ФІНАЛ + mobile mode-launcher. Identical pill pair; closing line returns the metaphor.
export const FINAL = {
  headline: [{ t: "Якою дорогою ти б не їхав —" }, { t: "знай, коли ти готовий.", muted: true }] as Token[],
  sub: "Почни безкоштовно — показник з’явиться після твоїх перших відповідей.",
  ctaPrimary: "Почати безкоштовно",
  ctaSecondary: "Спробувати без реєстрації",
  modes: [
    { title: "Тренування", sub: "Офіційне питання без реєстрації", href: ANON_TRY_HREF },
    { title: "Симулятор іспиту", sub: "20 питань · 20 хвилин", href: "/register" },
    { title: "Мій план", sub: "FSRS до твоєї дати", href: "/register" },
  ],
};

// ФУТЕР — stencil wordmark on asphalt.
export const FOOTER = {
  wordmark: BRAND,
  tagline: "Тренер готовності, а не ще один збірник тестів.",
  columns: [
    {
      title: "Продукт",
      links: [
        { label: "Тренування", href: ANON_TRY_HREF },
        { label: "Симулятор іспиту", href: "/register" },
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
        { label: "Оновлені зображення", href: ANON_TRY_HREF },
      ],
    },
  ],
  disclaimer:
    "Drivers School — навчальний інструмент для підготовки до теоретичного іспиту. Ми не є офіційним іспитом і не пов’язані з державними органами. Складання офіційного іспиту залежить від вас.",
  updated: `оновлено ${STATS.year}`,
  copyright: `© ${STATS.year} Drivers School`,
};

export const NAV = {
  wordmark: BRAND,
  login: "Увійти",
  register: "Почати",
};
