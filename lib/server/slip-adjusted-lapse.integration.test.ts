import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { startSession, submitAnswer } from "@/lib/server/test-engine";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";

// Wave 20 grade-honesty deliverable #6 — PROVE the wired behavior through the REAL production path
// (`startSession` + `submitAnswer`), never the pure `slipAdjustedLapse`/`gradePosterior` helpers
// directly. A direct-helper test would pass even if the action path stripped `optionCount` or forgot
// to route a wrong-on-history answer through the slip-adjusted lapse; only driving `submitAnswer`
// exercises the same code the runner calls.
//
// The prior `ReviewState` is SEEDED via `prisma.reviewState.create` (the wave11-06 / readiness-snapshot
// pattern), then the wrong/correct answer is driven through `submitAnswer`. A fixed `reviewedAt`
// (= seeded `lastReviewedAt` + a chosen elapsed) makes retrievability — and thus the whole blend —
// deterministic (R decays with wall clock, so the reference time is derived from the seeded row, not
// `new Date()`). Anchors mirror the frozen Python oracle (scripts/oracles/gen-wave20-oracles.py):
//   s=50/R≈0.9728, D=5, g=1/4 ⇒ S'≈36.3 (log-blend band, NOT a ≤3 crush, NOT ≥50 growth);
//   s=5/R≈0.509,  D=5, g=1/4 ⇒ S'≈2.70 (crush preserved).
// `clientEventId` carries a per-run suffix — `ReviewLog.clientEventId` is GLOBALLY unique, so a fixed
// string could collide with a leftover row from a prior crashed run.

const MS_PER_DAY = 86_400_000;
const RUN = Date.now();

// Real 4-option ПДР question ⇒ honest guess floor g = 1/4 = 0.25 (the production default). The default
// createOfficialQuestion fixture is 2-option (g = min(1/2, 0.45) = 0.45), which shifts π enough that a
// wrong-on-weak lands at ≈3.05 (just above the ≤3 crush bound) — 4 options is representative input, not
// an oracle edit (see lib/server/CLAUDE.md).
const FOUR_OPTIONS = [
  { text: "right", isCorrect: true, displayOrder: 0 },
  { text: "wrong-a", isCorrect: false, displayOrder: 1 },
  { text: "wrong-b", isCorrect: false, displayOrder: 2 },
  { text: "wrong-c", isCorrect: false, displayOrder: 3 },
];
const FIVE_OPTIONS = [
  ...FOUR_OPTIONS,
  { text: "wrong-d", isCorrect: false, displayOrder: 4 },
];

const fixtures: OfficialQuestionFixture[] = [];
const userIds: string[] = [];

async function mkFixture(
  label: string,
  options?: { text: string; isCorrect: boolean; displayOrder: number }[],
): Promise<OfficialQuestionFixture> {
  const f = await createOfficialQuestion(prisma, { label, count: 1, options });
  fixtures.push(f);
  userIds.push(f.userId!);
  return f;
}

/** Drive one answer (correct or wrong) through the real submit path, returning the persisted rows. */
async function driveAnswer(opts: {
  fixture: OfficialQuestionFixture;
  correct: boolean;
  latencyMs: number;
  clientEventId: string;
  reviewedAt?: Date;
}) {
  const { fixture, correct, latencyMs, clientEventId, reviewedAt } = opts;
  const sessionId = await startSession({
    userId: fixture.userId!,
    mode: "TOPIC_PRACTICE",
    categoryId: fixture.categoryId,
    topicId: fixture.topicId!,
  });
  const option = await prisma.questionOption.findFirst({
    where: { questionId: fixture.questionId, isCorrect: correct },
  });
  await submitAnswer({
    sessionId,
    userId: fixture.userId!,
    questionId: fixture.questionId,
    selectedOptionId: option!.id,
    latencyMs,
    clientEventId,
    reviewedAt,
  });
  const state = await prisma.reviewState.findUnique({
    where: { userId_questionId: { userId: fixture.userId!, questionId: fixture.questionId } },
  });
  const log = await prisma.reviewLog.findFirst({
    where: { userId: fixture.userId!, questionId: fixture.questionId, testSessionId: sessionId },
  });
  return { state: state!, log: log! };
}

// Case (i) wrong-on-strong.
let strongState: NonNullable<Awaited<ReturnType<typeof driveAnswer>>["state"]>;
let strongLog: NonNullable<Awaited<ReturnType<typeof driveAnswer>>["log"]>;
// Case (ii) wrong-on-weak.
let weakState: NonNullable<Awaited<ReturnType<typeof driveAnswer>>["state"]>;
// Case (iii) option-count grade.
let twoOptState: NonNullable<Awaited<ReturnType<typeof driveAnswer>>["state"]>;
let fiveOptState: NonNullable<Awaited<ReturnType<typeof driveAnswer>>["state"]>;

beforeAll(async () => {
  // ── (i) wrong-on-strong: stability 50, D=5, review, lastReviewedAt = reviewedAt − 10d (R≈0.9728). ──
  const strongFx = await mkFixture("sal-strong", FOUR_OPTIONS);
  const strongLast = new Date(RUN - 10 * MS_PER_DAY);
  await prisma.reviewState.create({
    data: {
      userId: strongFx.userId!,
      questionId: strongFx.questionId,
      stability: 50,
      difficulty: 5,
      state: "review",
      lastReviewedAt: strongLast,
      dueAt: new Date(RUN + 40 * MS_PER_DAY),
      reps: 1,
      lapses: 0,
    },
  });
  ({ state: strongState, log: strongLog } = await driveAnswer({
    fixture: strongFx,
    correct: false,
    latencyMs: 6000,
    clientEventId: `sal-strong-${RUN}`,
    reviewedAt: new Date(RUN),
  }));

  // ── (ii) wrong-on-weak: stability 5, lastReviewedAt = reviewedAt − 400d (R≈0.509 ≤ 0.55). ──
  const weakFx = await mkFixture("sal-weak", FOUR_OPTIONS);
  const weakLast = new Date(RUN - 400 * MS_PER_DAY);
  await prisma.reviewState.create({
    data: {
      userId: weakFx.userId!,
      questionId: weakFx.questionId,
      stability: 5,
      difficulty: 5,
      state: "review",
      lastReviewedAt: weakLast,
      dueAt: new Date(RUN - 395 * MS_PER_DAY),
      reps: 1,
      lapses: 0,
    },
  });
  ({ state: weakState } = await driveAnswer({
    fixture: weakFx,
    correct: false,
    latencyMs: 6000,
    clientEventId: `sal-weak-${RUN}`,
    reviewedAt: new Date(RUN),
  }));

  // ── (iii) option-count grade at a FRESH prior (new card ⇒ neutral 0.5 priorKnow). ──
  const twoFx = await mkFixture("sal-2opt"); // default 2-option fixture
  ({ state: twoOptState } = await driveAnswer({
    fixture: twoFx,
    correct: true,
    latencyMs: 8000,
    clientEventId: `sal-2opt-${RUN}`,
  }));
  const fiveFx = await mkFixture("sal-5opt", FIVE_OPTIONS);
  ({ state: fiveOptState } = await driveAnswer({
    fixture: fiveFx,
    correct: true,
    latencyMs: 8000,
    clientEventId: `sal-5opt-${RUN}`,
  }));
});

afterAll(async () => {
  for (const f of fixtures) await f.cleanup();
  await prisma.$disconnect();
});

describe("slip-adjusted lapse + option-count grade — production path (Wave 20 deliverable #6)", () => {
  it("(i) wrong-on-strong: stability lands in the log-blend band [30,45], relearning, lapses++", () => {
    // Not a ≤3 crush (over-punishment), not ≥50 growth — the whole point of the slip-adjusted layer.
    expect(strongState.stability).toBeGreaterThanOrEqual(30);
    expect(strongState.stability).toBeLessThanOrEqual(45);
    expect(strongState.state).toBe("relearning");
    expect(strongState.lapses).toBe(1); // priorLapses(0) + 1
    // The LOGGED grade stays the true Again(1) — no Hard-on-wrong is ever fed or logged.
    expect(strongLog.grade).toBe(1);
    expect(strongLog.engine).toBe("fsrs6-bkt2");
  });

  it("(ii) wrong-on-weak: the crush is preserved (stability <= 3)", () => {
    expect(weakState.stability).toBeLessThanOrEqual(3);
    expect(weakState.state).toBe("relearning");
  });

  it("(iii) option-count grade: 2-option correct ⇒ Hard(2), 5-option correct ⇒ Good(3)", () => {
    expect(twoOptState.lastGrade).toBe(2);
    expect(fiveOptState.lastGrade).toBe(3);
  });

  it("(iv) invariant across every ReviewLog row written: correct ⟺ grade >= 2", async () => {
    const logs = await prisma.reviewLog.findMany({
      where: { userId: { in: userIds } },
    });
    expect(logs.length).toBeGreaterThanOrEqual(4);
    for (const log of logs) {
      const answer = await prisma.testAnswer.findUnique({
        where: {
          testSessionId_questionId: {
            testSessionId: log.testSessionId!,
            questionId: log.questionId,
          },
        },
        select: { isCorrect: true },
      });
      expect(answer).not.toBeNull();
      // The calibration reader (lib/server/calibration.ts) treats grade>=2 as "correct" — that
      // equivalence must hold on every row: every wrong is grade 1, every correct is grade >= 2.
      expect(log.grade >= 2).toBe(answer!.isCorrect);
    }
  });
});
