"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import Link from "next/link";
import { Golos_Text } from "next/font/google";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  Check,
  X,
  Clock,
  ChevronDown,
  ShieldCheck,
  ListChecks,
  Timer,
  Target,
  Rewind,
  Wallet,
  Sunrise,
} from "lucide-react";
import { copy, HERO_VARIANT, N } from "./copy";

const golos = Golos_Text({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "700", "800"],
  display: "swap",
  variable: "--font-golos",
});

const hero = copy.hero;
const hv = copy.hero[HERO_VARIANT];

// subtle film grain (data-URI, no external asset) — the blue-hour sky is a CSS
// gradient with grain per the concept; not fixed, so it captures in screenshots.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

/* --------------------------- reduced-motion hook --------------------------- */
function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const on = () => setReduce(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduce;
}

/* ------------------------------ readiness dial ----------------------------- */
function Dial({ v, size = 188, stroke = 13 }: { v: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, v));
  const off = c * (1 - clamped / 100);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block" aria-hidden>
        <defs>
          <linearGradient id="v27dialgrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#A79BFF" />
            <stop offset="100%" stopColor="#6E5BFF" />
          </linearGradient>
          <filter id="v27dialglow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F2F0FF" strokeOpacity={0.09} strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="url(#v27dialgrad)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={off}
            filter="url(#v27dialglow)"
          />
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-(family-name:--font-golos) text-5xl font-extrabold leading-none tracking-tight text-[#F2F0FF] [font-variant-numeric:tabular-nums]">
          {Math.round(clamped)}
        </span>
        <span className="mt-1 text-[13px] font-medium tracking-wide text-[#8E88C4]">готовність</span>
      </div>
    </div>
  );
}

/* ------------------------- luminous periwinkle pill ------------------------ */
function PrimaryPill({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={`group/pill relative inline-flex items-center gap-2.5 rounded-full bg-[#C9C4FF] pl-6 pr-2.5 py-2.5 text-[15px] font-semibold text-[#1A1740] shadow-[0_0_0_1px_rgba(201,196,255,0.4),0_18px_50px_-12px_rgba(110,91,255,0.65)] transition-[transform,box-shadow] duration-300 ease-out hover:shadow-[0_0_0_1px_rgba(201,196,255,0.6),0_24px_60px_-10px_rgba(110,91,255,0.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9C4FF]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D0C22] ${className}`}
    >
      <span>{children}</span>
      <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-[#8271FF] to-[#6E5BFF] text-white transition-transform duration-300 ease-out group-hover/pill:translate-x-1">
        <ArrowRight className="size-4" strokeWidth={2.4} />
      </span>
    </Link>
  );
}

const GHOST_CLASS =
  "inline-flex items-center justify-center rounded-full border border-[#F2F0FF]/15 px-6 py-2.5 text-[15px] font-medium text-[#C9C6E8] transition-colors duration-200 hover:border-[#F2F0FF]/30 hover:text-[#F2F0FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F2F0FF]/25";

function GhostButton({ onClick, children, ariaLabel, className = "" }: { onClick: () => void; children: ReactNode; ariaLabel?: string; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={ariaLabel} className={`${GHOST_CLASS} ${className}`}>
      {children}
    </button>
  );
}

/* ------------------------------ clock watermark ---------------------------- */
function ClockWatermark({ className = "" }: { className?: string }) {
  const ticks = Array.from({ length: 12 });
  // round to 2dp so server + client serialize identical strings (no float ULP
  // hydration mismatch from Math.cos/Math.sin across JS engines)
  const rnd = (n: number) => Math.round(n * 100) / 100;
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden fill="none">
      <circle cx="100" cy="100" r="94" stroke="#C9C4FF" strokeOpacity="0.12" strokeWidth="0.75" />
      <circle cx="100" cy="100" r="70" stroke="#C9C4FF" strokeOpacity="0.07" strokeWidth="0.5" />
      {ticks.map((_, i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const long = i % 3 === 0;
        const r1 = long ? 80 : 86;
        const r2 = 94;
        return (
          <line
            key={i}
            x1={rnd(100 + Math.cos(a) * r1)}
            y1={rnd(100 + Math.sin(a) * r1)}
            x2={rnd(100 + Math.cos(a) * r2)}
            y2={rnd(100 + Math.sin(a) * r2)}
            stroke="#C9C4FF"
            strokeOpacity={long ? 0.16 : 0.09}
            strokeWidth={long ? 1 : 0.6}
          />
        );
      })}
      {/* hands pointing to ~8:00 */}
      <line x1="100" y1="100" x2="100" y2="52" stroke="#A79BFF" strokeOpacity="0.16" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="100" y1="100" x2="66" y2="118" stroke="#A79BFF" strokeOpacity="0.16" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="100" cy="100" r="2.4" fill="#A79BFF" fillOpacity="0.2" />
    </svg>
  );
}

/* ------------------------ hero interactive question ------------------------ */
function HeroQuestion({ onAnswered }: { onAnswered: (correct: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const d = hero.demo;
  const answered = picked !== null;
  const correct = answered && d.options[picked!].correct;

  return (
    <div className="w-full rounded-2xl border border-[#F2F0FF]/10 bg-[#1E1B3A]/90 p-5 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.9)] backdrop-blur-sm">
      <div className="flex items-center gap-2 text-[12px] font-medium text-[#A79BFF]">
        <span className="flex size-5 items-center justify-center rounded-full bg-[#6E5BFF]/15">
          <Sunrise className="size-3" strokeWidth={2.4} />
        </span>
        {d.kicker}
      </div>
      <p className="mt-3 text-[15px] font-medium leading-snug text-[#F2F0FF]">{d.question}</p>
      <div className="mt-4 flex flex-col gap-2" role="group" aria-label={d.question}>
        {d.options.map((o, i) => {
          const isPicked = picked === i;
          const showCorrect = answered && o.correct;
          const showWrong = answered && isPicked && !o.correct;
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => {
                if (answered) return;
                setPicked(i);
                onAnswered(o.correct);
              }}
              className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-left text-[14px] font-medium transition-colors duration-200 ${
                showCorrect
                  ? "border-[#6E5BFF]/60 bg-[#6E5BFF]/15 text-[#F2F0FF]"
                  : showWrong
                    ? "border-[#F2A0B4]/40 bg-[#F2A0B4]/10 text-[#F6D6DE]"
                    : "border-[#F2F0FF]/10 bg-[#0D0C22]/40 text-[#C9C6E8] hover:border-[#F2F0FF]/25 hover:text-[#F2F0FF] disabled:hover:border-[#F2F0FF]/10"
              }`}
            >
              {o.label}
              {showCorrect && <Check className="size-4 text-[#A79BFF]" strokeWidth={2.6} />}
              {showWrong && <X className="size-4 text-[#F2A0B4]" strokeWidth={2.6} />}
            </button>
          );
        })}
      </div>
      <div aria-live="polite">
        {answered && (
          <p className={`mt-3 text-[13px] leading-relaxed ${correct ? "text-[#A79BFF]" : "text-[#F2A0B4]"}`}>
            {correct ? d.explainCorrect : d.explainWrong}
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- FAQ item ---------------------------------- */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#F2F0FF]/8">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-4 py-5 text-left">
        <span className="text-[16px] font-semibold text-[#F2F0FF]">{q}</span>
        <ChevronDown className={`size-5 shrink-0 text-[#8E88C4] transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <div className="grid transition-[grid-template-rows] duration-300 ease-out" style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
        <div className="overflow-hidden">
          <p className="pb-5 pr-8 text-[15px] leading-[1.7] text-[#C9C6E8]">{a}</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ timeline stop ------------------------------ */
function TimelineStop({ time, place, children }: { time: string; place: string; children: ReactNode }) {
  return (
    <article className="relative pb-16 sm:pb-24">
      {/* node on the spine — positioned in the SAME coord system as the spine
          (spine lives in the max-w-4xl container at left-18/30; this article sits
          inside the pl-10/pl-16 rail, so pull the node back onto the spine). */}
      <span className="absolute left-[-42px] top-[6px] z-10 flex size-3 -translate-x-1/2 items-center justify-center sm:left-[-66px]">
        <span className="size-3 rounded-full bg-[#A79BFF] shadow-[0_0_0_5px_rgba(110,91,255,0.14),0_0_18px_2px_rgba(167,155,255,0.55)]" />
      </span>
      <header data-reveal className="mb-6">
        <time className="font-(family-name:--font-golos) text-[clamp(1.75rem,5vw,2.6rem)] font-extrabold leading-none tracking-tight text-[#C9C4FF] [font-variant-numeric:tabular-nums]">
          {time}
        </time>
        <p className="mt-1.5 text-[14px] font-medium uppercase tracking-[0.14em] text-[#8E88C4]">{place}</p>
      </header>
      {children}
    </article>
  );
}

/* --------------------------------- page ------------------------------------ */
export default function V27Page() {
  const reduce = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const spineFill = useRef<HTMLDivElement>(null);
  const rewindSpine = useRef<HTMLDivElement>(null);
  const rewindSky = useRef<HTMLDivElement>(null);

  // hero readiness meter (ticks up from 0 on first answer)
  const [heroV, setHeroV] = useState(0);
  const [heroResult, setHeroResult] = useState<"correct" | "wrong" | null>(null);
  const heroTween = useRef<gsap.core.Tween | null>(null);
  const onHeroAnswer = useCallback(
    (correct: boolean) => {
      // A wrong first answer must NOT reward failure — it settles LOW, below the
      // value a correct answer earns (never mimics the seen-count inflation the
      // page denounces). Correct nudges up honestly.
      const target = correct ? 31 : 4;
      setHeroResult(correct ? "correct" : "wrong");
      if (reduce) {
        setHeroV(target);
        return;
      }
      const proxy = { v: heroV };
      heroTween.current?.kill();
      heroTween.current = gsap.to(proxy, {
        v: target,
        duration: 0.9,
        ease: "power3.out",
        onUpdate: () => setHeroV(proxy.v),
      });
    },
    [heroV, reduce],
  );

  // decaying dial in the dial-demo section (honesty as behavior). It must NEVER
  // tween UPWARD — a rising dial with no action would contradict «осідає сам».
  // So: decay 84→61, hold, fade OUT, reset to 84 while invisible, fade back in.
  const [decayV, setDecayV] = useState(84);
  const [decayFade, setDecayFade] = useState(1);
  useEffect(() => {
    if (reduce) {
      setDecayV(72);
      setDecayFade(1);
      return;
    }
    const proxy = { v: 84, o: 1 };
    const sync = () => {
      setDecayV(proxy.v);
      setDecayFade(proxy.o);
    };
    const tl = gsap.timeline({ repeat: -1 });
    tl.to(proxy, { v: 61, duration: 5.5, ease: "expo.out", onUpdate: sync }) // осідає
      .to({}, { duration: 1.1 }) // held one beat at the settled low
      .to(proxy, { o: 0, duration: 0.45, ease: "power1.in", onUpdate: sync }) // fade out
      .set(proxy, { v: 84 }) // reset value while invisible — no visible upward tween
      .to(proxy, { o: 1, duration: 0.55, ease: "power1.out", onUpdate: sync }); // fade back in at 84
    return () => {
      tl.kill();
    };
  }, [reduce]);

  // scroll choreography: the spine draws down; the rewind spine draws UP (reverse)
  useEffect(() => {
    if (!root.current) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      if (reduce) return;

      // hero entrance
      gsap.from("[data-hero-rise]", { y: 24, opacity: 0, duration: 0.9, ease: "power3.out", stagger: 0.08 });
      gsap.from("[data-hero-card]", { y: 30, opacity: 0, duration: 1, ease: "power3.out", delay: 0.3, stagger: 0.12 });

      // the documentary spine draws downward as the morning unfolds
      if (spineFill.current) {
        gsap.fromTo(
          spineFill.current,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            scrollTrigger: { trigger: "[data-timeline]", start: "top 72%", end: "bottom 78%", scrub: true },
          },
        );
      }
      // the signature reversal: at ПЕРЕМОТКА the spine draws the other way (up)
      if (rewindSpine.current) {
        gsap.fromTo(
          rewindSpine.current,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            scrollTrigger: { trigger: "[data-rewind]", start: "top 82%", end: "top 30%", scrub: true },
          },
        );
      }
      // …and the sky cross-fades one indigo step lighter across the same run —
      // the palette movement the concept mandates, actually animating.
      if (rewindSky.current) {
        gsap.fromTo(
          rewindSky.current,
          { opacity: 0 },
          {
            opacity: 1,
            ease: "none",
            scrollTrigger: { trigger: "[data-rewind]", start: "top 72%", end: "top 22%", scrub: true },
          },
        );
      }

      // section reveals — enhance an already-visible default (never gate visibility)
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.fromTo(
          el,
          { y: 24, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power3.out",
            immediateRender: false,
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          },
        );
      });
    }, root);
    return () => ctx.revert();
  }, [reduce]);

  // «Спробувати без реєстрації» → the in-page, no-network hero question demo.
  const scrollToDemo = useCallback(() => {
    const el = document.getElementById("hero-demo");
    if (!el) return;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    const firstBtn = el.querySelector<HTMLButtonElement>("button");
    if (firstBtn) window.setTimeout(() => firstBtn.focus(), reduce ? 0 : 500);
  }, [reduce]);

  // date → shrinking plan preview
  const [days, setDays] = useState<number | null>(null);
  const onDate = (val: string) => {
    if (!val) {
      setDays(null);
      return;
    }
    const target = new Date(val + "T00:00:00");
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    setDays(Math.round((target.getTime() - now.getTime()) / 86400000));
  };
  // pace the plan against the CATEGORY-B pool (not the whole-bank N.bank) so the
  // «≈N днів × M питань/день» preview is honest for the typical cat-B visitor.
  const POOL = N.poolB;
  const MAX_PER_DAY = 60;
  const isToday = days === 0; // morning-of framing: same-day is intensive, not "past"
  const past = days !== null && days < 0;
  const plan =
    days === null || past || isToday
      ? null
      : { intensive: days < 7, perDay: Math.min(MAX_PER_DAY, Math.max(10, Math.ceil(POOL / days))), d: days };

  const tl = copy.timeline;

  return (
    <div
      ref={root}
      className={`${golos.variable} relative w-full overflow-x-hidden bg-[#0D0C22] font-(family-name:--font-golos) text-[#F2F0FF] antialiased`}
    >
      {/* ------------------------------- nav ------------------------------------ */}
      <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[17px] font-extrabold tracking-tight text-[#F2F0FF]">{copy.nav.brand}</span>
          <span className="hidden text-[13px] font-medium text-[#8E88C4] sm:inline">{copy.nav.tagline}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="rounded-full px-4 py-2.5 text-[14px] font-medium text-[#C9C6E8] transition-colors hover:text-[#F2F0FF]">
            {copy.nav.login}
          </Link>
          <Link href="/register" className="rounded-full bg-[#F2F0FF]/8 px-4 py-2.5 text-[14px] font-semibold text-[#F2F0FF] transition-colors hover:bg-[#F2F0FF]/14">
            {copy.nav.cta}
          </Link>
        </div>
      </header>

      {/* ------------------------------- hero ----------------------------------- */}
      <section
        className="relative overflow-hidden"
        style={{ background: "radial-gradient(125% 90% at 50% 8%, #2A245C 0%, #201B47 30%, #16132F 62%, #0D0C22 100%)" }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-soft-light" style={{ backgroundImage: GRAIN }} />
        <div className="relative mx-auto w-full max-w-6xl px-5 pb-24 pt-8 sm:px-8 sm:pt-12 lg:pt-16">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            {/* left */}
            <div className="relative z-10">
              <ClockWatermark className="pointer-events-none absolute -left-8 -top-16 -z-10 h-[320px] w-[320px] sm:-left-16 sm:h-[420px] sm:w-[420px]" />
              <p data-hero-rise className="flex flex-wrap items-baseline gap-x-2 text-[15px] font-medium text-[#9A94CE]">
                <span className="text-[#F2F0FF]">{hero.stat}</span>
                <span className="text-[#8E88C4]">· {hero.statNote}</span>
              </p>
              <h1
                data-hero-rise
                className="mt-5 text-balance font-(family-name:--font-golos) text-[clamp(2.9rem,8vw,5.4rem)] font-extrabold leading-[0.98] tracking-[-0.02em] text-[#F2F0FF]"
              >
                {hv.headline.map((ln, i) => (
                  <span key={i} className="block">
                    {ln === hv.highlight ? <span className="text-[#C9C4FF]">{ln}</span> : ln}
                  </span>
                ))}
              </h1>
              <p data-hero-rise className="mt-6 max-w-lg text-pretty text-[18px] leading-[1.6] text-[#C9C6E8]">
                {hv.subhead}
              </p>
              <div data-hero-rise className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <PrimaryPill href="/register" className="justify-center sm:justify-start">
                  {hero.ctaPrimary}
                </PrimaryPill>
                <GhostButton onClick={scrollToDemo} ariaLabel="спробувати без реєстрації" className="justify-center">
                  {hero.ctaSecondary}
                </GhostButton>
              </div>
              <ul data-hero-rise className="mt-8 flex flex-wrap gap-2 text-[13px]">
                {hero.chips.map((c) => (
                  <li key={c} className="rounded-full border border-[#F2F0FF]/10 bg-[#1E1B3A]/60 px-3 py-1.5 font-medium text-[#B9B4E0]">
                    {c}
                  </li>
                ))}
              </ul>
            </div>

            {/* right: the first question of your morning + mini meter */}
            <div className="flex flex-col gap-5">
              <div id="hero-demo" data-hero-card className="scroll-mt-24">
                <HeroQuestion onAnswered={onHeroAnswer} />
              </div>
              <div data-hero-card className="flex items-center gap-4 rounded-2xl border border-[#F2F0FF]/10 bg-[#1E1B3A]/80 p-5 shadow-[0_30px_70px_-40px_rgba(0,0,0,0.8)] backdrop-blur-sm">
                <Dial v={heroV} size={92} stroke={9} />
                <div aria-live="polite">
                  <p className="text-[13px] font-medium text-[#8E88C4]">{hero.dialCard.label}</p>
                  <p className="mt-1 text-[13px] leading-snug text-[#C9C6E8]">
                    {heroResult === "wrong"
                      ? hero.dialCard.captionWrong
                      : heroResult === "correct"
                        ? hero.dialCard.captionAfter
                        : hero.demo.meterHint}
                  </p>
                  {heroResult && <span className="sr-only">Готовність {Math.round(heroV)} зі 100</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------- documentary timeline (07:40 → 08:20) ------------ */}
      <section aria-label={tl.label}>
        {/* stops 07:40 & 08:00 sit on the descending indigo ground */}
        <div data-timeline className="relative" style={{ background: "linear-gradient(180deg, #0D0C22 0%, #100E24 45%, #0A0917 100%)" }}>
          <div className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-soft-light" style={{ backgroundImage: GRAIN }} />
          <div className="relative mx-auto w-full max-w-4xl px-5 pt-20 sm:px-8 sm:pt-28">
            <p data-reveal className="mb-14 pl-10 text-[13px] font-medium uppercase tracking-[0.16em] text-[#8E88C4] sm:pl-16">
              {tl.label}
            </p>
            {/* spine track + fill */}
            <div className="absolute bottom-0 left-[18px] top-0 w-px bg-[#F2F0FF]/10 sm:left-[30px]" aria-hidden />
            <div
              ref={spineFill}
              className="absolute bottom-0 left-[18px] top-0 w-px origin-top bg-gradient-to-b from-[#C9C4FF] via-[#8271FF] to-[#6E5BFF]/40 sm:left-[30px]"
              style={{ boxShadow: "0 0 12px 1px rgba(130,113,255,0.5)" }}
              aria-hidden
            />

            <div className="relative pl-10 sm:pl-16">
              {/* 07:40 */}
              <TimelineStop time={tl.stop1.time} place={tl.stop1.place}>
                <div data-reveal className="max-w-xl">
                  <p className="text-[clamp(1.15rem,2.6vw,1.5rem)] font-semibold leading-snug text-[#F2F0FF]">{tl.stop1.lead}</p>
                  <p className="mt-3 text-[16px] leading-[1.65] text-[#C9C6E8]">{tl.stop1.body}</p>
                  <div className="mt-6 inline-flex items-center gap-4 rounded-2xl border border-[#F2F0FF]/10 bg-[#1E1B3A]/70 px-5 py-4">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-[#6E5BFF]/15 text-[#A79BFF]">
                      <Wallet className="size-5" strokeWidth={2} />
                    </span>
                    <div>
                      <p className="font-(family-name:--font-golos) text-[1.9rem] font-extrabold leading-none tracking-tight text-[#F2F0FF] [font-variant-numeric:tabular-nums]">
                        {tl.stop1.factValue}
                      </p>
                      <p className="mt-1 text-[13px] text-[#9A94CE]">
                        {tl.stop1.factLabel} · {tl.stop1.factNote}
                      </p>
                    </div>
                  </div>
                </div>
              </TimelineStop>

              {/* 08:00 */}
              <TimelineStop time={tl.stop2.time} place={tl.stop2.place}>
                <div data-reveal className="max-w-xl">
                  <p className="text-[clamp(1.15rem,2.6vw,1.5rem)] font-semibold leading-snug text-[#F2F0FF]">{tl.stop2.lead}</p>
                  <p className="mt-3 text-[16px] leading-[1.65] text-[#C9C6E8]">{tl.stop2.body}</p>
                  <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-[#F2F0FF]/8 bg-[#F2F0FF]/8">
                    {tl.stop2.format.map((f, i) => (
                      <div key={i} className="flex flex-col items-center bg-[#151230] px-3 py-6 text-center">
                        <span className="font-(family-name:--font-golos) text-[clamp(1.9rem,5vw,3rem)] font-extrabold leading-none tracking-tight text-[#F2F0FF] [font-variant-numeric:tabular-nums]">
                          {f.k}
                        </span>
                        <span className="mt-2 text-[12px] font-medium leading-tight text-[#9A94CE]">{f.label}</span>
                      </div>
                    ))}
                  </div>
                  {/* one decisive proof asset — a real restyled official question image,
                      served as a static file (no DB) so the simulator beat SHOWS the
                      product's most tangible asset instead of being text-only. */}
                  <figure className="mt-5 overflow-hidden rounded-2xl border border-[#F2F0FF]/10 bg-[#151230]">
                    <div className="relative aspect-[16/9] w-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/restyled-live/11_10_0.png"
                        alt={tl.stop2.previewAlt}
                        width={512}
                        height={288}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    </div>
                    <figcaption className="flex items-center gap-2 border-t border-[#F2F0FF]/8 px-4 py-3 text-[12.5px] leading-snug text-[#9A94CE]">
                      <span className="size-1.5 shrink-0 rounded-full bg-[#A79BFF]" />
                      {tl.stop2.previewCaption}
                    </figcaption>
                  </figure>
                  <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#6E5BFF]/25 bg-[#6E5BFF]/10 px-5 py-4">
                    <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#A79BFF]" strokeWidth={2} />
                    <div>
                      <p className="text-[15px] font-semibold text-[#F2F0FF]">{tl.stop2.promiseTitle}</p>
                      <p className="mt-1 text-[14px] leading-[1.6] text-[#C9C6E8]">{tl.stop2.promiseBody}</p>
                    </div>
                  </div>
                </div>
              </TimelineStop>

              {/* 08:20 — the darkest full-bleed nadir, held one beat */}
              <div className="relative -mx-5 sm:-mx-16">
                {/* node lives OUTSIDE the overflow-hidden panel so it isn't clipped,
                    positioned onto the spine (spine x = 18/30 in the container coords). */}
                <span className="absolute left-[-22px] top-[70px] z-10 flex size-3 -translate-x-1/2 sm:left-[-2px] sm:top-[86px]">
                  <span className="size-3 rounded-full bg-[#F2A0B4] shadow-[0_0_0_5px_rgba(242,160,180,0.12),0_0_18px_2px_rgba(242,160,180,0.5)]" />
                </span>
                <div className="relative overflow-hidden bg-[#08070F] px-5 py-16 sm:px-16 sm:py-20">
                  <div className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-soft-light" style={{ backgroundImage: GRAIN }} />
                  <div className="relative pl-10 sm:pl-12">
                    <header data-reveal className="mb-6">
                      <time className="font-(family-name:--font-golos) text-[clamp(1.75rem,5vw,2.6rem)] font-extrabold leading-none tracking-tight text-[#F2A0B4] [font-variant-numeric:tabular-nums]">
                        {tl.stop3.time}
                      </time>
                      <p className="mt-1.5 text-[14px] font-medium uppercase tracking-[0.14em] text-[#8E88C4]">{tl.stop3.place}</p>
                    </header>
                    <div data-reveal className="flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-10">
                      <p className="font-(family-name:--font-golos) text-[clamp(4.5rem,16vw,9rem)] font-extrabold leading-[0.85] tracking-[-0.03em] text-[#F2F0FF]">
                        {tl.stop3.big}
                      </p>
                      <p className="max-w-xs pb-2 text-[17px] leading-[1.5] text-[#C9C6E8]">{tl.stop3.bigCaption}</p>
                    </div>
                    <p data-reveal className="mt-8 max-w-2xl text-pretty text-[17px] leading-[1.7] text-[#B9B4E0]">
                      {tl.stop3.line}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------ ПЕРЕМОТКА — the turn -------------------------- */}
      <section data-rewind className="relative overflow-hidden" style={{ background: "linear-gradient(180deg, #0A0917 0%, #1B1743 40%, #1A1640 100%)" }}>
        {/* signature moment: the sky cross-fades ONE indigo step lighter as the
            reversal completes — the only palette movement on the page. Scrubbed by
            ScrollTrigger; instant (default-on) under prefers-reduced-motion. */}
        <div
          ref={rewindSky}
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: reduce ? 1 : 0,
            background: "linear-gradient(180deg, #17143C 0%, #2A2568 45%, #241F5A 100%)",
          }}
        />
        <div className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-soft-light" style={{ backgroundImage: GRAIN }} />
        <div className="relative mx-auto w-full max-w-6xl px-5 py-24 sm:px-8 sm:py-28">
          {/* the documentary spine continues here but REVERSES — it draws UPWARD
              (origin-bottom) over a long run, visible on mobile too, so the narrative
              turn carries a real visual signature at every width. */}
          <div className="pointer-events-none absolute left-[18px] top-0 h-44 w-px -translate-x-1/2 bg-[#F2F0FF]/10 sm:left-1/2 sm:h-52" aria-hidden>
            <div
              ref={rewindSpine}
              className="absolute bottom-0 left-0 h-full w-px origin-bottom bg-gradient-to-t from-[#C9C4FF] via-[#8271FF] to-transparent"
              style={{ boxShadow: "0 0 12px 1px rgba(130,113,255,0.5)" }}
            />
            <span className="absolute bottom-0 left-1/2 flex size-3 -translate-x-1/2 translate-y-1/2 items-center justify-center">
              <span className="size-3 rounded-full bg-[#C9C4FF] shadow-[0_0_0_5px_rgba(130,113,255,0.16),0_0_18px_2px_rgba(201,196,255,0.6)]" />
            </span>
          </div>
          <div data-reveal className="mx-auto mb-12 flex max-w-2xl flex-col items-center pt-16 text-center sm:pt-20">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#C9C4FF]/25 bg-[#C9C4FF]/8 px-4 py-1.5 text-[13px] font-semibold text-[#C9C4FF]">
              <Rewind className="size-4" strokeWidth={2} /> {copy.rewind.label}
            </span>
            <h2 className="text-balance font-(family-name:--font-golos) text-[clamp(2rem,5.5vw,3.4rem)] font-extrabold leading-[1.04] tracking-[-0.02em] text-[#F2F0FF]">
              {copy.rewind.heading.map((ln, i) => (
                <span key={i} className="block">
                  {ln === copy.rewind.highlight ? <span className="text-[#C9C4FF]">{ln}</span> : ln}
                </span>
              ))}
            </h2>
            <p className="mt-5 max-w-xl text-pretty text-[17px] leading-[1.65] text-[#C9C6E8]">{copy.rewind.body}</p>
          </div>

          <div data-reveal className="mx-auto max-w-lg rounded-3xl border border-[#F2F0FF]/10 bg-[#211B4A]/80 p-7 shadow-[0_50px_100px_-50px_rgba(0,0,0,0.9)] backdrop-blur-sm sm:p-8">
            <label htmlFor="v27-exam-date" className="block text-[13px] font-medium text-[#8E88C4]">
              {copy.rewind.inputLabel}
            </label>
            <input
              id="v27-exam-date"
              type="date"
              onChange={(e) => onDate(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[#F2F0FF]/12 bg-[#14122B] px-4 py-3 text-[16px] text-[#F2F0FF] outline-none transition-colors focus:border-[#6E5BFF]/60 [color-scheme:dark]"
            />
            <div className="mt-6 rounded-2xl border border-[#F2F0FF]/8 bg-[#14122B]/60 p-6">
              {days === null ? (
                <p className="text-[15px] leading-relaxed text-[#9A94CE]">{copy.rewind.noDate}</p>
              ) : isToday ? (
                <p className="text-[15px] leading-relaxed text-[#C9C4FF]">{copy.rewind.today}</p>
              ) : past || plan === null ? (
                <p className="text-[15px] leading-relaxed text-[#F2A0B4]">{copy.rewind.pastDate}</p>
              ) : (
                <div>
                  <p className="font-(family-name:--font-golos) text-[clamp(1.5rem,4vw,2.1rem)] font-extrabold tracking-tight text-[#F2F0FF] [font-variant-numeric:tabular-nums]">
                    {copy.rewind.resultTemplate(Math.max(1, plan.d), plan.perDay)}
                  </p>
                  <p className="mt-2 text-[14px] text-[#C9C6E8]">
                    {plan.intensive ? copy.rewind.intensiveTemplate(Math.max(1, plan.d), plan.perDay) : copy.rewind.resultSub}
                  </p>
                  {plan.intensive && (
                    <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#6E5BFF]/15 px-3 py-1 text-[12px] font-semibold text-[#A79BFF]">
                      <Clock className="size-3.5" /> {copy.rewind.intensiveLabel}
                    </span>
                  )}
                </div>
              )}
            </div>
            <p className="mt-5 text-[13.5px] leading-relaxed text-[#9A94CE]">{copy.rewind.frame}</p>
            <div className="mt-6">
              <PrimaryPill href="/register">{copy.rewind.cta}</PrimaryPill>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------- readiness dial demo -------------------------- */}
      <section className="relative bg-[#17143C]">
        <div className="mx-auto w-full max-w-6xl px-5 py-24 sm:px-8 sm:py-28">
          <div className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr]">
            <div data-reveal className="order-2 flex flex-col items-center lg:order-1">
              <div className="relative flex flex-col items-center rounded-3xl border border-[#F2F0FF]/8 bg-[#211B4A] px-10 py-12 shadow-[0_50px_100px_-50px_rgba(0,0,0,0.9)]">
                <div style={{ opacity: decayFade }} className="transition-none">
                  <Dial v={decayV} size={210} stroke={15} />
                </div>
                <p className="mt-6 max-w-[240px] text-center text-[13.5px] leading-relaxed text-[#8E88C4]">
                  {reduce ? copy.dial.decayNoteStatic : copy.dial.decayNote}
                </p>
              </div>
            </div>
            <div data-reveal className="order-1 lg:order-2">
              <p className="text-[13px] font-medium tracking-wide text-[#8E88C4]">{copy.dial.caption}</p>
              <h2 className="mt-4 text-balance font-(family-name:--font-golos) text-[clamp(1.9rem,4.6vw,3.1rem)] font-extrabold leading-[1.04] tracking-[-0.015em] text-[#F2F0FF]">
                {copy.dial.heading.map((ln, i) => (
                  <span key={i} className="block">
                    {ln === copy.dial.highlight ? <span className="text-[#C9C4FF]">{ln}</span> : ln}
                  </span>
                ))}
              </h2>
              <p className="mt-5 max-w-xl text-pretty text-[17px] leading-[1.65] text-[#C9C6E8]">{copy.dial.body}</p>
              <div className="mt-8 space-y-6">
                {copy.dial.points.map((p) => (
                  <div key={p.title} className="flex gap-4">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#A79BFF]/80" />
                    <div>
                      <p className="text-[16px] font-semibold text-[#F2F0FF]">{p.title}</p>
                      <p className="mt-1 max-w-md text-[15px] leading-[1.6] text-[#C9C6E8]">{p.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-8 max-w-md border-l border-[#C9C4FF]/30 pl-4 text-[14.5px] font-medium leading-[1.6] text-[#C9C4FF]">
                {copy.dial.moat}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------ mechanism ------------------------------- */}
      <section className="relative bg-[#1B1743]">
        <div className="mx-auto w-full max-w-6xl px-5 py-24 sm:px-8 sm:py-28">
          <div data-reveal className="max-w-2xl">
            {/* timestamp motif — the evening mirror of the exam-morning timeline */}
            <p className="text-[14px] font-semibold tracking-[0.02em] text-[#C9C4FF] [font-variant-numeric:tabular-nums]">
              {copy.mechanism.caption}
            </p>
            <h2 className="mt-3 text-balance font-(family-name:--font-golos) text-[clamp(1.9rem,4.6vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.015em] text-[#F2F0FF]">
              {copy.mechanism.heading}
            </h2>
            <p className="mt-5 max-w-xl text-pretty text-[17px] leading-[1.65] text-[#C9C6E8]">{copy.mechanism.body}</p>
          </div>
          <ol data-reveal className="mt-12 grid gap-5 md:grid-cols-3">
            {copy.mechanism.steps.map((s) => (
              <li key={s.n} className="relative flex flex-col rounded-3xl border border-[#F2F0FF]/8 bg-[#211B4A]/70 p-7">
                <span className="font-(family-name:--font-golos) text-[2.4rem] font-extrabold leading-none tracking-tight text-[#6E5BFF] [font-variant-numeric:tabular-nums]">
                  {s.n}
                </span>
                <p className="mt-5 text-[17px] font-semibold leading-snug text-[#F2F0FF]">{s.title}</p>
                <p className="mt-2 text-[14.5px] leading-[1.6] text-[#C9C6E8]">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* -------------------------------- pricing ------------------------------- */}
      <section className="relative bg-[#141130]">
        <div className="mx-auto w-full max-w-6xl px-5 py-24 sm:px-8 sm:py-28">
          <div data-reveal className="mx-auto max-w-2xl text-center">
            <p className="text-[13px] font-medium tracking-wide text-[#A79BFF]">{copy.pricing.caption}</p>
            <h2 className="mt-4 text-balance font-(family-name:--font-golos) text-[clamp(2rem,5vw,3.2rem)] font-extrabold leading-[1.05] tracking-[-0.015em] text-[#F2F0FF]">
              {copy.pricing.heading}
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-[17px] leading-[1.6] text-[#C9C6E8]">{copy.pricing.body}</p>
          </div>

          <div data-reveal className="mx-auto mt-14 grid max-w-4xl gap-6 lg:grid-cols-[1fr_1.15fr]">
            {/* free — first and longer */}
            <div className="rounded-3xl border border-[#F2F0FF]/10 bg-[#1B1743]/70 p-8">
              <p className="text-[14px] font-semibold text-[#C9C6E8]">{copy.pricing.freeTitle}</p>
              <p className="mt-3 font-(family-name:--font-golos) text-[2rem] font-extrabold tracking-tight text-[#F2F0FF]">0 ₴</p>
              <ul className="mt-6 space-y-3">
                {copy.pricing.free.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-[15px] text-[#E4E2F5]">
                    <Check className="mt-0.5 size-4 shrink-0 text-[#A79BFF]" strokeWidth={2.6} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* paid */}
            <div className="relative rounded-3xl border border-[#6E5BFF]/35 bg-[#211B4A] p-8 shadow-[0_50px_100px_-50px_rgba(110,91,255,0.6)]">
              <div className="flex items-baseline justify-between">
                <p className="text-[14px] font-semibold text-[#A79BFF]">{copy.pricing.paidTitle}</p>
                <span className="rounded-full bg-[#F2F0FF]/8 px-2.5 py-1 text-[12px] font-semibold text-[#C9C6E8]">{copy.pricing.priceUnit}</span>
              </div>
              <p className="mt-3">
                <span className="font-(family-name:--font-golos) text-[2.7rem] font-extrabold tracking-tight text-[#F2F0FF] [font-variant-numeric:tabular-nums]">
                  {copy.pricing.price}
                </span>
              </p>
              <p className="mt-1 text-[14px] leading-relaxed text-[#C9C6E8]">{copy.pricing.priceFrame}</p>
              <p className="mt-1 text-[13.5px] leading-relaxed text-[#9A94CE]">{copy.pricing.calendarLine}</p>
              <ul className="mt-6 space-y-3">
                {copy.pricing.paid.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-[15px] text-[#E4E2F5]">
                    <Check className="mt-0.5 size-4 shrink-0 text-[#A79BFF]" strokeWidth={2.6} />
                    {f}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-[14px] font-medium text-[#E4E2F5]">{copy.pricing.anchor}</p>
              <div className="mt-6">
                <Link
                  href="/register"
                  className="group/pill flex w-full items-center justify-center gap-2.5 rounded-full bg-[#C9C4FF] py-3.5 text-[15px] font-semibold text-[#1A1740] transition-transform hover:scale-[1.01]"
                >
                  {copy.pricing.cta}
                  <ArrowRight className="size-4 transition-transform group-hover/pill:translate-x-1" strokeWidth={2.4} />
                </Link>
              </div>
              <p className="mt-3 text-center text-[12.5px] text-[#8E88C4]">{copy.pricing.ctaNote}</p>
            </div>
          </div>

          <div data-reveal className="mx-auto mt-8 max-w-4xl">
            <p className="rounded-2xl border border-[#F2F0FF]/10 bg-[#1B1743]/50 px-6 py-5 text-center text-[14.5px] leading-relaxed text-[#C9C6E8]">
              {copy.pricing.completion}
            </p>
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[14px] font-medium text-[#E4E2F5]">
              {copy.pricing.trust.map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-[#A79BFF]" strokeWidth={2} />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------------------------- proof / база ------------------------------ */}
      <section className="relative bg-[#17143C]">
        <div className="mx-auto w-full max-w-6xl px-5 py-24 sm:px-8 sm:py-28">
          <div data-reveal className="max-w-2xl">
            <h2 className="font-(family-name:--font-golos) text-[clamp(1.9rem,4.6vw,3rem)] font-extrabold tracking-[-0.015em] text-[#F2F0FF]">
              {copy.proof.heading}
            </h2>
          </div>
          <div data-reveal className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-[#F2F0FF]/8 bg-[#F2F0FF]/8 sm:grid-cols-3">
            {copy.proof.stats.map((s) => (
              <div key={s.label} className="bg-[#211B4A] px-8 py-12">
                <span className="block font-(family-name:--font-golos) text-[clamp(2.6rem,6vw,4rem)] font-extrabold leading-none tracking-tight text-[#F2F0FF] [font-variant-numeric:tabular-nums]">
                  {s.k}
                </span>
                <span className="mt-3 block text-[15px] font-medium text-[#9A94CE]">{s.label}</span>
              </div>
            ))}
          </div>
          <div data-reveal className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#6E5BFF]/25 bg-[#6E5BFF]/10 px-4 py-2 text-[13.5px] font-medium text-[#A79BFF]">
              <span className="h-2 w-2 rounded-full bg-[#A79BFF]/80" />
              {copy.proof.badge}
            </p>
          </div>
          {/* reserved calibration slot — ships without any outcome number */}
          <div data-reveal className="mt-6 rounded-2xl border border-dashed border-[#F2F0FF]/12 bg-[#1B1743]/40 px-6 py-5">
            <p className="text-[14px] leading-[1.65] text-[#8E88C4]">{copy.proof.reserved}</p>
          </div>
        </div>
      </section>

      {/* -------------------------------- FAQ ----------------------------------- */}
      <section className="relative bg-[#141130]">
        <div className="mx-auto w-full max-w-3xl px-5 py-20 sm:px-8 sm:py-24">
          <div data-reveal>
            <h2 className="font-(family-name:--font-golos) text-[clamp(1.9rem,4.6vw,3rem)] font-extrabold tracking-[-0.015em] text-[#F2F0FF]">
              {copy.faq.heading}
            </h2>
          </div>
          <div data-reveal className="mt-8">
            {copy.faq.items.map((it) => (
              <FaqItem key={it.q} q={it.q} a={it.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------- final CTA + mode launcher ---------------------- */}
      <section className="relative bg-[#100E28]">
        <div className="mx-auto w-full max-w-6xl px-5 py-24 sm:px-8 sm:py-28">
          <div data-reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance font-(family-name:--font-golos) text-[clamp(2.3rem,6vw,4rem)] font-extrabold leading-[1.02] tracking-[-0.02em] text-[#F2F0FF]">
              {copy.finalCta.heading.map((ln, i) => (
                <span key={i} className="block">
                  {ln === copy.finalCta.highlight ? <span className="text-[#C9C4FF]">{ln}</span> : ln}
                </span>
              ))}
            </h2>
            <p className="mx-auto mt-6 max-w-lg text-pretty text-[17px] leading-[1.6] text-[#C9C6E8]">{copy.finalCta.body}</p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <PrimaryPill href="/register" className="justify-center">
                {copy.finalCta.ctaPrimary}
              </PrimaryPill>
              <GhostButton onClick={scrollToDemo} ariaLabel="спробувати без реєстрації" className="justify-center">
                {copy.finalCta.ctaSecondary}
              </GhostButton>
            </div>
          </div>

          <div data-reveal className="mx-auto mt-14 max-w-xl">
            <p className="mb-3 text-[13px] font-medium text-[#8E88C4]">{copy.finalCta.launcherTitle}</p>
            <div className="flex flex-col gap-2.5">
              {copy.finalCta.launcher.map((row, i) => {
                const Icon = [ListChecks, Timer, Target][i] ?? Target;
                return (
                  <Link
                    key={row.title}
                    href="/register"
                    className="group/row flex items-center gap-4 rounded-2xl border border-[#F2F0FF]/8 bg-[#1B1743] px-5 py-4 transition-colors hover:border-[#F2F0FF]/18"
                  >
                    <span className="flex size-10 items-center justify-center rounded-xl bg-[#6E5BFF]/15 text-[#A79BFF]">
                      <Icon className="size-5" strokeWidth={2} />
                    </span>
                    <span className="flex-1">
                      <span className="block text-[15px] font-semibold text-[#F2F0FF]">{row.title}</span>
                      <span className="block text-[13px] text-[#8E88C4]">{row.sub}</span>
                    </span>
                    <ArrowRight className="size-4 text-[#726CA0] transition-transform group-hover/row:translate-x-1" strokeWidth={2} />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------- footer --------------------------------- */}
      <footer className="relative overflow-hidden bg-[#0B0A1E]">
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-64"
          style={{ background: "radial-gradient(80% 120% at 50% 120%, rgba(42,33,84,0.5) 0%, transparent 70%)" }}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center overflow-hidden">
          <span className="translate-y-[26%] select-none whitespace-nowrap font-(family-name:--font-golos) text-[clamp(3.2rem,15vw,11rem)] font-extrabold tracking-tight text-[#F2F0FF]/[0.045]">
            {copy.footer.wordmark}
          </span>
        </div>
        <div className="relative mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[16px] font-extrabold tracking-tight text-[#F2F0FF]">{copy.nav.brand}</p>
              <p className="mt-1 text-[13px] text-[#8E88C4]">{copy.nav.tagline}</p>
            </div>
            <div className="-my-2 flex flex-wrap gap-x-6">
              <Link href="/login" className="inline-block py-2 text-[14px] text-[#9A94CE] transition-colors hover:text-[#F2F0FF]">
                {copy.nav.login}
              </Link>
              <Link href="/register" className="inline-block py-2 text-[14px] text-[#9A94CE] transition-colors hover:text-[#F2F0FF]">
                {copy.nav.cta}
              </Link>
            </div>
          </div>
          <p className="mt-10 max-w-3xl text-[12.5px] leading-relaxed text-[#8E88C4]">{copy.footer.disclaimer}</p>
          <p className="mt-6 text-[12.5px] text-[#7D78A8]">{copy.footer.copyright}</p>
        </div>
      </footer>
    </div>
  );
}
