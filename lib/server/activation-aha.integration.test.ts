import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/db";
import { submitAnswer } from "@/lib/server/test-engine";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";

// wave18-03 (spec T3, CONFIRMED #4): `activation_aha` — the funnel's first-reveal "aha" — must fire on
// the user's first QUALIFYING answer: one in a feedback mode (NOT the withheld EXAM_SIMULATION /
// DIAGNOSTIC) whose question HAS an explanation. The pre-fix gate used a GLOBAL `testAnswer.count === 1`
// over ALL modes, so a user whose FIRST answer was a diagnostic/exam question bumped the global count
// past 1 without ever entering the feedback block — `activation_aha` then NEVER fired for the
// onboarding/diagnostic-first cohort the funnel exists to instrument.
//
// This suite drives the REAL submit path (`submitAnswer`) against the seeded SQLite DB and asserts the
// hand-computed oracle counts A–D. The event is fire-and-forget (`void recordEvent`, off the write
// transaction), so we poll with `vi.waitFor`. Sessions are created directly (mode is what matters, and
// `submitAnswer` doesn't require a TestSessionQuestion row) for deterministic control of each scenario.

const RUN = Date.now();

// Fixture questions shared across all oracle users (answers are per-session, so questions are reusable).
let fixture: OfficialQuestionFixture;
let categoryId: string;
let qExpl: string[]; // questions WITH an explanation
let qNoExpl: string; // a question WITHOUT an explanation (Oracle D)

/** The correct option for a fixture question (created as text "right"). */
async function correctOption(questionId: string): Promise<string> {
  const opt = await prisma.questionOption.findFirst({ where: { questionId, isCorrect: true } });
  return opt!.id;
}

/** Create a throwaway IN_PROGRESS session of `mode` for `userId`, return its id. */
async function makeSession(userId: string, mode: string): Promise<string> {
  const s = await prisma.testSession.create({ data: { userId, mode, categoryId } });
  return s.id;
}

/** Create a throwaway USER attached to the fixture category. */
async function makeUser(label: string): Promise<string> {
  const u = await prisma.user.create({
    data: {
      name: `${label} user`,
      email: `aha-${label}-${RUN}@test.local`,
      passwordHash: "x",
      role: "USER",
      selectedCategoryId: categoryId,
    },
  });
  return u.id;
}

/** Answer `questionId` (correct pick) within `sessionId` via the real submit path. */
async function answer(userId: string, sessionId: string, questionId: string): Promise<void> {
  await submitAnswer({
    sessionId,
    userId,
    questionId,
    selectedOptionId: await correctOption(questionId),
  });
}

async function ahaCount(userId: string): Promise<number> {
  return prisma.analyticsEvent.count({ where: { userId, eventName: "activation_aha" } });
}

const userIds: string[] = [];

beforeAll(async () => {
  // Three questions WITH an explanation + one WITHOUT, all published in one throwaway category.
  fixture = await createOfficialQuestion(prisma, { label: "aha", count: 4, withUser: false });
  categoryId = fixture.categoryId;
  qExpl = fixture.questionIds.slice(0, 3);
  qNoExpl = fixture.questionIds[3];
  for (const questionId of qExpl) {
    await prisma.questionExplanation.create({ data: { questionId, shortText: "why" } });
  }
});

afterAll(async () => {
  // AnalyticsEvent.userId is onDelete:SetNull — clear our rows BEFORE deleting the users, else they
  // orphan with a null userId and pollute future funnel counts (CLAUDE.md analytics-teardown rule).
  if (userIds.length) {
    await prisma.analyticsEvent.deleteMany({ where: { userId: { in: userIds } } });
    for (const id of userIds) {
      await prisma.user.delete({ where: { id } }).catch(() => undefined);
    }
  }
  await fixture.cleanup();
  await prisma.$disconnect();
});

describe("activation_aha first-reveal gate (wave18-03)", () => {
  it("Oracle A: diagnostic-first then MIXED_PRACTICE-with-explanation FIRES once, payload mode is the MIXED answer", async () => {
    const userId = await makeUser("a");
    userIds.push(userId);

    // First answer is a DIAGNOSTIC question (feedback withheld) — bumps the GLOBAL count but must NOT fire.
    const diag = await makeSession(userId, "DIAGNOSTIC");
    await answer(userId, diag, qExpl[0]);
    expect(await ahaCount(userId)).toBe(0);

    // Then a MIXED_PRACTICE question WITH an explanation → this is the user's first QUALIFYING answer.
    const mixed = await makeSession(userId, "MIXED_PRACTICE");
    await answer(userId, mixed, qExpl[1]);

    await vi.waitFor(async () => {
      expect(await ahaCount(userId)).toBe(1);
    });

    const evt = await prisma.analyticsEvent.findFirst({
      where: { userId, eventName: "activation_aha" },
    });
    const payload = JSON.parse(evt!.payloadJson!) as { mode: string };
    expect(payload.mode).toBe("MIXED_PRACTICE"); // the answer it fired on, NOT DIAGNOSTIC
  });

  it("Oracle B: MIXED_PRACTICE-with-explanation as the first answer FIRES once", async () => {
    const userId = await makeUser("b");
    userIds.push(userId);

    const mixed = await makeSession(userId, "MIXED_PRACTICE");
    await answer(userId, mixed, qExpl[0]);

    await vi.waitFor(async () => {
      expect(await ahaCount(userId)).toBe(1);
    });
  });

  it("Oracle C: further qualifying MIXED_PRACTICE answers NEVER double-count (fire-once)", async () => {
    const userId = await makeUser("c");
    userIds.push(userId);

    const mixed = await makeSession(userId, "MIXED_PRACTICE");
    await answer(userId, mixed, qExpl[0]);
    await vi.waitFor(async () => {
      expect(await ahaCount(userId)).toBe(1);
    });

    // Second and third qualifying answers — the count must stay pinned at 1.
    await answer(userId, mixed, qExpl[1]);
    await answer(userId, mixed, qExpl[2]);
    // Give any (incorrect) second fire time to land before asserting it did NOT.
    await new Promise((r) => setTimeout(r, 150));
    expect(await ahaCount(userId)).toBe(1);
  });

  it("Oracle D: a first qualifying-mode answer with NO explanation does not fire; a later explained answer does", async () => {
    const userId = await makeUser("d");
    userIds.push(userId);

    const mixed = await makeSession(userId, "MIXED_PRACTICE");
    // First MIXED answer is to a question WITHOUT an explanation → outer guard fails → no fire.
    await answer(userId, mixed, qNoExpl);
    await new Promise((r) => setTimeout(r, 150));
    expect(await ahaCount(userId)).toBe(0);

    // A later MIXED answer WITH an explanation is the first qualifying answer → fires.
    await answer(userId, mixed, qExpl[0]);
    await vi.waitFor(async () => {
      expect(await ahaCount(userId)).toBe(1);
    });
  });
});
