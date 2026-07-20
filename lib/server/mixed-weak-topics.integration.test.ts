import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { startSession, submitAnswer, finishSession } from "@/lib/server/test-engine";
import { computeWeakTopicIds } from "@/lib/server/progress";
import { WEAK_TOPIC_MIN_ANSWERS, DEFAULT_PRACTICE_QUESTION_COUNT } from "@/lib/constants";

// Spec A, case 2: MIXED_PRACTICE front-loads WEAK topics — every weak-topic question is ordered
// ahead of every strong-topic one (shuffled only WITHIN each band). To keep the band assertion
// deterministic regardless of seeded content, attach the two topics to a DEDICATED throwaway
// Category whose whole published pool is exactly WEAK + STRONG. A throwaway user is deleted
// afterwards (cascades clean up children); the throwaway Questions/Topics/Category are then removed
// so the seeded DB is unchanged.

const WEAK_N = WEAK_TOPIC_MIN_ANSWERS + 1; // 5 — comfortably ≥ the weak-detection minimum
const STRONG_N = WEAK_TOPIC_MIN_ANSWERS + 1; // 5 — total 10 ≤ DEFAULT_PRACTICE_QUESTION_COUNT (no slice)

let userId: string;
let categoryId: string; // dedicated throwaway category scoping the MIXED pool
let weakTopicId: string;
let strongTopicId: string;

async function createPublishedQuestion(text: string, topicId: string) {
  return prisma.question.create({
    data: {
      text,
      topicId,
      difficulty: 1,
      // Official (isDemo=false) fixture — a normal published row the live pool serves; this
      // suite exercises weak-topic selection, not content sourcing.
      sourceType: "OFFICIAL",
      isDemo: false,
      isActive: true,
      isPublished: true,
      categories: { connect: { id: categoryId } },
      options: {
        create: [
          { text: "right", isCorrect: true, displayOrder: 0 },
          { text: "wrong", isCorrect: false, displayOrder: 1 },
        ],
      },
    },
  });
}

// Drive a real TOPIC_PRACTICE session over one topic, answering every question correctly (when
// `correct`) or wrong — so the topic's accuracy lands above/below the weak threshold.
async function practiceTopic(topicId: string, correct: boolean) {
  const sessionId = await startSession({ userId, mode: "TOPIC_PRACTICE", categoryId, topicId });
  const sqs = await prisma.testSessionQuestion.findMany({
    where: { testSessionId: sessionId },
    include: { question: { include: { options: true } } },
  });
  for (const sq of sqs) {
    const right = sq.question.options.find((o) => o.isCorrect)!;
    const wrong = sq.question.options.find((o) => !o.isCorrect) ?? right;
    await submitAnswer({
      sessionId,
      userId,
      questionId: sq.questionId,
      selectedOptionId: correct ? right.id : wrong.id,
    });
  }
  await finishSession(sessionId, userId);
}

beforeAll(async () => {
  const seeded = await prisma.category.findFirstOrThrow({ where: { code: "B" } });

  const cat = await prisma.category.create({
    data: { code: `W4-${Date.now()}`, title: "Wave4 mixed weak-topics", isActive: true },
  });
  categoryId = cat.id;

  const weak = await prisma.topic.create({ data: { title: `wave4-weak-${Date.now()}`, isActive: true } });
  const strong = await prisma.topic.create({ data: { title: `wave4-strong-${Date.now()}`, isActive: true } });
  weakTopicId = weak.id;
  strongTopicId = strong.id;

  for (let i = 0; i < WEAK_N; i++) await createPublishedQuestion(`wave4 weak Q${i}`, weakTopicId);
  for (let i = 0; i < STRONG_N; i++) await createPublishedQuestion(`wave4 strong Q${i}`, strongTopicId);

  const u = await prisma.user.create({
    data: {
      name: "Mixed Weak-Topics Test",
      email: `mixed-weak-${Date.now()}@test.local`,
      passwordHash: "x",
      role: "USER",
      selectedCategoryId: categoryId,
    },
  });
  userId = u.id;
});

afterAll(async () => {
  // User first: cascades TestSession→TestSessionQuestion/TestAnswer (non-cascade FKs to Question),
  // freeing the throwaway Questions to be deleted.
  await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  await prisma.question.deleteMany({ where: { topicId: weakTopicId } }).catch(() => undefined);
  await prisma.question.deleteMany({ where: { topicId: strongTopicId } }).catch(() => undefined);
  await prisma.topic.delete({ where: { id: weakTopicId } }).catch(() => undefined);
  await prisma.topic.delete({ where: { id: strongTopicId } }).catch(() => undefined);
  await prisma.category.delete({ where: { id: categoryId } }).catch(() => undefined);
  await prisma.$disconnect();
});

describe("MIXED_PRACTICE prioritises weak topics", () => {
  it("detects the weak topic, then front-loads its questions ahead of the strong topic", async () => {
    expect(WEAK_N + STRONG_N).toBeLessThanOrEqual(DEFAULT_PRACTICE_QUESTION_COUNT);

    // Make WEAK actually weak (all wrong → 0% accuracy) and STRONG strong (all correct → 100%).
    await practiceTopic(weakTopicId, false);
    await practiceTopic(strongTopicId, true);

    const weakIds = await computeWeakTopicIds(userId, categoryId);
    expect(weakIds).toContain(weakTopicId);
    expect(weakIds).not.toContain(strongTopicId);

    // A fresh MIXED session over this category's whole published pool (WEAK + STRONG, ≤ count).
    const sessionId = await startSession({ userId, mode: "MIXED_PRACTICE", categoryId });

    const sqs = await prisma.testSessionQuestion.findMany({
      where: { testSessionId: sessionId },
      orderBy: { displayOrder: "asc" },
      include: { question: { select: { topicId: true } } },
    });
    // Nothing sliced: the whole pool is present.
    expect(sqs.length).toBe(WEAK_N + STRONG_N);

    const weakOrders = sqs.filter((sq) => sq.question.topicId === weakTopicId).map((sq) => sq.displayOrder);
    const strongOrders = sqs.filter((sq) => sq.question.topicId === strongTopicId).map((sq) => sq.displayOrder);
    expect(weakOrders.length).toBe(WEAK_N);
    expect(strongOrders.length).toBe(STRONG_N);

    // Band assertion: the weak band fully precedes the strong band (order WITHIN a band is shuffled).
    expect(Math.max(...weakOrders)).toBeLessThan(Math.min(...strongOrders));
  });
});
