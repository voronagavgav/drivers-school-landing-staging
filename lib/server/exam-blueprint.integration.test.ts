import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { startSession, submitAnswer, finishSession } from "@/lib/server/test-engine";
import { recomputeReadiness } from "@/lib/server/mastery-readiness";
import { CATEGORY_B_BLUEPRINT, groupCandidatesByBlock } from "@/lib/exam-blueprint";
import { computeReadiness } from "@/lib/readiness-model";
import { retrievability } from "@/lib/fsrs";
import { DEFAULT_EXAM_MAX_ERRORS, DEFAULT_EXAM_QUESTION_COUNT } from "@/lib/constants";
import { sectionFromQuestionKey } from "@/lib/content-key";

// End-to-end (real seeded DB): a cat-B EXAM_SIMULATION is composed by the OFFICIAL 4-strata
// BLUEPRINT (ГСЦ МВС 12.09.2025) — exactly 20 questions in the FIXED per-stratum quotas
// structure=4 · safety=4 · medical=2 · pdr=10 (remainder) — while a category WITHOUT a blueprint
// keeps the legacy uniform-random behaviour. All four quotas are FIXED (no ranged block), so the
// per-block counts are DETERMINISTIC across every draw; the sessions are repeated only to prove the
// composer holds the exact shape run-to-run, not to exercise a range. A throwaway user is removed
// afterwards (its session rows cascade); a throwaway non-blueprint category proves the unaffected
// path. The seeded DB is otherwise left untouched.

let userId: string;
let catBId: string;
// throwaway category WITHOUT a blueprint (code is not in EXAM_BLUEPRINTS) to prove the legacy path.
let plainCatId: string;
let plainTopicId: string;
// The blueprint suites below assert against OFFICIAL ПДР content (a full exam's worth of published
// cat-B questions, with each mandatory blueprint block actually populated). That content is imported
// by `db:seed` (importOfficial) but is absent on a bare/demo-only DB, so `officialContentSeeded` is
// computed in beforeAll and the suites SKIP — rather than hard-fail — when it is missing; they run
// for real once official content is present. Detection is drift-IMMUNE: it buckets the live cat-B
// pool by the stable questionKey→section (NOT Topic.displayOrder, which drifts +1 per section that
// was imported as two topics — see lib/exam-blueprint.ts), so it can't silently mis-skip when the
// seed's displayOrders shift.
let officialContentSeeded = false;

beforeAll(async () => {
  const catB = await prisma.category.findFirstOrThrow({ where: { code: "B" } });
  catBId = catB.id;

  const plain = await prisma.category.create({
    data: { code: `NOBLUEPRINT_${Date.now()}`, title: "No-blueprint exam", isActive: true },
  });
  plainCatId = plain.id;
  const topic = await prisma.topic.create({
    data: { title: `noblueprint-${Date.now()}`, isActive: true, displayOrder: 9999 },
  });
  plainTopicId = topic.id;
  // Seed a handful of official questions so the plain exam has a (short) pool to draw from.
  for (let i = 0; i < 6; i++) {
    await prisma.question.create({
      data: {
        text: `noblueprint Q${i}`,
        topicId: topic.id,
        difficulty: 1,
        sourceType: "OFFICIAL",
        isDemo: false,
        isActive: true,
        isPublished: true,
        categories: { connect: { id: plainCatId } },
        options: {
          create: [
            { text: "right", isCorrect: true, displayOrder: 0 },
            { text: "wrong", isCorrect: false, displayOrder: 1 },
          ],
        },
      },
    });
  }

  const u = await prisma.user.create({
    data: {
      name: "Blueprint Exam Test",
      email: `blueprint-${Date.now()}@test.local`,
      passwordHash: "x",
      role: "USER",
      selectedCategoryId: catBId,
    },
  });
  userId = u.id;

  // Detect the OFFICIAL cat-B content the blueprint suites need, by the drift-immune questionKey→section
  // bucketing: a full exam's worth of published cat-B questions AND each MANDATORY (non-remainder) block
  // populated to at least its minimum quota, so the blueprint composer can actually fill every block.
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
  // New 4-strata quotas (task 03): structure≥4, safety≥4, medical≥2 so the composer can fill each
  // fixed block; pdr is the remainder (always ample). Old medicine/law/general keys are gone.
  officialContentSeeded =
    catBPublished.length >= DEFAULT_EXAM_QUESTION_COUNT &&
    (availByBlock.structure?.length ?? 0) >= 4 &&
    (availByBlock.safety?.length ?? 0) >= 4 &&
    (availByBlock.medical?.length ?? 0) >= 2;
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  await prisma.question.deleteMany({ where: { topicId: plainTopicId } }).catch(() => undefined);
  await prisma.topic.delete({ where: { id: plainTopicId } }).catch(() => undefined);
  await prisma.category.delete({ where: { id: plainCatId } }).catch(() => undefined);
  await prisma.$disconnect();
});

/** Read a session's pooled questions WITH each topic's displayOrder, official section + CONTENT KEY. */
async function pooledWithDisplayOrder(sessionId: string) {
  const sqs = await prisma.testSessionQuestion.findMany({
    where: { testSessionId: sessionId },
    orderBy: { displayOrder: "asc" },
    include: {
      question: {
        select: {
          id: true,
          text: true,
          imageUrl: true,
          questionKey: true,
          topic: { select: { displayOrder: true } },
        },
      },
    },
  });
  return sqs.map((sq) => ({
    id: sq.questionId,
    displayOrder: sq.question.topic?.displayOrder ?? null,
    // official наказ section from the stable questionKey (the bucketing source, drift-immune)
    section: sectionFromQuestionKey(sq.question.questionKey ?? ""),
    // same content key the wiring layer builds: text + "||" + (imageUrl||"")
    contentKey: `${sq.question.text}||${sq.question.imageUrl ?? ""}`,
  }));
}

/** Bucket the pooled questions into blueprint blocks and count per block. */
function perBlockCounts(pooled: { id: string; section: number | null }[]) {
  const grouped = groupCandidatesByBlock(CATEGORY_B_BLUEPRINT, pooled);
  const counts: Record<string, number> = {};
  for (const [key, ids] of Object.entries(grouped)) counts[key] = ids.length;
  return counts;
}

describe("PIN: official section → topic title on the LIVE seed (so a renumbering fails loudly)", () => {
  it("§31 (ТЕХНІЧНИЙ СТАН) sits at displayOrder 132, §33 (ДОРОЖНІ ЗНАКИ) at 134", async (ctx) => {
    ctx.skip(!officialContentSeeded, "official ПДР content not imported — blueprint anchor topics absent");
    // LIVE reality — the import drifts to section+101, NOT section+99: §8 and §16 were each imported
    // as two Topics, so §31 lands at displayOrder 132 (not sectionDisplayOrder(31)=130) and §33 at 134.
    // Bucketing no longer relies on these numbers (it uses questionKey→section); this pin just makes a
    // future renumbering of the seed visible instead of silent.
    const structure = await prisma.topic.findFirst({ where: { displayOrder: 132 } });
    expect(structure?.title).toBe("ТЕХНІЧНИЙ СТАН ТРАНСПОРТНИХ ЗАСОБІВ ТА ЇХ ОБЛАДНАННЯ");

    const signs = await prisma.topic.findFirst({ where: { displayOrder: 134 } });
    expect(signs?.title).toBe("ДОРОЖНІ ЗНАКИ");
  });
});

describe("cat-B EXAM_SIMULATION follows the official 4-strata blueprint", () => {
  it("returns exactly 20 questions in the FIXED per-stratum quotas 4/4/2/10 (Goal #1)", async (ctx) => {
    ctx.skip(!officialContentSeeded, "official ПДР content not imported — cat-B blueprint pool absent");

    // Several independent sessions: the quotas are all FIXED, so every draw must reproduce the SAME
    // exact shape — repeating proves the composer holds it run-to-run (no lucky single draw).
    for (let run = 0; run < 8; run++) {
      const sessionId = await startSession({ userId, mode: "EXAM_SIMULATION", categoryId: catBId });

      const started = await prisma.testSession.findUnique({ where: { id: sessionId } });
      expect(started?.totalQuestions).toBe(DEFAULT_EXAM_QUESTION_COUNT); // 20

      const pooled = await pooledWithDisplayOrder(sessionId);
      expect(pooled).toHaveLength(20);
      expect(new Set(pooled.map((p) => p.id)).size).toBe(20); // no duplicate ids
      // Within-exam content dedup: all 20 must have DISTINCT (text + imageUrl) keys — no two
      // content-identical questions (same prompt+image) in the same exam, even across blocks.
      expect(new Set(pooled.map((p) => p.contentKey)).size).toBe(20);

      // Re-bucket the pooled 20 by questionKey→section and assert the EXACT official quotas.
      const c = perBlockCounts(pooled);
      expect(c.structure).toBe(4);
      expect(c.safety).toBe(4);
      expect(c.medical).toBe(2);
      expect(c.pdr).toBe(10); // remainder = 20 − (4 + 4 + 2)
      expect(c.structure + c.safety + c.medical + c.pdr).toBe(20);
    }
  });
});

// ── EVERY-TOPIC-MAPS (Goal #3) ──────────────────────────────────────────────────────────────────
// Every published cat-B question must bucket (via questionKey→section) into exactly one of the FOUR
// known strata — never a missing/undefined block. The union of the four buckets covers ALL published
// cat-B ids with none dropped or double-counted (the pdr remainder absorbs everything not claimed by
// structure/safety/medical, including section===null).
describe("every published cat-B question maps to one of the 4 strata (Goal #3)", () => {
  it("groupCandidatesByBlock yields only {structure,safety,medical,pdr} and covers every id", async (ctx) => {
    ctx.skip(!officialContentSeeded, "official ПДР content not imported — cat-B pool absent");

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

    const grouped = groupCandidatesByBlock(
      CATEGORY_B_BLUEPRINT,
      catBPublished.map((q) => ({ id: q.id, section: sectionFromQuestionKey(q.questionKey ?? "") })),
    );

    // Exactly the 4 blueprint keys, nothing else — no undefined/missing block ever produced.
    expect(Object.keys(grouped).sort()).toEqual(["medical", "pdr", "safety", "structure"]);

    // The union is a partition of the published pool: count preserved, no id dropped or duplicated.
    const union = Object.values(grouped).flat();
    expect(union).toHaveLength(catBPublished.length);
    expect(new Set(union).size).toBe(catBPublished.length);

    // Each named stratum is populated to at least its quota; pdr remainder is non-empty.
    expect(grouped.structure.length).toBeGreaterThanOrEqual(4);
    expect(grouped.safety.length).toBeGreaterThanOrEqual(4);
    expect(grouped.medical.length).toBeGreaterThanOrEqual(2);
    expect(grouped.pdr.length).toBeGreaterThan(0);
  });
});

// ── TIMEOUT-RULE PIN (Goal #5) ──────────────────────────────────────────────────────────────────
// Official rule (OFFICIAL-EXAM-STRUCTURE-2026-07-13.md п.11): «не надала відповіді на всі тестові
// питання у відведений … час» is a FAILING condition — unanswered-at-timeout ≡ wrong. Our finish
// path scores P(≥18 correct of 20): unanswered questions have no TestAnswer row, so they never add
// to `correct` and are counted as errors. This PINS that behaviour through the REAL finish path
// (startSession → submitAnswer → finishSession), it does not change it.
describe("cat-B EXAM_SIMULATION scores unanswered questions as wrong (Goal #5, timeout rule п.11)", () => {
  it("answering 17 correctly and leaving 3 unanswered ⇒ FAILED (3 errors > 2 budget)", async (ctx) => {
    ctx.skip(!officialContentSeeded, "official ПДР content not imported — cat-B blueprint pool absent");

    const sessionId = await startSession({ userId, mode: "EXAM_SIMULATION", categoryId: catBId });
    const sqs = await prisma.testSessionQuestion.findMany({
      where: { testSessionId: sessionId },
      orderBy: { displayOrder: "asc" },
      include: { question: { include: { options: true } } },
    });
    expect(sqs).toHaveLength(20);

    // Answer the first 17 CORRECTLY; leave the last 3 UNANSWERED (simulating a timeout). If
    // unanswered were ignored the 17 correct answers would PASS (0 errors); counting them as wrong
    // makes 3 errors ⇒ FAILED — so this assertion only holds under the official timeout rule.
    for (let i = 0; i < 17; i++) {
      const correct = sqs[i].question.options.find((o) => o.isCorrect)!;
      await submitAnswer({
        sessionId,
        userId,
        questionId: sqs[i].questionId,
        selectedOptionId: correct.id,
      });
    }

    const res = await finishSession(sessionId, userId);
    expect(res.total).toBe(20);
    expect(res.correct).toBe(17);
    expect(res.wrong).toBe(3); // the 3 unanswered count as wrong
    expect(res.result).toBe("FAILED");
  });
});

// ── REAL-SEED DIRECTIONAL ORACLE (Goal #4) ──────────────────────────────────────────────────────
// A throwaway user STRONG in signs (§33 → the pdr REMAINDER block) and WEAK in the mandatory small
// FIXED-quota blocks (structure §31/45, safety §35/47, medical §37) — ReviewStates attached to REAL
// seeded cat-B questions selected by questionKey→section, then `recomputeReadiness` against a FIXED
// clock. NB: the old law/general sections (§36/38/39/46) now fold into the pdr remainder (task 03),
// so they must NOT be seeded weak — only the three named strata are the weak small blocks. Proves
// the section-based bucketing actually reaches the dial's p-vector:
//   (a) the persisted `inputsJson.blocks` (array in CATEGORY_B_BLUEPRINT.blocks order) route signs
//       correctly — the pdr block reads meanProb ≥ 0.8 while ≥1 small block reads meanProb ≤ 0.3;
//   (b) the heterogeneous `passProbability` is STRICTLY LESS than the homogeneous (no-blocks) fallback
//       over the SAME seen retrievabilities — concentrated weakness in the small fixed-quota blocks is
//       NOT averaged away by the (large-remainder) strong signs block, as a pool-mean vector would.
const MS_PER_DAY = 86_400_000;

describe("blueprint bucketing drives the readiness p-vector by section (Goal #4)", () => {
  let dirUserId = "";
  let publishedCatBCount = 0;
  // A fixed reference clock: strong states are reviewed AT this moment (elapsed 0 ⇒ R = 1); weak
  // states were last reviewed a decade earlier with a tiny stability (R ≈ 0.07).
  const NOW = new Date("2026-07-12T12:00:00.000Z");

  beforeAll(async () => {
    if (!officialContentSeeded) return;

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
    publishedCatBCount = catBPublished.length;

    const bySection = (targets: number[]) => {
      const set = new Set(targets);
      return catBPublished
        .filter((q) => {
          const s = sectionFromQuestionKey(q.questionKey ?? "");
          return s != null && set.has(s);
        })
        .map((q) => q.id);
    };
    const signsIds = bySection([33]); // §33 → pdr remainder (STRONG)
    const structureIds = bySection([31, 45]);
    const safetyIds = bySection([35, 47]);
    const medicalIds = bySection([37]);

    const u = await prisma.user.create({
      data: {
        name: "Blueprint Readiness Dir",
        email: `bp-readiness-${Date.now()}@test.local`,
        passwordHash: "x",
        role: "USER",
        selectedCategoryId: catBId,
      },
    });
    dirUserId = u.id;

    // STRONG signs: high stability + lastReviewedAt == NOW ⇒ R = 1 (elapsed 0). Enough of them that
    // the learner's seen mean stays ≥ 0.5, so the honesty-floored unseen prior lands at 0.5 and the
    // homogeneous fallback's pool mean μ ≈ 0.5 (a real, non-vacuous pass window to be strictly below).
    for (const questionId of signsIds.slice(0, 25)) {
      await prisma.reviewState.create({
        data: {
          userId: dirUserId,
          questionId,
          stability: 100,
          state: "review",
          lastReviewedAt: NOW,
          dueAt: new Date(NOW.getTime() + 100 * MS_PER_DAY),
          reps: 1,
        },
      });
    }
    // WEAK small blocks: tiny stability + a decade-old review ⇒ R ≈ 0.07 (≤ 0.3).
    const weakLast = new Date(NOW.getTime() - 3650 * MS_PER_DAY);
    for (const ids of [structureIds, safetyIds, medicalIds]) {
      for (const questionId of ids.slice(0, 3)) {
        await prisma.reviewState.create({
          data: {
            userId: dirUserId,
            questionId,
            stability: 0.0001,
            state: "review",
            lastReviewedAt: weakLast,
            dueAt: NOW,
            reps: 1,
          },
        });
      }
    }
  });

  afterAll(async () => {
    // ReviewState + ReadinessSnapshot cascade on the user delete (schema.prisma).
    if (dirUserId) await prisma.user.delete({ where: { id: dirUserId } }).catch(() => undefined);
  });

  it("routes signs to pdr (meanProb ≥ .8) + small blocks weak (≤ .3); het pass-prob < homogeneous (Goal #4)", async (ctx) => {
    ctx.skip(!officialContentSeeded, "official ПДР content not imported — real-seed blueprint pool absent");

    await recomputeReadiness(dirUserId, catBId, prisma, NOW);

    const snapshot = await prisma.readinessSnapshot.findFirst({
      where: { userId: dirUserId, categoryId: catBId },
      orderBy: { createdAt: "desc" },
    });
    expect(snapshot).not.toBeNull();

    const parsed = JSON.parse(snapshot!.inputsJson) as {
      seenCount: number;
      blocks: { quota: number; meanProb: number }[];
    };

    // (a) inputsJson.blocks are stored in CATEGORY_B_BLUEPRINT.blocks order (recompute maps over them),
    // carrying only { quota, meanProb } — so identify blocks positionally against the blueprint.
    const pdrIdx = CATEGORY_B_BLUEPRINT.blocks.findIndex(
      (b) => b.key === CATEGORY_B_BLUEPRINT.remainderKey,
    );
    expect(parsed.blocks[pdrIdx].meanProb).toBeGreaterThanOrEqual(0.8);
    const smallMeans = CATEGORY_B_BLUEPRINT.blocks
      .map((b, i) => ({ key: b.key, meanProb: parsed.blocks[i].meanProb }))
      .filter((b) => b.key !== CATEGORY_B_BLUEPRINT.remainderKey);
    expect(smallMeans.some((b) => b.meanProb <= 0.3)).toBe(true);

    // (b) STRICTLY LESS than the homogeneous (no-blocks) fallback over the SAME seen retrievabilities.
    // recomputeReadiness derives seenR from the same per-user ReviewStates against the same NOW, so
    // rebuild the reference vector from those states — the difference is ONLY the block structure.
    const states = await prisma.reviewState.findMany({
      where: { userId: dirUserId },
      select: { stability: true, lastReviewedAt: true },
    });
    const seenR = states.map((s) => retrievability(s, NOW));
    const homogeneous = computeReadiness({
      seen: seenR,
      unseenCount: publishedCatBCount - seenR.length,
      unseenPrior: 0.5,
      blueprint: {
        questionCount: DEFAULT_EXAM_QUESTION_COUNT,
        passThreshold: DEFAULT_EXAM_QUESTION_COUNT - DEFAULT_EXAM_MAX_ERRORS,
        blocks: undefined,
      },
      mockAttempts: 0,
      mockPasses: 0,
      calibrationSlope: 1,
    });
    expect(snapshot!.passProbability).toBeLessThan(homogeneous.passProbability);
  });
});

describe("a category WITHOUT a blueprint is unaffected (legacy uniform-random)", () => {
  it("runs the short pool as-is (no blueprint composition)", async () => {
    const sessionId = await startSession({
      userId,
      mode: "EXAM_SIMULATION",
      categoryId: plainCatId,
    });
    const started = await prisma.testSession.findUnique({ where: { id: sessionId } });
    // The plain category has only 6 published questions and NO blueprint, so the exam runs short
    // (legacy behaviour: uniform-random over the whole category, capped by the pool size) — it does
    // NOT get padded/blueprinted to 20.
    expect(started?.totalQuestions).toBe(6);

    const pooled = await pooledWithDisplayOrder(sessionId);
    expect(pooled).toHaveLength(6);
    // All 6 came from the single throwaway topic (displayOrder 9999), proving no blueprint bucketing.
    expect(pooled.every((p) => p.displayOrder === 9999)).toBe(true);
  });
});
