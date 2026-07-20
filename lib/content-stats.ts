// ---------------------------------------------------------------------------
// Pure per-question RICH stats: accuracy/counts spine + average time + a
// per-option pick breakdown. No DB, no React. The server layer (task 04) fetches
// one question's answer rows, hands them here, and the admin UI renders them.
// The full option set (incl. never-picked options) is the DB join's job — this
// function summarizes ONLY the rows it is given.
// ---------------------------------------------------------------------------

import { summarizeQuestionPerformance } from "./question-stats";

/** One recorded answer to the question being summarized. */
export interface QuestionAnswerRow {
  optionKey: string;
  isCorrect: boolean;
  timeSpentSeconds: number | null;
}

/** Per-option pick breakdown derived from the rows present. */
export interface OptionStat {
  optionKey: string;
  picks: number;
  isCorrect: boolean;
  pickRate: number; // picks / timesAnswered (0..1)
}

/** Rich per-question summary. */
export interface QuestionSummary {
  timesAnswered: number;
  correct: number;
  accuracy: number; // 0..1
  avgTimeSeconds: number; // mean of present (non-null) samples, 0 when none
  options: OptionStat[];
}

/**
 * Summarize one question's answer rows. Pure: does not mutate `rows`.
 *
 * - Accuracy/counts reuse `summarizeQuestionPerformance` (no duplicated logic).
 * - `avgTimeSeconds` averages only rows with a non-null `timeSpentSeconds`;
 *   with no such rows → 0.
 * - `options` lists each picked `optionKey` in first-seen order with its pick
 *   count, keyed-correctness (true iff some pick of it was correct), and
 *   `pickRate = picks / timesAnswered` (the rates sum to 1 when answered).
 */
export function summarizeQuestion(rows: QuestionAnswerRow[]): QuestionSummary {
  // Reuse the pure accuracy/counts spine by collapsing all rows onto one id.
  const [spine] = summarizeQuestionPerformance(
    rows.map((row) => ({ questionId: "_", isCorrect: row.isCorrect })),
  );
  const timesAnswered = spine?.timesAnswered ?? 0;
  const correct = spine?.correct ?? 0;
  const accuracy = spine?.accuracy ?? 0;

  // Average only the present (non-null) time samples.
  let timeSum = 0;
  let timeSamples = 0;
  for (const row of rows) {
    if (row.timeSpentSeconds != null) {
      timeSum += row.timeSpentSeconds;
      timeSamples += 1;
    }
  }
  const avgTimeSeconds = timeSamples > 0 ? timeSum / timeSamples : 0;

  // Per-option breakdown, preserving first-seen order for deterministic output.
  const order: string[] = [];
  const byKey = new Map<string, { picks: number; isCorrect: boolean }>();
  for (const row of rows) {
    let entry = byKey.get(row.optionKey);
    if (!entry) {
      entry = { picks: 0, isCorrect: false };
      byKey.set(row.optionKey, entry);
      order.push(row.optionKey);
    }
    entry.picks += 1;
    if (row.isCorrect) entry.isCorrect = true;
  }

  const options: OptionStat[] = order.map((optionKey) => {
    const { picks, isCorrect } = byKey.get(optionKey)!;
    return {
      optionKey,
      picks,
      isCorrect,
      pickRate: timesAnswered > 0 ? picks / timesAnswered : 0,
    };
  });

  return { timesAnswered, correct, accuracy, avgTimeSeconds, options };
}
