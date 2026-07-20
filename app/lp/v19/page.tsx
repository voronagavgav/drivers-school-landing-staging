"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import {
  BRAND,
  HERO,
  AGITATION,
  DIAL,
  PLAN,
  RANOK,
  PRICING,
  PROOF,
  FAQ,
  FINAL,
  FOOTER,
  STATS,
  PLAN_POOL,
  REGISTER_HREF,
  LOGIN_HREF,
  ANON_TRY_HREF,
} from "./copy";

/* ==================================================================== */
/*  «Світає» — one scroll-driven sky, 2 a.m. night → full morning.      */
/*  The visual state IS the emotional state: fear → mechanism → relief. */
/*  Base = opaque per-section gradient bands (AA-safe, reduced-motion    */
/*  correct on their own). GSAP layers the atmosphere on top: stars      */
/*  fade, the sun rises across dawn, content breathes up into view.      */
/* ==================================================================== */

/* Deterministic star field (seeded → no hydration mismatch). */
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const RAND = mulberry32(19);
const STARS = Array.from({ length: 66 }, () => ({
  left: RAND() * 100,
  top: RAND() * 68,
  size: RAND() * 1.8 + 0.8,
  o: RAND() * 0.55 + 0.25,
  d: RAND() * 4,
}));

const heroLine = HERO.variants[HERO.active];

/* Compact 270° arc gauge — the honest instrument, in ivory/ink + amber. */
function Gauge({
  value,
  size = 220,
  label,
  tone = "night",
}: {
  value: number;
  size?: number;
  label?: string;
  tone?: "night" | "day";
}) {
  const track = tone === "night" ? "rgba(243,239,230,0.16)" : "rgba(34,32,26,0.14)";
  const ink = tone === "night" ? "#F3EFE6" : "#22201A";
  const v = Math.max(0, Math.min(100, value));
  return (
    <svg
      className="v19-gauge"
      viewBox="0 0 200 200"
      width={size}
      height={size}
      role="img"
      aria-label={`${label ?? "Показник"}: ${Math.round(v)} зі 100`}
    >
      <g transform="rotate(135 100 100)">
        <circle
          cx="100"
          cy="100"
          r="82"
          fill="none"
          stroke={track}
          strokeWidth="9"
          pathLength={100}
          strokeDasharray="75 100"
          strokeLinecap="round"
        />
        <circle
          className="v19-gauge-val"
          cx="100"
          cy="100"
          r="82"
          fill="none"
          stroke="#F2A33C"
          strokeWidth="9"
          pathLength={100}
          strokeDasharray={`${(v / 100) * 75} 100`}
          strokeLinecap="round"
        />
      </g>
      <text x="100" y="96" textAnchor="middle" className="v19-gauge-num" fill={ink}>
        {Math.round(v)}
      </text>
      <text x="100" y="124" textAnchor="middle" className="v19-gauge-unit" fill={ink}>
        зі 100
      </text>
    </svg>
  );
}

export default function V19Page() {
  const root = useRef<HTMLDivElement>(null);

  /* Dial demo — visibly decays once in view (honesty: it can go down).
     dialDecayed flips true ONLY after a real animated drop; the caption is
     gated on it so we never assert «щойно впав» for a value that never moved
     (reduced-motion / pre-hydration / no-JS all read the static caption). */
  const [dialVal, setDialVal] = useState(68);
  const [dialDecayed, setDialDecayed] = useState(false);
  const dialFired = useRef(false);

  /* Exam-date picker → finite-sprint plan preview. */
  const [examDate, setExamDate] = useState("");
  let planDays = 14;
  let hasDate = false;
  if (examDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(examDate + "T00:00:00");
    const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
    if (diff > 0) {
      planDays = diff;
      hasDate = true;
    } else if (diff === 0) {
      planDays = 1;
      hasDate = true;
    }
  }
  /* Honest preview: divide the REAL published cat-B pool, then clamp the
     daily load to a humane 15–90 band. When the clamp BINDS the arithmetic
     no longer equals the pool, so we surface «≈» and switch the note to the
     honest fallback (compressed → intensive, over-long → relaxed). */
  const rawPerDay = Math.ceil(PLAN_POOL / planDays);
  const perDay = Math.min(90, Math.max(15, rawPerDay));
  const cappedHigh = rawPerDay > 90; // more/day than fits → compressed plan
  const cappedLow = rawPerDay < 15; // fewer/day than the daily floor
  const capped = cappedHigh || cappedLow;
  const todayStr = new Date().toISOString().slice(0, 10);

  /* Answer-one-question widget — first calm action, permission to fail. */
  const [picked, setPicked] = useState<number | null>(null);
  const correctIdx = RANOK.options.findIndex((o) => o.correct);
  const isCorrect = picked === correctIdx;
  const miniVal = picked === null ? 0 : isCorrect ? 9 : 4;

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        /* Hero: choreographed first light of the page itself. */
        const hero = gsap.utils.toArray<HTMLElement>("[data-hero]");
        gsap.set(hero, { opacity: 0, y: 26 });
        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .to(hero, { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, delay: 0.15 });

        /* Below-fold blocks breathe up as their section arrives. */
        const rev = gsap.utils.toArray<HTMLElement>("[data-reveal]");
        gsap.set(rev, { opacity: 0, y: 28 });
        ScrollTrigger.batch(rev, {
          start: "top 86%",
          onEnter: (b) =>
            gsap.to(b, {
              opacity: 1,
              y: 0,
              duration: 0.75,
              ease: "power3.out",
              stagger: 0.09,
              overwrite: true,
            }),
        });

        /* Stars + the persistent horizon fade out as the night lifts —
           the single anchor object dissolving into first light. */
        gsap.to([".v19-stars", ".v19-skyline"], {
          opacity: 0,
          ease: "none",
          scrollTrigger: {
            trigger: ".v19-night-wrap",
            start: "center center",
            end: "bottom top",
            scrub: true,
          },
        });

        /* The sun rises across the dawn sections. */
        gsap.fromTo(
          ".v19-sun",
          { y: 180, opacity: 0.25 },
          {
            y: -220,
            opacity: 1,
            ease: "none",
            scrollTrigger: {
              trigger: ".v19-dawn-wrap",
              start: "top bottom",
              end: "bottom center",
              scrub: true,
            },
          }
        );

        /* Dial visibly decays 68 → 61 when it enters the light. */
        ScrollTrigger.create({
          trigger: ".v19-dial",
          start: "top 65%",
          once: true,
          onEnter: () => {
            if (dialFired.current) return;
            dialFired.current = true;
            gsap.to(
              { n: 68 },
              {
                n: 61,
                duration: 1.6,
                delay: 0.5,
                ease: "power2.inOut",
                onUpdate: function () {
                  setDialVal((this.targets()[0] as { n: number }).n);
                },
                onComplete: () => setDialDecayed(true),
              }
            );
          },
        });

        ScrollTrigger.refresh();
      }, el);
      return () => ctx.revert();
    });

    /* Reduced-motion: no scrub, no decay animation. Land the dial on its
       honest resting value immediately, but leave dialDecayed false so the
       caption stays the static «може падати» form (no event is claimed). */
    mm.add("(prefers-reduced-motion: reduce)", () => {
      setDialVal(61);
    });

    return () => mm.revert();
  }, []);

  return (
    <div className="v19" ref={root}>
      <style>{CSS}</style>

      {/* Persistent horizon: a fixed hairline + one lit window that RIDES the
          viewport through the whole night half (hero → agitation → first
          light), then dissipates as the sun takes over — the concept's single
          continuous anchor object. Scrubbed out over the night-wrap; hidden
          under reduced-motion (purely atmospheric, no content is gated). */}
      <div className="v19-skyline" aria-hidden>
        <span className="v19-window" />
      </div>

      {/* ============ NIGHT + AGITATION (shared star field) ============ */}
      <div className="v19-night-wrap">
        <div className="v19-stars" aria-hidden>
          {STARS.map((s, i) => (
            <span
              key={i}
              className="v19-star"
              style={{
                left: `${s.left}%`,
                top: `${s.top}%`,
                width: s.size,
                height: s.size,
                opacity: s.o,
                animationDelay: `${s.d}s`,
              }}
            />
          ))}
        </div>

        {/* ---------------------- НІЧ — hero ---------------------- */}
        <section className="v19-sec v19-hero">
          <nav className="v19-nav" aria-label="Головна навігація">
            <span className="v19-brand">{BRAND.name}</span>
            <div className="v19-nav-right">
              <Link href={LOGIN_HREF} className="v19-navlink">
                {HERO.login}
              </Link>
              <Link href={REGISTER_HREF} className="v19-pill v19-pill-sm">
                {HERO.ctaPrimary}
              </Link>
            </div>
          </nav>

          <div className="v19-hero-inner">
            <p className="v19-clock" data-hero>
              {HERO.clock}
            </p>
            <h1 className="v19-h1" data-hero>
              {heroLine.headlineLines.map((l, i) => (
                <span key={i}>{l}</span>
              ))}
            </h1>
            <p className="v19-lead" data-hero>
              {heroLine.subhead}
            </p>
            <p className="v19-stat" data-hero>
              {HERO.stat}
            </p>

            <div className="v19-cta-row" data-hero>
              <Link href={REGISTER_HREF} className="v19-pill">
                {HERO.ctaPrimary}
                <ArrowRight size={18} aria-hidden strokeWidth={2.2} />
              </Link>
              <Link href={ANON_TRY_HREF} className="v19-ghost">
                {HERO.ctaSecondary}
              </Link>
            </div>

            <ul className="v19-reassure" data-hero>
              {HERO.reassure.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>

            <ul className="v19-chips" data-hero>
              {HERO.chips.map((c) => (
                <li key={c.k} className="v19-chip">
                  <b>{c.k}</b>
                  <span>{c.v}</span>
                </li>
              ))}
            </ul>
          </div>

        </section>

        {/* ------------------ ДРУГА НОЧІ — agitation ------------------ */}
        <section className="v19-sec v19-agitation">
          <div className="v19-wrap">
            <p className="v19-clock" data-reveal>
              {AGITATION.clock}
            </p>
            <h2 className="v19-h2" data-reveal>
              {AGITATION.heading}
            </h2>
            <p className="v19-sub v19-sub-dim" data-reveal>
              {AGITATION.intro}
            </p>

            <div className="v19-doom">
              {AGITATION.items.map((it) => (
                <div className="v19-doom-item" key={it.label} data-reveal>
                  <span className="v19-doom-big">{it.big}</span>
                  <span className="v19-doom-label">{it.label}</span>
                  <span className="v19-doom-note">{it.note}</span>
                </div>
              ))}
            </div>

            <p className="v19-climax" data-reveal>
              {AGITATION.climax}
            </p>
            <p className="v19-retaker" data-reveal>
              {AGITATION.retaker}
            </p>
          </div>
        </section>
      </div>

      {/* ============ DAWN WRAP (first light → dawn → morning) ============ */}
      <div className="v19-dawn-wrap">
        <div className="v19-sun" aria-hidden />

        {/* ---------------- ПЕРШЕ СВІТЛО — the turn ---------------- */}
        <section className="v19-sec v19-firstlight v19-dial" id="dial">
          <div className="v19-wrap">
            <p className="v19-clock" data-reveal>
              {DIAL.clock}
            </p>
            <p className="v19-statement" data-reveal>
              {DIAL.statement}
            </p>

            <div className="v19-dial-grid">
              <div className="v19-dial-viz" data-reveal>
                <Gauge value={dialVal} label={DIAL.demoLabel} tone="night" />
                <p className="v19-dial-plabel">{DIAL.demoLabel}</p>
                <p className="v19-dial-caption">
                  {dialDecayed ? DIAL.demoCaption : DIAL.demoCaptionStatic}
                </p>
              </div>
              <div className="v19-dial-copy">
                <h2 className="v19-h2" data-reveal>
                  {DIAL.heading}
                </h2>
                <p className="v19-sub v19-sub-dim" data-reveal>
                  {DIAL.body}
                </p>
                <ul className="v19-notes" data-reveal>
                  {DIAL.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
                <p className="v19-moat" data-reveal>
                  {DIAL.moat}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------- СВІТАНОК — the plan -------------------- */}
        <section className="v19-sec v19-dawn" id="plan">
          <div className="v19-wrap">
            <p className="v19-clock" data-reveal>
              {PLAN.clock}
            </p>
            <h2 className="v19-h2" data-reveal>
              {PLAN.heading}
            </h2>
            <p className="v19-sub v19-sub-dim" data-reveal>
              {PLAN.body}
            </p>

            <div className="v19-plan" data-reveal>
              <label className="v19-plan-field">
                <span>{PLAN.pickerLabel}</span>
                <input
                  type="date"
                  min={todayStr}
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="v19-date"
                />
              </label>

              <div className="v19-plan-preview">
                <div className="v19-plan-metric">
                  <b>{planDays}</b>
                  <span>{PLAN.daysUnit}</span>
                </div>
                <div className="v19-plan-x">×</div>
                <div className="v19-plan-metric">
                  <b>{capped ? `≈${perDay}` : perDay}</b>
                  <span>{PLAN.perDayUnit}</span>
                </div>
              </div>

              <p className="v19-plan-note">
                {!hasDate
                  ? PLAN.noDate
                  : cappedHigh
                    ? PLAN.intensive
                    : cappedLow
                      ? PLAN.relaxed
                      : " "}
              </p>
            </div>

            <div className="v19-topics" data-reveal>
              <p className="v19-topics-label">{PLAN.topicsLabel}</p>
              <ol className="v19-topics-list">
                {PLAN.topics.map((t, i) => (
                  <li key={t}>
                    <span className="v19-topic-n">{i + 1}</span>
                    {t}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ------------------ РАНОК — rehearsal ------------------ */}
        <section className="v19-sec v19-morning" id="simulator">
          <div className="v19-wrap">
            <p className="v19-clock v19-clock-day" data-reveal>
              {RANOK.clock}
            </p>
            <p className="v19-sub-label" data-reveal>
              {RANOK.simSubLabel}
            </p>
            <h2 className="v19-h2 v19-h2-day" data-reveal>
              {RANOK.simHeading}
            </h2>
            <p className="v19-sub v19-sub-day" data-reveal>
              {RANOK.simBody}
            </p>

            <div className="v19-metrics" data-reveal>
              {RANOK.metrics.map((m) => (
                <div className="v19-metric" key={m.label}>
                  <b>{m.big}</b>
                  <span>{m.label}</span>
                </div>
              ))}
            </div>

            {/* First calm action — the answer widget. */}
            <div className="v19-widget" data-reveal>
              <div className="v19-widget-head">
                <div>
                  <h3 className="v19-widget-h">{RANOK.widgetHeading}</h3>
                  <p className="v19-permission">{RANOK.permission}</p>
                </div>
                <div className="v19-mini">
                  <Gauge value={miniVal} size={92} tone="day" />
                </div>
              </div>

              <p className="v19-q">{RANOK.question}</p>
              <div className="v19-opts">
                {RANOK.options.map((o, i) => {
                  const state =
                    picked === null
                      ? ""
                      : o.correct
                        ? "is-correct"
                        : i === picked
                          ? "is-wrong"
                          : "is-dim";
                  return (
                    <button
                      key={o.t}
                      type="button"
                      className={`v19-opt ${state}`}
                      onClick={() => picked === null && setPicked(i)}
                      disabled={picked !== null}
                    >
                      <span className="v19-opt-mark" aria-hidden>
                        {picked !== null && o.correct ? <Check size={16} /> : null}
                      </span>
                      {o.t}
                    </button>
                  );
                })}
              </div>

              {picked !== null && (
                <div className="v19-answer">
                  <p className={isCorrect ? "v19-ans-ok" : "v19-ans-soft"}>
                    {isCorrect ? RANOK.correctMsg : RANOK.wrongMsg}
                  </p>
                  <button
                    type="button"
                    className="v19-again"
                    onClick={() => setPicked(null)}
                  >
                    {RANOK.again}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* -------------------- ДЕНЬ — the offer -------------------- */}
      <section className="v19-sec v19-day" id="pricing">
        <div className="v19-wrap">
          <p className="v19-clock v19-clock-day" data-reveal>
            {PRICING.clock}
          </p>
          <h2 className="v19-h2 v19-h2-day" data-reveal>
            {PRICING.heading}
          </h2>
          <p className="v19-sub v19-sub-day" data-reveal>
            {PRICING.subLabel}
          </p>

          <div className="v19-price-card" data-reveal>
            <div className="v19-price-top">
              <div>
                <p className="v19-price-title">{PRICING.priceTitle}</p>
                <p className="v19-price-framing">{PRICING.priceFraming}</p>
              </div>
              <div className="v19-price-amount">
                <b>{PRICING.price}</b>
                <span>{PRICING.currency}</span>
              </div>
            </div>

            <p className="v19-negation">{PRICING.negation}</p>

            <div className="v19-ledger">
              <div className="v19-col v19-col-free">
                <p className="v19-col-title">{PRICING.freeTitle}</p>
                <ul>
                  {PRICING.free.map((f) => (
                    <li key={f}>
                      <Check size={16} className="v19-i-free" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="v19-col v19-col-paid">
                <p className="v19-col-title">{PRICING.paidTitle}</p>
                <ul>
                  {PRICING.paid.map((p) => (
                    <li key={p}>
                      <Sparkles size={16} className="v19-i-paid" aria-hidden />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <ul className="v19-anchors">
              {PRICING.anchors.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>

            <Link href={REGISTER_HREF} className="v19-pill v19-pill-wide">
              {PRICING.cta}
              <ArrowRight size={18} aria-hidden strokeWidth={2.2} />
            </Link>

            <ul className="v19-trust">
              {PRICING.trust.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <p className="v19-checkout">{PRICING.checkout}</p>
          </div>

          <p className="v19-failsafe" data-reveal>
            {PRICING.failsafe}
          </p>
        </div>
      </section>

      {/* ---------------- ЯСНО — proof + FAQ ---------------- */}
      <section className="v19-sec v19-clear" id="faq">
        <div className="v19-wrap">
          <p className="v19-clock v19-clock-day" data-reveal>
            {PROOF.clock}
          </p>
          <h2 className="v19-h2 v19-h2-day" data-reveal>
            {PROOF.heading}
          </h2>

          <div className="v19-proof" data-reveal>
            {PROOF.stats.map((s) => (
              <div className="v19-proof-item" key={s.v}>
                <b>{s.k}</b>
                <span>{s.v}</span>
              </div>
            ))}
          </div>
          <p className="v19-freshness" data-reveal>
            <span className="v19-dot" aria-hidden />
            {PROOF.freshness}
          </p>
          <p className="v19-honesty" data-reveal>
            {PROOF.honesty}
          </p>

          <h2 className="v19-h2 v19-h2-day v19-faq-h" data-reveal>
            {FAQ.heading}
          </h2>
          <div className="v19-faq" data-reveal>
            {FAQ.items.map((it) => (
              <details className="v19-faq-item" key={it.q}>
                <summary>
                  <span>{it.q}</span>
                  <span className="v19-faq-plus" aria-hidden />
                </summary>
                <p>{it.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- ФІНАЛ — full light ---------------- */}
      <section className="v19-sec v19-final">
        <div className="v19-wrap v19-final-inner">
          <p className="v19-clock v19-clock-day" data-reveal>
            {FINAL.clock}
          </p>
          <p className="v19-final-line" data-reveal>
            {FINAL.line}
          </p>
          <p className="v19-final-sub" data-reveal>
            {FINAL.sub}
          </p>
          <div className="v19-cta-row v19-cta-center" data-reveal>
            <Link href={REGISTER_HREF} className="v19-pill">
              {FINAL.cta}
              <ArrowRight size={18} aria-hidden strokeWidth={2.2} />
            </Link>
            <Link href={ANON_TRY_HREF} className="v19-ghost v19-ghost-day">
              {FINAL.ctaSecondary}
            </Link>
          </div>

          <ul className="v19-launcher" data-reveal>
            {FINAL.launcher.map((r) => (
              <li key={r.href}>
                <Link href={r.href}>
                  {r.label}
                  <ArrowRight size={16} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------- FOOTER — back to ink ---------------- */}
      <footer className="v19-footer">
        <div className="v19-wrap">
          <div className="v19-foot-cols">
            <div className="v19-foot-brand">
              <span className="v19-brand">{BRAND.name}</span>
              <p>{BRAND.tagline}</p>
              <p className="v19-foot-contact">
                {FOOTER.contactLabel}{" "}
                <a href={`mailto:${BRAND.contactEmail}`}>{BRAND.contactEmail}</a>
              </p>
            </div>
            {FOOTER.columns.map((col) => (
              <div className="v19-foot-col" key={col.title}>
                <p className="v19-foot-h">{col.title}</p>
                <ul>
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href}>{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="v19-disclaimer">{FOOTER.disclaimer}</p>
          <p className="v19-copyright">{FOOTER.copyright}</p>
        </div>
        <div className="v19-ghost-wordmark" aria-hidden>
          {FOOTER.wordmark}
        </div>
      </footer>
    </div>
  );
}

/* ==================================================================== */
/*  Scoped stylesheet — everything under .v19 (never touches globals).  */
/* ==================================================================== */
const CSS = `
.v19{
  --ivory:#F3EFE6; --ivory-dim:#C6C4D8; --ink:#211F19; --ink-dim:#5C5346;
  --amber:#F2A33C; --amber-ink:#1b1205;
  /* Dark day-half amber — AA (≥4.5:1) on the morning peach AND on #FBF8F1;
     the accent for clocks/labels/negation once the light turns. */
  --amber-day:#6E4210;
  --hair-night:rgba(243,239,230,0.14); --hair-day:rgba(33,31,25,0.13);
  --maxw:min(1120px, 92vw);
  font-family:var(--font-body), system-ui, sans-serif;
  color:var(--ivory);
  -webkit-font-smoothing:antialiased;
  overflow-x:hidden;
  position:relative;
}
.v19 *{box-sizing:border-box;}
.v19 ::selection{background:var(--amber);color:var(--amber-ink);}

/* ---- section shells + sky bands ---- */
.v19-sec{position:relative;z-index:1;padding:clamp(4.5rem,10vh,9rem) 0;}
.v19-wrap{width:var(--maxw);margin:0 auto;}
.v19-night-wrap{position:relative;}
.v19-dawn-wrap{position:relative;overflow:hidden;}

.v19-hero{background:linear-gradient(180deg,#090C18 0%,#0E1122 55%,#141830 100%);min-height:100svh;display:flex;flex-direction:column;padding-top:0;}
.v19-agitation{background:linear-gradient(180deg,#141830 0%,#191E38 60%,#1E2440 100%);}
.v19-firstlight{background:linear-gradient(180deg,#1E2440 0%,#2A2F52 55%,#3A3560 100%);}
/* Dawn stays ivory-on-dark and DEEPENS at its base (→#8A5E63) so the topic
   chips + plan preview keep ≥4.5:1; the ivory→ink flip lands at the dawn→
   morning seam (the concept's sanctioned dawn boundary). Morning onward is
   genuinely light so ink + --amber-day text pass at every stop. */
.v19-dawn{background:linear-gradient(180deg,#3A3560 0%,#6B4E68 55%,#8A5E63 100%);}
.v19-morning{background:linear-gradient(180deg,#E9C6A6 0%,#EFDAC4 45%,#F3E6D5 100%);}
.v19-day{background:linear-gradient(180deg,#F3E6D5 0%,#F6EFE2 45%,#F9F4EC 100%);}
.v19-clear{background:linear-gradient(180deg,#F9F4EC 0%,#FAF6F0 100%);}
.v19-final{background:linear-gradient(180deg,#FAF6F0 0%,#F4ECDD 100%);}

/* ---- stars ---- */
.v19-stars{position:absolute;inset:0;z-index:0;pointer-events:none;}
.v19-star{position:absolute;border-radius:50%;background:#FBF6E8;box-shadow:0 0 4px rgba(251,246,232,.6);animation:v19twinkle 4.5s ease-in-out infinite;}
@keyframes v19twinkle{0%,100%{opacity:.9;}50%{opacity:.3;}}

/* ---- sun ---- */
.v19-sun{position:absolute;left:50%;top:62%;width:min(78vw,640px);height:min(78vw,640px);transform:translate(-50%,0);
  background:radial-gradient(circle,rgba(242,163,60,.92) 0%,rgba(242,163,60,.45) 22%,rgba(242,163,60,.14) 42%,rgba(242,163,60,0) 62%);
  z-index:0;pointer-events:none;filter:blur(2px);}

/* ---- nav ---- */
.v19-nav{width:var(--maxw);margin:0 auto;display:flex;align-items:center;justify-content:space-between;padding:1.5rem 0;}
.v19-brand{font-family:var(--font-display),serif;font-weight:600;font-size:1.15rem;letter-spacing:-.01em;color:var(--ivory);}
.v19-nav-right{display:flex;align-items:center;gap:1.25rem;}
.v19-navlink{color:var(--ivory-dim);text-decoration:none;font-size:.95rem;font-weight:600;}
.v19-navlink:hover{color:var(--ivory);}

/* ---- pills ---- */
.v19-pill{display:inline-flex;align-items:center;gap:.5rem;background:var(--amber);color:var(--amber-ink);
  font-weight:700;font-size:1.02rem;padding:.85rem 1.5rem;border-radius:999px;text-decoration:none;
  box-shadow:0 6px 24px rgba(242,163,60,.28);transition:transform .18s cubic-bezier(.22,1,.36,1),box-shadow .18s;}
.v19-pill:hover{transform:translateY(-2px);box-shadow:0 10px 30px rgba(242,163,60,.4);}
.v19-pill svg{transition:transform .18s;}
.v19-pill:hover svg{transform:translateX(3px);}
.v19-pill-sm{padding:.55rem 1.1rem;font-size:.92rem;box-shadow:none;}
.v19-pill-wide{width:100%;justify-content:center;padding:1rem 1.5rem;margin-top:.4rem;}
.v19-ghost{display:inline-flex;align-items:center;color:var(--ivory);text-decoration:none;font-weight:600;
  padding:.85rem 1.3rem;border-radius:999px;border:1px solid var(--hair-night);transition:border-color .18s,background .18s;}
.v19-ghost:hover{border-color:rgba(243,239,230,.45);background:rgba(243,239,230,.05);}
.v19-ghost-day{color:var(--ink);border-color:var(--hair-day);}
.v19-ghost-day:hover{border-color:rgba(33,31,25,.4);background:rgba(33,31,25,.04);}

/* ---- hero ---- */
.v19-hero-inner{width:var(--maxw);margin:0 auto;flex:1;display:flex;flex-direction:column;justify-content:center;
  padding:clamp(2rem,6vh,5rem) 0 clamp(6rem,14vh,10rem);max-width:var(--maxw);}
.v19-clock{font-family:var(--font-display),serif;font-style:italic;font-weight:500;color:var(--amber);
  font-size:.98rem;letter-spacing:.01em;margin-bottom:1.4rem;}
.v19-h1{font-family:var(--font-display),serif;font-weight:600;letter-spacing:-.025em;line-height:1.04;
  font-size:clamp(2.7rem,7vw,5.2rem);margin:0 0 1.5rem;text-wrap:balance;max-width:16ch;}
.v19-h1 span{display:block;}
.v19-lead{font-size:clamp(1.12rem,1.9vw,1.42rem);line-height:1.5;color:var(--ivory);max-width:40ch;margin:0 0 1rem;}
.v19-stat{font-size:1rem;color:var(--ivory-dim);max-width:44ch;margin:0 0 2.2rem;line-height:1.55;}
.v19-cta-row{display:flex;flex-wrap:wrap;gap:.9rem;align-items:center;margin-bottom:1.4rem;}
.v19-reassure{list-style:none;display:flex;flex-wrap:wrap;gap:.4rem 1.3rem;padding:0;margin:0 0 2.4rem;}
.v19-reassure li{position:relative;color:var(--ivory-dim);font-size:.92rem;padding-left:1.1rem;}
.v19-reassure li::before{content:"";position:absolute;left:0;top:.55em;width:5px;height:5px;border-radius:50%;background:var(--amber);}
.v19-chips{list-style:none;display:flex;flex-wrap:wrap;gap:.7rem;padding:0;margin:0;}
.v19-chip{display:flex;flex-direction:column;gap:.1rem;padding:.65rem 1.1rem;border:1px solid var(--hair-night);
  border-radius:14px;background:rgba(243,239,230,.03);}
.v19-chip b{font-family:var(--font-display),serif;font-weight:600;font-size:1.15rem;color:var(--ivory);}
.v19-chip span{font-size:.82rem;color:var(--ivory-dim);}

/* persistent horizon + one lit window — fixed to the viewport, riding the
   whole night half; GSAP scrubs its opacity to 0 as the night-wrap exits. */
.v19-skyline{position:fixed;left:0;right:0;bottom:0;height:1px;z-index:2;pointer-events:none;
  background:linear-gradient(90deg,transparent,rgba(242,163,60,.5) 20%,rgba(243,239,230,.35) 50%,rgba(242,163,60,.5) 80%,transparent);}
.v19-window{position:absolute;right:14%;bottom:1px;width:10px;height:13px;background:var(--amber);border-radius:2px;
  box-shadow:0 0 22px 6px rgba(242,163,60,.55);}

/* ---- typography shared ---- */
.v19-h2{font-family:var(--font-display),serif;font-weight:600;letter-spacing:-.02em;line-height:1.1;
  font-size:clamp(1.9rem,4vw,3.1rem);margin:0 0 1rem;text-wrap:balance;max-width:20ch;color:var(--ivory);}
.v19-h2-day{color:var(--ink);}
.v19-sub{font-size:clamp(1.05rem,1.6vw,1.28rem);line-height:1.55;max-width:52ch;margin:0 0 2rem;}
.v19-sub-dim{color:var(--ivory-dim);}
.v19-sub-day{color:var(--ink);}
.v19-sub-label{font-family:var(--font-display),serif;font-style:italic;color:var(--amber-day);font-size:1rem;margin:0 0 .5rem;}
.v19-clock-day{color:var(--amber-day);}

/* ---- agitation ---- */
.v19-doom{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:0;margin:2.2rem 0 2.6rem;
  border-top:1px solid var(--hair-night);border-bottom:1px solid var(--hair-night);}
.v19-doom-item{display:flex;flex-direction:column;gap:.35rem;padding:1.8rem 1.6rem 1.8rem 0;border-right:1px solid var(--hair-night);}
.v19-doom-item:last-child{border-right:none;}
.v19-doom-big{font-family:var(--font-display),serif;font-weight:600;font-size:clamp(2rem,3.6vw,2.9rem);color:var(--amber);line-height:1;}
.v19-doom-label{font-size:.9rem;color:var(--ivory-dim);text-transform:none;}
.v19-doom-note{font-size:.96rem;color:var(--ivory);line-height:1.5;max-width:32ch;margin-top:.3rem;}
.v19-climax{font-family:var(--font-display),serif;font-weight:500;font-size:clamp(1.4rem,2.8vw,2.1rem);
  line-height:1.34;color:var(--ivory);max-width:24ch;margin:0 0 1.6rem;text-wrap:balance;}
.v19-retaker{color:var(--ivory-dim);font-size:1.02rem;line-height:1.55;max-width:48ch;
  padding-left:1.1rem;border-left:2px solid var(--amber);}

/* ---- dial ---- */
.v19-statement{font-family:var(--font-display),serif;font-style:italic;font-weight:500;
  font-size:clamp(1.5rem,3.4vw,2.5rem);line-height:1.25;color:var(--ivory);max-width:22ch;margin:1.4rem 0 3rem;text-wrap:balance;}
.v19-dial-grid{display:grid;grid-template-columns:minmax(240px,340px) 1fr;gap:clamp(2rem,5vw,4.5rem);align-items:center;}
.v19-dial-viz{display:flex;flex-direction:column;align-items:center;text-align:center;}
.v19-gauge{overflow:visible;}
.v19-gauge-num{font-family:var(--font-display),serif;font-weight:600;font-size:52px;}
.v19-gauge-unit{font-size:13px;opacity:.6;}
.v19-gauge-val{transition:stroke-dasharray .3s linear;}
.v19-dial-plabel{font-family:var(--font-display),serif;font-style:italic;color:var(--amber);margin:.4rem 0 0;font-size:1.05rem;}
.v19-dial-caption{color:var(--ivory-dim);font-size:.92rem;margin:.5rem 0 0;}
.v19-notes{list-style:none;padding:0;margin:0 0 1.6rem;display:flex;flex-direction:column;gap:.7rem;}
.v19-notes li{position:relative;padding-left:1.4rem;color:var(--ivory);font-size:1.02rem;line-height:1.45;}
.v19-notes li::before{content:"";position:absolute;left:0;top:.5em;width:7px;height:7px;border-radius:50%;
  border:1.5px solid var(--amber);}
.v19-moat{font-size:1rem;color:var(--ivory-dim);line-height:1.5;padding-top:1.2rem;border-top:1px solid var(--hair-night);max-width:44ch;}

/* ---- plan ---- */
.v19-plan{margin:1rem 0 2.4rem;}
.v19-plan-field{display:flex;flex-direction:column;gap:.5rem;max-width:340px;}
.v19-plan-field span{font-size:.9rem;color:var(--ivory);}
.v19-date{background:rgba(243,239,230,.06);border:1px solid var(--hair-night);color:var(--ivory);
  border-radius:12px;padding:.8rem 1rem;font-size:1.05rem;font-family:inherit;color-scheme:dark;}
.v19-date:focus{outline:2px solid var(--amber);outline-offset:1px;}
.v19-plan-preview{display:flex;align-items:center;gap:1.4rem;margin:1.6rem 0 .6rem;}
.v19-plan-metric{display:flex;flex-direction:column;}
.v19-plan-metric b{font-family:var(--font-display),serif;font-weight:600;font-size:clamp(2.4rem,5vw,3.6rem);color:var(--ivory);line-height:1;}
.v19-plan-metric span{font-size:.9rem;color:var(--ivory);margin-top:.3rem;}
.v19-plan-x{font-family:var(--font-display),serif;font-size:1.8rem;color:var(--amber);}
.v19-plan-note{color:var(--ivory);font-size:.98rem;font-style:italic;font-family:var(--font-display),serif;min-height:1.4em;}
.v19-topics{padding-top:1.6rem;border-top:1px solid var(--hair-night);}
.v19-topics-label{color:var(--ivory);font-size:.98rem;margin:0 0 1rem;}
.v19-topics-list{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:.6rem;}
.v19-topics-list li{display:flex;align-items:center;gap:.6rem;padding:.55rem .95rem;border:1px solid var(--hair-night);
  border-radius:999px;font-size:.95rem;color:var(--ivory);}
.v19-topic-n{display:inline-flex;align-items:center;justify-content:center;width:1.4rem;height:1.4rem;border-radius:50%;
  background:rgba(242,163,60,.16);color:var(--amber);font-size:.8rem;font-weight:700;}

/* ---- morning / widget ---- */
.v19-metrics{display:flex;flex-wrap:wrap;gap:clamp(1.5rem,4vw,3.5rem);margin:1.4rem 0 2.8rem;padding-bottom:2rem;border-bottom:1px solid var(--hair-day);}
.v19-metric b{display:block;font-family:var(--font-display),serif;font-weight:600;font-size:clamp(2.6rem,6vw,4.2rem);color:var(--ink);line-height:1;}
.v19-metric span{font-size:.95rem;color:var(--ink-dim);}
.v19-widget{background:rgba(255,255,255,.42);border:1px solid var(--hair-day);border-radius:20px;padding:clamp(1.4rem,3vw,2.2rem);}
.v19-widget-head{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;margin-bottom:1.4rem;}
.v19-widget-h{font-family:var(--font-display),serif;font-weight:600;font-size:1.4rem;color:var(--ink);margin:0 0 .35rem;}
.v19-permission{color:var(--ink-dim);font-size:.96rem;margin:0;max-width:34ch;line-height:1.45;}
.v19-mini{flex-shrink:0;}
.v19-q{font-family:var(--font-display),serif;font-weight:600;font-size:1.25rem;color:var(--ink);line-height:1.35;margin:0 0 1.2rem;}
.v19-opts{display:flex;flex-direction:column;gap:.6rem;}
.v19-opt{display:flex;align-items:center;gap:.7rem;text-align:left;font:inherit;font-size:1rem;color:var(--ink);
  background:rgba(255,255,255,.55);border:1px solid var(--hair-day);border-radius:12px;padding:.85rem 1.1rem;cursor:pointer;
  transition:border-color .16s,background .16s,transform .16s;}
.v19-opt:not(:disabled):hover{border-color:var(--amber);transform:translateX(2px);}
.v19-opt:disabled{cursor:default;}
.v19-opt-mark{display:inline-flex;width:18px;flex-shrink:0;color:#2f7d4f;}
.v19-opt.is-correct{border-color:#3f9a63;background:rgba(63,154,99,.14);color:#1f5233;font-weight:600;}
.v19-opt.is-wrong{border-color:#c76a4a;background:rgba(199,106,74,.12);color:#8a3d24;}
.v19-opt.is-dim{opacity:.5;}
.v19-answer{margin-top:1.2rem;display:flex;flex-wrap:wrap;align-items:center;gap:1rem;justify-content:space-between;}
.v19-ans-ok{color:#1f5233;font-weight:600;margin:0;font-size:1.02rem;}
.v19-ans-soft{color:var(--ink-dim);margin:0;font-size:1.02rem;max-width:44ch;line-height:1.45;}
.v19-again{font:inherit;font-weight:600;color:var(--amber-ink);background:none;border:1px solid var(--amber);
  padding:.5rem 1rem;border-radius:999px;cursor:pointer;background:rgba(242,163,60,.14);}
.v19-again:hover{background:rgba(242,163,60,.28);}

/* ---- pricing ---- */
.v19-price-card{background:#FBF8F1;border:1px solid rgba(33,31,25,.08);border-radius:24px;
  padding:clamp(1.6rem,3.5vw,2.8rem);box-shadow:0 24px 70px -30px rgba(60,40,15,.4);max-width:760px;}
.v19-price-top{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;}
.v19-price-title{font-family:var(--font-display),serif;font-weight:600;font-size:1.55rem;color:var(--ink);margin:0 0 .3rem;}
.v19-price-framing{color:var(--ink-dim);font-size:.98rem;margin:0;max-width:32ch;line-height:1.45;}
.v19-price-amount{display:flex;align-items:baseline;gap:.2rem;flex-shrink:0;}
.v19-price-amount b{font-family:var(--font-display),serif;font-weight:700;font-size:clamp(3rem,7vw,4.4rem);color:var(--ink);line-height:1;}
.v19-price-amount span{font-size:1.4rem;color:var(--ink-dim);}
.v19-negation{color:var(--amber-day);font-weight:600;font-size:1rem;margin:1rem 0 1.6rem;}
.v19-ledger{display:grid;grid-template-columns:1fr 1fr;gap:clamp(1.2rem,3vw,2.4rem);padding:1.6rem 0;border-top:1px solid var(--hair-day);border-bottom:1px solid var(--hair-day);}
.v19-col-title{font-family:var(--font-display),serif;font-weight:600;font-size:1.02rem;color:var(--ink);margin:0 0 .9rem;}
.v19-col ul{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:.7rem;}
.v19-col li{display:flex;align-items:flex-start;gap:.6rem;font-size:.98rem;color:var(--ink);line-height:1.4;}
.v19-i-free{color:#3f9a63;flex-shrink:0;margin-top:.15rem;}
.v19-i-paid{color:var(--amber);flex-shrink:0;margin-top:.15rem;}
.v19-anchors{list-style:none;padding:0;margin:1.4rem 0;display:flex;flex-direction:column;gap:.5rem;}
.v19-anchors li{color:var(--ink-dim);font-size:.98rem;padding-left:1.1rem;position:relative;}
.v19-anchors li::before{content:"";position:absolute;left:0;top:.55em;width:5px;height:5px;border-radius:50%;background:var(--amber);}
.v19-trust{list-style:none;padding:0;margin:1.2rem 0 0;display:flex;flex-wrap:wrap;gap:.4rem 1.2rem;justify-content:center;}
.v19-trust li{color:var(--ink-dim);font-size:.9rem;position:relative;padding-left:1rem;}
.v19-trust li::before{content:"";position:absolute;left:0;top:.5em;width:4px;height:4px;border-radius:50%;background:#3f9a63;}
.v19-checkout{text-align:center;color:var(--ink-dim);font-size:.9rem;margin:.9rem 0 0;}
.v19-failsafe{margin:2rem 0 0;color:var(--ink-dim);font-size:.98rem;line-height:1.55;max-width:60ch;
  padding:1.2rem 1.4rem;border:1px dashed rgba(33,31,25,.22);border-radius:14px;}

/* ---- proof + faq ---- */
.v19-proof{display:flex;flex-wrap:wrap;gap:clamp(1.5rem,5vw,4rem);margin:1.4rem 0 1.6rem;}
.v19-proof-item b{display:block;font-family:var(--font-display),serif;font-weight:600;font-size:clamp(2.4rem,5vw,3.4rem);color:var(--ink);line-height:1;}
.v19-proof-item span{color:var(--ink-dim);font-size:.95rem;}
.v19-freshness{display:inline-flex;align-items:center;gap:.5rem;color:var(--ink);font-size:.95rem;font-weight:600;
  background:rgba(63,154,99,.12);border:1px solid rgba(63,154,99,.3);padding:.5rem 1rem;border-radius:999px;margin:0 0 1.4rem;}
.v19-dot{width:8px;height:8px;border-radius:50%;background:#3f9a63;box-shadow:0 0 8px rgba(63,154,99,.7);}
.v19-honesty{color:var(--ink-dim);font-size:1rem;line-height:1.55;max-width:56ch;margin:0 0 3.5rem;}
.v19-faq-h{margin-top:1rem;}
.v19-faq{border-top:1px solid var(--hair-day);}
.v19-faq-item{border-bottom:1px solid var(--hair-day);}
.v19-faq-item summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:1rem;
  padding:1.2rem 0;font-family:var(--font-display),serif;font-weight:600;font-size:clamp(1.1rem,2vw,1.3rem);color:var(--ink);}
.v19-faq-item summary::-webkit-details-marker{display:none;}
.v19-faq-plus{position:relative;width:16px;height:16px;flex-shrink:0;}
.v19-faq-plus::before,.v19-faq-plus::after{content:"";position:absolute;background:var(--amber);border-radius:2px;transition:transform .22s;}
.v19-faq-plus::before{left:0;top:7px;width:16px;height:2px;}
.v19-faq-plus::after{left:7px;top:0;width:2px;height:16px;}
.v19-faq-item[open] .v19-faq-plus::after{transform:scaleY(0);}
.v19-faq-item p{color:var(--ink-dim);font-size:1.02rem;line-height:1.6;max-width:64ch;margin:0 0 1.4rem;}

/* ---- final ---- */
.v19-final-inner{text-align:center;display:flex;flex-direction:column;align-items:center;}
.v19-final-line{font-family:var(--font-display),serif;font-weight:600;letter-spacing:-.02em;
  font-size:clamp(2.4rem,6vw,4.6rem);color:var(--ink);margin:.4rem 0 1rem;line-height:1.05;}
.v19-final-sub{color:var(--ink-dim);font-size:clamp(1.05rem,1.8vw,1.3rem);max-width:40ch;margin:0 0 2.2rem;line-height:1.5;}
.v19-cta-center{justify-content:center;}
.v19-launcher{list-style:none;padding:0;margin:2.6rem auto 0;width:100%;max-width:420px;display:none;flex-direction:column;gap:.6rem;}
.v19-launcher a{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.3rem;
  background:#FBF8F1;border:1px solid var(--hair-day);border-radius:14px;color:var(--ink);text-decoration:none;font-weight:600;}
.v19-launcher a:hover{border-color:var(--amber);}

/* ---- footer ---- */
.v19-footer{position:relative;z-index:1;background:#090C18;color:var(--ivory);padding:clamp(3.5rem,7vh,6rem) 0 3rem;overflow:hidden;}
.v19-foot-cols{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:2.5rem;position:relative;z-index:1;}
.v19-foot-brand p{color:var(--ivory-dim);font-size:.95rem;line-height:1.5;margin:.7rem 0 0;max-width:32ch;}
.v19-foot-contact a{color:var(--amber);text-decoration:none;}
.v19-foot-h{font-weight:700;font-size:.9rem;color:var(--ivory);margin:0 0 1rem;}
.v19-foot-col ul{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:.6rem;}
.v19-foot-col a{color:var(--ivory-dim);text-decoration:none;font-size:.95rem;}
.v19-foot-col a:hover{color:var(--amber);}
.v19-disclaimer{position:relative;z-index:1;color:var(--ivory-dim);font-size:.85rem;line-height:1.55;max-width:70ch;
  margin:3rem 0 1rem;padding-top:1.6rem;border-top:1px solid var(--hair-night);}
.v19-copyright{position:relative;z-index:1;color:var(--ivory-dim);font-size:.85rem;margin:0;}
.v19-ghost-wordmark{position:absolute;left:0;right:0;bottom:-2.5vw;text-align:center;font-family:var(--font-display),serif;
  font-weight:700;font-size:19vw;line-height:1;color:rgba(243,239,230,.035);pointer-events:none;white-space:nowrap;z-index:0;}

/* ---- responsive ---- */
@media (max-width:860px){
  .v19-dial-grid{grid-template-columns:1fr;gap:2.5rem;}
  .v19-dial-viz{order:-1;}
  .v19-ledger{grid-template-columns:1fr;}
  .v19-foot-cols{grid-template-columns:1fr 1fr;gap:2rem;}
  .v19-foot-brand{grid-column:1/-1;}
}
@media (max-width:600px){
  .v19-doom{grid-template-columns:1fr;}
  .v19-doom-item{border-right:none;border-bottom:1px solid var(--hair-night);padding:1.4rem 0;}
  .v19-doom-item:last-child{border-bottom:none;}
  .v19-price-top{flex-direction:column;}
  .v19-widget-head{flex-direction:column-reverse;align-items:flex-start;}
  .v19-launcher{display:flex;}
  .v19-foot-cols{grid-template-columns:1fr;}
  .v19-nav-right .v19-navlink{display:none;}
}

@media (prefers-reduced-motion:reduce){
  .v19-star{animation:none;}
  /* The persistent horizon relies on a scroll scrub to leave the day half;
     with no scrub it would sit over daylight content, so retire it. */
  .v19-skyline{display:none;}
  .v19 *{scroll-behavior:auto;}
}
`;
