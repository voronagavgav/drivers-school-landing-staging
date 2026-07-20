// ---------------------------------------------------------------------------
// Pure study-streak calculator. No DB, no React. The DB query + dashboard
// wiring lives in lib/server (task wave3-feat-05); this layer just turns a list
// of activity timestamps into consecutive-active-day counts.
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86_400_000;

export interface StudyStreak {
  /** Length of the consecutive-day run ending at the most recent activity day. */
  current: number;
  /** Longest consecutive-day run anywhere in the input. */
  longest: number;
}

/**
 * Consecutive active-day streaks from a list of activity timestamps.
 *
 * Days are bucketed in UTC (`Math.floor(ms / 86_400_000)`), so day boundaries
 * are deterministic and locale-independent. Multiple activities on the same UTC
 * day count once. `current` is anchored at the LATEST day present in the input
 * (NOT "today" — this function never reads the clock); the server layer decides
 * whether that latest day is actually today.
 *
 * Accepts `Date[]` or epoch-ms `number[]`; both produce identical results.
 */
export function studyStreak(activityDates: readonly (Date | number)[]): StudyStreak {
  if (activityDates.length === 0) return { current: 0, longest: 0 };

  // Bucket into unique UTC day indices, ascending.
  const days = Array.from(
    new Set(activityDates.map((d) => Math.floor(new Date(d).getTime() / MS_PER_DAY))),
  ).sort((a, b) => a - b);

  // longest: scan every adjacent pair, extending the run on a 1-day step.
  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = days[i] - days[i - 1] === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  // current: walk back from the most recent day while days stay consecutive.
  let current = 1;
  for (let i = days.length - 1; i > 0; i--) {
    if (days[i] - days[i - 1] !== 1) break;
    current++;
  }

  return { current, longest };
}
