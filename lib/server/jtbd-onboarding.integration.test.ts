import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/db";
import { answerOnboardingExamDate, setPrepModeAction } from "@/lib/server/study-profile";
import { getCurrentUser } from "@/lib/auth";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";

// Spec T4, wave16-12 — the OPTIONAL JTBD onboarding answers driven through their PRODUCTION entry
// points (the self-only profile actions) against the real seeded SQLite DB. Concerns:
//   §a prep-mode «SELF» → profile.prepMode === "SELF" AND a vi.waitFor-polled
//      `onboarding_jtbd_answered` event whose payload is `{ question: "prep_mode", prepMode: "SELF" }`;
//   §b skip path → the action is never called, so the flow completes with prepMode still null and
//      ZERO `onboarding_jtbd_answered` events for that user (absence of the event IS the skip signal);
//   §c «ще не записався» (scheduled=no) → examDate stays null, event carries examDateKnown:false;
//   §d invalid prepMode string → { error } (Ukrainian) with the profile untouched.
//
// Identity comes from getCurrentUser (via requireUser); we never drive real cookies in the node
// runtime, so partial-mock the auth boundary and point it at the fixture user under test.
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getCurrentUser: vi.fn() };
});

function asSessionUser(id: string) {
  return { id, role: "USER" } as unknown as Awaited<ReturnType<typeof getCurrentUser>>;
}

/** Parse the JSON payloads of a user's JTBD events and find the one for a given question. */
async function jtbdPayload(userId: string, question: "exam_date" | "prep_mode") {
  const rows = await prisma.analyticsEvent.findMany({
    where: { userId, eventName: "onboarding_jtbd_answered" },
  });
  return rows
    .map((r) => (r.payloadJson ? JSON.parse(r.payloadJson) : null))
    .find((p) => p?.question === question);
}

describe("JTBD onboarding — optional prep-mode & exam-date answers (T4)", () => {
  let fixtureA: OfficialQuestionFixture;
  let fixtureB: OfficialQuestionFixture;
  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    fixtureA = await createOfficialQuestion(prisma, { label: "jtbd-a", count: 1 });
    fixtureB = await createOfficialQuestion(prisma, { label: "jtbd-b", count: 1 });
    userAId = fixtureA.userId!;
    userBId = fixtureB.userId!;
    // Materialise both profiles at schema defaults so "prepMode still null" is a real assertion.
    await prisma.userStudyProfile.create({ data: { userId: userAId } });
    await prisma.userStudyProfile.create({ data: { userId: userBId } });
    // Every answer authenticates as user A (self-only — no target-user param exists).
    vi.mocked(getCurrentUser).mockResolvedValue(asSessionUser(userAId));
  });

  afterAll(async () => {
    // AnalyticsEvent.userId is SetNull on user delete, so clear our rows explicitly first.
    await prisma.analyticsEvent.deleteMany({ where: { userId: { in: [userAId, userBId] } } });
    await fixtureA.cleanup();
    await fixtureB.cleanup();
    await prisma.$disconnect();
  });

  // Both actions take ONLY a FormData — identity is never a client argument (IDOR-impossible).
  it("setPrepModeAction takes exactly one parameter (FormData)", () => {
    expect(setPrepModeAction.length).toBe(1);
  });

  it("§a persists prepMode=SELF and fires the onboarding_jtbd_answered event", async () => {
    const fd = new FormData();
    fd.append("prepMode", "SELF");
    const state = await setPrepModeAction(fd);
    expect(state).toEqual({ ok: true });

    const a = await prisma.userStudyProfile.findUniqueOrThrow({ where: { userId: userAId } });
    expect(a.prepMode).toBe("SELF");

    // Fire-and-forget (void recordEvent, outside any tx) → poll instead of a bare count.
    await vi.waitFor(async () => {
      const payload = await jtbdPayload(userAId, "prep_mode");
      expect(payload).toMatchObject({ question: "prep_mode", prepMode: "SELF" });
    });
  });

  it("§c «ще не записався» leaves examDate null and reports examDateKnown:false", async () => {
    const fd = new FormData();
    fd.append("scheduled", "no");
    // A smuggled date must be ignored on the unscheduled path.
    fd.append("examDate", "2026-09-01");
    const state = await answerOnboardingExamDate(fd);
    expect(state).toEqual({ ok: true });

    const a = await prisma.userStudyProfile.findUniqueOrThrow({ where: { userId: userAId } });
    expect(a.examDate).toBeNull();

    await vi.waitFor(async () => {
      const payload = await jtbdPayload(userAId, "exam_date");
      expect(payload).toMatchObject({ question: "exam_date", examDateKnown: false });
    });
  });

  it("§d rejects an invalid prepMode string without changing the profile", async () => {
    const before = await prisma.userStudyProfile.findUniqueOrThrow({ where: { userId: userAId } });

    const fd = new FormData();
    fd.append("prepMode", "MAYBE"); // not in PREP_MODES
    const state = await setPrepModeAction(fd);
    expect(state).toHaveProperty("error");
    expect(typeof (state as { error: string }).error).toBe("string");

    const after = await prisma.userStudyProfile.findUniqueOrThrow({ where: { userId: userAId } });
    expect(after).toEqual(before); // unchanged — no write on invalid input
  });

  it("§b skip path: no action call → prepMode stays null and zero JTBD events", async () => {
    // The «Пропустити» link is a plain navigation that invokes no server action — model the skip
    // by simply never calling one for user B. The contract: nothing written, nothing recorded.
    const b = await prisma.userStudyProfile.findUniqueOrThrow({ where: { userId: userBId } });
    expect(b.prepMode).toBeNull();

    const n = await prisma.analyticsEvent.count({
      where: { userId: userBId, eventName: "onboarding_jtbd_answered" },
    });
    expect(n).toBe(0);
  });
});
