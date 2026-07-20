// ---------------------------------------------------------------------------
// PURE review-sync core (spec §D). No I/O, no database client, no Next imports —
// imported by BOTH the /api/review-sync route AND unit tests, so it MUST stay
// runtime-agnostic.
//
// The zod schemas below are a whitelist: unknown keys are STRIPPED (zod's object
// default), so a client cannot smuggle extra fields — in particular a userId —
// into a replayed answer. The route takes the user from the session cookie only.
// ---------------------------------------------------------------------------

import { z } from "zod";

/** Hard cap on items per sync batch — a larger batch is REJECTED, not truncated. */
export const REVIEW_SYNC_MAX_ITEMS = 50;

/** Hard cap on the raw request body; the route enforces it BEFORE any JSON.parse. */
export const REVIEW_SYNC_MAX_BODY_BYTES = 65536;

/** How far in the past a client-reported review time may claim to be (7 days). */
export const REVIEW_SYNC_MAX_AGE_MS = 7 * 86_400_000;

// One offline answer to replay. Ids are opaque cuids (min-length sanity only);
// `selectedOptionId: null` is an explicit skip, distinct from an absent key.
// `sessionId` is OPTIONAL (wave13-17): an item WITHOUT one is a sessionless
// offline-practice review — the route applies it to the SRS lane only
// (recordReview), never minting a TestSession/TestAnswer.
export const reviewSyncItemSchema = z.object({
  sessionId: z.string().min(10).optional(),
  questionId: z.string().min(10),
  selectedOptionId: z.string().nullable(),
  latencyMs: z.number().int().min(0).max(600_000).optional(),
  clientEventId: z.string().min(8).max(128),
  reviewedAt: z.iso.datetime(),
});

export type ReviewSyncItem = z.infer<typeof reviewSyncItemSchema>;

// A POST body: a capped array of items (the item cap complements the byte cap —
// neither alone bounds both count and size).
export const reviewSyncBatchSchema = z.array(reviewSyncItemSchema).max(REVIEW_SYNC_MAX_ITEMS);

/**
 * Clamp a client-reported review timestamp into the trustworthy window
 * [now − 7d, now]: a fast clock (or forged future time) is pulled down to `now`,
 * and anything staler than 7 days is floored at now − 7d so FSRS never sees an
 * implausibly ancient review. In-window times pass through unchanged.
 * Always returns a NEW Date; never mutates its arguments.
 */
export function clampReviewedAt(clientTime: Date, now: Date): Date {
  const nowMs = now.getTime();
  const floorMs = nowMs - REVIEW_SYNC_MAX_AGE_MS;
  return new Date(Math.min(nowMs, Math.max(floorMs, clientTime.getTime())));
}
