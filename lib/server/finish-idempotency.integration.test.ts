import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { startSession, submitAnswer, finishSession } from "@/lib/server/test-engine";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";

// Idempotency of finishSession against the real seeded SQLite DB (spec section F, AUDIT High):
// finishing an already-COMPLETED session must NOT duplicate the ProgressSnapshot or change the
// stored counts. This suite provisions its OWN throwaway category of OFFICIAL (isDemo=false)
// questions for a deterministic pool isolated from the shared seeded content (see the shared
// createOfficialQuestion helper). The fixture's FK-safe cleanup tears it down afterwards (user
// first so its session children cascade and free the questions).

let fixture: OfficialQuestionFixture;
let userId: string;
let categoryId: string;

beforeAll(async () => {
  fixture = await createOfficialQuestion(prisma, { label: "finish-idem", count: 8 });
  userId = fixture.userId!;
  categoryId = fixture.categoryId;
});

afterAll(async () => {
  await fixture.cleanup();
  await prisma.$disconnect();
});

describe("finishSession is idempotent", () => {
  it("finishing an already-completed session does not duplicate the snapshot or change counts", async () => {
    const sessionId = await startSession({ userId, mode: "EXAM_SIMULATION", categoryId });

    const sqs = await prisma.testSessionQuestion.findMany({
      where: { testSessionId: sessionId },
      orderBy: { displayOrder: "asc" },
      include: { question: { include: { options: true } } },
    });
    expect(sqs.length).toBeGreaterThan(0);

    // Answer even-indexed correctly, odd-indexed wrong.
    for (let i = 0; i < sqs.length; i++) {
      const sq = sqs[i];
      const correct = sq.question.options.find((o) => o.isCorrect)!;
      const wrong = sq.question.options.find((o) => !o.isCorrect) ?? correct;
      await submitAnswer({
        sessionId,
        userId,
        questionId: sq.questionId,
        selectedOptionId: i % 2 === 0 ? correct.id : wrong.id,
      });
    }

    // First finish: transitions the session and snapshots progress exactly once.
    const first = await finishSession(sessionId, userId);
    expect(first.total).toBe(sqs.length);

    const snapshotsAfterFirst = await prisma.progressSnapshot.count({ where: { userId } });
    const sessionAfterFirst = await prisma.testSession.findUniqueOrThrow({ where: { id: sessionId } });
    expect(sessionAfterFirst.status).toBe("COMPLETED");

    // Second finish on the already-COMPLETED session: must be a no-op.
    const second = await finishSession(sessionId, userId);
    expect(second.total).toBe(first.total);
    expect(second.correct).toBe(first.correct);
    expect(second.wrong).toBe(first.wrong);
    expect(second.result).toBe(first.result);

    // (a) snapshot row COUNT unchanged
    const snapshotsAfterSecond = await prisma.progressSnapshot.count({ where: { userId } });
    expect(snapshotsAfterSecond).toBe(snapshotsAfterFirst);

    // (b) stored correct/wrong/result unchanged
    const sessionAfterSecond = await prisma.testSession.findUniqueOrThrow({ where: { id: sessionId } });
    expect(sessionAfterSecond.correctAnswers).toBe(sessionAfterFirst.correctAnswers);
    expect(sessionAfterSecond.wrongAnswers).toBe(sessionAfterFirst.wrongAnswers);
    expect(sessionAfterSecond.result).toBe(sessionAfterFirst.result);
  });

  it("a session not owned by the user still throws INVALID_SESSION", async () => {
    const sessionId = await startSession({ userId, mode: "EXAM_SIMULATION", categoryId });
    await expect(finishSession(sessionId, "non-owner-user-id")).rejects.toThrow("INVALID_SESSION");
  });
});
