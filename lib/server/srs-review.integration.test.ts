import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/db";
import { startSession, submitAnswer } from "@/lib/server/test-engine";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";
import { importOfficial } from "@/scripts/import-official";
import { submitAnswerAction, startTestAction } from "@/app/actions/test";
import { startTestSchema } from "@/lib/validation";
import { getCurrentUser } from "@/lib/auth";

// The action-boundary tests (wave10f §E) drive `submitAnswerAction`/`startTestAction`, which call
// `requireUser()` → `getCurrentUser()`. We never mint real cookies in the node runtime, so mock the
// auth read to a fixture principal. The spread keeps the rest of `@/lib/auth` real; the direct-call
// §2–§5 tests below never touch auth so the mock is inert for them.
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getCurrentUser: vi.fn() };
});

// Spec §G — end-to-end proof of the FSRS dual-write (spec §F) against the real seeded SQLite DB.
//
// submitAnswer() commits the answer row, the mistake reconcile, AND the FSRS review (recordReview →
// lib/server/study.ts) in ONE transaction. This suite proves that contract end to end:
//   §2 a CORRECT answer creates a per-user ReviewState (advanced past `new`, positive stability, a
//      future dueAt, reps=1) and appends exactly one ReviewLog.
//   §3 replaying the SAME answer with the SAME clientEventId is a no-op — the ReviewLog count stays 1
//      and the state is NOT re-applied (offline-replay idempotency, spec §3.4).
//   §4 a WRONG answer records grade 1; on an item already in `review` the lapse is reflected
//      (state → relearning, lapses↑, lastGrade=1).
//   §5 re-running importOfficial preserves the fixture question/option ids AND the ReviewState/
//      ReviewLog rows still reference those same valid ids (the stable-key architecture).
//
// The suite self-provisions its data via createOfficialQuestion — a throwaway category+topic of
// published, isDemo=false, category-connected questions (a real LIVE pool) — so it never asserts
// seeded content. Its FK-safe cleanup tears everything down afterwards (user first so its
// ReviewState/ReviewLog/session children cascade, then questions/topic/category). Because the
// fixture questions carry questionKey=null, importOfficial's reconcile (which only touches keyed
// OFFICIAL rows) leaves them untouched — so their ids are stable across a content re-import.

const RUN = Date.now();
const EVT_Q1_CORRECT = `srs-q1-correct-${RUN}`;
const EVT_Q2_EASY = `srs-q2-easy-${RUN}`;
const EVT_Q2_LAPSE = `srs-q2-lapse-${RUN}`;
const EVT_QA_ACTION = `srs-qa-action-${RUN}`;
const EVT_QB_REPLAY = `srs-qb-replay-${RUN}`;

let fixture: OfficialQuestionFixture;
let userId: string;
let categoryId: string;
let topicId: string;
let q1: string; // driven through the correct/idempotent path (§2, §3)
let q2: string; // driven into `review` then lapsed (§4)

async function optionsFor(questionId: string) {
  const opts = await prisma.questionOption.findMany({ where: { questionId } });
  return {
    correct: opts.find((o) => o.isCorrect)!,
    wrong: opts.find((o) => !o.isCorrect)!,
  };
}

beforeAll(async () => {
  // Four options like a real ПДР item, so recordReview's Wave-20 guess floor is g = 1/4 = 0.25 (the
  // production default) and a fresh correct grades Good(3) — not the degenerate 2-option g = 0.45 that
  // would honestly grade Hard. The two SRS questions are cloned from this shared 4-option set.
  fixture = await createOfficialQuestion(prisma, {
    label: "srs",
    count: 2,
    options: [
      { text: "right", isCorrect: true, displayOrder: 0 },
      { text: "wrong-a", isCorrect: false, displayOrder: 1 },
      { text: "wrong-b", isCorrect: false, displayOrder: 2 },
      { text: "wrong-c", isCorrect: false, displayOrder: 3 },
    ],
  });
  userId = fixture.userId!;
  categoryId = fixture.categoryId;
  topicId = fixture.topicId!;
  q1 = fixture.questionIds[0];
  q2 = fixture.questionIds[1];
});

afterAll(async () => {
  // FK-safe: deleting the user cascades its ReviewState/ReviewLog/session rows, freeing the
  // questions; then questions/topic/category. Only fixture-created rows are removed.
  await fixture.cleanup();
  await prisma.$disconnect();
});

describe("FSRS dual-write integration (spec §G)", () => {
  it("a correct answer writes a ReviewState and exactly one ReviewLog (§2)", async () => {
    const sessionId = await startSession({ userId, mode: "TOPIC_PRACTICE", categoryId, topicId });
    // Sanity: the throwaway pool is exactly the two fixture questions.
    const sqCount = await prisma.testSessionQuestion.count({ where: { testSessionId: sessionId } });
    expect(sqCount).toBe(2);

    const { correct } = await optionsFor(q1);
    const t0 = Date.now();
    await submitAnswer({
      sessionId,
      userId,
      questionId: q1,
      selectedOptionId: correct.id,
      clientEventId: EVT_Q1_CORRECT,
    });

    const state = await prisma.reviewState.findUnique({
      where: { userId_questionId: { userId, questionId: q1 } },
    });
    expect(state).not.toBeNull();
    expect(state!.state).not.toBe("new"); // correct → Good → graduated out of `new`
    expect(state!.stability).toBeGreaterThan(0);
    expect(state!.dueAt).not.toBeNull();
    expect(state!.dueAt!.getTime()).toBeGreaterThan(t0); // scheduled into the future
    expect(state!.reps).toBe(1);
    expect(state!.lastGrade).toBe(3); // deriveGrade(correct, no latency/conf) = Good

    const logCount = await prisma.reviewLog.count({ where: { userId, questionId: q1 } });
    expect(logCount).toBe(1);
    const log = await prisma.reviewLog.findFirst({ where: { userId, questionId: q1 } });
    expect(log!.grade).toBe(3);
    // Stored under the server-side per-user namespace (wave13-09 §D) — concat on purpose, an
    // oracle for the `<userId>:<rawId>` format independent of the namespacedEventId helper.
    expect(log!.clientEventId).toBe(userId + ":" + EVT_Q1_CORRECT);
    // Grade-semantics segmentation tag (2026-07-13): literal on purpose — bumping
    // REVIEW_ENGINE_VERSION must consciously update this pin (it marks a semantics boundary).
    expect(log!.engine).toBe("fsrs6-bkt2");
  });

  it("replaying the same clientEventId does not double-apply (§3)", async () => {
    // A fresh session, but the SAME answer with the SAME clientEventId → offline-replay no-op.
    const sessionId = await startSession({ userId, mode: "TOPIC_PRACTICE", categoryId, topicId });
    const { correct } = await optionsFor(q1);
    await submitAnswer({
      sessionId,
      userId,
      questionId: q1,
      selectedOptionId: correct.id,
      clientEventId: EVT_Q1_CORRECT,
    });

    const logCount = await prisma.reviewLog.count({ where: { userId, questionId: q1 } });
    expect(logCount).toBe(1); // STILL one — nothing appended on replay

    const state = await prisma.reviewState.findUnique({
      where: { userId_questionId: { userId, questionId: q1 } },
    });
    expect(state!.reps).toBe(1); // state not re-advanced
  });

  it("a wrong answer records grade 1 and reflects the lapse (§4)", async () => {
    const { correct, wrong } = await optionsFor(q2);

    // First drive q2 into `review` with TWO correct answers across two sessions. Under the Wave-19b
    // guessing correction, a first-exposure correct is Good(3) (neutral prior, latency/confidence no
    // longer promote to Easy), which sends a `new` card to `learning`; a second correct then
    // graduates learning → review. (An Easy(4) on a first exposure is no longer reachable — a fresh
    // card has no strong prior belief to justify it.)
    const s1 = await startSession({ userId, mode: "TOPIC_PRACTICE", categoryId, topicId });
    await submitAnswer({
      sessionId: s1,
      userId,
      questionId: q2,
      selectedOptionId: correct.id,
      latencyMs: 1000,
      confidence: 4,
      clientEventId: EVT_Q2_EASY,
    });
    const s1b = await startSession({ userId, mode: "TOPIC_PRACTICE", categoryId, topicId });
    await submitAnswer({
      sessionId: s1b,
      userId,
      questionId: q2,
      selectedOptionId: correct.id,
      latencyMs: 1000,
      confidence: 4,
      clientEventId: `srs-q2-graduate-${RUN}`,
    });
    const afterEasy = await prisma.reviewState.findUnique({
      where: { userId_questionId: { userId, questionId: q2 } },
    });
    expect(afterEasy!.state).toBe("review");
    expect(afterEasy!.lapses).toBe(0);

    // Now a WRONG answer in a LATER session → Again(1): a lapse from `review` → relearning, lapses++.
    // (A later session, not the same one: FSRS records the FIRST attempt per question per session —
    // a same-session re-answer is an answer CHANGE, covered by §6 below.)
    const s2 = await startSession({ userId, mode: "TOPIC_PRACTICE", categoryId, topicId });
    await submitAnswer({
      sessionId: s2,
      userId,
      questionId: q2,
      selectedOptionId: wrong.id,
      clientEventId: EVT_Q2_LAPSE,
    });

    const logs = await prisma.reviewLog.findMany({ where: { userId, questionId: q2 } });
    expect(logs.length).toBe(3); // two graduating corrects + the appended lapse
    expect(logs.some((l) => l.grade === 1)).toBe(true); // the appended lapse log

    const state = await prisma.reviewState.findUnique({
      where: { userId_questionId: { userId, questionId: q2 } },
    });
    expect(state!.lastGrade).toBe(1); // failure recorded
    expect(state!.state).toBe("relearning"); // lapse transition
    expect(state!.lapses).toBe(1); // lapse counted
  });

  it("a same-session answer CHANGE updates the answer but not the FSRS state (§6 first-attempt-only)", async () => {
    // Post-wave10f-review fix: retrieval happens once per question per session. Changing the selected
    // option afterwards (the exam allows re-selection; a mis-tap correction) must update TestAnswer —
    // the exam scores the FINAL choice — but must NOT re-advance or spuriously lapse the FSRS state.
    const { correct, wrong } = await optionsFor(q1);
    const sessionId = await startSession({ userId, mode: "TOPIC_PRACTICE", categoryId, topicId });

    const stateBefore = await prisma.reviewState.findUnique({
      where: { userId_questionId: { userId, questionId: q1 } },
    });
    const logsBefore = await prisma.reviewLog.count({ where: { userId, questionId: q1 } });

    // First attempt this session (a real review — new clientEventId).
    await submitAnswer({
      sessionId,
      userId,
      questionId: q1,
      selectedOptionId: correct.id,
      clientEventId: `srs-q1-first-${RUN}`,
    });
    const logsAfterFirst = await prisma.reviewLog.count({ where: { userId, questionId: q1 } });
    expect(logsAfterFirst).toBe(logsBefore + 1);
    const stateAfterFirst = await prisma.reviewState.findUnique({
      where: { userId_questionId: { userId, questionId: q1 } },
    });
    expect(stateAfterFirst!.reps).toBe(stateBefore!.reps + 1);

    // CHANGE the answer to a wrong option (new event id — a genuine re-selection, not a replay).
    await submitAnswer({
      sessionId,
      userId,
      questionId: q1,
      selectedOptionId: wrong.id,
      clientEventId: `srs-q1-change-${RUN}`,
    });

    // The answer row reflects the final (wrong) choice…
    const answer = await prisma.testAnswer.findUnique({
      where: { testSessionId_questionId: { testSessionId: sessionId, questionId: q1 } },
    });
    expect(answer!.selectedOptionId).toBe(wrong.id);
    expect(answer!.isCorrect).toBe(false);

    // …but the FSRS spine is untouched: no extra ReviewLog, no lapse, no re-advance.
    const logsAfterChange = await prisma.reviewLog.count({ where: { userId, questionId: q1 } });
    expect(logsAfterChange).toBe(logsAfterFirst);
    const stateAfterChange = await prisma.reviewState.findUnique({
      where: { userId_questionId: { userId, questionId: q1 } },
    });
    expect(stateAfterChange!.reps).toBe(stateAfterFirst!.reps);
    expect(stateAfterChange!.lapses).toBe(stateAfterFirst!.lapses);
    expect(stateAfterChange!.lastGrade).toBe(stateAfterFirst!.lastGrade);
  });

  it(
    "re-running importOfficial preserves fixture ids and SRS references (§5)",
    async () => {
      // Capture the fixture ids and the SRS rows' referenced ids BEFORE the re-import.
      const optsBefore = await prisma.questionOption.findMany({
        where: { questionId: { in: [q1, q2] } },
        select: { id: true },
      });
      const optionIdsBefore = optsBefore.map((o) => o.id).sort();

      await importOfficial(prisma);

      // Fixture questions (questionKey=null) are untouched by the keyed reconcile: same ids survive.
      const qAfter = await prisma.question.findMany({
        where: { id: { in: [q1, q2] } },
        select: { id: true },
      });
      expect(qAfter.map((q) => q.id).sort()).toEqual([q1, q2].sort());

      const optsAfter = await prisma.questionOption.findMany({
        where: { questionId: { in: [q1, q2] } },
        select: { id: true },
      });
      expect(optsAfter.map((o) => o.id).sort()).toEqual(optionIdsBefore);

      // The previously-written SRS rows still reference the same (still-valid) question ids.
      const state = await prisma.reviewState.findUnique({
        where: { userId_questionId: { userId, questionId: q1 } },
      });
      expect(state).not.toBeNull();
      expect(state!.questionId).toBe(q1);
      const refQ = await prisma.question.findUnique({ where: { id: state!.questionId } });
      expect(refQ).not.toBeNull();

      const logs = await prisma.reviewLog.findMany({
        where: { userId, questionId: { in: [q1, q2] } },
        select: { questionId: true },
      });
      expect(logs.length).toBeGreaterThan(0);
      for (const l of logs) {
        expect([q1, q2]).toContain(l.questionId);
        const refLogQ = await prisma.question.findUnique({ where: { id: l.questionId } });
        expect(refLogQ).not.toBeNull();
      }
    },
    180_000,
  );
});

// wave10f §E — the SRS plumbing must survive the ACTION boundary, not just a direct submitAnswer()
// call (the direct-call bypass is exactly how these regressions went unseen). Three concerns:
//   §E1 unstrip: submitAnswerAction validates its input with `submitAnswerSchema` (zod strips unknown
//       keys), so `clientEventId`/`latencyMs` must be DECLARED there and reach `recordReview` — proven
//       by the persisted ReviewLog carrying both values.
//   §E2 whole-transaction idempotency: replaying a full duplicate answer with the same clientEventId
//       must rewrite NOTHING — TestAnswer unchanged, the mistake `correctRepeatCount` not advanced, and
//       exactly one ReviewLog for that event.
//   §E3 the ADAPTIVE_REVIEW mode is now STARTABLE (Wave-11 §H5: STARTABLE_MODES === TEST_MODES) —
//       `startTestSchema` accepts it and `startTestAction` opens a real ADAPTIVE_REVIEW session.
// Self-provisions its OWN official fixture so it never collides with the §2–§5 pool above.
describe("SRS plumbing through the action boundary (wave10f §E)", () => {
  let f: OfficialQuestionFixture;
  let uId: string;
  let cId: string;
  let tId: string;
  let qa: string; // §E1 validation-through-action
  let qb: string; // §E2 duplicate replay

  const asPrincipal = () =>
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: uId,
      role: "USER",
      selectedCategoryId: cId,
    } as unknown as Awaited<ReturnType<typeof getCurrentUser>>);

  beforeAll(async () => {
    f = await createOfficialQuestion(prisma, { label: "srs-action", count: 2 });
    uId = f.userId!;
    cId = f.categoryId;
    tId = f.topicId!;
    qa = f.questionIds[0];
    qb = f.questionIds[1];
  });

  afterAll(async () => {
    // The file-level afterAll owns $disconnect; here just tear down this fixture's rows.
    await f.cleanup();
  });

  it("submitAnswerAction forwards clientEventId + latencyMs to the persisted review (§E1 unstrip)", async () => {
    asPrincipal();
    const sessionId = await startSession({ userId: uId, mode: "TOPIC_PRACTICE", categoryId: cId, topicId: tId });
    const { correct } = await optionsFor(qa);

    await submitAnswerAction({
      sessionId,
      questionId: qa,
      selectedOptionId: correct.id,
      latencyMs: 4321,
      clientEventId: EVT_QA_ACTION,
    });

    // If the schema stripped these fields, no ReviewLog would carry this clientEventId and latencyMs
    // would be null. Their presence proves the values crossed the action's zod parse into recordReview.
    // Stored ids are server-namespaced per user (wave13-09 §D): `<userId>:<rawId>`.
    const log = await prisma.reviewLog.findUnique({
      where: { clientEventId: uId + ":" + EVT_QA_ACTION },
    });
    expect(log).not.toBeNull();
    expect(log!.userId).toBe(uId);
    expect(log!.questionId).toBe(qa);
    expect(log!.latencyMs).toBe(4321);
    expect(log!.clientEventId).toBe(uId + ":" + EVT_QA_ACTION);
  });

  it("a duplicate replay through the action rewrites nothing (§E2 whole-transaction idempotency)", async () => {
    asPrincipal();
    const { correct, wrong } = await optionsFor(qb);

    // Seed an ACTIVE mistake with a WRONG answer (no clientEventId — not the replay under test).
    const s1 = await startSession({ userId: uId, mode: "TOPIC_PRACTICE", categoryId: cId, topicId: tId });
    await submitAnswer({ sessionId: s1, userId: uId, questionId: qb, selectedOptionId: wrong.id });
    const mistakeAfterWrong = await prisma.userMistake.findUnique({
      where: { userId_questionId: { userId: uId, questionId: qb } },
    });
    expect(mistakeAfterWrong!.correctRepeatCount).toBe(0);

    // Answer CORRECTLY once through the action with the event id under test → advances the mistake.
    const s2 = await startSession({ userId: uId, mode: "TOPIC_PRACTICE", categoryId: cId, topicId: tId });
    await submitAnswerAction({
      sessionId: s2,
      questionId: qb,
      selectedOptionId: correct.id,
      clientEventId: EVT_QB_REPLAY,
    });
    const answerAfterFirst = await prisma.testAnswer.findUnique({
      where: { testSessionId_questionId: { testSessionId: s2, questionId: qb } },
    });
    expect(answerAfterFirst).not.toBeNull();
    const mistakeAfterCorrect = await prisma.userMistake.findUnique({
      where: { userId_questionId: { userId: uId, questionId: qb } },
    });
    expect(mistakeAfterCorrect!.correctRepeatCount).toBe(1); // one correct repeat advanced

    // REPLAY the exact same answer + clientEventId — the whole transaction must no-op.
    await submitAnswerAction({
      sessionId: s2,
      questionId: qb,
      selectedOptionId: correct.id,
      clientEventId: EVT_QB_REPLAY,
    });

    // TestAnswer not rewritten (answeredAt + selectedOptionId identical).
    const answerAfterReplay = await prisma.testAnswer.findUnique({
      where: { testSessionId_questionId: { testSessionId: s2, questionId: qb } },
    });
    expect(answerAfterReplay!.answeredAt.getTime()).toBe(answerAfterFirst!.answeredAt.getTime());
    expect(answerAfterReplay!.selectedOptionId).toBe(answerAfterFirst!.selectedOptionId);

    // Mistake correctRepeatCount NOT advanced a second time.
    const mistakeAfterReplay = await prisma.userMistake.findUnique({
      where: { userId_questionId: { userId: uId, questionId: qb } },
    });
    expect(mistakeAfterReplay!.correctRepeatCount).toBe(1);

    // Exactly ONE ReviewLog for that event (stored under user B's namespace, wave13-09 §D).
    const logCount = await prisma.reviewLog.count({
      where: { clientEventId: uId + ":" + EVT_QB_REPLAY },
    });
    expect(logCount).toBe(1);
  });

  it("ADAPTIVE_REVIEW is a startable mode — schema accepts it and startTestAction opens a session (§E3, Wave-11 §H5)", async () => {
    // Wave-11 made ADAPTIVE_REVIEW startable (STARTABLE_MODES === TEST_MODES) — the schema accepts it.
    expect(startTestSchema.safeParse({ mode: "ADAPTIVE_REVIEW" }).success).toBe(true);

    asPrincipal();
    const before = await prisma.testSession.count({ where: { userId: uId, mode: "ADAPTIVE_REVIEW" } });
    const fd = new FormData();
    fd.set("mode", "ADAPTIVE_REVIEW");
    // On success the action redirect()s to /test/[id] (Next redirect throws) AFTER starting the
    // session — startAdaptiveReview backfills unseen questions from the fixture category.
    await expect(startTestAction(fd)).rejects.toThrow();
    const after = await prisma.testSession.count({ where: { userId: uId, mode: "ADAPTIVE_REVIEW" } });
    expect(after).toBe(before + 1);
  });
});

// wave13-09 §D — per-user clientEventId namespacing. The SAME raw id from two DIFFERENT users must
// not replay-block across users (the server stores `<userId>:<rawId>`, so global uniqueness implies
// per-user uniqueness), while a same-user replay of that raw id stays a whole-transaction no-op.
// Self-provisions one fixture (own user + question) per simulated device owner.
describe("per-user clientEventId namespacing (wave13-09 §D)", () => {
  const EVT_SHARED = `shared-${RUN}`; // one raw id, deliberately reused across both users
  let fa: OfficialQuestionFixture;
  let fb: OfficialQuestionFixture;

  beforeAll(async () => {
    fa = await createOfficialQuestion(prisma, { label: "ns-a", count: 1 });
    fb = await createOfficialQuestion(prisma, { label: "ns-b", count: 1 });
  });

  afterAll(async () => {
    await fa.cleanup();
    await fb.cleanup();
  });

  it("two users sharing one raw id both record; a same-user replay still no-ops (§4)", async () => {
    // User A answers correctly, carrying the shared raw id.
    const sessionA = await startSession({
      userId: fa.userId!,
      mode: "TOPIC_PRACTICE",
      categoryId: fa.categoryId,
      topicId: fa.topicId!,
    });
    const aOpts = await optionsFor(fa.questionId);
    await submitAnswer({
      sessionId: sessionA,
      userId: fa.userId!,
      questionId: fa.questionId,
      selectedOptionId: aOpts.correct.id,
      clientEventId: EVT_SHARED,
    });

    // User B answers with the SAME raw id — must NOT be replay-blocked by A's row (§4a).
    const sessionB = await startSession({
      userId: fb.userId!,
      mode: "TOPIC_PRACTICE",
      categoryId: fb.categoryId,
      topicId: fb.topicId!,
    });
    const bOpts = await optionsFor(fb.questionId);
    await submitAnswer({
      sessionId: sessionB,
      userId: fb.userId!,
      questionId: fb.questionId,
      selectedOptionId: bOpts.correct.id,
      clientEventId: EVT_SHARED,
    });

    // TWO rows exist, each under its owner's prefix (concat on purpose — an oracle for the
    // `<userId>:<rawId>` format independent of the namespacedEventId helper).
    const logA = await prisma.reviewLog.findUnique({
      where: { clientEventId: fa.userId! + ":" + EVT_SHARED },
    });
    const logB = await prisma.reviewLog.findUnique({
      where: { clientEventId: fb.userId! + ":" + EVT_SHARED },
    });
    expect(logA).not.toBeNull();
    expect(logA!.userId).toBe(fa.userId);
    expect(logB).not.toBeNull();
    expect(logB!.userId).toBe(fb.userId);

    // BOTH users' states advanced — cross-user replay-blocking is gone.
    const stateA = await prisma.reviewState.findUnique({
      where: { userId_questionId: { userId: fa.userId!, questionId: fa.questionId } },
    });
    const stateB = await prisma.reviewState.findUnique({
      where: { userId_questionId: { userId: fb.userId!, questionId: fb.questionId } },
    });
    expect(stateA!.reps).toBe(1);
    expect(stateB!.reps).toBe(1);

    // §4b — user A replays the same raw id with a DIFFERENT option: the whole tx no-ops BEFORE the
    // TestAnswer upsert, so the stored answer keeps the original (correct) choice and the FSRS
    // state is not re-applied.
    await submitAnswer({
      sessionId: sessionA,
      userId: fa.userId!,
      questionId: fa.questionId,
      selectedOptionId: aOpts.wrong.id,
      clientEventId: EVT_SHARED,
    });

    const logCountA = await prisma.reviewLog.count({
      where: { clientEventId: fa.userId! + ":" + EVT_SHARED },
    });
    expect(logCountA).toBe(1); // still exactly one row for A
    const answerA = await prisma.testAnswer.findUnique({
      where: {
        testSessionId_questionId: { testSessionId: sessionA, questionId: fa.questionId },
      },
    });
    expect(answerA!.selectedOptionId).toBe(aOpts.correct.id); // replay did not rewrite the answer
    const stateAfterReplay = await prisma.reviewState.findUnique({
      where: { userId_questionId: { userId: fa.userId!, questionId: fa.questionId } },
    });
    expect(stateAfterReplay!.reps).toBe(stateA!.reps);
    expect(stateAfterReplay!.stability).toBe(stateA!.stability);
  });
});
