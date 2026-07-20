import "server-only";
import { prisma } from "@/lib/db";
import { chunk } from "@/lib/analytics-dashboard";
import { difficultyOutliers, type DifficultyOutlier } from "@/lib/learning-health";

// ---------------------------------------------------------------------------
// Server aggregation for the admin LEARNING-HEALTH view (spec §E). COMPUTE-ON-READ:
// turns the signals the app already records — QuestionExplanation review state, graded
// ReviewLog outcomes, confidence self-reports, and queued nudges — into four headline
// numbers an editor/operator can act on. The outlier math is the PURE `difficultyOutliers`
// (lib/learning-health.ts); this layer only fetches/joins/counts.
//
// Privacy: returns aggregate counts + question ids ONLY. No user identifiers, sessions or raw
// answer text leave here — the return type is deliberately identity-free. The calling page
// (wave14-12) enforces `requireContentManager()`.
// ---------------------------------------------------------------------------

/** Max ids per IN() batch — keeps Prisma's bound-param count under the libsql limit (P2029). */
const IN_BATCH_SIZE = 200;

/** Window (days) for the nudge-volume headline. */
const NUDGE_WINDOW_DAYS = 7;

/** Explanation review progress: how many published questions have an editor-REVIEWED explanation. */
export interface ExplanationCoverage {
  reviewed: number; // published questions whose QuestionExplanation.reviewedStatus === "REVIEWED"
  total: number; // all published questions
  pct: number; // reviewed / total (0..1), 0 when total is 0
  unreviewedCount: number; // total − reviewed — sizes the review-queue link
}

/** Confidence self-report uptake: graded reviews that carried a confidence value. */
export interface ConfidenceUptake {
  sampled: number; // ReviewLog rows with a non-null confidence
  total: number; // all ReviewLog rows
  pct: number; // sampled / total (0..1), 0 when total is 0
}

/** The admin learning-health snapshot — aggregate numbers + question ids, no identities. */
export interface LearningHealth {
  explanationCoverage: ExplanationCoverage;
  difficultyOutliers: DifficultyOutlier[];
  confidenceUptake: ConfidenceUptake;
  nudgeVolume7d: number; // NotificationLog rows created in the last NUDGE_WINDOW_DAYS days
}

/**
 * Aggregate the app's learning signals into the admin learning-health snapshot.
 *
 * - `explanationCoverage`: two count queries over published questions (all vs REVIEWED explanation).
 * - `difficultyOutliers`: every ReviewLog scanned once for its `questionId` + `grade`
 *   (`correct = grade >= 2`), tallied per question, joined with each PUBLISHED question's authored
 *   `difficulty` (chunked IN() ≤200), then run through the PURE outlier fn.
 * - `confidenceUptake`: two count queries (non-null confidence vs all) — no row scan.
 * - `nudgeVolume7d`: one count of NotificationLog rows created in the last week.
 */
export async function getLearningHealth(): Promise<LearningHealth> {
  // 1. Explanation coverage — published questions with a REVIEWED explanation vs all published.
  const [publishedTotal, reviewed] = await Promise.all([
    prisma.question.count({ where: { isPublished: true } }),
    prisma.question.count({
      where: { isPublished: true, explanation: { reviewedStatus: "REVIEWED" } },
    }),
  ]);
  const explanationCoverage: ExplanationCoverage = {
    reviewed,
    total: publishedTotal,
    pct: publishedTotal > 0 ? reviewed / publishedTotal : 0,
    unreviewedCount: publishedTotal - reviewed,
  };

  // 2. Difficulty outliers — tally graded reviews per question, join authored difficulty, run the fn.
  const logs = await prisma.reviewLog.findMany({ select: { questionId: true, grade: true } });
  const tally = new Map<string, { total: number; correct: number }>();
  for (const l of logs) {
    const t = tally.get(l.questionId) ?? { total: 0, correct: 0 };
    t.total += 1;
    if (l.grade >= 2) t.correct += 1; // grade >= 2 → a correct recall (FSRS "hard"/"good"/"easy")
    tally.set(l.questionId, t);
  }

  const difficultyById = new Map<string, number>();
  for (const batch of chunk([...tally.keys()], IN_BATCH_SIZE)) {
    const rows = await prisma.question.findMany({
      where: { id: { in: batch }, isPublished: true },
      select: { id: true, difficulty: true },
    });
    for (const q of rows) difficultyById.set(q.id, q.difficulty);
  }

  const outlierRows = [...tally.entries()].flatMap(([questionId, t]) => {
    const difficulty = difficultyById.get(questionId);
    // Skip questions that are unpublished / removed since the log was written.
    return difficulty == null ? [] : [{ questionId, difficulty, total: t.total, correct: t.correct }];
  });

  // 3. Confidence uptake — non-null confidence vs all graded reviews (count queries only).
  const [confidenceTotal, sampled] = await Promise.all([
    prisma.reviewLog.count(),
    prisma.reviewLog.count({ where: { confidence: { not: null } } }),
  ]);
  const confidenceUptake: ConfidenceUptake = {
    sampled,
    total: confidenceTotal,
    pct: confidenceTotal > 0 ? sampled / confidenceTotal : 0,
  };

  // 4. Nudge volume — notifications created in the last week.
  const since = new Date(Date.now() - NUDGE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const nudgeVolume7d = await prisma.notificationLog.count({ where: { createdAt: { gte: since } } });

  return {
    explanationCoverage,
    difficultyOutliers: difficultyOutliers(outlierRows),
    confidenceUptake,
    nudgeVolume7d,
  };
}
