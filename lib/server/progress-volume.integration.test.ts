import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { computeProgress } from "@/lib/server/progress";
import { READINESS_MIN_SEEN } from "@/lib/constants";

// Spec B: progress aggregation at VOLUME. Seed a KNOWN answer distribution for one user across
// several completed sessions and assert computeProgress' totals / per-topic stats / weak-topic
// detection / readiness are exactly right AND stable (a pure read called twice yields the same view).
// To make every expected value exactly computable, the answers live under a DEDICATED throwaway
// Category (so seeded content cannot perturb the math). Answers are written directly as
// TestSession (COMPLETED) + TestAnswer rows so we control isCorrect per question precisely — unlike
// driving startSession/submitAnswer, which would select/shuffle the pool.
//
// HARD-CODED distribution (expected values below are written as literals, NOT derived from the seed,
// so a drift in the aggregation is caught rather than cancelled out):
//   WEAK   topic: 5 distinct Qs; answered 6 times (q0 answered in two sessions), 2 correct → 1/3 < 0.6 → WEAK
//   STRONG topic: 8 distinct Qs; answered 8 times, 8 correct → 100%            → strong
//   MID    topic: 8 distinct Qs; answered 8 times, 6 correct → 75%             → strong
// Totals: 21 distinct Qs (≥ READINESS_MIN_SEEN), 22 answers, 16 correct, 6 wrong, 3 completed
// sessions. A 4th IN_PROGRESS session (no answers) proves completedSessions counts COMPLETED only.

let userId: string;
let categoryId: string; // dedicated throwaway category scoping the aggregation
let weakTopicId: string;
let strongTopicId: string;
let midTopicId: string;

interface SeededQuestion {
  id: string;
  correctOptionId: string;
  wrongOptionId: string;
}

async function createPublishedQuestion(text: string, topicId: string): Promise<SeededQuestion> {
  const q = await prisma.question.create({
    data: {
      text,
      topicId,
      difficulty: 1,
      // Official (isDemo=false) fixture — a normal published row the live pool serves; this
      // suite exercises progress-volume accounting, not content sourcing.
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
    include: { options: true },
  });
  return {
    id: q.id,
    correctOptionId: q.options.find((o) => o.isCorrect)!.id,
    wrongOptionId: q.options.find((o) => !o.isCorrect)!.id,
  };
}

async function createCompletedSession(): Promise<string> {
  const s = await prisma.testSession.create({
    data: {
      userId,
      categoryId,
      mode: "MIXED_PRACTICE",
      status: "COMPLETED",
      finishedAt: new Date(),
    },
  });
  return s.id;
}

// Write one TestAnswer row, picking the right option so isCorrect matches the intended outcome.
async function answer(sessionId: string, q: SeededQuestion, correct: boolean) {
  await prisma.testAnswer.create({
    data: {
      testSessionId: sessionId,
      questionId: q.id,
      selectedOptionId: correct ? q.correctOptionId : q.wrongOptionId,
      isCorrect: correct,
    },
  });
}

beforeAll(async () => {
  const cat = await prisma.category.create({
    data: { code: `W4-${Date.now()}`, title: "Wave4 progress at volume", isActive: true },
  });
  categoryId = cat.id;

  const weak = await prisma.topic.create({ data: { title: `wave4-pv-weak-${Date.now()}`, isActive: true } });
  const strong = await prisma.topic.create({ data: { title: `wave4-pv-strong-${Date.now()}`, isActive: true } });
  const mid = await prisma.topic.create({ data: { title: `wave4-pv-mid-${Date.now()}`, isActive: true } });
  weakTopicId = weak.id;
  strongTopicId = strong.id;
  midTopicId = mid.id;

  const weakQs: SeededQuestion[] = [];
  const strongQs: SeededQuestion[] = [];
  const midQs: SeededQuestion[] = [];
  for (let i = 0; i < 5; i++) weakQs.push(await createPublishedQuestion(`pv weak Q${i}`, weakTopicId));
  for (let i = 0; i < 8; i++) strongQs.push(await createPublishedQuestion(`pv strong Q${i}`, strongTopicId));
  for (let i = 0; i < 8; i++) midQs.push(await createPublishedQuestion(`pv mid Q${i}`, midTopicId));

  const u = await prisma.user.create({
    data: {
      name: "Progress Volume Test",
      email: `progress-volume-${Date.now()}@test.local`,
      passwordHash: "x",
      role: "USER",
      selectedCategoryId: categoryId,
    },
  });
  userId = u.id;

  // Session 1 — WEAK: q0 correct, q1..q4 wrong → 1/5 correct.
  const s1 = await createCompletedSession();
  await answer(s1, weakQs[0], true);
  for (const q of weakQs.slice(1)) await answer(s1, q, false);

  // Session 2 — STRONG: all 8 correct.
  const s2 = await createCompletedSession();
  for (const q of strongQs) await answer(s2, q, true);

  // Session 3 — MID: first 6 correct, last 2 wrong → 6/8; plus a REPEAT of WEAK q0 (correct), so
  // totalAnswered (22) exceeds uniqueAnswered (21) and WEAK's total answer count is 6.
  const s3 = await createCompletedSession();
  for (let i = 0; i < midQs.length; i++) await answer(s3, midQs[i], i < 6);
  await answer(s3, weakQs[0], true);

  // An IN_PROGRESS session with no answers — must NOT count toward completedSessions.
  await prisma.testSession.create({
    data: { userId, categoryId, mode: "MIXED_PRACTICE", status: "IN_PROGRESS" },
  });
});

afterAll(async () => {
  // User first: cascades TestSession→TestAnswer (non-cascade FK to Question), freeing the questions.
  await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  await prisma.question.deleteMany({ where: { topicId: weakTopicId } }).catch(() => undefined);
  await prisma.question.deleteMany({ where: { topicId: strongTopicId } }).catch(() => undefined);
  await prisma.question.deleteMany({ where: { topicId: midTopicId } }).catch(() => undefined);
  await prisma.topic.delete({ where: { id: weakTopicId } }).catch(() => undefined);
  await prisma.topic.delete({ where: { id: strongTopicId } }).catch(() => undefined);
  await prisma.topic.delete({ where: { id: midTopicId } }).catch(() => undefined);
  await prisma.category.delete({ where: { id: categoryId } }).catch(() => undefined);
  await prisma.$disconnect();
});

describe("computeProgress at volume", () => {
  it("aggregates totals, per-topic stats, weak topics and readiness from a known distribution", async () => {
    const p = await computeProgress(userId, categoryId);

    // Totals — hard-coded literals from the seeded distribution above.
    expect(p.totalAnswered).toBe(22);
    expect(p.correct).toBe(16);
    expect(p.wrong).toBe(6);
    expect(p.uniqueAnswered).toBe(21);
    expect(p.accuracy).toBeCloseTo(16 / 22, 10);
    expect(p.completedSessions).toBe(3); // the IN_PROGRESS session is excluded

    // Per-topic stats — exactly one entry per seeded topic, with exact counts/accuracy.
    expect(p.topicStats).toHaveLength(3);
    const stat = (id: string) => p.topicStats.find((t) => t.topicId === id)!;

    expect(stat(weakTopicId).answered).toBe(6);
    expect(stat(weakTopicId).correct).toBe(2);
    expect(stat(weakTopicId).accuracy).toBeCloseTo(2 / 6, 10);

    expect(stat(strongTopicId).answered).toBe(8);
    expect(stat(strongTopicId).correct).toBe(8);
    expect(stat(strongTopicId).accuracy).toBeCloseTo(1, 10);

    expect(stat(midTopicId).answered).toBe(8);
    expect(stat(midTopicId).correct).toBe(6);
    expect(stat(midTopicId).accuracy).toBeCloseTo(0.75, 10);

    // Weak-topic detection: only the deliberately-weak topic qualifies.
    const weakIds = p.weakTopics.map((t) => t.topicId);
    expect(weakIds).toContain(weakTopicId);
    expect(weakIds).not.toContain(strongTopicId);
    expect(weakIds).not.toContain(midTopicId);
    expect(p.weakTopics).toHaveLength(1);

    // Readiness: ≥ READINESS_MIN_SEEN unique answers, so it is estimated (not NOT_ENOUGH_DATA).
    expect(p.uniqueAnswered).toBeGreaterThanOrEqual(READINESS_MIN_SEEN);
    expect(p.readiness.level).not.toBe("NOT_ENOUGH_DATA");
    expect(Number.isInteger(p.readiness.score)).toBe(true);
    expect(p.readiness.score).toBeGreaterThanOrEqual(0);
    expect(p.readiness.score).toBeLessThanOrEqual(100);
  });

  it("is a stable, deterministic read — calling it twice yields an identical view", async () => {
    const first = await computeProgress(userId, categoryId);
    const second = await computeProgress(userId, categoryId);
    expect(second).toEqual(first);
  });
});
