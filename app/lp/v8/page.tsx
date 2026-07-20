"use client";

import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { Golos_Text } from "next/font/google";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  Check,
  X,
  Clock,
  Target,
  ListChecks,
  ShieldCheck,
  ChevronDown,
  GraduationCap,
  Timer,
  Route,
} from "lucide-react";
import { copy, HERO_VARIANT } from "./copy";

const golos = Golos_Text({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "700", "800"],
  display: "swap",
  variable: "--font-golos",
});

const hero = copy.hero;
const hv = copy.hero[HERO_VARIANT];

/* --------------------------- reduced-motion hook --------------------------- */
function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const on = () => setReduce(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduce;
}

/* ------------------------------ readiness dial ----------------------------- */
function Dial({
  v,
  size = 188,
  stroke = 13,
}: {
  v: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, v));
  const off = c * (1 - clamped / 100);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="block"
        aria-hidden
      >
        <defs>
          <linearGradient id="v8dialgrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#A79BFF" />
            <stop offset="100%" stopColor="#6E5BFF" />
          </linearGradient>
          <filter
            id="v8dialglow"
            x="-60%"
            y="-60%"
            width="220%"
            height="220%"
          >
            <feGaussianBlur stdDeviation="4.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#F2F0FF"
            strokeOpacity={0.09}
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="url(#v8dialgrad)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={off}
            filter="url(#v8dialglow)"
          />
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-(family-name:--font-golos) text-5xl font-extrabold leading-none tracking-tight text-[#F2F0FF]">
          {Math.round(clamped)}
        </span>
        <span className="mt-1 text-[13px] font-medium tracking-wide text-[#8E88C4]">
          готовність
        </span>
      </div>
    </div>
  );
}

/* ------------------------- luminous periwinkle pill ------------------------ */
function PrimaryPill({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group/pill relative inline-flex items-center gap-2.5 rounded-full bg-[#C9C4FF] pl-6 pr-2.5 py-2.5 text-[15px] font-semibold text-[#1A1740] shadow-[0_0_0_1px_rgba(201,196,255,0.4),0_18px_50px_-12px_rgba(110,91,255,0.65)] transition-[transform,box-shadow] duration-300 ease-out hover:shadow-[0_0_0_1px_rgba(201,196,255,0.6),0_24px_60px_-10px_rgba(110,91,255,0.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9C4FF]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14122B] ${className}`}
    >
      <span>{children}</span>
      <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-[#8271FF] to-[#6E5BFF] text-white transition-transform duration-300 ease-out group-hover/pill:translate-x-1">
        <ArrowRight className="size-4" strokeWidth={2.4} />
      </span>
    </Link>
  );
}

const GHOST_CLASS =
  "inline-flex items-center justify-center rounded-full border border-[#F2F0FF]/15 px-6 py-2.5 text-[15px] font-medium text-[#C9C6E8] transition-colors duration-200 hover:border-[#F2F0FF]/30 hover:text-[#F2F0FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2F0FF]/25";

function GhostButton({
  onClick,
  children,
  className = "",
}: {
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button type="button" onClick={onClick} className={`${GHOST_CLASS} ${className}`}>
      {children}
    </button>
  );
}

/* ------------------------------ section header ----------------------------- */
function SectionHead({
  caption,
  heading,
  highlight,
  body,
  light = false,
}: {
  caption: string;
  heading: readonly string[] | string;
  highlight?: string;
  body?: string;
  light?: boolean;
}) {
  const lines = Array.isArray(heading) ? heading : [heading];
  return (
    <div className="max-w-2xl">
      <p
        className={`text-[13px] font-medium tracking-wide ${
          light ? "text-[#6E5BFF]" : "text-[#8E88C4]"
        }`}
      >
        {caption}
      </p>
      <h2
        className={`mt-4 text-balance font-(family-name:--font-golos) text-[clamp(1.9rem,4.6vw,3.1rem)] font-extrabold leading-[1.04] tracking-[-0.015em] ${
          light ? "text-[#1A1740]" : "text-[#F2F0FF]"
        }`}
      >
        {lines.map((ln, i) => (
          <span key={i} className="block">
            {highlight && ln.includes(highlight) ? (
              <>
                {ln.slice(0, ln.indexOf(highlight))}
                <span className="text-[#C9C4FF]">{highlight}</span>
              </>
            ) : (
              ln
            )}
          </span>
        ))}
      </h2>
      {body && (
        <p
          className={`mt-5 max-w-xl text-pretty text-[17px] leading-[1.65] ${
            light ? "text-[#4A4568]" : "text-[#C9C6E8]"
          }`}
        >
          {body}
        </p>
      )}
    </div>
  );
}

/* ------------------------ hero interactive question ------------------------ */
function HeroQuestion({
  onAnswered,
}: {
  onAnswered: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const d = hero.demo;
  const answered = picked !== null;
  const correct = answered && d.options[picked!].correct;

  return (
    <div className="w-full rounded-2xl border border-[#F2F0FF]/10 bg-[#1E1B3A] p-5 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.8)]">
      <div className="flex items-center gap-2 text-[12px] font-medium text-[#8E88C4]">
        <span className="flex size-5 items-center justify-center rounded-full bg-[#6E5BFF]/15 text-[#A79BFF]">
          <Check className="size-3" strokeWidth={2.6} />
        </span>
        {d.kicker}
      </div>
      <p className="mt-3 text-[15px] font-medium leading-snug text-[#F2F0FF]">
        {d.question}
      </p>
      <div className="mt-4 flex flex-col gap-2" role="group" aria-label={d.question}>
        {d.options.map((o, i) => {
          const isPicked = picked === i;
          const showCorrect = answered && o.correct;
          const showWrong = answered && isPicked && !o.correct;
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => {
                if (answered) return;
                setPicked(i);
                onAnswered(o.correct);
              }}
              className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-left text-[14px] font-medium transition-colors duration-200 ${
                showCorrect
                  ? "border-[#6E5BFF]/60 bg-[#6E5BFF]/15 text-[#F2F0FF]"
                  : showWrong
                    ? "border-[#F2A0B4]/40 bg-[#F2A0B4]/10 text-[#F6D6DE]"
                    : "border-[#F2F0FF]/10 bg-[#14122B]/40 text-[#C9C6E8] hover:border-[#F2F0FF]/25 hover:text-[#F2F0FF] disabled:hover:border-[#F2F0FF]/10"
              }`}
            >
              {o.label}
              {showCorrect && <Check className="size-4 text-[#A79BFF]" strokeWidth={2.6} />}
              {showWrong && <X className="size-4 text-[#F2A0B4]" strokeWidth={2.6} />}
            </button>
          );
        })}
      </div>
      <div aria-live="polite">
        {answered && (
          <p
            className={`mt-3 text-[13px] leading-relaxed ${
              correct ? "text-[#A79BFF]" : "text-[#F2A0B4]"
            }`}
          >
            {correct ? d.explainCorrect : d.explainWrong}
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- FAQ item ---------------------------------- */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#F2F0FF]/8">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-[16px] font-semibold text-[#F2F0FF]">{q}</span>
        <ChevronDown
          className={`size-5 shrink-0 text-[#8E88C4] transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <p className="pb-5 pr-8 text-[15px] leading-[1.65] text-[#C9C6E8]">{a}</p>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- page ------------------------------------ */
export default function V8Page() {
  const reduce = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const layer2 = useRef<HTMLDivElement>(null);
  const layer3 = useRef<HTMLDivElement>(null);

  // hero readiness meter (ticks up from 0 on first answer)
  const [heroV, setHeroV] = useState(0);
  const heroTween = useRef<gsap.core.Tween | null>(null);
  const onHeroAnswer = useCallback(
    (correct: boolean) => {
      const target = correct ? 31 : 17;
      if (reduce) {
        setHeroV(target);
        return;
      }
      const proxy = { v: heroV };
      heroTween.current?.kill();
      heroTween.current = gsap.to(proxy, {
        v: target,
        duration: 0.9,
        ease: "power3.out",
        onUpdate: () => setHeroV(proxy.v),
      });
    },
    [heroV, reduce],
  );

  // decaying dial in the dial-demo section
  const [decayV, setDecayV] = useState(84);
  useEffect(() => {
    if (reduce) {
      setDecayV(72);
      return;
    }
    const proxy = { v: 84 };
    const tw = gsap.to(proxy, {
      v: 61,
      duration: 5.5,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
      onUpdate: () => setDecayV(proxy.v),
    });
    return () => {
      tw.kill();
    };
  }, [reduce]);

  // ambient gradient hue-shift + entrance choreography
  useEffect(() => {
    if (!root.current) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context((self) => {
      if (!reduce) {
        // hue-shift: cross-fade deeper layers in as the page scrolls
        gsap.to(layer2.current, {
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "45% top",
            scrub: true,
          },
        });
        gsap.to(layer3.current, {
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "45% top",
            end: "bottom bottom",
            scrub: true,
          },
        });

        // hero headline + orbiting cards entrance
        gsap.from("[data-hero-rise]", {
          y: 24,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.08,
        });
        const orbit = gsap.utils.toArray<HTMLElement>("[data-orbit]");
        gsap.from(orbit, {
          y: 30,
          opacity: 0,
          duration: 1,
          ease: "power3.out",
          delay: 0.35,
          stagger: 0.15,
        });
        // idle float loop, desynced, paused off-screen
        orbit.forEach((el, i) => {
          gsap.to(el, {
            y: "+=7",
            duration: 4 + i * 0.9,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
            delay: 1 + i * 0.4,
            scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", toggleActions: "resume pause resume pause" },
          });
        });

        // section reveals — enhance an ALREADY-VISIBLE default (never gate
        // visibility on the trigger). fromTo with immediateRender:false keeps
        // content painted for headless/hidden-tab renders; motion is a bonus.
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
          gsap.fromTo(
            el,
            { y: 24, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.8,
              ease: "power3.out",
              immediateRender: false,
              scrollTrigger: { trigger: el, start: "top 88%", once: true },
            },
          );
        });

        // proof counters
        gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
          const end = Number(el.dataset.count);
          const o = { n: 0 };
          gsap.to(o, {
            n: end,
            duration: 1.4,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 85%" },
            onUpdate: () => {
              el.textContent = Math.round(o.n).toLocaleString("uk-UA").replace(/ /g, " ");
            },
          });
        });
      }
    }, root);
    return () => ctx.revert();
  }, [reduce]);

  // «Спробувати без реєстрації» → the in-page, no-network hero question demo.
  // Honest: the label promises no registration, so it must NOT go to /register.
  const scrollToDemo = useCallback(() => {
    const el = document.getElementById("hero-demo");
    if (!el) return;
    el.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "center",
    });
    const firstBtn = el.querySelector<HTMLButtonElement>("button");
    if (firstBtn) window.setTimeout(() => firstBtn.focus(), reduce ? 0 : 500);
  }, [reduce]);

  // date-plan interactive preview
  const [days, setDays] = useState<number | null>(null);
  const onDate = (val: string) => {
    if (!val) {
      setDays(null);
      return;
    }
    const target = new Date(val + "T00:00:00");
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = Math.round((target.getTime() - now.getTime()) / 86400000);
    setDays(diff);
  };
  // POOL = the official category-B question bank surfaced across the page (2322).
  // MAX_PER_DAY caps the display at a realistic daily study ceiling — the plan
  // SPREADS the bank, it never asks you to clear it "all at once".
  const POOL = 2322;
  const MAX_PER_DAY = 60;
  const past = days !== null && days <= 0;
  const plan =
    days === null || past
      ? null
      : {
          intensive: days < 7,
          perDay: Math.min(MAX_PER_DAY, Math.max(10, Math.ceil(POOL / days))),
          d: days,
        };

  return (
    <div
      ref={root}
      className={`${golos.variable} relative min-h-screen w-full overflow-x-hidden bg-[#14122B] font-(family-name:--font-golos) text-[#F2F0FF] antialiased`}
    >
      {/* ---------- ambient background (fixed, full-bleed, hue-shifting) ---------- */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        {/* base: violet glow low-center over indigo, edges falling to near-black */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 72%, #2A2154 0%, #191539 38%, #14122B 62%, #0E0C20 100%)",
          }}
        />
        {/* mid-page: deeper blue wash */}
        <div
          ref={layer2}
          className="absolute inset-0 opacity-0"
          style={{
            background:
              "radial-gradient(130% 100% at 50% 45%, #1A2150 0%, #121634 45%, #0D0C22 100%)",
          }}
        />
        {/* footer: near-black */}
        <div
          ref={layer3}
          className="absolute inset-0 opacity-0"
          style={{
            background:
              "radial-gradient(120% 110% at 50% 30%, #14122B 0%, #0E0C20 55%, #08070F 100%)",
          }}
        />
      </div>

      {/* ------------------------------- nav ------------------------------------ */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[17px] font-extrabold tracking-tight text-[#F2F0FF]">
            {copy.nav.brand}
          </span>
          <span className="hidden text-[13px] font-medium text-[#8E88C4] sm:inline">
            {copy.nav.tagline}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-full px-4 py-2.5 text-[14px] font-medium text-[#C9C6E8] transition-colors hover:text-[#F2F0FF]"
          >
            {copy.nav.login}
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-[#F2F0FF]/8 px-4 py-2.5 text-[14px] font-semibold text-[#F2F0FF] transition-colors hover:bg-[#F2F0FF]/14"
          >
            {copy.nav.cta}
          </Link>
        </div>
      </header>

      {/* ------------------------------- hero ----------------------------------- */}
      <section className="relative mx-auto w-full max-w-6xl px-5 pb-24 pt-10 sm:px-8 sm:pt-16 lg:pt-20">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          {/* left: headline column */}
          <div className="relative z-10">
            <p
              data-hero-rise
              className="text-[15px] font-medium leading-relaxed text-[#9A94CE]"
            >
              {hero.hook}{" "}
              <span className="text-[#8E88C4]">· {hero.hookNote}</span>
            </p>
            <h1
              data-hero-rise
              className="mt-5 text-balance font-(family-name:--font-golos) text-[clamp(2.9rem,8vw,5.4rem)] font-extrabold leading-[0.98] tracking-[-0.02em] text-[#F2F0FF]"
            >
              {hv.headline.map((ln, i) => (
                <span key={i} className="block">
                  {ln === hv.highlight ? (
                    <span className="text-[#6E5BFF]">{ln}</span>
                  ) : (
                    ln
                  )}
                </span>
              ))}
            </h1>
            <p
              data-hero-rise
              className="mt-6 max-w-lg text-pretty text-[18px] leading-[1.6] text-[#C9C6E8]"
            >
              {hv.subhead}
            </p>
            <div
              data-hero-rise
              className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"
            >
              <PrimaryPill href="/register" className="justify-center sm:justify-start">
                {hero.ctaPrimary}
              </PrimaryPill>
              <GhostButton onClick={scrollToDemo} className="justify-center">
                {hero.ctaSecondary}
              </GhostButton>
            </div>
            <ul
              data-hero-rise
              className="mt-8 flex flex-wrap gap-x-2 gap-y-2 text-[13px]"
            >
              {hero.chips.map((c) => (
                <li
                  key={c}
                  className="rounded-full border border-[#F2F0FF]/10 bg-[#1E1B3A]/60 px-3 py-1.5 font-medium text-[#B9B4E0]"
                >
                  {c}
                </li>
              ))}
            </ul>
          </div>

          {/* right: orbiting product cards (constellation at 3 depths) */}
          <div className="relative lg:min-h-[540px]">
            <div
              id="hero-demo"
              data-orbit
              className="relative z-20 scroll-mt-24 lg:absolute lg:right-0 lg:top-0 lg:w-[380px]"
            >
              <HeroQuestion onAnswered={onHeroAnswer} />
            </div>

            <div
              data-orbit
              className="mt-5 flex items-center gap-4 rounded-2xl border border-[#F2F0FF]/10 bg-[#1E1B3A] p-5 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.8)] lg:absolute lg:left-0 lg:top-[358px] lg:z-10 lg:mt-0 lg:w-[276px]"
            >
              <Dial v={heroV} size={100} stroke={9} />
              <div aria-live="polite">
                <p className="text-[13px] font-medium text-[#8E88C4]">
                  {hero.dialCard.label}
                </p>
                <p className="mt-1 text-[13px] leading-snug text-[#C9C6E8]">
                  {heroV > 0 ? hero.dialCard.captionAfter : hero.demo.meterHint}
                </p>
                {heroV > 0 && (
                  <span className="sr-only">
                    Готовність {Math.round(heroV)} зі 100
                  </span>
                )}
              </div>
            </div>

            <div
              data-orbit
              className="mt-5 inline-flex items-center gap-3 rounded-2xl border border-[#F2F0FF]/10 bg-[#1E1B3A] px-5 py-3.5 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.8)] lg:absolute lg:right-2 lg:top-[470px] lg:z-20 lg:mt-0"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-[#6E5BFF]/15 text-[#A79BFF]">
                <Route className="size-[18px]" strokeWidth={2.2} />
              </span>
              <div>
                <p className="text-[12px] font-medium text-[#8E88C4]">
                  {hero.planChip.label}
                </p>
                <p className="text-[15px] font-semibold text-[#F2F0FF]">
                  {hero.planChip.value}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------- readiness dial demo -------------------------- */}
      <section className="relative mx-auto w-full max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
        <div className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div data-reveal className="order-2 flex flex-col items-center lg:order-1">
            <div className="relative flex flex-col items-center rounded-3xl border border-[#F2F0FF]/8 bg-[#1E1B3A] px-10 py-12 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.85)]">
              <Dial v={decayV} size={210} stroke={15} />
              <p className="mt-6 max-w-[240px] text-center text-[13.5px] leading-relaxed text-[#8E88C4]">
                {copy.dial.decayNote}
              </p>
            </div>
          </div>
          <div data-reveal className="order-1 lg:order-2">
            <SectionHead
              caption={copy.dial.caption}
              heading={copy.dial.heading}
              highlight={copy.dial.highlight}
              body={copy.dial.body}
            />
            <div className="mt-9 space-y-6">
              {copy.dial.points.map((p) => (
                <div key={p.title} className="flex gap-4">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#A79BFF]/80" />
                  <div>
                    <p className="text-[16px] font-semibold text-[#F2F0FF]">
                      {p.title}
                    </p>
                    <p className="mt-1 max-w-md text-[15px] leading-[1.6] text-[#C9C6E8]">
                      {p.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------- exam-date plan ----------------------------- */}
      <section className="relative mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <div data-reveal>
            <SectionHead
              caption={copy.datePlan.caption}
              heading={copy.datePlan.heading}
              highlight={copy.datePlan.highlight}
              body={copy.datePlan.body}
            />
            <p className="mt-6 max-w-md text-[14px] leading-[1.6] text-[#9A94CE]">
              {copy.datePlan.topics}
            </p>
          </div>
          <div
            data-reveal
            className="rounded-3xl border border-[#F2F0FF]/8 bg-[#1E1B3A] p-7 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.85)]"
          >
            <label
              htmlFor="v8-exam-date"
              className="block text-[13px] font-medium text-[#8E88C4]"
            >
              {copy.datePlan.inputLabel}
            </label>
            <input
              id="v8-exam-date"
              type="date"
              onChange={(e) => onDate(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[#F2F0FF]/12 bg-[#14122B] px-4 py-3 text-[16px] text-[#F2F0FF] outline-none transition-colors focus:border-[#6E5BFF]/60 [color-scheme:dark]"
            />
            <div className="mt-6 rounded-2xl border border-[#F2F0FF]/8 bg-[#14122B]/60 p-6">
              {days === null ? (
                <p className="text-[15px] leading-relaxed text-[#9A94CE]">
                  {copy.datePlan.noDate}
                </p>
              ) : past || plan === null ? (
                <p className="text-[15px] leading-relaxed text-[#F2A0B4]">
                  {copy.datePlan.pastDate}
                </p>
              ) : (
                <div>
                  <p className="font-(family-name:--font-golos) text-[clamp(1.5rem,4vw,2.1rem)] font-extrabold tracking-tight text-[#F2F0FF]">
                    {copy.datePlan.resultTemplate(Math.max(1, plan.d), plan.perDay)}
                  </p>
                  <p className="mt-2 text-[14px] text-[#C9C6E8]">
                    {plan.intensive
                      ? copy.datePlan.intensiveTemplate(Math.max(1, plan.d), plan.perDay)
                      : copy.datePlan.resultSub}
                  </p>
                  {plan.intensive && (
                    <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#6E5BFF]/15 px-3 py-1 text-[12px] font-semibold text-[#A79BFF]">
                      <Clock className="size-3.5" /> {copy.datePlan.intensiveLabel}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="mt-6">
              <PrimaryPill href="/register">{copy.datePlan.cta}</PrimaryPill>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------- exam simulator ----------------------------- */}
      <section className="relative mx-auto w-full max-w-6xl px-5 py-24 sm:px-8 sm:py-28">
        <div data-reveal className="text-center">
          <p className="text-[13px] font-medium tracking-wide text-[#8E88C4]">
            {copy.simulator.caption}
          </p>
          <h2 className="mx-auto mt-4 max-w-3xl text-balance font-(family-name:--font-golos) text-[clamp(2.2rem,6vw,4rem)] font-extrabold leading-[1.02] tracking-[-0.02em] text-[#F2F0FF]">
            {copy.simulator.heading.join("  ")}
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-[17px] leading-[1.65] text-[#C9C6E8]">
            {copy.simulator.body}
          </p>
        </div>
        <div
          data-reveal
          className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-px overflow-hidden rounded-3xl border border-[#F2F0FF]/8 bg-[#F2F0FF]/8 sm:grid-cols-3"
        >
          {copy.simulator.format.map((f, i) => (
            <div
              key={i}
              className="flex flex-col items-center bg-[#1E1B3A] px-6 py-10 text-center"
            >
              <span className="font-(family-name:--font-golos) text-[clamp(3rem,7vw,4.4rem)] font-extrabold leading-none tracking-tight text-[#F2F0FF]">
                {f.k}
              </span>
              <span className="mt-3 text-[14px] font-medium text-[#9A94CE]">
                {f.label}
              </span>
            </div>
          ))}
        </div>
        <p
          data-reveal
          className="mx-auto mt-8 flex max-w-xl items-center justify-center gap-2 text-center text-[15px] text-[#A79BFF]"
        >
          <ShieldCheck className="size-4.5 shrink-0" strokeWidth={2} />
          {copy.simulator.calmLine}
        </p>
      </section>

      {/* -------------------- pricing (warm light interstitial) ----------------- */}
      <section className="relative">
        <div className="bg-[#F5F2EC]">
          <div className="mx-auto w-full max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
            <div data-reveal className="mx-auto max-w-2xl text-center">
              <p className="text-[13px] font-medium tracking-wide text-[#5646E0]">
                {copy.pricing.caption}
              </p>
              <h2 className="mt-4 text-balance font-(family-name:--font-golos) text-[clamp(2rem,5vw,3.2rem)] font-extrabold leading-[1.05] tracking-[-0.015em] text-[#1A1740]">
                {copy.pricing.heading}
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-pretty text-[17px] leading-[1.6] text-[#4A4568]">
                {copy.pricing.body}
              </p>
            </div>

            <div
              data-reveal
              className="mx-auto mt-14 grid max-w-4xl gap-6 lg:grid-cols-[1fr_1.15fr]"
            >
              {/* free column */}
              <div className="rounded-3xl border border-[#1A1740]/10 bg-white/70 p-8">
                <p className="text-[14px] font-semibold text-[#4A4568]">
                  {copy.pricing.freeTitle}
                </p>
                <p className="mt-3 font-(family-name:--font-golos) text-[2rem] font-extrabold tracking-tight text-[#1A1740]">
                  0 ₴
                </p>
                <ul className="mt-6 space-y-3">
                  {copy.pricing.free.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-[15px] text-[#2A2545]">
                      <Check className="mt-0.5 size-4 shrink-0 text-[#6E5BFF]" strokeWidth={2.6} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* paid column */}
              <div className="relative rounded-3xl border border-[#6E5BFF]/25 bg-white p-8 shadow-[0_40px_90px_-50px_rgba(110,91,255,0.5)]">
                <div className="flex items-baseline justify-between">
                  <p className="text-[14px] font-semibold text-[#6E5BFF]">
                    {copy.pricing.paidTitle}
                  </p>
                  <span className="rounded-full bg-[#1A1740]/6 px-2.5 py-1 text-[12px] font-semibold text-[#4A4568]">
                    {copy.pricing.priceUnit}
                  </span>
                </div>
                <p className="mt-3 flex items-baseline gap-2">
                  <span className="font-(family-name:--font-golos) text-[2.6rem] font-extrabold tracking-tight text-[#1A1740]">
                    {copy.pricing.price}
                  </span>
                </p>
                <p className="mt-1 text-[14px] leading-relaxed text-[#4A4568]">
                  {copy.pricing.priceFrame}
                </p>
                <ul className="mt-6 space-y-3">
                  {copy.pricing.paid.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-[15px] text-[#2A2545]">
                      <Check className="mt-0.5 size-4 shrink-0 text-[#6E5BFF]" strokeWidth={2.6} />
                      {f}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-[14px] font-medium text-[#2A2545]">
                  {copy.pricing.anchor}
                </p>
                <div className="mt-6">
                  <Link
                    href="/register"
                    className="group/pill flex w-full items-center justify-center gap-2.5 rounded-full bg-[#1A1740] py-3.5 text-[15px] font-semibold text-[#F2F0FF] transition-transform hover:scale-[1.01]"
                  >
                    {copy.pricing.cta}
                    <ArrowRight className="size-4 transition-transform group-hover/pill:translate-x-1" strokeWidth={2.4} />
                  </Link>
                </div>
                <p className="mt-3 text-center text-[12.5px] text-[#726CA0]">
                  {copy.pricing.ctaNote}
                </p>
              </div>
            </div>

            {/* completion offer + trust band */}
            <div data-reveal className="mx-auto mt-8 max-w-4xl">
              <p className="rounded-2xl border border-[#1A1740]/10 bg-white/50 px-6 py-5 text-center text-[14.5px] leading-relaxed text-[#4A4568]">
                {copy.pricing.completion}
              </p>
              <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[14px] font-medium text-[#2A2545]">
                {copy.pricing.trust.map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-[#6E5BFF]" strokeWidth={2} />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------- honest proof ------------------------------ */}
      <section className="relative mx-auto w-full max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
        <div data-reveal>
          <SectionHead
            caption={copy.proof.caption}
            heading={copy.proof.heading}
            body={copy.proof.body}
          />
        </div>
        <div
          data-reveal
          className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-[#F2F0FF]/8 bg-[#F2F0FF]/8 sm:grid-cols-3"
        >
          {copy.proof.stats.map((s) => (
            <div key={s.label} className="bg-[#1E1B3A] px-8 py-12">
              <span
                data-count={s.k}
                className="block font-(family-name:--font-golos) text-[clamp(2.6rem,6vw,4rem)] font-extrabold leading-none tracking-tight text-[#F2F0FF]"
              >
                {s.k}
              </span>
              <span className="mt-3 block text-[15px] font-medium text-[#9A94CE]">
                {s.label}
              </span>
            </div>
          ))}
        </div>
        <p
          data-reveal
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#6E5BFF]/25 bg-[#6E5BFF]/10 px-4 py-2 text-[13.5px] font-medium text-[#A79BFF]"
        >
          <span className="h-2 w-2 rounded-full bg-[#A79BFF]/80" />
          {copy.proof.badge}
        </p>
      </section>

      {/* -------------------------------- FAQ ----------------------------------- */}
      <section className="relative mx-auto w-full max-w-3xl px-5 py-20 sm:px-8">
        <div data-reveal>
          <p className="text-[13px] font-medium tracking-wide text-[#8E88C4]">
            {copy.faq.caption}
          </p>
          <h2 className="mt-4 font-(family-name:--font-golos) text-[clamp(1.9rem,4.6vw,3rem)] font-extrabold tracking-[-0.015em] text-[#F2F0FF]">
            {copy.faq.heading}
          </h2>
        </div>
        <div data-reveal className="mt-8">
          {copy.faq.items.map((it) => (
            <FaqItem key={it.q} q={it.q} a={it.a} />
          ))}
        </div>
      </section>

      {/* ----------------------- final CTA + mode launcher ---------------------- */}
      <section className="relative mx-auto w-full max-w-6xl px-5 py-24 sm:px-8 sm:py-28">
        <div data-reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance font-(family-name:--font-golos) text-[clamp(2.3rem,6vw,4rem)] font-extrabold leading-[1.02] tracking-[-0.02em] text-[#F2F0FF]">
            {copy.finalCta.heading.map((ln, i) => (
              <span key={i} className="block">
                {ln === copy.finalCta.highlight ? (
                  <span className="text-[#C9C4FF]">{ln}</span>
                ) : (
                  ln
                )}
              </span>
            ))}
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-pretty text-[17px] leading-[1.6] text-[#C9C6E8]">
            {copy.finalCta.body}
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <PrimaryPill href="/register" className="justify-center">
              {copy.finalCta.ctaPrimary}
            </PrimaryPill>
            <GhostButton onClick={scrollToDemo} className="justify-center">
              {copy.finalCta.ctaSecondary}
            </GhostButton>
          </div>
        </div>

        {/* mobile-first vertical mode launcher (one task per row) */}
        <div data-reveal className="mx-auto mt-14 max-w-xl">
          <p className="mb-3 text-[13px] font-medium text-[#8E88C4]">
            {copy.finalCta.launcherTitle}
          </p>
          <div className="flex flex-col gap-2.5">
            {copy.finalCta.launcher.map((row, i) => {
              const Icon = [ListChecks, Timer, Target][i] ?? GraduationCap;
              return (
                <Link
                  key={row.title}
                  href="/register"
                  className="group/row flex items-center gap-4 rounded-2xl border border-[#F2F0FF]/8 bg-[#1E1B3A] px-5 py-4 transition-colors hover:border-[#F2F0FF]/18"
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-[#6E5BFF]/15 text-[#A79BFF]">
                    <Icon className="size-5" strokeWidth={2} />
                  </span>
                  <span className="flex-1">
                    <span className="block text-[15px] font-semibold text-[#F2F0FF]">
                      {row.title}
                    </span>
                    <span className="block text-[13px] text-[#8E88C4]">
                      {row.sub}
                    </span>
                  </span>
                  <ArrowRight
                    className="size-4.5 text-[#726CA0] transition-transform group-hover/row:translate-x-1"
                    strokeWidth={2}
                  />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------- footer --------------------------------- */}
      <footer className="relative overflow-hidden bg-[#0E0C20]">
        {/* last ember of the violet glow */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-64"
          style={{
            background:
              "radial-gradient(80% 120% at 50% 120%, rgba(42,33,84,0.55) 0%, transparent 70%)",
          }}
        />
        {/* oversized ghosted wordmark */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center overflow-hidden">
          <span className="translate-y-[28%] select-none font-(family-name:--font-golos) text-[clamp(4rem,18vw,13rem)] font-extrabold tracking-tight text-[#F2F0FF]/5">
            {copy.footer.wordmark}
          </span>
        </div>
        <div className="relative mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[16px] font-extrabold tracking-tight text-[#F2F0FF]">
                {copy.nav.brand}
              </p>
              <p className="mt-1 text-[13px] text-[#8E88C4]">{copy.nav.tagline}</p>
            </div>
            <div className="-my-2 flex flex-wrap gap-x-6">
              {copy.footer.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="inline-block py-2 text-[14px] text-[#9A94CE] transition-colors hover:text-[#F2F0FF]"
                >
                  {l.label}
                </Link>
              ))}
              <Link
                href="/login"
                className="inline-block py-2 text-[14px] text-[#9A94CE] transition-colors hover:text-[#F2F0FF]"
              >
                {copy.nav.login}
              </Link>
            </div>
          </div>
          <p className="mt-10 max-w-3xl text-[12.5px] leading-relaxed text-[#8E88C4]">
            {copy.footer.disclaimer}
          </p>
          <p className="mt-6 text-[12.5px] text-[#7D78A8]">{copy.footer.copyright}</p>
        </div>
      </footer>
    </div>
  );
}
