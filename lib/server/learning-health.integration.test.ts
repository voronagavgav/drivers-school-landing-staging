import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { getLearningHealth } from "@/lib/server/learning-health";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";

// Spec §E: prove the REAL server aggregation (`getLearningHealth`) turns the app's recorded learning
// signals into the admin headline numbers. We self-provision two OFFICIAL difficulty-5 questions and
// seed KNOWN signals directly, so every fixture contribution is exactly computable:
//
//   Q40 — 40 graded ReviewLog rows: 36 correct (grade 3) + 4 wrong (grade 1) → observed 0.9. At
//     authored difficulty 5 (expected 0.5) that is a +0.4 "easier" outlier → MUST appear in
//     difficultyOutliers. The 36 correct rows also carry a non-null confidence (the 4 wrong don't).
//   Q19 — 19 grade-1 rows (0% accuracy) → below DIFFICULTY_OUTLIER_MIN_ANSWERS(20) → MUST be absent
//     from difficultyOutliers despite the huge delta.
//   A REVIEWED explanation on Q40 → explanationCoverage.reviewed ticks up by exactly one.
//
// getLearningHealth reads DB-wide aggregates; the integration config runs files sequentially
// (fileParallelism:false), so we capture baselines BEFORE seeding and assert the fixture's exact
// CONTRIBUTION (delta) rather than global equality — outlier membership is per-question so it is
// asserted directly by questionId.
//
// FK-safe cleanup: the fixture's own cleanup deletes the USER first, cascading its ReviewLog rows
// (freeing the Restrict question FK) before the questions (cascading their explanation) are removed.

let fixture: OfficialQuestionFixture;
let q40Id: string;
let q19Id: string;

// Baselines captured before seeding — the fixture's exact contribution is the delta from these.
let baseConfidenceTotal: number;
let baseConfidenceSampled: number;
let baseReviewed: number;

beforeAll(async () => {
  fixture = await createOfficialQuestion(prisma, {
    label: "learning-health",
    count: 2,
    difficulty: 5, // expected accuracy 0.5 — an observed 0.9 is a clear "easier" outlier
  });
  [q40Id, q19Id] = fixture.questionIds;
  const userId = fixture.userId!;

  baseConfidenceTotal = await prisma.reviewLog.count();
  baseConfidenceSampled = await prisma.reviewLog.count({ where: { confidence: { not: null } } });
  baseReviewed = await prisma.question.count({
    where: { isPublished: true, explanation: { reviewedStatus: "REVIEWED" } },
  });

  // Q40: 36 correct (grade 3, confidence 3) + 4 wrong (grade 1, no confidence) → observed 0.9.
  for (let i = 0; i < 40; i++) {
    const correct = i < 36;
    await prisma.reviewLog.create({
      data: {
        userId,
        questionId: q40Id,
        grade: correct ? 3 : 1,
        confidence: correct ? 3 : null,
        elapsedDays: 0,
        mode: "ADAPTIVE_REVIEW",
      },
    });
  }

  // Q19: 19 grade-1 rows — below the min-answers floor, so it must NOT surface as an outlier.
  for (let i = 0; i < 19; i++) {
    await prisma.reviewLog.create({
      data: { userId, questionId: q19Id, grade: 1, elapsedDays: 0, mode: "ADAPTIVE_REVIEW" },
    });
  }

  // A REVIEWED explanation on Q40 — explanationCoverage.reviewed should tick up by exactly one.
  await prisma.questionExplanation.create({
    data: { questionId: q40Id, reviewedStatus: "REVIEWED", shortText: "reviewed by an editor" },
  });
});

afterAll(async () => {
  await fixture.cleanup();
  await prisma.$disconnect();
});

describe("getLearningHealth aggregation", () => {
  it("flags Q40 as an easier outlier at observed 0.9 and excludes the 19-row Q19", async () => {
    const health = await getLearningHealth();

    const q40 = health.difficultyOutliers.find((o) => o.questionId === q40Id);
    expect(q40).toBeDefined();
    expect(q40!.observed).toBeCloseTo(0.9, 10); // 36 / 40
    expect(q40!.expected).toBeCloseTo(0.5, 10); // difficulty 5
    expect(q40!.direction).toBe("easier");

    // 19 answers is below DIFFICULTY_OUTLIER_MIN_ANSWERS — excluded despite 0% accuracy.
    expect(health.difficultyOutliers.some((o) => o.questionId === q19Id)).toBe(false);
  });

  it("counts the fixture's REVIEWED explanation in explanationCoverage", async () => {
    const health = await getLearningHealth();

    expect(health.explanationCoverage.reviewed).toBe(baseReviewed + 1);
    expect(health.explanationCoverage.total).toBeGreaterThanOrEqual(2); // our two published questions
    expect(health.explanationCoverage.unreviewedCount).toBe(
      health.explanationCoverage.total - health.explanationCoverage.reviewed,
    );
    expect(health.explanationCoverage.pct).toBeGreaterThanOrEqual(0);
    expect(health.explanationCoverage.pct).toBeLessThanOrEqual(1);
  });

  it("reflects the seeded non-null-confidence rows in confidenceUptake", async () => {
    const health = await getLearningHealth();

    // Fixture contribution (sequential run): +59 total graded reviews, +36 with confidence.
    expect(health.confidenceUptake.total).toBe(baseConfidenceTotal + 59);
    expect(health.confidenceUptake.sampled).toBe(baseConfidenceSampled + 36);
    expect(health.confidenceUptake.total).toBeGreaterThanOrEqual(health.confidenceUptake.sampled);
  });

  it("returns a non-negative 7-day nudge volume", async () => {
    const health = await getLearningHealth();
    expect(health.nudgeVolume7d).toBeGreaterThanOrEqual(0);
  });
});
