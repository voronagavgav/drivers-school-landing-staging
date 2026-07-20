import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { countDueReviews, startSpacedReview, NothingDueError } from "@/lib/server/study";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";

// wave12b-review (tests-quality): countDueReviews shipped with zero coverage — the one self-authored
// blind spot of the wave. This suite pins it with a KNOWN due-status distribution AND cross-checks it
// against the SAME user/category/now queue startSpacedReview actually builds (the due-badge number and
// the session the badge launches must agree — spec §B).

const NOW = new Date("2026-07-02T12:00:00Z");
const past = new Date(NOW.getTime() - 60 * 60_000);
const future = new Date(NOW.getTime() + 2 * 86_400_000);
const reviewedYesterday = new Date(NOW.getTime() - 86_400_000);

let f: OfficialQuestionFixture;
let userId: string;
let categoryId: string;

async function seedState(questionId: string, dueAt: Date | null) {
  await prisma.reviewState.create({
    data: {
      userId,
      questionId,
      stability: 3,
      difficulty: 5,
      state: "review",
      dueAt,
      lastReviewedAt: reviewedYesterday,
      reps: 1,
    },
  });
}

beforeAll(async () => {
  // 4 published questions: q0 due EXACTLY now, q1 past-due, q2 future-due, q3 unseen.
  f = await createOfficialQuestion(prisma, { label: "duecount", count: 4 });
  userId = f.userId!;
  categoryId = f.categoryId;
  await seedState(f.questionIds[0], NOW); // dueAt == now → due (boundary)
  await seedState(f.questionIds[1], past); // overdue → due
  await seedState(f.questionIds[2], future); // seen, not yet due → NOT due
  // f.questionIds[3] stays unseen → NOT due
});

afterAll(async () => {
  await f.cleanup();
  await prisma.$disconnect();
});

describe("countDueReviews (wave12b-review coverage gap)", () => {
  it("counts exactly the due-at-or-past cards of the category (boundary inclusive)", async () => {
    expect(await countDueReviews(userId, categoryId, NOW)).toBe(2);
  });

  it("agrees with the session startSpacedReview builds for the same inputs", async () => {
    const sessionId = await startSpacedReview(userId, categoryId, NOW);
    const rows = await prisma.testSessionQuestion.findMany({
      where: { testSessionId: sessionId },
      select: { questionId: true },
    });
    expect(rows.length).toBe(await countDueReviews(userId, categoryId, NOW));
    expect(rows.map((r) => r.questionId).sort()).toEqual(
      [f.questionIds[0], f.questionIds[1]].sort(),
    );
  });

  it("returns 0 (and spaced review reports nothing due) once the due cards move to the future", async () => {
    await prisma.reviewState.updateMany({
      where: { userId, questionId: { in: [f.questionIds[0], f.questionIds[1]] } },
      data: { dueAt: future },
    });
    expect(await countDueReviews(userId, categoryId, NOW)).toBe(0);
    await expect(startSpacedReview(userId, categoryId, NOW)).rejects.toThrow(NothingDueError);
  });
});
