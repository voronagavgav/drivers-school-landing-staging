"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { QUESTIONS, COPY, ANON_TRY_HREF, ACCESS_HREF } from "./copy";

type Phase = "answering" | "reviewing";

export default function Terminal() {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("answering");
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => QUESTIONS.map(() => null),
  );
  const [done, setDone] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const advanceRef = useRef<HTMLButtonElement>(null);
  const reduced = useRef(false);

  const q = QUESTIONS[idx];
  const total = QUESTIONS.length;
  const score = answers.reduce<number>(
    (n, a, i) => n + (a === QUESTIONS[i].correct ? 1 : 0),
    0,
  );

  // Preload every restyled image once so question steps never flash.
  useEffect(() => {
    QUESTIONS.forEach((item) => {
      const im = new Image();
      im.src = `/restyled-live/${item.imageKey}.png`;
    });
  }, []);

  // After answering, move keyboard focus to «Далі» so a keyboard user
  // doesn't lose their place when the option buttons unmount.
  useEffect(() => {
    if (phase === "reviewing") advanceRef.current?.focus();
  }, [phase]);

  // Detect reduced-motion once.
  useEffect(() => {
    reduced.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Entrance for each new question / verdict — always FROM a visible baseline,
  // guarded by matchMedia so reduced-motion gets an instant, complete render.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add(
      {
        motion: "(prefers-reduced-motion: no-preference)",
        reduce: "(prefers-reduced-motion: reduce)",
      },
      (ctx) => {
        const { reduce } = ctx.conditions as { reduce: boolean };
        if (reduce) return; // content already visible; nothing to do
        const marks = el.querySelectorAll<HTMLElement>("[data-rise]");
        gsap.from(marks, {
          y: 14,
          opacity: 0,
          duration: 0.5,
          ease: "expo.out",
          stagger: 0.05,
          clearProps: "transform,opacity",
        });
      },
    );
    return () => mm.revert();
  }, [idx, done]);

  const pick = useCallback(
    (choice: number, target: HTMLButtonElement) => {
      if (phase !== "answering") return;
      setPicked(choice);
      setPhase("reviewing");
      setAnswers((prev) => {
        const next = prev.slice();
        next[idx] = choice;
        return next;
      });
      if (!reduced.current) {
        gsap.fromTo(
          target,
          { scale: 1 },
          {
            scale: 0.97,
            duration: 0.09,
            ease: "power2.out",
            yoyo: true,
            repeat: 1,
          },
        );
      }
    },
    [phase, idx],
  );

  const advance = useCallback(() => {
    if (idx < total - 1) {
      setIdx((i) => i + 1);
      setPhase("answering");
      setPicked(null);
    } else {
      setDone(true);
    }
  }, [idx, total]);

  const restart = useCallback(() => {
    setAnswers(QUESTIONS.map(() => null));
    setIdx(0);
    setPhase("answering");
    setPicked(null);
    setDone(false);
  }, []);

  const band =
    score === total
      ? COPY.verdict.bands.high
      : score >= 3
        ? COPY.verdict.bands.mid
        : COPY.verdict.bands.low;

  return (
    <div className="v31" ref={rootRef}>
      <style>{STYLE}</style>

      {/* ── top rail ─────────────────────────────────────────────── */}
      <header className="rail">
        <div className="wordmark">
          <span className="mark" aria-hidden="true" />
          {COPY.brand}
        </div>
        <div className="rail-meta">
          <span className="bankline">{COPY.bankLine}</span>
          <ol className="stubs" aria-label={`${COPY.boot}`}>
            {QUESTIONS.map((_, i) => {
              const a = answers[i];
              const state =
                a == null
                  ? i === idx && !done
                    ? "active"
                    : "idle"
                  : a === QUESTIONS[i].correct
                    ? "ok"
                    : "no";
              return (
                <li key={i} className={`stub ${state}`}>
                  <span className="stub-n">{i + 1}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </header>

      {/* ── stage: the luminous work surface ─────────────────────── */}
      <main className="stage">
        {!done ? (
          <section className="surface" aria-live="polite">
            <div className="surface-head">
              <span className="topic" data-rise>
                {q.topic}
              </span>
              <span className="counter" data-rise>
                <span className="cur">{String(idx + 1).padStart(2, "0")}</span>
                <span className="sep">/</span>
                <span className="tot">{String(total).padStart(2, "0")}</span>
              </span>
            </div>

            <div className="body" ref={bodyRef}>
              <figure className="plate" data-rise>
                <img
                  src={`/restyled-live/${q.imageKey}.png`}
                  alt={q.imageAlt}
                  width={512}
                  height={384}
                  {...(idx === 0
                    ? { fetchPriority: "high" as const, loading: "eager" as const }
                    : { loading: "lazy" as const })}
                />
                <figcaption className="plate-key">{q.imageKey}</figcaption>
              </figure>

              <div className="query">
                <h1 className="q-text" data-rise>
                  {q.text}
                </h1>

                {phase === "answering" ? (
                  <ul className="opts" data-rise>
                    {q.options.map((opt, i) => (
                      <li key={i}>
                        <button
                          type="button"
                          className="opt"
                          onClick={(e) => pick(i, e.currentTarget)}
                        >
                          <span className="opt-tag">
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span className="opt-text">{opt}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="feedback" data-rise>
                    <div className="verdict-row">
                      {q.options.map((opt, i) => {
                        const isCorrect = i === q.correct;
                        const isPicked = i === picked;
                        const cls = isCorrect
                          ? "res ok"
                          : isPicked
                            ? "res no"
                            : "res mute";
                        return (
                          <div key={i} className={cls}>
                            <span className="res-tag">
                              {isCorrect ? "✓" : isPicked ? "✕" : String.fromCharCode(65 + i)}
                            </span>
                            <span className="res-text">{opt}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div
                      className={`ruling ${picked === q.correct ? "was-ok" : "was-no"}`}
                    >
                      <span className="ruling-tag">
                        {picked === q.correct
                          ? COPY.ui.correctTag
                          : COPY.ui.wrongTag}
                      </span>
                      <p className="ruling-text">{q.context}</p>
                    </div>

                    <button
                      type="button"
                      className="advance"
                      onClick={advance}
                      ref={advanceRef}
                    >
                      {idx < total - 1 ? COPY.ui.next : COPY.ui.finish}
                      <span className="advance-arrow" aria-hidden="true">
                        →
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : (
          /* ── verdict panel ──────────────────────────────────────── */
          <section className="surface verdict" aria-live="polite">
            <div className="body verdict-body" ref={bodyRef}>
              <div className="score-block" data-rise>
                <span className="score-lead">{COPY.verdict.lead}</span>
                <div className="score-num">
                  <span className="score-cur">{score}</span>
                  <span className="score-of">{COPY.verdict.scoreOf}</span>
                  <span className="score-tot">{total}</span>
                </div>
                <div className="dots" aria-hidden="true">
                  {answers.map((a, i) => (
                    <span
                      key={i}
                      className={`dot ${a === QUESTIONS[i].correct ? "ok" : "no"}`}
                    />
                  ))}
                </div>
              </div>

              <p className="band" data-rise>
                {band}
              </p>
              <p className="mechanics" data-rise>
                {COPY.verdict.mechanics}
              </p>

              <div className="cta-block" data-rise>
                <Link
                  href={ANON_TRY_HREF}
                  className="cta-primary"
                  aria-label={COPY.verdict.ctaPrimaryAria}
                >
                  {COPY.verdict.ctaPrimary}
                  <span aria-hidden="true">→</span>
                </Link>
                <button type="button" className="cta-restart" onClick={restart}>
                  {COPY.verdict.restart}
                </button>
              </div>

              <Link
                href={ACCESS_HREF}
                className="access"
                aria-label={COPY.verdict.accessAria}
              >
                {COPY.verdict.access}
              </Link>
            </div>
          </section>
        )}
      </main>

      {/* ── marginalia + disclaimer ──────────────────────────────── */}
      <footer className="foot">
        <ul className="margin">
          <li>{COPY.margin.fsrs}</li>
          <li>{COPY.margin.exam}</li>
          <li>{COPY.margin.bank}</li>
        </ul>
        <p className="disclaimer">{COPY.disclaimer}</p>
      </footer>
    </div>
  );
}

// ── Scoped styles (all rules prefixed .v31 — no leak into the app) ───────────
const STYLE = `
.v31 {
  --field: oklch(0.185 0.018 255);
  --field-2: oklch(0.155 0.016 255);
  --screen: oklch(0.965 0.006 255);
  --screen-inset: oklch(0.915 0.008 255);
  --ink: oklch(0.245 0.02 258);
  --ink-2: oklch(0.44 0.02 258);
  --line: oklch(0.86 0.01 258);
  --amber: oklch(0.79 0.135 72);
  --ok: oklch(0.66 0.14 152);
  --no: oklch(0.605 0.2 26);
  --dim: oklch(0.66 0.02 258);
  --dim-2: oklch(0.7 0.015 258);

  font-family: var(--font-sans), system-ui, sans-serif;
  color: oklch(0.92 0.01 258);
  background:
    radial-gradient(120% 90% at 50% -10%, oklch(0.24 0.03 262) 0%, transparent 55%),
    linear-gradient(180deg, var(--field) 0%, var(--field-2) 100%);
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
.v31 *, .v31 *::before, .v31 *::after { box-sizing: border-box; }

/* ── top rail ── */
.v31 .rail {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: clamp(0.9rem, 2.5vh, 1.4rem) clamp(1rem, 4vw, 2.6rem);
}
.v31 .wordmark {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-weight: 600;
  font-size: 0.95rem;
  letter-spacing: -0.01em;
  color: oklch(0.95 0.008 258);
}
.v31 .mark {
  width: 0.62rem; height: 0.62rem; border-radius: 2px;
  background: var(--amber);
  box-shadow: 0 0 0 3px oklch(0.79 0.135 72 / 0.16), 0 0 14px oklch(0.79 0.135 72 / 0.5);
  animation: v31pulse 3.4s ease-in-out infinite;
}
@keyframes v31pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
@media (prefers-reduced-motion: reduce){ .v31 .mark{ animation:none } }
.v31 .rail-meta {
  display: flex; align-items: center; gap: clamp(0.8rem, 2vw, 1.6rem);
}
.v31 .bankline {
  font-family: var(--font-mono), monospace;
  font-size: 0.68rem; letter-spacing: 0.02em;
  color: var(--dim); text-transform: none;
}
.v31 .stubs {
  display: flex; gap: 0.4rem; list-style: none; margin: 0; padding: 0;
}
.v31 .stub {
  width: 1.7rem; height: 1.7rem; border-radius: 5px;
  display: grid; place-items: center;
  border: 1px solid oklch(0.4 0.02 258 / 0.6);
  font-family: var(--font-mono), monospace;
  font-size: 0.72rem; font-weight: 500;
  color: var(--dim-2);
  transition: border-color .3s, color .3s, background .3s, box-shadow .3s;
}
.v31 .stub.active {
  border-color: var(--amber); color: oklch(0.9 0.06 72);
  box-shadow: 0 0 0 1px var(--amber), 0 0 12px oklch(0.79 0.135 72 / 0.35);
}
.v31 .stub.ok { border-color: oklch(0.66 0.14 152 / 0.7); color: var(--ok); background: oklch(0.66 0.14 152 / 0.1); }
.v31 .stub.no { border-color: oklch(0.605 0.2 26 / 0.7); color: var(--no); background: oklch(0.605 0.2 26 / 0.1); }

/* ── stage ── */
.v31 .stage {
  flex: 1 1 auto;
  display: grid;
  place-items: center;
  padding: clamp(0.5rem, 2vh, 1.4rem) clamp(1rem, 4vw, 2.6rem);
  min-height: 0;
}

/* ── the luminous work surface ── */
.v31 .surface {
  width: min(1060px, 100%);
  background: var(--screen);
  border-radius: 16px;
  border: 1px solid oklch(1 0 0 / 0.5);
  box-shadow:
    0 0 0 1px oklch(0.2 0.02 258 / 0.6),
    0 40px 90px -30px oklch(0 0 0 / 0.75),
    0 0 120px -40px oklch(0.79 0.135 72 / 0.25);
  overflow: hidden;
}
.v31 .surface-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem clamp(1rem, 2.6vw, 1.6rem);
  border-bottom: 1px solid var(--line);
  background: linear-gradient(180deg, oklch(1 0 0 / 0.6), transparent);
}
.v31 .topic {
  font-size: 0.72rem; font-weight: 600; letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--ink-2);
}
.v31 .counter {
  font-family: var(--font-mono), monospace;
  font-variant-numeric: tabular-nums;
  font-size: 0.82rem; color: var(--ink-2); display: inline-flex; gap: 0.15rem;
}
.v31 .counter .cur { color: var(--ink); font-weight: 600; }
.v31 .counter .sep { color: var(--dim); }

.v31 .body {
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
  gap: clamp(1rem, 2.4vw, 1.9rem);
  padding: clamp(1rem, 2.6vw, 1.7rem);
}

/* image plate — a light-table for varied aspect ratios */
.v31 .plate {
  margin: 0; position: relative;
  background:
    linear-gradient(180deg, var(--screen-inset), oklch(0.9 0.008 255));
  border: 1px solid var(--line);
  border-radius: 11px;
  aspect-ratio: 4 / 3;
  display: grid; place-items: center;
  overflow: hidden;
}
.v31 .plate img {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: contain; display: block;
  padding: 0.5rem;
  border-radius: 4px;
}
.v31 .plate-key {
  position: absolute; right: 0.5rem; bottom: 0.4rem;
  font-family: var(--font-mono), monospace;
  font-size: 0.6rem; letter-spacing: 0.04em;
  color: oklch(0.5 0.02 258 / 0.6);
  background: oklch(1 0 0 / 0.5); padding: 0.1rem 0.35rem; border-radius: 4px;
}

/* query column */
.v31 .query { display: flex; flex-direction: column; min-width: 0; }
.v31 .q-text {
  margin: 0 0 clamp(0.9rem, 2vh, 1.3rem);
  font-size: clamp(1.05rem, 1.05rem + 0.5vw, 1.4rem);
  line-height: 1.28; font-weight: 600; letter-spacing: -0.012em;
  color: var(--ink); text-wrap: balance;
}
.v31 .opts { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.v31 .opt {
  width: 100%; display: flex; align-items: flex-start; gap: 0.7rem;
  text-align: left; cursor: pointer;
  background: oklch(1 0 0 / 0.55);
  border: 1px solid var(--line);
  border-radius: 9px;
  padding: 0.7rem 0.85rem;
  color: var(--ink); font-size: 0.92rem; line-height: 1.32;
  font-family: inherit;
  transition: border-color .18s, background .18s, transform .12s, box-shadow .18s;
}
.v31 .opt:hover {
  border-color: var(--amber);
  background: oklch(0.98 0.02 72);
  box-shadow: 0 4px 18px -8px oklch(0.79 0.135 72 / 0.5);
}
.v31 .opt:focus-visible { outline: 2px solid var(--amber); outline-offset: 2px; }
.v31 .opt-tag {
  flex: 0 0 auto;
  font-family: var(--font-mono), monospace;
  font-size: 0.72rem; font-weight: 600;
  width: 1.4rem; height: 1.4rem; border-radius: 5px;
  display: grid; place-items: center;
  background: var(--screen-inset); color: var(--ink-2);
  border: 1px solid var(--line);
}
.v31 .opt-text { padding-top: 0.06rem; }

/* feedback / ruling */
.v31 .feedback { display: flex; flex-direction: column; gap: 0.9rem; }
.v31 .verdict-row { display: flex; flex-direction: column; gap: 0.4rem; }
.v31 .res {
  display: flex; align-items: flex-start; gap: 0.7rem;
  padding: 0.6rem 0.8rem; border-radius: 9px;
  font-size: 0.9rem; line-height: 1.3;
  border: 1px solid var(--line);
}
.v31 .res-tag {
  flex: 0 0 auto; width: 1.4rem; height: 1.4rem; border-radius: 5px;
  display: grid; place-items: center; font-size: 0.8rem; font-weight: 700;
  font-family: var(--font-mono), monospace;
}
.v31 .res.ok { background: oklch(0.66 0.14 152 / 0.12); border-color: oklch(0.66 0.14 152 / 0.4); color: oklch(0.34 0.08 152); }
.v31 .res.ok .res-tag { background: var(--ok); color: oklch(0.99 0 0); }
.v31 .res.no { background: oklch(0.605 0.2 26 / 0.1); border-color: oklch(0.605 0.2 26 / 0.4); color: oklch(0.42 0.13 26); }
.v31 .res.no .res-tag { background: var(--no); color: oklch(0.99 0 0); }
.v31 .res.mute { color: var(--ink-2); opacity: 0.75; }
.v31 .res.mute .res-tag { background: var(--screen-inset); color: var(--dim); border: 1px solid var(--line); }

.v31 .ruling {
  border-radius: 10px; padding: 0.75rem 0.9rem;
  border-left: none; /* no side-stripe — full field tint */
}
.v31 .ruling.was-ok { background: oklch(0.66 0.14 152 / 0.09); border: 1px solid oklch(0.66 0.14 152 / 0.3); }
.v31 .ruling.was-no { background: oklch(0.79 0.135 72 / 0.1); border: 1px solid oklch(0.79 0.135 72 / 0.32); }
.v31 .ruling-tag {
  display: inline-block; font-size: 0.66rem; font-weight: 700; letter-spacing: 0.07em;
  text-transform: uppercase; margin-bottom: 0.3rem;
}
.v31 .ruling.was-ok .ruling-tag { color: oklch(0.5 0.12 152); }
.v31 .ruling.was-no .ruling-tag { color: oklch(0.55 0.13 60); }
.v31 .ruling-text { margin: 0; font-size: 0.9rem; line-height: 1.42; color: var(--ink); }

.v31 .advance {
  align-self: flex-start;
  display: inline-flex; align-items: center; gap: 0.5rem;
  margin-top: 0.1rem;
  background: var(--ink); color: oklch(0.97 0.006 255);
  border: none; border-radius: 9px;
  padding: 0.62rem 1.15rem; font-family: inherit;
  font-size: 0.9rem; font-weight: 600; cursor: pointer;
  transition: background .18s, transform .12s;
}
.v31 .advance:hover { background: oklch(0.32 0.03 262); transform: translateY(-1px); }
.v31 .advance:focus-visible { outline: 2px solid var(--amber); outline-offset: 2px; }
.v31 .advance-arrow { transition: transform .18s; }
.v31 .advance:hover .advance-arrow { transform: translateX(3px); }

/* ── verdict panel ── */
.v31 .surface.verdict { width: min(680px, 100%); }
.v31 .verdict-body { grid-template-columns: 1fr; text-align: center; place-items: center; padding: clamp(1.6rem, 4vh, 2.8rem); gap: 0.2rem; }
.v31 .score-block { display: flex; flex-direction: column; align-items: center; gap: 0.6rem; }
.v31 .score-lead {
  font-family: var(--font-mono), monospace;
  font-size: 0.72rem; letter-spacing: 0.09em; text-transform: uppercase;
  color: var(--ink-2);
}
.v31 .score-num {
  font-family: var(--font-serif), Georgia, serif;
  font-variant-numeric: tabular-nums;
  display: inline-flex; align-items: baseline; gap: 0.3rem;
  color: var(--ink); line-height: 1;
}
.v31 .score-cur { font-size: clamp(3.4rem, 3rem + 4vw, 5rem); font-weight: 600; }
.v31 .score-of { font-size: 1.2rem; color: var(--dim); font-family: var(--font-sans); }
.v31 .score-tot { font-size: clamp(2rem, 1.6rem + 2vw, 2.8rem); color: var(--ink-2); font-weight: 500; }
.v31 .dots { display: flex; gap: 0.4rem; margin-top: 0.2rem; }
.v31 .dot { width: 0.6rem; height: 0.6rem; border-radius: 50%; }
.v31 .dot.ok { background: var(--ok); }
.v31 .dot.no { background: oklch(0.82 0.05 26); }

.v31 .band {
  margin: 1rem 0 0; max-width: 44ch;
  font-family: var(--font-serif), Georgia, serif;
  font-size: clamp(1.1rem, 1.05rem + 0.5vw, 1.4rem);
  line-height: 1.36; color: var(--ink); text-wrap: balance;
}
.v31 .mechanics {
  margin: 0.7rem 0 0; max-width: 46ch;
  font-size: 0.9rem; line-height: 1.5; color: var(--ink-2); text-wrap: pretty;
}
.v31 .cta-block { display: flex; flex-wrap: wrap; gap: 0.7rem; justify-content: center; margin-top: 1.6rem; }
.v31 .cta-primary {
  display: inline-flex; align-items: center; gap: 0.5rem;
  background: var(--amber); color: oklch(0.24 0.04 60);
  border-radius: 10px; padding: 0.8rem 1.5rem;
  font-weight: 700; font-size: 0.98rem; text-decoration: none;
  box-shadow: 0 10px 30px -10px oklch(0.79 0.135 72 / 0.7);
  transition: transform .15s, box-shadow .15s;
}
.v31 .cta-primary:hover { transform: translateY(-2px); box-shadow: 0 16px 40px -12px oklch(0.79 0.135 72 / 0.8); }
.v31 .cta-primary:focus-visible { outline: 2px solid oklch(0.99 0 0); outline-offset: 3px; }
.v31 .cta-restart {
  display: inline-flex; align-items: center;
  background: transparent; color: var(--ink-2);
  border: 1px solid var(--line); border-radius: 10px;
  padding: 0.8rem 1.3rem; font-family: inherit; font-size: 0.92rem; font-weight: 500;
  cursor: pointer; transition: border-color .18s, color .18s;
}
.v31 .cta-restart:hover { border-color: var(--ink-2); color: var(--ink); }
.v31 .cta-restart:focus-visible { outline: 2px solid var(--amber); outline-offset: 2px; }
.v31 .access {
  margin-top: 1.1rem; font-size: 0.8rem; color: var(--dim);
  text-decoration: none; border-bottom: 1px solid transparent;
  transition: color .18s, border-color .18s;
}
.v31 .access:hover { color: var(--ink-2); border-bottom-color: var(--dim); }

/* ── marginalia + disclaimer ── */
.v31 .foot {
  flex: 0 0 auto;
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 0.6rem 1.4rem;
  padding: clamp(0.7rem, 2vh, 1.2rem) clamp(1rem, 4vw, 2.6rem) clamp(1rem, 2.5vh, 1.6rem);
  border-top: 1px solid oklch(0.4 0.02 258 / 0.3);
}
.v31 .margin {
  display: flex; flex-wrap: wrap; gap: 0.4rem 1.2rem;
  list-style: none; margin: 0; padding: 0;
  font-family: var(--font-mono), monospace;
  font-size: 0.66rem; color: var(--dim-2); letter-spacing: 0.01em;
}
.v31 .margin li { position: relative; padding-left: 0.85rem; }
.v31 .margin li::before {
  content: ""; position: absolute; left: 0; top: 50%; transform: translateY(-50%);
  width: 0.3rem; height: 0.3rem; border-radius: 50%; background: var(--amber); opacity: 0.55;
}
.v31 .disclaimer {
  margin: 0; max-width: 62ch; font-size: 0.72rem; line-height: 1.5;
  color: oklch(0.72 0.015 258); flex: 1 1 320px; min-width: 240px;
}

/* ── responsive: the machine adapts, never becomes sections ── */
@media (max-width: 860px) {
  .v31 .body { grid-template-columns: 1fr; gap: 1rem; }
  .v31 .plate { aspect-ratio: 16 / 10; max-height: 34dvh; }
  .v31 .rail { flex-wrap: wrap; }
  .v31 .bankline { display: none; }
  .v31 .stage { padding-top: 0.4rem; padding-bottom: 0.4rem; }
  .v31 .foot { justify-content: flex-start; }
}
@media (max-width: 520px) {
  .v31 .stub { width: 1.5rem; height: 1.5rem; }
  .v31 .q-text { font-size: 1.05rem; }
  .v31 .margin li:nth-child(3) { display: none; }
}
`;
