import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { recomputeReadiness } from "@/lib/server/mastery-readiness";
import { CATEGORY_B_BLUEPRINT, groupCandidatesByBlock } from "@/lib/exam-blueprint";
import { sectionFromQuestionKey } from "@/lib/content-key";
import { READINESS_RELEASE_MODEL_KEY } from "@/lib/constants";

// LIVE-WIRING proofs for the wave19d evidence-releasing readiness model "lm-gh1" (wave19d-08).
// Every assertion goes through the PRODUCTION path — `recomputeReadiness` materialising a real
// `ReadinessSnapshot` against the seeded DB — NOT a direct `releaseDial` call (a direct-model test
// would pass while the wiring feeds it wrong inputs). Frozen magnitudes below were pre-verified via
// the real `recomputeReadiness` at impl time (throwaway `npx tsx --conditions=react-server` run,
// 2026-07-13) so the honesty `≤` can't pass on drifted fixtures.
//
// Blocks are seeded on REAL cat-B questions selected by the stable questionKey→section (the drift-
// immune bucketing source): structure {31,45} · safety {35,47} · medical {37} · pdr = remainder.
// A fixed reference clock pins every retrievability (FSRS R = 0.9 exactly at elapsed == stability).
// Skips (not fails) when the official ПДР content is absent, mirroring the sibling suites.

const MS_PER_DAY = 86_400_000;
const NOW = new Date("2026-07-12T12:00:00.000Z");
// pdr remainder claims everything NOT in the three named strata.
const CLAIMED = new Set([31, 45, 35, 47, 37]);

let catBId = "";
let officialContentSeeded = false;
let structureIds: string[] = [];
let safetyIds: string[] = [];
let medicalIds: string[] = [];
let pdrIds: string[] = [];
const createdUserIds: string[] = [];

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
  const withSection = catBPublished.map((q) => ({
    id: q.id,
    section: sectionFromQuestionKey(q.questionKey ?? ""),
  }));
  const bySection = (targets: number[]) => {
    const set = new Set(targets);
    return withSection.filter((q) => q.section != null && set.has(q.section)).map((q) => q.id);
  };
  structureIds = bySection([31, 45]);
  safetyIds = bySection([35, 47]);
  medicalIds = bySection([37]);
  pdrIds = withSection.filter((q) => q.section == null || !CLAIMED.has(q.section)).map((q) => q.id);

  officialContentSeeded =
    catBPublished.length >= 20 &&
    structureIds.length >= 4 &&
    safetyIds.length >= 4 &&
    medicalIds.length >= 2 &&
    pdrIds.length >= 11;
});

afterAll(async () => {
  // ReviewState + ReadinessSnapshot cascade on the user delete (schema.prisma).
  for (const id of createdUserIds) {
    await prisma.user.delete({ where: { id } }).catch(() => undefined);
  }
  await prisma.$disconnect();
});

async function mkUser(label: string): Promise<string> {
  const u = await prisma.user.create({
    data: {
      name: label,
      email: `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`,
      passwordHash: "x",
      role: "USER",
      selectedCategoryId: catBId,
    },
  });
  createdUserIds.push(u.id);
  return u.id;
}

/** Seed a ReviewState at retrievability R = 0.9^(elapsed/stability)-shaped; `elapsedRatio` scales the
 *  elapsed time in units of stability (ratio 0 ⇒ R=1, ratio 1 ⇒ R=0.9, ratio 9.28 ⇒ R≈0.70). */
async function seedState(
  userId: string,
  questionId: string,
  elapsedRatio: number,
  reps: number,
  stabilityDays = 10,
) {
  await prisma.reviewState.create({
    data: {
      userId,
      questionId,
      stability: stabilityDays,
      state: "review",
      lastReviewedAt: new Date(NOW.getTime() - elapsedRatio * stabilityDays * MS_PER_DAY),
      dueAt: new Date(NOW.getTime() + stabilityDays * MS_PER_DAY),
      reps,
    },
  });
}

/** Fill every stratum to its quota (structure 4 · safety 4 · medical 2 · pdr 10) at the given
 *  retrievability ratio + review mass, so nUnseen = 0 in each block. */
async function fillQuotas(userId: string, ratio: number, reps: number) {
  for (const id of pdrIds.slice(0, 10)) await seedState(userId, id, ratio, reps);
  for (const id of structureIds.slice(0, 4)) await seedState(userId, id, ratio, reps);
  for (const id of safetyIds.slice(0, 4)) await seedState(userId, id, ratio, reps);
  for (const id of medicalIds.slice(0, 2)) await seedState(userId, id, ratio, reps);
}

async function snapshotFor(userId: string) {
  await recomputeReadiness(userId, catBId, prisma, NOW);
  const snap = await prisma.readinessSnapshot.findFirst({
    where: { userId, categoryId: catBId },
    orderBy: { createdAt: "desc" },
  });
  expect(snap).not.toBeNull();
  const parsed = JSON.parse(snap!.inputsJson) as {
    dialIndep: number;
    model: string;
    sigma: number;
    nodeCount: number;
    blockStats: { nSeen: number; C: number }[];
  };
  return { snap: snap!, parsed };
}

describe("live readiness dial routes through the release model 'lm-gh1' (wave19d-08)", () => {
  // Goal #2 — the persisted snapshot carries the new audit fields.
  it("records model 'lm-gh1' + sigma + nodeCount + per-block {nSeen,C} in inputsJson (Goal #2)", async (ctx) => {
    ctx.skip(!officialContentSeeded, "official ПДР content not imported — cat-B pool absent");
    const u = await mkUser("rr-audit");
    await fillQuotas(u, 1, 4); // R = 0.9, moderate review mass
    const { parsed } = await snapshotFor(u);
    expect(parsed.model).toBe(READINESS_RELEASE_MODEL_KEY);
    expect(parsed.model).toBe("lm-gh1");
    expect(parsed.nodeCount).toBe(20);
    expect(parsed.sigma).toBeGreaterThan(0);
    // per-block {nSeen,C} positional in CATEGORY_B_BLUEPRINT.blocks order (structure,safety,medical,pdr).
    expect(parsed.blockStats).toHaveLength(CATEGORY_B_BLUEPRINT.blocks.length);
    expect(parsed.blockStats.map((b) => b.nSeen)).toEqual([4, 4, 2, 10]);
  });

  // Goal #3 — NEVER-ABOVE-INDEPENDENCE on the live path, BOTH populations (percent granularity).
  it("persisted dialPercent ≤ dialIndep for a WEAK and a STRONG seeded student (Goal #3)", async (ctx) => {
    ctx.skip(!officialContentSeeded, "official ПДР content not imported — cat-B pool absent");

    // WEAK: mean p̂ ≈ 0.70 (below the 18/20 regime) ⇒ the mixture's min-clamp is a no-op (final ===
    // indep). Frozen: dialPercent 4 == dialIndep 4.
    const weak = await mkUser("rr-weak");
    await fillQuotas(weak, 9.28, 4); // R ≈ 0.70
    const w = await snapshotFor(weak);
    expect(w.snap.dialPercent).toBeLessThanOrEqual(w.parsed.dialIndep);
    expect(w.snap.dialPercent).toBe(4);
    expect(w.parsed.dialIndep).toBe(4);

    // STRONG: mean p̂ = 0.90 (above the regime) ⇒ the factor mixture BINDS and lowers the far-upper
    // tail below independence. Frozen: dialPercent 63 < dialIndep 68 (a real gap, not a no-op).
    const strong = await mkUser("rr-strong");
    await fillQuotas(strong, 1, 4); // R = 0.90
    const s = await snapshotFor(strong);
    expect(s.snap.dialPercent).toBeLessThanOrEqual(s.parsed.dialIndep);
    expect(s.snap.dialPercent).toBe(63);
    expect(s.parsed.dialIndep).toBe(68);
    expect(s.snap.dialPercent).toBeLessThan(s.parsed.dialIndep);
  });

  // Goal #4 — RELEASE ON THE LIVE PATH: a rich near-perfect student reaches the top band.
  it("a RICH near-perfect student (full coverage, many reviews) gets dialPercent ≥ 80 (Goal #4)", async (ctx) => {
    ctx.skip(!officialContentSeeded, "official ПДР content not imported — cat-B pool absent");
    // R = 1 across all four strata (full quota coverage) with high review mass (reps 50 ⇒ small σ ⇒
    // the mixture releases back to the independence baseline). The OLD wave19c per-block shrink would
    // have capped such a student well below 80 (its Jeffreys-½ shrink pulled every near-mastered
    // block strictly under 1 — the ceiling this model removes); not asserted against old code.
    const rich = await mkUser("rr-rich");
    await fillQuotas(rich, 0, 50); // R = 1
    const r = await snapshotFor(rich);
    expect(r.snap.dialPercent).toBeGreaterThanOrEqual(80);
    expect(r.snap.dialPercent).toBe(100);
  });

  // Goal #5 — STUDY-NEVER-HURTS (R2) on the live path: revealing one more item at R ≥ its slot's
  // prior never lowers the persisted dial (the 19c code drops it; property d, production proof).
  it("revealing a 4th structure item at R ≥ prior does NOT lower the persisted dialPercent (Goal #5)", async (ctx) => {
    ctx.skip(!officialContentSeeded, "official ПДР content not imported — cat-B pool absent");
    const u = await mkUser("rr-r2");
    // Strong everywhere, but the structure block starts with only 3 of its 4 slots seen (nUnseen = 1,
    // credited at the clamped extrapolation C). Total seen = 20 (sufficientData).
    for (const id of pdrIds.slice(0, 11)) await seedState(u, id, 1, 4);
    for (const id of structureIds.slice(0, 3)) await seedState(u, id, 1, 4);
    for (const id of safetyIds.slice(0, 4)) await seedState(u, id, 1, 4);
    for (const id of medicalIds.slice(0, 2)) await seedState(u, id, 1, 4);
    const before = await snapshotFor(u);
    expect(before.snap.dialPercent).toBe(54);

    // Reveal the 4th structure item at R = 0.9 (≥ its slot's prior 0.5): the unseen slot (credited at
    // C ≤ prior) becomes a seen slot at a higher prob ⇒ the block's p_slot rises, the dial cannot drop.
    await seedState(u, structureIds[3], 1, 4);
    const after = await snapshotFor(u);
    expect(after.snap.dialPercent).toBe(63);
    expect(after.snap.dialPercent).toBeGreaterThanOrEqual(before.snap.dialPercent);
  });
});
