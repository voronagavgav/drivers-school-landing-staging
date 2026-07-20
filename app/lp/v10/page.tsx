"use client";

/* ═══════════════════════════════════════════════════════════════════════
   Landing v10 — art direction «Маршрут»
   The FSRS plan drawn as a cartographic route across faint topographic paper:
   a single crimson line runs from «сьогодні» to a flagged exam date. Stone-white
   ground (#F4F4F1, near-zero chroma), Geologica display, PT Mono only for tiny
   coordinate labels inside the plan diagram. Crimson (#E03131) is capped to the
   route line, waypoint flags, and one highlighted phrase.
   Public static marketing page — no server imports.
   ═══════════════════════════════════════════════════════════════════════ */

import {
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
} from "lucide-react";
import {
  copy,
  STATS,
  HERO_VARIANTS,
  ACTIVE_HERO,
} from "./copy";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const display = Geologica({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--v10-display",
  display: "swap",
});
const mono = PT_Mono({
  subsets: ["cyrillic", "latin"],
  weight: "400",
  variable: "--v10-mono",
  display: "swap",
});

/* palette as CSS vars — carried on the root wrapper */
const paletteVars: CSSProperties = {
  ["--v10-bg" as string]: "#F4F4F1",
  ["--v10-surface" as string]: "#FFFFFF",
  ["--v10-ink" as string]: "#1A1D1F",
  ["--v10-muted" as string]: "#565A5D",
  ["--v10-line" as string]: "rgba(26,29,31,0.14)",
  ["--v10-hair" as string]: "rgba(26,29,31,0.10)",
  ["--v10-accent" as string]: "#E03131",
  ["--v10-ink-band" as string]: "#171A1B",
};

const HERO = HERO_VARIANTS[ACTIVE_HERO];

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
      style={{ fontFamily: "var(--v10-mono)" }}
      className="text-[11px] uppercase tracking-[0.12em] text-[var(--v10-muted)]"
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
      className={`group inline-flex items-center justify-center gap-2 rounded-full bg-[var(--v10-ink)] px-6 py-3.5 text-[15px] font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-12px_rgba(26,29,31,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--v10-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--v10-bg)] ${className}`}
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
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-[var(--v10-line)] bg-[var(--v10-surface)]/70 px-6 py-3.5 text-[15px] font-semibold text-[var(--v10-ink)] transition-colors duration-300 hover:border-[var(--v10-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--v10-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--v10-bg)] ${className}`}
    >
      {children}
    </Link>
  );
}

function Latitude() {
  return <div className="mx-auto h-px w-full max-w-[1200px] bg-[var(--v10-hair)]" aria-hidden="true" />;
}

/* section shell with a left waypoint dot that sits on the route rail */
function Section({
  id,
  children,
  className = "",
  waypoint = true,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
  waypoint?: boolean;
}) {
  return (
    <section
      id={id}
      data-waypoint={waypoint ? "1" : undefined}
      className={`relative mx-auto w-full max-w-[1200px] px-5 sm:px-8 ${className}`}
    >
      {children}
    </section>
  );
}

/* ─── HERO question card (the first waypoint) ────────────────────────────── */
function QuestionCard({ onAnswer }: { onAnswer: (correct: boolean) => void }) {
  const d = copy.hero.demo;
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = picked === d.correct;
  return (
    <div className="w-full rounded-2xl border border-[var(--v10-line)] bg-[var(--v10-surface)] p-5 shadow-[0_30px_60px_-30px_rgba(26,29,31,0.35)] sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--v10-ink)] text-white">
            <MapPin className="h-3.5 w-3.5" />
          </span>
          <span className="text-[12.5px] font-semibold text-[var(--v10-ink)]">{d.waypoint}</span>
        </span>
        <span className="text-[12.5px] font-medium text-[var(--v10-muted)]">{d.label}</span>
      </div>
      <p className="text-[17px] font-semibold leading-snug text-[var(--v10-ink)]">{d.question}</p>
      <div className="mt-4 grid gap-2">
        {d.options.map((opt, i) => {
          const isPicked = picked === i;
          const isRight = i === d.correct;
          let tone =
            "border-[var(--v10-line)] bg-[var(--v10-bg)] text-[var(--v10-ink)] hover:border-[var(--v10-ink)]";
          if (answered && isRight)
            tone = "border-[#227a3b] bg-[#eaf5ec] text-[#1c5c2e]";
          else if (answered && isPicked && !isRight)
            tone = "border-[var(--v10-accent)] bg-[#fdecec] text-[#9a2020]";
          else if (answered) tone = "border-[var(--v10-line)] bg-[var(--v10-bg)] text-[var(--v10-muted)]";
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
            correct ? "text-[#1c5c2e]" : "text-[var(--v10-muted)]"
          }`}
        >
          {correct ? d.correctNote : d.wrongNote}
        </p>
      )}
    </div>
  );
}

/* ─── HERO ───────────────────────────────────────────────────────────────── */
function Hero() {
  const [ready, setReady] = useState(0); // mini readiness meter 0..100
  const reduced = usePrefersReducedMotion();
  const routeRef = useRef<SVGPathElement>(null);
  const markerRef = useRef<SVGCircleElement>(null);

  // real flagged exam date on the route (today + 30 days)
  const examDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toLocaleDateString("uk-UA", { day: "numeric", month: "short" });
  }, []);

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

  const onAnswer = (correct: boolean) => {
    setReady((r) => Math.min(100, r + (correct ? 34 : 12)));
  };

  return (
    <header className="relative overflow-hidden">
      <TopoContours
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ mixBlendMode: "multiply" }}
      />
      {/* nav */}
      <nav className="relative mx-auto flex w-full max-w-[1200px] items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--v10-line)] bg-[var(--v10-surface)]">
            <Compass className="h-4 w-4 text-[var(--v10-ink)]" />
          </span>
          <span className="text-[17px] font-bold tracking-tight text-[var(--v10-ink)]">
            {copy.brand}
          </span>
        </Link>
        <div className="hidden items-center gap-7 md:flex">
          {copy.nav.links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[14px] font-medium text-[var(--v10-muted)] transition-colors hover:text-[var(--v10-ink)]"
            >
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={copy.nav.loginHref}
            className="hidden text-[14px] font-semibold text-[var(--v10-ink)] hover:text-[var(--v10-accent)] sm:inline"
          >
            {copy.nav.login}
          </Link>
          <Link
            href={copy.nav.ctaHref}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--v10-ink)] px-4 py-2.5 text-[14px] font-semibold text-white transition-transform hover:-translate-y-0.5"
          >
            {copy.nav.cta}
            <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          </Link>
        </div>
      </nav>

      {/* hero grid */}
      <div className="relative mx-auto grid w-full max-w-[1200px] grid-cols-1 items-start gap-y-5 px-5 pb-16 pt-4 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-x-10 lg:gap-y-6 lg:pb-24 lg:pt-14">
        {/* left — headline + subhead + hook + ctas (row 1 / col 1) */}
        <div className="relative z-10 max-w-[38rem] lg:col-start-1 lg:row-start-1">
          <h1
            className="text-balance font-extrabold leading-[0.98] tracking-[-0.03em] text-[var(--v10-ink)]"
            style={{ fontSize: "clamp(2.3rem, 7vw, 5.5rem)" }}
          >
            {HERO.line1}
            <br />
            {HERO.line2}
          </h1>
          <p className="mt-3 max-w-[30rem] text-pretty text-[16px] leading-relaxed text-[var(--v10-muted)] sm:mt-4 sm:text-[18px]">
            {HERO.sub}
          </p>

          {/* 1-з-5 hook — visible without scroll */}
          <div className="mt-3 inline-flex items-center gap-2.5 rounded-full border border-[var(--v10-line)] bg-[var(--v10-surface)] px-4 py-1.5 sm:mt-4">
            <span className="h-2 w-2 rounded-full bg-[var(--v10-ink)]" aria-hidden="true" />
            <span className="text-[13px] font-semibold text-[var(--v10-ink)] sm:text-[13.5px]">{copy.hero.hook}</span>
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:mt-5 sm:flex-row sm:items-center">
            <PrimaryPill href={copy.hero.ctaPrimaryHref} className="w-full sm:w-auto">
              {copy.hero.ctaPrimary}
            </PrimaryPill>
            <GhostPill href={copy.hero.ctaSecondaryHref} className="w-full sm:w-auto">
              {copy.hero.ctaSecondary}
            </GhostPill>
          </div>
        </div>

        {/* right — route + question card waypoint + mini meter (spans both rows on desktop) */}
        <div id="try" className="relative z-10 scroll-mt-24 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          {/* the crimson route line — runs in the gutter left of the card */}
          <svg
            className="pointer-events-none absolute -left-12 -top-8 z-0 hidden h-[124%] w-[132%] lg:block"
            viewBox="0 0 400 520"
            fill="none"
            aria-hidden="true"
          >
            <path
              ref={routeRef}
              d="M 74 -12 C 10 70, 8 220, 30 340 S 92 468, 150 512"
              stroke="var(--v10-accent)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray="1 0"
            />
            <circle ref={markerRef} cx={74} cy={-12} r={5} fill="var(--v10-accent)" />
            <circle cx={74} cy={-12} r={9} fill="none" stroke="var(--v10-accent)" strokeWidth={1.5} opacity={0.4} />
          </svg>

          <div className="relative z-10">
            <QuestionCard onAnswer={onAnswer} />
          </div>

          {/* mobile route stub: card → meter */}
          <div className="flex justify-start pl-6 lg:hidden" aria-hidden="true">
            <span className="my-1 h-4 w-[2px] rounded-full bg-[var(--v10-accent)]/50" />
          </div>

          {/* mini readiness meter */}
          <div className="relative z-10 mt-1 rounded-xl border border-[var(--v10-line)] bg-[var(--v10-surface)]/80 px-4 py-3.5 lg:mt-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[var(--v10-ink)]">
                {copy.hero.demo.meterHint}
              </span>
              <span className="text-[13px] font-bold tabular-nums text-[var(--v10-ink)]">
                {ready}%
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--v10-line)]">
              <div
                className="h-full rounded-full bg-[var(--v10-ink)] transition-[width] duration-700 ease-out"
                style={{ width: `${ready}%` }}
              />
            </div>
            <p className="mt-2 text-[12px] text-[var(--v10-muted)]">
              {ready === 0 ? "Відповідай — і шкала рушить з нуля." : copy.dial.caption}
            </p>
          </div>

          {/* mobile route stub: meter → flag */}
          <div className="flex justify-start pl-6 lg:hidden" aria-hidden="true">
            <span className="my-1 h-4 w-[2px] rounded-full bg-[var(--v10-accent)]/50" />
          </div>

          {/* exam flag — real computed exam date */}
          <div className="mt-1 flex items-center justify-start gap-2 lg:mt-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--v10-ink)] px-3 py-1.5 text-[12px] font-semibold text-white">
              <Flag className="h-3.5 w-3.5 text-[var(--v10-accent)]" />
              {copy.hero.flagLabel} · {examDate}
            </span>
            <Coord>{copy.hero.youAreHere} → фініш</Coord>
          </div>
        </div>

        {/* proof chips — row 2 / col 1 on desktop; below the card on mobile */}
        <div className="relative z-10 flex flex-wrap gap-2.5 lg:col-start-1 lg:row-start-2">
          {copy.hero.chips.map((c) => (
            <span
              key={c}
              className="rounded-md border border-[var(--v10-line)] bg-[var(--v10-bg)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--v10-muted)]"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}

/* ─── READINESS DIAL DEMO ────────────────────────────────────────────────── */
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

  // 270° arc gauge
  const R = 84;
  const C = 2 * Math.PI * R;
  const sweep = 0.75; // 270°
  const track = C * sweep;
  const filled = track * (val / 100);

  return (
    <Section id="dial" className="py-20 lg:py-28">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        {/* floating metric panel */}
        <div
          ref={ref}
          className="relative mx-auto w-full max-w-[360px] rounded-3xl border border-[var(--v10-line)] bg-[var(--v10-surface)] p-8 shadow-[0_40px_80px_-40px_rgba(26,29,31,0.4)]"
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
                stroke="var(--v10-line)"
                strokeWidth={12}
                strokeLinecap="round"
                strokeDasharray={`${track} ${C}`}
              />
              <circle
                cx={110}
                cy={110}
                r={R}
                fill="none"
                stroke="var(--v10-ink)"
                strokeWidth={12}
                strokeLinecap="round"
                strokeDasharray={`${filled} ${C}`}
              />
              {/* crimson «ви тут» tick at current value */}
              <g
                transform={`rotate(${(sweep * 360 * val) / 100} 110 110)`}
                style={{ transition: reduced ? "none" : undefined }}
              >
                <circle cx={110} cy={110 - R} r={6} fill="var(--v10-accent)" />
              </g>
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-[52px] font-extrabold leading-none tabular-nums text-[var(--v10-ink)]">
                {val}
                <span className="text-[24px]">%</span>
              </span>
              <span className="mt-1 text-[12px] font-medium text-[var(--v10-muted)]">
                {copy.dial.caption}
              </span>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 rounded-full border border-[var(--v10-line)] bg-[var(--v10-bg)] px-3 py-1.5">
            <span className="text-[var(--v10-muted)]">↓</span>
            <span className="text-[12.5px] font-medium text-[var(--v10-muted)]">
              {copy.dial.decayNote}
            </span>
          </div>
        </div>

        {/* copy */}
        <div className="max-w-[34rem]">
          <h2
            className="text-balance font-extrabold leading-[1.05] tracking-[-0.02em] text-[var(--v10-ink)]"
            style={{ fontSize: "clamp(1.9rem, 3.6vw, 2.9rem)" }}
          >
            {copy.dial.heading}
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-[var(--v10-muted)]">{copy.dial.body}</p>
          <p className="mt-5 border-l-0 text-[16px] leading-relaxed text-[var(--v10-ink)]">
            <span className="bg-[#fdecec] px-1 font-semibold text-[#9a2020]">
              {copy.dial.moat}
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
        className="max-w-[30rem] text-balance font-extrabold leading-[1.05] tracking-[-0.02em] text-[var(--v10-ink)]"
        style={{ fontSize: "clamp(1.9rem, 3.6vw, 2.9rem)" }}
      >
        {copy.mechanism.heading}
      </h2>
      <p className="mt-4 max-w-[34rem] text-[17px] leading-relaxed text-[var(--v10-muted)]">
        {copy.mechanism.body}
      </p>

      <div ref={wrapRef} className="relative mt-14">
        {/* the connecting route line (desktop horizontal) */}
        <div
          className="absolute left-0 right-0 top-[22px] hidden h-px bg-[var(--v10-accent)]/30 md:block"
          aria-hidden="true"
        />
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          {copy.mechanism.steps.map((s, i) => {
            const Icon = icons[i];
            return (
              <div key={s.n} className="relative">
                {/* waypoint dot on the line */}
                <div className="mb-6 flex items-center gap-3">
                  <span
                    data-wp-dot
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-[var(--v10-ink)] bg-[var(--v10-bg)] text-[15px] font-bold text-[var(--v10-ink)]"
                    style={{ fontFamily: "var(--v10-mono)" }}
                  >
                    {s.n}
                  </span>
                  <Coord>{s.coord}</Coord>
                </div>
                <Icon className="h-6 w-6 text-[var(--v10-ink)]" strokeWidth={1.6} />
                <h3 className="mt-3 text-[19px] font-bold leading-snug text-[var(--v10-ink)]">
                  {s.title}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--v10-muted)]">{s.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

/* ─── EXAM-DATE PICKER — the route redraws live ──────────────────────────── */
function Planner() {
  const reduced = usePrefersReducedMotion();
  const [date, setDate] = useState("");
  const routeRef = useRef<SVGPathElement>(null);

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const minDate = useMemo(() => today.toISOString().slice(0, 10), [today]);
  const maxDate = useMemo(() => {
    const m = new Date(today);
    m.setDate(m.getDate() + 365);
    return m.toISOString().slice(0, 10);
  }, [today]);

  const plan = useMemo(() => {
    if (!date) return null;
    const target = new Date(date + "T00:00:00");
    const days = Math.max(1, Math.round((target.getTime() - today.getTime()) / 86400000));
    const perDay = Math.max(1, Math.ceil(STATS.bank / days));
    const intensive = days < 7;
    return { days, perDay, intensive };
  }, [date, today]);

  // redraw the route (dashoffset) whenever the plan changes
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
  }, [plan, reduced]);

  // day ticks along the route
  const tickCount = plan ? Math.min(28, Math.max(4, plan.days)) : 10;
  const ticks = Array.from({ length: tickCount }, (_, i) => (i + 1) / (tickCount + 1));

  return (
    <Section id="plan" className="py-20 lg:py-28 scroll-mt-20">
      <div className="rounded-3xl border border-[var(--v10-line)] bg-[var(--v10-surface)] p-6 shadow-[0_40px_90px_-50px_rgba(26,29,31,0.4)] sm:p-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
          {/* left: prompt + input */}
          <div>
            <h2
              className="text-balance font-extrabold leading-[1.05] tracking-[-0.02em] text-[var(--v10-ink)]"
              style={{ fontSize: "clamp(1.9rem, 3.4vw, 2.7rem)" }}
            >
              {copy.planner.heading}
            </h2>
            <p className="mt-4 max-w-[30rem] text-[16px] leading-relaxed text-[var(--v10-muted)]">
              {copy.planner.body}
            </p>
            <label className="mt-6 block">
              <span className="mb-2 block text-[13px] font-semibold text-[var(--v10-ink)]">
                {copy.planner.inputLabel}
              </span>
              <input
                type="date"
                min={minDate}
                max={maxDate}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-[var(--v10-line)] bg-[var(--v10-bg)] px-4 py-3 text-[16px] font-semibold text-[var(--v10-ink)] outline-none focus:border-[var(--v10-ink)] focus:ring-2 focus:ring-[var(--v10-accent)]/30"
              />
            </label>
          </div>

          {/* right: the live route diagram */}
          <div className="rounded-2xl border border-[var(--v10-line)] bg-[var(--v10-bg)] p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[var(--v10-ink)]" />
                <Coord>{copy.planner.todayLabel}</Coord>
              </span>
              <span className="inline-flex items-center gap-2">
                <Coord>{copy.hero.flagLabel}</Coord>
                <Flag className="h-4 w-4 text-[var(--v10-accent)]" />
              </span>
            </div>

            <svg viewBox="0 0 600 120" className="h-auto w-full" fill="none" aria-hidden="true">
              {/* base guide */}
              <path
                d="M 24 60 C 180 20, 420 100, 576 48"
                stroke="var(--v10-line)"
                strokeWidth={1.5}
                strokeDasharray="4 5"
              />
              {/* live crimson route */}
              <path
                ref={routeRef}
                d="M 24 60 C 180 20, 420 100, 576 48"
                stroke="var(--v10-accent)"
                strokeWidth={2.5}
                strokeLinecap="round"
              />
              {/* day ticks */}
              {ticks.map((t, i) => {
                // sample the cubic bezier at param t
                const p0 = [24, 60],
                  p1 = [180, 20],
                  p2 = [420, 100],
                  p3 = [576, 48];
                const mt = 1 - t;
                const x =
                  mt * mt * mt * p0[0] +
                  3 * mt * mt * t * p1[0] +
                  3 * mt * t * t * p2[0] +
                  t * t * t * p3[0];
                const y =
                  mt * mt * mt * p0[1] +
                  3 * mt * mt * t * p1[1] +
                  3 * mt * t * t * p2[1] +
                  t * t * t * p3[1];
                return <circle key={i} cx={x} cy={y} r={2.5} fill="var(--v10-accent)" opacity={0.55} />;
              })}
              {/* endpoints */}
              <circle cx={24} cy={60} r={6} fill="var(--v10-ink)" />
              <g transform="translate(576 48)">
                <circle r={7} fill="var(--v10-accent)" />
                <path d="M 0 -7 L 14 -3 L 0 1 Z" fill="var(--v10-accent)" transform="translate(0 -6)" />
              </g>
            </svg>

            {/* plan preview */}
            <div className="mt-5 min-h-[92px] rounded-xl border border-[var(--v10-line)] bg-[var(--v10-surface)] p-4">
              {!plan ? (
                <p className="text-[15px] text-[var(--v10-muted)]">{copy.planner.empty}</p>
              ) : (
                <div>
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="text-[15px] text-[var(--v10-muted)]">{copy.planner.planPrefix}</span>
                    <span className="text-[30px] font-extrabold tabular-nums leading-none text-[var(--v10-ink)]">
                      {plan.days}
                    </span>
                    <span className="text-[15px] font-medium text-[var(--v10-ink)]">
                      {copy.planner.daysWord(plan.days)}
                    </span>
                    <span className="text-[var(--v10-muted)]">×</span>
                    <span className="text-[30px] font-extrabold tabular-nums leading-none text-[var(--v10-ink)]">
                      {plan.perDay}
                    </span>
                    <span className="text-[15px] font-medium text-[var(--v10-ink)]">
                      {copy.planner.perDayUnit}
                    </span>
                    {plan.intensive && (
                      <span className="rounded-full bg-[var(--v10-ink)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                        {copy.planner.intensive}
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-[14px] leading-relaxed text-[var(--v10-muted)]">
                    {plan.intensive
                      ? copy.planner.intensiveNote
                      : plan.days > 90
                        ? copy.planner.farNote
                        : copy.planner.normalNote}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ─── SIMULATOR PROMISE ──────────────────────────────────────────────────── */
function Simulator() {
  return (
    <Section id="simulator" className="py-20 lg:py-28">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="max-w-[34rem]">
          <h2
            className="text-balance font-extrabold leading-[1.05] tracking-[-0.02em] text-[var(--v10-ink)]"
            style={{ fontSize: "clamp(1.9rem, 3.6vw, 2.9rem)" }}
          >
            {copy.simulator.heading}
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-[var(--v10-muted)]">
            {copy.simulator.body}
          </p>
          <p className="mt-5 inline-block rounded-xl border border-[var(--v10-line)] bg-[var(--v10-surface)] px-4 py-3 text-[15px] font-medium text-[var(--v10-ink)]">
            {copy.simulator.free}
          </p>
          <div className="mt-6">
            <p className="mb-3 text-[13.5px] font-semibold text-[var(--v10-ink)]">
              {copy.simulator.topicsLabel}
            </p>
            <div className="flex flex-wrap gap-2">
              {copy.simulator.topics.map((t) => (
                <span
                  key={t}
                  className="rounded-md border border-[var(--v10-line)] bg-[var(--v10-bg)] px-3 py-1.5 text-[13px] text-[var(--v10-muted)]"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* fact chips as three waypoints */}
        <div className="grid grid-cols-3 gap-3">
          {copy.simulator.stats.map((s, i) => {
            const Icon = [ListChecks, Timer, ShieldCheck][i];
            return (
              <div
                key={s.cap}
                className="flex flex-col items-center rounded-2xl border border-[var(--v10-line)] bg-[var(--v10-surface)] px-3 py-6 text-center"
              >
                <Icon className="h-5 w-5 text-[var(--v10-ink)]" strokeWidth={1.6} />
                <span className="mt-3 text-[38px] font-extrabold leading-none tabular-nums text-[var(--v10-ink)]">
                  {s.n}
                </span>
                <span className="mt-2 text-[11.5px] font-medium leading-tight text-[var(--v10-muted)]">
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

/* ─── LOSS-FRAME INTERSTITIAL — full-bleed deep-ink band ─────────────────── */
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
    <section className="relative my-8 overflow-hidden bg-[var(--v10-ink-band)] py-20 lg:py-28">
      {/* crimson dashed detour line */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-70"
        viewBox="0 0 1200 360"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        aria-hidden="true"
      >
        <path
          ref={ref}
          d="M -20 300 C 260 260, 320 60, 620 120 S 1040 320, 1240 180"
          stroke="var(--v10-accent)"
          strokeWidth={2}
          strokeDasharray="8 8"
          strokeLinecap="round"
        />
      </svg>
      <div className="relative mx-auto w-full max-w-[1000px] px-5 text-center sm:px-8">
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
            className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-[15px] font-semibold text-[var(--v10-ink)] transition-transform hover:-translate-y-0.5"
          >
            {copy.interstitial.cta}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── PRICING ────────────────────────────────────────────────────────────── */
function Pricing() {
  return (
    <Section id="pricing" className="py-20 lg:py-28">
      <div className="mx-auto max-w-[860px]">
        <div className="text-center">
          <h2
            className="text-balance font-extrabold leading-[1.05] tracking-[-0.02em] text-[var(--v10-ink)]"
            style={{ fontSize: "clamp(1.9rem, 3.6vw, 2.9rem)" }}
          >
            {copy.pricing.heading}
          </h2>
          <div className="mt-4 flex flex-wrap items-baseline justify-center gap-2">
            <span className="text-[46px] font-extrabold leading-none text-[var(--v10-ink)]">
              {copy.pricing.price}
            </span>
            <span className="text-[15px] font-medium text-[var(--v10-muted)]">
              {copy.pricing.priceUnit}
            </span>
          </div>
          <p className="mx-auto mt-3 max-w-[40ch] text-[15px] text-[var(--v10-muted)]">
            {copy.pricing.priceNote}
          </p>
          <p className="mt-2 text-[15px] font-semibold text-[var(--v10-ink)]">
            {copy.pricing.anchor}
          </p>
        </div>

        {/* two-column free-vs-paid (free first, longer) */}
        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border-2 border-[var(--v10-ink)] bg-[var(--v10-surface)] p-6">
            <div className="flex items-baseline justify-between">
              <h3 className="text-[17px] font-bold text-[var(--v10-ink)]">{copy.pricing.freeTitle}</h3>
              <span className="rounded-full bg-[var(--v10-ink)] px-2.5 py-1 text-[11px] font-bold text-white">
                0 ₴
              </span>
            </div>
            <p className="mt-1 text-[13.5px] text-[var(--v10-muted)]">{copy.pricing.freeSub}</p>
            <ul className="mt-4 space-y-2.5">
              {copy.pricing.free.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[15px] text-[var(--v10-ink)]">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#227a3b]" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-[var(--v10-line)] bg-[var(--v10-bg)] p-6">
            <div className="flex items-baseline justify-between">
              <h3 className="text-[17px] font-bold text-[var(--v10-ink)]">{copy.pricing.paidTitle}</h3>
              <span className="rounded-full border border-[var(--v10-line)] px-2.5 py-1 text-[11px] font-bold text-[var(--v10-ink)]">
                {copy.pricing.price}
              </span>
            </div>
            <p className="mt-1 text-[13.5px] text-[var(--v10-muted)]">{copy.pricing.paidSub}</p>
            <ul className="mt-4 space-y-2.5">
              {copy.pricing.paid.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[15px] text-[var(--v10-ink)]">
                  <Gauge className="mt-0.5 h-4 w-4 shrink-0 text-[var(--v10-ink)]" strokeWidth={1.8} />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* negations + failsafe */}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {copy.pricing.negations.map((n) => (
            <span
              key={n}
              className="rounded-full border border-[var(--v10-line)] bg-[var(--v10-surface)] px-3.5 py-1.5 text-[13px] font-semibold text-[var(--v10-ink)]"
            >
              {n}
            </span>
          ))}
        </div>

        <p className="mx-auto mt-6 max-w-[52ch] text-center text-[14.5px] leading-relaxed text-[var(--v10-muted)]">
          {copy.pricing.failsafe}
        </p>

        <div className="mt-8 flex flex-col items-center gap-3">
          <PrimaryPill href={copy.pricing.ctaHref}>{copy.pricing.cta}</PrimaryPill>
          <p className="text-[13px] text-[var(--v10-muted)]">{copy.pricing.ctaNote}</p>
        </div>

        {/* trust band */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-[var(--v10-hair)] pt-6">
          {copy.pricing.trustBand.map((t) => (
            <span key={t} className="inline-flex items-center gap-2 text-[13.5px] text-[var(--v10-muted)]">
              <ShieldCheck className="h-4 w-4 text-[#227a3b]" />
              {t}
            </span>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ─── HONEST PROOF / БАЗА ────────────────────────────────────────────────── */
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
            className="text-balance font-extrabold leading-[1.06] tracking-[-0.02em] text-[var(--v10-ink)]"
            style={{ fontSize: "clamp(1.8rem, 3.4vw, 2.7rem)" }}
          >
            {copy.base.heading}
          </h2>
          <p className="mt-5 text-[16px] leading-relaxed text-[var(--v10-muted)]">{copy.base.body}</p>
          <div className="mt-7 grid grid-cols-3 gap-3">
            {copy.base.stats.map((s) => (
              <div key={s.cap} className="rounded-xl border border-[var(--v10-line)] bg-[var(--v10-surface)] p-4">
                <div className="text-[26px] font-extrabold tabular-nums leading-none text-[var(--v10-ink)]">
                  {s.n}
                </div>
                <div className="mt-1.5 text-[11.5px] font-medium leading-tight text-[var(--v10-muted)]">
                  {s.cap}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* reserved calibration slot — empty of claims */}
        <div className="rounded-2xl border border-dashed border-[var(--v10-line)] bg-[var(--v10-bg)] p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[16px] font-bold text-[var(--v10-ink)]">{copy.base.calibrationTitle}</h3>
            <Coord>{copy.base.calibrationTag}</Coord>
          </div>
          <p className="mt-3 text-[14px] leading-relaxed text-[var(--v10-muted)]">
            {copy.base.calibrationBody}
          </p>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[var(--v10-line)]">
            <div className="h-full w-[8%] rounded-full bg-[var(--v10-accent)]/40" />
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
          className="text-center font-extrabold leading-[1.05] tracking-[-0.02em] text-[var(--v10-ink)]"
          style={{ fontSize: "clamp(1.9rem, 3.6vw, 2.9rem)" }}
        >
          {copy.faq.heading}
        </h2>
        <div className="mt-10 divide-y divide-[var(--v10-hair)] border-y border-[var(--v10-hair)]">
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
                  <span className="text-[16.5px] font-semibold text-[var(--v10-ink)]">{it.q}</span>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[var(--v10-line)] text-[var(--v10-ink)]">
                    {isOpen ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  </span>
                </button>
                <div
                  className="grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                >
                  <div className="min-h-0">
                    <p className="pb-5 pr-10 text-[15px] leading-relaxed text-[var(--v10-muted)]">
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

/* ─── FINAL CTA + mobile mode-launcher ───────────────────────────────────── */
function FinalCta() {
  const modeIcons = [Dumbbell, Timer, RouteIcon];
  return (
    <Section className="py-20 lg:py-28">
      <div className="mx-auto max-w-[620px] text-center">
        <h2
          className="text-balance font-extrabold leading-[1.04] tracking-[-0.02em] text-[var(--v10-ink)]"
          style={{ fontSize: "clamp(2rem, 4.4vw, 3.2rem)" }}
        >
          {copy.finalCta.heading}
        </h2>
        <p className="mx-auto mt-4 max-w-[38ch] text-[17px] text-[var(--v10-muted)]">
          {copy.finalCta.sub}
        </p>
        <div className="mt-8">
          <PrimaryPill href={copy.finalCta.ctaHref}>{copy.finalCta.cta}</PrimaryPill>
        </div>

        {/* mobile vertical mode-launcher */}
        <div className="mt-10">
          <p className="mb-3 text-[12.5px] font-semibold uppercase tracking-[0.1em] text-[var(--v10-muted)]">
            {copy.finalCta.modesTitle}
          </p>
          <div className="grid gap-2.5">
            {copy.finalCta.modes.map((m, i) => {
              const Icon = modeIcons[i];
              return (
                <Link
                  key={m.label}
                  href={m.href}
                  className="group flex items-center justify-between rounded-xl border border-[var(--v10-line)] bg-[var(--v10-surface)] px-4 py-4 text-left transition-colors hover:border-[var(--v10-ink)]"
                >
                  <span className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--v10-bg)]">
                      <Icon className="h-4.5 w-4.5 text-[var(--v10-ink)]" strokeWidth={1.7} />
                    </span>
                    <span className="text-[15.5px] font-semibold text-[var(--v10-ink)]">{m.label}</span>
                  </span>
                  <ArrowUpRight className="h-4.5 w-4.5 text-[var(--v10-muted)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ─── FOOTER — dark map-legend ground ────────────────────────────────────── */
function Footer() {
  return (
    <footer className="relative mt-8 overflow-hidden bg-[var(--v10-ink-band)] pt-16 text-white/80">
      <TopoContours
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.5]"
        style={{ filter: "invert(1)" }}
      />
      <div className="relative mx-auto w-full max-w-[1200px] px-5 sm:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="inline-flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg border border-white/20">
                <Compass className="h-4 w-4 text-[var(--v10-ink)]" />
              </span>
              <span className="text-[17px] font-bold text-white">{copy.brand}</span>
            </div>
            <p className="mt-4 max-w-[38ch] text-[15px] leading-relaxed text-white/70">
              {copy.footer.tagline}
            </p>
          </div>
          <div>
            <p className="mb-4 text-[14px] font-semibold text-white/75">
              {copy.footer.legendTitle}
            </p>
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

        {/* oversized ghosted wordmark, map-legend style */}
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

/* ─── route rail (desktop) — the single line от сьогодні до іспиту ────────── */
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
      className="pointer-events-none absolute inset-y-0 left-[26px] hidden w-4 xl:block"
      aria-hidden="true"
    >
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--v10-hair)]" />
      <div
        ref={lineRef}
        className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-[var(--v10-accent)]"
      />
      <div ref={markRef} className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
        <span className="block h-2.5 w-2.5 rounded-full bg-[var(--v10-accent)] ring-4 ring-[var(--v10-accent)]/20" />
      </div>
    </div>
  );
}

/* ─── PAGE ───────────────────────────────────────────────────────────────── */
export default function V10Page() {
  useEffect(() => {
    ScrollTrigger.refresh();
    return () => {
      ScrollTrigger.getAll().forEach((s) => s.kill());
    };
  }, []);

  return (
    <main
      id="top"
      className={`${display.variable} ${mono.variable} relative min-h-screen bg-[var(--v10-bg)] text-[var(--v10-ink)] antialiased`}
      style={{ ...paletteVars, fontFamily: "var(--v10-display)" }}
    >
      <RouteRail />
      <Hero />
      <Latitude />
      <DialDemo />
      <Latitude />
      <Mechanism />
      <Latitude />
      <Planner />
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
  );
}
