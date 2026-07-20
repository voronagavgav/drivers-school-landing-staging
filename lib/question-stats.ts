// ---------------------------------------------------------------------------
// Pure per-question performance summarizer. No DB. The DB/server layer fetches
// answer rows, hands them here, and the admin UI renders the hardest-first list.
// ---------------------------------------------------------------------------

export interface QuestionPerformance {
  questionId: string;
  timesAnswered: number;
  correct: number;
  accuracy: number; // 0..1
}

/**
 * Summarize answer rows into per-question accuracy, sorted hardest-first
 * (accuracy ascending, ties broken by most-answered first). Pure: does not
 * mutate `rows` or `questionIds`. Pass `questionIds` to also emit never-answered
 * questions (as 0/0/0); omit it to report only questions present in `rows`.
 */
export function summarizeQuestionPerformance(
  rows: { questionId: string; isCorrect: boolean }[],
  questionIds?: string[],
): QuestionPerformance[] {
  const counts = new Map<string, { timesAnswered: number; correct: number }>();

  // Seed the universe so never-answered ids surface as 0/0/0.
  for (const id of questionIds ?? []) {
    if (!counts.has(id)) counts.set(id, { timesAnswered: 0, correct: 0 });
  }

  for (const row of rows) {
    const entry = counts.get(row.questionId) ?? { timesAnswered: 0, correct: 0 };
    entry.timesAnswered += 1;
    if (row.isCorrect) entry.correct += 1;
    counts.set(row.questionId, entry);
  }

  return [...counts.entries()]
    .map(([questionId, { timesAnswered, correct }]) => ({
      questionId,
      timesAnswered,
      correct,
      accuracy: timesAnswered <= 0 ? 0 : correct / timesAnswered,
    }))
    .sort((a, b) =>
      a.accuracy !== b.accuracy
        ? a.accuracy - b.accuracy
        : b.timesAnswered - a.timesAnswered,
    );
}
