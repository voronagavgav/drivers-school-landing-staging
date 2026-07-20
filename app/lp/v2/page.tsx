"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Unbounded, Rubik } from "next/font/google";
import {
  ArrowRight,
  Car,
  Check,
  X,
  CalendarDays,
  Timer,
  Gauge,
  ChevronDown,
  ShieldCheck,
  TrendingDown,
  Sparkles,
  Dumbbell,
  Flag,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import {
  copy,
  HERO_VARIANTS,
  ACTIVE_HERO,
  ACTIVE_POOL,
  PLAN_MIN_PER_DAY,
  PLAN_MAX_PER_DAY,
} from "./copy";

const display = Unbounded({
  subsets: ["cyrillic", "cyrillic-ext", "latin"],
  weight: ["500", "600"],
  variable: "--v2-display",
  display: "swap",
});
const body = Rubik({
  subsets: ["cyrillic", "cyrillic-ext", "latin"],
  weight: ["400", "500"],
  variable: "--v2-body",
  display: "swap",
});

const hero = HERO_VARIANTS[ACTIVE_HERO];

/* ----------------------------------------------------------------- helpers */

function KmPost({ km, className = "" }: { km: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-[#F5A93B]/30 bg-[#F5A93B]/10 px-3 py-1 text-[0.72rem] font-medium tracking-wide text-[#F5A93B] ${className}`}
    >
      <span aria-hidden className="text-[0.9em]">
        ◈
      </span>
      КМ {km}
    </span>
  );
}

function SectionHead({
  km,
  title,
  sub,
}: {
  km: string;
  title: string;
  sub: string;
}) {
  return (
    <header className="mb-10 max-w-2xl">
      <KmPost km={km} />
      <h2 className="v2-display mt-4 text-balance text-[clamp(1.7rem,4.4vw,2.7rem)] font-semibold leading-[1.08] text-[#EDF1F7]">
        {title}
      </h2>
      <p className="mt-3 text-[clamp(1rem,2.4vw,1.15rem)] leading-relaxed text-[#98A2B8]">
        {sub}
      </p>
    </header>
  );
}

/* card shell: solid surface, hairline, reflector top-tick */
function Panel({
  children,
  className = "",
  reflector = true,
}: {
  children: React.ReactNode;
  className?: string;
  reflector?: boolean;
}) {
  return (
    <div
      className={`v2-card group relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#131826] ${className}`}
    >
      {reflector && (
        <span
          aria-hidden
          className="absolute left-5 top-0 h-[3px] w-9 rounded-b-full bg-[#F5A93B]/70 transition-all duration-200 group-hover:w-14 group-hover:bg-[#F5A93B]"
        />
      )}
      {children}
    </div>
  );
}

/* -------------------------------------------------------------- dashboard dial */

function Dial({ value, size = 200 }: { value: number; size?: number }) {
  const r = 80;
  const c = 2 * Math.PI * r;
  const sweep = 0.75; // 270° gauge
  const arc = c * sweep;
  const filled = arc * Math.max(0, Math.min(100, value)) / 100;
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className="block"
      role="img"
      aria-label={`Показник готовності ${Math.round(value)} відсотків`}
    >
      <defs>
        <filter id="v2-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g transform="rotate(135 100 100)">
        {/* track */}
        <circle
          cx="100"
          cy="100"
          r={r}
          fill="none"
          stroke="rgba(237,241,247,0.10)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${arc} ${c}`}
        />
        {/* value */}
        <circle
          cx="100"
          cy="100"
          r={r}
          fill="none"
          stroke="#F5A93B"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c}`}
          filter="url(#v2-glow)"
          style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </g>
      <text
        x="100"
        y="98"
        textAnchor="middle"
        className="v2-display"
        fontSize="44"
        fontWeight="600"
        fill="#EDF1F7"
      >
        {Math.round(value)}
      </text>
      <text x="100" y="122" textAnchor="middle" fontSize="13" fill="#98A2B8">
        % готовності
      </text>
    </svg>
  );
}

/* mini horizontal meter for the hero mechanic */
function MiniMeter({ value }: { value: number }) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-[0.78rem] text-[#98A2B8]">
        <span className="inline-flex items-center gap-1.5">
          <Gauge className="size-3.5 text-[#F5A93B]" />
          Готовність
        </span>
        <span className="font-medium tabular-nums text-[#F5A93B]">{Math.round(value)}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-[#F5A93B]"
          style={{
            width: `${value}%`,
            boxShadow: "0 0 12px rgba(245,169,59,0.6)",
            transition: "width 0.9s cubic-bezier(0.16,1,0.3,1)",
          }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ hero question */

function HeroQuestion() {
  const q = copy.demoQuestion;
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = answered && q.options[picked!].correct;
  const meter = !answered ? 0 : correct ? 14 : 6;

  return (
    <Panel className="p-5 sm:p-6" reflector>
      <div className="flex items-center gap-2 text-[0.72rem] font-medium tracking-wide text-[#9BC4EF]">
        <span className="inline-flex size-1.5 rounded-full bg-[#9BC4EF]" />
        {q.label}
      </div>
      <p className="mt-3 text-[1.05rem] font-medium leading-snug text-[#EDF1F7]">{q.prompt}</p>

      <div className="mt-4 flex flex-col gap-2">
        {q.options.map((o, i) => {
          const isPicked = picked === i;
          const showRight = answered && o.correct;
          const showWrong = answered && isPicked && !o.correct;
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => setPicked(i)}
              className={[
                "flex items-center gap-3 rounded-lg border px-3.5 py-3 text-left text-[0.9rem] leading-snug transition-all duration-150",
                showRight
                  ? "border-[#6FCF97]/50 bg-[#6FCF97]/10 text-[#EDF1F7]"
                  : showWrong
                    ? "border-[#E0723A]/50 bg-[#E0723A]/10 text-[#EDF1F7]"
                    : answered
                      ? "border-white/[0.06] text-[#98A2B8]"
                      : "border-white/[0.1] text-[#DCE2EC] hover:-translate-y-px hover:border-[#F5A93B]/50 hover:bg-white/[0.03]",
              ].join(" ")}
            >
              <span
                className={[
                  "flex size-5 shrink-0 items-center justify-center rounded-full border text-[0.7rem]",
                  showRight
                    ? "border-[#6FCF97] bg-[#6FCF97] text-[#0B0E14]"
                    : showWrong
                      ? "border-[#E0723A] bg-[#E0723A] text-[#0B0E14]"
                      : "border-white/25 text-[#98A2B8]",
                ].join(" ")}
              >
                {showRight ? (
                  <Check className="size-3" strokeWidth={3} />
                ) : showWrong ? (
                  <X className="size-3" strokeWidth={3} />
                ) : (
                  String.fromCharCode(1040 + i)
                )}
              </span>
              {o.text}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="mt-4 rounded-lg border border-white/[0.08] bg-black/20 p-3.5 text-[0.86rem] leading-relaxed text-[#C4CCD8]">
          {correct ? q.explainCorrect : q.explainWrong}
          <MiniMeter value={meter} />
          <p className="mt-2 text-[0.76rem] text-[#98A2B8]">{q.meterCaption}</p>
        </div>
      )}
      {!answered && (
        <p className="mt-3 text-[0.78rem] text-[#98A2B8]">{copy.hero.tryHint}</p>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------- dial section */

function DialSection() {
  const d = copy.dial;
  const ref = useRef<HTMLDivElement>(null);
  const [val, setVal] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setVal(71);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            // ignition sweep up, then a small honest decay
            const proxy = { v: 0 };
            gsap.to(proxy, {
              v: 74,
              duration: 1.4,
              ease: "power3.out",
              onUpdate: () => setVal(proxy.v),
              onComplete: () => {
                gsap.to(proxy, {
                  v: 68,
                  duration: 2.2,
                  delay: 0.4,
                  ease: "power1.inOut",
                  onUpdate: () => setVal(proxy.v),
                });
              },
            });
            io.disconnect();
          }
        });
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    // safety net: if the observer never fires (headless render / hidden tab),
    // the dial must still show a real value, never a blank 0.
    const fallback = window.setTimeout(() => setVal((v) => (v === 0 ? 71 : v)), 1600);
    return () => {
      io.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  return (
    <section className="v2-section mx-auto w-full max-w-6xl px-5 py-20 sm:py-28" ref={ref}>
      <SectionHead km={d.km} title={d.title} sub={d.sub} />
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Panel className="flex flex-col items-center px-6 py-10" reflector>
          <div
            className="relative"
            style={{ filter: "drop-shadow(0 0 30px rgba(245,169,59,0.22))" }}
          >
            <Dial value={val} size={230} />
          </div>
          <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/20 px-3 py-1 text-[0.78rem] text-[#98A2B8]">
            <TrendingDown className="size-3.5 text-[#9BC4EF]" />
            {d.caption}
          </p>
        </Panel>

        <div>
          <p className="text-[clamp(1.05rem,2.6vw,1.28rem)] leading-relaxed text-[#DCE2EC]">
            {d.moatLead}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="flex-1 rounded-lg border border-white/[0.08] bg-[#131826] p-4">
              <Gauge className="size-5 text-[#F5A93B]" />
              <p className="mt-2 text-[0.92rem] font-medium text-[#EDF1F7]">{d.calibrated}</p>
            </div>
            <div className="flex-1 rounded-lg border border-white/[0.08] bg-[#131826] p-4">
              <Sparkles className="size-5 text-[#9BC4EF]" />
              <p className="mt-2 text-[0.92rem] font-medium text-[#EDF1F7]">{d.engine}</p>
            </div>
          </div>
          <p className="mt-6 border-t border-white/[0.08] pt-5 text-[0.95rem] leading-relaxed text-[#98A2B8]">
            {d.decayNote}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- date planner */

function PlannerSection() {
  const p = copy.planner;
  const [date, setDate] = useState("");

  let days: number | null = null;
  if (date) {
    const target = new Date(date + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    days = Math.round((target.getTime() - today.getTime()) / 86400000);
  }
  const intensive = days !== null && days >= 0 && days < 7;
  // One full pass of the real active cat-B pool spread across the days, clamped to a
  // sane band. So the printed «N днів × M питань/день» is self-consistent:
  // days × perDay ≈ ACTIVE_POOL inside the band (short horizons cap → essentials first).
  const perDay =
    days !== null && days > 0
      ? Math.min(PLAN_MAX_PER_DAY, Math.max(PLAN_MIN_PER_DAY, Math.ceil(ACTIVE_POOL / days)))
      : PLAN_MIN_PER_DAY;

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <section className="v2-section mx-auto w-full max-w-6xl px-5 py-20 sm:py-28">
      <SectionHead km={p.km} title={p.title} sub={p.sub} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="p-6 sm:p-8">
          <p className="text-[0.98rem] leading-relaxed text-[#C4CCD8]">{p.intro}</p>
          <label className="mt-6 block text-[0.82rem] font-medium text-[#98A2B8]" htmlFor="v2-exam-date">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="size-4 text-[#F5A93B]" />
              {p.label}
            </span>
          </label>
          <input
            id="v2-exam-date"
            type="date"
            min={todayStr}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="v2-date mt-2 w-full rounded-lg border border-white/[0.12] bg-black/25 px-4 py-3 text-[1rem] text-[#EDF1F7] outline-none focus:border-[#F5A93B]/60"
          />

          {/* mini road between today & exam */}
          <div className="mt-6 flex items-center gap-2 text-[0.74rem] text-[#98A2B8]">
            <span className="font-medium text-[#9BC4EF]">сьогодні</span>
            <span
              className="h-px flex-1"
              style={{
                background:
                  "repeating-linear-gradient(90deg, rgba(237,241,247,0.35) 0 10px, transparent 10px 22px)",
              }}
            />
            <Flag className="size-3.5 text-[#F5A93B]" />
            <span className="font-medium text-[#F5A93B]">іспит</span>
          </div>
        </Panel>

        <Panel className={`p-6 sm:p-8 ${intensive ? "border-[#F5A93B]/40" : ""}`}>
          {days === null ? (
            <div className="flex h-full flex-col justify-center">
              <p className="text-[1.3rem] font-medium text-[#EDF1F7]">План з'явиться тут</p>
              <p className="mt-2 text-[0.92rem] leading-relaxed text-[#98A2B8]">{p.noDate}</p>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex items-baseline gap-3">
                <span className="v2-display text-[clamp(2.6rem,9vw,4rem)] font-semibold leading-none text-[#F5A93B]">
                  {Math.max(days, 0)}
                </span>
                <span className="text-[1rem] text-[#98A2B8]">
                  {days <= 0 ? "іспит сьогодні або в минулому" : "днів до іспиту"}
                </span>
              </div>
              {days > 0 && (
                <p className="mt-3 text-[1.05rem] font-medium text-[#EDF1F7]">
                  {p.perDay(days, perDay)}
                </p>
              )}
              {intensive && (
                <p className="mt-3 inline-flex items-start gap-2 rounded-lg border border-[#F5A93B]/30 bg-[#F5A93B]/10 p-3 text-[0.86rem] leading-snug text-[#F5D9AC]">
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-[#F5A93B]" />
                  {p.intensive}
                </p>
              )}
              <div className="mt-6 border-t border-white/[0.08] pt-5">
                <p className="text-[0.82rem] font-medium text-[#98A2B8]">{p.focusLead}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.focusTopics.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-white/[0.1] bg-black/20 px-3 py-1 text-[0.8rem] text-[#C4CCD8]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- simulator */

function SimulatorSection() {
  const s = copy.simulator;
  return (
    <section className="v2-section mx-auto w-full max-w-6xl px-5 py-20 sm:py-28">
      <SectionHead km={s.km} title={s.title} sub={s.sub} />
      <Panel className="p-6 sm:p-10">
        <div className="grid gap-6 sm:grid-cols-3">
          {s.format.map((f, i) => (
            <div
              key={i}
              className="flex flex-col items-center rounded-xl border border-white/[0.08] bg-black/20 px-4 py-8 text-center"
            >
              <span className="v2-display text-[clamp(2.8rem,10vw,4rem)] font-semibold leading-none text-[#F5A93B] tabular-nums">
                {f.big}
              </span>
              <span className="mt-2 text-[0.92rem] text-[#98A2B8]">{f.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-col items-start gap-4 border-t border-white/[0.08] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="inline-flex items-center gap-3 text-[0.95rem] text-[#DCE2EC]">
            <Timer className="size-5 shrink-0 text-[#9BC4EF]" />
            {s.rules}
          </p>
          <p className="text-[0.86rem] italic text-[#98A2B8]">{s.calm}</p>
        </div>
      </Panel>
    </section>
  );
}

/* ----------------------------------------------------------- pricing */

function PricingSection() {
  const p = copy.pricing;
  return (
    <section className="v2-section mx-auto w-full max-w-6xl px-5 py-20 sm:py-28">
      <SectionHead km={p.km} title={p.title} sub={p.sub} />
      <div
        className="v2-card relative overflow-hidden rounded-2xl border-2 border-[#F5A93B]/35 bg-[#131826] p-6 sm:p-10"
        style={{ boxShadow: "0 0 60px -20px rgba(245,169,59,0.35)" }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(245,169,59,0.12), transparent 70%)" }}
        />
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div>
            <div className="flex items-end gap-2">
              <span className="v2-display text-[clamp(3rem,12vw,4.5rem)] font-semibold leading-none text-[#F5A93B]">
                {p.price}
              </span>
            </div>
            <p className="mt-3 text-[0.95rem] text-[#98A2B8]">{p.priceNote}</p>
            <p className="mt-4 text-[1rem] font-medium text-[#EDF1F7]">{p.anchor}</p>

            <Link
              href="/register"
              className="v2-cta mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F5A93B] px-6 py-3.5 text-[1rem] font-medium text-[#1A1205] sm:w-auto"
            >
              {p.cta}
              <ArrowRight className="size-4" />
            </Link>

            <p className="mt-5 rounded-lg border border-white/[0.08] bg-black/20 p-3.5 text-[0.84rem] leading-relaxed text-[#98A2B8]">
              {p.failsafe}
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.08] bg-black/15 p-5">
              <p className="text-[0.82rem] font-medium uppercase tracking-wide text-[#9BC4EF]">
                {p.freeTitle}
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {p.free.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[0.9rem] text-[#DCE2EC]">
                    <Check className="mt-0.5 size-4 shrink-0 text-[#9BC4EF]" strokeWidth={2.5} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-[#F5A93B]/25 bg-[#F5A93B]/[0.06] p-5">
              <p className="text-[0.82rem] font-medium uppercase tracking-wide text-[#F5A93B]">
                {p.paidTitle}
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {p.paid.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[0.9rem] text-[#EDF1F7]">
                    <Sparkles className="mt-0.5 size-4 shrink-0 text-[#F5A93B]" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* trust band = guardrail strip */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-white/[0.08] pt-6 text-[0.86rem] text-[#98A2B8]">
          {p.trust.map((t, i) => (
            <span key={t} className="inline-flex items-center gap-3">
              {i > 0 && <span aria-hidden className="text-[#F5A93B]/60">◦</span>}
              <ShieldCheck className="size-4 text-[#9BC4EF]" />
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- proof / база */

function ProofSection() {
  const p = copy.proof;
  return (
    <section className="v2-section mx-auto w-full max-w-6xl px-5 py-20 sm:py-28">
      <SectionHead km={p.km} title={p.title} sub={p.sub} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="grid grid-cols-3 gap-4">
          {p.stats.map((s) => (
            <Panel key={s.label} className="flex flex-col items-center px-3 py-8 text-center" reflector={false}>
              <span className="v2-display text-[clamp(1.6rem,6vw,2.6rem)] font-semibold leading-none text-[#EDF1F7] tabular-nums">
                {s.big}
              </span>
              <span className="mt-2 text-[0.8rem] leading-tight text-[#98A2B8]">{s.label}</span>
            </Panel>
          ))}
        </div>
        <Panel className="flex flex-col justify-center p-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#9BC4EF]/30 bg-[#9BC4EF]/10 px-3 py-1 text-[0.78rem] text-[#9BC4EF]">
            <span className="inline-flex size-1.5 animate-pulse rounded-full bg-[#9BC4EF]" />
            {p.badge}
          </span>
          <p className="mt-4 text-[0.95rem] leading-relaxed text-[#C4CCD8]">{p.note}</p>
        </Panel>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- FAQ */

function FaqSection() {
  const f = copy.faq;
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="v2-section mx-auto w-full max-w-3xl px-5 py-20 sm:py-28">
      <SectionHead km={f.km} title={f.title} sub={f.sub} />
      <div className="flex flex-col divide-y divide-white/[0.08] border-y border-white/[0.08]">
        {f.items.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={i}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 py-5 text-left"
              >
                <span className="text-[1rem] font-medium text-[#EDF1F7]">{item.q}</span>
                <ChevronDown
                  className={`size-5 shrink-0 text-[#F5A93B] transition-transform duration-300 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                className="grid transition-all duration-300 ease-out"
                style={{
                  gridTemplateRows: isOpen ? "1fr" : "0fr",
                  opacity: isOpen ? 1 : 0,
                }}
              >
                <div className="overflow-hidden">
                  <p className="pb-5 text-[0.92rem] leading-relaxed text-[#98A2B8]">{item.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- final CTA */

const launcherIcons = [Dumbbell, Timer, Gauge];

function FinalCtaSection() {
  const f = copy.finalCta;
  return (
    <section className="v2-section mx-auto w-full max-w-4xl px-5 py-20 sm:py-28">
      <div className="text-center">
        <h2 className="v2-display text-balance text-[clamp(1.9rem,5.2vw,3rem)] font-semibold leading-[1.06] text-[#EDF1F7]">
          {f.title}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[1.05rem] leading-relaxed text-[#98A2B8]">
          {f.sub}
        </p>
        <Link
          href="/register"
          className="v2-cta mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-[#F5A93B] px-8 py-4 text-[1.05rem] font-medium text-[#1A1205]"
        >
          {f.cta}
          <ArrowRight className="size-4.5" />
        </Link>
      </div>

      {/* mobile-first vertical mode launcher */}
      <div className="mt-12 flex flex-col gap-3">
        {f.launcher.map((m, i) => {
          const Icon = launcherIcons[i];
          return (
            <Link
              key={m.title}
              href="/register"
              className="v2-card group flex items-center gap-4 rounded-xl border border-white/[0.08] bg-[#131826] px-5 py-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-[#F5A93B]/40"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#F5A93B]/10 text-[#F5A93B]">
                <Icon className="size-5" />
              </span>
              <span className="flex-1">
                <span className="block text-[0.98rem] font-medium text-[#EDF1F7]">{m.title}</span>
                <span className="block text-[0.82rem] text-[#98A2B8]">{m.desc}</span>
              </span>
              <ArrowRight className="size-5 text-[#98A2B8] transition-transform duration-150 group-hover:translate-x-1 group-hover:text-[#F5A93B]" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- page */

export default function LandingV2() {
  const rootRef = useRef<HTMLDivElement>(null);
  const heroGlowRef = useRef<HTMLDivElement>(null);
  const spineRef = useRef<HTMLDivElement>(null);
  const spineInnerRef = useRef<HTMLDivElement>(null);

  // secondary hero CTA: bring the try-question into focus (anon, no-signup path)
  const scrollToTry = () => {
    const el = document.getElementById("hero-try");
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    const first = el.querySelector<HTMLButtonElement>("button");
    window.setTimeout(() => first?.focus({ preventScroll: true }), reduce ? 0 : 420);
  };

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      // hero headlight wash: single pan on load, never loops
      if (heroGlowRef.current) {
        gsap.fromTo(
          heroGlowRef.current,
          { opacity: 0, xPercent: -14, scale: 1.08 },
          { opacity: 1, xPercent: 0, scale: 1, duration: 1.3, ease: "power3.out" },
        );
      }
      // hero content entrance
      gsap.from("[data-hero-anim]", {
        y: 22,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.09,
        delay: 0.15,
      });
      // drive the dashed spine down as you scroll — translateY the inner dash layer
      // (compositor-only) instead of repainting backgroundPositionY on a ~6000px element
      if (spineInnerRef.current) {
        gsap.to(spineInnerRef.current, {
          y: 208, // 4× the 52px dash period → seamless continuous flow
          ease: "none",
          scrollTrigger: {
            trigger: rootRef.current,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.6,
          },
        });
      }
      // Section headers get a subtle translate-only nudge on enter — no opacity
      // gating, so content is always visible even if a trigger never fires
      // (full-page render, hidden tab). Reveal enhances an already-visible page.
      gsap.utils.toArray<HTMLElement>(".v2-section > *:first-child").forEach((el) => {
        gsap.from(el, {
          y: 18,
          duration: 0.6,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 88%" },
        });
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      className={`${display.variable} ${body.variable} v2-root relative min-h-full overflow-hidden bg-[#0B0E14] text-[#EDF1F7] antialiased`}
    >
      {/* dashed lane spine running down the whole document — lg+ ONLY: below lg the
          content padding (px-5) is too tight and the dashes overlapped the hero controls */}
      <div
        ref={spineRef}
        aria-hidden
        className="pointer-events-none absolute inset-y-0 hidden w-[3px] overflow-hidden lg:left-[max(2rem,calc(50%-38rem))] lg:block"
        style={{
          maskImage: "linear-gradient(to bottom, transparent, #000 4%, #000 96%, transparent)",
        }}
      >
        <div
          ref={spineInnerRef}
          className="absolute inset-x-0 -top-[260px] h-[calc(100%+260px)] will-change-transform"
          style={{
            background:
              "repeating-linear-gradient(to bottom, rgba(237,241,247,0.28) 0 22px, transparent 22px 52px)",
          }}
        />
      </div>

      {/* NAV */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-[#F5A93B]/12 text-[#F5A93B]">
            <Car className="size-4.5" />
          </span>
          <span className="leading-none">
            <span className="block text-[0.95rem] font-semibold text-[#EDF1F7]">
              {copy.nav.brand}
            </span>
            <span className="block text-[0.7rem] text-[#98A2B8]">{copy.nav.tagline}</span>
          </span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="rounded-lg px-3 py-2 text-[0.88rem] text-[#C4CCD8] transition-colors hover:text-[#EDF1F7]"
          >
            {copy.nav.login}
          </Link>
          <Link
            href="/register"
            className="v2-cta hidden rounded-lg bg-[#F5A93B] px-4 py-2 text-[0.88rem] font-medium text-[#1A1205] sm:inline-flex"
          >
            {copy.nav.cta}
          </Link>
        </div>
      </header>

      {/* HERO — full-viewport night scene: converging road + horizon glow, headline
          seated in an overhead highway-sign panel, question card on the roadside */}
      <section className="relative z-10 flex min-h-[100svh] flex-col justify-center overflow-hidden px-5 pb-20 pt-6 sm:pt-10">
        {/* horizon glow — the vanishing point the road drives toward (headlight wash pans in on load) */}
        <div
          ref={heroGlowRef}
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-[-4rem] -z-10 h-[40rem]"
          style={{
            background:
              "radial-gradient(52% 40% at 50% 12%, rgba(245,169,59,0.24), rgba(155,196,239,0.06) 44%, transparent 74%)",
          }}
        />
        {/* the road itself: two converging 1px edges + a central dashed lane vanishing
            toward the glow — pure static CSS/SVG, fills the full viewport behind the content */}
        <svg
          aria-hidden
          viewBox="0 0 1000 620"
          preserveAspectRatio="xMidYMax slice"
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[82%] w-full"
          style={{ maskImage: "linear-gradient(to bottom, transparent, #000 26%, #000 100%)" }}
        >
          <line x1="500" y1="66" x2="96" y2="620" stroke="rgba(237,241,247,0.16)" strokeWidth="1" />
          <line x1="500" y1="66" x2="904" y2="620" stroke="rgba(237,241,247,0.16)" strokeWidth="1" />
          {/* growing dash/gap pairs fake the perspective of a lane line rushing past */}
          <line
            x1="500"
            y1="72"
            x2="500"
            y2="620"
            stroke="rgba(237,241,247,0.32)"
            strokeWidth="3"
            strokeDasharray="3 9 6 14 11 20 18 30 26 42"
          />
        </svg>

        <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-7 text-center">
          {/* hook chip */}
          <div
            data-hero-anim
            className="order-1 inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-[#131826] px-3.5 py-1.5 text-[0.8rem] text-[#C4CCD8]"
          >
            <span className="inline-flex size-1.5 rounded-full bg-[#F5A93B]" />
            {copy.hero.hook}
          </div>

          {/* overhead highway-sign panel: headline + subhead */}
          <div
            data-hero-anim
            className="order-2 relative w-full overflow-hidden rounded-2xl border border-white/[0.1] bg-[#131826] px-6 py-8 sm:px-10 sm:py-11"
          >
            <span
              aria-hidden
              className="absolute left-1/2 top-0 h-[3px] w-16 -translate-x-1/2 rounded-b-full bg-[#F5A93B]/70"
            />
            <h1 className="v2-display text-balance text-[clamp(2.1rem,6.2vw,3.9rem)] font-semibold leading-[1.03] tracking-[-0.02em] text-[#EDF1F7]">
              {hero.headline[0]}
              <br />
              <span className="text-[#F5A93B]">{hero.headline[1]}</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[clamp(1.02rem,2.4vw,1.22rem)] leading-relaxed text-[#98A2B8]">
              {hero.subhead}
            </p>
          </div>

          {/* five-car glyph row — the «1 з 5» hook (mobile: below the card) */}
          <div
            data-hero-anim
            className="order-5 flex flex-wrap items-center justify-center gap-3 lg:order-3"
          >
            <div className="flex items-center gap-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className={i === 0 ? "text-[#F5A93B]" : "text-[#98A2B8]/40"}
                  style={
                    i === 0 ? { filter: "drop-shadow(0 0 8px rgba(245,169,59,0.7))" } : undefined
                  }
                >
                  <Car className="size-6" />
                </span>
              ))}
            </div>
            <span className="text-[0.82rem] text-[#98A2B8]">{copy.hero.carsLabel}</span>
          </div>

          {/* CTAs: amber primary + ghost «Спробувати без реєстрації» (focuses the try-question) */}
          <div
            data-hero-anim
            className="order-4 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-center"
          >
            <Link
              href="/register"
              className="v2-cta inline-flex items-center justify-center gap-2 rounded-xl bg-[#F5A93B] px-6 py-3.5 text-[1rem] font-medium text-[#1A1205]"
            >
              {copy.hero.ctaPrimary}
              <ArrowRight className="size-4" />
            </Link>
            <button
              type="button"
              onClick={scrollToTry}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.14] px-6 py-3.5 text-[1rem] font-medium text-[#DCE2EC] transition-colors hover:border-white/30 hover:bg-white/[0.03]"
            >
              {copy.hero.ctaSecondary}
            </button>
          </div>

          {/* live try-question on the roadside (mobile: right under the sign panel) */}
          <div id="hero-try" data-hero-anim className="order-3 w-full scroll-mt-24 text-left lg:order-5">
            <HeroQuestion />
          </div>

          {/* proof chips (mobile: below the card) */}
          <div data-hero-anim className="order-6 flex flex-wrap justify-center gap-2.5">
            {copy.hero.chips.map((c) => (
              <span
                key={c}
                className="rounded-full border border-white/[0.08] bg-[#131826] px-3.5 py-1.5 text-[0.8rem] text-[#C4CCD8]"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="relative z-10">
        <DialSection />
        <PlannerSection />
        <SimulatorSection />
        <PricingSection />
        <ProofSection />
        <FaqSection />
        <FinalCtaSection />
      </div>

      {/* FOOTER — end of road */}
      <footer className="relative z-10 border-t border-white/[0.08] bg-[#0A0C11]">
        {/* stop line */}
        <div
          aria-hidden
          className="mx-auto h-1 w-full max-w-6xl"
          style={{ background: "linear-gradient(90deg, transparent, rgba(245,169,59,0.5), transparent)" }}
        />
        <div className="mx-auto w-full max-w-6xl px-5 py-12">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-[#F5A93B]/12 text-[#F5A93B]">
                  <Car className="size-4.5" />
                </span>
                <span className="text-[0.95rem] font-semibold text-[#EDF1F7]">
                  {copy.footer.brand}
                </span>
              </div>
              <p className="mt-2 max-w-xs text-[0.85rem] text-[#98A2B8]">{copy.footer.tagline}</p>
            </div>
            <div className="flex gap-6">
              {copy.footer.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-[0.88rem] text-[#C4CCD8] transition-colors hover:text-[#F5A93B]"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          <p className="mt-8 max-w-xl text-[0.8rem] leading-relaxed text-[#7E8A9C]">
            Навчальна платформа для <strong className="text-[#B8C0CE]">підготовки</strong> до
            теоретичної частини іспиту з ПДР. Це не офіційна екзаменаційна система: вона не замінює
            обов&apos;язкові практичні заняття, не дає права скласти державний іспит у застосунку, не
            інтегрована із системами МВС / ГСЦ МВС і не гарантує складання іспиту. Питання ґрунтуються
            на офіційній базі тестових питань ГСЦ МВС; можливі похибки опрацювання — звіряйтеся з
            офіційним джерелом. Ми збираємо лише знеособлену статистику використання (без сторонніх
            трекерів і без збереження ваших персональних даних).
          </p>
          <p className="mt-6 text-[0.8rem] text-[#7E8A9C]">{copy.footer.copyright}</p>
        </div>
      </footer>

      {/* scoped styles: font helpers + date-input theming */}
      <style>{`
        .v2-root { font-family: var(--v2-body), system-ui, sans-serif; }
        .v2-display { font-family: var(--v2-display), var(--v2-body), system-ui, sans-serif; }
        .v2-cta { transition: transform .15s cubic-bezier(0.16,1,0.3,1), box-shadow .2s ease, background-color .2s ease; box-shadow: 0 0 0 rgba(245,169,59,0); }
        .v2-cta:hover { transform: translateY(-2px); box-shadow: 0 8px 30px -8px rgba(245,169,59,0.55); background-color: #F7B85A; }
        .v2-cta:active { transform: translateY(0); }
        .v2-card { transition: transform .15s cubic-bezier(0.16,1,0.3,1), border-color .2s ease; }
        .v2-date::-webkit-calendar-picker-indicator { filter: invert(72%) sepia(48%) saturate(720%) hue-rotate(340deg) brightness(101%); cursor: pointer; }
        .v2-date::-webkit-datetime-edit { color: #EDF1F7; }
        @media (prefers-reduced-motion: reduce) {
          .v2-cta, .v2-card { transition: none; }
        }
      `}</style>
    </div>
  );
}
