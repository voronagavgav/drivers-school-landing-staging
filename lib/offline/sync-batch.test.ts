import { describe, it, expect } from "vitest";
import { buildSyncBatches } from "@/lib/offline/sync-batch";

// FROZEN ORACLE (task wave13-12): expected values are literals from the task
// spec — do not derive them by calling the implementation.

const item = (clientEventId: string, reviewedAt: string) => ({
  clientEventId,
  reviewedAt,
});

describe("buildSyncBatches", () => {
  it("sorts by reviewedAt ascending and chunks into arrays of ≤ maxItems", () => {
    const items = [
      item("evt-a", "2026-07-02T10:00:00.000Z"),
      item("evt-b", "2026-07-02T08:00:00.000Z"),
      item("evt-c", "2026-07-02T09:00:00.000Z"),
    ];

    expect(buildSyncBatches(items, 2)).toEqual([
      [
        { clientEventId: "evt-b", reviewedAt: "2026-07-02T08:00:00.000Z" },
        { clientEventId: "evt-c", reviewedAt: "2026-07-02T09:00:00.000Z" },
      ],
      [{ clientEventId: "evt-a", reviewedAt: "2026-07-02T10:00:00.000Z" }],
    ]);
  });

  it("returns [] for zero items", () => {
    expect(buildSyncBatches([], 2)).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const items = [
      item("evt-a", "2026-07-02T10:00:00.000Z"),
      item("evt-b", "2026-07-02T08:00:00.000Z"),
    ];
    buildSyncBatches(items, 2);
    expect(items[0].clientEventId).toBe("evt-a");
    expect(items[1].clientEventId).toBe("evt-b");
  });

  it("defaults maxItems to the review-sync cap (50): 51 items → batches of 50 and 1", () => {
    const items = Array.from({ length: 51 }, (_, i) =>
      item(`evt-${i}`, `2026-07-02T00:00:${String(i).padStart(2, "0")}.000Z`),
    );
    const batches = buildSyncBatches(items);
    expect(batches.length).toBe(2);
    expect(batches[0].length).toBe(50);
    expect(batches[1].length).toBe(1);
  });
});
