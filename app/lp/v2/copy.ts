// Landing variant v2 — «Нічна траса (Night Highway)»
// ALL visible copy lives here. Hero headline/subhead are swappable SLOTS
// (variant A dial-first vs variant B plan-first) of identical structure:
// same line counts + similar character budget so the layout never shifts.

export const QUESTION_COUNT = 2322; // single source; bump if the official bank order changes
export const PRICE = "399 ₴";

// Active cat-B pool (published · active · not archived) = the real set the planner
// distributes across the days-to-exam. Single source so the printed «N днів × M питань/день»
// stays arithmetically coherent: days × perDay ≈ ACTIVE_POOL (one full pass) inside the band.
// Verify: sqlite3 prisma/dev.db "SELECT COUNT(*) FROM Question q JOIN _QuestionCategories qc
//   ON qc.B=q.id JOIN Category c ON c.id=qc.A WHERE q.isPublished=1 AND q.isActive=1
//   AND q.archivedAt IS NULL AND c.code='B';" → 1757
export const ACTIVE_POOL = 1757;
export const PLAN_MIN_PER_DAY = 12; // gentle-horizon floor (extra passes = spaced repetition)
export const PLAN_MAX_PER_DAY = 120; // intensive cap (short horizon → essentials first)

export const HERO_VARIANTS = {
  // A — readiness/dial-first promise (quantified register)
  A: {
    headline: ["Не відсотки.", "Готовність до іспиту."],
    subhead:
      "Один показник, що чесно рахує твою готовність за реальними відповідями — і не боїться піти вниз.",
  },
  // B — plan/date-first promise (finite-sprint register)
  B: {
    headline: ["Склади з першого разу —", "бо знаєш, що готовий."],
    subhead:
      "Особистий план до дати твого іспиту й показник готовності замість здогадок «начебто вивчив».",
  },
} as const;

export const ACTIVE_HERO: keyof typeof HERO_VARIANTS = "A";

export const copy = {
  nav: {
    brand: "Drivers School",
    tagline: "тренер готовності",
    login: "Увійти",
    cta: "Почати безкоштовно",
  },

  hero: {
    hook: "Лише 1 з 5 складає теорію з першої спроби — за даними 2026 року.",
    ctaPrimary: "Почати безкоштовно",
    ctaSecondary: "Спробувати без реєстрації",
    tryHint: "Без реєстрації — дай відповідь просто тут.",
    carsLabel: "1 із 5 складає з першої спроби",
    chips: [
      `${QUESTION_COUNT} офіційні питання`,
      "20 хв · 2 помилки — як на іспиті",
      "65 тем · оновлено 2026",
    ],
  },

  // An illustrative practice item in the format of the official tickets — NOT a
  // verbatim row from the official bank (checked: no matching questionKey), so the
  // label must NOT claim «офіційне питання». See `label` below.
  demoQuestion: {
    label: "Питання у форматі офіційних білетів",
    prompt: "Що означає миготіння зеленого сигналу світлофора?",
    options: [
      { text: "Рух дозволено, але треба пришвидшитись", correct: false },
      { text: "Час його дії завершується і скоро ввімкнеться заборонний сигнал", correct: true },
      { text: "Світлофор несправний — керуйтесь знаками", correct: false },
      { text: "Дозволено рух лише прямо", correct: false },
    ],
    explainCorrect:
      "Правильно. Миготливий зелений попереджає, що час його дії добігає кінця — готуйся зупинитись.",
    explainWrong:
      "Ні. Миготливий зелений означає, що час його дії добігає кінця і зараз увімкнеться заборонний сигнал.",
    meterCaption: "Твій показник готовності щойно ожив",
  },

  dial: {
    km: "01",
    title: "Показник готовності",
    sub: "Це не відсоток пройденого — це ймовірність скласти",
    moatLead:
      "Жоден перевірений український сервіс не показує каліброваної ймовірності скласти чи названого механізму інтервального повторення. Ми показуємо обидва.",
    decayNote:
      "Дил може піти вниз, якщо ти давно не повторював. Це не баг — це чесність. Він відповідає на одне питання: «чи я справді готовий?»",
    engine: "Рушій FSRS — інтервальне повторення",
    calibrated: "Калібрована ймовірність P(скласти)",
    caption: "Це не % пройденого",
  },

  planner: {
    km: "02",
    title: "План до твого іспиту",
    sub: "Обери дату — і побач, скільки лишилось",
    intro: "Підготовка — це спринт до конкретної дати, а не нескінченне «колись».",
    label: "Дата іспиту",
    noDate: "Ще не знаєш дату? Постав приблизну — план перерахується будь-коли.",
    intensive: "Інтенсив: часу обмаль — план ущільнюється, щоб устигнути головне.",
    perDay: (n: number, q: number) => `≈ ${n} днів × ${q} питань/день`,
    focusLead: "Спершу — найпровальніші теми:",
    focusTopics: [
      "жести регулювальника",
      "нерегульовані перехрестя",
      "кільцеві розв'язки",
      "розмітка",
      "домедична допомога",
    ],
  },

  simulator: {
    km: "03",
    title: "Симулятор іспиту",
    sub: "Репетиція, що знімає страх невідомого",
    format: [
      { big: "20", label: "питань" },
      { big: "20", label: "хвилин" },
      { big: "2", label: "помилки макс." },
    ],
    rules: "Третя помилка завершує іспит. 18 із 20 — склав. Точно як у залі ГСЦ МВС.",
    calm: "Тут можна помилятися — це тренування, а не іспит.",
  },

  pricing: {
    km: "04",
    title: "Доступ до іспиту",
    sub: "Одна ціна. Не підписка.",
    price: PRICE,
    priceNote: "разовий платіж, прив'язаний до твого іспиту",
    anchor: "Дешевше за одну провалену спробу (кожна — 250 ₴).",
    freeTitle: "Безкоштовно назавжди",
    free: [
      "Усі 2322 офіційні питання",
      "Пояснення до кожного питання",
      "Відновлені зображення",
      "Повний симулятор іспиту",
    ],
    paidTitle: "Що дає доступ",
    paid: [
      "Детальний показник готовності",
      "План до іспиту на рушії FSRS",
      "Калібровані нагадування",
      "Аналітика твоїх помилок",
    ],
    failsafe:
      "Пройшов увесь план, але не склав офіційний іспит? Відкриємо доступ безкоштовно до наступної спроби — це не гарантія результату, а наша відповідальність за план.",
    trust: ["прогрес не зникає", "без автосписань", "одна ціна"],
    cta: "Почати безкоштовно",
  },

  proof: {
    km: "05",
    title: "Чесна база",
    sub: "Ми не змагаємось за мільйони. Ми показуємо, чи готовий саме ти.",
    stats: [
      { big: `${QUESTION_COUNT}`, label: "офіційні питання" },
      { big: "65", label: "тем" },
      { big: "2026", label: "актуальна база" },
    ],
    badge: "База актуальна · наказ №225",
    note: "Кожне питання, кожне пояснення й кожне зображення — безкоштовні. Платиш лише за інтелект, що веде тебе до складання.",
  },

  faq: {
    km: "06",
    title: "Чесні відповіді",
    sub: "На питання, які насправді хвилюють",
    items: [
      {
        q: "Чому не підписка?",
        a: "Бо підписка — це тривога про списання. 399 ₴ — разовий платіж, прив'язаний до твого іспиту. Без автопродовжень, без прихованих списань, без календарного «згорання».",
      },
      {
        q: "Що саме безкоштовно?",
        a: "Усі 2322 офіційні питання, пояснення, відновлені зображення й повний симулятор іспиту — безкоштовно назавжди. Платним є лише шар аналітики, що веде тебе до складання.",
      },
      {
        q: "Це офіційний іспит?",
        a: "Ні. Це навчальний тренажер на основі офіційної бази питань. Він не замінює державний іспит і не пов'язаний із системами МВС / ГСЦ МВС.",
      },
      {
        q: "Як рахується готовність?",
        a: "Показник оцінює ймовірність скласти за твоїми реальними відповідями й інтервальним повторенням (FSRS). Він може падати, коли ти давно не повторював — саме тому йому можна вірити.",
      },
    ],
  },

  finalCta: {
    title: "Твоя ніч на трасі починається зараз",
    sub: "Увімкни фари. Побач, чи справді готовий — і склади з першого разу.",
    cta: "Почати безкоштовно",
    launcher: [
      { title: "Тренування", desc: "Питання за темами" },
      { title: "Симулятор іспиту", desc: "20 питань · 20 хвилин" },
      { title: "Мій план", desc: "План до дати іспиту" },
    ],
  },

  footer: {
    brand: "Drivers School",
    tagline: "тренер готовності, а не ще один збірник тестів",
    links: [
      { label: "Увійти", href: "/login" },
      { label: "Почати", href: "/register" },
    ],
    copyright: `© ${new Date().getFullYear()} Drivers School`,
  },
} as const;

export type Copy = typeof copy;
