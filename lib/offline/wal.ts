// ---------------------------------------------------------------------------
// Client-side IndexedDB write-ahead log for offline answers (spec §D), on the
// shared "ds-offline" db (opener + transaction helper live in ./idb).
//
// EVERY export feature-detects `indexedDB` and resolves harmlessly (never
// throws, never rejects) when it is absent or opening fails: the runner treats
// an enqueue failure as "fall back to the inline retry error", nothing more.
// Exactly-once delivery is the SERVER's job (namespaced clientEventId
// idempotency) — this queue may double-send but keys by clientEventId, so a
// retried enqueue of the same attempt overwrites instead of duplicating.
// ---------------------------------------------------------------------------

import type { ReviewSyncItem } from "@/lib/review-sync";
import { WAL_STORE, withStore as withOfflineStore } from "./idb";

export type WalItem = ReviewSyncItem;

/** `withStore` from ./idb, pinned to the WAL store. */
function withStore<R>(
  mode: IDBTransactionMode,
  fallback: R,
  work: (store: IDBObjectStore) => IDBRequest | null,
  read: (result: unknown) => R,
): Promise<R> {
  return withOfflineStore(WAL_STORE, mode, fallback, work, read);
}

/**
 * Queue one answer for later sync. Keyed by clientEventId, so re-enqueueing
 * the same attempt is an overwrite, never a duplicate. Resolves false when the
 * item could NOT be persisted (caller falls back to the inline error).
 */
export function enqueueAnswer(item: WalItem): Promise<boolean> {
  return withStore(
    "readwrite",
    false,
    (store) => store.put(item),
    () => true,
  );
}

/** All queued answers, in no particular order; [] when unavailable/empty. */
export function listQueued(): Promise<WalItem[]> {
  return withStore(
    "readonly",
    [] as WalItem[],
    (store) => store.getAll(),
    (result) => (Array.isArray(result) ? (result as WalItem[]) : []),
  );
}

/** Delete the given clientEventIds (acked items). Missing ids are no-ops. */
export function removeQueued(ids: readonly string[]): Promise<void> {
  return withStore(
    "readwrite",
    undefined,
    (store) => {
      for (const id of ids) store.delete(id);
      return null;
    },
    () => undefined,
  );
}

/** Number of queued answers; 0 when unavailable. */
export function queuedCount(): Promise<number> {
  return withStore(
    "readonly",
    0,
    (store) => store.count(),
    (result) => (typeof result === "number" ? result : 0),
  );
}
