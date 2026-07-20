// ---------------------------------------------------------------------------
// PURE offline sync batcher (spec §D). No I/O, no browser globals, no Next
// imports — imported by the drain lanes (offline-sync component, service
// worker) AND unit tests, so it MUST stay runtime-agnostic.
//
// The server replays answers in the order it receives them, so the client
// sends oldest-first: items are sorted by `reviewedAt` ascending before
// chunking. Each chunk respects the /api/review-sync item cap — a larger
// batch would be REJECTED by the route, not truncated.
// ---------------------------------------------------------------------------

import { REVIEW_SYNC_MAX_ITEMS } from "@/lib/review-sync";

/**
 * Sort `items` by `reviewedAt` ascending (oldest first) and chunk them into
 * arrays of at most `maxItems`. Returns `[]` for no items. Never mutates the
 * input array. Ties keep their input order (stable sort).
 */
export function buildSyncBatches<T extends { reviewedAt: string }>(
  items: readonly T[],
  maxItems: number = REVIEW_SYNC_MAX_ITEMS,
): T[][] {
  const sorted = [...items].sort(
    (a, b) => Date.parse(a.reviewedAt) - Date.parse(b.reviewedAt),
  );
  const batches: T[][] = [];
  for (let i = 0; i < sorted.length; i += maxItems) {
    batches.push(sorted.slice(i, i + maxItems));
  }
  return batches;
}
