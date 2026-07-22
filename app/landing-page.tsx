"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import heroAdaptiveRoute from "../assets/landing-hero-adaptive-route.webp";
import inlineRouteStudy from "../assets/landing-inline-route-study.webp";
import finalReadinessRoute from "../assets/landing-final-readiness-route.webp";
import journeyDiagnostic from "../assets/landing-journey-diagnostic.webp";
import journeyRepetition from "../assets/landing-journey-repetition.webp";
import journeyMistakeRoute from "../assets/landing-journey-mistake-route.webp";
import journeyExamCheckpoint from "../assets/landing-journey-exam-checkpoint.webp";
import feedbackEvidenceEngine from "../assets/landing-feedback-evidence-engine.webp";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/csr/ArrowUpRight";
import { SignInIcon } from "@phosphor-icons/react/dist/csr/SignIn";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowCounterClockwise";
import { BrainIcon } from "@phosphor-icons/react/dist/csr/Brain";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { CloudSlashIcon } from "@phosphor-icons/react/dist/csr/CloudSlash";
import { FlagIcon } from "@phosphor-icons/react/dist/csr/Flag";
import { GaugeIcon } from "@phosphor-icons/react/dist/csr/Gauge";
import { MoonIcon } from "@phosphor-icons/react/dist/csr/Moon";
import { RoadHorizonIcon } from "@phosphor-icons/react/dist/csr/RoadHorizon";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/csr/ShieldCheck";
import { TargetIcon } from "@phosphor-icons/react/dist/csr/Target";
import { SunIcon } from "@phosphor-icons/react/dist/csr/Sun";
import { FaqAccordion } from "@/components/landing/faq-accordion";
import {
  LandingButton,
  LandingIconButton,
} from "@/components/landing/landing-buttons";
import { LearningModeAccordion } from "@/components/landing/learning-mode-accordion";
import {
  CATEGORY_TOTAL,
  IMAGE_TOTAL_FMT,
  QUESTION_TOTAL_FMT,
  TOPIC_TOTAL,
} from "@/components/landing/metrics";
import { OFFICIAL_CONTENT } from "@/lib/official-content";
import { ReadinessRing } from "@/components/readiness-ring";
import { ProductDemo } from "@/components/landing/product-demo";
import styles from "./landing.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const journey = [
  {
    title: "Спочатку діагностика",
    text: "Кілька відповідей показують не загальний бал, а конкретні прогалини у темах.",
    signal: "Фокус знайдено",
    icon: TargetIcon,
    image: journeyDiagnostic,
  },
  {
    title: "Потім потрібне повторення",
    text: "Складні питання повертаються за інтервалом, а засвоєні не забирають час.",
    signal: "12 карток на сьогодні",
    icon: BrainIcon,
    image: journeyRepetition,
  },
  {
    title: "Помилки стають маршрутом",
    text: "Кожна неправильна відповідь зберігає контекст і веде назад до слабкої теми.",
    signal: "Наступна тема: розмітка",
    icon: ArrowCounterClockwiseIcon,
    image: journeyMistakeRoute,
  },
  {
    title: "Фініш перевіряє симуляція",
    text: "Двадцять питань, двадцять хвилин і максимум дві помилки, як у форматі іспиту.",
    signal: "Режим іспиту готовий",
    icon: FlagIcon,
    image: journeyExamCheckpoint,
  },
];

const feedback = [
  {
    title: "Ще недостатньо даних",
    text: "Drivers School не малює впевненість після однієї вдалої спроби. Спочатку система збирає достатньо відповідей.",
    evidence: [
      ["Покриття тем", "початкове"],
      ["Симуляції", "ще немає"],
    ],
  },
  {
    title: "Цю тему варто повернути",
    text: "Точність зросла, але стабільність ще низька. У маршрут повертаються тільки потрібні картки.",
    evidence: [
      ["Точність", "зростає"],
      ["Стабільність", "потрібне повторення"],
    ],
  },
  {
    title: "Можна переходити до симуляції",
    text: "Покриття тем, повторення та результати практики дають узгоджений сигнал готовності.",
    evidence: [
      ["Покриття тем", "достатнє"],
      ["Повторення", "стабільні"],
      ["Практика", "результати узгоджені"],
    ],
  },
] as const;

const faqs = [
  [
    "Що доступно безкоштовно?",
    `Повний банк містить ${QUESTION_TOTAL_FMT} унікальні питання у ${CATEGORY_TOTAL} категоріях, пояснення, зображення, тренування за темами, повторення та симулятор 20 / 20 / 2. Реєстрація потрібна, щоб зберігати прогрес.`,
  ],
  [
    "Звідки взяті питання?",
    `Усі питання, ілюстрації та правильні відповіді імпортовано з реальної оприлюдненої бази ГСЦ МВС, затвердженої наказом №${OFFICIAL_CONTENT.orderNumber} від ${OFFICIAL_CONTENT.orderDate}. Повний банк містить ${QUESTION_TOTAL_FMT} унікальні питання у ${CATEGORY_TOTAL} категоріях, ${IMAGE_TOTAL_FMT} із них мають зображення. Перед іспитом звіряйте важливі формулювання з актуальним джерелом ГСЦ МВС.`,
  ],
  [
    "Як рахується готовність?",
    "З реальних відповідей: система враховує покриття тем, стабільність після повторень і результати симуляцій. Якщо даних мало, вона прямо це показує замість передчасного відсотка.",
  ],
  [
    "Як влаштований симулятор іспиту?",
    "Формат відтворює теоретичний іспит: 20 питань, 20 хвилин і максимум 2 помилки. Третя помилка завершує спробу.",
  ],
  [
    "Як оплачується персональний маршрут?",
    "Персональний маршрут коштує 399 грн одноразово. Він додає деталізацію готовності, план до дати іспиту, нагадування та аналітику помилок. Автоматичних списань немає.",
  ],
  [
    "Це офіційний іспит?",
    "Ні. Drivers School є навчальним застосунком, не державним органом і не офіційною екзаменаційною системою. Офіційний іспит складають у сервісному центрі МВС.",
  ],
] as const;

export function LandingPage() {
  const root = useRef<HTMLElement>(null);
  const journeyScrollerRef = useRef<HTMLDivElement>(null);
  const journeyCardRefs = useRef<Array<HTMLElement | null>>([]);
  const journeyFrameRef = useRef<number | null>(null);
  const [feedbackIndex, setFeedbackIndex] = useState(0);
  const [activeJourneyIndex, setActiveJourneyIndex] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("drivers-school-theme");
    const nextTheme =
      savedTheme === "light" || savedTheme === "dark"
        ? savedTheme
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    const frame = window.requestAnimationFrame(() => setTheme(nextTheme));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(
    () => () => {
      if (journeyFrameRef.current !== null) {
        window.cancelAnimationFrame(journeyFrameRef.current);
      }
    },
    [],
  );

  const toggleTheme = () => {
    setTheme((currentTheme) => {
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      window.localStorage.setItem("drivers-school-theme", nextTheme);
      return nextTheme;
    });
  };

  const updateJourneyPosition = () => {
    if (journeyFrameRef.current !== null) return;

    journeyFrameRef.current = window.requestAnimationFrame(() => {
      journeyFrameRef.current = null;
      const scroller = journeyScrollerRef.current;
      if (!scroller) return;

      const scrollerRect = scroller.getBoundingClientRect();
      const scrollerCenter = scrollerRect.left + scrollerRect.width / 2;
      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      journeyCardRefs.current.forEach((card, index) => {
        if (!card) return;
        const cardRect = card.getBoundingClientRect();
        const distance = Math.abs(
          cardRect.left + cardRect.width / 2 - scrollerCenter,
        );
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      setActiveJourneyIndex((currentIndex) =>
        currentIndex === closestIndex ? currentIndex : closestIndex,
      );
    });
  };

  useGSAP(
    () => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduceMotion) return;

      gsap.from("[data-hero-reveal]", {
        y: 20,
        opacity: 0,
        duration: 0.48,
        stagger: 0.07,
        ease: "power3.out",
      });

      gsap.fromTo(
        "[data-hero-visual-reveal]",
        { yPercent: 2, scale: 0.985, opacity: 0 },
        {
          yPercent: 0,
          scale: 1,
          opacity: 1,
          duration: 0.48,
          delay: 0.12,
          ease: "power3.out",
          clearProps: "transform,opacity",
        },
      );

      gsap.utils
        .toArray<HTMLElement>("[data-section-reveal]")
        .forEach((element) => {
          gsap.fromTo(
            element,
            { y: 20, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.48,
              ease: "power3.out",
              clearProps: "transform,opacity",
              scrollTrigger: {
                trigger: element,
                start: "top 80%",
                once: true,
              },
            },
          );
        });

      const readinessPreview = root.current?.querySelector<HTMLElement>(
        "[data-readiness-preview]",
      );
      const readinessProgress = readinessPreview?.querySelector<SVGCircleElement>(
        "svg circle:nth-of-type(2)",
      );

      if (readinessPreview && readinessProgress) {
        const progressStart = Number(
          readinessProgress.getAttribute("stroke-dasharray"),
        );
        const progressTarget = Number(
          readinessProgress.getAttribute("stroke-dashoffset"),
        );

        gsap
          .timeline({
            scrollTrigger: {
              trigger: readinessPreview,
              start: "top 72%",
              once: true,
            },
          })
          .fromTo(
            readinessPreview,
            { y: 8, scale: 0.95, opacity: 0 },
            {
              y: 0,
              scale: 1,
              opacity: 1,
              duration: 0.46,
              ease: "power3.out",
              clearProps: "transform,opacity",
            },
          )
          .fromTo(
            readinessProgress,
            { strokeDashoffset: progressStart },
            {
              strokeDashoffset: progressTarget,
              duration: 0.9,
              ease: "power3.out",
              clearProps: "strokeDashoffset",
            },
            0.12,
          );
      }

      const words = gsap.utils.toArray<HTMLElement>("[data-reveal-word]");
      gsap.set(words, { opacity: 0.12 });
      gsap.to(words, {
        opacity: 1,
        stagger: 0.08,
        ease: "none",
        scrollTrigger: {
          trigger: "[data-word-reveal]",
          start: "top 78%",
          end: "bottom 42%",
          scrub: true,
        },
      });

      const media = gsap.matchMedia();
      media.add("(min-width: 901px)", () => {
        ScrollTrigger.create({
          trigger: "[data-journey]",
          start: "top 110px",
          end: "bottom bottom-=120",
          pin: "[data-journey-title]",
          pinSpacing: false,
        });
      });

      gsap.utils
        .toArray<HTMLElement>("[data-stack-card]")
        .forEach((card, index) => {
          gsap.fromTo(
            card,
            { opacity: 0.62 },
            {
              opacity: 1,
              ease: "none",
              scrollTrigger: {
                trigger: card,
                start: "top 90%",
                end: "top 62%",
                scrub: true,
              },
            },
          );
          card.style.zIndex = String(index + 1);
        });

      gsap.utils
        .toArray<HTMLElement>("[data-journey-artwork]")
        .forEach((artwork) => {
          const card = artwork.closest<HTMLElement>("[data-stack-card]");
          if (!card) return;
          gsap
            .timeline({
              scrollTrigger: {
                trigger: card,
                start: "top bottom",
                end: "bottom top",
                scrub: 0.6,
              },
            })
            .fromTo(
              artwork,
              { scale: 0.94, opacity: 0.42 },
              { scale: 1, opacity: 0.72, duration: 0.55, ease: "none" },
            )
            .to(artwork, {
              scale: 1.035,
              opacity: 0.28,
              duration: 0.45,
              ease: "none",
            });
        });

      gsap.fromTo(
        "[data-memory-bar]",
        { scaleY: 0.16, opacity: 0.45 },
        {
          scaleY: 1,
          opacity: 1,
          duration: 0.72,
          stagger: 0.055,
          ease: "power3.out",
          clearProps: "transform,opacity",
          scrollTrigger: {
            trigger: "[data-memory-curve]",
            start: "top 84%",
            once: true,
          },
        },
      );

      return () => media.revert();
    },
    { scope: root },
  );

  const activeFeedback = feedback[feedbackIndex];
  const revealSentence =
    "Не повторюйте все підряд. Повертайтеся до складних тем у потрібний момент.";

  return (
    <main ref={root} className={styles.page} data-theme={theme}>
      <a href="#system" className={styles.skipLink}>
        Перейти до змісту
      </a>
      <section className={styles.hero}>
        <Image
          src={heroAdaptiveRoute}
          alt="Адаптивний навчальний маршрут крізь схему міського перехрестя"
          fill
          loading="eager"
          fetchPriority="high"
          className={styles.heroImage}
          sizes="100vw"
          quality={60}
        />
        <div className={styles.heroOverlay} />

        <nav
          className={styles.nav}
          aria-label="Основна навігація"
          data-hero-reveal
        >
          <Link href="/" className={styles.wordmark}>
            <span className={styles.wordmarkMark} aria-hidden="true">
              DS
            </span>
            <span>Drivers School</span>
          </Link>
          <div className={styles.navCenter}>
            <a href="#system">Система</a>
            <a href="#route">Маршрут</a>
            <a href="#access">Доступ</a>
          </div>
          <div className={styles.navActions}>
            <button
              type="button"
              className={styles.themeToggle}
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Увімкнути світлу тему" : "Увімкнути темну тему"}
              title={theme === "dark" ? "Світла тема" : "Темна тема"}
            >
              <span className={styles.themeIconSwap} aria-hidden="true">
                <SunIcon
                  size={18}
                  className={theme === "dark" ? styles.themeIconActive : undefined}
                />
                <MoonIcon
                  size={18}
                  className={theme === "light" ? styles.themeIconActive : undefined}
                />
              </span>
            </button>
            <Link href="/login" className={styles.navLogin}>
              Увійти <SignInIcon size={17} aria-hidden="true" />
            </Link>
          </div>
        </nav>

        <div className={styles.heroContent}>
          <div className={styles.heroCopy}>
            <h1>Теорія, яка знає, що вам повторити.</h1>
            <p data-hero-reveal>
              Персональний маршрут до іспиту замість нескінченного перегляду
              всіх питань.
            </p>
            <div className={styles.heroActions} data-hero-reveal>
              <LandingButton asChild>
                <Link href="/q/q_1_1">
                  Спробувати питання без реєстрації{" "}
                  <ArrowRightIcon size={18} aria-hidden="true" />
                </Link>
              </LandingButton>
              <LandingButton asChild variant="secondary">
                <a href="#system">Як це працює</a>
              </LandingButton>
            </div>
            <div className={styles.heroProof} data-hero-reveal>
              <p>
                <strong>{QUESTION_TOTAL_FMT}</strong> питання <span />
                <strong>{IMAGE_TOTAL_FMT}</strong> з ілюстраціями <span />
                <strong>{TOPIC_TOTAL}</strong> тем <span />
                <strong>{CATEGORY_TOTAL}</strong> категорій
              </p>
              <a
                href={OFFICIAL_CONTENT.sourcePage}
                target="_blank"
                rel="noreferrer"
              >
                Повна база ГСЦ МВС, наказ №{OFFICIAL_CONTENT.orderNumber} від{" "}
                {OFFICIAL_CONTENT.orderDate}
                <ArrowUpRightIcon size={14} aria-hidden="true" />
              </a>
            </div>
          </div>
          <ProductDemo />
        </div>
      </section>

      <div className={styles.capabilityRail} aria-label="Можливості Drivers School" tabIndex={0}>
        <div>
          {[0, 1].map((copy) => (
            <div className={styles.capabilityRailSet} aria-hidden={copy === 1} key={copy}>
              <span>Реальні питання</span><i />
              <span>Розклад повторень</span><i />
              <span>Банк помилок</span><i />
              <span>Симулятор іспиту</span><i />
              <span>Робота офлайн</span><i />
            </div>
          ))}
        </div>
      </div>

      <section className={styles.systemSection} id="system">
        <div className={styles.systemHeading} data-section-reveal>
          <p>Не збірник тестів</p>
          <h2>
            Система, що бачить{" "}
            <span
              className={styles.inlineRoad}
              style={{ backgroundImage: `url(${inlineRouteStudy.src})` }}
              aria-hidden="true"
            />{" "}
            не бал, а знання.
          </h2>
        </div>

        <div className={styles.bento}>
          <article
            className={`${styles.bentoCard} ${styles.memoryCard}`}
            data-section-reveal
          >
            <div className={styles.cardIcon}>
              <BrainIcon size={21} aria-hidden="true" />
            </div>
            <h3>Пам&apos;ятає ваш темп</h3>
            <p>
              Алгоритм планує повернення до картки до того, як відповідь
              забудеться.
            </p>
            <div
              className={styles.memoryCurve}
              data-memory-curve
              role="img"
              aria-label="Приклад інтервалів повторення: складні картки повертаються частіше"
            >
              {[82, 64, 45, 71, 52, 88, 69, 94].map((value, index) => (
                <span
                  key={index}
                  data-memory-bar
                  style={{ height: `${value}%` }}
                />
              ))}
              <i>Приклад інтервалів</i>
            </div>
          </article>

          <article
            className={`${styles.bentoCard} ${styles.readinessCard}`}
            data-section-reveal
          >
            <div>
              <div className={styles.cardIcon}>
                <GaugeIcon size={21} aria-hidden="true" />
              </div>
              <h3>Готовність на основі відповідей</h3>
              <p>
                Сигнал спирається на покриття тем, стабільність і симуляції.
              </p>
            </div>
            <div className={styles.readinessPreview} data-readiness-preview>
              <ReadinessRing
                value={null}
                progress={36}
                centerLabel="Дані"
                label="Приклад збору даних для оцінки готовності"
                className={styles.landingReadinessRing}
                trackColor="var(--line)"
                progressColor="var(--red-dark)"
              />
              <div>
                <strong>Оцінка формується</strong>
                <span>після достатньої кількості відповідей</span>
              </div>
            </div>
          </article>

          <article
            className={`${styles.bentoCard} ${styles.examCard}`}
            data-section-reveal
          >
            <FlagIcon size={24} aria-hidden="true" />
            <h3>20 / 20 / 2</h3>
            <p>Питання, хвилини, допустимі помилки.</p>
          </article>

          <article
            className={`${styles.bentoCard} ${styles.offlineCard}`}
            data-section-reveal
          >
            <CloudSlashIcon size={24} aria-hidden="true" />
            <h3>Маршрут не зникає без мережі.</h3>
          </article>
        </div>
      </section>

      <section className={styles.statement} data-word-reveal>
        <p>
          {revealSentence.split(" ").map((word, index) => (
            <span key={`${word}-${index}`} data-reveal-word>
              {word}{" "}
            </span>
          ))}
        </p>
      </section>

      <section className={styles.journeySection} id="route" data-journey>
        <div
          className={styles.journeyTitle}
          data-journey-title
          data-section-reveal
        >
          <p>Від першої відповіді</p>
          <h2>
            Один маршрут.
            <br />
            Чотири точні зміни.
          </h2>
          <span>Система перебудовується після кожної навчальної дії.</span>
        </div>
        <div
          className={styles.journeyCards}
          ref={journeyScrollerRef}
          onScroll={updateJourneyPosition}
          tabIndex={0}
          aria-label="Чотири зміни навчального маршруту"
        >
          {journey.map(({ title, text, signal, icon: Icon, image }, index) => (
            <article
              key={title}
              data-stack-card
              ref={(card) => {
                journeyCardRefs.current[index] = card;
              }}
            >
              <div
                className={styles.journeyArtwork}
                data-journey-artwork
                aria-hidden="true"
              >
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="(max-width: 900px) 100vw, 48vw"
                  draggable={false}
                />
              </div>
              <div className={styles.journeyCardTop}>
                <Icon size={25} aria-hidden="true" />
                <RoadHorizonIcon size={18} aria-hidden="true" />
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
              <div className={styles.systemSignal}>
                <span />
                {signal}
              </div>
            </article>
          ))}
        </div>
        <div className={styles.journeyPosition} aria-hidden="true">
          {journey.map(({ title }, index) => (
            <span
              key={title}
              className={`${styles.journeyPositionDot} ${
                activeJourneyIndex === index
                  ? styles.journeyPositionDotActive
                  : ""
              }`}
            />
          ))}
        </div>
      </section>

      <section className={styles.accordionSection}>
        <div className={styles.accordionIntro} data-section-reveal>
          <h2>Кожен режим має одну роботу.</h2>
          <p>Оберіть режим, щоб побачити його роль у навчальному маршруті.</p>
        </div>
        <div data-section-reveal>
          <LearningModeAccordion />
        </div>
      </section>

      <section className={styles.feedbackSection}>
        <div className={styles.feedbackHeader} data-section-reveal>
          <div>
            <h2>Зворотний зв&apos;язок із наступним кроком.</h2>
          </div>
          <div className={styles.carouselControls}>
            <LandingIconButton
              label="Попередній сигнал"
              onClick={() =>
                setFeedbackIndex(
                  (feedbackIndex - 1 + feedback.length) % feedback.length,
                )
              }
            >
              <ArrowLeftIcon size={20} aria-hidden="true" />
            </LandingIconButton>
            <LandingIconButton
              label="Наступний сигнал"
              onClick={() =>
                setFeedbackIndex((feedbackIndex + 1) % feedback.length)
              }
            >
              <ArrowRightIcon size={20} aria-hidden="true" />
            </LandingIconButton>
          </div>
        </div>
        <div className={styles.feedbackBody} data-section-reveal>
          <div className={styles.feedbackArtwork} aria-hidden="true">
            <Image
              src={feedbackEvidenceEngine}
              alt=""
              fill
              sizes="(max-width: 900px) 100vw, 58vw"
              draggable={false}
            />
          </div>
          <div
            className={styles.feedbackCopy}
            aria-live="polite"
            aria-atomic="true"
          >
            <p className={styles.feedbackQuote}>{activeFeedback.title}</p>
            <p className={styles.feedbackExplanation}>{activeFeedback.text}</p>
            <div className={styles.feedbackEvidence}>
              <p>Чому такий висновок</p>
              <dl>
                {activeFeedback.evidence.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <span className={styles.feedbackCount}>
            <span>
              {feedbackIndex + 1} / {feedback.length}
            </span>
            <span
              className={styles.feedbackProgressTrack}
              style={
                { "--feedback-index": feedbackIndex } as CSSProperties
              }
              aria-hidden="true"
            >
              {feedback.map(({ title }) => (
                <span key={title} className={styles.feedbackProgressSegment} />
              ))}
              <span className={styles.feedbackProgressMarker} />
            </span>
          </span>
        </div>
      </section>

      <section className={styles.accessSection} id="access">
        <div className={styles.accessCopy} data-section-reveal>
          <p>Контент залишається відкритим</p>
          <h2>Контент безкоштовний. Персональний маршрут коштує 399 грн.</h2>
          <p className={styles.accessDescription}>
            Питання, пояснення, тренування та симулятор залишаються
            безкоштовними. Оплачений маршрут додає персональну систему рішень.
          </p>
          <div className={styles.freeAccess}>
            <div>
              <p>Безкоштовна основа</p>
              <strong>0 грн</strong>
            </div>
            <ul>
              <li>
                <CheckIcon size={17} aria-hidden="true" /> Усі {QUESTION_TOTAL_FMT}{" "}
                питання та пояснення
              </li>
              <li>
                <CheckIcon size={17} aria-hidden="true" /> Тренування та
                повторення
              </li>
              <li>
                <CheckIcon size={17} aria-hidden="true" /> Симулятор 20 / 20 / 2
              </li>
            </ul>
          </div>
        </div>
        <div
          className={styles.accessPanel}
          data-section-reveal
        >
          <p className={styles.accessTierLabel}>
            Персональний маршрут
          </p>
          <div className={styles.price}>
            <strong>399</strong>
            <span>
              грн
              <br />
              одноразово
            </span>
          </div>
          <ul>
            <li>
              <CheckIcon size={18} aria-hidden="true" /> Готовність за темами
            </li>
            <li>
              <CheckIcon size={18} aria-hidden="true" /> План до дати іспиту
            </li>
            <li>
              <CheckIcon size={18} aria-hidden="true" /> Нагадування про
              повторення
            </li>
            <li>
              <CheckIcon size={18} aria-hidden="true" /> Аналітика помилок
            </li>
          </ul>
          <LandingButton asChild>
            <Link href="/register">
              Додати персональний маршрут{" "}
              <ArrowRightIcon size={18} aria-hidden="true" />
            </Link>
          </LandingButton>
          <p className={styles.subscriptionNote}>
            <ShieldCheckIcon size={16} aria-hidden="true" /> Без підписки та
            автоматичних списань
          </p>
        </div>
      </section>

      <section className={styles.faqSection}>
        <h2 data-section-reveal>Перед стартом.</h2>
        <div data-section-reveal>
          <FaqAccordion items={faqs} />
        </div>
      </section>

      <section className={styles.finalCta}>
        <div
          className={styles.finalCtaImage}
          style={{ backgroundImage: `url(${finalReadinessRoute.src})` }}
          aria-hidden="true"
        />
        <div className={styles.finalCtaContent} data-section-reveal>
          <h2>Побач, як система пояснює відповідь.</h2>
          <LandingButton asChild>
            <Link href="/q/q_1_1">
              Спробувати питання без реєстрації{" "}
              <ArrowRightIcon size={18} aria-hidden="true" />
            </Link>
          </LandingButton>
        </div>
      </section>

      <footer className={styles.footer}>
        <Link href="/" className={styles.wordmark}>
          <span className={styles.wordmarkMark} aria-hidden="true">
            DS
          </span>
          <span>Drivers School</span>
        </Link>
        <p>Навчальний інструмент для підготовки до теоретичного іспиту ПДР.</p>
        <div>
          <Link href="/terms">Умови</Link>
          <Link href="/privacy">Приватність</Link>
          <Link href="/support">Підтримка</Link>
          <Link href="/contact">Контакти</Link>
          <a
            href={OFFICIAL_CONTENT.sourcePage}
            target="_blank"
            rel="noreferrer"
          >
            Джерело питань
          </a>
          <Link href="/login">Увійти</Link>
        </div>
      </footer>
    </main>
  );
}
