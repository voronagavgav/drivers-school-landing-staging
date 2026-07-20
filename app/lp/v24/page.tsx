"use client";

import { useEffect, useRef, useState, useId } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Check, ChevronDown, Plus } from "lucide-react";
import {
  BRAND,
  HERO,
  THESIS1,
  THESIS2,
  THESIS3,
  THESIS4,
  DATE,
  PRICING,
  PROOF,
  FAQ,
  FINAL,
  FOOTER,
  STATS,
  REGISTER_HREF,
  LOGIN_HREF,
  ANON_TRY_HREF,
} from "./copy";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const hero = HERO.variants[HERO.active];

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* JetBrains Mono has no U+20B4 (₴) glyph — render every ₴ in the body face so
   it never falls back to a heavier system currency mark inside a mono run. */
function Money({ text }: { text: string }): React.ReactNode {
  const parts = text.split("₴");
  return (
    <>
      {parts.flatMap((p, i) =>
        i === 0 ? [p] : [<span className="uah" key={`u${i}`}>₴</span>, p],
      )}
    </>
  );
}

/* Ukrainian plural: 1 день · 2–4 дні · 5–20 днів (then by last digit). */
function ukPlural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

/* ============================ HERO exhibit ============================ */
/* The live «Доказ №1»: one official-format question answerable in-viewport
   with zero account; the readiness meter climbs from 0 on the first pick. */
function ProofCard() {
  const [picked, setPicked] = useState<number | null>(null);
  const correctIdx = HERO.demo.options.findIndex((o) => o.correct);
  const answered = picked !== null;
  const isCorrect = picked === correctIdx;
  const meter = !answered ? 0 : isCorrect ? 34 : 12;

  return (
    <div className="proof" aria-label={HERO.proofLabel}>
      <div className="proof-head">
        <span className="proof-tag mono">{HERO.proofLabel}</span>
        <span className="proof-note">{HERO.proofNote}</span>
      </div>
      <p className="proof-q">{HERO.demo.prompt}</p>
      <div className="proof-opts" role="group" aria-label="Варіанти відповіді">
        {HERO.demo.options.map((o, i) => {
          const state =
            !answered ? "" : o.correct ? "ok" : i === picked ? "no" : "dim";
          return (
            <button
              key={i}
              type="button"
              className={`proof-opt ${state}`}
              onClick={() => !answered && setPicked(i)}
              disabled={answered}
              aria-pressed={picked === i}
            >
              <span className="proof-opt-txt">{o.text}</span>
              {answered && o.correct && <Check className="proof-ic" aria-hidden />}
            </button>
          );
        })}
      </div>
      <div className="proof-meter" aria-hidden>
        <div className="proof-meter-track">
          <div className="proof-meter-fill" style={{ transform: `scaleX(${meter / 100})` }} />
        </div>
        <span className="proof-meter-cap mono">
          {answered ? HERO.demo.meterCaptionAnswered : HERO.demo.meterCaption}
        </span>
      </div>
      {answered && (
        <div className="proof-answered">
          <p className={`proof-verdict ${isCorrect ? "ok" : "no"}`}>
            {isCorrect ? HERO.demo.correctNote : HERO.demo.wrongNote}
          </p>
          <p className="proof-explain">{HERO.demo.explain}</p>
        </div>
      )}
      <Link href={ANON_TRY_HREF} className="proof-more">
        {answered ? "Продовжити без реєстрації" : "Більше питань — без реєстрації"}
        <ArrowRight aria-hidden />
      </Link>
    </div>
  );
}

/* ============================ Readiness dial ============================ */
/* Cream→amber sequential arc that VISIBLY DECAYS as the section settles —
   honesty performed, not headlined. Caption verbatim «Це не % пройденого». */
function ReadinessDial() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const arcRef = useRef<SVGCircleElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const R = 78;
  const C = 2 * Math.PI * R;
  const start = 82;
  const end = 61;

  useEffect(() => {
    const arc = arcRef.current;
    const num = numRef.current;
    if (!arc || !num) return;
    const set = (v: number) => {
      arc.style.strokeDashoffset = String(C * (1 - v / 100));
      num.textContent = String(Math.round(v));
    };
    if (prefersReduced()) {
      set(end);
      return;
    }
    set(0);
    const state = { v: 0 };
    const ctx = gsap.context(() => {
      gsap
        .timeline({
          scrollTrigger: { trigger: wrapRef.current, start: "top 72%", once: true },
        })
        .to(state, {
          v: start,
          duration: 1.1,
          ease: "expo.out",
          onUpdate: () => set(state.v),
        })
        .to(state, {
          v: end,
          duration: 1.8,
          ease: "power2.inOut",
          delay: 0.5,
          onUpdate: () => set(state.v),
        });
    }, wrapRef);
    return () => ctx.revert();
  }, [C]);

  return (
    <div className="dial" ref={wrapRef}>
      <svg viewBox="0 0 200 200" className="dial-svg" role="img" aria-label="Демонстрація дилу готовності: число може падати">
        <defs>
          <linearGradient id="v24dial" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F3E7DB" />
            <stop offset="1" stopColor="#E5A13E" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r={R} className="dial-track" />
        <circle
          cx="100"
          cy="100"
          r={R}
          ref={arcRef}
          className="dial-arc"
          style={{ strokeDasharray: C, strokeDashoffset: C }}
        />
      </svg>
      <div className="dial-readout">
        <span className="dial-num mono" ref={numRef}>{end}</span>
        <span className="dial-pct mono">%</span>
        <span className="dial-cap">{THESIS2.dialCaption}</span>
      </div>
    </div>
  );
}

/* ============================ Date planner ============================ */
function DatePlanner() {
  const id = useId();
  const [date, setDate] = useState("");
  let days = 0;
  if (date) {
    const t = new Date(date + "T00:00:00");
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    days = Math.round((t.getTime() - now.getTime()) / 86400000);
  }
  const valid = date && days >= 1;
  const perDay = valid ? Math.max(1, Math.ceil(STATS.bankCount / days)) : 0;
  const intensive = valid && days < 7;

  const today = new Date();
  const min = today.toISOString().slice(0, 10);

  return (
    <div className="planner">
      <label className="planner-label" htmlFor={id}>
        {DATE.prompt}
      </label>
      <input
        id={id}
        type="date"
        className="planner-input mono"
        min={min}
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <div className="planner-out" aria-live="polite">
        {valid ? (
          <>
            <div className="planner-plan">
              <span className="planner-big mono">≈ {days}</span>
              <span className="planner-unit">
                {ukPlural(days, "день", "дні", "днів")}
              </span>
              <span className="planner-x mono">×</span>
              <span className="planner-big mono">{perDay}</span>
              <span className="planner-unit">{DATE.perDayBase}</span>
            </div>
            {intensive && <p className="planner-intensive">{DATE.intensiveNote}</p>}
          </>
        ) : (
          <p className="planner-nodate">{DATE.noDate}</p>
        )}
      </div>
    </div>
  );
}

/* ============================ FAQ item ============================ */
function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="faq-item">
      <summary className="faq-q">
        <span>{q}</span>
        <Plus className="faq-ic" aria-hidden />
      </summary>
      <p className="faq-a">{a}</p>
    </details>
  );
}

/* ============================ Page ============================ */
export default function V24Page() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReduced()) return;
    const ctx = gsap.context(() => {
      /* Line-mask headline reveals — one slow ease-out-expo per masked line. */
      gsap.utils.toArray<HTMLElement>(".mask-in").forEach((el) => {
        gsap.from(el, {
          yPercent: 116,
          duration: 1.05,
          ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });
      /* Numeral count-up on the тези. */
      gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
        const target = Number(el.dataset.count);
        const pad = Number(el.dataset.pad) || 0;
        const o = { v: 0 };
        gsap.to(o, {
          v: target,
          duration: 1.4,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
          onUpdate: () => {
            const n = String(Math.round(o.v));
            el.textContent = pad ? n.padStart(pad, "0") : n;
          },
        });
      });
      /* Soft fade-rise for proof panels / rules (fits what it reveals). */
      gsap.utils.toArray<HTMLElement>(".rise").forEach((el) => {
        gsap.from(el, {
          y: 26,
          opacity: 0,
          duration: 0.9,
          ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 86%", once: true },
        });
      });
      /* Background deepens between тези — scrubbed color timeline, subtle. */
      gsap.to(rootRef.current, {
        backgroundColor: "#3A101A",
        ease: "none",
        scrollTrigger: {
          trigger: ".t-mid",
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <div className="v24" ref={rootRef}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ---------------- top bar ---------------- */}
      <header className="bar">
        <span className="wordmark">{BRAND.name}</span>
        <nav className="bar-nav">
          <Link href={LOGIN_HREF} className="bar-login">
            {HERO.ctaSecondary}
          </Link>
          <Link href={REGISTER_HREF} className="pill pill-sm">
            {HERO.ctaPrimary}
          </Link>
        </nav>
      </header>

      {/* ---------------- HERO ---------------- */}
      <section className="hero">
        <div className="hero-copy">
          <h1 className="hero-h1">
            {hero.headline.split(" ").map((w, i) => (
              <span className="mask" key={i}>
                <span className="mask-in">{w}&nbsp;</span>
              </span>
            ))}
          </h1>
          <p className="hero-sub rise">{hero.sub}</p>
          <p className="hero-hook rise">{HERO.hook}</p>
          <div className="hero-chips rise">
            {HERO.chips.map((c) => (
              <span className="chip mono" key={c}>
                {c}
              </span>
            ))}
          </div>
          <div className="hero-cta rise">
            <Link href={REGISTER_HREF} className="pill pill-amber">
              {HERO.ctaPrimary}
            </Link>
            <Link href={LOGIN_HREF} className="pill pill-ghost">
              {HERO.ctaSecondary}
            </Link>
          </div>
          <Link href={ANON_TRY_HREF} className="hero-anon" aria-label="почати без реєстрації">
            {HERO.anonLink} <ArrowRight aria-hidden />
          </Link>
        </div>
        <div className="hero-exhibit rise">
          <ProofCard />
        </div>
      </section>

      {/* ---------------- ТЕЗА 1 ---------------- */}
      <section className="thesis">
        <div className="t-num mono" data-count={Number(THESIS1.n)} data-pad="2">{THESIS1.n}</div>
        <h2 className="thesis-h2">
          <span className="mask">
            <span className="mask-in">{THESIS1.h2}</span>
          </span>
        </h2>
        <div className="t1-figures rise">
          <div className="t1-fig">
            <span className="t1-big mono">{THESIS1.bigA}</span>
            <span className="t1-lab">{THESIS1.bigALabel}</span>
          </div>
          <span className="t1-and mono">і</span>
          <div className="t1-fig">
            <span className="t1-big mono">{THESIS1.bigB}</span>
            <span className="t1-lab">{THESIS1.bigBLabel}</span>
          </div>
        </div>
        <p className="thesis-resolve rise">{THESIS1.resolution}</p>
      </section>

      {/* ---------------- ТЕЗА 2 (dial) ---------------- */}
      <section className="thesis t-mid interlude">
        <div className="t-num mono" data-count={Number(THESIS2.n)} data-pad="2">{THESIS2.n}</div>
        <h2 className="thesis-h2 center">
          <span className="t-kicker">{THESIS2.h2}</span>
          <span className="mask">
            <span className="mask-in">{THESIS2.claim}</span>
          </span>
        </h2>
        <ReadinessDial />
        <p className="dial-sub rise">{THESIS2.dialSub}</p>
        <p className="decay-note rise">{THESIS2.decayNote}</p>
        <p className="moat rise">{THESIS2.moat}</p>
      </section>

      {/* ---------------- ТЕЗА 3 (mechanism) ---------------- */}
      <section className="thesis">
        <div className="t-num mono" data-count={Number(THESIS3.n)} data-pad="2">{THESIS3.n}</div>
        <h2 className="thesis-h2">
          <span className="t-kicker">{THESIS3.h2}</span>
          <span className="mask">
            <span className="mask-in">{THESIS3.claim}</span>
          </span>
        </h2>
        <ol className="steps">
          {THESIS3.steps.map((s) => (
            <li className="step rise" key={s.k}>
              <span className="step-k mono">{s.k}</span>
              <div className="step-body">
                <h3 className="step-t">{s.t}</h3>
                <p className="step-d">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------------- ТЕЗА 4 (free + simulator) ---------------- */}
      <section className="thesis interlude">
        <div className="t-num mono" data-count={Number(THESIS4.n)} data-pad="2">{THESIS4.n}</div>
        <h2 className="thesis-h2">
          <span className="t-kicker">{THESIS4.h2}</span>
          <span className="mask">
            <span className="mask-in">{THESIS4.claim}</span>
          </span>
        </h2>
        <div className="t4-grid">
          <ul className="free-list rise">
            {THESIS4.freeList.map((f) => (
              <li key={f}>
                <Check aria-hidden /> {f}
              </li>
            ))}
          </ul>
          <div className="sim rise">
            <div className="sim-chips">
              {THESIS4.simChips.map((c) => (
                <div className="sim-chip" key={c.l}>
                  <span className="sim-v mono" data-count={c.v}>
                    {c.v}
                  </span>
                  <span className="sim-l">{c.l}</span>
                </div>
              ))}
            </div>
            <p className="sim-rule">{THESIS4.simRule}</p>
            <p className="sim-free">{THESIS4.simFree}</p>
            <p className="sim-wedge">{THESIS4.wedge}</p>
          </div>
        </div>
      </section>

      {/* ---------------- ТВОЯ ДАТА ---------------- */}
      <section className="thesis date-sec">
        <h2 className="thesis-h2 center">
          <span className="t-kicker">{DATE.h2}</span>
          <span className="mask">
            <span className="mask-in">{DATE.claim}</span>
          </span>
        </h2>
        <div className="rise">
          <DatePlanner />
        </div>
        <p className="hinge rise">{DATE.hinge}</p>
      </section>

      {/* ---------------- ТЕЗА 5 (pricing) ---------------- */}
      <section className="thesis pricing-sec interlude">
        <div className="t-num mono" data-count={Number(PRICING.n)} data-pad="2">{PRICING.n}</div>
        <h2 className="thesis-h2 center">
          <span className="t-kicker">{PRICING.h2}</span>
          <span className="mask">
            <span className="mask-in">{PRICING.claim}</span>
          </span>
        </h2>
        <p className="loss rise">
          <Money text={PRICING.loss} />
        </p>
        <div className="price-grid">
          <div className="price-col free-col rise">
            <span className="price-col-tag mono">{PRICING.free.title}</span>
            <ul className="price-items">
              {PRICING.free.items.map((it) => (
                <li key={it}>
                  <Check aria-hidden /> {it}
                </li>
              ))}
            </ul>
            <span className="price-free-mark">безкоштовно</span>
          </div>

          <div className="price-col paid-col rise">
            <span className="price-col-tag mono paid">{PRICING.paid.title}</span>
            <div className="price-amount">
              <span className="price-num mono">{PRICING.paid.price}</span>
              <span className="price-cur uah">₴</span>
              <span className="price-unit mono">· {PRICING.paid.unit}</span>
            </div>
            <p className="price-frame">{PRICING.paid.frame}</p>
            <ul className="price-items">
              {PRICING.paid.items.map((it) => (
                <li key={it}>
                  <Check aria-hidden /> {it}
                </li>
              ))}
            </ul>
            <p className="price-negation mono">{PRICING.paid.negation}</p>
            <Link href={REGISTER_HREF} className="pill pill-amber price-cta">
              {PRICING.paid.cta}
            </Link>
            <div className="trust-band mono">
              {PRICING.paid.trust.map((t, i) => (
                <span key={t}>
                  {i > 0 && <span className="trust-dot">·</span>}
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
        <p className="cheaper rise">{PRICING.paid.cheaper}</p>
        <p className="anchor rise">
          <Money text={PRICING.paid.anchor} />
        </p>
      </section>

      {/* ---------------- БАЗА ---------------- */}
      <section className="base-sec">
        <h2 className="base-claim">
          <span className="t-kicker">{PROOF.h2}</span>
          <span className="mask">
            <span className="mask-in">{PROOF.claim}</span>
          </span>
        </h2>
        <div className="base-facts">
          {PROOF.facts.map((f) => (
            <div className="base-fact rise" key={f.l}>
              <span className="base-v mono">{f.v}</span>
              <span className="base-l">{f.l}</span>
            </div>
          ))}
        </div>
        <div className="reserved rise">
          <span className="reserved-tag mono">{PROOF.reserved.label}</span>
          <p className="reserved-text">{PROOF.reserved.text}</p>
        </div>
        <p className="retaker rise">{PROOF.retaker}</p>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section className="faq-sec">
        <h2 className="faq-h2">
          <span className="mask">
            <span className="mask-in">{FAQ.h2}</span>
          </span>
        </h2>
        <div className="faq-list">
          {FAQ.items.map((it) => (
            <FaqItem key={it.q} q={it.q} a={it.a} />
          ))}
        </div>
      </section>

      {/* ---------------- FINAL CTA + modes ---------------- */}
      <section className="final">
        <h2 className="final-h2">
          <span className="mask">
            <span className="mask-in">{FINAL.restate}</span>
          </span>
        </h2>
        <p className="final-sub rise">{FINAL.restateSub}</p>
        <div className="final-cta rise">
          <Link href={REGISTER_HREF} className="pill pill-amber">
            {FINAL.ctaPrimary}
          </Link>
          <Link href={LOGIN_HREF} className="pill pill-ghost">
            {FINAL.ctaSecondary}
          </Link>
        </div>
        <div className="modes">
          <span className="modes-title mono">{FINAL.modesTitle}</span>
          {FINAL.modes.map((m) => (
            <Link href={m.href} className="mode-row" key={m.t}>
              <div className="mode-txt">
                <span className="mode-t">{m.t}</span>
                <span className="mode-d">{m.d}</span>
              </div>
              <ArrowRight className="mode-arrow" aria-hidden />
            </Link>
          ))}
        </div>
      </section>

      {/* ---------------- FOOTER ---------------- */}
      <footer className="foot">
        <div className="foot-top">
          <div className="foot-cols">
            {FOOTER.columns.map((col) => (
              <div className="foot-col" key={col.title}>
                <span className="foot-col-t mono">{col.title}</span>
                {col.links.map((l) => (
                  <Link href={l.href} className="foot-link" key={l.t}>
                    {l.t}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
        <p className="foot-disclaimer">{FOOTER.disclaimer}</p>
        <div className="foot-sign">
          <span className="foot-wordmark">{FOOTER.wordmark}</span>
        </div>
        <span className="foot-copy mono">{FOOTER.copyright}</span>
      </footer>
    </div>
  );
}

/* ============================ scoped styles ============================ */
/* «Прямим текстом» — drenched oxblood editorial manifesto. The surface IS
   the color (impeccable drenched strategy): deep wine ground, cream ink, a
   single amber accent reserved for the primary CTA + тези numerals. Cream
   «paper» objects (proof card, pricing card) are the page's only light
   surfaces — the plain 399 reads loudest by material contrast. Committed to
   a single look regardless of system theme: the oxblood is the brand. */
const CSS = `
.v24{
  --bg:#43141D; --bg-deep:#2E0D13; --surface:#521A24;
  --cream:#F3E7DB; --muted:#CBB0A2; --line:rgba(243,231,219,.15);
  --line-2:rgba(243,231,219,.28);
  --amber:#E5A13E;
  --paper:#F3E7DB; --paper-ink:#43141D; --paper-muted:#7C4A50;
  --paper-line:rgba(67,20,29,.14);
  --ok:#7FB08A; --no:#E58A6B;
  background:var(--bg); color:var(--cream);
  font-family:var(--font-v24-body),ui-sans-serif,system-ui,sans-serif;
  -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility;
  overflow-x:hidden;
}
.v24 *{box-sizing:border-box}
.v24 .mono{font-family:var(--font-v24-mono),ui-monospace,monospace;font-feature-settings:"tnum" 1}
.v24 .uah{font-family:var(--font-v24-body),system-ui,sans-serif}

/* ---- layout rails ---- */
.v24 section{padding-inline:clamp(20px,6vw,120px)}
.v24 .thesis{
  max-width:1180px;margin-inline:auto;
  padding-block:clamp(84px,13vh,168px);
  border-top:1px solid var(--line);
}
/* Interludes go DEEPER as a full-bleed movement: the 1180px rail stays the
   reading column, but the deep-ink ground breaks out to the full viewport via
   a −1 z pseudo (page root is overflow-x:hidden, so 100vw can't scroll). */
.v24 .interlude{position:relative;z-index:0;border-top:none}
.v24 .interlude::before{
  content:"";position:absolute;top:0;bottom:0;left:50%;
  width:100vw;transform:translateX(-50%);
  background:var(--bg-deep);z-index:-1;
}

/* ---- top bar ---- */
.v24 .bar{
  position:sticky;top:0;z-index:30;
  display:flex;align-items:center;justify-content:space-between;
  padding:16px clamp(20px,6vw,120px);
  background:color-mix(in srgb,var(--bg) 82%,transparent);
  backdrop-filter:blur(10px);
  border-bottom:1px solid var(--line);
}
.v24 .wordmark{
  font-family:var(--font-v24-display),serif;font-weight:700;
  font-size:19px;letter-spacing:-.01em;color:var(--cream);
}
.v24 .bar-nav{display:flex;align-items:center;gap:16px}
.v24 .bar-login{color:var(--muted);font-size:14px;font-weight:500}
.v24 .bar-login:hover{color:var(--cream)}

/* ---- pills ---- */
.v24 .pill{
  display:inline-flex;align-items:center;gap:8px;
  padding:14px 26px;border-radius:999px;
  font-weight:600;font-size:16px;letter-spacing:-.01em;
  transition:transform .5s cubic-bezier(.16,1,.3,1),background .3s,box-shadow .3s;
  white-space:nowrap;
}
.v24 .pill-sm{padding:9px 18px;font-size:14px}
.v24 .pill-amber{
  background:var(--amber);color:#3A0E16;
  box-shadow:0 1px 0 rgba(255,255,255,.28) inset,0 10px 30px rgba(229,161,62,.24);
}
.v24 .pill-amber:hover{transform:translateY(-2px);box-shadow:0 1px 0 rgba(255,255,255,.3) inset,0 16px 40px rgba(229,161,62,.34)}
.v24 .pill-ghost{background:transparent;color:var(--cream);border:1px solid var(--line-2)}
.v24 .pill-ghost:hover{background:rgba(243,231,219,.06);transform:translateY(-2px)}
.v24 .pill-amber.pill-sm{color:#3A0E16}

/* ---- HERO ---- */
.v24 .hero{
  max-width:1240px;margin-inline:auto;
  padding-block:clamp(56px,9vh,110px) clamp(72px,11vh,140px);
  display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);
  gap:clamp(32px,5vw,72px);align-items:center;
}
.v24 .hero-h1{
  font-family:var(--font-v24-display),serif;font-weight:800;
  font-size:clamp(2.6rem,6.4vw,5.4rem);line-height:1.02;
  letter-spacing:-.035em;margin:0 0 22px;text-wrap:balance;
}
.v24 .mask{display:inline-block;overflow:hidden;vertical-align:top}
.v24 .mask-in{display:inline-block}
.v24 .hero-sub{
  font-size:clamp(1.05rem,1.7vw,1.35rem);color:var(--cream);
  max-width:34ch;line-height:1.45;margin:0 0 26px;font-weight:500;
}
.v24 .hero-hook{
  font-size:15px;color:var(--amber);font-weight:600;
  margin:0 0 26px;letter-spacing:-.005em;
}
.v24 .hero-chips{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:30px}
.v24 .chip{
  font-size:12.5px;color:var(--muted);
  padding:7px 13px;border:1px solid var(--line-2);border-radius:999px;
  letter-spacing:.01em;
}
.v24 .hero-cta{display:flex;flex-wrap:wrap;gap:14px;margin-bottom:18px}
.v24 .hero-anon{
  display:inline-flex;align-items:center;gap:7px;
  color:var(--muted);font-size:14.5px;font-weight:500;
}
.v24 .hero-anon:hover{color:var(--cream)}
.v24 .hero-anon svg{width:15px;height:15px;transition:transform .4s cubic-bezier(.16,1,.3,1)}
.v24 .hero-anon:hover svg{transform:translateX(4px)}

/* ---- proof / exhibit card (cream paper) ---- */
.v24 .proof{
  background:var(--paper);color:var(--paper-ink);
  border-radius:22px;padding:clamp(20px,2.4vw,30px);
  box-shadow:0 30px 70px rgba(20,6,10,.5),0 2px 0 rgba(255,255,255,.4) inset;
}
.v24 .proof-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:18px}
.v24 .proof-tag{
  font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
  color:#9A3A2A;background:rgba(154,58,42,.1);padding:5px 10px;border-radius:999px;
}
.v24 .proof-note{font-size:12px;color:var(--paper-muted);text-align:right}
.v24 .proof-q{font-size:clamp(1.02rem,1.4vw,1.18rem);font-weight:600;line-height:1.35;margin:0 0 18px}
.v24 .proof-opts{display:flex;flex-direction:column;gap:9px;margin-bottom:18px}
.v24 .proof-opt{
  display:flex;align-items:center;justify-content:space-between;gap:10px;
  text-align:left;width:100%;cursor:pointer;
  padding:14px 16px;border-radius:13px;
  border:1px solid var(--paper-line);background:rgba(67,20,29,.02);
  color:var(--paper-ink);font-size:15px;font-weight:500;font-family:inherit;
  transition:background .2s,border-color .2s,transform .2s;
}
.v24 .proof-opt:hover:not(:disabled){background:rgba(67,20,29,.05);border-color:rgba(67,20,29,.3);transform:translateX(2px)}
.v24 .proof-opt:disabled{cursor:default}
.v24 .proof-opt.ok{background:rgba(46,120,72,.14);border-color:#3E8A5A;color:#245A3A}
.v24 .proof-opt.no{background:rgba(180,60,42,.12);border-color:#C86A50;color:#9A3A2A}
.v24 .proof-opt.dim{opacity:.5}
.v24 .proof-ic{width:18px;height:18px;color:#2E7848;flex:none}
.v24 .proof-meter{margin-bottom:14px}
.v24 .proof-meter-track{height:7px;border-radius:999px;background:rgba(67,20,29,.1);overflow:hidden}
.v24 .proof-meter-fill{height:100%;width:100%;transform-origin:left;border-radius:999px;background:linear-gradient(90deg,#C77A2E,#E5A13E);transition:transform .8s cubic-bezier(.16,1,.3,1)}
.v24 .proof-meter-cap{display:block;margin-top:8px;font-size:11.5px;color:var(--paper-muted)}
.v24 .proof-meter-val{color:#9A3A2A;font-weight:700}
.v24 .proof-verdict{font-size:13.5px;line-height:1.4;margin:0 0 10px;font-weight:500}
.v24 .proof-verdict.ok{color:#245A3A}
.v24 .proof-verdict.no{color:#9A3A2A}
.v24 .proof-explain{
  font-size:13px;line-height:1.5;margin:0 0 16px;color:var(--paper-muted);
  padding:12px 14px;border-radius:11px;
  background:rgba(67,20,29,.05);border:1px solid var(--paper-line);
}
.v24 .proof-more{
  display:inline-flex;align-items:center;gap:7px;
  font-size:14px;font-weight:600;color:var(--paper-ink);
  border-top:1px solid var(--paper-line);padding-top:16px;width:100%;
}
.v24 .proof-more svg{width:15px;height:15px;transition:transform .4s cubic-bezier(.16,1,.3,1)}
.v24 .proof-more:hover svg{transform:translateX(4px)}

/* ---- thesis shell ---- */
.v24 .t-num{
  font-size:clamp(2.4rem,5vw,4rem);font-weight:700;color:var(--amber);
  letter-spacing:.01em;line-height:1;margin-bottom:22px;
  font-variant-numeric:tabular-nums;
}
.v24 .t-kicker{
  display:block;font-family:var(--font-v24-mono),ui-monospace,monospace;
  font-size:12px;font-weight:500;letter-spacing:.09em;text-transform:uppercase;
  color:var(--muted);margin-bottom:16px;
}
.v24 .thesis-h2{
  font-family:var(--font-v24-display),serif;font-weight:700;
  font-size:clamp(2rem,4.4vw,3.6rem);line-height:1.08;
  letter-spacing:-.032em;margin:0;text-wrap:balance;max-width:18ch;
}
.v24 .thesis-h2.center{max-width:22ch;margin-inline:auto;text-align:center}
.v24 .thesis-resolve{
  font-size:clamp(1.05rem,1.7vw,1.3rem);color:var(--cream);
  max-width:52ch;line-height:1.5;margin:44px 0 0;font-weight:500;
}

/* ТЕЗА 1 figures */
.v24 .t1-figures{
  display:flex;flex-wrap:wrap;align-items:flex-start;gap:clamp(24px,5vw,64px);
  margin:56px 0 0;
}
.v24 .t1-fig{display:flex;flex-direction:column;gap:8px}
.v24 .t1-big{
  font-family:var(--font-v24-display),serif;font-weight:800;
  font-size:clamp(3.4rem,9vw,6rem);line-height:.9;letter-spacing:-.04em;color:var(--cream);
}
.v24 .t1-lab{font-size:15px;color:var(--muted);font-weight:500;max-width:16ch}
.v24 .t1-and{color:var(--amber);font-size:1.6rem;align-self:center;font-weight:600}

/* ТЕЗА 2 dial */
.v24 .dial{position:relative;width:min(320px,72vw);aspect-ratio:1;margin:56px auto 0}
.v24 .dial-svg{width:100%;height:100%;transform:rotate(-90deg)}
.v24 .dial-track{fill:none;stroke:rgba(243,231,219,.12);stroke-width:12}
.v24 .dial-arc{fill:none;stroke:url(#v24dial);stroke-width:12;stroke-linecap:round}
.v24 .dial-readout{
  position:absolute;inset:0;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:2px;
}
.v24 .dial-num{font-size:clamp(3rem,9vw,4.4rem);font-weight:700;line-height:1;color:var(--cream)}
.v24 .dial-pct{font-size:1.2rem;color:var(--amber);font-weight:600;margin-top:-6px}
.v24 .dial-cap{font-size:12.5px;color:var(--muted);margin-top:10px;letter-spacing:.02em}
.v24 .dial-sub{
  font-size:clamp(1rem,1.5vw,1.18rem);color:var(--cream);
  max-width:46ch;line-height:1.5;margin:36px auto 0;text-align:center;font-weight:500;
}
.v24 .decay-note{
  font-size:14.5px;color:var(--muted);max-width:44ch;
  margin:16px auto 0;text-align:center;line-height:1.5;
}
.v24 .moat{
  font-family:var(--font-v24-display),serif;font-style:italic;font-weight:600;
  font-size:clamp(1.1rem,2vw,1.5rem);color:var(--amber);
  max-width:30ch;margin:40px auto 0;text-align:center;line-height:1.3;letter-spacing:-.01em;
}

/* ТЕЗА 3 steps */
.v24 .steps{list-style:none;margin:56px 0 0;padding:0;display:grid;gap:0}
.v24 .step{
  display:flex;gap:clamp(18px,3vw,40px);align-items:flex-start;
  padding:30px 0;border-top:1px solid var(--line);
}
.v24 .step:last-child{border-bottom:1px solid var(--line)}
.v24 .step-k{
  font-size:clamp(1.6rem,3vw,2.4rem);font-weight:700;color:var(--amber);
  line-height:1;flex:none;min-width:2.4ch;
}
.v24 .step-t{
  font-family:var(--font-v24-display),serif;font-weight:700;
  font-size:clamp(1.25rem,2.2vw,1.7rem);margin:0 0 8px;letter-spacing:-.02em;line-height:1.15;
}
.v24 .step-d{font-size:15.5px;color:var(--muted);line-height:1.5;margin:0;max-width:52ch}

/* ТЕЗА 4 free + sim */
.v24 .t4-grid{
  display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);
  gap:clamp(28px,4vw,60px);margin-top:52px;align-items:start;
}
.v24 .free-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:16px}
.v24 .free-list li{
  display:flex;align-items:center;gap:12px;
  font-size:clamp(1.05rem,1.8vw,1.35rem);font-weight:500;color:var(--cream);
}
.v24 .free-list svg{width:20px;height:20px;color:var(--amber);flex:none}
.v24 .sim{
  background:var(--surface);border:1px solid var(--line-2);border-radius:20px;
  padding:clamp(22px,3vw,34px);
}
.v24 .sim-chips{display:flex;gap:12px;margin-bottom:20px}
.v24 .sim-chip{
  flex:1;text-align:center;padding:16px 6px;border-radius:14px;
  background:var(--bg-deep);border:1px solid var(--line);
}
.v24 .sim-v{display:block;font-size:clamp(1.8rem,4vw,2.6rem);font-weight:700;color:var(--amber);line-height:1}
.v24 .sim-l{font-size:12px;color:var(--muted);margin-top:6px;display:block}
.v24 .sim-rule{font-size:14.5px;color:var(--muted);line-height:1.5;margin:0 0 16px}
.v24 .sim-free{
  font-family:var(--font-v24-display),serif;font-weight:700;
  font-size:clamp(1.3rem,2.4vw,1.8rem);color:var(--cream);margin:0 0 10px;letter-spacing:-.02em;
}
.v24 .sim-wedge{font-size:14px;color:var(--muted);margin:0}

/* ТВОЯ ДАТА planner */
.v24 .date-sec{max-width:820px}
.v24 .planner{
  margin:52px auto 0;max-width:520px;text-align:center;
  background:var(--surface);border:1px solid var(--line-2);border-radius:22px;
  padding:clamp(26px,4vw,44px);
}
.v24 .planner-label{display:block;font-size:15px;color:var(--muted);margin-bottom:16px;font-weight:500}
.v24 .planner-input{
  font-size:18px;padding:14px 18px;border-radius:14px;
  background:var(--bg-deep);border:1px solid var(--line-2);color:var(--cream);
  width:100%;max-width:280px;color-scheme:dark;text-align:center;
}
.v24 .planner-input:focus{outline:2px solid var(--amber);outline-offset:2px}
.v24 .planner-out{margin-top:26px;min-height:70px;display:flex;align-items:center;justify-content:center}
.v24 .planner-plan{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:center;gap:8px}
.v24 .planner-big{font-size:clamp(1.9rem,5vw,2.8rem);font-weight:700;color:var(--amber);line-height:1}
.v24 .planner-unit{font-size:15px;color:var(--cream);font-weight:500}
.v24 .planner-x{font-size:1.4rem;color:var(--muted);margin-inline:6px}
.v24 .planner-intensive{font-size:14px;color:var(--amber);margin:16px 0 0;font-weight:600}
.v24 .planner-nodate{font-size:15px;color:var(--muted);line-height:1.5;margin:0;max-width:36ch}
.v24 .hinge{
  font-family:var(--font-v24-display),serif;font-style:italic;font-weight:600;
  font-size:clamp(1.15rem,2.2vw,1.6rem);color:var(--cream);
  text-align:center;margin:40px auto 0;max-width:26ch;letter-spacing:-.01em;
}

/* ТЕЗА 5 pricing */
.v24 .pricing-sec{max-width:1120px}
.v24 .loss{
  font-family:var(--font-v24-display),serif;font-weight:700;
  font-size:clamp(1.3rem,3vw,2.2rem);color:var(--cream);
  text-align:center;margin:40px auto 0;max-width:22ch;line-height:1.2;letter-spacing:-.02em;
}
.v24 .price-grid{
  display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);
  gap:clamp(18px,2.5vw,32px);margin-top:44px;align-items:stretch;
}
.v24 .price-col{border-radius:22px;padding:clamp(24px,3vw,38px);display:flex;flex-direction:column}
.v24 .free-col{background:var(--surface);border:1px solid var(--line-2)}
.v24 .paid-col{
  background:var(--paper);color:var(--paper-ink);
  box-shadow:0 30px 80px rgba(20,6,10,.5),0 2px 0 rgba(255,255,255,.4) inset;
}
.v24 .price-col-tag{
  font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
  color:var(--muted);margin-bottom:20px;
}
.v24 .price-col-tag.paid{color:#9A3A2A}
.v24 .price-amount{display:flex;align-items:baseline;gap:4px;margin-bottom:6px}
.v24 .price-num{font-size:clamp(3.4rem,8vw,5rem);font-weight:700;line-height:.9;color:var(--paper-ink);letter-spacing:-.03em}
.v24 .price-cur{font-size:1.8rem;font-weight:600;color:var(--paper-ink)}
.v24 .price-unit{font-size:15px;color:var(--paper-muted);font-weight:500}
.v24 .price-frame{font-size:14px;color:var(--paper-muted);margin:0 0 22px;line-height:1.45;max-width:32ch}
.v24 .price-items{list-style:none;margin:0 0 22px;padding:0;display:flex;flex-direction:column;gap:12px;flex:1}
.v24 .price-items li{display:flex;align-items:flex-start;gap:10px;font-size:15px;font-weight:500;line-height:1.35}
.v24 .free-col .price-items li{color:var(--cream)}
.v24 .free-col .price-items svg{color:var(--amber)}
.v24 .paid-col .price-items li{color:var(--paper-ink)}
.v24 .paid-col .price-items svg{color:#2E7848}
.v24 .price-items svg{width:18px;height:18px;flex:none;margin-top:1px}
.v24 .price-free-mark{
  font-family:var(--font-v24-display),serif;font-weight:800;
  font-size:clamp(1.8rem,4vw,2.6rem);color:var(--amber);letter-spacing:-.02em;margin-top:auto;
}
.v24 .price-negation{font-size:13px;color:var(--paper-muted);margin:0 0 18px;font-weight:600}
.v24 .price-cta{justify-content:center;width:100%;margin-bottom:18px}
.v24 .trust-band{
  display:flex;flex-wrap:wrap;justify-content:center;gap:8px;
  font-size:12.5px;color:var(--paper-muted);font-weight:500;
}
.v24 .trust-dot{margin-right:8px;color:#C86A50}
.v24 .cheaper{
  font-family:var(--font-v24-display),serif;font-weight:700;
  font-size:clamp(1.1rem,2vw,1.5rem);color:var(--amber);
  text-align:center;margin:40px auto 0;letter-spacing:-.01em;
}
.v24 .anchor{font-size:14px;color:var(--muted);text-align:center;margin:12px auto 0;max-width:44ch;line-height:1.5}

/* БАЗА */
.v24 .base-sec{
  max-width:1120px;margin-inline:auto;
  padding-block:clamp(84px,13vh,168px);border-top:1px solid var(--line);
}
.v24 .base-claim{
  font-family:var(--font-v24-display),serif;font-weight:700;
  font-size:clamp(1.8rem,3.6vw,2.8rem);letter-spacing:-.03em;margin:0 0 44px;
}
.v24 .base-facts{display:flex;flex-wrap:wrap;gap:clamp(20px,4vw,56px);margin-bottom:44px}
.v24 .base-fact{display:flex;flex-direction:column;gap:6px}
.v24 .base-v{font-size:clamp(2rem,5vw,3.2rem);font-weight:700;color:var(--cream);line-height:1;letter-spacing:-.02em}
.v24 .base-l{font-size:14px;color:var(--muted)}
.v24 .reserved{
  border:1px dashed var(--line-2);border-radius:18px;padding:24px 26px;
  display:flex;gap:18px;align-items:flex-start;max-width:640px;margin-bottom:26px;
}
.v24 .reserved-tag{
  font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
  color:var(--amber);border:1px solid var(--amber);border-radius:999px;padding:5px 11px;flex:none;
}
.v24 .reserved-text{font-size:14.5px;color:var(--muted);line-height:1.5;margin:0}
.v24 .retaker{font-size:15px;color:var(--cream);font-weight:500;max-width:48ch;line-height:1.5;margin:0}

/* FAQ */
.v24 .faq-sec{
  max-width:820px;margin-inline:auto;
  padding-block:clamp(72px,11vh,140px);border-top:1px solid var(--line);
}
.v24 .faq-h2{
  font-family:var(--font-v24-display),serif;font-weight:700;
  font-size:clamp(1.9rem,4vw,3rem);letter-spacing:-.03em;margin:0 0 36px;
}
.v24 .faq-list{display:flex;flex-direction:column}
.v24 .faq-item{border-top:1px solid var(--line)}
.v24 .faq-item:last-child{border-bottom:1px solid var(--line)}
.v24 .faq-q{
  display:flex;align-items:center;justify-content:space-between;gap:16px;
  padding:22px 0;cursor:pointer;list-style:none;
  font-size:clamp(1.05rem,1.8vw,1.25rem);font-weight:600;color:var(--cream);
  letter-spacing:-.01em;
}
.v24 .faq-q::-webkit-details-marker{display:none}
.v24 .faq-ic{width:20px;height:20px;color:var(--amber);flex:none;transition:transform .3s cubic-bezier(.16,1,.3,1)}
.v24 .faq-item[open] .faq-ic{transform:rotate(45deg)}
.v24 .faq-a{font-size:15.5px;color:var(--muted);line-height:1.6;margin:0 0 24px;max-width:64ch}

/* FINAL */
.v24 .final{
  max-width:900px;margin-inline:auto;text-align:center;
  padding-block:clamp(84px,13vh,170px);border-top:1px solid var(--line);
}
.v24 .final-h2{
  font-family:var(--font-v24-display),serif;font-weight:800;
  font-size:clamp(2.2rem,5.4vw,4.4rem);line-height:1.04;
  letter-spacing:-.035em;margin:0 0 20px;text-wrap:balance;
}
.v24 .final-sub{font-size:clamp(1.05rem,1.8vw,1.35rem);color:var(--muted);margin:0 0 32px;font-weight:500}
.v24 .final-cta{display:flex;flex-wrap:wrap;gap:14px;justify-content:center;margin-bottom:56px}
.v24 .modes{
  display:flex;flex-direction:column;gap:0;max-width:520px;margin:0 auto;
  border-top:1px solid var(--line);
}
.v24 .modes-title{
  font-size:12px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;
  padding:20px 4px 12px;text-align:left;
}
.v24 .mode-row{
  display:flex;align-items:center;justify-content:space-between;gap:16px;
  padding:20px 4px;border-top:1px solid var(--line);text-align:left;
  transition:transform .35s cubic-bezier(.16,1,.3,1);
}
.v24 .mode-row:hover{transform:translateX(8px)}
.v24 .mode-t{display:block;font-weight:600;font-size:1.1rem;color:var(--cream)}
.v24 .mode-d{display:block;font-size:13.5px;color:var(--muted);margin-top:3px}
.v24 .mode-arrow{width:20px;height:20px;color:var(--amber);flex:none;transition:transform .35s cubic-bezier(.16,1,.3,1)}
.v24 .mode-row:hover .mode-arrow{transform:translateX(5px)}

/* FOOTER — giant cream wordmark bleeding off the oxblood ground */
.v24 .foot{background:var(--bg-deep);border-top:1px solid var(--line);padding:clamp(48px,7vw,88px) clamp(20px,6vw,120px) 0;overflow:hidden}
.v24 .foot-top{max-width:1180px;margin-inline:auto}
.v24 .foot-cols{display:flex;flex-wrap:wrap;gap:clamp(40px,8vw,120px)}
.v24 .foot-col{display:flex;flex-direction:column;gap:12px}
.v24 .foot-col-t{font-size:12px;color:var(--muted);letter-spacing:.06em;text-transform:uppercase;margin-bottom:4px}
.v24 .foot-link{font-size:15px;color:var(--cream);font-weight:500}
.v24 .foot-link:hover{color:var(--amber)}
.v24 .foot-disclaimer{
  max-width:1180px;margin:clamp(40px,6vw,72px) auto 0;
  font-size:13px;color:var(--muted);line-height:1.6;max-width:70ch;
}
.v24 .foot-sign{max-width:1180px;margin:clamp(28px,4vw,48px) auto 0;line-height:.8}
.v24 .foot-wordmark{
  font-family:var(--font-v24-display),serif;font-weight:800;
  font-size:clamp(3.4rem,16vw,13rem);color:var(--cream);letter-spacing:-.04em;
  display:block;white-space:nowrap;margin-left:-.02em;
  line-height:.85;transform:translateY(12%);
}
.v24 .foot-copy{
  display:block;max-width:1180px;margin:20px auto;
  font-size:12.5px;color:var(--muted);
}

/* ---- responsive ---- */
@media (max-width:900px){
  .v24 .hero{grid-template-columns:1fr;padding-block:40px 64px;gap:40px}
  .v24 .hero-sub{max-width:none}
  .v24 .t4-grid{grid-template-columns:1fr}
  .v24 .price-grid{grid-template-columns:1fr}
  .v24 .thesis-h2{max-width:none}
}
@media (max-width:600px){
  .v24 .bar-login{display:none}
  .v24 .t1-figures{flex-direction:column;gap:24px}
  .v24 .t1-and{align-self:flex-start}
  .v24 .hero-cta .pill{flex:1;justify-content:center}
  .v24 .sim-chips{flex-wrap:wrap}
}

/* ---- reduced motion: everything pre-revealed ---- */
@media (prefers-reduced-motion:reduce){
  .v24 .mask-in,.v24 .rise{transform:none!important;opacity:1!important}
  .v24 .pill,.v24 .mode-row,.v24 .proof-opt,.v24 .faq-ic,.v24 .mode-arrow,
  .v24 .hero-anon svg,.v24 .proof-more svg{transition:none!important}
}
`;
