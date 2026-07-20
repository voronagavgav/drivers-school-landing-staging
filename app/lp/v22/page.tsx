"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  X,
  Plus,
  Minus,
  BookOpen,
  CalendarClock,
  Gauge,
  Dumbbell,
  Timer,
  ClipboardList,
  Clock,
  AlertTriangle,
} from "lucide-react";
import {
  NAV,
  HERO,
  HERO_Q,
  TOUR,
  STOP1,
  STOP2,
  STOP3,
  MECHANISM,
  LOSS,
  PRICING,
  BASE,
  FAQ,
  FINAL,
  FOOTER,
  STATS,
} from "./copy";

/* ================================================================== */
/*  palette — «Опівночі»: lamp-lit espresso interior (inherited v13)  */
const BG = "#211710"; // espresso brown-black page field
const SURFACE = "#2C2018"; // lifted surface
const SURFACE2 = "#372A20"; // warmer lit surface
const INK = "#F6EDE1"; // warm ivory type
const MUTED = "#D9C7AE"; // ≥4.5:1 on BG — secondary
const DIM = "#B7A588"; // dim labels — still ≥4.5:1 on BG
const CORAL = "#FF7051"; // capped: CTA + tiny highlights
const CORAL_INK = "#2A130C"; // dark ink on coral pill
const CREAM = "#F4E9DA"; // brightest surface (pricing)
const CREAM_INK = "#2A1E14"; // dark ink on cream
const CREAM_MUTED = "#6A5540"; // muted on cream (≥4.5:1)
const LINE = "rgba(246,237,225,0.12)"; // hairline on dark
const GREEN = "#8FD4A6"; // correctness tick (not a brand hue)

const serif: CSSProperties = { fontFamily: "var(--font-display), Georgia, serif" };
const sans: CSSProperties = { fontFamily: "var(--font-body), system-ui, sans-serif" };

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");
const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ================================================================== */
/*  Lamp pool — one radial warm light, breathes on a 12s loop         */
function LampPool({ side = "tr" }: { side?: "tr" | "tl" | "c" }) {
  const pos =
    side === "tr"
      ? "-right-[10%] -top-[30%]"
      : side === "tl"
      ? "-left-[12%] -top-[26%]"
      : "left-1/2 -top-[34%] -translate-x-1/2";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className={cx("lamp-breathe absolute h-[820px] w-[820px] max-w-[130vw] rounded-full blur-[10px]", pos)}
        style={{
          background:
            "radial-gradient(closest-side, rgba(255,217,160,0.34), rgba(255,217,160,0.14) 42%, rgba(255,217,160,0) 72%)",
        }}
      />
    </div>
  );
}

/* ================================================================== */
/*  Reveal — enhances an ALREADY-visible default (never gates content) */
function useReveal<T extends HTMLElement>(opts?: { y?: number; delay?: number }) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReduced()) return;
    const y = opts?.y ?? 26;
    el.style.opacity = "0";
    el.style.transform = `translateY(${y}px)`;
    el.style.transition = `opacity 900ms cubic-bezier(0.16,1,0.3,1) ${opts?.delay ?? 0}ms, transform 1000ms cubic-bezier(0.16,1,0.3,1) ${opts?.delay ?? 0}ms`;
    el.style.willChange = "opacity, transform";
    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
      io.disconnect();
      clearTimeout(fallback);
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) reveal();
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    // Safety net — content must never stay hidden (paused observers / headless
    // renderers). But ARM it only once the page actually moves, so a below-fold
    // card's rise plays when it's scrolled into view, not invisibly ~1.1s after
    // load. Enhance-only, never gate.
    let fallback: ReturnType<typeof setTimeout> | undefined;
    const armFallback = () => {
      if (fallback == null && !done) fallback = setTimeout(reveal, 900);
    };
    window.addEventListener("scroll", armFallback, { once: true, passive: true });
    document.addEventListener("visibilitychange", armFallback, { once: true });
    return () => {
      io.disconnect();
      if (fallback) clearTimeout(fallback);
      window.removeEventListener("scroll", armFallback);
      document.removeEventListener("visibilitychange", armFallback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ref;
}

/* ================================================================== */
/*  ProductScreen — every REAL UI surface wears app chrome (the tour  */
/*  language: these are actual screens, the only light + polychrome). */
function ProductScreen({
  name,
  tag,
  glow = true,
  children,
  className,
}: {
  name: string;
  tag?: string;
  glow?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx("relative overflow-hidden rounded-[22px]", className)}
      style={{
        ...sans,
        background: `linear-gradient(180deg, ${SURFACE2}, ${SURFACE})`,
        border: `1px solid ${LINE}`,
        boxShadow:
          "0 50px 100px -45px rgba(0,0,0,0.78), inset 0 1px 0 rgba(255,229,190,0.07)",
      }}
    >
      {glow && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-px h-28"
          style={{ background: "radial-gradient(62% 100% at 70% 0%, rgba(255,217,160,0.16), transparent 72%)" }}
        />
      )}
      {/* chrome bar */}
      <div
        className="relative flex items-center gap-3 border-b px-4 py-2.5"
        style={{ borderColor: LINE, background: "rgba(246,237,225,0.025)" }}
      >
        <span className="flex items-center gap-1.5">
          {[0.5, 0.32, 0.2].map((o, i) => (
            <span key={i} className="size-2 rounded-full" style={{ background: `rgba(255,217,160,${o})` }} />
          ))}
        </span>
        <span className="text-[12.5px] font-semibold tracking-tight" style={{ color: MUTED }}>
          {name}
        </span>
        {tag && (
          <span
            className="ml-auto rounded-full px-2 py-0.5 text-[11px] uppercase tracking-[0.1em]"
            style={{ background: "rgba(255,217,160,0.08)", color: DIM }}
          >
            {tag}
          </span>
        )}
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

/* ================================================================== */
/*  Coral pill — the single CTA styling reused at every depth         */
function Pill({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost" | "dark";
  className?: string;
}) {
  const base =
    "group inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
  const styles: Record<string, CSSProperties> = {
    primary: {
      background: CORAL,
      color: CORAL_INK,
      boxShadow: "0 8px 30px -8px rgba(255,112,81,0.5)",
      // @ts-expect-error css var for ring offset
      "--tw-ring-color": "rgba(255,112,81,0.6)",
      "--tw-ring-offset-color": BG,
    },
    ghost: {
      background: "transparent",
      color: INK,
      border: `1px solid ${LINE}`,
      // @ts-expect-error css var
      "--tw-ring-color": "rgba(246,237,225,0.4)",
      "--tw-ring-offset-color": BG,
    },
    dark: {
      background: CREAM_INK,
      color: CREAM,
      // @ts-expect-error css var
      "--tw-ring-color": "rgba(42,30,20,0.5)",
      "--tw-ring-offset-color": CREAM,
    },
  };
  return (
    <Link href={href} className={cx(base, className)} style={{ ...sans, ...styles[variant] }}>
      {children}
    </Link>
  );
}

/* ================================================================== */
/*  HERO interactive — answer ONE official question, meter ticks up   */
function HeroQuestion() {
  const [picked, setPicked] = useState<number | null>(null);
  const [meter, setMeter] = useState(0);
  const rafRef = useRef<number | null>(null);

  const choose = useCallback(
    (i: number) => {
      if (picked !== null) return;
      setPicked(i);
      const correct = HERO_Q.options[i].correct;
      const target = correct ? 5 : 2;
      if (prefersReduced()) {
        setMeter(target);
        return;
      }
      const start = performance.now();
      const dur = 1100;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        setMeter(Math.round(target * eased));
        if (t < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [picked]
  );

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const answered = picked !== null;
  const correct = answered && HERO_Q.options[picked!].correct;

  return (
    <ProductScreen name={HERO_Q.screenName} tag="без реєстрації">
      <div className="p-5 sm:p-6">
        <p className="text-[12px] font-medium uppercase tracking-[0.14em]" style={{ color: DIM }}>
          {HERO_Q.label}
        </p>
        <h3 className="mt-2.5 text-[19px] leading-snug sm:text-[21px]" style={{ ...serif, color: INK, fontWeight: 700 }}>
          {HERO_Q.question}
        </h3>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {HERO_Q.options.map((o, i) => {
            const isPicked = picked === i;
            const showState = answered && (o.correct || isPicked);
            const good = o.correct;
            return (
              <button
                key={i}
                onClick={() => choose(i)}
                disabled={answered}
                aria-label={`відповідь ${o.text}`}
                className="flex items-center justify-between gap-2 rounded-xl px-3.5 py-3 text-left text-[15px] transition-all duration-200"
                style={{
                  background: showState
                    ? good
                      ? "rgba(120,190,140,0.16)"
                      : "rgba(255,112,81,0.14)"
                    : "rgba(246,237,225,0.045)",
                  border: `1px solid ${showState ? (good ? "rgba(120,190,140,0.5)" : "rgba(255,112,81,0.5)") : LINE}`,
                  color: INK,
                  cursor: answered ? "default" : "pointer",
                }}
              >
                <span style={{ fontWeight: 500 }}>{o.text}</span>
                {showState &&
                  (good ? (
                    <Check className="size-4" style={{ color: GREEN }} />
                  ) : isPicked ? (
                    <X className="size-4" style={{ color: CORAL }} />
                  ) : null)}
              </button>
            );
          })}
        </div>

        {/* mini readiness meter */}
        <div className="mt-5">
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] uppercase tracking-[0.12em]" style={{ color: DIM }}>
              {HERO_Q.meterLabel}
            </span>
            <span className="tabular-nums text-[15px] font-semibold" style={{ color: answered ? CORAL : DIM }}>
              {meter}%
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: "rgba(246,237,225,0.08)" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${meter}%`,
                background: `linear-gradient(90deg, #FFB27A, ${CORAL})`,
                transition: "width 120ms linear",
              }}
            />
          </div>
          <p className="mt-3 text-[13.5px] leading-relaxed" style={{ color: answered ? MUTED : DIM }}>
            {answered ? (correct ? HERO_Q.correctNote : HERO_Q.wrongNote) : HERO_Q.meterHint}
          </p>
        </div>
      </div>
    </ProductScreen>
  );
}

/* ================================================================== */
/*  Readiness dial — rises in view, then honestly DECAYS              */
function ReadinessDial() {
  const [val, setVal] = useState(46);
  const wrapRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const t0Ref = useRef(0);
  const startedRef = useRef(false);
  const settledRef = useRef(false); // decay hit its floor — loop retired for good

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (prefersReduced()) { setVal(74); return; }
    const riseDur = 1400;
    const peak = 78;
    const base = 46;
    const floorAfter = 9; // seconds past the rise where decay has bottomed out

    const frame = (now: number) => {
      const dt = now - t0Ref.current;
      if (dt < riseDur) {
        const t = dt / riseDur;
        const eased = 1 - Math.pow(1 - t, 3);
        setVal(Math.round(base + (peak - base) * eased));
        rafRef.current = requestAnimationFrame(frame);
      } else {
        const after = (dt - riseDur) / 1000;
        if (after >= floorAfter) {
          // settle at the honest low and STOP — no perpetual rAF / re-render churn
          setVal(68);
          settledRef.current = true;
          rafRef.current = 0;
          return;
        }
        const decayed = peak - Math.min(10, after * 1.15) + Math.sin(after * 0.9) * 0.6;
        setVal(Math.round(decayed));
        rafRef.current = requestAnimationFrame(frame);
      }
    };
    const start = () => {
      if (settledRef.current || rafRef.current) return;
      if (!startedRef.current) { startedRef.current = true; t0Ref.current = performance.now(); }
      rafRef.current = requestAnimationFrame(frame);
    };
    const stop = () => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
    };
    // Run only while in view: start/resume on enter, cancel on exit (kills the
    // off-screen 60fps setState loop the previous version never stopped).
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => (e.isIntersecting ? start() : stop())),
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => { io.disconnect(); stop(); };
  }, []);

  const R = 78;
  const C = 2 * Math.PI * R;
  const dash = C * (val / 100);
  const hue = 20 + (val / 100) * 8;
  const stroke = `hsl(${hue}, 85%, ${52 + val * 0.06}%)`;

  return (
    <ProductScreen name={STOP1.screenName} tag={STOP1.dialSub} className="mx-auto w-full max-w-[380px]">
      <div ref={wrapRef} className="p-6 sm:p-7">
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] uppercase tracking-[0.14em]" style={{ color: DIM }}>
            {STOP1.dialLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[12px]" style={{ color: DIM }}>
            <Gauge className="size-3.5" style={{ color: CORAL }} /> {STOP1.engine}
          </span>
        </div>
        <div className="relative mx-auto mt-4 grid aspect-square w-[210px] place-items-center">
          <svg viewBox="0 0 200 200" className="absolute inset-0 -rotate-90 mx-auto" style={{ maxWidth: 210 }}>
            <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(246,237,225,0.09)" strokeWidth="12" />
            <circle
              cx="100" cy="100" r={R} fill="none" stroke={stroke} strokeWidth="12" strokeLinecap="round"
              strokeDasharray={`${dash} ${C}`}
              style={{ filter: `drop-shadow(0 0 10px hsla(${hue},85%,55%,0.5))` }}
            />
          </svg>
          <div className="text-center">
            <div className="tabular-nums text-[52px] leading-none" style={{ ...serif, color: INK, fontWeight: 800 }}>
              {val}
              <span className="text-[24px]" style={{ color: MUTED }}>%</span>
            </div>
            <div className="mt-1 text-[12.5px]" style={{ color: DIM }}>{STOP1.dialCaption}</div>
          </div>
        </div>
        <p className="mt-3 text-center text-[13.5px] italic" style={{ color: MUTED }}>
          {STOP1.decayNote}
        </p>
      </div>
    </ProductScreen>
  );
}

/* ================================================================== */
/*  Exam-date picker — local plan preview                             */
function DatePicker() {
  const [date, setDate] = useState("");
  const today = new Date();
  const min = new Date(today.getTime() + 86400000).toISOString().slice(0, 10);

  let days: number | null = null;
  if (date) {
    const d = new Date(date + "T09:00:00");
    days = Math.max(1, Math.ceil((d.getTime() - today.getTime()) / 86400000));
  }
  const perDay = days ? Math.max(8, Math.ceil(STOP2.totalQuestions / days)) : null;
  const intensive = days !== null && days < 7;

  return (
    <ProductScreen name={STOP2.screenName} tag="demo">
      <div className="p-6 sm:p-8">
        <label className="block text-[13px] uppercase tracking-[0.12em]" style={{ color: DIM }}>
          {STOP2.inputLabel}
        </label>
        <input
          type="date"
          min={min}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-2 w-full rounded-xl px-4 py-3.5 text-[16px] outline-none transition-colors"
          style={{
            background: "rgba(246,237,225,0.05)",
            border: `1px solid ${LINE}`,
            color: INK,
            colorScheme: "dark",
          }}
        />

        <div className="mt-5 min-h-[96px]">
          {days === null ? (
            <p className="text-[15px] leading-relaxed" style={{ color: MUTED }}>{STOP2.fallback}</p>
          ) : (
            <div>
              <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
                <div>
                  <div className="tabular-nums text-[40px] leading-none" style={{ ...serif, color: INK, fontWeight: 800 }}>
                    {days}
                  </div>
                  <div className="mt-1 text-[13px]" style={{ color: DIM }}>{STOP2.daysWord}</div>
                </div>
                <div className="text-[26px] leading-none" style={{ color: DIM }}>×</div>
                <div>
                  <div className="tabular-nums text-[40px] leading-none" style={{ ...serif, color: CORAL, fontWeight: 800 }}>
                    ≈{perDay}
                  </div>
                  <div className="mt-1 text-[13px]" style={{ color: DIM }}>{STOP2.perDayWord}</div>
                </div>
              </div>
              <p className="mt-4 text-[14.5px] leading-relaxed" style={{ color: intensive ? CORAL : MUTED }}>
                {intensive ? STOP2.intensive : STOP2.topics}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6">
          <Pill href={STOP2.cta.href} variant="primary" className="w-full sm:w-auto">
            {STOP2.cta.label} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Pill>
        </div>
      </div>
    </ProductScreen>
  );
}

/* ================================================================== */
/*  Simulator screen — static preview of the real exam surface        */
function SimulatorScreen() {
  const s = STOP3.screen;
  const filled = 4;
  const total = 20;
  return (
    <ProductScreen name={STOP3.screenName} tag="20 / 20 / 2" className="mx-auto w-full max-w-[420px]">
      <div className="p-5 sm:p-6">
        {/* status row */}
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[15px] font-semibold tabular-nums"
            style={{ background: "rgba(255,217,160,0.09)", color: INK }}
          >
            <Clock className="size-4" style={{ color: CORAL }} /> {s.timer}
          </span>
          <span className="text-[13px]" style={{ color: MUTED }}>{s.counter}</span>
          <span className="ml-auto inline-flex items-center gap-1.5 text-[13px]" style={{ color: DIM }}>
            <AlertTriangle className="size-3.5" style={{ color: DIM }} /> {s.errors}
          </span>
        </div>

        {/* progress segments */}
        <div className="mt-3 flex gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className="h-1.5 flex-1 rounded-full"
              style={{ background: i < filled ? CORAL : "rgba(246,237,225,0.09)" }}
            />
          ))}
        </div>

        {/* question */}
        <h3 className="mt-5 text-[17px] leading-snug sm:text-[18.5px]" style={{ ...serif, color: INK, fontWeight: 700 }}>
          {s.question}
        </h3>
        <div className="mt-4 flex flex-col gap-2.5">
          {s.options.map((o, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px]"
              style={{ background: "rgba(246,237,225,0.045)", border: `1px solid ${LINE}`, color: INK }}
            >
              <span
                className="grid size-6 shrink-0 place-items-center rounded-full text-[12px] font-semibold uppercase"
                style={{ border: `1px solid ${LINE}`, color: DIM }}
              >
                {o.pick}
              </span>
              <span style={{ fontWeight: 500 }}>{o.text}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 border-t pt-4" style={{ borderColor: LINE }}>
          <p className="text-[13px]" style={{ color: DIM }}>{STOP3.rules[0]}. {STOP3.rules[1]}.</p>
        </div>
      </div>
    </ProductScreen>
  );
}

/* ================================================================== */
/*  TourStop — numbered node + connecting path rail + header          */
function TourStop({
  index,
  stopLabel,
  screenName,
  caption,
  title,
  first,
  last,
  children,
}: {
  index: string;
  stopLabel: string;
  screenName: string;
  caption?: string;
  title: string;
  first?: boolean;
  last?: boolean;
  children: ReactNode;
}) {
  const bodyRef = useReveal<HTMLDivElement>({ y: 30 });
  return (
    <div className="relative grid gap-6 lg:grid-cols-[64px_1fr] lg:gap-x-10">
      {/* desktop rail column */}
      <div className="relative hidden lg:block" aria-hidden>
        {/* continuous path line — abuts neighbours to read as one walk */}
        <div
          className="absolute left-1/2 w-px -translate-x-1/2"
          style={{
            top: first ? 40 : 0,
            bottom: last ? "auto" : 0,
            height: last ? 40 : undefined,
            background: "linear-gradient(180deg, rgba(255,217,160,0.28), rgba(255,217,160,0.10))",
          }}
        />
        {/* node */}
        <div
          className="relative z-10 mx-auto grid size-14 place-items-center rounded-full"
          style={{
            background: "radial-gradient(closest-side, rgba(255,217,160,0.16), rgba(44,32,24,0.9))",
            border: `1px solid rgba(255,217,160,0.34)`,
            boxShadow: "0 0 34px -6px rgba(255,217,160,0.35)",
          }}
        >
          <span className="tabular-nums text-[18px]" style={{ ...serif, color: INK, fontWeight: 800 }}>
            {index}
          </span>
        </div>
      </div>

      {/* content */}
      <div ref={bodyRef}>
        {/* stop badge (mobile shows a chip; desktop shows a label) */}
        <div className="flex items-center gap-2.5">
          <span
            className="grid size-8 place-items-center rounded-full lg:hidden"
            style={{ border: `1px solid rgba(255,217,160,0.34)`, background: "rgba(255,217,160,0.08)" }}
          >
            <span className="tabular-nums text-[13px]" style={{ ...serif, color: INK, fontWeight: 800 }}>{index}</span>
          </span>
          <span className="text-[12.5px] uppercase tracking-[0.16em]" style={{ color: CORAL, fontWeight: 600 }}>
            {stopLabel} · {screenName}
          </span>
        </div>
        {caption && (
          <p className="mt-4 text-[14px]" style={{ color: DIM }}>{caption}</p>
        )}
        <h2
          className={cx("text-[clamp(1.9rem,4.2vw,3rem)] leading-[1.05] tracking-[-0.015em]", caption ? "mt-1.5" : "mt-4")}
          style={{ ...serif, color: INK, fontWeight: 800 }}
        >
          {title}
        </h2>
        <div className="mt-7">{children}</div>
      </div>
    </div>
  );
}

/* Fact chip welded under a tour screen */
function FactChip({ children }: { children: ReactNode }) {
  return (
    <div
      className="inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-[13.5px]"
      style={{ background: "rgba(255,217,160,0.09)", color: MUTED, border: `1px solid ${LINE}` }}
    >
      <span className="size-1.5 rounded-full" style={{ background: CORAL }} />
      {children}
    </div>
  );
}

/* ================================================================== */
/*  FAQ accordion                                                     */
function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mx-auto max-w-3xl" style={{ borderColor: LINE }}>
      {FAQ.items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={i} style={{ borderColor: LINE }} className="border-t first:border-t-0">
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 py-5 text-left"
              aria-expanded={isOpen}
            >
              <span className="text-[17px] sm:text-[18px]" style={{ ...serif, color: INK, fontWeight: 700 }}>
                {it.q}
              </span>
              <span
                className="grid size-8 shrink-0 place-items-center rounded-full"
                style={{ border: `1px solid ${LINE}`, color: isOpen ? CORAL : MUTED }}
              >
                {isOpen ? <Minus className="size-4" /> : <Plus className="size-4" />}
              </span>
            </button>
            <div className="grid transition-all duration-300 ease-out" style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}>
              <div className="overflow-hidden">
                <p className="pb-5 pr-12 text-[15.5px] leading-relaxed" style={{ ...sans, color: MUTED }}>
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

/* ================================================================== */
/*  PAGE                                                              */
export default function V22Page() {
  const heroRef = useRef<HTMLDivElement>(null);
  const lossRef = useRef<HTMLElement>(null);

  // hero entrance choreography
  useEffect(() => {
    if (prefersReduced() || !heroRef.current) return;
    const ctx = gsap.context(() => {
      gsap.set("[data-hero-rise]", { opacity: 0, y: 22 });
      gsap.to("[data-hero-rise]", {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "power3.out",
        stagger: 0.09,
        delay: 0.05,
      });
    }, heroRef);
    return () => ctx.revert();
  }, []);

  // lamp «switches off» for the loss band — scrubbed veil over the band
  useEffect(() => {
    if (prefersReduced() || !lossRef.current) return;
    gsap.registerPlugin(ScrollTrigger);
    const veil = lossRef.current.querySelector<HTMLElement>("[data-veil]");
    if (!veil) return;
    const st = gsap.fromTo(
      veil,
      { opacity: 0.15 },
      {
        opacity: 0.92,
        ease: "none",
        scrollTrigger: {
          trigger: lossRef.current,
          start: "top 80%",
          end: "center center",
          scrub: 0.6,
        },
      }
    );
    return () => {
      st.scrollTrigger?.kill();
      st.kill();
    };
  }, []);

  const launcherIcons = [Dumbbell, Timer, ClipboardList];
  const mechIcons = [BookOpen, CalendarClock, Gauge];

  return (
    <main style={{ ...sans, background: BG, color: INK }} className="relative min-h-full overflow-hidden">
      <style>{`
        .lamp-breathe { animation: lampBreathe 12s ease-in-out infinite; }
        @keyframes lampBreathe { 0%,100%{opacity:.82} 50%{opacity:1} }
        @media (prefers-reduced-motion: reduce){ .lamp-breathe{animation:none} }
        [data-hero-rise]{ will-change: transform, opacity; }
      `}</style>

      {/* ---- NAV ---- */}
      <header className="relative z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="#top" className="text-[19px] tracking-tight" style={{ ...serif, color: INK, fontWeight: 800 }}>
            {NAV.brand}
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            {NAV.links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-[14.5px] transition-colors hover:opacity-80"
                style={{ color: MUTED }}
              >
                {l.label}
              </a>
            ))}
          </nav>
          <Pill href={NAV.cta.href} variant="primary" className="!px-5 !py-2.5 text-[14px]">
            {NAV.cta.label}
          </Pill>
        </div>
      </header>

      {/* ================= HERO ================= */}
      <div id="top" ref={heroRef} className="relative">
        <LampPool side="tr" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-5 pb-20 pt-6 sm:px-8 sm:pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-x-14 lg:gap-y-8 lg:pb-28">
          <div className="order-1 lg:col-start-1 lg:row-start-1">
            <p
              data-hero-rise
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px]"
              style={{ background: "rgba(255,217,160,0.10)", color: MUTED, border: `1px solid ${LINE}` }}
            >
              <span className="size-1.5 rounded-full" style={{ background: CORAL }} />
              {HERO.scene}
            </p>
            <h1
              data-hero-rise
              className="mt-5 text-balance text-[clamp(2.7rem,7.4vw,5rem)] leading-[0.98] tracking-[-0.02em]"
              style={{ ...serif, color: INK, fontWeight: 800 }}
            >
              {HERO.headlineLines[0]}
              <br />
              {HERO.headlineLines[1]}
            </h1>
            <p data-hero-rise className="mt-6 max-w-xl text-[17px] leading-relaxed sm:text-[18.5px]" style={{ color: MUTED }}>
              {HERO.subhead}
            </p>

            <p data-hero-rise className="mt-5 text-[16px] leading-relaxed" style={{ color: INK }}>
              {HERO.hook.split(STATS.passRate).flatMap((part, i) =>
                i === 0
                  ? [part]
                  : [
                      <span key={i} style={{ ...serif, color: CORAL, fontWeight: 800 }}>
                        {STATS.passRate}
                      </span>,
                      part,
                    ]
              )}
            </p>

            <div data-hero-rise className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Pill href={HERO.primaryCta.href} variant="primary" className="w-full sm:w-auto">
                {HERO.primaryCta.label} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Pill>
              <Pill href={HERO.secondaryCta.href} variant="ghost" className="w-full sm:w-auto">
                {HERO.secondaryCta.label}
              </Pill>
            </div>
          </div>

          <div data-hero-rise className="order-2 lg:order-none lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:self-center">
            <p className="mb-3 text-[13.5px] leading-relaxed lg:hidden" style={{ color: DIM }}>{HERO.tryHint}</p>
            <HeroQuestion />
          </div>

          <ul data-hero-rise className="order-3 flex flex-wrap gap-2.5 lg:col-start-1 lg:row-start-2">
            {HERO.chips.map((c) => (
              <li
                key={c}
                className="rounded-full px-3.5 py-1.5 text-[13px]"
                style={{ background: "rgba(246,237,225,0.05)", color: MUTED, border: `1px solid ${LINE}` }}
              >
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ================= TOUR — three stops ================= */}
      <section id="tour" className="relative">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          {/* tour intro */}
          <div className="max-w-3xl border-t pt-[clamp(3.5rem,8vw,6rem)]" style={{ borderColor: LINE }}>
            <p className="text-[15px]" style={{ ...sans, color: DIM, fontWeight: 500 }}>
              {TOUR.eyebrow}
            </p>
            <h2 className="mt-4 text-[clamp(1.8rem,3.8vw,2.7rem)] leading-[1.08] tracking-[-0.015em]" style={{ ...serif, color: INK, fontWeight: 800 }}>
              {TOUR.title}
            </h2>
            <p className="mt-4 max-w-xl text-[17px] leading-relaxed" style={{ color: MUTED }}>{TOUR.sub}</p>
          </div>

          {/* stops */}
          <div className="mt-[clamp(3rem,7vw,5rem)] flex flex-col gap-[clamp(4rem,10vw,8rem)] pb-[clamp(4rem,10vw,8rem)]">
            {/* STOP 1 — dial */}
            <TourStop first index={STOP1.index} stopLabel={STOP1.stopLabel} screenName={STOP1.screenName} caption={STOP1.caption} title={STOP1.title}>
              <div className="grid items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
                <div>
                  <p className="max-w-xl text-[17px] leading-relaxed" style={{ color: MUTED }}>{STOP1.body}</p>
                  <p className="mt-4 max-w-xl text-[16px] leading-relaxed" style={{ color: INK }}>{STOP1.moat}</p>
                  <div className="mt-6"><FactChip>{STOP1.factChip}</FactChip></div>
                </div>
                <ReadinessDial />
              </div>
            </TourStop>

            {/* STOP 2 — plan */}
            <TourStop index={STOP2.index} stopLabel={STOP2.stopLabel} screenName={STOP2.screenName} title={STOP2.title}>
              <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
                <div>
                  <p className="max-w-md text-[17px] leading-relaxed" style={{ color: MUTED }}>{STOP2.sub}</p>
                  <div className="mt-6"><FactChip>{STOP2.factChip}</FactChip></div>
                </div>
                <DatePicker />
              </div>
            </TourStop>

            {/* STOP 3 — simulator */}
            <TourStop last index={STOP3.index} stopLabel={STOP3.stopLabel} screenName={STOP3.screenName} title={STOP3.title}>
              <div className="grid items-center gap-10 lg:grid-cols-[1fr_0.95fr]">
                <div>
                  <p className="max-w-md text-[17px] leading-relaxed" style={{ color: MUTED }}>{STOP3.sub}</p>
                  <div className="mt-6 flex flex-wrap items-baseline gap-x-6 gap-y-3">
                    {STOP3.facts.map((f) => (
                      <div key={f.label} className="flex items-baseline gap-2">
                        <span className="tabular-nums text-[40px] leading-none" style={{ ...serif, color: INK, fontWeight: 800 }}>{f.big}</span>
                        <span className="text-[14px]" style={{ color: MUTED }}>{f.label}</span>
                      </div>
                    ))}
                  </div>
                  {/* the loud line the section is allowed to shout */}
                  <p className="mt-7 text-[clamp(1.6rem,3.4vw,2.3rem)] leading-tight" style={{ ...serif, color: CORAL, fontWeight: 800 }}>
                    {STOP3.free}
                  </p>
                  <p className="mt-2 max-w-md text-[15.5px] leading-relaxed" style={{ color: MUTED }}>{STOP3.freeSub}</p>
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <Pill href={STOP3.cta.href} variant="ghost">
                      {STOP3.cta.label} <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </Pill>
                    <FactChip>{STOP3.factChip}</FactChip>
                  </div>
                </div>
                <SimulatorScreen />
              </div>
            </TourStop>
          </div>
        </div>
      </section>

      {/* ================= МЕХАНІЗМ 3-STEP ================= */}
      <section id="mechanism" className="relative" style={{ background: "#1B120C" }}>
        <LampPool side="c" />
        <div className="relative mx-auto max-w-6xl px-5 py-[clamp(4.5rem,11vw,7.5rem)] sm:px-8">
          <div className="max-w-2xl">
            <p className="text-[15px]" style={{ ...sans, color: DIM, fontWeight: 500 }}>{MECHANISM.eyebrow}</p>
            <h2 className="mt-3 text-[clamp(1.9rem,4vw,2.8rem)] leading-[1.06] tracking-[-0.015em]" style={{ ...serif, color: INK, fontWeight: 800 }}>
              {MECHANISM.title}
            </h2>
            <p className="mt-4 text-[17px] leading-relaxed" style={{ color: MUTED }}>{MECHANISM.sub}</p>
          </div>
          <ol className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-3">
            {MECHANISM.steps.map((s, i) => {
              const Icon = mechIcons[i];
              return (
                <li key={s.n} className="relative">
                  <div className="flex items-center gap-3">
                    <span className="tabular-nums text-[15px]" style={{ ...serif, color: CORAL, fontWeight: 800 }}>{s.n}</span>
                    <span className="h-px flex-1" style={{ background: LINE }} />
                    <Icon className="size-5" style={{ color: MUTED }} strokeWidth={1.4} />
                  </div>
                  <h3 className="mt-4 text-[19px] leading-snug" style={{ ...serif, color: INK, fontWeight: 700 }}>{s.title}</h3>
                  <p className="mt-2.5 text-[15.5px] leading-relaxed" style={{ color: MUTED }}>{s.body}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ================= LOSS-FRAME BAND (lights out) ================= */}
      <section ref={lossRef} className="relative" style={{ background: "#140C07" }}>
        <div data-veil aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "#0C0704" }} />
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(60% 80% at 50% 120%, rgba(255,112,81,0.10), transparent 70%)" }} />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-7 px-5 py-[clamp(5rem,13vw,9rem)] text-center sm:px-8">
          <h2 className="text-[clamp(1.8rem,4.6vw,3rem)] leading-[1.1] tracking-[-0.015em]" style={{ ...serif, color: INK, fontWeight: 800 }}>
            {LOSS.lead}
            <br />
            {LOSS.stat}
          </h2>
          <p className="max-w-xl text-[17px] leading-relaxed" style={{ color: MUTED }}>{LOSS.sub}</p>
          <Pill href={LOSS.cta.href} variant="primary">
            {LOSS.cta.label} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Pill>
        </div>
      </section>

      {/* ================= PRICING (the room's one paper object) ================= */}
      <section id="pricing" className="relative">
        <div className="mx-auto max-w-6xl px-5 py-[clamp(4.5rem,11vw,8rem)] sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[15px]" style={{ ...sans, color: DIM, fontWeight: 500 }}>{PRICING.eyebrow}</p>
            <h2 className="mt-3 text-[clamp(2rem,4.4vw,3rem)] leading-[1.05] tracking-[-0.015em]" style={{ ...serif, color: INK, fontWeight: 800 }}>
              {PRICING.title}
            </h2>
            <p className="mt-4 text-[17px] leading-relaxed" style={{ color: MUTED }}>{PRICING.sub}</p>
          </div>

          <div
            className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-3xl"
            style={{ background: CREAM, boxShadow: "0 60px 120px -50px rgba(0,0,0,0.7), 0 0 80px -30px rgba(255,217,160,0.25)" }}
          >
            <div className="grid md:grid-cols-2">
              {/* free column — first & longer */}
              <div className="p-7 sm:p-9" style={{ borderRight: `1px solid rgba(42,30,20,0.10)` }}>
                <h3 className="text-[15px] uppercase tracking-[0.1em]" style={{ ...sans, color: CREAM_MUTED, fontWeight: 700 }}>
                  {PRICING.freeTitle}
                </h3>
                <ul className="mt-5 space-y-3">
                  {PRICING.freeItems.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[15.5px]" style={{ color: CREAM_INK }}>
                      <Check className="mt-0.5 size-4 shrink-0" style={{ color: "#2E7D46" }} /> {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* paid column */}
              <div className="p-7 sm:p-9">
                <div className="flex items-baseline gap-2">
                  <span className="text-[clamp(2.6rem,6vw,3.6rem)] leading-none" style={{ ...serif, color: CREAM_INK, fontWeight: 900 }}>
                    {PRICING.price} {PRICING.currency}
                  </span>
                </div>
                <p className="mt-1.5 text-[14.5px]" style={{ color: CREAM_MUTED }}>{PRICING.priceFrame}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {PRICING.negations.map((n) => (
                    <span key={n} className="rounded-full px-3 py-1 text-[12.5px]" style={{ background: "rgba(42,30,20,0.07)", color: CREAM_INK, fontWeight: 600 }}>
                      {n}
                    </span>
                  ))}
                </div>

                <ul className="mt-5 space-y-3">
                  {PRICING.paidItems.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[15.5px]" style={{ color: CREAM_INK }}>
                      <Check className="mt-0.5 size-4 shrink-0" style={{ color: CORAL }} /> {f}
                    </li>
                  ))}
                </ul>

                <p className="mt-5 text-[13.5px] leading-relaxed" style={{ color: CREAM_MUTED }}>
                  {PRICING.clarify} {PRICING.anchor}
                </p>

                <div className="mt-6">
                  <Pill href={PRICING.cta.href} variant="dark" className="w-full">
                    {PRICING.cta.label} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </Pill>
                </div>
              </div>
            </div>

            {/* failsafe + trust band */}
            <div className="px-7 py-5 sm:px-9" style={{ background: "rgba(42,30,20,0.05)", borderTop: `1px solid rgba(42,30,20,0.10)` }}>
              <p className="text-[14px] leading-relaxed" style={{ color: CREAM_INK }}>{PRICING.failsafe}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5">
                {PRICING.trustBand.map((t) => (
                  <span key={t} className="flex items-center gap-1.5 text-[13px]" style={{ color: CREAM_MUTED }}>
                    <Check className="size-3.5" style={{ color: "#2E7D46" }} /> {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <p className="mx-auto mt-5 max-w-2xl text-center text-[13.5px]" style={{ color: DIM }}>{PRICING.note}</p>
        </div>
      </section>

      {/* ================= БАЗА / HONEST PROOF ================= */}
      <section className="relative" style={{ background: "#1B120C" }}>
        <LampPool side="tl" />
        <div className="relative mx-auto max-w-6xl px-5 py-[clamp(4rem,10vw,7rem)] sm:px-8">
          <div className="max-w-2xl">
            <h2 className="text-[clamp(1.9rem,4vw,2.8rem)] leading-[1.06] tracking-[-0.015em]" style={{ ...serif, color: INK, fontWeight: 800 }}>
              {BASE.title}
            </h2>
            <p className="mt-4 text-[17px] leading-relaxed" style={{ color: MUTED }}>{BASE.sub}</p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {BASE.facts.map((f) => (
              <div key={f.label} className="rounded-2xl px-6 py-7" style={{ background: `linear-gradient(165deg, ${SURFACE2}, ${SURFACE})`, border: `1px solid ${LINE}` }}>
                <div className="tabular-nums text-[42px] leading-none" style={{ ...serif, color: INK, fontWeight: 800 }}>{f.big}</div>
                <div className="mt-2 text-[14.5px]" style={{ color: MUTED }}>{f.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="flex flex-col gap-3">
              <span
                className="inline-flex w-fit items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px]"
                style={{ background: "rgba(120,190,140,0.12)", color: GREEN, border: "1px solid rgba(120,190,140,0.3)" }}
              >
                <span className="size-1.5 rounded-full" style={{ background: GREEN }} /> {BASE.freshBadge}
              </span>
              <p className="text-[15.5px] leading-relaxed" style={{ color: MUTED }}>{BASE.freshNote}</p>
              <p className="mt-1 text-[15.5px] leading-relaxed" style={{ color: INK }}>{BASE.permission}</p>
              <p className="text-[15px] leading-relaxed" style={{ color: MUTED }}>{BASE.retaker}</p>
            </div>
            {/* reserved calibration slot — no claims until real data */}
            <div className="rounded-2xl border border-dashed p-6" style={{ borderColor: LINE }}>
              <h3 className="text-[16px]" style={{ ...serif, color: INK, fontWeight: 700 }}>{BASE.calibTitle}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed" style={{ color: DIM }}>{BASE.calibReserved}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section id="faq" className="relative">
        <div className="mx-auto max-w-6xl px-5 py-[clamp(4rem,10vw,7rem)] sm:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-[clamp(1.9rem,4vw,2.8rem)] leading-[1.06] tracking-[-0.015em]" style={{ ...serif, color: INK, fontWeight: 800 }}>
              {FAQ.title}
            </h2>
            <p className="mt-4 text-[17px]" style={{ color: MUTED }}>{FAQ.sub}</p>
          </div>
          <div className="mt-10"><Faq /></div>
        </div>
      </section>

      {/* ================= РЕЖИМИ + FINAL CTA (three doors) ================= */}
      <section className="relative" style={{ background: "#1B120C" }}>
        <LampPool side="tr" />
        <div className="relative mx-auto max-w-6xl px-5 py-[clamp(4.5rem,11vw,8rem)] sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[15px]" style={{ ...sans, color: DIM, fontWeight: 500 }}>{FINAL.eyebrow}</p>
            <h2 className="mt-3 text-balance text-[clamp(2rem,5vw,3.4rem)] leading-[1.05] tracking-[-0.02em]" style={{ ...serif, color: INK, fontWeight: 800 }}>
              {FINAL.title}
            </h2>
            <p className="mt-4 text-[17px] leading-relaxed" style={{ color: MUTED }}>{FINAL.sub}</p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Pill href={FINAL.primaryCta.href} variant="primary" className="w-full sm:w-auto">
                {FINAL.primaryCta.label} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Pill>
              <Pill href={FINAL.secondaryCta.href} variant="ghost" className="w-full sm:w-auto">
                {FINAL.secondaryCta.label}
              </Pill>
            </div>
          </div>

          {/* mobile-first vertical mode launcher = the tour's three doors */}
          <div className="mx-auto mt-12 max-w-md">
            <p className="mb-3 text-center text-[13px] uppercase tracking-[0.12em]" style={{ color: DIM }}>{FINAL.launcherTitle}</p>
            <div className="flex flex-col gap-2.5">
              {FINAL.launcher.map((row, i) => {
                const Icon = launcherIcons[i];
                return (
                  <Link
                    key={row.label}
                    href={row.href}
                    className="group flex items-center gap-4 rounded-2xl px-5 py-4 transition-colors"
                    style={{ background: `linear-gradient(165deg, ${SURFACE2}, ${SURFACE})`, border: `1px solid ${LINE}` }}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: "rgba(255,217,160,0.10)" }}>
                      <Icon className="size-5" style={{ color: CORAL }} strokeWidth={1.5} />
                    </span>
                    <span className="flex-1">
                      <span className="block text-[16px]" style={{ ...serif, color: INK, fontWeight: 700 }}>{row.label}</span>
                      <span className="block text-[13.5px]" style={{ color: MUTED }}>{row.sub}</span>
                    </span>
                    <ArrowUpRight className="size-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" style={{ color: MUTED }} />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="relative overflow-hidden" style={{ background: "#160E09" }}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-[-4%] select-none text-center text-[clamp(4rem,18vw,13rem)] leading-none tracking-tight"
          style={{ ...serif, color: "rgba(246,237,225,0.04)", fontWeight: 900 }}
        >
          {FOOTER.brand}
        </div>
        <div className="relative mx-auto max-w-6xl px-5 pt-16 sm:px-8">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <div className="text-[20px]" style={{ ...serif, color: INK, fontWeight: 800 }}>{FOOTER.brand}</div>
              <p className="mt-3 max-w-xs text-[14.5px] leading-relaxed" style={{ color: MUTED }}>{FOOTER.tagline}</p>
            </div>
            {FOOTER.columns.map((col) => (
              <div key={col.title}>
                <div className="text-[13px] uppercase tracking-[0.1em]" style={{ color: DIM }}>{col.title}</div>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-[14.5px] transition-colors hover:opacity-80" style={{ color: MUTED }}>{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-14 border-t pt-6" style={{ borderColor: LINE }}>
            <p className="max-w-3xl text-[12.5px] leading-relaxed" style={{ color: DIM }}>{FOOTER.disclaimer}</p>
            <p className="mt-4 pb-10 text-[12.5px]" style={{ color: DIM }}>{FOOTER.copyright}</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
