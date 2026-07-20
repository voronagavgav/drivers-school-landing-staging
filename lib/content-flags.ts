// ---------------------------------------------------------------------------
// Pure content-quality flags. Given one question's rich summary (the shape
// `summarizeQuestion` produces in ./content-stats), decide which quality
// signals an editor should see. No DB, no React — the server layer (task 04)
// supplies the summary and the admin UI (task 05) just renders `flag.label`.
//
// The Ukrainian human labels are owned HERE. Thin data short-circuits to a
// single INSUFFICIENT_DATA flag so we never infer a content fault from noise.
// ---------------------------------------------------------------------------

import type { OptionStat, QuestionSummary } from "./content-stats";

/** The three quality signals this module can raise. */
export type ContentFlagKind =
  | "WRONG_KEY_SUSPECTED"
  | "LOW_DISCRIMINATION"
  | "INSUFFICIENT_DATA";

/** One raised flag: its kind, a short Ukrainian label, and evidence counts. */
export interface ContentFlag {
  kind: ContentFlagKind;
  label: string; // Ukrainian human label (Cyrillic), rendered by the admin row
  evidence: Record<string, number>;
}

/** Tuning for `flagQuestion`. */
export interface FlagOptions {
  /** Minimum answers before we trust the signal; below this → INSUFFICIENT_DATA. */
  minSample: number;
}

/** Ukrainian labels, owned here (the UI badge renders these verbatim). */
const LABELS: Record<ContentFlagKind, string> = {
  WRONG_KEY_SUSPECTED: "Підозра на хибний ключ відповіді",
  LOW_DISCRIMINATION: "Низька розрізнювальна здатність",
  INSUFFICIENT_DATA: "Недостатньо даних",
};

/**
 * Half-width of the "guessing" band around 1/optionCount. An accuracy within
 * `1/optionCount ± this` reads as people picking at random → low discrimination.
 * Deterministic by design.
 */
const LOW_DISCRIMINATION_HALF_WIDTH = 0.08;

/**
 * Raise content-quality flags for one question summary. Pure: reads only `stat`.
 *
 * - Thin data (`timesAnswered < minSample`) → EXACTLY `[INSUFFICIENT_DATA]`;
 *   the other signals are never inferred from too few answers.
 * - `WRONG_KEY_SUSPECTED` when a distractor (an `isCorrect:false` option) is
 *   picked MORE than the keyed-correct option(s) combined — the answer key is
 *   probably wrong.
 * - `LOW_DISCRIMINATION` when `accuracy` sits within
 *   `1/optionCount ± LOW_DISCRIMINATION_HALF_WIDTH` (answers look like guessing).
 * - A healthy question (correct option dominates, accuracy clear of the band) →
 *   an empty array.
 */
export function flagQuestion(
  stat: QuestionSummary,
  { minSample }: FlagOptions,
): ContentFlag[] {
  // Never flag a content fault on thin data — short-circuit to one signal.
  if (stat.timesAnswered < minSample) {
    return [
      {
        kind: "INSUFFICIENT_DATA",
        label: LABELS.INSUFFICIENT_DATA,
        evidence: { timesAnswered: stat.timesAnswered, minSample },
      },
    ];
  }

  const flags: ContentFlag[] = [];

  // WRONG_KEY_SUSPECTED: top distractor out-draws the keyed-correct option(s).
  const correctPicks = stat.options
    .filter((o) => o.isCorrect)
    .reduce((sum, o) => sum + o.picks, 0);
  let topDistractor: OptionStat | null = null;
  for (const o of stat.options) {
    if (o.isCorrect) continue;
    if (!topDistractor || o.picks > topDistractor.picks) topDistractor = o;
  }
  if (topDistractor && topDistractor.picks > correctPicks) {
    flags.push({
      kind: "WRONG_KEY_SUSPECTED",
      label: LABELS.WRONG_KEY_SUSPECTED,
      evidence: {
        correctPicks,
        topDistractorPicks: topDistractor.picks,
        timesAnswered: stat.timesAnswered,
      },
    });
  }

  // LOW_DISCRIMINATION: accuracy near 1/optionCount means answers look random.
  const optionCount = stat.options.length;
  if (optionCount > 0) {
    const expected = 1 / optionCount;
    if (Math.abs(stat.accuracy - expected) <= LOW_DISCRIMINATION_HALF_WIDTH) {
      flags.push({
        kind: "LOW_DISCRIMINATION",
        label: LABELS.LOW_DISCRIMINATION,
        evidence: {
          optionCount,
          timesAnswered: stat.timesAnswered,
        },
      });
    }
  }

  return flags;
}
