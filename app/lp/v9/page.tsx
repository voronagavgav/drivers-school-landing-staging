"use client";

/* ═══════════════════════════════════════════════════════════════════════
   Landing v9 — art direction «Конспект»
   Loud rounded-slab zine on cool stone-gray dot-grid notebook paper.
   One typeface carries the page (Bitter Black 900); two colors
   (blackberry #3B2144 + chartreuse #C8F04B, capped ~5% = «you got it right»).
   Public static marketing page — no server imports.
   ═══════════════════════════════════════════════════════════════════════ */

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
  type HTMLAttributes,
} from "react";
import Link from "next/link";
import { Bitter, Commissioner, JetBrains_Mono } from "next/font/google";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Gauge,
  CalendarDays,
  Timer,
  ShieldCheck,
  BookOpen,
  Bell,
  BarChart3,
  Plus,
  Minus,
  RotateCcw,
} from "lucide-react";
import { copy, STATS, HERO_VARIANTS, ACTIVE_HERO } from "./copy";

/* ── Fonts (declared locally, cyrillic verified) ─────────────────────── */
const bitter = Bitter({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["500", "700", "900"],
  variable: "--v9-slab",
  display: "swap",
});
const commissioner = Commissioner({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  variable: "--v9-body",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600"],
  variable: "--v9-mono",
  display: "swap",
});

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const H = HERO_VARIANTS[ACTIVE_HERO];

/* ═══════════════════════════════════════════════════════════════════════
   Small primitives
   ═══════════════════════════════════════════════════════════════════════ */

/** Tiny all-caps mono label. */
function Mono({
  children,
  className = "",
  ...rest
}: { children: ReactNode; className?: string } & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={`v9-mono ${className}`} style={{ fontFamily: "var(--v9-mono)" }} {...rest}>
      {children}
    </span>
  );
}

/** Full-width 1px hairline rule. */
function Rule({ dotted = false }: { dotted?: boolean }) {
  return <div className={dotted ? "v9-rule v9-rule-dotted" : "v9-rule"} aria-hidden />;
}

/* ═══════════════════════════════════════════════════════════════════════
   Readiness dial — SVG semicircle gauge, chartreuse fill, honest decay
   ═══════════════════════════════════════════════════════════════════════ */

function polar(cx: number, cy: number, r: number, frac: number) {
  const a = Math.PI * (1 - Math.min(1, Math.max(0, frac)));
  const rnd = (n: number) => Math.round(n * 100) / 100;
  return { x: rnd(cx + r * Math.cos(a)), y: rnd(cy - r * Math.sin(a)) };
}
function semiArc(cx: number, cy: number, r: number) {
  const s = polar(cx, cy, r, 0);
  const e = polar(cx, cy, r, 1);
  return `M ${s.x} ${s.y} A ${r} ${r} 0 0 1 ${e.x} ${e.y}`;
}

function Dial() {
  const valRef = useRef<SVGPathElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const W = 300;
  const Hh = 172;
  const cx = W / 2;
  const cy = 156;
  const r = 128;
  const d = semiArc(cx, cy, r);

  useIso(() => {
    const val = valRef.current;
    const num = numRef.current;
    const wrap = wrapRef.current;
    if (!val || !num || !wrap) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const setState = (frac: number) => {
      val.style.strokeDashoffset = String(1 - frac);
      num.textContent = String(Math.round(frac * 100));
    };

    if (reduce) {
      setState(0.68);
      return;
    }

    // default DOM state is already the filled 68% (no gate) — only reset to 0
    // when the fill animation actually begins on scroll-enter.
    const ctx = gsap.context(() => {
      const st = { v: 0 };
      const tl = gsap.timeline({
        scrollTrigger: { trigger: wrap, start: "top 82%", once: true },
        onStart: () => setState(0),
      });
      tl.to(st, {
        v: 0.74,
        duration: 1.1,
        ease: "power3.out",
        onUpdate: () => setState(st.v),
      })
        // honest decay — the dial can go DOWN
        .to(st, {
          v: 0.68,
          duration: 0.9,
          ease: "power1.inOut",
          onUpdate: () => setState(st.v),
          delay: 0.35,
        });
    }, wrap);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={wrapRef} className="v9-dial">
      <svg viewBox={`0 0 ${W} ${Hh}`} width="100%" role="img" aria-label={copy.dial.dialLabel}>
        <path d={d} fill="none" stroke="rgba(38,32,43,0.14)" strokeWidth={16} strokeLinecap="round" />
        <path
          ref={valRef}
          d={d}
          fill="none"
          stroke="var(--v9-accent)"
          strokeWidth={16}
          strokeLinecap="round"
          pathLength={1}
          style={{ strokeDasharray: 1, strokeDashoffset: 0.32 }}
        />
      </svg>
      <div className="v9-dial-center">
        <span className="v9-dial-num">
          <span ref={numRef}>68</span>
          <i>%</i>
        </span>
        <Mono className="v9-dial-cap">{copy.dial.dialLabel}</Mono>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Hero mechanic — answer one real official question, chartreuse flash
   ═══════════════════════════════════════════════════════════════════════ */

function HeroDemo() {
  const [picked, setPicked] = useState<number | null>(null);
  const meterRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const answered = picked !== null;
  const correct = picked === copy.hero.demo.correct;

  useEffect(() => {
    if (!correct) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const meter = meterRef.current;
    const card = cardRef.current;
    if (reduce) {
      if (meter) meter.style.width = "34%";
      return;
    }
    const ctx = gsap.context(() => {
      if (meter) gsap.fromTo(meter, { width: "0%" }, { width: "34%", duration: 0.6, ease: "power3.out" });
      if (card) gsap.fromTo(card, { scale: 1.03 }, { scale: 1, duration: 0.25, ease: "power3.out" });
    });
    return () => ctx.revert();
  }, [correct]);

  return (
    <div
      id="v9-try"
      ref={cardRef}
      className={`v9-demo ${answered ? (correct ? "is-correct" : "is-wrong") : ""}`}
    >
      <div className="v9-demo-top">
        <Mono>{copy.hero.demo.label}</Mono>
        <Mono className="v9-demo-tag">ЖИВА ВПРАВА</Mono>
      </div>
      <p className="v9-demo-q">{copy.hero.demo.question}</p>
      <div className="v9-demo-opts" role="group" aria-label={copy.hero.demo.question}>
        {copy.hero.demo.options.map((opt, i) => {
          const isPicked = picked === i;
          const isRight = i === copy.hero.demo.correct;
          const cls = answered
            ? isRight
              ? "is-right"
              : isPicked
                ? "is-chosen-wrong"
                : "is-dim"
            : "";
          return (
            <button
              key={opt}
              type="button"
              className={`v9-opt ${cls}`}
              onClick={() => !answered && setPicked(i)}
              disabled={answered}
            >
              <span className="v9-opt-key">{String.fromCharCode(65 + i)}</span>
              <span>{opt}</span>
              {answered && isRight && <Check className="v9-opt-check" strokeWidth={2.5} />}
            </button>
          );
        })}
      </div>

      <div className="v9-demo-foot">
        <div className="v9-meter" aria-hidden>
          <div ref={meterRef} className="v9-meter-fill" style={{ width: answered && correct ? undefined : "0%" }} />
        </div>
        <div className="v9-demo-note-row">
          <p className="v9-demo-note" aria-live="polite">
            {answered
              ? correct
                ? copy.hero.demo.correctNote
                : copy.hero.demo.wrongNote
              : "Обери відповідь — жодної реєстрації."}
          </p>
          {answered && !correct && (
            <button type="button" className="v9-demo-retry" onClick={() => setPicked(null)}>
              <RotateCcw strokeWidth={2.2} /> Спробувати ще раз
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Exam-date planner — «≈N днів × M питань/день»
   ═══════════════════════════════════════════════════════════════════════ */

function Planner() {
  const [date, setDate] = useState("");
  const [plan, setPlan] = useState<{ days: number; perDay: number; intensive: boolean } | null>(null);
  const perDayRef = useRef<HTMLSpanElement>(null);

  const compute = useCallback((value: string) => {
    if (!value) {
      setPlan(null);
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(value + "T00:00:00");
    const days = Math.max(1, Math.ceil((target.getTime() - today.getTime()) / 86_400_000));
    const perDay = Math.ceil(STATS.bank / days);
    const next = { days, perDay, intensive: days < 7 };

    // counter tween on the perDay number
    const el = perDayRef.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (el && !reduce) {
      const from = { n: Number(el.textContent) || 0 };
      gsap.to(from, {
        n: perDay,
        duration: 0.45,
        ease: "power2.out",
        onUpdate: () => (el.textContent = String(Math.round(from.n))),
      });
    }
    setPlan(next);
  }, []);

  return (
    <div className="v9-planner">
      <label className="v9-planner-field">
        <Mono>{copy.planner.inputLabel}</Mono>
        <input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            compute(e.target.value);
          }}
          className="v9-date"
        />
      </label>

      <div className="v9-planner-out" aria-live="polite">
        {!plan ? (
          <p className="v9-planner-empty">{copy.planner.empty}</p>
        ) : (
          <>
            <div className="v9-planner-eq">
              <span className="v9-eq-block">
                <span className="v9-eq-num">≈{plan.days}</span>
                <Mono>{copy.planner.daysWord(plan.days)}</Mono>
              </span>
              <span className="v9-eq-x">×</span>
              <span className="v9-eq-block">
                <span className="v9-eq-num v9-eq-accent">
                  <span ref={perDayRef}>{plan.perDay}</span>
                </span>
                <Mono>{copy.planner.perDayUnit}</Mono>
              </span>
            </div>
            {plan.intensive && <Mono className="v9-tag-intensive">{copy.planner.intensive}</Mono>}
            <p className="v9-planner-note">
              {plan.intensive ? copy.planner.intensiveNote : copy.planner.normalNote}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   FAQ — dotted-rule accordion with mono markers
   ═══════════════════════════════════════════════════════════════════════ */

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="v9-faq">
      {copy.faq.items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className="v9-faq-row">
            <button
              type="button"
              className="v9-faq-q"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : i)}
            >
              <Mono className="v9-faq-idx">{String(i + 1).padStart(2, "0")}</Mono>
              <span className="v9-faq-qt">{item.q}</span>
              {isOpen ? <Minus className="v9-faq-ic" strokeWidth={2} /> : <Plus className="v9-faq-ic" strokeWidth={2} />}
            </button>
            <div className="v9-faq-a" data-open={isOpen}>
              <p>{item.a}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════════════════════ */

export default function LandingV9() {
  const rootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const l1Ref = useRef<HTMLSpanElement>(null);
  const l2Ref = useRef<HTMLSpanElement>(null);

  useIso(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      // (1) hero slab two-line block-slide from behind inline masks
      if (!reduce) {
        const lines = [l1Ref.current, l2Ref.current].filter(Boolean) as HTMLElement[];
        gsap.set(lines, { yPercent: 112 });
        gsap.to(lines, {
          yPercent: 0,
          duration: 0.9,
          ease: "expo.out",
          stagger: 0.14,
          delay: 0.05,
        });

        // (2) dot-grid parallax drift at 0.9x scroll — compositor-only
        // transform (the layer is oversized so translating it never exposes an
        // edge), instead of repainting a full-viewport radial-gradient per frame.
        if (gridRef.current) {
          gsap.to(gridRef.current, {
            y: 220,
            ease: "none",
            scrollTrigger: { start: 0, end: "max", scrub: 1 },
          });
        }

        // section reveals — TRANSFORM ONLY, never gate visibility (opacity stays
        // 1) so a headless/unscrolled render never ships blank sections.
        gsap.utils.toArray<HTMLElement>(".v9-reveal").forEach((el) => {
          gsap.from(el, {
            y: 24,
            duration: 0.7,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          });
        });

        // (4) mono strip / stat labels char stagger — per-char RISE (transform
        // only), so chars are always visible even if the trigger never fires.
        gsap.utils.toArray<HTMLElement>(".v9-typewrite").forEach((el) => {
          const chars = el.querySelectorAll<HTMLElement>("i");
          if (!chars.length) return;
          gsap.from(chars, {
            yPercent: 60,
            duration: 0.35,
            stagger: 0.012,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 94%", once: true },
          });
        });
      }
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      className={`${bitter.variable} ${commissioner.variable} ${mono.variable} v9-root`}
    >
      <style>{V9_CSS}</style>

      {/* dot-grid paper ground + hairline page frame */}
      <div ref={gridRef} className="v9-grid" aria-hidden />
      <div className="v9-frame" aria-hidden />

      <main className="v9-main">
        {/* ─────────────────────────── HERO ─────────────────────────── */}
        <section className="v9-hero">
          <header className="v9-topbar">
            <span className="v9-brand" style={{ fontFamily: "var(--v9-slab)" }}>
              {copy.brand}
            </span>
            <Mono className="v9-topbar-note">теорія ПДР · кат. B</Mono>
          </header>

          <h1 className="v9-display">
            <span className="v9-line">
              <span ref={l1Ref} className="v9-line-in">
                {H.line1}
              </span>
            </span>
            <span className="v9-line">
              <span ref={l2Ref} className="v9-line-in">
                {H.line2}
              </span>
            </span>
          </h1>

          {/* Buzzsprout row: subhead-left / CTA-right */}
          <div className="v9-hero-row">
            <p className="v9-sub">{H.sub}</p>
            <div className="v9-cta-cluster">
              <Link href={copy.hero.ctaPrimaryHref} className="v9-btn v9-btn-primary">
                {copy.hero.ctaPrimary}
                <ArrowRight strokeWidth={2.4} />
              </Link>
              <Link href={copy.hero.ctaSecondaryHref} className="v9-btn v9-btn-ghost">
                {copy.hero.ctaSecondary}
              </Link>
            </div>
          </div>

          {/* proof-badge chips */}
          <ul className="v9-chips">
            {copy.hero.chips.map((c) => (
              <li key={c} className="v9-chip">
                {c}
              </li>
            ))}
          </ul>

          {/* hero mechanic */}
          <HeroDemo />

          {/* fold-closing mono strip */}
          <div className="v9-foldstrip">
            <Rule />
            <div className="v9-typewrite" aria-label={copy.hero.foldStrip} role="text">
              <Mono aria-hidden>
                {copy.hero.foldStrip.split("").map((ch, i) => (
                  <i key={i} style={{ fontStyle: "normal" }}>
                    {ch === " " ? " " : ch}
                  </i>
                ))}
              </Mono>
            </div>
          </div>
        </section>

        {/* ───────────────────── READINESS DIAL ─────────────────────── */}
        <section className="v9-section v9-dial-section">
          <div className="v9-two">
            <div className="v9-two-l v9-reveal">
              <Mono className="v9-kicker">
                <Gauge strokeWidth={2} /> {copy.dial.kicker}
              </Mono>
              <h2 className="v9-h2">{copy.dial.heading}</h2>
              <p className="v9-body">{copy.dial.body}</p>
              <p className="v9-body v9-moat">{copy.dial.moat}</p>
            </div>
            <div className="v9-two-r v9-reveal">
              <div className="v9-dial-card">
                <Dial />
                <div className="v9-dial-cap-row">
                  <span className="v9-dot-accent" />
                  <span>{copy.dial.caption}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Rule />

        {/* ──────────────────── BLACKBERRY INTERSTITIAL ─────────────── */}
        <section className="v9-inter">
          <div className="v9-inter-inner v9-reveal">
            <p className="v9-inter-big">{copy.interstitial.big}</p>
            <div className="v9-inter-foot">
              <p className="v9-inter-sub">{copy.interstitial.sub}</p>
              <Link href={copy.interstitial.ctaHref} className="v9-btn v9-btn-accent">
                {copy.interstitial.cta}
                <ArrowUpRight strokeWidth={2.4} />
              </Link>
            </div>
          </div>
        </section>

        {/* ───────────────────── EXAM-DATE PLANNER ──────────────────── */}
        <section className="v9-section">
          <div className="v9-two">
            <div className="v9-two-l v9-reveal">
              <Mono className="v9-kicker">
                <CalendarDays strokeWidth={2} /> {copy.planner.kicker}
              </Mono>
              <h2 className="v9-h2">{copy.planner.heading}</h2>
              <p className="v9-body">{copy.planner.body}</p>
            </div>
            <div className="v9-two-r v9-reveal">
              <Planner />
            </div>
          </div>
        </section>

        <Rule />

        {/* ─────────────────── EXAM SIMULATOR PROMISE ───────────────── */}
        <section className="v9-section">
          <Mono className="v9-kicker v9-reveal">
            <Timer strokeWidth={2} /> {copy.simulator.kicker}
          </Mono>
          <h2 className="v9-h2 v9-h2-wide v9-reveal">{copy.simulator.heading}</h2>
          <p className="v9-body v9-reveal" style={{ maxWidth: "56ch" }}>
            {copy.simulator.body}
          </p>
          <div className="v9-numgrid v9-reveal">
            {copy.simulator.stats.map((s) => (
              <div key={s.cap} className="v9-num">
                <span className="v9-num-n">{s.n}</span>
                <Mono className="v9-num-cap">{s.cap}</Mono>
              </div>
            ))}
          </div>
        </section>

        <Rule />

        {/* ────────────────────────── PRICING ───────────────────────── */}
        <section className="v9-section">
          <div className="v9-price-head v9-reveal">
            <div>
              <Mono className="v9-kicker">
                <ShieldCheck strokeWidth={2} /> {copy.pricing.kicker}
              </Mono>
              <h2 className="v9-h2">{copy.pricing.heading}</h2>
              <p className="v9-body">{copy.pricing.priceNote}</p>
              <p className="v9-body v9-anchor">{copy.pricing.anchor}</p>
            </div>
            <div className="v9-price-tag">
              <span className="v9-price-num">{copy.pricing.price}</span>
              <Mono>разово · не підписка</Mono>
            </div>
          </div>

          <div className="v9-price-cols v9-reveal">
            <div className="v9-price-col">
              <div className="v9-price-col-h">
                <Mono>{copy.pricing.freeTitle}</Mono>
              </div>
              <ul>
                {copy.pricing.free.map((f) => (
                  <li key={f}>
                    <Check strokeWidth={2.4} /> {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="v9-price-col v9-price-col-paid">
              <div className="v9-price-col-h">
                <Mono>{copy.pricing.paidTitle}</Mono>
              </div>
              <ul>
                {copy.pricing.paid.map((p, i) => {
                  const Icon = [Gauge, CalendarDays, Bell, BarChart3][i] ?? Check;
                  return (
                    <li key={p}>
                      <Icon strokeWidth={2} /> {p}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <p className="v9-failsafe v9-reveal">{copy.pricing.failsafe}</p>

          <div className="v9-trustband v9-reveal">
            {copy.pricing.trustBand.map((t) => (
              <Mono key={t}>{t}</Mono>
            ))}
          </div>

          <div className="v9-reveal" style={{ marginTop: "2rem" }}>
            <Link href={copy.pricing.ctaHref} className="v9-btn v9-btn-primary">
              {copy.pricing.cta}
              <ArrowRight strokeWidth={2.4} />
            </Link>
          </div>
        </section>

        <Rule />

        {/* ─────────────────── HONEST PROOF / БАЗА ──────────────────── */}
        <section className="v9-section">
          <div className="v9-base-head v9-reveal">
            <div>
              <Mono className="v9-kicker">
                <BookOpen strokeWidth={2} /> {copy.base.kicker}
              </Mono>
              <h2 className="v9-h2 v9-h2-wide">{copy.base.heading}</h2>
              <p className="v9-body" style={{ maxWidth: "58ch" }}>
                {copy.base.body}
              </p>
            </div>
            <span className="v9-badge">
              <span className="v9-dot-accent" /> {copy.base.badge}
            </span>
          </div>
          <div className="v9-numgrid v9-numgrid-3 v9-reveal">
            {copy.base.stats.map((s) => (
              <div key={s.cap} className="v9-num">
                <span className="v9-num-n">{s.n}</span>
                <Mono className="v9-num-cap">{s.cap}</Mono>
              </div>
            ))}
          </div>
        </section>

        <Rule />

        {/* ───────────────────────────  FAQ  ────────────────────────── */}
        <section className="v9-section">
          <div className="v9-two v9-two-faq">
            <div className="v9-two-l v9-reveal">
              <Mono className="v9-kicker">{copy.faq.kicker}</Mono>
              <h2 className="v9-h2">{copy.faq.heading}</h2>
            </div>
            <div className="v9-two-r v9-reveal">
              <Faq />
            </div>
          </div>
        </section>

        <Rule />

        {/* ─────────────────── FINAL CTA + MODE LAUNCHER ────────────── */}
        <section className="v9-section v9-final">
          <div className="v9-reveal">
            <h2 className="v9-h2 v9-h2-wide">{copy.finalCta.heading}</h2>
            <p className="v9-body">{copy.finalCta.sub}</p>
            <div style={{ marginTop: "1.6rem" }}>
              <Link href={copy.finalCta.ctaHref} className="v9-btn v9-btn-primary">
                {copy.finalCta.cta}
                <ArrowRight strokeWidth={2.4} />
              </Link>
            </div>
          </div>

          <div className="v9-modes v9-reveal">
            <Mono className="v9-modes-title">{copy.finalCta.modesTitle}</Mono>
            {copy.finalCta.modes.map((m) => (
              <Link key={m.label} href={m.href} className="v9-mode-row">
                <span>{m.label}</span>
                <ArrowRight strokeWidth={2.2} />
              </Link>
            ))}
          </div>
        </section>
      </main>

      {/* ─────────────────────────── FOOTER ───────────────────────────── */}
      <footer className="v9-footer">
        <div className="v9-footer-inner">
          <div className="v9-footer-top">
            <div>
              <span className="v9-footer-brand" style={{ fontFamily: "var(--v9-slab)" }}>
                {copy.brand}
              </span>
              <p className="v9-footer-tag">{copy.footer.tagline}</p>
            </div>
            {copy.footer.links.length > 0 && (
              <nav className="v9-footer-links">
                {copy.footer.links.map((l) => (
                  <Link key={l.label} href={l.href}>
                    {l.label}
                  </Link>
                ))}
              </nav>
            )}
          </div>
          <p className="v9-disclaimer">{copy.footer.disclaimer}</p>
          <div className="v9-footer-bottom">
            <Mono>{copy.footer.copyright}</Mono>
            <Mono>не офіційний сервіс ГСЦ МВС</Mono>
          </div>
        </div>
        <div className="v9-footer-ghost" aria-hidden style={{ fontFamily: "var(--v9-slab)" }}>
          {copy.footer.ghost}
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Scoped CSS — all v9-* to avoid collision with app globals
   ═══════════════════════════════════════════════════════════════════════ */

const V9_CSS = `
.v9-root{
  --v9-bg:#EDEAE4; --v9-surface:#F5F3EE; --v9-text:#26202B;
  --v9-primary:#3B2144; --v9-accent:#C8F04B; --v9-ink:#2B1733;
  --v9-hair:rgba(38,32,43,0.22);
  /* frame hairline reads on BOTH the light paper and the dark blackberry
     grounds (mid mauve-gray ≈ the tone halfway between #EDEAE4 and #2B1733) */
  --v9-frame-line:rgba(150,135,148,0.62);
  --v9-maxw:1120px;
  position:relative;
  background:var(--v9-bg);
  color:var(--v9-text);
  font-family:var(--v9-body),system-ui,sans-serif;
  font-size:18px; line-height:1.62;
  -webkit-font-smoothing:antialiased;
  overflow-x:clip;
}
.v9-root *{box-sizing:border-box;}

/* dot-grid paper ground — oversized (±280px) so the parallax transform can
   translate it without ever exposing a bare edge inside the viewport */
.v9-grid{
  position:fixed; top:-280px; left:0; right:0; height:calc(100vh + 560px);
  z-index:0; pointer-events:none; will-change:transform;
  background-image:radial-gradient(rgba(38,32,43,0.10) 1.1px, transparent 1.2px);
  background-size:26px 26px;
  background-position:0 0;
}
/* hairline page frame — z-index above the dark interstitial/footer (z-index:2)
   so the frame rails continuously through the chapter-break grounds */
.v9-frame{
  position:fixed; inset:14px; z-index:3; pointer-events:none;
  border:1px solid var(--v9-frame-line);
}
@media(max-width:640px){ .v9-frame{inset:9px;} }

.v9-main{ position:relative; z-index:2; max-width:var(--v9-maxw); margin:0 auto; padding:0 clamp(1.5rem,5vw,4rem); }

/* ── mono label ── */
.v9-mono{ font-size:0.72rem; letter-spacing:0.16em; text-transform:uppercase; font-weight:600; color:var(--v9-text); }

/* ── rules ── */
.v9-rule{ height:1px; background:var(--v9-hair); width:100%; }
.v9-rule-dotted{ background:none; border-top:1px dashed var(--v9-hair); height:0; }

/* ═══ HERO ═══ */
.v9-hero{ padding:clamp(0.75rem,2vw,2rem) 0 clamp(3rem,7vw,5rem); }
.v9-topbar{ display:flex; align-items:center; justify-content:space-between; padding-bottom:clamp(1.4rem,4.5vw,3.2rem); }
.v9-brand{ font-weight:900; font-size:1.05rem; letter-spacing:-0.01em; color:var(--v9-primary); }
.v9-topbar-note{ color:rgba(38,32,43,0.72); }

.v9-display{
  font-family:var(--v9-slab); font-weight:900; color:var(--v9-primary);
  font-size:clamp(2.7rem,11.5vw,6rem); line-height:0.92; letter-spacing:-0.02em;
  text-transform:uppercase; margin:0; text-wrap:balance;
}
.v9-line{ display:block; overflow:hidden; padding:0.02em 0; }
.v9-line-in{ display:block; }

.v9-hero-row{
  display:flex; align-items:flex-end; justify-content:space-between; gap:2rem;
  margin-top:clamp(1.1rem,4vw,2.4rem); flex-wrap:wrap;
}
.v9-sub{ font-size:clamp(1.05rem,2.2vw,1.28rem); font-weight:500; max-width:34ch; margin:0; color:var(--v9-text); text-wrap:pretty; }
.v9-cta-cluster{ display:flex; align-items:center; gap:1rem; flex-wrap:wrap; }

/* buttons */
.v9-btn{
  display:inline-flex; align-items:center; gap:0.5rem; font-family:var(--v9-body);
  font-weight:600; font-size:1rem; border-radius:999px; padding:0.85rem 1.5rem;
  text-decoration:none; transition:transform .18s ease, background .18s ease, color .18s ease; cursor:pointer; border:1px solid transparent;
}
.v9-btn svg{ width:1.05em; height:1.05em; }
.v9-btn-primary{ background:var(--v9-primary); color:var(--v9-surface); }
.v9-btn-primary:hover{ transform:translateY(-2px); background:#2f1a38; }
.v9-btn-ghost{ background:transparent; color:var(--v9-primary); border-color:var(--v9-hair); }
.v9-btn-ghost:hover{ border-color:var(--v9-primary); }
.v9-btn-accent{ background:var(--v9-accent); color:var(--v9-ink); }
.v9-btn-accent:hover{ transform:translateY(-2px); }

.v9-chips{ list-style:none; display:flex; flex-wrap:wrap; gap:0.6rem; margin:clamp(1.2rem,3vw,2.2rem) 0 0; padding:0; }
.v9-chip{
  font-size:0.82rem; font-weight:600; padding:0.4rem 0.85rem; border-radius:999px;
  border:1px solid var(--v9-hair); color:var(--v9-text); background:rgba(245,243,238,0.6);
}
/* mobile: collapse the chip cluster into ONE horizontally-scrolling row so it
   stops eating 2–3 stacked lines above the hero mechanic */
@media(max-width:640px){
  .v9-chips{ flex-wrap:nowrap; overflow-x:auto; scrollbar-width:none; margin-top:1rem; padding-bottom:2px; -webkit-overflow-scrolling:touch; }
  .v9-chips::-webkit-scrollbar{ display:none; }
  .v9-chip{ flex:none; white-space:nowrap; }
}

/* hero mechanic card */
.v9-demo{
  margin-top:clamp(1.4rem,4vw,2.8rem); background:var(--v9-surface);
  border:1px solid var(--v9-hair); border-radius:16px; padding:clamp(1.1rem,3vw,1.9rem);
  transform-origin:center; box-shadow:0 18px 44px -30px rgba(38,32,43,0.35);
  scroll-margin-top:2rem;
}
.v9-demo.is-correct{ box-shadow:0 0 0 2px var(--v9-accent), 0 18px 44px -28px rgba(38,32,43,0.4); }
.v9-demo-top{ display:flex; justify-content:space-between; align-items:center; gap:1rem; }
.v9-demo-tag{ color:rgba(38,32,43,0.78); }
.v9-demo-q{ font-family:var(--v9-slab); font-weight:700; font-size:clamp(1.15rem,2.5vw,1.5rem); line-height:1.25; margin:0.9rem 0 1.2rem; color:var(--v9-primary); }
.v9-demo-opts{ display:grid; grid-template-columns:1fr 1fr; gap:0.7rem; }
/* keep 2-up on phones (short «NN км/год» labels fit) so the mechanic stays
   compact and option A lands inside the first viewport; only stack when truly narrow */
@media(max-width:360px){ .v9-demo-opts{ grid-template-columns:1fr; } }
.v9-opt{
  display:flex; align-items:center; gap:0.7rem; text-align:left; font-family:var(--v9-body);
  font-size:1rem; font-weight:500; padding:0.85rem 1rem; border-radius:11px;
  border:1px solid var(--v9-hair); background:var(--v9-bg); color:var(--v9-text);
  cursor:pointer; transition:border-color .15s ease, background .15s ease, opacity .2s ease;
}
.v9-opt:hover:not(:disabled){ border-color:var(--v9-primary); }
.v9-opt:disabled{ cursor:default; }
.v9-opt-key{
  display:inline-flex; align-items:center; justify-content:center; width:1.55rem; height:1.55rem;
  border-radius:6px; background:rgba(38,32,43,0.08); font-family:var(--v9-mono); font-size:0.72rem; font-weight:600; flex:none;
}
.v9-opt.is-right{ border-color:var(--v9-accent); background:color-mix(in srgb, var(--v9-accent) 26%, var(--v9-surface)); }
.v9-opt.is-right .v9-opt-key{ background:var(--v9-accent); color:var(--v9-ink); }
.v9-opt.is-chosen-wrong{ border-color:rgba(38,32,43,0.4); opacity:0.85; }
.v9-opt.is-dim{ opacity:0.42; }
.v9-opt-check{ margin-left:auto; width:1.1rem; height:1.1rem; color:var(--v9-ink); }
.v9-demo-foot{ margin-top:clamp(0.9rem,3vw,1.2rem); }
.v9-meter{ height:8px; border-radius:99px; background:rgba(38,32,43,0.1); overflow:hidden; }
.v9-meter-fill{ height:100%; background:var(--v9-accent); border-radius:99px; }
.v9-demo-note-row{ display:flex; align-items:baseline; justify-content:space-between; gap:1rem; flex-wrap:wrap; }
.v9-demo-note{ margin:0.7rem 0 0; font-size:0.92rem; color:rgba(38,32,43,0.82); flex:1 1 auto; min-width:16ch; }
.v9-demo-retry{
  display:inline-flex; align-items:center; gap:0.4rem; margin-top:0.7rem; flex:none;
  background:none; border:none; padding:0; cursor:pointer; font-family:var(--v9-body);
  font-weight:600; font-size:0.9rem; color:var(--v9-primary); text-decoration:underline;
  text-underline-offset:3px; transition:color .15s ease;
}
.v9-demo-retry svg{ width:1em; height:1em; }
.v9-demo-retry:hover{ color:var(--v9-ink); }

/* fold strip */
.v9-foldstrip{ margin-top:clamp(1.1rem,3.5vw,3.6rem); }
.v9-foldstrip .v9-typewrite{ padding-top:0.9rem; }
.v9-foldstrip .v9-mono{ letter-spacing:0.14em; color:rgba(38,32,43,0.72); font-size:0.72rem; display:block; }
.v9-typewrite{ overflow:hidden; }
.v9-typewrite i{ display:inline-block; }

/* ═══ generic section ═══ */
.v9-section{ padding:clamp(4rem,9vw,7.5rem) 0; }
.v9-kicker{ display:inline-flex; align-items:center; gap:0.5rem; color:var(--v9-primary); margin-bottom:1.3rem; }
.v9-kicker svg{ width:0.95rem; height:0.95rem; }
.v9-h2{ font-family:var(--v9-slab); font-weight:900; color:var(--v9-primary); font-size:clamp(1.9rem,4.4vw,3rem); line-height:1.04; letter-spacing:-0.02em; margin:0 0 1.1rem; text-wrap:balance; }
.v9-h2-wide{ max-width:16ch; }
.v9-body{ font-size:1.06rem; color:var(--v9-text); max-width:46ch; margin:0 0 1rem; text-wrap:pretty; }
.v9-moat{ font-weight:500; color:var(--v9-primary); }
.v9-anchor{ font-weight:600; }

.v9-two{ display:grid; grid-template-columns:1fr 1fr; gap:clamp(2rem,6vw,5rem); align-items:center; }
@media(max-width:860px){ .v9-two{ grid-template-columns:1fr; gap:2.6rem; } }
.v9-two-faq{ align-items:start; }

/* dial card */
.v9-dial-card{ background:var(--v9-surface); border:1px solid var(--v9-hair); border-radius:18px; padding:clamp(1.5rem,4vw,2.5rem); }
.v9-dial{ position:relative; }
.v9-dial-center{ position:absolute; left:0; right:0; bottom:0.2rem; display:flex; flex-direction:column; align-items:center; }
.v9-dial-num{ font-family:var(--v9-slab); font-weight:900; font-size:clamp(2.6rem,7vw,3.6rem); color:var(--v9-primary); line-height:1; letter-spacing:-0.02em; }
.v9-dial-num i{ font-style:normal; font-size:0.42em; margin-left:0.05em; }
.v9-dial-cap{ margin-top:0.4rem; color:rgba(38,32,43,0.78); font-size:0.66rem; }
.v9-dial-cap-row{ display:flex; align-items:center; justify-content:center; gap:0.5rem; margin-top:1.4rem; font-size:0.92rem; font-weight:600; color:var(--v9-primary); }
.v9-dot-accent{ width:0.6rem; height:0.6rem; border-radius:99px; background:var(--v9-accent); flex:none; }

/* blackberry interstitial */
/* full-bleed blackberry interstitial — 100vw breakout out of the max-width main
   (root has overflow-x:clip so this never adds a horizontal scrollbar) */
.v9-inter{ position:relative; z-index:2; width:100vw; margin-left:calc(50% - 50vw); margin-right:calc(50% - 50vw); background:var(--v9-ink); color:var(--v9-surface); padding:clamp(3.5rem,8vw,6rem) clamp(1.5rem,5vw,4rem); }
.v9-inter-inner{ max-width:var(--v9-maxw); margin:0 auto; }
.v9-inter-big{ font-family:var(--v9-slab); font-weight:900; font-size:clamp(2rem,5.5vw,3.8rem); line-height:1.02; letter-spacing:-0.02em; margin:0; text-wrap:balance; color:var(--v9-surface); }
.v9-inter-foot{ display:flex; justify-content:space-between; align-items:flex-end; gap:2rem; margin-top:2.4rem; flex-wrap:wrap; }
.v9-inter-sub{ margin:0; font-size:1.1rem; max-width:34ch; color:rgba(245,243,238,0.82); }

/* planner */
.v9-planner{ background:var(--v9-surface); border:1px solid var(--v9-hair); border-radius:18px; padding:clamp(1.5rem,4vw,2.2rem); }
.v9-planner-field{ display:flex; flex-direction:column; gap:0.55rem; }
.v9-date{
  font-family:var(--v9-body); font-size:1.05rem; font-weight:500; padding:0.85rem 1rem;
  border-radius:11px; border:1px solid var(--v9-hair); background:var(--v9-bg); color:var(--v9-text); width:100%;
}
.v9-date:focus{ outline:2px solid var(--v9-primary); outline-offset:1px; }
.v9-planner-out{ margin-top:1.6rem; min-height:5.5rem; }
.v9-planner-empty{ margin:0; color:rgba(38,32,43,0.78); font-weight:500; }
.v9-planner-eq{ display:flex; align-items:flex-end; gap:1.1rem; }
.v9-eq-block{ display:flex; flex-direction:column; gap:0.3rem; }
.v9-eq-num{ font-family:var(--v9-slab); font-weight:900; font-size:clamp(2.2rem,6vw,3rem); line-height:1; color:var(--v9-primary); letter-spacing:-0.02em; }
/* isolate:isolate gives the span its own stacking context so the ::after's
   z-index:-1 sinks only below the number's text, not below the card surface */
.v9-eq-accent{ color:var(--v9-ink); position:relative; isolation:isolate; }
.v9-eq-accent::after{ content:""; position:absolute; left:0; right:0; bottom:-0.14em; height:0.28em; background:var(--v9-accent); z-index:-1; opacity:0.9; }
.v9-eq-x{ font-family:var(--v9-slab); font-weight:700; font-size:2rem; color:rgba(38,32,43,0.4); padding-bottom:0.3rem; }
.v9-tag-intensive{ display:inline-block; margin-top:1rem; background:var(--v9-accent); color:var(--v9-ink); padding:0.25rem 0.6rem; border-radius:6px; letter-spacing:0.12em; }
.v9-planner-note{ margin:1rem 0 0; font-size:0.95rem; color:rgba(38,32,43,0.78); }

/* number grids */
.v9-numgrid{ display:grid; grid-template-columns:repeat(3,1fr); gap:clamp(1rem,4vw,3rem); margin-top:clamp(2.5rem,5vw,3.5rem); border-top:1px dashed var(--v9-hair); padding-top:clamp(2rem,4vw,2.6rem); }
@media(max-width:560px){ .v9-numgrid{ grid-template-columns:1fr; gap:1.6rem; } }
.v9-num{ display:flex; flex-direction:column; gap:0.4rem; }
.v9-num-n{ font-family:var(--v9-slab); font-weight:900; font-size:clamp(3rem,8vw,4.8rem); line-height:0.9; color:var(--v9-primary); letter-spacing:-0.03em; }
.v9-num-cap{ color:rgba(38,32,43,0.72); }

/* pricing */
.v9-price-head{ display:flex; justify-content:space-between; align-items:flex-start; gap:2rem; flex-wrap:wrap; }
.v9-price-tag{ display:flex; flex-direction:column; align-items:flex-end; gap:0.4rem; text-align:right; }
.v9-price-num{ font-family:var(--v9-slab); font-weight:900; font-size:clamp(3rem,9vw,5rem); line-height:0.9; color:var(--v9-primary); letter-spacing:-0.03em; }
.v9-price-cols{ display:grid; grid-template-columns:1fr 1fr; gap:1.2rem; margin-top:clamp(2rem,4vw,2.8rem); }
@media(max-width:720px){ .v9-price-cols{ grid-template-columns:1fr; } }
.v9-price-col{ background:var(--v9-surface); border:1px solid var(--v9-hair); border-radius:16px; padding:clamp(1.4rem,3vw,1.9rem); }
.v9-price-col-paid{ background:var(--v9-ink); color:var(--v9-surface); }
.v9-price-col-h{ margin-bottom:1.2rem; }
.v9-price-col-paid .v9-mono{ color:var(--v9-accent); }
.v9-price-col ul{ list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:0.9rem; }
.v9-price-col li{ display:flex; align-items:center; gap:0.7rem; font-weight:500; }
.v9-price-col li svg{ width:1.1rem; height:1.1rem; flex:none; color:var(--v9-primary); }
.v9-price-col-paid li svg{ color:var(--v9-accent); }
.v9-failsafe{ margin:2rem 0 0; padding:1.2rem 1.4rem; border:1px dashed var(--v9-hair); border-radius:12px; font-size:0.98rem; font-weight:500; max-width:70ch; color:var(--v9-text); }
.v9-trustband{ display:flex; flex-wrap:wrap; gap:0.5rem 1.6rem; margin-top:1.6rem; align-items:center; }
.v9-trustband .v9-mono{ position:relative; padding-left:1rem; color:var(--v9-primary); }
.v9-trustband .v9-mono::before{ content:""; position:absolute; left:0; top:50%; transform:translateY(-50%); width:0.4rem; height:0.4rem; border-radius:99px; background:var(--v9-accent); }

/* base / proof */
.v9-base-head{ display:flex; justify-content:space-between; align-items:flex-start; gap:2rem; flex-wrap:wrap; }
.v9-badge{ display:inline-flex; align-items:center; gap:0.5rem; font-weight:600; font-size:0.9rem; padding:0.5rem 0.9rem; border:1px solid var(--v9-hair); border-radius:999px; background:var(--v9-surface); white-space:nowrap; }
.v9-numgrid-3 .v9-num-n{ font-size:clamp(2.6rem,7vw,4.4rem); }

/* faq */
.v9-faq{ display:flex; flex-direction:column; }
.v9-faq-row{ border-top:1px dashed var(--v9-hair); }
.v9-faq-row:last-child{ border-bottom:1px dashed var(--v9-hair); }
.v9-faq-q{ width:100%; display:flex; align-items:center; gap:1rem; background:none; border:none; cursor:pointer; padding:1.3rem 0; text-align:left; color:var(--v9-primary); font-family:var(--v9-body); }
.v9-faq-idx{ color:rgba(38,32,43,0.72); flex:none; }
.v9-faq-qt{ font-family:var(--v9-slab); font-weight:700; font-size:clamp(1.05rem,2.4vw,1.28rem); line-height:1.2; flex:1; }
.v9-faq-ic{ width:1.2rem; height:1.2rem; flex:none; color:var(--v9-primary); }
.v9-faq-a{ display:grid; grid-template-rows:0fr; transition:grid-template-rows .28s ease; }
.v9-faq-a[data-open="true"]{ grid-template-rows:1fr; }
.v9-faq-a > p{ overflow:hidden; margin:0; padding:0 0 0 0; color:var(--v9-text); font-size:1rem; max-width:60ch; }
.v9-faq-a[data-open="true"] > p{ padding-bottom:1.3rem; }

/* final cta + modes */
.v9-final{ display:grid; grid-template-columns:1.3fr 1fr; gap:clamp(2rem,6vw,5rem); align-items:center; }
@media(max-width:860px){ .v9-final{ grid-template-columns:1fr; gap:2.6rem; } }
.v9-modes{ display:flex; flex-direction:column; gap:0.7rem; }
.v9-modes-title{ color:rgba(38,32,43,0.72); margin-bottom:0.4rem; }
.v9-mode-row{
  display:flex; align-items:center; justify-content:space-between; gap:1rem;
  padding:1.1rem 1.3rem; border:1px solid var(--v9-hair); border-radius:12px;
  background:var(--v9-surface); text-decoration:none; color:var(--v9-primary);
  font-family:var(--v9-slab); font-weight:700; font-size:1.1rem; transition:transform .16s ease, border-color .16s ease;
}
.v9-mode-row svg{ width:1.15rem; height:1.15rem; color:var(--v9-primary); transition:transform .16s ease; }
.v9-mode-row:hover{ transform:translateX(4px); border-color:var(--v9-primary); }
.v9-mode-row:hover svg{ transform:translateX(3px); }

/* footer */
.v9-footer{ position:relative; z-index:2; background:var(--v9-ink); color:var(--v9-surface); overflow:hidden; margin-top:2rem; }
.v9-footer-inner{ position:relative; z-index:2; max-width:var(--v9-maxw); margin:0 auto; padding:clamp(3rem,6vw,4.5rem) clamp(1.5rem,5vw,4rem) clamp(9rem,20vw,14rem); }
.v9-footer-top{ display:flex; justify-content:space-between; gap:2rem; flex-wrap:wrap; align-items:flex-start; }
.v9-footer-brand{ font-weight:900; font-size:1.3rem; color:var(--v9-surface); }
.v9-footer-tag{ margin:0.6rem 0 0; max-width:36ch; color:rgba(245,243,238,0.72); font-size:0.98rem; }
.v9-footer-links{ display:flex; gap:1.6rem; }
.v9-footer-links a{ color:rgba(245,243,238,0.82); text-decoration:none; font-weight:500; font-size:0.95rem; }
.v9-footer-links a:hover{ color:var(--v9-accent); }
.v9-disclaimer{ margin:2.4rem 0 0; padding-top:1.6rem; border-top:1px solid rgba(245,243,238,0.14); font-size:0.86rem; line-height:1.6; color:rgba(245,243,238,0.6); max-width:80ch; }
.v9-footer-bottom{ display:flex; justify-content:space-between; gap:1rem; margin-top:1.4rem; flex-wrap:wrap; }
.v9-footer-bottom .v9-mono{ color:rgba(245,243,238,0.5); }
.v9-footer-ghost{
  position:absolute; left:0; right:0; bottom:-0.16em; z-index:1; pointer-events:none;
  font-weight:900; font-size:clamp(5rem,22vw,17rem); line-height:0.8; letter-spacing:-0.03em;
  color:rgba(245,243,238,0.05); text-align:center; white-space:nowrap;
}

@media(prefers-reduced-motion:reduce){
  .v9-btn:hover,.v9-mode-row:hover{ transform:none; }
}
`;
