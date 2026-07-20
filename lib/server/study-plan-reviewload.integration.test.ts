import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { getStudyPlan } from "@/lib/server/study";
import { MAX_DAILY_QUOTA } from "@/lib/study-plan";
import {
  createOfficialQuestion,
  type OfficialQuestionFixture,
} from "@/lib/server/__testutils__/official-question";

// wave21-05: getStudyPlan now wires the REAL reviewLoad estimate (Σ 1/max(1,stability) over seen
// cards, capped at the seen count — the wave21-01 estimator) into the pure computeStudyPlan, replacing
// the wave21-03 `reviewLoad: 0` placeholder. These suites drive the REAL loader (no internal helper):
//   §1 fresh user (no ReviewState) → quota == the OLD ceil(unseen/daysLeft) formula (reviewLoad 0).
//   §2 maintenance (all seen, unseen 0, stabilities [1,2,4,10]) → quota == reviewLoad 2, no threat copy.
// Noon-UTC now/exam avoid Kyiv (UTC+3 in July, no DST change in the window) day-boundary flake.

const NOW = new Date("2026-07-02T12:00:00Z");
const EXAM_IN_10 = new Date(NOW.getTime() + 10 * 86_400_000); // → daysLeft 10 in Europe/Kyiv

async function setExam(userId: string, categoryId: string, examDate: Date) {
  await prisma.user.update({ where: { id: userId }, data: { selectedCategoryId: categoryId } });
  // getStudyPlan calls getOrCreateProfile; ensure the row exists then pin the exam date.
  await prisma.userStudyProfile.upsert({
    where: { userId },
    create: { userId, examDate },
    update: { examDate },
  });
}

describe("getStudyPlan reviewLoad wiring (wave21-05)", () => {
  // §1 — fresh-user equality anchor: NO ReviewState ⇒ reviewLoad 0, due 0 ⇒ identical to the old
  // ceil(unseen/daysLeft) formula.
  describe("fresh user (no reviews) matches the old ceil(unseen/daysLeft) formula", () => {
    let f: OfficialQuestionFixture;
    let N: number;

    beforeAll(async () => {
      f = await createOfficialQuestion(prisma, { label: "planfresh", count: 25 });
      N = f.questionIds.length;
      await setExam(f.userId!, f.categoryId, EXAM_IN_10);
    });
    afterAll(async () => {
      await f.cleanup();
    });

    it("quota == ceil(N/10), feasible per the ceiling, daysLeft == 10", async () => {
      const plan = await getStudyPlan(f.userId!, NOW, { skipEntitlementGate: true });
      const expectedQuota = Math.ceil(N / 10);
      expect(plan.daysLeft).toBe(10);
      expect(plan.dailyQuota).toBe(expectedQuota);
      expect(plan.feasible).toBe(expectedQuota <= MAX_DAILY_QUOTA);
    });
  });

  // §2 — maintenance + reviewLoad on the production path: 4 published, ALL seen, unseen 0,
  // stabilities [1,2,4,10] ⇒ Σ = 1 + 0.5 + 0.25 + 0.1 = 1.85 → round 2 → min(4,2) = 2.
  describe("maintenance path carries the reviewLoad estimate (stabilities [1,2,4,10] → 2)", () => {
    let f: OfficialQuestionFixture;
    const stabilities = [1, 2, 4, 10];

    beforeAll(async () => {
      f = await createOfficialQuestion(prisma, { label: "planmaint", count: 4 });
      await setExam(f.userId!, f.categoryId, EXAM_IN_10);
      // Seed a ReviewState for EVERY published question (so unseen == 0), each with its own stability.
      // dueAt is arbitrary — the maintenance branch is unseen-gated, not due-gated.
      for (let i = 0; i < f.questionIds.length; i++) {
        await prisma.reviewState.create({
          data: {
            userId: f.userId!,
            questionId: f.questionIds[i],
            stability: stabilities[i],
            difficulty: 5,
            state: "review",
            dueAt: NOW,
            lastReviewedAt: new Date(NOW.getTime() - 86_400_000),
            reps: 1,
          },
        });
      }
    });
    afterAll(async () => {
      await f.cleanup();
      await prisma.$disconnect();
    });

    it("quota == reviewLoad 2, feasible, message повторюйте and not встигнете", async () => {
      const plan = await getStudyPlan(f.userId!, NOW, { skipEntitlementGate: true });
      expect(plan.daysLeft).toBe(10);
      expect(plan.dailyQuota).toBe(2);
      expect(plan.feasible).toBe(true);
      expect(plan.message).toContain("повторюйте");
      expect(plan.message).not.toContain("встигнете");
    });
  });
});
