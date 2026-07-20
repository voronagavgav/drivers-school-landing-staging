/* ═══════════════════════════════════════════════════════════════════════
   Landing v9 — «Конспект» — all visible copy (Ukrainian).
   One exported const. Hero headline/subhead are swappable A/B SLOTS of
   FIXED STRUCTURE (two display lines + one subhead) so the layout tolerates
   headline-length changes with zero reflow. ACTIVE_HERO picks the live arm.
   ═══════════════════════════════════════════════════════════════════════ */

/** Single-sourced numbers — bump in one place. */
export const STATS = {
  bank: 2322, // офіційні питання, кат. B (наказ №225, чинний 2026)
  topics: 65,
  updated: 2026,
  price: 399, // ₴, разовий доступ до іспиту
  retakeFee: 250, // ₴ за спробу
  passRate: "1 з 5", // 21.5% з першої спроби, дані 2026
  simQuestions: 20,
  simMinutes: 20,
  simErrors: 2,
} as const;

/** Two-line ALL-CAPS display + one-line subhead. Both arms share structure. */
export const HERO_VARIANTS = {
  // A — first-try / plan-led (legally safe, «склади з першого разу»)
  A: {
    line1: "СКЛАДИ З",
    line2: "ПЕРШОГО РАЗУ.",
    sub: "Тренер рахує твою готовність за реальними результатами — не відсотки пройденого.",
  },
  // B — dial-first / quantified-readiness promise
  B: {
    line1: "НЕ ВІДСОТКИ.",
    line2: "ГОТОВНІСТЬ.",
    sub: "Бачиш реальну ймовірність скласти — а не скільки тестів ти вже відкрив.",
  },
} as const;

export type HeroKey = keyof typeof HERO_VARIANTS;
export const ACTIVE_HERO: HeroKey = "A";

export const copy = {
  brand: "Drivers School",
  wordmark: "ГОТОВНІСТЬ",

  hero: {
    ctaPrimary: "Почати безкоштовно",
    ctaPrimaryHref: "/register",
    ctaSecondary: "Без реєстрації",
    ctaSecondaryHref: "#v9-try",
    chips: [
      `${STATS.bank} офіційні питання`,
      "20 · 20 · 2 — формат іспиту",
      "оновлено 2026",
    ],
    // hero mechanic — one real official question, answered in the first viewport
    demo: {
      label: `ПИТАННЯ 1 З ${STATS.bank}`,
      question: "З якою максимальною швидкістю дозволено рух у населених пунктах?",
      options: ["50 км/год", "60 км/год", "70 км/год", "80 км/год"],
      correct: 0,
      correctNote:
        "Правильно. У населених пунктах — не більше 50 км/год (ПДР, п. 12.4).",
      wrongNote:
        "Майже. У населених пунктах — не більше 50 км/год (ПДР, п. 12.4). Тут можна помилятися — це тренування, а не іспит.",
      meterHint: "Готовність +1",
    },
    foldStrip: `ЛИШЕ ${STATS.passRate} СКЛАДАЄ З ПЕРШОЇ СПРОБИ · ДАНІ 2026`,
  },

  dial: {
    kicker: "ГОТОВНІСТЬ",
    heading: "Це не відсоток пройденого. Це ймовірність скласти.",
    body: "Шкала готовності рахує твій результат за реальними відповідями, складністю тем і забуванням у часі — і чесно падає, коли ти давно не повторював.",
    moat: "Жоден перевірений український сервіс не показує каліброваної ймовірності скласти та названого рушія повторень FSRS. Ми показуємо.",
    caption: "Може падати. І це чесно.",
    dialLabel: "ЙМОВІРНІСТЬ СКЛАСТИ",
  },

  interstitial: {
    big: "900 тисяч тренуються безкоштовно — і 4 з 5 провалюють.",
    sub: "Питання не в доступі до тестів. Питання — чи ти справді готовий.",
    cta: "Дізнатися свою готовність",
    ctaHref: "/register",
  },

  planner: {
    kicker: "ПЛАН ДО ІСПИТУ",
    heading: "Коли твій іспит?",
    body: "Назви дату — і план розкладе всю базу на дні, що лишилися. Скінченний спринт, а не безкінечне навчання.",
    inputLabel: "Дата іспиту",
    empty: "Обери дату — і побачиш свій план.",
    daysWord: (n: number) => plural(n, ["день", "дні", "днів"]),
    perDayUnit: "питань/день",
    intensive: "Інтенсив",
    intensiveNote: "Менше тижня — режим інтенсиву. Спершу найпровальніші теми.",
    normalNote: "Найпровальніші теми — першими: жести регулювальника, перехрестя, розмітка.",
  },

  simulator: {
    kicker: "СИМУЛЯТОР ІСПИТУ",
    heading: "20 питань · 20 хвилин · 2 помилки — як на іспиті.",
    body: "Той самий формат, той самий таймер, той самий ліміт помилок. Щоб справжній іспит був для тебе не першим.",
    stats: [
      { n: "20", cap: "ПИТАНЬ" },
      { n: "20", cap: "ХВИЛИН" },
      { n: "2", cap: "ПОМИЛКИ МАКСИМУМ" },
    ],
  },

  pricing: {
    kicker: "ДОСТУП ДО ІСПИТУ",
    heading: "Одна ціна. До твого іспиту.",
    price: `${STATS.price} ₴`,
    priceNote: "Разовий платіж, прив'язаний до твого іспиту. Не підписка, без автосписань.",
    anchor: `Дешевше за одну провалену спробу — кожна коштує ${STATS.retakeFee} ₴.`,
    freeTitle: "Безкоштовно назавжди",
    free: [
      `Усі ${STATS.bank} офіційні питання`,
      "Пояснення до кожного",
      "Перемальовані зображення",
      "Симулятор іспиту",
    ],
    paidTitle: "У доступі до іспиту",
    paid: [
      "Детальна шкала готовності",
      "FSRS-план до іспиту",
      "Каліброві нагадування",
      "Аналітика твоїх помилок",
    ],
    // completion-tied, never pass-tied. «не гарантія» negated on THIS line.
    failsafe:
      "Пройшов весь план, але не склав іспит? Доступ лишається безкоштовним до наступної спроби — це не гарантія результату, а наша впевненість у методі.",
    trustBand: ["прогрес не зникає", "без автосписань", "одна ціна"],
    cta: "Почати безкоштовно",
    ctaHref: "/register",
  },

  base: {
    kicker: "БАЗА",
    heading: `${STATS.bank} офіційні питання. ${STATS.topics} тем. Оновлено ${STATS.updated}.`,
    body: "Уся офіційна база питань категорії B — з поясненнями й перемальованими зображеннями. Актуальна за наказом №225.",
    badge: "Актуально",
    stats: [
      { n: String(STATS.bank), cap: "ОФІЦІЙНИХ ПИТАНЬ" },
      { n: String(STATS.topics), cap: "ТЕМ" },
      { n: String(STATS.updated), cap: "ОНОВЛЕНО" },
    ],
  },

  faq: {
    kicker: "ПИТАННЯ",
    heading: "Коротко про чесне.",
    items: [
      {
        q: "Чому разовий платіж, а не підписка?",
        a: "Ти готуєшся до конкретної дати, а не назавжди. Платиш один раз — і користуєшся до свого іспиту. Без автосписань і без автопродовження.",
      },
      {
        q: "Що саме безкоштовно?",
        a: "Усі питання, пояснення, зображення й симулятор іспиту. Назавжди. Платний лише шар аналітики: детальна шкала готовності, план до іспиту й нагадування.",
      },
      {
        q: "Це офіційний іспит?",
        a: "Ні. Це навчальний застосунок на основі офіційних питань. Ми не пов'язані з ГСЦ МВС і не проводимо іспит.",
      },
      {
        q: "Як рахується готовність?",
        a: "За твоїми реальними відповідями, складністю тем і забуванням у часі. Шкала готовності може падати — це чесний сигнал, а не відсоток пройденого.",
      },
    ],
  },

  finalCta: {
    heading: "Готовий дізнатися, чи ти готовий?",
    sub: "Почни безкоштовно. Перше питання — вже за кліком.",
    cta: "Почати безкоштовно",
    ctaHref: "/register",
    modesTitle: "ОБЕРИ, З ЧОГО ПОЧАТИ",
    modes: [
      { label: "Тренування", href: "/register" },
      { label: "Симулятор іспиту", href: "/register" },
      { label: "Мій план до іспиту", href: "/register" },
    ],
  },

  footer: {
    ghost: "ГОТОВНІСТЬ",
    tagline: "Тренер готовності до теорії ПДР — не ще один збірник тестів.",
    disclaimer:
      "Навчальний застосунок для підготовки до теоретичного іспиту. Не є офіційним сервісом ГСЦ МВС, не пов'язаний із ним і не має статусу офіційного іспиту. Питання використовуються з навчальною метою.",
    // Footer legal/contact pages are not built yet — omit the links rather than
    // ship placeholders that dead-end at /login (a login form contradicts the
    // page's no-registration promise). Re-add with real /terms /privacy /contacts
    // hrefs once those routes exist.
    links: [] as ReadonlyArray<{ label: string; href: string }>,
    copyright: `© ${STATS.updated} Drivers School`,
  },
} as const;

/** Ukrainian plural: [one, few, many]. */
function plural(n: number, forms: [string, string, string]): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return forms[0];
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1];
  return forms[2];
}
