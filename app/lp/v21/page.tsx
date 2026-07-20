"use client";

/* ═══════════════════════════════════════════════════════════════════════
   Landing v21 — FULL CONCEPT «Твоя дата»
   Calculator-led architecture fused with the v10 «Маршрут» cartographic
   visual. The page opens by asking «Коли твій іспит?» in the hero; the
   entered date is client-state threaded through the whole page (plan
   preview, route geometry, pricing echo, CTA microcopy) and drawn as a
   literal crimson route from сьогодні to the flagged exam date.

   Visual system inherited faithfully from v10: stone-white map-paper ground
   (#F4F4F1), tinted near-black ink, single crimson route accent capped to
   the route line, waypoint dots and the dial marker; Geologica display +
   body, PT Mono only for tiny coordinate labels.

   Public static marketing page — no server imports.
   ═══════════════════════════════════════════════════════════════════════ */

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import { Geologica, PT_Mono } from "next/font/google";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  MapPin,
  Flag,
  CalendarDays,
  Timer,
  Gauge,
  Compass,
  ListChecks,
  Route as RouteIcon,
  Plus,
  Minus,
  ShieldCheck,
  Dumbbell,
  Navigation,
} from "lucide-react";
import {
  copy,
  STATS,
  HERO_VARIANTS,
  ACTIVE_HERO,
  computePlan,
  daysWord,
  planMicrocopy,
  type ExamPlan,
} from "./copy";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const display = Geologica({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--v21-display",
  display: "swap",
});
const mono = PT_Mono({
  subsets: ["cyrillic", "latin"],
  weight: "400",
  variable: "--v21-mono",
  display: "swap",
});

/* palette as CSS vars — inherited from v10 «Маршрут» */
const paletteVars: CSSProperties = {
  ["--v21-bg" as string]: "#F4F4F1",
  ["--v21-surface" as string]: "#FFFFFF",
  ["--v21-ink" as string]: "#1A1D1F",
  ["--v21-muted" as string]: "#565A5D",
  ["--v21-line" as string]: "rgba(26,29,31,0.14)",
  ["--v21-hair" as string]: "rgba(26,29,31,0.10)",
  ["--v21-accent" as string]: "#E03131",
  ["--v21-ink-band" as string]: "#171A1B",
};

const HERO = HERO_VARIANTS[ACTIVE_HERO];

/* ─── shared exam-date state (the concept's spine) ───────────────────────── */
type DateCtx = {
  date: string;
  setDate: (d: string) => void;
  plan: ExamPlan | null;
  previewDays: number; // plan.days, or the 30-day fallback
  hasDate: boolean;
  minDate: string;
  maxDate: string;
  examLabel: string | null; // «23 лип» style, or null
};
const ExamDateContext = createContext<DateCtx | null>(null);
function useExamDate() {
  const ctx = useContext(ExamDateContext);
  if (!ctx) throw new Error("useExamDate outside provider");
  return ctx;
}

function ExamDateProvider({ children }: { children: ReactNode }) {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const [date, setDate] = useState("");
  const plan = useMemo(() => (date ? computePlan(date, today) : null), [date, today]);
  const minDate = useMemo(() => today.toISOString().slice(0, 10), [today]);
  const maxDate = useMemo(() => {
    const m = new Date(today);
    m.setDate(m.getDate() + 365);
    return m.toISOString().slice(0, 10);
  }, [today]);
  const examLabel = useMemo(() => {
    if (!date) return null;
    return new Date(date + "T00:00:00").toLocaleDateString("uk-UA", {
      day: "numeric",
      month: "short",
    });
  }, [date]);

  const value: DateCtx = {
    date,
    setDate,
    plan,
    previewDays: plan?.days ?? STATS.fallbackDays,
    hasDate: Boolean(plan),
    minDate,
    maxDate,
    examLabel,
  };
  return <ExamDateContext.Provider value={value}>{children}</ExamDateContext.Provider>;
}

/* prefers-reduced-motion (read once on mount) */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/* ─── topographic contours (deterministic generator, ~4% ink) ────────────── */
function smoothClosedPath(pts: [number, number][]) {
  if (pts.length < 3) return "";
  const mid = (a: [number, number], b: [number, number]): [number, number] => [
    (a[0] + b[0]) / 2,
    (a[1] + b[1]) / 2,
  ];
  const first = mid(pts[pts.length - 1], pts[0]);
  let d = `M ${first[0].toFixed(1)} ${first[1].toFixed(1)}`;
  for (let i = 0; i < pts.length; i++) {
    const curr = pts[i];
    const next = pts[(i + 1) % pts.length];
    const m = mid(curr, next);
    d += ` Q ${curr[0].toFixed(1)} ${curr[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`;
  }
  return d + " Z";
}
function ring(cx: number, cy: number, r: number, seed: number): string {
  const pts: [number, number][] = [];
  const K = 26;
  for (let i = 0; i < K; i++) {
    const a = (i / K) * Math.PI * 2;
    const rr =
      r +
      r * 0.11 * Math.sin(a * 3 + seed) +
      r * 0.06 * Math.sin(a * 5 + seed * 1.7) +
      r * 0.04 * Math.sin(a * 7 + seed * 0.6);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.82]);
  }
  return smoothClosedPath(pts);
}
function cluster(cx: number, cy: number, seed: number, rings = 7, base = 40, step = 34) {
  return Array.from({ length: rings }, (_, i) => ring(cx, cy, base + i * step, seed + i * 0.4));
}
function TopoContours({ className, style }: { className?: string; style?: CSSProperties }) {
  const paths = useMemo(
    () => [
      ...cluster(220, 180, 1.3, 8, 30, 30),
      ...cluster(1040, 620, 4.1, 9, 36, 32),
      ...cluster(680, 380, 2.6, 6, 46, 40),
    ],
    [],
  );
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 1280 800"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {paths.map((d, i) => (
        <path key={i} d={d} stroke="#1A1D1F" strokeWidth={1} opacity={0.045} />
      ))}
    </svg>
  );
}

/* ─── small building blocks ──────────────────────────────────────────────── */
function Coord({ children }: { children: ReactNode }) {
  return (
    <span
      style={{ fontFamily: "var(--v21-mono)" }}
      className="text-[11px] uppercase tracking-[0.12em] text-[var(--v21-muted)]"
    >
      {children}
    </span>
  );
}

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
      className={`group inline-flex items-center justify-center gap-2 rounded-full bg-[var(--v21-accent)] px-6 py-3.5 text-[15px] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-12px_rgba(224,49,49,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--v21-ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--v21-bg)] ${className}`}
    >
      {children}
      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
    </Link>
  );
}
function GhostPill({
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
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-[var(--v21-line)] bg-[var(--v21-surface)]/70 px-6 py-3.5 text-[15px] font-semibold text-[var(--v21-ink)] transition-colors duration-300 hover:border-[var(--v21-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--v21-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--v21-bg)] ${className}`}
    >
      {children}
    </Link>
  );
}

function Latitude() {
  return <div className="mx-auto h-px w-full max-w-[1200px] bg-[var(--v21-hair)]" aria-hidden="true" />;
}

function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`relative mx-auto w-full max-w-[1200px] px-5 sm:px-8 ${className}`}>
      {children}
    </section>
  );
}

/* ─── the date field, styled as a map annotation (the hero mechanic) ─────── */
function DateAnnotation({ compact = false }: { compact?: boolean }) {
  const { date, setDate, plan, minDate, maxDate } = useExamDate();
  return (
    <div className="w-full rounded-2xl border border-[var(--v21-line)] bg-[var(--v21-surface)] p-5 shadow-[0_30px_60px_-30px_rgba(26,29,31,0.35)] sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--v21-accent)] text-white">
            <Flag className="h-3.5 w-3.5" />
          </span>
          <span className="text-[15px] font-bold text-[var(--v21-ink)]">{copy.hero.question}</span>
        </span>
        <Coord>{copy.hero.flagLabel}</Coord>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-[12.5px] font-semibold text-[var(--v21-muted)]">
          {copy.hero.inputLabel}
        </span>
        <input
          type="date"
          min={minDate}
          max={maxDate}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label={copy.hero.inputLabel}
          className="w-full rounded-xl border border-[var(--v21-line)] bg-[var(--v21-bg)] px-4 py-3 text-[16px] font-semibold text-[var(--v21-ink)] outline-none transition-colors focus:border-[var(--v21-ink)] focus:ring-2 focus:ring-[var(--v21-accent)]/30"
        />
      </label>

      {/* live plan echo — 200ms crossfade, fixed min-height so no layout jump */}
      <div
        key={plan ? plan.days : "empty"}
        className="mt-4 min-h-[58px] animate-[v21fade_.2s_ease-out]"
        style={{ animationName: "v21fade" }}
      >
        {!plan ? (
          <div className="rounded-xl border border-dashed border-[var(--v21-line)] bg-[var(--v21-bg)] px-4 py-3">
            <p className="text-[13.5px] leading-snug text-[var(--v21-muted)]">
              {copy.hero.noDateFallback}
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border border-[var(--v21-line)] bg-[var(--v21-bg)] px-4 py-3">
            <span className="text-[13px] text-[var(--v21-muted)]">{copy.hero.planPrefix}</span>
            <span className="text-[26px] font-extrabold leading-none tabular-nums text-[var(--v21-ink)]">
              {plan.days}
            </span>
            <span className="text-[13.5px] font-medium text-[var(--v21-ink)]">
              {daysWord(plan.days)}
            </span>
            <span className="text-[var(--v21-muted)]">×</span>
            <span className="text-[26px] font-extrabold leading-none tabular-nums text-[var(--v21-ink)]">
              {plan.perDay}
            </span>
            <span className="text-[13.5px] font-medium text-[var(--v21-ink)]">
              {copy.hero.perDayUnit}
            </span>
            {plan.intensive && (
              <span className="rounded-full bg-[var(--v21-accent)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                {copy.hero.intensive}
              </span>
            )}
          </div>
        )}
      </div>
      {!compact && (
        <a
          href="#marshrut"
          className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--v21-accent)] hover:underline"
        >
          Побачити маршрут <ArrowRight className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
  );
}

/* ─── HERO ───────────────────────────────────────────────────────────────── */
function Hero() {
  const reduced = usePrefersReducedMotion();
  const routeRef = useRef<SVGPathElement>(null);
  const markerRef = useRef<SVGCircleElement>(null);

  useLayoutEffect(() => {
    const path = routeRef.current;
    if (!path) return;
    const len = path.getTotalLength();
    if (reduced) {
      path.style.strokeDasharray = "none";
      path.style.strokeDashoffset = "0";
      return;
    }
    gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
    const tl = gsap.timeline({ delay: 0.25 });
    tl.to(path, { strokeDashoffset: 0, duration: 1.6, ease: "power3.out" });
    if (markerRef.current) {
      tl.fromTo(markerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 }, "-=0.3");
    }
    return () => {
      tl.kill();
    };
  }, [reduced]);

  return (
    <header className="relative overflow-hidden">
      <TopoContours
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ mixBlendMode: "multiply" }}
      />
      {/* nav */}
      <nav className="relative mx-auto flex w-full max-w-[1200px] items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--v21-line)] bg-[var(--v21-surface)]">
            <Compass className="h-4 w-4 text-[var(--v21-ink)]" />
          </span>
          <span className="text-[17px] font-bold tracking-tight text-[var(--v21-ink)]">
            {copy.brand}
          </span>
        </Link>
        <div className="hidden items-center gap-7 md:flex">
          {copy.nav.links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[14px] font-medium text-[var(--v21-muted)] transition-colors hover:text-[var(--v21-ink)]"
            >
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={copy.nav.loginHref}
            className="hidden text-[14px] font-semibold text-[var(--v21-ink)] hover:text-[var(--v21-accent)] sm:inline"
          >
            {copy.nav.login}
          </Link>
          <Link
            href={copy.nav.ctaHref}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--v21-ink)] px-4 py-2.5 text-[14px] font-semibold text-white transition-transform hover:-translate-y-0.5"
          >
            {copy.nav.cta}
            <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          </Link>
        </div>
      </nav>

      {/* hero grid */}
      <div className="relative mx-auto grid w-full max-w-[1200px] grid-cols-1 items-start gap-y-6 px-5 pb-16 pt-4 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-x-10 lg:gap-y-6 lg:pb-24 lg:pt-14">
        {/* left — headline + sub + hook + ctas */}
        <div className="relative z-10 max-w-[38rem] lg:col-start-1 lg:row-start-1">
          <h1
            className="text-balance font-extrabold leading-[0.98] tracking-[-0.03em] text-[var(--v21-ink)]"
            style={{ fontSize: "clamp(2.3rem, 6.6vw, 5rem)" }}
          >
            {HERO.line1}
            <br />
            {HERO.line2}
          </h1>
          <p className="mt-3 max-w-[30rem] text-pretty text-[16px] leading-relaxed text-[var(--v21-muted)] sm:mt-4 sm:text-[18px]">
            {HERO.sub}
          </p>

          {/* 1-з-5 hook — visible without scroll */}
          <div className="mt-4 inline-flex items-center gap-2.5 rounded-full border border-[var(--v21-line)] bg-[var(--v21-surface)] px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--v21-accent)]" aria-hidden="true" />
            <span className="text-[13px] font-semibold text-[var(--v21-ink)] sm:text-[13.5px]">
              {copy.hero.hook}
            </span>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <PrimaryPill href={copy.hero.ctaPrimaryHref} className="w-full sm:w-auto">
              {copy.hero.ctaPrimary}
            </PrimaryPill>
            <GhostPill href={copy.hero.ctaSecondaryHref} className="w-full sm:w-auto">
              {copy.hero.ctaSecondary}
            </GhostPill>
          </div>

          {/* proof chips */}
          <div className="mt-6 flex flex-wrap gap-2.5">
            {copy.hero.chips.map((c) => (
              <span
                key={c}
                className="rounded-md border border-[var(--v21-line)] bg-[var(--v21-bg)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--v21-muted)]"
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* right — the date annotation, with the first centimeters of route drawn beneath */}
        <div className="relative z-10 lg:col-start-2 lg:row-start-1">
          {/* the crimson route line — bleeds below toward the marshrut section */}
          <svg
            className="pointer-events-none absolute -left-8 top-16 z-0 hidden h-[150%] w-[130%] lg:block"
            viewBox="0 0 400 560"
            fill="none"
            aria-hidden="true"
          >
            <path
              ref={routeRef}
              d="M 250 -20 C 300 90, 120 180, 150 300 S 40 470, 120 580"
              stroke="var(--v21-accent)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray="1 0"
            />
            <circle ref={markerRef} cx={250} cy={-20} r={5} fill="var(--v21-accent)" />
          </svg>

          <div className="relative z-10">
            <DateAnnotation />
          </div>

          {/* start-of-route waypoint — a self-contained mini-route (сьогодні → іспит)
              so the badge always reads as sitting ON the line, even where the
              full drawn spine is absent (mobile) */}
          <div className="relative z-10 mt-4 flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--v21-ink)] px-3 py-1.5 text-[12px] font-semibold text-white">
              <span className="h-2 w-2 rounded-full bg-[var(--v21-accent)] ring-4 ring-[var(--v21-accent)]/20" aria-hidden="true" />
              {copy.hero.todayLabel}
            </span>
            <span className="relative h-px min-w-[24px] flex-1" aria-hidden="true">
              <span className="absolute inset-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-[var(--v21-accent)]/45" />
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5">
              <span className="grid h-4 w-4 place-items-center rounded-full bg-[var(--v21-accent)]" aria-hidden="true">
                <Flag className="h-2.5 w-2.5 text-white" />
              </span>
              <Coord>{copy.hero.flagLabel}</Coord>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ─── HERO question card (first waypoint of the route) ───────────────────── */
function QuestionCard({ onAnswer }: { onAnswer: (correct: boolean) => void }) {
  const d = copy.marshrut.demo;
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = picked === d.correct;
  return (
    <div className="w-full rounded-2xl border border-[var(--v21-line)] bg-[var(--v21-surface)] p-5 shadow-[0_30px_60px_-30px_rgba(26,29,31,0.35)] sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--v21-ink)] text-white">
            <MapPin className="h-3.5 w-3.5" />
          </span>
          <span className="text-[12.5px] font-semibold text-[var(--v21-ink)]">{d.waypoint}</span>
        </span>
        <span className="text-[12.5px] font-medium text-[var(--v21-muted)]">{d.label}</span>
      </div>
      <p className="text-[17px] font-semibold leading-snug text-[var(--v21-ink)]">{d.question}</p>
      <div className="mt-4 grid gap-2">
        {d.options.map((opt, i) => {
          const isPicked = picked === i;
          const isRight = i === d.correct;
          let tone =
            "border-[var(--v21-line)] bg-[var(--v21-bg)] text-[var(--v21-ink)] hover:border-[var(--v21-ink)]";
          if (answered && isRight) tone = "border-[#227a3b] bg-[#eaf5ec] text-[#1c5c2e]";
          else if (answered && isPicked && !isRight)
            tone = "border-[var(--v21-accent)] bg-[#fdecec] text-[#9a2020]";
          else if (answered) tone = "border-[var(--v21-line)] bg-[var(--v21-bg)] text-[var(--v21-muted)]";
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => {
                if (answered) return;
                setPicked(i);
                onAnswer(i === d.correct);
              }}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-[15px] font-medium transition-colors duration-200 disabled:cursor-default ${tone}`}
            >
              <span>{opt}</span>
              {answered && isRight && <Check className="h-4 w-4 shrink-0" />}
            </button>
          );
        })}
      </div>
      {answered && (
        <p
          className={`mt-4 text-[13.5px] leading-relaxed ${
            correct ? "text-[#1c5c2e]" : "text-[var(--v21-muted)]"
          }`}
        >
          {correct ? d.correctNote : d.wrongNote}
        </p>
      )}
    </div>
  );
}

/* ─── МАРШРУТ — the computed plan drawn as an SVG route to the entered date ── */
function Marshrut() {
  const { plan, previewDays, hasDate } = useExamDate();
  const reduced = usePrefersReducedMotion();
  const [ready, setReady] = useState(0);
  const [answered, setAnswered] = useState<boolean | null>(null);
  const routeRef = useRef<SVGPathElement>(null);

  // redraw the route (dashoffset) whenever the plan/preview changes
  useLayoutEffect(() => {
    const path = routeRef.current;
    if (!path) return;
    const len = path.getTotalLength();
    if (reduced) {
      path.style.strokeDasharray = "none";
      path.style.strokeDashoffset = "0";
      return;
    }
    gsap.fromTo(
      path,
      { strokeDasharray: len, strokeDashoffset: len },
      { strokeDashoffset: 0, duration: 0.9, ease: "power2.out" },
    );
  }, [previewDays, reduced]);

  // honesty: a WRONG answer moves the readiness meter by 0 — a fabricated
  // readiness figure rising on failure is exactly the fake-intelligence veneer
  // the concept bans. The payoff for a wrong answer is the explanation, not points.
  const onAnswer = (c: boolean) => {
    setAnswered(c);
    if (c) setReady((r) => Math.min(100, r + 34));
  };

  // day ticks along the route
  const tickCount = Math.min(28, Math.max(4, previewDays));
  const ticks = Array.from({ length: tickCount }, (_, i) => (i + 1) / (tickCount + 1));
  const P0 = [24, 60] as const;
  const P1 = [180, 20] as const;
  const P2 = [420, 100] as const;
  const P3 = [576, 48] as const;
  const sampleBezier = (t: number) => {
    const mt = 1 - t;
    const x =
      mt * mt * mt * P0[0] + 3 * mt * mt * t * P1[0] + 3 * mt * t * t * P2[0] + t * t * t * P3[0];
    const y =
      mt * mt * mt * P0[1] + 3 * mt * mt * t * P1[1] + 3 * mt * t * t * P2[1] + t * t * t * P3[1];
    return [x, y] as const;
  };

  const note = plan
    ? plan.intensive
      ? copy.marshrut.intensiveNote
      : plan.days > 90
        ? copy.marshrut.farNote
        : copy.marshrut.normalNote
    : copy.marshrut.normalNote;

  return (
    <Section id="marshrut" className="scroll-mt-20 py-20 lg:py-28">
      <div className="max-w-[46rem]">
        <h2
          className="text-balance font-extrabold leading-[1.05] tracking-[-0.02em] text-[var(--v21-ink)]"
          style={{ fontSize: "clamp(1.9rem, 3.6vw, 2.9rem)" }}
        >
          {copy.marshrut.heading}
        </h2>
        <p className="mt-4 max-w-[38rem] text-[17px] leading-relaxed text-[var(--v21-muted)]">
          {copy.marshrut.body}
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-10">
        {/* left — the live route diagram + plan preview */}
        <div className="rounded-3xl border border-[var(--v21-line)] bg-[var(--v21-surface)] p-6 shadow-[0_40px_90px_-50px_rgba(26,29,31,0.4)] sm:p-8">
          <div className="mb-4 flex items-center justify-between">
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[var(--v21-ink)]" />
              <Coord>{copy.marshrut.routeTodayLabel}</Coord>
            </span>
            <span className="inline-flex items-center gap-2">
              <Coord>{copy.hero.flagLabel}</Coord>
              <Flag className="h-4 w-4 text-[var(--v21-accent)]" />
            </span>
          </div>

          <svg viewBox="0 0 600 120" className="h-auto w-full" fill="none" aria-hidden="true">
            <path
              d="M 24 60 C 180 20, 420 100, 576 48"
              stroke="var(--v21-line)"
              strokeWidth={1.5}
              strokeDasharray="4 5"
            />
            <path
              ref={routeRef}
              d="M 24 60 C 180 20, 420 100, 576 48"
              stroke="var(--v21-accent)"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            {ticks.map((t, i) => {
              const [x, y] = sampleBezier(t);
              return <circle key={i} cx={x} cy={y} r={2.5} fill="var(--v21-accent)" opacity={0.55} />;
            })}
            <circle cx={24} cy={60} r={6} fill="var(--v21-ink)" />
            <g transform="translate(576 48)">
              <circle r={7} fill="var(--v21-accent)" />
              <path d="M 0 -13 L 14 -9 L 0 -5 Z" fill="var(--v21-accent)" />
            </g>
          </svg>

          {/* plan preview — pays off the hero date */}
          <div className="mt-6 rounded-2xl border border-[var(--v21-line)] bg-[var(--v21-bg)] p-5">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="text-[15px] text-[var(--v21-muted)]">{copy.hero.planPrefix}</span>
              <span className="text-[34px] font-extrabold leading-none tabular-nums text-[var(--v21-ink)]">
                {previewDays}
              </span>
              <span className="text-[15px] font-medium text-[var(--v21-ink)]">
                {daysWord(previewDays)}
              </span>
              <span className="text-[var(--v21-muted)]">×</span>
              <span className="text-[34px] font-extrabold leading-none tabular-nums text-[var(--v21-ink)]">
                {plan ? plan.perDay : Math.ceil(STATS.bank / STATS.fallbackDays)}
              </span>
              <span className="text-[15px] font-medium text-[var(--v21-ink)]">
                {copy.hero.perDayUnit}
              </span>
              {plan?.intensive && (
                <span className="rounded-full bg-[var(--v21-accent)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                  {copy.hero.intensive}
                </span>
              )}
            </div>
            <p className="mt-3 text-[14px] leading-relaxed text-[var(--v21-muted)]">
              {hasDate ? note : copy.hero.noDateFallback}
            </p>
          </div>

          {/* labelled waypoints — the route earns its name: the first stops
              echo the top-failed topics, scheduled onto the first days */}
          <div className="mt-5 border-t border-[var(--v21-hair)] pt-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <RouteIcon className="h-3.5 w-3.5 text-[var(--v21-ink)]" strokeWidth={1.7} />
                <Coord>{copy.marshrut.waypointsLabel}</Coord>
              </span>
              {plan?.intensive && (
                <span className="rounded-full bg-[var(--v21-accent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  {copy.hero.intensive}
                </span>
              )}
            </div>
            <ul className="space-y-2.5">
              {copy.marshrut.waypoints.map((t, i) => (
                <li key={t} className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--v21-accent)] ring-4 ring-[var(--v21-accent)]/15"
                    aria-hidden="true"
                  />
                  <span className="text-[14px] font-medium text-[var(--v21-ink)]">{t}</span>
                  <span className="ml-auto">
                    <Coord>день {i + 1}</Coord>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* right — first waypoint: the live question + readiness meter */}
        <div className="relative">
          <QuestionCard onAnswer={onAnswer} />

          <div className="mt-4 rounded-2xl border border-[var(--v21-line)] bg-[var(--v21-surface)]/80 px-5 py-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[var(--v21-ink)]">
                {copy.marshrut.demo.meterHint}
              </span>
              <span className="text-[14px] font-bold tabular-nums text-[var(--v21-ink)]">
                {ready}%
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--v21-line)]">
              <div
                className="h-full rounded-full bg-[var(--v21-accent)] transition-[width] duration-700 ease-out"
                style={{ width: `${ready}%` }}
              />
            </div>
            <p className="mt-2 text-[12px] text-[var(--v21-muted)]">
              {answered === null
                ? copy.marshrut.demo.meterZero
                : answered
                  ? copy.dial.caption
                  : copy.marshrut.demo.meterWrong}
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ─── ДИЛ — readiness dial as the route's position marker ─────────────────── */
function DialDemo() {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [val, setVal] = useState(71);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      setVal(64);
      return;
    }
    const obj = { v: 71 };
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top 75%",
      once: true,
      onEnter: () => {
        gsap.fromTo(
          obj,
          { v: 34 },
          {
            v: 71,
            duration: 1.1,
            ease: "power3.out",
            onUpdate: () => setVal(Math.round(obj.v)),
            onComplete: () => {
              // honesty: the dial visibly DECAYS
              gsap.to(obj, {
                v: 64,
                duration: 1.6,
                delay: 0.6,
                ease: "power1.inOut",
                onUpdate: () => setVal(Math.round(obj.v)),
              });
            },
          },
        );
      },
    });
    return () => st.kill();
  }, [reduced]);

  const R = 84;
  const C = 2 * Math.PI * R;
  const sweep = 0.75;
  const track = C * sweep;
  const filled = track * (val / 100);

  return (
    <Section id="dial" className="py-20 lg:py-28">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div
          ref={ref}
          className="relative mx-auto w-full max-w-[360px] rounded-3xl border border-[var(--v21-line)] bg-[var(--v21-surface)] p-8 shadow-[0_40px_80px_-40px_rgba(26,29,31,0.4)]"
        >
          <div className="mb-2 flex items-center justify-between">
            <Coord>{copy.dial.dialLabel}</Coord>
            <Coord>{copy.dial.panelCoord}</Coord>
          </div>
          <div className="relative mx-auto grid aspect-square w-[220px] place-items-center">
            <svg viewBox="0 0 220 220" className="h-full w-full -rotate-[135deg]" aria-hidden="true">
              <circle
                cx={110}
                cy={110}
                r={R}
                fill="none"
                stroke="var(--v21-line)"
                strokeWidth={12}
                strokeLinecap="round"
                strokeDasharray={`${track} ${C}`}
              />
              <circle
                cx={110}
                cy={110}
                r={R}
                fill="none"
                stroke="var(--v21-ink)"
                strokeWidth={12}
                strokeLinecap="round"
                strokeDasharray={`${filled} ${C}`}
              />
              <g transform={`rotate(${(sweep * 360 * val) / 100} 110 110)`}>
                <circle cx={110} cy={110 - R} r={6} fill="var(--v21-accent)" />
              </g>
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-[52px] font-extrabold leading-none tabular-nums text-[var(--v21-ink)]">
                {val}
                <span className="text-[24px]">%</span>
              </span>
              <span className="mt-1 text-[12px] font-medium text-[var(--v21-muted)]">
                {copy.dial.caption}
              </span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 rounded-full border border-[var(--v21-line)] bg-[var(--v21-bg)] px-3 py-1.5">
            <span className="text-[var(--v21-muted)]">↓</span>
            <span className="text-[12.5px] font-medium text-[var(--v21-muted)]">
              {copy.dial.decayNote}
            </span>
          </div>
        </div>

        <div className="max-w-[34rem]">
          <h2
            className="text-balance font-extrabold leading-[1.05] tracking-[-0.02em] text-[var(--v21-ink)]"
            style={{ fontSize: "clamp(1.9rem, 3.6vw, 2.9rem)" }}
          >
            {copy.dial.heading}
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-[var(--v21-muted)]">{copy.dial.body}</p>
          {/* moat reads calm/ink; the single saturated accent is reserved to
              underline the closing claim only, not spent on a red warning block */}
          <p className="mt-5 text-[16px] font-medium leading-relaxed text-[var(--v21-ink)]">
            {copy.dial.moatLead}{" "}
            <span className="font-semibold decoration-[var(--v21-accent)] decoration-2 underline-offset-4 [text-decoration-line:underline]">
              {copy.dial.moatClaim}
            </span>
          </p>
        </div>
      </div>
    </Section>
  );
}

/* ─── МЕХАНІЗМ — three numbered waypoints on one route segment ────────────── */
function Mechanism() {
  const icons = [ListChecks, CalendarDays, Gauge];
  const reduced = usePrefersReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (reduced) return;
    const el = wrapRef.current;
    if (!el) return;
    const dots = el.querySelectorAll<HTMLElement>("[data-wp-dot]");
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top 70%",
      once: true,
      onEnter: () =>
        gsap.fromTo(
          dots,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.6, ease: "expo.out", stagger: 0.18 },
        ),
    });
    return () => st.kill();
  }, [reduced]);

  return (
    <Section id="mechanism" className="py-20 lg:py-28">
      <h2
        className="max-w-[30rem] text-balance font-extrabold leading-[1.05] tracking-[-0.02em] text-[var(--v21-ink)]"
        style={{ fontSize: "clamp(1.9rem, 3.6vw, 2.9rem)" }}
      >
        {copy.mechanism.heading}
      </h2>
      <p className="mt-4 max-w-[34rem] text-[17px] leading-relaxed text-[var(--v21-muted)]">
        {copy.mechanism.body}
      </p>

      <div ref={wrapRef} className="relative mt-14">
        <div
          className="absolute left-0 right-0 top-[22px] hidden h-px bg-[var(--v21-accent)]/30 md:block"
          aria-hidden="true"
        />
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          {copy.mechanism.steps.map((s, i) => {
            const Icon = icons[i];
            return (
              <div key={s.n} className="relative">
                <div className="mb-6 flex items-center gap-3">
                  <span
                    data-wp-dot
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-[var(--v21-ink)] bg-[var(--v21-bg)] text-[15px] font-bold text-[var(--v21-ink)]"
                    style={{ fontFamily: "var(--v21-mono)" }}
                  >
                    {s.n}
                  </span>
                  <Coord>{s.coord}</Coord>
                </div>
                <Icon className="h-6 w-6 text-[var(--v21-ink)]" strokeWidth={1.6} />
                <h3 className="mt-3 text-[19px] font-bold leading-snug text-[var(--v21-ink)]">
                  {s.title}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--v21-muted)]">{s.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

/* ─── СИМУЛЯТОР — контрольна точка ────────────────────────────────────────── */
function Simulator() {
  return (
    <Section id="simulator" className="py-20 lg:py-28">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="max-w-[34rem]">
          <h2
            className="text-balance font-extrabold leading-[1.05] tracking-[-0.02em] text-[var(--v21-ink)]"
            style={{ fontSize: "clamp(1.9rem, 3.6vw, 2.9rem)" }}
          >
            {copy.simulator.heading}
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-[var(--v21-muted)]">
            {copy.simulator.body}
          </p>
          <p className="mt-5 inline-block rounded-xl border border-[var(--v21-line)] bg-[var(--v21-surface)] px-4 py-3 text-[15px] font-medium text-[var(--v21-ink)]">
            {copy.simulator.free}
          </p>
          <p className="mt-4 text-[14px] leading-relaxed text-[var(--v21-muted)]">
            {copy.simulator.passNote}
          </p>
          <div className="mt-6">
            <p className="mb-3 text-[13.5px] font-semibold text-[var(--v21-ink)]">
              {copy.simulator.topicsLabel}
            </p>
            <div className="flex flex-wrap gap-2">
              {copy.simulator.topics.map((t) => (
                <span
                  key={t}
                  className="rounded-md border border-[var(--v21-line)] bg-[var(--v21-bg)] px-3 py-1.5 text-[13px] text-[var(--v21-muted)]"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {copy.simulator.stats.map((s, i) => {
            const Icon = [ListChecks, Timer, ShieldCheck][i];
            return (
              <div
                key={s.cap}
                className="flex flex-col items-center rounded-2xl border border-[var(--v21-line)] bg-[var(--v21-surface)] px-3 py-6 text-center"
              >
                <Icon className="h-5 w-5 text-[var(--v21-ink)]" strokeWidth={1.6} />
                <span className="mt-3 text-[38px] font-extrabold leading-none tabular-nums text-[var(--v21-ink)]">
                  {s.n}
                </span>
                <span className="mt-2 text-[11.5px] font-medium leading-tight text-[var(--v21-muted)]">
                  {s.cap}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

/* ─── ІНТЕРЛЮДІЯ — ціна неготовності (full-bleed dark-ink band) ──────────── */
function Interstitial() {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<SVGPathElement>(null);
  useLayoutEffect(() => {
    const p = ref.current;
    if (!p) return;
    const len = p.getTotalLength();
    if (reduced) {
      p.style.strokeDashoffset = "0";
      return;
    }
    const st = ScrollTrigger.create({
      trigger: p,
      start: "top 80%",
      once: true,
      onEnter: () =>
        gsap.fromTo(
          p,
          { strokeDasharray: `${len}`, strokeDashoffset: len },
          { strokeDashoffset: 0, duration: 1.2, ease: "power2.out" },
        ),
    });
    return () => st.kill();
  }, [reduced]);

  return (
    <section className="relative my-8 overflow-hidden bg-[var(--v21-ink-band)] py-20 lg:py-28">
      {/* the route crosses the dark band as a thin light line — masked to the
          top/bottom thirds so it can NEVER cross the centred headline/price
          (a red line through the 250 ₴ figure reads as a banned strikethrough) */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-70"
        viewBox="0 0 1200 360"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        aria-hidden="true"
        style={{
          WebkitMaskImage:
            "linear-gradient(to bottom, #000 0%, #000 18%, transparent 36%, transparent 64%, #000 82%, #000 100%)",
          maskImage:
            "linear-gradient(to bottom, #000 0%, #000 18%, transparent 36%, transparent 64%, #000 82%, #000 100%)",
        }}
      >
        <path
          ref={ref}
          d="M -20 300 C 260 260, 320 60, 620 120 S 1040 320, 1240 180"
          stroke="var(--v21-accent)"
          strokeWidth={2}
          strokeDasharray="8 8"
          strokeLinecap="round"
        />
      </svg>
      <div
        className="relative mx-auto w-full max-w-[1000px] px-5 text-center sm:px-8"
        style={{
          background:
            "radial-gradient(62% 130% at 50% 50%, var(--v21-ink-band) 0%, rgba(23,26,27,0.72) 52%, transparent 100%)",
        }}
      >
        <span className="inline-block rounded-full border border-white/20 px-3.5 py-1 text-[13px] font-semibold text-white/80">
          {copy.interstitial.detourLabel}
        </span>
        <h2
          className="mx-auto mt-5 max-w-[18ch] text-balance font-extrabold leading-[1.05] tracking-[-0.02em] text-white"
          style={{ fontSize: "clamp(2.1rem, 5vw, 3.4rem)" }}
        >
          {copy.interstitial.big}
        </h2>
        <p className="mx-auto mt-5 max-w-[42ch] text-[17px] leading-relaxed text-white/70">
          {copy.interstitial.sub}
        </p>
        <div className="mt-8">
          <Link
            href={copy.interstitial.ctaHref}
            className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-[15px] font-semibold text-[var(--v21-ink)] transition-transform hover:-translate-y-0.5"
          >
            {copy.interstitial.cta}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── ЦІНА — card AT the route's destination, echoing the hero date ───────── */
function Pricing() {
  const { examLabel, previewDays, hasDate } = useExamDate();
  return (
    <Section id="pricing" className="py-20 lg:py-28">
      <div className="mx-auto max-w-[860px]">
        <div className="text-center">
          {/* destination marker — the route ends here */}
          <div className="mb-5 flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--v21-ink)] px-3 py-1.5 text-[12px] font-semibold text-white">
              <Flag className="h-3.5 w-3.5 text-[var(--v21-accent)]" />
              {hasDate && examLabel
                ? `${copy.hero.flagLabel} · ${examLabel}`
                : copy.hero.flagLabel}
            </span>
            <Coord>кінець маршруту</Coord>
          </div>

          <h2
            className="text-balance font-extrabold leading-[1.05] tracking-[-0.02em] text-[var(--v21-ink)]"
            style={{ fontSize: "clamp(1.9rem, 3.6vw, 2.9rem)" }}
          >
            {copy.pricing.heading}
          </h2>
          <div className="mt-4 flex flex-wrap items-baseline justify-center gap-2">
            <span className="text-[46px] font-extrabold leading-none text-[var(--v21-ink)]">
              {copy.pricing.price}
            </span>
            <span className="text-[15px] font-medium text-[var(--v21-muted)]">
              {copy.pricing.priceUnit}
            </span>
          </div>
          <p className="mx-auto mt-3 max-w-[42ch] text-[15px] text-[var(--v21-muted)]">
            {copy.pricing.priceNote}
          </p>
          {/* the hero date echoed on the card */}
          <p className="mx-auto mt-2 inline-flex items-center gap-2 rounded-full border border-[var(--v21-line)] bg-[var(--v21-surface)] px-3.5 py-1.5 text-[13px] font-semibold text-[var(--v21-ink)]">
            <Navigation className="h-3.5 w-3.5 text-[var(--v21-accent)]" />
            {hasDate && examLabel
              ? `Твій іспит — ${examLabel} · ${planMicrocopy(previewDays)}`
              : copy.pricing.boundLine}
          </p>
          <p className="mt-3 text-[15px] font-semibold text-[var(--v21-ink)]">{copy.pricing.anchor}</p>
        </div>

        {/* two-column free-vs-paid (free first, longer) */}
        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border-2 border-[var(--v21-ink)] bg-[var(--v21-surface)] p-6">
            <div className="flex items-baseline justify-between">
              <h3 className="text-[17px] font-bold text-[var(--v21-ink)]">{copy.pricing.freeTitle}</h3>
              <span className="rounded-full bg-[var(--v21-ink)] px-2.5 py-1 text-[11px] font-bold text-white">
                0 ₴
              </span>
            </div>
            <p className="mt-1 text-[13.5px] text-[var(--v21-muted)]">{copy.pricing.freeSub}</p>
            <ul className="mt-4 space-y-2.5">
              {copy.pricing.free.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[15px] text-[var(--v21-ink)]">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#227a3b]" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-[var(--v21-line)] bg-[var(--v21-bg)] p-6">
            <div className="flex items-baseline justify-between">
              <h3 className="text-[17px] font-bold text-[var(--v21-ink)]">{copy.pricing.paidTitle}</h3>
              <span className="rounded-full border border-[var(--v21-line)] px-2.5 py-1 text-[11px] font-bold text-[var(--v21-ink)]">
                {copy.pricing.price}
              </span>
            </div>
            <p className="mt-1 text-[13.5px] text-[var(--v21-muted)]">{copy.pricing.paidSub}</p>
            <ul className="mt-4 space-y-2.5">
              {copy.pricing.paid.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[15px] text-[var(--v21-ink)]">
                  <Gauge className="mt-0.5 h-4 w-4 shrink-0 text-[var(--v21-ink)]" strokeWidth={1.8} />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* negations */}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {copy.pricing.negations.map((n) => (
            <span
              key={n}
              className="rounded-full border border-[var(--v21-line)] bg-[var(--v21-surface)] px-3.5 py-1.5 text-[13px] font-semibold text-[var(--v21-ink)]"
            >
              {n}
            </span>
          ))}
        </div>

        <p className="mx-auto mt-6 max-w-[52ch] text-center text-[14.5px] leading-relaxed text-[var(--v21-muted)]">
          {copy.pricing.failsafe}
        </p>

        <div className="mt-8 flex flex-col items-center gap-3">
          <PrimaryPill href={copy.pricing.ctaHref}>{copy.pricing.cta}</PrimaryPill>
          <p className="text-[13px] text-[var(--v21-muted)]">{copy.pricing.ctaNote}</p>
        </div>

        {/* trust band */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-[var(--v21-hair)] pt-6">
          {copy.pricing.trustBand.map((t) => (
            <span key={t} className="inline-flex items-center gap-2 text-[13.5px] text-[var(--v21-muted)]">
              <ShieldCheck className="h-4 w-4 text-[#227a3b]" />
              {t}
            </span>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ─── БАЗА — чесний доказ ─────────────────────────────────────────────────── */
function Base() {
  return (
    <Section id="base" className="py-20 lg:py-28">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_0.8fr] lg:items-center">
        <div className="max-w-[34rem]">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#227a3b]/40 bg-[#eaf5ec] px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-[#227a3b]" />
            <span className="text-[12.5px] font-semibold text-[#1c5c2e]">{copy.base.badge}</span>
          </div>
          <h2
            className="text-balance font-extrabold leading-[1.06] tracking-[-0.02em] text-[var(--v21-ink)]"
            style={{ fontSize: "clamp(1.8rem, 3.4vw, 2.7rem)" }}
          >
            {copy.base.heading}
          </h2>
          <p className="mt-5 text-[16px] leading-relaxed text-[var(--v21-muted)]">{copy.base.body}</p>
          <p className="mt-4 text-[15px] font-medium text-[var(--v21-ink)]">{copy.base.retaker}</p>
          <div className="mt-7 grid grid-cols-3 gap-3">
            {copy.base.stats.map((s) => (
              <div
                key={s.cap}
                className="rounded-xl border border-[var(--v21-line)] bg-[var(--v21-surface)] p-4"
              >
                <div className="text-[26px] font-extrabold tabular-nums leading-none text-[var(--v21-ink)]">
                  {s.n}
                </div>
                <div className="mt-1.5 text-[11.5px] font-medium leading-tight text-[var(--v21-muted)]">
                  {s.cap}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* reserved calibration slot — empty of claims */}
        <div className="rounded-2xl border border-dashed border-[var(--v21-line)] bg-[var(--v21-bg)] p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[16px] font-bold text-[var(--v21-ink)]">{copy.base.calibrationTitle}</h3>
            <Coord>{copy.base.calibrationTag}</Coord>
          </div>
          <p className="mt-3 text-[14px] leading-relaxed text-[var(--v21-muted)]">
            {copy.base.calibrationBody}
          </p>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[var(--v21-line)]">
            <div className="h-full w-[8%] rounded-full bg-[var(--v21-accent)]/40" />
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ─── FAQ ────────────────────────────────────────────────────────────────── */
function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Section id="faq" className="py-20 lg:py-28">
      <div className="mx-auto max-w-[760px]">
        <h2
          className="text-center font-extrabold leading-[1.05] tracking-[-0.02em] text-[var(--v21-ink)]"
          style={{ fontSize: "clamp(1.9rem, 3.6vw, 2.9rem)" }}
        >
          {copy.faq.heading}
        </h2>
        <div className="mt-10 divide-y divide-[var(--v21-hair)] border-y border-[var(--v21-hair)]">
          {copy.faq.items.map((it, i) => {
            const isOpen = open === i;
            return (
              <div key={it.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left"
                >
                  <span className="text-[16.5px] font-semibold text-[var(--v21-ink)]">{it.q}</span>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[var(--v21-line)] text-[var(--v21-ink)]">
                    {isOpen ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  </span>
                </button>
                <div
                  className="grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                >
                  <div className="min-h-0">
                    <p className="pb-5 pr-10 text-[15px] leading-relaxed text-[var(--v21-muted)]">
                      {it.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

/* ─── ФІНАЛЬНИЙ CTA + режими ─────────────────────────────────────────────── */
function FinalCta() {
  const modeIcons = [Dumbbell, Timer, RouteIcon];
  return (
    <Section className="py-20 lg:py-28">
      <div className="mx-auto max-w-[620px] text-center">
        <h2
          className="text-balance font-extrabold leading-[1.04] tracking-[-0.02em] text-[var(--v21-ink)]"
          style={{ fontSize: "clamp(2rem, 4.4vw, 3.2rem)" }}
        >
          {copy.finalCta.heading}
        </h2>
        <p className="mx-auto mt-4 max-w-[38ch] text-[17px] text-[var(--v21-muted)]">
          {copy.finalCta.sub}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <PrimaryPill href={copy.finalCta.ctaHref}>{copy.finalCta.cta}</PrimaryPill>
          <GhostPill href={copy.finalCta.ctaSecondaryHref}>{copy.finalCta.ctaSecondary}</GhostPill>
        </div>

        {/* mobile vertical mode-launcher */}
        <div className="mt-10">
          <p className="mb-3 text-[12.5px] font-semibold uppercase tracking-[0.1em] text-[var(--v21-muted)]">
            {copy.finalCta.modesTitle}
          </p>
          <div className="grid gap-2.5">
            {copy.finalCta.modes.map((m, i) => {
              const Icon = modeIcons[i];
              return (
                <Link
                  key={m.label}
                  href={m.href}
                  className="group flex items-center justify-between rounded-xl border border-[var(--v21-line)] bg-[var(--v21-surface)] px-4 py-4 text-left transition-colors hover:border-[var(--v21-ink)]"
                >
                  <span className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--v21-bg)]">
                      <Icon className="h-[18px] w-[18px] text-[var(--v21-ink)]" strokeWidth={1.7} />
                    </span>
                    <span className="text-[15.5px] font-semibold text-[var(--v21-ink)]">{m.label}</span>
                  </span>
                  <ArrowUpRight className="h-[18px] w-[18px] text-[var(--v21-muted)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ─── ФУТЕР — dark map-legend ground ─────────────────────────────────────── */
function Footer() {
  return (
    <footer className="relative mt-8 overflow-hidden bg-[var(--v21-ink-band)] pt-16 text-white/80">
      <TopoContours
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.5]"
        style={{ filter: "invert(1)" }}
      />
      <div className="relative mx-auto w-full max-w-[1200px] px-5 sm:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="inline-flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/20">
                <Compass className="h-4 w-4 text-[var(--v21-accent)]" />
              </span>
              <span className="text-[17px] font-bold text-white">{copy.brand}</span>
            </div>
            <p className="mt-4 max-w-[38ch] text-[15px] leading-relaxed text-white/70">
              {copy.footer.tagline}
            </p>
          </div>
          <div>
            <p className="mb-4 text-[14px] font-semibold text-white/75">{copy.footer.legendTitle}</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
              {copy.footer.legend.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="inline-flex items-center py-2.5 text-[14.5px] text-white/70 transition-colors hover:text-white"
                >
                  {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-12 max-w-[80ch] text-[12px] leading-relaxed text-white/55">
          {copy.footer.disclaimer}
        </p>

        <div className="relative mt-8 select-none overflow-hidden">
          <div
            className="whitespace-nowrap font-extrabold leading-none tracking-[-0.03em] text-white/[0.05]"
            style={{ fontSize: "clamp(3rem, 14vw, 12rem)" }}
            aria-hidden="true"
          >
            {copy.footer.ghost}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 py-6">
          <span className="text-[12.5px] text-white/55">{copy.footer.copyright}</span>
          <a
            href="#top"
            className="inline-flex items-center py-2.5 text-[12.5px] text-white/55 transition-colors hover:text-white/80"
          >
            ↑ до старту
          </a>
        </div>
      </div>
    </footer>
  );
}

/* ─── route rail (desktop) — the continuous spine drawn on scroll ─────────── */
function RouteRail() {
  const reduced = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const line = lineRef.current;
    const mark = markRef.current;
    if (!root || !line || !mark) return;
    if (reduced) {
      gsap.set(line, { scaleY: 1 });
      gsap.set(mark, { top: "0%" });
      return;
    }
    gsap.set(line, { scaleY: 0, transformOrigin: "top" });
    const st = ScrollTrigger.create({
      trigger: document.documentElement,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        gsap.set(line, { scaleY: self.progress });
        gsap.set(mark, { top: `${self.progress * 100}%` });
      },
    });
    return () => st.kill();
  }, [reduced]);

  return (
    <div
      ref={rootRef}
      className="pointer-events-none absolute inset-y-0 left-[18px] hidden w-4 md:left-[26px] md:block"
      aria-hidden="true"
    >
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--v21-hair)]" />
      <div
        ref={lineRef}
        className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-[var(--v21-accent)]"
      />
      <div ref={markRef} className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
        <span className="block h-2.5 w-2.5 rounded-full bg-[var(--v21-accent)] ring-4 ring-[var(--v21-accent)]/20" />
      </div>
    </div>
  );
}

/* ─── PAGE ───────────────────────────────────────────────────────────────── */
export default function V21Page() {
  useEffect(() => {
    ScrollTrigger.refresh();
    return () => {
      ScrollTrigger.getAll().forEach((s) => s.kill());
    };
  }, []);

  return (
    <ExamDateProvider>
      <main
        id="top"
        className={`${display.variable} ${mono.variable} relative min-h-screen bg-[var(--v21-bg)] text-[var(--v21-ink)] antialiased`}
        style={{ ...paletteVars, fontFamily: "var(--v21-display)" }}
      >
        <style>{`@keyframes v21fade{from{opacity:0}to{opacity:1}}`}</style>
        <RouteRail />
        <Hero />
        <Latitude />
        <Marshrut />
        <Latitude />
        <DialDemo />
        <Latitude />
        <Mechanism />
        <Latitude />
        <Simulator />
        <Interstitial />
        <Pricing />
        <Latitude />
        <Base />
        <Latitude />
        <Faq />
        <Latitude />
        <FinalCta />
        <Footer />
      </main>
    </ExamDateProvider>
  );
}
