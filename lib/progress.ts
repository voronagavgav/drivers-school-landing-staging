import {
  READINESS_MIN_SEEN,
  READINESS_TREND_THRESHOLD,
  WEAK_TOPIC_ACCURACY_THRESHOLD,
  WEAK_TOPIC_MIN_ANSWERS,
} from "@/lib/constants";
import type { ReadinessLevel } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Pure progress + readiness logic. No DB. The DB layer aggregates rows into these
// shapes and calls the functions; the result is what the dashboard renders.
// ---------------------------------------------------------------------------

export function accuracyOf(correct: number, total: number): number {
  return total <= 0 ? 0 : correct / total;
}

export interface TopicStat {
  topicId: string;
  title: string;
  answered: number;
  correct: number;
  accuracy: number; // 0..1
}

/** Build per-topic accuracy stats from raw counts. */
export function topicStats(
  rows: { topicId: string; title: string; answered: number; correct: number }[],
): TopicStat[] {
  return rows.map((r) => ({
    ...r,
    accuracy: accuracyOf(r.correct, r.answered),
  }));
}

/** Topics below the accuracy threshold (once they have enough answers) = weak. */
export function detectWeakTopics(stats: TopicStat[]): TopicStat[] {
  return stats
    .filter(
      (t) =>
        t.answered >= WEAK_TOPIC_MIN_ANSWERS &&
        t.accuracy < WEAK_TOPIC_ACCURACY_THRESHOLD,
    )
    .sort((a, b) => a.accuracy - b.accuracy);
}

export interface ReadinessInput {
  uniqueAnswered: number;
  overallAccuracy: number; // 0..1
  weakTopicCount: number;
  unresolvedMistakes: number;
  recentExam: { passed: number; total: number }; // recent exam simulations
}

export interface ReadinessReason {
  code: string;
  text: string; // Ukrainian, shown to the user
}

export interface ReadinessResult {
  level: ReadinessLevel;
  score: number; // 0..100
  reasons: ReadinessReason[];
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Explainable readiness estimate. NOT a guarantee of passing the official exam — an internal
 * preparation indicator only. Always returns the reasons that produced the level.
 *
 * Score (0..100): accuracy is the backbone (up to 70), recent exam performance adds up to 20,
 * weak topics and unresolved mistakes subtract. Below READINESS_MIN_SEEN unique answers we
 * decline to estimate (NOT_ENOUGH_DATA).
 */
export function estimateReadiness(input: ReadinessInput): ReadinessResult {
  const reasons: ReadinessReason[] = [];

  if (input.uniqueAnswered < READINESS_MIN_SEEN) {
    return {
      level: "NOT_ENOUGH_DATA",
      score: 0,
      reasons: [
        {
          code: "not_enough_data",
          text: `Замало даних: дайте відповідь щонайменше на ${READINESS_MIN_SEEN} унікальних запитань (зараз ${input.uniqueAnswered}).`,
        },
      ],
    };
  }

  const accPart = input.overallAccuracy * 70;
  reasons.push({
    code: "accuracy",
    text: `Загальна точність: ${Math.round(input.overallAccuracy * 100)}%.`,
  });

  const examTotal = input.recentExam.total;
  const examPart =
    examTotal > 0 ? (input.recentExam.passed / examTotal) * 20 : 0;
  if (examTotal > 0) {
    reasons.push({
      code: "recent_exam",
      text: `Нещодавні екзамени: складено ${input.recentExam.passed} з ${examTotal}.`,
    });
  } else {
    reasons.push({
      code: "no_recent_exam",
      text: "Ви ще не проходили екзаменаційну симуляцію — спробуйте її, щоб уточнити оцінку.",
    });
  }

  const weakPenalty = input.weakTopicCount * 5;
  if (input.weakTopicCount > 0) {
    reasons.push({
      code: "weak_topics",
      text: `Слабкі теми, що знижують готовність: ${input.weakTopicCount}.`,
    });
  }

  const mistakePenalty = Math.min(input.unresolvedMistakes, 10) * 1.5;
  if (input.unresolvedMistakes > 0) {
    reasons.push({
      code: "unresolved_mistakes",
      text: `Невиправлені помилки: ${input.unresolvedMistakes}. Попрацюйте над ними в режимі «Робота над помилками».`,
    });
  }

  const score = clamp(
    Math.round(accPart + examPart - weakPenalty - mistakePenalty),
    0,
    100,
  );

  let level: ReadinessLevel;
  if (score < 40) level = "NEEDS_PRACTICE";
  else if (score < 65) level = "IMPROVING";
  else if (score < 85) level = "ALMOST_READY";
  else level = "READY_FOR_EXAM_STYLE_PRACTICE";

  return { level, score, reasons };
}

/**
 * Classify the direction of recent readiness scores. `scores` are ordered oldest→newest;
 * the most recent score is compared against the mean of the earlier scores. A difference
 * beyond READINESS_TREND_THRESHOLD (in either direction) is IMPROVING / DECLINING; anything
 * within the band — or fewer than two scores — is STABLE. Pure: does not mutate `scores`.
 */
export function readinessTrend(
  scores: number[],
): "IMPROVING" | "DECLINING" | "STABLE" {
  if (scores.length < 2) return "STABLE";

  const latest = scores[scores.length - 1];
  const earlier = scores.slice(0, -1);
  const earlierMean =
    earlier.reduce((sum, s) => sum + s, 0) / earlier.length;
  const diff = latest - earlierMean;

  if (diff > READINESS_TREND_THRESHOLD) return "IMPROVING";
  if (diff < -READINESS_TREND_THRESHOLD) return "DECLINING";
  return "STABLE";
}

