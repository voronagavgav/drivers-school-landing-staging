import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { startSession, submitAnswer, finishSession } from "@/lib/server/test-engine";
import { DEFAULT_EXAM_QUESTION_COUNT } from "@/lib/constants";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";

// Spec A, case 1: an EXAM_SIMULATION whose published pool has FEWER questions than
// DEFAULT_EXAM_QUESTION_COUNT runs SHORT but still completes with a result. To pin the pool to
// exactly N regardless of seed size, attach the N throwaway OFFICIAL questions to a DEDICATED
// throwaway Category (via the shared createOfficialQuestion helper) and scope the exam to it. The
// fixture's FK-safe cleanup removes the throwaway user/Questions/Topic/Category afterwards so the
// seeded DB is unchanged.

const N = 5; // strictly less than DEFAULT_EXAM_QUESTION_COUNT (=20)

let fixture: OfficialQuestionFixture;
let userId: string;
let categoryId: string; // dedicated throwaway category scoping the exam pool

beforeAll(async () => {
  fixture = await createOfficialQuestion(prisma, { label: "short-pool", count: N });
  userId = fixture.userId!;
  categoryId = fixture.categoryId;
});

afterAll(async () => {
  await fixture.cleanup();
  await prisma.$disconnect();
});

describe("exam simulation with a short published pool", () => {
  it("runs SHORT (totalQuestions === N) but completes with a result", async () => {
    expect(N).toBeLessThan(DEFAULT_EXAM_QUESTION_COUNT);

    const sessionId = await startSession({ userId, mode: "EXAM_SIMULATION", categoryId });

    const started = await prisma.testSession.findUnique({ where: { id: sessionId } });
    expect(started?.totalQuestions).toBe(N);

    const queued = await prisma.testSessionQuestion.count({ where: { testSessionId: sessionId } });
    expect(queued).toBe(N);

    const sqs = await prisma.testSessionQuestion.findMany({
      where: { testSessionId: sessionId },
      orderBy: { displayOrder: "asc" },
      include: { question: { include: { options: true } } },
    });
    expect(sqs.length).toBe(N);

    for (const sq of sqs) {
      const correct = sq.question.options.find((o) => o.isCorrect)!;
      await submitAnswer({ sessionId, userId, questionId: sq.questionId, selectedOptionId: correct.id });
    }

    const res = await finishSession(sessionId, userId);
    expect(res.total).toBe(N);
    expect(res.correct + res.wrong).toBe(N);
    expect(["PASSED", "FAILED"]).toContain(res.result);

    const session = await prisma.testSession.findUnique({ where: { id: sessionId } });
    expect(session?.status).toBe("COMPLETED");
    expect((session?.correctAnswers ?? 0) + (session?.wrongAnswers ?? 0)).toBe(N);
  });
});
