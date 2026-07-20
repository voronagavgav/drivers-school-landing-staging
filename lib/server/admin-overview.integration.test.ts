import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { getDashboardStats, getAnalyticsSummary } from "@/lib/server/admin";

// Overview/analytics aggregate helpers against the real seeded SQLite DB
// (test:integration config, which stubs `server-only`). These power the admin
// landing KPI cards (getDashboardStats) and the /admin/analytics page
// (getAnalyticsSummary). The Prisma `groupBy` + `orderBy: { _count }` form
// typechecks but can fail at RUNTIME, so we exercise it here; we also assert the
// privacy contract: the summary returns COUNTS/groupings only — never raw rows,
// IPs, or per-user trails.

const throwawayEventIds: string[] = [];
const STAMP = Date.now();
const ANON = `overview-test-anon-${STAMP}`;

beforeAll(async () => {
  // Two events for the SAME anonymousId in the last 7d → must collapse to ONE visitor.
  for (let i = 0; i < 2; i++) {
    const ev = await prisma.analyticsEvent.create({
      data: {
        eventName: "client_event",
        eventType: "page_view",
        anonymousId: ANON,
        deviceType: "mobile",
        ipHash: "deadbeef-not-a-raw-ip",
        createdAt: new Date(),
      },
    });
    throwawayEventIds.push(ev.id);
  }
});

afterAll(async () => {
  for (const id of throwawayEventIds) {
    await prisma.analyticsEvent.delete({ where: { id } }).catch(() => undefined);
  }
  await prisma.$disconnect();
});

describe("getDashboardStats", () => {
  it("returns non-negative KPI counts with demo/official split consistent with totals", async () => {
    const s = await getDashboardStats();
    for (const v of Object.values(s)) {
      expect(typeof v).toBe("number");
      expect(v).toBeGreaterThanOrEqual(0);
    }
    // Published + demo/official are subsets of the total question count.
    expect(s.questionsPublished).toBeLessThanOrEqual(s.questionsTotal);
    expect(s.questionsDemo).toBeLessThanOrEqual(s.questionsTotal);
    expect(s.questionsOfficial).toBeLessThanOrEqual(s.questionsTotal);
    expect(s.questionsArchived).toBeLessThanOrEqual(s.questionsTotal);
    // The seeded DB holds real questions across at least one topic + category.
    expect(s.questionsTotal).toBeGreaterThan(0);
  });
});

describe("getAnalyticsSummary", () => {
  it("runs the groupBy aggregation and returns aggregate shape only", async () => {
    const a = await getAnalyticsSummary();

    expect(a.total).toBeGreaterThanOrEqual(2);
    expect(a.last7d).toBeGreaterThanOrEqual(2);
    expect(a.last24h).toBeGreaterThanOrEqual(2);
    expect(a.last7d).toBeLessThanOrEqual(a.total);
    expect(a.last24h).toBeLessThanOrEqual(a.last7d);

    // topEvents is capped at 8, ordered desc, and shaped {name,count}.
    expect(a.topEvents.length).toBeLessThanOrEqual(8);
    for (let i = 1; i < a.topEvents.length; i++) {
      expect(a.topEvents[i - 1].count).toBeGreaterThanOrEqual(a.topEvents[i].count);
    }
    // Privacy: every reported field is an aggregate (string name + numeric count),
    // never a raw row, IP, or identity.
    for (const e of [...a.topEvents, ...a.byDevice]) {
      expect(Object.keys(e).sort()).toEqual(["count", "name"]);
      expect(typeof e.name).toBe("string");
      expect(typeof e.count).toBe("number");
    }
    // Our two seeded events share one anonymousId → counted as a single visitor.
    expect(a.visitors7d).toBeGreaterThanOrEqual(1);
    // The mobile device bucket must reflect our seeded events.
    const mobile = a.byDevice.find((d) => d.name === "mobile");
    expect(mobile?.count ?? 0).toBeGreaterThanOrEqual(2);
  });
});
