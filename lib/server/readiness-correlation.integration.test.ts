import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { recomputeReadiness } from "@/lib/server/mastery-readiness";
import { CATEGORY_B_BLUEPRINT, groupCandidatesByBlock } from "@/lib/exam-blueprint";
import { sectionFromQuestionKey } from "@/lib/content-key";
import {
  DEFAULT_EXAM_QUESTION_COUNT,
  READINESS_MIN_SEEN,
  READINESS_TOPIC_CORRELATION,
} from "@/lib/constants";

// Wave 19b (task 09) → 19e (task 03) — SERVER-side audit trail of the LIVE readiness dial, driving the
// PRODUCTION path (`recomputeReadiness`) against the real seeded DB. Proves:
//
//   (a) AUDIT TRAIL — the persisted snapshot's `inputsJson` records the append-only history fields:
//       the ρ actually applied (`rho === READINESS_TOPIC_CORRELATION`, still 0), the engine/version tag
//       (`engine === "fsrs6"`), `calibratorId === null` (reserved for a future data-gated calibrator),
//       plus `sufficientData` / `seenCount` / `blocks`. These survive the wave19d release-model swap.
//   (b) NEVER ABOVE INDEPENDENCE — the persisted percent dial `dialPercent` never exceeds the recorded
//       independence dial `inputsJson.dialIndep` (both `Math.round(p*100)`). Since wave19d the live
//       `passProbability` comes from `releaseDial().final` (mock-anchored per wave19e-01), which
//       structurally guarantees `final ≤ independence`; the retired pure `computeReadiness`
//       reconstruction no longer describes the live path and was removed.
//
// The fixture is deliberately strong across every blueprint block so the dial lands in the regime the
// suite pins. Skips (not fails) when official ПДР content is absent, mirroring
// exam-blueprint.integration.test.ts.

const MS_PER_DAY = 86_400_000;

describe("readiness recompute applies ρ + records it in inputsJson (wave19b-09)", () => {
  let userId = "";
  let catBId = "";
  let officialContentSeeded = false;
  // Fixed clock: strong states reviewed 2 days ago with a large stability ⇒ R ≈ 0.995, so the
  // per-block meanProbs sit near 1 and the pool mean lands the dial above the pass threshold — the
  // regime where a higher ρ strictly LOWERS P(pass).
  const NOW = new Date("2026-07-12T12:00:00.000Z");

  beforeAll(async () => {
    const catB = await prisma.category.findFirstOrThrow({ where: { code: "B" } });
    catBId = catB.id;

    const catBPublished = await prisma.question.findMany({
      where: {
        isDemo: false,
        isPublished: true,
        isActive: true,
        archivedAt: null,
        categories: { some: { code: "B" } },
      },
      select: { id: true, questionKey: true },
    });
    const availByBlock = groupCandidatesByBlock(
      CATEGORY_B_BLUEPRINT,
      catBPublished.map((q) => ({ id: q.id, section: sectionFromQuestionKey(q.questionKey ?? "") })),
    );
    officialContentSeeded =
      catBPublished.length >= DEFAULT_EXAM_QUESTION_COUNT &&
      (availByBlock.structure?.length ?? 0) >= 2 &&
      (availByBlock.safety?.length ?? 0) >= 2 &&
      (availByBlock.medical?.length ?? 0) >= 2 &&
      (availByBlock.pdr?.length ?? 0) >= 15;
    if (!officialContentSeeded) return;

    const u = await prisma.user.create({
      data: {
        name: "Readiness Correlation Dir",
        email: `rho-server-${Date.now()}@test.local`,
        passwordHash: "x",
        role: "USER",
        selectedCategoryId: catBId,
      },
    });
    userId = u.id;

    // STRONG across every mandatory block: high stability + a 2-day-old review ⇒ R ≈ 0.995. Seed the
    // large pdr remainder heavily plus a couple in each small block so the seen count clears
    // READINESS_MIN_SEEN and each block reads near-mastered (meanProb ≈ 0.995).
    const lastReviewedAt = new Date(NOW.getTime() - 2 * MS_PER_DAY);
    const seedIds = [
      ...(availByBlock.pdr ?? []).slice(0, 15),
      ...(availByBlock.structure ?? []).slice(0, 3),
      ...(availByBlock.safety ?? []).slice(0, 3),
      ...(availByBlock.medical ?? []).slice(0, 2),
    ];
    for (const questionId of seedIds) {
      await prisma.reviewState.create({
        data: {
          userId,
          questionId,
          stability: 100,
          state: "review",
          lastReviewedAt,
          dueAt: new Date(NOW.getTime() + 100 * MS_PER_DAY),
          reps: 1,
        },
      });
    }
  });

  afterAll(async () => {
    // ReviewState + ReadinessSnapshot cascade on the user delete (schema.prisma).
    if (userId) await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it("records rho/engine/calibratorId in inputsJson and keeps the percent dial never above independence", async (ctx) => {
    ctx.skip(!officialContentSeeded, "official ПДР content not imported — real-seed blueprint pool absent");

    await recomputeReadiness(userId, catBId, prisma, NOW);

    const snapshot = await prisma.readinessSnapshot.findFirst({
      where: { userId, categoryId: catBId },
      orderBy: { createdAt: "desc" },
    });
    expect(snapshot).not.toBeNull();

    const parsed = JSON.parse(snapshot!.inputsJson) as {
      sufficientData: boolean;
      seenCount: number;
      blocks: { quota: number; meanProb: number }[];
      rho: number;
      engine: string;
      calibratorId: string | null;
      dialIndep: number;
    };

    // (a) Audit trail: ρ actually applied, engine tag, reserved calibrator id — plus existing fields.
    // These append-only history fields survive the wave19d release-model swap unchanged (inputsJson is
    // append-only; the dial now comes from `releaseDial`, but `rho`/`engine`/`calibratorId` remain).
    expect(parsed.rho).toBe(READINESS_TOPIC_CORRELATION);
    expect(parsed.engine).toBe("fsrs6");
    expect(parsed.calibratorId).toBeNull();
    expect(parsed.sufficientData).toBe(true);
    expect(parsed.seenCount).toBeGreaterThanOrEqual(READINESS_MIN_SEEN);
    expect(parsed.blocks.length).toBe(CATEGORY_B_BLUEPRINT.blocks.length);

    // (b) Never above independence — PERCENT-scale (both are `Math.round(p*100)` ∈ [0,100]). The
    // persisted `passProbability` is now `releaseDial().final` (mock-anchored, wave19e-01), NOT the
    // retired pure `computeReadiness` model, so a raw-probability reconstruction no longer describes
    // the live path. The release model structurally guarantees `final ≤ independence`, which the
    // shared monotone anchor preserves on the percent dials.
    expect(snapshot!.dialPercent).toBeLessThanOrEqual(parsed.dialIndep);
  });
});
