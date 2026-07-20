"use client";

import { useEffect, useState } from "react";
import { startTestAction } from "@/app/actions/test";
import { SubmitButton } from "@/components/submit-button";
import { RoadProgress } from "@/components/ui";

// Dashboard readiness-dial hero (Wave-12b §A / task 06). A LEAF client component: every value
// arrives as a PLAIN prop computed server-side by the dashboard page (client-bundle law — no
// server-graph imports here; `startTestAction` is a "use server" action reference, which is safe).
// Three states collapse to two renderings: `null` snapshot and `sufficientData: false` both show
// the calm progress-toward-threshold state (a progress state, NOT a failure — no danger styling);
// only `sufficientData: true` shows the percent dial + verdict-free bottleneck line.
// This is the app's FIRST `.lens` surface (≤2 co-visible app-wide is law).

export type ReadinessDialProps = {
  sufficientData: boolean;
  /** Distinct questions seen so far (from the snapshot; 0 when no snapshot exists). */
  seenCount: number;
  /** READINESS_MIN_SEEN — passed in so the client bundle never imports server-adjacent modules. */
  minSeen: number;
  /** 0–100 dial value; only meaningful when sufficientData. */
  dialPercent: number;
  bottleneckTitle: string | null;
  bottleneckTopicId: string | null;
};

/** Count-up duration for the dial percent (skipped under prefers-reduced-motion). */
const COUNT_UP_MS = 900;

// Ukrainian plural for "питання": 1/21 → питання, 2-4 → питання, else → питань.
function questionsPlural(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 1 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "питання";
  return "питань";
}

/** Animate 0 → target once on mount; jump straight to target under prefers-reduced-motion. */
function useCountUp(target: number, enabled: boolean): number {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(target);
      return;
    }
    const start = performance.now();
    let raf = requestAnimationFrame(function tick(t: number) {
      const k = Math.min(1, (t - start) / COUNT_UP_MS);
      const eased = 1 - (1 - k) ** 3;
      setShown(Math.round(target * eased));
      if (k < 1) raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [target, enabled]);
  return shown;
}

const DIAL_R = 54;
const DIAL_C = 2 * Math.PI * DIAL_R;

export function ReadinessDial({
  sufficientData,
  seenCount,
  minSeen,
  dialPercent,
  bottleneckTitle,
  bottleneckTopicId,
}: ReadinessDialProps) {
  const shown = useCountUp(dialPercent, sufficientData);
  const remaining = Math.max(0, minSeen - seenCount);

  return (
    // CLS floor (wave17-12): reserve the hero box so the dial never shifts surrounding content as
    // fonts settle or the count-up animates. min-h holds a stable height across BOTH the percent-dial
    // and the "gathering data" states (either branch fits inside it), and the inner SVG carries its
    // own fixed 140×140 box — so nothing here is a zero-height-until-hydrated node.
    <section data-testid="readiness-dial" className="lens min-h-[13.5rem] p-6">
      <h2 className="font-display text-base font-semibold text-ink">Готовність до іспиту</h2>

      {sufficientData ? (
        <>
        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <svg
            width={140}
            height={140}
            viewBox="0 0 140 140"
            role="img"
            aria-label={`Готовність ${dialPercent} відсотків`}
            className="shrink-0"
          >
            <circle
              cx={70}
              cy={70}
              r={DIAL_R}
              fill="none"
              stroke="var(--color-line)"
              strokeWidth={10}
            />
            <circle
              cx={70}
              cy={70}
              r={DIAL_R}
              fill="none"
              stroke="var(--color-green-deep)"
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={DIAL_C}
              strokeDashoffset={DIAL_C * (1 - shown / 100)}
              transform="rotate(-90 70 70)"
            />
            <text
              x={70}
              y={70}
              textAnchor="middle"
              dominantBaseline="central"
              className="font-display tabular-nums"
              fontSize={34}
              fontWeight={700}
              fill="var(--color-ink)"
            >
              {shown}%
            </text>
          </svg>
          {bottleneckTopicId && bottleneckTitle && (
            <div className="text-center sm:text-left">
              <p className="text-sm text-ink">
                Найслабше: <span className="font-semibold">{bottleneckTitle}</span>
              </p>
              <form action={startTestAction} className="mt-3">
                <input type="hidden" name="mode" value="TOPIC_PRACTICE" />
                <input type="hidden" name="topicId" value={bottleneckTopicId} />
                <SubmitButton
                  variant="secondary"
                  pendingLabel="Починаємо…"
                  data-track-label="dial_bottleneck_practice"
                  aria-label={`практикувати тему ${bottleneckTitle}`}
                >
                  Практикувати цю тему
                </SubmitButton>
              </form>
            </div>
          )}
        </div>
        {/* Honesty footnote (Wave 19b): names what the number is — a probability estimate, not a
            guarantee — mirroring the app's «не гарантія» legal stance. Quiet secondary text so the
            bold dial percent stays the one emphasis on the surface; kept on ONE source line so the
            negation-gate («гаранті» + «не » same line) sees the negated form. */}
        <p className="mt-3 text-center text-xs text-muted">
          Це оцінка ймовірності скласти іспит за поточними знаннями, а не гарантія.
        </p>
        </>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-ink">
            Ще недостатньо даних для оцінки. Дайте відповідь ще на {remaining}{" "}
            {questionsPlural(remaining)} — і ми покажемо вашу готовність.
          </p>
          <div className="mt-3">
            <RoadProgress value={(seenCount / minSeen) * 100} />
          </div>
          <p className="mt-1 text-xs text-muted tabular-nums">
            {seenCount} з {minSeen}
          </p>
        </div>
      )}
    </section>
  );
}
