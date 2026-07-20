// ---------------------------------------------------------------------------
// Shared IndexedDB plumbing for the client offline layer: the ONE opener for
// the "ds-offline" database (stores: "wal" — the answer write-ahead log,
// "packs" — downloaded offline packs) plus the single-transaction helper both
// modules build on. Raw IndexedDB on purpose — no idb library, keeps the
// client bundle light.
//
// Adding a store = bump DB_VERSION and create it in onupgradeneeded below.
// Every consumer opens through THIS module: a module opening the shared db
// with its own pinned stale version would throw VersionError once another
// module upgraded it, so per-consumer opens are banned.
//
// EVERY helper resolves harmlessly (never throws, never rejects) when
// IndexedDB is absent or opening fails — callers get their fallback value.
// ---------------------------------------------------------------------------

const DB_NAME = "ds-offline";
const DB_VERSION = 2;

export const WAL_STORE = "wal";
export const PACKS_STORE = "packs";

/** Open (creating/upgrading on first use) the offline db; null when unavailable. */
export function openOfflineDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(WAL_STORE)) {
          req.result.createObjectStore(WAL_STORE, { keyPath: "clientEventId" });
        }
        if (!req.result.objectStoreNames.contains(PACKS_STORE)) {
          req.result.createObjectStore(PACKS_STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Run `work` inside a single transaction on one store and resolve with
 * `read(request.result)` on commit, or with `fallback` on ANY failure (no
 * IndexedDB, open error, aborted transaction). Closes the db either way.
 */
export async function withStore<R>(
  storeName: string,
  mode: IDBTransactionMode,
  fallback: R,
  work: (store: IDBObjectStore) => IDBRequest | null,
  read: (result: unknown) => R,
): Promise<R> {
  const db = await openOfflineDb();
  if (!db) return fallback;
  return new Promise<R>((resolve) => {
    try {
      const tx = db.transaction(storeName, mode);
      const req = work(tx.objectStore(storeName));
      tx.oncomplete = () => {
        db.close();
        resolve(read(req?.result));
      };
      tx.onerror = () => {
        db.close();
        resolve(fallback);
      };
      tx.onabort = () => {
        db.close();
        resolve(fallback);
      };
    } catch {
      db.close();
      resolve(fallback);
    }
  });
}
