import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { getCalibrationForUser, refreshCalibrationSlope } from "@/lib/server/calibration";
import { recomputeReadiness } from "@/lib/server/mastery-readiness";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";

// wave14-06: pin the DB aggregation against oracle G1's distribution (lib/calibration.test.ts) —
// the page render itself is not vitest-testable (wave14-14 asserts the /progress path in a browser).
// The pure math is already golden-tested; here we prove the ReviewLog scan + grade→correct mapping
// (correct = grade >= 2, so wrong=1 / correct=3) feed computeCalibration the right rows.
//
// G1: confidence 1→4 rows/1 correct, 2→5/2, 3→6/5, 4→5/5 (20 total). highConfidenceAccuracy = 10/11.

const NOW = new Date("2026-07-03T12:00:00Z");

// [confidence, total, correct] per bucket — G1.
const G1: Array<[number, number, number]> = [
  [1, 4, 1],
  [2, 5, 2],
  [3, 6, 5],
  [4, 5, 5],
];

// G2 (wave14-07 slope oracle): conf3 10 rows/3 correct, conf4 10 rows/4 correct (20 total).
// totalCorrect = 7, expectedCorrect = 0.75*10 + 0.95*10 = 17, raw slope 7/17 ≈ 0.412 → clamps to
// CALIBRATION_SLOPE_MIN (0.6). The clamp keeps calibration a DISCOUNT, never an inflation.
const G2: Array<[number, number, number]> = [
  [3, 10, 3],
  [4, 10, 4],
];

async function seedLogs(
  userId: string,
  questionId: string,
  dist: Array<[number, number, number]>,
) {
  for (const [confidence, total, correct] of dist) {
    for (let i = 0; i < total; i++) {
      await prisma.reviewLog.create({
        data: {
          userId,
          questionId,
          grade: i < correct ? 3 : 1, // correct = grade >= 2
          elapsedDays: 1,
          mode: "ADAPTIVE_REVIEW",
          confidence,
          reviewedAt: NOW,
        },
      });
    }
  }
}

let full: OfficialQuestionFixture; // 20 rows → sufficient
let short: OfficialQuestionFixture; // 19 rows → insufficient
let slopeFull: OfficialQuestionFixture; // G2 20 rows → slope 0.6
let slopeShort: OfficialQuestionFixture; // 19 rows + pre-set slope 0.8 → null, preserved

beforeAll(async () => {
  full = await createOfficialQuestion(prisma, { label: "calib-full" });
  short = await createOfficialQuestion(prisma, { label: "calib-short" });
  slopeFull = await createOfficialQuestion(prisma, { label: "calib-slope-full" });
  slopeShort = await createOfficialQuestion(prisma, { label: "calib-slope-short" });
  await seedLogs(full.userId!, full.questionId, G1);
  // 19 valid rows (one short of CALIBRATION_MIN_SAMPLES) → insufficient.
  await seedLogs(short.userId!, short.questionId, [[2, 19, 10]]);
  await seedLogs(slopeFull.userId!, slopeFull.questionId, G2);
  await seedLogs(slopeShort.userId!, slopeShort.questionId, [[3, 19, 10]]);
});

afterAll(async () => {
  // ReviewLog → User is Cascade, → Question is Restrict: cleanup deletes the user first (clears the
  // logs), which frees the Restrict question FK, then questions/topic/category. House pattern.
  await full.cleanup();
  await short.cleanup();
  await slopeFull.cleanup();
  await slopeShort.cleanup();
  await prisma.$disconnect();
});

describe("getCalibrationForUser (wave14-06)", () => {
  it("aggregates G1's 20 confidence-rated logs into a sufficient result", async () => {
    const res = await getCalibrationForUser(full.userId!);
    expect(res.sufficient).toBe(true);
    if (!res.sufficient) return;
    expect(res.sampled).toBe(20);
    expect(res.highConfidenceAccuracy).toBeCloseTo(10 / 11);
    expect(res.verdict).toBe("calibrated");
  });

  it("reports insufficient below CALIBRATION_MIN_SAMPLES (19 rows)", async () => {
    const res = await getCalibrationForUser(short.userId!);
    expect(res.sufficient).toBe(false);
    expect(res.sampled).toBe(19);
  });
});

describe("refreshCalibrationSlope (wave14-07)", () => {
  it("writes the clamped slope (0.6) to the user's profile on sufficient data", async () => {
    const slope = await refreshCalibrationSlope(slopeFull.userId!);
    expect(slope).toBe(0.6);
    const profile = await prisma.userStudyProfile.findUnique({
      where: { userId: slopeFull.userId! },
      select: { calibrationSlope: true },
    });
    expect(profile?.calibrationSlope).toBe(0.6);
  });

  it("is idempotent on unchanged data — same value, one profile row", async () => {
    const slope = await refreshCalibrationSlope(slopeFull.userId!);
    expect(slope).toBe(0.6);
    const rows = await prisma.userStudyProfile.count({
      where: { userId: slopeFull.userId! },
    });
    expect(rows).toBe(1);
  });

  it("preserves an existing slope when data is insufficient (returns null)", async () => {
    // A learner who pauses confidence sampling keeps their earned discount — never nulled out.
    await prisma.userStudyProfile.upsert({
      where: { userId: slopeShort.userId! },
      create: { userId: slopeShort.userId!, calibrationSlope: 0.8 },
      update: { calibrationSlope: 0.8 },
    });
    const slope = await refreshCalibrationSlope(slopeShort.userId!);
    expect(slope).toBeNull();
    const profile = await prisma.userStudyProfile.findUnique({
      where: { userId: slopeShort.userId! },
      select: { calibrationSlope: true },
    });
    expect(profile?.calibrationSlope).toBe(0.8);
  });

  it("flows the refreshed slope into the ReadinessSnapshot (production path)", async () => {
    // slopeFull's profile now holds 0.6 (from the first test); recomputeReadiness reads it and
    // mirrors it onto the snapshot column — proving the discount actually reaches readiness.
    await recomputeReadiness(slopeFull.userId!, slopeFull.categoryId, prisma, NOW);
    const snapshot = await prisma.readinessSnapshot.findFirst({
      where: { userId: slopeFull.userId! },
      orderBy: { createdAt: "desc" },
      select: { calibrationSlope: true },
    });
    expect(snapshot?.calibrationSlope).toBe(0.6);
  });
});
