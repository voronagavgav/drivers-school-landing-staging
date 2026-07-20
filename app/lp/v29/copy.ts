/* ═══════════════════════════════════════════════════════════════════════
   Landing variant v29 — «Скептику» — all visible copy (Ukrainian).
   Objection-led architecture: the page's spine is the skeptic's five
   questions, each answered by demonstrable product behavior. Visual system
   inherited from v7 «Світанок» (dawn sky, Onest, single terracotta accent),
   restaged as a trust arc that lightens from pre-dawn violet to full morning.

   One exported const. Every number lives in N so a bank revision or price
   swap is a one-line bump feeding copy, <title>, meta and JSON-LD atomically.
   Hero headline/subhead are SWAPPABLE slots for a later JTBD A/B; both
   variants share line-count / char budget so the layout never shifts.
   ═══════════════════════════════════════════════════════════════════════ */

/* Single source of truth for every printed number (count-checked 2026). */
export const N = {
  bank: 2322,
  topics: 65,
  categories: 8,
  price: 399,
  priceUnit: "разово",
  currency: "₴",
  year: 2026,
  examQ: 20,
  examMin: 20,
  examErr: 2,
  examPass: 18,
  retakeUAH: 250,
  firstTry: "1 з 5",
  firstTryPct: "21,5%",
  fail: "4 з 5",
  freeUsers: "900 тисяч",
} as const;

export const HERO_VARIANTS = {
  // A — quantified-readiness promise (dial-first). ACTIVE per art direction:
  // lead with the dial sooner rather than later (the window is narrowing).
  A: {
    headline: "Готовність,\nяку видно.",
    subhead: "Не відсотки пройденого — калібрована ймовірність, що ти складеш.",
  },
  // B — plan-first promise. Same structure: 2 headline lines + 1 subhead line.
  B: {
    headline: "План до іспиту.\nДень за днем.",
    subhead: "Кожен день — рівно стільки питань, скільки треба, щоб устигнути.",
  },
} as const;

export type HeroVariantKey = keyof typeof HERO_VARIANTS;
export const ACTIVE_HERO: HeroVariantKey = "A";

export const copy = {
  nav: {
    brand: "Drivers School",
    links: [
      { label: "Питання", href: "#q-free" },
      { label: "Готовність", href: "#q-dial" },
      { label: "Ціна", href: "#q-price" },
    ],
    cta: "Почати",
  },

  hero: {
    // hook sits as one quiet ink line under the CTAs — typography, not a badge
    hook: `Лише ${N.firstTry} складає теорію з першої спроби — за даними ${N.year} року.`,
    ctaPrimary: "Почати безкоштовно",
    ctaSecondary: "Спробувати без реєстрації",
    chips: [`${N.bank} офіційні питання`, `${N.topics} тем`, `${N.examQ} / ${N.examMin} / ${N.examErr}`],
    cardLabel: "Одне справжнє питання — без реєстрації",
    // the architecture contract line at the fold edge — the scroll invitation
    contract: "Далі — п’ять питань, які ти й так собі ставиш.",
  },

  // Hero interactive question (one real, unambiguous official-style question,
  // answered right in the first viewport — no signup, no network).
  demoQuestion: {
    prompt: "Що означає червоний сигнал світлофора?",
    options: [
      { text: "Рух дозволено з підвищеною увагою", correct: false },
      { text: "Рух заборонено", correct: true },
      { text: "Приготуйтеся розпочати рух", correct: false },
      { text: "Перевага в русі за вашим напрямком", correct: false },
    ],
    explanationCorrect:
      "Правильно. Червоний сигнал забороняє рух — зупинись перед стоп-лінією.",
    explanationWrong:
      "Ні. Червоний сигнал забороняє рух. Правильна відповідь підсвічена.",
    meterLabel: "Готовність",
    meterTag: "демо",
    meterHintStart: "Дай відповідь — і побачиш, як починає рахуватися готовність.",
    // honesty: n=1 is NOT a calibrated readiness %. Show the movement, name the calibration threshold.
    meterNote: "1-ша відповідь врахована — дил калібрується приблизно з 20 відповідей.",
  },

  /* ── Q1 · «Що тут безкоштовно?» — Усе. ──────────────────────────── */
  free: {
    question: "Що тут безкоштовно?",
    answer: "Усе.",
    // one-line answer lede
    lede: "Усе, що конкуренти продають, тут безкоштовне назавжди. Доступ до тестів ніколи не був проблемою.",
    items: [
      { k: `Усі ${N.bank}`, v: "офіційні питання" },
      { k: "Пояснення", v: "до кожного питання" },
      { k: "Зображення", v: "перемальовані, чіткі" },
      { k: "Симулятор", v: `${N.examQ} / ${N.examMin} / ${N.examErr}, на час` },
    ],
    simTitle: "Симулятор іспиту — теж безкоштовно",
    simChips: [
      { k: String(N.examQ), v: "питань" },
      { k: String(N.examMin), v: "хвилин" },
      { k: String(N.examErr), v: "помилки — межа" },
    ],
    simNote: `Точно як на іспиті: ${N.examPass} із ${N.examQ} — склав, третя помилка завершує спробу.`,
    // Q1 answer-by-demonstration: a real restyled official image inside the free tier as evidence of free quality.
    imgAlt: "Приклад перемальованого офіційного зображення: обгін на дорозі з розміткою.",
    imgCaption: "Так виглядає перемальоване офіційне зображення — чітко й без артефактів. Безкоштовно, як і решта.",
    // legally clean anti-state-competitor line
    stateLine: `${N.freeUsers} тренуються безкоштовно — і ${N.fail} провалюють першу спробу. Питання не в доступі до тестів.`,
  },

  /* ── Q2 · «Звідки ви знаєте, що я готовий?» — Дил, який вміє падати. */
  dial: {
    question: "Звідки ви знаєте, що я готовий?",
    answer: "Дил, який вміє падати.",
    lede: "Число, яке відповідає на «чи я справді готовий?» — і чесно осідає, коли ти давно не повторював.",
    caption: "Це не % пройденого.",
    body:
      "Дил показує калібровану ймовірність скласти — P(pass). Він росте з реальними відповідями і падає без повторення. Чесність — це поведінка продукту, а не заголовок.",
    // UA-scoped moat line — never worldwide
    moat:
      "Жоден перевірений український сервіс не показує калібровану ймовірність складання.",
    decayCaption: "Без повторення готовність осідає — і ти це бачиш заздалегідь.",
    dialTag: "жива демонстрація",
    // the MECHANISM — a real 3-step sequence, so numbers are earned
    mechTitle: "Як це працює — простими словами",
    steps: [
      { n: "01", t: "Відповідаєш", d: "на офіційні питання — по одному." },
      { n: "02", t: "FSRS планує", d: "повторення до дати твого іспиту." },
      { n: "03", t: "Дил калібрується", d: "за твоїми реальними результатами." },
    ],
  },

  /* ── Q3 · «Чому не підписка?» — Бо іспит має дату. ──────────────── */
  plan: {
    question: "Чому не підписка?",
    answer: "Бо іспит має дату.",
    lede: "Підготовка закінчується в один день. Регулярне списання не відповідає цій задачі — ти платиш за готовність, а не за календар.",
    inputLabel: "Коли твій іспит?",
    fallback: "Обери дату — і побачиш свій щоденний темп до неї.",
    today: "Іспит сьогодні — повтори найпровальніші теми.",
    past: "Ця дата вже минула — обери майбутній день.",
    daysUnit: "днів до іспиту",
    perDayUnit: "питань/день",
    intensive: "Інтенсив",
    intensiveNote: "менше тижня — більше питань щодня.",
    frameA: "Доступ до іспиту.",
    frameB: "Прив’язано до твого іспиту, а не до календаря.",
    focusNote:
      "Спершу — найпровальніші теми: жести регулювальника, нерегульовані перехрестя, кільцеві розв’язки, розмітка, домедична допомога.",
    cta: "Побудувати мій план",
  },

  /* ── Q4 · «Скільки це коштує насправді?» — 399 ₴. Один раз. ──────── */
  price: {
    question: "Скільки це коштує насправді?",
    answer: `${N.price} ${N.currency}. Один раз.`,
    lede: "Спершу — чесна математика. Провалена спроба коштує грошей і часу; ця ціна — менша за неї.",
    // loss frame as the honest math opener
    lossA: `Кожна спроба — ${N.retakeUAH} ${N.currency}.`,
    lossB: `${N.fail} провалюють першу.`,
    lossC: "Дешевше за одну провалену спробу.",
    priceName: "Доступ до іспиту",
    priceBig: `${N.price}`,
    priceCur: N.currency,
    priceUnit: `${N.priceUnit} · один платіж`,
    negation: "Не підписка. Без автосписань.",
    freeTitle: "Безкоштовно назавжди",
    free: [
      `Усі ${N.bank} офіційні питання`,
      "Пояснення до кожного питання",
      "Перемальовані зображення",
      "Симулятор іспиту на час",
    ],
    paidTitle: "У «доступі до іспиту»",
    paid: [
      "Детальний дил готовності",
      "FSRS-план до твоєї дати",
      "Калібровані нагадування повторити",
      "Аналітика твоїх помилок",
    ],
    trust: ["прогрес не зникає", "без автосписань", "одна ціна"],
    cta: "Почати безкоштовно",
    ctaNote: "Оплата — лише коли сам вирішиш. Спершу все безкоштовне.",
  },

  /* ── Q5 · «А якщо я не складу?» — Чесна відповідь. ──────────────── */
  failsafe: {
    question: "А якщо я не складу?",
    answer: "Чесна відповідь.",
    lede: "Ми не обіцяємо, що ти складеш — ніхто чесний цього не обіцяє. Але ми не кидаємо на пів дороги.",
    // completion-tied, NEVER pass-tied. Conditions in one honest sentence.
    body:
      "Пройшов увесь план, але не склав офіційний іспит? Доступ лишається безкоштовним до наступної спроби. Ми не гарантуємо результат — ми доводимо підготовку до кінця.",
    retaker: "Не склав цього разу? Повертайся — план перебудується під нову дату, а прогрес нікуди не зник.",
  },

  /* ── БАЗА — і докази (module grammar drops here) ─────────────────── */
  proof: {
    heading: "База — і докази",
    badge: `Актуально · оновлено ${N.year}`,
    stats: [
      { k: String(N.bank), v: "офіційні питання" },
      { k: String(N.topics), v: "тем" },
      { k: String(N.categories), v: "категорій" },
    ],
    note:
      "На основі офіційної бази тестових питань з теорії ПДР. Стабільний імпорт зберігає твій прогрес навіть коли базу оновлюють.",
    // reserved calibration-report container — ships EMPTY of claims
    reservedTitle: "Звіт про калібрування",
    reserved:
      "Коли назбирається достатньо реальних результатів складання, тут з’явиться чесна цифра: як часто складають ті, кому дил показав високу готовність. До того — жодних вигаданих відсотків.",
  },

  /* ── FAQ — решта питань (module grammar drops here) ──────────────── */
  faq: {
    heading: "Решта питань",
    lede: "П’ять великих питань позаду. Ось коротко про все інше.",
    items: [
      {
        q: "Це офіційний іспит?",
        a: "Ні. Це навчальна платформа для підготовки. Вона не інтегрована з державними системами й не дає права скласти державний іспит у застосунку.",
      },
      {
        q: "Що саме безкоштовно назавжди?",
        a: `Усі ${N.bank} офіційні питання, пояснення, зображення й симулятор іспиту на час. Платний лише шар аналітики: дил, FSRS-план, нагадування та розбір помилок.`,
      },
      {
        q: "Як рахується готовність?",
        a: "Дил оцінює калібровану ймовірність скласти за твоїми реальними відповідями. Під ним працює названий рушій інтервального повторення FSRS. Число може й падати — це чесно.",
      },
      {
        q: "Мій прогрес не зникне?",
        a: "Ні. Прогрес прив’язаний до твого акаунта й переживає оновлення бази. Жодних автосписань і жодних прихованих поновлень.",
      },
    ],
  },

  /* ── ФІНАЛ — ранок (full morning) ────────────────────────────────── */
  finalCta: {
    heading: "П’ять питань. П’ять чесних відповідей.",
    sub: "Тепер — почни з одного питання. Безкоштовно, без реєстрації.",
    ctaPrimary: "Почати безкоштовно",
    ctaSecondary: "Спробувати без реєстрації",
    modesTitle: "Одразу до діла",
    modes: [
      { label: "Тренування за темами", href: "/register" },
      { label: "Симулятор іспиту", href: "/register" },
      { label: "Мій план до іспиту", href: "/register" },
    ],
  },

  /* ── FOOTER — при повному світлі ─────────────────────────────────── */
  footer: {
    ghost: "Готовність",
    brand: "Drivers School",
    tagline: "Тренер готовності до теорії ПДР.",
    columns: [
      {
        title: "Продукт",
        links: [
          { label: "Тренування", href: "/register" },
          { label: "Симулятор", href: "/register" },
          { label: "План до іспиту", href: "/register" },
          { label: "Ціна", href: "#q-price" },
        ],
      },
      {
        title: "Акаунт",
        links: [
          { label: "Почати", href: "/register" },
          { label: "Увійти", href: "/login" },
        ],
      },
      {
        title: "Правове",
        links: [
          { label: "Умови", href: "#v29-legal" },
          { label: "Конфіденційність", href: "#v29-legal" },
        ],
      },
    ],
    disclaimer:
      "Навчальна платформа для підготовки до теоретичної частини іспиту з ПДР. Це не офіційна екзаменаційна система: вона не замінює обов’язкові заняття, не дає права скласти державний іспит у застосунку, не інтегрована з державними системами і не гарантує складання іспиту. Питання ґрунтуються на офіційній базі тестових питань з теорії ПДР; можливі похибки опрацювання — звіряйтеся з офіційним джерелом.",
    copyright: `© ${N.year} Drivers School. Для тих, хто складає з першого разу.`,
  },
} as const;
