import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { startSession, submitAnswer } from "@/lib/server/test-engine";
import { startSpacedReview, NothingDueError } from "@/lib/server/study";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";

// Wave-11 review fixes — behavioral proof for the two findings the per-task gates could not see:
//   §1 SPACED_REVIEW is DUE-only (spec §4.5): a seen-but-not-yet-due card must NOT be served early,
//      and NothingDueError fires when nothing is DUE (previously it fired only at zero SEEN cards —
//      every seen card scored positively via the forgetting/tiebreak terms).
//   §2 The per-topic latency band actually changes the PERSISTED grade through submitAnswer's real
//      transaction (previously verified only by a static grep + isolated pure tests): a topic median
//      of 1000ms tightens Easy to ≤2500ms, so a 4000ms correct answer — Easy(4) under the global
//      5000ms band — must persist as Good(3).
// Self-provisioned fixture; FK-safe cleanup; unique ids keyed by RUN (noise-proof per UX-FINDINGS).

const RUN = Date.now();

let f: OfficialQuestionFixture;
let userId: string;
let categoryId: string;
let topicId: string;
let q1: string;
let q2: string;

async function correctOption(questionId: string) {
  const opts = await prisma.questionOption.findMany({ where: { questionId } });
  return opts.find((o) => o.isCorrect)!;
}

beforeAll(async () => {
  // Four options like a real ПДР item so recordReview's Wave-20 guess floor is the production g = 1/4
  // = 0.25 (a fresh correct grades Good(3), the band-cap baseline this test asserts) — a degenerate
  // 2-option fixture would honestly grade Hard and mask the latency-band behavior under test.
  f = await createOfficialQuestion(prisma, {
    label: "w11fix",
    count: 2,
    options: [
      { text: "right", isCorrect: true, displayOrder: 0 },
      { text: "wrong-a", isCorrect: false, displayOrder: 1 },
      { text: "wrong-b", isCorrect: false, displayOrder: 2 },
      { text: "wrong-c", isCorrect: false, displayOrder: 3 },
    ],
  });
  userId = f.userId!;
  categoryId = f.categoryId;
  topicId = f.topicId!;
  q1 = f.questionIds[0];
  q2 = f.questionIds[1];
});

afterAll(async () => {
  await f.cleanup();
  await prisma.$disconnect();
});

describe("SPACED_REVIEW is due-only (wave11-review §1)", () => {
  it("a seen-but-not-due card yields NothingDueError; a due card yields a session with ONLY it", async () => {
    const now = new Date();
    const future = new Date(now.getTime() + 2 * 86_400_000);
    const past = new Date(now.getTime() - 60 * 60_000);

    // Seed q1 as SEEN but due in the FUTURE (reviewed yesterday, scheduled +2d).
    await prisma.reviewState.upsert({
      where: { userId_questionId: { userId, questionId: q1 } },
      update: { dueAt: future },
      create: {
        userId,
        questionId: q1,
        stability: 3,
        difficulty: 5,
        state: "review",
        dueAt: future,
        lastReviewedAt: new Date(now.getTime() - 86_400_000),
        reps: 1,
      },
    });

    // Nothing is DUE (q1 future-due, q2 unseen) → the typed nothing-due signal, NOT an early review.
    await expect(startSpacedReview(userId, categoryId, now)).rejects.toThrow(NothingDueError);

    // Flip q1 to past-due → the session exists and contains EXACTLY q1 (q2 is unseen; share 0).
    await prisma.reviewState.update({
      where: { userId_questionId: { userId, questionId: q1 } },
      data: { dueAt: past },
    });
    const sessionId = await startSpacedReview(userId, categoryId, now);
    const rows = await prisma.testSessionQuestion.findMany({
      where: { testSessionId: sessionId },
      select: { questionId: true },
    });
    expect(rows.map((r) => r.questionId)).toEqual([q1]);
  });
});

describe("per-topic latency band changes the persisted grade (wave11-review §2)", () => {
  it("median 1000ms tightens Easy to ≤2500ms: a 4000ms correct answer persists as Good(3), not Easy(4)", async () => {
    // Global bands would grade 4000ms as Easy (≤5000). The topic median must override.
    await prisma.topicMastery.upsert({
      where: { userId_topicId: { userId, topicId } },
      update: { medianLatencyMs: 1000 },
      create: { userId, topicId, categoryId, medianLatencyMs: 1000 },
    });

    const sessionId = await startSession({ userId, mode: "TOPIC_PRACTICE", categoryId, topicId });
    const opt = await correctOption(q2);
    const evt = `w11fix-band-${RUN}`;
    await submitAnswer({
      sessionId,
      userId,
      questionId: q2,
      selectedOptionId: opt.id,
      latencyMs: 4000,
      clientEventId: evt,
    });

    // Stored ids are server-namespaced per user (wave13-09 §D): `<userId>:<rawId>`.
    const log = await prisma.reviewLog.findUnique({ where: { clientEventId: userId + ":" + evt } });
    expect(log).not.toBeNull();
    expect(log!.latencyMs).toBe(4000);
    expect(log!.grade).toBe(3); // tightened band → Good, not the global-band Easy
  });
});
