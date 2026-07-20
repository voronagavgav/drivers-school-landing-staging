"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Rubik, Caveat } from "next/font/google";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { copy, HERO_VARIANTS, ACTIVE_HERO } from "./copy";

/* ── Fonts (declared locally, cyrillic verified) ─────────────────────── */
const rubik = Rubik({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "700", "800"],
  variable: "--v6-rubik",
  display: "swap",
});
const caveat = Caveat({
  subsets: ["latin", "cyrillic"],
  weight: ["600", "700"],
  variable: "--v6-caveat",
  display: "swap",
});

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const H = HERO_VARIANTS[ACTIVE_HERO];

/* ── Arc geometry (rounded for identical SSR / client serialization) ──── */
const rnd = (n: number) => Math.round(n * 100) / 100;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
function polar(cx: number, cy: number, r: number, frac: number) {
  const a = Math.PI * (1 - clamp01(frac));
  return { x: rnd(cx + r * Math.cos(a)), y: rnd(cy - r * Math.sin(a)) };
}
function arcPath(cx: number, cy: number, r: number) {
  const s = polar(cx, cy, r, 0);
  const e = polar(cx, cy, r, 1);
  return `M ${s.x} ${s.y} A ${r} ${r} 0 0 1 ${e.x} ${e.y}`;
}

/* ═══════════════════════════════════════════════════════════════════════
   Hand-drawn primitives
   ═══════════════════════════════════════════════════════════════════════ */

/** Clay underline the coach sketches under a keyword. Self-draws. */
function Underline({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`v6-under ${className}`}
      viewBox="0 0 220 18"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path
        data-draw
        d="M4 11C40 6 78 5 112 7C146 9 182 8 216 4"
        stroke="#C2502F"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Irregular hand-drawn horizontal divider. */
function Divider() {
  return (
    <svg
      className="v6-divider"
      viewBox="0 0 1200 12"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path
        data-draw
        d="M2 7C160 3 320 9 480 6C640 3 800 8 960 6C1060 5 1140 7 1198 5"
        stroke="#C2502F"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

/** Hand-drawn tick (accent green). */
function Tick() {
  return (
    <svg viewBox="0 0 24 24" className="v6-tick" fill="none" aria-hidden="true">
      <path
        d="M4 13.5C6.5 15 8.8 17.5 10 20C12.5 13 15.5 7.5 21 3.5"
        stroke="#3E7D64"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Simulator beat — exam answer sheet with two marked boxes (self-draws). */
function AnswerSheet() {
  return (
    <svg viewBox="0 0 132 110" className="v6-illus" fill="none" role="img" aria-label="Аркуш відповідей із позначеними варіантами">
      <path data-draw d="M22 12 L100 9 L105 98 L27 101 Z" stroke="#2A211D" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      {/* row 1 — correct (green tick) */}
      <path data-draw d="M34 30 H48 V44 H34 Z" stroke="#2A211D" strokeWidth="2.2" strokeLinejoin="round" />
      <path data-draw d="M36 37 L42 43 L52 27" stroke="#3E7D64" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path data-draw d="M58 37 H92" stroke="#2A211D" strokeWidth="2.2" strokeLinecap="round" opacity="0.38" />
      {/* row 2 — wrong (clay cross, never red) */}
      <path data-draw d="M34 57 H48 V71 H34 Z" stroke="#2A211D" strokeWidth="2.2" strokeLinejoin="round" />
      <path data-draw d="M37 60 L45 68 M45 60 L37 68" stroke="#C2502F" strokeWidth="3" strokeLinecap="round" />
      <path data-draw d="M58 64 H88" stroke="#2A211D" strokeWidth="2.2" strokeLinecap="round" opacity="0.38" />
      {/* row 3 — blank */}
      <path data-draw d="M34 84 H48 V98 H34 Z" stroke="#2A211D" strokeWidth="2.2" strokeLinejoin="round" opacity="0.55" />
      <path data-draw d="M58 91 H90" stroke="#2A211D" strokeWidth="2.2" strokeLinecap="round" opacity="0.38" />
    </svg>
  );
}

/** Proof beat — a hand-drawn verification seal with a pine checkmark. */
function ProofSeal() {
  return (
    <svg viewBox="0 0 96 96" className="v6-illus" fill="none" role="img" aria-label="Печатка звірки з офіційним джерелом">
      <path data-draw d="M48 8 C70 8 88 26 88 48 C88 70 70 88 48 88 C26 88 8 70 8 48 C8 26 26 8 48 8 Z" stroke="#C2502F" strokeWidth="3" strokeLinecap="round" />
      <path data-draw d="M48 18 C64 18 78 32 78 48 C78 64 64 78 48 78 C32 78 18 64 18 48 C18 32 32 18 48 18 Z" stroke="#C2502F" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
      <path data-draw d="M31 50 C37 53 42 58 45 64 C51 49 60 38 70 30" stroke="#3E7D64" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Pricing beat — the coach circles the 399 by hand (white stroke on the clay block). */
function PriceCircle() {
  return (
    <svg className="v6-price-circle" viewBox="0 0 220 120" fill="none" aria-hidden="true" preserveAspectRatio="none">
      <path data-draw d="M42 20 C112 6 190 12 208 42 C219 64 196 98 128 108 C58 118 10 100 7 66 C5 40 20 26 48 17" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}

/** Small hand-drawn clay underline used to hand-tick the format cells. */
function MiniUnderline() {
  return (
    <svg className="v6-format-under" viewBox="0 0 60 10" fill="none" aria-hidden="true" preserveAspectRatio="none">
      <path data-draw d="M4 6 C18 3 34 3 56 5" stroke="#C2502F" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

/** The coach + readiness arc + resting pencil — self-drawing line art. */
function CoachScene() {
  return (
    <svg
      viewBox="0 0 440 320"
      className="v6-scene"
      fill="none"
      role="img"
      aria-label="Тренер поруч біля стрілки готовності"
    >
      {/* readiness arc (gauge) */}
      <path data-draw d={arcPath(300, 236, 104)} stroke="#E4B7A6" strokeWidth="5" strokeLinecap="round" />
      {/* grown (green) portion of the arc */}
      <path
        data-draw
        d="M196 236 A104 104 0 0 1 268 137"
        stroke="#3E7D64"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      {/* ticks */}
      {[0.16, 0.34, 0.52, 0.7, 0.86].map((f, i) => {
        const a = polar(300, 236, 104, f);
        const b = polar(300, 236, 92, f);
        return (
          <path
            key={i}
            data-draw
            d={`M${a.x} ${a.y} L${b.x} ${b.y}`}
            stroke="#2A211D"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.35"
          />
        );
      })}
      {/* needle */}
      <path data-draw d="M300 236 L339 168" stroke="#C2502F" strokeWidth="4" strokeLinecap="round" />
      <circle cx="300" cy="236" r="7" fill="#C2502F" />
      {/* pencil resting across the arc rim — hexagonal body, wood-cone clay tip, eraser */}
      <g data-draw-group>
        {/* body */}
        <path data-draw d="M238 128 L312 105" stroke="#2A211D" strokeWidth="8" strokeLinecap="butt" />
        {/* hexagonal edge hint */}
        <path data-draw d="M240 122 L314 99" stroke="#2A211D" strokeWidth="1.6" strokeLinecap="round" opacity="0.35" />
        {/* sharpened wood cone resting onto the arc */}
        <path data-draw d="M238 133 L220 134 L240 119 Z" stroke="#2A211D" strokeWidth="2.2" strokeLinejoin="round" fill="#EAD9CB" />
        {/* clay graphite point */}
        <path data-draw d="M220 134 L229 128" stroke="#C2502F" strokeWidth="3.6" strokeLinecap="round" />
        {/* metal ferrule + eraser tick */}
        <path data-draw d="M309 106 L316 104" stroke="#2A211D" strokeWidth="8" strokeLinecap="butt" opacity="0.45" />
        <path data-draw d="M316 104 L322 102" stroke="#C2502F" strokeWidth="7" strokeLinecap="round" opacity="0.75" />
      </g>

      {/* the coach — calm seated figure */}
      <g>
        <path data-draw d="M96 92 C96 74 108 62 124 62 C140 62 152 74 152 92 C152 110 140 122 124 122 C108 122 96 110 96 92 Z" stroke="#C2502F" strokeWidth="4.5" strokeLinecap="round" />
        {/* neck connecting head to shoulders */}
        <path data-draw d="M113 119 C111 131 113 142 121 151" stroke="#C2502F" strokeWidth="4.5" strokeLinecap="round" />
        <path data-draw d="M135 119 C137 131 135 142 127 151" stroke="#C2502F" strokeWidth="4.5" strokeLinecap="round" />
        {/* torso / rounded shoulders */}
        <path data-draw d="M78 236 C78 182 92 150 124 150 C156 150 170 182 170 236" stroke="#C2502F" strokeWidth="4.5" strokeLinecap="round" />
        {/* arm reaching toward the pencil/arc */}
        <path data-draw d="M158 176 C186 168 210 150 236 122" stroke="#C2502F" strokeWidth="4.5" strokeLinecap="round" />
        {/* calm smile */}
        <path data-draw d="M112 100 C118 106 130 106 136 100" stroke="#2A211D" strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />
      </g>
    </svg>
  );
}

/* ── Small semicircle readiness meter (hero card + reused) ────────────── */
function Meter({ value }: { value: number }) {
  const v = clamp01(value / 100);
  const tip = polar(90, 78, 62, v);
  return (
    <svg viewBox="0 0 180 96" className="v6-meter" fill="none" aria-hidden="true">
      <path d={arcPath(90, 78, 62)} stroke="#EAD3C8" strokeWidth="9" strokeLinecap="round" />
      <path
        className="v6-meter-val"
        d={arcPath(90, 78, 62)}
        stroke="#3E7D64"
        strokeWidth="9"
        strokeLinecap="round"
        pathLength={1000}
        style={{ strokeDasharray: 1000, strokeDashoffset: rnd(1000 * (1 - v)) }}
      />
      <line
        className="v6-meter-needle"
        x1="90"
        y1="78"
        x2={tip.x}
        y2={tip.y}
        stroke="#C2502F"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="90" cy="78" r="5" fill="#C2502F" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Hero interactive official question card
   ═══════════════════════════════════════════════════════════════════════ */
function QuestionCard() {
  const c = copy.hero.card;
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = picked === c.correctIndex;
  const noteRef = useRef<HTMLSpanElement>(null);

  const value = answered ? (correct ? 14 : 0) : 0;

  useEffect(() => {
    if (!answered || !noteRef.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      noteRef.current.style.clipPath = "inset(0 0 0 0)";
      return;
    }
    gsap.fromTo(
      noteRef.current,
      { clipPath: "inset(0 100% 0 0)" },
      { clipPath: "inset(0 0% 0 0)", duration: 0.5, ease: "power2.out" },
    );
  }, [answered]);

  return (
    <div id="v6-try" className="v6-card">
      <div className="v6-card-head">
        <span className="v6-card-tag">{c.tag}</span>
        <Meter value={value} />
      </div>
      <p className="v6-card-q">{c.prompt}</p>
      <div className="v6-opts">
        {c.options.map((opt, i) => {
          const state =
            !answered
              ? "idle"
              : i === c.correctIndex
              ? "right"
              : i === picked
              ? "wrong"
              : "dim";
          return (
            <button
              key={i}
              type="button"
              className={`v6-opt v6-opt-${state}`}
              onClick={() => !answered && setPicked(i)}
              aria-disabled={answered}
            >
              <span className="v6-opt-mark" aria-hidden="true">
                {state === "right" ? <Tick /> : null}
              </span>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>

      <div className="v6-card-foot" aria-live="polite">
        {answered ? (
          <>
            <span className="v6-sr">
              {correct
                ? "Правильно. Готовність підросла на один крок."
                : "Неправильно. Це тренування — стрілка готовності не змінюється."}
            </span>
            <p className="v6-explain">{c.explanation}</p>
            <span
              ref={noteRef}
              className={`v6-note ${caveat.className} ${correct ? "v6-note-ok" : "v6-note-clay"}`}
            >
              {correct ? c.noteRight : c.noteWrong}
            </span>
          </>
        ) : (
          <p className="v6-card-hint">{c.hint}</p>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Section 01 — decaying dial demo
   ═══════════════════════════════════════════════════════════════════════ */
function DecayDial() {
  const d = copy.dial;
  const valPathRef = useRef<SVGPathElement>(null);
  const needleRef = useRef<SVGLineElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const START = 78;
  const END = 63;

  const set = useCallback((v: number) => {
    const f = clamp01(v / 100);
    if (valPathRef.current)
      valPathRef.current.style.strokeDashoffset = String(rnd(1000 * (1 - f)));
    if (needleRef.current) {
      const tip = polar(140, 128, 104, f);
      needleRef.current.setAttribute("x2", String(tip.x));
      needleRef.current.setAttribute("y2", String(tip.y));
    }
    if (numRef.current) numRef.current.textContent = String(Math.round(v));
  }, []);

  useEffect(() => {
    set(START);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      set(END);
      return;
    }
    const proxy = { v: START };
    const st = ScrollTrigger.create({
      trigger: wrapRef.current,
      start: "top 72%",
      once: true,
      onEnter: () => {
        gsap.to(proxy, {
          v: END,
          duration: 1.6,
          ease: "power2.inOut",
          onUpdate: () => set(proxy.v),
        });
      },
    });
    return () => st.kill();
  }, [set]);

  const tip = polar(140, 128, 104, START / 100);
  return (
    <div ref={wrapRef} className="v6-dialwrap">
      <svg viewBox="0 0 280 156" className="v6-dial" fill="none" aria-label={d.caption}>
        <path d={arcPath(140, 128, 104)} stroke="#EAD3C8" strokeWidth="12" strokeLinecap="round" />
        <path
          ref={valPathRef}
          d={arcPath(140, 128, 104)}
          stroke="#3E7D64"
          strokeWidth="12"
          strokeLinecap="round"
          pathLength={1000}
          style={{ strokeDasharray: 1000 }}
        />
        <line ref={needleRef} x1="140" y1="128" x2={tip.x} y2={tip.y} stroke="#C2502F" strokeWidth="5" strokeLinecap="round" />
        <circle cx="140" cy="128" r="8" fill="#C2502F" />
      </svg>
      <div className="v6-dial-read">
        <span ref={numRef} className="v6-dial-num">{START}</span>
        <span className="v6-dial-pct">%</span>
      </div>
      <div className="v6-dial-scale">
        <span>{d.low}</span>
        <span>{d.high}</span>
      </div>
      <p className="v6-dial-caption">{d.caption}</p>
      <span className={`v6-note v6-note-clay ${caveat.className} v6-decaynote`}>{d.decayNote}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Section 02 — exam-date → plan preview
   ═══════════════════════════════════════════════════════════════════════ */
function PlanPicker() {
  const p = copy.plan;
  const [date, setDate] = useState("");
  const [result, setResult] = useState<
    | null
    | { kind: "days"; days: number; perDay: number; intensive: boolean }
    | { kind: "today" }
    | { kind: "past" }
  >(null);

  const onChange = (v: string) => {
    setDate(v);
    if (!v) return setResult(null);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(v + "T00:00:00");
    const days = Math.round((target.getTime() - today.getTime()) / 86400000);
    if (days < 0) return setResult({ kind: "past" });
    if (days === 0) return setResult({ kind: "today" });
    const perDay = Math.min(120, Math.max(12, Math.ceil(2322 / days)));
    setResult({ kind: "days", days, perDay, intensive: days < 7 });
  };

  return (
    <div className="v6-plan">
      <label className="v6-plan-label" htmlFor="v6-date">{p.dateLabel}</label>
      <input
        id="v6-date"
        type="date"
        value={date}
        onChange={(e) => onChange(e.target.value)}
        className="v6-date"
      />

      <div className="v6-plan-out" aria-live="polite">
        {result === null && <p className="v6-plan-fallback">{p.fallback}</p>}
        {result?.kind === "past" && <p className="v6-plan-fallback">{p.past}</p>}
        {result?.kind === "today" && <p className="v6-plan-fallback">{p.today}</p>}
        {result?.kind === "days" && (
          <>
            <div className="v6-plan-nums">
              <div>
                <span className="v6-plan-big">{result.days}</span>
                <span className="v6-plan-unit">{p.daysLeft}</span>
              </div>
              <span className="v6-plan-x" aria-hidden="true">×</span>
              <div>
                <span className="v6-plan-big">{result.perDay}</span>
                <span className="v6-plan-unit">{p.perDay}</span>
              </div>
            </div>
            {result.intensive && (
              <span className={`v6-note v6-note-clay ${caveat.className} v6-plan-note`}>{p.intensive}</span>
            )}
          </>
        )}
      </div>

      <p className="v6-plan-topicslbl">{p.topicsLabel}</p>
      <ul className="v6-topics">
        {p.topics.map((t) => (
          <li key={t}><Tick /><span>{t}</span></li>
        ))}
      </ul>
      <Link href="/register" className="v6-cta-primary v6-plan-cta">{p.cta}</Link>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Reusable section heading with a hand underline under the key word
   ═══════════════════════════════════════════════════════════════════════ */
function Heading({ title, keyWord }: { title: string; keyWord: string }) {
  const idx = title.indexOf(keyWord);
  if (idx === -1)
    return <h2 className="v6-h2">{title}</h2>;
  return (
    <h2 className="v6-h2">
      {title.slice(0, idx)}
      <span className="v6-key">
        {keyWord}
        <Underline className="v6-key-under" />
      </span>
      {title.slice(idx + keyWord.length)}
    </h2>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════════════════════ */
export default function V6() {
  const root = useRef<HTMLDivElement>(null);
  const hook = copy.hero.hook;

  // «Спробувати без реєстрації» must honour the promise: no /login wall.
  // Bring the real official question card into view and focus its first option.
  const scrollToTry = useCallback(() => {
    const el = document.getElementById("v6-try");
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    const first = el.querySelector<HTMLButtonElement>("button");
    window.setTimeout(() => first?.focus({ preventScroll: true }), reduce ? 0 : 420);
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const ctx = gsap.context(() => {
      // self-drawing strokes
      gsap.utils.toArray<SVGPathElement>("[data-draw]").forEach((path) => {
        const len = path.getTotalLength();
        gsap.set(path, { strokeDasharray: len });
        gsap.fromTo(
          path,
          { strokeDashoffset: len },
          {
            strokeDashoffset: 0,
            duration: 1.1,
            ease: "power3.out",
            immediateRender: false,
            scrollTrigger: { trigger: path, start: "top 88%", once: true },
          },
        );
      });
      // Caveat write-in notes (clip wipe)
      gsap.utils.toArray<HTMLElement>("[data-note-wipe]").forEach((el) => {
        gsap.fromTo(
          el,
          { clipPath: "inset(0 100% 0 0)" },
          {
            clipPath: "inset(0 0% 0 0)",
            duration: 0.55,
            ease: "power2.out",
            immediateRender: false,
            scrollTrigger: { trigger: el, start: "top 90%", once: true },
          },
        );
      });
      // modest 16px content rises
      gsap.utils.toArray<HTMLElement>("[data-rise]").forEach((el) => {
        gsap.fromTo(
          el,
          { y: 16, autoAlpha: 0.001 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.7,
            ease: "power2.out",
            immediateRender: false,
            scrollTrigger: { trigger: el, start: "top 90%", once: true },
          },
        );
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className={`${rubik.variable} ${caveat.variable} ${rubik.className} v6-root`}>
      <style>{CSS}</style>

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <header className="v6-bar">
        <Link href="/" className="v6-wordmark">
          <svg viewBox="0 0 30 30" aria-hidden="true" width="26" height="26">
            <path d="M6 24C6 14 14 6 24 6" stroke="#C2502F" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <circle cx="21" cy="9" r="3.2" fill="#C2502F" />
          </svg>
          <span>{copy.brand}</span>
        </Link>
        <nav className="v6-nav">
          <a href="#dial">{copy.nav.dial}</a>
          <a href="#plan">{copy.nav.plan}</a>
          <a href="#price">{copy.nav.price}</a>
          <a href="#faq">{copy.nav.faq}</a>
        </nav>
        <Link href="/login" className="v6-bar-login">{copy.nav.login}</Link>
      </header>

      <main>
        {/* ── HERO ──────────────────────────────────────────────────── */}
        <section className="v6-hero">
          <div className="v6-hero-copy">
            <h1 className="v6-h1">
              {H.lead}{" "}
              <span className="v6-key">
                {H.key}
                <Underline className="v6-h1-under" />
              </span>
            </h1>
            <span className={`v6-hero-margin ${caveat.className}`} data-note-wipe>
              {copy.hero.margin}
            </span>
            <p className="v6-sub">{H.subhead}</p>

            <div className="v6-cta-row">
              <Link href="/register" className="v6-cta-primary">{copy.hero.ctaPrimary}</Link>
              <button type="button" onClick={scrollToTry} className="v6-cta-ghost">{copy.hero.ctaSecondary}</button>
            </div>
          </div>

          <div className="v6-hero-art">
            <CoachScene />
            <QuestionCard />
          </div>

          <div className="v6-hero-belowfold">
            <div className="v6-chips">
              {copy.hero.chips.map((ch) => (
                <div key={ch.unit} className="v6-chip">
                  <span className="v6-chip-v">{ch.value}</span>
                  <span className="v6-chip-u">{ch.unit}</span>
                </div>
              ))}
            </div>

            <p className="v6-hook">
              {hook.pre}{" "}
              <span className="v6-hook-num">
                {hook.num}
                <svg className="v6-hook-circle" viewBox="0 0 48 48" fill="none" aria-hidden="true">
                  <path data-draw d="M30 8C14 4 6 14 6 24C6 36 18 44 30 42C42 40 46 28 40 18C36 11 28 7 22 8" stroke="#C2502F" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>{" "}
              {hook.post}
            </p>
            <p className="v6-hooksub">{copy.hero.hookSub}</p>
          </div>
        </section>

        <div className="v6-rule"><Divider /></div>

        {/* ── 01 · READINESS DIAL ───────────────────────────────────── */}
        <section id="dial" className="v6-sec v6-sec-panel">
          <div className="v6-sec-copy" data-rise>
            <Heading title={copy.dial.title} keyWord={copy.dial.key} />
            <p className="v6-lead">{copy.dial.lead}</p>
            <h3 className="v6-moat-t">{copy.dial.moatTitle}</h3>
            <p className="v6-moat-b">{copy.dial.moatBody}</p>
            <ul className="v6-list">
              {copy.dial.points.map((pt) => (
                <li key={pt}><Tick /><span>{pt}</span></li>
              ))}
            </ul>
          </div>
          <div className="v6-sec-art"><DecayDial /></div>
        </section>

        <div className="v6-rule"><Divider /></div>

        {/* ── 02 · PLAN PICKER ──────────────────────────────────────── */}
        <section id="plan" className="v6-sec v6-sec-rev">
          <div className="v6-sec-copy" data-rise>
            <Heading title={copy.plan.title} keyWord={copy.plan.key} />
            <p className="v6-lead">{copy.plan.lead}</p>
          </div>
          <div className="v6-sec-art"><PlanPicker /></div>
        </section>

        <div className="v6-rule"><Divider /></div>

        {/* ── 03 · SIMULATOR PROMISE ────────────────────────────────── */}
        <section className="v6-sec-narrow" data-rise>
          <Heading title={copy.sim.title} keyWord={copy.sim.key} />
          <p className="v6-lead v6-center">{copy.sim.lead}</p>
          <div className="v6-sim-illus"><AnswerSheet /></div>
          <div className="v6-format">
            {copy.sim.format.map((f) => (
              <div key={f.label} className="v6-format-cell">
                <span className="v6-format-n">{f.n}</span>
                <MiniUnderline />
                <span className="v6-format-l">{f.label}</span>
              </div>
            ))}
          </div>
          <p className="v6-sim-rule">{copy.sim.rule}</p>
          <span className={`v6-note v6-note-clay ${caveat.className} v6-sim-note`}>{copy.sim.note}</span>
          <div className="v6-center">
            <Link href="/register" className="v6-cta-primary">{copy.sim.cta}</Link>
          </div>
        </section>

        <div className="v6-rule"><Divider /></div>

        {/* ── 04 · PRICING ──────────────────────────────────────────── */}
        <section id="price" className="v6-sec-narrow" data-rise>
          <Heading title={copy.price.title} keyWord={copy.price.key} />
          <div className="v6-price-grid">
            <div className="v6-price-panel">
              <div className="v6-price-amt">
                <PriceCircle />
                <span className="v6-price-num">{copy.price.amount}</span>
                <span className="v6-price-cur">{copy.price.currency}</span>
              </div>
              <p className="v6-price-once">{copy.price.once}</p>
              <p className="v6-price-sub">{copy.price.sub}</p>
              <p className="v6-price-paidt">{copy.price.paidTitle}</p>
              <ul className="v6-list v6-list-onclay">
                {copy.price.paid.map((x) => (
                  <li key={x}><Tick /><span>{x}</span></li>
                ))}
              </ul>
              <Link href="/register" className="v6-cta-primary v6-price-cta">{copy.price.cta}</Link>
            </div>

            <div className="v6-price-free">
              <p className="v6-price-freet">{copy.price.freeTitle}</p>
              <ul className="v6-list">
                {copy.price.free.map((x) => (
                  <li key={x}><Tick /><span>{x}</span></li>
                ))}
              </ul>
              <p className="v6-anchor">{copy.price.anchor}</p>
              <p className="v6-safety">{copy.price.safety}</p>
            </div>
          </div>
          <p className={`v6-trust ${caveat.className}`}>
            {copy.price.trust.join("  ·  ")}
          </p>
        </section>

        <div className="v6-rule"><Divider /></div>

        {/* ── 05 · HONEST PROOF ─────────────────────────────────────── */}
        <section className="v6-sec-narrow" data-rise>
          <Heading title={copy.proof.title} keyWord={copy.proof.key} />
          <p className="v6-lead v6-center">{copy.proof.lead}</p>
          <div className="v6-proof-illus"><ProofSeal /></div>
          <div className="v6-proofstats">
            {copy.proof.stats.map((s) => (
              <div key={s.unit} className="v6-proofstat">
                <span className="v6-proofstat-v">{s.value}</span>
                <span className="v6-proofstat-u">{s.unit}</span>
              </div>
            ))}
          </div>
          <div className="v6-fresh"><Tick /><span>{copy.proof.freshness}</span></div>
          <p className="v6-proofbody">{copy.proof.body}</p>
        </section>

        <div className="v6-rule"><Divider /></div>

        {/* ── 06 · FAQ ──────────────────────────────────────────────── */}
        <section id="faq" className="v6-sec-narrow" data-rise>
          <Heading title={copy.faq.title} keyWord={copy.faq.key} />
          <div className="v6-faq">
            {copy.faq.items.map((it) => (
              <details key={it.q} className="v6-faq-item">
                <summary>
                  <span>{it.q}</span>
                  <span className="v6-faq-mark" aria-hidden="true" />
                </summary>
                <span className={`v6-faq-aside ${caveat.className}`}>{it.aside}</span>
                <p>{it.a}</p>
              </details>
            ))}
          </div>
        </section>

        <div className="v6-rule"><Divider /></div>

        {/* ── 07 · FINAL CTA + mobile launcher ──────────────────────── */}
        <section className="v6-final" data-rise>
          <h2 className="v6-h2 v6-final-h">
            {copy.final.title.replace(copy.final.key, "")}
            <span className="v6-key">
              {copy.final.key}
              <Underline className="v6-key-under" />
            </span>
          </h2>
          <p className="v6-lead v6-center">{copy.final.lead}</p>
          <div className="v6-cta-row v6-center-row">
            <Link href="/register" className="v6-cta-primary">{copy.final.ctaPrimary}</Link>
            <button type="button" onClick={scrollToTry} className="v6-cta-ghost">{copy.final.ctaSecondary}</button>
          </div>

          <p className="v6-launch-t">{copy.final.launchTitle}</p>
          <div className="v6-launch">
            {copy.final.modes.map((m) => (
              <Link key={m.label} href={m.href} className="v6-launch-row">
                <span>{m.label}</span>
                <svg viewBox="0 0 24 16" width="26" height="17" fill="none" aria-hidden="true">
                  <path data-draw d="M2 8H20M20 8L14 3M20 8L14 13" stroke="#C2502F" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            ))}
          </div>
        </section>
      </main>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="v6-footer">
        <div className="v6-footer-top">
          <div className="v6-wordmark v6-wordmark-foot">
            <span>{copy.brand}</span>
          </div>
          <span className={`v6-foot-tag ${caveat.className}`}>{copy.footer.tagline}</span>
          <nav className="v6-foot-links">
            {copy.footer.links.map((l) => (
              <Link key={l.label} href={l.href}>{l.label}</Link>
            ))}
          </nav>
        </div>
        <p className="v6-disclaimer">{copy.footer.disclaimer}</p>
        <p className="v6-copyright">© {new Date().getFullYear()} {copy.footer.copyright}</p>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Scoped styles (component <style>; globals.css untouched)
   ═══════════════════════════════════════════════════════════════════════ */
const CSS = `
.v6-root{
  --bg:#FFFFFF; --surface:#FAF0EB; --ink:#2A211D; --clay:#C2502F; --pine:#3E7D64;
  --clay-soft:#E4B7A6; --clay-line:#EAD3C8;
  background:var(--bg); color:var(--ink);
  font-family:var(--v6-rubik),system-ui,sans-serif;
  width:100%; overflow-x:hidden;
  -webkit-font-smoothing:antialiased;
}
.v6-root *{box-sizing:border-box;}
.v6-caveat,.${caveat.variable}{}

/* top bar */
.v6-bar{max-width:1120px;margin:0 auto;padding:18px 24px;display:flex;align-items:center;gap:20px;}
.v6-wordmark{display:inline-flex;align-items:center;gap:9px;font-weight:800;font-size:1.05rem;letter-spacing:-.01em;color:var(--ink);text-decoration:none;}
.v6-nav{display:flex;gap:26px;margin-left:auto;}
.v6-nav a{color:var(--ink);opacity:.72;text-decoration:none;font-weight:500;font-size:.95rem;transition:opacity .2s;}
.v6-nav a:hover{opacity:1;}
.v6-bar-login{color:var(--clay);font-weight:600;text-decoration:none;font-size:.95rem;}
@media(max-width:760px){.v6-nav{display:none;}.v6-bar-login{margin-left:auto;}}

/* shared CTAs */
.v6-cta-primary{display:inline-flex;align-items:center;justify-content:center;background:var(--clay);color:#fff;font-weight:600;font-size:1.02rem;padding:15px 30px;border-radius:999px;text-decoration:none;box-shadow:0 1px 0 rgba(42,33,29,.04);transition:transform .18s cubic-bezier(.2,.8,.2,1),background .2s;}
.v6-cta-primary:hover{background:#a9421f;transform:translateY(-1px);}
.v6-cta-ghost{display:inline-flex;align-items:center;justify-content:center;background:transparent;color:var(--clay);font-family:inherit;font-weight:600;font-size:1.02rem;padding:14px 28px;border-radius:999px;text-decoration:none;border:1.5px solid var(--clay-soft);cursor:pointer;transition:border-color .2s,background .2s;}
.v6-cta-ghost:hover{border-color:var(--clay);background:var(--surface);}

/* hero */
.v6-hero{max-width:1120px;margin:0 auto;padding:40px 24px 24px;display:grid;grid-template-columns:1fr 1fr;grid-template-areas:"top art" "bel art";column-gap:56px;row-gap:24px;align-items:start;}
.v6-hero-copy{grid-area:top;}
.v6-hero-art{grid-area:art;align-self:center;}
.v6-hero-belowfold{grid-area:bel;}
@media(max-width:900px){.v6-hero{grid-template-columns:1fr;grid-template-areas:"top" "art" "bel";gap:24px;padding-top:24px;}
  /* mobile: the real question card must sit in the first viewport — card before the (now smaller) coach scene */
  .v6-hero-art{display:flex;flex-direction:column;}
  .v6-hero-art .v6-card{order:1;}
  .v6-hero-art .v6-scene{order:2;max-width:220px;margin:16px auto 0;}
}
.v6-h1{font-weight:800;font-size:clamp(2.5rem,6vw,4.4rem);line-height:1.02;letter-spacing:-.03em;text-wrap:balance;margin:0;}
.v6-key{position:relative;white-space:nowrap;display:inline-block;color:var(--clay);}
.v6-h1-under{position:absolute;left:-2%;bottom:-.12em;width:104%;height:.34em;}
.v6-key-under{position:absolute;left:-2%;bottom:-.16em;width:104%;height:.5em;}
.v6-hero-margin{display:inline-block;margin-top:14px;font-size:1.5rem;color:var(--clay);transform:rotate(-2deg);}
.v6-sub{margin:16px 0 0;font-size:clamp(1.05rem,1.6vw,1.2rem);line-height:1.5;color:#4a3d36;max-width:34ch;}
.v6-cta-row{display:flex;gap:14px;margin-top:26px;flex-wrap:wrap;}
@media(max-width:520px){.v6-cta-row{flex-direction:column;}.v6-cta-row>a{width:100%;}}
.v6-chips{display:flex;gap:10px;margin-top:26px;flex-wrap:wrap;}
.v6-chip{display:flex;flex-direction:column;gap:1px;background:#fff;border:1.5px solid var(--clay-line);border-radius:14px;padding:8px 14px;}
.v6-chip-v{font-weight:700;font-size:1rem;letter-spacing:-.02em;}
.v6-chip-u{font-size:.72rem;color:#6a5b53;}
.v6-hook{margin:26px 0 0;font-size:1.06rem;font-weight:500;color:var(--ink);}
.v6-hook-num{position:relative;display:inline-block;font-weight:800;color:var(--clay);padding:0 .18em;}
.v6-hook-circle{position:absolute;left:-.36em;top:-.34em;width:1.72em;height:1.72em;}
.v6-hooksub{margin:6px 0 0;font-size:.8rem;color:#6a5b53;}

.v6-hero-art{position:relative;}
.v6-scene{width:100%;height:auto;display:block;max-width:440px;margin:0 auto -8px;}
@media(max-width:900px){.v6-scene{max-width:360px;}}

/* question card */
.v6-card{background:var(--surface);border:1.5px solid var(--clay-soft);border-radius:20px;padding:18px 18px 16px;max-width:440px;margin:0 auto;scroll-margin-top:84px;}
.v6-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;}
.v6-card-tag{font-size:.72rem;font-weight:600;color:var(--clay);background:#fff;border:1px solid var(--clay-line);border-radius:999px;padding:5px 11px;}
.v6-meter{width:96px;height:auto;}
.v6-meter-val{transition:stroke-dashoffset .7s cubic-bezier(.2,.8,.2,1);}
.v6-meter-needle{transition:x2 .7s cubic-bezier(.2,.8,.2,1),y2 .7s cubic-bezier(.2,.8,.2,1);}
.v6-card-q{font-weight:600;font-size:1.02rem;line-height:1.35;margin:0 0 14px;}
.v6-opts{display:flex;flex-direction:column;gap:8px;}
.v6-opt{display:flex;align-items:center;gap:10px;text-align:left;background:#fff;border:1.5px solid var(--clay-line);border-radius:12px;padding:11px 13px;font:inherit;font-size:.95rem;color:var(--ink);cursor:pointer;transition:border-color .18s,background .18s;}
.v6-opt:hover:not([aria-disabled="true"]){border-color:var(--clay);}
.v6-opt[aria-disabled="true"]{cursor:default;}
.v6-opt-mark{width:20px;height:20px;flex-shrink:0;display:inline-flex;}
.v6-opt-right{border-color:var(--pine);background:#eef5f1;}
.v6-opt-wrong{border-color:var(--clay-soft);background:#fbeee9;}
.v6-opt-dim{opacity:.5;}
.v6-tick{width:20px;height:20px;}
.v6-card-hint{margin:0 2px;font-size:.85rem;color:#6a5b53;}
.v6-card-foot{margin-top:13px;}
.v6-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;}
.v6-explain{margin:0;font-size:.9rem;line-height:1.45;color:#4a3d36;}
.v6-note{display:inline-block;font-size:1.35rem;line-height:1.1;}
.v6-note-ok{color:var(--pine);}
.v6-note-clay{color:var(--clay);}
.v6-card-foot .v6-note{margin-top:10px;transform:rotate(-1.5deg);}

/* generic section */
.v6-rule{max-width:1120px;margin:0 auto;padding:0 24px;}
.v6-divider{width:100%;height:12px;display:block;}
.v6-sec{max-width:1120px;margin:0 auto;padding:64px 24px;display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center;}
.v6-sec-rev .v6-sec-copy{order:2;} .v6-sec-rev .v6-sec-art{order:1;}
@media(max-width:900px){.v6-sec{grid-template-columns:1fr;gap:32px;padding:48px 24px;}.v6-sec-rev .v6-sec-copy{order:1;}.v6-sec-rev .v6-sec-art{order:2;}}
.v6-sec-panel{background:var(--surface);border-radius:24px;max-width:1072px;}
@media(max-width:900px){.v6-sec-panel{border-radius:20px;}}

.v6-h2{font-weight:800;font-size:clamp(1.9rem,3.6vw,2.9rem);line-height:1.05;letter-spacing:-.025em;margin:0;text-wrap:balance;}
.v6-lead{font-size:clamp(1.02rem,1.5vw,1.15rem);line-height:1.55;color:#4a3d36;margin:16px 0 0;max-width:56ch;}
.v6-center{text-align:center;margin-left:auto;margin-right:auto;}
.v6-moat-t{font-weight:700;font-size:1.12rem;margin:26px 0 0;letter-spacing:-.01em;}
.v6-moat-b{font-size:.98rem;line-height:1.55;color:#4a3d36;margin:8px 0 0;max-width:52ch;}
.v6-list{list-style:none;padding:0;margin:22px 0 0;display:flex;flex-direction:column;gap:12px;}
.v6-list li{display:flex;align-items:flex-start;gap:11px;font-size:1rem;line-height:1.4;}
.v6-list li .v6-tick{margin-top:1px;flex-shrink:0;}

/* dial */
.v6-dialwrap{background:#fff;border:1.5px solid var(--clay-soft);border-radius:22px;padding:30px 26px 26px;max-width:400px;margin:0 auto;text-align:center;position:relative;}
.v6-dial{width:100%;max-width:300px;height:auto;margin:0 auto;display:block;}
.v6-dial-read{margin-top:-6px;display:flex;align-items:baseline;justify-content:center;gap:2px;}
.v6-dial-num{font-weight:800;font-size:3rem;letter-spacing:-.04em;line-height:1;}
.v6-dial-pct{font-weight:700;font-size:1.3rem;color:var(--clay);}
.v6-dial-scale{display:flex;justify-content:space-between;font-size:.78rem;color:#6a5b53;margin-top:6px;padding:0 6px;}
.v6-dial-caption{margin:14px 0 0;font-weight:600;font-size:.95rem;color:var(--ink);}
.v6-decaynote{position:absolute;right:14px;top:16px;font-size:1.25rem;transform:rotate(-4deg);max-width:120px;text-align:right;line-height:1.05;}

/* plan */
.v6-plan{background:#fff;border:1.5px solid var(--clay-soft);border-radius:22px;padding:26px 24px;max-width:440px;margin:0 auto;}
.v6-plan-label{display:block;font-weight:600;font-size:.9rem;margin-bottom:8px;}
.v6-date{width:100%;font:inherit;font-size:1.05rem;padding:13px 15px;border:1.5px solid var(--clay-line);border-radius:13px;background:var(--surface);color:var(--ink);}
.v6-date:focus{outline:none;border-color:var(--clay);}
.v6-plan-out{min-height:96px;margin:18px 0 4px;display:flex;flex-direction:column;justify-content:center;}
.v6-plan-fallback{margin:0;font-size:.98rem;line-height:1.5;color:#4a3d36;}
.v6-plan-nums{display:flex;align-items:center;justify-content:center;gap:20px;}
.v6-plan-nums>div{display:flex;flex-direction:column;align-items:center;}
.v6-plan-big{font-weight:800;font-size:2.6rem;line-height:1;letter-spacing:-.03em;color:var(--clay);}
.v6-plan-unit{font-size:.78rem;color:#6a5b53;margin-top:3px;text-align:center;}
.v6-plan-x{font-size:1.6rem;color:var(--clay-soft);font-weight:700;}
.v6-plan-note{display:block;text-align:center;font-size:1.3rem;margin-top:12px;transform:rotate(-1.5deg);}
.v6-plan-topicslbl{font-size:.86rem;font-weight:600;color:#6a5b53;margin:20px 0 10px;}
.v6-topics{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:9px;}
.v6-topics li{display:flex;align-items:center;gap:10px;font-size:.96rem;}
.v6-topics .v6-tick{width:18px;height:18px;flex-shrink:0;}
.v6-plan-cta{width:100%;margin-top:20px;}

/* narrow sections */
.v6-sec-narrow{max-width:820px;margin:0 auto;padding:64px 24px;}
@media(max-width:900px){.v6-sec-narrow{padding:48px 24px;}}
.v6-sec-narrow .v6-h2{text-align:center;}

/* self-drawing beat illustrations (one per section) */
.v6-illus{display:block;height:auto;}
.v6-sim-illus{display:flex;justify-content:center;margin:26px 0 0;}
.v6-sim-illus .v6-illus{width:118px;}
.v6-proof-illus{display:flex;justify-content:center;margin:28px 0 0;}
.v6-proof-illus .v6-illus{width:82px;}

/* simulator */
.v6-format{display:flex;justify-content:center;gap:22px;margin:30px 0 0;flex-wrap:wrap;}
.v6-format-cell{background:var(--surface);border-radius:18px;padding:24px 34px;text-align:center;min-width:150px;}
.v6-format-n{display:block;font-weight:800;font-size:3.2rem;line-height:1;letter-spacing:-.04em;color:var(--clay);}
.v6-format-under{display:block;width:48px;height:8px;margin:6px auto 0;}
.v6-format-l{display:block;font-size:.9rem;color:#4a3d36;margin-top:8px;}
.v6-sim-rule{text-align:center;font-size:.95rem;color:#4a3d36;margin:26px auto 0;max-width:52ch;line-height:1.5;}
.v6-sim-note{display:block;text-align:center;font-size:1.4rem;margin:12px auto 26px;transform:rotate(-1.5deg);}

/* pricing */
.v6-price-grid{display:grid;grid-template-columns:1.1fr 1fr;gap:24px;margin:34px 0 0;align-items:start;}
@media(max-width:760px){.v6-price-grid{grid-template-columns:1fr;}}
.v6-price-panel{background:var(--clay);color:#fff;border-radius:22px;padding:30px 28px;}
.v6-price-amt{display:inline-flex;align-items:baseline;gap:6px;position:relative;}
.v6-price-circle{position:absolute;left:-18px;top:-16px;width:calc(100% + 52px);height:calc(100% + 34px);pointer-events:none;overflow:visible;}
.v6-price-num{font-weight:800;font-size:4rem;line-height:1;letter-spacing:-.04em;}
.v6-price-cur{font-weight:700;font-size:1.8rem;}
.v6-price-once{margin:8px 0 0;font-weight:600;font-size:1.05rem;}
.v6-price-sub{margin:6px 0 0;font-size:.9rem;line-height:1.45;}
.v6-price-paidt{margin:24px 0 0;font-weight:700;font-size:.95rem;opacity:.95;}
.v6-list-onclay li{color:#fff;}
.v6-list-onclay li .v6-tick path{stroke:#fff;}
.v6-price-cta{width:100%;margin-top:24px;background:#fff;color:var(--clay);}
.v6-price-cta:hover{background:#fbeee9;}
.v6-price-free{padding:8px 4px;}
.v6-price-freet{font-weight:700;font-size:.95rem;color:#6a5b53;margin:0;}
.v6-anchor{margin:22px 0 0;font-weight:600;font-size:1rem;line-height:1.45;color:var(--ink);}
.v6-safety{margin:12px 0 0;font-size:.92rem;line-height:1.5;color:#4a3d36;background:var(--surface);border-radius:14px;padding:14px 16px;}
.v6-trust{text-align:center;font-size:1.5rem;color:var(--clay);margin:30px 0 0;transform:rotate(-1deg);}

/* proof */
.v6-proofstats{display:flex;justify-content:center;gap:18px;margin:34px 0 0;flex-wrap:wrap;}
.v6-proofstat{display:flex;flex-direction:column;align-items:center;background:var(--surface);border-radius:18px;padding:24px 30px;min-width:130px;}
.v6-proofstat-v{font-weight:800;font-size:2.6rem;line-height:1;letter-spacing:-.03em;}
.v6-proofstat-u{font-size:.82rem;color:#6a5b53;margin-top:6px;}
.v6-fresh{display:inline-flex;align-items:center;gap:8px;margin:24px auto 0;padding:9px 16px;border:1.5px solid var(--clay-line);border-radius:999px;font-size:.86rem;font-weight:600;color:var(--pine);}
.v6-fresh{display:flex;width:fit-content;}
.v6-fresh .v6-tick{width:18px;height:18px;}
.v6-proofbody{text-align:center;font-size:.96rem;line-height:1.6;color:#4a3d36;margin:22px auto 0;max-width:60ch;}

/* faq */
.v6-faq{margin:32px 0 0;border-top:none;}
.v6-faq-item{border-bottom:1.5px solid var(--clay-line);}
.v6-faq-item summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 4px;font-weight:600;font-size:1.1rem;}
.v6-faq-item summary::-webkit-details-marker{display:none;}
.v6-faq-mark{position:relative;width:18px;height:18px;flex-shrink:0;}
.v6-faq-mark::before,.v6-faq-mark::after{content:"";position:absolute;background:var(--clay);border-radius:2px;}
.v6-faq-mark::before{left:0;top:8px;width:18px;height:2.5px;}
.v6-faq-mark::after{left:8px;top:0;width:2.5px;height:18px;transition:transform .25s ease;}
.v6-faq-item[open] .v6-faq-mark::after{transform:rotate(90deg);opacity:0;}
.v6-faq-aside{display:block;margin:2px 4px 3px;font-size:1.25rem;line-height:1;color:var(--clay);transform:rotate(-1.5deg);}
.v6-faq-item p{margin:0 4px 22px;font-size:1rem;line-height:1.6;color:#4a3d36;max-width:62ch;}

/* final */
.v6-final{max-width:820px;margin:0 auto;padding:72px 24px;text-align:center;}
.v6-final-h{font-size:clamp(2.2rem,5vw,3.4rem);}
.v6-center-row{justify-content:center;margin-top:28px;}
@media(max-width:520px){.v6-center-row{align-items:stretch;}}
.v6-launch-t{font-weight:600;font-size:.9rem;color:#6a5b53;margin:44px 0 14px;}
.v6-launch{display:flex;flex-direction:column;gap:12px;max-width:480px;margin:0 auto;}
.v6-launch-row{display:flex;align-items:center;justify-content:space-between;gap:16px;background:var(--surface);border:1.5px solid var(--clay-soft);border-radius:16px;padding:18px 22px;text-decoration:none;color:var(--ink);font-weight:600;font-size:1.05rem;transition:transform .18s cubic-bezier(.2,.8,.2,1),border-color .2s;}
.v6-launch-row:hover{transform:translateY(-1px);border-color:var(--clay);}

/* footer */
.v6-footer{max-width:1120px;margin:0 auto;padding:40px 24px 56px;border-top:1.5px solid var(--clay-line);margin-top:20px;}
.v6-footer-top{display:flex;align-items:center;gap:18px;flex-wrap:wrap;}
.v6-wordmark-foot{font-weight:800;font-size:1.05rem;}
.v6-foot-tag{font-size:1.25rem;color:var(--clay);transform:rotate(-1.5deg);}
.v6-foot-links{margin-left:auto;display:flex;gap:20px;}
.v6-foot-links a{color:var(--ink);opacity:.7;text-decoration:none;font-size:.92rem;}
.v6-foot-links a:hover{opacity:1;}
.v6-disclaimer{margin:22px 0 0;font-size:.8rem;line-height:1.6;color:#6a5b53;max-width:78ch;}
.v6-copyright{margin:14px 0 0;font-size:.8rem;color:#6a5b53;}

@media(prefers-reduced-motion:reduce){
  .v6-meter-val,.v6-meter-needle{transition:none;}
  .v6-cta-primary,.v6-cta-ghost,.v6-launch-row{transition:none;}
}
`;
