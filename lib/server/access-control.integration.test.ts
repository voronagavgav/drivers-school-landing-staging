import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/db";
import {
  startSession,
  submitAnswer,
  finishSession,
  getSessionState,
  NoQuestionsError,
} from "@/lib/server/test-engine";
import { createQuestion } from "@/app/admin/actions";
import { getCurrentUser } from "@/lib/auth";

// Access-control proofs (spec D) against the real seeded SQLite DB (test:integration config,
// which stubs `server-only`). Three concerns:
//   1. IDOR — a user can neither read nor mutate another user's session.
//   2. Engine gating — unpublished/archived questions never enter a started session's pool,
//      including SAVED_QUESTIONS (a saved-then-unpublished question must be excluded).
//   3. RBAC — admin mutations reject a non-admin (USER) principal server-side.
// Throwaway users/questions/category are removed in afterAll so the seeded DB stays clean.

// The RBAC test drives requireContentManager() through a mocked auth boundary so it sees a
// USER-role principal (we never drive real cookies in the node test runtime).
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getCurrentUser: vi.fn() };
});

let categoryId: string;
let userAId: string;
let userBId: string;
let throwawayCategoryId: string;
const throwawayQuestionIds: string[] = [];
const extraCategoryIds: string[] = [];

async function makeQuestion(opts: {
  categoryId?: string;
  isPublished?: boolean;
  isActive?: boolean;
  archivedAt?: Date | null;
}): Promise<string> {
  const q = await prisma.question.create({
    data: {
      text: `AC test question ${throwawayQuestionIds.length}-${Date.now()}`,
      // Official (isDemo=false) stand-in: this suite tests isActive/isPublished/archivedAt gating,
      // so the question must be a normal published OFFICIAL row included in the live pool.
      isDemo: false,
      sourceType: "OFFICIAL",
      isPublished: opts.isPublished ?? true,
      isActive: opts.isActive ?? true,
      archivedAt: opts.archivedAt ?? null,
      categories: opts.categoryId ? { connect: { id: opts.categoryId } } : undefined,
      options: {
        create: [
          { text: "right", isCorrect: true, displayOrder: 0 },
          { text: "wrong", isCorrect: false, displayOrder: 1 },
        ],
      },
    },
  });
  throwawayQuestionIds.push(q.id);
  return q.id;
}

beforeAll(async () => {
  const cat = await prisma.category.findFirstOrThrow({ where: { code: "B" } });
  categoryId = cat.id;
  const stamp = Date.now();
  const a = await prisma.user.create({
    data: {
      name: "AC User A",
      email: `ac-a-${stamp}@test.local`,
      passwordHash: "x",
      role: "USER",
      selectedCategoryId: categoryId,
    },
  });
  const b = await prisma.user.create({
    data: {
      name: "AC User B",
      email: `ac-b-${stamp}@test.local`,
      passwordHash: "x",
      role: "USER",
      selectedCategoryId: categoryId,
    },
  });
  userAId = a.id;
  userBId = b.id;
  const tcat = await prisma.category.create({
    data: { code: `ACX${stamp}`, title: "AC throwaway category" },
  });
  throwawayCategoryId = tcat.id;
});

afterAll(async () => {
  // Delete users first so their sessions/saved/answers cascade away, freeing the throwaway
  // questions to be deleted (TestSessionQuestion → Question is not a cascade).
  await prisma.user.delete({ where: { id: userAId } }).catch(() => undefined);
  await prisma.user.delete({ where: { id: userBId } }).catch(() => undefined);
  for (const id of throwawayQuestionIds) {
    await prisma.question.delete({ where: { id } }).catch(() => undefined);
  }
  await prisma.category.delete({ where: { id: throwawayCategoryId } }).catch(() => undefined);
  for (const id of extraCategoryIds) {
    await prisma.category.delete({ where: { id } }).catch(() => undefined);
  }
  await prisma.$disconnect();
});

describe("IDOR — a user cannot read or mutate another user's session", () => {
  let sessionBId: string;
  let questionBId: string;

  beforeAll(async () => {
    // Give this block its own throwaway category with one OFFICIAL question so MIXED_PRACTICE has a
    // deterministic non-empty pool, isolated from the shared seeded content. Cleaned up by the
    // top-level afterAll.
    const idorCat = await prisma.category.create({
      data: { code: `ACI${Date.now()}`, title: "AC IDOR category" },
    });
    extraCategoryIds.push(idorCat.id);
    await makeQuestion({ categoryId: idorCat.id });
    sessionBId = await startSession({ userId: userBId, mode: "MIXED_PRACTICE", categoryId: idorCat.id });
    const sq = await prisma.testSessionQuestion.findFirstOrThrow({
      where: { testSessionId: sessionBId },
    });
    questionBId = sq.questionId;
  });

  it("getSessionState returns null for a foreign caller but the owner can read it", async () => {
    expect(await getSessionState(sessionBId, userAId)).toBeNull();
    const owner = await getSessionState(sessionBId, userBId);
    expect(owner?.id).toBe(sessionBId);
  });

  it("submitAnswer for a session the caller does not own throws INVALID_SESSION", async () => {
    await expect(
      submitAnswer({
        sessionId: sessionBId,
        userId: userAId,
        questionId: questionBId,
        selectedOptionId: null,
      }),
    ).rejects.toThrow("INVALID_SESSION");
  });

  it("finishSession for a session the caller does not own throws INVALID_SESSION", async () => {
    await expect(finishSession(sessionBId, userAId)).rejects.toThrow("INVALID_SESSION");
  });
});

describe("engine gating — unpublished/archived/inactive questions never enter a started session pool", () => {
  it("excludes an unpublished question from a non-saved pool, includes it once published", async () => {
    const qId = await makeQuestion({ categoryId: throwawayCategoryId, isPublished: false });
    // The throwaway category's only question is unpublished → empty pool → NoQuestionsError.
    await expect(
      startSession({ userId: userAId, mode: "MIXED_PRACTICE", categoryId: throwawayCategoryId }),
    ).rejects.toThrow(NoQuestionsError);

    await prisma.question.update({ where: { id: qId }, data: { isPublished: true } });
    const sessionId = await startSession({
      userId: userAId,
      mode: "MIXED_PRACTICE",
      categoryId: throwawayCategoryId,
    });
    const sqs = await prisma.testSessionQuestion.findMany({
      where: { testSessionId: sessionId },
    });
    expect(sqs.map((s) => s.questionId)).toEqual([qId]);
  });

  it("excludes inactive and archived questions from a non-saved pool", async () => {
    const cat = await prisma.category.create({
      data: { code: `ACG${Date.now()}`, title: "AC gating category" },
    });
    extraCategoryIds.push(cat.id);
    const liveId = await makeQuestion({ categoryId: cat.id });
    // Same category, each disqualified a different (non-publish) way — neither may enter the pool.
    await makeQuestion({ categoryId: cat.id, isActive: false });
    await makeQuestion({ categoryId: cat.id, archivedAt: new Date() });

    const sessionId = await startSession({
      userId: userAId,
      mode: "MIXED_PRACTICE",
      categoryId: cat.id,
    });
    const ids = (
      await prisma.testSessionQuestion.findMany({ where: { testSessionId: sessionId } })
    ).map((s) => s.questionId);
    expect(ids).toEqual([liveId]);
  });

  it("excludes a saved-then-unpublished, -archived, or -deactivated question from a SAVED_QUESTIONS pool", async () => {
    const keepId = await makeQuestion({ isPublished: true });
    const unpubId = await makeQuestion({ isPublished: true });
    const archId = await makeQuestion({ isPublished: true });
    const inactiveId = await makeQuestion({ isPublished: true });
    for (const questionId of [keepId, unpubId, archId, inactiveId]) {
      await prisma.savedQuestion.create({ data: { userId: userAId, questionId } });
    }
    // Each disqualified AFTER it was saved — none may leak back into the pool.
    await prisma.question.update({ where: { id: unpubId }, data: { isPublished: false } });
    await prisma.question.update({ where: { id: archId }, data: { archivedAt: new Date() } });
    await prisma.question.update({ where: { id: inactiveId }, data: { isActive: false } });

    const sessionId = await startSession({
      userId: userAId,
      mode: "SAVED_QUESTIONS",
      categoryId: null,
    });
    const ids = (
      await prisma.testSessionQuestion.findMany({ where: { testSessionId: sessionId } })
    ).map((s) => s.questionId);
    expect(ids).toContain(keepId);
    expect(ids).not.toContain(unpubId);
    expect(ids).not.toContain(archId);
    expect(ids).not.toContain(inactiveId);
  });
});

describe("RBAC — admin mutations reject a non-admin principal server-side", () => {
  it("createQuestion rejects a USER-role caller and performs no write", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: userAId,
      role: "USER",
    } as unknown as Awaited<ReturnType<typeof getCurrentUser>>);

    const before = await prisma.question.count();
    // requireContentManager() redirects (throws) a USER caller before any DB write.
    await expect(createQuestion({}, new FormData())).rejects.toThrow();
    const after = await prisma.question.count();
    expect(after).toBe(before);
  });
});
