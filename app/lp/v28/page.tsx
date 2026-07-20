"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Gauge,
  CalendarClock,
  Waypoints,
  Route,
} from "lucide-react";
import {
  NAV,
  HERO,
  HERO_VARIANTS,
  LANES,
  CONVERGE,
  DIAL,
  MECHANISM,
  DATE,
  SIMULATOR,
  LOSS,
  PRICING,
  BASE,
  FAQ,
  FINAL,
  FOOTER,
  STATS,
  ANON_TRY_HREF,
} from "./copy";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* ------------------------------------------------------------------ palette — night asphalt + paint */
const BG = "#141619"; // asphalt near-black, cool graphite cast (never pure #000)
const SURFACE = "#1C2026";
const SURFACE2 = "#23292F";
const INK = "#EDECE4"; // road-paint warm-white — text AND marking color (the duotone)
const MUTED = "#A6ACB1"; // graphite secondary — AA on dark
const FAINT = "#878D93"; // labels
const AMBER = "#F2A93B"; // the ONE accent — CTA pills, dial needle, третя смуга
const AMBER_DIM = "#C98A2E";
const LINE = "rgba(237,236,228,0.12)";
const LINE_STRONG = "rgba(237,236,228,0.20)";
// light interludes flip the ground
const L_BG = "#EDECE4";
const L_INK = "#1A1D21";
const L_MUTED = "#4B4F53";
const L_LINE = "rgba(26,29,33,0.14)";

const DISPLAY = "var(--font-display), system-ui, sans-serif";
const MONO = "var(--font-mono), ui-monospace, monospace";

const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(" ");
const clampN = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// asphalt grain — inline feTurbulence noise, low opacity, no external asset
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

/* ------------------------------------------------------------------ CTA pills */
function PrimaryCta({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "group inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-[0.98rem] font-bold transition-transform duration-200 will-change-transform hover:-translate-y-0.5",
        className,
      )}
      style={{
        background: AMBER,
        color: "#231703",
        boxShadow: "0 10px 34px -12px rgba(242,169,59,0.6)",
        fontFamily: DISPLAY,
      }}
    >
      {children}
      <ArrowRight className="h-[1.05em] w-[1.05em] transition-transform duration-200 group-hover:translate-x-0.5" />
    </Link>
  );
}

function GhostCta({
  href,
  children,
  className,
  ariaLabel,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={cx(
        "group inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-[0.98rem] font-bold transition-colors duration-200",
        className,
      )}
      style={{
        color: INK,
        border: `1px solid ${LINE_STRONG}`,
        background: "rgba(237,236,228,0.02)",
        fontFamily: DISPLAY,
      }}
    >
      {children}
      <ArrowUpRight className="h-[1.05em] w-[1.05em] opacity-70 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  );
}

function CtaPair({ align = "start" }: { align?: "start" | "center" }) {
  return (
    <div
      className={cx(
        "flex flex-col gap-3 sm:flex-row sm:items-center",
        align === "center" && "sm:justify-center",
      )}
    >
      <PrimaryCta href="/register">{HERO.ctaPrimary}</PrimaryCta>
      <GhostCta href={ANON_TRY_HREF} ariaLabel="спробувати без реєстрації">
        {HERO.ctaSecondary}
      </GhostCta>
    </div>
  );
}

/* ------------------------------------------------------------------ section header anchored left of centerline */
function SectionHead({
  kicker,
  title,
  sub,
  ink = INK,
  muted = MUTED,
  faint = FAINT,
}: {
  kicker: string;
  title: string;
  sub?: string;
  ink?: string;
  muted?: string;
  faint?: string;
}) {
  return (
    <div className="max-w-2xl">
      <div
        className="mb-4 inline-flex items-center gap-2 text-[0.72rem] font-medium uppercase tracking-[0.22em]"
        style={{ color: faint, fontFamily: MONO }}
      >
        <span
          aria-hidden
          className="inline-block h-[2px] w-7 rounded-full"
          style={{ background: AMBER }}
        />
        {kicker}
      </div>
      <h2
        className="text-balance text-[clamp(1.9rem,4.6vw,3.3rem)] font-bold leading-[1.02]"
        style={{ color: ink, fontFamily: DISPLAY, letterSpacing: "-0.02em" }}
      >
        {title}
      </h2>
      {sub && (
        <p
          className="mt-4 max-w-xl text-pretty text-[1.02rem] leading-[1.65]"
          style={{ color: muted }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ HERO lanes — perspective SVG road */
function HeroLanes({ drawRef }: { drawRef: React.RefObject<SVGSVGElement | null> }) {
  // VP below the fold at (600,1040). Two lanes: outer-left / center-divider / outer-right.
  return (
    <svg
      ref={drawRef}
      viewBox="0 0 1200 900"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id="laneFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={INK} stopOpacity="0.02" />
          <stop offset="0.5" stopColor={INK} stopOpacity="0.5" />
          <stop offset="1" stopColor={INK} stopOpacity="0.9" />
        </linearGradient>
        <radialGradient id="headlamp" cx="0.5" cy="0.86" r="0.7">
          <stop offset="0" stopColor={AMBER} stopOpacity="0.16" />
          <stop offset="0.5" stopColor={AMBER} stopOpacity="0.03" />
          <stop offset="1" stopColor={AMBER} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* warm headlamp glow toward the vanishing point */}
      <rect x="0" y="0" width="1200" height="900" fill="url(#headlamp)" />
      {/* outer lane edges (solid paint) — start near the frame edges so they FRAME the columns and
          converge below the fold, rather than slicing across the headline / ghost CTA */}
      <path
        className="lane-draw"
        d="M80 0 L600 1040"
        stroke="url(#laneFade)"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="lane-draw"
        d="M1120 0 L600 1040"
        stroke="url(#laneFade)"
        strokeWidth="4"
        fill="none"
      />
      {/* center divider (dashed road marking — the mechanic both lanes share); sits in the column
          gutter. Lightened so its lower dashes never fight the end of the headline. */}
      <path
        className="lane-draw lane-center"
        d="M600 0 L600 1040"
        stroke={INK}
        strokeOpacity="0.5"
        strokeWidth="5"
        strokeDasharray="34 30"
        fill="none"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ HERO question card (interactive, mini meter) */
function HeroQuiz() {
  const q = HERO.quiz;
  const [picked, setPicked] = useState<string | null>(null);
  const answered = picked !== null;
  const correct = picked === q.options.find((o) => o.correct)?.key;

  return (
    <div
      className="relative w-full overflow-hidden rounded-[26px] p-5 sm:p-6"
      style={{
        background: `linear-gradient(180deg, ${SURFACE} 0%, ${SURFACE2} 100%)`,
        border: `1px solid ${LINE_STRONG}`,
        boxShadow:
          "0 40px 90px -40px rgba(0,0,0,0.8), 0 0 0 1px rgba(242,169,59,0.06), 0 2px 0 rgba(237,236,228,0.04) inset",
      }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <span
          className="rounded-full px-2.5 py-1 text-[0.7rem] font-bold"
          style={{ background: "rgba(237,236,228,0.08)", color: MUTED, fontFamily: MONO }}
        >
          № {q.number}
        </span>
        <span className="text-[0.72rem]" style={{ color: FAINT }}>
          {q.label.split(".")[0]}. Без реєстрації.
        </span>
      </div>

      {/* restyled official image — proves «оновлені зображення» in-viewport */}
      <div
        className="mb-4 overflow-hidden rounded-[16px]"
        style={{ border: `1px solid ${LINE}`, background: "#0F1113" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/restyled-live/${q.imageKey}.png`}
          alt="Дорожня ситуація до питання 15.10: зупинка жовтого автомобіля"
          className="h-[168px] w-full object-cover sm:h-[184px]"
          loading="eager"
        />
      </div>

      <p
        className="text-[1.02rem] font-bold leading-snug"
        style={{ color: INK, fontFamily: DISPLAY }}
      >
        {q.question}
      </p>

      <div className="mt-3.5 flex flex-col gap-2">
        {q.options.map((o, i) => {
          const isPicked = picked === o.key;
          const showCorrect = answered && o.correct;
          const showWrong = answered && isPicked && !o.correct;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => !answered && setPicked(o.key)}
              disabled={answered}
              className="flex items-center gap-3 rounded-[13px] px-3.5 py-2.5 text-left text-[0.92rem] transition-colors duration-150"
              style={{
                background: showCorrect
                  ? "rgba(154,217,184,0.12)"
                  : showWrong
                    ? "rgba(226,120,90,0.12)"
                    : "rgba(237,236,228,0.03)",
                border: `1px solid ${
                  showCorrect
                    ? "rgba(154,217,184,0.5)"
                    : showWrong
                      ? "rgba(226,120,90,0.5)"
                      : LINE
                }`,
                color: answered && !showCorrect && !isPicked ? FAINT : INK,
                cursor: answered ? "default" : "pointer",
              }}
            >
              <span
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[0.75rem] font-bold"
                style={{
                  background: showCorrect
                    ? "rgba(154,217,184,0.9)"
                    : showWrong
                      ? "rgba(226,120,90,0.9)"
                      : "rgba(237,236,228,0.08)",
                  color: showCorrect || showWrong ? "#161616" : MUTED,
                  fontFamily: MONO,
                }}
              >
                {showCorrect ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                ) : (
                  String.fromCharCode(65 + i)
                )}
              </span>
              {o.text}
            </button>
          );
        })}
      </div>

      {/* answer feedback — this is a training rep, not an exam */}
      <p
        className="mt-4 min-h-[1.2rem] text-[0.86rem] leading-snug"
        style={{ color: answered ? (correct ? "#9AD9B8" : MUTED) : FAINT }}
      >
        {answered ? (correct ? q.correctNote : q.wrongNote) : "Обери відповідь — це тренування, а не іспит."}
      </p>

      {/* FIRST DATA POINT — one answer fills exactly ONE notch, same for a right or a wrong pick: a
          recorded point, never a calibrated «готовність %». A wrong answer must NEVER move a readiness
          number (the real dial needs many real answers — see FAQ / the reserved calibration slot). */}
      <div className="mt-3.5 flex h-[6px] w-full items-center gap-[3px]" aria-hidden>
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="h-full flex-1 rounded-sm transition-colors duration-500"
            style={{ background: answered && i === 0 ? AMBER : "rgba(237,236,228,0.08)" }}
          />
        ))}
      </div>
      <p className="mt-2.5 min-h-[1.1rem] text-[0.8rem] leading-snug" style={{ color: FAINT }}>
        {answered ? q.meterFirst : q.meterIdle}
      </p>

      <Link
        href={ANON_TRY_HREF}
        className="mt-3 inline-flex items-center gap-1.5 text-[0.85rem] font-bold"
        style={{ color: AMBER, fontFamily: DISPLAY }}
      >
        {q.tryFull}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ readiness dial (decays) */
function ReadinessDial() {
  const [val, setVal] = useState(74);
  const [decayed, setDecayed] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const START = 74;
  const LOW = 58;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReduced()) {
      setVal(LOW);
      setDecayed(true);
      return;
    }
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top 72%",
      once: true,
      onEnter: () => {
        const o = { v: START };
        gsap.to(o, {
          v: LOW,
          duration: 2.1,
          delay: 0.5,
          ease: "expo.out",
          onUpdate: () => setVal(Math.round(o.v)),
          onComplete: () => setDecayed(true),
        });
      },
    });
    return () => st.kill();
  }, []);

  // gauge geometry: 240° sweep, -120°..+120°
  const R = 92;
  const CX = 120;
  const CY = 120;
  const a0 = -210; // start angle (deg)
  const sweep = 240;
  const frac = clampN(val, 0, 100) / 100;
  const polar = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) };
  };
  const arcPath = (from: number, to: number) => {
    const s = polar(from);
    const e = polar(to);
    const large = to - from > 180 ? 1 : 0;
    return `M ${s.x.toFixed(1)} ${s.y.toFixed(1)} A ${R} ${R} 0 ${large} 1 ${e.x.toFixed(1)} ${e.y.toFixed(1)}`;
  };
  const needleAngle = a0 + sweep * frac;
  const nx = CX + (R - 16) * Math.cos((needleAngle * Math.PI) / 180);
  const ny = CY + (R - 16) * Math.sin((needleAngle * Math.PI) / 180);

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-[24px] p-6 sm:p-8"
      style={{
        background: `radial-gradient(120% 100% at 50% 0%, #26201A 0%, ${SURFACE} 55%)`,
        border: `1px solid rgba(242,169,59,0.3)`,
        boxShadow: "0 40px 100px -50px rgba(242,169,59,0.35), 0 0 0 1px rgba(242,169,59,0.05)",
      }}
    >
      {/* illustrative demo — the 58% is an EXAMPLE trajectory, not a real user's calibrated number */}
      <span
        className="absolute right-5 top-5 rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em]"
        style={{ background: "rgba(237,236,228,0.06)", color: FAINT, fontFamily: MONO }}
      >
        {DIAL.exampleTag}
      </span>
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-9">
        <div className="relative shrink-0" style={{ width: 240, height: 176 }}>
          <svg viewBox="0 0 240 176" className="h-full w-full" aria-hidden>
            {/* track */}
            <path d={arcPath(a0, a0 + sweep)} stroke="rgba(237,236,228,0.12)" strokeWidth="14" fill="none" strokeLinecap="round" />
            {/* value arc */}
            <path
              d={arcPath(a0, needleAngle)}
              stroke={AMBER}
              strokeWidth="14"
              fill="none"
              strokeLinecap="round"
              style={{ filter: "drop-shadow(0 0 10px rgba(242,169,59,0.5))" }}
            />
            {/* needle */}
            <line x1={CX} y1={CY} x2={nx} y2={ny} stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
            <circle cx={CX} cy={CY} r="7" fill={INK} />
            <circle cx={CX} cy={CY} r="3" fill={AMBER} />
          </svg>
          <div className="pointer-events-none absolute inset-x-0 bottom-2 flex flex-col items-center">
            <span
              className="text-[2.9rem] font-bold leading-none tabular-nums"
              style={{ color: AMBER, fontFamily: MONO }}
            >
              {val}
              <span className="text-[1.3rem]">%</span>
            </span>
            <span className="mt-1 text-[0.72rem] uppercase tracking-[0.15em]" style={{ color: FAINT, fontFamily: MONO }}>
              {DIAL.metricLabel}
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-[1.35rem] font-bold leading-tight" style={{ color: INK, fontFamily: DISPLAY }}>
            {DIAL.caption}
          </p>
          <p className="mt-2.5 text-[0.98rem] leading-[1.6]" style={{ color: MUTED }}>
            {decayed ? DIAL.decayNote : DIAL.cardLead}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.78rem] font-bold"
              style={{ background: "rgba(242,169,59,0.12)", color: AMBER, fontFamily: MONO }}
            >
              <Gauge className="h-3.5 w-3.5" />
              {DIAL.engine}
            </span>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.78rem]"
              style={{ background: "rgba(237,236,228,0.05)", color: MUTED, border: `1px solid ${LINE}`, fontFamily: MONO }}
            >
              {DIAL.decayToggle} → −16
            </span>
          </div>
        </div>
      </div>

      <p
        className="mt-6 border-t pt-5 text-[0.95rem] leading-[1.6]"
        style={{ borderColor: LINE, color: MUTED }}
      >
        {DIAL.moat}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ exam-date picker */
function DatePlanner() {
  const [date, setDate] = useState("");
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const parsed = date ? new Date(date + "T00:00:00") : null;
  const daysLeft = parsed ? Math.round((parsed.getTime() - today.getTime()) / 86400000) : null;
  const valid = daysLeft !== null && daysLeft >= 1;
  const perDay = valid ? Math.max(1, Math.ceil(STATS.planPool / daysLeft!)) : null;

  let note = DATE.noDate;
  if (date && !valid) note = DATE.invalid;
  else if (valid) {
    if (daysLeft! <= 7) note = DATE.urgent;
    else if (daysLeft! <= 21) note = DATE.intensive;
    else note = DATE.calm;
  }

  const minDate = new Date(today.getTime() + 86400000).toISOString().slice(0, 10);

  return (
    <div
      className="overflow-hidden rounded-[22px] p-6 sm:p-7"
      style={{ background: SURFACE, border: `1px solid ${LINE_STRONG}` }}
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
        <label className="block flex-1">
          <span className="mb-2 block text-[0.78rem] uppercase tracking-wide" style={{ color: FAINT, fontFamily: MONO }}>
            {DATE.inputLabel}
          </span>
          <input
            type="date"
            value={date}
            min={minDate}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-[13px] px-4 py-3 text-[1rem] outline-none"
            style={{
              background: "#0F1113",
              border: `1px solid ${LINE_STRONG}`,
              color: INK,
              colorScheme: "dark",
              fontFamily: MONO,
            }}
          />
        </label>

        <div className="flex flex-1 items-stretch gap-4">
          <div className="flex-1 rounded-[13px] px-4 py-3" style={{ background: "rgba(242,169,59,0.08)", border: `1px solid rgba(242,169,59,0.22)` }}>
            <div className="text-[1.9rem] font-bold leading-none tabular-nums" style={{ color: valid ? AMBER : FAINT, fontFamily: MONO }}>
              {perDay ?? "—"}
            </div>
            <div className="mt-1 text-[0.74rem]" style={{ color: MUTED, fontFamily: MONO }}>
              {DATE.perDay}
            </div>
          </div>
          <div className="flex-1 rounded-[13px] px-4 py-3" style={{ background: "rgba(237,236,228,0.04)", border: `1px solid ${LINE}` }}>
            <div className="text-[1.9rem] font-bold leading-none tabular-nums" style={{ color: valid ? INK : FAINT, fontFamily: MONO }}>
              {valid ? daysLeft : "—"}
            </div>
            <div className="mt-1 text-[0.74rem]" style={{ color: MUTED, fontFamily: MONO }}>
              {DATE.daysLeft}
            </div>
          </div>
        </div>
      </div>

      {/* shrinking plan preview bar */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between text-[0.74rem]" style={{ color: FAINT, fontFamily: MONO }}>
          <span>{DATE.planLabel}</span>
          <span>{valid ? `≈ ${daysLeft} × ${perDay}` : "постав дату"}</span>
        </div>
        <div className="flex h-[10px] w-full items-center gap-[3px] overflow-hidden">
          {Array.from({ length: 28 }).map((_, i) => {
            const active = valid ? i < Math.min(28, Math.max(2, Math.round((daysLeft! / 60) * 28))) : false;
            return (
              <span
                key={i}
                className="h-full flex-1 rounded-sm transition-colors duration-300"
                style={{ background: active ? AMBER : "rgba(237,236,228,0.08)" }}
              />
            );
          })}
        </div>
      </div>

      <p className="mt-4 text-[0.9rem] leading-snug" style={{ color: valid ? MUTED : FAINT }}>
        {note}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ FAQ accordion */
function FaqItem({ q, a, defaultOpen }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div style={{ borderBottom: `1px solid ${LINE}` }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
        aria-expanded={open}
      >
        <span className="text-[1.02rem] font-bold" style={{ color: INK, fontFamily: DISPLAY }}>
          {q}
        </span>
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[1rem] transition-transform duration-200"
          style={{ background: "rgba(237,236,228,0.06)", color: AMBER, transform: open ? "rotate(45deg)" : "none" }}
          aria-hidden
        >
          +
        </span>
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <p className="max-w-2xl pb-5 text-[0.98rem] leading-[1.7]" style={{ color: MUTED }}>
            {a}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ headline renderer */
function Headline({
  rows,
  ink = INK,
  muted = MUTED,
}: {
  rows: { t: string; muted?: boolean }[][];
  ink?: string;
  muted?: string;
}) {
  return (
    <>
      {rows.map((row, i) => (
        <span key={i} className="block">
          {row.map((tok, j) => (
            <span key={j} style={{ color: tok.muted ? muted : ink }}>
              {tok.t}
            </span>
          ))}
        </span>
      ))}
    </>
  );
}

/* ================================================================== PAGE */
export default function V28Page() {
  const root = useRef<HTMLDivElement | null>(null);
  const heroLanes = useRef<SVGSVGElement | null>(null);
  const hv = HERO_VARIANTS[HERO.variant];

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduce = prefersReduced();

    const ctx = gsap.context(() => {
      // hero lanes draw in
      const lanes = gsap.utils.toArray<SVGPathElement>(".lane-draw");
      lanes.forEach((p) => {
        const len = p.getTotalLength();
        gsap.set(p, { strokeDasharray: p.classList.contains("lane-center") ? "34 30" : len, strokeDashoffset: reduce ? 0 : len });
      });
      if (!reduce) {
        gsap.to(lanes, { strokeDashoffset: 0, duration: 1.5, ease: "power2.out", stagger: 0.12 });
      }

      if (reduce) {
        gsap.set("[data-reveal]", { opacity: 1, y: 0 });
        gsap.set(".dash-widen", { scaleX: 1 });
        return;
      }

      // section reveals
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((node) => {
        gsap.fromTo(
          node,
          { opacity: 0, y: 34 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: { trigger: node, start: "top 84%" },
          },
        );
      });

      // hero content stagger on load
      gsap.fromTo(
        "[data-hero-item]",
        { opacity: 0, y: 26 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.1, delay: 0.15 },
      );

      // mechanism dash spacing widens (FSRS interval metaphor)
      gsap.utils.toArray<HTMLElement>(".dash-widen").forEach((node) => {
        gsap.fromTo(
          node,
          { "--gap": "6px" } as gsap.TweenVars,
          {
            "--gap": "30px",
            ease: "none",
            scrollTrigger: { trigger: node, start: "top 80%", end: "top 30%", scrub: 1 },
          } as gsap.TweenVars,
        );
      });
    }, root);

    return () => ctx.revert();
  }, []);

  const duo = (v: string) => v; // keep decimal comma

  return (
    <div
      ref={root}
      className="relative min-h-screen w-full overflow-x-hidden"
      style={{ background: BG, color: INK, fontFamily: DISPLAY }}
    >
      {/* page grain */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.05] mix-blend-soft-light"
        style={{ backgroundImage: GRAIN, backgroundSize: "160px 160px" }}
      />

      {/* NAV */}
      <header
        className="sticky top-0 z-40 backdrop-blur-md"
        style={{ background: "rgba(20,22,25,0.72)", borderBottom: `1px solid ${LINE}` }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5" style={{ fontFamily: DISPLAY }}>
            <span
              className="grid h-8 w-8 place-items-center rounded-lg"
              style={{ background: AMBER, color: "#231703" }}
              aria-hidden
            >
              <Route className="h-[18px] w-[18px]" strokeWidth={2.4} />
            </span>
            <span className="text-[1.05rem] font-bold tracking-tight">{NAV.wordmark}</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-[0.9rem] font-bold transition-colors"
              style={{ color: MUTED }}
            >
              {NAV.login}
            </Link>
            <Link
              href="/register"
              className="rounded-full px-4 py-2 text-[0.9rem] font-bold"
              style={{ background: AMBER, color: "#231703" }}
            >
              {NAV.register}
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* ============================================ HERO */}
        <section className="relative overflow-hidden">
          {/* DESKTOP: full perspective lanes framing the two columns. Below lg the viewBox slice-scaled
              the center dashes to ~20px opaque bars straight down the content column (a rendering-defect
              read + text-on-dash illegibility), so mobile gets a thin 2px paint SPINE instead — the
              concept's own mobile «thin spine» treatment. */}
          <div className="pointer-events-none absolute inset-0 hidden lg:block">
            <HeroLanes drawRef={heroLanes} />
          </div>
          <div className="pointer-events-none absolute inset-0 lg:hidden" aria-hidden>
            <div
              className="absolute inset-0"
              style={{ background: "radial-gradient(120% 70% at 50% 0%, rgba(242,169,59,0.10), transparent 60%)" }}
            />
            <div
              className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2"
              style={{
                backgroundImage: `repeating-linear-gradient(to bottom, ${INK} 0 14px, transparent 14px 30px)`,
                opacity: 0.1,
                maskImage: "linear-gradient(to bottom, transparent, #000 12%, #000 88%, transparent)",
                WebkitMaskImage: "linear-gradient(to bottom, transparent, #000 12%, #000 88%, transparent)",
              }}
            />
          </div>
          {/* asphalt vignette */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: `radial-gradient(120% 80% at 50% -10%, rgba(242,169,59,0.06), transparent 55%)` }}
          />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-5 pb-24 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14 lg:pb-28">
            <div>
              <div
                data-hero-item
                className="mb-6 inline-flex items-center gap-2.5 rounded-full px-3.5 py-1.5 text-[0.74rem] font-bold uppercase tracking-[0.16em]"
                style={{ background: "rgba(237,236,228,0.05)", border: `1px solid ${LINE}`, color: MUTED, fontFamily: MONO }}
              >
                <Waypoints className="h-3.5 w-3.5" style={{ color: AMBER }} />
                {HERO.kicker}
              </div>

              {/* run-on two-tone headline split across the lane axis */}
              <h1
                data-hero-item
                className="text-balance text-[clamp(2.4rem,7vw,5.4rem)] font-bold leading-[0.98]"
                style={{ fontFamily: DISPLAY, letterSpacing: "-0.025em" }}
              >
                <Headline rows={hv.headline} muted="#7E858B" />
              </h1>

              <p
                data-hero-item
                className="mt-6 max-w-xl text-pretty text-[1.1rem] leading-[1.6]"
                style={{ color: MUTED }}
              >
                {hv.subhead}
              </p>

              {/* «Лише 1 з 5» chip — visible without scroll */}
              <div
                data-hero-item
                className="mt-6 inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-[0.9rem] font-bold"
                style={{ background: "rgba(242,169,59,0.1)", border: `1px solid rgba(242,169,59,0.28)`, color: INK }}
              >
                <span className="whitespace-nowrap tabular-nums" style={{ color: AMBER, fontFamily: MONO }}>1 з 5</span>
                <span style={{ color: MUTED }} className="font-normal">
                  {HERO.hookLead} — за даними {STATS.year}
                </span>
              </div>

              <div data-hero-item className="mt-7">
                <CtaPair />
              </div>

              {/* proof chips */}
              <div data-hero-item className="mt-7 flex flex-wrap gap-x-5 gap-y-2">
                {HERO.chips.map((c) => (
                  <span key={c} className="inline-flex items-center gap-2 text-[0.85rem]" style={{ color: FAINT }}>
                    <span className="h-1 w-1 rounded-full" style={{ background: AMBER }} />
                    {c}
                  </span>
                ))}
              </div>
            </div>

            <div data-hero-item className="relative">
              {/* lane labels flanking the card */}
              <div className="mb-3 flex items-center justify-between px-1 text-[0.78rem] font-bold uppercase tracking-[0.18em]" style={{ fontFamily: MONO }}>
                <span style={{ color: MUTED }}>← {HERO.laneSelf}</span>
                <span style={{ color: MUTED }}>{HERO.laneSchool} →</span>
              </div>
              <HeroQuiz />
            </div>
          </div>
        </section>

        {/* ============================================ ДВІ СМУГИ — mirrored parallel beats */}
        <section className="relative mx-auto max-w-6xl px-5 py-24 sm:px-8 lg:py-28">
          <div data-reveal>
            <SectionHead kicker="дві смуги" title={LANES.heading} sub={LANES.sub} />
          </div>

          <div className="relative mt-14">
            {/* centerline spine — kept on mobile too (2px) so the lane metaphor survives between the
                stacked beats as a thin dashed road, not only on desktop */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 lg:w-[3px]"
              style={{
                backgroundImage: `repeating-linear-gradient(to bottom, ${INK} 0 22px, transparent 22px 44px)`,
                opacity: 0.3,
              }}
            />
            <div className="grid gap-x-14 gap-y-8 lg:grid-cols-2">
              {[LANES.self, LANES.school].map((lane, li) => (
                <div key={lane.name} className="flex flex-col gap-4" data-reveal>
                  <div className={cx("flex items-baseline gap-3", li === 1 && "lg:flex-row-reverse lg:text-right")}>
                    <span className="text-[1.5rem] font-bold" style={{ color: INK, fontFamily: DISPLAY }}>
                      {lane.name}
                    </span>
                    <span className="text-[0.8rem] uppercase tracking-wide" style={{ color: FAINT, fontFamily: MONO }}>
                      {lane.tag}
                    </span>
                  </div>
                  {lane.beats.map((b) => (
                    <div
                      key={b.head}
                      className="rounded-[16px] p-5"
                      style={{ background: SURFACE, border: `1px solid ${LINE}` }}
                    >
                      <p className="text-[1.02rem] font-bold" style={{ color: INK, fontFamily: DISPLAY }}>
                        {b.head}
                      </p>
                      <p className="mt-1.5 text-[0.94rem] leading-[1.55]" style={{ color: MUTED }}>
                        {b.body}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <p data-reveal className="mt-12 text-center text-[1.15rem] font-bold" style={{ color: MUTED, fontFamily: DISPLAY }}>
            {LANES.merge}
          </p>
        </section>

        {/* ============================================ ЗБІГ — convergence (LIGHT band) */}
        <section className="relative overflow-hidden py-24 sm:py-28" style={{ background: L_BG, color: L_INK }}>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: GRAIN, backgroundSize: "160px 160px" }}
          />
          <div className="relative mx-auto max-w-5xl px-5 text-center sm:px-8" data-reveal>
            {/* the two lanes carried down from ДВІ СМУГИ, MERGING into one at the band's top edge —
                the geometry makes «одні двері» physical (static composition, reduced-motion safe) */}
            <svg viewBox="0 0 400 96" className="mx-auto mb-7 block h-[64px] w-full max-w-sm" aria-hidden>
              <path d="M40 0 L200 74" fill="none" stroke={L_INK} strokeOpacity="0.28" strokeWidth="2.5" strokeDasharray="9 10" />
              <path d="M360 0 L200 74" fill="none" stroke={L_INK} strokeOpacity="0.28" strokeWidth="2.5" strokeDasharray="9 10" />
              <path d="M200 70 L200 96" fill="none" stroke={AMBER_DIM} strokeWidth="3" strokeLinecap="round" />
              <circle cx="200" cy="73" r="4.5" fill={AMBER_DIM} />
            </svg>
            <div className="mb-4 inline-flex items-center gap-2 text-[0.72rem] font-medium uppercase tracking-[0.22em]" style={{ color: L_MUTED, fontFamily: MONO }}>
              <span className="inline-block h-[2px] w-7 rounded-full" style={{ background: AMBER_DIM }} />
              {CONVERGE.kicker}
            </div>
            <div className="flex flex-col items-stretch justify-center gap-6 sm:flex-row sm:items-end sm:gap-4">
              <div className="flex-1">
                <div className="text-[clamp(3.6rem,12vw,7rem)] font-bold leading-none tabular-nums" style={{ fontFamily: MONO, letterSpacing: "-0.03em" }}>
                  {duo(CONVERGE.self.value)}%
                </div>
                <div className="mx-auto mt-2 max-w-[16rem] text-[0.92rem] leading-snug" style={{ color: L_MUTED }}>
                  {CONVERGE.self.label}
                </div>
              </div>
              <div className="hidden self-center pb-8 text-[2rem] font-bold sm:block" style={{ color: L_LINE.replace("0.14", "0.35") }} aria-hidden>
                /
              </div>
              <div className="flex-1">
                <div className="text-[clamp(3.6rem,12vw,7rem)] font-bold leading-none tabular-nums" style={{ fontFamily: MONO, letterSpacing: "-0.03em" }}>
                  {duo(CONVERGE.school.value)}%
                </div>
                <div className="mx-auto mt-2 max-w-[16rem] text-[0.92rem] leading-snug" style={{ color: L_MUTED }}>
                  {CONVERGE.school.label}
                </div>
              </div>
            </div>

            <p className="mx-auto mt-10 max-w-2xl text-balance text-[clamp(1.3rem,3.4vw,2rem)] font-bold leading-[1.25]" style={{ fontFamily: DISPLAY, letterSpacing: "-0.01em" }}>
              {CONVERGE.reading}
            </p>
            <p className="mx-auto mt-4 max-w-xl text-[0.92rem] leading-relaxed" style={{ color: L_MUTED }}>
              {CONVERGE.foot}
            </p>
          </div>
        </section>

        {/* ============================================ ТРЕТЯ СМУГА — dial */}
        <section className="relative mx-auto max-w-6xl px-5 py-24 sm:px-8 lg:py-28">
          <div data-reveal className="mb-8">
            <SectionHead kicker={DIAL.kicker} title={DIAL.heading} sub={DIAL.lead} />
          </div>
          {/* a NEW third lane OPENS in amber (the product colour) and angles down into the dial card —
              the «третя смуга» reveal carried as geometry, not just a glow card */}
          <div data-reveal aria-hidden className="mb-2 flex justify-center lg:justify-start">
            <svg viewBox="0 0 240 72" className="h-[52px] w-[210px]">
              <path d="M120 0 L58 72" fill="none" stroke={AMBER} strokeOpacity="0.5" strokeWidth="2.5" strokeDasharray="9 10" />
              <path d="M120 0 L200 72" fill="none" stroke={AMBER} strokeOpacity="0.5" strokeWidth="2.5" strokeDasharray="9 10" />
              <path d="M120 4 L120 50" fill="none" stroke={AMBER} strokeWidth="3" strokeLinecap="round" strokeDasharray="7 11" />
            </svg>
          </div>
          <div data-reveal>
            <ReadinessDial />
          </div>
        </section>

        {/* ============================================ РОЗМІТКА МЕХАНІЗМУ */}
        <section className="relative mx-auto max-w-6xl px-5 py-24 sm:px-8 lg:py-28">
          <div data-reveal className="mb-12">
            <SectionHead kicker={MECHANISM.kicker} title={MECHANISM.heading} />
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {MECHANISM.steps.map((s, i) => (
              <div key={s.no} data-reveal className="relative rounded-[18px] p-6" style={{ background: SURFACE, border: `1px solid ${LINE}` }}>
                <div className="flex items-center gap-3">
                  <span
                    className="text-[2.2rem] font-bold leading-none"
                    style={{ color: "transparent", WebkitTextStroke: `1.5px ${i === 1 ? AMBER : LINE_STRONG}`, fontFamily: MONO }}
                  >
                    {s.no}
                  </span>
                  {/* road-dash graphic; step 02 widens (FSRS interval metaphor) */}
                  <span
                    className={cx("dash-widen h-[6px] flex-1 rounded-full")}
                    aria-hidden
                    style={
                      i === 1
                        ? ({
                            "--gap": "6px",
                            backgroundImage: `repeating-linear-gradient(to right, ${AMBER} 0 14px, transparent 14px calc(14px + var(--gap)))`,
                          } as React.CSSProperties)
                        : { backgroundImage: `repeating-linear-gradient(to right, ${LINE_STRONG} 0 14px, transparent 14px 26px)` }
                    }
                  />
                </div>
                <p className="mt-5 text-[1.15rem] font-bold" style={{ color: INK, fontFamily: DISPLAY }}>
                  {s.head}
                </p>
                <p className="mt-2 text-[0.95rem] leading-[1.6]" style={{ color: MUTED }}>
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================ ТВОЯ ДАТА */}
        <section className="relative mx-auto max-w-6xl px-5 py-24 sm:px-8 lg:py-28">
          <div data-reveal className="mb-12">
            <SectionHead kicker={DATE.kicker} title={DATE.heading} sub={DATE.lead} />
          </div>
          <div data-reveal>
            <DatePlanner />
          </div>
        </section>

        {/* ============================================ СИМУЛЯТОР */}
        <section className="relative mx-auto max-w-6xl px-5 py-24 sm:px-8 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div data-reveal>
              <SectionHead kicker={SIMULATOR.kicker} title={SIMULATOR.heading} />
              <div className="mt-8 flex gap-3">
                {SIMULATOR.facts.map((f) => (
                  <div key={f.small} className="flex-1 rounded-[16px] p-4 text-center" style={{ background: SURFACE, border: `1px solid ${LINE}` }}>
                    <div className="text-[2.4rem] font-bold leading-none tabular-nums" style={{ color: INK, fontFamily: MONO }}>
                      {f.big}
                    </div>
                    <div className="mt-1.5 text-[0.78rem]" style={{ color: MUTED }}>
                      {f.small}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-[0.98rem] leading-[1.6]" style={{ color: MUTED }}>
                {SIMULATOR.rule}
              </p>
              <div
                className="mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[0.92rem] font-bold"
                style={{ background: "rgba(242,169,59,0.12)", border: `1px solid rgba(242,169,59,0.28)`, color: AMBER, fontFamily: DISPLAY }}
              >
                {SIMULATOR.free}
              </div>
            </div>

            {/* restyled question inside a simulator frame */}
            <div data-reveal className="overflow-hidden rounded-[22px]" style={{ background: SURFACE, border: `1px solid ${LINE_STRONG}` }}>
              <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${LINE}` }}>
                <span className="text-[0.78rem] uppercase tracking-wide" style={{ color: FAINT, fontFamily: MONO }}>
                  {SIMULATOR.frameLabel}
                </span>
                <span className="text-[0.78rem] tabular-nums" style={{ color: MUTED, fontFamily: MONO }}>
                  1 / {STATS.examQuestions} · {STATS.examMinutes}:00
                </span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/restyled-live/15_10_0.png"
                alt="Оновлене зображення дорожньої ситуації в симуляторі: зупинка автомобіля"
                className="h-[240px] w-full object-cover"
                loading="lazy"
              />
              <div className="px-5 py-4">
                <p className="text-[0.98rem] font-bold" style={{ color: INK, fontFamily: DISPLAY }}>
                  {HERO.quiz.question}
                </p>
                <p className="mt-2 text-[0.82rem]" style={{ color: FAINT }}>
                  {SIMULATOR.frameCaption}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================ ЦІНА ПОВОРОТУ — loss band (LIGHT) */}
        <section className="relative overflow-hidden py-24 sm:py-28" style={{ background: L_BG, color: L_INK }}>
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: GRAIN, backgroundSize: "160px 160px" }} />
          <div className="relative mx-auto max-w-3xl px-5 text-center sm:px-8" data-reveal>
            <div className="mb-5 inline-flex items-center gap-2 text-[0.72rem] font-medium uppercase tracking-[0.22em]" style={{ color: L_MUTED, fontFamily: MONO }}>
              <span className="inline-block h-[2px] w-7 rounded-full" style={{ background: AMBER_DIM }} />
              {LOSS.kicker}
            </div>
            <p className="text-balance text-[clamp(1.8rem,5vw,3.2rem)] font-bold leading-[1.1]" style={{ fontFamily: DISPLAY, letterSpacing: "-0.02em" }}>
              {LOSS.line}{" "}
              <span className="tabular-nums" style={{ fontFamily: MONO }}>{LOSS.amount}</span>.{" "}
              {LOSS.after}
            </p>
            <p className="mx-auto mt-5 max-w-xl text-[1rem] leading-relaxed" style={{ color: L_MUTED }}>
              {LOSS.sub}
            </p>
            <Link
              href="/register"
              className="group mt-8 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-[0.98rem] font-bold"
              style={{ background: L_INK, color: L_BG, fontFamily: DISPLAY }}
            >
              {LOSS.cta}
              <ArrowRight className="h-[1.05em] w-[1.05em] transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </section>

        {/* ============================================ ЦІНА */}
        <section className="relative mx-auto max-w-6xl px-5 py-24 sm:px-8 lg:py-28">
          <div data-reveal className="mb-12">
            <SectionHead kicker={PRICING.kicker} title={PRICING.heading} sub={PRICING.schoolAnchor} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]" data-reveal>
            {/* FREE column FIRST and LONGER */}
            <div className="rounded-[22px] p-7" style={{ background: SURFACE, border: `1px solid ${LINE}` }}>
              <div className="flex items-baseline justify-between">
                <h3 className="text-[1.3rem] font-bold" style={{ color: INK, fontFamily: DISPLAY }}>
                  {PRICING.freeTitle}
                </h3>
                <span className="text-[0.8rem] uppercase tracking-wide" style={{ color: "#9AD9B8", fontFamily: MONO }}>
                  0 ₴
                </span>
              </div>
              <ul className="mt-6 flex flex-col gap-3.5">
                {PRICING.free.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-[0.96rem]" style={{ color: MUTED }}>
                    <Check className="mt-0.5 h-[1.05em] w-[1.05em] shrink-0" style={{ color: "#9AD9B8" }} strokeWidth={2.6} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <GhostCta href={ANON_TRY_HREF} ariaLabel="спробувати без реєстрації" className="mt-7 w-full">
                {PRICING.freeCta}
              </GhostCta>
            </div>

            {/* PAID card — intelligence only */}
            <div
              className="relative overflow-hidden rounded-[22px] p-7"
              style={{
                background: `radial-gradient(120% 90% at 100% 0%, #26201A 0%, ${SURFACE} 55%)`,
                border: `1px solid rgba(242,169,59,0.32)`,
                boxShadow: "0 40px 100px -55px rgba(242,169,59,0.4)",
              }}
            >
              <h3 className="text-[1.1rem] font-bold" style={{ color: MUTED, fontFamily: DISPLAY }}>
                Доступ до іспиту
              </h3>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-[3.2rem] font-bold leading-none tabular-nums" style={{ color: INK, fontFamily: MONO }}>
                  {PRICING.price}
                </span>
                <span className="text-[0.95rem]" style={{ color: AMBER, fontFamily: DISPLAY }}>
                  {PRICING.once}
                </span>
              </div>
              <p className="mt-2 text-[0.88rem]" style={{ color: FAINT }}>
                {PRICING.bind}
              </p>

              <ul className="mt-5 flex flex-col gap-3">
                {PRICING.paid.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-[0.96rem]" style={{ color: INK }}>
                    <Gauge className="mt-0.5 h-[1.05em] w-[1.05em] shrink-0" style={{ color: AMBER }} strokeWidth={2} />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex flex-wrap gap-2">
                {PRICING.negations.map((n) => (
                  <span key={n} className="rounded-full px-3 py-1 text-[0.78rem] font-bold" style={{ background: "rgba(237,236,228,0.06)", color: MUTED, fontFamily: MONO }}>
                    {n}
                  </span>
                ))}
              </div>

              <PrimaryCta href="/register" className="mt-6 w-full">
                {PRICING.cta}
              </PrimaryCta>

              <p className="mt-4 text-[0.85rem]" style={{ color: AMBER, fontFamily: DISPLAY }}>
                {PRICING.anchor}
              </p>
            </div>
          </div>

          {/* failsafe + welded trust band */}
          <div data-reveal className="mt-6 rounded-[16px] p-5" style={{ background: "rgba(237,236,228,0.03)", border: `1px solid ${LINE}` }}>
            <p className="text-[0.92rem] leading-[1.6]" style={{ color: MUTED }}>
              {PRICING.failsafe}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t pt-4" style={{ borderColor: LINE }}>
              {PRICING.trust.map((t, i) => (
                <span key={t} className="flex items-center gap-3 text-[0.85rem]" style={{ color: INK, fontFamily: MONO }}>
                  {i > 0 && <span aria-hidden style={{ color: FAINT }}>·</span>}
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================ БАЗА + FAQ */}
        <section className="relative mx-auto max-w-6xl px-5 py-24 sm:px-8 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <div data-reveal className="flex flex-col gap-4">
                <div className="mb-1 inline-flex w-fit items-center gap-2 text-[0.72rem] font-medium uppercase tracking-[0.22em]" style={{ color: FAINT, fontFamily: MONO }}>
                  <span className="inline-block h-[2px] w-7 rounded-full" style={{ background: AMBER }} />
                  {BASE.kicker}
                </div>
                {BASE.stats.map((s) => (
                  <div key={s.label} className="flex items-baseline gap-3">
                    <span className="text-[2.4rem] font-bold leading-none tabular-nums" style={{ color: INK, fontFamily: MONO }}>
                      {typeof s.value === "number" ? s.value.toLocaleString("uk-UA") : s.value}
                    </span>
                    <span className="text-[0.95rem]" style={{ color: MUTED }}>{s.label}</span>
                  </div>
                ))}
                <span className="mt-1 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-[0.8rem] font-bold" style={{ background: "rgba(154,217,184,0.1)", color: "#9AD9B8", fontFamily: MONO }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#9AD9B8" }} />
                  {BASE.fresh}
                </span>
              </div>

              {/* reserved calibration slot — ships EMPTY of claims */}
              <div data-reveal className="mt-8 rounded-[16px] border-dashed p-5" style={{ borderWidth: 1, borderColor: LINE_STRONG, background: "rgba(237,236,228,0.02)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-[0.9rem] font-bold" style={{ color: INK, fontFamily: DISPLAY }}>{BASE.reservedTitle}</span>
                  <span className="text-[0.72rem]" style={{ color: FAINT, fontFamily: MONO }}>{BASE.reservedTag}</span>
                </div>
                <p className="mt-2 text-[0.88rem] leading-[1.55]" style={{ color: FAINT }}>
                  {BASE.reserved}
                </p>
              </div>
            </div>

            <div data-reveal>
              <h2 className="mb-2 text-[clamp(1.6rem,3.6vw,2.4rem)] font-bold" style={{ color: INK, fontFamily: DISPLAY, letterSpacing: "-0.02em" }}>
                {FAQ.heading}
              </h2>
              <div className="mt-4">
                {FAQ.items.map((it, i) => (
                  <FaqItem key={it.q} q={it.q} a={it.a} defaultOpen={i === 0} />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ============================================ ФІНАЛ + launcher */}
        <section className="relative mx-auto max-w-5xl px-5 py-24 text-center sm:px-8 lg:py-28">
          <h2 data-reveal className="text-balance text-[clamp(2.1rem,6vw,4.4rem)] font-bold leading-[1.02]" style={{ fontFamily: DISPLAY, letterSpacing: "-0.025em" }}>
            <Headline rows={[FINAL.headline]} muted="#7E858B" />
          </h2>
          <p data-reveal className="mx-auto mt-5 max-w-xl text-[1.05rem]" style={{ color: MUTED }}>
            {FINAL.sub}
          </p>
          <div data-reveal className="mt-8 flex justify-center">
            <CtaPair align="center" />
          </div>

          {/* mobile vertical mode-launcher */}
          <div data-reveal className="mx-auto mt-12 flex max-w-md flex-col gap-3">
            {FINAL.modes.map((m) => (
              <Link
                key={m.title}
                href={m.href}
                className="group flex items-center justify-between gap-4 rounded-[16px] px-5 py-4 text-left transition-colors"
                style={{ background: SURFACE, border: `1px solid ${LINE}` }}
              >
                <span>
                  <span className="block text-[1.02rem] font-bold" style={{ color: INK, fontFamily: DISPLAY }}>{m.title}</span>
                  <span className="block text-[0.85rem]" style={{ color: MUTED }}>{m.sub}</span>
                </span>
                <ArrowRight className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" style={{ color: AMBER }} />
              </Link>
            ))}
          </div>
        </section>

        {/* ============================================ FOOTER — stencil */}
        <footer className="relative overflow-hidden" style={{ background: "#0F1113", borderTop: `1px solid ${LINE}` }}>
          <div className="mx-auto max-w-6xl px-5 pb-12 pt-16 sm:px-8">
            {/* oversized stenciled wordmark on asphalt */}
            <div
              aria-hidden
              className="select-none text-[clamp(3.5rem,14vw,10rem)] font-bold leading-none"
              style={{
                color: "transparent",
                WebkitTextStroke: `1.5px ${LINE_STRONG}`,
                fontFamily: DISPLAY,
                letterSpacing: "-0.03em",
              }}
            >
              {FOOTER.wordmark}
            </div>

            <div className="mt-10 grid gap-10 sm:grid-cols-[1.4fr_1fr_1fr]">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: AMBER, color: "#231703" }} aria-hidden>
                    <Route className="h-[18px] w-[18px]" strokeWidth={2.4} />
                  </span>
                  <span className="text-[1.05rem] font-bold" style={{ color: INK, fontFamily: DISPLAY }}>{FOOTER.wordmark}</span>
                </div>
                <p className="mt-4 max-w-xs text-[0.92rem] leading-[1.6]" style={{ color: MUTED }}>
                  {FOOTER.tagline}
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-[0.8rem]" style={{ color: FAINT, fontFamily: MONO }}>
                  <CalendarClock className="h-3.5 w-3.5" />
                  {FOOTER.updated}
                </span>
              </div>

              {FOOTER.columns.map((col) => (
                <div key={col.title}>
                  <h4 className="text-[0.8rem] font-bold uppercase tracking-[0.16em]" style={{ color: FAINT, fontFamily: MONO }}>
                    {col.title}
                  </h4>
                  <ul className="mt-4 flex flex-col gap-2.5">
                    {col.links.map((l) => (
                      <li key={l.label}>
                        <Link href={l.href} className="text-[0.92rem] transition-colors hover:text-[color:var(--h)]" style={{ color: MUTED, ["--h" as string]: INK }}>
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-12 border-t pt-6" style={{ borderColor: LINE }}>
              <p className="max-w-3xl text-[0.82rem] leading-[1.6]" style={{ color: FAINT }}>
                {FOOTER.disclaimer}
              </p>
              <p className="mt-4 text-[0.8rem]" style={{ color: FAINT, fontFamily: MONO }}>
                {FOOTER.copyright}
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
