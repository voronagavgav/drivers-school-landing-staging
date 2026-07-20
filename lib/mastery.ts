import {
  MASTERY_STRONG_ACCURACY_THRESHOLD,
  WEAK_TOPIC_ACCURACY_THRESHOLD,
  WEAK_TOPIC_MIN_ANSWERS,
} from "@/lib/constants";
import { accuracyOf } from "@/lib/progress";

// ---------------------------------------------------------------------------
// Pure per-topic mastery classifier. No DB. The DB layer aggregates per-topic
// answered/correct/total counts into these shapes and calls topicMastery; the
// result is what the progress view renders. Reuses the same weak-topic
// thresholds as detectWeakTopics so the "weak" band is identical.
// ---------------------------------------------------------------------------

export type MasteryBand = "weak" | "learning" | "strong";

export interface TopicMastery {
  band: MasteryBand;
  accuracy: number; // 0..1, correct / answered
  coverage: number; // 0..1, answered / total (clamped)
}

/**
 * Classify a topic into a mastery band from raw counts.
 *
 * - `answered < WEAK_TOPIC_MIN_ANSWERS` ⇒ `learning` (a low sample is never `strong`);
 * - else `accuracy < WEAK_TOPIC_ACCURACY_THRESHOLD` ⇒ `weak` (same criteria as detectWeakTopics);
 * - else `accuracy >= MASTERY_STRONG_ACCURACY_THRESHOLD` ⇒ `strong`;
 * - else ⇒ `learning`.
 *
 * `coverage` is how much of the topic's question pool has been answered (clamped to 1).
 */
export function topicMastery(input: {
  answered: number;
  correct: number;
  total: number;
}): TopicMastery {
  const accuracy = accuracyOf(input.correct, input.answered);
  const coverage =
    input.total > 0 ? Math.min(1, input.answered / input.total) : 0;

  let band: MasteryBand;
  if (input.answered < WEAK_TOPIC_MIN_ANSWERS) band = "learning";
  else if (accuracy < WEAK_TOPIC_ACCURACY_THRESHOLD) band = "weak";
  else if (accuracy >= MASTERY_STRONG_ACCURACY_THRESHOLD) band = "strong";
  else band = "learning";

  return { band, accuracy, coverage };
}

/** Ukrainian word marker for a mastery band — the a11y non-colour label the view renders. */
export const MASTERY_LABEL: Record<MasteryBand, string> = {
  weak: "Слабко",
  learning: "Вивчаю",
  strong: "Впевнено",
};
