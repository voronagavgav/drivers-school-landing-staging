"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ArrowRight, Check } from "lucide-react";
import { QUIZ, DIAL, PLAN, CTA } from "./copy";

// Illustrative demo values only — captioned as a demo, never sold as a real per-user number.
// The readiness show honestly reacts to a WRONG answer too (lower), not just a correct one.
const DIAL_DEMO = { correct: 34, wrong: 9 };
// Plan quota base = a realistic ACTIVE drill pool, NOT the full 2322-question bank — dividing the
// whole bank by days-to-exam is the discredited quota-explosion formula (wave21 plan-honesty).
const ACTIVE_POOL = 800;
// Honest daily ceiling; above it the plan compresses to priorities instead of printing an absurd number.
const PER_DAY_CAP = 40;

// 270° gauge geometry
const R = 54;
const ARC = 2 * Math.PI * R * (270 / 360);

function prefersReduced() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function isoPlusDays(days: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  // Format in LOCAL time — toISOString() would shift the date back a day for any user east of
  // UTC (all of Ukraine), throwing the day count off by one and letting `min` pick yesterday.
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function BlankForm() {
  const [picked, setPicked] = useState<string | null>(null);
  const answered = picked !== null;
  const correct = picked
    ? QUIZ.options.find((o) => o.key === picked)?.correct === true
    : false;

  const todayIso = useMemo(() => isoPlusDays(0), []);
  const [examDate, setExamDate] = useState(() => isoPlusDays(30));

  // Demo readiness show reacts to correctness: correct nudges it up, a wrong answer lower.
  const dialValue = answered ? (correct ? DIAL_DEMO.correct : DIAL_DEMO.wrong) : 0;

  const plan = useMemo(() => {
    const today = new Date(todayIso + "T00:00:00");
    const target = new Date(examDate + "T00:00:00");
    const days = Math.max(1, Math.round((target.getTime() - today.getTime()) / 86_400_000));
    const raw = Math.ceil(ACTIVE_POOL / days);
    const intensive = raw > PER_DAY_CAP;
    const perDay = Math.min(PER_DAY_CAP, Math.max(1, raw));
    return { days, perDay, intensive };
  }, [examDate, todayIso]);

  // Dial ink-in on first answer
  const arcRef = useRef<SVGCircleElement | null>(null);
  const numRef = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const arc = arcRef.current;
    const num = numRef.current;
    if (!arc || !num) return;
    const value = dialValue;
    const offset = ARC * (1 - value / 100);
    if (prefersReduced()) {
      arc.style.strokeDashoffset = String(offset);
      num.textContent = String(value);
      return;
    }
    const proxy = { v: Number(num.textContent) || 0 };
    const startOffset =
      ARC * (1 - proxy.v / 100);
    gsap.fromTo(
      arc,
      { strokeDashoffset: startOffset },
      { strokeDashoffset: offset, duration: 1.1, ease: "expo.out" }
    );
    gsap.to(proxy, {
      v: value,
      duration: 1.1,
      ease: "expo.out",
      onUpdate: () => {
        num.textContent = String(Math.round(proxy.v));
      },
    });
  }, [answered, dialValue]);

  // Printed reveal (dot-matrix feel) for explanation
  const explRef = useRef<HTMLParagraphElement | null>(null);
  useEffect(() => {
    const el = explRef.current;
    if (!el || !answered || prefersReduced()) return;
    gsap.fromTo(
      el,
      { clipPath: "inset(0 100% 0 0)" },
      { clipPath: "inset(0 0% 0 0)", duration: 0.7, ease: "power2.out" }
    );
  }, [answered]);

  // Printed reveal for plan preview line, replays on date change
  const planRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = planRef.current;
    if (!el || prefersReduced()) return;
    gsap.fromTo(
      el,
      { clipPath: "inset(0 100% 0 0)" },
      { clipPath: "inset(0 0% 0 0)", duration: 0.55, ease: "power2.out" }
    );
  }, [plan.days, plan.perDay]);

  return (
    <div className="v18-fields">
      {/* Field 1 — Питання */}
      <section className="v18-field" aria-labelledby="v18-f1">
        <FieldHead n="1" id="v18-f1" label={QUIZ.fieldLabel} note={QUIZ.fieldNote} />
        <p className="v18-question">{QUIZ.question}</p>
        <ul className="v18-options" role="list">
          {QUIZ.options.map((o) => {
            const chosen = picked === o.key;
            const state =
              answered && o.correct
                ? "correct"
                : chosen && !o.correct
                  ? "wrong"
                  : "idle";
            return (
              <li key={o.key}>
                <button
                  type="button"
                  className="v18-option"
                  data-state={state}
                  aria-pressed={chosen}
                  onClick={() => setPicked(o.key)}
                >
                  <span className="v18-tick" aria-hidden="true">
                    {state === "correct" ? <Check size={14} strokeWidth={3} /> : o.key}
                  </span>
                  <span>{o.text}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="v18-answer-live" aria-live="polite">
          {answered && (
            <div className="v18-answer" data-correct={correct}>
              <p className="v18-answer-note">
                {correct ? QUIZ.correctNote : QUIZ.wrongNote}
              </p>
              <p ref={explRef} className="v18-expl">
                {QUIZ.explanation}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Field 2 — Готовність */}
      <section className="v18-field" aria-labelledby="v18-f2">
        <FieldHead n="2" id="v18-f2" label={DIAL.fieldLabel} note={DIAL.caption} />
        <div className="v18-dial-row">
          <div className="v18-dial" role="img" aria-label={`Показник готовності: ${dialValue} зі 100 (демонстрація)`}>
            <svg viewBox="0 0 140 140" width="118" height="118">
              <g transform="rotate(135 70 70)">
                <circle
                  cx="70"
                  cy="70"
                  r={R}
                  fill="none"
                  stroke="var(--v18-rule)"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={`${ARC} ${2 * Math.PI * R}`}
                />
                <circle
                  ref={arcRef}
                  cx="70"
                  cy="70"
                  r={R}
                  fill="none"
                  stroke="var(--v18-violet)"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={`${ARC} ${2 * Math.PI * R}`}
                  strokeDashoffset={ARC}
                />
              </g>
            </svg>
            <div className="v18-dial-center">
              <span ref={numRef} className="v18-dial-num">
                0
              </span>
              <span className="v18-dial-unit">/100</span>
            </div>
          </div>
          <div className="v18-dial-copy">
            <p className="v18-dial-state" aria-live="polite">
              {answered ? (correct ? DIAL.afterCorrect : DIAL.afterWrong) : DIAL.zeroLabel}
            </p>
            <p className="v18-mono-note">{DIAL.demoNote}</p>
          </div>
        </div>
      </section>

      {/* Field 3 — Дата іспиту */}
      <section className="v18-field" aria-labelledby="v18-f3">
        <FieldHead n="3" id="v18-f3" label={PLAN.fieldLabel} note={PLAN.hint} />
        <label className="v18-date">
          <span className="v18-date-label">обрана дата</span>
          <input
            type="date"
            value={examDate}
            min={todayIso}
            onChange={(e) => setExamDate(e.target.value || examDate)}
          />
        </label>
        <div ref={planRef} className="v18-plan" aria-live="polite">
          <div className="v18-plan-line">
            <span className="v18-plan-strong">{PLAN.daysWord(plan.days)}</span>
            {plan.intensive ? (
              <span className="v18-tag">{PLAN.intensive}</span>
            ) : (
              <>
                <span className="v18-plan-dot">·</span>
                <span>{PLAN.perDayWord(plan.perDay)}</span>
              </>
            )}
          </div>
          {plan.intensive && <p className="v18-plan-intensive">{PLAN.intensiveNote}</p>}
          <p className="v18-plan-topics">
            <span className="v18-mono-note">{PLAN.topicsLead}</span>{" "}
            {PLAN.topics.join(" · ")}
          </p>
          <p className="v18-mono-note">{PLAN.fsrsNote}</p>
          <p className="v18-retaker">{PLAN.retaker}</p>
        </div>
      </section>

      {/* Field 4 — submit */}
      <section className="v18-field v18-field-last" aria-labelledby="v18-f4">
        <FieldHead n="4" id="v18-f4" label="Почати" note="усе безкоштовно" />
        <div className="v18-cta-row">
          <a className="v18-btn-primary" href={CTA.primaryHref}>
            {CTA.primary}
            <ArrowRight size={18} strokeWidth={2.4} />
          </a>
          <a className="v18-btn-secondary" href={CTA.secondaryHref}>
            {CTA.secondary}
          </a>
        </div>
        <ul className="v18-reassure" role="list">
          {CTA.reassure.map((r) => (
            <li key={r}>
              <Check size={13} strokeWidth={3} /> {r}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function FieldHead({
  n,
  id,
  label,
  note,
}: {
  n: string;
  id: string;
  label: string;
  note: string;
}) {
  return (
    <div className="v18-field-head">
      <span className="v18-field-n" aria-hidden="true">
        {n}
      </span>
      <h2 id={id} className="v18-field-label">
        {label}
      </h2>
      <span className="v18-field-note">{note}</span>
    </div>
  );
}
