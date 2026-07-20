import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/db";
import { READINESS_MIN_SEEN } from "@/lib/constants";
import { recordExamOutcome } from "@/lib/server/pass-outcome";
import { getCurrentUser } from "@/lib/auth";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";

// Spec §I (capture unit), wave19a-06 — the calibration-capture helper driven DIRECTLY against the
// real seeded SQLite DB (test:integration config stubs `server-only`). Concerns:
//   §a a sufficient-data readiness snapshot → recordExamOutcome(true) inserts exactly one PassOutcome
//      for THE SESSION user (predicted 0.73, passed, source "self_report") and fires the
//      fire-and-forget `pass_outcome_captured` event (vi.waitFor poll — house rule);
//   §b insufficient / no snapshot → the honesty law: NO row, no throw ({ ok, captured:false });
//   §c unauthenticated (getCurrentUser → null) → requireUser redirects/throws, no row written;
//   §d self-only by construction: no target-user parameter exists, and user B never gets a row.
//
// Identity comes from getCurrentUser (via requireUser); we never drive real cookies in the node
// runtime, so partial-mock the auth boundary and point it at the fixture user under test.
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getCurrentUser: vi.fn() };
});

function asSessionUser(id: string, selectedCategoryId: string) {
  return {
    id,
    role: "USER",
    selectedCategoryId,
  } as unknown as Awaited<ReturnType<typeof getCurrentUser>>;
}

describe("recordExamOutcome — self-only calibration capture (§I)", () => {
  let fixtureA: OfficialQuestionFixture;
  let fixtureB: OfficialQuestionFixture;
  let userAId: string;
  let snapAId: string;
  let userBId: string;
  let categoryAId: string;
  let categoryBId: string;

  beforeAll(async () => {
    fixtureA = await createOfficialQuestion(prisma, { label: "po-a", count: 1 });
    fixtureB = await createOfficialQuestion(prisma, { label: "po-b", count: 1 });
    userAId = fixtureA.userId!;
    userBId = fixtureB.userId!;
    categoryAId = fixtureA.categoryId;
    categoryBId = fixtureB.categoryId;

    // A snapshot whose audit inputs mark the dial as a REAL number (sufficientData) → a capture pair.
    const snapA = await prisma.readinessSnapshot.create({
      data: {
        userId: userAId,
        categoryId: categoryAId,
        passProbability: 0.73,
        dialPercent: 68,
        inputsJson: JSON.stringify({ sufficientData: true, seenCount: READINESS_MIN_SEEN }),
      },
    });
    snapAId = snapA.id;
    // User B has a snapshot too, but we NEVER authenticate as B — its rows must stay empty.
    await prisma.readinessSnapshot.create({
      data: {
        userId: userBId,
        categoryId: categoryBId,
        passProbability: 0.5,
        dialPercent: 50,
        inputsJson: JSON.stringify({ sufficientData: true, seenCount: READINESS_MIN_SEEN }),
      },
    });
  });

  afterAll(async () => {
    // FK-safe teardown: clear our analytics + calibration + snapshot rows for BOTH users BEFORE the
    // fixture cleanup (users→questions order). AnalyticsEvent.userId is SetNull, PassOutcome/
    // ReadinessSnapshot are Cascade on user delete, but we clear explicitly so counts stay clean.
    await prisma.analyticsEvent.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
    await prisma.passOutcome.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
    await prisma.readinessSnapshot.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
    await fixtureA.cleanup();
    await fixtureB.cleanup();
    await prisma.$disconnect();
  });

  // Self-only by construction: no target-user parameter — at most (passed, categoryId).
  it("§d exposes no target-user parameter (at most passed + categoryId)", () => {
    expect(recordExamOutcome.length).toBeLessThanOrEqual(2);
  });

  it("§a records a calibration pair for the session user and fires the analytics event", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(asSessionUser(userAId, categoryAId));

    const result = await recordExamOutcome(true);
    expect(result).toEqual({ ok: true, captured: true });

    const rows = await prisma.passOutcome.findMany({ where: { userId: userAId } });
    expect(rows).toHaveLength(1);
    expect(rows[0].predictedPassProbability).toBe(0.73);
    expect(rows[0].passed).toBe(true);
    expect(rows[0].source).toBe("self_report");
    expect(rows[0].categoryId).toBe(categoryAId);
    // Segmentation key for future recalibration (2026-07-13): the row must point at the exact
    // snapshot whose inputsJson holds the engine/ρ/tier tags the prediction was computed under.
    expect(rows[0].readinessSnapshotId).toBe(snapAId);

    // Fire-and-forget (void recordEvent, outside any tx) → poll instead of a bare count.
    await vi.waitFor(async () => {
      const n = await prisma.analyticsEvent.count({
        where: { userId: userAId, eventName: "pass_outcome_captured" },
      });
      expect(n).toBe(1);
    });

    // B never authenticated → no cross-user write.
    expect(await prisma.passOutcome.count({ where: { userId: userBId } })).toBe(0);
  });

  it("§b honesty law: no snapshot / insufficient data → no row, no throw", async () => {
    // User B has a sufficient snapshot, but drop it so the latest is absent → captured:false.
    await prisma.readinessSnapshot.deleteMany({ where: { userId: userBId } });
    vi.mocked(getCurrentUser).mockResolvedValue(asSessionUser(userBId, categoryBId));

    const result = await recordExamOutcome(false);
    expect(result).toEqual({ ok: true, captured: false });
    expect(await prisma.passOutcome.count({ where: { userId: userBId } })).toBe(0);
    expect(
      await prisma.analyticsEvent.count({
        where: { userId: userBId, eventName: "pass_outcome_captured" },
      }),
    ).toBe(0);
  });

  it("§c rejects an unauthenticated caller and writes no row", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    // requireUser() redirect()s to /login → throws NEXT_REDIRECT outside a request store.
    await expect(recordExamOutcome(true)).rejects.toThrow();
    expect(await prisma.passOutcome.count({ where: { userId: userAId } })).toBe(1); // still just §a's
  });
});
