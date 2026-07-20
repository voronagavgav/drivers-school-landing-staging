// ---------------------------------------------------------------------------
// Client-side offline packs (spec §E, client half): download a topic — or the
// caller's mistakes/saved set — for offline practice. Pack JSON lives in
// IndexedDB (shared "ds-offline" db, "packs" store, key = scope id); question
// images live in Cache Storage ("ds-pack-images"), a cache the app owns
// outright, so a saved pack survives independently of the service worker's
// runtime image lane and its eviction.
//
// Write order is the durability contract: images are stored FIRST, the packs
// row LAST — an interrupted download never leaves a listed-but-broken pack.
// Orphaned cached images from an aborted attempt are harmless (unlisted) and
// reclaimed by a later successful download/delete of the same scope.
//
// Every export feature-detects `indexedDB` + `caches` and no-ops safely
// (never throws, never rejects) when either is absent.
// ---------------------------------------------------------------------------

import type {
  OfflinePack,
  OfflinePackQuestion,
  OfflinePackScopeType,
} from "@/lib/server/offline-pack";
import { canDownload } from "./pack-budget";
import { PACKS_STORE, withStore } from "./idb";

const IMAGE_CACHE = "ds-pack-images";

/** The IndexedDB row for one downloaded pack (key = scope id). */
export type StoredPack = {
  id: string;
  type: OfflinePackScopeType;
  title: string;
  questions: OfflinePackQuestion[];
  sizeBytes: number;
  savedAt: number;
};

export type PackEstimate = { pack: OfflinePack; totalBytes: number };

export type DownloadResult =
  | { ok: true }
  | { ok: false; reason: "unsupported" | "network" | "storage" | "budget" };

/** Image URL a pack stores/serves — the negotiated 540-wide variant lane. */
function imageUrl(key: string): string {
  return `/api/q-image/${encodeURIComponent(key)}?w=540`;
}

function distinctImageKeys(questions: readonly OfflinePackQuestion[]): string[] {
  const keys = new Set<string>();
  for (const q of questions) if (q.imageKey) keys.add(q.imageKey);
  return [...keys];
}

/**
 * Fetch the pack JSON for a scope and return it with the HONEST total size:
 * the server's real on-disk image bytes (`estimatedImageBytes`) plus the JSON
 * payload's own byte length. Null on any failure (offline, logged out,
 * unknown scope) — the caller shows a retry, never a guessed number.
 */
export async function estimatePack(scope: string): Promise<PackEstimate | null> {
  if (typeof fetch === "undefined") return null;
  try {
    const res = await fetch(`/api/offline-pack/${encodeURIComponent(scope)}`, {
      credentials: "same-origin",
    });
    if (!res.ok) return null;
    const text = await res.text();
    const pack = JSON.parse(text) as OfflinePack;
    if (pack?.ok !== true || !Array.isArray(pack.questions)) return null;
    return { pack, totalBytes: pack.estimatedImageBytes + new TextEncoder().encode(text).byteLength };
  } catch {
    return null;
  }
}

/**
 * Download a scope for offline use: every distinct question image into the
 * ds-pack-images cache FIRST, then the pack row into IndexedDB LAST. Any
 * failure leaves no listed pack (see module header) — the caller's whole
 * retry story is "call downloadPack again".
 */
export async function downloadPack(scope: string): Promise<DownloadResult> {
  if (typeof indexedDB === "undefined" || typeof caches === "undefined") {
    return { ok: false, reason: "unsupported" };
  }
  const estimate = await estimatePack(scope);
  if (!estimate) return { ok: false, reason: "network" };
  const { pack, totalBytes } = estimate;

  // Budget gate (spec §E): refuse before any bytes move. Usage excludes a
  // same-scope row — overwriting a stored pack replaces its bytes, never adds.
  const existing = await listPacks();
  let previous: StoredPack | undefined;
  let usageBytes = 0;
  for (const p of existing) {
    if (p.id === pack.scope.id) previous = p;
    else usageBytes += p.sizeBytes;
  }
  if (!canDownload(usageBytes, totalBytes)) {
    return { ok: false, reason: "budget" };
  }

  try {
    const cache = await caches.open(IMAGE_CACHE);
    for (const key of distinctImageKeys(pack.questions)) {
      const url = imageUrl(key);
      // Programmatic fetch defaults to `Accept: */*`, which the route's
      // negotiation reads as "no avif/webp" — ask like an <img> does so the
      // stored bytes are the small prebaked variant the estimate counted.
      const res = await fetch(url, {
        credentials: "same-origin",
        headers: { accept: "image/avif,image/webp,image/*,*/*;q=0.8" },
      });
      if (!res.ok) return { ok: false, reason: "network" };
      await cache.put(url, res);
    }
  } catch {
    return { ok: false, reason: "network" };
  }

  const row: StoredPack = {
    id: pack.scope.id,
    type: pack.scope.type,
    title: pack.scope.title,
    questions: pack.questions,
    sizeBytes: totalBytes,
    savedAt: Date.now(),
  };
  const stored = await withStore(
    PACKS_STORE,
    "readwrite",
    false,
    (store) => store.put(row),
    () => true,
  );
  if (!stored) return { ok: false, reason: "storage" };

  // Overwrite pruning (spec §E): images the OLD version of this pack cached
  // but the new one no longer references would otherwise orphan in
  // ds-pack-images — unlisted and uncounted by the meter/budget. Prune AFTER
  // the row write (a failed overwrite must never strand the still-listed old
  // pack without its images), keeping keys any other stored pack references.
  if (previous) {
    const keptKeys = new Set<string>(distinctImageKeys(pack.questions));
    for (const p of existing) {
      if (p.id === pack.scope.id) continue;
      for (const key of distinctImageKeys(p.questions)) keptKeys.add(key);
    }
    try {
      const cache = await caches.open(IMAGE_CACHE);
      for (const key of distinctImageKeys(previous.questions)) {
        if (!keptKeys.has(key)) await cache.delete(imageUrl(key));
      }
    } catch {
      // Cache Storage refused — orphans are harmless (unlisted, see header).
    }
  }
  return { ok: true };
}

/** All downloaded packs, in no particular order; [] when unavailable/empty. */
export function listPacks(): Promise<StoredPack[]> {
  return withStore(
    PACKS_STORE,
    "readonly",
    [] as StoredPack[],
    (store) => store.getAll(),
    (result) => (Array.isArray(result) ? (result as StoredPack[]) : []),
  );
}

/**
 * Delete a downloaded pack: the IndexedDB row first (so a partial failure can
 * only strand harmless unlisted images, never a listed-but-broken pack), then
 * its cached image entries — except images another stored pack still
 * references (scopes overlap: a mistakes pack shares images with its topics).
 * Unknown id is a no-op.
 */
export async function deletePack(id: string): Promise<void> {
  const packs = await listPacks();
  const target = packs.find((p) => p.id === id);
  if (!target) return;

  await withStore(
    PACKS_STORE,
    "readwrite",
    undefined,
    (store) => {
      store.delete(id);
      return null;
    },
    () => undefined,
  );

  const keptKeys = new Set<string>();
  for (const p of packs) {
    if (p.id === id) continue;
    for (const key of distinctImageKeys(p.questions)) keptKeys.add(key);
  }
  if (typeof caches === "undefined") return;
  try {
    const cache = await caches.open(IMAGE_CACHE);
    for (const key of distinctImageKeys(target.questions)) {
      if (!keptKeys.has(key)) await cache.delete(imageUrl(key));
    }
  } catch {
    // Cache Storage refused — the row is already gone, orphans are harmless.
  }
}

/** Total bytes across downloaded packs (sum of stored sizeBytes); 0 when none. */
export async function packsUsageBytes(): Promise<number> {
  const packs = await listPacks();
  let total = 0;
  for (const p of packs) total += p.sizeBytes;
  return total;
}
