// ---------------------------------------------------------------------------
// Shared WAL drain (spec §D) — the ONE implementation both drain lanes call:
// the OfflineSync client component (mount + window "online") and the service
// worker's Background Sync handler. The lanes may race; that is safe because
// the server is idempotent per namespaced clientEventId (wave13-09) and both
// lanes delete only ACKED items.
//
// Keep/remove contract: items whose result status is "applied" or "rejected"
// are removed (a rejected item would be rejected again verbatim — replaying it
// forever is pointless); items are KEPT when the fetch itself fails or the
// route nacks `{ ok: false }` (still offline / logged out — retry later).
// ---------------------------------------------------------------------------

import { buildSyncBatches } from "@/lib/offline/sync-batch";
import { listQueued, removeQueued } from "@/lib/offline/wal";

type SyncResult = { clientEventId: string; status: string };

function readResults(json: unknown): SyncResult[] | null {
  if (typeof json !== "object" || json === null) return null;
  const body = json as { ok?: unknown; results?: unknown };
  if (body.ok !== true || !Array.isArray(body.results)) return null;
  return body.results.filter(
    (r): r is SyncResult =>
      typeof r === "object" && r !== null &&
      typeof (r as SyncResult).clientEventId === "string" &&
      typeof (r as SyncResult).status === "string",
  );
}

/**
 * Read the queue, POST it oldest-first in route-cap-sized batches to
 * /api/review-sync, and delete every acked (applied/rejected) item. Resolves
 * without throwing in every case — transport loss just leaves the queue for
 * the next drain.
 */
export async function drainReviewQueue(): Promise<void> {
  const queued = await listQueued();
  if (queued.length === 0) return;

  for (const batch of buildSyncBatches(queued)) {
    let results: SyncResult[] | null;
    try {
      const res = await fetch("/api/review-sync", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(batch),
      });
      results = readResults(await res.json());
    } catch {
      // Still offline (or the response was not JSON) — keep everything queued
      // and stop; later batches would meet the same fate.
      return;
    }
    if (!results) return; // route nack ({ ok: false }) — keep and retry later

    const acked = results
      .filter((r) => r.status === "applied" || r.status === "rejected")
      .map((r) => r.clientEventId);
    if (acked.length > 0) await removeQueued(acked);
  }
}
