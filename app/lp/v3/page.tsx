"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Literata, IBM_Plex_Sans } from "next/font/google";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Stamp,
  CalendarDays,
  Timer,
  BookOpenText,
  ShieldCheck,
  Wallet,
  RefreshCw,
  Dumbbell,
  ClipboardList,
  Plus,
  Minus,
} from "lucide-react";
import { COPY } from "./copy";

// —— Fonts (module scope, per next/font requirement) ——
const display = Literata({
  subsets: ["cyrillic", "latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  variable: "--font-ticket-display",
  display: "swap",
});
const body = IBM_Plex_Sans({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ticket-body",
  display: "swap",
});

// —— Palette (mirrors the art direction; single source for JS-driven SVG) ——
const C = {
  bg: "#F8F4EB",
  surface: "#FFFDF7",
  ink: "#211F1A",
  green: "#1E5B48",
  ochre: "#B45309",
  rule: "#DCD5C6",
  fade: "#6B675E",
};

const hero = COPY.hero.variants[COPY.hero.active];

// Ukrainian numeral agreement: 1 день / 2–4 дні / 5 днів (nom-sing / nom-pl / gen-pl),
// excluding the 11–14 teens which always take the gen-pl («many») form.
function uaPlural(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

// Reduced-motion probe.
function prefersReduced() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function TicketLanding() {
  useEffect(() => {
    if (prefersReduced()) return;
    // Race-proof: a StrictMode double-mount cleans up before the async import
    // resolves, so guard with `cancelled` and always revert the created ctx.
    let cancelled = false;
    let ctx: { revert: () => void } | undefined;
    (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      ctx = gsap.context(() => {
        gsap.utils.toArray<HTMLElement>(".tk-reveal").forEach((el) => {
          // fromTo with explicit end values so a double-run can never capture a
          // mid-flight transient as the end-state.
          gsap.fromTo(
            el,
            { y: 16, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.6,
              ease: "power3.out",
              scrollTrigger: {
                trigger: el,
                start: "top 88%",
                once: true,
              },
            },
          );
        });
      });
      // Safety: if the page is rendered/scrolled programmatically (headless,
      // print), force-complete any triggers so nothing ships blank.
      ScrollTrigger.refresh();
    })();
    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  return (
    <div
      className={`${display.variable} ${body.variable} ticket relative min-h-full`}
      style={{ background: C.bg, color: C.ink }}
    >
      <Grain />
      <Styles />
      <TopBar />
      <main className="relative mx-auto w-full max-w-6xl px-5 sm:px-8">
        <Hero />
        <DialSection />
        <PlanSection />
        <SimSection />
        <PricingSection />
        <ProofSection />
        <FaqSection />
        <Finale />
      </main>
      <Colophon />
    </div>
  );
}

/* ————————————————————————— Chrome ————————————————————————— */

function TopBar() {
  return (
    <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <div className="flex items-baseline gap-2">
        <span className="tk-serif text-lg font-semibold tracking-tight">
          {COPY.brand}
        </span>
        <span
          className="hidden text-[0.7rem] tracking-[0.18em] sm:inline"
          style={{ color: C.ochre }}
        >
          · 2026
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <Link
          href={COPY.cta.login}
          className="tk-link tk-tap hidden sm:inline-flex"
          style={{ color: C.fade }}
        >
          Увійти
        </Link>
        <Link
          href={COPY.cta.register}
          className="tk-btn tk-btn-sm min-h-[40px]"
        >
          Почати
        </Link>
      </div>
    </header>
  );
}

/* ————————————————————————— Hero ————————————————————————— */

function Hero() {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (prefersReduced()) return;
    // Race-proof: bail if the effect was cleaned up before the async import
    // resolved (StrictMode double-mount / Fast Refresh), and always revert.
    let cancelled = false;
    let ctx: { revert: () => void } | undefined;
    (async () => {
      const { gsap } = await import("gsap");
      if (cancelled) return;
      const el = rootRef.current;
      if (!el) return;
      ctx = gsap.context(() => {
        // Every step uses fromTo with explicit {opacity:1,y:0} end values so a
        // second run can never freeze a mid-flight value as the final state.
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.fromTo(
          ".tk-hero-line",
          { y: 18, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, stagger: 0.08 },
        )
          .fromTo(
            ".tk-hero-sub",
            { y: 12, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6 },
            "-=0.35",
          )
          .fromTo(
            ".tk-hero-cta",
            { y: 10, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, stagger: 0.08 },
            "-=0.3",
          )
          .fromTo(
            ".tk-hero-chip",
            { y: 8, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.4, stagger: 0.06 },
            "-=0.25",
          )
          .fromTo(
            ".tk-ticket-card",
            { y: 22, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8, ease: "power4.out" },
            "-=0.9",
          )
          .fromTo(
            ".tk-underline path",
            { strokeDashoffset: 320 },
            { strokeDashoffset: 0, duration: 0.7, ease: "power2.inOut" },
            "-=0.5",
          );
      }, el);
    })();
    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  return (
    <section ref={rootRef} className="relative pt-6 pb-14 sm:pt-10 sm:pb-20">
      <p
        className="tk-hero-line mb-5 text-[0.78rem] font-medium tracking-[0.16em]"
        style={{ color: C.ochre }}
      >
        {COPY.chapterMark}
      </p>

      <div className="grid items-start gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14">
        {/* Left: title-page column */}
        <div className="max-w-[36rem]">
          <h1 className="tk-serif text-[clamp(2.9rem,7vw,5.2rem)] font-semibold leading-[0.98] tracking-[-0.02em] text-balance">
            {hero.headline.map((ln, i) => (
              <span key={i} className="tk-hero-line block">
                {i === hero.headline.length - 1 ? (
                  <span className="relative inline-block">
                    {ln}
                    <svg
                      className="tk-underline pointer-events-none absolute -bottom-2 left-0 w-full"
                      viewBox="0 0 320 12"
                      fill="none"
                      preserveAspectRatio="none"
                      aria-hidden
                    >
                      <path
                        d="M2 8C46 3 92 3 138 6C184 9 232 4 318 6"
                        stroke={C.ochre}
                        strokeWidth="3"
                        strokeLinecap="round"
                        pathLength={320}
                        style={{ strokeDasharray: 320 }}
                      />
                    </svg>
                  </span>
                ) : (
                  ln
                )}
              </span>
            ))}
          </h1>

          <p
            className="tk-hero-sub mt-8 max-w-[30rem] text-[1.05rem] leading-relaxed"
            style={{ color: C.ink }}
          >
            {hero.subhead}
          </p>

          {/* Compact hook — visible above the fold on mobile; the full
              pull-quote treatment still lives below. */}
          <p
            className="mt-5 text-[0.95rem] font-medium lg:hidden"
            style={{ color: C.ochre }}
          >
            {COPY.hero.mobileHook}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-1">
            <Link
              href={COPY.cta.register}
              className="tk-hero-cta tk-btn tk-btn-lg"
            >
              {COPY.hero.ctaPrimary}
              <ArrowRight size={17} strokeWidth={2} />
            </Link>
            <Link
              href={COPY.cta.login}
              className="tk-hero-cta tk-tap tk-link text-sm font-medium"
              style={{ color: C.green }}
            >
              {COPY.hero.ctaSecondary}
            </Link>
          </div>

          {/* Proof chips (steal #4) */}
          <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-4">
            {COPY.proofChips.map((c) => (
              <li key={c.label} className="tk-hero-chip">
                <div
                  className="tk-serif text-2xl font-semibold leading-none"
                  style={{ color: C.green }}
                >
                  {c.value}
                </div>
                <div
                  className="mt-1 text-[0.72rem] leading-tight"
                  style={{ color: C.fade }}
                >
                  {c.label}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: the exam-ticket card */}
        <TicketCard />
      </div>

      <PullQuote />
    </section>
  );
}

function TicketCard() {
  const [picked, setPicked] = useState<string | null>(null);
  const sealRef = useRef<HTMLDivElement>(null);
  const answered = picked !== null;
  const correct =
    picked !== null &&
    COPY.demo.options.find((o) => o.key === picked)?.correct === true;

  function choose(key: string) {
    if (answered) return;
    setPicked(key);
    const isCorrect = COPY.demo.options.find((o) => o.key === key)?.correct;
    if (isCorrect && !prefersReduced()) {
      (async () => {
        const { gsap } = await import("gsap");
        if (!sealRef.current) return;
        gsap.fromTo(
          sealRef.current,
          { scale: 1.4, rotate: -3, opacity: 0 },
          { scale: 1, rotate: 0, opacity: 1, duration: 0.35, ease: "power4.out" },
        );
      })();
    }
  }

  return (
    <div className="tk-ticket-card relative">
      {/* Perforated edge illusion + double border form */}
      <div
        className="relative overflow-hidden rounded-md p-6 sm:p-7"
        style={{
          background: C.surface,
          border: `1px solid ${C.rule}`,
          boxShadow: "0 1px 0 rgba(33,31,26,0.04), 0 18px 40px -28px rgba(33,31,26,0.35)",
        }}
      >
        {/* header row */}
        <div
          className="flex items-center justify-between border-b pb-3"
          style={{ borderColor: C.rule }}
        >
          <span
            className="tk-serif text-sm font-semibold tracking-wide"
            style={{ color: C.ink }}
          >
            {COPY.demo.ticket}
          </span>
          <Stamp size={16} style={{ color: C.fade }} strokeWidth={1.5} />
        </div>
        <div
          className="mt-1 h-[3px] w-full"
          style={{ background: C.rule }}
          aria-hidden
        />

        <p className="tk-serif mt-5 text-xl font-medium leading-snug">
          {COPY.demo.prompt}
        </p>

        <ul className="mt-5 space-y-2.5">
          {COPY.demo.options.map((o) => {
            const isPicked = picked === o.key;
            const showRight = answered && o.correct;
            const showWrong = isPicked && !o.correct;
            return (
              <li key={o.key}>
                <button
                  type="button"
                  onClick={() => choose(o.key)}
                  disabled={answered}
                  className="tk-opt flex w-full items-center gap-3 rounded-[0.3rem] px-3 py-2.5 text-left text-[0.95rem] transition-colors"
                  style={{
                    border: `1px solid ${
                      showRight ? C.green : showWrong ? C.fade : C.rule
                    }`,
                    background: showRight
                      ? "rgba(30,91,72,0.07)"
                      : showWrong
                        ? "rgba(107,103,94,0.08)"
                        : "transparent",
                    color: showWrong ? C.fade : C.ink,
                    cursor: answered ? "default" : "pointer",
                  }}
                  aria-label={o.text}
                >
                  <span
                    className="tk-serif grid size-6 shrink-0 place-items-center rounded-[0.25rem] text-[0.8rem] font-semibold"
                    style={{
                      border: `1px solid ${showRight ? C.green : C.rule}`,
                      color: showRight ? C.green : C.fade,
                    }}
                  >
                    {showRight ? <Check size={14} strokeWidth={2.5} /> : o.key}
                  </span>
                  <span>{o.text}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* answer feedback + meter */}
        <div
          className="mt-5 min-h-[3.5rem] border-t pt-4 text-sm leading-relaxed"
          style={{ borderColor: C.rule, color: answered ? C.ink : C.fade }}
        >
          {answered ? (
            <>
              <p>{correct ? COPY.demo.correctNote : COPY.demo.wrongNote}</p>
              <Meter filled={correct ? 1 : 0} />
            </>
          ) : (
            <p style={{ color: C.fade }}>{COPY.demo.hint}</p>
          )}
        </div>

        {/* Ink stamp — presses onto the corner only when earned */}
        {correct && (
          <div
            ref={sealRef}
            className="pointer-events-none absolute right-2 top-14 sm:right-3 sm:top-16"
            aria-hidden
          >
            <Seal label={COPY.demo.seal} />
          </div>
        )}
      </div>
    </div>
  );
}

function Meter({ filled }: { filled: number }) {
  const total = 6;
  return (
    <div className="mt-3 flex items-center gap-2">
      <span className="text-[0.72rem]" style={{ color: C.fade }}>
        {COPY.demo.meterLabel}
      </span>
      <span className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className="tk-sq inline-block h-3 w-3 rounded-[2px]"
            style={{
              background: i < filled ? C.green : "transparent",
              border: `1px solid ${i < filled ? C.green : C.rule}`,
            }}
          />
        ))}
      </span>
      <span
        className="tk-serif text-[0.8rem] font-semibold"
        style={{ color: C.green }}
      >
        {filled > 0 ? "4%" : "0%"}
      </span>
    </div>
  );
}

function Seal({ label }: { label: string }) {
  return (
    <svg width="92" height="92" viewBox="0 0 92 92" aria-hidden>
      <defs>
        <path id="sealArc" d="M46 46 m -32 0 a 32 32 0 1 1 64 0 a 32 32 0 1 1 -64 0" />
      </defs>
      <circle
        cx="46"
        cy="46"
        r="40"
        fill="none"
        stroke={C.green}
        strokeWidth="1.5"
        opacity="0.85"
      />
      <circle
        cx="46"
        cy="46"
        r="33"
        fill="none"
        stroke={C.green}
        strokeWidth="3"
        opacity="0.9"
      />
      <text fill={C.green} fontSize="8.5" fontWeight="600" letterSpacing="2.2">
        <textPath href="#sealArc" startOffset="6%">
          {`· ${label} · ${label} ·`}
        </textPath>
      </text>
      <g transform="translate(46 47)">
        <Check size={22} x={-11} y={-11} stroke={C.green} strokeWidth={2.5} />
      </g>
    </svg>
  );
}

function PullQuote() {
  const q = COPY.pullQuote;
  return (
    <figure className="mt-16 border-t pt-10 sm:mt-20" style={{ borderColor: C.rule }}>
      <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start sm:gap-10">
        <div className="flex items-baseline gap-3">
          <span
            className="tk-serif text-[clamp(4.5rem,12vw,7rem)] font-semibold leading-[0.8]"
            style={{ color: C.ochre }}
          >
            {q.dropCap}
          </span>
          <span
            className="tk-serif text-2xl font-medium"
            style={{ color: C.fade }}
          >
            {q.of}
          </span>
        </div>
        <blockquote className="max-w-2xl">
          <p className="tk-serif text-[clamp(1.4rem,3vw,2rem)] font-medium leading-snug text-balance">
            {q.line}
            <sup
              className="ml-1 align-super text-[0.5em]"
              style={{ color: C.ochre }}
            >
              *
            </sup>
          </p>
          <p className="mt-4 max-w-xl text-[0.98rem] leading-relaxed" style={{ color: C.ink }}>
            {q.tail}
          </p>
          <figcaption className="mt-3 text-[0.75rem]" style={{ color: C.fade }}>
            <span style={{ color: C.ochre }}>*</span> {q.footnote}
          </figcaption>
        </blockquote>
      </div>
    </figure>
  );
}

/* ————————————————— Section scaffolding (workbook chapters) ————————————————— */

function ChapterHead({
  numeral,
  title,
  sub,
}: {
  numeral: string;
  title: string;
  sub: string;
}) {
  return (
    <div className="tk-reveal">
      <div className="flex items-baseline gap-4">
        <span
          className="tk-serif text-3xl font-semibold leading-none sm:text-4xl"
          style={{ color: C.ochre }}
        >
          {numeral}
        </span>
        <div>
          <h2 className="tk-serif text-[clamp(1.6rem,3.4vw,2.4rem)] font-semibold leading-tight tracking-[-0.01em]">
            {title}
          </h2>
          <p className="mt-1 text-[0.92rem]" style={{ color: C.fade }}>
            {sub}
          </p>
        </div>
      </div>
      {/* double print rule: thin over thick */}
      <div className="mt-5" aria-hidden>
        <div style={{ height: 1, background: C.rule }} />
        <div className="mt-[3px]" style={{ height: 3, background: C.rule }} />
      </div>
    </div>
  );
}

function Section({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border-t py-16 sm:py-24 ${className}`} style={{ borderColor: "transparent" }}>
      {children}
    </section>
  );
}

/* ————————————————————————— I · Dial ————————————————————————— */

function DialSection() {
  const d = COPY.dial;
  return (
    <Section>
      <ChapterHead numeral={d.chapter} title={d.title} sub={d.sublabel} />
      <div className="tk-reveal mt-12 grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <DialGraphic value={d.value} decay={d.decayNote} />
        <div className="max-w-xl">
          <p
            className="tk-serif text-2xl font-medium leading-snug"
            style={{ color: C.ink }}
          >
            {d.caption}
          </p>
          <p className="mt-5 text-[1.02rem] leading-relaxed">{d.body}</p>
          <p
            className="mt-6 border-l-0 pl-0 tk-serif text-lg font-medium italic leading-snug"
            style={{ color: C.green }}
          >
            {d.moat}
          </p>
        </div>
      </div>
    </Section>
  );
}

function DialGraphic({ value, decay }: { value: number; decay: string }) {
  // 240° sweep gauge.
  const size = 260;
  const r = 104;
  const cx = size / 2;
  const cy = size / 2;
  const start = 150; // deg
  const sweep = 240;
  const toXY = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)] as const;
  };
  const arcPath = (fromDeg: number, toDeg: number) => {
    const [x1, y1] = toXY(fromDeg);
    const [x2, y2] = toXY(toDeg);
    const large = toDeg - fromDeg > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };
  const valDeg = start + (sweep * value) / 100;
  const [nx, ny] = toXY(valDeg);

  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      <div
        className="relative rounded-md p-6"
        style={{ background: C.surface, border: `1px solid ${C.rule}` }}
      >
        <span className="sr-only">
          {COPY.dial.a11y}: {value}% ({decay})
        </span>
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full" aria-hidden>
          {/* track */}
          <path
            d={arcPath(start, start + sweep)}
            fill="none"
            stroke={C.rule}
            strokeWidth="14"
            strokeLinecap="round"
          />
          {/* value */}
          <path
            d={arcPath(start, valDeg)}
            fill="none"
            stroke={C.green}
            strokeWidth="14"
            strokeLinecap="round"
          />
          {/* ghost decay segment */}
          <path
            d={arcPath(valDeg, valDeg + (sweep * 7) / 100)}
            fill="none"
            stroke={C.fade}
            strokeWidth="14"
            strokeLinecap="round"
            opacity="0.28"
            strokeDasharray="2 6"
          />
          <circle cx={nx} cy={ny} r="7" fill={C.surface} stroke={C.green} strokeWidth="3" />
          <text
            x={cx}
            y={cy - 2}
            textAnchor="middle"
            fontFamily="var(--font-ticket-display)"
            fontSize="52"
            fontWeight="600"
            fill={C.ink}
          >
            {value}
          </text>
          <text
            x={cx}
            y={cy + 26}
            textAnchor="middle"
            fontFamily="var(--font-ticket-body)"
            fontSize="13"
            fill={C.fade}
            letterSpacing="1"
          >
            % ГОТОВНОСТІ
          </text>
        </svg>
        <div
          className="mt-2 flex items-center justify-center gap-2 text-[0.78rem]"
          style={{ color: C.fade }}
        >
          <RefreshCw size={13} strokeWidth={1.75} />
          {decay}
        </div>
      </div>
    </div>
  );
}

/* ————————————————————————— II · Plan ————————————————————————— */

function PlanSection() {
  const p = COPY.plan;
  const [date, setDate] = useState("");
  const lineRef = useRef<HTMLDivElement>(null);

  const days = (() => {
    if (!date) return null;
    const target = new Date(date + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
    return diff;
  })();

  // Local YYYY-MM-DD (not UTC) so the date input's `min` matches the user's today.
  const todayStr = new Date().toLocaleDateString("en-CA");
  const past = days !== null && days <= 0;
  const intensive = days !== null && days > 0 && days <= 7;
  const effDays = days !== null && days > 0 ? days : null;
  const perDay =
    effDays !== null ? Math.min(140, Math.max(18, Math.ceil(2322 / effDays))) : null;

  useEffect(() => {
    if (effDays === null || prefersReduced()) return;
    let cancelled = false;
    (async () => {
      const { gsap } = await import("gsap");
      if (cancelled || !lineRef.current) return;
      gsap.fromTo(
        lineRef.current,
        { clipPath: "inset(0 100% 0 0)" },
        { clipPath: "inset(0 0% 0 0)", duration: 0.7, ease: "power2.out" },
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [effDays, date]);

  return (
    <Section>
      <ChapterHead numeral={p.chapter} title={p.title} sub={p.sublabel} />
      <div className="tk-reveal mt-12 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-14">
        <div
          className="rounded-md p-6 sm:p-7"
          style={{ background: C.surface, border: `1px solid ${C.rule}` }}
        >
          <label
            htmlFor="exam-date"
            className="flex items-center gap-2 text-sm font-medium"
            style={{ color: C.ink }}
          >
            <CalendarDays size={17} strokeWidth={1.75} style={{ color: C.green }} />
            {p.label}
          </label>
          <input
            type="date"
            id="exam-date"
            min={todayStr}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="tk-date mt-3 w-full rounded-[0.3rem] px-3 py-2.5 text-[0.95rem]"
            style={{
              background: C.bg,
              border: `1px solid ${C.rule}`,
              color: C.ink,
            }}
          />

          <div
            className="mt-6 border-t pt-5"
            style={{ borderColor: C.rule }}
          >
            {days === null ? (
              <p className="text-sm" style={{ color: C.fade }}>
                {p.fallback}
              </p>
            ) : past ? (
              <p className="text-sm" style={{ color: C.ochre }}>
                {p.past}
              </p>
            ) : (
              <div ref={lineRef}>
                <div className="flex items-baseline gap-3">
                  <span
                    className="tk-serif text-4xl font-semibold"
                    style={{ color: C.green }}
                  >
                    ≈{days}
                  </span>
                  <span className="text-sm" style={{ color: C.fade }}>
                    {uaPlural(days, "день", "дні", "днів")} × {perDay}{" "}
                    {uaPlural(perDay ?? 0, "питання", "питання", "питань")}/день
                  </span>
                  {intensive && (
                    <span
                      className="ml-auto rounded-[0.25rem] px-2 py-0.5 text-[0.68rem] font-semibold tracking-wide"
                      style={{
                        background: "rgba(180,83,9,0.1)",
                        color: C.ochre,
                        border: `1px solid ${C.ochre}`,
                      }}
                    >
                      {p.intensiveTag}
                    </span>
                  )}
                </div>
                {intensive && (
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: C.ink }}>
                    {p.intensiveNote}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="max-w-xl">
          <p className="text-[1.02rem] leading-relaxed">
            План збирає рушій інтервального повторення FSRS: щодня — рівно стільки
            питань, скільки треба, щоб знання не встигли вивітритися до іспиту.
          </p>
          <div
            className="mt-6 rounded-md px-5 py-4 text-sm leading-relaxed"
            style={{ background: C.surface, border: `1px solid ${C.rule}`, color: C.fade }}
          >
            <span className="font-medium" style={{ color: C.ink }}>
              Найпровальніші теми першими:{" "}
            </span>
            {p.topics}
          </div>
          <Link href={COPY.cta.register} className="tk-btn tk-btn-lg mt-7">
            {p.cta}
            <ArrowRight size={17} strokeWidth={2} />
          </Link>
        </div>
      </div>
    </Section>
  );
}

/* ————————————————————————— III · Simulator ————————————————————————— */

function SimSection() {
  const s = COPY.sim;
  return (
    <Section>
      <ChapterHead numeral={s.chapter} title={s.title} sub={s.sublabel} />
      <div className="tk-reveal mt-12">
        <div className="grid gap-px overflow-hidden rounded-md sm:grid-cols-3" style={{ background: C.rule, border: `1px solid ${C.rule}` }}>
          {s.stats.map((st, i) => (
            <div
              key={i}
              className="flex flex-col items-center px-6 py-10 text-center"
              style={{ background: C.surface }}
            >
              <span
                className="tk-serif text-[clamp(3rem,7vw,4.5rem)] font-semibold leading-none"
                style={{ color: C.green }}
              >
                {st.n}
              </span>
              <span className="mt-3 text-sm" style={{ color: C.fade }}>
                {st.u}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-start gap-3">
          <Timer
            size={18}
            strokeWidth={1.75}
            style={{ color: C.ochre, marginTop: 2 }}
          />
          <p className="max-w-2xl text-[0.98rem] leading-relaxed">{s.note}</p>
        </div>
      </div>
    </Section>
  );
}

/* ————————————————————————— IV · Pricing ————————————————————————— */

const trustIcons = [ShieldCheck, Wallet, Stamp];

function PricingSection() {
  const p = COPY.pricing;
  return (
    <Section>
      <ChapterHead numeral={p.chapter} title={p.title} sub={p.sublabel} />
      <div className="tk-reveal mt-12 grid gap-8 lg:grid-cols-[1fr_1fr] lg:gap-12">
        {/* Receipt: what stays free */}
        <div
          className="rounded-md p-6 sm:p-8"
          style={{ background: C.surface, border: `1px solid ${C.rule}` }}
        >
          <p
            className="text-[0.72rem] font-semibold tracking-[0.16em]"
            style={{ color: C.fade }}
          >
            БЕЗКОШТОВНО — ЗАВЖДИ
          </p>
          <ul className="mt-5 space-y-3.5">
            {p.free.map((r) => (
              <li key={r.item} className="tk-leader flex items-baseline gap-2 text-[0.95rem]">
                <span className="min-w-0" style={{ color: C.ink }}>
                  {r.item}
                </span>
                <span className="tk-dots" aria-hidden />
                <span
                  className="shrink-0 tk-serif font-medium"
                  style={{ color: C.green }}
                >
                  {r.price}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-6 border-t pt-4 text-sm leading-relaxed" style={{ borderColor: C.rule, color: C.fade }}>
            Жодного «розблокуй, щоб побачити відповідь». Зміст не ховається за
            платіж — ніколи.
          </div>
        </div>

        {/* The access ticket */}
        <div
          className="relative flex flex-col rounded-md p-6 sm:p-8"
          style={{
            background: C.surface,
            border: `2px solid ${C.green}`,
            boxShadow: "0 18px 44px -30px rgba(30,91,72,0.55)",
          }}
        >
          <div className="flex items-baseline justify-between">
            <p className="tk-serif text-xl font-semibold">{p.paidTitle}</p>
            <p
              className="tk-serif text-[clamp(2.4rem,5vw,3.2rem)] font-semibold leading-none"
              style={{ color: C.ochre }}
            >
              {p.paidPrice}
            </p>
          </div>
          <ul className="mt-6 space-y-3">
            {p.paidIncludes.map((it) => (
              <li key={it} className="flex items-start gap-2.5 text-[0.95rem]">
                <Check
                  size={17}
                  strokeWidth={2}
                  style={{ color: C.green, marginTop: 2 }}
                  className="shrink-0"
                />
                {it}
              </li>
            ))}
          </ul>

          <p className="mt-6 text-sm font-medium" style={{ color: C.ink }}>
            {p.anchor}
          </p>
          <p
            className="mt-3 rounded-[0.3rem] px-4 py-3 text-sm leading-relaxed"
            style={{ background: "rgba(30,91,72,0.06)", color: C.ink }}
          >
            {p.failsafe}
          </p>

          <Link href={COPY.cta.register} className="tk-btn tk-btn-lg mt-6 w-full">
            {p.cta}
            <ArrowRight size={17} strokeWidth={2} />
          </Link>

          {/* trust band — three stamped mini-seals */}
          <div
            className="mt-6 grid grid-cols-3 gap-2 border-t pt-5"
            style={{ borderColor: C.rule }}
          >
            {p.trust.map((t, i) => {
              const Icon = trustIcons[i];
              return (
                <div key={t} className="flex flex-col items-center gap-1.5 text-center">
                  <Icon size={18} strokeWidth={1.5} style={{ color: C.green }} />
                  <span className="text-[0.72rem] leading-tight" style={{ color: C.fade }}>
                    {t}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ————————————————————————— V · Proof ————————————————————————— */

function ProofSection() {
  const p = COPY.proof;
  return (
    <Section>
      <ChapterHead numeral={p.chapter} title={p.title} sub={p.sublabel} />
      <div className="tk-reveal mt-12">
        <div className="flex flex-wrap items-end gap-x-14 gap-y-8">
          {p.stats.map((st) => (
            <div key={st.u}>
              <div
                className="tk-serif text-[clamp(2.8rem,6vw,4rem)] font-semibold leading-none"
                style={{ color: C.ink }}
              >
                {st.n}
              </div>
              <div className="mt-2 text-sm" style={{ color: C.fade }}>
                {st.u}
              </div>
            </div>
          ))}
          <span
            className="mb-2 inline-flex items-center gap-1.5 rounded-[0.25rem] px-2.5 py-1 text-[0.72rem] font-semibold tracking-wide"
            style={{
              background: "rgba(30,91,72,0.08)",
              color: C.green,
              border: `1px solid ${C.green}`,
            }}
          >
            <span className="tk-pulse inline-block size-2 rounded-full" style={{ background: C.green }} />
            {p.badge}
          </span>
        </div>
        <p className="mt-8 max-w-2xl text-[0.98rem] leading-relaxed" style={{ color: C.fade }}>
          {p.honest}
        </p>
      </div>
    </Section>
  );
}

/* ————————————————————————— VI · FAQ ————————————————————————— */

function FaqSection() {
  const f = COPY.faq;
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Section>
      <ChapterHead numeral={f.chapter} title={f.title} sub={f.sublabel} />
      <div className="tk-reveal mt-10 max-w-3xl">
        {f.items.map((it, i) => {
          const isOpen = open === i;
          return (
            <div key={i} className="border-b" style={{ borderColor: C.rule }}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center gap-4 py-5 text-left"
                aria-expanded={isOpen}
              >
                <span
                  className="tk-serif text-sm font-semibold tabular-nums"
                  style={{ color: C.ochre }}
                >
                  {i + 1}.
                </span>
                <span className="tk-serif flex-1 text-[1.05rem] font-medium">
                  {it.q}
                </span>
                <span style={{ color: C.fade }}>
                  {isOpen ? <Minus size={17} /> : <Plus size={17} />}
                </span>
              </button>
              <div
                className="tk-acc grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out"
                style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
              >
                <div className="min-h-0">
                  <p
                    className="pb-5 pl-8 text-[0.96rem] leading-relaxed"
                    style={{ color: C.ink }}
                  >
                    {it.a}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* ————————————————————————— Finale ————————————————————————— */

const modeIcons = [Dumbbell, Timer, ClipboardList];

function Finale() {
  const f = COPY.finale;
  return (
    <Section className="pb-8">
      <div
        className="tk-reveal rounded-lg px-6 py-14 text-center sm:px-12 sm:py-20"
        style={{ background: C.green, color: "#F4EFE2" }}
      >
        <h2 className="tk-serif mx-auto max-w-2xl text-[clamp(1.9rem,4.5vw,3rem)] font-semibold leading-tight text-balance">
          {f.title}
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-[1rem] leading-relaxed" style={{ color: "rgba(244,239,226,0.82)" }}>
          {f.sub}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href={COPY.cta.register}
            className="tk-btn-invert inline-flex w-full items-center justify-center gap-2 rounded-[0.4rem] px-7 py-3.5 text-[0.98rem] font-medium sm:w-auto"
          >
            {f.cta}
            <ArrowRight size={17} strokeWidth={2} />
          </Link>
          <Link
            href={COPY.cta.login}
            className="tk-link tk-tap text-sm font-medium"
            style={{ color: "rgba(244,239,226,0.9)" }}
          >
            {f.secondary}
          </Link>
        </div>
      </div>

      {/* Mobile-first vertical mode-launcher (steal #5) */}
      <div className="mt-8 space-y-3">
        {f.modes.map((m, i) => {
          const Icon = modeIcons[i];
          return (
            <Link
              key={m.name}
              href={COPY.cta.register}
              className="tk-mode flex items-center gap-4 rounded-md px-5 py-4 transition-colors"
              style={{ background: C.surface, border: `1px solid ${C.rule}` }}
            >
              <Icon size={20} strokeWidth={1.75} style={{ color: C.green }} className="shrink-0" />
              <span className="flex-1">
                <span className="tk-serif block font-medium">{m.name}</span>
                <span className="block text-[0.82rem]" style={{ color: C.fade }}>
                  {m.desc}
                </span>
              </span>
              <ArrowUpRight size={18} strokeWidth={1.75} style={{ color: C.fade }} />
            </Link>
          );
        })}
      </div>
    </Section>
  );
}

/* ————————————————————————— Colophon / Footer ————————————————————————— */

function Colophon() {
  const f = COPY.footer;
  return (
    <footer
      className="relative mt-8 border-t"
      style={{ borderColor: C.rule, background: "#F2ECDD" }}
    >
      <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <span className="tk-serif text-lg font-semibold">{COPY.brand}</span>
          <span
            className="text-[0.72rem] tracking-[0.2em]"
            style={{ color: C.ochre }}
          >
            {f.stamp}
          </span>
        </div>
        <div className="mt-2 h-[3px] w-full" style={{ background: C.rule }} aria-hidden />

        <div className="mt-6 grid gap-8 sm:grid-cols-[1fr_auto]">
          <p
            className="max-w-2xl text-[0.78rem] leading-relaxed"
            style={{ color: C.fade }}
          >
            <span
              className="mb-1 block text-[0.7rem] font-semibold tracking-[0.12em]"
              style={{ color: C.ink }}
            >
              {f.colophon}
            </span>
            {f.disclaimer}
          </p>
          <nav className="flex gap-6 text-sm sm:flex-col sm:items-end sm:gap-1">
            <Link href={COPY.cta.register} className="tk-link tk-tap" style={{ color: C.ink }}>
              {f.nav[0]}
            </Link>
            <Link href={COPY.cta.login} className="tk-link tk-tap" style={{ color: C.ink }}>
              {f.nav[1]}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

/* ————————————————————————— Paper grain + styles ————————————————————————— */

function Grain() {
  // Static 2% noise texture via inline SVG feTurbulence data-URI. Cheap, no runtime filter.
  const svg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(#n)' opacity='0.5'/></svg>`,
  );
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        backgroundImage: `url("data:image/svg+xml,${svg}")`,
        opacity: 0.03,
        mixBlendMode: "multiply",
      }}
    />
  );
}

function Styles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
.ticket { font-family: var(--font-ticket-body), system-ui, sans-serif; }
.ticket .tk-serif { font-family: var(--font-ticket-display), Georgia, serif; }
.ticket main, .ticket header, .ticket footer { position: relative; z-index: 1; }

.tk-btn {
  display: inline-flex; align-items: center; gap: 0.5rem;
  background: ${C.green}; color: #F4EFE2;
  border-radius: 0.4rem; font-weight: 500; line-height: 1;
  transition: transform .12s ease, background .18s ease, box-shadow .18s ease;
}
.tk-btn-sm { padding: 0.5rem 0.9rem; font-size: 0.85rem; }
.tk-btn-lg { padding: 0.85rem 1.4rem; font-size: 0.98rem; }
.tk-btn:hover { background: #17493a; box-shadow: 0 10px 24px -14px rgba(30,91,72,0.7); }
.tk-btn:active { transform: translateY(1px); }

.tk-btn-invert { background: #F4EFE2; color: ${C.green}; font-weight: 600;
  transition: transform .12s ease, background .18s ease; }
.tk-btn-invert:hover { background: #fff; }
.tk-btn-invert:active { transform: translateY(1px); }

.tk-link { position: relative; transition: opacity .15s ease; }
.tk-link::after {
  content: ""; position: absolute; left: 0; right: 0; bottom: -2px; height: 1px;
  background: currentColor; transform: scaleX(0); transform-origin: left;
  transition: transform .25s ease;
}
.tk-link:hover::after { transform: scaleX(1); }

/* padded hit area for text links — meets the 44px touch-target floor without
   changing the visible text size (underline still hugs the text baseline) */
.tk-tap { display: inline-flex; align-items: center; min-height: 44px; }
.tk-tap.tk-link::after { bottom: 50%; transform: translateY(0.7em) scaleX(0); }
.tk-tap.tk-link:hover::after { transform: translateY(0.7em) scaleX(1); }

.tk-opt:not(:disabled):hover { background: rgba(30,91,72,0.05) !important; border-color: ${C.green} !important; }

/* dotted leader receipt rows */
.tk-leader { }
.tk-dots { flex: 1 1 auto; align-self: flex-end; margin-bottom: 0.28rem;
  border-bottom: 1.5px dotted ${C.rule}; min-width: 1.5rem; }

/* proof badge press-in like embossing */
.tk-hero-chip { transition: transform .12s ease; }

.tk-mode:hover { border-color: ${C.green} !important; background: #fff !important; }

.tk-pulse { animation: tkpulse 2.4s ease-in-out infinite; }
@keyframes tkpulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }

/* date input calendar icon tint */
.tk-date::-webkit-calendar-picker-indicator { opacity: 0.6; cursor: pointer; }
.tk-date:focus { outline: none; border-color: ${C.green} !important; }

/* section reveal — enhances an already-visible default; JS sets initial only when motion allowed */
@media (prefers-reduced-motion: no-preference) {
  .tk-reveal { will-change: transform, opacity; }
}
@media (prefers-reduced-motion: reduce) {
  .tk-pulse { animation: none; }
  .tk-underline path { stroke-dashoffset: 0 !important; }
}
`,
      }}
    />
  );
}
