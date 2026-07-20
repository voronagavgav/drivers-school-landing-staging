"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Minus,
  Plus,
  GraduationCap,
  Timer,
  CalendarDays,
} from "lucide-react";
import { VytynankaSun, Frieze, CornerMotif, Rosette } from "./motifs";
import {
  HERO,
  DIAL,
  MECH,
  DATEPICK,
  SIM,
  LOSS,
  PRICING,
  PROOF,
  FAQ,
  LAUNCHER,
  FOOTER,
} from "./copy";

/* fonts (declared in layout.tsx via CSS vars) */
const display = "[font-family:var(--font-jost)]";
const serif = "[font-family:var(--font-ptserif)]";

/* palette */
const INK = "#1C1B17";
const ACCENT = "#F08C00";

/* ------------------------------------------------------------------ */
/* small shared pieces                                                 */
/* ------------------------------------------------------------------ */
function PrimaryCTA({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center justify-center gap-2 rounded-full bg-[#1C1B17] px-7 py-3.5 text-[15px] font-semibold text-[#FCFBF8] shadow-[2px_2px_0_0_rgba(28,27,23,0.18)] transition-all duration-300 hover:bg-[#F08C00] hover:text-[#1C1B17] hover:shadow-[3px_3px_0_0_rgba(240,140,0,0.35)] ${display} ${className}`}
    >
      {children}
      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
    </Link>
  );
}

function GhostCTA({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-[#1C1B17]/25 bg-transparent px-7 py-3.5 text-[15px] font-medium text-[#1C1B17] transition-all duration-300 hover:border-[#1C1B17] hover:bg-white ${display} ${className}`}
    >
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* HERO — live question + mini readiness meter                         */
/* ------------------------------------------------------------------ */
function HeroCard() {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = answered && HERO.question.options[picked].correct;
  const meter = !answered ? 0 : correct ? 34 : 12;

  return (
    <div id="hero-card" className="relative scroll-mt-24">
      {/* corner motifs */}
      <CornerMotif className="absolute -left-3 -top-3 z-10" size={38} />
      <CornerMotif className="absolute -right-3 -top-3 z-10 -scale-x-100" size={38} />
      <div className="lifted rounded-[18px] border border-[#1C1B17]/12 bg-white p-6 sm:p-7">
        <div className="mb-4 flex items-center justify-between">
          <span className={`text-[12px] uppercase tracking-[0.18em] text-[#1C1B17]/65 ${display}`}>
            Офіційне питання
          </span>
          <span className={`text-[12px] text-[#1C1B17]/65 ${serif}`}>{HERO.mechLabel}</span>
        </div>
        <p className={`text-[17px] leading-snug text-[#1C1B17] sm:text-[19px] ${display} font-medium`}>
          {HERO.question.prompt}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {HERO.question.options.map((o, i) => {
            const isPicked = picked === i;
            const showRight = answered && o.correct;
            const showWrong = isPicked && !o.correct;
            return (
              <button
                key={o.text}
                type="button"
                onClick={() => !answered && setPicked(i)}
                disabled={answered}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-[15px] transition-all duration-200 ${display} ${
                  showRight
                    ? "border-[#1C1B17] bg-[#1C1B17] text-[#FCFBF8]"
                    : showWrong
                      ? "border-[#F08C00] bg-[#F08C00]/12 text-[#1C1B17]"
                      : "border-[#1C1B17]/15 bg-[#FCFBF8] text-[#1C1B17] hover:border-[#1C1B17]/45"
                } ${answered && !showRight && !showWrong ? "opacity-45" : ""}`}
              >
                <span>{o.text}</span>
                {showRight && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>

        {/* mini readiness meter */}
        <div className="mt-5">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className={`text-[12px] uppercase tracking-[0.16em] text-[#1C1B17]/65 ${display}`}>
              {HERO.question.meterLabel}
            </span>
            <span className={`text-[15px] font-semibold tabular-nums ${display}`} style={{ color: answered ? ACCENT : INK }}>
              {meter}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#1C1B17]/8">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{ width: `${meter}%`, background: ACCENT }}
            />
          </div>
          <p className={`mt-2.5 min-h-[2.5em] text-[13.5px] leading-snug text-[#1C1B17]/70 ${serif}`}>
            {answered ? (correct ? HERO.question.correctNote : HERO.question.wrongNote) : "Немає реєстрації, немає мережі — просто обери відповідь."}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Readiness dial (SVG arc) — visibly decays in the demo               */
/* ------------------------------------------------------------------ */
function ReadinessDial() {
  const [val, setVal] = useState(74);
  const reduce = usePrefersReducedMotion();

  useEffect(() => {
    if (reduce) {
      setVal(71);
      return;
    }
    let raf = 0;
    let start = performance.now();
    const dur = 6000;
    const top = 74;
    const bottom = 66;
    const tick = (t: number) => {
      const p = ((t - start) % (dur + 1400)) / dur;
      if (p <= 1) {
        setVal(Math.round(top - (top - bottom) * easeOut(p)));
      } else {
        setVal(top); // "you studied" — jump back up, then decay again
        if (t - start > dur + 1400) start = t;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  const R = 86;
  const circ = 2 * Math.PI * R;
  const dash = (val / 100) * circ;

  return (
    <div className="relative mx-auto grid h-[300px] w-[300px] place-items-center">
      <Rosette size={300} className="absolute inset-0" />
      <svg viewBox="0 0 200 200" className="absolute inset-0 m-auto h-[300px] w-[300px]" aria-hidden="true">
        <circle cx="100" cy="100" r={R} fill="none" stroke={INK} strokeOpacity={0.1} strokeWidth={9} />
        <circle
          cx="100"
          cy="100"
          r={R}
          fill="none"
          stroke={ACCENT}
          strokeWidth={9}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          transform="rotate(-90 100 100)"
          style={{ transition: "stroke-dasharray 0.5s ease-out" }}
        />
      </svg>
      <div className="relative z-10 text-center">
        <div className={`text-[54px] font-bold leading-none tabular-nums text-[#1C1B17] ${display}`}>{val}</div>
        <div className={`mx-auto mt-1 max-w-[110px] text-[11px] uppercase leading-tight text-[#1C1B17]/65 ${display}`}>
          {DIAL.metricLabel}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Exam-date picker → shrinking plan preview                           */
/* ------------------------------------------------------------------ */
function DatePlan() {
  const [date, setDate] = useState("");
  const plan = useMemo(() => {
    if (!date) return null;
    const target = new Date(date + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.ceil((target.getTime() - today.getTime()) / 86400000);
    if (isNaN(days) || days <= 0) return null;
    // Preview is a realistic prep subset (cover the pool ~once), NOT all 2322/day —
    // interval repetition (FSRS) owns the rest. Display is capped so a near date
    // reads as a calm "інтенсив: 150+", never an absurd four-digit quota.
    const PREP_POOL = 900;
    const DAILY_CAP = 150;
    const raw = Math.ceil(PREP_POOL / days);
    const capped = raw > DAILY_CAP;
    const perDay = capped ? DAILY_CAP : raw;
    return { days, perDay, capped, intensive: days < 7 };
  }, [date]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="lifted mx-auto max-w-xl rounded-[18px] border border-[#1C1B17]/12 bg-white p-6 sm:p-8">
      <label className={`mb-2 block text-[13px] uppercase tracking-[0.16em] text-[#1C1B17]/65 ${display}`}>
        {DATEPICK.inputLabel}
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#1C1B17]/40" />
          <input
            type="date"
            min={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`w-full rounded-xl border border-[#1C1B17]/20 bg-[#FCFBF8] py-3.5 pl-11 pr-4 text-[15px] text-[#1C1B17] outline-none transition-colors focus:border-[#1C1B17] ${display}`}
          />
        </div>
        <PrimaryCTA href={DATEPICK.ctaHref} className="shrink-0">
          {DATEPICK.cta}
        </PrimaryCTA>
      </div>

      <div className="mt-5 border-t border-dashed border-[#1C1B17]/15 pt-5">
        {plan ? (
          <div>
            <span className={`text-[13px] text-[#1C1B17]/70 ${serif}`}>{DATEPICK.previewLead}</span>
            <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-2">
              <PlanStat value={plan.days} unit={DATEPICK.daysWord} />
              <span className="pb-1.5 text-[#1C1B17]/25">·</span>
              <PlanStat value={plan.capped ? `${plan.perDay}+` : plan.perDay} unit={DATEPICK.perDayWord} accent />
              {plan.intensive && (
                <span className={`mb-1 rounded-full bg-[#F08C00]/15 px-3 py-1 text-[12px] font-semibold uppercase tracking-wide text-[#8a5200] ${display}`}>
                  {DATEPICK.intensiveTag}
                </span>
              )}
            </div>
            <p className={`mt-3 text-[14px] leading-snug text-[#1C1B17]/70 ${serif}`}>
              {plan.capped ? DATEPICK.cappedNote : plan.intensive ? DATEPICK.intensiveNote : "План стискається під твою дату — що ближче іспит, то щільніший темп."}
            </p>
          </div>
        ) : (
          <p className={`text-[14px] italic leading-snug text-[#1C1B17]/70 ${serif}`}>{DATEPICK.fallback}</p>
        )}
      </div>
    </div>
  );
}

function PlanStat({ value, unit, accent }: { value: number | string; unit: string; accent?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className={`text-[34px] font-bold leading-none tabular-nums ${display}`} style={{ color: accent ? ACCENT : INK }}>
        {typeof value === "number" ? "≈" : ""}{value}
      </span>
      <span className={`text-[14px] text-[#1C1B17]/65 ${serif}`}>{unit}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ accordion                                                       */
/* ------------------------------------------------------------------ */
function FaqList() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mx-auto max-w-2xl divide-y divide-[#1C1B17]/12 border-y border-[#1C1B17]/12">
      {FAQ.items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={it.q}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 py-4 text-left"
              aria-expanded={isOpen}
            >
              <span className={`text-[16px] font-medium text-[#1C1B17] ${display}`}>{it.q}</span>
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#1C1B17]/20 text-[#1C1B17]">
                {isOpen ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              </span>
            </button>
            <div
              className="grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="min-h-0">
                <p className={`pb-5 pr-10 text-[15px] leading-relaxed text-[#1C1B17]/75 ${serif}`}>{it.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */
function easeOut(p: number) {
  return 1 - Math.pow(1 - p, 3);
}
function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(m.matches);
    const h = () => setReduce(m.matches);
    m.addEventListener("change", h);
    return () => m.removeEventListener("change", h);
  }, []);
  return reduce;
}

/* ================================================================== */
/* PAGE                                                                */
/* ================================================================== */
export default function V15Page() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.registerPlugin(ScrollTrigger);
      const ctx = gsap.context(() => {
        // hero entrance
        gsap.from(".hero-rise", {
          y: 26,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.09,
        });
        // hero sun scroll parallax rotation
        gsap.to("#hero-sun-spin", {
          rotation: 9,
          ease: "none",
          scrollTrigger: { trigger: ".hero-sec", start: "top top", end: "bottom top", scrub: 1 },
        });
        // frieze clip reveal (opens from centre outward) — default open if untriggered
        gsap.utils.toArray<HTMLElement>(".frieze-reveal").forEach((el) => {
          gsap.from(el, {
            clipPath: "inset(0 50% 0 50%)",
            duration: 1,
            ease: "power2.out",
            immediateRender: false,
            scrollTrigger: { trigger: el, start: "top 90%" },
          });
        });
        // section content rise — immediateRender:false keeps content visible if untriggered
        gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) => {
          gsap.from(el, {
            y: 30,
            opacity: 0,
            duration: 0.7,
            ease: "power3.out",
            immediateRender: false,
            scrollTrigger: { trigger: el, start: "top 88%" },
          });
        });
      }, root);
      return () => ctx.revert();
    });
    return () => mm.revert();
  }, []);

  return (
    <div ref={root} className={`min-h-screen bg-[#FCFBF8] text-[#1C1B17] ${serif}`}>
      {/* ---------------- NAV ---------------- */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <span className={`text-[18px] font-bold uppercase tracking-[0.12em] text-[#1C1B17] ${display}`}>
          Drivers School
        </span>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className={`hidden rounded-full px-4 py-2 text-[14px] font-medium text-[#1C1B17]/70 transition-colors hover:text-[#1C1B17] sm:inline-block ${display}`}
          >
            Увійти
          </Link>
          <PrimaryCTA href="/register" className="px-5 py-2.5 text-[14px]">
            {HERO.ctaPrimary}
          </PrimaryCTA>
        </div>
      </header>

      {/* ---------------- HERO ---------------- */}
      <section className="hero-sec relative overflow-hidden px-5 pb-6 pt-4 sm:px-8 sm:pt-10">
        {/* half-cropped sun: mobile pins to the top-right corner behind the headline;
            desktop shifts left so its half-crop composes with «виміряти.» and the card
            overlaps only its outer rays. */}
        <div className="pointer-events-none absolute -right-6 -top-6 z-0 opacity-90 sm:left-[5%] sm:right-auto sm:-top-24 md:-top-28">
          <VytynankaSun size={520} spinId="hero-sun-spin" className="sun-shadow h-auto w-[42vw] max-w-[420px] sm:w-[56vw]" />
        </div>

        <div className="relative z-[1] mx-auto max-w-6xl">
          <div className="grid items-center gap-4 sm:gap-7 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
            {/* left column */}
            <div>
              <p className={`hero-rise mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] sm:text-[15px] ${serif}`}>
                <span className="relative font-bold text-[#1C1B17]">
                  {HERO.hook.split("—")[0].trim()}
                  <span className="absolute -bottom-0.5 left-0 h-[3px] w-full" style={{ background: `${ACCENT}66` }} />
                </span>
                <span className="text-[#1C1B17]/70">— {HERO.hook.split("—")[1].trim()}</span>
              </p>

              <h1 className={`hero-rise text-balance text-[12.5vw] font-bold leading-[0.9] tracking-[-0.03em] text-[#1C1B17] sm:text-[64px] md:text-[80px] lg:text-[86px] ${display}`}>
                {HERO.headA[0]} {HERO.headA[1]}{" "}
                <span className="relative inline-block">
                  {HERO.headA[2]}
                </span>
              </h1>

              <p className={`hero-rise relative mt-3 max-w-md rounded-md bg-[#FCFBF8]/85 text-[16px] leading-relaxed text-[#1C1B17]/80 sm:mt-4 sm:bg-transparent sm:text-[18px] ${serif}`}>
                {HERO.sub}
              </p>

              <div className="hero-rise mt-4 flex flex-wrap gap-3 sm:mt-5">
                <PrimaryCTA href="/register">{HERO.ctaPrimary}</PrimaryCTA>
                <GhostCTA href="#hero-card">{HERO.ctaSecondary}</GhostCTA>
              </div>

              <ul className="hero-rise mt-4 hidden flex-wrap gap-x-5 gap-y-1.5 sm:flex">
                {HERO.chips.map((c) => (
                  <li key={c} className={`flex items-center gap-1.5 text-[13.5px] text-[#1C1B17]/65 ${display}`}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: ACCENT }} />
                    {c}
                  </li>
                ))}
              </ul>
            </div>

            {/* right column — live card kissing the fold */}
            <div className="hero-rise">
              <HeroCard />
              {/* chips ride below the card on mobile so the question mechanic reaches the first viewport */}
              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 sm:hidden">
                {HERO.chips.map((c) => (
                  <li key={c} className={`flex items-center gap-1.5 text-[13.5px] text-[#1C1B17]/70 ${display}`}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: ACCENT }} />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <Frieze variant="garland" className="frieze-reveal mt-10" height={30} />
      </section>

      {/* ---------------- DIAL DEMO ---------------- */}
      <section className="px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="reveal order-2 lg:order-1">
            <h2 className={`text-[30px] font-bold leading-[1.05] tracking-[-0.02em] text-[#1C1B17] sm:text-[38px] ${display}`}>
              {DIAL.title}
            </h2>
            <p className={`mt-4 text-[20px] font-bold text-[#1C1B17] ${display}`}>{DIAL.caption}</p>
            <p className={`mt-3 max-w-md text-[16px] leading-relaxed text-[#1C1B17]/75 ${serif}`}>{DIAL.body}</p>
            <p className={`mt-4 max-w-md border-l-0 text-[15px] italic leading-relaxed text-[#8a6a2e] ${serif}`}>
              {DIAL.decayNote}
            </p>
            <p className={`mt-5 max-w-md text-[15px] leading-relaxed text-[#1C1B17]/85 ${serif}`}>{DIAL.moat}</p>
          </div>
          <div className="reveal order-1 flex justify-center lg:order-2">
            <div className="lifted-lg rounded-[22px] border border-[#1C1B17]/12 bg-white px-8 py-10">
              <ReadinessDial />
              <p className={`mt-5 text-center text-[13px] text-[#1C1B17]/65 ${serif}`}>
                демо · число рухається як у застосунку
              </p>
            </div>
          </div>
        </div>
      </section>

      <Frieze variant="diamond" className="frieze-reveal mx-auto max-w-6xl px-5" height={30} />

      {/* ---------------- MECHANISM 01–03 ---------------- */}
      <section id="mechanism" className="px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="reveal max-w-2xl">
            <h2 className={`text-[30px] font-bold leading-[1.05] tracking-[-0.02em] text-[#1C1B17] sm:text-[40px] ${display}`}>
              {MECH.title}
            </h2>
            <p className={`mt-4 text-[16px] leading-relaxed text-[#1C1B17]/75 ${serif}`}>{MECH.sub}</p>
          </div>
          <div className="reveal mt-10 grid gap-8 sm:grid-cols-3">
            {MECH.steps.map((s) => (
              <div key={s.n} className="relative">
                <div className={`text-[13px] font-semibold tabular-nums text-[#1C1B17]/65 ${display}`}>{s.n}</div>
                <div className="mt-2 h-px w-full bg-[#1C1B17]/15" />
                <h3 className={`mt-4 text-[21px] font-bold text-[#1C1B17] ${display}`}>{s.title}</h3>
                <p className={`mt-2 text-[15px] leading-relaxed text-[#1C1B17]/75 ${serif}`}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Frieze variant="wheat" className="frieze-reveal mx-auto max-w-6xl px-5" height={30} />

      {/* ---------------- DATE PICKER ---------------- */}
      <section className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="reveal mx-auto mb-8 max-w-xl text-center">
            <h2 className={`text-[30px] font-bold leading-[1.05] tracking-[-0.02em] text-[#1C1B17] sm:text-[38px] ${display}`}>
              {DATEPICK.title}
            </h2>
            <p className={`mt-3 text-[16px] leading-relaxed text-[#1C1B17]/75 ${serif}`}>{DATEPICK.sub}</p>
          </div>
          <div className="reveal">
            <DatePlan />
          </div>
        </div>
      </section>

      <Frieze variant="leaf" className="frieze-reveal mx-auto max-w-6xl px-5" height={30} />

      {/* ---------------- SIMULATOR ---------------- */}
      <section className="px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="reveal max-w-2xl">
            <h2 className={`text-[30px] font-bold leading-[1.05] tracking-[-0.02em] text-[#1C1B17] sm:text-[40px] ${display}`}>
              {SIM.title}
            </h2>
            <p className={`mt-4 text-[16px] leading-relaxed text-[#1C1B17]/75 ${serif}`}>{SIM.sub}</p>
          </div>
          <div className="reveal mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {SIM.chips.map((c) => (
              <div key={c.small} className="lifted rounded-2xl border border-[#1C1B17]/12 bg-white px-5 py-6 text-center">
                <div className={`text-[42px] font-bold leading-none text-[#1C1B17] ${display}`}>{c.big}</div>
                <div className={`mt-2 text-[13px] uppercase tracking-[0.1em] text-[#1C1B17]/65 ${display}`}>{c.small}</div>
              </div>
            ))}
          </div>
          <div className="reveal mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className={`inline-flex items-center gap-2 text-[16px] font-semibold text-[#1C1B17] ${display}`}>
              <Timer className="h-4 w-4" style={{ color: ACCENT }} />
              {SIM.free}
            </p>
          </div>
          <p className={`reveal mt-4 text-[14px] leading-relaxed text-[#1C1B17]/70 ${serif}`}>
            <span className="font-bold text-[#1C1B17]/80">{SIM.topicsLead}</span> {SIM.topics}
          </p>
        </div>
      </section>

      {/* ---------------- LOSS INTERSTITIAL (ink band) ---------------- */}
      <section className="relative overflow-hidden bg-[#1C1B17] px-5 py-20 text-[#FCFBF8] sm:px-8 sm:py-28">
        {/* inverted white-on-ink cutwork */}
        <div className="pointer-events-none absolute -left-20 top-1/2 hidden -translate-y-1/2 opacity-[0.14] md:block">
          <VytynankaSun size={360} ink="#FCFBF8" core="#F08C00" />
        </div>
        <div className="pointer-events-none absolute -right-20 top-1/2 hidden -translate-y-1/2 opacity-[0.14] md:block">
          <VytynankaSun size={360} ink="#FCFBF8" core="#F08C00" />
        </div>
        <div className="reveal relative mx-auto max-w-2xl text-center">
          <Frieze variant="bird" ink="#FCFBF8" className="mx-auto mb-8 max-w-xs opacity-70" height={26} />
          <p className={`text-[40px] font-bold leading-[1.05] tracking-[-0.02em] sm:text-[56px] ${display}`}>
            {LOSS.big}
          </p>
          <p className={`mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-[#FCFBF8]/75 ${serif}`}>{LOSS.sub}</p>
          <div className="mt-8">
            <Link
              href={LOSS.ctaHref}
              className={`group inline-flex items-center justify-center gap-2 rounded-full bg-[#FCFBF8] px-7 py-3.5 text-[15px] font-semibold text-[#1C1B17] transition-all duration-300 hover:bg-[#F08C00] ${display}`}
            >
              {LOSS.cta}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------- PRICING ---------------- */}
      <section id="pricing" className="px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="reveal mx-auto mb-10 max-w-xl text-center">
            <h2 className={`text-[32px] font-bold leading-[1.05] tracking-[-0.02em] text-[#1C1B17] sm:text-[44px] ${display}`}>
              {PRICING.title}
            </h2>
            <p className={`mt-3 text-[16px] italic text-[#8a6a2e] ${serif}`}>{PRICING.anchor}</p>
          </div>

          <div className="reveal">
            <div className="lifted-lg relative overflow-hidden rounded-[24px] border border-[#1C1B17]/12 bg-white">
              {/* price header */}
              <div className="flex flex-col items-center gap-2 border-b border-dashed border-[#1C1B17]/15 px-6 py-8 text-center">
                <div className="flex items-baseline gap-1">
                  <span className={`text-[64px] font-bold leading-none text-[#1C1B17] ${display}`}>{PRICING.price}</span>
                  <span className={`text-[28px] font-bold text-[#1C1B17] ${display}`}>{PRICING.currency}</span>
                </div>
                <p className={`text-[14px] text-[#1C1B17]/70 ${serif}`}>{PRICING.priceNote}</p>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {PRICING.negations.map((n) => (
                    <span key={n} className={`rounded-full border border-[#1C1B17]/20 px-3 py-1 text-[12px] font-medium text-[#1C1B17]/70 ${display}`}>
                      {n}
                    </span>
                  ))}
                </div>
              </div>

              {/* two columns: free first + longer */}
              <div className="grid gap-px bg-[#1C1B17]/10 sm:grid-cols-2">
                <div className="bg-white p-6 sm:p-8">
                  <h3 className={`text-[15px] font-bold uppercase tracking-[0.1em] text-[#1C1B17] ${display}`}>{PRICING.freeTitle}</h3>
                  <ul className="mt-4 space-y-3">
                    {PRICING.free.map((f) => (
                      <li key={f} className={`flex items-start gap-2.5 text-[15px] text-[#1C1B17]/85 ${serif}`}>
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1C1B17]" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-[#FCFBF8] p-6 sm:p-8">
                  <h3 className={`text-[15px] font-bold uppercase tracking-[0.1em] ${display}`} style={{ color: "#8a5200" }}>
                    {PRICING.paidTitle}
                  </h3>
                  <ul className="mt-4 space-y-3">
                    {PRICING.paid.map((p) => (
                      <li key={p} className={`flex items-start gap-2.5 text-[15px] text-[#1C1B17]/85 ${serif}`}>
                        <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ACCENT }} />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* failsafe + cta */}
              <div className="flex flex-col items-center gap-4 border-t border-dashed border-[#1C1B17]/15 px-6 py-7 text-center">
                <p className={`max-w-lg text-[14px] leading-relaxed text-[#1C1B17]/70 ${serif}`}>{PRICING.failsafe}</p>
                <PrimaryCTA href={PRICING.ctaHref}>{PRICING.cta}</PrimaryCTA>
              </div>
            </div>

            {/* trust band */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {PRICING.trustBand.map((t) => (
                <span key={t} className={`flex items-center gap-1.5 text-[13.5px] text-[#1C1B17]/70 ${display}`}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: ACCENT }} />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Frieze variant="tree" className="frieze-reveal mx-auto max-w-6xl px-5" height={30} />

      {/* ---------------- HONEST PROOF / БАЗА ---------------- */}
      <section className="px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="reveal">
            <h2 className={`text-[28px] font-bold leading-[1.1] tracking-[-0.02em] text-[#1C1B17] sm:text-[34px] ${display}`}>
              {PROOF.headline}
            </h2>
            <span className={`mt-4 inline-flex items-center gap-2 rounded-full border border-[#1C1B17]/15 bg-white px-4 py-1.5 text-[13px] font-medium text-[#1C1B17]/75 ${display}`}>
              <span className="h-2 w-2 rounded-full" style={{ background: ACCENT }} />
              {PROOF.freshBadge}
            </span>
            <p className={`mx-auto mt-5 max-w-xl text-[14px] leading-relaxed text-[#1C1B17]/70 ${serif}`}>{PROOF.note}</p>
          </div>

          {/* reserved calibration slot — designed now, no claim yet */}
          <div className="reveal mx-auto mt-10 max-w-lg rounded-2xl border border-dashed border-[#1C1B17]/25 bg-white/50 px-6 py-6">
            <div className={`text-[13px] uppercase tracking-[0.14em] text-[#1C1B17]/65 ${display}`}>{PROOF.reservedTitle}</div>
            <p className={`mt-2 text-[14px] italic leading-relaxed text-[#1C1B17]/70 ${serif}`}>{PROOF.reserved}</p>
          </div>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section id="faq" className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-2xl">
          <div className="reveal mb-8 text-center">
            <h2 className={`text-[30px] font-bold tracking-[-0.02em] text-[#1C1B17] sm:text-[38px] ${display}`}>{FAQ.title}</h2>
          </div>
          <div className="reveal">
            <FaqList />
          </div>
        </div>
      </section>

      {/* ---------------- FINAL CTA + MODE LAUNCHER ---------------- */}
      <section className="px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="reveal">
            <h2 className={`text-[32px] font-bold leading-[1.05] tracking-[-0.02em] text-[#1C1B17] sm:text-[42px] ${display}`}>
              {LAUNCHER.title}
            </h2>
          </div>
          <div className="reveal mx-auto mt-8 flex max-w-md flex-col gap-3">
            {LAUNCHER.rows.map((r) => (
              <Link
                key={r.label}
                href={r.href}
                className="lifted group flex items-center justify-between gap-4 rounded-2xl border border-[#1C1B17]/12 bg-white px-5 py-4 text-left transition-all duration-200 hover:border-[#1C1B17]/40"
              >
                <span className="flex items-center gap-3">
                  <GraduationCap className="h-5 w-5 text-[#1C1B17]/50" />
                  <span>
                    <span className={`block text-[16px] font-semibold text-[#1C1B17] ${display}`}>{r.label}</span>
                    <span className={`block text-[13px] text-[#1C1B17]/70 ${serif}`}>{r.note}</span>
                  </span>
                </span>
                <ArrowUpRight className="h-5 w-5 shrink-0 text-[#1C1B17]/40 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
          <div className="reveal mt-8">
            <PrimaryCTA href={LAUNCHER.ctaHref}>{LAUNCHER.cta}</PrimaryCTA>
          </div>
        </div>
      </section>

      {/* ---------------- FOOTER (ink ground + closing rosette) ---------------- */}
      <footer className="relative overflow-hidden bg-[#1C1B17] px-5 pb-10 pt-16 text-[#FCFBF8] sm:px-8">
        {/* closing rosette with ghosted wordmark */}
        <div className="relative mx-auto mb-14 flex max-w-6xl justify-center">
          <div className="relative grid place-items-center">
            <VytynankaSun size={300} ink="#FCFBF8" core="#F08C00" className="opacity-25" />
            <span className={`absolute text-[20px] font-bold uppercase tracking-[0.1em] text-[#FCFBF8] ${display}`}>
              Drivers School
            </span>
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <div className={`text-[16px] font-bold uppercase tracking-[0.12em] ${display}`}>{FOOTER.wordmark}</div>
            <p className={`mt-3 max-w-[22ch] text-[14px] leading-relaxed text-[#FCFBF8]/60 ${serif}`}>{FOOTER.tagline}</p>
          </div>
          {FOOTER.columns.map((col) => (
            <div key={col.title}>
              <div className={`text-[13px] font-semibold uppercase tracking-[0.14em] text-[#FCFBF8]/60 ${display}`}>{col.title}</div>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className={`text-[14px] text-[#FCFBF8]/80 transition-colors hover:text-[#F08C00] ${serif}`}>
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-12 max-w-6xl border-t border-[#FCFBF8]/12 pt-6">
          <p className={`text-[12px] leading-relaxed text-[#FCFBF8]/65 ${serif}`}>{FOOTER.disclaimer}</p>
          <p className={`mt-4 text-[12px] text-[#FCFBF8]/60 ${display}`}>{FOOTER.copyright}</p>
        </div>
      </footer>

      {/* lifted-paper shadows + reduced motion */}
      <style>{`
        .lifted { box-shadow: 3px 3px 0 0 rgba(28,27,23,0.06), 0 1px 2px rgba(28,27,23,0.04); transition: box-shadow .3s ease, transform .3s ease; }
        .lifted:hover { box-shadow: 5px 5px 0 0 rgba(28,27,23,0.09), 0 2px 4px rgba(28,27,23,0.05); }
        .lifted-lg { box-shadow: 5px 5px 0 0 rgba(28,27,23,0.07), 0 2px 6px rgba(28,27,23,0.05); }
        .sun-shadow { filter: drop-shadow(1px 1px 0 rgba(28,27,23,0.10)); }
        @media (prefers-reduced-motion: reduce) {
          .lifted, .lifted:hover, .lifted-lg { transition: none; }
        }
      `}</style>
    </div>
  );
}
