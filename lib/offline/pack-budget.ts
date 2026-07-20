// ---------------------------------------------------------------------------
// Offline-pack storage budget (spec §E): the single place the 50 MiB cap
// lives. Pure arithmetic — no storage access, no environment probes — so the
// same law governs the download gate (packs.ts) and any UI meter math, and
// the boundary is unit-testable with frozen literals.
//
// "Usage" here means OUR stored sizeBytes total (the idb truth the meter
// shows), never navigator.storage.estimate() — see the task's honesty rule.
// ---------------------------------------------------------------------------

/** Hard cap for all stored packs combined: 50 MiB. */
export const OFFLINE_PACK_BUDGET_BYTES = 52428800;

/**
 * May a pack with `estimateBytes` be downloaded when `usageBytes` are already
 * stored? Inclusive boundary: a download that lands exactly ON the budget is
 * allowed (usage + estimate === budget → true).
 */
export function canDownload(
  usageBytes: number,
  estimateBytes: number,
  budget: number = OFFLINE_PACK_BUDGET_BYTES,
): boolean {
  return usageBytes + estimateBytes <= budget;
}
