// ─────────────────────────────────────────────────────────────────────────────
// Landing v36 — «Школа Pocket»
// Playful app-marketing energy: the product lives inside hand-drawn PHONE frames,
// each anchored by a REAL mobile screenshot of the running app. Palette grounded
// in the road itself — Ukrainian informational-sign BLUE as the brand, road-marking
// YELLOW as the accent, traffic-light GREEN for «правильно», over a crisp cool
// signage-neutral ground. Big rounded Rubik display over humanist Golos Text body.
// Buoyant micro-motion; the honesty voice stays adult.
//
// ALL numbers are REAL, extracted from prisma/dev.db NOW and hard-coded here
// (the landing is DB-free at runtime). Published + active + non-archived, cat B:
//   1757 — cat-B questions   ·  986 — of those with images   ·  45 — sections
// (verified: SELECT COUNT(*) … JOIN _QuestionCategories qc ON qc.B=q.id
//            WHERE qc.A='<cat B id>' AND isPublished AND isActive AND archivedAt IS NULL)
// Exam mechanics + price are official/config constants, not DB.
// ─────────────────────────────────────────────────────────────────────────────

export const YEAR = 2026;

export const BANK_B = 1757;
export const BANK_B_FMT = "1 757"; // thin-space grouping
export const IMG_COUNT = 986;
export const IMG_FMT = "986";
export const SECTIONS = 45;
export const PRICE = 399;

// Official first-try theory pass rate, 2026. The honest hook (not fear-mongering).
export const PASS_FIRST = "21,5%";

// Registration-free path — the anon single-question viewer. Honours its promise:
// never /login, never /register (mirrors v30 ANON_TRY_HREF convention).
export const ANON_TRY_HREF = "/q/q_1_1";
// The exact question shown in the inline mini-demo (its own anon deep-link).
export const DEMO_Q_HREF = "/q/q_11_16";

export const CTA = {
  free: { label: "Почати безкоштовно", href: "/register" },
  login: { label: "Увійти", href: "/login" },
  anon: { label: "Спробувати без реєстрації", href: ANON_TRY_HREF },
  register: { label: "Створити акаунт", href: "/register" },
  how: { label: "Як це працює", href: "#features" },
};

export const NAV = {
  links: [
    { label: "Можливості", href: "#features" },
    { label: "Приклад питання", href: "#content" },
    { label: "Ціна", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ],
};

export const COPY = {
  brand: "Drivers School",

  // ── HERO ──────────────────────────────────────────────────────────────────
  hero: {
    kicker: "Теоретичний іспит ПДР · Категорія B · у твоїй кишені",
    headBefore: "Підготовка, яка каже тобі ",
    headHi: "правду", // ← highlighted word, marker + spark
    headAfter: ".",
    sub: `Тільки ${PASS_FIRST} складають теорію з першої спроби у ${YEAR}-му. Показуємо, що ти вже знаєш, а що варто повторити — з твоїх реальних відповідей. ${BANK_B_FMT} офіційних питань з поясненням до кожного, прямо в телефоні.`,
    note: "Без картки. Перше питання — без реєстрації. Відкрий у браузері.",
    phoneAlt:
      "Екран тренування у телефоні: питання про зупинку для висадки пасажира з ілюстрацією дороги, прогрес 1 з 15 і варіанти відповіді",
  },

  // ── PROOF BAND (the real numbers as ONE honest statement, not a stat dashboard) ──
  // The three figures live inline as emphasized numerals inside a single display-face
  // sentence; each segment is either prose (`num:false`) or a figure (`num:true`).
  // Numbers stay VERBATIM from BANK_B_FMT / IMG_FMT / SECTIONS — no retyped literals.
  proof: {
    chip: `Офіційний банк питань ${YEAR}`,
    statement: [
      { text: "Повний офіційний банк категорії B — усі ", num: false },
      { text: BANK_B_FMT, num: true },
      { text: " питань, з них ", num: false },
      { text: IMG_FMT, num: true },
      { text: " з ілюстрацією до відповіді, розкладені по ", num: false },
      { text: String(SECTIONS), num: true },
      { text: " розділах. Справжній банк, а не демо.", num: false },
    ],
  },

  // ── FEATURE CARDS ×3 (each a phone + real mobile capture) ───────────────────
  features: {
    h2: "Уся підготовка — в одному застосунку",
    lead: "Три речі, які тримають підготовку на курсі. Усе на справжніх екранах — саме такими ти побачиш їх у телефоні.",
    cards: [
      {
        key: "anon",
        tone: "blue",
        title: "Тренування без реєстрації",
        body: "Відкрий офіційне питання й відповідай прямо зараз — без акаунта, без картки, без стіни. Помилятися тут можна: це тренування, а не іспит.",
        img: "/lp/v36-m-anon.png",
        alt: "Екран у телефоні: офіційне питання ПДР з ілюстрацією дороги, відкрите без реєстрації",
        link: { label: "Спробувати без реєстрації", href: ANON_TRY_HREF },
      },
      {
        key: "dial",
        tone: "yellow",
        title: "Готовність з реальних відповідей",
        body: "Поки відповідей мало — ми так і кажемо: «ще недостатньо даних». Готовність рахується з твоїх реальних відповідей, а не з відсотка пройденого.",
        img: "/lp/v36-m-dial.png",
        alt: "Екран готовності у телефоні зі станом «ще недостатньо даних — дайте відповідь ще на 20 питань»",
        link: { label: "Як рахується готовність", href: "#faq" },
      },
      {
        key: "exam",
        tone: "green",
        title: "Симулятор іспиту 20 / 20 / 2",
        body: "Точно як на державному іспиті: 20 питань, 20 хвилин, максимум 2 помилки. Третя зупиняє спробу. Безкоштовно — потрібен лише акаунт, щоб зберегти спробу.",
        img: "/lp/v36-m-exam.png",
        alt: "Екран екзаменаційної симуляції у телефоні: питання 1 з 20, таймер 19:58, навігація по 20 питаннях",
        link: { label: "Створити акаунт для іспиту", href: "/register" },
      },
    ],
  },

  // ── BENEFITS GRID (6 short honest one-liners) ───────────────────────────────
  benefits: {
    h2: "Ще шість речей, що працюють на тебе",
    items: [
      { t: "Розумне повторення", d: "Світлик повертає тему саме тоді, коли вона ось-ось забудеться." },
      { t: "Робота над помилками", d: "Кожна помилка одразу з поясненням, а не здогадкою." },
      { t: "Збережені питання", d: "Познач складне зіркою — і повернися до нього пізніше." },
      { t: "Карта тем", d: "Усі теми за рівнем засвоєння, найслабші вгорі. Без рейтингів." },
      { t: "Пояснення з пунктами ПДР", d: "До відповіді — розбір із посиланням на офіційну базу." },
      { t: "Прогрес", d: "Видно, скільки вже пройдено й що лишилось. Без прикрас." },
    ],
  },

  // ── REAL-CONTENT MOMENT (inline mini-demo of ONE real restyled question) ─────
  // Verbatim official question (imageKey 11_16_0) with the RESTYLED image —
  // the product's own content as its own proof.
  demo: {
    h2: "Спробуй просто тут",
    lead: "Не стокова картинка й не макет. Це реальне питання з офіційного банку — саме таким воно є у тренуванні.",
    topic: "Розташування ТЗ на дорозі",
    question: "Чи дозволено водієві жовтого автомобіля виїхати на смугу зустрічного руху?",
    image: "/restyled-live/11_16_0.png",
    imageAlt:
      "Дорога з чотирма смугами: жовтий автомобіль у своїй смузі, назустріч рухаються червоний і білий автомобілі",
    options: [
      {
        text: "Дозволено для виконання обгону, в разі якщо транспортний засіб рухається зі швидкістю менш ніж 30 км/год.",
        correct: false,
      },
      { text: "Заборонено.", correct: true },
    ],
    prompt: "Обери відповідь — і побачиш розбір.",
    // Verbatim from the DB QuestionExplanation for q_11_16 (shortText / detailedText / legalReference).
    right:
      "Водієві жовтого автомобіля виїзд на смугу зустрічного руху заборонений, бо тут діє заборона (наприклад, суцільна лінія розмітки, відповідні знаки чи понад дві смуги в кожному напрямку).",
    wrong:
      "Низька швидкість іншого ТЗ сама по собі не дає права виїжджати на зустрічну смугу там, де це заборонено, тому варіант про обгін за швидкості менш ніж 30 км/год хибний.",
    pdrRef: "ПДР п. 11.4",
    reference: "Ґрунтується на офіційній базі тестових питань. Пояснення — навчальне.",
    link: { label: "Відкрити це питання", href: DEMO_Q_HREF },
  },

  // ── PRICING (2 tiers only — nothing recurring, so no toggle) ─────────────────
  pricing: {
    h2: "Майже все — безкоштовно",
    lead: "Питання, тренування, повторення й симулятор — назавжди безкоштовні. Платний лише шар аналітики, коли він тобі знадобиться.",
    free: {
      name: "Безкоштовно",
      price: "0 ₴",
      note: "назавжди",
      cta: "Почати безкоштовно",
      href: "/register",
      items: [
        `Усі ${BANK_B_FMT} офіційних питань категорії B`,
        "Пояснення до кожного питання",
        "Зображення до питань",
        "Тренування по темах",
        "Повторення за розкладом пам'яті",
        "Симулятор іспиту 20 / 20 / 2",
      ],
    },
    paid: {
      name: "Доступ до іспиту",
      price: `${PRICE} ₴`,
      // negation on the SAME line as the price note (HARD LAW): «Не підписка» quiet.
      note: "один раз · Не підписка, без автосписань",
      badge: "Коли захочеш більше",
      cta: "Отримати доступ",
      href: "/register",
      items: [
        "Деталізація готовності за темами",
        "План повторень до дати іспиту",
        "Нагадування, коли час повторити",
        "Аналітика помилок за розділами",
      ],
      // The honesty line carries its required negation on ONE line (HARD LAW).
      honesty: "Чесна підготовка, а не гарантія складання іспиту.",
    },
  },

  // ── FAQ (2-col · real Q&A, incl. disclaimer + web-app answer) ───────────────
  faq: {
    h2: "Питання та відповіді",
    items: [
      {
        q: "Чи офіційні це питання?",
        a: `Так. Банк ґрунтується на офіційній базі тестових питань: ${BANK_B_FMT} питань категорії B, ${IMG_FMT} з них — із зображеннями. Можливі похибки опрацювання — звіряйтеся з офіційним джерелом.`,
      },
      {
        q: "Що саме безкоштовно?",
        a: "Усі питання, пояснення, зображення, тренування по темах, повторення й симулятор 20/20/2 — безкоштовно назавжди. Реєстрація потрібна лише щоб зберігати прогрес.",
      },
      {
        q: "Як рахується готовність?",
        a: "З твоїх реальних відповідей, а не з відсотка пройденого. Поки відповідей мало, показник прямо каже «ще недостатньо даних» і просить відповісти щонайменше на 20 питань, перш ніж щось оцінювати.",
      },
      {
        q: "Чи є автосписання або прихована плата?",
        a: `Ні. «Доступ до іспиту» купується один раз за ${PRICE} ₴, без автосписань і прихованих продовжень. Не підписка. Безкоштовна частина лишається безкоштовною завжди.`,
      },
      {
        q: "Як влаштований симулятор іспиту?",
        a: "Як державний іспит: 20 питань, 20 хвилин, максимум 2 помилки. Третя помилка зупиняє спробу; скласти — щонайменше 18 з 20. Таймер і правила ті самі.",
      },
      {
        q: "Це офіційний іспит?",
        a: "Ні. Drivers School — навчальний застосунок для підготовки до теоретичного іспиту. Ми не є державним органом і не проводимо офіційний іспит — його складають у сервісному центрі МВС.",
      },
      {
        q: "Потрібно щось встановлювати зі стору?",
        a: "Ні. Drivers School — веб-застосунок. Відкрий у браузері на телефоні чи комп'ютері й готуйся одразу, нічого не встановлюючи.",
      },
    ],
  },

  // ── CLOSING CTA BAND (the hero's blue world returns to close the page) ───────
  // Honest register, no hype: free-first primary → anon play, quiet secondary → register.
  finalCta: {
    h2: "Перше питання — просто зараз.",
    lead: "Без реєстрації і без картки. Якщо сподобається — акаунт збереже прогрес.",
    primary: { label: "Спробувати без реєстрації", href: ANON_TRY_HREF },
    secondary: { label: "Створити акаунт", href: "/register" },
  },

  // ── FOOTER ──────────────────────────────────────────────────────────────────
  footer: {
    tagline: "Підготовка до теоретичного іспиту ПДР — у твоїй кишені.",
    qrLabel: "Відкрий на телефоні",
    qrNote: "Наведи камеру — і продовжуй у браузері.",
    columns: [
      {
        title: "Продукт",
        links: [
          { label: "Можливості", href: "#features" },
          { label: "Приклад питання", href: "#content" },
          { label: "Ціна", href: "#pricing" },
        ],
      },
      {
        title: "Почати",
        links: [
          { label: "Спробувати без реєстрації", href: ANON_TRY_HREF },
          { label: "Створити акаунт", href: "/register" },
          { label: "Увійти", href: "/login" },
        ],
      },
    ],
    disclaimer:
      "Drivers School — навчальний застосунок для підготовки до теоретичного іспиту. Ми не є державним органом і не проводимо офіційний іспит. Питання наведено з навчальною метою і не гарантують складання іспиту.",
    copyright: `© ${YEAR} Drivers School`,
  },
} as const;

// SEO surfaces read the same constants.
export const SEO = {
  title: "Тести ПДР категорії B онлайн — теорія до іспиту | Drivers School",
  description: `${BANK_B_FMT} офіційних питань категорії B з поясненням до кожного, ілюстраціями та симулятором іспиту 20/20/2. Тренуйся у браузері — без встановлення, перше питання без реєстрації.`,
};
