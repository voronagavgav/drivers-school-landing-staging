// ─────────────────────────────────────────────────────────────────────────────
// Landing v35 — «Школа Radiant»
// A premium-gradient SaaS-polish consumer landing. Replicates the Radiant anatomy
// (nav · gradient hero · quiet proof row · light bento grid · dark inset bento
// band · photo-card carousel · 2-tier pricing · gradient CTA close · FAQ · footer)
// restyled entirely as our own craft: a COOL pastel gradient system (periwinkle ·
// violet · sky · mint), the Onest grotesk at tight display tracking, and bento
// cells that hold REAL product UI edge-to-edge. Deliberately distinct from v34's
// warm-terracotta Salient school.
//
// ALL numbers are REAL, extracted from prisma/dev.db NOW and hard-coded here
// (the landing is DB-free at runtime). Published + active + non-archived, cat B.
//   1757 — cat-B questions   ·  986 — of those with illustrations
//   45   — sections (distinct topics) covered by the cat-B bank
//   verified: SELECT COUNT(*) … JOIN _QuestionCategories qc ON qc.B=q.id
//             WHERE qc.A='<cat B id>' AND isPublished AND isActive AND archivedAt IS NULL
// Carousel scenes: verbatim Question.text + real Topic.title from dev.db, keyed to
// restyled-live/*.png files that exist on disk (7 keys, none shared with v34).
// ─────────────────────────────────────────────────────────────────────────────

export const YEAR = 2026;

export const BANK_B = 1757;
export const BANK_B_FMT = "1 757"; // thin-space grouping
export const IMG_COUNT = 986;
export const IMG_FMT = "986";
export const SECTIONS = 45;
export const PRICE = 399;

// The honest hook — first-try theory pass rate, 2026. Non-fear-mongering framing.
export const PASS_FIRST = "21,5%";

// Registration-free path — the anon single-question viewer (honours its promise:
// never /login, never /register).
export const ANON_TRY_HREF = "/q/q_1_1";

export const CTA = {
  free: { label: "Почати безкоштовно", href: "/register" },
  login: { label: "Увійти", href: "/login" },
  price: { label: "Подивитись ціну", href: "#pricing" },
  anon: { label: "Спробувати без реєстрації", href: ANON_TRY_HREF },
};

export const NAV = {
  links: [
    { label: "Можливості", href: "#features" },
    { label: "Питання", href: "#questions" },
    { label: "Ціна", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ],
};

export const COPY = {
  brand: "Drivers School",

  // ── HERO ──────────────────────────────────────────────────────────────────
  hero: {
    kicker: "Теоретичний іспит ПДР · Категорія B",
    // oversized 2-line display headline over the cool gradient wash
    head1: "Готовність до іспиту,",
    head2: "яку видно чесно.",
    sub: `З першої спроби теорію складають ${PASS_FIRST}. Ми не лякаємо статистикою й не обіцяємо диво — показуємо, що ти вже знаєш, а що варто повторити до дати іспиту. На ${BANK_B_FMT} офіційних питаннях категорії B з поясненням до кожного.`,
    // web-app law: no app-store buttons — browser language instead
    note: "Веб-застосунок — відкривається у браузері. Без картки, без встановлення.",
  },

  // ── PROOF ROW (quiet real numbers, replaces the logo cloud) ─────────────────
  proof: {
    lead: "Справжній банк, а не демо",
    stats: [
      { value: BANK_B_FMT, label: "офіційних питань\nкатегорії B" },
      { value: IMG_FMT, label: "питань\nз ілюстраціями" },
      { value: String(SECTIONS), label: "розділів\nу банку" },
      { value: String(YEAR), label: "актуальність\nбази" },
    ],
  },

  // ── BENTO GRID #1 (light) — real product UI edge-to-edge ─────────────────────
  // The FREE surfaces (mirrors the pricing split): training · readiness · map,
  // plus an anon-try panel. The intelligence layer lives in the dark band below.
  features: {
    h2: "Один застосунок — від першого питання до готовності",
    lead: "Тренуйся, звіряй готовність і бач прогрес по темах. Нижче — справжні екрани застосунку, без прикрас.",
    runner: {
      eyebrow: "Тренування",
      claim: "Офіційні питання з поясненням до кожного",
      body: "Ті самі питання, що на державному іспиті — з ілюстраціями та розбором. Помилятися тут можна: це тренування, а не іспит.",
      img: "/lp/v34-runner.png",
      alt: "Екран тренування: питання про стоянку автомобіля з ілюстрацією дороги та варіантами відповіді",
    },
    dial: {
      eyebrow: "Готовність",
      claim: "Чесний показник, а не відсоток пройденого",
      img: "/lp/v34-dial.png",
      alt: "Екран готовності до іспиту з чесним станом «ще недостатньо даних — дайте відповідь ще на 20 питань»",
    },
    map: {
      eyebrow: "Прогрес",
      claim: "Карта тем — найслабші вгорі",
      img: "/lp/v34-progress.png",
      alt: "Екран «Карта тем»: теми категорії за рівнем засвоєння, найслабші вгорі",
    },
    side: {
      eyebrow: "Спробуй зараз",
      claim: "Перше офіційне питання — без реєстрації",
      body: "Відкрий питання й відповідай прямо зараз. Без картки, без акаунта — просто щоб побачити, як воно.",
      cta: "Спробувати без реєстрації",
    },
  },

  // ── DARK INSET BAND + BENTO GRID #2 — the intelligence layer ─────────────────
  intel: {
    kicker: "Шар аналітики",
    h2: "Що тримає підготовку на курсі",
    lead: "Не просто банк питань. Три речі, які ведуть тебе саме до слабких місць — і до дати іспиту.",
    cells: [
      {
        key: "review",
        eyebrow: "Повторення",
        claim: "Повертає тему за розкладом пам'яті",
        body: "Розумне й інтервальне повторення в одному місці — тема приходить, коли ось-ось забудеться.",
        img: "/lp/v34-review.png",
        alt: "Екран практики: розумне повторення, інтервальне повторення та змішана практика",
      },
      {
        key: "exam",
        eyebrow: "Симулятор іспиту",
        claim: "20 · 20 · 2 — правила державного іспиту",
        body: "Таймер, ліміт помилок, ті самі питання. Скласти — щонайменше 18 з 20.",
        img: "/lp/v34-exam.png",
        alt: "Екран екзаменаційної симуляції: питання 1 з 20, таймер 19:46, дорожній знак",
      },
      {
        key: "mistakes",
        eyebrow: "Робота над помилками",
        claim: "Кожна помилка — з посиланням на пункт ПДР",
        body: "Обрав неправильно — одразу видно правильну відповідь і чому, з посиланням на пункт ПДР. Помилка стає уроком.",
        img: "/lp/v34-mistakes.png",
        alt: "Екран із розбором відповіді: правильна відповідь, пояснення та посилання на пункт ПДР 15.13",
      },
    ],
  },

  // ── PHOTO-CARD CAROUSEL — real restyled scenes (replaces testimonials) ───────
  questions: {
    h2: "Справжні питання зі справжнього банку",
    lead: "Не стокові картинки й не макети. Реальні ілюстрації з офіційної бази — так само ти побачиш їх у тренуванні.",
    hint: "Гортай →",
    // 7 distinct restyled keys (files exist in public/restyled-live/), captioned
    // with their real Topic titles + verbatim Question.text from dev.db. Ordered
    // so a repeated section never sits adjacent. NONE shared with v34.
    cards: [
      { key: "14_12_0", topic: "Обгін", q: "Чи дозволено обгін водієві зеленого автомобіля в цій ситуації?" },
      { key: "12_14_0", topic: "Швидкість руху", q: "З якою максимальною швидкістю дозволено рух у житлових і пішохідних зонах?" },
      { key: "15_13_0", topic: "Зупинка і стоянка", q: "Чи дозволено водієві білого автомобіля зупинитися для посадки пасажира в цьому місці?" },
      { key: "11_10_0", topic: "Розташування транспортних засобів на дорозі", q: "По якій траєкторії водій білого автомобіля може виїжджати на смугу з реверсивним рухом при повороті?" },
      { key: "13_6_0", topic: "Дистанція, інтервал, зустрічний роз'їзд", q: "Яка дистанція повинна бути між тракторами, що рухаються за межами населених пунктів, якщо їх швидкість не перевищує 40 км/год.?" },
      { key: "15_31_0", topic: "Зупинка і стоянка", q: "Хто з водіїв, виконуючи зупинку, порушує Правила дорожнього руху?" },
      { key: "12_8_0", topic: "Швидкість руху", q: "Яка максимальна швидкість встановлена для легкових автомобілів на цій дорозі за межами населених пунктів (крім транспортних засобів, якими керують водії зі стажем до 2-х років)?" },
    ],
    note: "Ілюстрації відновлено у чистому стилі. Питання ґрунтуються на офіційній базі тестових питань.",
  },

  // ── PRICING (2 columns · featured gradient-ring card) ────────────────────────
  pricing: {
    h2: "Чесна ціна: майже все — безкоштовно",
    lead: "Питання, тренування, повторення й симулятор — назавжди безкоштовні. Платний лише шар аналітики, коли він тобі знадобиться.",
    free: {
      name: "Безкоштовно",
      price: "0 ₴",
      note: "назавжди",
      cta: "Почати безкоштовно",
      items: [
        `Усі ${BANK_B_FMT} офіційних питань категорії B`,
        "Пояснення до кожного питання",
        "Ілюстрації до питань",
        "Тренування по темах",
        "Повторення за розкладом пам'яті",
        "Симулятор іспиту 20 / 20 / 2",
      ],
    },
    paid: {
      name: "Доступ до іспиту",
      price: `${PRICE} ₴`,
      note: "один раз · не підписка",
      cta: "Отримати доступ",
      badge: "Коли захочеш більше",
      items: [
        "Деталізація готовності за темами",
        "План повторень до дати іспиту",
        "Нагадування, коли час повторити",
        "Аналітика помилок за розділами",
      ],
      // negation lives quietly on the same line as the subscription/guarantee words
      negation: "Не підписка, без автосписань — одна ціна.",
      honesty: "Чесна підготовка, а не гарантія складання іспиту.",
    },
  },

  // ── CTA CLOSE (gradient echo) ────────────────────────────────────────────────
  close: {
    h2: "Почни готуватися сьогодні — безкоштовно",
    sub: "Відкрий офіційне питання й відповідай прямо зараз. Без картки, без акаунта, без стіни.",
    note: "Веб-застосунок — відкривається у браузері, нічого встановлювати.",
  },

  // ── FAQ (2-3 col · real Q&A incl. woven disclaimer) ──────────────────────────
  faq: {
    h2: "Питання та відповіді",
    items: [
      {
        q: "Чи офіційні це питання?",
        a: `Так. Банк ґрунтується на офіційній базі тестових питань і містить ${BANK_B_FMT} питань категорії B, ${IMG_FMT} з них — з ілюстраціями за ${SECTIONS} розділами. Можливі похибки опрацювання — звіряйся з офіційним джерелом.`,
      },
      {
        q: "Що саме безкоштовно?",
        a: "Усі питання, пояснення, ілюстрації, тренування по темах, повторення й симулятор 20/20/2 — безкоштовно назавжди. Реєстрація потрібна лише щоб зберігати прогрес.",
      },
      {
        q: `Що дає «Доступ до іспиту» за ${PRICE} ₴?`,
        a: "Шар аналітики: деталізацію готовності за темами, план повторень до дати іспиту, нагадування та розбір помилок за розділами. Це один разовий платіж — не підписка, без автосписань.",
      },
      {
        q: "Як влаштований симулятор іспиту?",
        a: "Як державний іспит: 20 питань, 20 хвилин, максимум 2 помилки. Третя помилка зупиняє спробу; скласти — щонайменше 18 з 20. Таймер і правила ті самі, і він безкоштовний.",
      },
      {
        q: "Треба щось встановлювати?",
        a: "Ні. Drivers School — веб-застосунок: відкривається у браузері на телефоні чи комп'ютері. Нічого встановлювати, жодних магазинів застосунків.",
      },
      {
        q: "Це офіційний іспит?",
        a: "Ні. Drivers School — навчальний застосунок для підготовки до теоретичного іспиту. Ми не є державним органом і не проводимо офіційний іспит — його складають у сервісному центрі МВС. Питання наведено з навчальною метою і не гарантують складання іспиту.",
      },
    ],
  },

  // ── FOOTER ──────────────────────────────────────────────────────────────────
  footer: {
    tagline: "Чесна підготовка до теоретичного іспиту ПДР.",
    disclaimer:
      "Drivers School — навчальний застосунок для підготовки до теоретичного іспиту. Ми не є державним органом і не проводимо офіційний іспит. Питання наведено з навчальною метою і не гарантують складання іспиту.",
    copyright: `© ${YEAR} Drivers School`,
  },
} as const;

// SEO surfaces read the same constants.
export const SEO = {
  title: "Тести ПДР 2026 онлайн — чесна підготовка до теорії іспиту",
  description: `${BANK_B_FMT} офіційних питань категорії B, пояснення, ілюстрації та симулятор іспиту (20 питань · 20 хвилин · 2 помилки) — безкоштовно. З першої спроби теорію складають ${PASS_FIRST}: готуйся так, щоб опинитися серед них.`,
};
