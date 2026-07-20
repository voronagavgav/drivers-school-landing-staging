import { selectReviewQueue } from "./queue";
import type { QueueCandidate } from "./queue";
import {
  QUICK_COUNT,
  QUICK_NEW_BUDGET,
  SIGN_TRAINER_COUNT,
  SIGN_TRAINER_NEW_BUDGET,
  MARATHON_PAGE,
} from "@/lib/constants";

// ---------------------------------------------------------------------------
// Pure selection presets for the wave-15 practice modes (QUICK / SIGN_TRAINER /
// MARATHON). Each is a thin PARAMETERIZATION of `selectReviewQueue` (see queue.ts)
// over an ALREADY pool-filtered candidate list — this module never filters by
// topic/image/category; the server does that before calling in. The clock (`now`)
// and randomness (`rng`) are injected so ordering is deterministic under test.
//
// No reimplemented scoring/interleave — every preset delegates ranking, the
// bounded new-item lane, and topic-varying to `selectReviewQueue`; a preset only
// picks the size, new-item share, and (MARATHON) the exclude filter.
// ---------------------------------------------------------------------------

/** Options shared by the fixed-size presets. `now`/`rng` are injected (deterministic). */
export interface PresetOptions {
  now: Date;
  rng?: () => number;
}

/**
 * QUICK: a short warm-up — size QUICK_COUNT (10), new-item share
 * QUICK_NEW_BUDGET/QUICK_COUNT (0.4), backfillWithNew so a brand-new user still gets a full page.
 */
export function selectQuickQueue(
  candidates: QueueCandidate[],
  opts: PresetOptions,
): string[] {
  return selectReviewQueue(candidates, {
    now: opts.now,
    rng: opts.rng,
    size: QUICK_COUNT,
    newItemShare: QUICK_NEW_BUDGET / QUICK_COUNT,
    backfillWithNew: true,
  });
}

/**
 * SIGN_TRAINER: road-signs drill — size SIGN_TRAINER_COUNT (20), new-item share
 * SIGN_TRAINER_NEW_BUDGET/SIGN_TRAINER_COUNT (0.4), backfillWithNew. The candidate list is
 * already scoped to sign questions by the server; this preset never filters.
 */
export function selectSignTrainerQueue(
  candidates: QueueCandidate[],
  opts: PresetOptions,
): string[] {
  return selectReviewQueue(candidates, {
    now: opts.now,
    rng: opts.rng,
    size: SIGN_TRAINER_COUNT,
    newItemShare: SIGN_TRAINER_NEW_BUDGET / SIGN_TRAINER_COUNT,
    backfillWithNew: true,
  });
}

/**
 * MARATHON page: paged endless practice — drop already-served `excludeIds` first, then take a
 * page of size MARATHON_PAGE (20) at the default new-item share (0.2), backfillWithNew.
 */
export function selectMarathonPage(
  candidates: QueueCandidate[],
  excludeIds: ReadonlySet<string>,
  opts: PresetOptions,
): string[] {
  // Drop already-served ids BEFORE selection so backfill can never resurrect an excluded item.
  const remaining = candidates.filter((c) => !excludeIds.has(c.questionId));
  return selectReviewQueue(remaining, {
    now: opts.now,
    rng: opts.rng,
    size: MARATHON_PAGE,
    // default new-item share (0.2) — omit to inherit selectReviewQueue's DEFAULT_NEW_ITEM_SHARE
    backfillWithNew: true,
  });
}
