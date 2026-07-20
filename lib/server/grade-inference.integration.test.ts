import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { startSession, submitAnswer } from "@/lib/server/test-engine";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";

// Wave 19b deliverable #2 — the guessing correction must reach PRODUCTION, not just the pure unit.
// A FIRST-ever fast-correct answer on a throwaway question is a fresh `new` card, so `recordReview`
// feeds `deriveGrade` a NEUTRAL 0.5 prior (never the R=1 of an unreviewed card). The BKT posterior at
// p0=0.5 is ≈0.78 → Good(3), so even a very fast correct answer stores `ReviewState.lastGrade` ≤ 3
// (NOT the Easy(4) the old latency-only heuristic would have written). This is the whole point of the
// fix: a lucky fast guess on an unseen item can no longer fabricate Easy.
//
// Drives the REAL submit path (startSession + submitAnswer). Self-provisions its pool via
// createOfficialQuestion; FK-safe cleanup (user before questions). clientEventId carries a per-run
// suffix — ReviewLog.clientEventId is GLOBALLY unique, so a fixed string could collide with a
// leftover row from a prior crashed run.

const RUN = Date.now();
const EVT = `grade-inference-${RUN}`;

let fixture: OfficialQuestionFixture;
let userId: string;
let sessionId: string;
let questionId: string;

beforeAll(async () => {
  fixture = await createOfficialQuestion(prisma, { label: "gradeinf", count: 1 });
  userId = fixture.userId!;
  questionId = fixture.questionId;

  sessionId = await startSession({
    userId,
    mode: "TOPIC_PRACTICE",
    categoryId: fixture.categoryId,
    topicId: fixture.topicId!,
  });
  const correct = await prisma.questionOption.findFirst({
    where: { questionId, isCorrect: true },
  });
  // Fast (well under the Easy latency band) + correct, but a FIRST exposure ⇒ neutral prior.
  await submitAnswer({
    sessionId,
    userId,
    questionId,
    selectedOptionId: correct!.id,
    latencyMs: 1000,
    clientEventId: EVT,
  });
});

afterAll(async () => {
  await fixture.cleanup();
  await prisma.$disconnect();
});

describe("guessing-corrected grade inference (Wave 19b) — production path", () => {
  it("a first-ever fast-correct answer stores ReviewState.lastGrade <= 3 (NOT Easy 4)", async () => {
    const state = await prisma.reviewState.findUnique({
      where: { userId_questionId: { userId, questionId } },
    });
    expect(state).not.toBeNull();
    expect(state!.lastGrade).not.toBeNull();
    // The anti-lucky-guess property: a neutral-prior correct answer lands at Good(3) at best.
    expect(state!.lastGrade!).toBeLessThanOrEqual(3);
    expect(state!.lastGrade!).not.toBe(4);
    // Still a correct answer, so the `correct = grade >= 2` invariant holds.
    expect(state!.lastGrade!).toBeGreaterThanOrEqual(2);
  });
});
