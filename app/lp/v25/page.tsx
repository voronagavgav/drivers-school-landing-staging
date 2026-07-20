"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { imageSrcSet } from "@/lib/image-resolve";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Flag,
  RefreshCw,
  TrendingUp,
  Gauge,
  CalendarClock,
  Scale,
} from "lucide-react";
import {
  NAV,
  HERO,
  HERO_VARIANTS,
  PROOF,
  LAYER1,
  LAYER2,
  LAYER3,
  SIMULATOR,
  LOSS,
  PRICING,
  FAQ,
  FINAL,
  FOOTER,
  STATS,
  ANON_TRY_HREF,
} from "./copy";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/* ------------------------------------------------------------------ palette (inherited from v14) */
const BG = "#F7F8F8";
const SURFACE = "#FFFFFF";
const INK = "#111417";
const MUTED = "#515B66"; // AA body on BG/SURFACE
const FAINT = "#5E6774"; // labels — ~4.8:1 on the cool-white bg (AA small)
const ACCENT = "#3B5BDB"; // cobalt — dial, curve, one headline token
const ACCENT_SOFT = "#EEF1FB";
const NAVY = "#10163A"; // ink interludes (proof band, loss band, footer)
const LINE = "#E4E7E9";
const LINE_STRONG = "#D2D6DA";
const BAD_LINE = "#D9A2A2";
const BAD_BG = "#FBF1F1";
// on-navy tokens
const N_INK = "#F4F6FF";
const N_BODY = "#B8BFE0";
const N_FAINT = "#8E97C9";
const N_ACCENT = "#93A6FF";

const DISPLAY = "var(--font-display), system-ui, sans-serif";
const BODY = "var(--font-body), system-ui, sans-serif";

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const mapRange = (n: number, a1: number, a2: number, b1: number, b2: number) =>
  b1 + ((clamp(n, Math.min(a1, a2), Math.max(a1, a2)) - a1) * (b2 - b1)) / (a2 - a1);

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------ curve geometry */
// Accelerating rise to a peak at exam day (periodization / "form" curve).
function buildCurve(w: number, h: number, exp: number, topPad = 14, botPad = 10) {
  const n = 64;
  const usable = h - topPad - botPad;
  let line = "";
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const r = Math.pow(t, exp);
    const x = t * w;
    const y = h - botPad - r * usable;
    line += `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)} `;
  }
  const area = `${line}L${w} ${h} L0 ${h} Z`;
  return { line: line.trim(), area };
}

/* ------------------------------------------------------------------ shared bits */
function PeakMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none" aria-hidden>
      <path
        d="M2 22 C7 21 9 16 12 11 C14.5 6.5 16 4 18 4"
        stroke={ACCENT}
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M18 4 L23 4 L21 8 L23 8 Z" fill={ACCENT} />
      <circle cx="2" cy="22" r="1.8" fill={INK} />
    </svg>
  );
}

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
        "group inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[0.95rem] font-semibold transition-transform duration-200 hover:-translate-y-0.5",
        className,
      )}
      style={{ background: INK, color: BG, fontFamily: DISPLAY, letterSpacing: "0.01em" }}
    >
      {children}
      <ArrowRight
        size={17}
        className="transition-transform duration-200 group-hover:translate-x-0.5"
      />
    </Link>
  );
}

function GhostCta({
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
        "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[0.95rem] font-semibold transition-colors duration-200",
        className,
      )}
      style={{ border: `1px solid ${LINE_STRONG}`, color: INK, fontFamily: DISPLAY, letterSpacing: "0.01em" }}
    >
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ hero curve */
// Decorative form curve behind the hero; reveals on scroll-scrub. Starts 60% drawn at rest so a
// no-scroll/headless capture never shows an empty curve; motion enhances an already-visible default.
function HeroCurve() {
  const clipRef = useRef<SVGRectElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { line, area } = useMemo(() => buildCurve(100, 100, 1.9, 10, 6), []);

  useEffect(() => {
    const rect = clipRef.current;
    if (!rect) return;
    if (prefersReduced()) {
      rect.setAttribute("width", "100");
      return;
    }
    const section = svgRef.current?.closest("section") ?? null;
    if (!section || window.innerHeight < 560) {
      rect.setAttribute("width", "0");
      const tween = gsap.to(rect, { attr: { width: 100 }, duration: 1.7, ease: "power2.out", delay: 0.15 });
      return () => tween.kill();
    }
    rect.setAttribute("width", "60");
    const st = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "+=70%",
      scrub: 0.6,
      onUpdate: (self) => rect.setAttribute("width", (60 + self.progress * 40).toFixed(2)),
    });
    return () => st.kill();
  }, [line]);

  return (
    <svg
      ref={svgRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="v25area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={ACCENT} stopOpacity="0.09" />
          <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
        </linearGradient>
        <clipPath id="v25reveal" clipPathUnits="userSpaceOnUse">
          <rect ref={clipRef} x="0" y="0" width="100" height="100" />
        </clipPath>
      </defs>
      <g clipPath="url(#v25reveal)">
        <path d={area} fill="url(#v25area)" />
        <path
          d={line}
          fill="none"
          stroke={ACCENT}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ hero quiz */
function HeroQuiz() {
  const [picked, setPicked] = useState<string | null>(null);
  const meterRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const q = HERO.quiz;
  const chosen = q.options.find((o) => o.key === picked);
  const isCorrect = chosen?.correct;

  useEffect(() => {
    // Honesty law: one answer can't "read" readiness — the app shows nothing before 20 answers. So the
    // bar registers only a small, IDENTICAL first tick regardless of right/wrong; the meaning lives in
    // the curve dot + note, not in an invented percentage.
    const target = picked ? 6 : 0;
    if (meterRef.current) {
      if (prefersReduced()) meterRef.current.style.width = `${target}%`;
      else gsap.to(meterRef.current, { width: `${target}%`, duration: 0.9, ease: "expo.out" });
    }
    // First point of the training curve appears the moment you answer.
    if (dotRef.current && picked) {
      const cy = mapRange(target, 0, 40, 40, 8);
      if (prefersReduced()) {
        dotRef.current.setAttribute("cy", `${cy}`);
        dotRef.current.setAttribute("opacity", "1");
      } else {
        gsap.fromTo(
          dotRef.current,
          { attr: { cy: 44 }, opacity: 0 },
          { attr: { cy }, opacity: 1, duration: 0.9, ease: "expo.out" },
        );
      }
    }
  }, [picked, isCorrect]);

  return (
    <div
      className="w-full rounded-2xl p-5 sm:p-6"
      style={{ background: SURFACE, border: `1px solid ${LINE}`, boxShadow: "0 24px 60px -32px rgba(16,22,58,0.28)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[0.7rem] font-semibold uppercase tracking-[0.16em]" style={{ fontFamily: DISPLAY, color: FAINT }}>
          {q.label}
        </span>
        <span className="rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide" style={{ border: `1px solid ${LINE_STRONG}`, color: FAINT, fontFamily: DISPLAY }}>
          питання {q.number}
        </span>
      </div>

      {q.imageKey && (
        // Restyled official image (tier-aware /api/q-image route). Its presence is the on-page proof
        // of the «Оновлені зображення» claim — the picture the hero question actually depends on.
        // eslint-disable-next-line @next/next/no-img-element -- resolver route serves negotiated bytes
        <img
          src={`/api/q-image/${q.imageKey}`}
          srcSet={imageSrcSet(q.imageKey) ?? undefined}
          sizes="(max-width: 640px) calc(100vw - 72px), 460px"
          width={720}
          height={405}
          alt="Ілюстрація до питання: дорожня ситуація з жовтим автомобілем біля тунелю"
          className="mt-4 h-auto w-full rounded-xl"
          style={{ border: `1px solid ${LINE}` }}
        />
      )}

      <p className="mt-4 text-[1.02rem] font-semibold leading-snug" style={{ color: INK }}>
        {q.question}
      </p>

      <div className="mt-4 flex flex-col gap-2">
        {q.options.map((o) => {
          const active = picked === o.key;
          const showState = picked !== null;
          const good = showState && o.correct;
          const bad = active && !o.correct;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => setPicked(picked ? picked : o.key)}
              disabled={picked !== null}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-[0.9rem] font-medium transition-colors duration-150"
              style={{
                border: `1px solid ${good ? ACCENT : bad ? BAD_LINE : LINE_STRONG}`,
                background: good ? ACCENT_SOFT : bad ? BAD_BG : SURFACE,
                color: INK,
                cursor: picked ? "default" : "pointer",
              }}
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-bold"
                style={{ border: `1px solid ${good ? ACCENT : LINE_STRONG}`, background: good ? ACCENT : "transparent", color: good ? "#fff" : FAINT, fontFamily: DISPLAY }}
              >
                {good ? <Check size={12} /> : o.key.toUpperCase()}
              </span>
              {o.text}
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-[0.7rem] font-semibold uppercase tracking-[0.14em]" style={{ fontFamily: DISPLAY, color: FAINT }}>
          <span>{q.meterLabel}</span>
          <TrendingUp size={13} style={{ color: ACCENT }} />
        </div>
        <div className="mt-2 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: "#EAECEF" }}>
            <div ref={meterRef} className="h-full rounded-full" style={{ width: 0, background: ACCENT }} />
          </div>
          {/* mini form-curve: the first data point lands on answer */}
          <svg width="56" height="48" viewBox="0 0 56 48" aria-hidden className="shrink-0">
            <path d="M2 44 C18 42 30 34 40 18 C46 9 50 5 54 4" fill="none" stroke={LINE_STRONG} strokeWidth="1.4" strokeLinecap="round" strokeDasharray="2 3" />
            <circle ref={dotRef} cx="10" cy="44" r="3.2" fill={ACCENT} opacity={0} />
          </svg>
        </div>
        <p className="mt-3 min-h-[1.25rem] text-[0.82rem]" style={{ color: picked ? (isCorrect ? ACCENT : MUTED) : "transparent" }}>
          {picked ? (isCorrect ? q.correctNote : q.wrongNote) : "placeholder"}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ proof band count-up */
function ProofFigure({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isFloat = !Number.isInteger(value);
  const fmt = useCallback(
    (n: number) => {
      if (isFloat) return n.toFixed(1).replace(".", ",");
      return Math.round(n).toLocaleString("uk-UA").replace(/ /g, " ");
    },
    [isFloat],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Default = the real, final figure (the proof-first content is the number itself; the count-up
    // is a scroll enhancement, never a gate — a no-scroll/headless render still shows the truth).
    el.textContent = fmt(value) + suffix;
    if (prefersReduced()) return;
    const obj = { v: 0 };
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top 85%",
      once: true,
      onEnter: () => {
        gsap.to(obj, {
          v: value,
          duration: 1.6,
          ease: "power2.out",
          onUpdate: () => {
            el.textContent = fmt(obj.v) + suffix;
          },
        });
      },
    });
    return () => st.kill();
  }, [value, suffix, fmt]);

  return <span ref={ref} className="tabular-nums">0{suffix}</span>;
}

/* ------------------------------------------------------------------ dial (layer 1 demo) */
function Dial() {
  const [skipped, setSkipped] = useState(false);
  const numRef = useRef<HTMLSpanElement>(null);
  const arcRef = useRef<SVGCircleElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const R = 92;
  const C = 2 * Math.PI * R;
  const base = STATS.readiness; // 71
  const decayed = 58;

  const animateTo = useCallback(
    (val: number, dur: number) => {
      const arc = arcRef.current;
      const num = numRef.current;
      if (!arc || !num) return;
      const offset = C * (1 - val / 100);
      if (prefersReduced()) {
        arc.style.strokeDashoffset = `${offset}`;
        num.textContent = `${val}`;
        return;
      }
      gsap.to(arc, { strokeDashoffset: offset, duration: dur, ease: "expo.out" });
      const cur = { v: parseInt(num.textContent || "0", 10) || 0 };
      gsap.to(cur, {
        v: val,
        duration: dur,
        ease: "expo.out",
        onUpdate: () => {
          num.textContent = `${Math.round(cur.v)}`;
        },
      });
    },
    [C],
  );

  useEffect(() => {
    if (arcRef.current) arcRef.current.style.strokeDasharray = `${C}`;
    // Default = filled base value (a no-scroll/headless render shows a real dial, not an empty 0).
    animateTo(base, 0);
    started.current = true;
    if (prefersReduced()) return;
    // Entrance enhancement: snap to 0 and count up when scrolled into view.
    const st = ScrollTrigger.create({
      trigger: wrapRef.current,
      start: "top 78%",
      once: true,
      onEnter: () => {
        if (numRef.current) numRef.current.textContent = "0";
        if (arcRef.current) arcRef.current.style.strokeDashoffset = `${C}`;
        animateTo(base, 1.5);
      },
    });
    return () => st.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!started.current) return;
    animateTo(skipped ? decayed : base, 1.1);
  }, [skipped, animateTo]);

  return (
    <div
      ref={wrapRef}
      className="relative mx-auto w-full max-w-sm rounded-3xl p-8"
      style={{ background: SURFACE, border: `1px solid ${LINE}`, boxShadow: "0 30px 70px -34px rgba(16,22,58,0.3)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em]" style={{ fontFamily: DISPLAY, color: FAINT }}>
          {LAYER1.metricLabel}
        </span>
        <span className="text-[0.72rem] font-medium" style={{ color: FAINT }}>
          {LAYER1.engine}
        </span>
      </div>

      <div className="relative mx-auto mt-4 grid place-items-center" style={{ width: 220, height: 220 }}>
        <svg width="220" height="220" viewBox="0 0 220 220" className="absolute inset-0 -rotate-90">
          <circle cx="110" cy="110" r={R} fill="none" stroke="#EAECEF" strokeWidth="14" />
          <circle ref={arcRef} cx="110" cy="110" r={R} fill="none" stroke={ACCENT} strokeWidth="14" strokeLinecap="round" />
        </svg>
        <div className="flex flex-col items-center">
          <div className="flex items-start" style={{ fontFamily: DISPLAY, color: ACCENT }}>
            <span ref={numRef} className="text-[4.2rem] font-extrabold leading-none tabular-nums">0</span>
            <span className="mt-2 text-2xl font-bold">%</span>
          </div>
          <span className="mt-1 text-[0.78rem] font-medium" style={{ color: MUTED }}>
            {LAYER1.scoreLabel}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setSkipped((s) => !s)}
        className="mt-5 flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-[0.85rem] font-semibold transition-colors"
        style={{ border: `1px solid ${skipped ? BAD_LINE : LINE_STRONG}`, background: skipped ? BAD_BG : SURFACE, color: INK, fontFamily: DISPLAY }}
        aria-pressed={skipped}
      >
        <span className="flex items-center gap-2">
          <RefreshCw size={15} style={{ color: skipped ? "#B45454" : FAINT }} />
          {LAYER1.toggleLabel}
        </span>
        <span className="relative h-5 w-9 rounded-full transition-colors" style={{ background: skipped ? "#C77B7B" : LINE_STRONG }}>
          <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all" style={{ left: skipped ? "1.25rem" : "0.125rem" }} />
        </span>
      </button>
      <p className="mt-3 text-[0.82rem] leading-relaxed" style={{ color: MUTED, minHeight: "2.4rem" }}>
        {skipped ? LAYER1.decayNote : `${LAYER1.caption} ${LAYER1.captionNote}`}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ date picker (layer 2 demo) */
function DatePicker() {
  const [date, setDate] = useState("");
  const areaRef = useRef<SVGPathElement>(null);
  const lineRef = useRef<SVGPathElement>(null);

  const info = useMemo(() => {
    if (!date) return null;
    const target = new Date(date + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ms = target.getTime() - today.getTime();
    const days = Math.round(ms / 86400000);
    if (isNaN(days) || days < 0) return { invalid: true, days: 0, perDay: 0, exp: 1.6, mode: "" };
    const d = Math.max(days, 1);
    const perDay = clamp(Math.ceil(STATS.planPool / d), 6, 90);
    const exp = mapRange(d, 5, 90, 2.5, 1.35);
    const mode = d <= 7 ? LAYER2.urgent : d <= 21 ? LAYER2.intensive : LAYER2.calm;
    return { invalid: false, days: d, perDay, exp, mode };
  }, [date]);

  const W = 320;
  const Hc = 130;
  const exp = info && !info.invalid ? info.exp : 1.7;
  const { line, area } = useMemo(() => buildCurve(W, Hc, exp, 16, 8), [exp]);

  useEffect(() => {
    if (prefersReduced() || !lineRef.current) return;
    const len = lineRef.current.getTotalLength();
    gsap.fromTo(lineRef.current, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.9, ease: "power2.out" });
    if (areaRef.current) gsap.fromTo(areaRef.current, { opacity: 0 }, { opacity: 1, duration: 0.8 });
  }, [line]);

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
      <div>
        <label className="block text-[0.78rem] font-semibold uppercase tracking-[0.14em]" style={{ fontFamily: DISPLAY, color: FAINT }}>
          {LAYER2.inputLabel}
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="mt-2 w-full rounded-xl px-4 py-3.5 text-[1rem] font-medium outline-none focus:ring-2"
          style={{
            border: `1px solid ${LINE_STRONG}`,
            background: SURFACE,
            color: INK,
            // @ts-expect-error css var for focus ring color
            "--tw-ring-color": ACCENT,
            fontFamily: BODY,
          }}
        />
        <p className="mt-4 text-[0.95rem] leading-relaxed" style={{ color: MUTED }}>
          {!date ? LAYER2.noDate : info?.invalid ? LAYER2.invalid : info?.mode}
        </p>
        <p className="mt-3 text-[0.8rem]" style={{ color: FAINT }}>
          {LAYER2.note}
        </p>
      </div>

      <div className="rounded-2xl p-6" style={{ background: SURFACE, border: `1px solid ${LINE}` }}>
        <div className="flex items-center justify-between">
          <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em]" style={{ fontFamily: DISPLAY, color: FAINT }}>
            {LAYER2.planLabel}
          </span>
          <Flag size={15} style={{ color: ACCENT }} />
        </div>
        <div className="mt-4 flex items-end gap-6">
          <div>
            <div className="text-[2.6rem] font-extrabold leading-none tabular-nums" style={{ fontFamily: DISPLAY, color: INK }}>
              {info && !info.invalid ? info.days : "—"}
            </div>
            <div className="mt-1 text-[0.75rem]" style={{ color: FAINT }}>{LAYER2.daysLabel}</div>
          </div>
          <div>
            <div className="text-[2.6rem] font-extrabold leading-none tabular-nums" style={{ fontFamily: DISPLAY, color: INK }}>
              {info && !info.invalid ? info.perDay : "—"}
            </div>
            <div className="mt-1 text-[0.75rem]" style={{ color: FAINT }}>{LAYER2.perDayLabel}</div>
          </div>
        </div>
        <svg className="mt-5 w-full" viewBox={`0 0 ${W} ${Hc}`} height="120" aria-hidden>
          <defs>
            <linearGradient id="v25pick" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity="0.12" />
              <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1="0" x2={W} y1={Hc - 8} y2={Hc - 8} stroke={LINE} strokeWidth="1" />
          <path ref={areaRef} d={area} fill="url(#v25pick)" />
          <path ref={lineRef} d={line} fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" />
          <line x1={W - 1} x2={W - 1} y1="16" y2="34" stroke={INK} strokeWidth="1.5" />
          <path d={`M${W - 1} 16 L${W - 20} 22 L${W - 1} 27 Z`} fill={ACCENT} />
        </svg>
        <div className="mt-1 flex justify-between text-[0.68rem] font-medium uppercase tracking-wide" style={{ color: FAINT, fontFamily: DISPLAY }}>
          <span>{HERO.baseFlag}</span>
          <span>{HERO.peakFlag}</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ calibration convergence (layer 3 demo) */
// Scatter → line: dots start spread around a fitted trend and converge onto it when in view.
// Metaphor of the dial "learning" from real results. Default (reduced-motion / no-scroll) renders
// dots already ON the line so the content is never blank.
const SCATTER = [
  { x: 22, jy: -18 },
  { x: 52, jy: 22 },
  { x: 78, jy: -12 },
  { x: 104, jy: 16 },
  { x: 132, jy: -22 },
  { x: 158, jy: 10 },
  { x: 186, jy: -14 },
  { x: 212, jy: 20 },
  { x: 238, jy: -10 },
  { x: 266, jy: 14 },
  { x: 292, jy: -20 },
];
function Convergence() {
  const W = 320;
  const H = 150;
  const pad = 14;
  // trend line: y descends left→right (higher readiness = fewer errors, rising confidence)
  const lineY = (x: number) => mapRange(x, pad, W - pad, H - pad - 8, pad + 8);
  const dotsRef = useRef<SVGGElement>(null);
  const lineRef = useRef<SVGLineElement>(null);

  useEffect(() => {
    const g = dotsRef.current;
    if (!g) return;
    const dots = Array.from(g.querySelectorAll("circle"));
    if (prefersReduced()) return; // already rendered on-line
    const st = ScrollTrigger.create({
      trigger: g,
      start: "top 82%",
      once: true,
      onEnter: () => {
        dots.forEach((d, i) => {
          const scatterY = parseFloat(d.dataset.scatter || "0");
          const finalY = parseFloat(d.getAttribute("cy") || "0");
          gsap.fromTo(
            d,
            { attr: { cy: scatterY }, opacity: 0.35, r: 4.5 },
            { attr: { cy: finalY }, opacity: 1, r: 3.4, duration: 1.1, delay: i * 0.04, ease: "expo.out" },
          );
        });
        if (lineRef.current) {
          gsap.fromTo(lineRef.current, { opacity: 0 }, { opacity: 1, duration: 0.6, delay: 0.5 });
        }
      },
    });
    return () => st.kill();
  }, []);

  const x1 = pad;
  const x2 = W - pad;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" height="150" role="img" aria-label={LAYER3.convergeCaption}>
      <line x1={pad} x2={W - pad} y1={H - pad} y2={H - pad} stroke={LINE} strokeWidth="1" />
      <line x1={pad} x2={pad} y1={pad} y2={H - pad} stroke={LINE} strokeWidth="1" />
      <line ref={lineRef} x1={x1} y1={lineY(x1)} x2={x2} y2={lineY(x2)} stroke={ACCENT} strokeWidth="2" strokeLinecap="round" style={{ opacity: prefersReduced() ? 1 : 1 }} />
      <g ref={dotsRef}>
        {SCATTER.map((p, i) => {
          const cy = lineY(p.x);
          return <circle key={i} cx={p.x} cy={cy} r={3.4} fill={ACCENT} data-scatter={clamp(cy + p.jy, pad + 4, H - pad - 4)} />;
        })}
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ pillar layer wrapper */
// Rootly chaptered module: bold chapter header + one-line sub-label (left), 2–3-line description
// (right), full-width demo below, hairline rule between layers. Numbers are earned (real dissection
// sequence Дил → FSRS → Калібрування), not scaffolding.
function PillarHeader({
  no,
  name,
  sub,
  icon,
  description,
  first,
}: {
  no: string;
  name: string;
  sub: string;
  icon: React.ReactNode;
  description: React.ReactNode;
  first?: boolean;
}) {
  return (
    <div
      className="grid gap-6 pt-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:pt-20"
      style={{ borderTop: first ? "none" : `1px solid ${LINE}` }}
      data-reveal
    >
      <div>
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: ACCENT_SOFT, color: ACCENT }}>
            {icon}
          </span>
          <span className="text-[0.8rem] font-semibold uppercase tracking-[0.18em]" style={{ fontFamily: DISPLAY, color: ACCENT }}>
            {no}
          </span>
        </div>
        <h3 className="mt-5 font-bold leading-[1.02] tracking-[-0.02em]" style={{ fontFamily: DISPLAY, color: INK, fontSize: "clamp(2rem, 4.4vw, 3.2rem)" }}>
          {name}
        </h3>
        <p className="mt-2 text-[1rem] font-medium" style={{ color: MUTED }}>
          {sub}
        </p>
      </div>
      <div className="flex items-center">
        <p className="max-w-xl text-[1.08rem] leading-relaxed" style={{ color: INK }}>
          {description}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ page */
export default function V25Page() {
  const v = HERO_VARIANTS[HERO.variant];

  // Gentle section reveals — translate ONLY (never gate visibility). If a trigger never fires
  // (headless capture, hidden tab) content stays visible at its natural offset.
  useEffect(() => {
    if (prefersReduced()) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.from(el, {
          y: 22,
          duration: 0.7,
          ease: "power2.out",
          clearProps: "transform",
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
        });
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div style={{ background: BG, color: INK, fontFamily: BODY }} className="flex flex-1 flex-col">
      {/* NAV */}
      <header className="sticky top-0 z-40 backdrop-blur" style={{ background: "rgba(247,248,248,0.82)", borderBottom: `1px solid ${LINE}` }}>
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-3.5">
          <Link href="/" className="inline-flex items-center gap-2">
            <PeakMark />
            <span className="text-[1.05rem] font-bold tracking-tight" style={{ fontFamily: DISPLAY, color: INK }}>
              Drivers School
            </span>
          </Link>
          <div className="flex items-center gap-2.5">
            <Link href="/login" className="hidden rounded-full px-4 py-2 text-[0.9rem] font-semibold sm:inline-flex" style={{ color: INK, fontFamily: DISPLAY }}>
              {NAV.login}
            </Link>
            <Link href="/register" className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[0.9rem] font-semibold" style={{ background: INK, color: BG, fontFamily: DISPLAY }}>
              {NAV.register}
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* HERO — заява + жива проба */}
        <section className="relative overflow-hidden" style={{ borderBottom: `1px solid ${LINE}` }}>
          <div className="absolute inset-x-0 bottom-0 top-[47%] sm:top-[42%] lg:top-0">
            <HeroCurve />
          </div>
          <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-7 px-5 pb-16 pt-8 sm:gap-10 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pb-24 lg:pt-20">
            <div className="flex flex-col">
              <span className="inline-flex w-fit items-center gap-2 rounded-full px-3.5 py-1.5 text-[0.78rem] font-semibold" style={{ background: SURFACE, border: `1px solid ${LINE_STRONG}`, color: INK, fontFamily: DISPLAY }}>
                <Gauge size={14} style={{ color: ACCENT }} /> {HERO.badge}
              </span>

              <h1 className="mt-4 font-extrabold leading-[0.98] tracking-[-0.02em] sm:mt-6" style={{ fontFamily: DISPLAY, color: INK, fontSize: "clamp(2.6rem, 8vw, 5.4rem)", textWrap: "balance" }}>
                {v.headline.map((lineTokens, i) => (
                  <span key={i} className="block">
                    {lineTokens.map((tk, j) => (
                      <span key={j} style={tk.accent ? { color: ACCENT } : undefined}>{tk.t}</span>
                    ))}
                  </span>
                ))}
              </h1>

              <p className="mt-4 max-w-md text-[1.08rem] leading-relaxed sm:mt-5" style={{ color: MUTED }}>
                {v.subhead}
              </p>

              <div className="mt-4 flex items-center gap-3 rounded-xl px-4 py-3 sm:mt-6" style={{ background: SURFACE, border: `1px solid ${LINE}` }}>
                <span className="shrink-0 whitespace-nowrap text-[1.4rem] font-extrabold leading-none" style={{ fontFamily: DISPLAY, color: INK }}>
                  1&#8202;/&#8202;5
                </span>
                <span className="text-[0.9rem] leading-snug" style={{ color: INK }}>{HERO.hook}</span>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:mt-6 sm:flex-row">
                <PrimaryCta href="/register" className="w-full sm:w-auto">{HERO.ctaPrimary}</PrimaryCta>
                <GhostCta href={ANON_TRY_HREF} className="w-full sm:w-auto">{HERO.ctaSecondary}</GhostCta>
              </div>

              <div className="mt-6 hidden flex-wrap gap-x-5 gap-y-2 sm:flex">
                {HERO.chips.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1.5 text-[0.82rem] font-medium" style={{ color: FAINT }}>
                    <Check size={14} style={{ color: FAINT }} />{c}
                  </span>
                ))}
              </div>
            </div>

            <div className="lg:pt-8">
              <HeroQuiz />
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2 sm:hidden">
              {HERO.chips.map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5 text-[0.82rem] font-medium" style={{ color: FAINT }}>
                  <Check size={14} style={{ color: FAINT }} />{c}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ДОКАЗИ — спершу цифри (proof-first ink band, screen 2) */}
        <section className="relative overflow-hidden" style={{ background: NAVY }}>
          <div className="mx-auto w-full max-w-6xl px-5 py-20 lg:py-28">
            <div className="max-w-2xl" data-reveal>
              <h2 className="font-bold leading-[1.04] tracking-[-0.02em]" style={{ fontFamily: DISPLAY, color: N_INK, fontSize: "clamp(1.9rem, 4.4vw, 3rem)", textWrap: "balance" }}>
                {PROOF.heading}
              </h2>
              <p className="mt-3 max-w-md text-[1.05rem] leading-relaxed" style={{ color: N_BODY }}>{PROOF.lead}</p>
            </div>

            <div className="mt-12 grid gap-y-10 sm:grid-cols-3 sm:gap-x-8" data-reveal>
              {PROOF.stats.map((s, i) => (
                <div key={s.key} className="flex flex-col" style={{ borderLeft: i === 0 ? "none" : undefined }}>
                  <span className="font-extrabold leading-none" style={{ fontFamily: DISPLAY, color: N_INK, fontSize: "clamp(3.4rem, 8vw, 5.5rem)" }}>
                    <ProofFigure value={s.value} suffix={s.suffix} />
                  </span>
                  <span className="mt-3 max-w-[16rem] text-[0.92rem] leading-relaxed" style={{ color: N_FAINT }}>{s.label}</span>
                </div>
              ))}
            </div>

            <p className="mt-14 max-w-3xl border-t pt-8 text-[1.05rem] leading-relaxed" style={{ borderColor: "rgba(255,255,255,0.1)", color: N_BODY }} data-reveal>
              {PROOF.footnote}
            </p>
          </div>
        </section>

        {/* THREE-LAYER DISSECTION — pillar module */}
        <section className="mx-auto w-full max-w-6xl px-5 pb-8 lg:pb-16" style={{ borderBottom: `1px solid ${LINE}` }}>
          {/* ШАР 1 — Дил */}
          <PillarHeader
            first
            no={LAYER1.no}
            name={LAYER1.name}
            sub={LAYER1.sub}
            icon={<Gauge size={22} />}
            description={LAYER1.description}
          />
          <div className="grid gap-10 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:pt-12" data-reveal>
            <div>
              <p className="text-[1.15rem] font-semibold" style={{ color: ACCENT }}>{LAYER1.caption}</p>
              <p className="mt-5 max-w-md rounded-xl px-5 py-4 text-[0.98rem] leading-relaxed" style={{ background: SURFACE, border: `1px solid ${LINE}`, color: INK }}>
                {LAYER1.moat}
              </p>
            </div>
            <Dial />
          </div>

          {/* ШАР 2 — FSRS */}
          <PillarHeader
            no={LAYER2.no}
            name={LAYER2.name}
            sub={LAYER2.sub}
            icon={<CalendarClock size={22} />}
            description={LAYER2.description}
          />
          <div className="pt-10 lg:pt-12" data-reveal>
            <DatePicker />
            <div className="mt-8 rounded-2xl p-6" style={{ background: SURFACE, border: `1px solid ${LINE}` }}>
              <span className="text-[0.75rem] font-semibold uppercase tracking-[0.14em]" style={{ fontFamily: DISPLAY, color: FAINT }}>
                {LAYER2.topicsLabel}
              </span>
              <div className="mt-3 flex flex-wrap gap-2">
                {LAYER2.topics.map((t) => (
                  <span key={t} className="rounded-full px-3 py-1.5 text-[0.82rem] font-medium" style={{ border: `1px solid ${LINE_STRONG}`, color: INK }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ШАР 3 — Калібрування */}
          <PillarHeader
            no={LAYER3.no}
            name={LAYER3.name}
            sub={LAYER3.sub}
            icon={<Scale size={22} />}
            description={LAYER3.description}
          />
          <div className="grid gap-8 pt-10 lg:grid-cols-2 lg:gap-12 lg:pt-12" data-reveal>
            {/* convergence viz */}
            <div className="rounded-2xl p-6" style={{ background: SURFACE, border: `1px solid ${LINE}` }}>
              <div className="flex items-center justify-between">
                <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em]" style={{ fontFamily: DISPLAY, color: FAINT }}>
                  {LAYER3.convergeCaption}
                </span>
              </div>
              <div className="mt-4">
                <Convergence />
              </div>
              <div className="mt-3 flex justify-between text-[0.72rem] font-medium" style={{ color: FAINT }}>
                <span>{LAYER3.guessLabel}</span>
                <span>{LAYER3.knowLabel}</span>
              </div>
            </div>

            {/* reserved calibration slot — honestly empty */}
            <div className="flex flex-col rounded-2xl p-6" style={{ background: SURFACE, border: `1px dashed ${LINE_STRONG}` }}>
              <div className="flex items-center justify-between">
                <span className="text-[0.72rem] font-semibold uppercase tracking-[0.16em]" style={{ fontFamily: DISPLAY, color: FAINT }}>
                  {LAYER3.reservedTitle}
                </span>
                <span className="rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide" style={{ border: `1px solid ${LINE_STRONG}`, color: FAINT, fontFamily: DISPLAY }}>
                  {LAYER3.reservedTag}
                </span>
              </div>
              {/* empty chart container with real axes + labeled empty state */}
              <div className="relative mt-4 flex-1">
                <svg viewBox="0 0 320 150" className="w-full" height="150" aria-hidden>
                  <line x1="14" x2="306" y1="136" y2="136" stroke={LINE} strokeWidth="1" />
                  <line x1="14" x2="14" y1="14" y2="136" stroke={LINE} strokeWidth="1" />
                  {[40, 66, 92, 118].map((y) => (
                    <line key={y} x1="14" x2="306" y1={y} y2={y} stroke={LINE} strokeWidth="1" strokeDasharray="2 5" opacity={0.6} />
                  ))}
                </svg>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="rounded-full px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em]" style={{ background: BG, border: `1px solid ${LINE}`, color: FAINT, fontFamily: DISPLAY }}>
                    даних ще немає
                  </span>
                </div>
                <div className="mt-1 flex justify-between text-[0.68rem] font-medium uppercase tracking-wide" style={{ color: FAINT, fontFamily: DISPLAY }}>
                  <span>{LAYER3.reservedAxisX}</span>
                  <span>{LAYER3.reservedAxisY}</span>
                </div>
              </div>
              <p className="mt-4 text-[0.9rem] leading-relaxed" style={{ color: MUTED }}>{LAYER3.reserved}</p>
            </div>
          </div>
        </section>

        {/* ПРОТОКОЛ — контрольний забіг (simulator) */}
        <section className="mx-auto w-full max-w-6xl px-5 py-24 lg:py-32" style={{ borderBottom: `1px solid ${LINE}` }}>
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div data-reveal>
              <h2 className="font-bold leading-[1.05] tracking-[-0.02em]" style={{ fontFamily: DISPLAY, color: INK, fontSize: "clamp(1.9rem, 4vw, 3rem)", textWrap: "balance" }}>
                {SIMULATOR.heading}
              </h2>
              <p className="mt-4 max-w-md text-[1.02rem] leading-relaxed" style={{ color: MUTED }}>{SIMULATOR.body}</p>
              <p className="mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[0.9rem] font-semibold" style={{ background: ACCENT_SOFT, color: ACCENT, fontFamily: DISPLAY }}>
                <Check size={15} /> {SIMULATOR.free}
              </p>
            </div>
            <div data-reveal className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl" style={{ background: LINE, border: `1px solid ${LINE}` }}>
              {SIMULATOR.facts.map((f) => (
                <div key={f.small} className="flex flex-col items-center justify-center px-3 py-10 text-center" style={{ background: SURFACE }}>
                  <span className="text-[3rem] font-extrabold leading-none tabular-nums" style={{ fontFamily: DISPLAY, color: INK }}>{f.big}</span>
                  <span className="mt-2 text-[0.8rem]" style={{ color: FAINT }}>{f.small}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ІНТЕРЛЮДІЯ — ціна фальстарту (dark loss band) */}
        <section className="relative overflow-hidden" style={{ background: NAVY }}>
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-8 px-5 py-24 lg:py-32">
            <span className="inline-flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.2em]" style={{ fontFamily: DISPLAY, color: N_FAINT }}>
              <span aria-hidden className="h-[1px] w-6" style={{ background: N_FAINT }} /> {LOSS.kicker}
            </span>
            <h2 className="max-w-3xl font-bold leading-[1.04] tracking-[-0.02em]" style={{ fontFamily: DISPLAY, color: N_INK, fontSize: "clamp(2rem, 5vw, 3.6rem)", textWrap: "balance" }}>
              {LOSS.line1} <span style={{ color: N_ACCENT }}>{LOSS.amount}</span>. {LOSS.line2}
            </h2>
            <p className="max-w-xl text-[1.05rem] leading-relaxed" style={{ color: N_BODY }}>{LOSS.sub}</p>
            <Link href="/register" className="group inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[0.95rem] font-semibold transition-transform duration-200 hover:-translate-y-0.5" style={{ background: N_INK, color: NAVY, fontFamily: DISPLAY }}>
              {LOSS.cta}
              <ArrowRight size={17} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </section>

        {/* ЦІНА — доступ до іспиту */}
        <section className="mx-auto w-full max-w-6xl px-5 py-24 lg:py-32" style={{ borderBottom: `1px solid ${LINE}` }}>
          <div data-reveal className="mx-auto max-w-2xl text-center">
            <h2 className="font-bold leading-[1.05] tracking-[-0.02em]" style={{ fontFamily: DISPLAY, color: INK, fontSize: "clamp(1.9rem, 4vw, 3rem)", textWrap: "balance" }}>
              {PRICING.heading}
            </h2>
          </div>

          <div data-reveal className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
            {/* free first + longer */}
            <div className="flex flex-col rounded-2xl p-8" style={{ background: SURFACE, border: `1px solid ${LINE}` }}>
              <span className="text-[0.75rem] font-semibold uppercase tracking-[0.14em]" style={{ fontFamily: DISPLAY, color: FAINT }}>{PRICING.freeTitle}</span>
              <div className="mt-3 text-[2.4rem] font-extrabold leading-none" style={{ fontFamily: DISPLAY, color: INK }}>0 ₴</div>
              <ul className="mt-6 flex flex-col gap-3">
                {PRICING.free.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[0.95rem]" style={{ color: INK }}>
                    <Check size={17} style={{ color: FAINT, marginTop: 2 }} className="shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <div className="flex-1" />
              <GhostCta href={ANON_TRY_HREF} className="mt-7 w-full">{PRICING.freeCta}</GhostCta>
            </div>

            {/* paid = intelligence only */}
            <div className="relative flex flex-col rounded-2xl p-8" style={{ background: SURFACE, border: `1.5px solid ${ACCENT}`, boxShadow: "0 30px 70px -38px rgba(59,91,219,0.5)" }}>
              <span className="text-[0.75rem] font-semibold uppercase tracking-[0.14em]" style={{ fontFamily: DISPLAY, color: ACCENT }}>{PRICING.paidTitle}</span>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-[2.9rem] font-extrabold leading-none" style={{ fontFamily: DISPLAY, color: INK }}>{PRICING.price}</span>
                <span className="mb-1 text-[0.85rem]" style={{ color: FAINT }}>{PRICING.once}</span>
              </div>
              <p className="mt-2 text-[0.85rem]" style={{ color: MUTED }}>{PRICING.bind}</p>
              <p className="mt-1 text-[0.85rem]" style={{ color: FAINT }}>{PRICING.anchor}</p>
              <ul className="mt-6 flex flex-col gap-3">
                {PRICING.paid.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[0.95rem]" style={{ color: INK }}>
                    <Check size={17} style={{ color: ACCENT, marginTop: 2 }} className="shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-2">
                {PRICING.negations.map((n) => (
                  <span key={n} className="rounded-full px-3 py-1 text-[0.75rem] font-semibold" style={{ border: `1px solid ${LINE_STRONG}`, color: MUTED, fontFamily: DISPLAY }}>{n}</span>
                ))}
              </div>
              <PrimaryCta href="/register" className="mt-7 w-full">{PRICING.cta}</PrimaryCta>
              <p className="mt-4 text-[0.8rem] leading-relaxed" style={{ color: FAINT }}>{PRICING.failsafe}</p>
            </div>
          </div>

          {/* trust band welded */}
          <div data-reveal className="mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {PRICING.trust.map((t) => (
              <span key={t} className="inline-flex items-center gap-2 text-[0.88rem] font-medium" style={{ color: MUTED }}>
                <Check size={15} style={{ color: FAINT }} /> {t}
              </span>
            ))}
          </div>
        </section>

        {/* FAQ — питання до методу */}
        <section className="mx-auto w-full max-w-3xl px-5 py-24 lg:py-32" style={{ borderBottom: `1px solid ${LINE}` }}>
          <div data-reveal className="text-center">
            <h2 className="font-bold leading-[1.05] tracking-[-0.02em]" style={{ fontFamily: DISPLAY, color: INK, fontSize: "clamp(1.9rem, 4vw, 3rem)", textWrap: "balance" }}>
              {FAQ.heading}
            </h2>
          </div>
          <div data-reveal className="mt-10 divide-y" style={{ borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`, borderColor: LINE }}>
            {FAQ.items.map((it) => (
              <details key={it.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[1rem] font-semibold" style={{ fontFamily: DISPLAY, color: INK }}>
                  {it.q}
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full transition-transform group-open:rotate-45" style={{ border: `1px solid ${LINE_STRONG}`, color: FAINT }}>
                    <span className="text-lg leading-none">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-[0.95rem] leading-relaxed" style={{ color: MUTED }}>{it.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ФІНАЛЬНИЙ CTA + mode launcher */}
        <section className="mx-auto w-full max-w-6xl px-5 py-24 lg:py-32">
          <div data-reveal className="rounded-3xl px-6 py-14 text-center sm:px-10 lg:py-20" style={{ background: SURFACE, border: `1px solid ${LINE}`, boxShadow: "0 30px 80px -44px rgba(16,22,58,0.28)" }}>
            <h2 className="mx-auto max-w-2xl font-bold leading-[1.02] tracking-[-0.02em]" style={{ fontFamily: DISPLAY, color: INK, fontSize: "clamp(2rem, 5vw, 3.4rem)", textWrap: "balance" }}>
              {FINAL.headline.map((tk, j) => (
                <span key={j} style={tk.accent ? { color: ACCENT } : undefined}>{tk.t}</span>
              ))}
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[1.05rem] leading-relaxed" style={{ color: MUTED }}>{FINAL.sub}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <PrimaryCta href="/register" className="w-full sm:w-auto">{FINAL.ctaPrimary}</PrimaryCta>
              <GhostCta href={ANON_TRY_HREF} className="w-full sm:w-auto">{FINAL.ctaSecondary}</GhostCta>
            </div>

            {/* mobile vertical mode launcher */}
            <div className="mt-10 flex flex-col gap-3 sm:hidden">
              {FINAL.modes.map((m) => (
                <Link key={m.title} href={m.href} className="flex items-center gap-4 rounded-xl px-4 py-3.5 text-left" style={{ border: `1px solid ${LINE_STRONG}`, background: BG }}>
                  <PeakMark size={22} />
                  <span className="flex-1">
                    <span className="block text-[0.95rem] font-semibold" style={{ fontFamily: DISPLAY, color: INK }}>{m.title}</span>
                    <span className="block text-[0.8rem]" style={{ color: FAINT }}>{m.sub}</span>
                  </span>
                  <ArrowUpRight size={18} style={{ color: FAINT }} />
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="relative overflow-hidden" style={{ background: NAVY, color: "#C8CEE8" }}>
        <div className="mx-auto w-full max-w-6xl px-5 pb-10 pt-16">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-2">
                <PeakMark />
                <span className="text-[1.1rem] font-bold" style={{ fontFamily: DISPLAY, color: N_INK }}>Drivers School</span>
              </div>
              <p className="mt-4 max-w-xs text-[0.95rem] leading-relaxed" style={{ color: "#AEB6DA" }}>{FOOTER.tagline}</p>
              <span className="mt-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.78rem] font-semibold" style={{ border: "1px solid rgba(255,255,255,0.14)", color: N_FAINT, fontFamily: DISPLAY }}>
                <span className="h-2 w-2 rounded-full" style={{ background: N_ACCENT }} /> {FOOTER.updated}
              </span>
            </div>
            {FOOTER.columns.map((col) => (
              <div key={col.title}>
                <span className="text-[0.75rem] font-semibold uppercase tracking-[0.14em]" style={{ fontFamily: DISPLAY, color: "#7E88BE" }}>{col.title}</span>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-[0.92rem] transition-colors hover:text-white" style={{ color: "#C8CEE8" }}>{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="mt-12 max-w-3xl text-[0.78rem] leading-relaxed" style={{ color: "#8891C0" }}>{FOOTER.disclaimer}</p>
          <div className="mt-6 flex items-center justify-between border-t pt-6" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <span className="text-[0.8rem]" style={{ color: "#8891C0" }}>{FOOTER.copyright}</span>
          </div>
        </div>
        <div aria-hidden className="pointer-events-none select-none overflow-hidden">
          <div className="whitespace-nowrap px-5 font-extrabold leading-none" style={{ fontFamily: DISPLAY, fontSize: "clamp(3.5rem, 15vw, 12rem)", color: "rgba(255,255,255,0.04)", marginBottom: "-0.15em" }}>
            Drivers School
          </div>
        </div>
      </footer>
    </div>
  );
}
