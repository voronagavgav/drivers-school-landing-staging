"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Brain,
  CalendarClock,
  Check,
  ChevronDown,
  CircleGauge,
  CloudOff,
  Flag,
  RotateCcw,
  Route,
  ShieldCheck,
  Target,
} from "lucide-react";
import styles from "./landing.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const journey = [
  {
    title: "Спочатку діагностика",
    text: "Кілька відповідей показують не загальний бал, а конкретні прогалини у темах.",
    signal: "Фокус знайдено",
    icon: Target,
  },
  {
    title: "Потім потрібне повторення",
    text: "Складні питання повертаються за інтервалом, а засвоєні не забирають час.",
    signal: "12 карток на сьогодні",
    icon: Brain,
  },
  {
    title: "Помилки стають маршрутом",
    text: "Кожна невірна відповідь зберігає контекст і веде назад до слабкої теми.",
    signal: "Наступна тема: розмітка",
    icon: RotateCcw,
  },
  {
    title: "Фініш перевіряє симуляція",
    text: "Двадцять питань, двадцять хвилин і максимум дві помилки, як у форматі іспиту.",
    signal: "Режим іспиту готовий",
    icon: Flag,
  },
];

const feedback = [
  {
    title: "Ще недостатньо даних",
    text: "Drivers School не малює впевненість після однієї вдалої спроби. Спочатку система збирає достатньо відповідей.",
  },
  {
    title: "Цю тему варто повернути",
    text: "Точність зросла, але стабільність ще низька. У маршрут повертаються тільки потрібні картки.",
  },
  {
    title: "Можна переходити до симуляції",
    text: "Покриття тем, повторення та результати практики дають узгоджений сигнал готовності.",
  },
];

const faqs = [
  ["Чи можна спробувати без акаунта?", "Так. Одне реальне питання відкривається одразу, без реєстрації."],
  ["Що саме персоналізується?", "Черга повторення, слабкі теми, план до дати іспиту та наступна рекомендована дія."],
  ["Чим готовність відрізняється від відсотка правильних?", "Вона враховує стабільність знань, покриття тем і результати симуляцій, а не тільки останню спробу."],
  ["Повний доступ це підписка?", "Ні. 399 грн сплачуються один раз. Без підписки та автоматичних списань."],
];

export function LandingPage() {
  const root = useRef<HTMLElement>(null);
  const [feedbackIndex, setFeedbackIndex] = useState(0);

  useGSAP(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    gsap.from("[data-hero-reveal]", {
      y: 28,
      opacity: 0,
      duration: 1,
      stagger: 0.1,
      ease: "power3.out",
    });

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

    gsap.utils.toArray<HTMLElement>("[data-stack-card]").forEach((card, index) => {
      gsap.fromTo(card,
        { y: 70, opacity: 0.35 },
        {
          y: 0,
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: card,
            start: "top 92%",
            end: "top 54%",
            scrub: true,
          },
        }
      );
      card.style.zIndex = String(index + 1);
    });

    return () => media.revert();
  }, { scope: root });

  const activeFeedback = feedback[feedbackIndex];
  const revealSentence = "Ти не мусиш вчити більше. Тобі потрібно вчасно повертатися до того, що ще не стало знанням.";

  return (
    <main ref={root} className={styles.page}>
      <section className={styles.hero}>
        <Image
          src="/landing-generated/theory-room-road.webp"
          alt="Тиха аудиторія з видом на міську дорогу перед вечірнім заняттям"
          fill
          priority
          className={styles.heroImage}
          sizes="100vw"
        />
        <div className={styles.heroOverlay} />

        <nav className={styles.nav} aria-label="Основна навігація" data-hero-reveal>
          <Link href="/" className={styles.wordmark} aria-label="Drivers School, головна">
            <span className={styles.wordmarkMark}>DS</span>
            <span>Drivers School</span>
          </Link>
          <div className={styles.navCenter}>
            <a href="#system">Система</a>
            <a href="#route">Маршрут</a>
            <a href="#access">Доступ</a>
          </div>
          <Link href="/login" className={styles.navLogin}>Увійти <ArrowUpRight size={16} /></Link>
        </nav>

        <div className={styles.heroContent}>
          <div className={styles.heroCopy}>
            <h1 data-hero-reveal>Теорія, яка знає, що тобі повторити.</h1>
            <p data-hero-reveal>
              Персональний маршрут до іспиту замість нескінченного перегляду всіх питань.
            </p>
            <div className={styles.heroActions} data-hero-reveal>
              <Link href="/q/q_1_1" className={styles.primaryButton}>
                Спробувати питання <ArrowRight size={18} />
              </Link>
              <Link href="/register" className={styles.heroSecondary}>Створити акаунт</Link>
            </div>
          </div>
          <div className={styles.heroAside} data-hero-reveal>
            <p>Діагностика</p>
            <span />
            <p>Розумне повторення</p>
            <span />
            <p>Чесна готовність</p>
          </div>
        </div>
      </section>

      <div className={styles.capabilityRail} aria-hidden="true">
        <div>
          <span>Офіційні питання</span><i />
          <span>Розклад повторень</span><i />
          <span>Банк помилок</span><i />
          <span>Симулятор іспиту</span><i />
          <span>Робота офлайн</span><i />
          <span>Офіційні питання</span><i />
          <span>Розклад повторень</span><i />
          <span>Банк помилок</span><i />
          <span>Симулятор іспиту</span><i />
          <span>Робота офлайн</span><i />
        </div>
      </div>

      <section className={styles.systemSection} id="system">
        <div className={styles.systemHeading}>
          <p>Не збірник тестів</p>
          <h2>
            Система, що бачить <span className={styles.inlineRoad} aria-hidden="true" /> не бал, а знання.
          </h2>
        </div>

        <div className={styles.bento}>
          <article className={`${styles.bentoCard} ${styles.memoryCard}`}>
            <div className={styles.cardIcon}><Brain size={21} /></div>
            <h3>Пам&apos;ятає твій темп</h3>
            <p>Алгоритм планує повернення до картки до того, як відповідь забудеться.</p>
            <div className={styles.memoryCurve} aria-hidden="true">
              {[82, 64, 45, 71, 52, 88, 69, 94].map((value, index) => (
                <span key={index} style={{ height: `${value}%` }} />
              ))}
              <i>сьогодні</i>
            </div>
          </article>

          <article className={`${styles.bentoCard} ${styles.readinessCard}`}>
            <div>
              <div className={styles.cardIcon}><CircleGauge size={21} /></div>
              <h3>Готовність без самообману</h3>
              <p>Сигнал спирається на покриття тем, стабільність і симуляції.</p>
            </div>
            <div className={styles.readinessDial} aria-label="Приклад індикатора готовності">
              <strong>даних<br />ще мало</strong>
            </div>
          </article>

          <article className={`${styles.bentoCard} ${styles.examCard}`}>
            <Flag size={24} />
            <h3>20 / 20 / 2</h3>
            <p>Питання, хвилини, допустимі помилки.</p>
          </article>

          <article className={`${styles.bentoCard} ${styles.offlineCard}`}>
            <CloudOff size={24} />
            <h3>Маршрут не зникає без мережі.</h3>
          </article>
        </div>
      </section>

      <section className={styles.statement} data-word-reveal>
        <p>
          {revealSentence.split(" ").map((word, index) => (
            <span key={`${word}-${index}`} data-reveal-word>{word}{" "}</span>
          ))}
        </p>
      </section>

      <section className={styles.journeySection} id="route" data-journey>
        <div className={styles.journeyTitle} data-journey-title>
          <p>Від першої відповіді</p>
          <h2>Один маршрут.<br />Чотири точні зміни.</h2>
          <span>Система перебудовується після кожної навчальної дії.</span>
        </div>
        <div className={styles.journeyCards}>
          {journey.map(({ title, text, signal, icon: Icon }) => (
            <article key={title} data-stack-card>
              <div className={styles.journeyCardTop}>
                <Icon size={25} />
                <Route size={18} />
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
              <div className={styles.systemSignal}><span />{signal}</div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.accordionSection}>
        <div className={styles.accordionIntro}>
          <h2>Кожен режим має одну роботу.</h2>
          <p>Наведи курсор або торкнися, щоб побачити роль кожного інструмента.</p>
        </div>
        <div className={styles.horizontalAccordion}>
          <article tabIndex={0}>
            <CalendarClock size={24} />
            <div><h3>Сьогодні</h3><p>Коротка черга того, що потрібно закріпити саме зараз.</p></div>
          </article>
          <article tabIndex={0}>
            <Target size={24} />
            <div><h3>Теми</h3><p>Карта сильних і слабких зон без декоративних рейтингів.</p></div>
          </article>
          <article tabIndex={0}>
            <RotateCcw size={24} />
            <div><h3>Помилки</h3><p>Контекст невірної відповіді та шлях назад до правила.</p></div>
          </article>
          <article tabIndex={0}>
            <Flag size={24} />
            <div><h3>Іспит</h3><p>Час, ліміт помилок і тиша, потрібна для чесної перевірки.</p></div>
          </article>
        </div>
      </section>

      <section className={styles.feedbackSection}>
        <div className={styles.feedbackHeader}>
          <div>
            <p>Система говорить прямо</p>
            <h2>Зворотний зв&apos;язок без порожньої похвали.</h2>
          </div>
          <div className={styles.carouselControls}>
            <button
              type="button"
              onClick={() => setFeedbackIndex((feedbackIndex - 1 + feedback.length) % feedback.length)}
              aria-label="Попередній сигнал"
            ><ArrowLeft size={20} /></button>
            <button
              type="button"
              onClick={() => setFeedbackIndex((feedbackIndex + 1) % feedback.length)}
              aria-label="Наступний сигнал"
            ><ArrowRight size={20} /></button>
          </div>
        </div>
        <div className={styles.feedbackBody} aria-live="polite">
          <div className={styles.feedbackMeter}>
            <span style={{ width: `${((feedbackIndex + 1) / feedback.length) * 100}%` }} />
          </div>
          <p className={styles.feedbackQuote}>{activeFeedback.title}</p>
          <p className={styles.feedbackExplanation}>{activeFeedback.text}</p>
          <span className={styles.feedbackCount}>{feedbackIndex + 1} / {feedback.length}</span>
        </div>
      </section>

      <section className={styles.accessSection} id="access">
        <div className={styles.accessCopy}>
          <p>Контент залишається відкритим</p>
          <h2>Плати за навігацію, не за право вчитися.</h2>
          <p>Питання можна проходити безкоштовно. Повний доступ додає персональну систему рішень.</p>
        </div>
        <div className={styles.accessPanel}>
          <div className={styles.price}><strong>399</strong><span>грн<br />одноразово</span></div>
          <ul>
            <li><Check size={18} /> Розумне повторення</li>
            <li><Check size={18} /> План до дати іспиту</li>
            <li><Check size={18} /> Оцінка готовності</li>
            <li><Check size={18} /> Робота офлайн</li>
          </ul>
          <Link href="/register" className={styles.primaryButton}>Побудувати свій маршрут <ArrowRight size={18} /></Link>
          <p className={styles.subscriptionNote}><ShieldCheck size={16} /> Без підписки та автоматичних списань</p>
        </div>
      </section>

      <section className={styles.faqSection}>
        <h2>Перед стартом.</h2>
        <div className={styles.faqList}>
          {faqs.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}<ChevronDown size={20} /></summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.finalCta}>
        <div className={styles.finalCtaImage} aria-hidden="true" />
        <div className={styles.finalCtaContent}>
          <p>Почни без анкети та обіцянок</p>
          <h2>Одне питання. Потім система покаже шлях.</h2>
          <Link href="/q/q_1_1" className={styles.primaryButton}>Спробувати зараз <ArrowRight size={18} /></Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <Link href="/" className={styles.wordmark}><span className={styles.wordmarkMark}>DS</span><span>Drivers School</span></Link>
        <p>Навчальний інструмент для підготовки до теоретичного іспиту ПДР.</p>
        <div><a href="#system">Система</a><a href="#access">Доступ</a><Link href="/login">Увійти</Link></div>
      </footer>
    </main>
  );
}
