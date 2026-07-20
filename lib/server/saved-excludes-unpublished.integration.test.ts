import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { startSession } from "@/lib/server/test-engine";

// Spec A, case 3: a SAVED_QUESTIONS session must exclude questions that were later UNPUBLISHED or
// ARCHIVED, even though their SavedQuestion rows still exist. startSession's SAVED branch filters the
// pool by `isActive && isPublished && archivedAt === null` (lib/server/test-engine.ts). SAVED is keyed
// by the user's SavedQuestion rows (not category-scoped), so the three throwaway questions can live
// under the seeded Category "B". A throwaway user is deleted afterwards (cascades clean up children);
// the throwaway Questions/Topic are then removed so the seeded DB is unchanged.

let userId: string;
let topicId: string;
let qOkId: string;
let qUnpubId: string;
let qArchId: string;

beforeAll(async () => {
  const seeded = await prisma.category.findFirstOrThrow({ where: { code: "B" } });

  const topic = await prisma.topic.create({
    data: { title: `wave4-saved-${Date.now()}`, isActive: true },
  });
  topicId = topic.id;

  const makeQuestion = async (text: string) => {
    const q = await prisma.question.create({
      data: {
        text,
        topicId: topic.id,
        difficulty: 1,
        // Official (isDemo=false) fixture — a normal published row the live pool serves; this
        // suite exercises unpublished/archived exclusion from SAVED, not content sourcing.
        sourceType: "OFFICIAL",
        isDemo: false,
        isActive: true,
        isPublished: true,
        categories: { connect: { id: seeded.id } },
        options: {
          create: [
            { text: "right", isCorrect: true, displayOrder: 0 },
            { text: "wrong", isCorrect: false, displayOrder: 1 },
          ],
        },
      },
    });
    return q.id;
  };

  qOkId = await makeQuestion("wave4 saved Q_OK (stays published)");
  qUnpubId = await makeQuestion("wave4 saved Q_UNPUB (later unpublished)");
  qArchId = await makeQuestion("wave4 saved Q_ARCH (later archived)");

  const u = await prisma.user.create({
    data: {
      name: "Saved Exclusion Test",
      email: `saved-excludes-${Date.now()}@test.local`,
      passwordHash: "x",
      role: "USER",
      selectedCategoryId: seeded.id,
    },
  });
  userId = u.id;

  // The user saves ALL THREE while they are still published/active.
  for (const questionId of [qOkId, qUnpubId, qArchId]) {
    await prisma.savedQuestion.create({ data: { userId, questionId } });
  }
});

afterAll(async () => {
  // User first: cascades TestSession→TestSessionQuestion/TestAnswer + SavedQuestion (non-cascade or
  // back-referencing FKs to Question), freeing the throwaway Questions to be deleted.
  await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  await prisma.question.deleteMany({ where: { topicId } }).catch(() => undefined);
  await prisma.topic.delete({ where: { id: topicId } }).catch(() => undefined);
  await prisma.$disconnect();
});

describe("SAVED_QUESTIONS excludes unpublished/archived saved questions", () => {
  it("keeps a still-published saved question but drops the unpublished and archived ones", async () => {
    // After saving, two of the three saved questions leave the eligible pool.
    await prisma.question.update({ where: { id: qUnpubId }, data: { isPublished: false } });
    await prisma.question.update({ where: { id: qArchId }, data: { archivedAt: new Date() } });

    const sessionId = await startSession({ userId, mode: "SAVED_QUESTIONS", categoryId: null });

    const session = await prisma.testSession.findUnique({ where: { id: sessionId } });
    // Only Q_OK survives the filter, so the session is short-but-complete.
    expect(session?.totalQuestions).toBe(1);

    const sqs = await prisma.testSessionQuestion.findMany({
      where: { testSessionId: sessionId },
    });
    const pooledIds = sqs.map((sq) => sq.questionId);
    expect(pooledIds).toContain(qOkId);
    expect(pooledIds).not.toContain(qUnpubId);
    expect(pooledIds).not.toContain(qArchId);

    // Guard against passing for the wrong reason: unpublish/archive must NOT delete the save rows —
    // all three SavedQuestion rows still exist; they are merely filtered out of the eligible pool.
    const savedCount = await prisma.savedQuestion.count({ where: { userId } });
    expect(savedCount).toBe(3);
  });
});
