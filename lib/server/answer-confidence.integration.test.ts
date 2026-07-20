import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/db";
import { startSession, submitAnswer } from "@/lib/server/test-engine";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";
import { setAnswerConfidenceAction } from "@/app/actions/test";
import { getCurrentUser } from "@/lib/auth";

// setAnswerConfidenceAction resolves its caller via `getCurrentUser()` and we never mint real
// cookies in the node runtime, so partial-mock the auth read to a fixture principal. The spread
// keeps the rest of `@/lib/auth` real.
vi.mock("@/lib/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth")>();
  return { ...actual, getCurrentUser: vi.fn() };
});

// wave12b-05 §D — confidence arrives AFTER the first submit, attached by a follow-up action.
// This suite drives the PRODUCTION path end to end against the real seeded SQLite DB: a real
// startSession + submitAnswer (with a clientEventId so the attempt has a ReviewLog row), then
// `setAnswerConfidenceAction`, asserting:
//   §1 success persists the confidence on BOTH the TestAnswer and that attempt's ReviewLog row;
//   §2 a repeat call with the same value is idempotent and a different value overwrites
//      (last-write-wins) — never a duplicate answer/log row;
//   §3 out-of-range confidence (0 and 5) is rejected with { error } and NO write;
//   §4 another user's session is rejected with { error } and NO write (self-only).
//
// Self-provisions its pool via createOfficialQuestion; FK-safe cleanup (user before questions).
// clientEventId carries a per-run suffix — ReviewLog.clientEventId is GLOBALLY unique, so a fixed
// string could collide with a leftover row from a prior crashed run.

const RUN = Date.now();
const EVT_CONF = `conf-followup-${RUN}`;

let fixture: OfficialQuestionFixture;
let userId: string;
let sessionId: string;
let questionId: string;

const asOwner = () =>
  vi.mocked(getCurrentUser).mockResolvedValue({
    id: userId,
    role: "USER",
  } as unknown as Awaited<ReturnType<typeof getCurrentUser>>);

/** The two rows the action targets: the answer and the attempt's ReviewLog. */
async function confidenceRows() {
  const answer = await prisma.testAnswer.findUnique({
    where: { testSessionId_questionId: { testSessionId: sessionId, questionId } },
  });
  const log = await prisma.reviewLog.findFirst({
    where: { testSessionId: sessionId, questionId },
    orderBy: { reviewedAt: "desc" },
  });
  return { answer, log };
}

async function rowCounts() {
  const answers = await prisma.testAnswer.count({
    where: { testSessionId: sessionId, questionId },
  });
  const logs = await prisma.reviewLog.count({
    where: { testSessionId: sessionId, questionId },
  });
  return { answers, logs };
}

beforeAll(async () => {
  fixture = await createOfficialQuestion(prisma, { label: "conf", count: 1 });
  userId = fixture.userId!;
  questionId = fixture.questionId;

  // One real submitted attempt, WITHOUT confidence (it arrives via the follow-up action) but
  // WITH a clientEventId so recordReview writes the ReviewLog row the action must also update.
  sessionId = await startSession({
    userId,
    mode: "TOPIC_PRACTICE",
    categoryId: fixture.categoryId,
    topicId: fixture.topicId!,
  });
  const correct = await prisma.questionOption.findFirst({
    where: { questionId, isCorrect: true },
  });
  await submitAnswer({
    sessionId,
    userId,
    questionId,
    selectedOptionId: correct!.id,
    clientEventId: EVT_CONF,
  });
});

afterAll(async () => {
  await fixture.cleanup();
  await prisma.$disconnect();
});

describe("setAnswerConfidenceAction (wave12b-05 §D)", () => {
  it("persists confidence on BOTH the TestAnswer and the attempt's ReviewLog row (§1)", async () => {
    asOwner();
    const before = await confidenceRows();
    expect(before.answer!.confidence).toBeNull(); // submit carried no confidence
    expect(before.log!.confidence).toBeNull();

    const res = await setAnswerConfidenceAction({ sessionId, questionId, confidence: 3 });
    expect(res).toEqual({ ok: true });

    const after = await confidenceRows();
    expect(after.answer!.confidence).toBe(3);
    expect(after.log!.confidence).toBe(3);
    // The attempt's own log, not a new row — stored server-namespaced (wave13-09 §D).
    expect(after.log!.clientEventId).toBe(userId + ":" + EVT_CONF);
  });

  it("repeat same-value call is idempotent; a different value overwrites, no duplicate rows (§2)", async () => {
    asOwner();
    const replay = await setAnswerConfidenceAction({ sessionId, questionId, confidence: 3 });
    expect(replay).toEqual({ ok: true });
    expect((await confidenceRows()).answer!.confidence).toBe(3);
    expect(await rowCounts()).toEqual({ answers: 1, logs: 1 });

    const overwrite = await setAnswerConfidenceAction({ sessionId, questionId, confidence: 2 });
    expect(overwrite).toEqual({ ok: true });
    const rows = await confidenceRows();
    expect(rows.answer!.confidence).toBe(2); // last-write-wins
    expect(rows.log!.confidence).toBe(2);
    expect(await rowCounts()).toEqual({ answers: 1, logs: 1 });
  });

  it("rejects confidence 0 and 5 with { error } and NO write (§3)", async () => {
    asOwner();
    for (const confidence of [0, 5]) {
      const res = await setAnswerConfidenceAction({ sessionId, questionId, confidence });
      expect("error" in res).toBe(true);
    }
    const rows = await confidenceRows();
    expect(rows.answer!.confidence).toBe(2); // untouched since §2
    expect(rows.log!.confidence).toBe(2);
  });

  it("rejects another user's session with { error } and NO write (§4 self-only)", async () => {
    // The ownership check filters `{ id: sessionId, userId: user.id }` — a non-owner principal
    // (no DB row needed, only the id is read) must never reach the write path.
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: `not-the-owner-${RUN}`,
      role: "USER",
    } as unknown as Awaited<ReturnType<typeof getCurrentUser>>);

    const res = await setAnswerConfidenceAction({ sessionId, questionId, confidence: 4 });
    expect("error" in res).toBe(true);

    const rows = await confidenceRows();
    expect(rows.answer!.confidence).toBe(2); // still the owner's last value
    expect(rows.log!.confidence).toBe(2);
  });
});
