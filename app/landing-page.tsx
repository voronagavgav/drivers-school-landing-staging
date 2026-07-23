"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import heroAdaptiveRoute from "../assets/landing-hero-adaptive-route.webp";
import heroDevicePair from "../assets/landing-hero-device-pair.webp";
import inlineRouteStudy from "../assets/landing-inline-route-study.webp";
import mobileHandheldPhone from "../assets/landing-mobile-handheld-phone.webp";
import finalReadinessRoute from "../assets/landing-final-readiness-route.webp";
import journeyDiagnostic from "../assets/landing-journey-diagnostic.webp";
import journeyRepetition from "../assets/landing-journey-repetition.webp";
import journeyMistakeRoute from "../assets/landing-journey-mistake-route.webp";
import journeyExamCheckpoint from "../assets/landing-journey-exam-checkpoint.webp";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
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
import { LandingButton } from "@/components/landing/landing-buttons";
import { LearningModeAccordion } from "@/components/landing/learning-mode-accordion";
import {
  CATEGORY_TOTAL,
  IMAGE_TOTAL_FMT,
  QUESTION_TOTAL_FMT,
  TOPIC_TOTAL,
} from "@/components/landing/metrics";
import { OFFICIAL_CONTENT } from "@/lib/official-content";
import { ReadinessRing } from "@/components/readiness-ring";
import styles from "./landing.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const landingThemeSyncScript = `
  try {
    const landing = document.currentScript?.parentElement;
    const theme = document.documentElement.dataset.theme;
    if (landing && (theme === "light" || theme === "dark")) {
      landing.dataset.theme = theme;
    }
  } catch {}
`;

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
  const [activeJourneyIndex, setActiveJourneyIndex] = useState(0);
  const [journeyIsScrollable, setJourneyIsScrollable] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [themeInput, setThemeInput] = useState<"keyboard" | "pointer">(
    "keyboard",
  );

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("drivers-school-theme");
    const nextTheme =
      savedTheme === "light" || savedTheme === "dark"
        ? savedTheme
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    document.documentElement.dataset.theme = nextTheme;
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

  useEffect(() => {
    const mobileJourney = window.matchMedia("(max-width: 900px)");
    const syncJourneyMode = () => setJourneyIsScrollable(mobileJourney.matches);

    syncJourneyMode();
    mobileJourney.addEventListener("change", syncJourneyMode);
    return () => mobileJourney.removeEventListener("change", syncJourneyMode);
  }, []);

  const toggleTheme = () => {
    setTheme((currentTheme) => {
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      window.localStorage.setItem("drivers-school-theme", nextTheme);
      document.documentElement.dataset.theme = nextTheme;
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

  const showJourneyStep = (index: number) => {
    const card = journeyCardRefs.current[index];
    if (!card) return;

    setActiveJourneyIndex(index);
    card.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "nearest",
      inline: "start",
    });
  };

  useGSAP(
    () => {
      const motionMedia = gsap.matchMedia();

      motionMedia.add(
        {
          mobile: "(max-width: 560px)",
          wide: "(min-width: 561px)",
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
      const { mobile, wide, reduceMotion } = context.conditions as {
        mobile: boolean;
        wide: boolean;
        reduceMotion: boolean;
      };
      if (reduceMotion) return;

      const revealHasPassed = (element: HTMLElement, viewportRatio: number) =>
        element.getBoundingClientRect().top <= window.innerHeight * viewportRatio;

      if (mobile) {
        gsap.from("[data-hero-reveal]", {
          y: 12,
          opacity: 0,
          duration: 0.42,
          stagger: 0.055,
          ease: "power3.out",
          clearProps: "transform,opacity",
        });

        gsap.utils
          .toArray<HTMLElement>("[data-section-reveal]")
          .forEach((element) => {
            if (revealHasPassed(element, 0.88)) {
              gsap.set(element, { clearProps: "transform,opacity" });
              return;
            }

            gsap.fromTo(
              element,
              { y: 14, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                duration: 0.42,
                ease: "power3.out",
                clearProps: "transform,opacity",
                scrollTrigger: {
                  trigger: element,
                  start: "top 88%",
                  once: true,
                },
              },
            );
          });

        const words = gsap.utils.toArray<HTMLElement>("[data-reveal-word]");
        gsap.set(words, { opacity: 0.28 });
        gsap.to(words, {
          opacity: 1,
          stagger: 0.055,
          ease: "none",
          scrollTrigger: {
            trigger: "[data-word-reveal]",
            start: "top 84%",
            end: "bottom 48%",
            scrub: 0.5,
          },
        });

        gsap.fromTo(
          "[data-memory-bar]",
          { scaleY: 0.2, opacity: 0.45 },
          {
            scaleY: 1,
            opacity: 1,
            duration: 0.62,
            stagger: 0.045,
            ease: "power3.out",
            clearProps: "transform,opacity",
            scrollTrigger: {
              trigger: "[data-memory-curve]",
              start: "top 88%",
              once: true,
            },
          },
        );

        const readinessPreview = root.current?.querySelector<HTMLElement>(
          "[data-readiness-preview]",
        );
        const readinessProgress =
          readinessPreview?.querySelector<SVGCircleElement>(
            "svg circle:nth-of-type(2)",
          );

        if (readinessPreview && readinessProgress) {
          const progressStart = Number(
            readinessProgress.getAttribute("stroke-dasharray"),
          );
          const progressTarget = Number(
            readinessProgress.getAttribute("stroke-dashoffset"),
          );

          gsap.fromTo(
            readinessProgress,
            { strokeDashoffset: progressStart },
            {
              strokeDashoffset: progressTarget,
              duration: 0.62,
              ease: "power3.out",
              clearProps: "strokeDashoffset",
              scrollTrigger: {
                trigger: readinessPreview,
                start: "top 84%",
                once: true,
              },
            },
          );
        }

        gsap.utils
          .toArray<HTMLElement>("[data-chapter-boundary]")
          .forEach((chapterBoundary) => {
            if (revealHasPassed(chapterBoundary, 0.9)) {
              gsap.set(chapterBoundary, {
                clearProps: "transform,opacity,transformOrigin",
              });
              return;
            }

            gsap.fromTo(
              chapterBoundary,
              {
                scaleX: 0.22,
                opacity: 0.2,
                transformOrigin: "center",
              },
              {
                scaleX: 1,
                opacity: 0.62,
                duration: 0.36,
                ease: "power3.out",
                clearProps: "transform,opacity,transformOrigin",
                scrollTrigger: {
                  trigger: chapterBoundary,
                  start: "top 90%",
                  once: true,
                },
              },
            );
          });

        gsap.utils
          .toArray<HTMLElement>("[data-stack-card]")
          .forEach((card) => {
            if (revealHasPassed(card, 0.82)) return;

            const artwork = card.querySelector<HTMLElement>(
              "[data-journey-artwork]",
            );
            const signal = card.querySelector<HTMLElement>(
              `.${styles.systemSignal} > span`,
            );
            if (!artwork || !signal) return;

            gsap
              .timeline({
                scrollTrigger: {
                  trigger: card,
                  start: "top 82%",
                  once: true,
                },
              })
              .fromTo(
                artwork,
                { y: 8, scale: 0.96, opacity: 0.52 },
                {
                  y: 0,
                  scale: 1,
                  opacity: 0.82,
                  duration: 0.28,
                  ease: "power3.out",
                  clearProps: "transform,opacity",
                },
              )
              .fromTo(
                signal,
                { scale: 0.8, opacity: 0.3 },
                {
                  scale: 1,
                  opacity: 1,
                  duration: 0.18,
                  ease: "power3.out",
                  clearProps: "transform,opacity",
                },
                0.08,
              );
          });

        return;
      }

      if (!wide) return;

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
          if (revealHasPassed(element, 0.8)) {
            gsap.set(element, { clearProps: "transform,opacity" });
            return;
          }

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

      const chapterBoundaries = gsap.utils.toArray<HTMLElement>(
        "[data-chapter-boundary]",
      );

      chapterBoundaries.forEach((chapterBoundary) => {
        gsap.fromTo(
          chapterBoundary,
          { opacity: 0.2, scaleX: 0.22 },
          {
            opacity: 0.82,
            scaleX: 1,
            ease: "none",
            scrollTrigger: {
              trigger: chapterBoundary,
              start: "top 96%",
              end: "top 66%",
              scrub: 0.7,
            },
          },
        );
      });

      gsap.utils
        .toArray<HTMLElement>("[data-stack-card]")
        .forEach((card, index) => {
          gsap.fromTo(
            card,
            { opacity: 0.72 },
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
          const artworkTimeline = gsap.timeline({
              scrollTrigger: {
                trigger: card,
                start: "top bottom",
                end: "bottom top",
                scrub: 0.6,
                onEnter: () => {
                  artwork.style.willChange = "transform, opacity";
                },
                onEnterBack: () => {
                  artwork.style.willChange = "transform, opacity";
                },
                onLeave: () => {
                  artwork.style.willChange = "auto";
                },
                onLeaveBack: () => {
                  artwork.style.willChange = "auto";
                },
              },
            });

          artworkTimeline.fromTo(
            artwork,
            { scale: 0.96, opacity: 0.52 },
            { scale: 1, opacity: 0.76, duration: 0.55, ease: "none" },
          );

          artworkTimeline.to(artwork, {
            scale: 1.025,
            opacity: 0.42,
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

        },
      );

      return () => motionMedia.revert();
    },
    { scope: root },
  );

  const revealSentence =
    "Не повторюйте все підряд. Повертайтеся до складних тем у потрібний момент.";

  return (
    <main
      ref={root}
      className={styles.page}
      data-theme={theme}
      suppressHydrationWarning
    >
      <script dangerouslySetInnerHTML={{ __html: landingThemeSyncScript }} />
      <a href="#system" className={styles.skipLink}>
        Перейти до змісту
      </a>
      <div className={styles.desktopLanding}>
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
              onPointerDown={() => setThemeInput("pointer")}
              onKeyDown={() => setThemeInput("keyboard")}
              data-animate={themeInput === "pointer" ? "true" : "false"}
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
            <Link href="/login" prefetch={false} className={styles.navLogin}>
              Увійти <SignInIcon size={17} aria-hidden="true" />
            </Link>
          </div>
        </nav>

        <div className={styles.heroContent}>
          <div className={styles.heroCopy}>
            <h1>
              Теорія, яка знає,
              <br className={styles.heroHeadingBreak} /> що вам повторити.
            </h1>
            <p data-hero-reveal>
              Персональний маршрут до іспиту замість нескінченного перегляду
              всіх питань.
            </p>
            <div className={styles.heroActions} data-hero-reveal>
              <LandingButton asChild>
                <Link href="/q/q_1_1" prefetch={false}>
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
                <span className={styles.heroMetric}>
                  <strong>{QUESTION_TOTAL_FMT}</strong> питання
                </span>
                <span className={styles.heroMetric}>
                  <strong>{IMAGE_TOTAL_FMT}</strong> з ілюстраціями
                </span>
                <span className={styles.heroMetric}>
                  <strong>{TOPIC_TOTAL}</strong> тем
                </span>
                <span className={styles.heroMetric}>
                  <strong>{CATEGORY_TOTAL}</strong> категорій
                </span>
              </p>
              <a
                href={OFFICIAL_CONTENT.sourcePage}
                target="_blank"
                rel="noreferrer"
              >
                <span className={styles.heroProofSourceText}>
                  Повна база ГСЦ МВС, наказ №{OFFICIAL_CONTENT.orderNumber} від{" "}
                  <span className={styles.heroProofSourceTail}>
                    {OFFICIAL_CONTENT.orderDate}
                    <ArrowUpRightIcon size={14} aria-hidden="true" />
                  </span>
                </span>
                <span className={styles.visuallyHidden}>
                  Відкриється в новій вкладці.
                </span>
              </a>
            </div>
          </div>
          <Image
            src={heroDevicePair}
            alt="Два смартфони з питанням і поясненням у Drivers School"
            loading="lazy"
            quality={75}
            sizes="(max-width: 560px) 1px, (max-width: 1100px) 42vw, 650px"
            className={styles.heroProductIllustration}
            data-hero-visual-reveal
          />
          <Image
            src={mobileHandheldPhone}
            alt=""
            loading="lazy"
            quality={60}
            sizes="(max-width: 560px) 96vw, 1px"
            className={styles.mobileHeroProduct}
            aria-hidden="true"
          />
        </div>
      </section>

      <div className={styles.capabilityRail}>
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

      <section className={styles.systemSection} id="system" tabIndex={-1}>
        <div className={styles.systemHeading} data-section-reveal>
          <p>Не збірник тестів</p>
          <h2>
            Система, що бачить{" "}
            <span className={styles.inlineRoad} aria-hidden="true">
              <Image
                src={inlineRouteStudy}
                alt=""
                fill
                loading="lazy"
                quality={60}
                sizes="132px"
                className={styles.inlineRoadImage}
              />
            </span>{" "}
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
                Сигнал спирається на покриття тем, стабільність і симуляції та
                підказує, що робити далі.
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
        <span
          className={styles.systemStatementBoundary}
          data-chapter-boundary
          aria-hidden="true"
        />
        <p>
          {revealSentence.split(" ").map((word, index) => (
            <span key={`${word}-${index}`} data-reveal-word>
              {word}{" "}
            </span>
          ))}
        </p>
      </section>

      <section className={styles.journeySection} id="route" data-journey>
        <span
          className={styles.statementJourneyBoundary}
          aria-hidden="true"
        >
          <span
            className={styles.systemStatementBoundary}
            data-chapter-boundary
          />
        </span>
        <div className={styles.journeyTitleTrack}>
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
        </div>
        <div
          className={styles.journeyCards}
          ref={journeyScrollerRef}
          onScroll={updateJourneyPosition}
          tabIndex={journeyIsScrollable ? 0 : undefined}
          role={journeyIsScrollable ? "region" : undefined}
          aria-label="Чотири зміни навчального маршруту"
          aria-describedby={journeyIsScrollable ? "journey-instructions" : undefined}
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
                  sizes="(max-width: 560px) 72px, (max-width: 900px) 100vw, 48vw"
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
        <p id="journey-instructions" className={styles.visuallyHidden}>
          Перегляньте чотири послідовні кроки навчального маршруту.
        </p>
        <div
          className={styles.journeyPosition}
          role="group"
          aria-label="Перейти до кроку маршруту"
        >
          {journey.map(({ title }, index) => (
            <button
              type="button"
              key={title}
              className={styles.journeyPositionButton}
              onClick={() => showJourneyStep(index)}
              aria-label={`Показати крок ${index + 1}: ${title}`}
              aria-current={activeJourneyIndex === index ? "step" : undefined}
            >
              <span
                className={`${styles.journeyPositionDot} ${
                  activeJourneyIndex === index
                    ? styles.journeyPositionDotActive
                    : ""
                }`}
                aria-hidden="true"
              />
            </button>
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
            <Link href="/register" prefetch={false}>
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

      <div className={styles.closingChapter}>
        <section className={styles.finalCta}>
          <Image
            src={finalReadinessRoute}
            alt=""
            fill
            loading="lazy"
            quality={60}
            sizes="100vw"
            className={styles.finalCtaImage}
            aria-hidden="true"
          />
          <div className={styles.finalCtaContent} data-section-reveal>
            <h2>Побач, як система пояснює відповідь.</h2>
            <LandingButton asChild>
              <Link href="/q/q_1_1" prefetch={false}>
                Спробувати питання без реєстрації{" "}
                <ArrowRightIcon size={18} aria-hidden="true" />
              </Link>
            </LandingButton>
          </div>
        </section>

        <footer className={styles.footer}>
          <div className={styles.footerBrand}>
            <Link href="/" className={styles.wordmark}>
              <span className={styles.wordmarkMark} aria-hidden="true">
                DS
              </span>
              <span>Drivers School</span>
            </Link>
            <p>Навчальний інструмент для підготовки до теоретичного іспиту ПДР.</p>
          </div>

          <nav className={styles.footerNav} aria-label="Посилання у підвалі">
            <div className={styles.footerLinkGroup}>
              <p>Сервіс</p>
              <Link href="/support">Підтримка</Link>
              <Link href="/contact">Контакти</Link>
              <Link href="/source">Джерело питань</Link>
            </div>
            <div className={styles.footerLinkGroup}>
              <p>Документи</p>
              <Link href="/terms">Умови</Link>
              <Link href="/privacy">Приватність</Link>
            </div>
            <Link href="/login" prefetch={false} className={styles.footerLogin}>
              Увійти
              <ArrowRightIcon size={16} aria-hidden="true" />
            </Link>
          </nav>
        </footer>
        </div>
      </div>
    </main>
  );
}
