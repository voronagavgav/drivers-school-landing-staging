"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Inter, Inter_Tight } from "next/font/google";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  ArrowDown,
  ArrowUp,
  Check,
  Minus,
  Plus,
  Gauge as GaugeIcon,
  CalendarClock,
  TimerReset,
  ShieldCheck,
  Wallet,
  Dumbbell,
  Route,
  ClipboardCheck,
  Crosshair,
  Layers,
} from "lucide-react";
import { copy, HERO_VARIANTS, ACTIVE_HERO } from "./copy";

/* ── Fonts (declared locally, cyrillic verified) ──────────────────── */
const display = Inter_Tight({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["600", "700"],
  variable: "--v20-display",
  display: "swap",
});
const body = Inter({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500"],
  variable: "--v20-body",
  display: "swap",
});

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const H = HERO_VARIANTS[ACTIVE_HERO];

/* ── Gauge geometry (inherited from v1 «Прилад») ──────────────────── */
const GW = 300;
const GH = 190;
const CX = 150;
const CY = 170;
const R = 132;

// Round to 3 decimals so server (Node) and client (V8) serialize identical trig
// output — raw Math.cos/sin differ in the last float digit → hydration mismatch.
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

/* ── Instrument gauge (amber needle, teal-free value arc) ─────────── */
function Gauge({
  value,
  ariaLabel,
}: {
  value: number;
  ariaLabel: string;
}) {
  const v = Math.min(100, Math.max(0, value));
  const tip = polar(R * 0.8, v / 100);
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
      <path d={ARC_D} fill="none" stroke="var(--v20-line)" strokeWidth={2} />
      <path
        d={ARC_D}
        fill="none"
        stroke="var(--v20-amber)"
        strokeWidth={4}
        strokeLinecap="round"
        pathLength={100}
        style={{ strokeDasharray: `${v} 100` }}
      />
      {minors.map((n) => {
        const a = polar(R - 3, n / 100);
        const b = polar(R - 10, n / 100);
        return (
          <line key={`mi-${n}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--v20-tick)" strokeWidth={1} />
        );
      })}
      {majors.map((n) => {
        const a = polar(R - 2, n / 100);
        const b = polar(R - 15, n / 100);
        const t = polar(R - 30, n / 100);
        return (
          <g key={`ma-${n}`}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--v20-ink)" strokeWidth={1.6} />
            <text x={t.x} y={t.y + 4} textAnchor="middle" className="v20-tnum" fontSize={11} fill="var(--v20-muted)">
              {n}
            </text>
          </g>
        );
      })}
      <line x1={CX} y1={CY} x2={tip.x} y2={tip.y} stroke="var(--v20-amber)" strokeWidth={3} strokeLinecap="round" />
      <circle cx={CX} cy={CY} r={7} fill="var(--v20-surface)" stroke="var(--v20-amber)" strokeWidth={2.5} />
      <circle cx={CX} cy={CY} r={2} fill="var(--v20-amber)" />
    </svg>
  );
}

/* ── In-view once ─────────────────────────────────────────────────── */
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
  const [n, setN] = useState(end); // default to final value → always visible (no-JS / headless)
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
    <span ref={ref} className={`v20-tnum ${className ?? ""}`}>
      {String(n)}
    </span>
  );
}

/* ── Check-slot (drawn pass-mark) ─────────────────────────────────────
   Default state is DRAWN (visible) so no-JS / headless renders never show a
   blank slot; GSAP re-draws it on scroll-enter (immediateRender:false pattern). */
function CheckSlot({
  ticked = true,
  size = 40,
}: {
  ticked?: boolean;
  size?: number;
}) {
  return (
    <span
      className={`v20-slot ${ticked ? "is-ticked" : ""}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {ticked ? (
        <svg viewBox="0 0 24 24" width={size * 0.5} height={size * 0.5}>
          <path
            className="v20-slot-path"
            d="M5 12.5 L10 17.5 L19 6.5"
            fill="none"
            stroke="var(--v20-pass)"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </span>
  );
}

/* ── Free/paid rail flag ──────────────────────────────────────────── */
function FlagPill({ flag }: { flag: "free" | "paid" | "mixed" }) {
  const label = copy.flags[flag];
  if (flag === "paid") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--v20-line)] bg-[var(--v20-bg)] px-3 py-1 text-[0.72rem] font-semibold text-[var(--v20-ink)]">
        <Wallet size={12} className="text-[var(--v20-amber)]" />
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--v20-pass)_35%,var(--v20-line))] bg-[color-mix(in_srgb,var(--v20-pass)_8%,var(--v20-surface))] px-3 py-1 text-[0.72rem] font-semibold text-[var(--v20-pass)]">
      <Check size={12} strokeWidth={2.6} />
      {label}
    </span>
  );
}

/* ── Criterion header (number · name · check · flag · pass-mark) ───── */
function CriterionHead({
  n,
  name,
  check,
  flag,
  icon,
}: {
  n: string;
  name: string;
  check: string;
  flag: "free" | "paid" | "mixed";
  icon: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="v20-tnum v20-display text-[2.4rem] font-bold leading-none text-[var(--v20-amber)]">
            {n}
          </span>
          <span data-tick>
            <CheckSlot size={40} />
          </span>
        </div>
        <FlagPill flag={flag} />
      </div>
      <div>
        <div className="mb-2 flex items-center gap-2 text-[0.72rem] font-medium uppercase tracking-[0.16em] text-[var(--v20-muted)]">
          <span className="text-[var(--v20-amber)]">{icon}</span>
          Критерій
        </div>
        <h2 className="v20-display text-balance text-[clamp(1.6rem,3.6vw,2.4rem)] leading-[1.08] text-[var(--v20-ink)]">
          {name}
        </h2>
        <p className="mt-3 max-w-xl text-pretty text-[1rem] leading-relaxed text-[var(--v20-ink)]">
          {check}
        </p>
      </div>
    </header>
  );
}

function FaqRow({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[var(--v20-line)]">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="v20-display text-[1.02rem] font-semibold text-[var(--v20-ink)]">
          {q}
        </span>
        <span className="grid size-7 shrink-0 place-items-center rounded-full border border-[var(--v20-line)] text-[var(--v20-amber)]">
          {open ? <Minus size={15} /> : <Plus size={15} />}
        </span>
      </button>
      <div
        className="grid transition-all duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <p className="max-w-2xl pb-5 text-[0.95rem] leading-relaxed text-[var(--v20-muted)]">
            {a}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */
const CRIT_IDS = ["c1", "c2", "c3", "c4", "c5"] as const;

export default function Page() {
  const root = useRef<HTMLDivElement>(null);
  const prog = useRef<HTMLSpanElement>(null);
  const heroSentinel = useRef<HTMLDivElement>(null);
  // The signature instrument: five protocol rows tick as each criterion is
  // reached. Row 0 also ticks the moment the hero question is answered.
  const [ticks, setTicks] = useState<boolean[]>(() => Array(5).fill(false));
  const [heroPassed, setHeroPassed] = useState(false); // hero scrolled out of view
  const tickRow = useCallback((i: number) => {
    setTicks((prev) => (prev[i] ? prev : prev.map((v, idx) => (idx === i ? true : v))));
  }, []);

  useEffect(() => {
    // Scroll-progress instrument hairline (top). Not autoplay → runs always.
    const onScroll = () => {
      const el = prog.current;
      if (!el) return;
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const p = max > 0 ? h.scrollTop / max : 0;
      el.style.transform = `scaleX(${p})`;
    };
    let raf = 0;
    const handler = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(onScroll);
    };
    window.addEventListener("scroll", handler, { passive: true });
    onScroll();

    // Scroll-linked protocol: tick each hero rubric row as its criterion is
    // reached. Runs for ALL users (not motion-gated) so reduced-motion visitors
    // get instant ticks on scroll position; the tick DRAW animation is separate.
    const critTriggers = CRIT_IDS.map((id, i) =>
      ScrollTrigger.create({
        trigger: `#${id}`,
        start: "top 72%",
        once: true,
        onEnter: () => tickRow(i),
      }),
    );
    // Mini-protocol appears once the hero rubric leaves the viewport.
    let heroIo: IntersectionObserver | null = null;
    if (heroSentinel.current) {
      heroIo = new IntersectionObserver(
        ([e]) => setHeroPassed(!e.isIntersecting && e.boundingClientRect.top < 0),
        { threshold: 0 },
      );
      heroIo.observe(heroSentinel.current);
    }

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        gsap.from("[data-rise]", {
          y: 14,
          opacity: 0,
          duration: 0.6,
          ease: "power3.out",
          stagger: 0.06,
          delay: 0.1,
        });
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
        gsap.utils.toArray<HTMLElement>("[data-stagger]").forEach((grp) => {
          gsap.fromTo(
            grp.querySelectorAll("[data-cell]"),
            { y: 12, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.5,
              ease: "power2.out",
              stagger: 0.05,
              immediateRender: false,
              scrollTrigger: { trigger: grp, start: "top 88%", once: true },
            },
          );
        });
        // Pass-marks re-draw on enter (default already visible via immediateRender:false).
        gsap.utils.toArray<SVGPathElement>("[data-tick] .v20-slot-path").forEach((p) => {
          const len = p.getTotalLength();
          gsap.fromTo(
            p,
            { strokeDasharray: len, strokeDashoffset: len },
            {
              strokeDashoffset: 0,
              duration: 0.5,
              ease: "power2.out",
              immediateRender: false,
              scrollTrigger: { trigger: p, start: "top 90%", once: true },
            },
          );
        });
      }, root);
      return () => ctx.revert();
    });
    return () => {
      window.removeEventListener("scroll", handler);
      cancelAnimationFrame(raf);
      critTriggers.forEach((t) => t.kill());
      heroIo?.disconnect();
      mm.revert();
    };
  }, [tickRow]);

  return (
    <div
      ref={root}
      className={`${display.variable} ${body.variable} v20-scope min-h-full`}
    >
      <style>{v20css}</style>

      {/* scroll-progress instrument hairline */}
      <span ref={prog} className="v20-progress" aria-hidden />

      {/* ── Top bar ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-[var(--v20-line)] bg-[color-mix(in_srgb,var(--v20-bg)_86%,transparent)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <a href="#top" className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-[5px] border border-[var(--v20-amber)] text-[var(--v20-amber)]">
              <ClipboardCheck size={14} />
            </span>
            <span className="v20-display text-[0.95rem] font-semibold text-[var(--v20-ink)]">
              {copy.brand}
            </span>
          </a>
          <nav className="hidden items-center gap-7 text-sm text-[var(--v20-muted)] md:flex">
            <a href="#criteria" className="hover:text-[var(--v20-ink)]">{copy.nav.protocol}</a>
            <a href="#c5" className="hover:text-[var(--v20-ink)]">{copy.nav.dial}</a>
            <a href="#price" className="hover:text-[var(--v20-ink)]">{copy.nav.price}</a>
            <a href="#faq" className="hover:text-[var(--v20-ink)]">{copy.nav.faq}</a>
          </nav>
          <div className="flex items-center gap-2">
            <a href="/login" className="hidden text-sm text-[var(--v20-muted)] hover:text-[var(--v20-ink)] sm:inline">
              {copy.nav.login}
            </a>
            <a href="/register" className="v20-btn-amber text-sm">
              {copy.nav.ctaShort}
            </a>
          </div>
        </div>
      </header>

      {/* ── HERO / ПРОТОКОЛ ──────────────────────────────────── */}
      <section id="top" className="v20-grid relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-start gap-x-12 gap-y-10 px-5 py-10 lg:grid-cols-[1.02fr_1fr] lg:py-16">
          {/* left */}
          <div>
            <h1
              data-rise
              className="v20-display text-balance text-[clamp(2.1rem,6vw,4.1rem)] leading-[1.0] tracking-[-0.035em] text-[var(--v20-ink)]"
            >
              {H.headline}
            </h1>
            <div data-rise className="mt-5 flex items-center gap-3">
              <span className="flex items-center gap-1" aria-hidden>
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={`block h-4 w-1.5 rounded-full ${i === 0 ? "bg-[var(--v20-amber)]" : "bg-[var(--v20-tick)]"}`}
                  />
                ))}
              </span>
              <p className="max-w-md text-pretty text-[1.02rem] leading-snug text-[var(--v20-muted)]">
                {H.subhead}
              </p>
            </div>

            <div data-rise className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a href="/register" className="v20-btn-amber v20-btn-lg justify-center">
                {copy.hero.ctaPrimary}
                <ArrowRight size={17} />
              </a>
              {/* No /login: the real no-signup mechanic is the live question below. */}
              <a href="#c1-question" className="v20-btn-ghost justify-center">
                {copy.hero.ctaSecondary}
                <ArrowDown size={16} />
              </a>
            </div>
            <div data-rise className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {copy.hero.reassure.map((r) => (
                <span key={r} className="flex items-center gap-1.5 text-[0.78rem] text-[var(--v20-muted)]">
                  <Check size={13} className="text-[var(--v20-pass)]" strokeWidth={2.6} />
                  {r}
                </span>
              ))}
            </div>

            {/* proof chips */}
            <div
              data-rise
              data-stagger
              className="mt-8 grid grid-cols-3 gap-0 overflow-hidden rounded-lg border border-[var(--v20-line)] bg-[var(--v20-surface)]"
            >
              {copy.hero.chips.map((c, i) => (
                <div key={c.unit} data-cell className={`px-3 py-3.5 ${i > 0 ? "border-l border-[var(--v20-line)]" : ""}`}>
                  <div className="v20-tnum v20-display text-[1.05rem] font-semibold leading-none text-[var(--v20-ink)]">
                    {c.value}
                  </div>
                  <div className="mt-1.5 text-[0.68rem] leading-tight text-[var(--v20-muted)]">
                    {c.unit}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* right — the running protocol (rubric legend + live question) */}
          <Hero ticks={ticks} onC1Answer={() => tickRow(0)} />
        </div>
        <div ref={heroSentinel} aria-hidden className="absolute bottom-0 h-px w-px" />
      </section>

      {/* sticky mini-protocol — the scroll instrument once the hero is off-screen */}
      <MiniProtocol ticks={ticks} show={heroPassed} />

      {/* ── CRITERIA ─────────────────────────────────────────── */}
      <div id="criteria">
        {/* 01 — Знання бази */}
        <Criterion1 />
        {/* 02 — Слабкі місця */}
        <Criterion2 />
        {/* 03 — Темп іспиту */}
        <Criterion3 />
        {/* 04 — Пам'ять до дати */}
        <Criterion4 />
        {/* 05 — Калібрована ймовірність */}
        <Criterion5 />
      </div>

      {/* ── ВИСНОВОК — verdict + pricing ─────────────────────── */}
      <Verdict />

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section id="faq" className="border-t border-[var(--v20-line)] bg-[var(--v20-surface)]">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
          <span data-rule className="mb-10 block h-px w-full origin-left bg-[var(--v20-line)]" />
          <div className="grid gap-x-14 gap-y-8 lg:grid-cols-[0.7fr_1.3fr]">
            <div>
              <div className="mb-4 text-[0.72rem] font-medium uppercase tracking-[0.16em] text-[var(--v20-muted)]">
                {copy.faq.index}
              </div>
              <h2 className="v20-display text-[clamp(1.7rem,4vw,2.4rem)] leading-[1.06] text-[var(--v20-ink)]">
                {copy.faq.title}
              </h2>
            </div>
            <div>
              {copy.faq.items.map((it) => (
                <FaqRow key={it.q} q={it.q} a={it.a} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── ПІДПИС — final CTA + mobile launcher ─────────────── */}
      <section className="border-t border-[var(--v20-line)] bg-[var(--v20-bg)]">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
          <div className="v20-graph rounded-2xl border border-[var(--v20-line)] bg-[var(--v20-surface)] p-8 text-center sm:p-12">
            <div className="mb-5 flex items-center justify-center gap-2 text-[0.72rem] font-medium uppercase tracking-[0.16em] text-[var(--v20-muted)]">
              <span className="h-px w-6 bg-[var(--v20-line)]" />
              {copy.final.index}
              <span className="h-px w-6 bg-[var(--v20-line)]" />
            </div>
            <h2 className="v20-display mx-auto max-w-2xl text-balance text-[clamp(1.8rem,4.4vw,2.8rem)] leading-[1.05] text-[var(--v20-ink)]">
              {copy.final.title}
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[0.98rem] leading-relaxed text-[var(--v20-muted)]">
              {copy.final.sub}
            </p>
            <div className="mx-auto mt-7 flex max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
              <a href="/register" className="v20-btn-amber v20-btn-lg justify-center">
                {copy.final.ctaPrimary}
                <ArrowRight size={17} />
              </a>
              <a href="/login" className="v20-btn-ghost justify-center">
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
                className="flex items-center gap-3 rounded-lg border border-[var(--v20-line)] bg-[var(--v20-surface)] px-4 py-3.5"
              >
                <span className="grid size-8 place-items-center rounded-md border border-[var(--v20-line)] text-[var(--v20-amber)]">
                  {[<Dumbbell size={16} key="a" />, <TimerReset size={16} key="b" />, <Route size={16} key="c" />][i]}
                </span>
                <span className="flex flex-col">
                  <span className="v20-display text-[0.92rem] font-semibold text-[var(--v20-ink)]">{m.label}</span>
                  <span className="text-[0.74rem] text-[var(--v20-muted)]">{m.hint}</span>
                </span>
                <ArrowRight size={16} className="ml-auto text-[var(--v20-muted)]" />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER — dark brand moment ───────────────────────── */}
      <footer className="v20-foot relative overflow-hidden border-t border-[var(--v20-line)]">
        <span className="v20-ghost v20-display" aria-hidden>
          {copy.brand}
        </span>
        <div className="relative mx-auto max-w-6xl px-5 py-14">
          <div className="grid gap-x-10 gap-y-8 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-[5px] border border-[var(--v20-amber)] text-[var(--v20-amber)]">
                  <ClipboardCheck size={14} />
                </span>
                <span className="v20-display text-[0.95rem] font-semibold text-white">{copy.brand}</span>
              </div>
              <p className="mt-3 max-w-xs text-[0.85rem] text-[color-mix(in_srgb,white_66%,transparent)]">
                {copy.footer.tagline}
              </p>
              <p className="v20-tnum mt-4 text-[0.72rem] text-[color-mix(in_srgb,white_50%,transparent)]">
                {copy.footer.plate}
              </p>
            </div>
            {copy.footer.cols.map((col) => (
              <div key={col.h}>
                <h5 className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[color-mix(in_srgb,white_80%,transparent)]">
                  {col.h}
                </h5>
                <ul className="mt-3 flex flex-col gap-2">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <a href={l.href} className="text-[0.85rem] text-[color-mix(in_srgb,white_60%,transparent)] hover:text-white">
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div>
              <h5 className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[color-mix(in_srgb,white_80%,transparent)]">
                {copy.footer.contactLabel}
              </h5>
              <a
                href={`mailto:${copy.footer.contact}`}
                className="mt-3 inline-block text-[0.85rem] text-[color-mix(in_srgb,white_66%,transparent)] hover:text-white"
              >
                {copy.footer.contact}
              </a>
            </div>
          </div>

          <div className="mt-12 border-t border-[color-mix(in_srgb,white_14%,transparent)] pt-6">
            <p className="max-w-4xl text-[0.72rem] leading-relaxed text-[color-mix(in_srgb,white_46%,transparent)]">
              {copy.footer.disclaimer}
            </p>
            <p className="mt-4 text-[0.72rem] text-[color-mix(in_srgb,white_50%,transparent)]">{copy.footer.copyright}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   HERO — the running protocol: rubric legend + criterion-1 live question.
   Owns `answered` so answering ticks criterion-01's slot without re-rendering
   the whole page (motion-perf discipline).
   ════════════════════════════════════════════════════════════════════ */
function Hero({ ticks, onC1Answer }: { ticks: boolean[]; onC1Answer: () => void }) {
  const [choice, setChoice] = useState<number | null>(null);
  const q = copy.hero.question;
  const answered = choice !== null;
  const passed = ticks.filter(Boolean).length;

  const answer = useCallback(
    (i: number) => {
      if (choice !== null) return;
      setChoice(i);
      onC1Answer();
    },
    [choice, onC1Answer],
  );

  return (
    <div data-rise className="flex flex-col gap-4">
      {/* rubric legend */}
      <div className="v20-panel v20-graph">
        <div className="flex items-center justify-between px-1 pb-1">
          <span className="v20-display text-[0.82rem] font-semibold uppercase tracking-[0.14em] text-[var(--v20-ink)]">
            {copy.hero.protocolTitle}
          </span>
          {/* Honest progress: how many of the five checks are marked — NOT a
              readiness percentage. */}
          <span className="v20-tnum rounded-md border border-[var(--v20-line)] bg-[var(--v20-surface)] px-2 py-1 text-[0.68rem] text-[var(--v20-muted)]">
            {copy.hero.meterLabel}:{" "}
            <span className="font-semibold text-[var(--v20-cta)]">{passed}/5</span>
          </span>
        </div>
        <ul className="flex flex-col">
          {copy.hero.rubric.map((r, i) => {
            const isTicked = ticks[i];
            return (
              <li
                key={r.n}
                className="flex items-center gap-3 border-t border-[var(--v20-line)] py-2.5 first:border-t-0"
              >
                <span
                  className={`v20-slot shrink-0 ${isTicked ? "is-ticked" : ""}`}
                  style={{ width: 24, height: 24 }}
                  aria-hidden
                >
                  {isTicked ? (
                    <Check size={13} strokeWidth={3} className="text-[var(--v20-pass)]" />
                  ) : (
                    <span className="v20-tnum text-[0.62rem] font-semibold text-[var(--v20-muted)]">{r.n}</span>
                  )}
                </span>
                <span className="text-[0.86rem] font-medium text-[var(--v20-ink)]">{r.name}</span>
                <span className="v20-tnum ml-auto text-[0.74rem] text-[var(--v20-muted)]">{r.value}</span>
                <span
                  className={`hidden h-1.5 w-1.5 shrink-0 rounded-full sm:block ${
                    r.flag === "paid" ? "bg-[var(--v20-amber)]" : "bg-[var(--v20-pass)]"
                  }`}
                />
              </li>
            );
          })}
        </ul>
        <p className="px-1 pt-1 text-[0.72rem] leading-snug text-[var(--v20-muted)]">
          {copy.hero.protocolHint}
        </p>
      </div>

      {/* criterion-01 live question with protocol mini-meter (checks, not %) */}
      <div id="c1-question" className="v20-panel v20-graph scroll-mt-24">
        <div className="flex items-center justify-between px-1">
          <span className="rounded border border-[var(--v20-line)] bg-[var(--v20-surface)] px-1.5 py-0.5 text-[0.6rem] font-medium uppercase tracking-wider text-[var(--v20-muted)]">
            {q.badge}
          </span>
          <span aria-live="polite" className="flex items-center gap-2">
            <span className="v20-mini-meter" aria-hidden>
              <span className="v20-mini-fill" style={{ transform: `scaleX(${passed / 5})` }} />
            </span>
            <span className="v20-tnum text-[0.72rem] font-semibold text-[var(--v20-cta)]">
              {passed}/5
            </span>
          </span>
        </div>
        <p className="mt-1 px-1 text-[0.92rem] font-medium leading-snug text-[var(--v20-ink)]">
          {q.prompt}
        </p>
        <div className="mt-1 flex flex-col gap-2">
          {q.options.map((opt, i) => {
            const isCorrect = i === q.correctIndex;
            const picked = choice === i;
            let cls = "border-[var(--v20-line)] bg-[var(--v20-surface)] text-[var(--v20-ink)]";
            if (answered && isCorrect)
              cls =
                "border-[var(--v20-pass)] bg-[color-mix(in_srgb,var(--v20-pass)_9%,var(--v20-surface))] text-[var(--v20-ink)]";
            else if (answered && picked && !isCorrect)
              cls =
                "border-[var(--v20-slate)] bg-[color-mix(in_srgb,var(--v20-slate)_10%,var(--v20-surface))] text-[var(--v20-muted)]";
            else if (answered) cls = "border-[var(--v20-line)] text-[var(--v20-muted)]";
            return (
              <button
                key={i}
                onClick={() => answer(i)}
                disabled={answered}
                className={`flex items-center gap-2.5 rounded-md border px-3 py-2.5 text-left text-[0.85rem] transition-colors ${cls} ${!answered ? "hover:border-[var(--v20-amber)]" : ""}`}
              >
                <span
                  className={`grid size-5 shrink-0 place-items-center rounded-full border text-[0.6rem] font-semibold ${answered && isCorrect ? "border-[var(--v20-pass)] bg-[var(--v20-pass)] text-white" : "border-[var(--v20-line)] text-[var(--v20-muted)]"}`}
                >
                  {answered && isCorrect ? <Check size={11} strokeWidth={3} /> : String.fromCharCode(1040 + i)}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
        <p className={`mt-2 px-1 text-[0.78rem] leading-relaxed ${answered ? "text-[var(--v20-ink)]" : "text-[var(--v20-muted)]"}`}>
          {answered ? q.explanation : q.hintTap}
        </p>
        {answered && <p className="px-1 text-[0.72rem] text-[var(--v20-pass)]">{q.hintDone}</p>}
      </div>
    </div>
  );
}

/* ── Sticky mini-protocol (desktop) — the scroll instrument, compact ──
   Shows the five check-slots filling as the visitor passes each criterion,
   once the hero rubric has scrolled off-screen. Presence, not a percentage. */
function MiniProtocol({ ticks, show }: { ticks: boolean[]; show: boolean }) {
  const passed = ticks.filter(Boolean).length;
  return (
    <div
      aria-hidden
      className={`fixed left-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-2.5 rounded-full border border-[var(--v20-line)] bg-[color-mix(in_srgb,var(--v20-surface)_88%,transparent)] px-2 py-3 backdrop-blur-md transition-all duration-500 ease-out xl:flex ${
        show ? "opacity-100" : "pointer-events-none translate-x-[-140%] opacity-0"
      }`}
    >
      <span className="v20-tnum text-[0.6rem] font-semibold text-[var(--v20-cta)]">{passed}/5</span>
      {ticks.map((t, i) => (
        <span
          key={i}
          className={`grid size-4 place-items-center rounded-full border transition-colors duration-300 ${
            t
              ? "border-[color-mix(in_srgb,var(--v20-pass)_45%,var(--v20-line))] bg-[color-mix(in_srgb,var(--v20-pass)_12%,var(--v20-surface))]"
              : "border-[var(--v20-line)] bg-[var(--v20-surface)]"
          }`}
        >
          {t ? <Check size={9} strokeWidth={3.5} className="text-[var(--v20-pass)]" /> : null}
        </span>
      ))}
    </div>
  );
}

/* ── Section shell ────────────────────────────────────────────────── */
function CritSection({
  id,
  alt,
  children,
}: {
  id: string;
  alt?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={`border-t border-[var(--v20-line)] ${alt ? "bg-[var(--v20-surface)]" : ""}`}
    >
      <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
        <span data-rule className="mb-10 block h-px w-full origin-left bg-[var(--v20-line)]" />
        {children}
      </div>
    </section>
  );
}

/* ── 01 — Знання бази (free) ──────────────────────────────────────── */
function Criterion1() {
  const c = copy.c1;
  return (
    <CritSection id={c.id}>
      <div className="grid gap-x-14 gap-y-10 lg:grid-cols-[1fr_1.05fr] lg:items-start">
        <CriterionHead n={c.n} name={c.name} check={c.check} flag={c.flag} icon={<Layers size={14} />} />
        <div className="flex flex-col gap-6">
          <p className="max-w-xl text-[0.98rem] leading-relaxed text-[var(--v20-muted)]">{c.lead}</p>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--v20-pass)_35%,var(--v20-line))] bg-[color-mix(in_srgb,var(--v20-pass)_8%,var(--v20-surface))] px-3.5 py-1.5 text-[0.78rem] font-medium text-[var(--v20-pass)]">
            <ShieldCheck size={14} />
            {c.badge}
          </span>
          {/* instrument legend — hairline-ruled, not a tile grid */}
          <dl data-stagger className="border-y border-[var(--v20-line)]">
            {c.stats.map((s) => (
              <div
                key={s.label}
                data-cell
                className="flex items-baseline justify-between gap-4 border-t border-[var(--v20-line)] py-3 first:border-t-0"
              >
                <dt className="text-[0.88rem] text-[var(--v20-muted)]">{s.label}</dt>
                <dd className="v20-tnum v20-display text-[1.6rem] font-bold leading-none text-[var(--v20-ink)]">
                  <CountUp end={Number(s.n)} />
                </dd>
              </div>
            ))}
          </dl>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            {c.freeNouns.map((f) => (
              <li key={f} className="flex items-center gap-2 text-[0.88rem] text-[var(--v20-ink)]">
                <Check size={15} strokeWidth={2.5} className="shrink-0 text-[var(--v20-pass)]" />
                {f}
              </li>
            ))}
          </ul>
          <p className="rounded-md border border-dashed border-[var(--v20-line)] px-4 py-3 text-[0.82rem] text-[var(--v20-muted)]">
            {c.passNote}
          </p>
        </div>
      </div>
    </CritSection>
  );
}

/* ── 02 — Слабкі місця (mixed) ────────────────────────────────────── */
function Criterion2() {
  const c = copy.c2;
  return (
    <CritSection id={c.id} alt>
      <div className="grid gap-x-14 gap-y-10 lg:grid-cols-[1fr_1.05fr] lg:items-start">
        <CriterionHead n={c.n} name={c.name} check={c.check} flag={c.flag} icon={<Crosshair size={14} />} />
        <div className="flex flex-col gap-6">
          <p className="max-w-xl text-[0.98rem] leading-relaxed text-[var(--v20-muted)]">{c.lead}</p>
          <div className="rounded-xl border border-[var(--v20-line)] bg-[var(--v20-bg)] p-5">
            <h4 className="v20-display text-[0.9rem] font-semibold text-[var(--v20-ink)]">{c.topicsTitle}</h4>
            <ol data-stagger className="mt-3 flex flex-col">
              {c.topics.map((t, i) => (
                <li key={t} data-cell className="flex items-center gap-3 border-b border-[var(--v20-line)] py-2.5 last:border-0">
                  <span className="v20-tnum w-5 text-[0.78rem] font-semibold text-[var(--v20-cta)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[0.9rem] text-[var(--v20-ink)]">{t}</span>
                  <Route size={14} className="ml-auto text-[var(--v20-muted)]" />
                </li>
              ))}
            </ol>
          </div>
          {/* paid analytics teaser */}
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--v20-amber)_28%,var(--v20-line))] bg-[color-mix(in_srgb,var(--v20-amber)_5%,var(--v20-surface))] p-5">
            <div className="flex items-center justify-between gap-3">
              <h4 className="v20-display flex items-center gap-2 text-[0.95rem] font-semibold text-[var(--v20-ink)]">
                <Crosshair size={15} className="text-[var(--v20-amber)]" />
                {c.teaserTitle}
              </h4>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--v20-line)] bg-[var(--v20-surface)] px-2.5 py-1 text-[0.68rem] font-semibold text-[var(--v20-ink)]">
                <Wallet size={11} className="text-[var(--v20-amber)]" />
                {c.teaserFlag}
              </span>
            </div>
            <p className="mt-2.5 text-[0.88rem] leading-relaxed text-[var(--v20-muted)]">{c.teaser}</p>
          </div>
        </div>
      </div>
    </CritSection>
  );
}

/* ── 03 — Темп іспиту (free) ──────────────────────────────────────── */
function Criterion3() {
  const c = copy.c3;
  return (
    <CritSection id={c.id}>
      <CriterionHead n={c.n} name={c.name} check={c.check} flag={c.flag} icon={<TimerReset size={14} />} />
      <p className="mt-6 max-w-2xl text-[0.98rem] leading-relaxed text-[var(--v20-muted)]">{c.lead}</p>
      <div data-stagger className="mt-8 grid gap-4 sm:grid-cols-3">
        {c.specs.map((s) => (
          <div key={s.label} data-cell className="v20-graph rounded-xl border border-[var(--v20-line)] bg-[var(--v20-surface)] p-6">
            <div className="v20-tnum v20-display text-[3.4rem] font-bold leading-none text-[var(--v20-ink)]">{s.n}</div>
            <div className="mt-2 text-[0.85rem] text-[var(--v20-muted)]">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-col gap-3 rounded-xl border border-[var(--v20-line)] bg-[var(--v20-surface)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="v20-tnum text-[0.85rem] text-[var(--v20-ink)]">{c.rule}</p>
        <p className="flex items-center gap-2 text-[0.85rem] font-medium text-[var(--v20-pass)]">
          <ShieldCheck size={15} />
          {c.calm}
        </p>
      </div>
      {/* free-half-complete CTA — the strongest zero-risk ask on the page */}
      <div className="mt-6 flex flex-col gap-4 border-t border-dashed border-[var(--v20-line)] pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2.5 text-[0.95rem] font-medium text-[var(--v20-ink)]">
          <Check size={16} strokeWidth={2.6} className="shrink-0 text-[var(--v20-pass)]" />
          {c.freeCta}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <a href="/register" className="v20-btn-amber justify-center">
            {c.freeCtaPrimary}
            <ArrowRight size={16} />
          </a>
          <a href="#c1-question" className="v20-btn-ghost justify-center">
            {c.freeCtaSecondary}
            <ArrowUp size={15} />
          </a>
        </div>
      </div>
    </CritSection>
  );
}

/* ── 04 — Пам'ять до дати (paid) ──────────────────────────────────── */
function Criterion4() {
  const c = copy.c4;
  return (
    <CritSection id={c.id} alt>
      <CriterionHead n={c.n} name={c.name} check={c.check} flag={c.flag} icon={<CalendarClock size={14} />} />
      <div className="mt-8 grid gap-x-14 gap-y-10 lg:grid-cols-[1fr_1fr] lg:items-start">
        <div className="flex flex-col gap-5">
          <p className="max-w-xl text-[0.98rem] leading-relaxed text-[var(--v20-muted)]">{c.lead}</p>
          <p className="flex items-center gap-2 text-[0.88rem] font-medium text-[var(--v20-ink)]">
            <Route size={15} className="text-[var(--v20-amber)]" />
            {c.engine}
          </p>
          <p className="rounded-md border border-dashed border-[var(--v20-line)] px-4 py-3 text-[0.82rem] text-[var(--v20-muted)]">
            {c.retaker}
          </p>
        </div>
        <PlanPicker />
      </div>
    </CritSection>
  );
}

/* ── 05 — Калібрована ймовірність (paid, full-width instrument) ───── */
function Criterion5() {
  const c = copy.c5;
  return (
    <CritSection id={c.id}>
      <CriterionHead n={c.n} name={c.name} check={c.check} flag={c.flag} icon={<GaugeIcon size={14} />} />
      {/* the deepest section by design — a full-width instrument moment, copy below */}
      <div className="mt-10 flex flex-col gap-12">
        <DecayGauge />
        <div className="grid gap-x-14 gap-y-10 lg:grid-cols-2 lg:items-start">
          <div className="flex flex-col gap-6">
            <p className="max-w-xl text-[0.98rem] leading-relaxed text-[var(--v20-muted)]">{c.lead}</p>
            {/* official strata as a hairline instrument legend */}
            <div>
              <h4 className="mb-1 flex items-center gap-2 text-[0.72rem] font-medium uppercase tracking-[0.14em] text-[var(--v20-muted)]">
                <Layers size={13} className="text-[var(--v20-amber)]" />
                {c.strataTitle}
              </h4>
              <dl className="border-y border-[var(--v20-line)]">
                {c.strata.map((s) => (
                  <div
                    key={s.label}
                    className="flex items-baseline justify-between gap-4 border-t border-[var(--v20-line)] py-2.5 first:border-t-0"
                  >
                    <dt className="text-[0.86rem] text-[var(--v20-muted)]">{s.label}</dt>
                    <dd className="v20-tnum v20-display text-[1.5rem] font-bold leading-none text-[var(--v20-ink)]">
                      {s.n}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <ul className="flex flex-col gap-3">
              {c.points.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-[0.9rem] text-[var(--v20-ink)]">
                  <span className="mt-0.5 text-[var(--v20-amber)]">
                    <Check size={16} strokeWidth={2.4} />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
            <p className="rounded-lg border border-[color-mix(in_srgb,var(--v20-amber)_28%,var(--v20-line))] bg-[color-mix(in_srgb,var(--v20-amber)_5%,var(--v20-surface))] px-4 py-3.5 text-[0.9rem] font-medium leading-relaxed text-[var(--v20-ink)]">
              {c.moat}
            </p>
          </div>
        </div>
      </div>
    </CritSection>
  );
}

/* ── Decay gauge (once-on-enter: sweep up, then honestly decay) ─────── */
const DECAY_PEAK = 66;
const DECAY_END = 63; // honest resting value — the dial settles here, never oversells
function DecayGauge() {
  const ref = useRef<HTMLDivElement>(null);
  // Default to the settled honest value so no-JS / reduced-motion / headless
  // renders show a true reading, not the transient peak.
  const [decayVal, setDecayVal] = useState(DECAY_END);
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const el = ref.current;
      if (!el) return;
      const dObj = { v: 0 };
      const set = () => setDecayVal(dObj.v);
      // Time-ordered story of learning-then-forgetting: sweep 0→peak, hold,
      // then ease down a few points and stop. Not reversible on scroll.
      const tl = gsap.timeline({
        scrollTrigger: { trigger: el, start: "top 75%", toggleActions: "play none none none" },
      });
      tl.to(dObj, { v: DECAY_PEAK, duration: 1.1, ease: "power3.out", onUpdate: set })
        .to(dObj, { v: DECAY_END, duration: 0.9, ease: "power2.inOut", onUpdate: set }, "+=0.45");
      return () => {
        tl.scrollTrigger?.kill();
        tl.kill();
      };
    });
    return () => mm.revert();
  }, []);
  return (
    <div ref={ref} className="v20-panel v20-graph !p-6 sm:!p-8">
      <div className="grid items-center gap-8 lg:grid-cols-[1fr_minmax(300px,420px)_1fr]">
        {/* left — caption + big calibrated readout */}
        <div className="flex flex-col gap-1.5 lg:pl-2">
          <span className="text-[0.7rem] font-medium uppercase tracking-[0.16em] text-[var(--v20-muted)]">
            {copy.c5.caption}
          </span>
          <span aria-live="polite" className="v20-tnum v20-display text-[3rem] font-bold leading-none text-[var(--v20-amber)]">
            {Math.round(decayVal)}%
          </span>
          <span className="text-[0.8rem] text-[var(--v20-muted)]">P(складу)</span>
        </div>
        {/* center — the instrument */}
        <div className="mx-auto w-full">
          <Gauge value={decayVal} ariaLabel="Готовність (демо спаду)" />
          <div className="flex items-center justify-between px-2 text-[0.68rem] text-[var(--v20-muted)]">
            <span>{copy.c5.scaleLow}</span>
            <span>{copy.c5.scaleHigh}</span>
          </div>
        </div>
        {/* right — honest decay note */}
        <p className="rounded-md border border-dashed border-[var(--v20-line)] px-4 py-3 text-[0.8rem] leading-relaxed text-[var(--v20-muted)] lg:mr-2">
          {copy.c5.decayNote}
        </p>
      </div>
    </div>
  );
}

/* ── Plan picker (date → plan preview) ────────────────────────────── */
const TOTAL_Q = 2322;
function PlanPicker() {
  const c = copy.c4;
  const [date, setDate] = useState("");
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
  const MAX_PER_DAY = 60;
  const hasPlan = days > 0;
  const rawPerDay = hasPlan ? Math.ceil(TOTAL_Q / days) : 0;
  const perDay = Math.min(rawPerDay, MAX_PER_DAY);
  const intense = hasPlan && rawPerDay > MAX_PER_DAY;
  const minDate =
    todayMs !== null ? new Date(todayMs + 86400000).toISOString().slice(0, 10) : undefined;

  return (
    <div className="v20-graph rounded-xl border border-[var(--v20-line)] bg-[var(--v20-bg)] p-6">
      <label htmlFor="v20-exam-date" className="block text-[0.78rem] font-medium uppercase tracking-[0.14em] text-[var(--v20-muted)]">
        {c.dateLabel}
      </label>
      <input
        id="v20-exam-date"
        type="date"
        min={minDate}
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="v20-tnum mt-2 w-full rounded-lg border border-[var(--v20-line)] bg-[var(--v20-surface)] px-3.5 py-3 text-[0.95rem] text-[var(--v20-ink)] outline-none focus:border-[var(--v20-amber)]"
      />
      <div aria-live="polite" className="mt-5 rounded-lg border border-[var(--v20-line)] bg-[var(--v20-surface)] p-4">
        {hasPlan ? (
          <>
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="v20-tnum v20-display text-[2.4rem] font-bold leading-none text-[var(--v20-amber)]">{perDay}</div>
                <div className="mt-1 text-[0.78rem] text-[var(--v20-muted)]">{c.perDayUnit}</div>
              </div>
              <div className="text-right">
                <div className="v20-tnum v20-display text-[2.4rem] font-bold leading-none text-[var(--v20-ink)]">{days}</div>
                <div className="mt-1 text-[0.78rem] text-[var(--v20-muted)]">{c.daysUnit}</div>
              </div>
            </div>
            {intense && (
              <p className="mt-4 flex items-center gap-2 rounded-md border border-[color-mix(in_srgb,var(--v20-amber)_35%,var(--v20-line))] bg-[color-mix(in_srgb,var(--v20-amber)_8%,var(--v20-surface))] px-3 py-2 text-[0.8rem] text-[var(--v20-cta)]">
                <TimerReset size={14} />
                {c.intense}
              </p>
            )}
          </>
        ) : (
          <p className="py-4 text-center text-[0.88rem] text-[var(--v20-muted)]">{c.noDate}</p>
        )}
      </div>
      <a href="/register" className="v20-btn-amber v20-btn-lg mt-5 w-full justify-center">
        {copy.verdict.cta}
        <ArrowRight size={17} />
      </a>
    </div>
  );
}

/* ── ВИСНОВОК — verdict / pricing (single card) ───────────────────── */
function Verdict() {
  const v = copy.verdict;
  return (
    <section id={v.id} className="border-t border-[var(--v20-line)] bg-[var(--v20-bg)]">
      <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
        <span data-rule className="mb-10 block h-px w-full origin-left bg-[var(--v20-line)]" />
        <header className="max-w-2xl">
          <div className="mb-4 text-[0.72rem] font-medium uppercase tracking-[0.16em] text-[var(--v20-muted)]">
            {v.index}
          </div>
          <h2 className="v20-display text-[clamp(1.8rem,4.4vw,2.7rem)] leading-[1.05] text-[var(--v20-ink)]">{v.title}</h2>
          <p className="mt-4 text-[1rem] leading-relaxed text-[var(--v20-muted)]">{v.lead}</p>
        </header>

        {/* completed protocol ledger */}
        <div data-stagger className="mt-10 overflow-hidden rounded-xl border border-[var(--v20-line)] bg-[var(--v20-surface)]">
          {v.ledger.map((row) => (
            <div key={row.n} data-cell className="flex items-center gap-3.5 border-b border-[var(--v20-line)] px-4 py-3.5 last:border-0 sm:px-6">
              <span data-tick className="shrink-0">
                <CheckSlot size={30} />
              </span>
              <span className="v20-tnum text-[0.78rem] font-semibold text-[var(--v20-muted)]">{row.n}</span>
              <span className="text-[0.92rem] font-medium text-[var(--v20-ink)]">{row.name}</span>
              <span className="ml-auto">
                {row.tone === "free" ? (
                  <span className="inline-flex items-center gap-1.5 text-[0.76rem] font-semibold text-[var(--v20-pass)]">
                    <Check size={13} strokeWidth={2.6} />
                    безкоштовно
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[0.76rem] font-semibold text-[var(--v20-ink)]">
                    <Wallet size={13} className="text-[var(--v20-amber)]" />
                    у доступі
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-x-14 gap-y-10 lg:grid-cols-[0.9fr_1.1fr]">
          {/* price card */}
          <div className="v20-graph flex flex-col rounded-2xl border border-[var(--v20-line)] bg-[var(--v20-surface)] p-7">
            <div className="flex items-end gap-1">
              <span className="v20-tnum v20-display text-[3.8rem] font-bold leading-none text-[var(--v20-ink)]">{v.price}</span>
              <span className="v20-display mb-1.5 text-[1.7rem] font-semibold text-[var(--v20-ink)]">{v.currency}</span>
            </div>
            <p className="mt-3 text-[0.9rem] leading-relaxed text-[var(--v20-muted)]">{v.framing}</p>
            <a href="/register" className="v20-btn-amber v20-btn-lg mt-6 w-full justify-center">
              {v.cta}
              <ArrowRight size={17} />
            </a>
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5">
              {v.trust.map((t) => (
                <span key={t} className="flex items-center gap-1.5 text-[0.78rem] text-[var(--v20-muted)]">
                  <ShieldCheck size={13} className="text-[var(--v20-pass)]" />
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* free vs paid ledger */}
          <div className="flex flex-col gap-6">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-[color-mix(in_srgb,var(--v20-pass)_10%,var(--v20-surface))] px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-wider text-[var(--v20-pass)]">
                  <Check size={12} strokeWidth={2.6} />
                  {v.freeTitle}
                </span>
              </div>
              <ul className="flex flex-col">
                {v.free.map((it) => (
                  <li key={it} className="flex items-baseline gap-2 border-b border-dotted border-[var(--v20-line)] py-2.5 text-[0.9rem] text-[var(--v20-ink)] last:border-0">
                    <span className="text-[var(--v20-pass)]">
                      <Check size={14} strokeWidth={2.4} />
                    </span>
                    {it}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-[color-mix(in_srgb,var(--v20-amber)_12%,var(--v20-surface))] px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-wider text-[var(--v20-cta)]">
                  <Wallet size={12} />
                  {v.paidTitle}
                </span>
              </div>
              <ul className="flex flex-col">
                {v.paid.map((it) => (
                  <li key={it} className="flex items-baseline gap-2 border-b border-dotted border-[var(--v20-line)] py-2.5 text-[0.9rem] text-[var(--v20-ink)] last:border-0">
                    <span className="text-[var(--v20-amber)]">
                      <Check size={14} strokeWidth={2.4} />
                    </span>
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* anchors + fail-safe */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {v.anchors.map((a) => (
            <p key={a} className="flex items-start gap-2.5 rounded-lg border border-[var(--v20-line)] bg-[var(--v20-surface)] px-4 py-3.5 text-[0.85rem] text-[var(--v20-ink)]">
              <Wallet size={16} className="mt-0.5 shrink-0 text-[var(--v20-amber)]" />
              {a}
            </p>
          ))}
          <p className="flex items-start gap-2.5 rounded-lg border border-[var(--v20-line)] bg-[var(--v20-surface)] px-4 py-3.5 text-[0.85rem] text-[var(--v20-ink)]">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[var(--v20-pass)]" />
            {v.failsafe}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── Scoped CSS ───────────────────────────────────────────────────── */
const v20css = `
.v20-scope{
  --v20-bg:#F7F9FA; --v20-surface:#FFFFFF; --v20-ink:#101826;
  --v20-amber:#D97706; --v20-cta:#B45309; --v20-pass:#0F766E;
  --v20-line:#E3E8EC; --v20-muted:#5A6675; --v20-slate:#64748B; --v20-tick:#94A3B8;
  --v20-foot:#0B1220;
  background:var(--v20-bg);
  color:var(--v20-ink);
  font-family:var(--v20-body),system-ui,sans-serif;
  -webkit-font-smoothing:antialiased;
}
.v20-display{ font-family:var(--v20-display),system-ui,sans-serif; font-weight:700; letter-spacing:-0.02em; }
.v20-tnum{ font-variant-numeric:tabular-nums; font-feature-settings:"tnum" 1; }
.v20-progress{
  position:fixed; top:0; left:0; z-index:40;
  height:2px; width:100%; transform-origin:left center; transform:scaleX(0);
  background:linear-gradient(90deg, var(--v20-amber), var(--v20-cta));
}
.v20-panel{
  border:1px solid var(--v20-line); border-radius:0.85rem;
  background:var(--v20-surface); padding:1.05rem; display:flex; flex-direction:column; gap:0.55rem;
}
.v20-graph{
  background-image:
    repeating-linear-gradient(0deg, color-mix(in srgb, var(--v20-line) 55%, transparent) 0 1px, transparent 1px 8px),
    repeating-linear-gradient(90deg, color-mix(in srgb, var(--v20-line) 55%, transparent) 0 1px, transparent 1px 8px);
  background-color:var(--v20-surface);
}
.v20-grid{
  background-image:
    repeating-linear-gradient(0deg, color-mix(in srgb, var(--v20-line) 40%, transparent) 0 1px, transparent 1px 32px),
    repeating-linear-gradient(90deg, color-mix(in srgb, var(--v20-line) 40%, transparent) 0 1px, transparent 1px 32px);
}
.v20-slot{
  display:inline-grid; place-items:center; border-radius:999px;
  border:1.5px solid var(--v20-line); background:var(--v20-surface); flex:none;
}
.v20-slot.is-ticked{
  border-color:color-mix(in srgb, var(--v20-pass) 45%, var(--v20-line));
  background:color-mix(in srgb, var(--v20-pass) 9%, var(--v20-surface));
}
.v20-mini-meter{
  display:inline-block; width:54px; height:6px; border-radius:999px;
  background:var(--v20-line); overflow:hidden;
}
.v20-mini-fill{
  display:block; height:100%; width:100%; border-radius:999px;
  transform-origin:left center; transform:scaleX(0);
  background:linear-gradient(90deg, var(--v20-amber), var(--v20-cta));
  transition:transform .1s linear;
}
.v20-btn-amber{
  display:inline-flex; align-items:center; gap:0.5rem;
  /* CTA fill #B45309 so white label clears WCAG AA (5.02:1). */
  background:var(--v20-cta); color:#fff; font-weight:600;
  padding:0.55rem 1.05rem; border-radius:999px; font-size:0.9rem;
  border:1px solid color-mix(in srgb, var(--v20-cta) 82%, #000 12%);
  transition:background .18s ease, transform .1s ease;
}
.v20-btn-amber:hover{ background:color-mix(in srgb, var(--v20-cta) 88%, #000); }
.v20-btn-amber:active{ transform:translateY(1px); }
.v20-btn-lg{ padding:0.8rem 1.5rem; font-size:0.98rem; }
.v20-btn-ghost{
  display:inline-flex; align-items:center; gap:0.4rem;
  color:var(--v20-ink); font-weight:500; font-size:0.95rem;
  padding:0.8rem 1.2rem; border-radius:999px;
  border:1px solid var(--v20-line); background:var(--v20-surface);
  transition:border-color .18s ease;
}
.v20-btn-ghost:hover{ border-color:var(--v20-amber); }
.v20-scope a{ text-underline-offset:3px; }
.v20-scope input[type=date]::-webkit-calendar-picker-indicator{ opacity:0.5; cursor:pointer; }
.v20-foot{ background:var(--v20-foot); }
.v20-ghost{
  position:absolute; left:-0.5rem; bottom:-1.4rem; z-index:0;
  font-size:clamp(4rem,17vw,12rem); font-weight:700; line-height:1;
  letter-spacing:-0.04em; white-space:nowrap;
  color:color-mix(in srgb, white 5%, transparent);
  pointer-events:none; user-select:none;
}
@media (prefers-reduced-motion: reduce){
  .v20-mini-fill{ transition:none; }
}
`;
