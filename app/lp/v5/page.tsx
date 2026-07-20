"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type CSSProperties,
} from "react";
import Link from "next/link";
import { Sofia_Sans, Sofia_Sans_Extra_Condensed } from "next/font/google";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  X,
  Plus,
  Minus,
  Calendar,
} from "lucide-react";
import { copy, HERO_VARIANTS, ACTIVE_HERO } from "./copy";

/* ── Fonts (declared locally, cyrillic verified) ──────────────────── */
const display = Sofia_Sans_Extra_Condensed({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["700", "800"],
  variable: "--v5-display",
  display: "swap",
});
const body = Sofia_Sans({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600"],
  variable: "--v5-body",
  display: "swap",
});

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const H = HERO_VARIANTS[ACTIVE_HERO];

const FONT_DISPLAY = "font-[family-name:var(--v5-display)]";
const FONT_BODY = "font-[family-name:var(--v5-body)]";

/* palette as CSS vars so we stay independent of the app's stock theme */
const paletteVars: CSSProperties = {
  ["--ink" as string]: "#121314",
  ["--surface" as string]: "#F4F4F3",
  ["--yellow" as string]: "#FFD500",
  ["--red" as string]: "#E2372B",
};

/* ── Semicircle gauge geometry (computed once, rounded for SSR parity) ── */
const GW = 280;
const GH = 158;
const GCX = 140;
const GCY = 146;
const GR = 118;
const rnd = (n: number) => Math.round(n * 100) / 100;
function polar(frac: number) {
  const a = Math.PI * (1 - Math.min(1, Math.max(0, frac)));
  return { x: rnd(GCX + GR * Math.cos(a)), y: rnd(GCY - GR * Math.sin(a)) };
}
const ARC_D = (() => {
  const s = polar(0);
  const e = polar(1);
  return `M ${s.x} ${s.y} A ${GR} ${GR} 0 0 1 ${e.x} ${e.y}`;
})();

/* ───────────────────────── Section header ───────────────────────── */
function BandHeader({ title }: { title: string }) {
  return (
    <div className="mb-8 sm:mb-10">
      <div style={{ height: 4, background: "var(--ink)" }} />
      <h2
        className={`${FONT_DISPLAY} mt-4 uppercase leading-[0.92] tracking-[-0.01em]`}
        style={{
          color: "var(--ink)",
          fontWeight: 800,
          fontSize: "clamp(2.1rem, 6vw, 4.2rem)",
        }}
      >
        {title}
      </h2>
    </div>
  );
}

/* ───────────────────────── Sign plate ────────────────────────────── */
function Plate({
  children,
  className = "",
  fill = "#FFFFFF",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  fill?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        background: fill,
        border: "2px solid var(--ink)",
        borderRadius: 4,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ───────────────────────── CTA bar ───────────────────────────────── */
function CtaPrimary({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`v5-cta group inline-flex items-center justify-center gap-2 ${FONT_DISPLAY} uppercase tracking-[0.02em] ${className}`}
      style={{
        background: "var(--ink)",
        color: "#FFFFFF",
        border: "2px solid var(--ink)",
        borderRadius: 4,
        padding: "0.85rem 1.5rem",
        fontSize: "clamp(1rem, 1.4vw, 1.15rem)",
        fontWeight: 800,
      }}
    >
      {children}
      <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

function CtaGhost({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`v5-ghost inline-flex items-center justify-center gap-2 ${FONT_DISPLAY} uppercase tracking-[0.02em] ${className}`}
      style={{
        background: "transparent",
        color: "var(--ink)",
        border: "2px solid var(--ink)",
        borderRadius: 4,
        padding: "0.85rem 1.5rem",
        fontSize: "clamp(1rem, 1.4vw, 1.15rem)",
        fontWeight: 800,
      }}
    >
      {children}
    </Link>
  );
}

/* ══════════════════════════ HERO QUIZ ════════════════════════════ */
const METER_SEGMENTS = 12;

function HeroQuiz() {
  const [picked, setPicked] = useState<string | null>(null);
  const answered = picked !== null;
  const pickedOpt = copy.quiz.options.find((o) => o.id === picked);
  const isCorrect = pickedOpt?.correct ?? false;
  const filled = answered ? 1 : 0;

  return (
    <Plate
      className="w-full p-5 sm:p-6"
      style={{ boxShadow: "8px 8px 0 var(--ink)" }}
    >
      <div
        className={`${FONT_DISPLAY} mb-2 inline-block uppercase`}
        style={{
          background: "var(--yellow)",
          color: "var(--ink)",
          fontWeight: 800,
          fontSize: "0.78rem",
          letterSpacing: "0.12em",
          padding: "2px 8px",
          border: "2px solid var(--ink)",
        }}
      >
        {copy.quiz.kicker}
      </div>
      <p
        className={`${FONT_BODY} mb-4 text-[1.02rem] font-semibold leading-snug`}
        style={{ color: "var(--ink)" }}
      >
        {copy.quiz.question}
      </p>

      <div className="flex flex-col gap-2">
        {copy.quiz.options.map((o) => {
          const chosen = picked === o.id;
          const showRight = answered && o.correct;
          const showWrong = answered && chosen && !o.correct;
          const bg = showRight
            ? "var(--yellow)"
            : showWrong
              ? "#FCE3E1"
              : chosen
                ? "var(--surface)"
                : "#FFFFFF";
          return (
            <button
              key={o.id}
              type="button"
              disabled={answered}
              onClick={() => setPicked(o.id)}
              className={`${FONT_BODY} flex items-center gap-3 text-left text-[0.94rem] font-medium transition-colors`}
              style={{
                background: bg,
                color: "var(--ink)",
                border: "2px solid var(--ink)",
                borderRadius: 4,
                padding: "0.6rem 0.75rem",
                cursor: answered ? "default" : "pointer",
              }}
            >
              <span
                className={`${FONT_DISPLAY} flex size-6 shrink-0 items-center justify-center uppercase`}
                style={{
                  border: "2px solid var(--ink)",
                  borderRadius: 3,
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  background: showRight
                    ? "var(--ink)"
                    : showWrong
                      ? "var(--red)"
                      : "transparent",
                  color: showRight || showWrong ? "#FFFFFF" : "var(--ink)",
                }}
              >
                {showRight ? (
                  <Check className="size-4" />
                ) : showWrong ? (
                  <X className="size-4" />
                ) : (
                  o.id.toUpperCase()
                )}
              </span>
              <span>{o.text}</span>
            </button>
          );
        })}
      </div>

      <div aria-live="polite">
        {answered && (
          <p
            className={`${FONT_BODY} mt-4 text-[0.9rem] leading-snug`}
            style={{ color: "var(--ink)" }}
          >
            {isCorrect ? copy.quiz.correctNote : copy.quiz.wrongNote}
          </p>
        )}
      </div>

      {/* readiness meter */}
      <div className="mt-5" style={{ borderTop: "2px solid var(--ink)", paddingTop: "0.85rem" }}>
        <div
          aria-live="polite"
          className={`${FONT_DISPLAY} mb-2 flex items-center justify-between uppercase`}
          style={{ fontWeight: 800, fontSize: "0.82rem", letterSpacing: "0.06em", color: "var(--ink)" }}
        >
          <span>{copy.quiz.meterLabel}</span>
          <span>{filled} / {METER_SEGMENTS}</span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: METER_SEGMENTS }).map((_, i) => (
            <div
              key={i}
              className="v5-seg h-3 flex-1"
              style={{
                border: "2px solid var(--ink)",
                borderRadius: 2,
                background: i < filled ? "var(--yellow)" : "#FFFFFF",
                transition: "background 220ms cubic-bezier(0.16,1,0.3,1)",
              }}
            />
          ))}
        </div>
        <p className={`${FONT_BODY} mt-2 text-[0.8rem]`} style={{ color: "#3a3d40" }}>
          {answered ? copy.quiz.meterHint : "Обери відповідь — і показник рушить."}
        </p>
      </div>
    </Plate>
  );
}

/* ══════════════════════════ DIAL GAUGE ═══════════════════════════ */
function DialGauge() {
  const numRef = useRef<HTMLSpanElement>(null);
  const arcRef = useRef<SVGPathElement>(null);
  const stateRef = useRef<HTMLSpanElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const START = 78;
  const END = 71;

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const mm = gsap.matchMedia();

    const setVal = (v: number) => {
      const val = Math.round(v);
      if (numRef.current) numRef.current.textContent = String(val);
      if (arcRef.current) arcRef.current.style.strokeDashoffset = String(100 - val);
      if (stateRef.current) {
        stateRef.current.textContent =
          val >= 80 ? copy.dial.stateReady : val >= 65 ? copy.dial.stateAlmost : copy.dial.stateNotYet;
      }
    };

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      setVal(START);
      const proxy = { v: START };
      const st = ScrollTrigger.create({
        trigger: wrap,
        start: "top 78%",
        once: true,
        onEnter: () => {
          gsap.to(proxy, {
            v: END,
            duration: 2.6,
            ease: "power2.inOut",
            snap: { v: 1 },
            onUpdate: () => setVal(proxy.v),
          });
        },
      });
      return () => st.kill();
    });

    mm.add("(prefers-reduced-motion: reduce)", () => {
      setVal(END);
    });

    return () => mm.revert();
  }, []);

  return (
    <div ref={wrapRef} className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${GW} ${GH}`}
        width={GW}
        height={GH}
        className="w-full max-w-[280px]"
        aria-hidden="true"
      >
        <path d={ARC_D} fill="none" stroke="var(--ink)" strokeOpacity={0.12} strokeWidth={20} strokeLinecap="butt" />
        <path
          ref={arcRef}
          d={ARC_D}
          fill="none"
          stroke="var(--yellow)"
          strokeWidth={20}
          strokeLinecap="butt"
          pathLength={100}
          strokeDasharray="100"
          strokeDashoffset={100 - START}
        />
        <path d={ARC_D} fill="none" stroke="var(--ink)" strokeWidth={2} pathLength={100} strokeDasharray="0.5 4.5" strokeOpacity={0.55} />
      </svg>
      <div className="-mt-16 flex flex-col items-center">
        <div className="flex items-start" style={{ color: "var(--ink)" }}>
          <span ref={numRef} className={`${FONT_DISPLAY} leading-none`} style={{ fontWeight: 800, fontSize: "clamp(3.2rem,9vw,4.6rem)" }}>
            {START}
          </span>
          <span className={`${FONT_DISPLAY} mt-1 leading-none`} style={{ fontWeight: 800, fontSize: "1.6rem" }}>%</span>
        </div>
        <span
          ref={stateRef}
          className={`${FONT_DISPLAY} mt-1 uppercase`}
          style={{
            fontWeight: 800,
            fontSize: "0.8rem",
            letterSpacing: "0.12em",
            color: "var(--ink)",
            background: "var(--yellow)",
            border: "2px solid var(--ink)",
            padding: "1px 8px",
          }}
        >
          {copy.dial.stateAlmost}
        </span>
      </div>
    </div>
  );
}

/* ══════════════════════════ PLANNER ══════════════════════════════ */
function daysWordFor(n: number, c: typeof copy.planner) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return c.dayWord;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return c.daysWord2;
  return c.daysWord;
}

function Planner() {
  const [date, setDate] = useState("");
  const [minDate, setMinDate] = useState("");
  const POOL = 2322;

  useEffect(() => {
    const t = new Date();
    setMinDate(
      `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`,
    );
  }, []);

  let days = 0;
  if (date) {
    const target = new Date(date + "T00:00:00");
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    days = Math.max(1, Math.round((target.getTime() - now.getTime()) / 86400000));
  }
  const intensive = days > 0 && days < 7;
  // Cap the displayed per-day figure: the real FSRS plan prioritizes weak
  // topics, it never divides the whole bank across the days left. An
  // uncapped ceil(2322/days) renders anxiety-raising nonsense for near dates.
  const perDay = days > 0 ? Math.min(Math.ceil(POOL / days), 120) : 0;

  return (
    <Plate fill="#FFFFFF" className="p-6 sm:p-8">
      <label
        className={`${FONT_DISPLAY} mb-2 flex items-center gap-2 uppercase`}
        style={{ fontWeight: 800, fontSize: "0.85rem", letterSpacing: "0.08em", color: "var(--ink)" }}
        htmlFor="v5-exam-date"
      >
        <Calendar className="size-4" /> {copy.planner.inputLabel}
      </label>
      <input
        id="v5-exam-date"
        type="date"
        value={date}
        min={minDate}
        onChange={(e) => setDate(e.target.value)}
        className={`${FONT_BODY} w-full text-[1.05rem] font-medium`}
        style={{
          background: "var(--surface)",
          color: "var(--ink)",
          border: "2px solid var(--ink)",
          borderRadius: 4,
          padding: "0.7rem 0.85rem",
          colorScheme: "light",
        }}
      />

      <div className="mt-5" style={{ borderTop: "2px solid var(--ink)", paddingTop: "1.1rem" }}>
        {days > 0 ? (
          <>
            <div
              className={`${FONT_DISPLAY} inline-block uppercase`}
              style={{ fontWeight: 800, fontSize: "0.72rem", letterSpacing: "0.1em", color: "var(--ink)" }}
            >
              {copy.planner.previewPrefix}
            </div>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1" style={{ color: "var(--ink)" }}>
              <span className={`${FONT_DISPLAY} leading-none`} style={{ fontWeight: 800, fontSize: "clamp(2.6rem,7vw,3.6rem)" }}>
                ≈{days}
              </span>
              <span className={`${FONT_DISPLAY} uppercase`} style={{ fontWeight: 700, fontSize: "1.1rem" }}>
                {daysWordFor(days, copy.planner)}
              </span>
              {!intensive && (
                <>
                  <span className={`${FONT_DISPLAY}`} style={{ fontWeight: 700, fontSize: "1.4rem", opacity: 0.4 }}>×</span>
                  <span className={`${FONT_DISPLAY} leading-none`} style={{ fontWeight: 800, fontSize: "clamp(2.6rem,7vw,3.6rem)" }}>
                    {perDay}
                  </span>
                  <span className={`${FONT_DISPLAY} uppercase`} style={{ fontWeight: 700, fontSize: "1.1rem" }}>
                    {copy.planner.perDay}
                  </span>
                </>
              )}
            </div>
            {intensive && (
              <div
                className={`${FONT_BODY} mt-4 text-[0.9rem] font-medium`}
                style={{ color: "var(--ink)", background: "#FCE3E1", border: "2px solid var(--red)", borderRadius: 4, padding: "0.55rem 0.7rem" }}
              >
                <span className={`${FONT_DISPLAY} uppercase`} style={{ fontWeight: 800, color: "var(--ink)" }}>
                  {copy.planner.intensive}.
                </span>{" "}
                {copy.planner.intensiveNote}
              </div>
            )}
          </>
        ) : (
          <p className={`${FONT_BODY} text-[0.98rem] font-medium`} style={{ color: "var(--ink)" }}>
            {copy.planner.noDate}
          </p>
        )}
      </div>
    </Plate>
  );
}

/* ══════════════════════════ COUNT-UP ═════════════════════════════ */
function CountUp({ value, className, style }: { value: string; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = parseInt(value.replace(/\D/g, ""), 10);
    if (!Number.isFinite(target)) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const proxy = { n: 0 };
      const st = ScrollTrigger.create({
        trigger: el,
        start: "top 88%",
        once: true,
        onEnter: () => {
          gsap.to(proxy, {
            n: target,
            duration: 1.4,
            ease: "power2.out",
            snap: { n: 1 },
            onUpdate: () => { if (ref.current) ref.current.textContent = String(Math.round(proxy.n)); },
          });
        },
      });
      return () => st.kill();
    });
    mm.add("(prefers-reduced-motion: reduce)", () => { if (ref.current) ref.current.textContent = String(target); });
    return () => mm.revert();
  }, [value]);
  return <span ref={ref} className={className} style={style}>{value}</span>;
}

/* ══════════════════════════ FAQ ══════════════════════════════════ */
function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="flex flex-col">
      {copy.faq.items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={i} style={{ borderBottom: "2px solid var(--ink)" }}>
            <button
              type="button"
              id={`v5-faq-btn-${i}`}
              onClick={() => setOpen(isOpen ? null : i)}
              className={`${FONT_DISPLAY} flex w-full items-center justify-between gap-4 py-5 text-left uppercase`}
              style={{ color: "var(--ink)", fontWeight: 800, fontSize: "clamp(1.05rem,2.4vw,1.5rem)", letterSpacing: "-0.005em" }}
              aria-expanded={isOpen}
              aria-controls={`v5-faq-panel-${i}`}
            >
              <span>{it.q}</span>
              <span
                className="flex size-8 shrink-0 items-center justify-center"
                style={{ border: "2px solid var(--ink)", borderRadius: 4, background: isOpen ? "var(--yellow)" : "#FFFFFF" }}
              >
                {isOpen ? <Minus className="size-4" /> : <Plus className="size-4" />}
              </span>
            </button>
            <div
              id={`v5-faq-panel-${i}`}
              role="region"
              aria-labelledby={`v5-faq-btn-${i}`}
              className="grid transition-[grid-template-rows] duration-300 ease-out"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <p className={`${FONT_BODY} max-w-[60ch] pb-5 text-[1rem] leading-relaxed font-medium`} style={{ color: "#26282a" }}>
                  {it.a}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════ PAGE ═════════════════════════════════ */
export default function V5Page() {
  const rootRef = useRef<HTMLDivElement>(null);
  const heroLinesRef = useRef<HTMLHeadingElement>(null);
  const diamondRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        // hero diamond rotates into place
        if (diamondRef.current) {
          gsap.fromTo(
            diamondRef.current,
            { rotate: 0, scale: 0.9, opacity: 0 },
            { rotate: 45, scale: 1, opacity: 1, duration: 0.7, ease: "expo.out" },
          );
        }
        // headline lines slide in from the left edge with stagger
        if (heroLinesRef.current) {
          const lines = heroLinesRef.current.querySelectorAll("[data-line]");
          gsap.from(lines, { xPercent: -6, opacity: 0, duration: 0.6, ease: "expo.out", stagger: 0.06, delay: 0.05 });
        }
        // proof chips snap in like plates bolted on
        if (chipsRef.current) {
          const chips = chipsRef.current.querySelectorAll("[data-chip]");
          gsap.from(chips, { y: 10, opacity: 0, duration: 0.35, ease: "power3.out", stagger: 0.07, delay: 0.4 });
        }
        // yellow bands wipe in via clip-path inset from one edge.
        // The from-state is applied INSIDE onEnter (not at creation) so the
        // band stays visible by default — if the trigger never fires (headless
        // render, hidden tab) the content still ships, never blank.
        gsap.utils.toArray<HTMLElement>("[data-band-wipe]").forEach((band) => {
          ScrollTrigger.create({
            trigger: band,
            start: "top 85%",
            once: true,
            onEnter: () => {
              gsap.fromTo(
                band,
                { clipPath: "inset(0 100% 0 0)" },
                { clipPath: "inset(0 0% 0 0)", duration: 0.55, ease: "expo.out" },
              );
            },
          });
        });
      }, root);
      return () => ctx.revert();
    });

    return () => mm.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      className={`${display.variable} ${body.variable} ${FONT_BODY} min-h-full overflow-x-hidden`}
      style={{ ...paletteVars, background: "#FFFFFF", color: "var(--ink)" }}
    >
      {/* ── Nav ─────────────────────────────────────────────────── */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            style={{ width: 18, height: 18, background: "var(--yellow)", border: "2px solid var(--ink)", transform: "rotate(45deg)", display: "inline-block" }}
          />
          <span className={`${FONT_DISPLAY} uppercase`} style={{ fontWeight: 800, fontSize: "1.25rem", letterSpacing: "0.01em", color: "var(--ink)" }}>
            {copy.nav.brand}
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" className={`${FONT_DISPLAY} hidden uppercase sm:inline`} style={{ fontWeight: 700, color: "var(--ink)", fontSize: "0.95rem" }}>
            {copy.nav.login}
          </Link>
          <Link
            href="/register"
            className={`${FONT_DISPLAY} uppercase`}
            style={{ background: "var(--ink)", color: "#fff", fontWeight: 800, fontSize: "0.9rem", padding: "0.5rem 0.95rem", borderRadius: 4, border: "2px solid var(--ink)" }}
          >
            {copy.nav.cta}
          </Link>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <section className="relative">
        {/* clip wrapper: contains the bleeding diamond so its lower corner
            never cuts across the full-width ink strip below */}
        <div className="relative overflow-hidden">
          {/* giant diamond bleeding off top-right — pulled down/left so the
              quiz plate visibly sits ON it (heroConcept) */}
          <div className="pointer-events-none absolute right-0 top-0 z-0 hidden lg:block" style={{ width: "min(48vw, 740px)", height: "min(48vw, 740px)", transform: "translate(16%, -16%)" }}>
            <div ref={diamondRef} className="h-full w-full" style={{ background: "var(--yellow)", transform: "rotate(45deg)", transformOrigin: "center" }} />
          </div>

          <div className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-5 pb-10 pt-6 sm:gap-10 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pt-10">
            {/* left: headline */}
            <div className="flex flex-col justify-center">
              {/* one h1, each line a block span (single document heading) */}
              <h1
                ref={heroLinesRef}
                className={`${FONT_DISPLAY} uppercase`}
                style={{
                  color: "var(--ink)",
                  fontWeight: 800,
                  lineHeight: 0.86,
                  letterSpacing: "-0.015em",
                  fontSize: "clamp(2.5rem, 8.5vw, 5.7rem)",
                  margin: 0,
                }}
              >
                {H.lines.map((line, i) => (
                  <span key={i} data-line style={{ display: "block" }}>
                    {line}
                  </span>
                ))}
              </h1>
              <p className={`${FONT_BODY} mt-4 max-w-[46ch] text-[1.1rem] font-medium leading-snug sm:mt-5`} style={{ color: "#26282a", textWrap: "balance" }}>
                {H.subhead}
              </p>

              {/* proof chips */}
              <div ref={chipsRef} className="mt-5 flex flex-wrap gap-2 sm:mt-6">
                {copy.hero.chips.map((c, i) => (
                  <span
                    key={i}
                    data-chip
                    className={`${FONT_DISPLAY} inline-flex items-center uppercase`}
                    style={{
                      fontWeight: 800,
                      fontSize: "0.85rem",
                      letterSpacing: "0.04em",
                      padding: "0.35rem 0.7rem",
                      borderRadius: 4,
                      border: "2px solid var(--ink)",
                      color: "var(--ink)",
                      background: c.kind === "yellow" ? "var(--yellow)" : c.kind === "outline" ? "transparent" : "#FFFFFF",
                    }}
                  >
                    {c.label}
                  </span>
                ))}
              </div>

              {/* CTAs — secondary «без реєстрації» anchors to the in-hero
                  question (a real no-signup surface), never to /register */}
              <div className="mt-5 flex flex-col gap-3 sm:mt-7 sm:flex-row sm:flex-wrap">
                <CtaPrimary href="/register">{copy.hero.ctaPrimary}</CtaPrimary>
                <CtaGhost href="#hero-question">{copy.hero.ctaSecondary}</CtaGhost>
              </div>

              {/* mobile-only in-fold hook — keeps «1 з 5» + the quiz start
                  inside the 844px fold; desktop keeps the full-width strip */}
              <div className="mt-5 flex items-center gap-3 lg:hidden" style={{ background: "var(--ink)", borderRadius: 4, padding: "0.6rem 0.85rem" }}>
                <span aria-hidden style={{ width: 10, height: 10, background: "var(--yellow)", transform: "rotate(45deg)", display: "inline-block", flexShrink: 0 }} />
                <p className={`${FONT_BODY} text-[0.85rem] font-medium leading-snug`} style={{ color: "#fff" }}>
                  {copy.hero.hook}
                </p>
              </div>
            </div>

            {/* right: quiz on diamond */}
            <div className="relative flex items-center justify-center">
              {/* mobile/tablet diamond backing — clipped to its own box and
                  pushed behind the card so it can't jut into the CTAs or
                  bleed stray corners at tablet widths */}
              <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center overflow-hidden lg:hidden" aria-hidden>
                <div style={{ width: "72%", aspectRatio: "1", background: "var(--yellow)", transform: "rotate(45deg)", borderRadius: 4 }} />
              </div>
              <div id="hero-question" className="relative z-10 w-full max-w-md scroll-mt-20">
                <HeroQuiz />
              </div>
            </div>
          </div>
        </div>

        {/* «1 з 5» ink strip pinned to fold bottom — full-width clean rule,
            outside the clip wrapper (desktop only; mobile uses the in-fold one) */}
        <div className="hidden lg:block" style={{ background: "var(--ink)" }}>
          <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-5 py-2.5 sm:px-8">
            <span aria-hidden style={{ width: 10, height: 10, background: "var(--yellow)", transform: "rotate(45deg)", display: "inline-block", flexShrink: 0 }} />
            <p className={`${FONT_BODY} text-[0.9rem] font-medium`} style={{ color: "#fff" }}>
              {copy.hero.hook}
            </p>
          </div>
        </div>
      </section>

      {/* ── DIAL DEMO (yellow band) ─────────────────────────────── */}
      <section data-band-wipe style={{ background: "var(--yellow)" }}>
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <BandHeader title={copy.dial.header} />
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <Plate fill="#FFFFFF" className="flex flex-col items-center p-8" style={{ boxShadow: "8px 8px 0 var(--ink)" }}>
              <DialGauge />
              <p className={`${FONT_BODY} mt-4 max-w-[30ch] text-center text-[0.9rem] font-medium`} style={{ color: "#26282a" }}>
                {copy.dial.decayCaption}
              </p>
            </Plate>
            <div>
              <p className={`${FONT_DISPLAY} uppercase leading-[0.95]`} style={{ color: "var(--ink)", fontWeight: 800, fontSize: "clamp(1.6rem,3.6vw,2.4rem)", letterSpacing: "-0.01em" }}>
                {copy.dial.lead}
              </p>
              <p className={`${FONT_BODY} mt-4 max-w-[52ch] text-[1.08rem] font-medium leading-relaxed`} style={{ color: "var(--ink)" }}>
                {copy.dial.body}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <span className={`${FONT_DISPLAY} uppercase`} style={{ fontWeight: 800, fontSize: "0.85rem", letterSpacing: "0.04em", padding: "0.4rem 0.75rem", borderRadius: 4, border: "2px solid var(--ink)", background: "var(--ink)", color: "#fff" }}>
                  {copy.dial.engine}
                </span>
              </div>
              <Plate fill="var(--surface)" className="mt-5 p-4">
                <p className={`${FONT_BODY} text-[0.98rem] font-semibold leading-snug`} style={{ color: "var(--ink)" }}>
                  {copy.dial.moat}
                </p>
              </Plate>
            </div>
          </div>
        </div>
      </section>

      {/* ── PLANNER (white band) ────────────────────────────────── */}
      <section style={{ background: "#FFFFFF" }}>
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <BandHeader title={copy.planner.header} />
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1fr] lg:gap-12">
            <div>
              <p className={`${FONT_DISPLAY} uppercase leading-[0.95]`} style={{ color: "var(--ink)", fontWeight: 800, fontSize: "clamp(1.6rem,3.6vw,2.4rem)", letterSpacing: "-0.01em" }}>
                {copy.planner.lead}
              </p>
              <p className={`${FONT_BODY} mt-4 max-w-[52ch] text-[1.05rem] font-medium leading-relaxed`} style={{ color: "#26282a" }}>
                {copy.planner.topicsNote}
              </p>
              <div className="mt-6 flex items-baseline gap-3">
                <CountUp
                  value={String(2322)}
                  className={`${FONT_DISPLAY} leading-none`}
                  style={{ color: "var(--ink)", fontWeight: 800, fontSize: "clamp(2.4rem,6vw,3.4rem)" }}
                />
                <span className={`${FONT_BODY} font-semibold`} style={{ color: "#26282a" }}>
                  {copy.planner.totalUnit}
                </span>
              </div>
            </div>
            <Planner />
          </div>
        </div>
      </section>

      {/* ── SIMULATOR (ink band) ────────────────────────────────── */}
      <section style={{ background: "var(--ink)" }}>
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="mb-8 sm:mb-10">
            <div style={{ height: 4, background: "var(--yellow)" }} />
            <h2 className={`${FONT_DISPLAY} mt-4 uppercase leading-[0.92] tracking-[-0.01em]`} style={{ color: "#fff", fontWeight: 800, fontSize: "clamp(2.1rem, 6vw, 4.2rem)" }}>
              {copy.simulator.header}
            </h2>
          </div>

          <p
            className={`${FONT_DISPLAY} uppercase`}
            style={{
              color: "#fff",
              fontWeight: 800,
              fontSize: "clamp(1.4rem,3.2vw,2.2rem)",
              letterSpacing: "-0.01em",
              borderLeft: "5px solid var(--yellow)",
              paddingLeft: "0.85rem",
            }}
          >
            {copy.simulator.lead}
          </p>

          <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
            {copy.simulator.format.map((f, i) => (
              <Plate key={i} fill="var(--yellow)" className="flex flex-col items-center justify-center px-2 py-6 text-center">
                <span className={`${FONT_DISPLAY} leading-none`} style={{ color: "var(--ink)", fontWeight: 800, fontSize: "clamp(2.8rem,10vw,5rem)" }}>
                  {f.big}
                </span>
                <span className={`${FONT_DISPLAY} mt-2 uppercase leading-tight`} style={{ color: "var(--ink)", fontWeight: 700, fontSize: "clamp(0.7rem,1.6vw,0.95rem)", letterSpacing: "0.04em" }}>
                  {f.small}
                </span>
              </Plate>
            ))}
          </div>

          <p className={`${FONT_BODY} mt-6 text-[1rem] font-medium`} style={{ color: "#d7d9db" }}>
            {copy.simulator.rule}
          </p>
          <p className={`${FONT_BODY} mt-2 max-w-[60ch] text-[1rem] font-medium`} style={{ color: "#d7d9db" }}>
            {copy.simulator.body}
          </p>
        </div>
      </section>

      {/* ── PRICING (yellow band) ───────────────────────────────── */}
      <section data-band-wipe style={{ background: "var(--yellow)" }}>
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <BandHeader title={copy.pricing.header} />

          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-baseline gap-2">
              <span className={`${FONT_DISPLAY} leading-none`} style={{ color: "var(--ink)", fontWeight: 800, fontSize: "clamp(5rem,18vw,10rem)", letterSpacing: "-0.02em" }}>
                {copy.pricing.price}
              </span>
              <span className={`${FONT_DISPLAY} leading-none`} style={{ color: "var(--ink)", fontWeight: 800, fontSize: "clamp(2rem,6vw,3.5rem)" }}>
                {copy.pricing.currency}
              </span>
            </div>
            <div className="max-w-[24ch]">
              <p className={`${FONT_DISPLAY} uppercase`} style={{ color: "var(--ink)", fontWeight: 800, fontSize: "1.05rem", letterSpacing: "0.02em" }}>
                {copy.pricing.subline}
              </p>
              <p className={`${FONT_BODY} mt-1 text-[0.95rem] font-medium`} style={{ color: "var(--ink)" }}>
                {copy.pricing.priceNote}
              </p>
            </div>
          </div>

          {/* free vs paid plates */}
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Plate fill="#FFFFFF" className="p-6" style={{ boxShadow: "6px 6px 0 var(--ink)" }}>
              <h3 className={`${FONT_DISPLAY} uppercase`} style={{ color: "var(--ink)", fontWeight: 800, fontSize: "1.35rem" }}>
                {copy.pricing.freeTitle}
              </h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {copy.pricing.freeItems.map((it, i) => (
                  <li key={i} className={`${FONT_BODY} flex items-start gap-2.5 text-[1rem] font-medium`} style={{ color: "var(--ink)" }}>
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center" style={{ background: "var(--ink)", borderRadius: 3 }}>
                      <Check className="size-3.5" style={{ color: "#fff" }} />
                    </span>
                    {it}
                  </li>
                ))}
              </ul>
            </Plate>

            <Plate fill="var(--ink)" className="p-6" style={{ boxShadow: "6px 6px 0 rgba(0,0,0,0.35)" }}>
              <div aria-hidden style={{ width: 40, height: 4, background: "var(--yellow)", marginBottom: "0.6rem" }} />
              <h3 className={`${FONT_DISPLAY} uppercase`} style={{ color: "#fff", fontWeight: 800, fontSize: "1.35rem" }}>
                {copy.pricing.paidTitle}
              </h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {copy.pricing.paidItems.map((it, i) => (
                  <li key={i} className={`${FONT_BODY} flex items-start gap-2.5 text-[1rem] font-medium`} style={{ color: "#f4f4f3" }}>
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center" style={{ background: "var(--yellow)", borderRadius: 3 }}>
                      <Check className="size-3.5" style={{ color: "var(--ink)" }} />
                    </span>
                    {it}
                  </li>
                ))}
              </ul>
            </Plate>
          </div>

          <p className={`${FONT_DISPLAY} mt-6 uppercase`} style={{ color: "var(--ink)", fontWeight: 800, fontSize: "clamp(1.1rem,2.6vw,1.6rem)", letterSpacing: "-0.005em" }}>
            {copy.pricing.anchor}
          </p>

          <Plate fill="#FFFFFF" className="mt-4 p-4">
            <p className={`${FONT_BODY} text-[0.98rem] font-medium`} style={{ color: "var(--ink)" }}>
              {copy.pricing.failsafe}
            </p>
          </Plate>

          {/* trust band */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {copy.pricing.trust.map((t, i) => (
              <Plate key={i} fill="#FFFFFF" className="flex items-center gap-2 px-4 py-3">
                <span aria-hidden style={{ width: 9, height: 9, background: "var(--ink)", transform: "rotate(45deg)", display: "inline-block", flexShrink: 0 }} />
                <span className={`${FONT_DISPLAY} uppercase`} style={{ color: "var(--ink)", fontWeight: 700, fontSize: "0.95rem", letterSpacing: "0.02em" }}>{t}</span>
              </Plate>
            ))}
          </div>

          <div className="mt-8">
            <CtaPrimary href="/register">{copy.pricing.cta}</CtaPrimary>
          </div>
        </div>
      </section>

      {/* ── BASE / HONEST PROOF (white band) ────────────────────── */}
      <section style={{ background: "#FFFFFF" }}>
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <BandHeader title={copy.base.header} />
          <div className="flex flex-wrap items-center gap-3">
            <p className={`${FONT_DISPLAY} uppercase`} style={{ color: "var(--ink)", fontWeight: 800, fontSize: "clamp(1.4rem,3.2vw,2.1rem)" }}>
              {copy.base.lead}
            </p>
            <span className={`${FONT_DISPLAY} inline-flex items-center gap-1.5 uppercase`} style={{ background: "var(--yellow)", color: "var(--ink)", border: "2px solid var(--ink)", borderRadius: 4, fontWeight: 800, fontSize: "0.8rem", letterSpacing: "0.06em", padding: "0.25rem 0.6rem" }}>
              <span style={{ width: 7, height: 7, background: "var(--red)", borderRadius: "50%", display: "inline-block" }} />
              {copy.base.freshBadge}
            </span>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
            {copy.base.stats.map((s, i) => (
              <Plate key={i} fill={i === 1 ? "var(--yellow)" : "#FFFFFF"} className="flex flex-col items-center justify-center px-2 py-7 text-center">
                <CountUp
                  value={s.value}
                  className={`${FONT_DISPLAY} leading-none`}
                  style={{ color: "var(--ink)", fontWeight: 800, fontSize: "clamp(2.2rem,7vw,4rem)" }}
                />
                <span className={`${FONT_DISPLAY} mt-2 uppercase`} style={{ color: "var(--ink)", fontWeight: 700, fontSize: "clamp(0.7rem,1.6vw,0.95rem)", letterSpacing: "0.06em" }}>
                  {s.label}
                </span>
              </Plate>
            ))}
          </div>

          <p className={`${FONT_BODY} mt-6 max-w-[64ch] text-[1.05rem] font-medium leading-relaxed`} style={{ color: "#26282a" }}>
            {copy.base.body}
          </p>
        </div>
      </section>

      {/* ── FAQ (surface band) ──────────────────────────────────── */}
      <section style={{ background: "var(--surface)" }}>
        <div className="mx-auto w-full max-w-4xl px-5 py-16 sm:px-8 sm:py-20">
          <BandHeader title={copy.faq.header} />
          <Faq />
        </div>
      </section>

      {/* ── FINAL CTA + MODE LAUNCHER (ink band) ────────────────── */}
      <section style={{ background: "var(--ink)" }}>
        <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
            <div>
              <h2 className={`${FONT_DISPLAY} uppercase leading-[0.9] tracking-[-0.01em]`} style={{ color: "#fff", fontWeight: 800, fontSize: "clamp(2.6rem,8vw,5.2rem)" }}>
                {copy.finalCta.header}
              </h2>
              <p className={`${FONT_BODY} mt-4 max-w-[42ch] text-[1.1rem] font-medium`} style={{ color: "#d7d9db" }}>
                {copy.finalCta.lead}
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/register"
                  className={`v5-cta group inline-flex items-center justify-center gap-2 ${FONT_DISPLAY} uppercase`}
                  style={{ background: "var(--yellow)", color: "var(--ink)", border: "2px solid var(--yellow)", borderRadius: 4, padding: "0.85rem 1.5rem", fontSize: "clamp(1rem,1.4vw,1.15rem)", fontWeight: 800 }}
                >
                  {copy.finalCta.ctaPrimary}
                  <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="#hero-question"
                  className={`inline-flex items-center justify-center gap-2 ${FONT_DISPLAY} uppercase`}
                  style={{ background: "transparent", color: "#fff", border: "2px solid #fff", borderRadius: 4, padding: "0.85rem 1.5rem", fontSize: "clamp(1rem,1.4vw,1.15rem)", fontWeight: 800 }}
                >
                  {copy.finalCta.ctaSecondary}
                </Link>
              </div>
            </div>

            {/* mode launcher — full-width plates */}
            <div>
              <p className={`${FONT_DISPLAY} mb-3 flex items-center gap-2 uppercase`} style={{ color: "#fff", fontWeight: 700, fontSize: "0.82rem", letterSpacing: "0.1em" }}>
                <span aria-hidden style={{ width: 9, height: 9, background: "var(--yellow)", transform: "rotate(45deg)", display: "inline-block", flexShrink: 0 }} />
                {copy.finalCta.launcherTitle}
              </p>
              <div className="flex flex-col gap-3">
                {copy.finalCta.launcher.map((row, i) => (
                  <Link
                    key={i}
                    href={row.href}
                    className={`v5-launch group flex items-center justify-between gap-4 ${FONT_DISPLAY} uppercase`}
                    style={{ background: "#fff", color: "var(--ink)", border: "2px solid #fff", borderRadius: 4, padding: "1rem 1.15rem", fontWeight: 800, fontSize: "clamp(1rem,2.4vw,1.3rem)" }}
                  >
                    <span className="flex items-center gap-3">
                      <span aria-hidden style={{ width: 12, height: 12, background: "var(--yellow)", border: "2px solid var(--ink)", transform: "rotate(45deg)", display: "inline-block" }} />
                      {row.label}
                    </span>
                    <ArrowUpRight className="size-6 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer style={{ background: "#FFFFFF", borderTop: "4px solid var(--ink)" }}>
        <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <span aria-hidden style={{ width: 16, height: 16, background: "var(--yellow)", border: "2px solid var(--ink)", transform: "rotate(45deg)", display: "inline-block" }} />
              <div>
                <div className={`${FONT_DISPLAY} uppercase leading-none`} style={{ color: "var(--ink)", fontWeight: 800, fontSize: "1.2rem" }}>{copy.footer.brand}</div>
                <div className={`${FONT_BODY} text-[0.85rem] font-medium`} style={{ color: "#46515D" }}>{copy.footer.tag}</div>
              </div>
            </div>
            <div className="flex gap-4">
              <Link href="/login" className={`${FONT_DISPLAY} uppercase`} style={{ color: "var(--ink)", fontWeight: 700, fontSize: "0.9rem" }}>{copy.footer.linkLogin}</Link>
              <Link href="/register" className={`${FONT_DISPLAY} uppercase`} style={{ color: "var(--ink)", fontWeight: 700, fontSize: "0.9rem" }}>{copy.footer.linkStart}</Link>
            </div>
          </div>

          <div className="mt-8" style={{ borderTop: "2px solid var(--ink)", paddingTop: "1.25rem" }}>
            <p className={`${FONT_BODY} max-w-[80ch] text-[0.8rem] leading-relaxed`} style={{ color: "#46515D" }}>
              <strong style={{ color: "var(--ink)" }}>{copy.footer.disclaimerStrong}</strong> {copy.footer.disclaimer}
            </p>
            <p className={`${FONT_BODY} mt-4 text-[0.8rem]`} style={{ color: "#46515D" }}>{copy.footer.copyright}</p>
          </div>
        </div>
      </footer>

      {/* hover: hard 2px translate + instant color invert, no soft shadows */}
      <style>{`
        .v5-cta:hover { transform: translate(-2px, -2px); background: var(--yellow) !important; color: var(--ink) !important; }
        .v5-ghost:hover { transform: translate(-2px, -2px); background: var(--ink); color: #fff; }
        .v5-launch:hover { background: var(--yellow); border-color: var(--ink); }
        .v5-cta, .v5-ghost, .v5-launch { transition: transform 120ms steps(2), background 0ms, color 0ms; }
        @media (prefers-reduced-motion: reduce) {
          .v5-cta, .v5-ghost, .v5-launch { transition: none; }
        }
      `}</style>
    </div>
  );
}
