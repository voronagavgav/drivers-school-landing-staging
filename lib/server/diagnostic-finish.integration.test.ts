import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/db";
import { submitAnswer, finishSession, getSessionState } from "@/lib/server/test-engine";
import { startDiagnostic } from "@/lib/server/study";
import { weakestTopicFromAnswers } from "@/lib/test-engine/diagnostic";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";

// DIAGNOSTIC finish reveal (spec §D) against the real seeded SQLite DB. Provisions a throwaway
// category with TWO topics of OFFICIAL (isDemo=false) questions — topic X answered ALL WRONG, topic
// Y answered ALL CORRECT — so the diagnostic's own persisted answers make X strictly the weakest.
// Proves, after the real finishSession: (1) weakestTopicFromAnswers over the persisted TestAnswer
// rows returns topic X's id; (2) exactly one AnalyticsEvent "diagnostic_completed" exists for the
// user; (3) a repeat (idempotent) finish leaves that count at 1.
//
// Two fixtures share one category/user: X owns the category + user (+ topic X), Y attaches to X's
// category with no user of its own (+ topic Y). Teardown deletes the user FIRST (cascading its
// session/answers so the questions are FK-free), then Y's rows, then X's rows + the category.

let fixtureX: OfficialQuestionFixture;
let fixtureY: OfficialQuestionFixture;
let userId: string;
let categoryId: string;
let topicX: string;
let topicY: string;

beforeAll(async () => {
  fixtureX = await createOfficialQuestion(prisma, { label: "diag-x", count: 3 });
  userId = fixtureX.userId!;
  categoryId = fixtureX.categoryId;
  topicX = fixtureX.topicId!;

  fixtureY = await createOfficialQuestion(prisma, {
    label: "diag-y",
    count: 3,
    categoryId,
    withUser: false,
  });
  topicY = fixtureY.topicId!;
});

afterAll(async () => {
  await prisma.analyticsEvent.deleteMany({ where: { userId } }).catch(() => undefined);
  await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  await fixtureY.cleanup();
  await fixtureX.cleanup();
  await prisma.$disconnect();
});

describe("DIAGNOSTIC finish reveal", () => {
  it("names the weakest topic from its own answers and fires diagnostic_completed exactly once", async () => {
    const sessionId = await startDiagnostic(userId, categoryId);

    const sqs = await prisma.testSessionQuestion.findMany({
      where: { testSessionId: sessionId },
      orderBy: { displayOrder: "asc" },
      include: { question: { include: { options: true } } },
    });
    // The throwaway category has no blueprint → fallback shuffle capped at DIAGNOSTIC_COUNT (15),
    // so all 6 questions (3 per topic) enter the session.
    expect(sqs.length).toBe(6);

    // Answer topic X ALL WRONG and topic Y ALL CORRECT via chosen optionIds.
    for (const sq of sqs) {
      const correct = sq.question.options.find((o) => o.isCorrect)!;
      const wrong = sq.question.options.find((o) => !o.isCorrect) ?? correct;
      const selectedOptionId = sq.question.topicId === topicX ? wrong.id : correct.id;
      await submitAnswer({ sessionId, userId, questionId: sq.questionId, selectedOptionId });
    }

    const first = await finishSession(sessionId, userId);
    expect(first.total).toBe(6);
    expect(first.mode).toBe("DIAGNOSTIC");

    // (1) The weakest topic through the PRODUCTION result-page path (wave15 review: asserting a
    // prisma re-derivation left the real mapping untested): getSessionState(...).questions shaped
    // exactly as app/(app)/test/[id]/result/page.tsx consumes it — the `q.answered && q.topicId`
    // filter and the `isCorrect === true` coercion included.
    const state = await getSessionState(sessionId, userId);
    expect(state).not.toBeNull();
    if (!state) throw new Error("unreachable: completed session must have state");
    const weakest = weakestTopicFromAnswers(
      state.questions.flatMap((q) =>
        q.answered && q.topicId ? [{ topicId: q.topicId, isCorrect: q.isCorrect === true }] : [],
      ),
    );
    expect(weakest).toBe(topicX);
    expect(weakest).not.toBe(topicY);
    // Completed session ⇒ the state REVEALS correctness (the withheld-in-progress counterpart is
    // asserted in practice-modes.integration.test.ts); the wrong-topic answers read back isCorrect=false.
    const answeredX = state.questions.filter((q) => q.topicId === topicX && q.answered);
    expect(answeredX.length).toBe(3);
    for (const q of answeredX) expect(q.isCorrect).toBe(false);

    // (2) exactly one diagnostic_completed event for the user. recordEvent is fire-and-forget
    // (void, outside any transaction — house rule), so poll until the write settles.
    await vi.waitFor(async () => {
      const n = await prisma.analyticsEvent.count({
        where: { userId, eventName: "diagnostic_completed" },
      });
      expect(n).toBe(1);
    });

    // (3) a repeat (idempotent) finish on the already-COMPLETED session does NOT re-emit.
    await finishSession(sessionId, userId);
    const countAfterSecond = await prisma.analyticsEvent.count({
      where: { userId, eventName: "diagnostic_completed" },
    });
    expect(countAfterSecond).toBe(1);
  });
});
