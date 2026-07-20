"use client";

/* ═══════════════════════════════════════════════════════════════════════
   Landing v29 — «Скептику»
   The page's spine IS the skeptic's five questions, set as large
   typographic headlines in the user's own voice, each answered by
   demonstrable product behavior. The v7 «Світанок» dawn light is restaged
   as a trust arc: the pre-dawn violet hero lightens step by step as each
   objection dissolves, reaching full morning at the final CTA.
   Public static marketing page. No server imports.
   ═══════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState, useId, type ReactNode } from "react";
import Link from "next/link";
import { Onest } from "next/font/google";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight, Check, X, Minus, Plus } from "lucide-react";
import { copy, N, HERO_VARIANTS, ACTIVE_HERO } from "./copy";

const onest = Onest({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--v29-onest",
  display: "swap",
});

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const H = HERO_VARIANTS[ACTIVE_HERO];

/* Grain — one inline SVG referenced by CSS as a data-uri background. */
const GRAIN_URI =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`,
  );

/* ═══════════════════════════════════════════════════════════════════════
   Answer-mark — a small rising-sun arc drawn in accent as each module
   closes. pathLength=1 so the dash math is trivial; resting default is
   fully drawn (offset 0, visible with no JS), the reveal replays the draw.
   ═══════════════════════════════════════════════════════════════════════ */
function AnswerMark() {
  return (
    <svg className="v29-mark" viewBox="0 0 120 34" aria-hidden="true">
      {/* horizon */}
      <line x1="6" y1="30" x2="114" y2="30" className="v29-mark-h" pathLength={1} />
      {/* rising sun */}
      <path d="M 36 30 A 24 24 0 0 1 84 30" className="v29-mark-arc" pathLength={1} />
      {/* three short rays */}
      <line x1="60" y1="2" x2="60" y2="9" className="v29-mark-ray" pathLength={1} />
      <line x1="30" y1="10" x2="34" y2="15" className="v29-mark-ray" pathLength={1} />
      <line x1="90" y1="10" x2="86" y2="15" className="v29-mark-ray" pathLength={1} />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Question module — the strictly repeated grammar (Superhuman discipline):
   quoted question → em-dash answer → one-line lede → artifact → answer-mark.
   ═══════════════════════════════════════════════════════════════════════ */
function QModule({
  id,
  question,
  answer,
  lede,
  children,
}: {
  id: string;
  question: string;
  answer: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <section className={`v29-mod v29-${id}`} id={`q-${id}`} data-reveal>
      <div className="v29-mod-inner">
        <header className="v29-mod-head">
          <h2 className="v29-q">
            <span className="v29-q-g" aria-hidden="true">«</span>
            {question}
            <span className="v29-q-g" aria-hidden="true">»</span>
          </h2>
          <p className="v29-a">
            <span className="v29-a-dash" aria-hidden="true">—</span> {answer}
          </p>
          <p className="v29-lede">{lede}</p>
        </header>
        <div className="v29-mod-body">{children}</div>
        <AnswerMark />
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Hero interactive question — one real official-style question, answerable
   in-viewport with no signup/network; the mini meter ticks up from 0.
   ═══════════════════════════════════════════════════════════════════════ */
function QuestionCard() {
  const q = copy.demoQuestion;
  const [picked, setPicked] = useState<number | null>(null);
  const [meter, setMeter] = useState(0);
  const answered = picked !== null;
  const correct = answered && q.options[picked].correct;

  const choose = (i: number) => {
    if (answered) return;
    setPicked(i);
    const target = q.options[i].correct ? 26 : 12;
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
    <div className="v29-qcard">
      <div className="v29-qcard-top">
        <span className="v29-qcard-tag">{copy.hero.cardLabel}</span>
        <span className="v29-qcard-meter">
          <span className="v29-qcard-meter-track">
            <span
              className="v29-qcard-meter-fill"
              style={{ transform: `scaleX(${meter / 100})` }}
            />
          </span>
          {/* honesty: never print a calibrated % from n=1 — show movement + a «демо» tag. */}
          <span className="v29-qcard-meter-tag">{q.meterLabel} · {q.meterTag}</span>
        </span>
      </div>

      <p className="v29-qcard-prompt">{q.prompt}</p>

      <div className="v29-qcard-opts">
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
              className="v29-opt"
            >
              <span className="v29-opt-mark" aria-hidden="true">
                {state === "correct" ? (
                  <Check size={15} strokeWidth={2.6} />
                ) : state === "wrong" ? (
                  <X size={15} strokeWidth={2.6} />
                ) : null}
              </span>
              <span className="v29-opt-text">{o.text}</span>
            </button>
          );
        })}
      </div>

      <p
        className="v29-qcard-foot"
        data-answered={answered ? "true" : "false"}
      >
        {!answered
          ? q.meterHintStart
          : correct
            ? q.explanationCorrect
            : q.explanationWrong}
      </p>

      {answered && <p className="v29-qcard-note">{q.meterNote}</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Readiness dial — the centerpiece. Rises, holds, then VISIBLY DECAYS on
   enter (honesty as behavior). Resting default = the decayed honest value,
   so a no-JS / headless capture still shows a real number.
   ═══════════════════════════════════════════════════════════════════════ */
const DIAL_PEAK = 78;
const DIAL_REST = 61;

function polar(cx: number, cy: number, r: number, frac: number) {
  const a = Math.PI * (1.15 - 1.3 * Math.min(1, Math.max(0, frac)));
  return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) };
}
function arcPath(cx: number, cy: number, r: number, from: number, to: number) {
  const s = polar(cx, cy, r, from);
  const e = polar(cx, cy, r, to);
  const large = to - from > 0.5 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

function Dial({ value, size = 244 }: { value: number; size?: number }) {
  const cx = size / 2;
  const cy = size / 2 + 16;
  const r = size / 2 - 26;
  const frac = Math.min(1, Math.max(0, value / 100));
  const needle = polar(cx, cy, r - 2, frac);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="v29-dial"
      role="img"
      aria-label={`Готовність ${Math.round(value)} відсотків`}
    >
      <path d={arcPath(cx, cy, r, 0, 1)} className="v29-dial-track" />
      <path
        d={arcPath(cx, cy, r, 0, Math.max(0.0001, frac))}
        className="v29-dial-fill"
      />
      <line
        x1={cx}
        y1={cy}
        x2={needle.x}
        y2={needle.y}
        className="v29-dial-needle"
      />
      <circle cx={cx} cy={cy} r={5} className="v29-dial-hub" />
      <text x={cx} y={cy - 8} className="v29-dial-num">
        {Math.round(value)}
      </text>
      <text x={cx} y={cy + 26} className="v29-dial-pct">
        % готовності
      </text>
    </svg>
  );
}

/* Small dual-line sparkline: readiness climbs, then decays without review. */
function DecaySpark() {
  const W = 320,
    Hh = 96,
    pad = 10;
  const pts = [72, 78, 81, 79, 74, 68, 63, 60, 58, 61];
  const path = pts
    .map((p, i) => {
      const x = pad + (i / (pts.length - 1)) * (W - pad * 2);
      const y = pad + (1 - (p - 45) / 50) * (Hh - pad * 2);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${Hh}`} className="v29-spark" aria-hidden="true">
      <path d={path} className="v29-spark-line" />
      {pts.map((p, i) => {
        const x = pad + (i / (pts.length - 1)) * (W - pad * 2);
        const y = pad + (1 - (p - 45) / 50) * (Hh - pad * 2);
        return <circle key={i} cx={x} cy={y} r={2.4} className="v29-spark-dot" />;
      })}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Exam-date planner — date → shrinking «план до іспиту» preview.
   ═══════════════════════════════════════════════════════════════════════ */
function Planner() {
  const p = copy.plan;
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
  const perDay = days > 0 ? Math.max(10, Math.ceil(N.bank / days)) : 0;
  const intensive = days > 0 && days < 7;
  const examToday = date !== "" && !past && days === 0;

  return (
    <div className="v29-plan-card">
      <label className="v29-plan-label" htmlFor={inputId}>
        {p.inputLabel}
      </label>
      <input
        id={inputId}
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="v29-plan-input"
      />

      <div className="v29-plan-out" aria-live="polite">
        {!date && <p className="v29-plan-fallback">{p.fallback}</p>}
        {date && past && <p className="v29-plan-fallback">{p.past}</p>}
        {examToday && <p className="v29-plan-today">{p.today}</p>}
        {date && !past && days > 0 && (
          <div className="v29-plan-result">
            <div className="v29-plan-figs">
              <span className="v29-plan-fig">
                <b>{days}</b>
                {p.daysUnit}
              </span>
              <span className="v29-plan-x">×</span>
              <span className="v29-plan-fig">
                <b>{perDay}</b>
                {p.perDayUnit}
              </span>
            </div>
            {intensive && (
              <p className="v29-plan-int">
                <span className="v29-plan-int-pill">{p.intensive}</span>
                {p.intensiveNote}
              </p>
            )}
            <p className="v29-plan-focus">{p.focusNote}</p>
          </div>
        )}
      </div>

      <Link href="/register" className="v29-btn v29-btn--dark v29-plan-cta">
        {p.cta} <ArrowRight size={16} strokeWidth={2.2} />
      </Link>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   FAQ accordion — hairline rows; same array feeds FAQPage JSON-LD (layout).
   ═══════════════════════════════════════════════════════════════════════ */
function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="v29-faq">
      {copy.faq.items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className="v29-faq-row">
            <button
              type="button"
              className="v29-faq-q"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : i)}
            >
              <span>{it.q}</span>
              <span className="v29-faq-ico" aria-hidden="true">
                {isOpen ? <Minus size={18} /> : <Plus size={18} />}
              </span>
            </button>
            <div className="v29-faq-a" data-open={isOpen ? "true" : "false"}>
              <div className="v29-faq-a-inner">
                <p>{it.a}</p>
              </div>
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
export default function V29Page() {
  const root = useRef<HTMLDivElement>(null);
  const dialWrap = useRef<HTMLDivElement>(null);
  const [dialVal, setDialVal] = useState(DIAL_REST);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rootEl = root.current;

    // Additive reveals: content is visible by default; the class only arms the
    // CSS transition. IO fires reliably on scroll AND in fullPage capture.
    let revealIO: IntersectionObserver | null = null;
    if (rootEl) {
      rootEl.classList.add("v29-reveal-ready");
      revealIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add("v29-in");
              revealIO?.unobserve(e.target);
            }
          });
        },
        { threshold: 0.14, rootMargin: "0px 0px -6% 0px" },
      );
      rootEl.querySelectorAll("[data-reveal]").forEach((el) => revealIO!.observe(el));
    }

    // Dial: rise → hold → visibly DECAY, once, when it enters view.
    const el = dialWrap.current;
    let dialIO: IntersectionObserver | null = null;
    if (el) {
      if (reduce) {
        setDialVal(DIAL_REST);
      } else {
        dialIO = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) {
              const obj = { v: 0 };
              gsap
                .timeline()
                .to(obj, {
                  v: DIAL_PEAK,
                  duration: 1.2,
                  ease: "expo.out",
                  onUpdate: () => setDialVal(obj.v),
                })
                .to(obj, { v: DIAL_PEAK, duration: 0.55 })
                .to(obj, {
                  v: DIAL_REST,
                  duration: 1.7,
                  ease: "power2.inOut",
                  onUpdate: () => setDialVal(obj.v),
                });
              dialIO?.disconnect();
            }
          },
          { threshold: 0.55 },
        );
        dialIO.observe(el);
      }
    }

    if (reduce) return () => revealIO?.disconnect();

    const ctx = gsap.context(() => {
      // sky atmosphere drifts almost imperceptibly (transform only)
      gsap.to(".v29-sky-blob--a", {
        xPercent: 8,
        yPercent: -6,
        duration: 54,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
      gsap.to(".v29-sky-blob--b", {
        xPercent: -7,
        yPercent: 5,
        duration: 47,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });

      // hero load: headline lines rise + deblur, then the supporting rows
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
      tl.from(".v29-h-line", {
        y: 30,
        autoAlpha: 0,
        filter: "blur(7px)",
        duration: 1.1,
        stagger: 0.12,
      })
        .from(".v29-hero-sub", { y: 18, autoAlpha: 0, duration: 0.9 }, "-=0.6")
        .from(
          ".v29-hero-cta > *",
          { y: 14, autoAlpha: 0, duration: 0.7, stagger: 0.08 },
          "-=0.5",
        )
        .from(".v29-hero-hook, .v29-hero-chips", {
          autoAlpha: 0,
          y: 10,
          duration: 0.7,
          stagger: 0.1,
        }, "-=0.4")
        .from(".v29-qcard", { y: 26, autoAlpha: 0, duration: 0.9 }, "-=0.9")
        .from(".v29-hero-contract", { autoAlpha: 0, duration: 0.8 }, "-=0.3");

      // subtle scrub parallax on the painted hero sky
      gsap.to(".v29-hero-sky", {
        yPercent: 12,
        ease: "none",
        scrollTrigger: {
          trigger: ".v29-hero",
          start: "top top",
          end: "bottom top",
          scrub: 0.6,
        },
      });
    }, root);

    return () => {
      revealIO?.disconnect();
      dialIO?.disconnect();
      ctx.revert();
    };
  }, []);

  const headlineLines = H.headline.split("\n");

  return (
    <div ref={root} className={`${onest.variable} v29-root`}>
      <style>{v29css}</style>

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="v29-nav">
        <Link href="/" className="v29-brand">
          <span className="v29-brand-dot" aria-hidden="true" />
          {copy.nav.brand}
        </Link>
        <nav className="v29-nav-links">
          {copy.nav.links.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>
        <Link href="/register" className="v29-btn v29-btn--light v29-btn--sm">
          {copy.nav.cta}
        </Link>
      </header>

      {/* ── HERO — почни з одного питання ────────────────────────────── */}
      <section className="v29-hero">
        <div className="v29-hero-sky" aria-hidden="true">
          <div className="v29-sky-blob v29-sky-blob--a" />
          <div className="v29-sky-blob v29-sky-blob--b" />
          <div className="v29-grain" />
        </div>

        <div className="v29-hero-inner">
          <div className="v29-hero-copy">
            <h1 className="v29-hero-h">
              {headlineLines.map((ln, i) => (
                <span className="v29-h-line" key={i}>
                  {ln}
                </span>
              ))}
            </h1>
            <p className="v29-hero-sub">{H.subhead}</p>

            <div className="v29-hero-cta">
              <Link
                href="/register"
                className="v29-btn v29-btn--dark v29-btn--lg"
              >
                {copy.hero.ctaPrimary}{" "}
                <ArrowRight size={18} strokeWidth={2.2} />
              </Link>
              {/* «без реєстрації» must NEVER resolve to /register. The reg-free
                  entry (the anon play loop that mints ds_anon_play) is a SERVER
                  ACTION, not a navigable route — so the honest reg-free try we
                  can offer on a static landing IS the live demo question in this
                  hero: answerable with no signup, no network. This anchors there. */}
              <a
                href="#v29-demo"
                className="v29-btn v29-btn--ghost v29-btn--lg"
                aria-label="спробувати демо-питання без реєстрації"
              >
                {copy.hero.ctaSecondary}
              </a>
            </div>

            <p className="v29-hero-hook">{copy.hero.hook}</p>
          </div>

          <div className="v29-hero-card" id="v29-demo">
            <QuestionCard />
          </div>

          {/* chips are a grid sibling: under the copy on desktop, BELOW the card
              on mobile (grid-areas) — so the answerable question reaches the
              first mobile viewport before the proof chips. */}
          <ul className="v29-hero-chips">
            {copy.hero.chips.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>

        <p className="v29-hero-contract">{copy.hero.contract}</p>
      </section>

      {/* ── Q1 · «Що тут безкоштовно?» — Усе. ────────────────────────── */}
      <QModule
        id="free"
        question={copy.free.question}
        answer={copy.free.answer}
        lede={copy.free.lede}
      >
        <div className="v29-free-grid">
          <ul className="v29-free-list">
            {copy.free.items.map((it, i) => (
              <li key={i}>
                <span className="v29-free-check" aria-hidden="true">
                  <Check size={15} strokeWidth={2.6} />
                </span>
                <span>
                  <b>{it.k}</b> {it.v}
                </span>
              </li>
            ))}
          </ul>

          <div className="v29-sim">
            <span className="v29-sim-title">{copy.free.simTitle}</span>
            <div className="v29-sim-chips">
              {copy.free.simChips.map((c, i) => (
                <div key={i} className="v29-sim-chip">
                  <b>{c.k}</b>
                  <span>{c.v}</span>
                </div>
              ))}
            </div>
            <p className="v29-sim-note">{copy.free.simNote}</p>
          </div>
        </div>

        {/* answer-by-demonstration: a REAL restyled official image as visible
            proof of free-tier quality — the market's #1 resentment answered
            with evidence, not copy. Static public asset, lazy-loaded. */}
        <figure className="v29-free-evidence">
          <img
            src="/restyled-live/11_2_0.png"
            alt={copy.free.imgAlt}
            width={528}
            height={272}
            loading="lazy"
            decoding="async"
          />
          <figcaption>{copy.free.imgCaption}</figcaption>
        </figure>

        <p className="v29-standing">{copy.free.stateLine}</p>
      </QModule>

      {/* ── Q2 · «Звідки ви знаєте?» — Дил, який вміє падати. ────────── */}
      <QModule
        id="dial"
        question={copy.dial.question}
        answer={copy.dial.answer}
        lede={copy.dial.lede}
      >
        <div className="v29-dial-grid">
          <div className="v29-dial-panel">
            <div ref={dialWrap} className="v29-dial-wrap">
              <Dial value={dialVal} />
              <span className="v29-dial-tag">{copy.dial.dialTag}</span>
            </div>
            <div className="v29-spark-wrap">
              <DecaySpark />
              <p className="v29-spark-cap">{copy.dial.decayCaption}</p>
            </div>
          </div>

          <div className="v29-dial-copy">
            <p className="v29-caption-strong">{copy.dial.caption}</p>
            <p className="v29-body">{copy.dial.body}</p>
            <p className="v29-moat">{copy.dial.moat}</p>

            <div className="v29-mech">
              <span className="v29-mech-title">{copy.dial.mechTitle}</span>
              <ol className="v29-mech-steps">
                {copy.dial.steps.map((s, i) => (
                  <li key={i} className="v29-mech-step">
                    <span className="v29-mech-n">{s.n}</span>
                    <span className="v29-mech-t">
                      <b>{s.t}</b> {s.d}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </QModule>

      {/* ── Q3 · «Чому не підписка?» — Бо іспит має дату. ─────────────── */}
      <QModule
        id="plan"
        question={copy.plan.question}
        answer={copy.plan.answer}
        lede={copy.plan.lede}
      >
        <div className="v29-plan-grid">
          <div className="v29-plan-frames">
            <p className="v29-frame-a">{copy.plan.frameA}</p>
            <p className="v29-frame-b">{copy.plan.frameB}</p>
          </div>
          <Planner />
        </div>
      </QModule>

      {/* ── Q4 · «Скільки це коштує насправді?» — 399 ₴. Один раз. ────── */}
      <QModule
        id="price"
        question={copy.price.question}
        answer={copy.price.answer}
        lede={copy.price.lede}
      >
        <p className="v29-loss">
          <span>{copy.price.lossA}</span>
          <span>{copy.price.lossB}</span>
          <b>{copy.price.lossC}</b>
        </p>

        <div className="v29-price-card">
          <div className="v29-price-main">
            <div className="v29-price-tag">
              <span className="v29-price-name">{copy.price.priceName}</span>
              <div className="v29-price-num">
                <b>{copy.price.priceBig}</b>
                <span>{copy.price.priceCur}</span>
              </div>
              <p className="v29-price-unit">{copy.price.priceUnit}</p>
              <p className="v29-price-neg">{copy.price.negation}</p>
              <Link
                href="/register"
                className="v29-btn v29-btn--dark v29-btn--lg v29-price-cta"
              >
                {copy.price.cta} <ArrowRight size={18} strokeWidth={2.2} />
              </Link>
              <p className="v29-price-ctanote">{copy.price.ctaNote}</p>
            </div>

            <div className="v29-price-lists">
              <div className="v29-price-col">
                <span className="v29-price-col-t v29-price-col-t--free">
                  {copy.price.freeTitle}
                </span>
                <ul>
                  {copy.price.free.map((f, i) => (
                    <li key={i}>
                      <Check size={15} strokeWidth={2.4} /> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="v29-price-col">
                <span className="v29-price-col-t">{copy.price.paidTitle}</span>
                <ul>
                  {copy.price.paid.map((f, i) => (
                    <li key={i}>
                      <span className="v29-paid-dot" aria-hidden="true" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="v29-trust">
            {copy.price.trust.map((t, i) => (
              <span key={i}>{t}</span>
            ))}
          </div>
        </div>
      </QModule>

      {/* ── Q5 · «А якщо я не складу?» — Чесна відповідь. ─────────────── */}
      <QModule
        id="failsafe"
        question={copy.failsafe.question}
        answer={copy.failsafe.answer}
        lede={copy.failsafe.lede}
      >
        <div className="v29-fail">
          <p className="v29-fail-body">{copy.failsafe.body}</p>
          <p className="v29-fail-retaker">{copy.failsafe.retaker}</p>
        </div>
      </QModule>

      {/* ── БАЗА — і докази ──────────────────────────────────────────── */}
      <section className="v29-proof" data-reveal>
        <div className="v29-proof-inner">
          <div className="v29-proof-head">
            <h2 className="v29-h2">{copy.proof.heading}</h2>
            <span className="v29-proof-badge">{copy.proof.badge}</span>
          </div>
          <div className="v29-proof-stats">
            {copy.proof.stats.map((s, i) => (
              <div key={i} className="v29-proof-stat">
                <b>{s.k}</b>
                <span>{s.v}</span>
              </div>
            ))}
          </div>
          <p className="v29-proof-note">{copy.proof.note}</p>

          <div className="v29-reserved">
            <span className="v29-reserved-t">{copy.proof.reservedTitle}</span>
            <p>{copy.proof.reserved}</p>
          </div>
        </div>
      </section>

      {/* ── FAQ — решта питань ───────────────────────────────────────── */}
      <section className="v29-faqsec" data-reveal>
        <div className="v29-faqsec-inner">
          <div className="v29-faq-head">
            <h2 className="v29-h2">{copy.faq.heading}</h2>
            <p className="v29-faq-lede">{copy.faq.lede}</p>
          </div>
          <Faq />
        </div>
      </section>

      {/* ── ФІНАЛ — ранок ────────────────────────────────────────────── */}
      <section className="v29-final" data-reveal>
        <div className="v29-sun" aria-hidden="true" />
        <div className="v29-final-inner">
          <h2 className="v29-final-h">{copy.finalCta.heading}</h2>
          <p className="v29-final-sub">{copy.finalCta.sub}</p>
          <div className="v29-hero-cta v29-final-cta">
            <Link href="/register" className="v29-btn v29-btn--dark v29-btn--lg">
              {copy.finalCta.ctaPrimary} <ArrowRight size={18} strokeWidth={2.2} />
            </Link>
            {/* reg-free try = the live hero demo (anon mint is a server action,
                not a route); anchor back to it, never to /register. */}
            <a
              href="#v29-demo"
              className="v29-btn v29-btn--ghost v29-btn--lg"
              aria-label="спробувати демо-питання без реєстрації"
            >
              {copy.finalCta.ctaSecondary}
            </a>
          </div>

          <div className="v29-modes">
            <span className="v29-modes-t">{copy.finalCta.modesTitle}</span>
            {copy.finalCta.modes.map((m, i) => (
              <Link key={i} href={m.href} className="v29-mode-row">
                <span>{m.label}</span>
                <ArrowRight size={18} strokeWidth={2} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER — при повному світлі ──────────────────────────────── */}
      <footer className="v29-footer">
        <div className="v29-footer-inner">
          <div className="v29-footer-top">
            <div className="v29-footer-brandcol">
              <span className="v29-footer-brand">
                <span className="v29-brand-dot" aria-hidden="true" />
                {copy.footer.brand}
              </span>
              <p className="v29-footer-tag">{copy.footer.tagline}</p>
            </div>
            <div className="v29-footer-cols">
              {copy.footer.columns.map((c, i) => (
                <div key={i} className="v29-footer-col">
                  <span className="v29-footer-col-t">{c.title}</span>
                  {c.links.map((l) => (
                    <Link key={l.label} href={l.href}>
                      {l.label}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <p id="v29-legal" className="v29-footer-disclaimer">
            {copy.footer.disclaimer}
          </p>
          <div className="v29-footer-bottom">
            <span>{copy.footer.copyright}</span>
          </div>
        </div>
        <div className="v29-footer-ghost" aria-hidden="true">
          {copy.footer.ghost}
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Scoped styles — every selector prefixed v29-.
   Sky ramp: a seamless dawn gradient across the whole page. Each section's
   background linear-gradient goes from this step's entry tone to the next
   step's entry tone, so adjacent seams match exactly — one continuous
   lightening from pre-dawn violet (hero) to full morning (final CTA).
   ═══════════════════════════════════════════════════════════════════════ */
const v29css = `
.v29-root{
  --ink:#17141B; --text:#2A2530; --muted:#5A5266;
  --accent:#C2502F; --accent-deep:#A63F22; --violet:#4A3A63;
  --surface:#FFFFFF;
  --hair:rgba(37,28,51,.12); --hair-strong:rgba(37,28,51,.20);
  --grain:url("${GRAIN_URI}");
  /* dawn ramp boundary tones, top → bottom (each = the next section's entry).
     WIDENED: opens Q1 on a clearly violet pre-morning ground and swings hue
     cool-violet → warm-cream while lightening, so each module boundary reads
     as a real step of the dawn arc (not 1–2 imperceptible L points). */
  --s1:#DED3EE; --s2:#E4DAEF; --s3:#E9E1EF; --s4:#EEE7EE;
  --s5:#F2ECEB; --s6:#F6F0EA; --s7:#FAF5EE; --s8:#FDF9F3; --s9:#FFFDF9;
  font-family:var(--v29-onest),system-ui,sans-serif;
  color:var(--text); background:var(--s1);
  -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility;
  overflow-x:hidden;
}
.v29-root *{box-sizing:border-box;}

/* ── Buttons ─────────────────────────────────────────────────────── */
.v29-btn{display:inline-flex; align-items:center; justify-content:center; gap:.5rem;
  font-family:inherit; font-weight:600; text-decoration:none; cursor:pointer;
  border:1px solid transparent; border-radius:999px; white-space:nowrap; line-height:1;
  transition:transform .35s cubic-bezier(.2,.8,.2,1), background .3s, box-shadow .35s, color .3s, border-color .3s;}
.v29-btn--dark{background:var(--ink); color:#F7F4F0; box-shadow:0 1px 2px rgba(23,20,27,.28);}
.v29-btn--dark:hover{transform:translateY(-2px); box-shadow:0 14px 30px -12px rgba(23,20,27,.55);}
.v29-btn--light{background:#FFFFFF; color:var(--ink); border-color:var(--hair-strong); box-shadow:0 1px 2px rgba(23,20,27,.12);}
.v29-btn--light:hover{transform:translateY(-2px); box-shadow:0 12px 26px -12px rgba(23,20,27,.4);}
.v29-btn--ghost{background:transparent; color:var(--ink); border-color:var(--hair-strong);}
.v29-btn--ghost:hover{background:rgba(23,20,27,.05); border-color:rgba(23,20,27,.42);}
/* hero ghost sits on the DARK pre-dawn band → light outline + light label */
.v29-hero .v29-btn--ghost{color:#F4EEF3; border-color:rgba(255,255,255,.34);}
.v29-hero .v29-btn--ghost:hover{background:rgba(255,255,255,.10); border-color:rgba(255,255,255,.55);}
.v29-btn--sm{padding:.52rem 1.05rem; font-size:.86rem;}
.v29-btn--lg{padding:.94rem 1.6rem; font-size:1rem;}
.v29-btn:focus-visible{outline:2px solid var(--accent-deep); outline-offset:3px;}

/* ── Nav ─────────────────────────────────────────────────────────── */
.v29-nav{position:absolute; z-index:6; top:0; left:0; right:0;
  display:flex; align-items:center; justify-content:space-between;
  max-width:1200px; margin:0 auto; padding:1.35rem clamp(1.1rem,4vw,2.4rem);}
.v29-brand{display:inline-flex; align-items:center; gap:.5rem;
  font-weight:700; font-size:1.06rem; letter-spacing:-.01em; color:#F4EEF3; text-decoration:none;}
.v29-brand-dot{width:11px; height:11px; border-radius:50%; flex:none;
  background:radial-gradient(circle at 35% 30%, #F6C6A8, var(--accent) 70%);
  box-shadow:0 0 14px rgba(230,150,120,.7);}
.v29-nav-links{display:flex; gap:1.55rem;}
.v29-nav-links a{color:rgba(244,238,243,.82); text-decoration:none; font-size:.92rem; font-weight:500;}
.v29-nav-links a:hover{color:#fff;}
@media(max-width:720px){.v29-nav-links{display:none;}}

/* ── Hero ────────────────────────────────────────────────────────── */
.v29-hero{position:relative; overflow:hidden;
  padding:clamp(6.5rem,15vh,9rem) clamp(1.1rem,4vw,2.4rem) clamp(3rem,7vw,5rem);
  /* pre-dawn violet held across the whole copy area (so hero text sits on DARK
     steps → light ink clears WCAG AA), melting through a rose horizon into the
     s1 violet ground only in the last band (the seam into Q1). */
  background:
    radial-gradient(120% 80% at 82% 6%, rgba(201,184,232,.45) 0%, rgba(201,184,232,0) 52%),
    linear-gradient(180deg,#201829 0%,#271D33 20%,#2E2240 42%,#382A4B 60%,#443255 76%,#523E62 88%,#7C6382 95%,var(--s1) 100%);}
.v29-hero-sky{position:absolute; inset:0; z-index:0; overflow:hidden; pointer-events:none; will-change:transform;}
.v29-sky-blob{position:absolute; border-radius:50%; filter:blur(64px); opacity:.5; will-change:transform;}
.v29-sky-blob--a{width:48vw; height:48vw; left:-6vw; top:-8vw;
  background:radial-gradient(circle,#F6C6A8 0%,rgba(246,198,168,0) 68%);}
.v29-sky-blob--b{width:42vw; height:42vw; right:-4vw; top:-4vw;
  background:radial-gradient(circle,#C9B8E8 0%,rgba(201,184,232,0) 68%);}
.v29-grain{position:absolute; inset:-20%; background-image:var(--grain);
  background-size:180px 180px; opacity:.06; mix-blend-mode:soft-light;}
.v29-hero-inner{position:relative; z-index:2; max-width:1160px; margin:0 auto;
  display:grid; grid-template-columns:1.05fr .95fr;
  gap:clamp(1rem,2vw,1.5rem) clamp(2rem,5vw,4.2rem); align-items:center;
  grid-template-areas:"copy card" "chips card";}
.v29-hero-copy{grid-area:copy;}
.v29-hero-card{grid-area:card;}
.v29-hero-chips{grid-area:chips; align-self:start;}
.v29-hero-copy{max-width:34rem;}
/* Hero copy sits on the DARK pre-dawn steps → light ink (nav tone) clears AA:
   h1/sub ≥7:1, hook ≥4.5:1, chips ≥4.5:1. */
.v29-hero-h{margin:0; font-weight:800; letter-spacing:-.035em; line-height:.98;
  font-size:clamp(2.6rem,7vw,5rem); color:#FBF6FA; text-wrap:balance;}
.v29-h-line{display:block;}
.v29-hero-sub{margin:clamp(.9rem,2vw,1.35rem) 0 0; max-width:32ch;
  font-size:clamp(1.05rem,2vw,1.28rem); font-weight:500; line-height:1.5; color:rgba(247,240,246,.92);}
.v29-hero-cta{display:flex; gap:.7rem; flex-wrap:wrap; margin-top:clamp(1.2rem,2.6vw,1.9rem);}
.v29-hero-hook{margin:1rem 0 0; max-width:42ch; font-size:.94rem; font-weight:600; color:rgba(238,228,242,.86);}
.v29-hero-chips{list-style:none; display:flex; flex-wrap:wrap; gap:.5rem; margin:1.1rem 0 0; padding:0;}
.v29-hero-chips li{font-size:.82rem; font-weight:600; color:#F1E9F4;
  background:rgba(255,255,255,.10); border:1px solid rgba(255,255,255,.22);
  border-radius:999px; padding:.35rem .8rem;}

.v29-hero-card{position:relative; z-index:3;}
.v29-hero-contract{position:relative; z-index:2; max-width:1160px; margin:clamp(2.6rem,6vw,4rem) auto 0;
  padding-top:1.5rem; border-top:1px solid rgba(255,255,255,.16);
  font-size:clamp(1.05rem,2.4vw,1.4rem); font-weight:600; letter-spacing:-.01em; color:rgba(240,232,245,.94);
  text-wrap:balance;}

/* hero question card */
.v29-qcard{background:var(--surface); border-radius:22px;
  box-shadow:0 40px 90px -44px rgba(45,30,60,.55), 0 14px 34px -26px rgba(45,30,60,.4);
  padding:clamp(1.35rem,3.4vw,1.9rem); border:1px solid rgba(255,255,255,.6);}
.v29-qcard-top{display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-bottom:1.05rem;}
.v29-qcard-tag{font-size:.72rem; font-weight:700; letter-spacing:.02em; text-transform:uppercase; color:var(--muted);}
.v29-qcard-meter{display:flex; flex-direction:column; align-items:flex-end; gap:.3rem; min-width:120px;}
.v29-qcard-meter-track{width:110px; height:5px; border-radius:999px; background:var(--hair); overflow:hidden;}
.v29-qcard-meter-fill{display:block; width:100%; height:100%; border-radius:999px;
  background:linear-gradient(90deg,var(--accent-deep),var(--accent));
  transform-origin:left center; transform:scaleX(0); transition:transform .12s linear;}
.v29-qcard-meter-tag{font-size:.66rem; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:var(--muted);}
.v29-qcard-prompt{margin:0 0 1rem; font-size:clamp(1.05rem,2.4vw,1.2rem); font-weight:700;
  letter-spacing:-.01em; line-height:1.3; color:var(--ink);}
.v29-qcard-opts{display:flex; flex-direction:column; gap:.5rem;}
.v29-opt{display:flex; align-items:center; gap:.7rem; width:100%; text-align:left;
  font-family:inherit; font-size:.95rem; font-weight:500; color:var(--text);
  background:#FBF8F4; border:1px solid var(--hair); border-radius:13px;
  padding:.8rem .9rem; cursor:pointer; transition:border-color .2s, background .2s, transform .2s;}
.v29-opt:hover:not(:disabled){border-color:var(--hair-strong); transform:translateY(-1px);}
.v29-opt:disabled{cursor:default;}
.v29-opt-mark{display:inline-flex; align-items:center; justify-content:center;
  width:20px; height:20px; border-radius:999px; flex:none; border:1.5px solid var(--hair-strong);}
.v29-opt[data-state="correct"]{border-color:var(--accent-deep); background:#FBF1EC;}
.v29-opt[data-state="correct"] .v29-opt-mark{background:var(--accent-deep); color:#fff; border-color:var(--accent-deep);}
.v29-opt[data-state="correct"] .v29-opt-text{font-weight:700; color:var(--ink);}
.v29-opt[data-state="wrong"]{border-color:var(--hair-strong); background:#FBF8F4;}
.v29-opt[data-state="wrong"] .v29-opt-mark{color:var(--muted);}
.v29-opt[data-state="wrong"] .v29-opt-text{text-decoration:line-through; text-decoration-thickness:1px; color:var(--muted);}
.v29-opt[data-state="dim"]{opacity:.5;}
.v29-opt-text{line-height:1.35;}
.v29-qcard-foot{margin:1rem 0 0; font-size:.86rem; line-height:1.5; color:var(--muted); min-height:1.5em;}
.v29-qcard-foot[data-answered="true"]{color:var(--ink); font-weight:500;}
.v29-qcard-note{margin:.55rem 0 0; font-size:.78rem; line-height:1.45; color:var(--muted); font-weight:500;
  padding-top:.55rem; border-top:1px solid var(--hair);}

@media(max-width:900px){
  .v29-hero-inner{grid-template-columns:1fr; gap:clamp(1.5rem,4vw,2.2rem);
    grid-template-areas:"copy" "card" "chips";}
  .v29-hero-copy{max-width:none;}
  .v29-hero-chips{align-self:auto;}
}
/* mobile first-viewport rhythm: tighter top pad + compressed stack so the
   demo prompt + first options are reachable without scrolling (390×844). */
@media(max-width:560px){
  .v29-hero{padding-top:clamp(4.5rem,11vh,6rem);}
  .v29-hero-sub{margin-top:.8rem;}
  .v29-hero-cta{margin-top:1.1rem; gap:.55rem;}
  .v29-hero-hook{margin-top:.85rem;}
  .v29-qcard{padding:1.2rem 1.15rem;}
  .v29-qcard-top{margin-bottom:.85rem;}
  .v29-qcard-prompt{margin-bottom:.85rem;}
}

/* ── Question module grammar ─────────────────────────────────────── */
.v29-mod{position:relative;}
.v29-mod-inner{max-width:1080px; margin:0 auto;
  padding:clamp(4.5rem,11vw,8rem) clamp(1.1rem,4vw,2.4rem);}
.v29-mod + .v29-mod .v29-mod-inner, .v29-proof-inner, .v29-faqsec-inner{border-top:1px solid var(--hair);}
.v29-mod-head{max-width:36rem;}
.v29-q{margin:0; font-weight:800; letter-spacing:-.03em; line-height:1.02;
  font-size:clamp(2rem,5.6vw,3.9rem); color:var(--ink); text-wrap:balance;}
.v29-q-g{color:var(--violet); opacity:.42; font-weight:700;}
.v29-a{margin:.7rem 0 0; font-weight:800; letter-spacing:-.02em; line-height:1.05;
  font-size:clamp(1.7rem,4.6vw,3.1rem); color:var(--accent-deep); text-wrap:balance;}
.v29-a-dash{color:var(--accent); margin-right:.15em;}
.v29-lede{margin:1.3rem 0 0; max-width:60ch; font-size:clamp(1.02rem,1.7vw,1.18rem);
  line-height:1.6; color:var(--text); text-wrap:pretty;}
.v29-mod-body{margin-top:clamp(2.4rem,5vw,3.6rem);}

/* answer-mark */
.v29-mark{display:block; width:88px; height:auto; margin:clamp(2.6rem,6vw,4rem) 0 0;}
.v29-mark-h{stroke:var(--hair-strong); stroke-width:1.4; fill:none;}
.v29-mark-arc{stroke:var(--accent); stroke-width:2.6; fill:none; stroke-linecap:round;}
.v29-mark-ray{stroke:var(--accent); stroke-width:2.2; stroke-linecap:round;}

.v29-standing{margin:clamp(2rem,4vw,2.8rem) 0 0; max-width:52ch;
  font-size:clamp(1.05rem,2vw,1.3rem); font-weight:600; line-height:1.45;
  color:var(--violet); letter-spacing:-.01em; text-wrap:balance;}
.v29-body{margin:1.1rem 0 0; font-size:1.02rem; line-height:1.6; color:var(--text); max-width:52ch;}
.v29-h2{margin:0; font-weight:800; letter-spacing:-.028em; line-height:1.04;
  font-size:clamp(1.8rem,4.4vw,2.9rem); color:var(--ink); text-wrap:balance;}

/* ── Q1 free ─────────────────────────────────────────────────────── */
.v29-free-grid{display:grid; grid-template-columns:1fr 1fr; gap:clamp(1.4rem,3.5vw,2.6rem); align-items:stretch;}
.v29-free-list{list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:.85rem;
  align-content:center; justify-content:center;}
.v29-free-list li{display:flex; align-items:flex-start; gap:.7rem; font-size:clamp(1rem,1.7vw,1.12rem); color:var(--text);}
.v29-free-list b{color:var(--ink); font-weight:700;}
.v29-free-check{display:inline-flex; align-items:center; justify-content:center; flex:none;
  width:24px; height:24px; margin-top:1px; border-radius:999px; color:#fff;
  background:linear-gradient(135deg,var(--accent-deep),var(--accent));}
.v29-sim{background:var(--surface); border:1px solid var(--hair); border-radius:20px;
  padding:clamp(1.4rem,3vw,1.9rem); box-shadow:0 30px 60px -40px rgba(45,30,60,.35);}
.v29-sim-title{display:block; font-size:.94rem; font-weight:700; color:var(--ink); margin-bottom:1.1rem;}
.v29-sim-chips{display:grid; grid-template-columns:repeat(3,1fr); gap:.7rem;}
.v29-sim-chip{background:#FBF8F4; border:1px solid var(--hair); border-radius:14px;
  padding:1rem .6rem; text-align:center; display:flex; flex-direction:column; gap:.25rem;}
.v29-sim-chip b{font-size:clamp(1.7rem,4vw,2.3rem); font-weight:800; letter-spacing:-.03em; color:var(--accent-deep); line-height:1;}
.v29-sim-chip span{font-size:.78rem; color:var(--muted); font-weight:500;}
.v29-sim-note{margin:1.1rem 0 0; font-size:.9rem; line-height:1.5; color:var(--muted);}
/* Q1 evidence — a real restyled official image as proof of free-tier quality */
.v29-free-evidence{margin:clamp(2.2rem,4.5vw,3rem) 0 0; max-width:560px;}
.v29-free-evidence img{display:block; width:100%; height:auto; border-radius:16px;
  border:1px solid var(--hair); box-shadow:0 30px 60px -44px rgba(45,30,60,.42);}
.v29-free-evidence figcaption{margin:.85rem 0 0; font-size:.88rem; line-height:1.55; color:var(--muted); max-width:54ch;}
@media(max-width:760px){.v29-free-grid{grid-template-columns:1fr;}}

/* ── Q2 dial ─────────────────────────────────────────────────────── */
.v29-dial-grid{display:grid; grid-template-columns:.9fr 1.1fr; gap:clamp(2rem,5vw,4rem); align-items:center;}
.v29-dial-panel{background:var(--surface); border:1px solid var(--hair); border-radius:22px;
  box-shadow:0 40px 80px -44px rgba(45,30,60,.45); padding:clamp(1.6rem,4vw,2.4rem);
  display:flex; flex-direction:column; align-items:center; gap:1.4rem;}
.v29-dial-wrap{display:flex; flex-direction:column; align-items:center;}
.v29-dial{display:block;}
.v29-dial-track{fill:none; stroke:var(--hair); stroke-width:15; stroke-linecap:round;}
.v29-dial-fill{fill:none; stroke:var(--accent); stroke-width:15; stroke-linecap:round;}
.v29-dial-needle{stroke:var(--ink); stroke-width:3; stroke-linecap:round;}
.v29-dial-hub{fill:var(--ink);}
.v29-dial-num{fill:var(--ink); font-size:54px; font-weight:800; text-anchor:middle; letter-spacing:-.03em;
  font-family:var(--v29-onest),sans-serif;}
.v29-dial-pct{fill:var(--muted); font-size:13px; font-weight:600; text-anchor:middle; font-family:var(--v29-onest),sans-serif;}
.v29-dial-tag{margin-top:.5rem; font-size:.74rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--accent-deep);}
.v29-spark-wrap{width:100%; border-top:1px solid var(--hair); padding-top:1.3rem;}
.v29-spark{width:100%; height:auto; display:block;}
.v29-spark-line{fill:none; stroke:var(--accent); stroke-width:2.2; stroke-linejoin:round; stroke-linecap:round; opacity:.9;}
.v29-spark-dot{fill:var(--accent-deep);}
.v29-spark-cap{margin:.8rem 0 0; font-size:.82rem; color:var(--muted); text-align:center;}
.v29-caption-strong{margin:0; font-size:clamp(1.25rem,2.8vw,1.7rem); font-weight:800; letter-spacing:-.02em; color:var(--ink);}
.v29-moat{margin:1.3rem 0 0; padding-top:1.3rem; border-top:1px solid var(--hair);
  font-size:.98rem; line-height:1.55; font-weight:600; color:var(--violet); max-width:46ch;}
.v29-mech{margin-top:1.6rem;}
.v29-mech-title{display:block; font-size:.82rem; font-weight:700; letter-spacing:.02em; color:var(--muted); margin-bottom:1rem;}
.v29-mech-steps{list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:.9rem;}
.v29-mech-step{display:flex; align-items:baseline; gap:.9rem;}
.v29-mech-n{font-size:1rem; font-weight:800; color:var(--accent); font-variant-numeric:tabular-nums; flex:none; letter-spacing:-.02em;}
.v29-mech-t{font-size:1rem; line-height:1.45; color:var(--text);}
.v29-mech-t b{color:var(--ink); font-weight:700;}
@media(max-width:860px){.v29-dial-grid{grid-template-columns:1fr;}}

/* ── Q3 plan ─────────────────────────────────────────────────────── */
.v29-plan-grid{display:grid; grid-template-columns:1fr 1fr; gap:clamp(1.8rem,5vw,3.6rem); align-items:center;}
.v29-plan-frames{}
.v29-frame-a{margin:0; font-size:clamp(1.7rem,3.6vw,2.5rem); font-weight:800; letter-spacing:-.02em; color:var(--ink); line-height:1.05;}
.v29-frame-b{margin:1rem 0 0; font-size:clamp(1.02rem,1.9vw,1.2rem); font-weight:500; line-height:1.5; color:var(--text); max-width:34ch;}
.v29-plan-card{background:var(--surface); border:1px solid var(--hair); border-radius:22px;
  box-shadow:0 40px 80px -44px rgba(45,30,60,.4); padding:clamp(1.6rem,4vw,2.2rem);}
.v29-plan-label{display:block; font-size:.82rem; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.03em; margin-bottom:.55rem;}
.v29-plan-input{width:100%; font-family:inherit; font-size:1.05rem; font-weight:600; color:var(--ink);
  background:#FBF8F4; border:1px solid var(--hair-strong); border-radius:13px; padding:.85rem 1rem;}
.v29-plan-input:focus-visible{outline:2px solid var(--accent-deep); outline-offset:1px; border-color:var(--accent-deep);}
.v29-plan-out{margin-top:1.3rem; min-height:126px;}
.v29-plan-fallback{margin:0; font-size:.95rem; line-height:1.5; color:var(--muted);}
.v29-plan-today{margin:0; font-size:1.05rem; line-height:1.5; font-weight:600; color:var(--ink);}
.v29-plan-figs{display:flex; align-items:baseline; gap:.7rem; flex-wrap:wrap;}
.v29-plan-fig{display:inline-flex; align-items:baseline; gap:.35rem; font-size:.9rem; color:var(--muted); font-weight:600;}
.v29-plan-fig b{font-size:clamp(2rem,5vw,2.7rem); font-weight:800; letter-spacing:-.03em; color:var(--ink);}
.v29-plan-x{font-size:1.4rem; color:var(--accent);}
.v29-plan-int{display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; margin:.9rem 0 0; font-size:.88rem; color:var(--text); font-weight:500;}
.v29-plan-int-pill{background:var(--accent-deep); color:#F7F4F0; font-size:.72rem; font-weight:700; padding:.22rem .6rem; border-radius:999px; text-transform:uppercase; letter-spacing:.03em;}
.v29-plan-focus{margin:.9rem 0 0; font-size:.85rem; line-height:1.5; color:var(--muted);}
.v29-plan-cta{margin-top:1.5rem; width:100%;}
@media(max-width:860px){.v29-plan-grid{grid-template-columns:1fr;}}

/* ── Q4 price ────────────────────────────────────────────────────── */
.v29-loss{display:flex; flex-wrap:wrap; align-items:baseline; gap:.4rem .9rem; margin:0 0 clamp(1.8rem,4vw,2.6rem);
  font-size:clamp(1.1rem,2.2vw,1.45rem); font-weight:600; color:var(--text); letter-spacing:-.01em;}
.v29-loss b{color:var(--accent-deep); font-weight:800;}
.v29-price-card{background:var(--surface); border:1px solid var(--hair); border-radius:24px;
  box-shadow:0 50px 90px -50px rgba(45,30,60,.45); padding:clamp(1.6rem,4vw,3rem);}
.v29-price-main{display:grid; grid-template-columns:1.05fr 1fr; gap:clamp(1.8rem,4vw,3.2rem);}
.v29-price-tag{display:flex; flex-direction:column;}
.v29-price-name{font-size:.82rem; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:var(--muted);}
.v29-price-num{display:flex; align-items:baseline; gap:.4rem; margin:.5rem 0 0;}
.v29-price-num b{font-size:clamp(3.2rem,8vw,4.6rem); font-weight:800; letter-spacing:-.04em; color:var(--ink); line-height:1;}
.v29-price-num span{font-size:1.6rem; font-weight:700; color:var(--accent-deep);}
.v29-price-unit{margin:.7rem 0 0; font-size:.95rem; font-weight:600; color:var(--ink);}
.v29-price-neg{margin:.35rem 0 0; font-size:.92rem; font-weight:700; color:var(--accent-deep);}
.v29-price-cta{margin-top:1.5rem;}
.v29-price-ctanote{margin:.7rem 0 0; font-size:.8rem; color:var(--muted);}
.v29-price-lists{display:flex; flex-direction:column; gap:1.6rem;}
.v29-price-col-t{display:block; font-size:.8rem; font-weight:700; text-transform:uppercase; letter-spacing:.03em; color:var(--muted); margin-bottom:.7rem;}
.v29-price-col-t--free{color:var(--accent-deep);}
.v29-price-col ul{list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:.55rem;}
.v29-price-col li{display:flex; align-items:flex-start; gap:.55rem; font-size:.94rem; color:var(--text); line-height:1.4;}
.v29-price-col li svg{flex:none; margin-top:2px; color:var(--accent-deep);}
.v29-paid-dot{width:8px; height:8px; border-radius:50%; flex:none; margin-top:7px; background:var(--violet);}
.v29-trust{display:flex; flex-wrap:wrap; gap:.5rem 1.2rem; justify-content:center; margin-top:1.8rem;
  padding-top:1.5rem; border-top:1px solid var(--hair);
  font-size:.86rem; font-weight:700; color:var(--violet);}
.v29-trust span{position:relative; padding-left:1.4rem;}
.v29-trust span:first-child{padding-left:0;}
.v29-trust span:not(:first-child)::before{content:"·"; position:absolute; left:.55rem; opacity:.6;}
@media(max-width:720px){.v29-price-main{grid-template-columns:1fr;}}

/* ── Q5 failsafe ─────────────────────────────────────────────────── */
.v29-fail{max-width:60ch;}
.v29-fail-body{margin:0; padding:clamp(1.4rem,3vw,1.9rem) clamp(1.4rem,3.5vw,2.1rem);
  background:var(--surface); border:1px solid var(--hair); border-radius:20px;
  box-shadow:0 30px 60px -44px rgba(45,30,60,.35);
  font-size:clamp(1.05rem,2vw,1.28rem); line-height:1.55; font-weight:500; color:var(--ink);}
.v29-fail-retaker{margin:1.4rem 0 0; font-size:1rem; line-height:1.6; color:var(--text);}

/* ── БАЗА proof ──────────────────────────────────────────────────── */
.v29-proof, .v29-faqsec{position:relative;}
.v29-proof-inner, .v29-faqsec-inner{max-width:1080px; margin:0 auto;
  padding:clamp(4.5rem,11vw,8rem) clamp(1.1rem,4vw,2.4rem);}
.v29-proof-head{display:flex; align-items:baseline; gap:1rem; flex-wrap:wrap; margin-bottom:2.2rem;}
.v29-proof-head .v29-h2{flex:1 1 auto;}
.v29-proof-badge{display:inline-flex; align-items:center; gap:.4rem; font-size:.8rem; font-weight:700;
  color:var(--accent-deep); background:rgba(194,80,47,.1); border:1px solid rgba(194,80,47,.2);
  border-radius:999px; padding:.42rem .9rem;}
.v29-proof-stats{display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:var(--hair);
  border:1px solid var(--hair); border-radius:18px; overflow:hidden;}
.v29-proof-stat{background:var(--s7); padding:clamp(1.6rem,4vw,2.4rem); text-align:left; display:flex; flex-direction:column; gap:.3rem;}
.v29-proof-stat b{font-size:clamp(2.2rem,5vw,3.2rem); font-weight:800; letter-spacing:-.03em; color:var(--ink);}
.v29-proof-stat span{font-size:.9rem; color:var(--muted); font-weight:500;}
.v29-proof-note{margin:1.8rem 0 0; font-size:1rem; line-height:1.6; color:var(--text); max-width:64ch;}
.v29-reserved{margin:2rem 0 0; padding:clamp(1.4rem,3vw,1.8rem); border:1px dashed var(--hair-strong);
  border-radius:18px; background:rgba(255,255,255,.4);}
.v29-reserved-t{display:block; font-size:.78rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--muted); margin-bottom:.6rem;}
.v29-reserved p{margin:0; font-size:.96rem; line-height:1.6; color:var(--text); max-width:64ch;}
@media(max-width:560px){.v29-proof-stats{grid-template-columns:1fr;}}

/* ── FAQ ─────────────────────────────────────────────────────────── */
.v29-faq-head{margin-bottom:2rem;}
.v29-faq-lede{margin:.8rem 0 0; font-size:1.05rem; color:var(--muted);}
.v29-faq{border-top:1px solid var(--hair);}
.v29-faq-row{border-bottom:1px solid var(--hair);}
.v29-faq-q{display:flex; align-items:center; justify-content:space-between; gap:1.5rem; width:100%;
  font-family:inherit; text-align:left; background:none; border:none; cursor:pointer;
  padding:1.5rem 0; font-size:clamp(1.05rem,2.2vw,1.28rem); font-weight:700; letter-spacing:-.01em; color:var(--ink);}
.v29-faq-ico{display:inline-flex; flex:none; color:var(--accent-deep);}
.v29-faq-a{display:grid; grid-template-rows:0fr; transition:grid-template-rows .4s cubic-bezier(.2,.8,.2,1);}
.v29-faq-a[data-open="true"]{grid-template-rows:1fr;}
.v29-faq-a-inner{overflow:hidden; min-height:0;}
.v29-faq-a p{margin:0; padding:0 0 1.6rem; font-size:1rem; line-height:1.6; color:var(--text); max-width:66ch;}

/* ── ФІНАЛ morning ───────────────────────────────────────────────── */
.v29-final{position:relative; overflow:hidden;
  padding:clamp(5rem,13vw,9rem) clamp(1.1rem,4vw,2.4rem);
  background:linear-gradient(180deg,var(--s8) 0%,var(--s9) 60%,#FFFDFB 100%);}
.v29-sun{position:absolute; z-index:0; left:50%; top:-42%; transform:translateX(-50%);
  width:min(140vw,1200px); height:1200px; border-radius:50%; pointer-events:none;
  background:radial-gradient(circle at 50% 100%, rgba(246,198,168,.55) 0%, rgba(230,150,120,.22) 26%, rgba(201,184,232,.14) 44%, rgba(201,184,232,0) 62%);}
.v29-final-inner{position:relative; z-index:2; max-width:760px; margin:0 auto; text-align:center;}
.v29-final-h{margin:0; font-weight:800; letter-spacing:-.03em; line-height:1.02;
  font-size:clamp(2.1rem,5.5vw,3.6rem); color:var(--ink); text-wrap:balance;}
.v29-final-sub{margin:1.1rem auto 0; font-size:1.12rem; font-weight:500; color:var(--text); max-width:42ch;}
.v29-final-cta{margin-top:2rem; justify-content:center;}
.v29-modes{margin:2.8rem auto 0; max-width:460px; text-align:left;}
.v29-modes-t{display:block; font-size:.78rem; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); margin-bottom:.7rem; text-align:center;}
.v29-mode-row{display:flex; align-items:center; justify-content:space-between; gap:1rem;
  padding:1.05rem 1.3rem; background:var(--surface); border:1px solid var(--hair); border-radius:14px; text-decoration:none;
  color:var(--ink); font-weight:600; font-size:1rem; margin-top:.6rem;
  box-shadow:0 12px 26px -20px rgba(45,30,60,.5); transition:transform .3s, box-shadow .3s, border-color .3s;}
.v29-mode-row:hover{transform:translateY(-2px); box-shadow:0 18px 32px -20px rgba(45,30,60,.55); border-color:var(--hair-strong);}
.v29-mode-row svg{color:var(--accent-deep);}

/* ── Footer — deepest remaining tint, brand finale ───────────────── */
.v29-footer{position:relative; overflow:hidden; background:#241B31; color:#CFC5D6;
  padding:clamp(3.5rem,8vw,5.5rem) clamp(1.1rem,4vw,2.4rem) 2.5rem;}
.v29-footer-inner{position:relative; z-index:2; max-width:1080px; margin:0 auto;}
.v29-footer-top{display:flex; gap:2.5rem; flex-wrap:wrap; justify-content:space-between;
  padding-bottom:2.5rem; border-bottom:1px solid rgba(255,255,255,.12);}
.v29-footer-brandcol{max-width:280px;}
.v29-footer-brand{display:inline-flex; align-items:center; gap:.5rem; font-size:1.2rem; font-weight:700; color:#F3ECEF;}
.v29-footer-tag{margin:.7rem 0 0; font-size:.92rem; line-height:1.5; color:#A99DB3;}
.v29-footer-cols{display:flex; gap:clamp(2rem,6vw,4.5rem); flex-wrap:wrap;}
.v29-footer-col{display:flex; flex-direction:column; gap:.6rem;}
.v29-footer-col-t{font-size:.75rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:#9E93AB; margin-bottom:.2rem;}
.v29-footer-col a{color:#CFC5D6; text-decoration:none; font-size:.92rem;}
.v29-footer-col a:hover{color:#fff;}
.v29-footer-disclaimer{margin:2rem 0 0; font-size:.78rem; line-height:1.6; color:#9E93AB; max-width:78ch;}
.v29-footer-bottom{margin-top:1.5rem; font-size:.78rem; color:#9E93AB;}
.v29-footer-ghost{position:absolute; z-index:1; left:0; right:0; bottom:-.18em; text-align:center;
  font-weight:800; letter-spacing:-.04em; line-height:1; color:rgba(246,198,168,.06);
  font-size:clamp(5rem,24vw,20rem); pointer-events:none; user-select:none; white-space:nowrap;}

/* ── Sky ramp: per-section grounds, seamless boundaries ──────────── */
.v29-free{background:linear-gradient(180deg,var(--s1),var(--s2));}
.v29-dial{}
.v29-mod.v29-dial{background:linear-gradient(180deg,var(--s2),var(--s3));}
.v29-plan{background:linear-gradient(180deg,var(--s3),var(--s4));}
.v29-price{background:linear-gradient(180deg,var(--s4),var(--s5));}
.v29-failsafe{background:linear-gradient(180deg,var(--s5),var(--s6));}
.v29-proof{background:linear-gradient(180deg,var(--s6),var(--s7));}
.v29-faqsec{background:linear-gradient(180deg,var(--s7),var(--s8));}

/* ── Reveals — additive; resting default fully visible/drawn ─────── */
.v29-reveal-ready [data-reveal]{}
.v29-reveal-ready [data-reveal].v29-in .v29-q{animation:v29rise .8s cubic-bezier(.19,1,.22,1) both;}
.v29-reveal-ready [data-reveal].v29-in .v29-a{animation:v29rise .8s cubic-bezier(.19,1,.22,1) .08s both;}
.v29-reveal-ready [data-reveal].v29-in .v29-lede{animation:v29rise .8s cubic-bezier(.19,1,.22,1) .14s both;}
.v29-reveal-ready [data-reveal].v29-in .v29-mod-body,
.v29-reveal-ready [data-reveal].v29-in .v29-proof-stats,
.v29-reveal-ready [data-reveal].v29-in .v29-faq,
.v29-reveal-ready [data-reveal].v29-in .v29-final-inner{animation:v29rise .85s cubic-bezier(.19,1,.22,1) .18s both;}
.v29-reveal-ready [data-reveal].v29-in .v29-mark line,
.v29-reveal-ready [data-reveal].v29-in .v29-mark path{
  stroke-dasharray:1; animation:v29draw 1s ease-out .5s both;}
@keyframes v29rise{from{opacity:0; transform:translateY(26px);} to{opacity:1; transform:none;}}
@keyframes v29draw{from{stroke-dashoffset:1;} to{stroke-dashoffset:0;}}

/* ── Responsive ──────────────────────────────────────────────────── */
@media(max-width:520px){
  .v29-btn--lg{width:100%;}
  .v29-hero-cta{flex-direction:column; align-items:stretch;}
  .v29-hero-cta .v29-btn{width:100%;}
  .v29-final-cta{flex-direction:column;}
  .v29-sim-chips{grid-template-columns:repeat(3,1fr);}
}

/* ── Reduced motion — hard swaps, instant reveals, discrete dial ──── */
@media(prefers-reduced-motion:reduce){
  .v29-sky-blob{animation:none !important;}
  .v29-btn,.v29-mode-row,.v29-opt{transition:none !important;}
  .v29-reveal-ready [data-reveal].v29-in *{animation:none !important;}
  *{scroll-behavior:auto !important;}
}
`;
