import "server-only";
import { prisma } from "@/lib/db";
import { topicMastery, type MasteryBand } from "@/lib/mastery";
import { computeProgress } from "./progress";

// DB aggregation → the pure per-topic `topicMastery` classifier. Builds one complete row per topic
// that has a live question pool (incl. topics the user has not yet answered), for the progress view
// (wave5-08). Band/coverage logic lives in @/lib/mastery; this layer only counts.

export interface TopicMasteryRow {
  topicId: string;
  title: string;
  answered: number;
  correct: number;
  total: number; // live questions in the topic's category-scoped pool
  accuracy: number; // 0..1
  band: MasteryBand;
  coverage: number; // 0..1
}

// weak first (most actionable), then learning, then strong.
const BAND_RANK: Record<MasteryBand, number> = { weak: 0, learning: 1, strong: 2 };

/**
 * Per-topic mastery rows for the user, scoped to a category when given. Each topic's `total` is its
 * LIVE-pool size (the same filter `startSession` selects from),
 * so `coverage` reflects the real question pool; `answered`/`correct` come from the user's answers
 * (reusing `computeProgress`'s per-topic aggregation). Topics with no live questions are omitted;
 * topics the user has not answered appear with `answered:0, correct:0`. Sorted deterministically
 * (weak→learning→strong, then topic displayOrder, then title) so the view order is stable.
 */
export async function getTopicMastery(
  userId: string,
  categoryId?: string | null,
): Promise<TopicMasteryRow[]> {
  // Same live filter the pool uses (lib/server/test-engine.ts baseWhere) so coverage totals match
  // what selection actually serves.
  const liveWhere = {
    isActive: true,
    isPublished: true,
    archivedAt: null,
    ...(categoryId ? { categories: { some: { id: categoryId } } } : {}),
  };

  // (a) per-topic live-pool total + (b) the user's answered/correct per topic — fetched together.
  const [totals, progress] = await Promise.all([
    prisma.question.groupBy({
      by: ["topicId"],
      where: liveWhere,
      _count: { _all: true },
    }),
    computeProgress(userId, categoryId),
  ]);

  // Topic titles + displayOrder for the topics that actually have a live pool (null topicId = no
  // topic, dropped). A groupBy group always has ≥1 matching row, so total > 0 for every entry.
  const topicIds = totals
    .map((t) => t.topicId)
    .filter((id): id is string => id != null);
  if (topicIds.length === 0) return [];

  const topics = await prisma.topic.findMany({
    where: { id: { in: topicIds } },
    select: { id: true, title: true, displayOrder: true },
  });
  const topicById = new Map(topics.map((t) => [t.id, t]));
  const statById = new Map(progress.topicStats.map((s) => [s.topicId, s]));

  const rows: TopicMasteryRow[] = [];
  for (const t of totals) {
    if (t.topicId == null) continue;
    const total = t._count._all;
    const stat = statById.get(t.topicId);
    const answered = stat?.answered ?? 0;
    const correct = stat?.correct ?? 0;
    const m = topicMastery({ answered, correct, total });
    rows.push({
      topicId: t.topicId,
      title: topicById.get(t.topicId)?.title ?? stat?.title ?? "Без теми",
      answered,
      correct,
      total,
      accuracy: m.accuracy,
      band: m.band,
      coverage: m.coverage,
    });
  }

  rows.sort((a, b) => {
    const byBand = BAND_RANK[a.band] - BAND_RANK[b.band];
    if (byBand !== 0) return byBand;
    const oa = topicById.get(a.topicId)?.displayOrder ?? 0;
    const ob = topicById.get(b.topicId)?.displayOrder ?? 0;
    if (oa !== ob) return oa - ob;
    return a.title.localeCompare(b.title);
  });

  return rows;
}
