import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { pruneAnalyticsEvents } from "@/lib/analytics-prune";
import { ANALYTICS_RETENTION_DAYS } from "@/lib/constants";

// Retention pruning against the real (seeded) SQLite DB. We pass lib/db's prisma into the
// runtime-agnostic pruneAnalyticsEvents and drive it with an INJECTED `now` so the cutoff is
// deterministic. Fixtures carry a per-run STAMP in their eventName so we can find exactly our
// rows amid whatever else lives in dev.db (the fn deletes ANY stale row, so the return count is
// only asserted as a lower bound). All fixture rows are removed in afterAll.

const STAMP = Date.now();
const OLD_NAME = `prune-old-${STAMP}`;
const FRESH_NAME = `prune-fresh-${STAMP}`;
const BULK_NAME = `prune-bulk-${STAMP}`;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
// A fixed reference time so the retention cutoff (now − 180d) is stable across the suite.
const now = new Date("2026-07-01T00:00:00.000Z");
// Past the window (181d old) vs safely inside it (1d old).
const oldAt = new Date(now.getTime() - (ANALYTICS_RETENTION_DAYS + 1) * MS_PER_DAY);
const freshAt = new Date(now.getTime() - 1 * MS_PER_DAY);

async function seedEvent(eventName: string, createdAt: Date): Promise<void> {
  await prisma.analyticsEvent.create({ data: { eventName, createdAt } });
}

async function countByName(eventName: string): Promise<number> {
  return prisma.analyticsEvent.count({ where: { eventName } });
}

afterAll(async () => {
  await prisma.analyticsEvent.deleteMany({
    where: { eventName: { in: [OLD_NAME, FRESH_NAME, BULK_NAME] } },
  });
});

describe("pruneAnalyticsEvents — retention window + idempotency", () => {
  beforeAll(async () => {
    for (let i = 0; i < 3; i++) await seedEvent(OLD_NAME, oldAt);
    for (let i = 0; i < 2; i++) await seedEvent(FRESH_NAME, freshAt);
  });

  it("deletes rows past the retention window and keeps fresh rows", async () => {
    expect(await countByName(OLD_NAME)).toBe(3);
    expect(await countByName(FRESH_NAME)).toBe(2);

    const deleted = await pruneAnalyticsEvents(prisma, now);

    // Other stale rows may exist DB-wide, so only a lower bound is asserted.
    expect(deleted).toBeGreaterThanOrEqual(3);
    // The 3 old fixture rows are gone; the 2 fresh ones remain.
    expect(await countByName(OLD_NAME)).toBe(0);
    expect(await countByName(FRESH_NAME)).toBe(2);
  });

  it("is idempotent — an immediate re-run removes nothing further from the fixture", async () => {
    await pruneAnalyticsEvents(prisma, now);

    expect(await countByName(OLD_NAME)).toBe(0);
    expect(await countByName(FRESH_NAME)).toBe(2);
  });
});

describe("pruneAnalyticsEvents — multi-chunk loop", () => {
  beforeAll(async () => {
    // 1200 old rows (> 2 full chunks of 500) proves the loop pages through every chunk.
    const rows = Array.from({ length: 1200 }, () => ({ eventName: BULK_NAME, createdAt: oldAt }));
    for (let i = 0; i < rows.length; i += 200) {
      await prisma.analyticsEvent.createMany({ data: rows.slice(i, i + 200) });
    }
    await seedEvent(FRESH_NAME, freshAt); // one more fresh row to prove it survives the bulk prune
  });

  it("removes all 1200 old rows in a single call and leaves fresh rows intact", async () => {
    expect(await countByName(BULK_NAME)).toBe(1200);
    const freshBefore = await countByName(FRESH_NAME);

    const deleted = await pruneAnalyticsEvents(prisma, now);

    expect(deleted).toBeGreaterThanOrEqual(1200);
    expect(await countByName(BULK_NAME)).toBe(0);
    expect(await countByName(FRESH_NAME)).toBe(freshBefore);
  });
});
