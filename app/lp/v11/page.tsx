"use client";

/* ═══════════════════════════════════════════════════════════════════════
   Landing v11 — art direction «Перша спроба»
   Passing first try as a quiet rite of passage. Porcelain-white monumental
   editorial: one Yeseva One didone at monumental scale, extreme air, one
   oxblood full-bleed chapter break. No cards — hairline rules + whitespace
   carry every structure. Public static marketing page — no server imports.
   Motion: masked clip-path headline reveal, slow oxblood underline draw,
   the dial counts up ONCE then visibly ticks DOWN two points (honesty as
   behavior). Everything else appears instantly. Reduced-motion: opacity-only.
   ═══════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Yeseva_One, Mulish } from "next/font/google";
import { copy, STATS, HERO_VARIANTS, ACTIVE_HERO } from "./copy";

const yeseva = Yeseva_One({
  subsets: ["cyrillic", "latin"],
  weight: "400",
  variable: "--font-yeseva",
  display: "swap",
});
const mulish = Mulish({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "600"],
  variable: "--font-mulish",
  display: "swap",
});

const hero = HERO_VARIANTS[ACTIVE_HERO];

/* ───────────────────────── small in-view hook ───────────────────────── */
function useInView<T extends HTMLElement>(once = true) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setInView(true);
            if (once) io.disconnect();
          } else if (!once) setInView(false);
        });
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once]);
  return { ref, inView };
}

function prefersReduced() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* ─────────────────────────── hero question ──────────────────────────── */
function HeroQuestion() {
  const d = copy.hero.demo;
  const [picked, setPicked] = useState<number | null>(null);
  const [meter, setMeter] = useState(0);
  const answered = picked !== null;
  const isCorrect = picked === d.correct;

  function choose(i: number) {
    if (answered) return;
    setPicked(i);
    const target = i === d.correct ? 12 : 4;
    if (prefersReduced()) {
      setMeter(target);
      return;
    }
    const start = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / 900);
      const eased = 1 - Math.pow(1 - p, 3);
      setMeter(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  return (
    <div id="proba" className="proba">
      <div className="proba-head">
        <span className="proba-eyebrow">{d.eyebrow}</span>
        <span className="proba-counter">{d.counter}</span>
      </div>
      <p className="proba-q">{d.question}</p>
      <ul className="proba-opts">
        {d.options.map((opt, i) => {
          const state = !answered
            ? "idle"
            : i === d.correct
              ? "right"
              : i === picked
                ? "wrong"
                : "dim";
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => choose(i)}
                disabled={answered}
                data-state={state}
                className="proba-opt"
              >
                <span className="proba-key" aria-hidden>
                  {String.fromCharCode(1040 + i) /* А Б В */}
                </span>
                <span>{opt}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="proba-foot">
        <div className="proba-meter-row">
          <span className="proba-meter-label">{d.meterLabel}</span>
          <div className="proba-meter" role="img" aria-label={`${d.meterLabel} ${meter}%`}>
            <span style={{ width: `${meter}%` }} />
          </div>
          <span className="proba-meter-val">{meter}%</span>
        </div>
        <p className="proba-note" data-shown={answered}>
          {answered ? (isCorrect ? d.afterCorrect : d.afterWrong) : d.meterHint}
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────── readiness dial ─────────────────────────── */
function ReadinessDial() {
  const { ref, inView } = useInView<HTMLDivElement>(true);
  const [val, setVal] = useState(72); // honest settled default (no-JS / no-scroll)
  const [ticked, setTicked] = useState(false);

  useEffect(() => {
    if (!inView) return;
    if (prefersReduced()) {
      setVal(72);
      setTicked(true);
      return;
    }
    let raf = 0;
    const peak = 74;
    const start = performance.now();
    const up = (t: number) => {
      const p = Math.min(1, (t - start) / 1400);
      const eased = 1 - Math.pow(1 - p, 4);
      setVal(Math.round(eased * peak));
      if (p < 1) raf = requestAnimationFrame(up);
      else {
        // honesty as behavior: after settling, tick DOWN two points
        setTimeout(() => {
          setVal(peak - 1);
          setTimeout(() => {
            setVal(peak - 2);
            setTicked(true);
          }, 260);
        }, 900);
      }
    };
    raf = requestAnimationFrame(up);
    return () => cancelAnimationFrame(raf);
  }, [inView]);

  const R = 84;
  const C = 2 * Math.PI * R;
  const dash = (val / 100) * C;

  return (
    <div className="dial-panel" ref={ref}>
      <div className="dial-arc">
        <svg viewBox="0 0 200 200" aria-hidden>
          <circle cx="100" cy="100" r={R} className="dial-track" />
          <circle
            cx="100"
            cy="100"
            r={R}
            className="dial-value"
            strokeDasharray={`${dash} ${C}`}
            transform="rotate(-90 100 100)"
          />
        </svg>
        <div className="dial-center">
          <span className="dial-num">
            {val}
            <i>%</i>
          </span>
          <span className="dial-vlabel">{copy.dial.valueLabel}</span>
          <span className="dial-tick" data-on={ticked}>
            −2 · {copy.dial.tickNote}
          </span>
        </div>
      </div>
      <p className="dial-caption">{copy.dial.caption}</p>
    </div>
  );
}

/* ───────────────────────── exam date picker ─────────────────────────── */
function DatePicker() {
  const c = copy.datePicker;
  const [date, setDate] = useState("");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let body: ReactNode = <p className="dp-empty">{c.empty}</p>;
  if (date) {
    const target = new Date(date + "T00:00:00");
    const days = Math.round((target.getTime() - today.getTime()) / 86400000);
    if (days < 0) {
      body = <p className="dp-empty">{c.past}</p>;
    } else {
      const d = Math.max(days, 1);
      const perDay = Math.ceil(STATS.bank / d);
      // Honesty guard: >~200 нових питань/день не опрацювати реально — не друкуємо
      // абсурдне число, а показуємо чесний інтенсив-план (фокус на найпровальніших темах).
      const intensive = perDay > 200;
      body = intensive ? (
        <div className="dp-result">
          <div className="dp-figures">
            <span className="dp-fig">
              <b>{d}</b>
              <i>{c.resultPrefix} · {c.daysWord(d)}</i>
            </span>
            <span className="dp-tag" aria-hidden>{c.intensiveTag}</span>
          </div>
          <p className="dp-line">{c.intensive} {c.intensivePlan}</p>
        </div>
      ) : (
        <div className="dp-result">
          <div className="dp-figures">
            <span className="dp-fig">
              <b>{d}</b>
              <i>{c.resultPrefix} · {c.daysWord(d)}</i>
            </span>
            <span className="dp-mult" aria-hidden>×</span>
            <span className="dp-fig">
              <b>~{perDay}</b>
              <i>{c.perDay}</i>
            </span>
          </div>
          <p className="dp-line">{c.note}</p>
        </div>
      );
    }
  }

  return (
    <div className="dp">
      <label className="dp-field">
        <span>{c.inputLabel}</span>
        <input
          type="date"
          value={date}
          min={today.toISOString().slice(0, 10)}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <div className="dp-out">{body}</div>
    </div>
  );
}

/* ────────────────────────────── FAQ ─────────────────────────────────── */
function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <ul className="faq-list">
      {copy.faq.items.map((item, i) => {
        const isOpen = open === i;
        return (
          <li key={i} className="faq-item">
            <button
              type="button"
              className="faq-q"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : i)}
            >
              <span>{item.q}</span>
              <span className="faq-sign" aria-hidden>
                {isOpen ? "–" : "+"}
              </span>
            </button>
            <div className="faq-a" data-open={isOpen}>
              <p>{item.a}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ───────────────────────── section heading row ──────────────────────── */
function RowHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="rowhead">
      <h2 className="rh-title">{title}</h2>
      {sub && <p className="rh-sub">{sub}</p>}
    </div>
  );
}

/* ═══════════════════════════════ PAGE ═══════════════════════════════ */
export default function Page() {
  return (
    <div className={`v11 ${yeseva.variable} ${mulish.variable}`}>
      <style>{CSS}</style>

      {/* NAV */}
      <header className="nav">
        <span className="wordmark">Drivers School</span>
        <nav className="nav-right">
          <Link href={copy.nav.loginHref} className="nav-login">
            {copy.nav.login}
          </Link>
          <Link href={copy.nav.ctaPrimaryHref} className="pill pill-dark">
            {copy.nav.ctaPrimary}
          </Link>
        </nav>
      </header>

      <main>
        {/* HERO */}
        <section className="hero">
          <p className="hero-hook">{copy.hero.hook}</p>
          <h1 className="hero-h1">
            <span className="hero-line">{hero.headline}</span>
          </h1>
          <p className="hero-sub">{hero.sub}</p>
          <div className="hero-cta">
            <Link href={copy.hero.ctaPrimaryHref} className="pill pill-dark pill-lg">
              {copy.hero.ctaPrimary}
            </Link>
            <a href={copy.hero.ctaSecondaryHref} className="pill pill-ghost pill-lg">
              {copy.hero.ctaSecondary}
            </a>
          </div>
          <ul className="hero-chips">
            {copy.hero.chips.map((chip) => (
              <li key={chip}>{chip}</li>
            ))}
          </ul>

          <div className="hero-demo">
            <HeroQuestion />
          </div>
        </section>

        {/* READINESS DIAL */}
        <section className="section dial-section">
          <div className="dial-grid">
            <div className="dial-copy">
              <h2 className="dial-heading">{copy.dial.heading}</h2>
              <p className="dial-body">{copy.dial.body}</p>
              <p className="dial-moat">{copy.dial.moat}</p>
            </div>
            <ReadinessDial />
          </div>
        </section>

        {/* MECHANISM */}
        <section className="section" id="mechanism">
          <RowHead title={copy.mechanism.heading} sub={copy.mechanism.sub} />
          <ol className="mech">
            {copy.mechanism.steps.map((s) => (
              <li key={s.n} className="mech-step">
                <span className="mech-n">{s.n}</span>
                <div className="mech-text">
                  <h3 className="mech-title">{s.title}</h3>
                  <p className="mech-body">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* EXAM DATE PICKER */}
        <section className="section">
          <RowHead title={copy.datePicker.heading} sub={copy.datePicker.sub} />
          <DatePicker />
        </section>

        {/* SIMULATOR */}
        <section className="section">
          <RowHead title={copy.simulator.heading} />
          <div className="sim-format">
            {copy.simulator.format.map((f, i) => (
              <div className="sim-fig" key={i}>
                <span className="sim-big">{f.big}</span>
                <span className="sim-label">{f.label}</span>
              </div>
            ))}
          </div>
          <p className="sim-body">{copy.simulator.body}</p>
          <div className="sim-topics">
            <span className="sim-topics-label">{copy.simulator.topicsLabel}</span>
            <ul>
              {copy.simulator.topics.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* LOSS-FRAME INTERSTITIAL — the one oxblood chapter break */}
        <section className="loss">
          <div className="loss-inner">
            <p className="loss-big">{copy.loss.big}</p>
            <p className="loss-line">{copy.loss.line}</p>
            <Link href={copy.loss.ctaHref} className="pill pill-cream pill-lg">
              {copy.loss.cta}
            </Link>
          </div>
        </section>

        {/* PRICING */}
        <section className="section" id="pricing">
          <RowHead title={copy.pricing.heading} />
          <div className="price-top">
            <div className="price-num">
              <span className="price-big">{copy.pricing.price}</span>
              <span className="price-unit">{copy.pricing.unit}</span>
            </div>
            <p className="price-note">{copy.pricing.priceNote}</p>
            <ul className="price-neg">
              {copy.pricing.negations.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>

          <div className="price-split">
            <div className="price-col">
              <h3 className="price-col-h">{copy.pricing.freeTitle}</h3>
              <ul className="price-items price-items-free">
                {copy.pricing.freeItems.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </div>
            <div className="price-col">
              <h3 className="price-col-h">{copy.pricing.paidTitle}</h3>
              <ul className="price-items">
                {copy.pricing.paidItems.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </div>
          </div>

          <p className="price-anchor">{copy.pricing.anchor}</p>
          <p className="price-failsafe">{copy.pricing.failsafe}</p>

          <div className="price-cta-row">
            <Link href={copy.pricing.ctaHref} className="pill pill-dark pill-lg">
              {copy.pricing.cta}
            </Link>
            <span className="price-cta-note">{copy.pricing.ctaNote}</span>
          </div>
          <ul className="trust-band">
            {copy.pricing.trustBand.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>

        {/* HONEST BASE */}
        <section className="section">
          <RowHead title={copy.base.heading} />
          <div className="base-stats">
            {copy.base.stats.map((s, i) => (
              <div className="base-fig" key={i}>
                <span className="base-big">{s.big}</span>
                <span className="base-label">{s.label}</span>
              </div>
            ))}
          </div>
          <span className="freshness">{copy.base.freshness}</span>
          <p className="base-body">{copy.base.body}</p>
          <p className="base-future">{copy.base.future}</p>
        </section>

        {/* FAQ */}
        <section className="section" id="faq">
          <RowHead title={copy.faq.heading} />
          <Faq />
        </section>

        {/* FINAL CTA + MODE LAUNCHER */}
        <section className="section final">
          <h2 className="final-h">{copy.finalCta.heading}</h2>
          <p className="final-sub">{copy.finalCta.sub}</p>
          <div className="hero-cta final-cta">
            <Link href={copy.finalCta.ctaPrimaryHref} className="pill pill-dark pill-lg">
              {copy.finalCta.ctaPrimary}
            </Link>
            <a href={copy.finalCta.ctaSecondaryHref} className="pill pill-ghost pill-lg">
              {copy.finalCta.ctaSecondary}
            </a>
          </div>
          <ul className="modes">
            {copy.finalCta.modes.map((m) => (
              <li key={m.title}>
                <Link href={m.href} className="mode-row">
                  <span className="mode-text">
                    <span className="mode-title">{m.title}</span>
                    <span className="mode-desc">{m.desc}</span>
                  </span>
                  <span className="mode-arrow" aria-hidden>
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="foot">
        <div className="foot-top">
          <div className="foot-brand">
            <span className="foot-mark">Drivers School</span>
            <p className="foot-tag">{copy.footer.tagline}</p>
          </div>
          <div className="foot-cols">
            {copy.footer.columns.map((col) => (
              <div key={col.title} className="foot-col">
                <span className="foot-col-h">{col.title}</span>
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
        </div>
        <p className="foot-disclaimer">{copy.footer.disclaimer}</p>
        <div className="foot-bottom">
          <span>{copy.footer.copyright}</span>
        </div>
        <span className="foot-ghost" aria-hidden>
          Drivers School
        </span>
      </footer>
    </div>
  );
}

/* ══════════════════════════════ STYLES ══════════════════════════════ */
const CSS = `
.v11 {
  --bg:#FBFBFA; --surface:#FFFFFF; --ink:#161311; --oxblood:#6E1423;
  --muted:#5B534B; --hair:rgba(22,19,17,0.12); --hair-strong:rgba(22,19,17,0.22);
  --disp: var(--font-yeseva), Georgia, serif;
  --body: var(--font-mulish), "Segoe UI", system-ui, sans-serif;
  background:var(--bg); color:var(--ink); font-family:var(--body);
  font-size:17px; line-height:1.6; letter-spacing:0.005em;
  -webkit-font-smoothing:antialiased; overflow-x:hidden;
}
.v11 *{box-sizing:border-box;}
.v11 h1,.v11 h2,.v11 h3{font-family:var(--disp); font-weight:400; letter-spacing:-0.02em; line-height:1.02; text-wrap:balance;}
.v11 ::selection{background:var(--oxblood); color:#F6EDEA;}

.wrap{max-width:1120px; margin:0 auto; padding:0 clamp(20px,5vw,64px);}

/* pills */
.pill{display:inline-flex; align-items:center; justify-content:center; gap:.5em;
  border-radius:999px; font-family:var(--body); font-weight:600; font-size:15px;
  letter-spacing:0.01em; text-decoration:none; cursor:pointer; border:1px solid transparent;
  transition:transform .25s cubic-bezier(.2,.7,.2,1), background .25s, color .25s, border-color .25s;
  padding:12px 22px; white-space:nowrap;}
.pill-lg{padding:16px 30px; font-size:16px;}
.pill-dark{background:var(--ink); color:#F7F4F1;}
.pill-dark:hover{transform:translateY(-2px); background:#000;}
.pill-ghost{background:transparent; color:var(--ink); border-color:var(--hair-strong);}
.pill-ghost:hover{border-color:var(--ink); transform:translateY(-2px);}
.pill-cream{background:#F6EDEA; color:var(--oxblood);}
.pill-cream:hover{transform:translateY(-2px); background:#fff;}

/* NAV */
.nav{max-width:1120px; margin:0 auto; padding:26px clamp(20px,5vw,64px);
  display:flex; align-items:center; justify-content:space-between;}
.wordmark{font-family:var(--disp); font-size:20px; letter-spacing:-0.01em;}
.nav-right{display:flex; align-items:center; gap:18px;}
.nav-login{color:var(--ink); text-decoration:none; font-weight:600; font-size:15px; opacity:.75;}
.nav-login:hover{opacity:1;}

/* section rhythm */
.section{max-width:1120px; margin:0 auto; padding:clamp(96px,15vw,180px) clamp(20px,5vw,64px);
  border-top:1px solid var(--hair);}
.rowhead{display:grid; grid-template-columns:1fr; gap:12px; margin-bottom:clamp(40px,7vw,72px); max-width:820px;}
.rh-title{font-size:clamp(2rem,5.4vw,3.4rem);}
.rh-sub{color:var(--muted); font-size:18px; max-width:56ch;}

/* HERO */
.hero{max-width:1120px; margin:0 auto; padding:clamp(40px,7vw,72px) clamp(20px,5vw,64px) clamp(70px,10vw,110px);
  text-align:center; display:flex; flex-direction:column; align-items:center;}
.hero-hook{color:var(--muted); font-weight:600; font-size:15px; letter-spacing:0.01em;
  margin-bottom:clamp(28px,5vw,44px); max-width:44ch;}
.hero-h1{font-size:clamp(2.9rem,9vw,6rem); margin:0 auto; max-width:16ch;}
.hero-line{display:inline-block; position:relative;
  animation:heroReveal 1s cubic-bezier(.2,.75,.2,1) both;}
.hero-line::after{content:""; position:absolute; left:6%; right:6%; bottom:-.06em; height:.05em;
  background:var(--oxblood); transform:scaleX(0); transform-origin:left center;
  animation:drawLine .9s cubic-bezier(.65,0,.35,1) .85s forwards;}
.hero-sub{color:var(--muted); font-size:clamp(18px,2.4vw,22px); max-width:40ch;
  margin:clamp(28px,4vw,38px) auto 0; line-height:1.45;}
.hero-cta{display:flex; flex-wrap:wrap; gap:14px; justify-content:center; margin-top:clamp(32px,5vw,44px);}
.hero-chips{list-style:none; display:flex; flex-wrap:wrap; gap:10px 22px; justify-content:center;
  margin-top:clamp(26px,4vw,34px); padding:0;}
.hero-chips li{color:var(--muted); font-size:14px; font-weight:600; position:relative; padding-left:18px;}
.hero-chips li::before{content:""; position:absolute; left:0; top:.62em; width:6px; height:6px;
  border-radius:999px; background:var(--muted); opacity:.55;}

/* hero demo / proba */
.hero-demo{width:100%; max-width:640px; margin:clamp(48px,7vw,84px) auto 0;}
.proba{background:var(--surface); border-radius:20px; padding:clamp(24px,4vw,40px);
  text-align:left; box-shadow:0 40px 80px -48px rgba(22,19,17,.35), 0 2px 8px -4px rgba(22,19,17,.12);}
.proba-head{display:flex; justify-content:space-between; align-items:baseline; margin-bottom:20px;}
.proba-eyebrow{font-weight:600; font-size:13px; color:var(--muted);}
.proba-counter{font-family:var(--disp); font-size:15px; color:var(--muted);}
.proba-q{font-family:var(--disp); font-size:clamp(1.35rem,3.2vw,1.7rem); line-height:1.18;
  margin-bottom:22px; letter-spacing:-0.01em;}
.proba-opts{list-style:none; padding:0; display:flex; flex-direction:column; gap:10px;}
.proba-opt{width:100%; display:flex; align-items:center; gap:14px; text-align:left;
  background:var(--bg); border:1px solid var(--hair); border-radius:12px;
  padding:14px 16px; font-family:var(--body); font-size:15.5px; color:var(--ink);
  cursor:pointer; transition:border-color .2s, background .2s, transform .2s;}
.proba-opt:hover:not(:disabled){border-color:var(--hair-strong); transform:translateX(2px);}
.proba-opt:disabled{cursor:default;}
.proba-key{flex:none; width:26px; height:26px; border-radius:999px; display:grid; place-items:center;
  border:1px solid var(--hair-strong); font-size:13px; font-weight:600; color:var(--muted);}
.proba-opt[data-state=right]{border-color:var(--ink); background:#fff;}
.proba-opt[data-state=right] .proba-key{background:var(--ink); color:#fff; border-color:var(--ink);}
.proba-opt[data-state=wrong]{border-color:var(--oxblood); background:rgba(110,20,35,.05);}
.proba-opt[data-state=wrong] .proba-key{background:var(--oxblood); color:#F6EDEA; border-color:var(--oxblood);}
.proba-opt[data-state=dim]{opacity:.45;}
.proba-foot{margin-top:22px; padding-top:20px; border-top:1px solid var(--hair);}
.proba-meter-row{display:flex; align-items:center; gap:12px;}
.proba-meter-label{font-size:13px; font-weight:600; color:var(--muted); white-space:nowrap;}
.proba-meter{flex:1; height:6px; border-radius:999px; background:var(--hair); overflow:hidden;}
.proba-meter span{display:block; height:100%; background:var(--oxblood); border-radius:999px;
  transition:width .12s linear;}
.proba-meter-val{font-family:var(--disp); font-size:16px; min-width:44px; text-align:right;}
.proba-note{margin-top:14px; font-size:14px; color:var(--muted); min-height:20px;}

/* DIAL */
.dial-section{}
.dial-grid{display:grid; grid-template-columns:1.1fr .9fr; gap:clamp(40px,6vw,80px); align-items:center;}
.dial-heading{font-size:clamp(1.9rem,4.4vw,3rem); max-width:16ch;}
.dial-body{color:var(--ink); font-size:18px; margin-top:24px; max-width:48ch;}
.dial-moat{color:var(--muted); font-size:15.5px; margin-top:20px; max-width:48ch; padding-top:20px;
  border-top:1px solid var(--hair);}
.dial-panel{display:flex; flex-direction:column; align-items:center; gap:22px;
  background:var(--surface); border-radius:24px; padding:clamp(32px,5vw,52px);
  box-shadow:0 50px 90px -50px rgba(22,19,17,.4), 0 2px 10px -6px rgba(22,19,17,.15);}
.dial-arc{position:relative; width:min(74vw,260px); aspect-ratio:1;}
.dial-arc svg{width:100%; height:100%;}
.dial-track{fill:none; stroke:var(--hair); stroke-width:10;}
.dial-value{fill:none; stroke:var(--oxblood); stroke-width:10; stroke-linecap:round;
  transition:stroke-dasharray .18s linear;}
.dial-center{position:absolute; inset:0; display:flex; flex-direction:column;
  align-items:center; justify-content:center; gap:2px;}
.dial-num{font-family:var(--disp); font-size:clamp(3.2rem,10vw,4.4rem); line-height:1;}
.dial-num i{font-style:normal; font-size:.42em; color:var(--muted); margin-left:2px;}
.dial-vlabel{font-size:13px; font-weight:600; color:var(--muted); margin-top:6px;}
.dial-tick{font-size:12px; font-weight:600; color:var(--oxblood); opacity:0;
  transition:opacity .4s; margin-top:4px;}
.dial-tick[data-on=true]{opacity:1;}
.dial-caption{font-size:14px; color:var(--muted); font-weight:600;}

/* MECHANISM */
.mech{list-style:none; padding:0; display:grid; grid-template-columns:repeat(3,1fr);
  gap:clamp(24px,4vw,48px);}
.mech-step{border-top:1px solid var(--hair-strong); padding-top:22px;}
.mech-n{font-family:var(--disp); font-size:clamp(2.4rem,5vw,3.4rem); color:var(--ink); line-height:1;}
.mech-title{font-size:1.35rem; margin-top:16px;}
.mech-body{color:var(--muted); font-size:16px; margin-top:10px; max-width:34ch;}

/* DATE PICKER */
.dp{display:grid; grid-template-columns:340px 1fr; gap:clamp(28px,5vw,64px); align-items:start;}
.dp-field{display:flex; flex-direction:column; gap:10px;}
.dp-field span{font-size:14px; font-weight:600; color:var(--muted);}
.dp-field input{font-family:var(--body); font-size:18px; color:var(--ink); background:var(--surface);
  border:1px solid var(--hair-strong); border-radius:12px; padding:16px 18px; width:100%;}
.dp-field input:focus{outline:none; border-color:var(--ink);}
.dp-out{min-height:120px; display:flex; align-items:center;}
.dp-empty{color:var(--muted); font-size:18px; max-width:40ch;}
.dp-result{width:100%;}
.dp-figures{display:flex; align-items:flex-end; gap:22px;}
.dp-fig{display:flex; flex-direction:column;}
.dp-fig b{font-family:var(--disp); font-weight:400; font-size:clamp(2.6rem,7vw,4.2rem); line-height:.95;}
.dp-fig i{font-style:normal; font-size:14px; font-weight:600; color:var(--muted); margin-top:8px;}
.dp-mult{font-family:var(--disp); font-size:2rem; color:var(--muted); padding-bottom:14px;}
.dp-tag{align-self:flex-end; margin-bottom:16px; font-size:13px; font-weight:600; color:var(--muted);
  border:1px solid var(--hair-strong); border-radius:999px; padding:6px 14px; letter-spacing:0.03em;}
.dp-line{margin-top:22px; color:var(--muted); font-size:16px; max-width:44ch;
  padding-top:18px; border-top:1px solid var(--hair);}

/* SIMULATOR */
.sim-format{display:flex; flex-wrap:wrap; gap:clamp(28px,6vw,80px); align-items:flex-end;}
.sim-fig{display:flex; flex-direction:column;}
.sim-big{font-family:var(--disp); font-size:clamp(3.4rem,11vw,6rem); line-height:.9;}
.sim-label{font-size:15px; font-weight:600; color:var(--muted); margin-top:12px;}
.sim-body{color:var(--ink); font-size:18px; max-width:52ch; margin-top:clamp(32px,5vw,48px);
  padding-top:28px; border-top:1px solid var(--hair);}
.sim-topics{margin-top:34px;}
.sim-topics-label{font-size:14px; font-weight:600; color:var(--muted);}
.sim-topics ul{list-style:none; padding:0; display:flex; flex-wrap:wrap; gap:10px; margin-top:14px;}
.sim-topics li{font-size:14.5px; font-weight:600; padding:8px 16px; border:1px solid var(--hair);
  border-radius:999px;}

/* LOSS interstitial — oxblood full bleed */
.loss{background:var(--oxblood); color:#F6EDEA; text-align:center;}
.loss-inner{max-width:1120px; margin:0 auto; padding:clamp(90px,15vw,170px) clamp(20px,5vw,64px);
  display:flex; flex-direction:column; align-items:center;}
.loss-big{font-family:var(--disp); font-size:clamp(2.6rem,7.5vw,5rem); line-height:1.02;
  letter-spacing:-0.02em; max-width:16ch;}
.loss-line{color:rgba(246,237,234,.82); font-size:clamp(18px,2.4vw,22px); max-width:44ch;
  margin:clamp(24px,4vw,34px) auto clamp(36px,5vw,46px); line-height:1.5;}

/* PRICING */
.price-top{display:flex; flex-direction:column; align-items:flex-start; gap:18px;
  padding-bottom:clamp(40px,6vw,64px); border-bottom:1px solid var(--hair);}
.price-num{display:flex; align-items:flex-start; gap:6px;}
.price-big{font-family:var(--disp); font-size:clamp(4rem,14vw,7rem); line-height:.85;}
.price-unit{font-family:var(--disp); font-size:clamp(1.6rem,4vw,2.4rem); color:var(--muted); margin-top:.2em;}
.price-note{color:var(--muted); font-size:17px;}
.price-neg{list-style:none; padding:0; display:flex; flex-wrap:wrap; gap:10px 20px;}
.price-neg li{font-size:14px; font-weight:600; position:relative; padding-left:18px;}
.price-neg li::before{content:"✕"; position:absolute; left:0; color:var(--oxblood); font-size:12px; top:1px;}
.price-split{display:grid; grid-template-columns:1fr 1fr; gap:clamp(32px,6vw,80px);
  padding:clamp(40px,6vw,64px) 0;}
.price-col-h{font-family:var(--disp); font-size:1.5rem; margin-bottom:22px;}
.price-items{list-style:none; padding:0; display:flex; flex-direction:column; gap:14px;}
.price-items li{font-size:16.5px; position:relative; padding-left:26px; color:var(--ink);}
.price-items li::before{content:""; position:absolute; left:0; top:.62em; width:9px; height:9px;
  border-radius:999px; border:1.5px solid var(--muted);}
.price-items-free li::before{background:var(--oxblood); border-color:var(--oxblood);}
.price-anchor{font-family:var(--disp); font-size:clamp(1.3rem,3vw,1.7rem); max-width:24ch;
  padding-top:clamp(32px,5vw,48px); border-top:1px solid var(--hair); letter-spacing:-0.01em;}
.price-failsafe{color:var(--muted); font-size:15.5px; max-width:56ch; margin-top:18px;}
.price-cta-row{display:flex; flex-wrap:wrap; align-items:center; gap:16px 22px; margin-top:clamp(36px,5vw,48px);}
.price-cta-note{color:var(--muted); font-size:14.5px; max-width:32ch;}
.trust-band{list-style:none; padding:0; display:flex; flex-wrap:wrap; gap:10px 24px; margin-top:26px;}
.trust-band li{font-size:14px; font-weight:600; color:var(--muted); position:relative; padding-left:20px;}
.trust-band li::before{content:"·"; position:absolute; left:6px; color:var(--muted); font-size:20px; top:-4px;}

/* BASE */
.base-stats{display:flex; flex-wrap:wrap; gap:clamp(28px,6vw,80px); align-items:flex-end;}
.base-fig{display:flex; flex-direction:column;}
.base-big{font-family:var(--disp); font-size:clamp(3rem,9vw,5rem); line-height:.9;}
.base-label{font-size:15px; font-weight:600; color:var(--muted); margin-top:12px;}
.freshness{display:inline-flex; align-items:center; gap:8px; margin-top:34px;
  font-size:14px; font-weight:600; color:var(--muted); padding:8px 16px;
  border:1px solid var(--hair-strong); border-radius:999px;}
.base-body{color:var(--ink); font-size:18px; max-width:52ch; margin-top:32px;
  padding-top:28px; border-top:1px solid var(--hair);}
.base-future{color:var(--muted); font-size:15.5px; max-width:52ch; margin-top:18px;}

/* FAQ */
.faq-list{list-style:none; padding:0; max-width:840px;}
.faq-item{border-top:1px solid var(--hair);}
.faq-item:last-child{border-bottom:1px solid var(--hair);}
.faq-q{width:100%; display:flex; justify-content:space-between; align-items:center; gap:24px;
  background:none; border:none; cursor:pointer; text-align:left; padding:26px 0;
  font-family:var(--disp); font-size:clamp(1.15rem,2.4vw,1.45rem); color:var(--ink);
  letter-spacing:-0.01em; line-height:1.25;}
.faq-sign{font-family:var(--body); font-size:24px; color:var(--ink); flex:none; line-height:1;}
.faq-a{overflow:hidden; max-height:0; transition:max-height .4s cubic-bezier(.4,0,.2,1);}
.faq-a[data-open=true]{max-height:340px;}
.faq-a p{color:var(--muted); font-size:16.5px; max-width:64ch; padding-bottom:26px; line-height:1.55;}

/* FINAL */
.final{text-align:center; display:flex; flex-direction:column; align-items:center;}
.final-h{font-size:clamp(2.2rem,6vw,4rem); max-width:18ch;}
.final-sub{color:var(--muted); font-size:19px; max-width:44ch; margin-top:22px;}
.final-cta{justify-content:center;}
.modes{list-style:none; padding:0; width:100%; max-width:560px; margin:clamp(44px,6vw,64px) auto 0;
  display:flex; flex-direction:column;}
.mode-row{display:flex; align-items:center; justify-content:space-between; gap:20px;
  padding:22px 6px; border-top:1px solid var(--hair); text-decoration:none; color:var(--ink);
  transition:transform .25s cubic-bezier(.2,.7,.2,1);}
.modes li:last-child .mode-row{border-bottom:1px solid var(--hair);}
.mode-row:hover{transform:translateX(10px);}
.mode-text{display:flex; flex-direction:column; text-align:left; gap:3px;}
.mode-title{font-family:var(--disp); font-size:1.3rem;}
.mode-desc{font-size:14px; color:var(--muted);}
.mode-arrow{font-size:22px; color:var(--ink); transition:transform .25s;}
.mode-row:hover .mode-arrow{transform:translateX(6px);}

/* FOOTER */
.foot{background:var(--ink); color:#CFC7BF; position:relative; overflow:hidden;
  padding:clamp(64px,9vw,110px) 0 0;}
.foot-top,.foot-disclaimer,.foot-bottom{max-width:1120px; margin:0 auto; padding-left:clamp(20px,5vw,64px);
  padding-right:clamp(20px,5vw,64px); position:relative; z-index:1;}
.foot-top{display:grid; grid-template-columns:1.2fr 2fr; gap:clamp(40px,6vw,80px);
  padding-bottom:clamp(48px,7vw,72px);}
.foot-mark{font-family:var(--disp); font-size:22px; color:#F7F4F1;}
.foot-tag{margin-top:14px; font-size:15px; color:#9A928A; max-width:28ch;}
.foot-cols{display:grid; grid-template-columns:repeat(3,1fr); gap:28px;}
.foot-col-h{font-size:13px; font-weight:600; color:#F7F4F1; letter-spacing:0.04em; text-transform:uppercase;}
.foot-col ul{list-style:none; padding:0; margin-top:16px; display:flex; flex-direction:column; gap:11px;}
.foot-col a{color:#B5ADA4; text-decoration:none; font-size:15px;}
.foot-col a:hover{color:#F7F4F1;}
.foot-disclaimer{font-size:12.5px; line-height:1.65; color:#8B837B; max-width:900px;
  padding-top:clamp(36px,5vw,48px); border-top:1px solid rgba(255,255,255,.1);}
.foot-bottom{padding-top:26px; padding-bottom:clamp(120px,20vw,200px); font-size:13px; color:#8B837B;}
.foot-ghost{position:absolute; left:50%; bottom:-.28em; transform:translateX(-50%);
  font-family:var(--disp); font-size:clamp(4rem,22vw,17rem); line-height:.7; white-space:nowrap;
  color:rgba(247,244,241,.05); pointer-events:none; z-index:0;}

/* keyframes */
@keyframes heroReveal{
  from{opacity:0; clip-path:inset(0 0 100% 0); transform:translateY(14px);}
  to{opacity:1; clip-path:inset(0 0 -10% 0); transform:translateY(0);}
}
@keyframes drawLine{ to{transform:scaleX(1);} }

/* responsive */
@media(max-width:900px){
  .dial-grid{grid-template-columns:1fr; gap:44px;}
  .dial-panel{order:-1;}
  .mech{grid-template-columns:1fr; gap:0;}
  .mech-step{padding:28px 0; border-top:1px solid var(--hair);}
  .mech-step:first-child{border-top-color:var(--hair-strong);}
  .dp{grid-template-columns:1fr; gap:28px;}
  .price-split{grid-template-columns:1fr; gap:36px;}
  .foot-top{grid-template-columns:1fr;}
}
@media(max-width:560px){
  .v11{font-size:16px;}
  .nav{padding:20px clamp(20px,5vw,64px);}
  .nav .pill-dark{display:none;}
  .nav-login{display:inline; opacity:1;}
  .wordmark{font-size:18px;}
  .hero-cta .pill{flex:1 1 100%;}
  .final-cta .pill{flex:1 1 100%;}
  .foot-cols{grid-template-columns:1fr 1fr; gap:24px;}
  .sim-format{gap:24px 40px;}
  .price-neg{flex-direction:column; gap:10px;}
  /* mobile fold: pull the hero mechanic up so the question + first option
     sit in the first viewport, remaining options cropped by the fold */
  .hero{padding-top:16px;}
  .hero-hook{margin-bottom:12px;}
  .hero-sub{margin-top:12px;}
  .hero-cta{margin-top:18px;}
  .hero-chips{margin-top:12px; gap:8px 16px;}
  .hero-demo{margin-top:16px;}
}

@media(prefers-reduced-motion:reduce){
  .v11 *{animation:none !important; transition:none !important;}
  .hero-line::after{transform:scaleX(1);}
  .hero-line{opacity:1; clip-path:none;}
}
`;
