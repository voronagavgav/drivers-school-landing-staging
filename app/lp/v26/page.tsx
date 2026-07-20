"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Stamp,
  CalendarDays,
  Timer,
  ShieldCheck,
  Wallet,
  RefreshCw,
  TrendingDown,
  Dumbbell,
  ClipboardList,
  BookOpenText,
  Plus,
  Minus,
} from "lucide-react";
import { COPY, N } from "./copy";

/* ————————————————————————— palette (mirrors v3 «Білет №») ————————————————————————— */
const C = {
  bg: "#F8F4EB",
  surface: "#FFFDF7",
  ink: "#211F1A",
  green: "#1E5B48",
  greenDeep: "#17493A",
  ochre: "#B45309",
  // Lighter amber reserved for small/ body-size accent text on the dark-ink grounds:
  // #E8963E on #1C1A15 ≈ 7.3:1 (AA), where #B45309 measures only ≈3.4:1.
  amberDark: "#E8963E",
  rule: "#DCD5C6",
  fade: "#6B675E",
  inkDark: "#1C1A15", // dark print-ink interlude ground
  paper: "#F4EFE2", // cream text on dark ground
};

// Readiness DELTAS per question outcome (the reader's own demo dial). Readiness is
// ACCUMULATIVE (prev + delta, clamped to [0,100]) — never a per-question absolute
// target — so the needle can never contradict the caption: a miss (negative delta)
// can only lower or leave the number, never raise it, and every caption is derived
// from the ACTUAL prev→next movement, not from the local question outcome.
const R = {
  q1: { ok: 24, no: -8 },
  q2: { ok: 15, no: -11 },
  q2dip: -12, // demo decay delta (applied after a correct Q2)
  q3: { ok: 12, no: -8 },
} as const;

const clamp01 = (n: number) => Math.max(0, Math.min(100, n));

const hero = COPY.hero.variants[COPY.hero.active];

// Ukrainian numeral agreement (1 день / 2–4 дні / 5 днів), teens 11–14 → many.
function uaPlural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

function prefersReduced() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// Smoothly tween a number toward `target` (used by every gauge). Honest downward
// swing on a dip: power4.out, no bounce. Reduced-motion → jump instantly.
function useTweened(target: number, dur = 0.9) {
  const [display, setDisplay] = useState(target);
  const objRef = useRef({ v: target });
  const tweenRef = useRef<{ kill: () => void } | null>(null);
  useEffect(() => {
    if (prefersReduced()) {
      objRef.current.v = target;
      setDisplay(target);
      return;
    }
    let cancelled = false;
    (async () => {
      const { gsap } = await import("gsap");
      if (cancelled) return;
      tweenRef.current?.kill();
      tweenRef.current = gsap.to(objRef.current, {
        v: target,
        duration: dur,
        ease: "power4.out",
        onUpdate: () => setDisplay(Math.round(objRef.current.v)),
      });
    })();
    return () => {
      cancelled = true;
      tweenRef.current?.kill();
    };
  }, [target, dur]);
  return display;
}

/* ————————————————————————— Root ————————————————————————— */

export default function TicketLanding() {
  const [readiness, setReadiness] = useState(0);
  const [answered, setAnswered] = useState<Record<string, boolean>>({});
  const answeredCount = Object.keys(answered).length;

  // Accumulative: derive the new reading from the current one, clamped ≥0. A delta is
  // applied once per question; re-answering is blocked upstream (TicketCard disables).
  const answer = useCallback((qid: string, delta: number) => {
    setAnswered((a) => (a[qid] ? a : { ...a, [qid]: true }));
    setReadiness((prev) => clamp01(prev + delta));
  }, []);

  // Section reveals (scroll-driven, motion-gated). Content is visible by default in
  // CSS; JS only sets the hidden start-state when motion is allowed, so a non-JS or
  // reduced-motion render never ships blank.
  useEffect(() => {
    if (prefersReduced()) return;
    let cancelled = false;
    let ctx: { revert: () => void } | undefined;
    (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      ctx = gsap.context(() => {
        gsap.utils.toArray<HTMLElement>(".v26-reveal").forEach((el) => {
          gsap.fromTo(
            el,
            { y: 22, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.7,
              ease: "power3.out",
              scrollTrigger: { trigger: el, start: "top 90%", once: true },
            },
          );
        });
        // Exam tickets settle in with a print-registration rotation correcting to 0.
        gsap.utils.toArray<HTMLElement>(".v26-ticket").forEach((el) => {
          gsap.fromTo(
            el,
            { y: 26, rotate: 2.4, opacity: 0 },
            {
              y: 0,
              rotate: 0,
              opacity: 1,
              duration: 0.85,
              ease: "power4.out",
              scrollTrigger: { trigger: el, start: "top 88%", once: true },
            },
          );
        });
      });
      ScrollTrigger.refresh();
    })();
    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  return (
    <div
      className="v26 relative min-h-full"
      style={{ background: C.bg, color: C.ink }}
    >
      <Grain />
      <Styles />
      <GaugeRibbon readiness={readiness} />
      <main className="relative">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <Hero readiness={readiness} onAnswer={answer} />
        </div>

        <Interlude />

        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <Q2Section readiness={readiness} onAnswer={answer} setReadiness={setReadiness} />
          <MechanismSection />
          <Q3Section onAnswer={answer} />
          <SimSection />
        </div>

        <LossBand />

        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <PricingSection />
          <ProofSection />
          <FaqSection />
          <Finale answeredCount={answeredCount} />
        </div>
      </main>
      <Colophon />
    </div>
  );
}

/* ————————————————————————— Gauge stamp ————————————————————————— */

function Gauge({
  value,
  size = 200,
  stroke,
  showValue = true,
}: {
  value: number;
  size?: number;
  stroke?: number;
  showValue?: boolean;
}) {
  const shown = useTweened(value);
  const sw = stroke ?? Math.max(5, Math.round(size * 0.07));
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - sw / 2 - 2;
  const start = 150;
  const sweep = 240;
  const clamp = Math.max(0, Math.min(100, shown));
  const toXY = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)] as const;
  };
  const arc = (a: number, b: number) => {
    const [x1, y1] = toXY(a);
    const [x2, y2] = toXY(b);
    const large = b - a > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };
  const valDeg = start + (sweep * clamp) / 100;
  const [nx, ny] = toXY(valDeg);
  const hubR = Math.max(3, size * 0.03);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden>
      <path d={arc(start, start + sweep)} fill="none" stroke={C.rule} strokeWidth={sw} strokeLinecap="round" />
      <path d={arc(start, valDeg)} fill="none" stroke={C.green} strokeWidth={sw} strokeLinecap="round" />
      {/* needle */}
      <line
        x1={cx}
        y1={cy}
        x2={cx + r * 0.82 * Math.cos((valDeg * Math.PI) / 180)}
        y2={cy + r * 0.82 * Math.sin((valDeg * Math.PI) / 180)}
        stroke={C.ochre}
        strokeWidth={Math.max(2, size * 0.018)}
        strokeLinecap="round"
      />
      <circle cx={nx} cy={ny} r={hubR * 0.7} fill={C.surface} stroke={C.green} strokeWidth={Math.max(1.5, size * 0.012)} />
      <circle cx={cx} cy={cy} r={hubR} fill={C.ochre} />
      {showValue && (
        <>
          <text
            x={cx}
            y={cy - size * 0.02}
            textAnchor="middle"
            fontFamily="var(--font-v26-display), Georgia, serif"
            fontSize={size * 0.26}
            fontWeight="600"
            fill={C.ink}
          >
            {shown}
          </text>
          <text
            x={cx}
            y={cy + size * 0.13}
            textAnchor="middle"
            fontFamily="var(--font-v26-body), system-ui, sans-serif"
            fontSize={size * 0.065}
            fill={C.fade}
            letterSpacing="1"
          >
            % ГОТОВНОСТІ
          </text>
        </>
      )}
    </svg>
  );
}

/* ————————————————————————— Persistent gauge ribbon ————————————————————————— */

function GaugeRibbon({ readiness }: { readiness: number }) {
  const shown = useTweened(readiness);
  const active = shown > 0;
  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur-[2px]"
      style={{ borderColor: C.rule, background: "rgba(248,244,235,0.9)" }}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-2.5 sm:px-8">
        <div className="flex items-baseline gap-2">
          <span className="v26-serif text-base font-semibold tracking-tight sm:text-lg">
            {COPY.brand}
          </span>
          <span className="hidden text-[0.68rem] tracking-[0.18em] sm:inline" style={{ color: C.ochre }}>
            · {COPY.year}
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-5">
          {/* the mini gauge stamp — reads 0, ticks up as you answer */}
          <div className="flex items-center gap-2">
            <span className="shrink-0">
              <Gauge value={readiness} size={40} stroke={5} showValue={false} />
            </span>
            <span className="leading-tight">
              <span className="block text-[0.62rem] tracking-[0.08em]" style={{ color: C.fade }}>
                {COPY.gauge.label}
              </span>
              <span className="v26-serif block text-sm font-semibold tabular-nums" style={{ color: active ? C.green : C.fade }}>
                {active ? `${shown}%` : COPY.gauge.idle}
              </span>
              <span className="sr-only">{COPY.gauge.a11y}: {shown}%</span>
            </span>
          </div>
          <Link href={COPY.cta.register} className="v26-btn v26-btn-sm hidden min-h-[38px] sm:inline-flex">
            Почати
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ————————————————————————— Ticket card (reused for all 3 questions) ————————————————————————— */

type TicketData = {
  ticket: string;
  tag: string;
  prompt: string;
  options: readonly { key: string; text: string; correct: boolean }[];
  hint: string;
  correctNote: string;
  wrongNote: string;
  seal: string;
};

function TicketCard({
  data,
  showStamp = false,
  gaugeValue,
  onAnswered,
}: {
  data: TicketData;
  showStamp?: boolean;
  gaugeValue?: number;
  onAnswered: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const sealRef = useRef<HTMLDivElement>(null);
  const answered = picked !== null;
  const correct = answered && data.options.find((o) => o.key === picked)?.correct === true;

  function choose(key: string) {
    if (answered) return;
    setPicked(key);
    const isCorrect = data.options.find((o) => o.key === key)?.correct === true;
    onAnswered(isCorrect);
    if (isCorrect && !prefersReduced()) {
      (async () => {
        const { gsap } = await import("gsap");
        if (!sealRef.current) return;
        gsap.fromTo(
          sealRef.current,
          { scale: 1.5, rotate: -4, opacity: 0 },
          { scale: 1, rotate: -6, opacity: 1, duration: 0.35, ease: "power4.out" },
        );
      })();
    }
  }

  return (
    <div className="v26-ticket relative">
      <div
        className="relative overflow-hidden rounded-md"
        style={{
          background: C.surface,
          border: `1px solid ${C.rule}`,
          boxShadow: "0 1px 0 rgba(33,31,26,0.04), 0 20px 44px -30px rgba(33,31,26,0.4)",
        }}
      >
        {/* perforated header strip */}
        <div className="v26-perf flex items-center justify-between px-5 pt-4 pb-3 sm:px-6" style={{ background: "rgba(30,91,72,0.045)" }}>
          <span className="v26-serif text-[0.82rem] font-semibold tracking-wide" style={{ color: C.greenDeep }}>
            {data.ticket}
          </span>
          {showStamp && gaugeValue !== undefined ? (
            <span className="shrink-0" title="Твоя готовність">
              <Gauge value={gaugeValue} size={44} stroke={5} showValue={false} />
            </span>
          ) : (
            <Stamp size={16} style={{ color: C.fade }} strokeWidth={1.5} />
          )}
        </div>
        <div className="h-[3px] w-full" style={{ background: `repeating-linear-gradient(90deg, ${C.rule} 0 6px, transparent 6px 12px)` }} aria-hidden />

        <div className="px-5 pt-5 pb-6 sm:px-6">
          <p className="text-[0.7rem] font-medium tracking-[0.06em]" style={{ color: C.ochre }}>
            {data.tag}
          </p>
          <p className="v26-serif mt-2.5 text-[1.15rem] font-medium leading-snug sm:text-xl">
            {data.prompt}
          </p>

          <ul className="mt-5 space-y-2.5">
            {data.options.map((o) => {
              const isPicked = picked === o.key;
              const showRight = answered && o.correct;
              const showWrong = isPicked && !o.correct;
              return (
                <li key={o.key}>
                  <button
                    type="button"
                    onClick={() => choose(o.key)}
                    disabled={answered}
                    className="v26-opt flex w-full items-center gap-3 rounded-[0.3rem] px-3 py-2.5 text-left text-[0.92rem] transition-colors"
                    style={{
                      border: `1px solid ${showRight ? C.green : showWrong ? C.fade : C.rule}`,
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
                      className="v26-serif grid size-6 shrink-0 place-items-center rounded-[0.25rem] text-[0.78rem] font-semibold"
                      style={{
                        border: `1px solid ${showRight ? C.green : C.rule}`,
                        color: showRight ? C.green : C.fade,
                      }}
                    >
                      {showRight ? <Check size={13} strokeWidth={2.5} /> : o.key}
                    </span>
                    <span>{o.text}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div
            className="mt-5 min-h-[2.75rem] border-t pt-4 text-[0.9rem] leading-relaxed"
            style={{ borderColor: C.rule, color: answered ? C.ink : C.fade }}
          >
            {answered ? (correct ? data.correctNote : data.wrongNote) : data.hint}
          </div>
        </div>

        {correct && (
          <div ref={sealRef} className="pointer-events-none absolute right-3 top-20 sm:right-4 sm:top-24" aria-hidden>
            <Seal label={data.seal} />
          </div>
        )}
      </div>
    </div>
  );
}

function Seal({ label }: { label: string }) {
  return (
    <svg width="86" height="86" viewBox="0 0 92 92" aria-hidden style={{ opacity: 0.92 }}>
      <defs>
        <path id={`arc-${label}`} d="M46 46 m -32 0 a 32 32 0 1 1 64 0 a 32 32 0 1 1 -64 0" />
      </defs>
      <circle cx="46" cy="46" r="40" fill="none" stroke={C.green} strokeWidth="1.5" opacity="0.85" />
      <circle cx="46" cy="46" r="33" fill="none" stroke={C.green} strokeWidth="3" opacity="0.9" />
      <text fill={C.green} fontSize="8" fontWeight="600" letterSpacing="2.4">
        <textPath href={`#arc-${label}`} startOffset="4%">
          {`· ${label} · ${label} ·`}
        </textPath>
      </text>
      <g transform="translate(46 47)">
        <Check size={22} x={-11} y={-11} stroke={C.green} strokeWidth={2.5} />
      </g>
    </svg>
  );
}

/* ————————————————————————— Section scaffolding ————————————————————————— */

function SectionHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="v26-reveal">
      <h2 className="v26-serif text-[clamp(1.7rem,3.6vw,2.5rem)] font-semibold leading-tight tracking-[-0.01em] text-balance">
        {title}
      </h2>
      <p className="mt-1.5 text-[0.95rem]" style={{ color: C.fade }}>
        {sub}
      </p>
      <div className="mt-5" aria-hidden>
        <div style={{ height: 1, background: C.rule }} />
        <div className="mt-[3px]" style={{ height: 3, background: C.rule }} />
      </div>
    </div>
  );
}

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`py-16 sm:py-24 ${className}`}>{children}</section>;
}

/* ————————————————————————— HERO ————————————————————————— */

function Hero({ readiness, onAnswer }: { readiness: number; onAnswer: (qid: string, target: number) => void }) {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (prefersReduced()) return;
    let cancelled = false;
    let ctx: { revert: () => void } | undefined;
    (async () => {
      const { gsap } = await import("gsap");
      if (cancelled) return;
      const el = rootRef.current;
      if (!el) return;
      ctx = gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.fromTo(".v26-hero-line", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.08 })
          .fromTo(".v26-hero-sub", { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, "-=0.35")
          .fromTo(".v26-hero-hook", { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, "-=0.3")
          .fromTo(".v26-hero-cta", { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.08 }, "-=0.25")
          .fromTo(".v26-hero-chip", { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.06 }, "-=0.2")
          .fromTo(".v26-ticket", { y: 26, rotate: 2.4, opacity: 0 }, { y: 0, rotate: 0, opacity: 1, duration: 0.85, ease: "power4.out" }, "-=0.95")
          .fromTo(".v26-underline path", { strokeDashoffset: 320 }, { strokeDashoffset: 0, duration: 0.7, ease: "power2.inOut" }, "-=0.55");
      }, el);
    })();
    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  return (
    <section ref={rootRef} className="relative pt-10 pb-14 sm:pt-14 sm:pb-20">
      <p className="v26-hero-line mb-5 text-[0.78rem] font-medium tracking-[0.14em]" style={{ color: C.ochre }}>
        {COPY.hero.chapterMark}
      </p>

      <div className="grid items-start gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14">
        <div className="max-w-[34rem]">
          <h1 className="v26-serif text-[clamp(2.7rem,6.4vw,4.9rem)] font-semibold leading-[0.98] tracking-[-0.02em] text-balance">
            {hero.headline.map((ln, i) => (
              <span key={i} className="v26-hero-line block">
                {i === hero.headline.length - 1 ? (
                  <span className="relative inline-block">
                    {ln}
                    <svg
                      className="v26-underline pointer-events-none absolute -bottom-2 left-0 w-full"
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

          <p className="v26-hero-sub mt-7 max-w-[30rem] text-[1.05rem] leading-relaxed">{hero.subhead}</p>

          {/* Law: «Лише 1 з 5» — visible without scroll */}
          <p
            className="v26-hero-hook mt-6 inline-flex items-center gap-2 rounded-[0.3rem] px-3 py-2 text-[0.9rem] font-medium"
            style={{ background: "rgba(180,83,9,0.08)", border: `1px solid rgba(180,83,9,0.35)`, color: C.ochre }}
          >
            <Stamp size={15} strokeWidth={1.75} />
            {COPY.hero.hook}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href={COPY.cta.register} className="v26-hero-cta v26-btn v26-btn-lg">
              {COPY.ctaPrimary}
              <ArrowRight size={17} strokeWidth={2} />
            </Link>
            <Link
              href={COPY.cta.try}
              className="v26-hero-cta v26-tap v26-link text-sm font-medium"
              style={{ color: C.green }}
            >
              {COPY.ctaSecondary}
            </Link>
          </div>

          <ul className="mt-9 flex flex-wrap gap-x-8 gap-y-4">
            {COPY.proofChips.map((c) => (
              <li key={c.label} className="v26-hero-chip">
                <div className="v26-serif text-2xl font-semibold leading-none" style={{ color: C.green }}>
                  {c.value}
                </div>
                <div className="mt-1 text-[0.72rem] leading-tight" style={{ color: C.fade }}>
                  {c.label}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: live Q1 ticket + its own gauge stamp */}
        <div>
          <TicketCard
            data={COPY.q1}
            showStamp
            gaugeValue={readiness}
            onAnswered={(ok) => onAnswer("q1", ok ? R.q1.ok : R.q1.no)}
          />
          <p className="mt-4 text-center text-[0.8rem]" style={{ color: C.fade }}>
            {COPY.hero.contract}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ————————————————————————— ІНТЕРЛЮДІЯ «Лише 1 з 5» (dark ink) ————————————————————————— */

function Interlude() {
  const it = COPY.interlude;
  return (
    <section className="v26-dark relative my-4 py-20 sm:py-28" style={{ background: C.inkDark, color: C.paper }}>
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <div className="v26-reveal grid items-center gap-10 lg:grid-cols-[auto_1fr] lg:gap-16">
          <div className="flex items-baseline gap-3">
            <span
              className="v26-serif font-semibold leading-[0.8]"
              style={{ fontSize: "clamp(4.5rem,14vw,8rem)", color: C.paper }}
            >
              {it.stat}
            </span>
            <span className="v26-serif text-3xl font-medium" style={{ color: C.ochre }}>
              {it.statUnit}
            </span>
          </div>
          <div className="max-w-2xl">
            <p className="text-[0.72rem] font-medium tracking-[0.16em]" style={{ color: "rgba(244,239,226,0.55)" }}>
              {it.kicker}
            </p>
            <p className="v26-serif mt-3 text-[clamp(1.5rem,3.4vw,2.3rem)] font-medium leading-snug text-balance">
              {it.statLine}
            </p>
            <p className="mt-6 text-[1.02rem] leading-relaxed" style={{ color: "rgba(244,239,226,0.85)" }}>
              {it.body}
            </p>
            <p className="v26-serif mt-5 text-[1.15rem] font-medium italic" style={{ color: C.amberDark }}>
              {it.resolve}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ————————————————————————— ПИТАННЯ 2 + чесна готовність ————————————————————————— */

type Dir = null | "up" | "down" | "flat";

function Q2Section({
  readiness,
  onAnswer,
  setReadiness,
}: {
  readiness: number;
  onAnswer: (qid: string, delta: number) => void;
  setReadiness: (updater: (prev: number) => number) => void;
}) {
  const q = COPY.q2;
  const [outcome, setOutcome] = useState<null | "ok" | "no">(null);
  const [demoDip, setDemoDip] = useState(false);
  // Direction is the ACTUAL needle movement (prev→next), the single source of truth
  // for every caption — never inferred from the local question outcome.
  const [dir, setDir] = useState<Dir>(null);
  const dipped = dir === "down";
  const captionShown = outcome !== null;

  const dirOf = (prev: number, next: number): Dir =>
    next < prev ? "down" : next > prev ? "up" : "flat";

  const moveLabel =
    dir === "down"
      ? "показник опустився"
      : dir === "up"
        ? "показник піднявся"
        : dir === "flat"
          ? "показник не змінився"
          : "рухається за твоїми відповідями";

  const bodyText = demoDip
    ? q.demoNote
    : dir === "down"
      ? q.dipBody
      : dir === "up"
        ? q.riseBody
        : q.flatBody;

  return (
    <Section>
      <SectionHead title="Питання 2 — і чесна готовність" sub={q.tag} />
      <div className="v26-reveal mt-12 grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start lg:gap-14">
        <TicketCard
          data={q}
          onAnswered={(ok) => {
            const delta = ok ? R.q2.ok : R.q2.no;
            const next = clamp01(readiness + delta);
            setDir(dirOf(readiness, next));
            setOutcome(ok ? "ok" : "no");
            setDemoDip(false);
            onAnswer("q2", delta);
          }}
        />

        {/* The readiness dial delivered at the emotional moment */}
        <div className="lg:pt-4">
          <div className="mx-auto max-w-[280px]">
            <div className="rounded-md p-5" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
              <Gauge value={readiness} size={230} />
              <p className="mt-1 text-center text-[0.68rem] tracking-[0.06em]" style={{ color: C.fade }}>
                {q.demoLabel}
              </p>
              <div className="mt-1.5 flex items-center justify-center gap-2 text-[0.78rem]" style={{ color: dipped ? C.ochre : C.fade }}>
                {dipped ? <TrendingDown size={14} strokeWidth={1.9} /> : <RefreshCw size={13} strokeWidth={1.75} />}
                {moveLabel}
              </div>
            </div>
          </div>

          <div className="mt-6 max-w-md">
            {captionShown ? (
              <>
                <p className="v26-serif text-xl font-medium leading-snug" style={{ color: dipped ? C.ochre : C.green }}>
                  {q.dipCaption}
                </p>
                <p className="mt-3 text-[0.98rem] leading-relaxed">{bodyText}</p>
                {outcome === "ok" && !demoDip && dir === "up" && (
                  <button
                    type="button"
                    onClick={() => {
                      // The toggle only shows after a genuine rise, so subtracting the
                      // decay delta is always a real downward move.
                      setDemoDip(true);
                      setDir("down");
                      setReadiness((prev) => clamp01(prev + R.q2dip));
                    }}
                    className="v26-tap mt-4 inline-flex items-center gap-2 rounded-[0.3rem] px-3 py-2 text-sm font-medium transition-colors"
                    style={{ border: `1px solid ${C.ochre}`, color: C.ochre }}
                  >
                    <TrendingDown size={15} strokeWidth={1.9} />
                    {q.demoToggle}
                  </button>
                )}
              </>
            ) : (
              <p className="text-[0.98rem] leading-relaxed" style={{ color: C.fade }}>
                Відповідай на білет ліворуч — і дивись, як показник реагує. На складній темі він може й піти вниз.
              </p>
            )}
            <p className="v26-serif mt-6 border-t pt-5 text-[1.05rem] font-medium italic leading-snug" style={{ borderColor: C.rule, color: C.green }}>
              {q.moat}
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ————————————————————————— МЕХАНІЗМ ————————————————————————— */

function MechanismSection() {
  const m = COPY.mechanism;
  return (
    <Section>
      <SectionHead title={m.title} sub={m.sublabel} />
      <ol className="v26-reveal mt-12 grid gap-px overflow-hidden rounded-md sm:grid-cols-3" style={{ background: C.rule, border: `1px solid ${C.rule}` }}>
        {m.steps.map((s) => (
          <li key={s.n} className="flex flex-col px-6 py-8" style={{ background: C.surface }}>
            <span className="v26-serif text-[2.6rem] font-semibold leading-none" style={{ color: C.ochre }}>
              {s.n}
            </span>
            <h3 className="v26-serif mt-4 text-[1.1rem] font-semibold leading-snug">{s.title}</h3>
            <p className="mt-2 text-[0.92rem] leading-relaxed" style={{ color: C.fade }}>
              {s.body}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/* ————————————————————————— ПИТАННЯ 3 → твоя дата ————————————————————————— */

function Q3Section({ onAnswer }: { onAnswer: (qid: string, target: number) => void }) {
  const q = COPY.q3;
  return (
    <Section>
      <SectionHead title="Питання 3 — і твоя дата" sub="Останній білет, а далі — наведи готовність на день іспиту" />
      <div className="v26-reveal mt-12 grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start lg:gap-14">
        <div>
          <TicketCard data={q} onAnswered={(ok) => onAnswer("q3", ok ? R.q3.ok : R.q3.no)} />
          <p className="v26-serif mt-6 text-[clamp(1.3rem,3vw,1.9rem)] font-medium leading-snug text-balance" style={{ color: C.greenDeep }}>
            {q.hinge}
          </p>
        </div>
        <PlanPicker />
      </div>
    </Section>
  );
}

function PlanPicker() {
  const p = COPY.plan;
  const [date, setDate] = useState("");
  const lineRef = useRef<HTMLDivElement>(null);

  const days = (() => {
    if (!date) return null;
    const target = new Date(date + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / 86400000);
  })();

  const todayStr = new Date().toLocaleDateString("en-CA");
  const past = days !== null && days <= 0;
  const intensive = days !== null && days > 0 && days <= 7;
  const effDays = days !== null && days > 0 ? days : null;
  const perDay = effDays !== null ? Math.min(140, Math.max(18, Math.ceil(N.bank / effDays))) : null;

  useEffect(() => {
    if (effDays === null || prefersReduced()) return;
    let cancelled = false;
    (async () => {
      const { gsap } = await import("gsap");
      if (cancelled || !lineRef.current) return;
      gsap.fromTo(lineRef.current, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.7, ease: "power2.out" });
    })();
    return () => {
      cancelled = true;
    };
  }, [effDays, date]);

  return (
    <div className="lg:pt-2">
      <div className="rounded-md p-6 sm:p-7" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
        <label htmlFor="v26-exam-date" className="flex items-center gap-2 text-sm font-medium" style={{ color: C.ink }}>
          <CalendarDays size={17} strokeWidth={1.75} style={{ color: C.green }} />
          {p.label}
        </label>
        <input
          type="date"
          id="v26-exam-date"
          min={todayStr}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="v26-date mt-3 w-full rounded-[0.3rem] px-3 py-2.5 text-[0.95rem]"
          style={{ background: C.bg, border: `1px solid ${C.rule}`, color: C.ink }}
        />

        <div className="mt-6 border-t pt-5" style={{ borderColor: C.rule }}>
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
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="v26-serif text-4xl font-semibold" style={{ color: C.green }}>
                  ≈{days}
                </span>
                <span className="text-sm" style={{ color: C.fade }}>
                  {uaPlural(days, "день", "дні", "днів")} × {perDay}{" "}
                  {uaPlural(perDay ?? 0, "питання", "питання", "питань")}/день
                </span>
                {intensive && (
                  <span
                    className="ml-auto rounded-[0.25rem] px-2 py-0.5 text-[0.68rem] font-semibold tracking-wide"
                    style={{ background: "rgba(180,83,9,0.1)", color: C.ochre, border: `1px solid ${C.ochre}` }}
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

      <p className="mt-6 text-[1.02rem] leading-relaxed">{p.body}</p>
      <div className="mt-5 rounded-md px-5 py-4 text-sm leading-relaxed" style={{ background: C.surface, border: `1px solid ${C.rule}`, color: C.fade }}>
        <span className="font-medium" style={{ color: C.ink }}>
          {p.topicsLabel}{" "}
        </span>
        {p.topics}
      </div>
      <Link href={COPY.cta.register} className="v26-btn v26-btn-lg mt-6">
        {p.cta}
        <ArrowRight size={17} strokeWidth={2} />
      </Link>
    </div>
  );
}

/* ————————————————————————— СИМУЛЯТОР ————————————————————————— */

function SimSection() {
  const s = COPY.sim;
  return (
    <Section>
      <SectionHead title={s.title} sub={s.sublabel} />
      <div className="v26-reveal mt-12">
        <div className="grid gap-px overflow-hidden rounded-md sm:grid-cols-3" style={{ background: C.rule, border: `1px solid ${C.rule}` }}>
          {s.stats.map((st, i) => (
            <div key={i} className="flex flex-col items-center px-6 py-10 text-center" style={{ background: C.surface }}>
              <span className="v26-serif text-[clamp(3rem,7vw,4.5rem)] font-semibold leading-none" style={{ color: C.green }}>
                {st.n}
              </span>
              <span className="mt-3 text-sm" style={{ color: C.fade }}>
                {st.u}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Timer size={18} strokeWidth={1.75} style={{ color: C.ochre, marginTop: 2 }} />
            <p className="max-w-2xl text-[0.96rem] leading-relaxed">{s.note}</p>
          </div>
          <span
            className="v26-serif shrink-0 self-start rounded-[0.3rem] px-4 py-2 text-[1.05rem] font-semibold"
            style={{ background: "rgba(30,91,72,0.08)", color: C.green, border: `1px solid ${C.green}` }}
          >
            {s.wedge}
          </span>
        </div>
      </div>
    </Section>
  );
}

/* ————————————————————————— ЦІНА ПОМИЛКИ (loss band, dark ink) ————————————————————————— */

function LossBand() {
  const l = COPY.loss;
  return (
    <section className="v26-dark relative my-4 py-20 sm:py-24" style={{ background: C.inkDark, color: C.paper }}>
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <div className="v26-reveal flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="v26-serif text-[clamp(1.8rem,4.4vw,3rem)] font-semibold leading-tight text-balance">
              {l.line}{" "}
              <span style={{ color: C.ochre }}>{l.line2}</span>
            </p>
            <p className="mt-5 text-[1.05rem] leading-relaxed" style={{ color: "rgba(244,239,226,0.82)" }}>
              {l.calm}
            </p>
          </div>
          <Link
            href={COPY.cta.register}
            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-[0.4rem] px-7 py-3.5 text-[0.98rem] font-medium"
            style={{ background: C.paper, color: C.greenDeep }}
          >
            {l.cta}
            <ArrowRight size={17} strokeWidth={2} />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ————————————————————————— ЦІНА — доступ до іспиту ————————————————————————— */

const trustIcons = [ShieldCheck, Wallet, Stamp];

function PricingSection() {
  const p = COPY.pricing;
  return (
    <Section>
      <SectionHead title={p.title} sub={p.sublabel} />
      <div className="v26-reveal mt-12 grid gap-8 lg:grid-cols-[1fr_1fr] lg:gap-12">
        {/* FREE — first and longer */}
        <div className="rounded-md p-6 sm:p-8" style={{ background: C.surface, border: `1px solid ${C.rule}` }}>
          <p className="text-[0.72rem] font-semibold tracking-[0.16em]" style={{ color: C.green }}>
            {p.freeTitle.toUpperCase()}
          </p>
          <ul className="mt-5 space-y-3.5">
            {p.free.map((r) => (
              <li key={r.item} className="v26-leader flex items-baseline gap-2 text-[0.95rem]">
                <span className="min-w-0" style={{ color: C.ink }}>
                  {r.item}
                </span>
                <span className="v26-dots" aria-hidden />
                <span className="v26-serif shrink-0 font-medium" style={{ color: C.green }}>
                  безкоштовно
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-6 border-t pt-4 text-sm leading-relaxed" style={{ borderColor: C.rule, color: C.fade }}>
            {p.freeFoot}
          </p>
        </div>

        {/* PAID — intelligence only */}
        <div
          className="relative flex flex-col rounded-md p-6 sm:p-8"
          style={{ background: C.surface, border: `2px solid ${C.green}`, boxShadow: "0 20px 48px -32px rgba(30,91,72,0.55)" }}
        >
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="v26-serif text-xl font-semibold">{p.paidTitle}</p>
              <p className="mt-1 text-[0.8rem]" style={{ color: C.fade }}>
                {p.clarify}
              </p>
            </div>
            <div className="text-right">
              <p className="v26-serif text-[clamp(2.4rem,5vw,3.1rem)] font-semibold leading-none" style={{ color: C.ochre }}>
                {p.paidPrice}
              </p>
              <p className="mt-1 text-[0.78rem]" style={{ color: C.fade }}>
                {p.paidOnce}
              </p>
            </div>
          </div>
          <ul className="mt-6 space-y-3">
            {p.paidIncludes.map((it) => (
              <li key={it} className="flex items-start gap-2.5 text-[0.95rem]">
                <Check size={17} strokeWidth={2} style={{ color: C.green, marginTop: 2 }} className="shrink-0" />
                {it}
              </li>
            ))}
          </ul>

          <p className="mt-6 text-sm font-medium" style={{ color: C.ink }}>
            {p.negation} {p.anchor}
          </p>
          <p className="mt-3 rounded-[0.3rem] px-4 py-3 text-sm leading-relaxed" style={{ background: "rgba(30,91,72,0.06)", color: C.ink }}>
            {p.failsafe}
          </p>

          <Link href={COPY.cta.register} className="v26-btn v26-btn-lg mt-6 w-full">
            {p.cta}
            <ArrowRight size={17} strokeWidth={2} />
          </Link>
          <Link
            href={COPY.cta.try}
            className="v26-tap v26-link mt-3 self-center text-sm font-medium"
            style={{ color: C.green }}
          >
            {COPY.ctaSecondary}
          </Link>

          <div className="mt-6 grid grid-cols-3 gap-2 border-t pt-5" style={{ borderColor: C.rule }}>
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

/* ————————————————————————— БАЗА — чесний доказ ————————————————————————— */

function ProofSection() {
  const p = COPY.proof;
  return (
    <Section>
      <SectionHead title={p.title} sub={p.sublabel} />
      <div className="v26-reveal mt-12">
        <div className="flex flex-wrap items-end gap-x-14 gap-y-8">
          {p.stats.map((st) => (
            <div key={st.u}>
              <div className="v26-serif text-[clamp(2.8rem,6vw,4rem)] font-semibold leading-none" style={{ color: C.ink }}>
                {st.n}
              </div>
              <div className="mt-2 text-sm" style={{ color: C.fade }}>
                {st.u}
              </div>
            </div>
          ))}
          <span
            className="mb-2 inline-flex items-center gap-1.5 rounded-[0.25rem] px-2.5 py-1 text-[0.72rem] font-semibold tracking-wide"
            style={{ background: "rgba(30,91,72,0.08)", color: C.green, border: `1px solid ${C.green}` }}
          >
            <span className="v26-pulse inline-block size-2 rounded-full" style={{ background: C.green }} />
            {p.badge}
          </span>
        </div>

        {/* reserved calibration-report container — ships EMPTY of claims */}
        <div className="mt-10 max-w-2xl rounded-md border border-dashed px-5 py-5" style={{ borderColor: C.rule }}>
          <p className="text-[0.7rem] font-semibold tracking-[0.14em]" style={{ color: C.fade }}>
            {p.reservedLabel.toUpperCase()}
          </p>
          <p className="mt-2 text-[0.96rem] leading-relaxed" style={{ color: C.fade }}>
            {p.reserved}
          </p>
        </div>
      </div>
    </Section>
  );
}

/* ————————————————————————— FAQ ————————————————————————— */

function FaqSection() {
  const f = COPY.faq;
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Section>
      <SectionHead title={f.title} sub={f.sublabel} />
      <div className="v26-reveal mt-10 max-w-3xl">
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
                <span className="v26-serif text-sm font-semibold tabular-nums" style={{ color: C.ochre }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="v26-serif flex-1 text-[1.02rem] font-medium">{it.q}</span>
                <span style={{ color: C.fade }}>{isOpen ? <Minus size={17} /> : <Plus size={17} />}</span>
              </button>
              <div className="v26-acc grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out" style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}>
                <div className="min-h-0">
                  <p className="pb-5 pl-9 text-[0.96rem] leading-relaxed" style={{ color: C.ink }}>
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

/* ————————————————————————— ФІНАЛ ————————————————————————— */

const modeIcons = [Dumbbell, Timer, ClipboardList];

function Finale({ answeredCount }: { answeredCount: number }) {
  const f = COPY.finale;
  const rest = N.bank - answeredCount;
  const title =
    answeredCount > 0
      ? f.titleTemplate.replace("{n}", String(answeredCount)).replace("{rest}", String(rest))
      : f.titleZero;
  return (
    <Section className="pb-8">
      <div className="v26-reveal rounded-lg px-6 py-14 text-center sm:px-12 sm:py-20" style={{ background: C.green, color: C.paper }}>
        <h2 className="v26-serif mx-auto max-w-2xl text-[clamp(1.9rem,4.5vw,3rem)] font-semibold leading-tight text-balance">
          {title}
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-[1rem] leading-relaxed" style={{ color: "rgba(244,239,226,0.85)" }}>
          {f.sub}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href={COPY.cta.register}
            className="v26-btn-invert inline-flex w-full items-center justify-center gap-2 rounded-[0.4rem] px-7 py-3.5 text-[0.98rem] font-medium sm:w-auto"
          >
            {f.cta}
            <ArrowRight size={17} strokeWidth={2} />
          </Link>
          <Link href={COPY.cta.try} className="v26-tap v26-link text-sm font-medium" style={{ color: "rgba(244,239,226,0.92)" }}>
            {f.secondary}
          </Link>
        </div>
      </div>

      {/* mobile-first vertical mode-launcher */}
      <div className="mt-8 space-y-3">
        {f.modes.map((m, i) => {
          const Icon = modeIcons[i];
          return (
            <Link
              key={m.name}
              href={COPY.cta.register}
              className="v26-mode flex items-center gap-4 rounded-md px-5 py-4 transition-colors"
              style={{ background: C.surface, border: `1px solid ${C.rule}` }}
            >
              <Icon size={20} strokeWidth={1.75} style={{ color: C.green }} className="shrink-0" />
              <span className="flex-1">
                <span className="v26-serif block font-medium">{m.name}</span>
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

/* ————————————————————————— Footer (letterpress finale) ————————————————————————— */

function Colophon() {
  const f = COPY.footer;
  return (
    <footer className="relative mt-4" style={{ background: C.inkDark, color: C.paper }}>
      <div className="mx-auto w-full max-w-6xl px-5 py-14 sm:px-8">
        {/* oversized wordmark as a letterpress impression */}
        <div className="v26-letterpress v26-serif font-semibold leading-none tracking-[-0.02em]" style={{ fontSize: "clamp(2.6rem,9vw,6rem)" }}>
          {COPY.brand}
        </div>
        <div className="mt-6 flex flex-wrap items-baseline justify-between gap-4 border-t pt-6" style={{ borderColor: "rgba(244,239,226,0.16)" }}>
          <span className="text-[0.72rem] tracking-[0.2em]" style={{ color: C.amberDark }}>
            {f.stamp}
          </span>
          <nav className="flex gap-6 text-sm">
            <Link href={COPY.cta.register} className="v26-link v26-tap" style={{ color: C.paper }}>
              {f.nav[0]}
            </Link>
            <Link href={COPY.cta.login} className="v26-link v26-tap" style={{ color: C.paper }}>
              {f.nav[1]}
            </Link>
          </nav>
        </div>

        <p className="mt-6 max-w-3xl text-[0.78rem] leading-relaxed" style={{ color: "rgba(244,239,226,0.6)" }}>
          <span className="mb-1 block text-[0.7rem] font-semibold tracking-[0.12em]" style={{ color: "rgba(244,239,226,0.85)" }}>
            {f.colophon}
          </span>
          {f.disclaimer}
        </p>
      </div>
    </footer>
  );
}

/* ————————————————————————— Paper grain + styles ————————————————————————— */

function Grain() {
  const svg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(#n)' opacity='0.5'/></svg>`,
  );
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{ backgroundImage: `url("data:image/svg+xml,${svg}")`, opacity: 0.03, mixBlendMode: "multiply" }}
    />
  );
}

function Styles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
.v26 { font-family: var(--font-v26-body), system-ui, sans-serif; }
.v26 .v26-serif { font-family: var(--font-v26-display), Georgia, serif; }
.v26 main, .v26 header, .v26 footer { position: relative; z-index: 1; }
.v26 .v26-dark { z-index: 1; }

.v26-btn {
  display: inline-flex; align-items: center; gap: 0.5rem;
  background: ${C.green}; color: ${C.paper};
  border-radius: 0.4rem; font-weight: 500; line-height: 1;
  transition: transform .12s ease, background .18s ease, box-shadow .18s ease;
}
.v26-btn-sm { padding: 0.45rem 0.85rem; font-size: 0.85rem; }
.v26-btn-lg { padding: 0.85rem 1.4rem; font-size: 0.98rem; }
.v26-btn:hover { background: ${C.greenDeep}; box-shadow: 0 10px 24px -14px rgba(30,91,72,0.7); }
.v26-btn:active { transform: translateY(1px); }

.v26-btn-invert { background: ${C.paper}; color: ${C.greenDeep}; font-weight: 600;
  transition: transform .12s ease, background .18s ease; }
.v26-btn-invert:hover { background: #fff; }
.v26-btn-invert:active { transform: translateY(1px); }

.v26-link { position: relative; transition: opacity .15s ease; }
.v26-link::after {
  content: ""; position: absolute; left: 0; right: 0; bottom: -2px; height: 1px;
  background: currentColor; transform: scaleX(0); transform-origin: left;
  transition: transform .25s ease;
}
.v26-link:hover::after { transform: scaleX(1); }

.v26-tap { display: inline-flex; align-items: center; min-height: 44px; }
.v26-tap.v26-link::after { bottom: 50%; transform: translateY(0.7em) scaleX(0); }
.v26-tap.v26-link:hover::after { transform: translateY(0.7em) scaleX(1); }

.v26-opt:not(:disabled):hover { background: rgba(30,91,72,0.05) !important; border-color: ${C.green} !important; }

.v26-dots { flex: 1 1 auto; align-self: flex-end; margin-bottom: 0.28rem;
  border-bottom: 1.5px dotted ${C.rule}; min-width: 1.5rem; }

.v26-mode:hover { border-color: ${C.green} !important; background: #fff !important; }

.v26-pulse { animation: v26pulse 2.4s ease-in-out infinite; }
@keyframes v26pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }

/* letterpress impression on the dark footer ground */
.v26-letterpress {
  color: rgba(244,239,226,0.07);
  text-shadow: 0 1px 0 rgba(255,255,255,0.06), 0 -1px 1px rgba(0,0,0,0.5);
}

.v26-date::-webkit-calendar-picker-indicator { opacity: 0.6; cursor: pointer; }
.v26-date:focus { outline: none; border-color: ${C.green} !important; }

.v26 button:focus-visible, .v26 a:focus-visible, .v26 input:focus-visible {
  outline: 2px solid ${C.green}; outline-offset: 2px; border-radius: 0.3rem;
}

@media (prefers-reduced-motion: reduce) {
  .v26-pulse { animation: none; }
  .v26-underline path { stroke-dashoffset: 0 !important; }
}
`,
      }}
    />
  );
}
