// All visible copy for landing variant v25 — «Як це працює» (proof-first deep-dive).
// Ukrainian. Inherits the v14 «Пік форми» visual system (Tektur display / Manrope body /
// committed cobalt). The ARCHITECTURE differs: evidence first (proof band on screen 2), then a
// three-layer dissection of the mechanism (Дил → FSRS → Калібрування), each welded to a live demo.
// Hero headline/subhead are swappable A/B slots of fixed structure (2 lines each, one cobalt token,
// one-line subhead — layout must tolerate length swaps; CTA labels + proof chips NEVER vary).

export const BRAND = "Drivers School";

// Truthful anonymous-play entry: the public, no-auth, answerable official question page
// (app/q/[key]). q_15_10 = official question 15.10 — the SAME record (text + 3 options + correct key
// + restyled image) transcribed verbatim into the hero quiz below, so the ghost CTA lands on the
// exact question just answered, and its restyled image DEMONSTRATES the «Оновлені зображення» claim.
export const ANON_TRY_HREF = "/q/q_15_10";

// Numbers as constants (feed copy, meta, schema atomically — a bank revision or price-arm swap is a
// one-line bump).
export const STATS = {
  bankCount: 2322, // official questions — count-checked; single source
  topics: 65,
  firstTryPassPct: "21,5", // «1 з 5» — 21.5% first-attempt pass, 2026 YTD; Ukrainian decimal comma
  freeUsers: 900000, // state simulator «900 000+», re-confirmed 2026-07-16
  retakeFeeUAH: 250,
  price: 399,
  examQuestions: 20,
  examMinutes: 20,
  examMaxErrors: 2,
  examPassMin: 18, // ≥18/20
  planPool: 600, // core plan pool the FSRS demo schedules over (single source for the date-picker math)
  readiness: 71,
  guessBaseline: 25, // 1/4 options → 25% guess floor
  year: 2026,
};

type Token = { t: string; accent?: boolean };

// HERO — swappable A/B headline slots. Same line count (2), one cobalt token, similar char budget.
// This concept LEADS WITH THE DIAL, so A (default) = dial/readiness-first; B = plan/date-first.
export const HERO_VARIANTS = {
  A: {
    headline: [
      [{ t: "Не відсотки." }],
      [{ t: "Готовність", accent: true }, { t: "." }],
    ] as Token[][],
    subhead: "Один чесний показник: чи ти справді готовий скласти теорію з першої спроби.",
  },
  B: {
    headline: [
      [{ t: "Готуйся до " }, { t: "свого", accent: true }],
      [{ t: "дня іспиту." }],
    ] as Token[][],
    subhead: "План веде твою готовність угору — і вона піка́є саме в день, коли ти складаєш.",
  },
} as const;

export const HERO = {
  variant: "A" as keyof typeof HERO_VARIANTS,
  badge: "Як це працює",
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
  // Hero mechanic — ONE REAL official question (questionKey q_15_10; text + 3 options + correct key +
  // restyled imageKey copied verbatim from the bank/dev.db). Answered in-viewport, no network; a
  // form-curve tick registers. The restyled image (served by /api/q-image/<imageKey>) makes the
  // «Оновлені зображення» proof LAND on the page instead of being deferred to nowhere.
  quiz: {
    number: "15.10",
    label: "Одне питання. Без реєстрації.",
    imageKey: "15_10_0",
    question: "Чи дозволено водієві жовтого автомобіля зупинитися в цьому місці?",
    options: [
      { key: "a", text: "Дозволено тільки для посадки (висадки) пасажирів.", correct: false },
      { key: "b", text: "Дозволено.", correct: true },
      { key: "c", text: "Заборонено.", correct: false },
    ],
    correctNote: "Правильно. Перша точка кривої готовності — тут.",
    wrongNote: "Тут можна помилятися — це тренування, а не іспит.",
    meterLabel: "Готовність",
  },
};

// ДОКАЗИ — proof-first signature band (screen 2). Honest trio, display figures, muted labels.
export const PROOF = {
  heading: "Спершу цифри",
  lead: "Доступ до тестів — це ще не готовність. Ось із чого ми починаємо.",
  stats: [
    { key: "bank", value: STATS.bankCount, suffix: "", label: "офіційні питання — перевірено" },
    { key: "pass", value: 21.5, suffix: "%", label: "складають з першої — за даними 2026" },
    { key: "free", value: STATS.freeUsers, suffix: "+", label: "тренуються безкоштовно" },
  ],
  footnote:
    "900 тисяч тренуються на державному симуляторі — і 4 з 5 провалюють першу спробу. Питання не в доступі до тестів.",
};

// ШАР 1 — Дил: калібрована P(pass). Deep-dive pillar; the demo dial VISIBLY DECAYS.
export const LAYER1 = {
  no: "Шар 1",
  name: "Дил",
  sub: "калібрована ймовірність скласти",
  description:
    "Одна цифра замість сотні відсотків: каліброване P(скласти) за твоїми реальними відповідями. Знання без повторення згасає — і показник чесно падає, доки ти не повернешся у форму.",
  caption: "Це не % пройденого.",
  moat:
    "Жоден перевірений український сервіс не показує каліброваної ймовірності скласти. Ми показуємо — і не ховаємо цифру, коли вона падає.",
  metricLabel: "P(скласти)",
  engine: "FSRS · інтервальне повторення",
  toggleLabel: "Пропустив 3 дні",
  decayNote: "Без повторення форма спадає — цифра це визнає.",
  captionNote: "Цифра рухається лише за реальними відповідями.",
  scoreLabel: "шанс скласти",
};

// ШАР 2 — FSRS: план до твоєї дати. The engine named and shown; date picker welded in.
export const LAYER2 = {
  no: "Шар 2",
  name: "FSRS",
  sub: "план до твоєї дати",
  description:
    "FSRS — названий рушій інтервального повторення, той самий, що у сучасних тренажерах пам’яті. Постав дату іспиту — і план стискається під неї, повертаючи складне саме тоді, коли воно от-от згасне.",
  inputLabel: "Дата іспиту",
  planLabel: "План до іспиту",
  perDayLabel: "питань на день",
  daysLabel: "днів до піку",
  intensive: "Інтенсив — щільний графік до дати.",
  urgent: "Іспит зовсім скоро — режим інтенсиву.",
  calm: "Спокійний темп — час на пік є.",
  noDate: "Без дати теж працює — почни, а план вибудується пізніше.",
  note: "Ніяких таймерів і зворотного відліку. Лише твій графік виходу на пік.",
  invalid: "Обери майбутню дату — і план вибудується до неї.",
  topicsLabel: "Що план ставить у чергу найчастіше",
  topics: [
    "жести регулювальника",
    "нерегульовані перехрестя",
    "кільцеві розв’язки",
    "дорожня розмітка",
    "домедична допомога",
  ],
};

// ШАР 3 — Калібрування: звідки чесність. Guess/slip plainly; RESERVED slot ships EMPTY.
export const LAYER3 = {
  no: "Шар 3",
  name: "Калібрування",
  sub: "звідки береться чесність",
  description:
    "Показник вчиться на реальних відповідях: там, де 4 варіанти, чистий здогад дає 25%, тож ми відрізняємо «вгадав» від «знаю напевно» і уточнюємо цифру. З часом розкид відповідей сходиться в чесну лінію.",
  convergeCaption: "Розкид відповідей → одна калібрована лінія",
  guessLabel: "здогад — 25%",
  knowLabel: "знаю напевно",
  reservedTitle: "Звіт калібрування",
  reservedTag: "поки порожньо — чесно",
  reserved:
    "Коли зберемо достатньо реальних результатів іспитів — тут стоятиме число: «Коли показник 90+ — складають …». Поки цифри немає, ми її не вигадуємо.",
  reservedAxisY: "склали",
  reservedAxisX: "показник готовності",
};

// ПРОТОКОЛ — контрольний забіг (exam simulator promise).
export const SIMULATOR = {
  heading: "Контрольний забіг — точно як на іспиті",
  facts: [
    { big: "20", small: "питань" },
    { big: "20", small: "хвилин" },
    { big: "2", small: "помилки максимум" },
  ],
  body: "Третя помилка завершує іспит, ≥18/20 — склав. Ми відтворюємо алгоритм точно.",
  free: "Симулятор іспиту — повністю безкоштовний. Без переривань і блокувань.",
  ctaLabel: "як на іспиті",
};

// ІНТЕРЛЮДІЯ — ціна фальстарту (deep-ink full-bleed).
export const LOSS = {
  kicker: "Ціна фальстарту",
  line1: "Кожна спроба —",
  amount: "250 ₴",
  line2: "4 з 5 провалюють першу.",
  sub: "Це не таймер і не тиск. Просто цифра, повз яку веде спокійний план.",
  cta: "Побудувати план",
};

// ЦІНА — доступ до іспиту.
export const PRICING = {
  heading: "Одна ціна. Прив’язана до твого іспиту.",
  price: `${STATS.price} ₴`,
  once: "один раз",
  bind: "прив’язано до твого іспиту, а не до календаря",
  anchor: "Дешевше за одну провалену спробу.",
  freeTitle: "Безкоштовно назавжди",
  free: [
    `Усі ${STATS.bankCount} офіційні питання`,
    "Пояснення до кожного питання",
    "Оновлені зображення до питань",
    `Симулятор іспиту: ${STATS.examQuestions} питань · ${STATS.examMinutes} хв · ${STATS.examMaxErrors} помилки`,
    "Без реєстрації — почни одразу",
    "Прогрес зберігається за акаунтом",
  ],
  freeCta: "Спробувати без реєстрації",
  paidTitle: "Доступ до іспиту — 399 ₴",
  paid: [
    "Деталізація дилу готовності",
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

// FAQ — питання до методу (feeds FAQPage JSON-LD from the same array).
export const FAQ = {
  heading: "Питання до методу",
  items: [
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
      a: `Усі ${STATS.bankCount} офіційні питання, пояснення, зображення й симулятор іспиту — безкоштовно назавжди. Платний лише шар інтелекту: деталі показника, FSRS-план, нагадування й аналітика помилок.`,
    },
    {
      q: "Це офіційний іспит?",
      a: "Ні. Це навчальний інструмент для підготовки до теоретичного іспиту. Ми не проводимо офіційний іспит і не пов’язані з державними органами.",
    },
    {
      q: "Звідки ви знаєте, що показник чесний?",
      a: "Він калібрується за реальними результатами: ми відрізняємо здогад (25% при 4 варіантах) від впевненого знання. Коли зберемо достатньо результатів іспитів, покажемо звіт калібрування з реальним числом — не раніше.",
    },
    {
      q: "Чи зникне мій прогрес?",
      a: "Ні. Прогрес зберігається за твоїм акаунтом і не скидається платежем чи оновленням бази.",
    },
    {
      q: "Скільки коштує і за що?",
      a: "399 ₴ разово за доступ до іспиту: деталі показника готовності, FSRS-план, нагадування й аналітику помилок. Увесь контент — безкоштовний.",
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
      q: "Чи можна без реєстрації?",
      a: "Так. Спробуй питання й симулятор одразу. Акаунт потрібен лише щоб зберегти прогрес і план.",
    },
  ],
};

// ФІНАЛЬНИЙ CTA + mobile mode-launcher.
export const FINAL = {
  headline: [{ t: "Побач " }, { t: "чому", accent: true }, { t: " це працює." }] as Token[],
  sub: "Почни безкоштовно — показник з’явиться після твоїх перших відповідей.",
  ctaPrimary: "Почати безкоштовно",
  ctaSecondary: "Спробувати без реєстрації",
  modes: [
    { title: "Тренування", sub: "Офіційне питання без реєстрації", href: ANON_TRY_HREF },
    { title: "Симулятор іспиту", sub: "20 питань · 20 хвилин", href: "/register" },
    { title: "Мій план", sub: "FSRS до твоєї дати", href: "/register" },
  ],
};

// ФУТЕР
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
  updated: "оновлено 2026",
  copyright: `© ${STATS.year} Drivers School`,
};

export const NAV = {
  wordmark: BRAND,
  login: "Увійти",
  register: "Почати",
};
