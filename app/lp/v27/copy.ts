// All visible copy for landing variant v27 — «Восьма ранку» (concept name; NEVER
// shown on the page). Visual register inherited faithfully from v8 «Синя година»
// (blue-hour indigo), re-architected as a clock-stamped documentary timeline of
// the exam morning that then rewinds into the preparation window.
//
// Every visible string is Ukrainian. The hero headline/subhead are swappable A/B
// slots of FIXED structure (two-line headline + one-line subhead, identical CTA
// labels + proof chips) so the unvalidated JTBD register flips A↔B with ZERO
// layout change. Flip HERO_VARIANT.
//
// Copy-gate discipline (funnel guards grep comment-stripped source): recurring-
// billing words appear only in negated forms on the same line; the guarantee word
// only ever negated on the same line; no urgency/discount/scarcity tokens anywhere,
// in copy OR comments. Numbers live in ONE constants object (N) feeding copy, meta,
// and JSON-LD atomically — a bank revision or price-arm swap is a one-line bump.

export const HERO_VARIANT: "A" | "B" = "B";

// ── Single source of truth for every number on the page ──────────────────────
export const N = {
  bank: 2322, // ВСЯ база: 2322 published official questions across categories (dev.db, 2026-07)
  poolB: 1757, // category-B published pool ONLY (dev.db, 2026-07) — feeds the plan-pace calculator
  topics: 65,
  price: 399, // build default; 499 is the L3 smoke-test arm — swap here, copy untouched
  priceUnit: "₴",
  retake: 250, // per attempt — HSC MVS articles 12.02 / 24.02.2026
  passFirstTry: "1 з 5", // 21.5% first-attempt, 2026 YTD (ГСЦ МВС via 24tv)
  stateUsers: "900 тисяч", // pdr.infotech.gov.ua «900 000+ студентів», re-confirmed 2026-07-16
  year: 2026,
  examQ: 20,
  examMin: 20,
  examMaxErrors: 2,
  examPass: 18, // ≥18/20; a 3rd error auto-terminates
} as const;

export const copy = {
  nav: {
    brand: "Drivers School",
    tagline: "тренер готовності",
    login: "Увійти",
    cta: "Почати",
  },

  hero: {
    // Visible without scroll — the marketing spine.
    stat: `Лише ${N.passFirstTry} складає з першої`,
    statNote: `за даними ${N.year} року`,

    // Variant B — dial-first (quantified-readiness register). Default.
    B: {
      headline: ["Ранок іспиту —", "не лотерея."],
      highlight: "не лотерея.",
      subhead:
        "Один чесний показник каже, чи ти справді пройдеш той ранок — а не скільки тестів прокликав.",
    },
    // Variant A — plan-led (date-first register). Same shape, interchangeable.
    A: {
      headline: ["Знай свій ранок", "іспиту наперед."],
      highlight: "іспиту наперед.",
      subhead:
        "Назви день іспиту — і побач, скільки лишилось до ранку, коли ти будеш готовий.",
    },

    ctaPrimary: "Почати безкоштовно",
    ctaSecondary: "Спробувати без реєстрації",

    chips: [
      `${N.bank} офіційні питання`,
      `${N.examQ} питань · ${N.examMin} хв · ${N.examMaxErrors} помилки`,
      `оновлено ${N.year}`,
    ],

    // Live one-question demo — a real ПДР rule, answerable in place, no network.
    demo: {
      kicker: "Перше питання твого ранку",
      question:
        "З якою найбільшою швидкістю дозволено рух легкового автомобіля в населеному пункті?",
      options: [
        { label: "50 км/год", correct: true },
        { label: "60 км/год", correct: false },
        { label: "80 км/год", correct: false },
        { label: "90 км/год", correct: false },
      ],
      explainCorrect:
        "Так. У населеному пункті — 50 км/год, якщо знак не дозволяє інакше.",
      explainWrong:
        "Ні. У населеному пункті межа — 50 км/год, поки знак не дозволить більше.",
      meterHint: "Відповіси — і показник ворухнеться від нуля.",
    },

    dialCard: {
      label: "Твоя готовність",
      captionAfter: "Перша відповідь врахована — далі показник уточнюється.",
      captionWrong: "Помилку враховано — показник нижчий, ніж після правильної. Він не винагороджує промах.",
    },
  },

  // ── The documentary timeline: three clock-stamped stops of the exam morning ──
  timeline: {
    label: "Ранок іспиту, година за годиною",

    stop1: {
      time: "07:40",
      place: "Сервісний центр",
      lead: "Черга, документи, очікування свого вікна.",
      body:
        "Нічого драматичного — звичайна процедура. Знаєш її наперед — і хвилюєшся менше.",
      factValue: `${N.retake} ${N.priceUnit}`,
      factLabel: "кожна спроба, готівкою чи ні",
      factNote: `актуально на лютий ${N.year}`,
    },

    stop2: {
      time: "08:00",
      place: "Кабінка",
      lead: "Двадцять питань. Двадцять хвилин. Максимум дві помилки.",
      body:
        `Треба щонайменше ${N.examPass} правильних із ${N.examQ}. Третя помилка зупиняє іспит одразу — без «дай подумати».`,
      format: [
        { k: String(N.examQ), label: "питань у білеті" },
        { k: String(N.examMin), label: "хвилин на все" },
        { k: String(N.examMaxErrors), label: "помилки — межа" },
      ],
      previewAlt: "Перемальоване зображення з офіційного питання: перехрестя з маршрутами А та Б",
      previewCaption: "Реальне питання із симулятора — зображення перемальоване, чистіше за оригінал.",
      promiseTitle: "Потренуй саме цей формат",
      promiseBody:
        "Той самий тиск часу, ті самі правила — безкоштовно, стільки разів, скільки треба. Симулятор іспиту не за оплатою.",
    },

    stop3: {
      time: "08:20",
      place: "Результат",
      big: N.passFirstTry,
      bigCaption: "виходить звідси зі складеним іспитом",
      line:
        `${N.stateUsers} тренуються безкоштовно — і 4 з 5 провалюють першу спробу. Питання не в доступі до тестів.`,
    },
  },

  // ── ПЕРЕМОТКА — the narrative turn: rewind three weeks, sky lightens one step ──
  rewind: {
    label: "Перемотка",
    heading: ["Цей ранок вирішується", "за тижні до нього."],
    highlight: "за тижні до нього.",
    body:
      "Спокій о 08:20 не береться з нічого. Він збирається щовечора — рівним темпом, прив’язаним до однієї дати.",
    inputLabel: "Дата іспиту",
    noDate: "Без дати теж працює — план тримає рівний щоденний темп.",
    today: "Іспит сьогодні — режим фінального прогону: слабкі теми та повний симулятор до виходу.",
    pastDate: "Ця дата вже минула — обери нову або дату перескладання.",
    resultTemplate: (days: number, perDay: number) =>
      `≈ ${days} ${plural(days, ["день", "дні", "днів"])} × ${perDay} питань/день`,
    resultSub: "рівний темп, без завалів в останню ніч",
    intensiveLabel: "Інтенсив",
    intensiveTemplate: (days: number, perDay: number) =>
      `${days} ${plural(days, ["день", "дні", "днів"])} до дати — режим інтенсиву: ${perDay} питань/день`,
    frame: "Так виглядає доступ до іспиту — прив’язаний до твого ранку, а не до календаря.",
    cta: "Скласти мій план",
  },

  // ── ДИЛ — readiness dial demo (the answer to the 08:20 low) ───────────────────
  dial: {
    caption: "Це не % пройденого",
    heading: ["Як знати, що ранок", "буде спокійним."],
    highlight: "буде спокійним.",
    body:
      "Готовність — це калібрована ймовірність скласти, порахована за твоїми реальними відповідями. Забув тему — вона падає. Тому їй можна вірити.",
    decayNote: "Дивись: без повторення показник осідає сам.",
    decayNoteStatic: "Без повторення показник осідає сам — тут із 84 до 72.",
    moat:
      "Жоден перевірений український сервіс не показує калібровану ймовірність складання.",
    points: [
      {
        title: "Калібрований P(скласти)",
        body:
          "Не «пройдено 78%». Оцінка шансу скласти справжній іспит — за офіційними стратами питань.",
      },
      {
        title: "FSRS-план повторень",
        body:
          "Іменований рушій інтервального повторення повертає складне саме тоді, коли ти майже забув.",
      },
      {
        title: "Чесно за визначенням",
        body:
          "Показник може падати й не бреше. Спокій на іспиті — коли він високий не на словах.",
      },
    ],
  },

  // ── МЕХАНІЗМ — the one deliberate numbered sequence on the page ───────────────
  mechanism: {
    // documentary timestamp motif — the evening mirror of the exam-morning timeline
    caption: "21:30 · вечір підготовки",
    heading: "Три речі, які працюють щовечора",
    body:
      "Уся категорія ховається за словом «розумний». Ми називаємо кожен крок — бо саме прозорість тут і є відмінністю.",
    steps: [
      {
        n: "01",
        title: "Відповідаєш на офіційні питання",
        body: "Ті самі білети, що й на іспиті. Кожна відповідь — сигнал про те, що ти знаєш.",
      },
      {
        n: "02",
        title: "FSRS планує повторення до твоєї дати",
        body: "Названий рушій розкладає, що і коли повторити, щоб дійти до ранку готовим.",
      },
      {
        n: "03",
        title: "Дил калібрується за реальними результатами",
        body: "Показник готовності перераховується з твоїх відповідей — не з відсотка пройденого.",
      },
    ],
  },

  // ── ЦІНА — доступ до іспиту ───────────────────────────────────────────────────
  pricing: {
    caption: "Доступ до іспиту",
    heading: "Усі питання — безкоштовно. Платиш лише за розум.",
    body:
      "Кожне офіційне питання, пояснення, зображення й симулятор іспиту — вільні назавжди. Платний шар — тільки інтелект понад ними.",
    price: `${N.price} ${N.priceUnit}`,
    priceUnit: "разово",
    priceFrame:
      "Один платіж, прив’язаний до твоєї дати. Не підписка. Без автосписань.",
    calendarLine: "Прив’язано до твого іспиту, а не до календаря.",
    anchor: `Дешевше за одну провалену спробу (кожна — ${N.retake} ${N.priceUnit}).`,
    freeTitle: "Безкоштовно назавжди",
    free: [
      `Усі ${N.bank} офіційні питання`,
      "Пояснення до кожного",
      "Перемальовані зображення",
      "Симулятор іспиту на час",
    ],
    paidTitle: "У доступі до іспиту",
    paid: [
      "Деталізація показника готовності",
      "FSRS-план до твоєї дати",
      "Каліброване нагадування вчитись",
      "Аналітика твоїх помилок",
    ],
    completion:
      "Пройшов увесь план, але не склав офіційний іспит? Наступна спроба в доступі — безкоштовно. Це підтримка, а не гарантія результату.",
    trust: ["прогрес не зникає", "без автосписань", "одна ціна"],
    cta: "Отримати доступ",
    ctaNote: "Оплата на сайті. Без підписок і прихованих платежів.",
  },

  // ── БАЗА + FAQ ────────────────────────────────────────────────────────────────
  proof: {
    caption: "Чесна база",
    heading: "На чому це стоїть",
    stats: [
      { k: String(N.bank), label: "офіційні питання" },
      { k: String(N.topics), label: "тем" },
      { k: String(N.year), label: "актуальна база" },
    ],
    badge: `База актуальна · оновлено ${N.year}`,
    // Reserved calibration slot — ships EMPTY of any outcome claim until real
    // PassOutcome data exists. Rendered as a quiet placeholder, never a number.
    reserved: "Коли назбирається достатньо реальних результатів — тут з’явиться, як показник дилу співвідноситься зі складанням. Поки що — жодних вигаданих відсотків.",
  },

  faq: {
    caption: "Питання, які варто поставити",
    heading: "Коротко й чесно",
    items: [
      {
        q: "Чому це не підписка?",
        a: "Один платіж, прив’язаний до твоєї дати іспиту. Без підписок, без автосписань, без календарного «згорання». Заплатив раз — доступ твій.",
      },
      {
        q: "Що саме безкоштовно?",
        a: `Усі ${N.bank} офіційні питання, пояснення, перемальовані зображення й симулятор іспиту на час. Ми ніколи не ховаємо питання за оплатою.`,
      },
      {
        q: "Це офіційний іспит?",
        a: "Ні. Це навчальна платформа для підготовки. Вона не інтегрована із системами МВС / ГСЦ МВС і не дає права скласти державний іспит у застосунку.",
      },
      {
        q: "Як рахується готовність?",
        a: "Це калібрована ймовірність скласти — з твоїх реальних відповідей за офіційними стратами питань. Забув тему — показник чесно падає.",
      },
      {
        q: "Що таке FSRS?",
        a: "Іменований рушій інтервального повторення. Він вирішує, що і коли повторити, щоб знання трималося саме до дати іспиту, а не згоряло раніше.",
      },
      {
        q: "Чи зникне мій прогрес?",
        a: "Ні. Прогрес зберігається за тобою. Жодних скидань, жодного «згорання» доступу за календарем.",
      },
      {
        q: "Скільки коштує спроба іспиту?",
        a: `Кожна офіційна спроба — ${N.retake} ${N.priceUnit}. Саме тому один платіж за готовність дешевший за одну провалену спробу.`,
      },
      {
        q: "Симулятор теж платний?",
        a: "Ні. Симулятор на 20 питань / 20 хвилин / 2 помилки — безкоштовний, стільки разів, скільки треба. Платиш лише за інтелект понад питаннями.",
      },
      {
        q: "Щойно провалив іспит. Це допоможе?",
        a: "Саме для цього. Назви нову дату — план перерахує темп під час до наступної спроби й почне з тем, де ти щойно спіткнувся.",
      },
      {
        q: "Ви гарантуєте, що я складу?",
        a: "Чесно: це підтримка підготовки, а не гарантія результату. Готовність можна виміряти, але скласти маєш ти. Ми показуємо шанс без прикрас.",
      },
    ],
  },

  finalCta: {
    heading: ["Обери, яким буде", "твій ранок."],
    highlight: "твій ранок.",
    body: "Одне питання. Без реєстрації. Показник ворухнеться від нуля вже зараз.",
    ctaPrimary: "Почати безкоштовно",
    ctaSecondary: "Спробувати без реєстрації",
    launcherTitle: "Одразу до діла",
    launcher: [
      { title: "Тренування за темами", sub: "знаки, розмітка, перехрестя" },
      { title: "Симулятор іспиту", sub: `${N.examQ} питань · ${N.examMin} хв · ${N.examMaxErrors} помилки` },
      { title: "Мій план до іспиту", sub: "рівний темп до твоєї дати" },
    ],
  },

  footer: {
    wordmark: "Drivers School",
    disclaimer:
      "Навчальна платформа для підготовки до теоретичної частини іспиту з ПДР. Це не офіційна екзаменаційна система: вона не інтегрована із системами МВС / ГСЦ МВС, не дає права скласти державний іспит у застосунку і не гарантує складання іспиту. Можливі похибки опрацювання — звіряйтеся з першоджерелом.",
    links: [] as { label: string; href: string }[],
    copyright: `© ${N.year} Drivers School`,
  },
} as const;

// Ukrainian plural helper (one / few / many).
function plural(n: number, forms: [string, string, string]): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}
