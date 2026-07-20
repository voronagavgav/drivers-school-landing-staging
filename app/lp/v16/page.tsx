"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import {
  ArrowRight,
  ArrowDown,
  ArrowUpRight,
  Check,
  X,
  Dumbbell,
  Timer,
  Map as MapIcon,
} from "lucide-react";
import {
  BRAND,
  ANON_TRY_HREF,
  STATS,
  HERO_VARIANTS,
  PLAN_TARGET_QUESTIONS,
  PLAN_PER_DAY_CAP,
  COPY,
} from "./copy";

/* ------------------------------------------------------------------ */
/* palette — inherited faithfully from v12 «Табло»                     */
const BG = "#1B1917";
const SURFACE = "#262220";
const INK = "#F2EEE6";
const GREEN = "#2F9E44";
const MUTED = "#A79E90";
// AA-safe dim board-label ink (≈5.1:1 on SURFACE), a clear step below MUTED.
const DIM = "#9A9184";

// split-flap tile face: subtle top/bottom halves split by a dark seam
const seam =
  "linear-gradient(180deg,#2d2825 0 calc(50% - 0.5px),#141110 calc(50% - 0.5px) calc(50% + 0.5px),#221e1b calc(50% + 0.5px) 100%)";

const cx = (...c: (string | false | undefined | null)[]) =>
  c.filter(Boolean).join(" ");
const reduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------ */
/* split-flap row — flips its characters into place when in view       */
function FlapRow({
  text,
  className,
  tileClass,
  gap = "gap-[3px]",
  down = false,
  play = "view",
}: {
  text: string;
  className?: string;
  tileClass?: string;
  gap?: string;
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
            stagger: 0.045,
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
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [text, down, play]);

  return (
    <span
      ref={ref}
      className={cx("inline-flex", gap, className)}
      style={{ perspective: "700px" }}
      aria-label={text}
    >
      {[...text].map((ch, i) =>
        ch === " " ? (
          <span key={i} className="w-[0.3em]" aria-hidden />
        ) : (
          <span
            key={i}
            data-flap
            aria-hidden
            className={cx(
              "relative inline-flex items-center justify-center rounded-[3px] tabular-nums text-[#F2EEE6]",
              tileClass,
            )}
            style={{
              background: seam,
              boxShadow:
                "0 1px 0 rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.045)",
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

/* monumental hero number — per-char tile widths so the comma reads as a punctuation flap */
function BigFlap({ text, play = "now" }: { text: string; play?: "view" | "now" }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const tiles = el.querySelectorAll<HTMLElement>("[data-flap]");
    const run = () => {
      if (reduced()) {
        gsap.fromTo(tiles, { opacity: 0 }, { opacity: 1, duration: 0.4, stagger: 0.05 });
      } else {
        gsap.fromTo(
          tiles,
          { rotateX: -95, opacity: 0 },
          {
            rotateX: 0,
            opacity: 1,
            duration: 0.7,
            ease: "power4.out",
            stagger: 0.11,
            delay: 0.1,
          },
        );
      }
    };
    if (play === "now") {
      run();
      return;
    }
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && (run(), io.disconnect())),
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [text, play]);

  return (
    <span
      ref={ref}
      className="inline-flex items-stretch gap-[clamp(4px,1.2vw,10px)]"
      style={{ perspective: "1100px" }}
      aria-hidden
    >
      {[...text].map((ch, i) => {
        const punct = ch === "," || ch === ".";
        return (
          <span
            key={i}
            data-flap
            className={cx(
              "relative inline-flex items-center justify-center rounded-[clamp(4px,1vw,8px)] font-[family-name:var(--font-board)] leading-none tabular-nums text-[#F2EEE6]",
              punct
                ? "w-[clamp(1rem,4.5vw,3.4rem)] items-end pb-[0.14em]"
                : "w-[clamp(2.7rem,15vw,9.5rem)]",
              "h-[clamp(4.2rem,23vw,15rem)] text-[clamp(3rem,16vw,11rem)]",
            )}
            style={{
              background: seam,
              boxShadow:
                "0 3px 0 rgba(0,0,0,0.5), 0 20px 40px -22px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)",
              willChange: "transform",
            }}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
}

/* board slat divider (double hairline, evokes the split between flap rows) */
function Slat() {
  return (
    <>
      <div className="h-px w-full bg-[#38322d]" />
      <div className="h-px w-full bg-[#181514]" />
    </>
  );
}

/* full-width section rail divider */
function Rail() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5">
      <Slat />
    </div>
  );
}

/* mono board label — the deliberate «Табло» section-header system, rendered as a board row,
   not a generic kicker. Carries a leading status slat. */
function BoardLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="h-2 w-2 rounded-[1px]" style={{ background: GREEN }} aria-hidden />
      <span
        className="font-[family-name:var(--font-board)] text-[11px] tracking-[0.3em] uppercase"
        style={{ color: DIM }}
      >
        {children}
      </span>
    </span>
  );
}

function SectionHead({
  label,
  heading,
  stat,
  className,
}: {
  label: string;
  heading: string;
  stat?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {/* section header AS a board row — label on the rail, a flap-set statistic on the right */}
      <div>
        <Slat />
        <div className="flex items-center justify-between gap-4 py-3.5">
          <BoardLabel>{label}</BoardLabel>
          {stat && (
            <FlapRow
              text={stat}
              tileClass="h-8 min-w-[1.15rem] px-[0.12em] text-[17px] sm:h-9 sm:text-[19px] font-[family-name:var(--font-board)]"
            />
          )}
        </div>
        <Slat />
      </div>
      <h2
        className="mt-6 max-w-[18ch] text-[clamp(1.9rem,5vw,3.1rem)] leading-[1.05] font-black tracking-[-0.02em]"
        style={{ color: INK, fontFamily: "var(--font-fira)", textWrap: "balance" }}
      >
        {heading}
      </h2>
    </div>
  );
}

/* primary / secondary pills — identical styling at every depth */
function PrimaryCTA({
  children,
  href = "/register",
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
        "group inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-bold text-[#12100f] transition-transform duration-200 ease-out hover:-translate-y-0.5",
        className,
      )}
      style={{ background: GREEN, boxShadow: "0 8px 26px -8px rgba(47,158,68,0.65)" }}
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

/* CTA pair + reassurance chips — repeated after each internalized number */
function CtaPair({
  primary,
  secondary,
  className,
}: {
  primary: string;
  secondary: string;
  className?: string;
}) {
  return (
    <div className={cx("flex w-full flex-col gap-3 sm:w-auto sm:flex-row", className)}>
      <PrimaryCTA href="/register" className="w-full sm:w-auto">
        {primary}
      </PrimaryCTA>
      <GhostCTA href={ANON_TRY_HREF} className="w-full sm:w-auto">
        {secondary}
      </GhostCTA>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* HERO — the monumental statistic as a full departure board           */
function Hero() {
  const hero = COPY.hero;
  const headline = HERO_VARIANTS[hero.variant];
  const capRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = capRef.current;
    if (!el) return;
    if (reduced()) {
      gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.5, delay: 0.3 });
      return;
    }
    gsap.fromTo(
      el,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", delay: 0.75 },
    );
  }, []);

  return (
    <section className="mx-auto w-full max-w-6xl px-5 pt-6 pb-10 sm:pt-10">
      {/* board frame */}
      <div
        className="overflow-hidden rounded-[20px] border border-[#332e2a]"
        style={{
          background: SURFACE,
          boxShadow: "0 50px 90px -50px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        {/* header rail */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 sm:px-8">
          <span
            className="font-[family-name:var(--font-board)] text-[10px] tracking-[0.26em] uppercase sm:text-[11px]"
            style={{ color: DIM }}
          >
            {hero.boardLabel}
          </span>
          <span
            className="inline-flex items-center gap-2 font-[family-name:var(--font-board)] text-[10px] tracking-[0.18em] uppercase sm:text-[11px]"
            style={{ color: DIM }}
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: GREEN }} />
            {hero.boardStatus}
          </span>
        </div>
        <Slat />

        {/* the number */}
        <div className="px-5 pt-9 pb-8 sm:px-8 sm:pt-12 sm:pb-10">
          <div className="flex items-start justify-between gap-[clamp(6px,2vw,16px)]">
            <div className="flex items-start gap-[clamp(6px,2vw,16px)]">
              <BigFlap text={hero.number} play="now" />
              <span
                className="mt-[0.35em] font-[family-name:var(--font-board)] text-[clamp(1.6rem,7vw,4rem)] leading-none"
                style={{ color: GREEN }}
                aria-hidden
              >
                {hero.unit}
              </span>
            </div>
            {/* right rail — composes the wide board: the concept ratio + its source */}
            <div aria-hidden className="hidden shrink-0 self-end pb-[0.5em] text-right lg:block">
              <div
                className="font-[family-name:var(--font-board)] text-[clamp(2.2rem,4.4vw,3.6rem)] leading-none"
                style={{ color: INK }}
              >
                {hero.ratio}
              </div>
              <div
                className="mt-2.5 font-[family-name:var(--font-board)] text-[11px] tracking-[0.26em] uppercase"
                style={{ color: DIM }}
              >
                {hero.ratioNote}
              </div>
            </div>
          </div>
          <p
            ref={capRef}
            className="mt-6 max-w-xl text-[15px] leading-snug sm:text-[17px]"
            style={{ color: MUTED }}
          >
            <span className="sr-only">{hero.number}% — </span>
            {hero.caption}
          </p>

          {/* swappable headline slot — the single real h1 (both variants live here) */}
          <h1
            className="mt-7 max-w-3xl text-[clamp(1.55rem,4.6vw,2.7rem)] leading-[1.08] font-black tracking-[-0.02em]"
            style={{ color: INK, fontFamily: "var(--font-fira)", textWrap: "balance" }}
          >
            {headline}
          </h1>

          {/* CTAs */}
          <div className="mt-8">
            <CtaPair primary={hero.ctaPrimary} secondary={hero.ctaSecondary} />
          </div>

          {/* micro-reassurance / proof chips */}
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
            {hero.chips.map((chip) => (
              <span
                key={chip}
                className="inline-flex items-center gap-2 font-[family-name:var(--font-board)] text-[11px] tracking-wide"
                style={{ color: MUTED }}
              >
                <Check className="size-3.5" style={{ color: GREEN }} />
                {chip}
              </span>
            ))}
          </div>
        </div>

        {/* peek of the next row — pulls the scroll */}
        <Slat />
        <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <span className="inline-flex items-center gap-2.5 text-[13px] sm:text-[15px]" style={{ color: DIM }}>
            <ArrowDown className="size-4" style={{ color: GREEN }} />
            {hero.peek}
          </span>
          <span
            className="font-[family-name:var(--font-board)] text-[11px] tracking-widest uppercase"
            style={{ color: DIM }}
          >
            далі ↓
          </span>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* РОЗКЛАД ПРОВАЛІВ — the number decomposed into board rows             */
function Decompose() {
  const d = COPY.decompose;
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-24 sm:py-28 lg:py-32">
      <SectionHead label={d.label} heading={d.heading} stat={d.rows[0].value} />

      {/* board panel */}
      <div
        className="mt-12 overflow-hidden rounded-2xl border border-[#332e2a]"
        style={{ background: SURFACE, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
      >
        {/* value rows */}
        {d.rows.map((r, i) => (
          <div key={r.label}>
            {i > 0 && <Slat />}
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-6 sm:px-8 sm:py-7">
              <div className="flex items-baseline gap-4">
                <FlapRow
                  text={r.value}
                  tileClass="h-11 min-w-[1.6rem] px-[0.12em] text-[26px] sm:h-14 sm:text-[34px] font-[family-name:var(--font-board)]"
                />
                <span className="text-[15px] sm:text-base" style={{ color: MUTED }}>
                  {r.label}
                </span>
              </div>
              <span
                className={cx(
                  "font-[family-name:var(--font-board)] text-sm tracking-widest",
                  r.accent ? "rounded-full px-3 py-1 text-[#12100f]" : "",
                )}
                style={r.accent ? { background: GREEN } : { color: DIM }}
              >
                {r.note}
              </span>
            </div>
          </div>
        ))}

        {/* comparison row: self-prep vs autoschool */}
        <Slat />
        <div className="px-5 py-7 sm:px-8">
          <span
            className="font-[family-name:var(--font-board)] text-[11px] tracking-[0.24em] uppercase"
            style={{ color: DIM }}
          >
            {d.compare.label}
          </span>
          <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-5">
            {[d.compare.a, d.compare.b].map((c, i) => (
              <div key={c.label} className="flex items-center gap-4">
                <div className="flex items-baseline gap-1">
                  <FlapRow
                    text={c.value}
                    tileClass="h-12 min-w-[1.7rem] px-[0.1em] text-[30px] sm:h-14 sm:text-[36px] font-[family-name:var(--font-board)]"
                  />
                  <span
                    className="font-[family-name:var(--font-board)] text-xl"
                    style={{ color: i === 0 ? GREEN : MUTED }}
                  >
                    %
                  </span>
                </div>
                <span className="text-sm leading-tight" style={{ color: MUTED }}>
                  {c.label}
                </span>
                {i === 0 && (
                  <span
                    className="hidden font-[family-name:var(--font-board)] text-2xl sm:inline"
                    style={{ color: "#4a433d" }}
                  >
                    ›
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed" style={{ color: DIM }}>
            {d.compare.note}
          </p>
        </div>
      </div>

      {/* the argument, landed as data */}
      <div className="mt-12 max-w-3xl">
        <p
          className="text-[clamp(1.5rem,4vw,2.3rem)] leading-[1.12] font-black"
          style={{ color: INK, fontFamily: "var(--font-fira)", textWrap: "balance" }}
        >
          {d.argument}
        </p>
        <p className="mt-5 flex items-start gap-3 text-[17px] leading-relaxed" style={{ color: MUTED }}>
          <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-[1px]" style={{ background: GREEN }} />
          {d.punch}
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* ПРИХОВАНА ЗМІННА — readiness dial with honest decay demo             */
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
    let t: number | undefined;
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
          gsap.fromTo(
            { v: 0 },
            { v: 0 },
            {
              v: STATS.readiness,
              duration: 1.1,
              ease: "power2.out",
              onUpdate: function () {
                setRing(this.targets()[0].v);
              },
            },
          );
          t = window.setTimeout(() => {
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
          }, 1700);
        });
      },
      { threshold: 0.45 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (t) window.clearTimeout(t);
    };
  }, [c]);

  return (
    <div
      ref={wrapRef}
      className="relative flex flex-col items-center gap-6 rounded-2xl border border-[#332e2a] p-8 sm:p-10"
      style={{
        background: SURFACE,
        boxShadow: "0 40px 80px -44px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      <div className="relative grid place-items-center">
        <svg width="200" height="200" viewBox="0 0 130 130" className="-rotate-90">
          <circle cx="65" cy="65" r={r} fill="none" stroke="#141110" strokeWidth="8" />
          <circle
            ref={ringRef}
            cx="65"
            cy="65"
            r={r}
            fill="none"
            stroke={GREEN}
            strokeWidth="8"
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
            tileClass="h-12 w-9 text-[34px] sm:h-14 sm:w-11 sm:text-[40px] font-[family-name:var(--font-board)]"
          />
          <span className="font-[family-name:var(--font-board)] text-xl" style={{ color: MUTED }}>
            %
          </span>
        </div>
      </div>
      <div className="text-center">
        <p
          className="inline-flex items-center gap-2 font-[family-name:var(--font-board)] text-[11px] tracking-[0.24em] uppercase"
          style={{ color: GREEN }}
        >
          <ArrowDown className="size-3.5" />
          {COPY.dial.decayLabel}
        </p>
        <p className="mt-2.5 text-sm" style={{ color: MUTED }}>
          {COPY.dial.engine}
        </p>
      </div>
    </div>
  );
}

function DialSection() {
  const dl = COPY.dial;
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-24 sm:py-28 lg:py-32">
      <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div>
          <BoardLabel>{dl.label}</BoardLabel>
          <h2
            className="mt-4 text-[clamp(2rem,5.2vw,3.3rem)] leading-[1.05] font-black tracking-[-0.02em]"
            style={{ color: INK, fontFamily: "var(--font-fira)", textWrap: "balance" }}
          >
            {dl.heading}
          </h2>
          <p className="mt-6 text-xl font-bold" style={{ color: GREEN }}>
            {dl.caption}
          </p>
          <p className="mt-4 max-w-lg text-[17px] leading-relaxed" style={{ color: MUTED }}>
            {dl.body}
          </p>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed" style={{ color: DIM }}>
            {dl.moat}
          </p>
        </div>
        <ReadinessDial />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* А ТИ? — the them→you pivot, one real question inline                 */
function InlineQuestion() {
  const q = COPY.you.quiz;
  const [picked, setPicked] = useState<string | null>(null);
  const meterRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const isCorrect = picked ? q.options.find((o) => o.key === picked)?.correct : false;

  const answer = (key: string) => {
    if (picked) return;
    setPicked(key);
    const correct = q.options.find((o) => o.key === key)?.correct;
    const target = correct ? 16 : 7;
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
          if (meterRef.current) meterRef.current.textContent = String(Math.round(obj.v));
        },
      });
    }
  };

  return (
    <div
      className="rounded-2xl border border-[#332e2a] p-6 sm:p-8"
      style={{
        background: SURFACE,
        boxShadow: "0 34px 66px -34px rgba(0,0,0,0.78), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="font-[family-name:var(--font-board)] text-[11px] tracking-[0.2em] uppercase"
          style={{ color: DIM }}
        >
          {q.tag}
        </span>
        <span className="font-[family-name:var(--font-board)] text-[11px]" style={{ color: DIM }}>
          {q.badge}
        </span>
      </div>
      <p className="mt-4 text-[16px] leading-snug font-medium sm:text-[17px]" style={{ color: INK }}>
        {q.question}
      </p>

      <div className="mt-5 flex flex-col gap-2.5">
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
                "flex items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-[15px] transition-colors duration-150",
                !showState && "border-[#3a342f] hover:border-[#5a524a] hover:bg-white/[0.03]",
                good && "border-[#2F9E44] bg-[#2F9E44]/12",
                bad && "border-[#7a4038] bg-[#7a4038]/18",
                showState && !good && !bad && "border-[#332e2a] opacity-55",
              )}
              style={{ color: INK }}
            >
              <span
                className="flex size-6 shrink-0 items-center justify-center rounded-md font-[family-name:var(--font-board)] text-[12px]"
                style={{
                  background: good ? GREEN : bad ? "#7a4038" : "#332e2a",
                  color: good || bad ? "#12100f" : DIM,
                }}
              >
                {good ? <Check className="size-3.5" /> : bad ? <X className="size-3.5" /> : o.key.toUpperCase()}
              </span>
              <span className="leading-snug">{o.text}</span>
            </button>
          );
        })}
      </div>

      {/* explanation reveal */}
      {picked && (
        <div className="mt-4 rounded-xl border border-[#332e2a] bg-white/[0.02] p-4">
          <p
            className="flex items-center gap-2 font-[family-name:var(--font-board)] text-[11px] tracking-widest uppercase"
            style={{ color: isCorrect ? GREEN : MUTED }}
          >
            {isCorrect ? q.correctNote : q.wrongNote}
          </p>
          {!isCorrect && (
            <p className="mt-2.5 text-sm leading-relaxed" style={{ color: MUTED }}>
              <span className="font-bold" style={{ color: INK }}>
                {q.explainTitle}.{" "}
              </span>
              {q.explain}
            </p>
          )}
        </div>
      )}

      {/* mini readiness meter */}
      <div className="mt-6">
        <div
          className="flex items-center justify-between font-[family-name:var(--font-board)] text-[11px] tracking-wider uppercase"
          style={{ color: DIM }}
        >
          <span>{q.meterLabel}</span>
          <span style={{ color: picked ? GREEN : DIM }}>
            <span ref={meterRef}>0</span>%
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full" style={{ background: "#141110" }}>
          <div ref={barRef} className="h-full rounded-full" style={{ width: "0%", background: GREEN }} />
        </div>
        {!picked && (
          <p className="mt-3 text-[13px]" style={{ color: DIM }}>
            {q.idlePrompt}
          </p>
        )}
      </div>
    </div>
  );
}

function YouSection() {
  const y = COPY.you;
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-24 sm:py-28 lg:py-32">
      <div className="grid items-start gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
        <div className="lg:sticky lg:top-24">
          <BoardLabel>{y.label}</BoardLabel>
          <h2
            className="mt-4 text-[clamp(2rem,5.2vw,3.3rem)] leading-[1.05] font-black tracking-[-0.02em]"
            style={{ color: INK, fontFamily: "var(--font-fira)", textWrap: "balance" }}
          >
            {y.heading}
          </h2>
          <p className="mt-6 max-w-md text-[17px] leading-relaxed" style={{ color: MUTED }}>
            {y.afterLine}
          </p>
          <div className="mt-8 hidden lg:block">
            <CtaPair primary={y.ctaPrimary} secondary={y.ctaSecondary} />
          </div>
        </div>
        <div>
          <InlineQuestion />
          <div className="mt-8 lg:hidden">
            <CtaPair primary={y.ctaPrimary} secondary={y.ctaSecondary} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* ТВІЙ РЕЙС — exam-date picker → departure row                         */
function DatePicker() {
  const p = COPY.picker;
  const [date, setDate] = useState<string>(STATS.examDate);

  const compute = useCallback((d: string) => {
    if (!d) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(d + "T00:00:00");
    const days = Math.round((target.getTime() - today.getTime()) / 86_400_000);
    if (isNaN(days) || days < 0) return null;
    const perDay = Math.min(
      PLAN_PER_DAY_CAP,
      Math.max(8, Math.ceil(PLAN_TARGET_QUESTIONS / Math.max(days, 1))),
    );
    return { days, perDay, intensive: days < 7, urgent: days <= 1 };
  }, []);

  const plan = compute(date);

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-24 sm:py-28 lg:py-32">
      <div className="grid items-start gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
        <div>
          <BoardLabel>{p.label}</BoardLabel>
          <h2
            className="mt-4 text-[clamp(2rem,5.2vw,3.3rem)] leading-[1.05] font-black tracking-[-0.02em]"
            style={{ color: INK, fontFamily: "var(--font-fira)", textWrap: "balance" }}
          >
            {p.heading}
          </h2>
          <label className="mt-7 block">
            <span
              className="font-[family-name:var(--font-board)] text-[11px] tracking-wider uppercase"
              style={{ color: DIM }}
            >
              {p.inputLabel}
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
          <p className="mt-4 max-w-sm text-sm leading-relaxed" style={{ color: DIM }}>
            {p.note}
          </p>
        </div>

        {/* departure-row plan panel */}
        <div
          className="overflow-hidden rounded-2xl border border-[#332e2a]"
          style={{ background: SURFACE, boxShadow: "0 34px 66px -38px rgba(0,0,0,0.8)" }}
        >
          <div className="flex items-center justify-between px-6 py-4 sm:px-8">
            <span
              className="font-[family-name:var(--font-board)] text-[11px] tracking-[0.24em] uppercase"
              style={{ color: DIM }}
            >
              {p.planLabel}
            </span>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: GREEN }} />
          </div>
          <Slat />
          <div className="px-6 py-7 sm:px-8">
            {plan ? (
              <>
                <div className="flex flex-wrap items-end gap-x-7 gap-y-5">
                  <div className="flex items-baseline gap-2.5">
                    <FlapRow
                      key={"d" + plan.days}
                      text={String(plan.days)}
                      play="now"
                      tileClass="h-14 w-10 text-[34px] sm:h-16 sm:w-12 sm:text-[42px] font-[family-name:var(--font-board)]"
                    />
                    <span className="max-w-[5rem] text-sm leading-tight" style={{ color: MUTED }}>
                      {p.daysLabel}
                    </span>
                  </div>
                  <span className="font-[family-name:var(--font-board)] text-2xl" style={{ color: DIM }}>
                    ×
                  </span>
                  <div className="flex items-baseline gap-2.5">
                    <FlapRow
                      key={"p" + plan.perDay}
                      text={String(plan.perDay)}
                      play="now"
                      tileClass="h-14 w-10 text-[34px] sm:h-16 sm:w-12 sm:text-[42px] font-[family-name:var(--font-board)]"
                    />
                    <span className="max-w-[5rem] text-sm leading-tight" style={{ color: MUTED }}>
                      {p.perDayLabel}
                    </span>
                  </div>
                </div>
                <div
                  className="mt-6 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px]"
                  style={{
                    background: plan.intensive ? GREEN : "#332e2a",
                    color: plan.intensive ? "#12100f" : MUTED,
                  }}
                >
                  {plan.urgent ? p.urgent : plan.intensive ? p.intensive : p.calm}
                </div>
              </>
            ) : (
              <p className="text-base" style={{ color: MUTED }}>
                {p.noDate}
              </p>
            )}
          </div>

          {/* flagged topics as departure rows */}
          <Slat />
          <div className="px-6 py-6 sm:px-8">
            <span
              className="font-[family-name:var(--font-board)] text-[11px] tracking-[0.24em] uppercase"
              style={{ color: DIM }}
            >
              {p.topicsLabel}
            </span>
            <ul className="mt-4 flex flex-col gap-2.5">
              {p.topics.map((t) => (
                <li
                  key={t}
                  className="flex items-center justify-between gap-3 text-[15px]"
                  style={{ color: MUTED }}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="h-1.5 w-1.5 rounded-[1px]" style={{ background: "#c76a2a" }} />
                    {t}
                  </span>
                  <span
                    className="font-[family-name:var(--font-board)] text-[10px] tracking-widest uppercase"
                    style={{ color: "#c76a2a" }}
                  >
                    ризик
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* retaker line */}
      <p
        className="mt-10 flex max-w-2xl items-start gap-3 rounded-xl border border-[#332e2a] bg-white/[0.02] px-5 py-4 text-[15px] leading-relaxed"
        style={{ color: MUTED }}
      >
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: GREEN }} />
        {p.retaker}
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* ІСПИТ У ЦИФРАХ — simulator promise                                   */
function SimSection() {
  const s = COPY.sim;
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-24 sm:py-28 lg:py-32">
      <SectionHead
        label={s.label}
        heading={s.heading}
        stat={String(STATS.examQuestions)}
        className="max-w-2xl"
      />
      {/* board rows, not a card grid — value flaps left, label right (Decompose grammar) */}
      <div
        className="mt-10 overflow-hidden rounded-2xl border border-[#332e2a]"
        style={{ background: SURFACE, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
      >
        {s.facts.map((f, i) => (
          <div key={f.small}>
            {i > 0 && <Slat />}
            <div className="flex items-center justify-between gap-6 px-5 py-6 sm:px-8 sm:py-7">
              <FlapRow
                text={f.big}
                tileClass="h-12 min-w-[2rem] px-[0.08em] text-[30px] sm:h-14 sm:text-[34px] font-[family-name:var(--font-board)]"
              />
              <span
                className="text-right text-[15px] leading-tight sm:text-base"
                style={{ color: f.muted ? DIM : MUTED }}
              >
                {f.small}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-8 max-w-2xl text-[17px] leading-relaxed" style={{ color: MUTED }}>
        {s.body}
      </p>
      <p className="mt-6 inline-flex items-center gap-2 text-[15px] font-bold" style={{ color: GREEN }}>
        <Check className="size-4" />
        {s.free}
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* АРИФМЕТИКА — pricing                                                 */
function PricingSection() {
  const pr = COPY.pricing;
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-24 sm:py-28 lg:py-32">
      <SectionHead
        label={pr.label}
        heading={pr.heading}
        stat={String(STATS.price)}
        className="max-w-2xl"
      />

      {/* the equation as one board panel — three rows, «проти» reads as the connective (AA, not aria-hidden) */}
      <div
        className="mt-10 overflow-hidden rounded-2xl border border-[#332e2a]"
        style={{ background: SURFACE, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
      >
        {pr.equation.map((e, i) => (
          <div key={e.note}>
            {i > 0 && (
              <>
                <Slat />
                <div className="px-5 py-1.5 sm:px-8">
                  <span
                    className="font-[family-name:var(--font-board)] text-[11px] tracking-[0.28em] uppercase"
                    style={{ color: DIM }}
                  >
                    проти
                  </span>
                </div>
                <Slat />
              </>
            )}
            <div
              className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-6 sm:px-8 sm:py-7"
              style={e.accent ? { background: "rgba(47,158,68,0.06)" } : undefined}
            >
              <div className="flex items-baseline gap-1.5">
                <FlapRow
                  text={e.value}
                  tileClass="h-11 min-w-[1.6rem] px-[0.1em] text-[28px] sm:h-12 sm:text-[32px] font-[family-name:var(--font-board)]"
                />
                <span className="text-lg font-bold" style={{ color: e.accent ? GREEN : MUTED }}>
                  {e.unit}
                </span>
              </div>
              <span
                className="text-right text-[14px] leading-tight sm:text-[15px]"
                style={{ color: e.accent ? INK : DIM }}
              >
                {e.note}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* FREE vs PAID ledger */}
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#332e2a] p-7" style={{ background: "rgba(255,255,255,0.015)" }}>
          <h3 className="text-lg font-bold" style={{ color: INK }}>
            {pr.freeTitle}
          </h3>
          <ul className="mt-5 flex flex-col gap-3">
            {pr.free.map((f) => (
              <li key={f} className="flex items-start gap-3 text-[15px]" style={{ color: MUTED }}>
                <Check className="mt-0.5 size-4 shrink-0" style={{ color: GREEN }} />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div
          className="relative rounded-2xl p-7"
          style={{
            background: SURFACE,
            boxShadow: "0 40px 80px -46px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.05)",
            border: "1px solid #3d3630",
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold" style={{ color: INK }}>
                {pr.paidTitle}
              </h3>
              <div className="mt-2.5 flex items-baseline gap-2">
                <FlapRow
                  text={String(STATS.price)}
                  tileClass="h-12 w-9 text-[30px] font-[family-name:var(--font-board)]"
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
              {pr.paidBadge}
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: DIM }}>
            {pr.priceNote}
          </p>
          <ul className="mt-5 flex flex-col gap-3">
            {pr.paid.map((f) => (
              <li key={f} className="flex items-start gap-3 text-[15px]" style={{ color: INK }}>
                <Check className="mt-0.5 size-4 shrink-0" style={{ color: GREEN }} />
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-2">
            {pr.negations.map((n) => (
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
            {pr.cta}
          </PrimaryCTA>
          <p className="mt-4 text-sm font-bold" style={{ color: INK }}>
            {pr.anchor}
          </p>
          <p className="mt-3 text-[13px] leading-relaxed" style={{ color: DIM }}>
            {pr.failsafe}
          </p>
        </div>
      </div>

      {/* trust band */}
      <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1">
        <Check className="size-4" style={{ color: GREEN }} />
        <span className="font-[family-name:var(--font-board)] text-[13px] tracking-wide" style={{ color: MUTED }}>
          {pr.trust}
        </span>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* ДЖЕРЕЛА — honest proof + FAQ                                         */
function FaqItem({ q, a, defaultOpen }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="border-b border-[#332e2a]">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <h3 className="text-[15px] font-bold sm:text-base" style={{ color: INK }}>
          {q}
        </h3>
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

function SourcesSection() {
  const s = COPY.sources;
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-24 sm:py-28 lg:py-32">
      <BoardLabel>{s.label}</BoardLabel>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
        <h2
          className="text-[clamp(2rem,5.2vw,3.3rem)] leading-[1.05] font-black tracking-[-0.02em]"
          style={{ color: INK, fontFamily: "var(--font-fira)", textWrap: "balance" }}
        >
          {s.heading}
        </h2>
        <span
          className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-medium"
          style={{ borderColor: GREEN, color: GREEN }}
        >
          <span className="size-2 rounded-full" style={{ background: GREEN }} />
          {s.fresh}
        </span>
      </div>

      {/* footnote figures as board rows, not stat cards */}
      <div
        className="mt-10 overflow-hidden rounded-2xl border border-[#332e2a]"
        style={{ background: SURFACE, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
      >
        {s.stats.map((st, i) => (
          <div key={st.small}>
            {i > 0 && <Slat />}
            <div className="flex items-center justify-between gap-6 px-5 py-6 sm:px-8">
              <FlapRow
                text={st.big}
                tileClass="h-12 min-w-[1.6rem] px-[0.08em] text-[26px] sm:h-14 sm:text-[30px] font-[family-name:var(--font-board)]"
              />
              <span className="text-right text-[15px] sm:text-base" style={{ color: MUTED }}>
                {st.small}
              </span>
            </div>
          </div>
        ))}
      </div>

      <p
        className="mt-6 max-w-2xl rounded-2xl border border-dashed border-[#3a342f] p-5 text-[15px] leading-relaxed"
        style={{ color: DIM }}
      >
        {s.reserved}
      </p>

      {/* FAQ */}
      <h3
        className="mt-16 text-[clamp(1.6rem,4vw,2.3rem)] font-black tracking-[-0.02em]"
        style={{ color: INK, fontFamily: "var(--font-fira)" }}
      >
        {s.faqHeading}
      </h3>
      <div className="mt-6 max-w-3xl">
        {s.faq.map((it, i) => (
          <FaqItem key={it.q} q={it.q} a={it.a} defaultOpen={i === 0} />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* ФІНАЛ + mode-launcher                                               */
function FinalSection() {
  const f = COPY.final;
  const modeIcons = [Dumbbell, Timer, MapIcon];
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-24 sm:py-28 lg:py-32">
      <div className="flex flex-col items-center text-center">
        <h2
          className="max-w-[16ch] text-[clamp(2.2rem,6.5vw,4.2rem)] leading-[1.02] font-black tracking-[-0.025em]"
          style={{ color: INK, fontFamily: "var(--font-fira)", textWrap: "balance" }}
        >
          {f.heading}
        </h2>
        <p className="mt-5 max-w-md text-lg" style={{ color: MUTED }}>
          {f.sub}
        </p>
        <div className="mt-8">
          <CtaPair primary={f.ctaPrimary} secondary={f.ctaSecondary} className="items-center justify-center" />
        </div>
      </div>

      <div className="mx-auto mt-14 max-w-xl">
        <span
          className="font-[family-name:var(--font-board)] text-[11px] tracking-[0.24em] uppercase"
          style={{ color: DIM }}
        >
          {f.modesLabel}
        </span>
        <div className="mt-4 flex flex-col gap-3">
          {f.modes.map((m, i) => {
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
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* PAGE                                                                */
export default function V16Page() {
  return (
    <div
      className="min-h-full font-[family-name:var(--font-fira)] antialiased"
      style={{ background: BG, color: INK }}
    >
      {/* NAV */}
      <header
        className="sticky top-0 z-40 border-b border-[#2a2522]/80 backdrop-blur-md"
        style={{ background: "rgba(27,25,23,0.82)" }}
      >
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
              {COPY.nav.login}
            </Link>
            <Link
              href="/register"
              className="rounded-full px-4 py-2 text-sm font-bold text-[#12100f]"
              style={{ background: GREEN }}
            >
              {COPY.nav.register}
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <Hero />
        <Rail />
        <Decompose />
        <Rail />
        <DialSection />
        <Rail />
        <YouSection />
        <Rail />
        <DatePicker />
        <Rail />
        <SimSection />
        <Rail />
        <PricingSection />
        <Rail />
        <SourcesSection />
        <Rail />
        <FinalSection />
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
                  {COPY.footer.wordmark}
                </span>
              </span>
              <p className="mt-4 max-w-xs text-sm leading-relaxed" style={{ color: MUTED }}>
                {COPY.footer.tagline}
              </p>
              <div className="mt-5">
                <span
                  className="font-[family-name:var(--font-board)] text-[11px] tracking-[0.24em] uppercase"
                  style={{ color: DIM }}
                >
                  {COPY.footer.contactLabel}
                </span>
                <a
                  href={`mailto:${COPY.footer.contactEmail}`}
                  className="mt-1 block text-sm transition-colors hover:text-[#F2EEE6]"
                  style={{ color: MUTED }}
                >
                  {COPY.footer.contactEmail}
                </a>
              </div>
            </div>
            {COPY.footer.columns.map((col) => (
              <div key={col.title}>
                <span
                  className="font-[family-name:var(--font-board)] text-[11px] tracking-[0.24em] uppercase"
                  style={{ color: DIM }}
                >
                  {col.title}
                </span>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-sm transition-colors hover:text-[#F2EEE6]"
                        style={{ color: MUTED }}
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="mt-14 max-w-3xl text-[13px] leading-relaxed" style={{ color: DIM }}>
            {COPY.footer.disclaimer}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#231f1d] pt-6">
            <span className="text-[13px]" style={{ color: DIM }}>
              {COPY.footer.copyright}
            </span>
          </div>
        </div>

        {/* oversized ghosted wordmark */}
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
