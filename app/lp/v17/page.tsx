"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Rubik, Caveat } from "next/font/google";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { copy, HERO_VARIANTS, ACTIVE_HERO } from "./copy";

/* ── Fonts (declared locally, cyrillic verified) ─────────────────────────── */
const rubik = Rubik({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "700", "800"],
  variable: "--v17-rubik",
  display: "swap",
});
const caveat = Caveat({
  subsets: ["latin", "cyrillic"],
  weight: ["600", "700"],
  variable: "--v17-caveat",
  display: "swap",
});

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const H = HERO_VARIANTS[ACTIVE_HERO];

/* ── Arc geometry (rounded so SSR / client serialize identically) ─────────── */
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

/* ═══════════════════════════════════════════════════════════════════════════
   Hand-drawn primitives (inherited from v6 «Тренер поруч»)
   ═══════════════════════════════════════════════════════════════════════════ */

/** Clay underline the coach sketches under a keyword. Self-draws. */
function Underline({ className = "" }: { className?: string }) {
  return (
    <svg className={`v17-under ${className}`} viewBox="0 0 220 18" fill="none" aria-hidden="true" preserveAspectRatio="none">
      <path data-draw d="M4 11C40 6 78 5 112 7C146 9 182 8 216 4" stroke="#C2502F" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
}

/** Irregular hand-drawn horizontal divider between two turns of the conversation. */
function Divider() {
  return (
    <svg className="v17-divider" viewBox="0 0 1200 12" fill="none" aria-hidden="true" preserveAspectRatio="none">
      <path data-draw d="M2 7C160 3 320 9 480 6C640 3 800 8 960 6C1060 5 1140 7 1198 5" stroke="#C2502F" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

/** Hand-drawn tick (sage — «correct / free»). */
function Tick() {
  return (
    <svg viewBox="0 0 24 24" className="v17-tick" fill="none" aria-hidden="true">
      <path d="M4 13.5C6.5 15 8.8 17.5 10 20C12.5 13 15.5 7.5 21 3.5" stroke="#3E7D64" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Small hand-drawn dot the coach uses to mark a paid line (clay, hollow). */
function Dot() {
  return (
    <svg viewBox="0 0 24 24" className="v17-dot" fill="none" aria-hidden="true">
      <path d="M12 4.5C16 4.5 19.5 8 19.5 12C19.5 16 16 19.5 12 19.5C8 19.5 4.5 16 4.5 12C4.5 8 8 4.5 12 4.5Z" stroke="#C2502F" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** The coach's short curved reply-arrow — points from a question to its answer. */
function ReplyArrow() {
  return (
    <svg className="v17-replyarrow" viewBox="0 0 60 40" fill="none" aria-hidden="true">
      <path data-draw d="M6 6C10 22 22 30 40 30C46 30 51 28 54 24" stroke="#C2502F" strokeWidth="2.6" strokeLinecap="round" />
      <path data-draw d="M54 24L46 25M54 24L50 32" stroke="#C2502F" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Simulator beat — exam answer sheet with two marked boxes (self-draws). */
function AnswerSheet() {
  return (
    <svg viewBox="0 0 132 110" className="v17-illus" fill="none" role="img" aria-label="Аркуш відповідей із позначеними варіантами">
      <path data-draw d="M22 12 L100 9 L105 98 L27 101 Z" stroke="#2A211D" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      <path data-draw d="M34 30 H48 V44 H34 Z" stroke="#2A211D" strokeWidth="2.2" strokeLinejoin="round" />
      <path data-draw d="M36 37 L42 43 L52 27" stroke="#3E7D64" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path data-draw d="M58 37 H92" stroke="#2A211D" strokeWidth="2.2" strokeLinecap="round" opacity="0.38" />
      <path data-draw d="M34 57 H48 V71 H34 Z" stroke="#2A211D" strokeWidth="2.2" strokeLinejoin="round" />
      <path data-draw d="M37 60 L45 68 M45 60 L37 68" stroke="#C2502F" strokeWidth="3" strokeLinecap="round" />
      <path data-draw d="M58 64 H88" stroke="#2A211D" strokeWidth="2.2" strokeLinecap="round" opacity="0.38" />
      <path data-draw d="M34 84 H48 V98 H34 Z" stroke="#2A211D" strokeWidth="2.2" strokeLinejoin="round" opacity="0.55" />
      <path data-draw d="M58 91 H90" stroke="#2A211D" strokeWidth="2.2" strokeLinecap="round" opacity="0.38" />
    </svg>
  );
}

/** Enemy beat — five learners, one passes (sage), four don't (faint clay). */
function TallyFive() {
  const figs = [0, 1, 2, 3, 4];
  return (
    <svg viewBox="0 0 320 132" className="v17-tally" fill="none" role="img" aria-label="Один із п'яти складає з першої спроби, четверо — ні">
      {figs.map((i) => {
        const x = 20 + i * 62;
        const passed = i === 0;
        const stroke = passed ? "#3E7D64" : "#C2502F";
        const op = passed ? 1 : 0.42;
        return (
          <g key={i} opacity={op}>
            {/* head */}
            <path data-draw d={`M${x} 40 C${x} 30 ${x + 8} 22 ${x + 18} 22 C${x + 28} 22 ${x + 36} 30 ${x + 36} 40 C${x + 36} 50 ${x + 28} 58 ${x + 18} 58 C${x + 8} 58 ${x} 50 ${x} 40 Z`} stroke={stroke} strokeWidth="3.2" strokeLinecap="round" />
            {/* shoulders */}
            <path data-draw d={`M${x - 6} 104 C${x - 6} 74 ${x + 4} 60 ${x + 18} 60 C${x + 32} 60 ${x + 42} 74 ${x + 42} 104`} stroke={stroke} strokeWidth="3.2" strokeLinecap="round" />
            {passed ? (
              <path data-draw d={`M${x + 8} 92 L${x + 15} 100 L${x + 30} 80`} stroke="#3E7D64" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path data-draw d={`M${x + 8} 82 L${x + 28} 96`} stroke="#C2502F" strokeWidth="2.6" strokeLinecap="round" opacity="0.7" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Pricing beat — the coach circles the 399 by hand (white stroke on the clay block). */
function PriceCircle() {
  return (
    <svg className="v17-price-circle" viewBox="0 0 220 120" fill="none" aria-hidden="true" preserveAspectRatio="none">
      <path data-draw d="M42 20 C112 6 190 12 208 42 C219 64 196 98 128 108 C58 118 10 100 7 66 C5 40 20 26 48 17" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}

/** Small hand-drawn clay underline used under the format cells. */
function MiniUnderline() {
  return (
    <svg className="v17-format-under" viewBox="0 0 60 10" fill="none" aria-hidden="true" preserveAspectRatio="none">
      <path data-draw d="M4 6 C18 3 34 3 56 5" stroke="#C2502F" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

/** The coach + readiness arc + resting pencil — self-drawing line art (from v6). */
function CoachScene() {
  return (
    <svg viewBox="0 0 440 320" className="v17-scene" fill="none" role="img" aria-label="Тренер поруч біля стрілки готовності">
      <path data-draw d={arcPath(300, 236, 104)} stroke="#E4B7A6" strokeWidth="5" strokeLinecap="round" />
      <path data-draw d="M196 236 A104 104 0 0 1 268 137" stroke="#3E7D64" strokeWidth="5.5" strokeLinecap="round" />
      {[0.16, 0.34, 0.52, 0.7, 0.86].map((f, i) => {
        const a = polar(300, 236, 104, f);
        const b = polar(300, 236, 92, f);
        return <path key={i} data-draw d={`M${a.x} ${a.y} L${b.x} ${b.y}`} stroke="#2A211D" strokeWidth="2" strokeLinecap="round" opacity="0.35" />;
      })}
      <path data-draw d="M300 236 L339 168" stroke="#C2502F" strokeWidth="4" strokeLinecap="round" />
      <circle cx="300" cy="236" r="7" fill="#C2502F" />
      <g data-draw-group>
        <path data-draw d="M238 128 L312 105" stroke="#2A211D" strokeWidth="8" strokeLinecap="butt" />
        <path data-draw d="M240 122 L314 99" stroke="#2A211D" strokeWidth="1.6" strokeLinecap="round" opacity="0.35" />
        <path data-draw d="M238 133 L220 134 L240 119 Z" stroke="#2A211D" strokeWidth="2.2" strokeLinejoin="round" fill="#EAD9CB" />
        <path data-draw d="M220 134 L229 128" stroke="#C2502F" strokeWidth="3.6" strokeLinecap="round" />
        <path data-draw d="M309 106 L316 104" stroke="#2A211D" strokeWidth="8" strokeLinecap="butt" opacity="0.45" />
        <path data-draw d="M316 104 L322 102" stroke="#C2502F" strokeWidth="7" strokeLinecap="round" opacity="0.75" />
      </g>
      <g>
        <path data-draw d="M96 92 C96 74 108 62 124 62 C140 62 152 74 152 92 C152 110 140 122 124 122 C108 122 96 110 96 92 Z" stroke="#C2502F" strokeWidth="4.5" strokeLinecap="round" />
        <path data-draw d="M113 119 C111 131 113 142 121 151" stroke="#C2502F" strokeWidth="4.5" strokeLinecap="round" />
        <path data-draw d="M135 119 C137 131 135 142 127 151" stroke="#C2502F" strokeWidth="4.5" strokeLinecap="round" />
        <path data-draw d="M78 236 C78 182 92 150 124 150 C156 150 170 182 170 236" stroke="#C2502F" strokeWidth="4.5" strokeLinecap="round" />
        <path data-draw d="M158 176 C186 168 210 150 236 122" stroke="#C2502F" strokeWidth="4.5" strokeLinecap="round" />
        <path data-draw d="M112 100 C118 106 130 106 136 100" stroke="#2A211D" strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />
      </g>
    </svg>
  );
}

/* ── Small semicircle readiness meter (hero card) ─────────────────────────── */
function Meter({ value }: { value: number }) {
  const v = clamp01(value / 100);
  const tip = polar(90, 78, 62, v);
  return (
    <svg viewBox="0 0 180 96" className="v17-meter" fill="none" aria-hidden="true">
      <path d={arcPath(90, 78, 62)} stroke="#EAD3C8" strokeWidth="9" strokeLinecap="round" />
      <path className="v17-meter-val" d={arcPath(90, 78, 62)} stroke="#3E7D64" strokeWidth="9" strokeLinecap="round" pathLength={1000} style={{ strokeDasharray: 1000, strokeDashoffset: rnd(1000 * (1 - v)) }} />
      <line className="v17-meter-needle" x1="90" y1="78" x2={tip.x} y2={tip.y} stroke="#C2502F" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="90" cy="78" r="5" fill="#C2502F" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Hero interactive official question card — the dialogue starts by DOING
   ═══════════════════════════════════════════════════════════════════════════ */
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
    gsap.fromTo(noteRef.current, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.5, ease: "power2.out" });
  }, [answered]);

  return (
    <div id="v17-try" className="v17-card">
      <div className="v17-card-head">
        <span className="v17-card-tag">{c.tag}</span>
        <Meter value={value} />
      </div>
      <p className="v17-card-q">{c.prompt}</p>
      <div className="v17-opts">
        {c.options.map((opt, i) => {
          const state = !answered ? "idle" : i === c.correctIndex ? "right" : i === picked ? "wrong" : "dim";
          return (
            <button key={i} type="button" className={`v17-opt v17-opt-${state}`} onClick={() => !answered && setPicked(i)} aria-disabled={answered}>
              <span className="v17-opt-mark" aria-hidden="true">{state === "right" ? <Tick /> : null}</span>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>
      <div className="v17-card-foot" aria-live="polite">
        {answered ? (
          <>
            <span className="v17-sr">{correct ? "Правильно. Готовність підросла на один крок." : "Неправильно. Це тренування — стрілка готовності не змінюється."}</span>
            <p className="v17-explain">{c.explanation}</p>
            <span ref={noteRef} className={`v17-note ${caveat.className} ${correct ? "v17-note-ok" : "v17-note-clay"}`}>{correct ? c.noteRight : c.noteWrong}</span>
          </>
        ) : (
          <p className="v17-card-hint">{c.hint}</p>
        )}
      </div>
    </div>
  );
}

/* ── Q3 · decaying dial demo (from v6) ────────────────────────────────────── */
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
    if (valPathRef.current) valPathRef.current.style.strokeDashoffset = String(rnd(1000 * (1 - f)));
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
    if (reduce) { set(END); return; }
    const proxy = { v: START };
    const st = ScrollTrigger.create({
      trigger: wrapRef.current,
      start: "top 72%",
      once: true,
      onEnter: () => { gsap.to(proxy, { v: END, duration: 1.6, ease: "power2.inOut", onUpdate: () => set(proxy.v) }); },
    });
    return () => st.kill();
  }, [set]);

  const tip = polar(140, 128, 104, START / 100);
  return (
    <div ref={wrapRef} className="v17-dialwrap">
      <svg viewBox="0 0 280 156" className="v17-dial" fill="none" aria-label={d.caption}>
        <path d={arcPath(140, 128, 104)} stroke="#EAD3C8" strokeWidth="12" strokeLinecap="round" />
        <path ref={valPathRef} d={arcPath(140, 128, 104)} stroke="#3E7D64" strokeWidth="12" strokeLinecap="round" pathLength={1000} style={{ strokeDasharray: 1000 }} />
        <line ref={needleRef} x1="140" y1="128" x2={tip.x} y2={tip.y} stroke="#C2502F" strokeWidth="5" strokeLinecap="round" />
        <circle cx="140" cy="128" r="8" fill="#C2502F" />
      </svg>
      <div className="v17-dial-read">
        <span ref={numRef} className="v17-dial-num">{START}</span>
        <span className="v17-dial-pct">%</span>
      </div>
      <div className="v17-dial-scale"><span>{d.low}</span><span>{d.high}</span></div>
      <p className="v17-dial-caption">{d.caption}</p>
      <span className={`v17-note v17-note-clay ${caveat.className} v17-decaynote`}>{d.decayNote}</span>
    </div>
  );
}

/* ── Q4 · exam-date → plan preview (from v6) ──────────────────────────────── */
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
    <div className="v17-plan">
      <label className="v17-plan-label" htmlFor="v17-date">{p.dateLabel}</label>
      <input id="v17-date" type="date" value={date} onChange={(e) => onChange(e.target.value)} className="v17-date" />
      <div className="v17-plan-out" aria-live="polite">
        {result === null && <p className="v17-plan-fallback">{p.fallback}</p>}
        {result?.kind === "past" && <p className="v17-plan-fallback">{p.past}</p>}
        {result?.kind === "today" && <p className="v17-plan-fallback">{p.today}</p>}
        {result?.kind === "days" && (
          <>
            <div className="v17-plan-nums">
              <div><span className="v17-plan-big">{result.days}</span><span className="v17-plan-unit">{p.daysLeft}</span></div>
              <span className="v17-plan-x" aria-hidden="true">×</span>
              <div><span className="v17-plan-big">{result.perDay}</span><span className="v17-plan-unit">{p.perDay}</span></div>
            </div>
            {result.intensive && <span className={`v17-note v17-note-clay ${caveat.className} v17-plan-note`}>{p.intensive}</span>}
          </>
        )}
      </div>
      <p className="v17-plan-topicslbl">{p.topicsLabel}</p>
      <ul className="v17-topics">{p.topics.map((t) => <li key={t}><Tick /><span>{t}</span></li>)}</ul>
      <Link href="/register" className="v17-cta-primary v17-plan-cta">{p.cta}</Link>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Dialogue grammar — the question header + the coach's reply cue
   Each section IS a visitor's question, in guillemets, with a clay underline.
   `seo` appends a screen-reader keyword phrase inside the real heading element.
   ═══════════════════════════════════════════════════════════════════════════ */
function QAHead({
  q, keyWord, reply, as = "h2",
}: { q: string; keyWord: string; reply: string; as?: "h1" | "h2" }) {
  const idx = q.indexOf(keyWord);
  const Tag = as;
  const inner =
    idx === -1 ? (
      <>«{q}»</>
    ) : (
      <>
        «{q.slice(0, idx)}
        <span className="v17-key">{keyWord}<Underline className="v17-key-under" /></span>
        {q.slice(idx + keyWord.length)}»
      </>
    );
  return (
    <div className="v17-qa-head">
      <Tag className="v17-q">
        {inner}
      </Tag>
      <span className="v17-reply" data-note-wipe>
        <ReplyArrow />
        <span className={`v17-reply-t ${caveat.className}`}>{reply}</span>
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════════════════════════════════ */
export default function V17() {
  const root = useRef<HTMLDivElement>(null);

  // «Спробувати без реєстрації» honours its promise: no /login wall — it brings
  // the real official question card into view and focuses its first option.
  const scrollToTry = useCallback(() => {
    const el = document.getElementById("v17-try");
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
      gsap.utils.toArray<SVGPathElement>("[data-draw]").forEach((path) => {
        const len = path.getTotalLength();
        gsap.set(path, { strokeDasharray: len });
        gsap.fromTo(path, { strokeDashoffset: len }, {
          strokeDashoffset: 0, duration: 1.1, ease: "power3.out", immediateRender: false,
          scrollTrigger: { trigger: path, start: "top 90%", once: true },
        });
      });
      gsap.utils.toArray<HTMLElement>("[data-note-wipe]").forEach((el) => {
        gsap.fromTo(el, { clipPath: "inset(0 100% 0 0)" }, {
          clipPath: "inset(0 0% 0 0)", duration: 0.55, ease: "power2.out", immediateRender: false,
          scrollTrigger: { trigger: el, start: "top 92%", once: true },
        });
      });
      gsap.utils.toArray<HTMLElement>("[data-rise]").forEach((el) => {
        gsap.fromTo(el, { y: 16, autoAlpha: 0.001 }, {
          y: 0, autoAlpha: 1, duration: 0.7, ease: "power2.out", immediateRender: false,
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className={`${rubik.variable} ${caveat.variable} ${rubik.className} v17-root`}>
      <style>{CSS}</style>

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <header className="v17-bar">
        <Link href="/" className="v17-wordmark">
          <svg viewBox="0 0 30 30" aria-hidden="true" width="26" height="26">
            <path d="M6 24C6 14 14 6 24 6" stroke="#C2502F" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <circle cx="21" cy="9" r="3.2" fill="#C2502F" />
          </svg>
          <span>{copy.brand}</span>
        </Link>
        <nav className="v17-nav">
          <a href="#dial">{copy.nav.dial}</a>
          <a href="#plan">{copy.nav.plan}</a>
          <a href="#price">{copy.nav.price}</a>
          <a href="#faq">{copy.nav.faq}</a>
        </nav>
        <Link href="/login" className="v17-bar-login">{copy.nav.login}</Link>
      </header>

      <main>
        {/* ── Q1 · HERO «Чи ти справді готовий?» ──────────────────────────── */}
        <section className="v17-hero">
          <div className="v17-hero-copy">
            <div className="v17-qa-head v17-hero-head">
              <h1 className="v17-q v17-q-hero">
                «{H.lead} <span className="v17-key">{H.key}<Underline className="v17-key-under" /></span>»
              </h1>
              <span className="v17-reply v17-hero-reply" data-note-wipe>
                <ReplyArrow />
                <span className={`v17-reply-t ${caveat.className}`}>{copy.hero.aside}</span>
              </span>
            </div>
            <p className="v17-sub">{H.subhead}</p>

            <div className="v17-cta-row">
              <Link href="/register" className="v17-cta-primary">{copy.cta.primary}</Link>
              <button type="button" onClick={scrollToTry} className="v17-cta-ghost">{copy.cta.secondary}</button>
            </div>

            <ul className="v17-reassure">
              {copy.hero.reassure.map((r) => <li key={r}><Tick /><span>{r}</span></li>)}
            </ul>
          </div>

          <div className="v17-hero-art">
            <CoachScene />
            <QuestionCard />
          </div>

          <div className="v17-hero-chips">
            {copy.hero.chips.map((ch) => (
              <div key={ch.unit} className="v17-chip">
                <span className="v17-chip-v">{ch.value}</span>
                <span className="v17-chip-u">{ch.unit}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="v17-rule"><Divider /></div>

        {/* ── Q2 · «Чому 4 з 5 провалюють?» — name the enemy ──────────────── */}
        <section className="v17-sec v17-sec-panel" data-rise>
          <div className="v17-sec-copy">
            <QAHead q={copy.enemy.q} keyWord={copy.enemy.key} reply={copy.enemy.reply} />
            <p className="v17-lead v17-lead-lg">{copy.enemy.lead}</p>
            <p className="v17-body">{copy.enemy.body}</p>
          </div>
          <div className="v17-sec-art v17-enemy-art">
            <TallyFive />
            <div className="v17-tally-legend">
              <span className="v17-tally-pass"><Tick />{copy.enemy.tallyPassed}</span>
              <span className="v17-tally-fail">{copy.enemy.tallyFailed} — 4 з 5</span>
            </div>
            <span className={`v17-note v17-note-clay ${caveat.className} v17-tally-margin`}>{copy.enemy.margin}</span>
          </div>
        </section>

        <div className="v17-rule"><Divider /></div>

        {/* ── Q3 · «А як зрозуміти, що готовий?» — the dial ───────────────── */}
        <section id="dial" className="v17-sec" data-rise>
          <div className="v17-sec-copy">
            <QAHead q={copy.dial.q} keyWord={copy.dial.key} reply={copy.dial.reply} />
            <p className="v17-lead">{copy.dial.lead}</p>
            <h3 className="v17-moat-t">{copy.dial.moatTitle}</h3>
            <p className="v17-body">{copy.dial.moatBody}</p>
            <ul className="v17-list">{copy.dial.points.map((pt) => <li key={pt}><Tick /><span>{pt}</span></li>)}</ul>
          </div>
          <div className="v17-sec-art"><DecayDial /></div>
        </section>

        <div className="v17-rule"><Divider /></div>

        {/* ── Q4 · «Скільки часу мені треба?» — the plan ──────────────────── */}
        <section id="plan" className="v17-sec v17-sec-rev" data-rise>
          <div className="v17-sec-copy">
            <QAHead q={copy.plan.q} keyWord={copy.plan.key} reply={copy.plan.reply} />
            <p className="v17-lead">{copy.plan.lead}</p>
            <p className={`v17-retaker ${caveat.className}`}>{copy.plan.retaker}</p>
          </div>
          <div className="v17-sec-art"><PlanPicker /></div>
        </section>

        <div className="v17-rule"><Divider /></div>

        {/* ── Q5 · «Це як справжній іспит?» — the simulator ──────────────── */}
        <section className="v17-sec-narrow" data-rise>
          <QAHead q={copy.sim.q} keyWord={copy.sim.key} reply={copy.sim.reply} />
          <p className="v17-lead v17-center">{copy.sim.lead}</p>
          <div className="v17-sim-illus"><AnswerSheet /></div>
          <div className="v17-format">
            {copy.sim.format.map((f) => (
              <div key={f.label} className="v17-format-cell">
                <span className="v17-format-n">{f.n}</span>
                <MiniUnderline />
                <span className="v17-format-l">{f.label}</span>
              </div>
            ))}
          </div>
          <p className="v17-sim-rule">{copy.sim.rule}</p>
          <span className={`v17-note v17-note-clay ${caveat.className} v17-sim-note`}>{copy.sim.permission}</span>
          <p className="v17-sim-sub">{copy.sim.note}</p>
          <div className="v17-center"><Link href="/register" className="v17-cta-primary">{copy.sim.cta}</Link></div>
        </section>

        <div className="v17-rule"><Divider /></div>

        {/* ── Q6 · «Що з цього безкоштовне?» — the ledger, before money ──── */}
        <section className="v17-sec-narrow" data-rise>
          <QAHead q={copy.ledger.q} keyWord={copy.ledger.key} reply={copy.ledger.reply} />
          <p className="v17-lead v17-center">{copy.ledger.lead}</p>
          <div className="v17-ledger">
            <div className="v17-ledger-col v17-ledger-free">
              <p className="v17-ledger-t v17-ledger-t-free">{copy.ledger.freeTitle}</p>
              <ul className="v17-list">{copy.ledger.free.map((x) => <li key={x}><Tick /><span>{x}</span></li>)}</ul>
            </div>
            <div className="v17-ledger-rule" aria-hidden="true" />
            <div className="v17-ledger-col">
              <p className="v17-ledger-t v17-ledger-t-paid">{copy.ledger.paidTitle}</p>
              <ul className="v17-list v17-list-paid">{copy.ledger.paid.map((x) => <li key={x}><Dot /><span>{x}</span></li>)}</ul>
            </div>
          </div>
          <span className={`v17-note v17-note-clay ${caveat.className} v17-ledger-note`}>{copy.ledger.note}</span>
        </section>

        <div className="v17-rule"><Divider /></div>

        {/* ── Q7 · «Скільки це коштує?» — the single price card ──────────── */}
        <section id="price" className="v17-sec-narrow" data-rise>
          <QAHead q={copy.price.q} keyWord={copy.price.key} reply={copy.price.reply} />
          <div className="v17-price-grid">
            <div className="v17-price-panel">
              <div className="v17-price-amt">
                <PriceCircle />
                <span className="v17-price-num">{copy.price.amount}</span>
                <span className="v17-price-cur">{copy.price.currency}</span>
              </div>
              <p className="v17-price-once">{copy.price.once}</p>
              <p className="v17-price-sub">{copy.price.sub}</p>
              <Link href="/register" className="v17-cta-primary v17-price-cta">{copy.price.cta}</Link>
            </div>
            <div className="v17-price-why">
              <p className="v17-price-whyt">{copy.price.anchorsTitle}</p>
              <ul className="v17-anchors">{copy.price.anchors.map((a) => <li key={a}><Tick /><span>{a}</span></li>)}</ul>
              <p className={`v17-trust ${caveat.className}`}>{copy.price.trust.join("  ·  ")}</p>
            </div>
          </div>
        </section>

        <div className="v17-rule"><Divider /></div>

        {/* ── Q8 · «А якщо не складу?» — the honest refusal (trust climax) ── */}
        <section className="v17-sec-narrow v17-safety" data-rise>
          <QAHead q={copy.safety.q} keyWord={copy.safety.key} reply={copy.safety.reply} />
          <p className="v17-lead v17-lead-lg v17-center">{copy.safety.lead}</p>
          <p className="v17-body v17-center v17-safety-body">{copy.safety.body}</p>
          <ul className="v17-reassure v17-reassure-center">
            {copy.safety.reassure.map((r) => <li key={r}><Tick /><span>{r}</span></li>)}
          </ul>
        </section>

        <div className="v17-rule"><Divider /></div>

        {/* ── Q9 · Дрібні питання + фінал ────────────────────────────────── */}
        <section id="faq" className="v17-sec-narrow" data-rise>
          <QAHead q={copy.faq.q} keyWord={copy.faq.key} reply="тренер закриває хвости" />
          <div className="v17-faq">
            {copy.faq.items.map((it) => (
              <details key={it.q} className="v17-faq-item">
                <summary>
                  <h3 className="v17-faq-q">{it.q}</h3>
                  <span className="v17-faq-mark" aria-hidden="true" />
                </summary>
                <span className={`v17-faq-aside ${caveat.className}`}>{it.aside}</span>
                <p>{it.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── Final CTA + mobile mode-launcher — the coach signs off ─────── */}
        <section className="v17-final" data-rise>
          <h2 className="v17-q v17-final-q">
            «Питань більше <span className="v17-key">{copy.final.key}<Underline className="v17-key-under" /></span>»
          </h2>
          <p className="v17-lead v17-center">{copy.final.lead}</p>
          <div className="v17-cta-row v17-center-row">
            <Link href="/register" className="v17-cta-primary">{copy.final.ctaPrimary}</Link>
            <button type="button" onClick={scrollToTry} className="v17-cta-ghost">{copy.final.ctaSecondary}</button>
          </div>
          <p className="v17-launch-t">{copy.final.launchTitle}</p>
          <div className="v17-launch">
            {copy.final.modes.map((m) => (
              <Link key={m.label} href={m.href} className="v17-launch-row">
                <span>{m.label}</span>
                <svg viewBox="0 0 24 16" width="26" height="17" fill="none" aria-hidden="true">
                  <path data-draw d="M2 8H20M20 8L14 3M20 8L14 13" stroke="#C2502F" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            ))}
          </div>
        </section>
      </main>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="v17-footer">
        <div className="v17-footer-top">
          <div className="v17-wordmark v17-wordmark-foot"><span>{copy.brand}</span></div>
          <span className={`v17-foot-tag ${caveat.className}`}>{copy.footer.tagline}</span>
          <nav className="v17-foot-links">
            {copy.footer.links.map((l) => <Link key={l.label} href={l.href}>{l.label}</Link>)}
          </nav>
        </div>
        <p className="v17-foot-contact">
          {copy.footer.contactLabel}{" "}
          <a href={`mailto:${copy.footer.contactEmail}`}>{copy.footer.contactEmail}</a>
        </p>
        <p className="v17-disclaimer">{copy.footer.disclaimer}</p>
        <p className="v17-copyright">© {new Date().getFullYear()} {copy.footer.copyright}</p>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Scoped styles (component <style>; globals.css untouched)
   ═══════════════════════════════════════════════════════════════════════════ */
const CSS = `
.v17-root{
  --bg:#FAF0EB; --surface:#FFFFFF; --ink:#2A211D; --clay:#C2502F; --pine:#3E7D64;
  --clay-soft:#E4B7A6; --clay-line:#EAD3C8; --panel:#FFFFFF; --note:#fbeee9;
  --muted:#6a5b53; --body:#4a3d36;
  /* Darkened clay for SMALL (<1.5rem) clay text so it clears WCAG AA 4.5:1 on the blush
     surfaces; full-strength --clay stays for strokes, fills, CTAs and display-size keywords. */
  --clay-text:#A03D1D;
  background:var(--bg); color:var(--ink);
  font-family:var(--v17-rubik),system-ui,sans-serif;
  width:100%; overflow-x:hidden;
  -webkit-font-smoothing:antialiased;
}
.v17-root *{box-sizing:border-box;}
.v17-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;}

/* top bar */
.v17-bar{max-width:1120px;margin:0 auto;padding:18px 24px;display:flex;align-items:center;gap:20px;}
.v17-wordmark{display:inline-flex;align-items:center;gap:9px;font-weight:800;font-size:1.05rem;letter-spacing:-.01em;color:var(--ink);text-decoration:none;}
.v17-nav{display:flex;gap:26px;margin-left:auto;}
.v17-nav a{color:var(--ink);opacity:.72;text-decoration:none;font-weight:500;font-size:.95rem;transition:opacity .2s;}
.v17-nav a:hover{opacity:1;}
.v17-bar-login{color:var(--clay-text);font-weight:600;text-decoration:none;font-size:.95rem;}
@media(max-width:760px){.v17-nav{display:none;}.v17-bar-login{margin-left:auto;}}

/* shared CTAs */
.v17-cta-primary{display:inline-flex;align-items:center;justify-content:center;background:var(--clay);color:#fff;font-weight:600;font-size:1.02rem;padding:15px 30px;border-radius:999px;text-decoration:none;box-shadow:0 6px 18px -8px rgba(194,80,47,.5);transition:transform .18s cubic-bezier(.2,.8,.2,1),background .2s;}
.v17-cta-primary:hover{background:#a9421f;transform:translateY(-1px);}
.v17-cta-ghost{display:inline-flex;align-items:center;justify-content:center;background:transparent;color:var(--clay);font-family:inherit;font-weight:600;font-size:1.02rem;padding:14px 28px;border-radius:999px;text-decoration:none;border:1.5px solid var(--clay-soft);cursor:pointer;transition:border-color .2s,background .2s;}
.v17-cta-ghost:hover{border-color:var(--clay);background:#fff;}

/* dialogue-grammar head: question + coach reply cue */
.v17-qa-head{position:relative;}
.v17-q{font-weight:800;letter-spacing:-.025em;line-height:1.04;margin:0;text-wrap:balance;font-size:clamp(1.9rem,3.8vw,3rem);}
.v17-key{position:relative;white-space:nowrap;display:inline-block;color:var(--clay);}
.v17-key-under{position:absolute;left:-2%;bottom:-.16em;width:104%;height:.5em;}
.v17-reply{display:inline-flex;align-items:flex-start;gap:6px;margin-top:12px;}
.v17-replyarrow{width:46px;height:31px;flex-shrink:0;margin-top:2px;overflow:visible;}
.v17-reply-t{font-size:1.5rem;color:var(--clay);line-height:1;transform:rotate(-2deg);display:inline-block;}
.v17-center .v17-qa-head,.v17-sec-narrow>.v17-qa-head{}

/* hero */
.v17-hero{max-width:1120px;margin:0 auto;padding:34px 24px 20px;display:grid;grid-template-columns:1.05fr .95fr;grid-template-areas:"copy art" "chips art";column-gap:56px;row-gap:26px;align-items:start;}
.v17-hero-copy{grid-area:copy;}
.v17-hero-art{grid-area:art;align-self:center;position:relative;}
.v17-hero-chips{grid-area:chips;align-self:end;}
.v17-hero-head{display:flex;flex-direction:column;}
.v17-q-hero{font-size:clamp(2.6rem,6vw,4.6rem);line-height:1.0;letter-spacing:-.03em;}
.v17-hero-reply{margin-top:14px;}
.v17-hero-reply .v17-reply-t{font-size:1.7rem;}
.v17-sub{margin:20px 0 0;font-size:clamp(1.05rem,1.6vw,1.2rem);line-height:1.5;color:var(--body);max-width:36ch;text-wrap:pretty;}
.v17-cta-row{display:flex;gap:14px;margin-top:26px;flex-wrap:wrap;}
@media(max-width:520px){.v17-cta-row{flex-direction:column;}.v17-cta-row>a,.v17-cta-row>button{width:100%;}}
.v17-reassure{list-style:none;padding:0;margin:20px 0 0;display:flex;gap:16px;flex-wrap:wrap;}
.v17-reassure li{display:inline-flex;align-items:center;gap:7px;font-size:.9rem;color:var(--body);font-weight:500;}
.v17-reassure .v17-tick{width:17px;height:17px;flex-shrink:0;}
.v17-scene{width:100%;height:auto;display:block;max-width:440px;margin:0 auto -8px;}
@media(max-width:900px){.v17-scene{max-width:340px;}}
.v17-hero-chips{display:flex;gap:10px;flex-wrap:wrap;}
.v17-chip{display:flex;flex-direction:column;gap:1px;background:#fff;border:1.5px solid var(--clay-line);border-radius:14px;padding:9px 15px;}
.v17-chip-v{font-weight:700;font-size:1.05rem;letter-spacing:-.02em;}
.v17-chip-u{font-size:.72rem;color:var(--muted);}
@media(max-width:900px){
  .v17-hero{grid-template-columns:1fr;grid-template-areas:"copy" "art" "chips";gap:24px;padding-top:22px;}
  .v17-hero-art{display:flex;flex-direction:column;}
  .v17-hero-art .v17-card{order:1;}
  .v17-hero-art .v17-scene{order:2;margin:16px auto 0;}
}

/* question card */
.v17-card{background:var(--surface);border:1.5px solid var(--clay-soft);border-radius:20px;padding:18px 18px 16px;max-width:440px;margin:0 auto;scroll-margin-top:84px;box-shadow:0 18px 40px -28px rgba(42,33,29,.4);}
.v17-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;}
.v17-card-tag{font-size:.72rem;font-weight:600;color:var(--clay-text);background:var(--note);border:1px solid var(--clay-line);border-radius:999px;padding:5px 11px;}
.v17-meter{width:96px;height:auto;}
.v17-meter-val{transition:stroke-dashoffset .7s cubic-bezier(.2,.8,.2,1);}
.v17-meter-needle{transition:x2 .7s cubic-bezier(.2,.8,.2,1),y2 .7s cubic-bezier(.2,.8,.2,1);}
.v17-card-q{font-weight:600;font-size:1.02rem;line-height:1.35;margin:0 0 14px;}
.v17-opts{display:flex;flex-direction:column;gap:8px;}
.v17-opt{display:flex;align-items:center;gap:10px;text-align:left;background:var(--bg);border:1.5px solid var(--clay-line);border-radius:12px;padding:11px 13px;font:inherit;font-size:.95rem;color:var(--ink);cursor:pointer;transition:border-color .18s,background .18s;}
.v17-opt:hover:not([aria-disabled="true"]){border-color:var(--clay);}
.v17-opt[aria-disabled="true"]{cursor:default;}
.v17-opt-mark{width:20px;height:20px;flex-shrink:0;display:inline-flex;}
.v17-opt-right{border-color:var(--pine);background:#eef5f1;}
.v17-opt-wrong{border-color:var(--clay-soft);background:var(--note);}
.v17-opt-dim{opacity:.5;}
.v17-tick{width:20px;height:20px;}
.v17-dot{width:18px;height:18px;}
.v17-card-hint{margin:0 2px;font-size:.85rem;color:var(--muted);}
.v17-card-foot{margin-top:13px;}
.v17-explain{margin:0;font-size:.9rem;line-height:1.45;color:var(--body);}
.v17-note{display:inline-block;font-size:1.35rem;line-height:1.12;}
.v17-note-ok{color:var(--pine);}
.v17-note-clay{color:var(--clay);}
.v17-card-foot .v17-note{margin-top:10px;transform:rotate(-1.5deg);}

/* hand-drawn dividers between turns */
.v17-rule{max-width:1120px;margin:0 auto;padding:0 24px;}
.v17-divider{width:100%;height:12px;display:block;}

/* generic two-column Q&A spread */
.v17-sec{max-width:1120px;margin:0 auto;padding:60px 24px;display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center;}
.v17-sec-rev .v17-sec-copy{order:2;} .v17-sec-rev .v17-sec-art{order:1;}
@media(max-width:900px){.v17-sec{grid-template-columns:1fr;gap:30px;padding:44px 24px;}.v17-sec-rev .v17-sec-copy{order:1;}.v17-sec-rev .v17-sec-art{order:2;}}
.v17-sec-panel{background:var(--surface);border-radius:24px;max-width:1072px;border:1.5px solid var(--clay-line);}
@media(max-width:900px){.v17-sec-panel{border-radius:20px;}}

.v17-lead{font-size:clamp(1.02rem,1.5vw,1.16rem);line-height:1.55;color:var(--body);margin:18px 0 0;max-width:54ch;text-wrap:pretty;}
.v17-lead-lg{font-size:clamp(1.14rem,1.9vw,1.42rem);line-height:1.4;color:var(--ink);font-weight:500;}
.v17-body{font-size:1rem;line-height:1.6;color:var(--body);margin:12px 0 0;max-width:54ch;text-wrap:pretty;}
.v17-center{text-align:center;margin-left:auto;margin-right:auto;}
.v17-moat-t{font-weight:700;font-size:1.14rem;margin:24px 0 0;letter-spacing:-.01em;}
.v17-list{list-style:none;padding:0;margin:20px 0 0;display:flex;flex-direction:column;gap:12px;}
.v17-list li{display:flex;align-items:flex-start;gap:11px;font-size:1rem;line-height:1.4;}
.v17-list li .v17-tick,.v17-list li .v17-dot{margin-top:1px;flex-shrink:0;}

/* Q2 enemy — the 1-of-5 tally */
.v17-enemy-art{position:relative;text-align:center;}
.v17-tally{width:100%;max-width:340px;height:auto;margin:0 auto;display:block;}
.v17-tally-legend{display:flex;justify-content:center;gap:22px;margin-top:8px;font-size:.9rem;font-weight:600;}
.v17-tally-pass{display:inline-flex;align-items:center;gap:6px;color:var(--pine);}
.v17-tally-pass .v17-tick{width:17px;height:17px;}
.v17-tally-fail{color:var(--clay-text);}
.v17-tally-margin{display:block;margin-top:16px;font-size:1.4rem;transform:rotate(-2deg);}

/* Q3 dial */
.v17-dialwrap{background:var(--surface);border:1.5px solid var(--clay-soft);border-radius:22px;padding:30px 26px 26px;max-width:400px;margin:0 auto;text-align:center;position:relative;box-shadow:0 18px 40px -30px rgba(42,33,29,.4);}
.v17-dial{width:100%;max-width:300px;height:auto;margin:0 auto;display:block;}
.v17-dial-read{margin-top:-6px;display:flex;align-items:baseline;justify-content:center;gap:2px;}
.v17-dial-num{font-weight:800;font-size:3rem;letter-spacing:-.04em;line-height:1;}
.v17-dial-pct{font-weight:700;font-size:1.3rem;color:var(--clay);}
.v17-dial-scale{display:flex;justify-content:space-between;font-size:.78rem;color:var(--muted);margin-top:6px;padding:0 6px;}
.v17-dial-caption{margin:14px 0 0;font-weight:600;font-size:.95rem;color:var(--ink);}
.v17-decaynote{position:absolute;right:14px;top:16px;font-size:1.2rem;transform:rotate(-4deg);max-width:120px;text-align:right;line-height:1.05;}

/* Q4 plan */
.v17-plan{background:var(--surface);border:1.5px solid var(--clay-soft);border-radius:22px;padding:26px 24px;max-width:440px;margin:0 auto;box-shadow:0 18px 40px -30px rgba(42,33,29,.4);}
.v17-plan-label{display:block;font-weight:600;font-size:.9rem;margin-bottom:8px;}
.v17-date{width:100%;font:inherit;font-size:1.05rem;padding:13px 15px;border:1.5px solid var(--clay-line);border-radius:13px;background:var(--bg);color:var(--ink);}
.v17-date:focus{outline:none;border-color:var(--clay);}
.v17-plan-out{min-height:96px;margin:18px 0 4px;display:flex;flex-direction:column;justify-content:center;}
.v17-plan-fallback{margin:0;font-size:.98rem;line-height:1.5;color:var(--body);}
.v17-plan-nums{display:flex;align-items:center;justify-content:center;gap:20px;}
.v17-plan-nums>div{display:flex;flex-direction:column;align-items:center;}
.v17-plan-big{font-weight:800;font-size:2.6rem;line-height:1;letter-spacing:-.03em;color:var(--clay);}
.v17-plan-unit{font-size:.78rem;color:var(--muted);margin-top:3px;text-align:center;}
.v17-plan-x{font-size:1.6rem;color:var(--clay-soft);font-weight:700;}
.v17-plan-note{display:block;text-align:center;font-size:1.3rem;margin-top:12px;transform:rotate(-1.5deg);}
.v17-plan-topicslbl{font-size:.86rem;font-weight:600;color:var(--muted);margin:20px 0 10px;}
.v17-topics{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:9px;}
.v17-topics li{display:flex;align-items:center;gap:10px;font-size:.96rem;}
.v17-topics .v17-tick{width:18px;height:18px;flex-shrink:0;}
.v17-plan-cta{width:100%;margin-top:20px;}
.v17-retaker{margin:18px 0 0;font-size:1.3rem;color:var(--clay);line-height:1.2;transform:rotate(-1deg);max-width:30ch;}

/* narrow (centered) Q&A */
.v17-sec-narrow{max-width:840px;margin:0 auto;padding:60px 24px;}
@media(max-width:900px){.v17-sec-narrow{padding:44px 24px;}}
.v17-sec-narrow>.v17-qa-head{text-align:center;}
.v17-sec-narrow>.v17-qa-head .v17-reply{justify-content:center;}

/* self-drawing beat illustrations */
.v17-illus{display:block;height:auto;}
.v17-sim-illus{display:flex;justify-content:center;margin:24px 0 0;}
.v17-sim-illus .v17-illus{width:118px;}

/* Q5 simulator */
.v17-format{display:flex;justify-content:center;gap:20px;margin:28px 0 0;flex-wrap:wrap;}
.v17-format-cell{background:var(--surface);border:1.5px solid var(--clay-line);border-radius:18px;padding:22px 32px;text-align:center;min-width:148px;}
.v17-format-n{display:block;font-weight:800;font-size:3.2rem;line-height:1;letter-spacing:-.04em;color:var(--clay);}
.v17-format-under{display:block;width:48px;height:8px;margin:6px auto 0;}
.v17-format-l{display:block;font-size:.9rem;color:var(--body);margin-top:8px;}
.v17-sim-rule{text-align:center;font-size:.95rem;color:var(--body);margin:26px auto 0;max-width:52ch;line-height:1.5;}
.v17-sim-note{display:block;text-align:center;font-size:1.5rem;margin:14px auto 4px;transform:rotate(-1.5deg);}
.v17-sim-sub{text-align:center;font-size:.9rem;color:var(--muted);margin:0 auto 26px;}
.v17-center .v17-cta-primary{margin-top:4px;}

/* Q6 ledger — the coach's two-column notebook */
.v17-ledger{display:grid;grid-template-columns:1fr auto 1fr;gap:0;margin:32px 0 0;background:var(--surface);border:1.5px solid var(--clay-line);border-radius:22px;overflow:hidden;box-shadow:0 18px 40px -32px rgba(42,33,29,.35);}
.v17-ledger-col{padding:28px 30px;}
.v17-ledger-rule{width:1.5px;background:var(--clay-line);}
.v17-ledger-t{margin:0;font-weight:800;font-size:1.05rem;letter-spacing:-.01em;}
.v17-ledger-t-free{color:var(--pine);}
.v17-ledger-t-paid{color:var(--clay);}
.v17-ledger .v17-list{margin-top:16px;gap:11px;}
.v17-list-paid li span{color:var(--body);}
@media(max-width:640px){.v17-ledger{grid-template-columns:1fr;}.v17-ledger-rule{width:100%;height:1.5px;}}
.v17-ledger-note{display:block;text-align:center;font-size:1.4rem;margin:18px auto 0;transform:rotate(-1deg);max-width:36ch;}

/* Q7 pricing */
.v17-price-grid{display:grid;grid-template-columns:1.05fr 1fr;gap:24px;margin:30px 0 0;align-items:stretch;}
@media(max-width:760px){.v17-price-grid{grid-template-columns:1fr;}}
.v17-price-panel{background:var(--clay);color:#fff;border-radius:22px;padding:32px 30px;box-shadow:0 22px 50px -28px rgba(194,80,47,.7);}
.v17-price-amt{display:inline-flex;align-items:baseline;gap:6px;position:relative;}
.v17-price-circle{position:absolute;left:-18px;top:-16px;width:calc(100% + 52px);height:calc(100% + 34px);pointer-events:none;overflow:visible;}
.v17-price-num{font-weight:800;font-size:4rem;line-height:1;letter-spacing:-.04em;}
.v17-price-cur{font-weight:700;font-size:1.8rem;}
.v17-price-once{margin:10px 0 0;font-weight:600;font-size:1.08rem;}
.v17-price-sub{margin:8px 0 0;font-size:.94rem;line-height:1.5;opacity:.94;max-width:34ch;}
.v17-price-cta{width:100%;margin-top:26px;background:#fff;color:var(--clay);box-shadow:none;}
.v17-price-cta:hover{background:var(--note);}
.v17-price-why{display:flex;flex-direction:column;justify-content:center;padding:4px 6px;}
.v17-price-whyt{font-weight:700;font-size:.95rem;color:var(--muted);margin:0;}
.v17-anchors{list-style:none;padding:0;margin:16px 0 0;display:flex;flex-direction:column;gap:14px;}
.v17-anchors li{display:flex;align-items:flex-start;gap:11px;font-size:1rem;line-height:1.45;color:var(--ink);}
.v17-anchors li .v17-tick{margin-top:1px;flex-shrink:0;}
.v17-trust{margin:22px 0 0;font-size:1.4rem;color:var(--clay);transform:rotate(-1deg);}

/* Q8 safety — trust climax */
.v17-safety{max-width:760px;}
.v17-safety-body{margin-top:16px;font-size:1.04rem;}
.v17-reassure-center{justify-content:center;margin-top:24px;}

/* Q9 faq */
.v17-faq{margin:30px 0 0;}
.v17-faq-item{border-bottom:1.5px solid var(--clay-line);}
.v17-faq-item summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 4px;}
.v17-faq-item summary::-webkit-details-marker{display:none;}
.v17-faq-q{margin:0;font-weight:600;font-size:1.1rem;line-height:1.3;}
.v17-faq-mark{position:relative;width:18px;height:18px;flex-shrink:0;}
.v17-faq-mark::before,.v17-faq-mark::after{content:"";position:absolute;background:var(--clay);border-radius:2px;}
.v17-faq-mark::before{left:0;top:8px;width:18px;height:2.5px;}
.v17-faq-mark::after{left:8px;top:0;width:2.5px;height:18px;transition:transform .25s ease;}
.v17-faq-item[open] .v17-faq-mark::after{transform:rotate(90deg);opacity:0;}
.v17-faq-aside{display:block;margin:2px 4px 3px;font-size:1.25rem;line-height:1;color:var(--clay);transform:rotate(-1.5deg);}
.v17-faq-item p{margin:0 4px 22px;font-size:1rem;line-height:1.6;color:var(--body);max-width:62ch;}

/* final */
.v17-final{max-width:820px;margin:0 auto;padding:64px 24px;text-align:center;}
.v17-final-q{font-size:clamp(2.2rem,5vw,3.4rem);}
.v17-center-row{justify-content:center;margin-top:26px;}
@media(max-width:520px){.v17-center-row{align-items:stretch;}}
.v17-launch-t{font-weight:600;font-size:.9rem;color:var(--muted);margin:44px 0 14px;}
.v17-launch{display:flex;flex-direction:column;gap:12px;max-width:480px;margin:0 auto;}
.v17-launch-row{display:flex;align-items:center;justify-content:space-between;gap:16px;background:var(--surface);border:1.5px solid var(--clay-soft);border-radius:16px;padding:18px 22px;text-decoration:none;color:var(--ink);font-weight:600;font-size:1.05rem;transition:transform .18s cubic-bezier(.2,.8,.2,1),border-color .2s;}
.v17-launch-row:hover{transform:translateY(-1px);border-color:var(--clay);}

/* footer */
.v17-footer{max-width:1120px;margin:20px auto 0;padding:40px 24px 56px;border-top:1.5px solid var(--clay-line);}
.v17-footer-top{display:flex;align-items:center;gap:18px;flex-wrap:wrap;}
.v17-wordmark-foot{font-weight:800;font-size:1.05rem;}
.v17-foot-tag{font-size:1.25rem;color:var(--clay);transform:rotate(-1.5deg);}
.v17-foot-links{margin-left:auto;display:flex;gap:20px;}
.v17-foot-links a{color:var(--ink);opacity:.7;text-decoration:none;font-size:.92rem;}
.v17-foot-links a:hover{opacity:1;}
.v17-foot-contact{margin:22px 0 0;font-size:.92rem;color:var(--body);}
.v17-foot-contact a{color:var(--clay-text);font-weight:600;text-decoration:none;}
.v17-foot-contact a:hover{text-decoration:underline;}
.v17-disclaimer{margin:14px 0 0;font-size:.8rem;line-height:1.6;color:var(--muted);max-width:80ch;}
.v17-copyright{margin:14px 0 0;font-size:.8rem;color:var(--muted);}

@media(prefers-reduced-motion:reduce){
  .v17-meter-val,.v17-meter-needle{transition:none;}
  .v17-cta-primary,.v17-cta-ghost,.v17-launch-row{transition:none;}
}
`;
