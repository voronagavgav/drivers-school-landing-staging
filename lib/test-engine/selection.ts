import { REVIEW_INTERVALS_HOURS } from "@/lib/constants";
import type { EngineQuestion, EngineMistake, SelectionOptions } from "./types";

// ---------------------------------------------------------------------------
// Pure question-selection logic per mode. No DB — operates on a pre-fetched pool.
// Randomness is injectable (opts.rng) so tests are deterministic.
// ---------------------------------------------------------------------------

/** Fisher–Yates shuffle using an injectable rng (does not mutate input). */
export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Order mistakes so the ones most worth revisiting come first:
 * higher mistakeCount first, then fewer correctRepeats, then most recent.
 */
export function orderMistakesByPriority(mistakes: EngineMistake[]): EngineMistake[] {
  return [...mistakes].sort((a, b) => {
    if (b.mistakeCount !== a.mistakeCount) return b.mistakeCount - a.mistakeCount;
    if (a.correctRepeatCount !== b.correctRepeatCount)
      return a.correctRepeatCount - b.correctRepeatCount;
    return b.lastMistakeAt - a.lastMistakeAt;
  });
}

/** Tunable weights for the SM-2-lite spaced-mistake ordering signal. */
export interface SpacingWeights {
  /** points per recorded mistake — more mistakes ⇒ ordered earlier */
  mistakeWeight: number;
  /** penalty per consecutive correct repeat — longer correct streak ⇒ ordered later */
  correctRepeatPenalty: number;
  /** decay per day since the last mistake — a more recent mistake ⇒ ordered earlier */
  recencyWeight: number;
}

/** Default spacing weights (documented, not magic numbers buried in the sort). */
export const DEFAULT_SPACING_WEIGHTS: SpacingWeights = {
  mistakeWeight: 1,
  correctRepeatPenalty: 2,
  recencyWeight: 0.05,
};

const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;

/** SM-2-lite priority score: higher ⇒ more worth revisiting (ordered earlier). */
function spacingScore(m: EngineMistake, now: number, w: SpacingWeights): number {
  const ageDays = (now - m.lastMistakeAt) / MS_PER_DAY;
  return (
    w.mistakeWeight * m.mistakeCount -
    w.correctRepeatPenalty * m.correctRepeatCount -
    w.recencyWeight * ageDays
  );
}

/**
 * Order mistakes by a pure SM-2-lite spaced-repetition signal: a higher mistakeCount and a
 * more-recent lastMistakeAt (relative to `now`) push a question EARLIER, while a longer correct
 * streak (correctRepeatCount → longer interval) pushes it LATER. Deterministic — `now` is passed
 * in (never reads the clock) and ties break by questionId, so the same args yield the same order.
 * Returns a new array; does not mutate the input.
 */
export function spacedMistakeOrder(
  mistakes: EngineMistake[],
  now: number,
  weights: SpacingWeights = DEFAULT_SPACING_WEIGHTS,
): EngineMistake[] {
  return [...mistakes].sort((a, b) => {
    const sa = spacingScore(a, now, weights);
    const sb = spacingScore(b, now, weights);
    if (sb !== sa) return sb - sa; // higher score first
    return a.questionId < b.questionId ? -1 : a.questionId > b.questionId ? 1 : 0;
  });
}

/**
 * Pure "due for spaced review" predicate: returns the subset of `mistakes` whose elapsed time
 * since `lastMistakeAt` (`now - lastMistakeAt`, ms) has reached the interval the mistake's correct
 * streak earns. The interval is `intervalsHours[min(correctRepeatCount, len - 1)]` (hours → ms): a
 * streak of 0 maps to index 0 (due immediately when that entry is `0`); higher streaks pick a longer
 * wait and clamp to the last entry past the ladder's length. The boundary `elapsed === interval` is
 * DUE (inclusive `>=`). Deterministic — `now` is passed in (never reads the clock), no randomness;
 * returns a NEW array and does not mutate the input.
 */
export function dueMistakes(
  mistakes: EngineMistake[],
  now: number,
  intervalsHours: readonly number[] = REVIEW_INTERVALS_HOURS,
): EngineMistake[] {
  const lastIndex = intervalsHours.length - 1;
  return mistakes.filter((m) => {
    const intervalHours = intervalsHours[Math.min(m.correctRepeatCount, lastIndex)];
    const intervalMs = intervalHours * MS_PER_HOUR;
    return now - m.lastMistakeAt >= intervalMs;
  });
}

/**
 * MIXED_PRACTICE ordering: questions in weak topics float to the front (shuffled within
 * each band) so practice is spent where the user is weakest.
 */
export function prioritizeWeakTopics(
  pool: EngineQuestion[],
  weakTopicIds: string[],
  rng: () => number = Math.random,
): EngineQuestion[] {
  const weak = new Set(weakTopicIds);
  const inWeak = pool.filter((q) => q.topicId && weak.has(q.topicId));
  const rest = pool.filter((q) => !(q.topicId && weak.has(q.topicId)));
  return [...shuffle(inWeak, rng), ...shuffle(rest, rng)];
}

/**
 * Select up to `count` questions from a candidate pool according to mode.
 * The pool is assumed to be pre-filtered to active/published questions for the category.
 */
export function selectQuestions(
  pool: EngineQuestion[],
  opts: SelectionOptions,
): EngineQuestion[] {
  const rng = opts.rng ?? Math.random;
  let ordered: EngineQuestion[];

  switch (opts.mode) {
    case "TOPIC_PRACTICE": {
      const inTopic = opts.topicId
        ? pool.filter((q) => q.topicId === opts.topicId)
        : pool;
      ordered = shuffle(inTopic, rng);
      break;
    }
    case "MIXED_PRACTICE":
      ordered = prioritizeWeakTopics(pool, opts.weakTopicIds ?? [], rng);
      break;
    case "EXAM_SIMULATION":
    case "SAVED_QUESTIONS":
    case "MISTAKE_PRACTICE":
    default:
      // EXAM/SAVED: caller pre-orders (saved set / mistake order); we just shuffle exam.
      ordered =
        opts.mode === "EXAM_SIMULATION" ? shuffle(pool, rng) : [...pool];
      break;
  }

  return ordered.slice(0, Math.max(0, opts.count));
}
