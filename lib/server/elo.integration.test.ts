import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { recomputeElo } from "./elo";
import { foldEloStream, type EloAnswer } from "@/lib/elo";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";

// wave22-07: server recomputeElo does a FULL deterministic replay of the answer stream through the
// pure `foldEloStream`, then writes each item's β/n back onto Question. This suite drives the REAL
// server entry (not the pure helper alone) over a KNOWN fixture and pins THREE properties:
//   1. determinism/idempotency — two runs yield IDENTICAL eloBeta/eloAnswerCount rows;
//   2. server-vs-pure equivalence — the DB rows equal the pure `foldEloStream` of the SAME stream;
//   3. external truth — one item's eloBeta equals the wave22-01 python golden fold value to 6dp.
//
// The fixture reproduces the python oracle's `stream_b_sorted`: 5 users × 8 items, one answer each,
// y = (u+i)%2==0, oc=4, in user-outer (answeredAt-sorted) order. The users + items form an ISOLATED
// subgraph (these users answer only these items; these items are answered only by these users), so the
// global recompute reproduces the golden per-item β regardless of any other rows in the dev DB.

// python golden (tasks/wave22-01-python-oracle/PREVERIFY-OUTPUT.txt, section (b)): item q_i final β.
const GOLDEN_BETA = [
  0.040006, // q0
  0.357102, // q1
  0.015452, // q2
  0.334477, // q3
  -0.00423, // q4
  0.316126, // q5
  -0.020299, // q6
  0.301, // q7
];
const N_USERS = 5;
const N_ITEMS = 8;
const OPTION_COUNT = 4;
const BASE = new Date("2026-07-01T00:00:00Z").getTime();

let f: OfficialQuestionFixture;
let userIds: string[] = [];
let questionIds: string[] = [];

beforeAll(async () => {
  // 8 published 4-option questions (g = 1/4 = 0.25, matching the oracle's oc=4). No fixture user —
  // we mint the five answering users ourselves so each answers the full item set.
  f = await createOfficialQuestion(prisma, {
    label: "elofold",
    count: N_ITEMS,
    withUser: false,
    options: [
      { text: "right", isCorrect: true, displayOrder: 0 },
      { text: "wrong1", isCorrect: false, displayOrder: 1 },
      { text: "wrong2", isCorrect: false, displayOrder: 2 },
      { text: "wrong3", isCorrect: false, displayOrder: 3 },
    ],
  });
  questionIds = f.questionIds;

  const suffix = `${Date.now()}`;
  for (let u = 0; u < N_USERS; u++) {
    const user = await prisma.user.create({
      data: {
        name: `elofold u${u}`,
        email: `elofold-${suffix}-u${u}@test.local`,
        passwordHash: "x",
        role: "USER",
        selectedCategoryId: f.categoryId,
      },
    });
    userIds.push(user.id);

    // The fold's source is ReviewLog — the FIRST-ATTEMPT record (wave22-review fix; TestAnswer is
    // upserted to the FINAL choice and is the wrong stream). One log row per (user, item), the
    // preserved invariant correct ⟺ grade ≥ 2 encodes the outcome.
    for (let i = 0; i < N_ITEMS; i++) {
      await prisma.reviewLog.create({
        data: {
          userId: user.id,
          questionId: questionIds[i],
          grade: (u + i) % 2 === 0 ? 3 : 1,
          elapsedDays: 0,
          mode: "MIXED_PRACTICE",
          // user-outer reviewedAt so the global sort reproduces `stream_b_sorted`.
          reviewedAt: new Date(BASE + (u * N_ITEMS + i) * 1000),
        },
      });
    }
  }
});

afterAll(async () => {
  // Users first: session/answer children cascade, freeing the questions' non-cascade FKs.
  for (const id of userIds) {
    await prisma.user.delete({ where: { id } }).catch(() => undefined);
  }
  await f.cleanup();
  await prisma.$disconnect();
});

async function readRows() {
  const rows = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, eloBeta: true, eloAnswerCount: true },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return questionIds.map((id) => byId.get(id)!);
}

describe("recomputeElo (server fold + writeback)", () => {
  it("is deterministic/idempotent, matches the pure fold, and hits the python golden", async () => {
    // Run 1.
    await recomputeElo();
    const first = await readRows();

    // Every fixture item folded exactly 5 answers.
    for (const r of first) expect(r.eloAnswerCount).toBe(N_USERS);

    // External truth: q0's β matches the wave22-01 python golden fold to 6dp.
    expect(first[0].eloBeta!).toBeCloseTo(GOLDEN_BETA[0], 6);

    // Server-vs-pure equivalence: fold the SAME stream with the pure estimator and compare per item.
    const stream: EloAnswer[] = [];
    for (let u = 0; u < N_USERS; u++) {
      for (let i = 0; i < N_ITEMS; i++) {
        stream.push({
          userId: userIds[u],
          questionId: questionIds[i],
          correct: (u + i) % 2 === 0,
          optionCount: OPTION_COUNT,
          answeredAt: new Date(BASE + (u * N_ITEMS + i) * 1000),
        });
      }
    }
    const { items } = foldEloStream(stream);
    for (let i = 0; i < N_ITEMS; i++) {
      const pure = items.get(questionIds[i])!;
      expect(first[i].eloBeta!).toBeCloseTo(pure.beta, 12);
      expect(first[i].eloAnswerCount).toBe(pure.n);
      // and the pure fold itself reproduces the python golden (external anchor for all 8 items).
      expect(pure.beta).toBeCloseTo(GOLDEN_BETA[i], 6);
    }

    // Run 2: full recompute again → byte-identical rows (idempotent; Elo has no time-decay).
    await recomputeElo();
    const second = await readRows();
    for (let i = 0; i < N_ITEMS; i++) {
      expect(second[i].eloBeta).toBe(first[i].eloBeta);
      expect(second[i].eloAnswerCount).toBe(first[i].eloAnswerCount);
    }
  });

  it("folds the FIRST attempt, not the upserted final TestAnswer (wave22-review MAJOR pin)", async () => {
    // The divergence the review caught: a user answers wrong, then changes to correct. TestAnswer
    // holds the FINAL correct choice; ReviewLog holds the first-attempt wrong (grade 1). The fold
    // must see the WRONG attempt — β must move UP (harder) relative to a no-answer baseline, and
    // the item's count must be exactly 1 (the change is not a second fold event).
    const g = await createOfficialQuestion(prisma, { label: "elofirst", count: 1 });
    const changer = await prisma.user.create({
      data: {
        name: "elofold changer",
        email: `elofold-changer-${Date.now()}@test.local`,
        passwordHash: "x",
        role: "USER",
      },
    });
    const session = await prisma.testSession.create({
      data: { userId: changer.id, mode: "MIXED_PRACTICE", status: "COMPLETED" },
    });
    // Final TestAnswer says CORRECT (the upserted end state)…
    await prisma.testAnswer.create({
      data: { testSessionId: session.id, questionId: g.questionId, isCorrect: true },
    });
    // …but the first attempt was WRONG (the FSRS record).
    await prisma.reviewLog.create({
      data: {
        userId: changer.id,
        questionId: g.questionId,
        grade: 1,
        elapsedDays: 0,
        mode: "MIXED_PRACTICE",
        reviewedAt: new Date(BASE + 10_000_000),
      },
    });
    try {
      await recomputeElo();
      const row = await prisma.question.findUnique({
        where: { id: g.questionId },
        select: { eloBeta: true, eloAnswerCount: true },
      });
      expect(row!.eloAnswerCount).toBe(1);
      // A lone WRONG answer must push β above the 0 prior (harder). If the fold read the final
      // TestAnswer (correct), β would land BELOW 0 — the sign is the binding discriminator.
      expect(row!.eloBeta!).toBeGreaterThan(0);
    } finally {
      await prisma.user.delete({ where: { id: changer.id } }).catch(() => undefined);
      await g.cleanup();
    }
  });
});
