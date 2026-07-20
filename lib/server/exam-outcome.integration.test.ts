import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/db";
import { reportExamOutcomeAction } from "@/lib/server/study-profile";
import { getCurrentUser } from "@/lib/auth";
import { READINESS_MIN_SEEN } from "@/lib/constants";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";

// Spec T3 (capture half), wave16-10 — the self-reported real-exam outcome action driven through its
// PRODUCTION entry point against the real seeded SQLite DB (test:integration config stubs `server-only`).
// Concerns:
//   §a valid FAILED + date → THE SESSION user's profile row updated, examOutcomeReportedAt stamped, and
//      the fire-and-forget `exam_outcome_reported` AnalyticsEvent lands (vi.waitFor poll — house rule);
//   §b IDOR probe → a smuggled `userId` FormData field for user B is INERT (B's row byte-equal);
//   §c invalid outcome string → { error } (Ukrainian) with no profile change;
//   §d PASSED without a date → rejected (date required alongside outcome), no profile change;
//   §e (wave19a-07 §J) with a sufficient-data ReadinessSnapshot (passProbability 0.61) seeded for the
//      session user, a PASSED report ALSO captures exactly one calibration `PassOutcome`
//      (predictedPassProbability 0.61, passed=true, source="self_report") composed via recordExamOutcome;
//   §f no sufficient-data snapshot → the PASSED report still writes the profile but captures NO
//      PassOutcome (the honesty-law capture gate holds — graceful no-op).
//
// Identity comes from getCurrentUser (via requireUser); we never drive real cookies in the node runtime,
// so partial-mock the auth boundary and point it at the fixture user under test.
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getCurrentUser: vi.fn() };
});

function asSessionUser(id: string) {
  return { id, role: "USER" } as unknown as Awaited<ReturnType<typeof getCurrentUser>>;
}

describe("reportExamOutcomeAction — self-only outcome capture (T3)", () => {
  let fixtureA: OfficialQuestionFixture;
  let fixtureB: OfficialQuestionFixture;
  let fixtureC: OfficialQuestionFixture;
  let userAId: string;
  let userBId: string;
  let userCId: string;

  beforeAll(async () => {
    fixtureA = await createOfficialQuestion(prisma, { label: "eo-a", count: 1 });
    fixtureB = await createOfficialQuestion(prisma, { label: "eo-b", count: 1 });
    fixtureC = await createOfficialQuestion(prisma, { label: "eo-c", count: 1 });
    userAId = fixtureA.userId!;
    userBId = fixtureB.userId!;
    userCId = fixtureC.userId!;
    // Materialise both profiles at schema defaults so "B unchanged" is a real assertion.
    await prisma.userStudyProfile.create({ data: { userId: userAId } });
    await prisma.userStudyProfile.create({ data: { userId: userBId } });
    // Every call authenticates as user A (self-only — no target-user param exists).
    vi.mocked(getCurrentUser).mockResolvedValue(asSessionUser(userAId));
  });

  afterAll(async () => {
    // AnalyticsEvent.userId is SetNull on user delete, so clear our rows explicitly first.
    await prisma.analyticsEvent.deleteMany({
      where: { userId: { in: [userAId, userBId, userCId] } },
    });
    // PassOutcome/ReadinessSnapshot → User are Cascade, so each fixture's user delete clears them.
    await fixtureA.cleanup();
    await fixtureB.cleanup();
    await fixtureC.cleanup();
    await prisma.$disconnect();
  });

  // The action takes ONLY a FormData — no userId parameter (IDOR-impossible by construction).
  it("takes exactly one parameter (FormData) — identity is never a client argument", () => {
    expect(reportExamOutcomeAction.length).toBe(1);
  });

  it("§a records a valid FAILED outcome + date for the session user and fires the analytics event", async () => {
    const fd = new FormData();
    fd.append("outcome", "FAILED");
    fd.append("examDate", "2026-06-15");
    const state = await reportExamOutcomeAction(fd);
    expect(state).toEqual({ ok: true });

    const a = await prisma.userStudyProfile.findUnique({ where: { userId: userAId } });
    expect(a!.examOutcome).toBe("FAILED");
    expect(a!.examOutcomeDate?.toISOString().startsWith("2026-06-15")).toBe(true);
    expect(a!.examOutcomeReportedAt).not.toBeNull();

    // Fire-and-forget (void recordEvent, outside any tx) → poll instead of a bare count.
    await vi.waitFor(async () => {
      const n = await prisma.analyticsEvent.count({
        where: { userId: userAId, eventName: "exam_outcome_reported" },
      });
      expect(n).toBe(1);
    });
  });

  it("§b ignores a smuggled userId — user B's row is untouched", async () => {
    const before = await prisma.userStudyProfile.findUniqueOrThrow({ where: { userId: userBId } });

    const fd = new FormData();
    fd.append("outcome", "PASSED");
    fd.append("examDate", "2026-07-01");
    fd.append("userId", userBId); // IDOR probe — the action must ignore this entirely.
    const state = await reportExamOutcomeAction(fd);
    expect(state).toEqual({ ok: true }); // A's write succeeds…

    const bAfter = await prisma.userStudyProfile.findUniqueOrThrow({ where: { userId: userBId } });
    expect(bAfter).toEqual(before); // …but B is byte-equal (no cross-user write)
    // …and no calibration row leaks onto user B either (IDOR-safe for the composed capture too).
    expect(await prisma.passOutcome.count({ where: { userId: userBId } })).toBe(0);
  });

  it("§c rejects an invalid outcome string without changing the profile", async () => {
    const before = await prisma.userStudyProfile.findUniqueOrThrow({ where: { userId: userAId } });

    const fd = new FormData();
    fd.append("outcome", "MAYBE"); // not in EXAM_OUTCOMES
    fd.append("examDate", "2026-06-15");
    const state = await reportExamOutcomeAction(fd);
    expect(state).toHaveProperty("error");
    expect(typeof (state as { error: string }).error).toBe("string");

    const after = await prisma.userStudyProfile.findUniqueOrThrow({ where: { userId: userAId } });
    expect(after).toEqual(before); // unchanged — no write on invalid input
  });

  it("§d rejects a PASSED outcome with no date (date required alongside outcome)", async () => {
    const before = await prisma.userStudyProfile.findUniqueOrThrow({ where: { userId: userAId } });

    const fd = new FormData();
    fd.append("outcome", "PASSED"); // no examDate field at all
    const state = await reportExamOutcomeAction(fd);
    expect(state).toHaveProperty("error");

    const after = await prisma.userStudyProfile.findUniqueOrThrow({ where: { userId: userAId } });
    expect(after).toEqual(before); // unchanged
  });

  it("§e captures a calibration PassOutcome pair when a sufficient-data snapshot exists (PASSED)", async () => {
    // Seed a sufficient-data readiness snapshot for the session user (A). getLatestReadiness reads the
    // snapshot.passProbability column + parsed.sufficientData from inputsJson — so 0.61 is the number the
    // composed recordExamOutcome must snapshot into the PassOutcome pair.
    await prisma.readinessSnapshot.create({
      data: {
        userId: userAId,
        passProbability: 0.61,
        dialPercent: 61,
        inputsJson: JSON.stringify({ sufficientData: true, seenCount: READINESS_MIN_SEEN }),
      },
    });

    const fd = new FormData();
    fd.append("outcome", "PASSED");
    fd.append("examDate", "2026-07-05");
    const state = await reportExamOutcomeAction(fd);
    expect(state).toEqual({ ok: true });

    // The honest profile row is written…
    const a = await prisma.userStudyProfile.findUnique({ where: { userId: userAId } });
    expect(a!.examOutcome).toBe("PASSED");

    // …AND exactly one durable calibration pair is captured (prior PASSED/FAILED reports had no
    // snapshot, so they captured nothing — this is the first and only PassOutcome for user A).
    const outcomes = await prisma.passOutcome.findMany({ where: { userId: userAId } });
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0].predictedPassProbability).toBe(0.61);
    expect(outcomes[0].passed).toBe(true);
    expect(outcomes[0].source).toBe("self_report");
  });

  it("§f a PASSED report with no sufficient-data snapshot still writes the profile but captures no PassOutcome", async () => {
    // Fresh session user C with NO readiness snapshot — the capture gate (honesty law) must hold.
    vi.mocked(getCurrentUser).mockResolvedValue(asSessionUser(userCId));

    const fd = new FormData();
    fd.append("outcome", "PASSED");
    fd.append("examDate", "2026-07-05");
    const state = await reportExamOutcomeAction(fd);
    expect(state).toEqual({ ok: true });

    const c = await prisma.userStudyProfile.findUnique({ where: { userId: userCId } });
    expect(c!.examOutcome).toBe("PASSED"); // the honest report still lands…
    expect(await prisma.passOutcome.count({ where: { userId: userCId } })).toBe(0); // …but no pair.
  });
});
