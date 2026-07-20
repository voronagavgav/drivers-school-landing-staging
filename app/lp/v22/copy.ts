/* ================================================================== */
/*  Landing v22 — «Вечірня зміна» — product-led tour on «Опівночі».    */
/*  All visible copy Ukrainian. One module feeds page + metadata +     */
/*  JSON-LD. Every stat lives in STATS, printed from there.            */
/* ================================================================== */

export const ANON_TRY_HREF = "/q/q_1_1"; // genuinely registration-free single question
export const REGISTER_HREF = "/register";
export const LOGIN_HREF = "/login";

/* Numbers as constants — a bank revision is a one-line bump. */
export const STATS = {
  questions: "2322", // official bank (Order No. 225, 29.10.2025 — current Jul 2026)
  topics: "65",
  year: "2026",
  passRate: "1 з 5", // 21.5% first-attempt pass, 2026 YTD (official state statistics)
  failRate: "4 з 5", // inverse — share who fail the first attempt
  passPct: "21,5%",
  price: "399",
  priceCurrency: "₴",
  retake: "250", // ₴ per attempt
  examQuestions: "20",
  examMinutes: "20",
  examMistakes: "2",
  stateUsers: "900 000+", // free state simulator users (re-confirmed 2026-07-16)
} as const;

export const BRAND = {
  name: "Drivers School",
  tagline: "тренер готовності, а не ще один збірник тестів",
} as const;

export const NAV = {
  brand: BRAND.name,
  links: [
    { label: "Екскурсія", href: "#tour" },
    { label: "Як це працює", href: "#mechanism" },
    { label: "Ціна", href: "#pricing" },
    { label: "Питання", href: "#faq" },
  ],
  cta: { label: "Почати безкоштовно", href: REGISTER_HREF },
} as const;

/* -------- HERO — вечір, лампа, телефон --------------------------- */
/* Swappable A/B slots of fixed structure: same line counts, subhead
   capped at ONE line, chips + CTA labels never vary between variants. */
export const HERO = {
  scene: "Пізній вечір. Ти вдома, з телефоном.",
  // nbsp binds the em-dash to «ввечері» so it never orphans onto its own line
  headlineLines: ["Готуйся ввечері —", "складай уранці."],
  subhead: "Не ще один збірник тестів — тренер, що рахує твою готовність за реальними результатами.",
  hook: `Лише ${STATS.passRate} складає теорію з першої спроби — за даними ${STATS.year} року.`,
  tryHint: "Спробуй прямо тут. Без реєстрації, без мережі — просто відповідь.",
  primaryCta: { label: "Почати безкоштовно", href: REGISTER_HREF },
  secondaryCta: { label: "Спробувати без реєстрації", href: ANON_TRY_HREF },
  chips: [
    `${STATS.questions} офіційні питання`,
    `${STATS.topics} тем · оновлено ${STATS.year}`,
    "без реєстрації",
  ],
} as const;

export const HERO_VARIANTS = {
  A: {
    // plan / date-first promise
    headlineLines: ["Склади вчасно —", "за планом до іспиту."],
    subhead: "Персональний план повторень доводить тебе до дати іспиту готовим — крок за кроком.",
  },
  B: {
    // dial-first / quantified-readiness promise
    headlineLines: ["Не відсотки.", "Готовність."],
    subhead: "Живий показник P(склав) чесно рахує, чи ти справді готовий скласти з першої спроби.",
  },
} as const;

/* Hero interactive mechanic — ONE real official question, no network. */
export const HERO_Q = {
  screenName: "Тренування",
  label: "Питання з офіційної бази",
  question: "З якою максимальною швидкістю дозволено рух у населених пунктах?",
  options: [
    { text: "50 км/год", correct: true },
    { text: "60 км/год", correct: false },
    { text: "70 км/год", correct: false },
    { text: "80 км/год", correct: false },
  ],
  correctNote: "Правильно. У населених пунктах — 50 км/год.",
  wrongNote: "Майже. Правильна відповідь — 50 км/год. Тут можна помилятися — це тренування, а не іспит.",
  meterLabel: "Показник готовності",
  meterHint: "Твій показник почав рахуватися. На повну картину — ще кілька питань.",
} as const;

/* -------- TOUR intro (frames the three stops) ------------------- */
export const TOUR = {
  eyebrow: "Екскурсія трьома екранами",
  title: "Ми не розказуємо, який продукт. Ми показуємо — екран за екраном.",
  sub: "Три справжні поверхні, якими ти користуватимешся ввечері. Пройдись ними — і сам вирішиш.",
} as const;

/* -------- ЗУПИНКА 1 — Дил готовності ----------------------------- */
export const STOP1 = {
  index: "01",
  stopLabel: "Зупинка перша",
  screenName: "Готовність",
  caption: "Це не % пройденого.",
  title: "Дил, який каже правду — і осідає.",
  body: "Калібрований P(склав) на основі офіційних 10 / 4 / 4 / 2 страт, з поправкою на здогад і випадкову помилку. Росте, коли вчиш, і чесно осідає, коли забуваєш — бо готовність не зберігається сама.",
  moat: "Жоден перевірений український сервіс не показує калібрований показник готовності чи названий рушій інтервальних повторень. Ми показуємо.",
  engine: "Рушій повторень: FSRS",
  dialLabel: "P(склав)",
  dialSub: "демо · оновлено щойно",
  dialCaption: "готовність",
  decayNote: "Дивись: без повторень показник осідає. Це чесно.",
  factChip: "Калібрований показник — не відсоток пройденого",
} as const;

/* -------- ЗУПИНКА 2 — План до дати ------------------------------- */
export const STOP2 = {
  index: "02",
  stopLabel: "Зупинка друга",
  screenName: "Мій план",
  title: "План, що стискається під твою дату.",
  sub: "Обери дату іспиту — і побач, як план ущільнюється саме під твій строк.",
  inputLabel: "Дата іспиту",
  fallback: "Ще не знаєш дату? Постав орієнтовну — план перерахується, щойно вона зʼявиться.",
  perDayWord: "питань/день",
  daysWord: "днів до іспиту",
  intensive: "Інтенсив: часу мало — план ущільнюється, фокус на найпровальніших темах.",
  topics: "Фокус на найпровальніших темах: жести регулювальника, нерегульовані перехрестя, кільцеві розвʼязки, розмітка, домедична допомога.",
  cta: { label: "Скласти мій план", href: REGISTER_HREF },
  totalQuestions: 2322,
  factChip: "Прив'язано до твоєї дати, а не до календарного вікна",
} as const;

/* -------- ЗУПИНКА 3 — Симулятор ---------------------------------- */
export const STOP3 = {
  index: "03",
  stopLabel: "Зупинка третя",
  screenName: "Симулятор іспиту",
  title: "Репетиція іспиту — точно як на державному.",
  sub: "Той самий алгоритм, ті самі правила. І це найгучніше — безкоштовно.",
  free: "Симулятор — безкоштовно.",
  freeSub: "Усі питання, пояснення й зображення теж. Платиш лише за інтелект.",
  facts: [
    { big: STATS.examQuestions, label: "питань" },
    { big: STATS.examMinutes, label: "хвилин" },
    { big: STATS.examMistakes, label: "помилки максимум" },
  ],
  rules: ["Третя помилка завершує іспит", "≥ 18 з 20 — склав", "Теорія дійсна 1 рік"],
  // static preview screen (not interactive — the free CTA opens the real thing)
  // text-only rule question so the preview stays self-evidently real without a
  // picture (a gesture/sign question rendered image-less reads as a mockup)
  screen: {
    timer: "18:24",
    counter: "Питання 4 / 20",
    errors: "0 / 2 помилки",
    question: "Чи дозволено обгін безпосередньо перед пішохідним переходом?",
    options: [
      { text: "Так, за відсутності пішоходів", pick: "a" },
      { text: "Ні, обгін заборонено", pick: "b" },
      { text: "Лише на дозвільний сигнал світлофора", pick: "c" },
    ],
  },
  factChip: "20 питань · 20 хвилин · 2 помилки — як на іспиті",
  // simulator is free but is reached only after a (free) account — route to
  // /register, never label a single-question page «симулятор»
  cta: { label: "Відкрити безкоштовно", href: REGISTER_HREF },
} as const;

/* -------- МЕХАНІЗМ — як три екрани пов'язані --------------------- */
export const MECHANISM = {
  eyebrow: "Тепер, коли ти бачив усі три екрани",
  title: "Ось рушій, що звʼязує їх у одне.",
  sub: "Уся категорія каже «розумно» й не пояснює як. Ми називаємо все прямо.",
  steps: [
    {
      n: "01",
      title: "Відповідаєш на офіційні питання",
      body: "Уся офіційна база — безкоштовно, з поясненнями та перемальованими зображеннями.",
    },
    {
      n: "02",
      title: "FSRS планує повторення до дати",
      body: "Рушій інтервальних повторень FSRS розкладає, що і коли повторити, щоб дійти готовим саме до твого іспиту.",
    },
    {
      n: "03",
      title: "Дил калібрується за результатами",
      body: "P(склав) рахується з твоїх реальних відповідей — не з відсотка пройденого, не з прописаної обіцянки.",
    },
  ],
} as const;

/* -------- ІНТЕРЛЮДІЯ — 250 ₴ (lights-out band before pricing) --- */
const NBSP = " ";
export const LOSS = {
  // two sentences → two lines; nbsp keeps «250 ₴» and «4 з 5» from splitting mid-stat
  lead: `Кожна спроба — ${STATS.retake}${NBSP}₴.`,
  stat: `${STATS.failRate.replace(/ /g, NBSP)} провалюють першу.`,
  sub: "Спокійний спосіб не платити двічі — знати, що ти готовий, ще до того, як прийдеш.",
  cta: { label: "Підготуватися спокійно", href: REGISTER_HREF },
} as const;

/* -------- ЦІНА — доступ до іспиту -------------------------------- */
export const PRICING = {
  eyebrow: "Одна ціна. Під лампою, без дрібного шрифту.",
  title: "Доступ до іспиту.",
  sub: "Усе, чим ти щойно скористався, лишається безкоштовним. Платиш лише за інтелект.",
  price: STATS.price,
  currency: STATS.priceCurrency,
  priceFrame: "разово — доступ до іспиту",
  anchor: "Дешевше за одну провалену спробу. У 6–20× дешевше за теорію в автошколі.",
  negations: ["Не підписка", "Без автосписань", "Одна ціна"],
  freeTitle: "Безкоштовно назавжди",
  freeItems: [
    `Усі ${STATS.questions} офіційні питання`,
    "Пояснення до кожного питання",
    "Перемальовані зображення",
    "Симулятор іспиту 20 / 20 / 2",
    "Тренування за темами",
  ],
  paidTitle: "Доступ до іспиту — 399 ₴",
  paidItems: [
    "Деталізація каліброваного дилу готовності",
    "FSRS-план до твоєї дати",
    "Розумні нагадування про повторення",
    "Аналітика помилок за темами",
  ],
  clarify: "Прив'язано до твого іспиту, а не до календаря.",
  // completion-tied fail-safe — remedy is FREE ACCESS TO THE NEXT ATTEMPT, never
  // money-back (money-back-if-you-fail is banned). Exact wording PENDS the L1 lawyer
  // consult; «не гарантія» stays on the same source line for the grep gate.
  failsafe:
    "Пройдеш увесь план до кінця і все одно не складеш офіційний іспит — доступ безкоштовно до наступної спроби. Це страховка старанності, а не гарантія результату.",
  trustBand: ["прогрес не зникає", "без автосписань", "одна ціна"],
  cta: { label: "Почати безкоштовно", href: REGISTER_HREF },
  note: "Оплата на сайті. Ніяких прихованих списань, ніяких «вікон доступу».",
} as const;

/* -------- БАЗА + чесність ---------------------------------------- */
export const BASE = {
  title: "База, яку видно наскрізь.",
  sub: "Жодних вигаданих цифр. Тільки те, що можна перевірити.",
  facts: [
    { big: STATS.questions, label: "офіційні питання" },
    { big: STATS.topics, label: "тем" },
    { big: STATS.year, label: "актуальна база" },
  ],
  freshBadge: "База актуальна",
  freshNote: "Питання ґрунтуються на офіційній базі тестових питань. Стабільні ключі зберігають твій прогрес навіть під час оновлень бази.",
  permission: "Тут можна помилятися — це тренування, а не іспит.",
  retaker: "Не склав? Ти в найкращому моменті, щоб підготуватися точно — постав дату перескладання, і план ущільниться під неї.",
  calibTitle: "Звіт калібрування",
  calibReserved:
    "Коли дил каже 90+, скільки насправді складає? Опублікуємо, щойно зʼявляться реальні дані іспитів. Досі — жодної вигаданої цифри.",
} as const;

/* -------- FAQ (11 items) — feeds FAQPage JSON-LD ---------------- */
export const FAQ = {
  title: "Питання і відповіді",
  sub: "Чесно, без дрібного шрифту.",
  items: [
    {
      q: "Чому не підписка?",
      a: "Тому що іспит — разова подія, а не звичка. 399 ₴ — це один платіж за доступ до іспиту, прив'язаний до твоєї дати. Не підписка, без автосписань, без «вікон доступу», що згорають.",
    },
    {
      q: "Що саме безкоштовно?",
      a: `Усі ${STATS.questions} офіційні питання, пояснення, перемальовані зображення й симулятор іспиту — безкоштовно назавжди. Ми ніколи не ховаємо питання чи відповіді за оплатою.`,
    },
    {
      q: "А за що тоді 399 ₴?",
      a: "Лише за інтелект: деталізацію каліброваного дилу готовності, FSRS-план до твоєї дати, розумні нагадування та аналітику помилок. Контент від цього не залежить — він вільний.",
    },
    {
      q: "Це офіційний іспит?",
      a: "Ні. Це навчальна платформа для підготовки. Вона не інтегрована з державними екзаменаційними системами, не дає права скласти державний іспит у застосунку й не замінює обов'язкові практичні заняття.",
    },
    {
      q: "Як рахується готовність?",
      a: "Дил P(склав) рахується з твоїх реальних відповідей на офіційних 10 / 4 / 4 / 2 стратах, з поправкою на здогад і випадкову помилку. Це не відсоток пройденого — і він може падати, коли ти забуваєш.",
    },
    {
      q: "Чому дил іноді падає?",
      a: "Бо готовність не зберігається сама. Без повторень пам'ять осідає — і чесний дил осідає разом із нею. Це поведінка, а не помилка.",
    },
    {
      q: "Мій прогрес не зникне?",
      a: "Ні. Прогрес прив'язаний до стабільних ключів питань, тож він переживає навіть оновлення офіційної бази.",
    },
    {
      q: "Чи обіцяєте, що я точно складу?",
      // completion-tied remedy = free access to the next attempt (never money-back); wording pends L1
      a: "Ні, ми не гарантуємо результату — це було б нечесно. Є лише страховка старанності: пройдеш весь план і все одно не складеш офіційний іспит — доступ безкоштовно до наступної спроби.",
    },
    {
      q: "Я щойно не склав. Що робити?",
      a: "Ти в найкращому моменті, щоб підготуватися точно: постав дату перескладання, і план ущільниться під неї, з фокусом на темах, де ти помилявся.",
    },
    {
      q: "Чим ви кращі за безкоштовний державний тренажер?",
      a: `${STATS.stateUsers} тренуються безкоштовно — і ${STATS.failRate} провалюють першу спробу. Питання не в доступі до тестів, а в готовності. Ми показуємо, чи ти справді готовий.`,
    },
    {
      q: "Як платити?",
      a: "Оплата на сайті, одним платежем. Без Apple-націнки, без прихованих списань.",
    },
  ],
} as const;

/* -------- РЕЖИМИ + фінальний CTA (tour stops → three doors) ------ */
export const FINAL = {
  eyebrow: "Ти пройшов усі три екрани",
  title: "Тепер обери двері.",
  sub: "Кожна зупинка екскурсії — це вхід. Ступай у ту, по яку прийшов.",
  primaryCta: { label: "Почати безкоштовно", href: REGISTER_HREF },
  secondaryCta: { label: "Спробувати без реєстрації", href: ANON_TRY_HREF },
  launcherTitle: "Три двері",
  // Honest destinations: only the single-question door is genuinely anon-reachable
  // (/q/…); «Симулятор іспиту» + «Мій план» open after a free account (/register).
  launcher: [
    { label: "Спробувати питання", sub: "Офіційне питання — без реєстрації", href: ANON_TRY_HREF },
    { label: "Симулятор іспиту", sub: "20 питань · 20 хвилин · 2 помилки", href: REGISTER_HREF },
    { label: "Мій план", sub: "FSRS до твоєї дати", href: REGISTER_HREF },
  ],
} as const;

/* -------- ФУТЕР -------------------------------------------------- */
export const FOOTER = {
  brand: BRAND.name,
  tagline: "Тренер готовності до теоретичного іспиту ПДР. Готуйся ввечері — складай уранці.",
  columns: [
    {
      title: "Навчання",
      // «Спробувати питання» is the only genuinely anon-reachable door (/q/…);
      // the rest open after a free account.
      links: [
        { label: "Спробувати питання", href: ANON_TRY_HREF },
        { label: "Симулятор іспиту", href: REGISTER_HREF },
        { label: "План до іспиту", href: REGISTER_HREF },
        { label: "Показник готовності", href: REGISTER_HREF },
      ],
    },
    {
      title: "Продукт",
      links: [
        { label: "Ціна", href: "#pricing" },
        { label: "Як це працює", href: "#mechanism" },
        { label: "Питання", href: "#faq" },
        { label: "Увійти", href: LOGIN_HREF },
      ],
    },
    // NOTE: a «Правове» column (Умови / Конфіденційність / Контакти) is intentionally
    // NOT rendered — no real /terms or /privacy pages are reachable yet, and placeholder
    // inert legal links on a payment-intent surface are worse than none. Re-add the column
    // once those pages ship (out of scope for the v22 landing directory).
  ],
  disclaimer:
    "Навчальна платформа для підготовки до теоретичної частини іспиту з ПДР. Це не офіційна екзаменаційна система: вона не інтегрована з державними екзаменаційними системами, не дає права скласти державний іспит у застосунку й не гарантує складання іспиту. Питання ґрунтуються на офіційній базі тестових питань; можливі похибки опрацювання — звіряйтеся з офіційним джерелом.",
  copyright: `© ${STATS.year} ${BRAND.name}`,
} as const;
