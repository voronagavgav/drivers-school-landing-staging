"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ListChecks,
  CalendarClock,
  Gauge,
  Dumbbell,
  Timer,
  Map as MapIcon,
} from "lucide-react";
import {
  BRAND,
  NAV,
  HERO,
  HERO_VARIANTS,
  DIAL,
  MECHANISM,
  PICKER,
  SIMULATOR,
  LOSS,
  PRICING,
  BASE,
  FAQ,
  FINAL,
  FOOTER,
  STATS,
  ANON_TRY_HREF,
} from "./copy";

/* ------------------------------------------------------------------ */
/* palette                                                            */
const BG = "#1B1917";
const SURFACE = "#262220";
const INK = "#F2EEE6";
const GREEN = "#2F9E44";
const MUTED = "#A79E90";
// DIM was #8A8175 (≈4.12:1 on SURFACE #262220 — below AA 4.5 for sub-15px text). Lifted to #9A9184
// (≈5.1:1 on SURFACE, higher on BG) so board labels / helper lines pass AA while staying a clear
// step below MUTED, preserving the dim-board-label hierarchy.
const DIM = "#9A9184";

// split-flap tile face: subtle top/bottom halves split by a dark seam
const seam =
  "linear-gradient(180deg,#2d2825 0 calc(50% - 0.5px),#141110 calc(50% - 0.5px) calc(50% + 0.5px),#221e1b calc(50% + 0.5px) 100%)";

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");
const reduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------ */
/* split-flap row — flips its characters into place when in view      */
function FlapRow({
  text,
  className,
  tileClass,
  down = false,
  play = "view",
}: {
  text: string;
  className?: string;
  tileClass?: string;
  down?: boolean;
  play?: "view" | "now";
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const tiles = el.querySelectorAll<HTMLElement>("[data-flap]");
    const run = () => {
      if (reduced()) {
        gsap.fromTo(
          tiles,
          { opacity: 0 },
          { opacity: 1, duration: 0.35, stagger: 0.012, overwrite: true },
        );
      } else {
        gsap.fromTo(
          tiles,
          { rotateX: down ? 92 : -92, opacity: 0 },
          {
            rotateX: 0,
            opacity: 1,
            duration: 0.55,
            ease: "power3.out",
            stagger: 0.035,
            overwrite: true,
          },
        );
      }
    };
    if (play === "now") {
      run();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            run();
            io.disconnect();
          }
        });
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [text, down, play]);

  return (
    <span
      ref={ref}
      className={cx("inline-flex", className)}
      style={{ perspective: "600px" }}
      aria-label={text}
    >
      {[...text].map((ch, i) =>
        ch === " " ? (
          <span key={i} className="w-[0.34em]" aria-hidden />
        ) : (
          <span
            key={i}
            data-flap
            aria-hidden
            className={cx(
              "relative inline-flex items-center justify-center rounded-[3px] text-[#F2EEE6]",
              tileClass,
            )}
            style={{
              background: seam,
              boxShadow:
                "0 1px 0 rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
              willChange: "transform",
            }}
          >
            {ch}
          </span>
        ),
      )}
    </span>
  );
}

/* horizontal board rail divider (double hairline) */
function Rail() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5">
      <div className="h-px w-full bg-[#37312d]" />
      <div className="mt-[3px] h-px w-full bg-[#2a2522]" />
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="font-[family-name:var(--font-board)] text-[11px] tracking-[0.28em] uppercase"
      style={{ color: DIM }}
    >
      {children}
    </span>
  );
}

/* primary / secondary pills — identical styling at every depth */
function PrimaryCTA({
  children,
  href = "/register",
  className,
  dark = false,
}: {
  children: React.ReactNode;
  href?: string;
  className?: string;
  dark?: boolean;
}) {
  // `dark` variant = ink pill with ivory type, for use on the inverted light-ivory interstitial.
  return (
    <Link
      href={href}
      className={cx(
        "group inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-bold transition-transform duration-200 ease-out hover:-translate-y-0.5",
        dark ? "text-[#F2EEE6]" : "text-[#12100f]",
        className,
      )}
      style={
        dark
          ? { background: BG, boxShadow: "0 8px 24px -10px rgba(0,0,0,0.55)" }
          : { background: GREEN, boxShadow: "0 6px 24px -8px rgba(47,158,68,0.7)" }
      }
    >
      {children}
      <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
    </Link>
  );
}

function GhostCTA({
  children,
  href = ANON_TRY_HREF,
  className,
}: {
  children: React.ReactNode;
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#4a433d] bg-transparent px-6 text-[15px] font-medium text-[#F2EEE6] transition-colors duration-200 hover:border-[#6b6259] hover:bg-white/5",
        className,
      )}
    >
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* HERO strip board                                                   */
/** Days from today to STATS.examDate — same arithmetic as the picker's compute(), so the strip and
 *  the picker never disagree on the same page. Computed after mount (useState/useEffect) to avoid an
 *  SSR/hydration mismatch on the day number; SSR renders the copy default until then. */
function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.max(0, Math.round((target.getTime() - today.getTime()) / 86_400_000));
}

/** Ukrainian day-count grammar: 1 день · 2–4 дні · 0/5+ днів (with the 11–14 exception). */
function daysWord(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "ДЕНЬ";
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "ДНІ";
  return "ДНІВ";
}

function StripBoard() {
  const [tokens, setTokens] = useState<string[]>(HERO.strip);
  useEffect(() => {
    const d = daysUntil(STATS.examDate);
    setTokens((prev) => {
      const next = [...prev];
      next[3] = `${d} ${daysWord(d)}`; // ПЛАН token derived from the real date
      return next;
    });
  }, []);
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
      <span
        className="mr-1 inline-flex h-7 items-center rounded-[4px] border border-[#3a342f] px-2 font-[family-name:var(--font-board)] text-[10px] tracking-[0.2em] uppercase"
        style={{ color: DIM }}
      >
        {HERO.sampleLabel}
      </span>
      {tokens.map((tok, i) => (
        <span key={i} className="flex items-center gap-x-1.5">
          <FlapRow
            text={tok}
            play="now"
            tileClass="h-8 min-w-[0.86em] px-[0.14em] text-[15px] sm:h-9 sm:text-[17px] font-[family-name:var(--font-board)]"
            className="gap-[2px]"
          />
          {i < tokens.length - 1 && (
            <span
              aria-hidden
              className="font-[family-name:var(--font-board)] text-[15px]"
              style={{ color: DIM }}
            >
              ·
            </span>
          )}
        </span>
      ))}
      <span
        className="ml-1 inline-flex h-7 items-center rounded-[4px] px-2 font-[family-name:var(--font-board)] text-[11px] tracking-wider uppercase text-[#12100f]"
        style={{ background: GREEN }}
      >
        вчасно
      </span>
    </div>
  );
}

/* HERO quiz mechanic — answer one real question, meter ticks up      */
function HeroQuiz() {
  const [picked, setPicked] = useState<string | null>(null);
  const meterRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const q = HERO.quiz;
  const isCorrect = picked
    ? q.options.find((o) => o.key === picked)?.correct
    : false;

  const answer = (key: string) => {
    if (picked) return;
    setPicked(key);
    const correct = q.options.find((o) => o.key === key)?.correct;
    const target = correct ? 14 : 6;
    if (barRef.current) {
      gsap.fromTo(
        barRef.current,
        { width: "0%" },
        { width: `${target}%`, duration: 0.9, ease: "power2.out" },
      );
    }
    if (meterRef.current) {
      const obj = { v: 0 };
      gsap.to(obj, {
        v: target,
        duration: 0.9,
        ease: "power2.out",
        onUpdate: () => {
          if (meterRef.current)
            meterRef.current.textContent = String(Math.round(obj.v));
        },
      });
    }
  };

  return (
    <div
      className="rounded-2xl p-5 sm:p-6"
      style={{
        background: SURFACE,
        boxShadow:
          "0 30px 60px -30px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <div className="flex items-center justify-between">
        <Eyebrow>{q.label}</Eyebrow>
        <span className="font-[family-name:var(--font-board)] text-[11px]" style={{ color: DIM }}>
          ПДР
        </span>
      </div>
      <p className="mt-4 text-[15px] leading-snug font-medium sm:text-base" style={{ color: INK }}>
        {q.question}
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {q.options.map((o) => {
          const chosen = picked === o.key;
          const showState = picked !== null;
          const good = showState && o.correct;
          const bad = chosen && !o.correct;
          return (
            <button
              key={o.key}
              onClick={() => answer(o.key)}
              disabled={picked !== null}
              className={cx(
                "flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors duration-150",
                !showState &&
                  "border-[#3a342f] hover:border-[#5a524a] hover:bg-white/[0.03]",
                good && "border-[#2F9E44] bg-[#2F9E44]/12",
                bad && "border-[#6b3a34] bg-[#6b3a34]/15",
                showState && !good && !bad && "border-[#332e2a] opacity-55",
              )}
              style={{ color: INK }}
            >
              <span
                className={cx(
                  "flex size-6 shrink-0 items-center justify-center rounded-md font-[family-name:var(--font-board)] text-[12px]",
                )}
                style={{
                  background: good ? GREEN : "#332e2a",
                  color: good ? "#12100f" : DIM,
                }}
              >
                {good ? <Check className="size-3.5" /> : o.key.toUpperCase()}
              </span>
              <span className="leading-snug">{o.text}</span>
            </button>
          );
        })}
      </div>

      {/* mini readiness meter */}
      <div className="mt-5">
        <div className="flex items-center justify-between font-[family-name:var(--font-board)] text-[11px] tracking-wider uppercase" style={{ color: DIM }}>
          <span>{q.meterLabel}</span>
          <span style={{ color: picked ? GREEN : DIM }}>
            <span ref={meterRef}>0</span>%
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full" style={{ background: "#141110" }}>
          <div ref={barRef} className="h-full rounded-full" style={{ width: "0%", background: GREEN }} />
        </div>
        <p className="mt-3 text-[13px]" style={{ color: picked ? (isCorrect ? GREEN : MUTED) : DIM }}>
          {picked ? (isCorrect ? q.correctNote : q.wrongNote) : "Обери відповідь — показник почне рухатись."}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* READINESS DIAL with honest decay demo                              */
function ReadinessDial() {
  const [val, setVal] = useState(STATS.readiness);
  const ringRef = useRef<SVGCircleElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const r = 54;
  const c = 2 * Math.PI * r;

  useEffect(() => {
    const el = wrapRef.current;
    const ring = ringRef.current;
    if (!el || !ring) return;
    let done = false;
    const setRing = (v: number) => {
      ring.style.strokeDashoffset = String(c * (1 - v / 100));
    };
    setRing(STATS.readiness);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting || done) return;
          done = true;
          if (reduced()) {
            setVal(STATS.readiness - 1);
            setRing(STATS.readiness - 1);
            return;
          }
          // fill the ring, then honestly flip one digit DOWN
          gsap.fromTo(
            { v: 0 },
            { v: 0 },
            {
              v: STATS.readiness,
              duration: 1,
              ease: "power2.out",
              onUpdate: function () {
                setRing(this.targets()[0].v);
              },
            },
          );
          const t = window.setTimeout(() => {
            setVal(STATS.readiness - 1);
            gsap.to(
              { v: STATS.readiness },
              {
                v: STATS.readiness - 1,
                duration: 0.6,
                ease: "power2.inOut",
                onUpdate: function () {
                  setRing(this.targets()[0].v);
                },
              },
            );
          }, 1500);
          return () => window.clearTimeout(t);
        });
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [c]);

  return (
    <div
      ref={wrapRef}
      className="relative flex flex-col items-center gap-6 rounded-3xl p-8 sm:p-10"
      style={{
        background: SURFACE,
        boxShadow:
          "0 40px 80px -40px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      <div className="relative grid place-items-center">
        <svg width="180" height="180" viewBox="0 0 130 130" className="-rotate-90">
          <circle cx="65" cy="65" r={r} fill="none" stroke="#141110" strokeWidth="9" />
          <circle
            ref={ringRef}
            cx="65"
            cy="65"
            r={r}
            fill="none"
            stroke={GREEN}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c}
          />
        </svg>
        <div className="absolute flex items-baseline gap-1">
          <FlapRow
            key={val}
            text={String(val)}
            down
            play="now"
            tileClass="h-11 w-8 text-3xl sm:h-12 sm:w-9 sm:text-[34px] font-[family-name:var(--font-board)]"
            className="gap-[3px]"
          />
          <span className="font-[family-name:var(--font-board)] text-lg" style={{ color: MUTED }}>
            %
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="font-[family-name:var(--font-board)] text-[11px] tracking-[0.28em] uppercase" style={{ color: GREEN }}>
          {DIAL.decayLabel}
        </p>
        <p className="mt-2 text-sm" style={{ color: MUTED }}>
          {DIAL.engine}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* EXAM-DATE PICKER                                                   */
// Curated spaced-repetition volume the plan spreads over the days left — the target that feels
// exam-ready, NOT the full 2322-question bank. perDay is capped so a near date never demands an
// unrealistic number of questions per day.
const PLAN_TARGET_QUESTIONS = 560;
const PLAN_PER_DAY_CAP = 120;

function DatePicker() {
  const [date, setDate] = useState<string>(STATS.examDate);

  const compute = useCallback((d: string) => {
    if (!d) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(d + "T00:00:00");
    const days = Math.round(
      (target.getTime() - today.getTime()) / 86_400_000,
    );
    if (isNaN(days) || days < 0) return null;
    // days === 0 (exam today) or 1 (tomorrow) → its own «зовсім скоро» intensive state; cap perDay.
    const perDay = Math.min(
      PLAN_PER_DAY_CAP,
      Math.max(8, Math.ceil(PLAN_TARGET_QUESTIONS / Math.max(days, 1))),
    );
    return { days, perDay, intensive: days < 7, urgent: days <= 1 };
  }, []);

  const plan = compute(date);

  return (
    <div className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
      <div>
        <Eyebrow>{PICKER.eyebrow}</Eyebrow>
        <h2
          className="mt-3 text-[clamp(1.9rem,5vw,3rem)] leading-[1.02] font-black"
          style={{ color: INK, fontFamily: "var(--font-fira)" }}
        >
          {PICKER.heading}
        </h2>
        <label className="mt-6 block">
          <span className="font-[family-name:var(--font-board)] text-[11px] tracking-wider uppercase" style={{ color: DIM }}>
            {PICKER.inputLabel}
          </span>
          <input
            type="date"
            value={date}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDate(e.target.value)}
            className="mt-2 w-full max-w-xs rounded-xl border border-[#3a342f] bg-[#1b1917] px-4 py-3 font-[family-name:var(--font-board)] text-base outline-none transition-colors focus:border-[#2F9E44]"
            style={{ color: INK, colorScheme: "dark" }}
          />
        </label>
        <p className="mt-4 max-w-sm text-sm" style={{ color: DIM }}>
          {PICKER.note}
        </p>
      </div>

      {/* board panel: plan re-deals as the date changes */}
      <div
        className="rounded-2xl p-6 sm:p-8"
        style={{
          background: SURFACE,
          boxShadow: "0 30px 60px -34px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        <div className="font-[family-name:var(--font-board)] text-[11px] tracking-[0.28em] uppercase" style={{ color: DIM }}>
          {PICKER.planLabel}
        </div>
        {plan ? (
          <>
            <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-4">
              <div className="flex items-baseline gap-2">
                <FlapRow
                  key={"d" + plan.days}
                  text={String(plan.days)}
                  play="now"
                  tileClass="h-14 w-10 text-[34px] sm:h-16 sm:w-12 sm:text-[40px] font-[family-name:var(--font-board)]"
                  className="gap-[3px]"
                />
                <span className="text-sm" style={{ color: MUTED }}>
                  {PICKER.daysLabel}
                </span>
              </div>
              <span className="font-[family-name:var(--font-board)] text-2xl" style={{ color: DIM }}>
                ×
              </span>
              <div className="flex items-baseline gap-2">
                <FlapRow
                  key={"p" + plan.perDay}
                  text={String(plan.perDay)}
                  play="now"
                  tileClass="h-14 w-10 text-[34px] sm:h-16 sm:w-12 sm:text-[40px] font-[family-name:var(--font-board)]"
                  className="gap-[3px]"
                />
                <span className="max-w-[5rem] text-sm leading-tight" style={{ color: MUTED }}>
                  {PICKER.perDayLabel}
                </span>
              </div>
            </div>
            <div
              className="mt-6 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px]"
              style={{
                background: plan.intensive ? "#2F9E44" : "#332e2a",
                color: plan.intensive ? "#12100f" : MUTED,
              }}
            >
              {plan.urgent ? PICKER.urgent : plan.intensive ? PICKER.intensive : PICKER.calm}
            </div>
          </>
        ) : (
          <p className="mt-6 text-base" style={{ color: MUTED }}>
            {PICKER.noDate}
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ accordion                                                      */
function FaqItem({ q, a, defaultOpen }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="border-b border-[#332e2a]">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-[15px] font-bold sm:text-base" style={{ color: INK }}>
          {q}
        </span>
        <span
          className="grid size-7 shrink-0 place-items-center rounded-full border border-[#4a433d] transition-transform duration-200"
          style={{ transform: open ? "rotate(45deg)" : "none", color: MUTED }}
        >
          <span className="text-lg leading-none">+</span>
        </span>
      </button>
      <div
        className="grid transition-all duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <p className="max-w-2xl pb-5 text-sm leading-relaxed" style={{ color: MUTED }}>
            {a}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PAGE                                                               */
export default function V12Page() {
  const hero = HERO_VARIANTS[HERO.variant];
  const modeIcons = [Dumbbell, Timer, MapIcon];

  // hero headline choreography
  const headRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const el = headRef.current;
    if (!el) return;
    const lines = el.querySelectorAll("[data-line]");
    if (reduced()) {
      gsap.fromTo(lines, { opacity: 0 }, { opacity: 1, duration: 0.5, stagger: 0.1 });
      return;
    }
    gsap.fromTo(
      lines,
      { yPercent: 108, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 0.85, ease: "power4.out", stagger: 0.12, delay: 0.15 },
    );
  }, []);

  return (
    <div
      className="min-h-full font-[family-name:var(--font-fira)] antialiased"
      style={{ background: BG, color: INK }}
    >
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-[#2a2522]/80 backdrop-blur-md" style={{ background: "rgba(27,25,23,0.82)" }}>
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-3.5">
          <span className="flex items-center gap-2.5">
            <span
              className="grid size-7 place-items-center rounded-[5px] font-[family-name:var(--font-board)] text-sm text-[#12100f]"
              style={{ background: GREEN }}
            >
              DS
            </span>
            <span className="text-[15px] font-bold tracking-tight" style={{ color: INK }}>
              {BRAND}
            </span>
          </span>
          <nav className="flex items-center gap-1.5">
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-medium transition-colors hover:bg-white/5"
              style={{ color: MUTED }}
            >
              {NAV.login}
            </Link>
            <Link
              href="/register"
              className="rounded-full px-4 py-2 text-sm font-bold text-[#12100f]"
              style={{ background: GREEN }}
            >
              {NAV.register}
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="mx-auto w-full max-w-6xl px-5 pt-8 pb-16 sm:pt-12 sm:pb-20 lg:pt-16">
          <StripBoard />
          {/* Mobile: flex-col ordered headline → quiz → actions, so the one-question mechanic is
              answerable in the first viewport (hook + CTAs drop below it). Desktop: 2-col board grid,
              headline (row 1) + actions (row 2) on the left, quiz spanning both rows on the right. */}
          <div className="mt-6 flex flex-col gap-6 lg:mt-12 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:grid-rows-[auto_auto_1fr] lg:gap-x-14 lg:gap-y-6">
            {/* headline + subhead */}
            <div className="order-1 lg:col-start-1 lg:row-start-1">
              <h1
                ref={headRef}
                className="text-[clamp(2.3rem,9vw,5.4rem)] leading-[0.96] font-black tracking-[-0.02em]"
                style={{ color: INK, fontFamily: "var(--font-fira)", textWrap: "balance" }}
              >
                {hero.headline.map((line, i) => (
                  <span key={i} className="block overflow-hidden">
                    <span data-line className="block">
                      {line}
                    </span>
                  </span>
                ))}
              </h1>
              <p className="mt-4 max-w-md text-[17px] leading-snug sm:mt-5 sm:text-lg" style={{ color: MUTED }}>
                {hero.subhead}
              </p>
            </div>

            {/* one-question hero mechanic */}
            <div className="order-2 lg:order-none lg:col-start-2 lg:row-start-1 lg:row-span-3 lg:pt-2">
              <HeroQuiz />
              <div className="mt-6 flex flex-wrap gap-2">
                {HERO.chips.map((chip) => (
                  <span
                    key={chip}
                    className="inline-flex items-center rounded-full border border-[#332e2a] px-3 py-1.5 font-[family-name:var(--font-board)] text-[11px] tracking-wide"
                    style={{ color: MUTED }}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            {/* hook + CTAs (below the quiz on mobile; directly under the headline on desktop) */}
            <div className="order-3 lg:col-start-1 lg:row-start-2 lg:self-start">
              <p
                className="flex items-start gap-2.5 rounded-xl border border-[#332e2a] px-4 py-3 text-sm"
                style={{ background: "rgba(255,255,255,0.02)", color: INK }}
              >
                <span
                  className="mt-0.5 inline-block size-2 shrink-0 rounded-full"
                  style={{ background: GREEN }}
                />
                <span>{HERO.hook}</span>
              </p>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <PrimaryCTA href="/register" className="w-full sm:w-auto">
                  {HERO.ctaPrimary}
                </PrimaryCTA>
                <GhostCTA href={ANON_TRY_HREF} className="w-full sm:w-auto">
                  {HERO.ctaSecondary}
                </GhostCTA>
              </div>
            </div>
          </div>
        </section>

        <Rail />

        {/* READINESS DIAL DEMO */}
        <section className="mx-auto w-full max-w-6xl px-5 py-24 sm:py-32 lg:py-36">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <div>
              <Eyebrow>{DIAL.eyebrow}</Eyebrow>
              <h2
                className="mt-3 text-[clamp(2rem,5.5vw,3.4rem)] leading-[1.03] font-black"
                style={{ color: INK, fontFamily: "var(--font-fira)", textWrap: "balance" }}
              >
                {DIAL.heading}
              </h2>
              <p className="mt-5 text-xl font-bold" style={{ color: GREEN }}>
                {DIAL.caption}
              </p>
              <p className="mt-4 max-w-lg text-[17px] leading-relaxed" style={{ color: MUTED }}>
                {DIAL.body}
              </p>
              <p className="mt-5 max-w-lg text-[15px] leading-relaxed" style={{ color: DIM }}>
                {DIAL.moat}
              </p>
            </div>
            <ReadinessDial />
          </div>
        </section>

        <Rail />

        {/* МЕХАНІЗМ 3-STEP STRIP — tighter vertical rhythm than its neighbours for pacing variation */}
        <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:py-24 lg:py-28">
          <Eyebrow>{MECHANISM.eyebrow}</Eyebrow>
          <h2
            className="mt-3 max-w-2xl text-[clamp(1.9rem,5vw,3rem)] leading-[1.03] font-black"
            style={{ color: INK, fontFamily: "var(--font-fira)", textWrap: "balance" }}
          >
            {MECHANISM.heading}
          </h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-[#332e2a] sm:grid-cols-3" style={{ background: "#332e2a" }}>
            {MECHANISM.steps.map((s, i) => {
              const Icon = [ListChecks, CalendarClock, Gauge][i];
              return (
                <div key={s.n} className="flex flex-col gap-4 p-7" style={{ background: BG }}>
                  <div className="flex items-center justify-between">
                    <span className="font-[family-name:var(--font-board)] text-sm tracking-widest" style={{ color: GREEN }}>
                      {s.n}
                    </span>
                    <Icon className="size-5" style={{ color: DIM }} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-bold" style={{ color: INK }}>
                    {s.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
                    {s.body}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <Rail />

        {/* EXAM-DATE PICKER */}
        <section className="mx-auto w-full max-w-6xl px-5 py-24 sm:py-32 lg:py-36">
          <DatePicker />
        </section>

        <Rail />

        {/* SIMULATOR PROMISE */}
        <section className="mx-auto w-full max-w-6xl px-5 py-24 sm:py-32 lg:py-36">
          <div className="max-w-2xl">
            <Eyebrow>{SIMULATOR.eyebrow}</Eyebrow>
            <h2
              className="mt-3 text-[clamp(1.9rem,5vw,3rem)] leading-[1.03] font-black"
              style={{ color: INK, fontFamily: "var(--font-fira)", textWrap: "balance" }}
            >
              {SIMULATOR.heading}
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {SIMULATOR.facts.map((f) => (
              <div
                key={f.small}
                className="flex items-center gap-4 rounded-2xl p-6"
                style={{ background: SURFACE, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
              >
                <FlapRow
                  text={f.big}
                  tileClass="h-14 w-10 text-[34px] font-[family-name:var(--font-board)]"
                  className="gap-[3px]"
                />
                <span className="text-sm" style={{ color: MUTED }}>
                  {f.small}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-8 max-w-2xl text-[17px] leading-relaxed" style={{ color: MUTED }}>
            {SIMULATOR.body}
          </p>
          <div className="mt-8">
            <span className="font-[family-name:var(--font-board)] text-[11px] tracking-[0.28em] uppercase" style={{ color: DIM }}>
              {SIMULATOR.topicsLabel}
            </span>
            <div className="mt-3 flex flex-wrap gap-2">
              {SIMULATOR.topics.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-[#332e2a] px-3 py-1.5 text-[13px]"
                  style={{ color: MUTED }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
          <p className="mt-8 inline-flex items-center gap-2 text-[15px] font-bold" style={{ color: GREEN }}>
            <Check className="size-4" />
            {SIMULATOR.free}
          </p>
        </section>

        {/* LOSS-FRAME INTERSTITIAL — the ONE inverted light-ivory chapter break (calm-loud-calm,
            flipped for a dark page): ivory field, ink type, green ₴, dark CTA. */}
        <section className="px-5 py-24 sm:py-28" style={{ background: INK }}>
          <div className="mx-auto flex w-full max-w-4xl flex-col items-center text-center">
            <p
              className="text-[clamp(2.2rem,7vw,4.5rem)] leading-[1.02] font-black"
              style={{ color: BG, fontFamily: "var(--font-fira)", textWrap: "balance" }}
            >
              {LOSS.line1}{" "}
              <span style={{ color: GREEN }}>{LOSS.amount}</span>
            </p>
            <p
              className="mt-2 text-[clamp(1.5rem,5vw,2.6rem)] leading-tight font-black"
              style={{ color: BG, fontFamily: "var(--font-fira)" }}
            >
              {LOSS.line2}
            </p>
            <p className="mt-6 max-w-lg text-base" style={{ color: "#57514b" }}>
              {LOSS.sub}
            </p>
            <PrimaryCTA href="/register" dark className="mt-8">
              {LOSS.cta}
            </PrimaryCTA>
          </div>
        </section>

        {/* PRICING */}
        <section className="mx-auto w-full max-w-6xl px-5 py-24 sm:py-32 lg:py-36">
          <div className="max-w-2xl">
            <Eyebrow>{PRICING.eyebrow}</Eyebrow>
            <h2
              className="mt-3 text-[clamp(1.9rem,5vw,3rem)] leading-[1.03] font-black"
              style={{ color: INK, fontFamily: "var(--font-fira)", textWrap: "balance" }}
            >
              {PRICING.heading}
            </h2>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {/* FREE column first */}
            <div className="rounded-3xl border border-[#332e2a] p-8" style={{ background: "rgba(255,255,255,0.015)" }}>
              <h3 className="text-lg font-bold" style={{ color: INK }}>
                {PRICING.freeTitle}
              </h3>
              <ul className="mt-6 flex flex-col gap-3">
                {PRICING.free.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-[15px]" style={{ color: MUTED }}>
                    <Check className="mt-0.5 size-4 shrink-0" style={{ color: GREEN }} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* PAID card */}
            <div
              className="relative rounded-3xl p-8"
              style={{
                background: SURFACE,
                boxShadow: "0 40px 80px -44px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.05)",
                border: "1px solid #3d3630",
              }}
            >
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold" style={{ color: INK }}>
                    {PRICING.paidTitle.split(" — ")[0]}
                  </h3>
                  <div className="mt-2 flex items-baseline gap-2">
                    <FlapRow
                      text="399"
                      tileClass="h-12 w-9 text-[30px] font-[family-name:var(--font-board)]"
                      className="gap-[3px]"
                    />
                    <span className="text-2xl font-bold" style={{ color: INK }}>
                      ₴
                    </span>
                  </div>
                </div>
                <span
                  className="rounded-full px-3 py-1 font-[family-name:var(--font-board)] text-[11px] tracking-wider uppercase text-[#12100f]"
                  style={{ background: GREEN }}
                >
                  разово
                </span>
              </div>
              <p className="mt-2 text-sm" style={{ color: DIM }}>
                {PRICING.priceNote}
              </p>
              <ul className="mt-6 flex flex-col gap-3">
                {PRICING.paid.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-[15px]" style={{ color: INK }}>
                    <Check className="mt-0.5 size-4 shrink-0" style={{ color: GREEN }} />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-2">
                {PRICING.negations.map((n) => (
                  <span
                    key={n}
                    className="rounded-full border border-[#3d3630] px-3 py-1 font-[family-name:var(--font-board)] text-[11px]"
                    style={{ color: MUTED }}
                  >
                    {n}
                  </span>
                ))}
              </div>
              <PrimaryCTA href="/register" className="mt-7 w-full">
                {PRICING.cta}
              </PrimaryCTA>
              <p className="mt-4 text-sm font-bold" style={{ color: INK }}>
                {PRICING.anchor}
              </p>
              <p className="mt-3 text-[13px] leading-relaxed" style={{ color: DIM }}>
                {PRICING.failsafe}
              </p>
            </div>
          </div>
        </section>

        <Rail />

        {/* HONEST PROOF / БАЗА */}
        <section className="mx-auto w-full max-w-6xl px-5 py-24 sm:py-32 lg:py-36">
          <Eyebrow>{BASE.eyebrow}</Eyebrow>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
            <h2
              className="text-[clamp(1.9rem,5vw,3rem)] leading-[1.03] font-black"
              style={{ color: INK, fontFamily: "var(--font-fira)", textWrap: "balance" }}
            >
              {BASE.heading}
            </h2>
            <span
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-medium"
              style={{ borderColor: GREEN, color: GREEN }}
            >
              <span className="size-2 rounded-full" style={{ background: GREEN }} />
              {BASE.fresh}
            </span>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {BASE.stats.map((s) => (
              <div
                key={s.small}
                className="flex items-center gap-4 rounded-2xl p-6"
                style={{ background: SURFACE, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
              >
                <FlapRow
                  text={s.big}
                  tileClass="h-12 w-8 text-[26px] font-[family-name:var(--font-board)]"
                  className="gap-[3px]"
                />
                <span className="text-sm" style={{ color: MUTED }}>
                  {s.small}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-8 max-w-2xl rounded-2xl border border-dashed border-[#3a342f] p-6 text-[15px] leading-relaxed" style={{ color: DIM }}>
            {BASE.reserved}
          </p>
        </section>

        <Rail />

        {/* FAQ — opens straight on the question (no board eyebrow) to break the every-section cadence */}
        <section className="mx-auto w-full max-w-3xl px-5 py-24 sm:py-32 lg:py-36">
          <h2
            className="text-[clamp(1.9rem,5vw,3rem)] leading-[1.03] font-black"
            style={{ color: INK, fontFamily: "var(--font-fira)", textWrap: "balance" }}
          >
            {FAQ.heading}
          </h2>
          <div className="mt-8">
            {FAQ.items.map((it, i) => (
              <FaqItem key={it.q} q={it.q} a={it.a} defaultOpen={i === 0} />
            ))}
          </div>
        </section>

        <Rail />

        {/* FINAL CTA + mobile mode-launcher */}
        <section className="mx-auto w-full max-w-6xl px-5 py-24 sm:py-32 lg:py-36">
          <div className="flex flex-col items-center text-center">
            <h2
              className="text-[clamp(2.4rem,8vw,5rem)] leading-[0.98] font-black tracking-[-0.02em]"
              style={{ color: INK, fontFamily: "var(--font-fira)", textWrap: "balance" }}
            >
              {FINAL.heading}
            </h2>
            <p className="mt-5 max-w-md text-lg" style={{ color: MUTED }}>
              {FINAL.sub}
            </p>
            <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <PrimaryCTA href="/register" className="w-full sm:w-auto">
                {FINAL.ctaPrimary}
              </PrimaryCTA>
              <GhostCTA href={ANON_TRY_HREF} className="w-full sm:w-auto">
                {FINAL.ctaSecondary}
              </GhostCTA>
            </div>
          </div>

          {/* mode launcher — full-width task rows (shines on mobile) */}
          <div className="mx-auto mt-14 flex max-w-xl flex-col gap-3">
            {FINAL.modes.map((m, i) => {
              const Icon = modeIcons[i];
              return (
                <Link
                  key={m.title}
                  href={m.href}
                  className="group flex items-center gap-4 rounded-2xl border border-[#332e2a] p-5 transition-colors hover:border-[#4a433d] hover:bg-white/[0.03]"
                >
                  <span
                    className="grid size-11 shrink-0 place-items-center rounded-xl"
                    style={{ background: "#332e2a", color: GREEN }}
                  >
                    <Icon className="size-5" strokeWidth={1.6} />
                  </span>
                  <span className="flex-1">
                    <span className="block text-[15px] font-bold" style={{ color: INK }}>
                      {m.title}
                    </span>
                    <span className="block text-[13px]" style={{ color: DIM }}>
                      {m.sub}
                    </span>
                  </span>
                  <ArrowUpRight
                    className="size-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    style={{ color: MUTED }}
                  />
                </Link>
              );
            })}
          </div>
        </section>
      </main>

      {/* FOOTER — deepest ground + ghosted wordmark */}
      <footer className="relative overflow-hidden px-5 pt-20 pb-10" style={{ background: "#0e0c0b" }}>
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <span className="flex items-center gap-2.5">
                <span
                  className="grid size-7 place-items-center rounded-[5px] font-[family-name:var(--font-board)] text-sm text-[#12100f]"
                  style={{ background: GREEN }}
                >
                  DS
                </span>
                <span className="text-base font-bold" style={{ color: INK }}>
                  {FOOTER.wordmark}
                </span>
              </span>
              <p className="mt-4 max-w-xs text-sm leading-relaxed" style={{ color: MUTED }}>
                {FOOTER.tagline}
              </p>
            </div>
            {FOOTER.columns.map((col) => (
              <div key={col.title}>
                <span className="font-[family-name:var(--font-board)] text-[11px] tracking-[0.24em] uppercase" style={{ color: DIM }}>
                  {col.title}
                </span>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-sm transition-colors hover:text-[#F2EEE6]" style={{ color: MUTED }}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="mt-14 max-w-3xl text-[13px] leading-relaxed" style={{ color: DIM }}>
            {FOOTER.disclaimer}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#231f1d] pt-6">
            <span className="text-[13px]" style={{ color: DIM }}>
              {FOOTER.copyright}
            </span>
          </div>
        </div>

        {/* oversized ghosted wordmark built as outline */}
        <div aria-hidden className="pointer-events-none mt-8 select-none overflow-hidden">
          <div
            className="text-center text-[clamp(3.5rem,17vw,13rem)] leading-none font-black tracking-[-0.03em]"
            style={{
              fontFamily: "var(--font-fira)",
              color: "transparent",
              WebkitTextStroke: "1px #211d1b",
            }}
          >
            {BRAND}
          </div>
        </div>
      </footer>
    </div>
  );
}
