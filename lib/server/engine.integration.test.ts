import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { startSession, submitAnswer, finishSession } from "@/lib/server/test-engine";
import { computeProgress } from "@/lib/server/progress";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";

// End-to-end against the real seeded SQLite DB: create session → answer → finish → mistakes →
// progress. This suite provisions its OWN throwaway category of OFFICIAL (isDemo=false)
// questions for a deterministic pool isolated from the shared seeded content (see the shared
// createOfficialQuestion helper). The fixture's FK-safe cleanup tears it down afterwards (user
// first so its session children cascade and free the questions).

let fixture: OfficialQuestionFixture;
let userId: string;
let categoryId: string;

beforeAll(async () => {
  // A handful of official questions so EXAM_SIMULATION/MISTAKE_PRACTICE have a real pool.
  fixture = await createOfficialQuestion(prisma, { label: "engine", count: 8 });
  userId = fixture.userId!;
  categoryId = fixture.categoryId;
});

afterAll(async () => {
  await fixture.cleanup();
  await prisma.$disconnect();
});

describe("exam simulation end-to-end", () => {
  it("creates a session, records answers, computes result, tracks mistakes, updates progress", async () => {
    const sessionId = await startSession({ userId, mode: "EXAM_SIMULATION", categoryId });

    const sqs = await prisma.testSessionQuestion.findMany({
      where: { testSessionId: sessionId },
      orderBy: { displayOrder: "asc" },
      include: { question: { include: { options: true } } },
    });
    expect(sqs.length).toBeGreaterThan(0);

    // Answer even-indexed correctly, odd-indexed wrong.
    let expectedCorrect = 0;
    sqs.forEach((sq, i) => {
      if (i % 2 === 0) expectedCorrect++;
    });
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

    const res = await finishSession(sessionId, userId);
    expect(res.total).toBe(sqs.length);
    expect(res.correct).toBe(expectedCorrect);
    expect(res.correct + res.wrong).toBe(sqs.length);
    expect(["PASSED", "FAILED"]).toContain(res.result);

    const session = await prisma.testSession.findUnique({ where: { id: sessionId } });
    expect(session?.status).toBe("COMPLETED");
    expect(session?.correctAnswers).toBe(expectedCorrect);

    // wrong answers produced mistakes
    const activeMistakes = await prisma.userMistake.count({ where: { userId, status: "ACTIVE" } });
    expect(activeMistakes).toBe(sqs.length - expectedCorrect);

    // progress reflects real data
    const progress = await computeProgress(userId, categoryId);
    expect(progress.totalAnswered).toBe(sqs.length);
    expect(progress.uniqueAnswered).toBe(sqs.length);
    expect(progress.correct).toBe(expectedCorrect);
    expect(progress.completedSessions).toBe(1);
    expect(progress.recentExam.total).toBe(1);
  });
});

describe("mistake practice resolves mistakes after repeated correct answers", () => {
  it("answering active mistakes correctly twice resolves them", async () => {
    const before = await prisma.userMistake.count({ where: { userId, status: "ACTIVE" } });
    expect(before).toBeGreaterThan(0);

    // Two rounds of mistake practice, all correct → each mistake gets 2 correct repeats → RESOLVED.
    for (let round = 0; round < 2; round++) {
      const sid = await startSession({ userId, mode: "MISTAKE_PRACTICE", categoryId });
      const sqs = await prisma.testSessionQuestion.findMany({
        where: { testSessionId: sid },
        include: { question: { include: { options: true } } },
      });
      for (const sq of sqs) {
        const correct = sq.question.options.find((o) => o.isCorrect)!;
        await submitAnswer({ sessionId: sid, userId, questionId: sq.questionId, selectedOptionId: correct.id });
      }
      await finishSession(sid, userId);
    }

    const stillActive = await prisma.userMistake.count({ where: { userId, status: "ACTIVE" } });
    const resolved = await prisma.userMistake.count({ where: { userId, status: "RESOLVED" } });
    expect(resolved).toBeGreaterThan(0);
    expect(stillActive).toBeLessThan(before);
  });
});
