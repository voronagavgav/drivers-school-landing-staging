import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import {
  hashIp,
  deviceTypeFromUserAgent,
  trackEventSchema,
  trackBatchSchema,
  recordBatch,
  isRateLimited,
  type RateState,
} from "@/lib/analytics-ingest";
import { TRACK_MAX_BATCH_SIZE, TRACK_MAX_PATH_LEN } from "@/lib/constants";

// ---------------------------------------------------------------------------
// IP pseudonymisation
// ---------------------------------------------------------------------------
describe("analytics-ingest.hashIp", () => {
  it("returns the salted SHA-256 hex digest of the ip (one-way, not the raw ip)", () => {
    const salt = "s3cr3t-salt";
    const ip = "203.0.113.7";
    const expected = createHash("sha256").update(`${salt}:${ip}`).digest("hex");
    const got = hashIp(ip, salt);
    expect(got).toBe(expected);
    expect(got).not.toContain(ip); // the raw ip never appears in the digest
    expect(got).toMatch(/^[0-9a-f]{64}$/); // 32-byte hex
  });

  it("is deterministic for the same (ip, salt) and differs across ips", () => {
    expect(hashIp("10.0.0.1", "salt")).toBe(hashIp("10.0.0.1", "salt"));
    expect(hashIp("10.0.0.1", "salt")).not.toBe(hashIp("10.0.0.2", "salt"));
  });

  it("changes when the salt rotates (same ip, different salt → different hash)", () => {
    expect(hashIp("10.0.0.1", "saltA")).not.toBe(hashIp("10.0.0.1", "saltB"));
  });

  it("trims surrounding whitespace before hashing", () => {
    expect(hashIp("  198.51.100.9  ", "salt")).toBe(hashIp("198.51.100.9", "salt"));
  });

  it("returns null for a missing / empty / whitespace ip (nothing to hash)", () => {
    expect(hashIp(null, "salt")).toBeNull();
    expect(hashIp(undefined, "salt")).toBeNull();
    expect(hashIp("", "salt")).toBeNull();
    expect(hashIp("   ", "salt")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Device bucketing
// ---------------------------------------------------------------------------
describe("analytics-ingest.deviceTypeFromUserAgent", () => {
  it('buckets a desktop UA as "desktop"', () => {
    expect(
      deviceTypeFromUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      ),
    ).toBe("desktop");
  });

  it('buckets an iPhone UA as "mobile"', () => {
    expect(
      deviceTypeFromUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605 Mobile/15E148",
      ),
    ).toBe("mobile");
  });

  it('buckets an Android phone UA as "mobile"', () => {
    expect(
      deviceTypeFromUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120 Mobile Safari/537.36"),
    ).toBe("mobile");
  });

  it('buckets an iPad UA as "tablet" (matched before mobile)', () => {
    expect(
      deviceTypeFromUserAgent("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605 Safari/604"),
    ).toBe("tablet");
  });

  it("returns null for a missing / empty UA", () => {
    expect(deviceTypeFromUserAgent(null)).toBeNull();
    expect(deviceTypeFromUserAgent(undefined)).toBeNull();
    expect(deviceTypeFromUserAgent("   ")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Batch validation (the PII whitelist + caps)
// ---------------------------------------------------------------------------
describe("analytics-ingest.trackEventSchema", () => {
  it("accepts a minimal valid event (eventType only)", () => {
    expect(trackEventSchema.safeParse({ eventType: "page_view" }).success).toBe(true);
  });

  it("accepts a full valid event", () => {
    const r = trackEventSchema.safeParse({
      eventType: "click",
      path: "/dashboard",
      referrer: "/login",
      elementType: "button",
      elementLabel: "start-exam",
      sessionId: "sess-123",
      viewport: "1280x720",
      durationMs: 4200,
      metadata: { mode: "EXAM_SIMULATION", count: 20, flag: true },
    });
    expect(r.success).toBe(true);
  });

  it("rejects a missing / empty eventType", () => {
    expect(trackEventSchema.safeParse({}).success).toBe(false);
    expect(trackEventSchema.safeParse({ eventType: "" }).success).toBe(false);
  });

  it("STRIPS unknown keys so a client cannot smuggle PII into a row", () => {
    const r = trackEventSchema.safeParse({
      eventType: "click",
      password: "hunter2",
      answerText: "B is correct",
      email: "a@b.com",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).not.toHaveProperty("password");
      expect(r.data).not.toHaveProperty("answerText");
      expect(r.data).not.toHaveProperty("email");
      expect(Object.keys(r.data)).toEqual(["eventType"]);
    }
  });

  it("rejects an over-long path (field cap)", () => {
    expect(
      trackEventSchema.safeParse({ eventType: "x", path: "/" + "a".repeat(TRACK_MAX_PATH_LEN) })
        .success,
    ).toBe(false);
  });

  it("rejects a negative durationMs", () => {
    expect(trackEventSchema.safeParse({ eventType: "x", durationMs: -1 }).success).toBe(false);
  });

  it("rejects metadata carrying a nested object (only primitive values allowed)", () => {
    expect(
      trackEventSchema.safeParse({ eventType: "x", metadata: { nested: { a: 1 } } }).success,
    ).toBe(false);
  });
});

describe("analytics-ingest.trackBatchSchema", () => {
  it("accepts a batch at the size cap", () => {
    const events = Array.from({ length: TRACK_MAX_BATCH_SIZE }, () => ({ eventType: "ping" }));
    expect(trackBatchSchema.safeParse({ events }).success).toBe(true);
  });

  it("rejects an empty batch", () => {
    expect(trackBatchSchema.safeParse({ events: [] }).success).toBe(false);
  });

  it("rejects a batch one over the size cap", () => {
    const events = Array.from({ length: TRACK_MAX_BATCH_SIZE + 1 }, () => ({ eventType: "ping" }));
    expect(trackBatchSchema.safeParse({ events }).success).toBe(false);
  });

  it("rejects a non-array events field", () => {
    expect(trackBatchSchema.safeParse({ events: "nope" }).success).toBe(false);
    expect(trackBatchSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a batch containing an invalid event", () => {
    expect(
      trackBatchSchema.safeParse({ events: [{ eventType: "ok" }, { eventType: "" }] }).success,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Per-source rate limiting (reused throttle core)
// ---------------------------------------------------------------------------
describe("analytics-ingest rate limiting", () => {
  const cfg = { maxAttempts: 3, windowMs: 1000 };

  it("is not limited with no prior state", () => {
    expect(isRateLimited(undefined, 0, cfg)).toBe(false);
  });

  it("is not limited while under the cap within the window", () => {
    let s: RateState | undefined;
    s = recordBatch(s, 0, cfg); // 1
    s = recordBatch(s, 100, cfg); // 2
    expect(isRateLimited(s, 150, cfg)).toBe(false);
  });

  it("is limited once the batch cap is reached within the window", () => {
    let s: RateState | undefined;
    s = recordBatch(s, 0, cfg); // 1
    s = recordBatch(s, 100, cfg); // 2
    s = recordBatch(s, 200, cfg); // 3 -> at cap
    expect(isRateLimited(s, 250, cfg)).toBe(true);
  });

  it("resets after the window elapses (a fresh batch is not limited)", () => {
    let s: RateState | undefined;
    for (const t of [0, 100, 200]) s = recordBatch(s, t, cfg);
    expect(isRateLimited(s, 250, cfg)).toBe(true);
    const s2 = recordBatch(s, 5000, cfg); // window elapsed → fresh window at 1
    expect(s2.failures).toBe(1);
    expect(isRateLimited(s2, 5001, cfg)).toBe(false);
  });
});
