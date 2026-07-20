/* ═══════════════════════════════════════════════════════════════════════
   Landing v21 — FULL CONCEPT «Твоя дата» — all visible copy (Ukrainian).
   Calculator-led architecture fused with the v10 «Маршрут» cartographic
   visual: the page opens by asking the ONE question no competitor asks —
   «Коли твій іспит?» — and everything downstream (plan, dial, pricing frame)
   recomputes around the answer, drawn as a literal route from сьогодні to the
   exam date. The entered date is client-state threaded through the whole page.

   Hero headline/subhead are swappable A/B SLOTS of FIXED STRUCTURE (one
   display headline of two lines + one-line subhead); ACTIVE_HERO picks the
   live arm. CTA labels + proof chips NEVER vary between arms.

   Machine copy-gates honoured IN SOURCE:
   · «підписк» tokens appear only in negated forms («Не підписка», «без підписок»)
   · «гаранті» forms carry «не » on the SAME source line, unwrapped
   · zero scarcity / countdown / urgency tokens anywhere (incl. comments)
   ═══════════════════════════════════════════════════════════════════════ */

/** Single-sourced numbers — bump in one place (feeds copy, title, meta, schema). */
export const STATS = {
  bank: 2322, // офіційні питання, кат. B (наказ №225, чинний 2026)
  topics: 65,
  updated: 2026,
  price: 399, // ₴, разовий доступ до іспиту
  retakeFee: 250, // ₴ за спробу
  passRatePlain: "1 з 5", // 21.5% з першої спроби, дані 2026
  passPct: 21.5,
  simQuestions: 20,
  simMinutes: 20,
  simErrors: 2,
  fallbackDays: 30, // no-date route length
} as const;

/** Two display lines + one-line subhead. Both arms share structure & budgets. */
export const HERO_VARIANTS = {
  // A — date / plan-led (route framing, the calculator-led thesis)
  A: {
    line1: "Один маршрут —",
    line2: "до твоєї дати.",
    sub: "Назви день іспиту — і план збереться сам: скільки днів лишилось і скільки питань на день.",
  },
  // B — dial-first / quantified-readiness promise (same line count & budget)
  B: {
    line1: "Не відсотки.",
    line2: "Готовність.",
    sub: "Бачиш реальну ймовірність скласти — а не скільки тестів ти вже відкрив у застосунку.",
  },
} as const;

export type HeroKey = keyof typeof HERO_VARIANTS;
export const ACTIVE_HERO: HeroKey = "A";

export const copy = {
  brand: "Drivers School",

  nav: {
    links: [
      { label: "Маршрут", href: "#marshrut" },
      { label: "Готовність", href: "#dial" },
      { label: "Симулятор", href: "#simulator" },
      { label: "Ціна", href: "#pricing" },
    ],
    login: "Увійти",
    loginHref: "/login",
    cta: "Почати",
    ctaHref: "/register",
  },

  hero: {
    ctaPrimary: "Почати безкоштовно",
    ctaPrimaryHref: "/register",
    ctaSecondary: "Спробувати без реєстрації",
    ctaSecondaryHref: "#marshrut",
    hook: `Лише ${STATS.passRatePlain} складає теорію з першої спроби · дані 2026`,
    chips: [
      `${STATS.bank} офіційні питання`,
      "20 · 20 · 2 — формат іспиту",
      "оновлено 2026",
    ],
    // the hero mechanic — the date field, styled as a map annotation
    question: "Коли твій іспит?",
    inputLabel: "Дата іспиту",
    todayLabel: "сьогодні",
    flagLabel: "ІСПИТ",
    youAreHere: "ви тут",
    noDateFallback: "Ще не записався? Покажемо маршрут на 30 днів.",
    planPrefix: "≈",
    perDayUnit: "питань/день",
    intensive: "Інтенсив",
    daysLeftLabel: "днів до дати",
    setDatePrompt: "Обери дату — і маршрут прокладеться сам.",
  },

  marshrut: {
    heading: "Твій маршрут до дати.",
    body: "Скінченний спринт, а не безкінечне навчання: усі дні до іспиту з рівним навантаженням. А перша точка маршруту — просто тут, без реєстрації.",
    routeTodayLabel: "сьогодні",
    normalNote:
      "Найпровальніші теми — першими: жести регулювальника, перехрестя, розмітка.",
    intensiveNote:
      "Менше тижня до дати — режим інтенсиву. Спершу найпровальніші теми.",
    farNote: "Спокійний темп. Час є — головне, щоб готовність не просідала.",
    // first waypoint — one real official question, answered in-viewport
    demo: {
      waypoint: "Перша точка маршруту",
      label: `Питання 1 з ${STATS.bank}`,
      question: "З якою максимальною швидкістю дозволено рух у населених пунктах?",
      options: ["50 км/год", "60 км/год", "70 км/год", "80 км/год"],
      correct: 0,
      correctNote:
        "Правильно. У населених пунктах — не більше 50 км/год (ПДР, п. 12.4).",
      wrongNote:
        "Майже. У населених пунктах — не більше 50 км/год (ПДР, п. 12.4). Тут можна помилятися — це тренування, а не іспит.",
      meterHint: "Готовність",
      meterZero: "Відповідай — і шкала рушить з нуля.",
      // a wrong answer moves the meter by 0 — the payoff is the explanation
      meterWrong: "Помилка теж вчить — пояснення вже тут. Готовність рухається лише з правильних.",
    },
    waypointsLabel: "перші точки маршруту",
    // the route's first stops echo the top-failed topics (scheduled first)
    waypoints: ["жести регулювальника", "нерегульовані перехрестя", "дорожня розмітка"],
  },

  dial: {
    heading: "Це не відсоток пройденого. Це ймовірність скласти.",
    body: "Шкала готовності — це твоя позиція на маршруті. Рахує результат за реальними відповідями, складністю тем і забуванням у часі — і чесно падає, коли ти давно не повторював.",
    moat: "Жоден перевірений український сервіс не показує каліброваної ймовірності скласти та названого рушія повторень FSRS. Ми показуємо.",
    // moat split so the calm ink line carries the fact and the single accent
    // underline lands only on the closing claim (UA-scoped, not «ніхто у світі»)
    moatLead:
      "Жоден перевірений український сервіс не показує каліброваної ймовірності скласти та названого рушія повторень FSRS.",
    moatClaim: "Ми показуємо.",
    caption: "Це не % пройденого",
    dialLabel: "ЙМОВІРНІСТЬ СКЛАСТИ",
    decayNote: "−7 за тиждень без повторень",
    panelCoord: "позиція на маршруті",
    positionTag: "ви тут",
  },

  mechanism: {
    heading: "Маршрут — це справжня послідовність.",
    body: "Три точки на одній лінії. Кожна робить наступну точнішою.",
    steps: [
      {
        n: "01",
        title: "Відповідаєш на офіційні питання",
        body: "Уся офіційна база — безкоштовно, з поясненнями й перемальованими зображеннями.",
        coord: "старт",
      },
      {
        n: "02",
        title: "FSRS планує повторення до твоєї дати",
        body: "Названий рушій інтервального повторення розкладає всю базу на дні, що лишилися.",
        coord: "у дорозі",
      },
      {
        n: "03",
        title: "Дил калібрується за реальними результатами",
        body: "Що більше проходиш — то точніша ймовірність скласти. Прямо, без «розумного» тумана.",
        coord: "фініш",
      },
    ],
  },

  simulator: {
    heading: "20 питань · 20 хвилин · 2 помилки — як на іспиті.",
    body: "Той самий формат, той самий ліміт часу, той самий ліміт помилок. Контрольна точка на маршруті — щоб справжній іспит був для тебе не першим.",
    free: "Симулятор — безкоштовний. Повністю. Це наш аргумент проти «відкрий, щоб побачити відповідь».",
    stats: [
      { n: "20", cap: "питань" },
      { n: "20", cap: "хвилин" },
      { n: "2", cap: "помилки максимум" },
    ],
    passNote: "Скласти — це ≥18 з 20. Третя помилка завершує спробу достроково.",
    topicsLabel: "Найпровальніші теми — на маршруті першими:",
    topics: [
      "жести регулювальника",
      "нерегульовані перехрестя",
      "кільцеві розв'язки",
      "дорожня розмітка",
      "домедична допомога",
    ],
  },

  interstitial: {
    detourLabel: "Перездача",
    big: `Кожна спроба — ${STATS.retakeFee} ₴.`,
    sub: "4 з 5 провалюють першу. Це не привід нервувати — це привід прокласти маршрут спокійно.",
    cta: "Повернутися до плану",
    ctaHref: "#marshrut",
  },

  pricing: {
    heading: "Доступ до іспиту. Одна ціна.",
    price: `${STATS.price} ₴`,
    priceUnit: "один раз",
    priceNote: "Не купуєш контент назавжди — купуєш готовність до своєї дати.",
    boundLine: "прив'язано до твого іспиту, а не до календаря",
    anchor: `Дешевше за одну провалену спробу — кожна коштує ${STATS.retakeFee} ₴.`,
    freeTitle: "Безкоштовно назавжди",
    freeSub: "Увесь контент. Без «відкрий, щоб побачити».",
    free: [
      `Усі ${STATS.bank} офіційні питання`,
      "Пояснення до кожного",
      "Перемальовані зображення",
      "Симулятор іспиту 20 · 20 · 2",
      "Прогрес зберігається",
    ],
    paidTitle: "Доступ до іспиту — 399 ₴",
    paidSub: "Тільки шар інтелекту. Контент лишається безкоштовним.",
    paid: [
      "Детальна шкала готовності",
      "FSRS-план до твоєї дати",
      "Калібровані нагадування",
      "Аналітика твоїх помилок",
    ],
    negations: ["Не підписка", "Без автосписань", "Без підписок"],
    // completion-tied, never pass-tied. «не гарантія» is negated on THIS source line.
    failsafe:
      "Пройшов весь план, але не склав іспит? Доступ лишається до наступної спроби — це наша впевненість у методі, а не гарантія результату.",
    trustBand: ["прогрес не зникає", "без автосписань", "одна ціна"],
    cta: "Почати безкоштовно",
    ctaHref: "/register",
    ctaNote: "Оплата — лише коли захочеш детальну готовність. Спершу все безкоштовне.",
  },

  base: {
    heading: `${STATS.bank} офіційні питання. ${STATS.topics} тем. Оновлено ${STATS.updated}.`,
    body: "Уся офіційна база питань категорії B — з поясненнями й перемальованими зображеннями. Актуальна за наказом №225 (жовтень 2025).",
    badge: "База актуальна",
    retaker: "Не склав? План перебудується під нову дату, а прогрес лишиться.",
    stats: [
      { n: String(STATS.bank), cap: "офіційних питань" },
      { n: String(STATS.topics), cap: "тем" },
      { n: String(STATS.updated), cap: "оновлено" },
    ],
    // reserved calibration-report slot — ships EMPTY of claims until real data exists
    calibrationTitle: "Коли дил показує 90+ …",
    calibrationBody:
      "Тут зʼявиться реальна статистика складання за нашими користувачами — щойно назбираємо достатньо результатів справжніх іспитів. Жодних вигаданих чисел до того часу.",
    calibrationTag: "готуємо",
  },

  faq: {
    heading: "Питання і відповіді",
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
        a: "Ні. Це навчальний застосунок на основі офіційних питань. Ми не пов'язані з ГСЦ МВС і не проводимо державний іспит.",
      },
      {
        q: "Як рахується готовність?",
        a: "За твоїми реальними відповідями, складністю тем і забуванням у часі — рушієм інтервального повторення FSRS. Шкала готовності може падати: це чесний сигнал, а не відсоток пройденого.",
      },
      {
        q: "Що дає дата іспиту?",
        a: "Уся база розкладається рівномірно на дні, що лишилися до твоєї дати. Менше тижня — режим інтенсиву з найпровальніших тем. Дату завжди можна змінити.",
      },
      {
        q: "Чи зникне мій прогрес?",
        a: "Ні. Прогрес зберігається у твоєму акаунті й не скидається після оплати чи оновлення бази питань.",
      },
      {
        q: "Що таке «доступ до іспиту»?",
        a: "Разовий доступ до інтелектуального шару — детальної готовності, FSRS-плану й нагадувань — прив'язаний до твоєї екзаменаційної дати. Не підписка й не календарне вікно, що згорає.",
      },
      {
        q: "Можна спробувати без реєстрації?",
        a: "Так. Одне справжнє офіційне питання можна пройти прямо тут, на сторінці, без реєстрації й без інтернету.",
      },
      {
        q: "Я щойно не склав іспит. Чим це поможе?",
        a: "Маршрут перекладеться під твою нову дату й почне з найпровальніших тем. Готовність підкаже, коли ти справді готовий до наступної спроби.",
      },
      {
        q: "Скільки коштує і чи є автосписання?",
        a: `${STATS.price} ₴ разово. Без підписок, без автосписань, без прихованих платежів. Оплата тільки за детальний шар готовності.`,
      },
    ],
  },

  finalCta: {
    heading: "Готовий прокласти маршрут?",
    sub: "Почни безкоштовно. Перша точка маршруту — вже за кліком.",
    cta: "Почати безкоштовно",
    ctaHref: "/register",
    ctaSecondary: "Спробувати без реєстрації",
    ctaSecondaryHref: "#marshrut",
    modesTitle: "Обери, з чого почати",
    modes: [
      { label: "Тренування", href: "/register" },
      { label: "Симулятор іспиту", href: "/register" },
      // free tier delivers the route preview; the detailed FSRS plan is the
      // paid layer — so the row promises the маршрут, not the paid plan
      { label: "Маршрут до дати", href: "/register" },
    ],
  },

  footer: {
    ghost: "DRIVERS SCHOOL",
    tagline: "Тренер готовності до теорії ПДР — не ще один збірник тестів.",
    legendTitle: "Легенда",
    legend: [
      { label: "Маршрут", href: "#marshrut" },
      { label: "Готовність", href: "#dial" },
      { label: "Механізм", href: "#mechanism" },
      { label: "Симулятор", href: "#simulator" },
      { label: "Ціна", href: "#pricing" },
      { label: "Питання", href: "#faq" },
    ],
    disclaimer:
      "Навчальний застосунок для підготовки до теоретичного іспиту з ПДР. Не є офіційним сервісом ГСЦ МВС, не пов'язаний із ним і не має статусу офіційного іспиту. Не замінює обов'язкові практичні заняття й не дає права скласти державний іспит у застосунку. Питання ґрунтуються на офіційній базі тестових питань (наказ №225) і використовуються з навчальною метою; можливі похибки опрацювання — звіряйтеся з офіційним джерелом.",
    copyright: `© ${STATS.updated} Drivers School`,
  },
} as const;

/** Ukrainian plural: [one, few, many]. */
export function plural(n: number, forms: [string, string, string]): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return forms[0];
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1];
  return forms[2];
}

export function daysWord(n: number): string {
  return plural(n, ["день", "дні", "днів"]);
}

/** Pure plan math — zero network, works before any consent. */
export type ExamPlan = {
  date: string;
  days: number;
  perDay: number;
  intensive: boolean;
};

export function computePlan(dateStr: string, today: Date): ExamPlan {
  const target = new Date(dateStr + "T00:00:00");
  const days = Math.max(
    1,
    Math.round((target.getTime() - today.getTime()) / 86400000),
  );
  const perDay = Math.max(1, Math.ceil(STATS.bank / days));
  return { date: dateStr, days, perDay, intensive: days < 7 };
}

/** CTA microcopy that pays off the date the visitor personally set. */
export function planMicrocopy(days: number): string {
  return `план на ${days} ${daysWord(days)} — безкоштовно`;
}
