import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { POST } from "@/app/api/review-sync/route";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";
import { getCurrentUser } from "@/lib/auth";

// PRODUCTION-PATH proof for POST /api/review-sync (spec §D): batch replay idempotence, out-of-range
// reviewedAt clamped into [now − 7d, now], foreign-session items rejected PER-ITEM without failing
// the batch, unauth/oversize nacked with zero writes. Drives the EXPORTED route POST with a real
// NextRequest (the /api/track technique); auth via partial-mocked getCurrentUser. Fixtures are a
// throwaway official pool (shared helper) + directly-created IN_PROGRESS sessions — submitAnswer
// only checks the session exists, is IN_PROGRESS and belongs to the user, so no TestSessionQuestion
// rows are needed. Expected namespaced event ids are built by CONCAT (never a template literal and
// never via namespacedEventId — the oracle must not follow the implementation).

// getCurrentUser reads the request cookie store (next/headers) which isn't available in the test
// runtime, so we mock it: default = the fixture user, overridden per-case (unauth).
vi.mock("@/lib/auth", async (orig) => ({
  ...(await orig<typeof import("@/lib/auth")>()),
  getCurrentUser: vi.fn(async () => null),
}));

// Per-run token so a leftover ReviewLog row from a prior crashed run can never satisfy (or
// silently no-op) this run's replay guard.
const RUN = `w13sync-${Date.now()}`;

let fixture: OfficialQuestionFixture;
let unpublished: OfficialQuestionFixture;
let userId: string;
let sessionId: string;
let otherUserId: string;
let otherSessionId: string;
/** questionId → its correct option id. */
const correctOption = new Map<string, string>();

function asSessionUser(id: string) {
  return { id, role: "USER" } as unknown as Awaited<ReturnType<typeof getCurrentUser>>;
}

/** Expected STORED clientEventId for a raw id sent by the fixture user. */
function ns(rawId: string): string {
  return userId + ":" + rawId;
}

async function postSync(body: unknown): Promise<Response> {
  const req = new NextRequest("http://localhost/api/review-sync", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return POST(req);
}

function validItem(questionId: string, rawEventId: string, reviewedAt: Date) {
  return {
    sessionId,
    questionId,
    selectedOptionId: correctOption.get(questionId)!,
    latencyMs: 1200,
    clientEventId: rawEventId,
    reviewedAt: reviewedAt.toISOString(),
  };
}

beforeAll(async () => {
  // Fixture user + category + 8 published OFFICIAL questions (distinct question per case — the
  // TestAnswer @@unique([testSessionId, questionId]) and first-attempt-only FSRS never interfere).
  fixture = await createOfficialQuestion(prisma, { label: "w13sync", count: 10 });
  userId = fixture.userId!;
  const options = await prisma.questionOption.findMany({
    where: { questionId: { in: fixture.questionIds }, isCorrect: true },
  });
  for (const o of options) correctOption.set(o.questionId, o.id);

  // An UNPUBLISHED question (own throwaway category/topic, no extra user) — the sessionless
  // servability-rejection case. Never earns rows, so its cleanup stays FK-free.
  unpublished = await createOfficialQuestion(prisma, {
    label: "w13sync-unpub",
    isPublished: false,
    withUser: false,
  });

  const session = await prisma.testSession.create({
    data: { userId, mode: "MIXED_PRACTICE", status: "IN_PROGRESS" },
  });
  sessionId = session.id;

  // A SECOND user with their own IN_PROGRESS session — the foreign-session case.
  const other = await prisma.user.create({
    data: {
      name: "w13sync other",
      email: `w13sync-other-${Date.now()}@test.local`,
      passwordHash: "x",
    },
  });
  otherUserId = other.id;
  const otherSession = await prisma.testSession.create({
    data: { userId: otherUserId, mode: "MIXED_PRACTICE", status: "IN_PROGRESS" },
  });
  otherSessionId = otherSession.id;
});

beforeEach(() => {
  vi.mocked(getCurrentUser).mockResolvedValue(asSessionUser(userId));
});

afterAll(async () => {
  // FK-safe: users first (sessions/answers/ReviewLog/ReviewState cascade, freeing the
  // Restrict question FKs), then the fixture's questions/topic/category.
  await prisma.user.delete({ where: { id: otherUserId } }).catch(() => undefined);
  await unpublished.cleanup();
  await fixture.cleanup();
  await prisma.$disconnect();
});

describe("POST /api/review-sync", () => {
  // Shared between (a) and (b): the replay must be the byte-identical batch.
  let batchA = "";
  const rawA1 = `${RUN}-a1`;
  const rawA2 = `${RUN}-a2`;
  let stateBefore: Array<{ questionId: string; reps: number; stability: number }> = [];

  it("(a) applies a batch of 2 valid items: TestAnswer + namespaced ReviewLog rows", async () => {
    const [q1, q2] = fixture.questionIds;
    batchA = JSON.stringify([
      validItem(q1, rawA1, new Date(Date.now() - 60_000)),
      validItem(q2, rawA2, new Date()),
    ]);

    const res = await postSync(batchA);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.results).toHaveLength(2);
    expect(json.results.find((r: { clientEventId: string }) => r.clientEventId === rawA1)?.status).toBe("applied");
    expect(json.results.find((r: { clientEventId: string }) => r.clientEventId === rawA2)?.status).toBe("applied");

    const answers = await prisma.testAnswer.findMany({ where: { testSessionId: sessionId } });
    expect(answers).toHaveLength(2);
    expect(answers.map((a) => a.questionId).sort()).toEqual([q1, q2].sort());

    const logs = await prisma.reviewLog.findMany({
      where: { clientEventId: { in: [ns(rawA1), ns(rawA2)] } },
    });
    expect(logs).toHaveLength(2);

    stateBefore = (
      await prisma.reviewState.findMany({ where: { userId, questionId: { in: [q1, q2] } } })
    ).map((s) => ({ questionId: s.questionId, reps: s.reps, stability: s.stability }));
    expect(stateBefore).toHaveLength(2);
  });

  it("(b) replaying the byte-identical batch is a whole-tx no-op", async () => {
    const [q1, q2] = fixture.questionIds;
    const answersBefore = await prisma.testAnswer.findMany({
      where: { testSessionId: sessionId },
      orderBy: { questionId: "asc" },
    });

    const res = await postSync(batchA);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);

    const logCount = await prisma.reviewLog.count({
      where: { clientEventId: { in: [ns(rawA1), ns(rawA2)] } },
    });
    expect(logCount).toBe(2);

    const stateAfter = await prisma.reviewState.findMany({
      where: { userId, questionId: { in: [q1, q2] } },
    });
    expect(stateAfter).toHaveLength(2);
    for (const after of stateAfter) {
      const before = stateBefore.find((s) => s.questionId === after.questionId)!;
      expect(after.reps).toBe(1);
      expect(before.reps).toBe(1);
      expect(after.stability).toBe(before.stability);
    }

    const answersAfter = await prisma.testAnswer.findMany({
      where: { testSessionId: sessionId },
      orderBy: { questionId: "asc" },
    });
    expect(answersAfter.map((a) => a.selectedOptionId)).toEqual(
      answersBefore.map((a) => a.selectedOptionId),
    );
  });

  it("(c) clamps a reviewedAt 8 days in the past up to the now − 7d floor", async () => {
    const q3 = fixture.questionIds[2];
    const raw = `${RUN}-clamp-low`;
    const testNow = Date.now();

    const res = await postSync([validItem(q3, raw, new Date(testNow - 8 * 86400000))]);
    expect((await res.json()).ok).toBe(true);

    const log = await prisma.reviewLog.findUnique({ where: { clientEventId: ns(raw) } });
    expect(log).not.toBeNull();
    const floor = testNow - 7 * 86400000;
    expect(Math.abs(log!.reviewedAt.getTime() - floor)).toBeLessThan(60_000);
  });

  it("(d) clamps a future reviewedAt (now + 1h) down to server now", async () => {
    const q4 = fixture.questionIds[3];
    const raw = `${RUN}-clamp-future`;

    const res = await postSync([validItem(q4, raw, new Date(Date.now() + 3_600_000))]);
    expect((await res.json()).ok).toBe(true);

    const log = await prisma.reviewLog.findUnique({ where: { clientEventId: ns(raw) } });
    expect(log).not.toBeNull();
    expect(log!.reviewedAt.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("(e) rejects a foreign-session item per-item without failing the batch", async () => {
    const [, , , , q5, q6] = fixture.questionIds;
    const rawForeign = `${RUN}-foreign`;
    const rawOwn = `${RUN}-own`;

    const res = await postSync([
      { ...validItem(q5, rawForeign, new Date(Date.now() - 30_000)), sessionId: otherSessionId },
      validItem(q6, rawOwn, new Date()),
    ]);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.results).toHaveLength(2);
    expect(json.results.find((r: { clientEventId: string }) => r.clientEventId === rawForeign)?.status).toBe("rejected");
    expect(json.results.find((r: { clientEventId: string }) => r.clientEventId === rawOwn)?.status).toBe("applied");

    expect(await prisma.reviewLog.findUnique({ where: { clientEventId: ns(rawForeign) } })).toBeNull();
    expect(await prisma.reviewLog.findUnique({ where: { clientEventId: ns(rawOwn) } })).not.toBeNull();
    // The foreign session itself got no answer row either.
    expect(await prisma.testAnswer.count({ where: { testSessionId: otherSessionId } })).toBe(0);
  });

  it("(f) unauthenticated: acks { ok: false } and writes nothing", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null as never);
    const raw = `${RUN}-unauth`;
    const answersBefore = await prisma.testAnswer.count({ where: { testSessionId: sessionId } });

    const res = await postSync([validItem(fixture.questionIds[0], raw, new Date())]);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: false });

    expect(await prisma.reviewLog.findUnique({ where: { clientEventId: ns(raw) } })).toBeNull();
    expect(await prisma.testAnswer.count({ where: { testSessionId: sessionId } })).toBe(answersBefore);
  });

  // Shared between (h) and (i): the sessionless replay must be the byte-identical batch.
  let batchH = "";
  const rawH = `${RUN}-sessionless`;

  it("(h) sessionless item (no sessionId), correct option: SRS lane only — ReviewLog + ReviewState, NO TestAnswer", async () => {
    const q7 = fixture.questionIds[6];
    batchH = JSON.stringify([
      {
        questionId: q7,
        selectedOptionId: correctOption.get(q7)!,
        latencyMs: 1500,
        clientEventId: rawH,
        reviewedAt: new Date().toISOString(),
      },
    ]);

    const res = await postSync(batchH);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.results).toEqual([{ clientEventId: rawH, status: "applied" }]);

    // Exactly one ReviewLog row under the namespaced id, with no session attached.
    const logs = await prisma.reviewLog.findMany({ where: { clientEventId: ns(rawH) } });
    expect(logs).toHaveLength(1);
    expect(logs[0].testSessionId).toBeNull();

    const state = await prisma.reviewState.findUnique({
      where: { userId_questionId: { userId, questionId: q7 } },
    });
    expect(state?.reps).toBe(1);

    // The sessionless lane must never mint a TestAnswer (no TestSession exists for it).
    expect(await prisma.testAnswer.count({ where: { questionId: q7 } })).toBe(0);
  });

  it("(i) replaying the sessionless batch is a whole-tx no-op (idempotency holds without a session)", async () => {
    const q7 = fixture.questionIds[6];
    const stateBefore = await prisma.reviewState.findUnique({
      where: { userId_questionId: { userId, questionId: q7 } },
    });
    expect(stateBefore?.reps).toBe(1);

    const res = await postSync(batchH);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    // A replayed no-op still reports `applied` — the client deletes its WAL entry either way.
    expect(json.results).toEqual([{ clientEventId: rawH, status: "applied" }]);

    const logs = await prisma.reviewLog.findMany({ where: { clientEventId: ns(rawH) } });
    expect(logs).toHaveLength(1);

    const stateAfter = await prisma.reviewState.findUnique({
      where: { userId_questionId: { userId, questionId: q7 } },
    });
    expect(stateAfter?.reps).toBe(1);
    expect(stateAfter?.stability).toBe(stateBefore?.stability);
    expect(await prisma.testAnswer.count({ where: { questionId: q7 } })).toBe(0);
  });

  it("(j) sessionless item with a WRONG option: correctness computed server-side → grade-1 (Again) review", async () => {
    const q8 = fixture.questionIds[7];
    const raw = `${RUN}-sessionless-wrong`;
    const wrong = await prisma.questionOption.findFirst({
      where: { questionId: q8, isCorrect: false },
    });

    const res = await postSync([
      {
        questionId: q8,
        selectedOptionId: wrong!.id,
        latencyMs: 2200,
        clientEventId: raw,
        reviewedAt: new Date().toISOString(),
      },
    ]);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.results).toEqual([{ clientEventId: raw, status: "applied" }]);

    // Wrong is Again (grade 1) unconditionally (lib/fsrs/grade.ts) — the stored options decide,
    // never a client-cached isCorrect flag.
    const log = await prisma.reviewLog.findUnique({ where: { clientEventId: ns(raw) } });
    expect(log?.grade).toBe(1);
    expect(log?.testSessionId).toBeNull();

    const state = await prisma.reviewState.findUnique({
      where: { userId_questionId: { userId, questionId: q8 } },
    });
    expect(state?.reps).toBe(1);
    expect(state?.lastGrade).toBe(1);
    // A failed FIRST recall lands in "learning" (a first-ever Again on a new card is not a lapse).
    expect(state?.state).toBe("learning");
    expect(state?.lapses).toBe(0);
    expect(await prisma.testAnswer.count({ where: { questionId: q8 } })).toBe(0);
  });

  it("(k) sessionless item for an UNPUBLISHED question is rejected with zero rows", async () => {
    const raw = `${RUN}-sessionless-unpub`;
    const unpubOption = await prisma.questionOption.findFirst({
      where: { questionId: unpublished.questionId, isCorrect: true },
    });

    const res = await postSync([
      {
        questionId: unpublished.questionId,
        selectedOptionId: unpubOption!.id,
        latencyMs: 900,
        clientEventId: raw,
        reviewedAt: new Date().toISOString(),
      },
    ]);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.results).toEqual([{ clientEventId: raw, status: "rejected" }]);

    expect(await prisma.reviewLog.findUnique({ where: { clientEventId: ns(raw) } })).toBeNull();
    expect(
      await prisma.reviewState.findUnique({
        where: { userId_questionId: { userId, questionId: unpublished.questionId } },
      }),
    ).toBeNull();
  });

  it("(l) finish-before-drain: an item for the user's own FINISHED session falls back to the SRS-only lane (wave13-review)", async () => {
    // Own session, COMPLETED before the queued answer drains — the answer must NOT be lost:
    // no TestAnswer (the settled score is untouched), but the ReviewLog/ReviewState land.
    const finished = await prisma.testSession.create({
      data: { userId, mode: "MIXED_PRACTICE", status: "COMPLETED", finishedAt: new Date() },
    });
    const q = fixture.questionIds[8];
    const raw = `${RUN}-finished-drain`;
    const res = await postSync([{ ...validItem(q, raw, new Date()), sessionId: finished.id }]);
    const body = await res.json();
    expect(body.results[0].status).toBe("applied");
    const answer = await prisma.testAnswer.findUnique({
      where: { testSessionId_questionId: { testSessionId: finished.id, questionId: q } },
    });
    expect(answer).toBeNull(); // settled exam score untouched
    const log = await prisma.reviewLog.findUnique({ where: { clientEventId: ns(raw) } });
    expect(log).not.toBeNull(); // the learning event still counts
    await prisma.testSession.delete({ where: { id: finished.id } }).catch(() => undefined);
  });

  it("(m) stale sessionless replay is LOG-ONLY — never regresses FSRS state backward (wave13-review)", async () => {
    const q = fixture.questionIds[9];
    // 1. A LIVE (newer) review establishes the current state.
    const liveRaw = `${RUN}-stale-live`;
    await postSync([{ questionId: q, selectedOptionId: correctOption.get(q)!, latencyMs: 900,
                      clientEventId: liveRaw, reviewedAt: new Date().toISOString() }]);
    const after = await prisma.reviewState.findUnique({
      where: { userId_questionId: { userId, questionId: q } },
    });
    expect(after).not.toBeNull();
    // 2. An OLDER offline review drains afterwards → applied (idempotency key consumed, log appended)
    //    but the state stays EXACTLY as the newer review left it.
    const staleRaw = `${RUN}-stale-old`;
    const staleAt = new Date(Date.now() - 2 * 86_400_000);
    const res = await postSync([{ questionId: q, selectedOptionId: correctOption.get(q)!, latencyMs: 900,
                                   clientEventId: staleRaw, reviewedAt: staleAt.toISOString() }]);
    expect((await res.json()).results[0].status).toBe("applied");
    const staleLog = await prisma.reviewLog.findUnique({ where: { clientEventId: ns(staleRaw) } });
    expect(staleLog).not.toBeNull();
    const state = await prisma.reviewState.findUnique({
      where: { userId_questionId: { userId, questionId: q } },
    });
    expect(state!.lastReviewedAt!.getTime()).toBe(after!.lastReviewedAt!.getTime());
    expect(state!.reps).toBe(after!.reps);
    expect(state!.stability).toBe(after!.stability);
  });

  it("(n) honest guess-floor LANE PARITY (wave20 review fix): a sessionless correct on the 2-option fixture grades Hard(2), same as the live lane", async () => {
    // The fixture's default question is 2-option, so the honest floor g=min(1/2, FSRS_GUESS_MAX=0.45)
    // gives a fresh-card correct π=0.666667 < FSRS_KNOW_GOOD(0.75) ⇒ Hard(2). Before the wave20
    // review fix this lane omitted optionCount and fell back to the 4-option default
    // (π=0.782609 ⇒ Good(3)) — the exact live-vs-offline divergence this pins. Expected grade from
    // the wave20 python oracle's posterior anchors, not from the impl.
    const q = fixture.questionIds[4];
    const raw = `${RUN}-lane-parity`;
    const res = await postSync([
      {
        questionId: q,
        selectedOptionId: correctOption.get(q)!,
        latencyMs: 1500,
        clientEventId: raw,
        reviewedAt: new Date().toISOString(),
      },
    ]);
    expect((await res.json()).results).toEqual([{ clientEventId: raw, status: "applied" }]);

    const log = await prisma.reviewLog.findUnique({ where: { clientEventId: ns(raw) } });
    expect(log?.grade).toBe(2);
    expect(log?.engine).toBe("fsrs6-bkt2");
  });

  it("(g) rejects an oversize batch (51 items) outright with zero writes", async () => {
    const rawIds = Array.from({ length: 51 }, (_, i) => `${RUN}-big-${i}`);
    const res = await postSync(
      rawIds.map((raw) => validItem(fixture.questionIds[0], raw, new Date())),
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: false });

    const written = await prisma.reviewLog.count({
      where: { clientEventId: { in: rawIds.map(ns) } },
    });
    expect(written).toBe(0);
  });
});
