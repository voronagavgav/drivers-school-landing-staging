import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { retrievability } from "@/lib/fsrs";
import { topicMastery } from "@/lib/mastery";
import { effectiveN } from "@/lib/readiness-estimation";
import { READINESS_ANCHOR_STRENGTH } from "@/lib/readiness-model";
import { releaseDial } from "@/lib/readiness-release";
import { blueprintForCategoryCode, groupCandidatesByBlock } from "@/lib/exam-blueprint";
import { sectionFromQuestionKey } from "@/lib/content-key";
import {
  DEFAULT_EXAM_QUESTION_COUNT,
  READINESS_ESTIMATION_TIER,
  READINESS_MIN_SEEN,
  READINESS_MOCK_WINDOW,
  READINESS_RELEASE_GH_NODES,
  READINESS_RELEASE_MODEL_KEY,
  READINESS_TOPIC_CORRELATION,
  READINESS_TOPIC_CORRELATION_ESTIMATION,
} from "@/lib/constants";

// ---------------------------------------------------------------------------
// Server-authoritative mastery + readiness recompute (Wave 11 §D).
//
// This is the ONLY place TopicMastery rows and ReadinessSnapshot rows are
// materialised from the FSRS spine (ReviewState / ReviewLog). It reuses the
// ALREADY-oracle'd PURE models verbatim — `retrievability` (forgetting curve),
// `topicMastery` (band thresholds), and `computeReadiness` (Poisson-binomial +
// mock shrinkage) — and never re-derives R or the pass probability.
//
// Every function accepts an injected `tx = prisma` so it composes inside
// finishSession's flow AND runs standalone from the nightly job (wave11-14),
// which passes its OWN Prisma client. ALL delegate calls route through `tx`.
//
// Chunking: any id-list read is bounded to CHUNK_SIZE (≤200) to stay under the
// libsql query-parameter cap (P2029) — see project CLAUDE.md.
// ---------------------------------------------------------------------------

// Max bound values in a single `where: { id/topicId: { in: [...] } }` read.
const CHUNK_SIZE = 200;

// Conservative honesty-floored prior for an unseen item's per-item success
// probability (~0.5–0.6). `computeReadiness` further caps it at the learner's
// own seen mean, so thin coverage can never over-report readiness.
const READINESS_UNSEEN_PRIOR = 0.5;

/** Clamp a probability into [0,1] (mirrors the pure model's internal clamp). */
function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** Split `arr` into consecutive chunks of at most `size` (default CHUNK_SIZE). */
function chunk<T>(arr: readonly T[], size = CHUNK_SIZE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Integer median of a numeric list; null when empty. Even length → mean of the two middles, rounded. */
function medianInt(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const raw =
    sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(raw);
}

/**
 * Recompute + upsert the `TopicMastery` row for each of `topicIds` for a user.
 *
 * For each touched topic:
 *   - `meanR`  = mean `retrievability(state, now)` over that topic's seen `ReviewState`s (0 when none);
 *   - `coverage` = seen / total published-active questions in the topic (0..1, clamped);
 *   - `band`   = `topicMastery(...)` (lib/mastery.ts thresholds), feeding meanR as the accuracy proxy
 *                — this is an FSRS-retrievability recompute, so expected-correct = round(meanR × seen);
 *   - `medianLatencyMs` = integer median of the topic's `ReviewLog.latencyMs` (null when none).
 *
 * The per-user `ReviewState` set is loaded with a `where: { userId }` scan (no id-list); topic-scoped
 * reads chunk their `{ in: [...] }` id-lists to ≤CHUNK_SIZE. Accepts `tx` so it composes in a caller's
 * transaction OR runs standalone (nightly job).
 */
export async function recomputeTopicMastery(
  userId: string,
  topicIds: readonly string[],
  tx: Prisma.TransactionClient = prisma,
  now: Date = new Date(),
): Promise<void> {
  const ids = [...new Set(topicIds)].filter((id): id is string => !!id);
  if (ids.length === 0) return;

  // Per-user memory states — a single scan on the `userId` index, never an id-list of question ids.
  const states = await tx.reviewState.findMany({
    where: { userId },
    select: { questionId: true, stability: true, lastReviewedAt: true },
  });
  const stateByQuestion = new Map(states.map((s) => [s.questionId, s]));

  for (const chunkIds of chunk(ids)) {
    const questions = await tx.question.findMany({
      where: {
        topicId: { in: chunkIds },
        isActive: true,
        isPublished: true,
        archivedAt: null,
      },
      select: { id: true, topicId: true },
    });

    const logs = await tx.reviewLog.findMany({
      where: { userId, topicId: { in: chunkIds }, latencyMs: { not: null } },
      select: { topicId: true, latencyMs: true },
    });

    for (const topicId of chunkIds) {
      const topicQuestions = questions.filter((q) => q.topicId === topicId);
      const total = topicQuestions.length;

      let rSum = 0;
      let seen = 0;
      for (const q of topicQuestions) {
        const state = stateByQuestion.get(q.id);
        if (!state) continue;
        rSum += retrievability(state, now);
        seen += 1;
      }
      const meanR = seen > 0 ? rSum / seen : 0;

      // Reuse the pure band classifier's thresholds with meanR as the accuracy proxy.
      const { band, coverage } = topicMastery({
        answered: seen,
        correct: Math.round(meanR * seen),
        total,
      });

      const latencies = logs
        .filter((l) => l.topicId === topicId && l.latencyMs != null)
        .map((l) => l.latencyMs as number);
      const medianLatencyMs = medianInt(latencies);

      const fields = {
        meanR,
        coverage,
        band,
        itemsSeen: seen,
        itemsTotal: total,
        medianLatencyMs,
        computedAt: now,
      };

      await tx.topicMastery.upsert({
        where: { userId_topicId: { userId, topicId } },
        create: { userId, topicId, ...fields },
        update: fields,
      });
    }
  }
}

/**
 * Recompute + persist a `ReadinessSnapshot` for a user × category.
 *
 * The persisted dial is the wave19d EVIDENCE-RELEASING model "lm-gh1" (`@/lib/readiness-release`):
 * per blueprint block build `{ quota, seenR, nUnseen }` (seen retrievabilities + the block's
 * unseen exam slots), feed the Lahiri–Mukherjee seen/unseen split → exact Poisson-binomial
 * independence dial → evidence-decaying Gauss–Hermite factor mixture, and persist
 * `finalDial = min(mixtureDial, independenceDial)` as `dialPercent`/`passProbability`. The σ decays
 * in the mean per-item review mass M (`ReviewState.reps` over the seen items). INSUFFICIENT DATA is
 * first-class — with fewer than `READINESS_MIN_SEEN` seen questions the snapshot carries
 * `sufficientData:false` and `dialPercent = 0` (no hard dial). Accepts `tx`
 * (transaction-composable / nightly-reachable).
 *
 * The 19c per-block shrink (`correctBlockMeanProb`) NO LONGER feeds the persisted dial (wave19d-08);
 * its constants + lib remain for task 09 to retire. The draw-side `READINESS_TOPIC_CORRELATION`(=0)
 * and the honesty-regression gate stay byte-untouched.
 */
export async function recomputeReadiness(
  userId: string,
  categoryId: string | null,
  tx: Prisma.TransactionClient = prisma,
  now: Date = new Date(),
): Promise<void> {

  const category = categoryId
    ? await tx.category.findUnique({ where: { id: categoryId }, select: { code: true } })
    : null;
  const blueprint = blueprintForCategoryCode(category?.code);

  const questions = await tx.question.findMany({
    where: {
      isActive: true,
      isPublished: true,
      archivedAt: null,
      ...(categoryId ? { categories: { some: { id: categoryId } } } : {}),
    },
    select: { id: true, questionKey: true },
  });
  const total = questions.length;

  const states = await tx.reviewState.findMany({
    where: { userId },
    select: { questionId: true, stability: true, lastReviewedAt: true, reps: true },
  });
  const stateByQuestion = new Map(states.map((s) => [s.questionId, s]));

  const profile = await tx.userStudyProfile.findUnique({
    where: { userId },
    select: { calibrationSlope: true },
  });
  const calibrationSlope = profile?.calibrationSlope ?? 1;

  // Per-seen-item retrievability + review mass across the category's published pool.
  const seenR: number[] = [];
  const seenReps: number[] = [];
  for (const q of questions) {
    const state = stateByQuestion.get(q.id);
    if (state) {
      seenR.push(retrievability(state, now));
      seenReps.push(state.reps);
    }
  }
  const seenCount = seenR.length;

  // Per-item review-mass evidence M = mean `ReviewState.reps` over the seen items — the σ decay
  // input for the factor mixture (more reviews ⇒ smaller shared nuisance ⇒ release toward indep).
  const reviewMass =
    seenReps.length > 0 ? seenReps.reduce((a, c) => a + c, 0) / seenReps.length : 0;

  // Per-block release inputs `{ quota, seenR, nUnseen }` from the blueprint (or a single whole-pool
  // block when the category has none). `nUnseen` = the block's UNSEEN exam slots = max(0, quota −
  // nSeen); moving one from unseen (credited at the block's clamped extrapolation C) to seen at
  // R ≥ its prior never lowers the block's per-slot prob (the study-never-hurts / R2 guarantee).
  let releaseBlocks: { quota: number; seenR: number[]; nUnseen: number }[];
  if (blueprint) {
    const grouped = groupCandidatesByBlock(
      blueprint,
      questions.map((q) => ({ id: q.id, section: sectionFromQuestionKey(q.questionKey ?? "") })),
    );

    // Fixed / ranged (min) quotas, with the remainder block absorbing total − Σ(others).
    const quotaByKey: Record<string, number> = {};
    let othersQuota = 0;
    for (const b of blueprint.blocks) {
      if (b.key === blueprint.remainderKey) continue;
      const q = b.count ?? (b.range ? b.range[0] : 0);
      quotaByKey[b.key] = q;
      othersQuota += q;
    }
    quotaByKey[blueprint.remainderKey] = Math.max(0, blueprint.total - othersQuota);

    releaseBlocks = blueprint.blocks.map((b) => {
      const rs: number[] = [];
      for (const id of grouped[b.key] ?? []) {
        const state = stateByQuestion.get(id);
        if (state) rs.push(retrievability(state, now));
      }
      const quota = quotaByKey[b.key] ?? 0;
      return { quota, seenR: rs, nUnseen: Math.max(0, quota - rs.length) };
    });
  } else {
    releaseBlocks = [
      {
        quota: DEFAULT_EXAM_QUESTION_COUNT,
        seenR,
        nUnseen: Math.max(0, DEFAULT_EXAM_QUESTION_COUNT - seenCount),
      },
    ];
  }

  // The end-to-end release model: per-block split → PB independence → factor mixture → min-clamp.
  const release = releaseDial({ blocks: releaseBlocks, reviewMass, slope: calibrationSlope });

  // Persisted `blocks` stay positional { quota, meanProb } (wave19b convention); under the release
  // model `meanProb = pSlot` (the block's expected per-slot pass probability from the seen/unseen
  // split). The EXACT-reconstruction assert from wave19c (a single PB over these blocks reproduces
  // passProbability) NO LONGER holds — passProbability comes from the mixture/min-clamp, not one PB.
  const blocks = blueprint
    ? releaseBlocks.map((b, i) => ({ quota: b.quota, meanProb: release.perBlock[i].pSlot }))
    : undefined;

  // Mock evidence: the most-recent COMPLETED exam simulations for this category, over the per-category
  // `READINESS_MOCK_WINDOW`. `m` = attempts in window, `k` = PASSED count.
  const mocks = await tx.testSession.findMany({
    where: {
      userId,
      mode: "EXAM_SIMULATION",
      status: "COMPLETED",
      ...(categoryId ? { categoryId } : {}),
    },
    orderBy: { finishedAt: "desc" },
    take: READINESS_MOCK_WINDOW,
    select: { result: true },
  });
  const m = mocks.length;
  const k = mocks.filter((s) => s.result === "PASSED").length;

  // Mock-exam ANCHOR (restored wave19e-01; pre-19d lived inside `computeReadiness`, wave19d-08 silently
  // dropped it when the live dial moved to the release model). Beta-shrink each release probability
  // toward the observed mock pass-rate: `anchored(P) = clamp01((k + S·P) / (m + S))`, S =
  // READINESS_ANCHOR_STRENGTH pseudo-observations at the model estimate. RATIONALE: mock simulations are
  // DIRECT real-performance evidence, the only real outcomes the dial can see today; the output-side
  // Platt/calibration layer will eventually own residual model error but has ZERO real outcomes right
  // now, so this anchor is NOT removable until a calibration corpus exists (revisit then, via spec).
  // The SAME monotone-increasing affine map is applied to BOTH `final` and `independence`, so it
  // preserves the `final ≤ independence` honesty guarantee (no Math.min needed). At m=0 it is the
  // identity `(0 + S·P)/(0 + S) = P`, so a mock-less user sees exactly today's release-model dial.
  const anchored = (p: number) =>
    clamp01((k + READINESS_ANCHOR_STRENGTH * clamp01(p)) / (m + READINESS_ANCHOR_STRENGTH));

  const sufficientData = seenCount >= READINESS_MIN_SEEN;
  const passProbability = anchored(release.final);
  const dialPercent = sufficientData ? Math.round(anchored(release.final) * 100) : 0;
  const coverage = total > 0 ? seenCount / total : 0;

  // Independence (never-above) dial: the exact Poisson-binomial P(≥threshold) over the raw per-slot
  // p-vector, NO factor. The anchor is applied identically here, so `dialPercent ≤ dialIndep` still
  // holds by construction (`releaseDial` guarantees `final ≤ independence`, the affine map is monotone).
  // Gated by `sufficientData` exactly like `dialPercent`.
  const dialIndep = sufficientData ? Math.round(anchored(release.independence) * 100) : 0;

  // Per-block audit `{ nSeen, C }` (positionally aligned to `blocks`) + effective sample sizes.
  // `nEff` (19c audit, retained append-only though the shrink no longer feeds the dial) rounds
  // `effectiveN(nSeen, ρ_est)` to 4dp; `blockStats` carries each block's seen count + clamped
  // unseen extrapolation `C` (4dp).
  const round4 = (x: number) => Math.round(x * 10000) / 10000;
  const blockStats = blueprint
    ? release.perBlock.map((pb) => ({ nSeen: pb.nSeen, C: round4(pb.C) }))
    : [];
  const nEff = blueprint
    ? release.perBlock.map((pb) =>
        round4(effectiveN(pb.nSeen, READINESS_TOPIC_CORRELATION_ESTIMATION)),
      )
    : [];

  // Bottleneck = the user's weakest seen topic (lowest meanR). TopicMastery is recomputed just before
  // this in finishSession's flow, so it reflects the session's touched topics.
  const bottleneck = await tx.topicMastery.findFirst({
    where: { userId, itemsSeen: { gt: 0 } },
    orderBy: { meanR: "asc" },
    select: { topicId: true },
  });
  let bottleneckTitle: string | null = null;
  if (bottleneck) {
    const topic = await tx.topic.findUnique({
      where: { id: bottleneck.topicId },
      select: { title: true },
    });
    bottleneckTitle = topic?.title ?? null;
  }

  const meanR = seenCount > 0 ? seenR.reduce((a, c) => a + c, 0) / seenCount : 0;

  const inputsJson = JSON.stringify({
    sufficientData,
    seenCount,
    meanR,
    priorUnseen: READINESS_UNSEEN_PRIOR,
    mock: { m, k },
    blocks: blocks ?? [],
    // Audit trail (wave19b): the ρ actually applied to this snapshot, the model
    // engine/version tag, and the calibrator id (null until a data-gated wave wires
    // the Platt fit into the live dial). inputsJson is APPEND-ONLY — readers must
    // tolerate old rows lacking these keys (getLatestReadiness treats missing rho
    // as absent/0), so never rename/remove existing fields.
    rho: READINESS_TOPIC_CORRELATION,
    engine: "fsrs6",
    calibratorId: null,
    // Estimation-side ρ audit (wave19c-08, APPEND-ONLY): the estimation ρ actually applied
    // (distinct from the dead draw-side `rho` above, still 0), the live shrinkage tier, the
    // per-block effective sample size (positionally aligned to `blocks`, 4dp), and the
    // UNCORRECTED independence dial for tier-vs-outcome calibration.
    rhoEst: READINESS_TOPIC_CORRELATION_ESTIMATION,
    tier: READINESS_ESTIMATION_TIER,
    nEff,
    dialIndep,
    // Release model "lm-gh1" audit (wave19d-08, APPEND-ONLY): the model key, the shared-factor scale
    // σ actually used (decays in `reviewMass`), the Gauss–Hermite node count, and per-block
    // { nSeen, C } (positionally aligned to `blocks`). `dialIndep` above is now the release model's
    // independence dial. Existing keys untouched — never rename/remove.
    model: READINESS_RELEASE_MODEL_KEY,
    sigma: release.sigma,
    nodeCount: READINESS_RELEASE_GH_NODES,
    blockStats,
    // Mock-exam anchor restored (wave19e-01, APPEND-ONLY): the persisted `dialPercent`/`passProbability`/
    // `dialIndep` are the release probabilities Beta-shrunk toward the `mock` pass-rate above. `true`
    // unconditionally — at m=0 the anchor is the identity, so the flag records that the blend is wired.
    anchored: true,
  });

  await tx.readinessSnapshot.create({
    data: {
      userId,
      categoryId: categoryId ?? undefined,
      passProbability,
      dialPercent,
      coverage,
      calibrationSlope: profile?.calibrationSlope ?? null,
      bottleneckTopicId: bottleneck?.topicId ?? null,
      bottleneckTitle,
      inputsJson,
    },
  });
}

/**
 * Read the latest `ReadinessSnapshot` for a user × category, plus the parsed audit fields the UI
 * needs: `{ sufficientData, seenCount, dialPercent, bottleneckTopicId, mock }`. Returns null when the
 * user has no snapshot yet.
 */
export async function getLatestReadiness(userId: string, categoryId: string | null) {
  const snapshot = await prisma.readinessSnapshot.findFirst({
    where: { userId, ...(categoryId ? { categoryId } : {}) },
    orderBy: { createdAt: "desc" },
  });
  if (!snapshot) return null;

  // inputsJson is append-only; `rho`/`engine` were added in wave19b. Old snapshots
  // lack them — a missing `rho` is treated as absent/0 (the pre-correlation dial)
  // and a missing `engine` as null. All fields stay optional so parsing never throws.
  let parsed: {
    sufficientData?: boolean;
    seenCount?: number;
    mock?: { m: number; k: number };
    rho?: number;
    engine?: string;
  } = {};
  try {
    parsed = JSON.parse(snapshot.inputsJson);
  } catch {
    parsed = {};
  }

  return {
    snapshot,
    sufficientData: parsed.sufficientData ?? false,
    seenCount: parsed.seenCount ?? 0,
    dialPercent: snapshot.dialPercent,
    bottleneckTopicId: snapshot.bottleneckTopicId,
    mock: parsed.mock ?? { m: 0, k: 0 },
    rho: parsed.rho ?? 0,
    engine: parsed.engine ?? null,
  };
}
