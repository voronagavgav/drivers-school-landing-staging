import "server-only";
import { prisma } from "@/lib/db";
import {
  accuracyOf,
  detectWeakTopics,
  estimateReadiness,
  topicStats,
  type ReadinessResult,
  type TopicStat,
} from "@/lib/progress";

// DB aggregation → the pure progress/readiness functions. This is what the dashboard renders.

const RECENT_EXAM_WINDOW = 5;
const RECENT_READINESS_WINDOW = 8;

export interface ProgressView {
  totalAnswered: number;
  uniqueAnswered: number;
  correct: number;
  wrong: number;
  accuracy: number; // 0..1
  completedSessions: number;
  unresolvedMistakes: number;
  repeatedMistakes: number;
  topicStats: TopicStat[];
  weakTopics: TopicStat[];
  recentExam: { passed: number; total: number };
  readiness: ReadinessResult;
}

export async function computeProgress(
  userId: string,
  categoryId?: string | null,
): Promise<ProgressView> {
  const sessionWhere = categoryId
    ? { userId, categoryId }
    : { userId };

  const [answers, completedSessions, mistakes, examSessions] = await Promise.all([
    prisma.testAnswer.findMany({
      where: { testSession: sessionWhere },
      include: { question: { include: { topic: true } } },
    }),
    prisma.testSession.count({ where: { ...sessionWhere, status: "COMPLETED" } }),
    prisma.userMistake.findMany({ where: { userId, status: "ACTIVE" } }),
    prisma.testSession.findMany({
      where: { ...sessionWhere, mode: "EXAM_SIMULATION", status: "COMPLETED" },
      orderBy: { finishedAt: "desc" },
      take: RECENT_EXAM_WINDOW,
    }),
  ]);

  const totalAnswered = answers.length;
  const correct = answers.filter((a) => a.isCorrect).length;
  const wrong = totalAnswered - correct;
  const uniqueAnswered = new Set(answers.map((a) => a.questionId)).size;
  const accuracy = accuracyOf(correct, totalAnswered);

  // per-topic aggregation
  const byTopic = new Map<string, { title: string; answered: number; correct: number }>();
  for (const a of answers) {
    const tId = a.question.topicId;
    if (!tId) continue;
    const title = a.question.topic?.title ?? "Без теми";
    const cur = byTopic.get(tId) ?? { title, answered: 0, correct: 0 };
    cur.answered += 1;
    if (a.isCorrect) cur.correct += 1;
    byTopic.set(tId, cur);
  }
  const stats = topicStats(
    [...byTopic.entries()].map(([topicId, v]) => ({ topicId, ...v })),
  );
  const weakTopics = detectWeakTopics(stats);

  const recentExam = {
    total: examSessions.length,
    passed: examSessions.filter((s) => s.result === "PASSED").length,
  };

  const readiness = estimateReadiness({
    uniqueAnswered,
    overallAccuracy: accuracy,
    weakTopicCount: weakTopics.length,
    unresolvedMistakes: mistakes.length,
    recentExam,
  });

  return {
    totalAnswered,
    uniqueAnswered,
    correct,
    wrong,
    accuracy,
    completedSessions,
    unresolvedMistakes: mistakes.length,
    repeatedMistakes: mistakes.filter((m) => m.mistakeCount > 1).length,
    topicStats: stats,
    weakTopics,
    recentExam,
    readiness,
  };
}

const MS_PER_DAY = 86_400_000;

export interface StudyActivity {
  /** Epoch-ms timestamps of every answer, for the pure `studyStreak` to bucket. */
  activityDates: number[];
  /** Answers whose UTC calendar day equals the current UTC day. */
  answeredToday: number;
}

/**
 * Raw study activity for the streak + daily-goal indicators, scoped by category
 * when given. Returns the `answeredAt` timestamps (epoch-ms) so the pure
 * `studyStreak` can bucket them, plus today's answer count. "Today" is the
 * current UTC calendar day (`Math.floor(ms / 86_400_000)`), matching the pure
 * streak's UTC bucketing so the two indicators agree.
 */
export async function getStudyActivity(
  userId: string,
  categoryId?: string | null,
): Promise<StudyActivity> {
  const sessionWhere = categoryId ? { userId, categoryId } : { userId };
  const answers = await prisma.testAnswer.findMany({
    where: { testSession: sessionWhere },
    select: { answeredAt: true },
  });

  const today = Math.floor(Date.now() / MS_PER_DAY);
  const activityDates: number[] = [];
  let answeredToday = 0;
  for (const a of answers) {
    const ms = a.answeredAt.getTime();
    activityDates.push(ms);
    if (Math.floor(ms / MS_PER_DAY) === today) answeredToday += 1;
  }

  return { activityDates, answeredToday };
}

/** Topic ids the user is weak in — used to bias MIXED_PRACTICE selection. */
export async function computeWeakTopicIds(
  userId: string,
  categoryId?: string | null,
): Promise<string[]> {
  const p = await computeProgress(userId, categoryId);
  return p.weakTopics.map((t) => t.topicId);
}

/**
 * The user's recent readiness scores, oldest→newest, scoped by category when given.
 * Feeds the dashboard's `readinessTrend()`; limited to the last `RECENT_READINESS_WINDOW`.
 */
export async function getRecentReadinessScores(
  userId: string,
  categoryId?: string | null,
): Promise<number[]> {
  const where = categoryId ? { userId, categoryId } : { userId };
  const snapshots = await prisma.progressSnapshot.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: RECENT_READINESS_WINDOW,
    select: { readinessScore: true },
  });
  return snapshots.map((s) => s.readinessScore).reverse();
}

/** Persist a snapshot after a completed session (history + trend). */
export async function snapshotProgress(
  userId: string,
  categoryId?: string | null,
): Promise<void> {
  const p = await computeProgress(userId, categoryId);
  await prisma.progressSnapshot.create({
    data: {
      userId,
      categoryId: categoryId ?? undefined,
      totalAnswered: p.totalAnswered,
      uniqueAnswered: p.uniqueAnswered,
      accuracy: p.accuracy,
      readinessLevel: p.readiness.level,
      readinessScore: p.readiness.score,
      weakTopicsJson: JSON.stringify(
        p.weakTopics.map((t) => ({ topicId: t.topicId, title: t.title, accuracy: t.accuracy })),
      ),
    },
  });
}
