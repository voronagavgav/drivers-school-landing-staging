// All visible copy for landing variant v16 — «Один із п'яти» (data-story on the «Табло» split-flap board).
// Ukrainian. Hero headline slot is a swappable A/B slot of fixed structure (same line count, similar budget).
// Copy-gate discipline: «підписк» only in negated forms («не »/«без » in the same phrase); «гаранті» forms
// always carry «не » on the SAME source line; no scarcity / countdown / discount tokens anywhere.

export const BRAND = "Drivers School";

// Truthful registration-free entry: the public, no-auth, answerable official question page (app/q/[key]).
// A logged-out visitor answers a real official question — no login wall. Used by every
// «Спробувати без реєстрації» / free-content link. NEVER /login or /register.
export const ANON_TRY_HREF = "/q/q_1_1";

// Numbers as one source of truth — feed copy, meta and schema atomically.
export const STATS = {
  bankCount: 2322, // official questions — single source; verify vs 2321 before print
  topics: 65,
  firstTryPass: "21,5", // «1 з 5» — 21.5% first-attempt pass, 2026 YTD (official data)
  attempts: "70 000+",
  passed: "15 180",
  selfPrepPass: "21,2",
  autoschoolPass: "19,9",
  retakeFeeUAH: 250,
  price: 399,
  autoschoolPrice: "2 999–7 000",
  examQuestions: 20,
  examMinutes: 20,
  examMaxErrors: 2,
  examDate: "2026-09-04", // default exam date shown in the picker
  readiness: 71,
  year: 2026,
};

// Curated spaced-repetition volume the plan spreads over the days left (NOT the full 2322 bank);
// perDay is capped so a near date never demands an unrealistic number of questions per day.
export const PLAN_TARGET_QUESTIONS = 560;
export const PLAN_PER_DAY_CAP = 120;

// HERO — swappable A/B headline slot. Same line count (1), similar char budget, keyword-led for SEO.
// Variant A = plan/date-first. Variant B = dial/readiness-first. CTAs + chips identical across variants.
export const HERO_VARIANTS = {
  A: "Тести ПДР 2026: постав дату — і побач план саме до свого іспиту.",
  B: "Тести ПДР 2026: один показник чесно каже, коли ти готовий скласти.",
} as const;

export const COPY = {
  nav: {
    login: "Увійти",
    register: "Почати",
  },

  hero: {
    variant: "A" as keyof typeof HERO_VARIANTS,
    boardLabel: "ТАБЛО ГОТОВНОСТІ",
    boardStatus: "за офіційними даними · 2026",
    number: "21,5",
    unit: "%",
    ratio: "1 із 5",
    ratioNote: "за офіційними даними · 2026",
    caption: "стільки складають теорію з першої спроби — за даними 2026 року",
    chips: [
      `${STATS.bankCount} офіційних питань`,
      `${STATS.examQuestions} питань · ${STATS.examMinutes} хв · ${STATS.examMaxErrors} помилки`,
      "Усе безкоштовно",
    ],
    ctaPrimary: "Почати безкоштовно",
    ctaSecondary: "Спробувати без реєстрації",
    peek: "4 з 5 провалюють першу спробу",
  },

  // РОЗКЛАД ПРОВАЛІВ — the number decomposed into board rows
  decompose: {
    label: "РОЗКЛАД ПРОВАЛІВ",
    heading: "Розберемо цю цифру по рядках.",
    rows: [
      { value: "70 000+", label: "спроб скласти теорію", note: "2026" },
      { value: "15 180", label: "склали з першої спроби", note: "21,5%", accent: true },
    ],
    compare: {
      label: "хто складає краще",
      a: { value: "21,2", label: "самопідготовка" },
      b: { value: "19,9", label: "автошкола" },
      note: "Автошколи не випереджають самопідготовку. Справа не в тому, де ти вчишся.",
    },
    argument: "900 тисяч тренуються безкоштовно — і 4 з 5 провалюють.",
    punch: "Питання не в доступі до тестів. Він у всіх однаковий.",
  },

  // ПРИХОВАНА ЗМІННА — the readiness dial
  dial: {
    label: "ПРИХОВАНА ЗМІННА",
    heading: "Чого ті четверо з п'яти не бачили — власної готовності.",
    caption: "Це не % пройденого.",
    body: "Ми рахуємо каліброване P(скласти) за твоїми реальними відповідями. Знання без повторення згасає — і цифра чесно падає, доки ти не повернешся.",
    moat: "Жоден перевірений український сервіс не показує каліброваної ймовірності скласти й не називає рушій інтервального повторення. Ми показуємо.",
    decayLabel: "БЕЗ ПОВТОРЕННЯ ЦИФРА ПАДАЄ",
    engine: "FSRS — інтервальне повторення",
  },

  // А ТИ? — the them→you pivot, one real question inline
  you: {
    label: "А ТИ?",
    heading: "Статистика — про них. Це питання — про тебе.",
    quiz: {
      tag: "СПРОБУЙ ЗАРАЗ · БЕЗ РЕЄСТРАЦІЇ",
      badge: "ПДР",
      question:
        "Чи дозволено водієві розпочинати обгін, якщо транспортний засіб попереду вже подав сигнал повороту ліворуч?",
      options: [
        { key: "a", text: "Так, якщо зустрічна смуга вільна", correct: false },
        { key: "b", text: "Ні, обгін заборонено", correct: true },
        { key: "c", text: "Так, з увімкненою аварійною сигналізацією", correct: false },
      ],
      explainTitle: "Пояснення",
      explain:
        "Сигнал лівого повороту означає, що ТЗ попереду може почати маневр. Розпочинати обгін у цей момент заборонено — так само реагуватимеш і на іспиті.",
      correctNote: "Правильно. Перший рядок твоєї готовності — на місці.",
      wrongNote: "Тут можна помилятися — це тренування, а не іспит. Ось як міркувати:",
      meterLabel: "ТВОЯ ГОТОВНІСТЬ",
      idlePrompt: "Обери відповідь — показник почне рухатись.",
    },
    afterLine: "Ти щойно став точкою даних — своєю власною. Далі ця точка починає рухатись.",
    ctaPrimary: "Почати безкоштовно",
    ctaSecondary: "Спробувати без реєстрації",
  },

  // ТВІЙ РЕЙС — exam-date picker
  picker: {
    label: "ТВІЙ РЕЙС",
    heading: "Постав дату іспиту — дошка перегорне твій план.",
    inputLabel: "Дата іспиту",
    planLabel: "ПЛАН ДО ІСПИТУ",
    daysLabel: "днів до іспиту",
    perDayLabel: "питань на день",
    intensive: "Інтенсив — щільний графік до дати",
    urgent: "Іспит зовсім скоро — інтенсив",
    calm: "Спокійний темп — час є",
    noDate: "Без дати теж працює — почни, а план з'явиться пізніше.",
    note: "Ніяких таймерів і зворотного відліку. Лише твій план до дати.",
    topicsLabel: "Рейси, що найчастіше зривають — найпровальніші теми",
    topics: [
      "жести регулювальника",
      "нерегульовані перехрестя",
      "кільцеві розв'язки",
      "дорожня розмітка",
      "домедична допомога",
    ],
    retaker: "Щойно не склав? Постав нову дату — план перебудується під твої слабкі теми.",
  },

  // ІСПИТ У ЦИФРАХ — simulator promise
  sim: {
    label: "ІСПИТ У ЦИФРАХ",
    heading: "Симулятор точно як на іспиті. І безкоштовно.",
    facts: [
      { big: "20", small: "питань" },
      { big: "20", small: "хвилин" },
      { big: "2", small: "помилки максимум" },
      { big: "250", small: "₴ коштує кожна спроба", muted: true },
    ],
    body: "Третя помилка завершує іспит, ≥18/20 — склав, теорія дійсна рік. Ми відтворюємо алгоритм точно — без переривань і блокувань.",
    free: "Симулятор іспиту — повністю безкоштовний і без обмежень.",
  },

  // АРИФМЕТИКА — pricing
  pricing: {
    label: "АРИФМЕТИКА",
    heading: "Порахуй сам.",
    equation: [
      { value: `${STATS.price}`, unit: "₴", note: "один раз — доступ до іспиту", accent: true },
      { value: `${STATS.retakeFeeUAH}`, unit: "₴", note: "за кожну провалену спробу" },
      { value: STATS.autoschoolPrice, unit: "₴", note: "теорія в автошколі" },
    ],
    freeTitle: "Безкоштовно назавжди",
    free: [
      `Усі ${STATS.bankCount} офіційні питання`,
      "Пояснення до кожного питання",
      "Оновлені зображення",
      "Симулятор іспиту на час",
    ],
    paidTitle: "Доступ до іспиту",
    paidBadge: "разово",
    paid: [
      "Показник готовності в деталях",
      "FSRS-план до твоєї дати",
      "Калібровані нагадування",
      "Аналітика помилок",
    ],
    negations: ["Не підписка", "Без автосписань", "Один платіж"],
    anchor: "Дешевше за одну провалену спробу.",
    priceNote: "Разовий платіж, прив'язаний до твого іспиту — не підписка й без прихованих продовжень.",
    failsafe:
      "Пройшов увесь план і не склав офіційний іспит? Напиши нам — це підстрахування завершення, а не гарантія результату.",
    trust: "прогрес не зникає · без автосписань · одна ціна",
    cta: "Почати безкоштовно",
  },

  // ДЖЕРЕЛА — honest proof + FAQ
  sources: {
    label: "ДЖЕРЕЛА",
    heading: "Чесні цифри й чесні відповіді.",
    stats: [
      { big: "2322", small: "офіційні питання" },
      { big: "65", small: "тем" },
      { big: "2026", small: "оновлено" },
    ],
    fresh: "База актуальна",
    reserved:
      "Коли з'явиться достатньо реальних результатів, тут буде звіт калібрування: «Коли показник 90+ — складають …». Поки цифр немає — не вигадуємо їх.",
    faqHeading: "Питання й відповіді",
    faq: [
      {
        q: "Чому не підписка?",
        a: "Тобі потрібно скласти один іспит, а не платити щомісяця. Доступ до іспиту — разовий платіж, без автосписань і без прихованих продовжень.",
      },
      {
        q: "Що безкоштовно?",
        a: "Усі 2322 офіційні питання, пояснення, зображення й симулятор іспиту — безкоштовно назавжди. Платний лише шар інтелекту: показник готовності та план до дати.",
      },
      {
        q: "Скільки коштує перескладання іспиту ПДР?",
        a: "Кожна спроба офіційного іспиту коштує 250 ₴ і забирає час на очікування. Тому доступ до іспиту за 399 ₴ дешевший за одну провалену спробу.",
      },
      {
        q: "Це офіційний іспит?",
        a: "Ні. Це навчальний інструмент для підготовки до теоретичного іспиту. Ми не проводимо офіційний іспит і не пов'язані з державними органами.",
      },
      {
        q: "Як рахується готовність?",
        a: "Каліброване P(скласти) за твоїми реальними відповідями. Знання згасає — тому показник може падати, доки ти не повториш матеріал. Він чесний, а не оптимістичний.",
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
        a: "Повертайся й постав нову дату — план перебудується під найпровальніші для тебе теми. Найкращий момент, щоб вирівняти слабкі місця, — одразу після спроби.",
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
  },

  // ФІНАЛ + FOOTER
  final: {
    heading: "Один із п'яти складає з першої. Дізнайся, коли будеш готовий ти.",
    sub: "Почни безкоштовно — план і показник з'являться, щойно почнеш.",
    ctaPrimary: "Почати безкоштовно",
    ctaSecondary: "Спробувати без реєстрації",
    modesLabel: "Почни прямо звідси",
    modes: [
      { title: "Тренування", sub: "Офіційні питання за темами", href: ANON_TRY_HREF },
      { title: "Спробуй питання", sub: "Одне офіційне · без реєстрації", href: ANON_TRY_HREF },
      { title: "Мій план", sub: "FSRS до твоєї дати", href: "/register" },
    ],
  },

  footer: {
    wordmark: BRAND,
    tagline: "Тренер готовності, а не ще один збірник тестів.",
    columns: [
      {
        title: "Продукт",
        links: [
          { label: "Тренування", href: ANON_TRY_HREF },
          { label: "Спробувати питання", href: ANON_TRY_HREF },
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
          { label: "Оновлення бази", href: "/register" },
        ],
      },
    ],
    contactLabel: "Напишіть нам",
    contactEmail: "hello@drivers.school",
    disclaimer:
      "Drivers School — навчальний інструмент для підготовки до теоретичного іспиту. Ми не проводимо офіційний іспит і не пов'язані з державними органами. Складання офіційного іспиту залежить від вас.",
    copyright: `© ${STATS.year} Drivers School`,
  },
};
