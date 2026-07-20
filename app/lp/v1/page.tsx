"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Inter, Inter_Tight } from "next/font/google";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  ArrowDown,
  Check,
  Minus,
  Plus,
  Gauge as GaugeIcon,
  CalendarClock,
  TimerReset,
  ShieldCheck,
  Repeat,
  Wallet,
  Dumbbell,
  ClipboardCheck,
  Route,
} from "lucide-react";
import { copy, HERO_VARIANTS, ACTIVE_HERO } from "./copy";

/* ── Fonts (declared locally, cyrillic verified) ──────────────────── */
const display = Inter_Tight({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["600", "700"],
  variable: "--v1-display",
  display: "swap",
});
const body = Inter({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500"],
  variable: "--v1-body",
  display: "swap",
});

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const H = HERO_VARIANTS[ACTIVE_HERO];

/* ── Gauge geometry ───────────────────────────────────────────────── */
const GW = 300;
const GH = 190;
const CX = 150;
const CY = 170;
const R = 132;

// Round to 3 decimals so server (Node) and client (browser V8) serialize identical
// trig output — raw Math.cos/sin differ in the last float digit and cause a
// hydration mismatch on the SVG coordinate attributes.
const rnd = (n: number) => Math.round(n * 1000) / 1000;
function polar(r: number, frac: number) {
  const a = Math.PI * (1 - Math.min(1, Math.max(0, frac)));
  return { x: rnd(CX + r * Math.cos(a)), y: rnd(CY - r * Math.sin(a)) };
}

const ARC_D = (() => {
  const s = polar(R, 0);
  const e = polar(R, 1);
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 0 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
})();

function Gauge({
  value,
  ariaLabel,
}: {
  value: number;
  ariaLabel: string;
}) {
  const v = Math.min(100, Math.max(0, value));
  const frac = v / 100;
  const tip = polar(R * 0.8, frac);
  const majors = [0, 20, 40, 60, 80, 100];
  const minors = Array.from({ length: 21 }, (_, i) => i * 5).filter(
    (n) => n % 20 !== 0,
  );

  return (
    <svg
      viewBox={`0 0 ${GW} ${GH}`}
      className="w-full"
      role="img"
      aria-label={`${ariaLabel}: ${Math.round(v)}%`}
    >
      {/* base arc */}
      <path d={ARC_D} fill="none" stroke="var(--v1-line)" strokeWidth={2} />
      {/* value arc */}
      <path
        d={ARC_D}
        fill="none"
        stroke="var(--v1-primary)"
        strokeWidth={4}
        strokeLinecap="round"
        pathLength={100}
        style={{ strokeDasharray: `${v} 100` }}
      />
      {/* minor ticks */}
      {minors.map((n) => {
        const a = polar(R - 3, n / 100);
        const b = polar(R - 10, n / 100);
        return (
          <line
            key={`mi-${n}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="var(--v1-tick)"
            strokeWidth={1}
          />
        );
      })}
      {/* major ticks + numbers */}
      {majors.map((n) => {
        const a = polar(R - 2, n / 100);
        const b = polar(R - 15, n / 100);
        const t = polar(R - 30, n / 100);
        return (
          <g key={`ma-${n}`}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="var(--v1-ink)"
              strokeWidth={1.6}
            />
            <text
              x={t.x}
              y={t.y + 4}
              textAnchor="middle"
              className="v1-tnum"
              fontSize={11}
              fill="var(--v1-muted)"
            >
              {n}
            </text>
          </g>
        );
      })}
      {/* needle */}
      <line
        x1={CX}
        y1={CY}
        x2={tip.x}
        y2={tip.y}
        stroke="var(--v1-primary)"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <circle cx={CX} cy={CY} r={7} fill="var(--v1-surface)" stroke="var(--v1-primary)" strokeWidth={2.5} />
      <circle cx={CX} cy={CY} r={2} fill="var(--v1-primary)" />
    </svg>
  );
}

/* ── In-view once hook ────────────────────────────────────────────── */
function useInViewOnce<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, seen };
}

function CountUp({ end, className }: { end: number; className?: string }) {
  const { ref, seen } = useInViewOnce<HTMLSpanElement>();
  // Default to the final value so the number is ALWAYS visible (no-JS, headless,
  // or never-scrolled-into-view). Only replay from 0 when motion is welcome.
  const [n, setN] = useState(end);
  useEffect(() => {
    if (!seen) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setN(end);
      return;
    }
    const dur = 900;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 4);
      setN(Math.round(end * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [seen, end]);
  return (
    <span ref={ref} className={`v1-tnum ${className ?? ""}`}>
      {String(n)}
    </span>
  );
}

/* ── Section header ───────────────────────────────────────────────── */
function SectionHead({
  index,
  kicker,
  title,
  lead,
  icon,
}: {
  index: string;
  kicker: string;
  title: string;
  lead: string;
  icon: React.ReactNode;
}) {
  return (
    <header className="max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="v1-tnum text-sm font-semibold tracking-tight text-[var(--v1-primary)]">
          {index}
        </span>
        <span className="h-3 w-px bg-[var(--v1-line)]" />
        <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-[var(--v1-muted)]">
          <span className="text-[var(--v1-primary)]">{icon}</span>
          {kicker}
        </span>
      </div>
      <h2 className="v1-display text-balance text-[clamp(1.7rem,4vw,2.6rem)] leading-[1.06] text-[var(--v1-ink)]">
        {title}
      </h2>
      <p className="mt-4 max-w-xl text-pretty text-[0.98rem] leading-relaxed text-[var(--v1-muted)]">
        {lead}
      </p>
    </header>
  );
}

function FaqRow({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[var(--v1-line)]">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="v1-display text-[1.02rem] font-semibold text-[var(--v1-ink)]">
          {q}
        </span>
        <span className="grid size-7 shrink-0 place-items-center rounded-full border border-[var(--v1-line)] text-[var(--v1-primary)]">
          {open ? <Minus size={15} /> : <Plus size={15} />}
        </span>
      </button>
      <div
        className="grid transition-all duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <p className="max-w-xl pb-5 text-[0.95rem] leading-relaxed text-[var(--v1-muted)]">
            {a}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */
export default function Page() {
  const root = useRef<HTMLDivElement>(null);

  /* Entrance + scroll motion. NOTE: the two gauge tweens (hero needle + decay
     scrub) deliberately do NOT live here — they own local state inside
     <HeroInstrument> / <DecayGauge> so a scrubbing needle never re-renders the
     whole page tree (both SVG gauges + every section). Root only runs the
     opacity/transform entrance reveals, which fire once and hold no per-frame state. */
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        // hero column reveal
        gsap.from("[data-rise]", {
          y: 14,
          opacity: 0,
          duration: 0.6,
          ease: "power3.out",
          stagger: 0.06,
          delay: 0.1,
        });
        // hairline rules draw on scroll. immediateRender:false keeps the line at its
        // natural (visible) state until the trigger fires — never hides below-fold content.
        gsap.utils.toArray<HTMLElement>("[data-rule]").forEach((el) => {
          gsap.fromTo(
            el,
            { scaleX: 0 },
            {
              scaleX: 1,
              duration: 0.5,
              ease: "power2.out",
              transformOrigin: "left center",
              immediateRender: false,
              scrollTrigger: { trigger: el, start: "top 92%", once: true },
            },
          );
        });
        // stat chips / cards stagger — fromTo + immediateRender:false so cells stay
        // visible if their section is never scrolled into view (screenshots, no-JS).
        gsap.utils.toArray<HTMLElement>("[data-stagger]").forEach((grp) => {
          gsap.fromTo(
            grp.querySelectorAll("[data-cell]"),
            { y: 12, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.5,
              ease: "power2.out",
              stagger: 0.04,
              immediateRender: false,
              scrollTrigger: { trigger: grp, start: "top 88%", once: true },
            },
          );
        });
      }, root);
      return () => ctx.revert();
    });
    return () => mm.revert();
  }, []);

  return (
    <div
      ref={root}
      className={`${display.variable} ${body.variable} v1-scope min-h-full`}
    >
      <style>{v1css}</style>

      {/* ── Top bar ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-[var(--v1-line)] bg-[color-mix(in_srgb,var(--v1-bg)_86%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <a href="#top" className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-[5px] border border-[var(--v1-primary)] text-[var(--v1-primary)]">
              <GaugeIcon size={14} />
            </span>
            <span className="v1-display text-[0.95rem] font-semibold text-[var(--v1-ink)]">
              {copy.brand}
            </span>
          </a>
          <nav className="hidden items-center gap-7 text-sm text-[var(--v1-muted)] md:flex">
            <a href="#dial" className="hover:text-[var(--v1-ink)]">{copy.nav.dial}</a>
            <a href="#plan" className="hover:text-[var(--v1-ink)]">{copy.nav.plan}</a>
            <a href="#price" className="hover:text-[var(--v1-ink)]">{copy.nav.price}</a>
            <a href="#faq" className="hover:text-[var(--v1-ink)]">{copy.nav.faq}</a>
          </nav>
          <div className="flex items-center gap-2">
            <a
              href="/login"
              className="hidden text-sm text-[var(--v1-muted)] hover:text-[var(--v1-ink)] sm:inline"
            >
              {copy.nav.login}
            </a>
            <a href="/register" className="v1-btn-amber text-sm">
              {copy.nav.ctaShort}
            </a>
          </div>
        </div>
      </header>

      {/* ── Instrument strip: 1 of 5 ─────────────────────────── */}
      <div id="top" className="border-b border-[var(--v1-line)] bg-[var(--v1-surface)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-5 py-2.5">
          <div className="flex items-center gap-1.5" aria-hidden>
            {Array.from({ length: copy.strip.figures }).map((_, i) => (
              <TickFigure key={i} filled={i < copy.strip.filled} />
            ))}
          </div>
          <p className="text-[0.82rem] text-[var(--v1-ink)]">
            <span className="font-semibold">{copy.strip.label}</span>
            <span className="ml-2 text-[var(--v1-muted)]">— {copy.strip.sub}</span>
          </p>
        </div>
      </div>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="v1-grid relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-x-12 gap-y-8 px-5 py-9 lg:grid-cols-[1.05fr_1fr] lg:gap-y-10 lg:py-20">
          {/* left */}
          <div>
            <h1
              data-rise
              className="v1-display text-[clamp(2.05rem,7vw,4.6rem)] leading-[0.98] tracking-[-0.035em] text-[var(--v1-ink)]"
            >
              {H.headlineTop}
              <br />
              <span className="text-[var(--v1-primary)]">{H.headlineBottom}</span>
            </h1>
            <p
              data-rise
              className="mt-6 max-w-md text-pretty text-[1.05rem] leading-relaxed text-[var(--v1-muted)]"
            >
              {H.subhead}
            </p>

            <div data-rise className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a href="/register" className="v1-btn-amber v1-btn-lg justify-center">
                {copy.hero.ctaPrimary}
                <ArrowRight size={17} />
              </a>
              {/* No /login: the real no-signup mechanic is the live question card
                  below — scroll to it instead of a credentials wall. */}
              <a href="#hero-question" className="v1-btn-ghost justify-center">
                {copy.hero.ctaSecondary}
                <ArrowDown size={16} />
              </a>
            </div>

            {/* proof chips */}
            <div
              data-rise
              data-stagger
              className="mt-9 grid grid-cols-3 gap-0 overflow-hidden rounded-lg border border-[var(--v1-line)] bg-[var(--v1-surface)]"
            >
              {copy.hero.chips.map((c, i) => (
                <div
                  key={c.unit}
                  data-cell
                  className={`px-3 py-3.5 ${i > 0 ? "border-l border-[var(--v1-line)]" : ""}`}
                >
                  <div className="v1-tnum v1-display text-[1.05rem] font-semibold leading-none text-[var(--v1-ink)]">
                    {c.value}
                  </div>
                  <div className="mt-1.5 text-[0.68rem] leading-tight text-[var(--v1-muted)]">
                    {c.unit}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* right — gauge + live question (isolated: owns its own per-frame state) */}
          <HeroInstrument />
        </div>
      </section>

      {/* ── 01 DIAL DEMO ─────────────────────────────────────── */}
      <section id="dial" className="border-t border-[var(--v1-line)]">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
          <span data-rule className="mb-10 block h-px w-full origin-left bg-[var(--v1-line)]" />
          <div className="grid gap-x-14 gap-y-12 lg:grid-cols-[1fr_1.05fr] lg:items-center">
            <SectionHead
              index={copy.dial.index}
              kicker={copy.dial.kicker}
              title={copy.dial.title}
              lead={copy.dial.lead}
              icon={<GaugeIcon size={14} />}
            />
            <DecayGauge />
          </div>

          {/* moat block */}
          <div className="mt-14 grid gap-x-14 gap-y-8 border-t border-[var(--v1-line)] pt-12 lg:grid-cols-[1fr_1.05fr]">
            <h3 className="v1-display text-[clamp(1.3rem,2.6vw,1.8rem)] leading-tight text-[var(--v1-ink)]">
              {copy.dial.moatTitle}
            </h3>
            <div>
              <p className="max-w-xl text-[0.98rem] leading-relaxed text-[var(--v1-muted)]">
                {copy.dial.moatBody}
              </p>
              <ul data-stagger className="mt-6 flex flex-col gap-3">
                {copy.dial.points.map((p) => (
                  <li
                    key={p}
                    data-cell
                    className="flex items-start gap-2.5 text-[0.92rem] text-[var(--v1-ink)]"
                  >
                    <span className="mt-0.5 text-[var(--v1-primary)]">
                      <Check size={16} strokeWidth={2.4} />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 02 PLAN / date picker ────────────────────────────── */}
      <section id="plan" className="border-t border-[var(--v1-line)] bg-[var(--v1-surface)]">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
          <span data-rule className="mb-10 block h-px w-full origin-left bg-[var(--v1-line)]" />
          <SectionHead
            index={copy.plan.index}
            kicker={copy.plan.kicker}
            title={copy.plan.title}
            lead={copy.plan.lead}
            icon={<CalendarClock size={14} />}
          />
          <div className="mt-10 grid gap-x-14 gap-y-10 lg:grid-cols-[1fr_1fr]">
            <PlanPicker />
            <div className="v1-panel">
              <h4 className="v1-display text-[0.95rem] font-semibold text-[var(--v1-ink)]">
                {copy.plan.topicsTitle}
              </h4>
              <ol data-stagger className="mt-4 flex flex-col">
                {copy.plan.topics.map((t, i) => (
                  <li
                    key={t}
                    data-cell
                    className="flex items-center gap-3 border-b border-[var(--v1-line)] py-3 last:border-0"
                  >
                    <span className="v1-tnum w-5 text-[0.8rem] font-semibold text-[var(--v1-primary)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[0.9rem] text-[var(--v1-ink)]">{t}</span>
                    <Route size={14} className="ml-auto text-[var(--v1-muted)]" />
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* ── 03 SIMULATOR ─────────────────────────────────────── */}
      <section id="sim" className="border-t border-[var(--v1-line)]">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
          <span data-rule className="mb-10 block h-px w-full origin-left bg-[var(--v1-line)]" />
          <SectionHead
            index={copy.sim.index}
            kicker={copy.sim.kicker}
            title={copy.sim.title}
            lead={copy.sim.lead}
            icon={<TimerReset size={14} />}
          />
          <div
            data-stagger
            className="mt-10 grid gap-4 sm:grid-cols-3"
          >
            {copy.sim.specs.map((s) => (
              <div
                key={s.label}
                data-cell
                className="v1-graph rounded-lg border border-[var(--v1-line)] bg-[var(--v1-surface)] p-6"
              >
                <div className="v1-tnum v1-display text-[3rem] font-bold leading-none text-[var(--v1-ink)]">
                  {s.n}
                </div>
                <div className="mt-2 text-[0.85rem] text-[var(--v1-muted)]">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-3 rounded-lg border border-[var(--v1-line)] bg-[var(--v1-surface)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="v1-tnum text-[0.85rem] text-[var(--v1-ink)]">{copy.sim.rule}</p>
            <p className="text-[0.85rem] font-medium text-[var(--v1-primary)]">
              {copy.sim.calm}
            </p>
          </div>
        </div>
      </section>

      {/* ── 04 PRICING ───────────────────────────────────────── */}
      <section id="price" className="border-t border-[var(--v1-line)] bg-[var(--v1-surface)]">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
          <span data-rule className="mb-10 block h-px w-full origin-left bg-[var(--v1-line)]" />
          <SectionHead
            index={copy.pricing.index}
            kicker={copy.pricing.kicker}
            title={copy.pricing.title}
            lead=""
            icon={<Wallet size={14} />}
          />
          <div className="mt-8 grid gap-x-14 gap-y-10 lg:grid-cols-[0.85fr_1.15fr]">
            {/* price block */}
            <div className="v1-graph rounded-xl border border-[var(--v1-line)] bg-[var(--v1-bg)] p-7">
              <div className="flex items-end gap-1">
                <span className="v1-tnum v1-display text-[3.6rem] font-bold leading-none text-[var(--v1-ink)]">
                  {copy.pricing.price}
                </span>
                <span className="v1-display mb-1.5 text-[1.6rem] font-semibold text-[var(--v1-ink)]">
                  {copy.pricing.currency}
                </span>
              </div>
              <p className="mt-3 text-[0.9rem] leading-relaxed text-[var(--v1-muted)]">
                {copy.pricing.framing}
              </p>
              <a href="/register" className="v1-btn-amber v1-btn-lg mt-6 w-full justify-center">
                {copy.hero.ctaPrimary}
                <ArrowRight size={17} />
              </a>
              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5">
                {copy.pricing.trust.map((t) => (
                  <span
                    key={t}
                    className="flex items-center gap-1.5 text-[0.78rem] text-[var(--v1-muted)]"
                  >
                    <ShieldCheck size={13} className="text-[var(--v1-primary)]" />
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* spec sheet: free vs paid */}
            <div className="flex flex-col gap-6">
              <SpecList
                title={copy.pricing.freeTitle}
                items={copy.pricing.free}
                tone="free"
              />
              <SpecList
                title={copy.pricing.paidTitle}
                items={copy.pricing.paid}
                tone="paid"
              />
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <p className="flex items-start gap-2.5 rounded-lg border border-[var(--v1-line)] bg-[var(--v1-bg)] px-4 py-3.5 text-[0.85rem] text-[var(--v1-ink)]">
              <Wallet size={16} className="mt-0.5 shrink-0 text-[var(--v1-primary)]" />
              {copy.pricing.anchor}
            </p>
            <p className="flex items-start gap-2.5 rounded-lg border border-[var(--v1-line)] bg-[var(--v1-bg)] px-4 py-3.5 text-[0.85rem] text-[var(--v1-ink)]">
              <Repeat size={16} className="mt-0.5 shrink-0 text-[var(--v1-primary)]" />
              {copy.pricing.failsafe}
            </p>
          </div>
        </div>
      </section>

      {/* ── 05 BASE ──────────────────────────────────────────── */}
      <section id="base" className="border-t border-[var(--v1-line)]">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
          <span data-rule className="mb-10 block h-px w-full origin-left bg-[var(--v1-line)]" />
          <SectionHead
            index={copy.base.index}
            kicker={copy.base.kicker}
            title={copy.base.title}
            lead={copy.base.lead}
            icon={<ClipboardCheck size={14} />}
          />
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--v1-primary)] bg-[color-mix(in_srgb,var(--v1-primary)_8%,var(--v1-surface))] px-3.5 py-1.5 text-[0.78rem] font-medium text-[var(--v1-primary)]">
              <ShieldCheck size={14} />
              {copy.base.badge}
            </span>
          </div>
          <div data-stagger className="mt-6 grid gap-4 sm:grid-cols-3">
            {copy.base.stats.map((s) => (
              <div
                key={s.label}
                data-cell
                className="rounded-lg border border-[var(--v1-line)] bg-[var(--v1-surface)] p-6"
              >
                <div className="v1-display text-[2.6rem] font-bold leading-none text-[var(--v1-ink)]">
                  <CountUp end={Number(s.n)} />
                </div>
                <div className="mt-2 text-[0.85rem] text-[var(--v1-muted)]">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {copy.base.counters.map((c) => (
              <div
                key={c.label}
                className="flex items-center justify-between rounded-lg border border-dashed border-[var(--v1-line)] bg-[var(--v1-surface)] px-5 py-4"
              >
                <span className="text-[0.85rem] text-[var(--v1-muted)]">{c.label}</span>
                <span className="v1-tnum v1-display text-[1.1rem] font-semibold text-[var(--v1-muted)]">
                  —
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[0.76rem] text-[var(--v1-muted)]">{copy.base.counterNote}</p>
        </div>
      </section>

      {/* ── 06 FAQ ───────────────────────────────────────────── */}
      <section id="faq" className="border-t border-[var(--v1-line)] bg-[var(--v1-surface)]">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
          <span data-rule className="mb-10 block h-px w-full origin-left bg-[var(--v1-line)]" />
          <div className="grid gap-x-14 gap-y-8 lg:grid-cols-[0.7fr_1.3fr]">
            <SectionHead
              index={copy.faq.index}
              kicker={copy.faq.kicker}
              title={copy.faq.title}
              lead=""
              icon={<ShieldCheck size={14} />}
            />
            <div>
              {copy.faq.items.map((it) => (
                <FaqRow key={it.q} q={it.q} a={it.a} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA + mobile launcher ──────────────────────── */}
      <section className="border-t border-[var(--v1-line)] bg-[var(--v1-bg)]">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
          <div className="v1-graph rounded-2xl border border-[var(--v1-line)] bg-[var(--v1-surface)] p-8 text-center sm:p-12">
            <h2 className="v1-display mx-auto max-w-2xl text-balance text-[clamp(1.8rem,4.4vw,2.8rem)] leading-[1.05] text-[var(--v1-ink)]">
              {copy.final.title}
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[0.98rem] leading-relaxed text-[var(--v1-muted)]">
              {copy.final.sub}
            </p>
            <div className="mx-auto mt-7 flex max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
              <a href="/register" className="v1-btn-amber v1-btn-lg justify-center">
                {copy.final.ctaPrimary}
                <ArrowRight size={17} />
              </a>
              <a href="/login" className="v1-btn-ghost justify-center">
                {copy.final.ctaSecondary}
              </a>
            </div>
          </div>

          {/* mobile vertical mode-launcher */}
          <div className="mt-6 flex flex-col gap-2.5 sm:hidden">
            {copy.final.launcher.map((m, i) => (
              <a
                key={m.label}
                href="/register"
                className="flex items-center gap-3 rounded-lg border border-[var(--v1-line)] bg-[var(--v1-surface)] px-4 py-3.5"
              >
                <span className="grid size-8 place-items-center rounded-md border border-[var(--v1-line)] text-[var(--v1-primary)]">
                  {[<Dumbbell size={16} key="a" />, <TimerReset size={16} key="b" />, <Route size={16} key="c" />][i]}
                </span>
                <span className="flex flex-col">
                  <span className="v1-display text-[0.92rem] font-semibold text-[var(--v1-ink)]">
                    {m.label}
                  </span>
                  <span className="text-[0.74rem] text-[var(--v1-muted)]">{m.hint}</span>
                </span>
                <ArrowRight size={16} className="ml-auto text-[var(--v1-muted)]" />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER — data plate ──────────────────────────────── */}
      <footer className="border-t border-[var(--v1-line)] bg-[var(--v1-surface)]">
        <div className="mx-auto max-w-6xl px-5 py-12">
          <div className="grid gap-x-10 gap-y-8 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-[5px] border border-[var(--v1-primary)] text-[var(--v1-primary)]">
                  <GaugeIcon size={14} />
                </span>
                <span className="v1-display text-[0.95rem] font-semibold text-[var(--v1-ink)]">
                  {copy.brand}
                </span>
              </div>
              <p className="mt-3 max-w-xs text-[0.85rem] text-[var(--v1-muted)]">
                {copy.footer.tagline}
              </p>
              <p className="v1-tnum mt-4 text-[0.72rem] text-[var(--v1-muted)]">
                {copy.footer.plate}
              </p>
            </div>
            {copy.footer.cols.map((col) => (
              <div key={col.h}>
                <h5 className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[var(--v1-ink)]">
                  {col.h}
                </h5>
                <ul className="mt-3 flex flex-col gap-2">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <a href={l.href} className="text-[0.85rem] text-[var(--v1-muted)] hover:text-[var(--v1-ink)]">
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-10 border-t border-[var(--v1-line)] pt-6">
            <p className="max-w-4xl text-[0.72rem] leading-relaxed text-[var(--v1-muted)]">
              {copy.footer.disclaimer}
            </p>
            <p className="mt-4 text-[0.72rem] text-[var(--v1-muted)]">{copy.footer.copyright}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Hero instrument (gauge + live question) ──────────────────────────
   Self-contained so answering the question tweens the needle by re-rendering
   ONLY this subtree — never the whole page (motion-perf discipline). */
function HeroInstrument() {
  const heroArc = useRef<SVGPathElement>(null);
  const [heroVal, setHeroVal] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const q = copy.hero.question;
  const heroReadout = Math.round(heroVal);

  const answer = useCallback(
    (i: number) => {
      if (choice !== null) return;
      setChoice(i);
      const target = i === q.correctIndex ? 4 : 1;
      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        setHeroVal(target);
        return;
      }
      const o = { v: 0 };
      gsap.to(o, {
        v: target,
        duration: 1,
        ease: "power2.out",
        onUpdate: () => setHeroVal(o.v),
      });
    },
    [choice, q.correctIndex],
  );

  // Hero gauge arc draw-on-load (local so it doesn't couple to the page effect).
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      if (!heroArc.current) return;
      const len = heroArc.current.getTotalLength();
      gsap.set(heroArc.current, { strokeDasharray: len, strokeDashoffset: len });
      const tw = gsap.to(heroArc.current, {
        strokeDashoffset: 0,
        duration: 0.9,
        ease: "power2.out",
        delay: 0.15,
      });
      return () => tw.kill();
    });
    return () => mm.revert();
  }, []);

  return (
    <div
      id="hero-question"
      data-rise
      className="v1-panel v1-graph relative scroll-mt-24"
    >
      <div className="flex items-start justify-between px-1">
        <span className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-[var(--v1-muted)]">
          {copy.hero.gaugeCaption}
        </span>
        <span
          aria-live="polite"
          className="v1-tnum rounded-md border border-[var(--v1-line)] bg-[var(--v1-surface)] px-2 py-1 text-[0.72rem] text-[var(--v1-muted)]"
        >
          {q.readoutLabel}:{" "}
          <span className="font-semibold text-[var(--v1-primary)]">{heroReadout}%</span>
        </span>
      </div>

      <div className="relative mx-auto mt-1 max-w-[340px]">
        <GaugeHero value={heroVal} arcRef={heroArc} />
      </div>

      {/* live official question card */}
      <div className="mt-2 rounded-lg border border-[var(--v1-line)] bg-[var(--v1-surface)] p-4">
        <div className="mb-2.5 flex items-center gap-2">
          <span className="rounded border border-[var(--v1-line)] px-1.5 py-0.5 text-[0.62rem] font-medium uppercase tracking-wider text-[var(--v1-muted)]">
            офіційне питання
          </span>
        </div>
        <p className="text-[0.9rem] font-medium leading-snug text-[var(--v1-ink)]">
          {q.prompt}
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {q.options.map((opt, i) => {
            const answered = choice !== null;
            const isCorrect = i === q.correctIndex;
            const picked = choice === i;
            let cls =
              "border-[var(--v1-line)] bg-[var(--v1-surface)] text-[var(--v1-ink)]";
            if (answered && isCorrect)
              cls =
                "border-[var(--v1-primary)] bg-[color-mix(in_srgb,var(--v1-primary)_9%,var(--v1-surface))] text-[var(--v1-ink)]";
            else if (answered && picked && !isCorrect)
              cls =
                "border-[var(--v1-slate)] bg-[color-mix(in_srgb,var(--v1-slate)_10%,var(--v1-surface))] text-[var(--v1-muted)]";
            else if (answered) cls = "border-[var(--v1-line)] text-[var(--v1-muted)]";
            return (
              <button
                key={i}
                onClick={() => answer(i)}
                disabled={answered}
                className={`flex items-center gap-2.5 rounded-md border px-3 py-2.5 text-left text-[0.85rem] transition-colors ${cls} ${!answered ? "hover:border-[var(--v1-primary)]" : ""}`}
              >
                <span
                  className={`grid size-5 shrink-0 place-items-center rounded-full border text-[0.6rem] font-semibold ${answered && isCorrect ? "border-[var(--v1-primary)] bg-[var(--v1-primary)] text-white" : "border-[var(--v1-line)] text-[var(--v1-muted)]"}`}
                >
                  {answered && isCorrect ? (
                    <Check size={11} strokeWidth={3} />
                  ) : (
                    String.fromCharCode(1040 + i)
                  )}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
        <p
          className={`mt-3 text-[0.78rem] leading-relaxed ${choice === null ? "text-[var(--v1-muted)]" : "text-[var(--v1-ink)]"}`}
        >
          {choice === null ? q.hintTap : q.explanation}
        </p>
        {choice !== null && (
          <p className="mt-1.5 text-[0.72rem] text-[var(--v1-muted)]">{q.hintDone}</p>
        )}
      </div>
    </div>
  );
}

/* ── Decay gauge (scroll-scrub needle) ────────────────────────────────
   Owns its own decayVal so the scrub tween re-renders ONLY this panel,
   not the whole page, while scrolling through the honesty demo. */
function DecayGauge() {
  const ref = useRef<HTMLDivElement>(null);
  const [decayVal, setDecayVal] = useState(66);

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const el = ref.current;
      if (!el) return;
      const dObj = { v: 66 };
      const tw = gsap.to(dObj, {
        v: 41,
        ease: "none",
        onUpdate: () => setDecayVal(dObj.v),
        scrollTrigger: {
          trigger: el,
          start: "top 75%",
          end: "bottom 60%",
          scrub: true,
        },
      });
      return () => tw.kill();
    });
    return () => mm.revert();
  }, []);

  return (
    <div ref={ref} data-decay className="v1-panel v1-graph">
      <div className="flex items-center justify-between px-1">
        <span className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-[var(--v1-muted)]">
          {copy.dial.caption}
        </span>
        <span
          aria-live="polite"
          className="v1-tnum v1-display text-[1.5rem] font-semibold text-[var(--v1-primary)]"
        >
          {Math.round(decayVal)}%
        </span>
      </div>
      <div className="mx-auto mt-1 max-w-[360px]">
        <Gauge value={decayVal} ariaLabel="Готовність (демо спаду)" />
      </div>
      <div className="flex items-center justify-between px-2 text-[0.68rem] text-[var(--v1-muted)]">
        <span>{copy.dial.scaleLow}</span>
        <span>{copy.dial.scaleHigh}</span>
      </div>
      <p className="mt-3 rounded-md border border-dashed border-[var(--v1-line)] px-3 py-2 text-center text-[0.76rem] text-[var(--v1-muted)]">
        {copy.dial.decayNote}
      </p>
    </div>
  );
}

/* ── Hero gauge wrapper (needs arc ref for draw-on-load) ──────────── */
function GaugeHero({
  value,
  arcRef,
}: {
  value: number;
  arcRef: React.RefObject<SVGPathElement | null>;
}) {
  const v = Math.min(100, Math.max(0, value));
  const tip = polar(R * 0.8, v / 100);
  const majors = [0, 20, 40, 60, 80, 100];
  const minors = Array.from({ length: 21 }, (_, i) => i * 5).filter((n) => n % 20 !== 0);
  return (
    <svg viewBox={`0 0 ${GW} ${GH}`} className="w-full" role="img" aria-label={`Готовність: ${Math.round(v)}%`}>
      <path ref={arcRef} d={ARC_D} fill="none" stroke="var(--v1-line)" strokeWidth={2} />
      <path
        d={ARC_D}
        fill="none"
        stroke="var(--v1-primary)"
        strokeWidth={4}
        strokeLinecap="round"
        pathLength={100}
        style={{ strokeDasharray: `${v} 100` }}
      />
      {minors.map((n) => {
        const a = polar(R - 3, n / 100);
        const b = polar(R - 10, n / 100);
        return <line key={n} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--v1-tick)" strokeWidth={1} />;
      })}
      {majors.map((n) => {
        const a = polar(R - 2, n / 100);
        const b = polar(R - 15, n / 100);
        const t = polar(R - 30, n / 100);
        return (
          <g key={n}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--v1-ink)" strokeWidth={1.6} />
            <text x={t.x} y={t.y + 4} textAnchor="middle" className="v1-tnum" fontSize={11} fill="var(--v1-muted)">
              {n}
            </text>
          </g>
        );
      })}
      <line x1={CX} y1={CY} x2={tip.x} y2={tip.y} stroke="var(--v1-primary)" strokeWidth={3} strokeLinecap="round" />
      <circle cx={CX} cy={CY} r={7} fill="var(--v1-surface)" stroke="var(--v1-primary)" strokeWidth={2.5} />
      <circle cx={CX} cy={CY} r={2} fill="var(--v1-primary)" />
    </svg>
  );
}

/* ── Tick figure (1 of 5) ─────────────────────────────────────────── */
function TickFigure({ filled }: { filled: boolean }) {
  const c = filled ? "var(--v1-primary)" : "var(--v1-tick)";
  return (
    <svg width={13} height={18} viewBox="0 0 13 18" fill="none">
      <circle cx={6.5} cy={3.5} r={2.6} stroke={c} strokeWidth={1.4} fill={filled ? c : "none"} />
      <path
        d="M6.5 6.5 V12 M6.5 8 L2.5 10.5 M6.5 8 L10.5 10.5 M6.5 12 L3.5 17 M6.5 12 L9.5 17"
        stroke={c}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ── Spec list (pricing) ──────────────────────────────────────────── */
function SpecList({
  title,
  items,
  tone,
}: {
  title: string;
  items: readonly string[];
  tone: "free" | "paid";
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[0.72rem] font-semibold uppercase tracking-wider ${tone === "paid" ? "bg-[color-mix(in_srgb,var(--v1-primary)_12%,var(--v1-surface))] text-[var(--v1-primary)]" : "bg-[var(--v1-bg)] text-[var(--v1-muted)]"}`}
        >
          {tone === "paid" ? <Wallet size={12} /> : <Check size={12} />}
          {title}
        </span>
      </div>
      <ul className="flex flex-col">
        {items.map((it) => (
          <li
            key={it}
            className="flex items-baseline gap-2 border-b border-dotted border-[var(--v1-line)] py-2.5 text-[0.9rem] text-[var(--v1-ink)] last:border-0"
          >
            <span className={tone === "paid" ? "text-[var(--v1-primary)]" : "text-[var(--v1-slate)]"}>
              <Check size={14} strokeWidth={2.4} />
            </span>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Plan picker (date → plan preview) ────────────────────────────── */
const TOTAL_Q = 2322;
function PlanPicker() {
  const [date, setDate] = useState("");
  // Date math depends on "today", which is timezone-sensitive — compute it on the
  // client only (after mount) to avoid an SSR/CSR hydration mismatch on the min attr.
  const [todayMs, setTodayMs] = useState<number | null>(null);
  useEffect(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    setTodayMs(t.getTime());
  }, []);

  let days = 0;
  if (date && todayMs !== null) {
    const d = new Date(date + "T00:00:00");
    days = Math.max(1, Math.round((d.getTime() - todayMs) / 86400000));
  }
  // Honest sustainable ceiling. The shipped FSRS plan never asks for a 3-digit
  // one-shot quota (wave 21 plan-honesty); a real study day tops out ~60 items and
  // the «інтенсив» chip absorbs short runways — so we cap the preview instead of
  // printing the anxiety-inducing ceil(2322/days) (233/day for a 10-day date).
  const MAX_PER_DAY = 60;
  const hasPlan = days > 0;
  const rawPerDay = hasPlan ? Math.ceil(TOTAL_Q / days) : 0;
  const perDay = Math.min(rawPerDay, MAX_PER_DAY);
  const intense = hasPlan && rawPerDay > MAX_PER_DAY;

  const minDate =
    todayMs !== null
      ? new Date(todayMs + 86400000).toISOString().slice(0, 10)
      : undefined;

  return (
    <div className="v1-graph rounded-xl border border-[var(--v1-line)] bg-[var(--v1-bg)] p-6">
      <label
        htmlFor="v1-exam-date"
        className="block text-[0.78rem] font-medium uppercase tracking-[0.14em] text-[var(--v1-muted)]"
      >
        {copy.plan.dateLabel}
      </label>
      <input
        id="v1-exam-date"
        type="date"
        min={minDate}
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="v1-tnum mt-2 w-full rounded-lg border border-[var(--v1-line)] bg-[var(--v1-surface)] px-3.5 py-3 text-[0.95rem] text-[var(--v1-ink)] outline-none focus:border-[var(--v1-primary)]"
      />

      <div
        aria-live="polite"
        className="mt-5 rounded-lg border border-[var(--v1-line)] bg-[var(--v1-surface)] p-4"
      >
        {hasPlan ? (
          <>
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="v1-tnum v1-display text-[2.4rem] font-bold leading-none text-[var(--v1-primary)]">
                  {perDay}
                </div>
                <div className="mt-1 text-[0.78rem] text-[var(--v1-muted)]">
                  {copy.plan.perDayUnit}
                </div>
              </div>
              <div className="text-right">
                <div className="v1-tnum v1-display text-[2.4rem] font-bold leading-none text-[var(--v1-ink)]">
                  {days}
                </div>
                <div className="mt-1 text-[0.78rem] text-[var(--v1-muted)]">
                  {copy.plan.daysUnit}
                </div>
              </div>
            </div>
            {intense && (
              <p className="mt-4 flex items-center gap-2 rounded-md border border-[var(--v1-primary)] bg-[color-mix(in_srgb,var(--v1-primary)_8%,var(--v1-surface))] px-3 py-2 text-[0.8rem] text-[var(--v1-primary)]">
                <TimerReset size={14} />
                {copy.plan.intense}
              </p>
            )}
          </>
        ) : (
          <p className="py-4 text-center text-[0.88rem] text-[var(--v1-muted)]">
            {copy.plan.noDate}
          </p>
        )}
      </div>

      <a href="/register" className="v1-btn-amber v1-btn-lg mt-5 w-full justify-center">
        {copy.plan.cta}
        <ArrowRight size={17} />
      </a>
    </div>
  );
}

/* ── Scoped CSS ───────────────────────────────────────────────────── */
const v1css = `
.v1-scope{
  --v1-bg:#F7F9FA; --v1-surface:#FFFFFF; --v1-ink:#101826;
  --v1-primary:#0F766E; --v1-accent:#D97706; --v1-cta:#B45309; --v1-line:#E3E8EC;
  --v1-muted:#5A6675; --v1-slate:#64748B; --v1-tick:#94A3B8;
  background:var(--v1-bg);
  color:var(--v1-ink);
  font-family:var(--v1-body),system-ui,sans-serif;
  -webkit-font-smoothing:antialiased;
}
.v1-display{ font-family:var(--v1-display),system-ui,sans-serif; font-weight:700; letter-spacing:-0.02em; }
.v1-tnum{ font-variant-numeric:tabular-nums; font-feature-settings:"tnum" 1; }
.v1-panel{
  border:1px solid var(--v1-line); border-radius:0.75rem;
  background:var(--v1-surface); padding:1.1rem; display:flex; flex-direction:column; gap:0.55rem;
}
.v1-graph{
  background-image:
    repeating-linear-gradient(0deg, color-mix(in srgb, var(--v1-line) 55%, transparent) 0 1px, transparent 1px 8px),
    repeating-linear-gradient(90deg, color-mix(in srgb, var(--v1-line) 55%, transparent) 0 1px, transparent 1px 8px);
  background-blend-mode:normal;
}
.v1-panel.v1-graph, .v1-graph{ background-color:var(--v1-surface); }
.v1-grid{
  background-image:
    repeating-linear-gradient(0deg, color-mix(in srgb, var(--v1-line) 40%, transparent) 0 1px, transparent 1px 32px),
    repeating-linear-gradient(90deg, color-mix(in srgb, var(--v1-line) 40%, transparent) 0 1px, transparent 1px 32px);
}
.v1-btn-amber{
  display:inline-flex; align-items:center; gap:0.5rem;
  /* CTA fill darkened to #B45309 so white label clears WCAG AA (5.02:1);
     --v1-accent #D97706 stays the page's one warm hue for borders/marks. */
  background:var(--v1-cta); color:#fff; font-weight:600;
  padding:0.55rem 1.05rem; border-radius:999px; font-size:0.9rem;
  border:1px solid color-mix(in srgb, var(--v1-cta) 82%, #000 12%);
  transition:background .18s ease, transform .1s ease;
}
.v1-btn-amber:hover{ background:color-mix(in srgb, var(--v1-cta) 88%, #000); }
.v1-btn-amber:active{ transform:translateY(1px); }
.v1-btn-lg{ padding:0.8rem 1.5rem; font-size:0.98rem; }
.v1-btn-ghost{
  display:inline-flex; align-items:center; gap:0.4rem;
  color:var(--v1-ink); font-weight:500; font-size:0.95rem;
  padding:0.8rem 1.2rem; border-radius:999px;
  border:1px solid var(--v1-line); background:var(--v1-surface);
  transition:border-color .18s ease;
}
.v1-btn-ghost:hover{ border-color:var(--v1-primary); }
.v1-scope a{ text-underline-offset:3px; }
.v1-scope input[type=date]::-webkit-calendar-picker-indicator{ opacity:0.5; cursor:pointer; }
`;
