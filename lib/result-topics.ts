/**
 * Pure result-screen topic summary — Wave-12b spec §C (corrective topic summary).
 *
 * The result page shows «Найбільше помилок у темах»: the few topics where the user
 * made the most MISTAKES this session, each linking to a one-tap topic practice.
 * The aggregation is captured here as a PURE function so it is deterministic and
 * unit-testable: the page passes plain per-question rows, never DB entities.
 *
 * Semantics (frozen):
 * - counts only ANSWERED-and-WRONG items — an unanswered question is not a
 *   «помилка» (it is labelled «без відповіді» on the page, never counted here);
 * - sorts by wrong count desc, ties by topicTitle asc (uk locale);
 * - returns at most `max` (default 3) topics; empty input yields an empty array.
 */

export type ResultTopicItem = {
  topicId: string;
  topicTitle: string;
  answered: boolean;
  correct: boolean;
};

export type WrongTopic = {
  topicId: string;
  topicTitle: string;
  wrong: number;
};

export function topWrongTopics(items: ResultTopicItem[], max = 3): WrongTopic[] {
  const byTopic = new Map<string, WrongTopic>();
  for (const item of items) {
    if (!item.answered || item.correct) continue;
    const entry = byTopic.get(item.topicId);
    if (entry) {
      entry.wrong += 1;
    } else {
      byTopic.set(item.topicId, {
        topicId: item.topicId,
        topicTitle: item.topicTitle,
        wrong: 1,
      });
    }
  }
  return [...byTopic.values()]
    .sort(
      (a, b) => b.wrong - a.wrong || a.topicTitle.localeCompare(b.topicTitle, "uk"),
    )
    .slice(0, max);
}
