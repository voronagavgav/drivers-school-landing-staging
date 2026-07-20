import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/db";
import { startSession, submitAnswer, finishSession } from "@/lib/server/test-engine";
import { extendSession } from "@/lib/server/study";
import { extendSessionAction } from "@/app/actions/test";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";
import { getCurrentUser } from "@/lib/auth";
import { MARATHON_PAGE } from "@/lib/constants";

// wave15-08 — integration proof for MARATHON paging: `extendSessionAction` (the REAL production action)
// appends the next page to an IN_PROGRESS marathon session, returning ONLY the newly appended items in
// TestRunner's `questions` prop shape (the frozen client contract wave15-11 consumes). Self-provisions
// throwaway OFFICIAL fixtures; asserts counts / distinct-set / displayOrder continuation, plus the
// exhaustion end-state and the owner / mode / status guards.
//
// The action calls `requireUser()` → `getCurrentUser()`; we never mint cookies in the node runtime, so
// mock the auth read to the fixture principal.
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getCurrentUser: vi.fn() };
});

let extendFix: OfficialQuestionFixture; // (a)/(b) — 30 published, chained start → extend → extend
let answerFix: OfficialQuestionFixture; // (c) — 30 published, answer 5 before extending
let quickFix: OfficialQuestionFixture; // (4b) — a non-MARATHON session
let otherFix: OfficialQuestionFixture; // (4a) — a different owner

async function sessionQuestionIds(sessionId: string): Promise<string[]> {
  const rows = await prisma.testSessionQuestion.findMany({
    where: { testSessionId: sessionId },
    select: { questionId: true },
  });
  return rows.map((r) => r.questionId);
}

function mockAuth(userId: string, categoryId: string | null) {
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: userId,
    role: "USER",
    selectedCategoryId: categoryId,
  } as unknown as Awaited<ReturnType<typeof getCurrentUser>>);
}

beforeAll(async () => {
  extendFix = await createOfficialQuestion(prisma, { label: "mx-extend", count: 30 });
  answerFix = await createOfficialQuestion(prisma, { label: "mx-answer", count: 30 });
  quickFix = await createOfficialQuestion(prisma, { label: "mx-quick", count: 12 });
  otherFix = await createOfficialQuestion(prisma, { label: "mx-other", count: 5 });
});

afterAll(async () => {
  await extendFix.cleanup();
  await answerFix.cleanup();
  await quickFix.cleanup();
  await otherFix.cleanup();
  await prisma.$disconnect();
});

describe("MARATHON extendSession paging (wave15-08)", () => {
  it("extendSessionAction appends a page: {added:10,total:30}, 30 distinct rows, orders 20..29 (a)", async () => {
    const sessionId = await startSession({
      userId: extendFix.userId!,
      mode: "MARATHON",
      categoryId: extendFix.categoryId,
    });
    const firstPage = await sessionQuestionIds(sessionId);
    expect(firstPage.length).toBe(MARATHON_PAGE); // 20

    mockAuth(extendFix.userId!, extendFix.categoryId);
    const res = await extendSessionAction({ sessionId });
    expect(res.added).toBe(10);
    expect(res.total).toBe(30);
    expect(res.questions.length).toBe(res.added); // added === questions.length

    // Each returned object carries an id + options (the RunnerQuestion contract).
    for (const q of res.questions) {
      expect(typeof q.questionId).toBe("string");
      expect(q.questionId.length).toBeGreaterThan(0);
      expect(q.options.length).toBeGreaterThanOrEqual(1);
      expect(q.answered).toBe(false);
    }

    // Session now holds 30 rows with 30 DISTINCT question ids.
    const all = await sessionQuestionIds(sessionId);
    expect(all.length).toBe(30);
    expect(new Set(all).size).toBe(30);

    // Appended rows continue displayOrder from the current max: 20..29, and are exactly the returned ids.
    const appended = await prisma.testSessionQuestion.findMany({
      where: { testSessionId: sessionId, displayOrder: { gte: MARATHON_PAGE } },
      orderBy: { displayOrder: "asc" },
      select: { questionId: true, displayOrder: true },
    });
    expect(appended.map((r) => r.displayOrder)).toEqual([20, 21, 22, 23, 24, 25, 26, 27, 28, 29]);
    expect(appended.map((r) => r.questionId)).toEqual(res.questions.map((q) => q.questionId));

    // The session's totalQuestions was bumped.
    const session = await prisma.testSession.findUnique({ where: { id: sessionId } });
    expect(session!.totalQuestions).toBe(30);

    // (b) A second extend exhausts the pool: {added:0,total:30}, no throw, row count unchanged.
    const res2 = await extendSessionAction({ sessionId });
    expect(res2.added).toBe(0);
    expect(res2.total).toBe(30);
    expect(res2.questions).toEqual([]);
    const after = await sessionQuestionIds(sessionId);
    expect(after.length).toBe(30);
  });

  it("already-in-session ids (answered or not) are excluded from the appended page (c)", async () => {
    const sessionId = await startSession({
      userId: answerFix.userId!,
      mode: "MARATHON",
      categoryId: answerFix.categoryId,
    });
    const firstPage = await sessionQuestionIds(sessionId);

    // Answer the first 5 questions through the real submit path BEFORE extending.
    const answeredIds = firstPage.slice(0, 5);
    for (const questionId of answeredIds) {
      const q = await prisma.question.findUnique({
        where: { id: questionId },
        include: { options: true },
      });
      const correctOptionId = q!.options.find((o) => o.isCorrect)!.id;
      await submitAnswer({
        sessionId,
        userId: answerFix.userId!,
        questionId,
        selectedOptionId: correctOptionId,
      });
    }

    mockAuth(answerFix.userId!, answerFix.categoryId);
    const res = await extendSessionAction({ sessionId });
    expect(res.added).toBe(10);

    const appendedIds = new Set(res.questions.map((q) => q.questionId));
    // None of the answered ids — nor any already-in-session id — reappears among the appended items.
    for (const id of answeredIds) expect(appendedIds.has(id)).toBe(false);
    for (const id of firstPage) expect(appendedIds.has(id)).toBe(false);
  });

  it("rejects a session owned by another user (4a)", async () => {
    const sessionId = await startSession({
      userId: extendFix.userId!,
      mode: "MARATHON",
      categoryId: extendFix.categoryId,
    });
    await expect(extendSession(sessionId, otherFix.userId!)).rejects.toThrow();
  });

  it("rejects a non-MARATHON session (4b)", async () => {
    const sessionId = await startSession({
      userId: quickFix.userId!,
      mode: "QUICK",
      categoryId: quickFix.categoryId,
    });
    await expect(extendSession(sessionId, quickFix.userId!)).rejects.toThrow();
  });

  it("rejects a non-IN_PROGRESS (finished) session (4c)", async () => {
    const sessionId = await startSession({
      userId: quickFix.userId!,
      mode: "MARATHON",
      categoryId: quickFix.categoryId,
    });
    await finishSession(sessionId, quickFix.userId!);
    await expect(extendSession(sessionId, quickFix.userId!)).rejects.toThrow();
  });
});
