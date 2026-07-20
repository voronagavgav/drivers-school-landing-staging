"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Wix_Madefor_Display, Wix_Madefor_Text } from "next/font/google";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Check, ArrowRight, ChevronDown } from "lucide-react";
import { copy, HERO_VARIANT } from "./copy";

const display = Wix_Madefor_Display({
  subsets: ["latin", "cyrillic"],
  weight: ["700", "800"],
  display: "swap",
  variable: "--font-gw-display",
});
const text = Wix_Madefor_Text({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-gw-text",
});

const hero = copy.hero[HERO_VARIANT];

/* ---------- small arc-gauge, state/CSS driven (hero mini-meter) ---------- */
function MiniMeter({ value, reduce }: { value: number; reduce: boolean }) {
  const size = 132;
  const stroke = 11;
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - value / 100);
  const numRef = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);

  // Snap-eased number tick: on a state change, count from the previous value to the new one
  // with a back.out snap so the readiness figure "clicks" up (namesake beat, motion-guarded).
  useEffect(() => {
    const el = numRef.current;
    if (!el) return;
    if (reduce) {
      el.textContent = String(value);
      prev.current = value;
      return;
    }
    const proxy = { v: prev.current };
    const tween = gsap.to(proxy, {
      v: value,
      duration: 0.7,
      ease: "back.out(2.2)",
      snap: { v: 1 },
      onUpdate: () => {
        el.textContent = String(Math.round(proxy.v));
      },
    });
    prev.current = value;
    return () => {
      tween.kill();
    };
  }, [value, reduce]);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(155,232,200,0.14)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--gw-primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{
            transition: reduce ? "none" : "stroke-dashoffset 1.1s cubic-bezier(0.16,1,0.3,1)",
            filter: "drop-shadow(0 0 10px rgba(47,217,143,0.55))",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          ref={numRef}
          className="font-(family-name:--font-gw-display) text-3xl font-extrabold tabular-nums"
          style={{ color: value > 0 ? "var(--gw-primary)" : "var(--gw-muted)" }}
        >
          0
        </span>
        <span className="text-[10px] font-medium tracking-wide text-[var(--gw-muted)]">
          готовність
        </span>
      </div>
    </div>
  );
}

export default function Page() {
  const root = useRef<HTMLDivElement>(null);
  const bigDial = useRef<SVGCircleElement>(null);
  const bigNum = useRef<HTMLSpanElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const sweep = useRef<HTMLDivElement>(null);

  const [answered, setAnswered] = useState<number | null>(null);
  const [meter, setMeter] = useState(0);
  const [reduce, setReduce] = useState(false);
  const [date, setDate] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const demo = copy.hero.demo;
  const chosenCorrect = answered !== null && demo.options[answered].correct;

  // date-plan preview
  const plan = (() => {
    if (!date) return null;
    const target = new Date(date + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.round((target.getTime() - today.getTime()) / 86400000);
    if (isNaN(days) || days <= 0) return { invalid: true } as const;
    const intensive = days < 7;
    const perDay = Math.min(80, Math.max(12, Math.ceil(1200 / days)));
    return { days, perDay, intensive } as const;
  })();

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      // full-motion
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.registerPlugin(ScrollTrigger);

        // hero headline + supporting rise
        gsap.from(".gw-hero-rise", {
          y: 26,
          opacity: 0,
          duration: 1,
          ease: "expo.out",
          stagger: 0.09,
          delay: 0.1,
        });

        // breathing ambient glow behind the dial
        if (glow.current) {
          gsap.to(glow.current, {
            scale: 1.12,
            opacity: 0.85,
            duration: 6,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          });
        }

        // big dial: draw up on enter, then decay visibly (готовність падає)
        if (bigDial.current && bigNum.current) {
          const el = bigDial.current;
          const numEl = bigNum.current;
          const r = Number(el.getAttribute("r"));
          const circ = 2 * Math.PI * r;
          const proxy = { v: 0 };
          const set = () => {
            el.style.strokeDashoffset = String(circ * (1 - proxy.v / 100));
            numEl.textContent = String(Math.round(proxy.v));
          };
          set();
          const tl = gsap.timeline({
            scrollTrigger: { trigger: ".gw-dial-demo", start: "top 68%", once: true },
          });
          tl.to(proxy, { v: 74, duration: 1.3, ease: "expo.out", onUpdate: set })
            .to({}, { duration: 0.5 })
            .to(proxy, { v: 61, duration: 1.6, ease: "power1.inOut", onUpdate: set });
        }

        // soft section reveals (enhance an already-visible default)
        gsap.utils.toArray<HTMLElement>(".gw-reveal").forEach((el) => {
          gsap.from(el, {
            y: 30,
            opacity: 0,
            duration: 0.9,
            ease: "expo.out",
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          });
        });

        ScrollTrigger.refresh();
      });

      // reduced motion: render big dial at a settled final state
      mm.add("(prefers-reduced-motion: reduce)", () => {
        if (bigDial.current && bigNum.current) {
          const el = bigDial.current;
          const r = Number(el.getAttribute("r"));
          const circ = 2 * Math.PI * r;
          el.style.strokeDashoffset = String(circ * (1 - 61 / 100));
          bigNum.current.textContent = "61";
        }
      });
    }, root);

    return () => ctx.revert();
  }, []);

  function pick(i: number) {
    if (answered !== null) return;
    setAnswered(i);
    const correct = demo.options[i].correct;
    // meter ticks up from 0 either way; a correct answer lands higher
    setMeter(correct ? 34 : 12);

    // The «зелена хвиля»: on a CORRECT answer fire the one-shot luminance sweep across
    // the fold. Guarded by `reduce` (reflects prefers-reduced-motion) so it stays clean.
    if (correct && !reduce && sweep.current) {
      const el = sweep.current;
      gsap
        .timeline()
        .set(el, { xPercent: -130, opacity: 0 })
        .to(el, { opacity: 0.9, duration: 0.28, ease: "power1.out" }, 0)
        .to(el, { xPercent: 130, duration: 1.2, ease: "expo.out" }, 0)
        .to(el, { opacity: 0, duration: 0.5, ease: "power1.in" }, ">-0.5");
    }
  }

  const bigR = 128;
  const bigC = 2 * Math.PI * bigR;

  return (
    <div
      ref={root}
      className={`${display.variable} ${text.variable} gw`}
      style={{ fontFamily: "var(--font-gw-text), system-ui, sans-serif" }}
    >
      <style>{gwCss}</style>

      {/* ================= HERO ================= */}
      <header className="gw-band-1 relative overflow-hidden">
        {/* the namesake «зелена хвиля» — a one-shot horizontal luminance sweep across the fold,
            fired from pick() only on a correct answer, only when motion is allowed. */}
        <div
          ref={sweep}
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-20 w-1/2"
          style={{
            opacity: 0,
            background:
              "linear-gradient(90deg, transparent 0%, rgba(47,217,143,0.26) 45%, rgba(155,232,200,0.34) 55%, transparent 100%)",
            filter: "blur(7px)",
          }}
        />
        <nav className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <div className="gw-hero-rise flex items-center gap-2.5">
            <span className="gw-lamp-dot" />
            <span className="font-(family-name:--font-gw-display) text-lg font-extrabold tracking-tight text-[var(--gw-text)]">
              {copy.nav.brand}
            </span>
            <span className="hidden text-xs text-[var(--gw-muted)] sm:inline">
              · {copy.nav.tagline}
            </span>
          </div>
          <Link
            href="/login"
            className="gw-hero-rise rounded-full px-4 py-2 text-sm font-medium text-[var(--gw-accent)] transition-colors hover:bg-[rgba(155,232,200,0.08)]"
          >
            {copy.nav.login}
          </Link>
        </nav>

        <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-y-5 px-5 pt-3 pb-16 sm:gap-y-12 sm:px-8 sm:pt-8 sm:pb-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-x-14 lg:pt-14 lg:pb-28">
          {/* left column */}
          <div className="relative">
            <h1 className="gw-hero-rise font-(family-name:--font-gw-display) text-[clamp(2.35rem,8vw,5.25rem)] font-extrabold leading-[0.98] tracking-[-0.035em] text-balance text-[var(--gw-text)]">
              {hero.headline.map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
            </h1>
            <p className="gw-hero-rise mt-4 max-w-[46ch] text-base leading-relaxed sm:mt-6 sm:text-lg text-[var(--gw-muted)]">
              {hero.subhead}
            </p>

            <p className="gw-hero-rise mt-4 flex items-center gap-2.5 text-base font-medium sm:mt-6 text-[var(--gw-accent)]">
              <span className="gw-lamp-dot" />
              <span>
                {copy.hero.hook}{" "}
                <span className="text-[var(--gw-muted)]">— {copy.hero.hookNote}</span>
              </span>
            </p>

            <div className="gw-hero-rise mt-5 flex flex-wrap gap-2.5 sm:mt-7">
              {copy.hero.chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-[rgba(155,232,200,0.28)] px-3.5 py-1.5 text-xs font-medium text-[var(--gw-accent)]"
                >
                  {chip}
                </span>
              ))}
            </div>

            <div className="gw-hero-rise mt-6 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:items-center">
              <Link href="/register" className="gw-btn-primary">
                {copy.hero.ctaPrimary}
                <ArrowRight className="size-4" />
              </Link>
              <a href="#gw-hero-question" className="gw-btn-ghost">
                {copy.hero.ctaSecondary}
              </a>
            </div>
          </div>

          {/* right column — interactive question + mini meter, with signal column */}
          <div className="gw-hero-rise relative">
            {/* faint abstract signal column (semantics, not scenery) */}
            <div
              aria-hidden
              className="pointer-events-none absolute -right-2 top-1/2 hidden -translate-y-1/2 flex-col gap-3 lg:flex"
            >
              <span className="gw-signal gw-signal-off" />
              <span className="gw-signal gw-signal-off" />
              <span className="gw-signal gw-signal-on" />
            </div>

            <div id="gw-hero-question" className="gw-card relative scroll-mt-24">
              <p className="text-xs font-medium tracking-wide text-[var(--gw-accent)]">
                {demo.kicker}
              </p>
              <p className="mt-3 font-(family-name:--font-gw-display) text-lg font-bold leading-snug text-[var(--gw-text)] sm:text-xl">
                {demo.question}
              </p>

              <div className="mt-4 flex flex-col gap-2 sm:mt-5 sm:gap-2.5">
                {demo.options.map((opt, i) => {
                  const isChosen = answered === i;
                  const revealCorrect = answered !== null && opt.correct;
                  return (
                    <button
                      key={opt.label}
                      onClick={() => pick(i)}
                      disabled={answered !== null}
                      className={`gw-opt ${revealCorrect ? "gw-opt-correct" : ""} ${
                        isChosen && !opt.correct ? "gw-opt-wrong" : ""
                      }`}
                    >
                      <span>{opt.label}</span>
                      {revealCorrect && <Check className="size-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center gap-4 border-t border-[rgba(155,232,200,0.12)] pt-5">
                <MiniMeter value={meter} reduce={reduce} />
                <div className="min-w-0">
                  {answered === null ? (
                    <p className="text-sm leading-relaxed text-[var(--gw-muted)]">
                      {demo.meterCaption}
                    </p>
                  ) : (
                    <p className="text-sm leading-relaxed text-[var(--gw-text)]">
                      {chosenCorrect ? demo.correctNote : demo.wrongNote}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ================= READINESS DIAL DEMO (darkest band — a held breath) ================= */}
      <section className="gw-band-0 gw-dial-demo relative overflow-hidden border-y border-[rgba(155,232,200,0.12)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-14 px-5 py-24 sm:px-8 lg:flex-row lg:gap-20 lg:py-32">
          {/* the dial */}
          <div className="relative flex shrink-0 items-center justify-center">
            <div
              ref={glow}
              aria-hidden
              className="pointer-events-none absolute size-[340px] rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(47,217,143,0.32) 0%, rgba(47,217,143,0.08) 45%, transparent 70%)",
              }}
            />
            <div className="relative" style={{ width: 300, height: 300 }}>
              <svg width={300} height={300} viewBox="0 0 300 300" className="-rotate-90">
                <circle
                  cx={150}
                  cy={150}
                  r={bigR}
                  fill="none"
                  stroke="rgba(155,232,200,0.12)"
                  strokeWidth={16}
                />
                <circle
                  ref={bigDial}
                  cx={150}
                  cy={150}
                  r={bigR}
                  fill="none"
                  stroke="var(--gw-primary)"
                  strokeWidth={16}
                  strokeLinecap="round"
                  strokeDasharray={bigC}
                  strokeDashoffset={bigC}
                  style={{ filter: "drop-shadow(0 0 18px rgba(47,217,143,0.6))" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  ref={bigNum}
                  className="font-(family-name:--font-gw-display) text-7xl font-extrabold tabular-nums text-[var(--gw-primary)]"
                >
                  0
                </span>
                <span className="mt-1 text-sm font-medium tracking-wide text-[var(--gw-muted)]">
                  {copy.dial.caption}
                </span>
              </div>
            </div>
          </div>

          {/* copy */}
          <div className="max-w-[52ch]">
            <h2 className="font-(family-name:--font-gw-display) text-[clamp(2rem,4.5vw,3.1rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-balance text-[var(--gw-text)]">
              {copy.dial.heading}
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-pretty text-[var(--gw-muted)]">
              {copy.dial.body}
            </p>
            <p className="mt-5 flex items-center gap-2.5 text-base font-medium text-[var(--gw-accent)]">
              <span className="inline-block h-px w-6 bg-[var(--gw-accent)]" />
              {copy.dial.decayNote}
            </p>

            <div className="mt-8 rounded-2xl border border-[rgba(155,232,200,0.16)] bg-[rgba(155,232,200,0.04)] p-5">
              <p className="text-xs font-semibold tracking-wide text-[var(--gw-accent)]">
                {copy.dial.moatLabel}
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--gw-text)]">
                {copy.dial.moat}
              </p>
            </div>

            <div className="mt-8">
              <Link href="/register" className="gw-btn-ghost">
                {copy.hero.ctaPrimary}
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ================= EXAM-DATE PLAN PICKER ================= */}
      <section className="gw-band-2 gw-reveal">
        <div className="mx-auto w-full max-w-3xl px-5 py-24 text-center sm:px-8 lg:py-28">
          <h2 className="font-(family-name:--font-gw-display) text-[clamp(2rem,4.5vw,3.1rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-balance text-[var(--gw-text)]">
            {copy.planPicker.heading}
          </h2>
          <p className="mx-auto mt-5 max-w-[48ch] text-lg leading-relaxed text-[var(--gw-muted)]">
            {copy.planPicker.body}
          </p>

          <div className="mx-auto mt-9 flex max-w-md flex-col items-stretch gap-3 sm:flex-row">
            <label className="sr-only" htmlFor="gw-date">
              {copy.planPicker.inputLabel}
            </label>
            <input
              id="gw-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="gw-date-input"
            />
          </div>

          <div className="mx-auto mt-6 min-h-[6rem] max-w-md">
            {!plan && (
              <p className="text-sm leading-relaxed text-[var(--gw-muted)]">
                {copy.planPicker.noDate}
              </p>
            )}
            {plan && "invalid" in plan && (
              <p className="text-sm text-[var(--gw-muted)]">
                Обери майбутню дату — і побачиш ритм підготовки.
              </p>
            )}
            {plan && !("invalid" in plan) && (
              <div className="gw-plan-card">
                <div className="flex items-baseline justify-center gap-8">
                  <div className="text-center">
                    <div className="font-(family-name:--font-gw-display) text-4xl font-extrabold tabular-nums text-[var(--gw-primary)]">
                      {plan.days}
                    </div>
                    <div className="mt-1 text-xs text-[var(--gw-muted)]">
                      {copy.planPicker.daysUnit}
                    </div>
                  </div>
                  <span className="text-2xl text-[var(--gw-muted)]">×</span>
                  <div className="text-center">
                    <div className="font-(family-name:--font-gw-display) text-4xl font-extrabold tabular-nums text-[var(--gw-primary)]">
                      {plan.perDay}
                    </div>
                    <div className="mt-1 text-xs text-[var(--gw-muted)]">
                      {copy.planPicker.perDayUnit}
                    </div>
                  </div>
                </div>
                {plan.intensive && (
                  <p className="mt-4 inline-block rounded-full border border-[rgba(47,217,143,0.4)] px-3 py-1 text-xs font-semibold text-[var(--gw-primary)]">
                    {copy.planPicker.intensive}
                  </p>
                )}
                <p className="mt-4 text-sm text-[var(--gw-muted)]">
                  {copy.planPicker.footnote}
                </p>
                <div className="mt-6 flex justify-center">
                  <Link
                    href={`/register?date=${encodeURIComponent(date)}`}
                    className="gw-btn-primary"
                  >
                    {copy.planPicker.cta}
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ================= EXAM SIMULATOR PROMISE ================= */}
      <section className="gw-band-3 gw-reveal border-y border-[rgba(155,232,200,0.12)]">
        <div className="mx-auto w-full max-w-5xl px-5 py-24 sm:px-8 lg:py-28">
          <h2 className="max-w-[16ch] font-(family-name:--font-gw-display) text-[clamp(2rem,4.5vw,3.1rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-balance text-[var(--gw-text)]">
            {copy.simulator.heading}
          </h2>
          <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-[var(--gw-muted)]">
            {copy.simulator.body}
          </p>

          <div className="mt-12 flex flex-col gap-y-6 divide-y divide-[rgba(155,232,200,0.14)] sm:flex-row sm:items-baseline sm:gap-x-10 sm:divide-x sm:divide-y-0">
            {copy.simulator.facts.map((f) => (
              <div
                key={f.label}
                className="flex items-baseline gap-3 pt-6 first:pt-0 sm:pt-0 sm:pl-10 sm:first:pl-0"
              >
                <span className="font-(family-name:--font-gw-display) text-5xl font-extrabold leading-none tabular-nums text-[var(--gw-primary)]">
                  {f.n}
                </span>
                <span className="text-sm leading-snug text-[var(--gw-muted)]">{f.label}</span>
              </div>
            ))}
          </div>

          <p className="mt-8 max-w-[54ch] text-base leading-relaxed text-[var(--gw-accent)]">
            {copy.simulator.calm}
          </p>
        </div>
      </section>

      {/* ================= PRICING (lightest band — surfacing into daylight) ================= */}
      <section className="gw-band-4 gw-reveal">
        <div className="mx-auto w-full max-w-5xl px-5 py-24 sm:px-8 lg:py-28">
          <div className="text-center">
            <h2 className="font-(family-name:--font-gw-display) text-[clamp(2rem,4.5vw,3.1rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-balance text-[var(--gw-text)]">
              {copy.pricing.heading}
            </h2>
            <p className="mx-auto mt-4 max-w-[46ch] text-lg leading-relaxed text-[var(--gw-muted)]">
              {copy.pricing.subhead}
            </p>
          </div>

          <div className="mt-10 flex flex-col items-center">
            <div className="flex items-baseline gap-1">
              <span className="font-(family-name:--font-gw-display) text-7xl font-extrabold tabular-nums text-[var(--gw-text)]">
                {copy.pricing.price}
              </span>
              <span className="font-(family-name:--font-gw-display) text-4xl font-bold text-[var(--gw-text)]">
                {copy.pricing.currency}
              </span>
            </div>
            <p className="mt-2 text-sm font-medium text-[var(--gw-accent)]">
              {copy.pricing.priceNote}
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-3xl gap-y-10 divide-y divide-[rgba(155,232,200,0.12)] md:grid-cols-2 md:gap-x-12 md:divide-x md:divide-y-0">
            <div className="pt-10 first:pt-0 md:pt-0 md:pr-12 md:first:pr-0">
              <h3 className="font-(family-name:--font-gw-display) text-lg font-bold text-[var(--gw-text)]">
                {copy.pricing.freeTitle}
              </h3>
              <ul className="mt-4 flex flex-col gap-3">
                {copy.pricing.free.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[15px] text-[var(--gw-text)]">
                    <span className="gw-tick mt-1.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt-10 md:pt-0 md:pl-12">
              <h3 className="font-(family-name:--font-gw-display) text-lg font-bold text-[var(--gw-primary)]">
                {copy.pricing.paidTitle}
              </h3>
              <ul className="mt-4 flex flex-col gap-3">
                {copy.pricing.paid.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[15px] text-[var(--gw-text)]">
                    <Check className="mt-0.5 size-4 shrink-0 text-[var(--gw-primary)]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="mx-auto mt-8 max-w-[62ch] text-center text-sm leading-relaxed text-[var(--gw-muted)]">
            {copy.pricing.safety}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {copy.pricing.trust.map((t) => (
              <span
                key={t}
                className="flex items-center gap-2 text-sm font-medium text-[var(--gw-accent)]"
              >
                <span className="gw-lamp-dot" />
                {t}
              </span>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <Link href="/register" className="gw-btn-primary">
              {copy.pricing.cta}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ================= HONEST PROOF / БАЗА ================= */}
      <section className="gw-band-2 gw-reveal border-y border-[rgba(155,232,200,0.12)]">
        <div className="mx-auto w-full max-w-5xl px-5 py-24 sm:px-8 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
            <div>
              <h2 className="font-(family-name:--font-gw-display) text-[clamp(2rem,4.5vw,3.1rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-balance text-[var(--gw-text)]">
                {copy.base.heading}
              </h2>
              <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-[var(--gw-muted)]">
                {copy.base.body}
              </p>

              <div className="mt-8 flex flex-wrap gap-x-10 gap-y-6">
                {copy.base.stats.map((s) => (
                  <div key={s.label}>
                    <div className="font-(family-name:--font-gw-display) text-4xl font-extrabold tabular-nums text-[var(--gw-primary)]">
                      {s.n}
                    </div>
                    <div className="mt-1 text-sm text-[var(--gw-muted)]">{s.label}</div>
                  </div>
                ))}
              </div>

              <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-[rgba(47,217,143,0.35)] px-4 py-1.5 text-sm font-medium text-[var(--gw-primary)]">
                <span className="gw-lamp-dot" />
                {copy.base.freshness}
              </p>
            </div>

            <div className="self-center">
              <p className="text-sm font-semibold tracking-wide text-[var(--gw-accent)]">
                {copy.base.hardest.label}
              </p>
              <ul className="mt-4 flex flex-col divide-y divide-[rgba(155,232,200,0.12)]">
                {copy.base.hardest.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 py-3 text-[15px] text-[var(--gw-text)]"
                  >
                    <span className="gw-tick" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section className="gw-band-1 gw-reveal">
        <div className="mx-auto w-full max-w-3xl px-5 py-24 sm:px-8 lg:py-28">
          <h2 className="font-(family-name:--font-gw-display) text-[clamp(2rem,4.5vw,3.1rem)] font-extrabold leading-[1.05] tracking-[-0.03em] text-balance text-[var(--gw-text)]">
            {copy.faq.heading}
          </h2>

          <div className="mt-10 flex flex-col">
            {copy.faq.items.map((item, i) => {
              const open = openFaq === i;
              return (
                <div key={item.q} className="border-t border-[rgba(155,232,200,0.14)] last:border-b">
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    aria-expanded={open}
                    className="flex w-full items-center justify-between gap-4 py-5 text-left"
                  >
                    <span className="font-(family-name:--font-gw-display) text-lg font-bold text-[var(--gw-text)]">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`size-5 shrink-0 text-[var(--gw-accent)] transition-transform duration-300 ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <div className={`gw-faq-body ${open ? "gw-faq-open" : ""}`}>
                    <div className="overflow-hidden">
                      <p className="max-w-[60ch] pb-5 text-[15px] leading-relaxed text-[var(--gw-muted)]">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA + MODE LAUNCHER ================= */}
      <section className="gw-band-0 gw-reveal border-t border-[rgba(155,232,200,0.12)]">
        <div className="mx-auto w-full max-w-5xl px-5 py-24 sm:px-8 lg:py-28">
          <div className="text-center">
            <h2 className="font-(family-name:--font-gw-display) text-[clamp(2.2rem,5vw,3.6rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-balance text-[var(--gw-text)]">
              {copy.finalCta.heading}
            </h2>
            <p className="mx-auto mt-4 max-w-[44ch] text-lg leading-relaxed text-[var(--gw-muted)]">
              {copy.finalCta.body}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/register" className="gw-btn-primary">
                {copy.finalCta.ctaPrimary}
                <ArrowRight className="size-4" />
              </Link>
              <a href="#gw-hero-question" className="gw-btn-ghost">
                {copy.finalCta.ctaSecondary}
              </a>
            </div>
          </div>

          <div className="mt-14">
            <p className="mb-4 text-center text-sm font-medium tracking-wide text-[var(--gw-accent)]">
              {copy.finalCta.launcherLabel}
            </p>
            <div className="flex flex-col gap-3">
              {copy.finalCta.launcher.map((m) => (
                <Link key={m.title} href={m.href} className="gw-launch-row">
                  <span className="gw-lamp-dot" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-(family-name:--font-gw-display) text-base font-bold text-[var(--gw-text)]">
                      {m.title}
                    </span>
                    <span className="block text-sm text-[var(--gw-muted)]">{m.note}</span>
                  </span>
                  <ArrowRight className="size-5 shrink-0 text-[var(--gw-accent)]" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="gw-band-1 border-t border-[rgba(155,232,200,0.12)]">
        <div className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8">
          <div className="flex items-center gap-2.5">
            <span className="gw-lamp-dot" />
            <span className="font-(family-name:--font-gw-display) text-base font-extrabold text-[var(--gw-text)]">
              {copy.nav.brand}
            </span>
          </div>
          <p className="mt-5 max-w-[80ch] text-xs leading-relaxed text-[var(--gw-muted)]">
            Навчальна платформа для підготовки до теоретичної частини іспиту з ПДР. Це не офіційна
            екзаменаційна система: вона не інтегрована із системами МВС / ГСЦ МВС, не дає права скласти
            державний іспит у застосунку й не гарантує складання іспиту — це тренування, а не гарантія
            результату. Питання ґрунтуються на офіційній базі тестових питань ГСЦ МВС; можливі похибки
            опрацювання — звіряйтеся з офіційним джерелом. Ми збираємо лише знеособлену статистику
            використання, без сторонніх трекерів і без збереження ваших персональних даних.
          </p>
          <p className="mt-6 text-xs text-[var(--gw-muted)]">
            © {new Date().getFullYear()} {copy.nav.brand}. Усі права захищено.
          </p>
        </div>
      </footer>
    </div>
  );
}

const gwCss = `
.gw {
  --gw-bg: #07211B;
  --gw-surface: #0D2F27;
  --gw-text: #EAF6F0;
  --gw-muted: #A8C7BA;
  --gw-primary: #2FD98F;
  --gw-accent: #9BE8C8;
  background: var(--gw-bg);
  color: var(--gw-text);
  -webkit-font-smoothing: antialiased;
}
.gw ::selection { background: rgba(47,217,143,0.28); color: #fff; }

.gw-band-0 { background: #061C17; }
.gw-band-1 { background: #07211B; }
.gw-band-2 { background: #0A2820; }
.gw-band-3 { background: #0D2F27; }
.gw-band-4 { background: #12392F; }

/* traffic-light green dot */
.gw-lamp-dot {
  width: 9px; height: 9px; border-radius: 999px;
  background: var(--gw-primary);
  box-shadow: 0 0 10px 1px rgba(47,217,143,0.7);
  flex: none;
}

/* abstract signal column */
.gw-signal { width: 20px; height: 20px; border-radius: 999px; display: block; }
.gw-signal-off { background: rgba(155,232,200,0.08); }
.gw-signal-on {
  background: var(--gw-primary);
  box-shadow: 0 0 16px 2px rgba(47,217,143,0.75);
}

/* buttons */
.gw-btn-primary {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  background: var(--gw-primary); color: #07211B;
  font-weight: 700; font-size: 1rem;
  padding: 0.85rem 1.6rem; border-radius: 999px;
  box-shadow: 0 0 0 rgba(47,217,143,0); transition: box-shadow .3s ease, transform .2s ease, background .2s ease;
}
.gw-btn-primary:hover { box-shadow: 0 8px 30px -6px rgba(47,217,143,0.55); transform: translateY(-1px); background: #38e59a; }
.gw-btn-primary:active { transform: translateY(0); }

.gw-btn-ghost {
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--gw-accent); font-weight: 500; font-size: 1rem;
  padding: 0.85rem 1.3rem; border-radius: 999px;
  border: 1px solid rgba(155,232,200,0.28);
  transition: background .2s ease, border-color .2s ease;
}
.gw-btn-ghost:hover { background: rgba(155,232,200,0.08); border-color: rgba(155,232,200,0.5); }

/* hero question card */
.gw-card {
  background: linear-gradient(180deg, #103a30 0%, #0D2F27 100%);
  border: 1px solid rgba(155,232,200,0.16);
  border-radius: 1.5rem;
  padding: 1.4rem;
  box-shadow: 0 30px 80px -40px rgba(0,0,0,0.7), 0 0 60px -20px rgba(47,217,143,0.12);
}
@media (min-width: 640px) { .gw-card { padding: 2rem; } }

.gw-opt {
  display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
  width: 100%; text-align: left;
  padding: 0.85rem 1.1rem; border-radius: 0.9rem;
  background: rgba(155,232,200,0.05);
  border: 1px solid rgba(155,232,200,0.16);
  color: var(--gw-text); font-size: 0.975rem; font-weight: 500;
  transition: background .18s ease, border-color .18s ease, transform .18s ease;
}
.gw-opt:hover:not(:disabled) { background: rgba(155,232,200,0.1); border-color: rgba(155,232,200,0.32); }
.gw-opt:disabled { cursor: default; }
.gw-opt-correct {
  background: rgba(47,217,143,0.16);
  border-color: rgba(47,217,143,0.6);
  color: var(--gw-primary);
}
.gw-opt-wrong {
  background: rgba(155,232,200,0.04);
  border-color: rgba(155,232,200,0.22);
  color: var(--gw-muted);
}

/* date input */
.gw-date-input {
  width: 100%;
  background: rgba(155,232,200,0.06);
  border: 1px solid rgba(155,232,200,0.28);
  color: var(--gw-text);
  border-radius: 0.9rem;
  padding: 0.85rem 1.1rem;
  font-size: 1rem; font-family: inherit;
  color-scheme: dark;
  transition: border-color .2s ease;
}
.gw-date-input:focus { outline: none; border-color: var(--gw-primary); }

.gw-plan-card {
  border: 1px solid rgba(47,217,143,0.28);
  background: rgba(47,217,143,0.05);
  border-radius: 1.25rem;
  padding: 1.75rem 1.25rem;
}

/* pricing panels */
.gw-price-panel {
  border: 1px solid rgba(155,232,200,0.16);
  background: rgba(255,255,255,0.02);
  border-radius: 1.25rem;
  padding: 1.75rem;
}
.gw-price-panel-paid {
  border-color: rgba(47,217,143,0.4);
  background: rgba(47,217,143,0.06);
}
.gw-tick {
  width: 7px; height: 7px; border-radius: 999px; flex: none;
  background: var(--gw-accent);
  box-shadow: 0 0 8px rgba(155,232,200,0.5);
}

/* mode launcher rows */
.gw-launch-row {
  display: flex; align-items: center; gap: 0.9rem;
  padding: 1.1rem 1.25rem; border-radius: 1rem;
  background: rgba(155,232,200,0.04);
  border: 1px solid rgba(155,232,200,0.14);
  transition: background .2s ease, border-color .2s ease, transform .2s ease;
}
.gw-launch-row:hover { background: rgba(155,232,200,0.09); border-color: rgba(155,232,200,0.3); transform: translateX(2px); }

/* FAQ smooth height */
.gw-faq-body {
  display: grid; grid-template-rows: 0fr;
  transition: grid-template-rows .34s cubic-bezier(0.16,1,0.3,1);
}
.gw-faq-open { grid-template-rows: 1fr; }

@media (prefers-reduced-motion: reduce) {
  .gw-btn-primary, .gw-btn-ghost, .gw-launch-row, .gw-opt { transition: none; }
  .gw-faq-body { transition: none; }
}
`;
