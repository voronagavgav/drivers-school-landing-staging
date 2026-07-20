import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { startSession, submitAnswer, finishSession } from "@/lib/server/test-engine";
import {
  recomputeReadiness,
  getLatestReadiness,
} from "@/lib/server/mastery-readiness";
import {
  DEFAULT_EXAM_QUESTION_COUNT,
  READINESS_MIN_SEEN,
} from "@/lib/constants";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";

// Wave 11 §D — proving the server-authoritative mastery + readiness recompute (wave11-08) is CORRECT
// and HONEST end to end, against the real seeded SQLite DB.
//
//   §2 PRODUCTION PATH: driving a real TOPIC_PRACTICE session to completion via `finishSession` (the
//      actual finish entry) materialises TopicMastery rows for the touched topics (meanR/coverage in
//      [0,1], a valid band) AND a ReadinessSnapshot for the session's category.
//   §3 INSUFFICIENT DATA: a learner with fewer than READINESS_MIN_SEEN (20) seen items → the latest
//      snapshot carries sufficientData:false and dialPercent:0 (no hard dial number is emitted).
//   §4 MOCK-ANCHOR DIRECTION (both directions — the Beta-shrinkage oracle, restored wave19e-01): with
//      ≥20 seen items whose release-model dial sits strictly inside (0,100), FAILED mocks push the
//      recomputed dial STRICTLY BELOW the no-mock dial, and PASSED mocks push it STRICTLY ABOVE. The
//      reference is a ZERO-MOCK production recompute (`recomputeReadiness` with all EXAM_SIMULATION rows
//      deleted) — the m=0 identity of the anchor supplies the exact release-model dial the model would
//      persist without mocks — so this catches a mis-wired mock anchor without re-pinning the release math.
//
// Every fixture self-provisions OFFICIAL (isDemo=false) content via createOfficialQuestion (unique
// category/topic/codes per run) so the suite never asserts shared seeded content, and tears it down
// FK-safely (user first → questions/topic/category).

const MS_PER_DAY = 86_400_000;

async function optionsFor(questionId: string) {
  const opts = await prisma.questionOption.findMany({ where: { questionId } });
  return {
    correct: opts.find((o) => o.isCorrect)!,
    wrong: opts.find((o) => !o.isCorrect)!,
  };
}

// §2 + §3 share ONE small-pool fixture: a completed session produces both the TopicMastery/snapshot
// rows (§2) and — since it has far fewer than 20 seen items — an insufficient-data snapshot (§3).
describe("readiness recompute — production path + insufficient data (§2, §3)", () => {
  let fixture: OfficialQuestionFixture;
  let userId: string;
  let categoryId: string;
  let topicId: string;

  beforeAll(async () => {
    fixture = await createOfficialQuestion(prisma, { label: "rs-e2e", count: 3 });
    userId = fixture.userId!;
    categoryId = fixture.categoryId;
    topicId = fixture.topicId!;

    // Drive a REAL session to completion through the production finish entry.
    const sessionId = await startSession({ userId, mode: "TOPIC_PRACTICE", categoryId, topicId });
    for (const questionId of fixture.questionIds) {
      const { correct } = await optionsFor(questionId);
      await submitAnswer({ sessionId, userId, questionId, selectedOptionId: correct.id });
    }
    await finishSession(sessionId, userId);
  });

  afterAll(async () => {
    await fixture.cleanup();
  });

  it("finishSession materialises TopicMastery rows + a ReadinessSnapshot (§2)", async () => {
    const mastery = await prisma.topicMastery.findUnique({
      where: { userId_topicId: { userId, topicId } },
    });
    expect(mastery).not.toBeNull();
    expect(mastery!.itemsSeen).toBe(3); // every fixture question was answered
    expect(mastery!.meanR).toBeGreaterThanOrEqual(0);
    expect(mastery!.meanR).toBeLessThanOrEqual(1);
    expect(mastery!.coverage).toBeGreaterThanOrEqual(0);
    expect(mastery!.coverage).toBeLessThanOrEqual(1);
    expect(["weak", "learning", "strong"]).toContain(mastery!.band);

    const snapshot = await prisma.readinessSnapshot.findFirst({
      where: { userId, categoryId },
      orderBy: { createdAt: "desc" },
    });
    expect(snapshot).not.toBeNull();
    expect(snapshot!.passProbability).toBeGreaterThanOrEqual(0);
    expect(snapshot!.passProbability).toBeLessThanOrEqual(1);
  });

  it("a learner below READINESS_MIN_SEEN gets sufficientData:false and dialPercent:0 (§3)", async () => {
    const latest = await getLatestReadiness(userId, categoryId);
    expect(latest).not.toBeNull();
    expect(latest!.seenCount).toBeLessThan(READINESS_MIN_SEEN); // only 3 seen items
    expect(latest!.sufficientData).toBe(false);
    expect(latest!.dialPercent).toBe(0); // no hard dial number when data is thin
  });
});

// §4 needs a release-model dial strictly inside (0,100) so BOTH mock directions have room to move it.
// We provision ≥20 questions and seed a ReviewState per question directly (R ≈ 0.9 via elapsed ==
// stability), so seenCount ≥ 20 (sufficientData true) and the whole seen pool lands the no-mock dial
// comfortably mid-range (pre-verified: no-mock 59, 3-FAILED 34, 3-PASSED 77).
//
// BASELINE CHOICE — ZERO-MOCK PRODUCTION RECOMPUTE (not the release-reconstruction): the fixture is a
// throwaway `createOfficialQuestion` category, which has NO exam blueprint, so `recomputeReadiness`
// falls to a single whole-pool block and persists `inputsJson.blocks == []` — the persisted blocks do
// NOT carry the whole-pool p-vector needed to reconstruct `release.final`. So the honest m=0 reference
// is obtained by driving the REAL `recomputeReadiness` with ALL EXAM_SIMULATION rows deleted (the
// anchor is the identity at m=0, `(0 + S·P)/(0 + S) = P`), reading the persisted `dialPercent`. The
// production path itself supplies the release-model dial the model would persist without mocks — an
// anti-self-grading relative oracle (never the retired pure `computeReadiness` anchor).
describe("readiness recompute — mock-anchor direction (§4)", () => {
  let fixture: OfficialQuestionFixture;
  let userId: string;
  let categoryId: string;

  const SEEN = 22; // > READINESS_MIN_SEEN

  // Insert `n` COMPLETED EXAM_SIMULATION mocks for this user×category with the given result.
  async function seedMocks(n: number, result: "PASSED" | "FAILED") {
    const finishedAt = new Date();
    for (let i = 0; i < n; i++) {
      await prisma.testSession.create({
        data: {
          userId,
          categoryId,
          mode: "EXAM_SIMULATION",
          status: "COMPLETED",
          finishedAt,
          totalQuestions: DEFAULT_EXAM_QUESTION_COUNT,
          result,
        },
      });
    }
  }

  // Wipe prior snapshots + mocks, seed `mockCount` mocks of `result` (0 = leave mock-less), recompute
  // through the REAL production path, and return the freshly persisted snapshot + its parsed audit.
  async function recomputeWith(mockCount: number, result: "PASSED" | "FAILED") {
    await prisma.readinessSnapshot.deleteMany({ where: { userId } });
    await prisma.testSession.deleteMany({ where: { userId, mode: "EXAM_SIMULATION" } });
    if (mockCount > 0) await seedMocks(mockCount, result);
    await recomputeReadiness(userId, categoryId);

    const snapshot = await prisma.readinessSnapshot.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    expect(snapshot).not.toBeNull();
    const inputs = JSON.parse(snapshot!.inputsJson) as {
      seenCount: number;
      anchored: boolean;
      dialIndep: number;
      mock: { m: number; k: number };
    };
    return { snapshot: snapshot!, inputs };
  }

  beforeAll(async () => {
    fixture = await createOfficialQuestion(prisma, { label: "rs-dir", count: SEEN });
    userId = fixture.userId!;
    categoryId = fixture.categoryId;

    // The FSRS forgetting curve is constructed so R == 0.9 exactly at elapsed == stability (an
    // invariant that holds in FSRS-5 and FSRS-6 alike, since DECAY and FACTOR share w20); the pool
    // mean then lands the model dial comfortably inside (0,100).
    const now = Date.now();
    const stabilityDays = 10;
    const lastReviewedAt = new Date(now - stabilityDays * MS_PER_DAY);
    for (const questionId of fixture.questionIds) {
      await prisma.reviewState.create({
        data: {
          userId,
          questionId,
          stability: stabilityDays,
          state: "review",
          lastReviewedAt,
          dueAt: new Date(now + stabilityDays * MS_PER_DAY),
          reps: 1,
        },
      });
    }
  });

  afterAll(async () => {
    await fixture.cleanup();
    await prisma.$disconnect();
  });

  it("FAILED mocks pull the dial STRICTLY BELOW, PASSED mocks STRICTLY ABOVE, the no-mock dial (§4)", async () => {
    const MOCKS = 3;

    // --- Reference: ZERO-MOCK production recompute (anchor is the identity at m=0). ---
    const base = await recomputeWith(0, "FAILED");
    const noMockDial = base.snapshot.dialPercent;
    // Guard: ≥20 seen (sufficientData) and the no-mock dial strictly inside (0,100) so BOTH mock
    // directions have integer room to move it (a dial rounding to 0/100 would make the strict `<`/`>`
    // unprovable). The anchor must be wired (append-only audit flag), and mock-less → m=0.
    expect(base.inputs.seenCount).toBeGreaterThanOrEqual(READINESS_MIN_SEEN);
    expect(noMockDial).toBeGreaterThan(0);
    expect(noMockDial).toBeLessThan(100);
    expect(base.inputs.anchored).toBe(true);
    expect(base.inputs.mock.m).toBe(0);

    // --- Direction 1: all-FAILED mocks drag the dial STRICTLY BELOW the no-mock dial. ---
    const failed = await recomputeWith(MOCKS, "FAILED");
    expect(failed.inputs.seenCount).toBeGreaterThanOrEqual(READINESS_MIN_SEEN);
    expect(failed.inputs.anchored).toBe(true);
    expect(failed.inputs.mock.m).toBe(MOCKS);
    expect(failed.snapshot.dialPercent).toBeLessThan(noMockDial);
    // Never-above-independence still holds after the anchor (same monotone affine map on both).
    expect(failed.snapshot.dialPercent).toBeLessThanOrEqual(failed.inputs.dialIndep);

    // --- Direction 2: all-PASSED mocks push the dial STRICTLY ABOVE the no-mock dial. ---
    const passed = await recomputeWith(MOCKS, "PASSED");
    expect(passed.inputs.seenCount).toBeGreaterThanOrEqual(READINESS_MIN_SEEN);
    expect(passed.inputs.anchored).toBe(true);
    expect(passed.inputs.mock.m).toBe(MOCKS);
    expect(passed.snapshot.dialPercent).toBeGreaterThan(noMockDial);
    expect(passed.snapshot.dialPercent).toBeLessThanOrEqual(passed.inputs.dialIndep);
  });
});
