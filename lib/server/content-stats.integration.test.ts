import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { getContentHealth } from "@/lib/server/content-stats";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";

// Spec §E: prove the REAL server aggregation (`getContentHealth`) turns recorded TestAnswer rows
// into the headline content-quality signal. We self-provision two OFFICIAL questions (the shared
// createOfficialQuestion fixture — no hand-rolled category/topic/question) and write a KNOWN answer
// distribution directly as TestSession + TestAnswer rows so every reported number is exactly
// computable:
//
//   WRONG-KEY question: 10 answers — the keyed-correct option picked 3×, the distractor 7× → the
//     distractor out-draws the key → accuracy 0.3, avg time 20s, flags INCLUDE WRONG_KEY_SUSPECTED.
//   HEALTHY  question: 10 answers — keyed-correct option picked 8×, distractor 2× → accuracy 0.8,
//     clear of the guessing band → no actionable flag (empty flags).
//
// getContentHealth reads ALL TestAnswer rows (no user filter), so we assert only on OUR two fixture
// questions (located by id) — other rows in the shared dev DB cannot perturb the assertions. A small
// minSample (=5) clears flagQuestion's thin-data threshold without depending on the production
// default (sized for real traffic).
//
// IMPORTANT: the createOfficialQuestion helper leaves each option's `optionKey` null, but
// getContentHealth groups answers by `selectedOption.optionKey` and SKIPS rows whose picked option
// has a null key. So we patch a unique optionKey onto every fixture option BEFORE recording answers.
//
// FK-safe cleanup: every throwaway session lives under the fixture's single user, so the fixture's
// own cleanup (user → questions → topic → category) cascades all sessions/answers off both questions
// before either is deleted — re-running the suite leaves no residue.

const MIN_SAMPLE = 5; // small: a handful of answers clears flagQuestion's thin-data short-circuit

// The wrong-key distribution, as explicit literals (NOT derived) so aggregation drift is caught.
// 3 correct (key) + 7 distractor picks; times sum to 200 over 10 answers → avg 20s.
const WRONG_KEY_ANSWERS: { correct: boolean; time: number }[] = [
  { correct: true, time: 10 },
  { correct: true, time: 20 },
  { correct: true, time: 30 },
  { correct: false, time: 20 },
  { correct: false, time: 20 },
  { correct: false, time: 20 },
  { correct: false, time: 20 },
  { correct: false, time: 20 },
  { correct: false, time: 20 },
  { correct: false, time: 20 },
];

let fixture: OfficialQuestionFixture;
let wrongKeyQId: string;
let healthyQId: string;

// Fetch a question's options, assign each a globally-unique optionKey (helper leaves them null), and
// return the correct + distractor option ids.
async function keyOptions(questionId: string): Promise<{ correctId: string; distractorId: string }> {
  const opts = await prisma.questionOption.findMany({
    where: { questionId },
    orderBy: { displayOrder: "asc" },
  });
  for (let i = 0; i < opts.length; i++) {
    await prisma.questionOption.update({
      where: { id: opts[i].id },
      data: { optionKey: `${questionId}-opt-${i}` },
    });
  }
  return {
    correctId: opts.find((o) => o.isCorrect)!.id,
    distractorId: opts.find((o) => !o.isCorrect)!.id,
  };
}

beforeAll(async () => {
  // Two OFFICIAL questions (one shared throwaway category/topic/user), each with a keyed-correct
  // option and one distractor.
  fixture = await createOfficialQuestion(prisma, {
    label: "content-stats",
    count: 2,
    options: [
      { text: "the keyed-correct answer", isCorrect: true, displayOrder: 0 },
      { text: "a tempting distractor", isCorrect: false, displayOrder: 1 },
    ],
  });
  [wrongKeyQId, healthyQId] = fixture.questionIds;
  const userId = fixture.userId!;
  const categoryId = fixture.categoryId;

  const wrong = await keyOptions(wrongKeyQId);
  const healthy = await keyOptions(healthyQId);

  // TestAnswer has @@unique([testSessionId, questionId]); to pick the same question many times we use
  // a fresh session per pick. One session holds at most one answer to each fixture question, so the
  // 10 sessions carry all 10 wrong-key picks AND all 10 healthy picks.
  for (let i = 0; i < 10; i++) {
    const session = await prisma.testSession.create({
      data: {
        userId,
        categoryId,
        mode: "EXAM_SIMULATION",
        status: "COMPLETED",
        finishedAt: new Date(),
      },
    });

    const wk = WRONG_KEY_ANSWERS[i];
    await prisma.testAnswer.create({
      data: {
        testSessionId: session.id,
        questionId: wrongKeyQId,
        selectedOptionId: wk.correct ? wrong.correctId : wrong.distractorId,
        isCorrect: wk.correct,
        timeSpentSeconds: wk.time,
      },
    });

    // Healthy: first 8 pick the key (correct), last 2 pick the distractor → 8/10 = 0.8.
    const healthyCorrect = i < 8;
    await prisma.testAnswer.create({
      data: {
        testSessionId: session.id,
        questionId: healthyQId,
        selectedOptionId: healthyCorrect ? healthy.correctId : healthy.distractorId,
        isCorrect: healthyCorrect,
        timeSpentSeconds: 15,
      },
    });
  }
});

afterAll(async () => {
  // Fixture cleanup deletes the user first (cascading every session/answer off BOTH questions),
  // then the questions, topic and category — FK-safe and residue-free.
  await fixture.cleanup();
  await prisma.$disconnect();
});

describe("getContentHealth aggregation", () => {
  it("reports the wrong-key question's distribution and raises WRONG_KEY_SUSPECTED", async () => {
    const health = await getContentHealth({ minSample: MIN_SAMPLE });

    const wq = health.questions.find((q) => q.questionId === wrongKeyQId);
    expect(wq).toBeDefined();

    // Counts/accuracy/avg-time — hard-coded literals from WRONG_KEY_ANSWERS above.
    expect(wq!.timesAnswered).toBe(10);
    expect(wq!.correct).toBe(3);
    expect(wq!.accuracy).toBeCloseTo(0.3, 10);
    expect(wq!.avgTimeSeconds).toBeCloseTo(20, 10); // (10+20+30 + 7×20) / 10 = 20

    // Per-option picks: the distractor out-draws the keyed-correct option.
    const correctOpt = wq!.options.find((o) => o.isCorrect)!;
    const distractorOpt = wq!.options.find((o) => !o.isCorrect)!;
    expect(correctOpt.picks).toBe(3);
    expect(distractorOpt.picks).toBe(7);
    expect(distractorOpt.picks).toBeGreaterThan(correctOpt.picks);
    expect(distractorOpt.pickRate).toBeCloseTo(0.7, 10);

    // Elo projection (wave22-09): a fresh fixture question has no folded answers, so β is null and
    // the answer count is 0 — the admin surface shows «—» + the insufficient-data marker.
    expect(wq!.eloBeta).toBeNull();
    expect(wq!.eloAnswerCount).toBe(0);

    // The headline signal.
    expect(wq!.flags.map((f) => f.kind)).toContain("WRONG_KEY_SUSPECTED");
  });

  it("leaves a healthy question (key dominates) with no actionable flag", async () => {
    const health = await getContentHealth({ minSample: MIN_SAMPLE });

    const hq = health.questions.find((q) => q.questionId === healthyQId);
    expect(hq).toBeDefined();

    expect(hq!.timesAnswered).toBe(10);
    expect(hq!.correct).toBe(8);
    expect(hq!.accuracy).toBeCloseTo(0.8, 10);

    const correctOpt = hq!.options.find((o) => o.isCorrect)!;
    const distractorOpt = hq!.options.find((o) => !o.isCorrect)!;
    expect(correctOpt.picks).toBe(8);
    expect(distractorOpt.picks).toBe(2);

    // A healthy question over the sample threshold raises no flags at all (no INSUFFICIENT_DATA,
    // and crucially neither actionable signal).
    const kinds = hq!.flags.map((f) => f.kind);
    expect(kinds).not.toContain("WRONG_KEY_SUSPECTED");
    expect(kinds).not.toContain("LOW_DISCRIMINATION");
    expect(hq!.flags).toHaveLength(0);
  });
});
