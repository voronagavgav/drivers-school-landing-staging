import "server-only";
import { prisma } from "@/lib/db";
import {
  groupTopicsByBand,
  type TopicBandEntry,
  type TopicMapGroups,
} from "@/lib/topic-map";

// DB join for the «Карта тем» anti-leaderboard (spec §F, wave12b-16): every
// servable topic of the category × the user's materialized TopicMastery rows
// (wave 11 recompute owns those), fed to the pure `groupTopicsByBand`. This
// layer only joins — band semantics live in @/lib/topic-map, band values in
// the DB rows. Candidate mastery load scans `where:{userId}` and JS-joins
// (no id-list `in`), matching the queue readers in lib/server/study.ts.

/**
 * The grouped topic map for a user in a category. "Servable" = topics with at
 * least one live question in the category (the same filter `startSession`
 * pools from), so every topic on the map is startable via TOPIC_PRACTICE.
 * Topics without a TopicMastery row — or with one carrying no seen items —
 * enter as unseen (band/meanR null → the «Вивчаю» group).
 */
export async function getTopicMap(
  userId: string,
  categoryId: string,
): Promise<TopicMapGroups> {
  // Same live filter the pool uses (lib/server/test-engine.ts baseWhere).
  const liveWhere = {
    isActive: true,
    isPublished: true,
    archivedAt: null,
    categories: { some: { id: categoryId } },
  };

  const [totals, masteryRows] = await Promise.all([
    prisma.question.groupBy({
      by: ["topicId"],
      where: liveWhere,
      _count: { _all: true },
    }),
    prisma.topicMastery.findMany({
      where: { userId },
      select: { topicId: true, band: true, meanR: true, itemsSeen: true },
    }),
  ]);

  const topicIds = totals
    .map((t) => t.topicId)
    .filter((id): id is string => id != null);
  if (topicIds.length === 0) return { weak: [], learning: [], strong: [] };

  const topics = await prisma.topic.findMany({
    where: { id: { in: topicIds } },
    select: { id: true, title: true },
  });
  const masteryByTopic = new Map(masteryRows.map((r) => [r.topicId, r]));

  const entries: TopicBandEntry[] = topics.map((t) => {
    const m = masteryByTopic.get(t.id);
    const seen = m != null && m.itemsSeen > 0;
    const band =
      seen && (m.band === "weak" || m.band === "learning" || m.band === "strong")
        ? m.band
        : null;
    return {
      topicId: t.id,
      title: t.title,
      band,
      meanR: band != null ? m!.meanR : null,
    };
  });

  return groupTopicsByBand(entries);
}
