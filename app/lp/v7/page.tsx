"use client";

/* ═══════════════════════════════════════════════════════════════════════
   Landing v7 — «Світанок»
   A painterly CSS/SVG dawn as the whole hero ground; one calm grotesque
   sentence set on it; the real product rising through the horizon at the
   fold. Near-black is the only accent — all colour lives in the sky.
   Public static marketing page. No server imports.
   ═══════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState, useCallback, useId } from "react";
import Link from "next/link";
import { Onest } from "next/font/google";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Check, X, Sun, Minus, Plus } from "lucide-react";
import { copy, HERO_VARIANTS, ACTIVE_HERO } from "./copy";

/* ── Font: Onest, single neo-grotesque family, cyrillic verified ─────── */
const onest = Onest({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--v7-onest",
  display: "swap",
});

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const H = HERO_VARIANTS[ACTIVE_HERO];

/* ═══════════════════════════════════════════════════════════════════════
   Painted-dawn atmosphere — layered radial gradients + SVG grain.
   ═══════════════════════════════════════════════════════════════════════ */
function DawnSky({ dusk = false }: { dusk?: boolean }) {
  return (
    <div className="v7-sky" data-dusk={dusk ? "true" : "false"} aria-hidden="true">
      <div className="v7-sky-blob v7-sky-blob--a" />
      <div className="v7-sky-blob v7-sky-blob--b" />
      <div className="v7-grain" />
    </div>
  );
}

/* Grain filter — one inline SVG, referenced by CSS as a data-uri background. */
const GRAIN_URI =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`,
  );

/* ═══════════════════════════════════════════════════════════════════════
   Readiness dial — SVG arc, fills once on enter.
   ═══════════════════════════════════════════════════════════════════════ */
function polar(cx: number, cy: number, r: number, frac: number) {
  const a = Math.PI * (1.15 - 1.3 * Math.min(1, Math.max(0, frac)));
  return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) };
}
function arc(cx: number, cy: number, r: number, from: number, to: number) {
  const s = polar(cx, cy, r, from);
  const e = polar(cx, cy, r, to);
  const large = to - from > 0.5 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

function Dial({ value, size = 232 }: { value: number; size?: number }) {
  const cx = size / 2;
  const cy = size / 2 + 14;
  const r = size / 2 - 22;
  const frac = Math.min(1, Math.max(0, value / 100));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="v7-dial" role="img"
      aria-label={`Готовність ${Math.round(value)} відсотків`}>
      <path d={arc(cx, cy, r, 0, 1)} className="v7-dial-track" />
      <path d={arc(cx, cy, r, 0, Math.max(0.0001, frac))} className="v7-dial-fill" />
      <text x={cx} y={cy - 4} className="v7-dial-num">{Math.round(value)}</text>
      <text x={cx} y={cy + 30} className="v7-dial-pct">% готовності</text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Hero interactive question card
   ═══════════════════════════════════════════════════════════════════════ */
function QuestionCard() {
  const q = copy.demoQuestion;
  const [picked, setPicked] = useState<number | null>(null);
  const [meter, setMeter] = useState(0);
  const answered = picked !== null;
  const correct = answered && q.options[picked!].correct;

  const choose = (i: number) => {
    if (answered) return;
    setPicked(i);
    const target = q.options[i].correct ? 24 : 11;
    const start = performance.now();
    const dur = 900;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 4);
      setMeter(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  return (
    <div className="v7-qcard">
      <div className="v7-qcard-top">
        <span className="v7-qcard-tag">{copy.hero.cardLabel}</span>
        <span className="v7-qcard-meter">
          <span className="v7-qcard-meter-track">
            <span className="v7-qcard-meter-fill" style={{ transform: `scaleX(${meter / 100})` }} />
          </span>
          <span className="v7-qcard-meter-num">{q.meterLabel} {meter}%</span>
        </span>
      </div>

      <p className="v7-qcard-prompt">{q.prompt}</p>

      <div className="v7-qcard-opts">
        {q.options.map((o, i) => {
          const isPicked = picked === i;
          const revealCorrect = answered && o.correct;
          const state = !answered
            ? "idle"
            : revealCorrect
              ? "correct"
              : isPicked
                ? "wrong"
                : "dim";
          return (
            <button
              key={i}
              type="button"
              onClick={() => choose(i)}
              disabled={answered}
              data-state={state}
              className="v7-opt"
            >
              <span className="v7-opt-mark" aria-hidden="true">
                {state === "correct" ? <Check size={15} strokeWidth={2.5} /> : state === "wrong" ? <X size={15} strokeWidth={2.5} /> : null}
              </span>
              <span className="v7-opt-text">{o.text}</span>
            </button>
          );
        })}
      </div>

      <p className="v7-qcard-foot" data-answered={answered ? "true" : "false"} data-correct={correct ? "true" : "false"}>
        {!answered ? q.meterHintStart : correct ? q.explanationCorrect : q.explanationWrong}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Decay demo — small dual-line SVG showing the dial dipping without review
   ═══════════════════════════════════════════════════════════════════════ */
function DecayDemo() {
  const ref = useRef<SVGSVGElement>(null);
  const W = 320, Hh = 120, pad = 10;
  // readiness that climbs then decays without review
  const pts = [72, 78, 81, 79, 74, 68, 63, 60, 58, 61];
  const path = pts
    .map((p, i) => {
      const x = pad + (i / (pts.length - 1)) * (W - pad * 2);
      const y = pad + (1 - (p - 45) / 50) * (Hh - pad * 2);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${Hh}`} className="v7-decay" aria-hidden="true">
      <path d={`${path}`} className="v7-decay-line" />
      {pts.map((p, i) => {
        const x = pad + (i / (pts.length - 1)) * (W - pad * 2);
        const y = pad + (1 - (p - 45) / 50) * (Hh - pad * 2);
        return <circle key={i} cx={x} cy={y} r={2.4} className="v7-decay-dot" />;
      })}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Exam-date planner
   ═══════════════════════════════════════════════════════════════════════ */
const BANK_TOTAL = 2322;
function Planner() {
  const p = copy.planner;
  const inputId = useId();
  const [date, setDate] = useState("");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let days = 0;
  let past = false;
  if (date) {
    const d = new Date(date + "T00:00:00");
    days = Math.round((d.getTime() - today.getTime()) / 86400000);
    if (days < 0) past = true;
  }
  // Divide the bank across the ACTUAL days remaining (floor of 10/day keeps a daily
  // habit on long horizons) — so days × perDay never implies a nonsense total like
  // 300 × 20 = 6000 answers against a 2322 bank.
  const perDay = days > 0 ? Math.max(10, Math.ceil(BANK_TOTAL / days)) : 0;
  const intensive = days > 0 && days < 7;
  const examToday = date !== "" && !past && days === 0;

  return (
    <div className="v7-plan-card">
      <label className="v7-plan-label" htmlFor={inputId}>{p.inputLabel}</label>
      <input
        id={inputId}
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="v7-plan-input"
      />

      <div className="v7-plan-out" aria-live="polite">
        {!date && <p className="v7-plan-fallback">{p.fallback}</p>}
        {date && past && <p className="v7-plan-fallback">{p.past}</p>}
        {examToday && <p className="v7-plan-today">{p.today}</p>}
        {date && !past && days > 0 && (
          <div className="v7-plan-result">
            <div className="v7-plan-figs">
              <span className="v7-plan-fig"><b>{days}</b>{p.daysUnit}</span>
              <span className="v7-plan-x">×</span>
              <span className="v7-plan-fig"><b>{perDay}</b>{p.perDayUnit}</span>
            </div>
            {intensive && (
              <p className="v7-plan-int"><span className="v7-plan-int-pill">{p.intensive}</span>{p.intensiveNote}</p>
            )}
            <p className="v7-plan-focus">{p.focusNote}</p>
          </div>
        )}
      </div>

      <Link href="/register" className="v7-btn v7-btn--dark v7-plan-cta">
        {p.cta} <ArrowRight size={16} strokeWidth={2.2} />
      </Link>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   FAQ accordion — hairline rows
   ═══════════════════════════════════════════════════════════════════════ */
function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="v7-faq">
      {copy.faq.items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className="v7-faq-row">
            <button
              type="button"
              className="v7-faq-q"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : i)}
            >
              <span>{it.q}</span>
              <span className="v7-faq-ico" aria-hidden="true">
                {isOpen ? <Minus size={18} /> : <Plus size={18} />}
              </span>
            </button>
            <div className="v7-faq-a" data-open={isOpen ? "true" : "false"}>
              <div className="v7-faq-a-inner"><p>{it.a}</p></div>
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
export default function V7Page() {
  const root = useRef<HTMLDivElement>(null);
  // Resting default = target (visible without JS / headless); the count-up
  // animation resets to 0 and climbs only when the panel enters view.
  const [dialVal, setDialVal] = useState(74);
  const dialWrap = useRef<HTMLDivElement>(null);

  const runDial = useCallback(() => {
    const target = 74;
    const start = performance.now();
    const dur = 1600;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(2, -10 * t); // expo.out
      setDialVal(target * (t >= 1 ? 1 : eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Section reveals via IntersectionObserver — content is visible by
    // default (no JS = no hiding); the class only arms the transition, and
    // IO fires reliably on scroll, on hidden-tab focus, and in fullPage
    // capture. Reduced motion reveals everything instantly (CSS).
    const rootEl = root.current;
    let revealIO: IntersectionObserver | null = null;
    if (rootEl) {
      rootEl.classList.add("v7-reveal-ready");
      revealIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add("v7-in");
              revealIO?.unobserve(e.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
      );
      rootEl.querySelectorAll("[data-reveal]").forEach((el) => revealIO!.observe(el));
    }

    // Dial: fill once when in view (works in both motion modes)
    const el = dialWrap.current;
    if (el) {
      if (reduce) {
        setDialVal(74);
      } else {
        const io = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) {
              runDial();
              io.disconnect();
            }
          },
          { threshold: 0.5 },
        );
        io.observe(el);
      }
    }

    if (reduce) return () => revealIO?.disconnect();

    const ctx = gsap.context(() => {
      // 1 — sky blobs drift almost imperceptibly (transform only)
      gsap.to(".v7-sky-blob--a", { xPercent: 8, yPercent: -6, duration: 52, ease: "sine.inOut", yoyo: true, repeat: -1 });
      gsap.to(".v7-sky-blob--b", { xPercent: -7, yPercent: 5, duration: 46, ease: "sine.inOut", yoyo: true, repeat: -1 });

      // 2 — headline lines rise + deblur on load
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
      tl.from(".v7-h-line", { y: 26, autoAlpha: 0, filter: "blur(6px)", duration: 1.1, stagger: 0.12 })
        .from(".v7-hero-sub", { y: 18, autoAlpha: 0, duration: 0.9 }, "-=0.6")
        .from(".v7-hero-cta > *", { y: 14, autoAlpha: 0, duration: 0.7, stagger: 0.08 }, "-=0.5")
        .from(".v7-hero-hook", { autoAlpha: 0, duration: 0.7 }, "-=0.4")
        .from(".v7-hero-stats", { autoAlpha: 0, duration: 0.7 }, "-=0.5");

      // 3 — product card rises through the horizon on scroll scrub
      gsap.fromTo(
        ".v7-qcard-rise",
        { y: 22 },
        {
          y: -20,
          ease: "none",
          scrollTrigger: { trigger: ".v7-hero", start: "top top", end: "bottom top", scrub: 0.6 },
        },
      );
    }, root);

    return () => {
      revealIO?.disconnect();
      ctx.revert();
    };
  }, [runDial]);

  const headlineLines = H.headline.split("\n");

  return (
    <div ref={root} className={`${onest.variable} v7-root`}>
      <style>{v7css}</style>

      {/* ── Nav — near-invisible ────────────────────────────────────── */}
      <header className="v7-nav">
        <Link href="/" className="v7-brand">
          <Sun size={17} strokeWidth={2.2} className="v7-brand-ico" />
          {copy.nav.brand}
        </Link>
        <nav className="v7-nav-links">
          {copy.nav.links.map((l) => (
            <a key={l.href} href={l.href}>{l.label}</a>
          ))}
        </nav>
        <Link href="/register" className="v7-btn v7-btn--dark v7-btn--sm">{copy.nav.cta}</Link>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section className="v7-hero">
        <DawnSky />
        <div className="v7-hero-inner">
          <h1 className="v7-hero-h">
            {headlineLines.map((ln, i) => (
              <span className="v7-h-line" key={i}>{ln}</span>
            ))}
          </h1>
          <p className="v7-hero-sub">{H.subhead}</p>

          <div className="v7-hero-cta">
            <Link href="/register" className="v7-btn v7-btn--dark v7-btn--lg">
              {copy.hero.ctaPrimary} <ArrowRight size={18} strokeWidth={2.2} />
            </Link>
            {/* "Try without registration" must NOT land on a login form. There is no
                live standalone anon-play route (VALUE_FIRST_FUNNEL default-off), so we
                use the audit-sanctioned fallback: the register path with an anon hint,
                which begins the play loop that mints ds_anon_play. Never /login. */}
            <Link href="/register?anon=1" className="v7-btn v7-btn--ghost v7-btn--lg">
              {copy.hero.ctaSecondary}
            </Link>
          </div>

          <p className="v7-hero-hook">{copy.hero.hook}</p>

          <p className="v7-hero-stats">
            {copy.hero.stats.map((s, i) => (
              <span key={i}>{s}</span>
            ))}
          </p>
        </div>

        {/* product rising through the horizon */}
        <div className="v7-qcard-rise">
          <QuestionCard />
        </div>
      </section>

      {/* ── READINESS DIAL ──────────────────────────────────────────── */}
      <section className="v7-section" id="dial" data-reveal>
        <div className="v7-dial-grid">
          <div className="v7-dial-copy">
            <span className="v7-kicker">{copy.dial.kicker}</span>
            <h2 className="v7-h2">{copy.dial.heading}</h2>
            <p className="v7-caption-strong">{copy.dial.caption}</p>
            <p className="v7-lead">{copy.dial.body}</p>
            <p className="v7-moat">{copy.dial.moat}</p>
          </div>

          <div className="v7-dial-panel">
            <div ref={dialWrap} className="v7-dial-wrap">
              <Dial value={dialVal} />
              <span className="v7-dial-tag">{copy.dial.labels.ready}</span>
            </div>
            <div className="v7-decay-wrap">
              <DecayDemo />
              <p className="v7-decay-cap">{copy.dial.decayCaption}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── DUSK INTERSTITIAL ───────────────────────────────────────── */}
      <section className="v7-dusk">
        <DawnSky dusk />
        <div className="v7-dusk-inner" data-reveal>
          <p className="v7-dusk-line">
            <b className="v7-dusk-stat">{copy.interstitial.stat}</b> {copy.interstitial.line}
          </p>
          <p className="v7-dusk-em">{copy.interstitial.emphasis}</p>
          <Link href="/register" className="v7-btn v7-btn--light v7-btn--lg">
            {copy.interstitial.cta} <ArrowRight size={18} strokeWidth={2.2} />
          </Link>
        </div>
      </section>

      {/* ── PLANNER ─────────────────────────────────────────────────── */}
      <section className="v7-section" data-reveal>
        <div className="v7-split">
          <div className="v7-split-l">
            <span className="v7-kicker">{copy.planner.kicker}</span>
            <h2 className="v7-h2">{copy.planner.heading}</h2>
            <p className="v7-lead">{copy.planner.sub}</p>
          </div>
          <div className="v7-split-r">
            <Planner />
          </div>
        </div>
      </section>

      {/* ── SIMULATOR ───────────────────────────────────────────────── */}
      <section className="v7-section" data-reveal>
        <div className="v7-sim-head">
          <h2 className="v7-h2 v7-h2--center">{copy.simulator.heading}</h2>
          <p className="v7-lead v7-lead--center">{copy.simulator.sub}</p>
        </div>
        <div className="v7-sim-facts">
          {copy.simulator.facts.map((f, i) => (
            <div key={i} className="v7-sim-fact">
              <b>{f.k}</b>
              <span>{f.v}</span>
            </div>
          ))}
        </div>
        <div className="v7-sim-foot">
          <p className="v7-calm">{copy.simulator.calm}</p>
          <Link href="/register" className="v7-btn v7-btn--dark v7-btn--lg">
            {copy.simulator.cta} <ArrowRight size={18} strokeWidth={2.2} />
          </Link>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────── */}
      <section className="v7-section" id="pricing" data-reveal>
        <div className="v7-price-head">
          <span className="v7-kicker">{copy.pricing.kicker}</span>
          <h2 className="v7-h2 v7-h2--center">{copy.pricing.heading}</h2>
        </div>

        <div className="v7-price-card">
          <div className="v7-price-main">
            <div className="v7-price-tag">
              <span className="v7-price-name">{copy.pricing.priceName}</span>
              <div className="v7-price-num"><b>{copy.pricing.price}</b><span>{copy.pricing.priceUnit}</span></div>
              <p className="v7-price-note">{copy.pricing.priceNote}</p>
              <p className="v7-price-anchor">{copy.pricing.anchor}</p>
              <Link href="/register" className="v7-btn v7-btn--dark v7-btn--lg v7-price-cta">
                {copy.pricing.cta} <ArrowRight size={18} strokeWidth={2.2} />
              </Link>
              <p className="v7-price-ctanote">{copy.pricing.ctaNote}</p>
            </div>

            <div className="v7-price-lists">
              <div className="v7-price-col">
                <span className="v7-price-col-t v7-price-col-t--free">{copy.pricing.freeTitle}</span>
                <ul>
                  {copy.pricing.free.map((f, i) => (
                    <li key={i}><Check size={15} strokeWidth={2.4} /> {f}</li>
                  ))}
                </ul>
              </div>
              <div className="v7-price-col">
                <span className="v7-price-col-t">{copy.pricing.paidTitle}</span>
                <ul>
                  {copy.pricing.paid.map((f, i) => (
                    <li key={i}><Sun size={14} strokeWidth={2.2} /> {f}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <p className="v7-price-failsafe">{copy.pricing.failsafe}</p>

          <div className="v7-trust">
            {copy.pricing.trust.map((t, i) => (
              <span key={i}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROOF / БАЗА ────────────────────────────────────────────── */}
      <section className="v7-section" data-reveal>
        <div className="v7-proof">
          <div className="v7-proof-head">
            <h2 className="v7-h2">{copy.proof.heading}</h2>
            <span className="v7-proof-badge"><Sun size={13} strokeWidth={2.2} /> {copy.proof.badge}</span>
          </div>
          <div className="v7-proof-stats">
            {copy.proof.stats.map((s, i) => (
              <div key={i} className="v7-proof-stat">
                <b>{s.k}</b>
                <span>{s.v}</span>
              </div>
            ))}
          </div>
          <p className="v7-proof-note">{copy.proof.note}</p>
          <p className="v7-proof-honest">{copy.proof.honest}</p>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────── */}
      <section className="v7-section" data-reveal>
        <div className="v7-faq-head">
          <h2 className="v7-h2">{copy.faq.heading}</h2>
        </div>
        <Faq />
      </section>

      {/* ── FINAL CTA + mobile mode-launcher ────────────────────────── */}
      <section className="v7-final" data-reveal>
        <DawnSky />
        <div className="v7-final-inner">
          <h2 className="v7-final-h">{copy.finalCta.heading}</h2>
          <p className="v7-final-sub">{copy.finalCta.sub}</p>
          <div className="v7-hero-cta v7-final-cta">
            <Link href="/register" className="v7-btn v7-btn--dark v7-btn--lg">
              {copy.finalCta.ctaPrimary} <ArrowRight size={18} strokeWidth={2.2} />
            </Link>
            <Link href="/login" className="v7-btn v7-btn--ghost v7-btn--lg">
              {copy.finalCta.ctaSecondary}
            </Link>
          </div>

          <div className="v7-modes">
            <span className="v7-modes-t">{copy.finalCta.modesTitle}</span>
            {copy.finalCta.modes.map((m, i) => (
              <Link key={i} href={m.href} className="v7-mode-row">
                <span>{m.label}</span>
                <ArrowRight size={18} strokeWidth={2} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="v7-footer">
        <div className="v7-footer-inner">
          <div className="v7-footer-top">
            <div className="v7-footer-brandcol">
              <span className="v7-footer-brand"><Sun size={18} strokeWidth={2.2} /> {copy.footer.brand}</span>
              <p className="v7-footer-tag">{copy.footer.tagline}</p>
            </div>
            <div className="v7-footer-cols">
              {copy.footer.columns.map((c, i) => (
                <div key={i} className="v7-footer-col">
                  <span className="v7-footer-col-t">{c.title}</span>
                  {c.links.map((l) => (
                    <Link key={l.label} href={l.href}>{l.label}</Link>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <p id="v7-legal" className="v7-footer-disclaimer">{copy.footer.disclaimer}</p>
          <div className="v7-footer-bottom">
            <span>{copy.footer.copyright}</span>
          </div>
        </div>
        <div className="v7-footer-ghost" aria-hidden="true">{copy.footer.ghost}</div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Scoped styles — every selector prefixed v7-.
   ═══════════════════════════════════════════════════════════════════════ */
const v7css = `
.v7-root{
  --bg:#FAF6F1; --surface:#FFFFFF; --text:#211D26; --ink:#17141B;
  --muted:#5C5563; --hair:rgba(33,29,38,.12); --hair-strong:rgba(33,29,38,.20);
  --dusk:#2E2440; --grain:url("${GRAIN_URI}");
  font-family:var(--v7-onest),system-ui,sans-serif;
  background:var(--bg); color:var(--text);
  -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility;
  overflow-x:hidden;
}
.v7-root *{box-sizing:border-box;}

/* ── Sky ─────────────────────────────────────────────────────────── */
.v7-sky{position:absolute; inset:0; overflow:hidden; z-index:0;
  background:
    /* low, flattened field band — the darker rose-toned horizon behind the card's emergence line */
    radial-gradient(160% 42% at 50% 101%, rgba(196,108,100,.42) 0%, rgba(196,108,100,.14) 40%, rgba(196,108,100,0) 66%),
    /* deepened horizon rose (higher chroma, stop pushed to ~70%) */
    radial-gradient(130% 82% at 50% 106%, #E4977C 0%, rgba(228,151,124,.5) 42%, rgba(228,151,124,0) 70%),
    radial-gradient(90% 70% at 18% 12%, #F3E3C2 0%, rgba(243,227,194,0) 55%),
    radial-gradient(95% 80% at 82% 20%, #C9B8E8 0%, rgba(201,184,232,0) 58%),
    radial-gradient(120% 100% at 50% -10%, #F6C6A8 0%, rgba(246,198,168,0) 50%),
    linear-gradient(#FAF6F1, #F6EAE1);
}
.v7-sky[data-dusk="true"]{
  background:
    radial-gradient(120% 90% at 50% 110%, #5A3B52 0%, rgba(90,59,82,0) 50%),
    radial-gradient(90% 70% at 20% 8%, #6E4A6B 0%, rgba(110,74,107,0) 55%),
    radial-gradient(100% 80% at 84% 24%, #4A3A63 0%, rgba(74,58,99,0) 60%),
    radial-gradient(120% 100% at 50% -10%, #3A2E4A 0%, rgba(58,46,74,0) 55%),
    linear-gradient(#3A2E4A,#2A2038);
}
.v7-sky-blob{position:absolute; border-radius:50%; filter:blur(60px); opacity:.55; will-change:transform;}
.v7-sky-blob--a{width:52vw; height:52vw; left:-8vw; top:-6vw;
  background:radial-gradient(circle, #F6C6A8 0%, rgba(246,198,168,0) 68%);}
.v7-sky-blob--b{width:46vw; height:46vw; right:-6vw; top:2vw;
  background:radial-gradient(circle, #C9B8E8 0%, rgba(201,184,232,0) 68%);}
.v7-sky[data-dusk="true"] .v7-sky-blob{opacity:.4;}
.v7-sky[data-dusk="true"] .v7-sky-blob--a{background:radial-gradient(circle,#6E4A6B 0%,rgba(110,74,107,0) 68%);}
.v7-sky[data-dusk="true"] .v7-sky-blob--b{background:radial-gradient(circle,#4A3A63 0%,rgba(74,58,99,0) 68%);}
.v7-grain{position:absolute; inset:-20%; background-image:var(--grain);
  background-size:180px 180px; opacity:.05; mix-blend-mode:multiply; pointer-events:none;}
.v7-sky[data-dusk="true"] .v7-grain{opacity:.08; mix-blend-mode:soft-light;}

/* ── Buttons ─────────────────────────────────────────────────────── */
.v7-btn{display:inline-flex; align-items:center; justify-content:center; gap:.5rem;
  font-family:inherit; font-weight:600; text-decoration:none; cursor:pointer;
  border:1px solid transparent; border-radius:999px; white-space:nowrap;
  transition:transform .35s cubic-bezier(.2,.8,.2,1), background .3s, box-shadow .35s, color .3s;
  line-height:1;}
.v7-btn--dark{background:var(--ink); color:#F7F4F0; box-shadow:0 1px 2px rgba(23,20,27,.28);}
.v7-btn--dark:hover{transform:translateY(-2px); box-shadow:0 12px 26px -10px rgba(23,20,27,.5);}
.v7-btn--light{background:#F7F1EC; color:var(--ink);}
.v7-btn--light:hover{transform:translateY(-2px); box-shadow:0 14px 30px -12px rgba(0,0,0,.5);}
.v7-btn--ghost{background:transparent; color:var(--ink); border-color:var(--hair-strong);}
.v7-btn--ghost:hover{background:rgba(23,20,27,.05); border-color:rgba(23,20,27,.4);}
.v7-btn--sm{padding:.5rem 1rem; font-size:.86rem;}
.v7-btn--lg{padding:.92rem 1.55rem; font-size:1rem;}
.v7-btn:not(.v7-btn--sm):not(.v7-btn--lg){padding:.72rem 1.25rem; font-size:.92rem;}
.v7-btn:focus-visible{outline:2px solid var(--ink); outline-offset:3px;}

/* ── Nav ─────────────────────────────────────────────────────────── */
.v7-nav{position:absolute; z-index:5; top:0; left:0; right:0;
  display:flex; align-items:center; justify-content:space-between;
  max-width:1200px; margin:0 auto; padding:1.4rem clamp(1.1rem,4vw,2.4rem);}
.v7-brand{display:inline-flex; align-items:center; gap:.45rem;
  font-weight:700; font-size:1.06rem; letter-spacing:-.01em; color:var(--ink); text-decoration:none;}
.v7-brand-ico{color:#C2502F;}
.v7-nav-links{display:flex; gap:1.6rem;}
.v7-nav-links a{color:var(--text); text-decoration:none; font-size:.92rem; font-weight:500; opacity:.78;}
.v7-nav-links a:hover{opacity:1;}
@media(max-width:640px){.v7-nav-links{display:none;}}

/* ── Hero ────────────────────────────────────────────────────────── */
.v7-hero{position:relative; min-height:100svh; display:flex; flex-direction:column;
  align-items:center; padding:clamp(4.3rem,9.5vh,5.4rem) clamp(1.1rem,4vw,2.4rem) 0;
  overflow:hidden;}
.v7-hero-inner{position:relative; z-index:2; text-align:center; max-width:920px; margin:0 auto;}
.v7-hero-h{margin:0; font-weight:800; letter-spacing:-.03em; line-height:.98;
  font-size:clamp(2.3rem,8vw,5.1rem); color:var(--ink); text-wrap:balance;}
.v7-h-line{display:block;}
.v7-hero-sub{margin:clamp(.7rem,2vw,1.4rem) auto 0; max-width:33ch;
  font-size:clamp(1.02rem,2.2vw,1.28rem); font-weight:500; line-height:1.5; color:var(--text);}
.v7-hero-cta{display:flex; gap:.7rem; justify-content:center; flex-wrap:wrap;
  margin-top:clamp(1rem,2.4vw,1.8rem);}
.v7-hero-hook{margin:.85rem auto 0; max-width:40ch; font-size:.92rem; font-weight:500;
  color:var(--muted);}
.v7-hero-stats{display:flex; flex-wrap:wrap; gap:.5rem 1rem; justify-content:center;
  margin:.9rem auto 0; font-size:.84rem; font-weight:600; color:var(--muted); letter-spacing:.01em;}
.v7-hero-stats span{position:relative; padding-left:1.15rem;}
.v7-hero-stats span:first-child{padding-left:0;}
.v7-hero-stats span:not(:first-child)::before{content:"·"; position:absolute; left:.42rem; opacity:.6;}

/* product card rising through horizon */
.v7-qcard-rise{position:relative; z-index:3; width:100%; max-width:560px;
  margin:clamp(1rem,3vw,1.7rem) auto -1px; padding:0 clamp(1rem,4vw,1.5rem);}
.v7-qcard{background:var(--surface); border-radius:22px 22px 0 0;
  box-shadow:0 -2px 0 rgba(255,255,255,.7), 0 40px 90px -40px rgba(45,30,45,.5), 0 18px 40px -30px rgba(45,30,45,.35);
  padding:clamp(1.3rem,3.5vw,1.9rem); text-align:left;}
.v7-qcard-top{display:flex; align-items:center; justify-content:space-between; gap:1rem;
  margin-bottom:1.1rem;}
.v7-qcard-tag{font-size:.72rem; font-weight:700; letter-spacing:.02em; text-transform:uppercase;
  color:var(--muted);}
.v7-qcard-meter{display:flex; flex-direction:column; align-items:flex-end; gap:.3rem; min-width:120px;}
.v7-qcard-meter-track{width:110px; height:5px; border-radius:999px; background:var(--hair); overflow:hidden;}
.v7-qcard-meter-fill{display:block; width:100%; height:100%; background:var(--ink); border-radius:999px;
  transform-origin:left center; transform:scaleX(0); transition:transform .12s linear;}
.v7-qcard-meter-num{font-size:.72rem; font-weight:700; color:var(--ink);}
.v7-qcard-prompt{margin:0 0 1rem; font-size:clamp(1.05rem,2.4vw,1.2rem); font-weight:700;
  letter-spacing:-.01em; line-height:1.3; color:var(--ink);}
.v7-qcard-opts{display:flex; flex-direction:column; gap:.5rem;}
.v7-opt{display:flex; align-items:center; gap:.7rem; width:100%; text-align:left;
  font-family:inherit; font-size:.95rem; font-weight:500; color:var(--text);
  background:#FBF8F4; border:1px solid var(--hair); border-radius:13px;
  padding:.8rem .9rem; cursor:pointer; transition:border-color .2s, background .2s, transform .2s;}
.v7-opt:hover:not(:disabled){border-color:var(--hair-strong); transform:translateY(-1px);}
.v7-opt:disabled{cursor:default;}
.v7-opt-mark{display:inline-flex; align-items:center; justify-content:center;
  width:20px; height:20px; border-radius:999px; flex:none; border:1.5px solid var(--hair-strong);}
.v7-opt[data-state="correct"]{border-color:var(--ink); background:#F2EFEA;}
.v7-opt[data-state="correct"] .v7-opt-mark{background:var(--ink); color:#fff; border-color:var(--ink);}
.v7-opt[data-state="correct"] .v7-opt-text{font-weight:700; color:var(--ink);}
.v7-opt[data-state="wrong"]{border-color:var(--hair-strong); background:#FBF8F4;}
.v7-opt[data-state="wrong"] .v7-opt-mark{border-style:solid; color:var(--muted);}
.v7-opt[data-state="wrong"] .v7-opt-text{text-decoration:line-through; text-decoration-thickness:1px; color:var(--muted);}
.v7-opt[data-state="dim"]{opacity:.5;}
.v7-opt-text{line-height:1.35;}
.v7-qcard-foot{margin:1rem 0 0; font-size:.86rem; line-height:1.5; color:var(--muted);
  min-height:1.5em;}
.v7-qcard-foot[data-answered="true"]{color:var(--ink); font-weight:500;}

/* ── Sections ────────────────────────────────────────────────────── */
.v7-section{position:relative; z-index:1; max-width:1120px; margin:0 auto;
  padding:clamp(5rem,13vw,10rem) clamp(1.1rem,4vw,2.4rem);}
.v7-kicker{display:inline-block; font-size:.8rem; font-weight:700; letter-spacing:.01em;
  color:var(--muted); margin-bottom:1rem;}
.v7-h2{margin:0; font-weight:800; letter-spacing:-.025em; line-height:1.04;
  font-size:clamp(1.9rem,4.6vw,3.2rem); color:var(--ink); text-wrap:balance;}
.v7-h2--center{text-align:center; margin-inline:auto; max-width:16ch;}
.v7-lead{margin:1.15rem 0 0; font-size:clamp(1.02rem,1.7vw,1.15rem); line-height:1.6;
  color:var(--text); max-width:56ch;}
.v7-lead--center{text-align:center; margin-inline:auto;}

/* dial grid */
.v7-dial-grid{display:grid; grid-template-columns:1fr 1fr; gap:clamp(2rem,6vw,5rem); align-items:center;}
.v7-caption-strong{margin:1.3rem 0 0; font-size:clamp(1.2rem,2.6vw,1.55rem); font-weight:700;
  letter-spacing:-.02em; color:var(--ink);}
.v7-moat{margin:1.4rem 0 0; padding-top:1.4rem; border-top:1px solid var(--hair);
  font-size:.98rem; line-height:1.55; font-weight:500; color:var(--text); max-width:48ch;}
.v7-dial-panel{background:var(--surface); border-radius:20px;
  box-shadow:0 30px 60px -34px rgba(45,30,45,.35); padding:clamp(1.6rem,4vw,2.4rem);
  display:flex; flex-direction:column; align-items:center; gap:1.6rem;}
.v7-dial-wrap{display:flex; flex-direction:column; align-items:center;}
.v7-dial{display:block;}
.v7-dial-track{fill:none; stroke:var(--hair); stroke-width:14; stroke-linecap:round;}
.v7-dial-fill{fill:none; stroke:var(--ink); stroke-width:14; stroke-linecap:round;}
.v7-dial-num{fill:var(--ink); font-size:52px; font-weight:800; text-anchor:middle; letter-spacing:-.03em;
  font-family:var(--v7-onest),sans-serif;}
.v7-dial-pct{fill:var(--muted); font-size:13px; font-weight:600; text-anchor:middle;
  font-family:var(--v7-onest),sans-serif;}
.v7-dial-tag{margin-top:.4rem; font-size:.82rem; font-weight:600; color:var(--muted);}
.v7-decay-wrap{width:100%; border-top:1px solid var(--hair); padding-top:1.4rem;}
.v7-decay{width:100%; height:auto; display:block;}
.v7-decay-line{fill:none; stroke:var(--ink); stroke-width:2.2; stroke-linejoin:round; stroke-linecap:round; opacity:.85;}
.v7-decay-dot{fill:var(--ink);}
.v7-decay-cap{margin:.8rem 0 0; font-size:.82rem; color:var(--muted); text-align:center;}

/* ── Dusk interstitial ───────────────────────────────────────────── */
.v7-dusk{position:relative; overflow:hidden; padding:clamp(5rem,13vw,9rem) clamp(1.1rem,4vw,2.4rem);}
.v7-dusk-inner{position:relative; z-index:2; max-width:820px; margin:0 auto; text-align:center; color:#F3ECEF;}
.v7-dusk-line{margin:0; font-size:clamp(1.6rem,4.4vw,2.8rem); font-weight:700; line-height:1.15;
  letter-spacing:-.02em; text-wrap:balance;}
.v7-dusk-stat{color:#F6C6A8;}
.v7-dusk-em{margin:1.3rem auto 2.1rem; font-size:clamp(1.05rem,2.2vw,1.3rem); font-weight:500;
  line-height:1.5; color:#D9CEDC; max-width:34ch;}

/* ── Split (planner) ─────────────────────────────────────────────── */
.v7-split{display:grid; grid-template-columns:1fr 1fr; gap:clamp(2rem,6vw,4.5rem); align-items:center;}
.v7-plan-card{background:var(--surface); border-radius:20px;
  box-shadow:0 30px 60px -34px rgba(45,30,45,.35); padding:clamp(1.6rem,4vw,2.2rem);}
.v7-plan-label{display:block; font-size:.82rem; font-weight:700; color:var(--muted);
  text-transform:uppercase; letter-spacing:.03em; margin-bottom:.55rem;}
.v7-plan-input{width:100%; font-family:inherit; font-size:1.05rem; font-weight:600; color:var(--ink);
  background:#FBF8F4; border:1px solid var(--hair-strong); border-radius:13px; padding:.85rem 1rem;}
.v7-plan-input:focus-visible{outline:2px solid var(--ink); outline-offset:1px; border-color:var(--ink);}
.v7-plan-out{margin-top:1.3rem; min-height:120px;}
.v7-plan-fallback{margin:0; font-size:.95rem; line-height:1.5; color:var(--muted);}
.v7-plan-today{margin:0; font-size:1.05rem; line-height:1.5; font-weight:600; color:var(--ink);}
.v7-plan-figs{display:flex; align-items:baseline; gap:.7rem; flex-wrap:wrap;}
.v7-plan-fig{display:inline-flex; align-items:baseline; gap:.35rem; font-size:.9rem; color:var(--muted); font-weight:600;}
.v7-plan-fig b{font-size:clamp(2rem,5vw,2.7rem); font-weight:800; letter-spacing:-.03em; color:var(--ink);}
.v7-plan-x{font-size:1.4rem; color:var(--muted);}
.v7-plan-int{display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; margin:.9rem 0 0;
  font-size:.88rem; color:var(--text); font-weight:500;}
.v7-plan-int-pill{background:var(--ink); color:#F7F4F0; font-size:.72rem; font-weight:700;
  padding:.22rem .6rem; border-radius:999px; text-transform:uppercase; letter-spacing:.03em;}
.v7-plan-focus{margin:.9rem 0 0; font-size:.85rem; line-height:1.5; color:var(--muted);}
.v7-plan-cta{margin-top:1.5rem; width:100%;}

/* ── Simulator ───────────────────────────────────────────────────── */
.v7-sim-head{text-align:center; margin-bottom:clamp(2.4rem,5vw,3.4rem);}
.v7-sim-facts{display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background:var(--hair);
  border-radius:18px; overflow:hidden; border:1px solid var(--hair);}
.v7-sim-fact{background:var(--surface); padding:clamp(1.3rem,3vw,2rem) 1rem; text-align:center;
  display:flex; flex-direction:column; gap:.35rem;}
.v7-sim-fact b{font-size:clamp(1.8rem,4vw,2.6rem); font-weight:800; letter-spacing:-.03em; color:var(--ink);}
.v7-sim-fact span{font-size:.85rem; color:var(--muted); font-weight:500;}
.v7-sim-foot{margin-top:clamp(2rem,4vw,2.8rem); display:flex; flex-direction:column;
  align-items:center; gap:1.3rem; text-align:center;}
.v7-calm{margin:0; font-size:1.02rem; font-weight:600; color:var(--ink);}
@media(max-width:560px){.v7-sim-facts{grid-template-columns:repeat(2,1fr);}}

/* ── Pricing ─────────────────────────────────────────────────────── */
.v7-price-head{text-align:center; margin-bottom:clamp(2.4rem,5vw,3.4rem);}
.v7-price-card{background:var(--surface); border-radius:24px;
  box-shadow:0 40px 80px -44px rgba(45,30,45,.4); padding:clamp(1.6rem,4vw,3rem); max-width:960px; margin:0 auto;}
.v7-price-main{display:grid; grid-template-columns:1.05fr 1fr; gap:clamp(1.8rem,4vw,3.2rem);}
.v7-price-tag{display:flex; flex-direction:column;}
.v7-price-name{font-size:.82rem; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:var(--muted);}
.v7-price-num{display:flex; align-items:baseline; gap:.5rem; margin:.5rem 0 0;}
.v7-price-num b{font-size:clamp(3rem,8vw,4.2rem); font-weight:800; letter-spacing:-.04em; color:var(--ink); line-height:1;}
.v7-price-num span{font-size:.95rem; font-weight:600; color:var(--muted);}
.v7-price-note{margin:.7rem 0 0; font-size:.95rem; font-weight:600; color:var(--ink);}
.v7-price-anchor{margin:.5rem 0 0; font-size:.9rem; color:var(--muted); line-height:1.5;}
.v7-price-cta{margin-top:1.5rem;}
.v7-price-ctanote{margin:.7rem 0 0; font-size:.8rem; color:var(--muted);}
.v7-price-lists{display:flex; flex-direction:column; gap:1.6rem;}
.v7-price-col-t{display:block; font-size:.8rem; font-weight:700; text-transform:uppercase;
  letter-spacing:.03em; color:var(--muted); margin-bottom:.7rem;}
.v7-price-col-t--free{color:var(--ink);}
.v7-price-col ul{list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:.55rem;}
.v7-price-col li{display:flex; align-items:flex-start; gap:.55rem; font-size:.94rem; color:var(--text); line-height:1.4;}
.v7-price-col li svg{flex:none; margin-top:2px; color:var(--ink);}
.v7-price-col-t--free ~ ul li svg{color:var(--ink);}
.v7-price-failsafe{margin:2rem 0 0; padding:1.3rem 1.5rem; background:#FBF8F4; border-radius:16px;
  font-size:.94rem; line-height:1.55; color:var(--text); font-weight:500;}
.v7-trust{display:flex; flex-wrap:wrap; gap:.5rem 1.2rem; justify-content:center; margin-top:1.6rem;
  font-size:.86rem; font-weight:600; color:var(--muted);}
.v7-trust span{position:relative; padding-left:1.4rem;}
.v7-trust span:first-child{padding-left:0;}
.v7-trust span:not(:first-child)::before{content:"·"; position:absolute; left:.55rem; opacity:.6;}
@media(max-width:720px){.v7-price-main{grid-template-columns:1fr;}}

/* ── Proof ───────────────────────────────────────────────────────── */
.v7-proof-head{display:flex; align-items:baseline; gap:1rem; flex-wrap:wrap; margin-bottom:2.4rem;}
.v7-proof-head .v7-h2{flex:1 1 auto;}
.v7-proof-badge{display:inline-flex; align-items:center; gap:.4rem; font-size:.8rem; font-weight:700;
  color:var(--ink); background:#F2EFEA; border-radius:999px; padding:.4rem .85rem;}
.v7-proof-badge svg{color:var(--ink);}
.v7-proof-stats{display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:var(--hair);
  border:1px solid var(--hair); border-radius:18px; overflow:hidden;}
.v7-proof-stat{background:var(--bg); padding:clamp(1.6rem,4vw,2.4rem); text-align:left;
  display:flex; flex-direction:column; gap:.3rem;}
.v7-proof-stat b{font-size:clamp(2.2rem,5vw,3.2rem); font-weight:800; letter-spacing:-.03em; color:var(--ink);}
.v7-proof-stat span{font-size:.9rem; color:var(--muted); font-weight:500;}
.v7-proof-note{margin:1.8rem 0 0; font-size:1rem; line-height:1.6; color:var(--text); max-width:62ch;}
.v7-proof-honest{margin:.9rem 0 0; font-size:.94rem; line-height:1.55; color:var(--muted); max-width:56ch;}

/* ── FAQ ─────────────────────────────────────────────────────────── */
.v7-faq-head{margin-bottom:2.2rem;}
.v7-faq{border-top:1px solid var(--hair);}
.v7-faq-row{border-bottom:1px solid var(--hair);}
.v7-faq-q{display:flex; align-items:center; justify-content:space-between; gap:1.5rem; width:100%;
  font-family:inherit; text-align:left; background:none; border:none; cursor:pointer;
  padding:1.5rem 0; font-size:clamp(1.05rem,2.2vw,1.25rem); font-weight:700; letter-spacing:-.01em;
  color:var(--ink);}
.v7-faq-ico{display:inline-flex; flex:none; color:var(--muted);}
.v7-faq-a{display:grid; grid-template-rows:0fr; transition:grid-template-rows .4s cubic-bezier(.2,.8,.2,1);}
.v7-faq-a[data-open="true"]{grid-template-rows:1fr;}
.v7-faq-a-inner{overflow:hidden; min-height:0;}
.v7-faq-a p{margin:0; padding:0 0 1.6rem; font-size:1rem; line-height:1.6; color:var(--text); max-width:64ch;}

/* ── Final CTA ───────────────────────────────────────────────────── */
.v7-final{position:relative; overflow:hidden; padding:clamp(5rem,13vw,9rem) clamp(1.1rem,4vw,2.4rem);}
.v7-final-inner{position:relative; z-index:2; max-width:720px; margin:0 auto; text-align:center;}
.v7-final-h{margin:0; font-weight:800; letter-spacing:-.03em; line-height:1.02;
  font-size:clamp(2rem,5.5vw,3.6rem); color:var(--ink); text-wrap:balance;}
.v7-final-sub{margin:1.1rem auto 0; font-size:1.1rem; font-weight:500; color:var(--text); max-width:40ch;}
.v7-final-cta{margin-top:2rem;}
.v7-modes{margin:2.6rem auto 0; max-width:460px; text-align:left;}
.v7-modes-t{display:block; font-size:.78rem; font-weight:700; text-transform:uppercase;
  letter-spacing:.04em; color:var(--muted); margin-bottom:.7rem; text-align:center;}
.v7-mode-row{display:flex; align-items:center; justify-content:space-between; gap:1rem;
  padding:1.05rem 1.3rem; background:var(--surface); border-radius:14px; text-decoration:none;
  color:var(--ink); font-weight:600; font-size:1rem; margin-top:.6rem;
  box-shadow:0 10px 24px -18px rgba(45,30,45,.45); transition:transform .3s, box-shadow .3s;}
.v7-mode-row:hover{transform:translateY(-2px); box-shadow:0 16px 30px -18px rgba(45,30,45,.5);}
.v7-mode-row svg{color:var(--muted);}

/* ── Footer ──────────────────────────────────────────────────────── */
.v7-footer{position:relative; overflow:hidden; background:#241B31; color:#CFC5D6;
  padding:clamp(3.5rem,8vw,5.5rem) clamp(1.1rem,4vw,2.4rem) 2.5rem;}
.v7-footer-inner{position:relative; z-index:2; max-width:1120px; margin:0 auto;}
.v7-footer-top{display:flex; gap:2.5rem; flex-wrap:wrap; justify-content:space-between;
  padding-bottom:2.5rem; border-bottom:1px solid rgba(255,255,255,.12);}
.v7-footer-brandcol{max-width:280px;}
.v7-footer-brand{display:inline-flex; align-items:center; gap:.5rem; font-size:1.2rem; font-weight:700;
  color:#F3ECEF;}
.v7-footer-brand svg{color:#F6C6A8;}
.v7-footer-tag{margin:.7rem 0 0; font-size:.92rem; line-height:1.5; color:#A99DB3;}
.v7-footer-cols{display:flex; gap:clamp(2rem,6vw,4.5rem); flex-wrap:wrap;}
.v7-footer-col{display:flex; flex-direction:column; gap:.6rem;}
.v7-footer-col-t{font-size:.75rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em;
  color:#9E93AB; margin-bottom:.2rem;}
.v7-footer-col a{color:#CFC5D6; text-decoration:none; font-size:.92rem;}
.v7-footer-col a:hover{color:#fff;}
.v7-footer-disclaimer{margin:2rem 0 0; font-size:.78rem; line-height:1.6; color:#9E93AB; max-width:76ch;}
.v7-footer-bottom{margin-top:1.5rem; font-size:.78rem; color:#9E93AB;}
.v7-footer-ghost{position:absolute; z-index:1; left:0; right:0; bottom:-.18em; text-align:center;
  font-weight:800; letter-spacing:-.04em; line-height:1; color:rgba(246,198,168,.06);
  font-size:clamp(5rem,24vw,20rem); pointer-events:none; user-select:none; white-space:nowrap;}

/* ── Section reveals — PURELY ADDITIVE. Resting default is fully
   visible; the keyframe only plays when IO adds .v7-in, so any element
   the observer never reaches (headless / fullPage capture / no-JS)
   still renders at its natural visible state. ─────────────────────── */
.v7-reveal-ready [data-reveal].v7-in{animation:v7rise .85s cubic-bezier(.2,.8,.2,1) both;}
@keyframes v7rise{from{opacity:0; transform:translateY(28px);} to{opacity:1; transform:none;}}

/* ── Responsive ──────────────────────────────────────────────────── */
@media(max-width:860px){
  .v7-dial-grid{grid-template-columns:1fr;}
  .v7-split{grid-template-columns:1fr;}
}
@media(max-width:520px){
  .v7-proof-stats{grid-template-columns:1fr;}
  .v7-btn--lg{width:100%;}
  .v7-hero-cta{flex-direction:column; align-items:stretch;}
  .v7-hero-cta .v7-btn{width:100%;}
  .v7-final-cta{flex-direction:column;}
}

/* ── Reduced motion ──────────────────────────────────────────────── */
@media(prefers-reduced-motion:reduce){
  .v7-sky-blob{animation:none !important;}
  .v7-btn, .v7-mode-row, .v7-opt{transition:none !important;}
  .v7-reveal-ready [data-reveal].v7-in{animation:none !important;}
  *{scroll-behavior:auto !important;}
}
`;
