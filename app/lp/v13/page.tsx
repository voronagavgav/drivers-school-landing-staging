"use client";

import { useEffect, useRef, useState, useCallback, type CSSProperties } from "react";
import Link from "next/link";
import { gsap } from "gsap";
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
} from "lucide-react";
import {
  NAV,
  HERO,
  HERO_Q,
  DIAL,
  MECHANISM,
  PICKER,
  CALM,
  SIMULATOR,
  LOSS,
  PRICING,
  BASE,
  FAQ,
  FINAL,
  FOOTER,
  STATS,
} from "./copy";

/* ================================================================== */
/*  palette — «Опівночі»: lamp-lit espresso interior                 */
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

const serif: CSSProperties = { fontFamily: "var(--font-display), Georgia, serif" };
const sans: CSSProperties = { fontFamily: "var(--font-body), system-ui, sans-serif" };

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");
const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ================================================================== */
/*  Lamp pool — one radial warm light, breathes on a 12s loop         */
function LampPool() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="lamp-breathe absolute -right-[10%] -top-[30%] h-[820px] w-[820px] max-w-[130vw] rounded-full blur-[10px]"
        style={{
          background:
            "radial-gradient(closest-side, rgba(255,217,160,0.34), rgba(255,217,160,0.14) 42%, rgba(255,217,160,0) 72%)",
        }}
      />
      <div className="absolute -right-[4%] -top-[16%] h-[360px] w-[360px] rounded-full blur-[6px]"
        style={{
          background:
            "radial-gradient(closest-side, rgba(255,229,190,0.30), rgba(255,229,190,0) 70%)",
        }}
      />
    </div>
  );
}

/* ================================================================== */
/*  Section wrapper — holds its own subtle local glow, scroll-lit     */
function LitSection({
  id,
  children,
  className,
  glow,
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
  glow?: "tr" | "tl" | "c" | "none";
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReduced()) return;
    el.style.filter = "brightness(0.78)";
    el.style.transition = "filter 1100ms cubic-bezier(0.16,1,0.3,1)";
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            el.style.filter = "brightness(1)";
            io.unobserve(el);
          }
        }
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const glowStyle: CSSProperties | undefined =
    glow && glow !== "none"
      ? {
          background:
            glow === "tr"
              ? "radial-gradient(60% 60% at 82% 8%, rgba(255,217,160,0.10), transparent 70%)"
              : glow === "tl"
              ? "radial-gradient(58% 58% at 14% 6%, rgba(255,217,160,0.09), transparent 70%)"
              : "radial-gradient(58% 55% at 50% 4%, rgba(255,217,160,0.10), transparent 72%)",
        }
      : undefined;

  return (
    <section ref={ref} id={id} className={cx("relative", className)}>
      {glowStyle && <div aria-hidden className="pointer-events-none absolute inset-0" style={glowStyle} />}
      <div className="relative">{children}</div>
    </section>
  );
}

/* ================================================================== */
/*  Coral pill — the single CTA styling reused at every depth         */
function Pill({
  href,
  children,
  variant = "primary",
  className,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "ghost" | "dark";
  className?: string;
  onClick?: () => void;
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
    <Link href={href} onClick={onClick} className={cx(base, className)} style={{ ...sans, ...styles[variant] }}>
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

  const choose = useCallback((i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const correct = HERO_Q.options[i].correct;
    const target = correct ? 5 : 2;
    if (prefersReduced()) {
      setMeter(target);
      return;
    }
    const start = performance.now();
    const from = 0;
    const dur = 1100;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setMeter(Math.round(from + (target - from) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [picked]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  const answered = picked !== null;
  const correct = answered && HERO_Q.options[picked!].correct;

  return (
    <div
      className="relative rounded-2xl p-5 sm:p-6"
      style={{
        ...sans,
        background: `linear-gradient(180deg, ${SURFACE2}, ${SURFACE})`,
        border: `1px solid ${LINE}`,
        boxShadow: "0 40px 90px -40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,229,190,0.06)",
      }}
    >
      {/* illuminated top edge */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-px h-24 rounded-t-2xl"
        style={{ background: "radial-gradient(60% 100% at 78% 0%, rgba(255,217,160,0.18), transparent 70%)" }}
      />
      <p className="relative text-[12.5px] font-medium uppercase tracking-[0.14em]" style={{ color: DIM }}>
        {HERO_Q.label}
      </p>
      <h3 className="relative mt-3 text-[19px] leading-snug sm:text-[21px]" style={{ ...serif, color: INK, fontWeight: 700 }}>
        {HERO_Q.question}
      </h3>
      <div className="relative mt-4 grid grid-cols-2 gap-2.5">
        {HERO_Q.options.map((o, i) => {
          const isPicked = picked === i;
          const showState = answered && (o.correct || isPicked);
          const good = o.correct;
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={answered}
              className="flex items-center justify-between gap-2 rounded-xl px-3.5 py-3 text-left text-[15px] transition-all duration-200"
              style={{
                background: showState
                  ? good
                    ? "rgba(120,190,140,0.16)"
                    : "rgba(255,112,81,0.14)"
                  : "rgba(246,237,225,0.045)",
                border: `1px solid ${
                  showState ? (good ? "rgba(120,190,140,0.5)" : "rgba(255,112,81,0.5)") : LINE
                }`,
                color: INK,
                cursor: answered ? "default" : "pointer",
              }}
            >
              <span style={{ fontWeight: 500 }}>{o.text}</span>
              {showState &&
                (good ? (
                  <Check className="size-4" style={{ color: "#8FD4A6" }} />
                ) : isPicked ? (
                  <X className="size-4" style={{ color: CORAL }} />
                ) : null)}
            </button>
          );
        })}
      </div>

      {/* mini readiness meter */}
      <div className="relative mt-5">
        <div className="flex items-baseline justify-between">
          <span className="text-[12.5px] uppercase tracking-[0.12em]" style={{ color: DIM }}>
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
              transition: prefersReduced() ? "none" : "width 120ms linear",
            }}
          />
        </div>
        <p className="mt-3 text-[14px] leading-relaxed" style={{ color: answered ? MUTED : DIM }}>
          {answered ? (correct ? HERO_Q.correctNote : HERO_Q.wrongNote) : HERO_Q.meterHint}
        </p>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Readiness dial — rises in view, then honestly DECAYS              */
function ReadinessDial() {
  // resting value so the ring is never blank before/without the reveal
  const [val, setVal] = useState(73);
  const wrapRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const reduced = prefersReduced();

    const run = () => {
      if (started.current) return;
      started.current = true;
      if (reduced) { setVal(74); return; }
      let raf = 0;
      const t0 = performance.now();
      const riseDur = 1400;
      const peak = 78;
      const base = 46;
      const animate = (now: number) => {
        const dt = now - t0;
        if (dt < riseDur) {
          const t = dt / riseDur;
          const eased = 1 - Math.pow(1 - t, 3);
          setVal(Math.round(base + (peak - base) * eased));
        } else {
          // honest decay: drift down slowly with a gentle wobble
          const after = (dt - riseDur) / 1000;
          const decayed = peak - Math.min(10, after * 1.15) + Math.sin(after * 0.9) * 0.6;
          setVal(Math.round(decayed));
        }
        raf = requestAnimationFrame(animate);
      };
      raf = requestAnimationFrame(animate);
      cleanup = () => cancelAnimationFrame(raf);
    };

    let cleanup = () => {};
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && run()),
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => { io.disconnect(); cleanup(); };
  }, []);

  const R = 78;
  const C = 2 * Math.PI * R;
  const dash = C * (val / 100);
  // warmer (coral) as readiness rises, cooler (amber) as it decays
  const hue = 20 + (val / 100) * 8;
  const stroke = `hsl(${hue}, 85%, ${52 + val * 0.06}%)`;

  return (
    <div
      ref={wrapRef}
      className="relative mx-auto w-full max-w-[360px] rounded-2xl p-6 sm:p-7"
      style={{
        ...sans,
        background: `linear-gradient(165deg, ${SURFACE2}, ${SURFACE})`,
        border: `1px solid ${LINE}`,
        boxShadow: "0 50px 100px -50px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,229,190,0.07)",
      }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl"
        style={{ background: "radial-gradient(70% 55% at 50% 0%, rgba(255,217,160,0.14), transparent 70%)" }}
      />
      <div className="relative flex items-center justify-between">
        <span className="text-[12.5px] uppercase tracking-[0.14em]" style={{ color: DIM }}>
          {DIAL.dialLabel}
        </span>
        <span className="text-[12.5px]" style={{ color: DIM }}>{DIAL.dialSub}</span>
      </div>
      <div className="relative mx-auto mt-4 grid aspect-square w-[210px] place-items-center">
        <svg viewBox="0 0 200 200" className="absolute inset-0 -rotate-90">
          <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(246,237,225,0.09)" strokeWidth="12" />
          <circle
            cx="100" cy="100" r={R} fill="none" stroke={stroke} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={`${dash} ${C}`}
            style={{ filter: `drop-shadow(0 0 10px hsla(${hue},85%,55%,0.5))` }}
          />
        </svg>
        <div className="text-center">
          <div className="tabular-nums text-[52px] leading-none" style={{ ...serif, color: INK, fontWeight: 800 }}>
            {val}<span className="text-[24px]" style={{ color: MUTED }}>%</span>
          </div>
          <div className="mt-1 text-[12.5px]" style={{ color: DIM }}>{DIAL.caption}</div>
        </div>
      </div>
      <p className="relative mt-3 text-center text-[13.5px] italic" style={{ color: MUTED }}>
        {DIAL.decayNote}
      </p>
    </div>
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
  const perDay = days ? Math.max(8, Math.ceil(PICKER.totalQuestions / days)) : null;
  const intensive = days !== null && days < 7;

  return (
    <div
      className="rounded-2xl p-6 sm:p-8"
      style={{
        ...sans,
        background: `linear-gradient(165deg, ${SURFACE2}, ${SURFACE})`,
        border: `1px solid ${LINE}`,
        boxShadow: "0 40px 90px -45px rgba(0,0,0,0.7)",
      }}
    >
      <label className="block text-[13px] uppercase tracking-[0.12em]" style={{ color: DIM }}>
        {PICKER.inputLabel}
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

      <div className="mt-5 min-h-[92px]">
        {days === null ? (
          <p className="text-[15px] leading-relaxed" style={{ color: MUTED }}>{PICKER.fallback}</p>
        ) : (
          <div>
            <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
              <div>
                <div className="tabular-nums text-[40px] leading-none" style={{ ...serif, color: INK, fontWeight: 800 }}>
                  {days}
                </div>
                <div className="mt-1 text-[13px]" style={{ color: DIM }}>{PICKER.daysWord}</div>
              </div>
              <div className="text-[26px] leading-none" style={{ color: DIM }}>×</div>
              <div>
                <div className="tabular-nums text-[40px] leading-none" style={{ ...serif, color: CORAL, fontWeight: 800 }}>
                  ≈{perDay}
                </div>
                <div className="mt-1 text-[13px]" style={{ color: DIM }}>{PICKER.perDayWord}</div>
              </div>
            </div>
            <p className="mt-4 text-[14.5px] leading-relaxed" style={{ color: intensive ? CORAL : MUTED }}>
              {intensive ? PICKER.intensive : PICKER.topics}
            </p>
          </div>
        )}
      </div>

      <div className="mt-6">
        <Pill href={PICKER.cta.href} variant="primary" className="w-full sm:w-auto">
          {PICKER.cta.label} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Pill>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  FAQ accordion                                                     */
function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mx-auto max-w-3xl divide-y" style={{ borderColor: LINE }}>
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
            <div
              className="grid transition-all duration-300 ease-out"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
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
export default function V13Page() {
  const heroRef = useRef<HTMLDivElement>(null);

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

  const launcherIcons = [Dumbbell, Timer, ClipboardList];

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
              <a key={l.href} href={l.href} className="text-[14.5px] transition-colors hover:text-[color:var(--h)]"
                style={{ color: MUTED, ["--h" as string]: INK } as CSSProperties}>
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
        <LampPool />
        <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-5 pb-24 pt-8 sm:px-8 sm:pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-x-14 lg:gap-y-8 lg:pb-32">
          <div className="order-1 lg:col-start-1 lg:row-start-1">
            <p data-hero-rise className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px]"
              style={{ background: "rgba(255,217,160,0.10)", color: MUTED, border: `1px solid ${LINE}` }}>
              <span className="size-1.5 rounded-full" style={{ background: CORAL }} />
              {HERO.eyebrow}
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
            <HeroQuestion />
          </div>

          <ul data-hero-rise className="order-3 flex flex-wrap gap-2.5 lg:col-start-1 lg:row-start-2">
            {HERO.chips.map((c) => (
              <li key={c} className="rounded-full px-3.5 py-1.5 text-[13px]"
                style={{ background: "rgba(246,237,225,0.05)", color: MUTED, border: `1px solid ${LINE}` }}>
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ================= DIAL DEMO ================= */}
      <LitSection id="dial" glow="tl">
        <div>
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-[clamp(5rem,12vw,9rem)] sm:px-8 lg:grid-cols-[1fr_0.85fr]">
            <div>
              <p className="text-[14px]" style={{ color: CORAL, fontWeight: 600 }}>{DIAL.caption}</p>
              <h2 className="mt-3 text-[clamp(2rem,4.4vw,3.1rem)] leading-[1.05] tracking-[-0.015em]" style={{ ...serif, color: INK, fontWeight: 800 }}>
                {DIAL.title}
              </h2>
              <p className="mt-5 max-w-xl text-[17px] leading-relaxed" style={{ color: MUTED }}>
                {DIAL.body}
              </p>
              <p className="mt-4 max-w-xl text-[16px] leading-relaxed" style={{ color: INK }}>
                {DIAL.moat}
              </p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px]"
                style={{ background: "rgba(255,217,160,0.09)", color: MUTED, border: `1px solid ${LINE}` }}>
                <Gauge className="size-4" style={{ color: CORAL }} />
                {DIAL.engine}
              </div>
            </div>
            <ReadinessDial />
          </div>
        </div>
      </LitSection>

      {/* ================= МЕХАНІЗМ 3-STEP ================= */}
      <LitSection id="mechanism" glow="c">
        <div className="mx-auto max-w-6xl px-5 py-[clamp(4rem,10vw,7rem)] sm:px-8">
          <div className="max-w-2xl">
            <h2 className="text-[clamp(1.9rem,4vw,2.8rem)] leading-[1.06] tracking-[-0.015em]" style={{ ...serif, color: INK, fontWeight: 800 }}>
              {MECHANISM.title}
            </h2>
            <p className="mt-4 text-[17px] leading-relaxed" style={{ color: MUTED }}>{MECHANISM.sub}</p>
          </div>
          <ol className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-3">
            {MECHANISM.steps.map((s, i) => {
              const Icon = [BookOpen, CalendarClock, Gauge][i];
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
      </LitSection>

      {/* ================= CALM INTERSTITIAL (fully dark) ================= */}
      <section className="relative">
        <div className="mx-auto flex min-h-[62vh] max-w-4xl flex-col items-center justify-center px-5 py-24 text-center sm:px-8">
          <h2 className="text-balance text-[clamp(2rem,5.4vw,3.6rem)] leading-[1.08] tracking-[-0.02em]" style={{ ...serif, color: INK, fontWeight: 800 }}>
            {CALM.line}
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed" style={{ color: MUTED }}>{CALM.sub}</p>
          <div className="mt-9">
            <Pill href={CALM.cta.href} variant="primary">
              {CALM.cta.label} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Pill>
          </div>
        </div>
      </section>

      {/* ================= DATE PICKER ================= */}
      <LitSection glow="tr">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-[clamp(4rem,10vw,7rem)] sm:px-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <h2 className="text-[clamp(1.9rem,4vw,2.8rem)] leading-[1.06] tracking-[-0.015em]" style={{ ...serif, color: INK, fontWeight: 800 }}>
              {PICKER.title}
            </h2>
            <p className="mt-4 max-w-md text-[17px] leading-relaxed" style={{ color: MUTED }}>{PICKER.sub}</p>
          </div>
          <DatePicker />
        </div>
      </LitSection>

      {/* ================= SIMULATOR ================= */}
      <LitSection glow="c">
        <div className="mx-auto max-w-6xl px-5 py-[clamp(4rem,10vw,7rem)] sm:px-8">
          <div className="max-w-2xl">
            <h2 className="text-[clamp(1.9rem,4vw,2.8rem)] leading-[1.06] tracking-[-0.015em]" style={{ ...serif, color: INK, fontWeight: 800 }}>
              {SIMULATOR.title}
            </h2>
            <p className="mt-4 text-[17px] leading-relaxed" style={{ color: MUTED }}>{SIMULATOR.sub}</p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {SIMULATOR.facts.map((f) => (
              <div key={f.label} className="rounded-2xl px-6 py-8 text-center"
                style={{ background: `linear-gradient(165deg, ${SURFACE2}, ${SURFACE})`, border: `1px solid ${LINE}` }}>
                <div className="tabular-nums text-[54px] leading-none" style={{ ...serif, color: INK, fontWeight: 800 }}>{f.big}</div>
                <div className="mt-2 text-[14.5px]" style={{ color: MUTED }}>{f.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {SIMULATOR.rules.map((r) => (
                <li key={r} className="flex items-center gap-2 text-[14.5px]" style={{ color: MUTED }}>
                  <Check className="size-4" style={{ color: CORAL }} /> {r}
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-6 max-w-3xl text-[16px] leading-relaxed" style={{ color: INK }}>{SIMULATOR.free}</p>
        </div>
      </LitSection>

      {/* ================= LOSS-FRAME BAND ================= */}
      <section className="relative" style={{ background: "#180F0A" }}>
        <div aria-hidden className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(60% 80% at 50% 120%, rgba(255,112,81,0.10), transparent 70%)" }} />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-7 px-5 py-[clamp(4.5rem,11vw,8rem)] text-center sm:px-8">
          <h2 className="text-balance text-[clamp(1.8rem,4.6vw,3rem)] leading-[1.1] tracking-[-0.015em]" style={{ ...serif, color: INK, fontWeight: 800 }}>
            {LOSS.line}
          </h2>
          <p className="max-w-xl text-[17px] leading-relaxed" style={{ color: MUTED }}>{LOSS.sub}</p>
          <Pill href={LOSS.cta.href} variant="primary">
            {LOSS.cta.label} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Pill>
        </div>
      </section>

      {/* ================= PRICING (brightest surface) ================= */}
      <LitSection id="pricing">
        <div className="mx-auto max-w-6xl px-5 py-[clamp(4.5rem,11vw,8rem)] sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-[clamp(2rem,4.4vw,3rem)] leading-[1.05] tracking-[-0.015em]" style={{ ...serif, color: INK, fontWeight: 800 }}>
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

                <p className="mt-5 text-[13.5px] leading-relaxed" style={{ color: CREAM_MUTED }}>{PRICING.anchor}</p>

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
      </LitSection>

      {/* ================= БАЗА / HONEST PROOF ================= */}
      <LitSection glow="tl">
        <div>
          <div className="mx-auto max-w-6xl px-5 py-[clamp(4rem,10vw,7rem)] sm:px-8">
            <div className="max-w-2xl">
              <h2 className="text-[clamp(1.9rem,4vw,2.8rem)] leading-[1.06] tracking-[-0.015em]" style={{ ...serif, color: INK, fontWeight: 800 }}>
                {BASE.title}
              </h2>
              <p className="mt-4 text-[17px] leading-relaxed" style={{ color: MUTED }}>{BASE.sub}</p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {BASE.facts.map((f) => (
                <div key={f.label} className="rounded-2xl px-6 py-7"
                  style={{ background: `linear-gradient(165deg, ${SURFACE2}, ${SURFACE})`, border: `1px solid ${LINE}` }}>
                  <div className="tabular-nums text-[42px] leading-none" style={{ ...serif, color: INK, fontWeight: 800 }}>{f.big}</div>
                  <div className="mt-2 text-[14.5px]" style={{ color: MUTED }}>{f.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
              <div className="flex flex-col gap-3">
                <span className="inline-flex w-fit items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px]"
                  style={{ background: "rgba(120,190,140,0.12)", color: "#8FD4A6", border: "1px solid rgba(120,190,140,0.3)" }}>
                  <span className="size-1.5 rounded-full" style={{ background: "#8FD4A6" }} /> {BASE.freshBadge}
                </span>
                <p className="text-[15.5px] leading-relaxed" style={{ color: MUTED }}>{BASE.freshNote}</p>
              </div>
              {/* reserved calibration slot — no claims until real data */}
              <div className="rounded-2xl border border-dashed p-6" style={{ borderColor: LINE }}>
                <h3 className="text-[16px]" style={{ ...serif, color: INK, fontWeight: 700 }}>{BASE.calibTitle}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed" style={{ color: DIM }}>{BASE.calibReserved}</p>
              </div>
            </div>
          </div>
        </div>
      </LitSection>

      {/* ================= FAQ ================= */}
      <LitSection id="faq" glow="c">
        <div className="mx-auto max-w-6xl px-5 py-[clamp(4rem,10vw,7rem)] sm:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-[clamp(1.9rem,4vw,2.8rem)] leading-[1.06] tracking-[-0.015em]" style={{ ...serif, color: INK, fontWeight: 800 }}>
              {FAQ.title}
            </h2>
            <p className="mt-4 text-[17px]" style={{ color: MUTED }}>{FAQ.sub}</p>
          </div>
          <div className="mt-10">
            <Faq />
          </div>
        </div>
      </LitSection>

      {/* ================= FINAL CTA + MODE LAUNCHER ================= */}
      <LitSection glow="tr">
        <div>
          <div className="mx-auto max-w-6xl px-5 py-[clamp(4.5rem,11vw,8rem)] sm:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-balance text-[clamp(2rem,5vw,3.4rem)] leading-[1.05] tracking-[-0.02em]" style={{ ...serif, color: INK, fontWeight: 800 }}>
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

            {/* mobile-first vertical mode launcher */}
            <div className="mx-auto mt-12 max-w-md">
              <p className="mb-3 text-center text-[13px] uppercase tracking-[0.12em]" style={{ color: DIM }}>{FINAL.launcherTitle}</p>
              <div className="flex flex-col gap-2.5">
                {FINAL.launcher.map((row, i) => {
                  const Icon = launcherIcons[i];
                  return (
                    <Link key={row.label} href={row.href}
                      className="group flex items-center gap-4 rounded-2xl px-5 py-4 transition-colors"
                      style={{ background: `linear-gradient(165deg, ${SURFACE2}, ${SURFACE})`, border: `1px solid ${LINE}` }}>
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
        </div>
      </LitSection>

      {/* ================= FOOTER ================= */}
      <footer className="relative overflow-hidden" style={{ background: "#160E09" }}>
        {/* ghosted wordmark catching the last light */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-[-4%] select-none text-center text-[clamp(4rem,18vw,13rem)] leading-none tracking-tight"
          style={{ ...serif, color: "rgba(246,237,225,0.035)", fontWeight: 900 }}>
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
                      {l.href === "#" ? (
                        <span className="text-[14.5px]" style={{ color: DIM }}>{l.label}</span>
                      ) : (
                        <Link href={l.href} className="text-[14.5px] transition-colors" style={{ color: MUTED }}>{l.label}</Link>
                      )}
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
