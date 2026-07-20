import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import {
  startSession,
  submitAnswer,
  finishSession,
  getSessionState,
} from "@/lib/server/test-engine";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";

// wave15-09 — integration proof that a DIAGNOSTIC session WITHHOLDS per-item correctness until finish
// (spec §D / 03-learning-regimes §6 "exam/diagnostic withhold until finish"), exercising the REAL
// server fns (startSession → submitAnswer → finishSession → getSessionState). The single
// `showsImmediateFeedback` predicate gates the response shape, so DIAGNOSTIC rides the SAME withheld
// branch the exam uses — no forked write path. A QUICK session is the contrast guard: the other new
// modes still reveal immediately. Fresh throwaway OFFICIAL fixtures own their own (zero-ReviewState) user.

let diagFix: OfficialQuestionFixture; // DIAGNOSTIC: fresh user, 15 published questions
let quickFix: OfficialQuestionFixture; // contrast: a QUICK session reveals immediately

async function correctOptionId(questionId: string): Promise<string> {
  const q = await prisma.question.findUnique({
    where: { id: questionId },
    include: { options: true },
  });
  return q!.options.find((o) => o.isCorrect)!.id;
}

beforeAll(async () => {
  diagFix = await createOfficialQuestion(prisma, { label: "diag-withhold", count: 15 });
  quickFix = await createOfficialQuestion(prisma, { label: "diag-quick", count: 12 });
});

afterAll(async () => {
  await diagFix.cleanup();
  await quickFix.cleanup();
  await prisma.$disconnect();
});

describe("DIAGNOSTIC withholds correctness until finish (wave15-09)", () => {
  it("submitAnswer response carries NO isCorrect/correctOptionId, seeds ReviewState, one ReviewLog per answer (a,b,c)", async () => {
    const userId = diagFix.userId!;

    // (b) precondition: this fresh fixture user has ZERO ReviewState rows before answering.
    expect(await prisma.reviewState.count({ where: { userId } })).toBe(0);

    const sessionId = await startSession({
      userId,
      mode: "DIAGNOSTIC",
      categoryId: diagFix.categoryId,
    });

    const sessionQuestions = await prisma.testSessionQuestion.findMany({
      where: { testSessionId: sessionId },
      orderBy: { displayOrder: "asc" },
      select: { questionId: true },
    });
    const answeredIds = sessionQuestions.slice(0, 3).map((r) => r.questionId);
    expect(answeredIds.length).toBe(3);

    for (const questionId of answeredIds) {
      const res = await submitAnswer({
        sessionId,
        userId,
        questionId,
        selectedOptionId: await correctOptionId(questionId),
      });
      // (a) withheld shape — { recorded: true } ONLY. No answer-key leak pre-finish.
      expect(res).toEqual({ recorded: true });
      expect("isCorrect" in res).toBe(false);
      expect("correctOptionId" in res).toBe(false);
      expect("explanation" in res).toBe(false);
    }

    // (b) first-seed: ReviewState now exists for EXACTLY the answered questionIds (normal submit path).
    const states = await prisma.reviewState.findMany({
      where: { userId },
      select: { questionId: true },
    });
    expect(new Set(states.map((s) => s.questionId))).toEqual(new Set(answeredIds));

    // (c) exactly one ReviewLog per answer — no duplicated/forked FSRS write.
    for (const questionId of answeredIds) {
      expect(await prisma.reviewLog.count({ where: { userId, questionId } })).toBe(1);
    }
  });

  it("getSessionState leaks NO per-option correctness for an IN_PROGRESS diagnostic (req 3)", async () => {
    const userId = diagFix.userId!;
    // Reuse the session started above (still IN_PROGRESS — never finished in the prior case).
    const session = await prisma.testSession.findFirst({
      where: { userId, mode: "DIAGNOSTIC", status: "IN_PROGRESS" },
      select: { id: true },
    });
    const state = await getSessionState(session!.id, userId);
    expect(state).not.toBeNull();
    expect(state!.status).toBe("IN_PROGRESS");
    // Every option's isCorrect is undefined and every explanation null while in progress — the payload
    // is correctness-free for ALL modes (reveal = COMPLETED only), so a diagnostic can't be peeked.
    for (const q of state!.questions) {
      for (const o of q.options) expect(o.isCorrect).toBeUndefined();
      expect(q.explanation).toBeNull();
    }
  });

  it("finishSession returns totals and marks the diagnostic COMPLETED (d)", async () => {
    const userId = diagFix.userId!;
    const session = await prisma.testSession.findFirst({
      where: { userId, mode: "DIAGNOSTIC", status: "IN_PROGRESS" },
      select: { id: true },
    });
    const summary = await finishSession(session!.id, userId);
    expect(summary.mode).toBe("DIAGNOSTIC");
    expect(summary.correct).toBe(3); // three correct answers submitted above
    expect(summary.total).toBe(summary.correct + summary.wrong);
    const after = await prisma.testSession.findUnique({ where: { id: session!.id } });
    expect(after!.status).toBe("COMPLETED");
  });

  it("contrast: a QUICK session's submitAnswer DOES reveal isCorrect (e)", async () => {
    const userId = quickFix.userId!;
    const sessionId = await startSession({
      userId,
      mode: "QUICK",
      categoryId: quickFix.categoryId,
    });
    const first = await prisma.testSessionQuestion.findFirst({
      where: { testSessionId: sessionId },
      orderBy: { displayOrder: "asc" },
      select: { questionId: true },
    });
    const res = await submitAnswer({
      sessionId,
      userId,
      questionId: first!.questionId,
      selectedOptionId: await correctOptionId(first!.questionId),
    });
    // Immediate reveal for the other new modes is unchanged.
    expect("isCorrect" in res).toBe(true);
    expect((res as { isCorrect: boolean }).isCorrect).toBe(true);
  });
});
