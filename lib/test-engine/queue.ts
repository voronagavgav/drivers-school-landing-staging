import { retrievability } from "@/lib/fsrs";
import type { ReviewMemoryState } from "@/lib/fsrs";
import { shuffle } from "./selection";

// ---------------------------------------------------------------------------
// Pure review-queue picker for the adaptive SRS mode. Scoring REUSES the FSRS
// forgetting curve (`retrievability` from lib/fsrs) — it never re-derives R.
// The clock (`now`) and randomness (`rng`) are injected, scoped exactly like
// `selection.ts`, so ordering is deterministic under test. No DB, no clock read,
// no JSX.
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86_400_000;

/** The FSRS memory fields the queue scorer reads from a card's state. */
export type ScoredState = Pick<
  ReviewMemoryState,
  "stability" | "lastReviewedAt" | "dueAt"
>;

/**
 * How far PAST its scheduled due moment a card is, as a multiple of its own review interval —
 * the spec §4.1 formula: `max(0, now − dueAt) / (dueAt − lastReviewedAt)`. Equals 0 up to and AT
 * the due moment, then grows by 1 per elapsed interval. (Post-wave10f-review fix: the earlier
 * `(now − lastReviewedAt) / interval` variant sat a constant +1 above spec, so fresh not-yet-due
 * cards carried phantom overdueness.) A never-reviewed card (null `lastReviewedAt`) returns 0 —
 * it enters via the new-item lane, not the review score. Pure: `now` is injected.
 */
function overdueness(state: ScoredState, now: Date): number {
  const last = state.lastReviewedAt;
  if (last == null) return 0;
  const due = state.dueAt;
  // Scheduled but with no due anchor → not measurably overdue; rely on the (1 − R) factor alone.
  if (due == null) return 0;
  const overdueMs = now.getTime() - due.getTime();
  const intervalMs = due.getTime() - last.getTime();
  // Degenerate interval (≤ 0) → measure overdue time against a 1-day floor.
  const denom = intervalMs > 0 ? intervalMs : MS_PER_DAY;
  return Math.max(0, overdueMs / denom);
}

/**
 * Named weights for the additive review-priority score (spec §4.1). An ADDITIVE weighted
 * sum — never a product — so no single zero factor can annihilate the score (a year-overdue,
 * nearly-forgotten card in a fully-mastered topic must still outrank a fresh one). Overdueness
 * and forgetting `(1 − R)` are the dominant terms; topic weakness is a smaller boost; a tiny
 * stability-based term breaks otherwise-equal ties deterministically (more fragile memory first).
 */
export const SCORE_WEIGHTS = {
  /** Dominant: how far past due, via a saturating transform (see `overdueSaturation`). */
  overdue: 1,
  /** Dominant: forgetting pressure `(1 − R)`, R the FSRS retrievability. */
  forget: 1,
  /** Secondary boost for a weak topic (0..1). Smaller than the two dominant terms. */
  weakness: 0.3,
  /** Tiny deterministic tiebreak: fragile (low-stability) memory nudged ahead of durable. */
  tiebreak: 0.01,
} as const;

/**
 * Bound raw overdueness [0, ∞) into [0, 1) so it stays on the same scale as `(1 − R)` and can't
 * dominate the sum without limit: `x / (1 + x)`. Equals 0.5 exactly at the due moment (x = 1).
 */
function overdueSaturation(x: number): number {
  return x / (1 + x);
}

/**
 * Priority score for a review candidate: the spec §4.1 ADDITIVE weighted sum
 * `wOverdue·f(overdueness) + wForget·(1 − R) + wWeak·topicWeakness + wTiebreak·1/(1 + stability)`
 * (weights in {@link SCORE_WEIGHTS}). Higher ⇒ more worth reviewing now. `R` is the FSRS
 * retrievability (reused from `lib/fsrs`, never re-derived); `1 − R` is the forgetting pressure.
 * Because the terms ADD rather than multiply, an overdue, low-R card scores strictly positive
 * even when `topicWeakness = 0` — it can't be zeroed out by a mastered topic. Pure + deterministic
 * — `now` is injected.
 */
export function scoreCandidate(
  state: ScoredState,
  now: Date,
  topicWeakness: number,
): number {
  const r = retrievability(state, now);
  const stability = state.stability > 0 ? state.stability : 0;
  return (
    SCORE_WEIGHTS.overdue * overdueSaturation(overdueness(state, now)) +
    SCORE_WEIGHTS.forget * (1 - r) +
    SCORE_WEIGHTS.weakness * topicWeakness +
    SCORE_WEIGHTS.tiebreak * (1 / (1 + stability))
  );
}

/** Default fraction of the queue reserved for unseen ("new") items so coverage grows. */
export const DEFAULT_NEW_ITEM_SHARE = 0.2;

/**
 * One review-queue candidate. `state` is the FSRS memory: present ⇒ a seen card scored by the
 * forgetting curve; null/absent ⇒ an unseen "new" item eligible only for the new-item lane.
 */
export interface QueueCandidate {
  questionId: string;
  topicId: string;
  /** 0..1 weakness of this candidate's topic for the user (higher ⇒ prioritised). */
  topicWeakness: number;
  state?: ScoredState | null;
}

/** Options for {@link selectReviewQueue}. `now`/`rng` are injected so ordering is deterministic. */
export interface QueueOptions {
  now: Date;
  rng?: () => number;
  /** Target queue length. */
  size: number;
  /** Fraction of `size` reserved for unseen items (bounded; defaults to DEFAULT_NEW_ITEM_SHARE). */
  newItemShare?: number;
  /**
   * When true, top up with EXTRA unseen items to reach `size` if seen cards run short (the old
   * fill-to-size behaviour). Default false ⇒ `newItemShare` is a CAP, not a fill target: at most
   * `round(size × share)` new items are injected and the queue may return FEWER than `size`.
   */
  backfillWithNew?: boolean;
}

/**
 * Proportionally interleave two ordered streams so the shorter one is spread evenly through the
 * longer rather than clustered at either end (a fair, Bresenham-style merge). Pure + deterministic.
 */
function interleave<T>(primary: T[], secondary: T[]): T[] {
  const out: T[] = [];
  const nP = primary.length;
  const nS = secondary.length;
  let pi = 0;
  let si = 0;
  while (pi < nP || si < nS) {
    const takePrimary = si >= nS || (pi < nP && (pi + 0.5) / nP <= (si + 0.5) / nS);
    out.push(takePrimary ? primary[pi++] : secondary[si++]);
  }
  return out;
}

/**
 * Build an ordered review queue of `questionId`s from scored candidates:
 *  - SEEN cards are ranked by {@link scoreCandidate} (overdue, low-R, weak-topic first);
 *  - a bounded `round(size × newItemShare)` share of UNSEEN items is injected (rng-shuffled) so
 *    coverage grows without swamping review;
 *  - the two streams are interleaved, then greedily reordered so no 3 consecutive items share a
 *    `topicId` where alternatives exist, keeping topics varied.
 * Pure + deterministic: the clock (`now`) and randomness (`rng`) are injected, so identical inputs
 * with the same seeded `rng` always yield the same ordering. `rng` defaults to the global PRNG.
 */
export function selectReviewQueue(
  candidates: QueueCandidate[],
  {
    now,
    rng = Math.random,
    size,
    newItemShare = DEFAULT_NEW_ITEM_SHARE,
    backfillWithNew = false,
  }: QueueOptions,
): string[] {
  if (size <= 0 || candidates.length === 0) return [];

  const seen = candidates.filter((c) => c.state != null);
  const unseen = candidates.filter((c) => c.state == null);

  // Rank seen cards by review priority (desc); ties break by questionId for determinism.
  const rankedSeen = seen
    .map((c) => ({ c, score: scoreCandidate(c.state as ScoredState, now, c.topicWeakness) }))
    .sort((a, b) =>
      b.score !== a.score
        ? b.score - a.score
        : a.c.questionId < b.c.questionId
          ? -1
          : a.c.questionId > b.c.questionId
            ? 1
            : 0,
    )
    .map((x) => x.c);

  // `newItemShare` is a CAP: at most round(size × share) unseen items enter the queue. When seen
  // cards run short the queue stays short by design — UNLESS `backfillWithNew` opts back into the
  // old fill-to-size behaviour, topping up with extra unseen items to reach `size`.
  const share = Math.min(1, Math.max(0, newItemShare));
  const newTarget = Math.min(unseen.length, Math.round(size * share));
  const seenCount = Math.min(rankedSeen.length, size - newTarget);
  const newCount = backfillWithNew
    ? Math.min(unseen.length, size - seenCount)
    : newTarget;

  const chosenSeen = rankedSeen.slice(0, seenCount);
  const chosenNew = shuffle(unseen, rng).slice(0, newCount);

  // Interleave (spreads new items through the review stream), tagging each with its merge order.
  const merged = interleave(chosenSeen, chosenNew).map((c, order) => ({ c, order }));

  // Greedy: repeatedly take the smallest-order candidate whose topic won't form a 3-in-a-row.
  const result: string[] = [];
  let prev1: string | null = null;
  let prev2: string | null = null;
  while (merged.length > 0) {
    const blocked = prev1 !== null && prev1 === prev2 ? prev1 : null;
    let pick = -1;
    for (let i = 0; i < merged.length; i++) {
      if (blocked !== null && merged[i].c.topicId === blocked) continue;
      if (pick === -1 || merged[i].order < merged[pick].order) pick = i;
    }
    // All remaining share the blocked topic (no alternative) → forced; take the smallest order.
    if (pick === -1) {
      for (let i = 0; i < merged.length; i++) {
        if (pick === -1 || merged[i].order < merged[pick].order) pick = i;
      }
    }
    const [chosen] = merged.splice(pick, 1);
    result.push(chosen.c.questionId);
    prev2 = prev1;
    prev1 = chosen.c.topicId;
  }
  return result;
}
