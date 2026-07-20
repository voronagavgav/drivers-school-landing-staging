import type { ExamBlueprint, BlueprintBlock } from "@/lib/exam-blueprint";
import { shuffle } from "./selection";

// ---------------------------------------------------------------------------
// PURE blueprint-based exam composition. No DB: operates on a map of blockKey -> the question ids
// available for that block. Randomness is injectable (rng) so tests are deterministic — this module
// NEVER reads the clock. (The rng default is documented per the determinism-grep gate trap noted in
// CLAUDE.md: a whole-file grep for the wall-clock/random tokens should scope to the new fn, not the
// rng default param.)
// ---------------------------------------------------------------------------

/** Pick a count uniformly in [min, max] using the injectable rng. */
function pickInRange(min: number, max: number, rng: () => number): number {
  if (max <= min) return Math.max(0, min);
  const span = max - min + 1;
  return min + Math.floor(rng() * span);
}

/** The target count for a block before remainder/graceful adjustment. */
function blockTarget(block: BlueprintBlock, rng: () => number): number {
  if (block.range) return pickInRange(block.range[0], block.range[1], rng);
  return Math.max(0, block.count ?? 0);
}

export interface BlueprintSelectionResult {
  /** the chosen question ids, in final shuffled order */
  ids: string[];
  /** per-block count actually taken (keyed by block.key) — handy for tests/diagnostics */
  perBlock: Record<string, number>;
}

/** Optional knobs for {@link selectByBlueprint}. */
export interface BlueprintSelectionOptions {
  /**
   * Injectable randomness (defaults to Math.random). Pass a seeded rng for determinism.
   * Documented per the determinism-grep gate trap (CLAUDE.md): the wall-clock/random grep
   * should be scoped to the new logic, not this rng default param.
   */
  rng?: () => number;
  /**
   * Map of question id -> CONTENT KEY (e.g. `text + "||" + (imageUrl||"")`). When supplied, the
   * selection enforces GLOBAL content-uniqueness across the WHOLE draw: no two chosen ids may share
   * a content key (so a cat-B exam never serves two questions with the same prompt+image). An id
   * with no entry here is treated as its own unique key (never deduped against another) — so callers
   * that don't care about content-dedup keep the exact prior behaviour. NOTE: two questions sharing
   * a prompt but with DIFFERENT images have DIFFERENT keys and are BOTH eligible (by design).
   */
  contentKeyById?: Record<string, string>;
}

/**
 * Compose an exam from a blueprint and a map of blockKey -> available question ids.
 *
 * Honours each block's fixed count, picks a uniform count within a ranged block (via `rng`), and
 * fills the remainder block up to `blueprint.total`. Shuffles within every block (so which specific
 * questions are taken — and their order — varies per `rng`), then shuffles the final assembled set.
 *
 * When `opts.contentKeyById` is supplied, enforces GLOBAL content-uniqueness across the whole
 * selection (every block, not just within a block): while filling each block, any candidate whose
 * content key was already used by an earlier pick is skipped. This keeps a single exam from serving
 * two questions with the same prompt+image even when the duplicate spans two different blocks.
 *
 * Degrades gracefully: if a block has fewer available ids than its target (incl. after content-dedup
 * removes collisions) it takes ALL it can; the shortfall is then absorbed by the remainder block
 * (which tops up toward `total` from whatever it still has), and the result NEVER exceeds `total`,
 * never repeats an id, and never repeats a content key. Deterministic for a given `rng`. This
 * function does not read the clock or call Math.random directly (rng is injected).
 *
 * Back-compat: the third arg may be a bare rng `() => number` (legacy callers) OR an options object.
 */
export function selectByBlueprint(
  blueprint: ExamBlueprint,
  availableByBlock: Record<string, readonly string[]>,
  rngOrOpts: (() => number) | BlueprintSelectionOptions = Math.random,
): BlueprintSelectionResult {
  const opts: BlueprintSelectionOptions =
    typeof rngOrOpts === "function" ? { rng: rngOrOpts } : rngOrOpts;
  const rng = opts.rng ?? Math.random;
  const contentKeyById = opts.contentKeyById;

  const total = Math.max(0, blueprint.total);
  const used = new Set<string>();
  // content keys already represented in the selection (only when contentKeyById is supplied).
  const usedContentKeys = new Set<string>();
  const perBlock: Record<string, number> = {};
  const chosen: string[] = [];

  const take = (key: string, ids: readonly string[], want: number): void => {
    if (want <= 0) {
      perBlock[key] = perBlock[key] ?? 0;
      return;
    }
    const remainingTotal = total - chosen.length;
    const cap = Math.min(want, remainingTotal);
    if (cap <= 0) {
      perBlock[key] = perBlock[key] ?? 0;
      return;
    }
    // shuffle the available pool, then take the first `cap` not-yet-used ids, skipping any whose
    // content key is already represented (global content-dedup, across all blocks).
    const pool = shuffle([...ids], rng).filter((id) => !used.has(id));
    const picked: string[] = [];
    for (const id of pool) {
      if (picked.length >= cap) break;
      if (contentKeyById) {
        const ck = contentKeyById[id];
        // An id with no content key is its own unique key (never deduped); one with a key is
        // skipped if that key is already used by an earlier pick (in this or an earlier block).
        if (ck !== undefined) {
          if (usedContentKeys.has(ck)) continue;
          usedContentKeys.add(ck);
        }
      }
      picked.push(id);
    }
    for (const id of picked) used.add(id);
    chosen.push(...picked);
    perBlock[key] = (perBlock[key] ?? 0) + picked.length;
  };

  const remainderKey = blueprint.remainderKey;

  // Phase 1: fill every NON-remainder block to its (fixed or ranged) target.
  for (const block of blueprint.blocks) {
    if (block.key === remainderKey) continue;
    const target = blockTarget(block, rng);
    take(block.key, availableByBlock[block.key] ?? [], target);
  }

  // Phase 2: remainder block absorbs whatever is left up to total (and any shortfall above).
  perBlock[remainderKey] = perBlock[remainderKey] ?? 0;
  take(remainderKey, availableByBlock[remainderKey] ?? [], total - chosen.length);

  // Final shuffle so block order isn't observable in the question sequence.
  const ids = shuffle(chosen, rng);
  return { ids, perBlock };
}
