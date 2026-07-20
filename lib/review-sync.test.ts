import { describe, it, expect } from "vitest";
import {
  clampReviewedAt,
  reviewSyncItemSchema,
  reviewSyncBatchSchema,
  REVIEW_SYNC_MAX_ITEMS,
  REVIEW_SYNC_MAX_BODY_BYTES,
} from "@/lib/review-sync";

// ---------------------------------------------------------------------------
// clampReviewedAt — FROZEN oracle (spec §D / task wave13-10). These exact ms
// values were fixed at plan time; do not derive them from the implementation.
// ---------------------------------------------------------------------------
describe("review-sync.clampReviewedAt", () => {
  const now = new Date(1700000000000);

  it("clamps a future client time down to now (never trusts a fast clock)", () => {
    const future = new Date(1700003600000); // now + 1h
    expect(clampReviewedAt(future, now).getTime()).toBe(1700000000000);
  });

  it("floors a client time older than 7 days at now − 7d", () => {
    const stale = new Date(1700000000000 - 8 * 86400000); // 1699308800000, now − 8d
    expect(stale.getTime()).toBe(1699308800000);
    expect(clampReviewedAt(stale, now).getTime()).toBe(1699395200000); // now − 7d
  });

  it("returns an in-window client time unchanged", () => {
    const recent = new Date(1699996400000); // now − 1h
    expect(clampReviewedAt(recent, now).getTime()).toBe(1699996400000);
  });

  it("does not mutate its arguments (returns a new Date)", () => {
    const client = new Date(1700003600000);
    const out = clampReviewedAt(client, now);
    expect(out).not.toBe(client);
    expect(client.getTime()).toBe(1700003600000);
    expect(now.getTime()).toBe(1700000000000);
  });
});

// ---------------------------------------------------------------------------
// Item schema — the whitelist (unknown keys stripped, the property /api/track proved)
// ---------------------------------------------------------------------------
describe("review-sync.reviewSyncItemSchema", () => {
  const validItem = {
    sessionId: "sess-0123456789",
    questionId: "ques-0123456789",
    selectedOptionId: "opt-0123456789",
    latencyMs: 4200,
    clientEventId: "evt-12345678",
    reviewedAt: "2026-07-01T12:00:00.000Z",
  };

  it("accepts a full valid item", () => {
    expect(reviewSyncItemSchema.safeParse(validItem).success).toBe(true);
  });

  it("accepts a skipped answer (selectedOptionId null) and omitted latencyMs", () => {
    const { latencyMs: _latencyMs, ...rest } = validItem;
    const r = reviewSyncItemSchema.safeParse({ ...rest, selectedOptionId: null });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.selectedOptionId).toBeNull();
  });

  it("accepts a sessionless item (sessionId absent — the offline-practice lane)", () => {
    const { sessionId: _sessionId, ...rest } = validItem;
    const r = reviewSyncItemSchema.safeParse(rest);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.sessionId).toBeUndefined();
  });

  it("rejects a missing selectedOptionId (null must be explicit, not absent)", () => {
    const { selectedOptionId: _selectedOptionId, ...rest } = validItem;
    expect(reviewSyncItemSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects too-short ids (sessionId/questionId < 10, clientEventId < 8)", () => {
    expect(reviewSyncItemSchema.safeParse({ ...validItem, sessionId: "short" }).success).toBe(false);
    expect(reviewSyncItemSchema.safeParse({ ...validItem, questionId: "short" }).success).toBe(false);
    expect(reviewSyncItemSchema.safeParse({ ...validItem, clientEventId: "short" }).success).toBe(false);
  });

  it("rejects an over-long clientEventId (> 128)", () => {
    expect(
      reviewSyncItemSchema.safeParse({ ...validItem, clientEventId: "x".repeat(129) }).success,
    ).toBe(false);
  });

  it("rejects an out-of-range latencyMs (negative, non-integer, > 600000)", () => {
    expect(reviewSyncItemSchema.safeParse({ ...validItem, latencyMs: -1 }).success).toBe(false);
    expect(reviewSyncItemSchema.safeParse({ ...validItem, latencyMs: 1.5 }).success).toBe(false);
    expect(reviewSyncItemSchema.safeParse({ ...validItem, latencyMs: 600001 }).success).toBe(false);
  });

  it("rejects a non-ISO-8601 reviewedAt", () => {
    expect(reviewSyncItemSchema.safeParse({ ...validItem, reviewedAt: "yesterday" }).success).toBe(false);
    expect(reviewSyncItemSchema.safeParse({ ...validItem, reviewedAt: 1700000000000 }).success).toBe(false);
  });

  it("STRIPS unknown keys so a client cannot smuggle extra fields", () => {
    const r = reviewSyncItemSchema.safeParse({
      ...validItem,
      userId: "attacker-supplied",
      password: "hunter2",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(Object.keys(r.data).sort()).toEqual(
        ["clientEventId", "latencyMs", "questionId", "reviewedAt", "selectedOptionId", "sessionId"].sort(),
      );
      expect(r.data).not.toHaveProperty("userId");
      expect(r.data).not.toHaveProperty("password");
    }
  });
});

// ---------------------------------------------------------------------------
// Batch schema + constants
// ---------------------------------------------------------------------------
describe("review-sync.reviewSyncBatchSchema", () => {
  const item = {
    sessionId: "sess-0123456789",
    questionId: "ques-0123456789",
    selectedOptionId: null,
    clientEventId: "evt-12345678",
    reviewedAt: "2026-07-01T12:00:00.000Z",
  };

  it("accepts a batch up to REVIEW_SYNC_MAX_ITEMS and rejects one item over", () => {
    expect(
      reviewSyncBatchSchema.safeParse(Array.from({ length: REVIEW_SYNC_MAX_ITEMS }, () => item)).success,
    ).toBe(true);
    expect(
      reviewSyncBatchSchema.safeParse(Array.from({ length: REVIEW_SYNC_MAX_ITEMS + 1 }, () => item))
        .success,
    ).toBe(false);
  });

  it("rejects a non-array body", () => {
    expect(reviewSyncBatchSchema.safeParse({ items: [item] }).success).toBe(false);
  });

  it("freezes the caps: 50 items, 65536 body bytes", () => {
    expect(REVIEW_SYNC_MAX_ITEMS).toBe(50);
    expect(REVIEW_SYNC_MAX_BODY_BYTES).toBe(65536);
  });
});
