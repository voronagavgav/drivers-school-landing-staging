// Analytics retention pruning (Wave 14 §F). Deletes AnalyticsEvent rows older than the
// retention window so we keep only a recent window of granular behavioural data — our
// privacy/retention promise (see ANALYTICS_RETENTION_DAYS).
//
// The `prisma` client is a PARAMETER (import type only) so this module stays runtime-agnostic:
// it never imports the app db singleton nor the server runtime guard, so the nightly tsx script
// (which owns its own libsql client) and integration tests (which pass in the app prisma) can both
// call it. Same pattern as lib/server/__testutils__/official-question.ts.
//
// Deletion is chunked by id (NOT a single `deleteMany({ createdAt: { lt } })`): each chunk is a
// bounded transaction, and the `{ id: { in: chunk } }` list stays ≤ ANALYTICS_PRUNE_CHUNK, well
// under the libsql query-parameter cap (P2029) that a huge id-list would trip.
import type { PrismaClient } from "@/lib/generated/prisma/client";
import { ANALYTICS_RETENTION_DAYS, ANALYTICS_PRUNE_CHUNK } from "@/lib/constants";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Delete AnalyticsEvent rows with `createdAt < now − retentionDays`, in id-chunks of
 * ANALYTICS_PRUNE_CHUNK, looping until none remain. Returns the total number of rows deleted.
 */
export async function pruneAnalyticsEvents(
  prisma: PrismaClient,
  now: Date,
  retentionDays: number = ANALYTICS_RETENTION_DAYS,
): Promise<number> {
  const cutoff = new Date(now.getTime() - retentionDays * MS_PER_DAY);

  let deleted = 0;
  for (;;) {
    const stale = await prisma.analyticsEvent.findMany({
      where: { createdAt: { lt: cutoff } },
      select: { id: true },
      take: ANALYTICS_PRUNE_CHUNK,
    });
    if (stale.length === 0) break;

    const { count } = await prisma.analyticsEvent.deleteMany({
      where: { id: { in: stale.map((r) => r.id) } },
    });
    deleted += count;

    // A short final page means we've exhausted the stale set — no more full chunks remain.
    if (stale.length < ANALYTICS_PRUNE_CHUNK) break;
  }

  return deleted;
}
