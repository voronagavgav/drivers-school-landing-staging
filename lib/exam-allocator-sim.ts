// ---------------------------------------------------------------------------
// PURE deterministic simulation ENGINE for the Wave 23 exam-allocator spike
// (spec `specs/wave23-exam-allocator-spike.md`, Deliverable 3). NOT in the unit
// suite — a `tsx` spike whose determinism is pinned separately (wave23-06).
//
// This module is the importable CELL ENGINE: it wires BOTH daily-selection
// policies — the greedy dial-delta ALLOCATOR (`@/lib/exam-allocator`) and the
// CURRENT production queue baseline (`selectReviewQueue`, `@/lib/test-engine/
// queue`) — through the SHIPPED FSRS pipeline (`schedule`/`retrievability`/
// `deriveGrade`/`gradePosterior`/`slipAdjustedLapse`, `@/lib/fsrs`) at equal
// budget, then scores each policy's exam-day state with the SAME `releaseDial`
// (`@/lib/readiness-release`). It re-implements NONE of that math — every model
// symbol is imported. See `tasks/wave23-02-sim-pipeline-map/FINDINGS.md` for the
// exact pipeline contract this composes.
//
// PURITY: no DB, no server-runtime marker, no wall-clock read, no RNG global.
// All randomness is a seeded LCG; the "today" clock is a simulated `Date` advanced
// per day from a fixed explicit epoch. Two runs with the same seed produce
// byte-identical output (the wave23-05/06 determinism gate).
//
// DIRECTIONAL-ORACLE DISCIPLINE (spec ⚠, wave19b lesson): this is the
// INSTRUMENT — it reports whatever it measures. If the allocator loses on the
// below-threshold population, the verdict prints NO-GO honestly. The measurement
// RUN + report are wave23-07; this task builds the instrument, wave23-06 pins it.
// ---------------------------------------------------------------------------

import {
  retrievability,
  schedule,
  slipAdjustedLapse,
  deriveGrade,
  gradePosterior,
  intervalDays,
  FSRS_GUESS_DEFAULT,
  FSRS_TARGET_RETENTION,
  type ReviewMemoryState,
} from "@/lib/fsrs";
import { releaseDial, type ReleaseInput, type ReleaseBlockInput } from "@/lib/readiness-release";
import { allocate, type AllocatorCandidate } from "@/lib/exam-allocator";
import {
  selectReviewQueue,
  DEFAULT_NEW_ITEM_SHARE,
  type QueueCandidate,
} from "@/lib/test-engine/queue";
import { CATEGORY_B_BLUEPRINT } from "@/lib/exam-blueprint";

// ---- deterministic clock (documented explicit-ms simulated `Date`) ----------
const MS_PER_DAY = 86_400_000;
/** Fixed simulated epoch = 2026-01-01T00:00:00Z (`Date.UTC(2026,0,1)`), a LITERAL
 *  so the purity grep sees no clock read. All clocks derive from this by day offset. */
const SIM_EPOCH_MS = 1_767_225_600_000;
const clockAt = (day: number): Date => new Date(SIM_EPOCH_MS + day * MS_PER_DAY);

// 4-option ПДР items ⇒ the guess floor an unseen item is answered at (p = g).
const GUESS = FSRS_GUESS_DEFAULT; // 0.25
const OPTION_COUNT = 4;

// ---- seeded LCG (Numerical Recipes constants) -------------------------------
/** A pure 32-bit LCG returning a float in [0,1); no RNG global, no clock. */
export function makeLcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4_294_967_296;
  };
}

/** Deterministically derive a fresh 32-bit seed from a base seed + integer parts
 *  (splitmix-style avalanche), so per-cell and per-replica streams are distinct. */
export function deriveSeed(base: number, ...parts: number[]): number {
  let h = base >>> 0;
  for (const p of parts) {
    h = Math.imul(h ^ (p >>> 0), 2654435761) >>> 0;
    h ^= h >>> 15;
    h = Math.imul(h, 2246822519) >>> 0;
    h ^= h >>> 13;
  }
  return h >>> 0;
}

const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

/** Fisher–Yates shuffle driven by the injected rng (pure, deterministic). */
function shuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

// ---- blueprint blocks: exam quota + a synthetic pool (quota × POOL_MULT) -----
// The exam draws `quota` slots per stratum; the student's POOL is a small
// multiple so a per-day budget B < poolTotal genuinely BINDS (the policies must
// choose). Quotas are resolved from the REAL `CATEGORY_B_BLUEPRINT` (the ПДР
// remainder `pdr` = total − named strata = 10). Order matches the allocator
// oracle fixture: [pdr, structure(build), safety, medical].
const POOL_MULT = 6;
interface BlockDef {
  key: string;
  quota: number;
  pool: number;
}
const BLOCKS: BlockDef[] = (() => {
  const bp = CATEGORY_B_BLUEPRINT;
  const namedSum = bp.blocks
    .filter((b) => b.key !== bp.remainderKey)
    .reduce((a, b) => a + (b.count ?? 0), 0);
  const quotaOf = (key: string, count: number) =>
    key === bp.remainderKey ? bp.total - namedSum : count;
  const order = ["pdr", "structure", "safety", "medical"];
  return order.map((key) => {
    const b = bp.blocks.find((x) => x.key === key);
    const quota = quotaOf(key, b?.count ?? 0);
    return { key, quota, pool: quota * POOL_MULT };
  });
})();

// Fixed item ids per block (stable across a run) + the block index each maps to.
interface Item {
  id: string;
  blockIndex: number;
}
const ITEMS: Item[] = BLOCKS.flatMap((blk, blockIndex) =>
  Array.from({ length: blk.pool }, (_, n) => ({ id: `${blk.key}-${n}`, blockIndex })),
);

// ---- student profiles (priors) ----------------------------------------------
interface Profile {
  seenFraction: number; // fraction of the pool already studied at t=0
  meanR: number; // mean day-0 retrievability of the studied items
}
const PROFILES: Record<PriorKey, Profile> = {
  weak: { seenFraction: 0.25, meanR: 0.55 },
  median: { seenFraction: 0.5, meanR: 0.7 },
  strong: { seenFraction: 0.8, meanR: 0.85 },
};
export type PriorKey = "weak" | "median" | "strong";

/** Build the shared t=0 memory state for one replica (BOTH arms start here). */
function buildInitStates(prior: PriorKey, rng: () => number): Map<string, ReviewMemoryState> {
  const prof = PROFILES[prior];
  const states = new Map<string, ReviewMemoryState>();
  for (const it of ITEMS) {
    if (rng() < prof.seenFraction) {
      const R = clamp(prof.meanR + (rng() - 0.5) * 0.3, 0.3, 0.98);
      const stability = 2 + rng() * 10; // 2..12 days
      const reps = 1 + Math.floor(rng() * 6); // 1..6
      const elapsedDays = intervalDays(stability, R); // lastReviewedAt = t0 − elapsed ⇒ R at t0
      const lastReviewedAt = new Date(SIM_EPOCH_MS - elapsedDays * MS_PER_DAY);
      const dueAt = new Date(
        lastReviewedAt.getTime() + intervalDays(stability, FSRS_TARGET_RETENTION) * MS_PER_DAY,
      );
      states.set(it.id, {
        stability,
        difficulty: 5,
        state: "review",
        dueAt,
        lastReviewedAt,
        reps,
        lapses: 0,
      });
    } else {
      states.set(it.id, {
        stability: 0,
        difficulty: 0,
        state: "new",
        dueAt: null,
        lastReviewedAt: null,
        reps: 0,
        lapses: 0,
      });
    }
  }
  return states;
}

const isSeen = (st: ReviewMemoryState): boolean => st.lastReviewedAt != null;

// ---- shared release-input builder (Goal 5: ONE scoring path for both arms) ---
// Assembles the `ReleaseInput` from a state map at clock `at`: per block, seenR =
// projected retrievability of the block's SEEN items, nUnseen = its unstudied
// slots, quota = the blueprint count. reviewMass = mean reps over seen items.
function buildReleaseInput(states: Map<string, ReviewMemoryState>, at: Date): ReleaseInput {
  const blocks: ReleaseBlockInput[] = [];
  let repsSum = 0;
  let seenCount = 0;
  for (let bi = 0; bi < BLOCKS.length; bi++) {
    const seenR: number[] = [];
    let nUnseen = 0;
    for (const it of ITEMS) {
      if (it.blockIndex !== bi) continue;
      const st = states.get(it.id)!;
      if (isSeen(st)) {
        seenR.push(retrievability(st, at));
        repsSum += st.reps;
        seenCount++;
      } else {
        nUnseen++;
      }
    }
    blocks.push({ quota: BLOCKS[bi].quota, seenR, nUnseen });
  }
  return { blocks, reviewMass: seenCount > 0 ? repsSum / seenCount : 0, slope: 1 };
}

/** The SINGLE exam-day scoring helper both policies are scored through: the
 *  shipped release dial's `.final` pass-prob over the 4-strata blueprint. */
export function scorePassProb(states: Map<string, ReviewMemoryState>, examNow: Date): number {
  return releaseDial(buildReleaseInput(states, examNow)).final;
}

// ---- one review: mirror the production answer path (study.ts) ----------------
// Sample correctness, then update state EXACTLY as the server does: wrong on a
// card WITH history ⇒ `slipAdjustedLapse`; every correct answer and a wrong on a
// fresh `new` card ⇒ `schedule` (study.ts:157-168).
function applyReview(
  st: ReviewMemoryState,
  now: Date,
  rng: () => number,
): ReviewMemoryState {
  const seen = isSeen(st);
  const p = seen ? retrievability(st, now) : GUESS;
  const correct = rng() < p;
  const priorKnow = seen ? retrievability(st, now) : 0.5;
  const grade = deriveGrade({ correct, priorKnow, optionCount: OPTION_COUNT });
  return !correct && seen
    ? slipAdjustedLapse(st, gradePosterior({ correct: false, priorKnow, optionCount: OPTION_COUNT }), now)
    : schedule(st, grade, now);
}

// ---- BASELINE arm: the production queue policy, verbatim ---------------------
function baselinePicks(
  states: Map<string, ReviewMemoryState>,
  now: Date,
  B: number,
  rng: () => number,
): string[] {
  // Per-topic weakness = 1 − mean seen retrievability of the block (unseen-only
  // block ⇒ neutral 0.5), so the queue's weakness term has real signal.
  const blockWeak: number[] = BLOCKS.map((_, bi) => {
    let sum = 0;
    let n = 0;
    for (const it of ITEMS) {
      if (it.blockIndex !== bi) continue;
      const st = states.get(it.id)!;
      if (isSeen(st)) {
        sum += retrievability(st, now);
        n++;
      }
    }
    return n > 0 ? clamp(1 - sum / n, 0, 1) : 0.5;
  });
  const candidates: QueueCandidate[] = ITEMS.map((it) => {
    const st = states.get(it.id)!;
    return {
      questionId: it.id,
      topicId: BLOCKS[it.blockIndex].key,
      topicWeakness: blockWeak[it.blockIndex],
      state: isSeen(st) ? st : null,
    };
  });
  return selectReviewQueue(candidates, { now, rng, size: B });
}

// ---- ALLOCATOR arm: dial-delta seen lane + matched unseen coverage lane ------
// The wave23-04 allocator scores reviewing a SEEN slot by its expected exam-day
// dial delta. To grow coverage WITHOUT a modeling artifact that starves the
// allocator of unseen items (which the dial's honesty clamp punishes hard), the
// arm reserves the SAME `round(B × DEFAULT_NEW_ITEM_SHARE)` unseen share the
// baseline queue does — so both arms spend an equal budget and differ ONLY in
// how the SEEN review lane is ranked (dial-delta vs queue-score). The seen lane
// is the REAL `allocate` over the REAL `releaseDial`; nothing is re-derived.
function allocatorPicks(
  states: Map<string, ReviewMemoryState>,
  now: Date,
  examNow: Date,
  B: number,
  rng: () => number,
): string[] {
  const input = buildReleaseInput(states, examNow);

  // Build the seen-lane allocator candidates, seenIndex in the SAME per-block
  // order `buildReleaseInput` pushed them (fixed ITEMS order).
  const candidates: AllocatorCandidate[] = [];
  const seenCursor: number[] = BLOCKS.map(() => 0);
  const unseenIds: string[] = [];
  for (const it of ITEMS) {
    const st = states.get(it.id)!;
    if (!isSeen(st)) {
      unseenIds.push(it.id);
      continue;
    }
    const seenIndex = seenCursor[it.blockIndex]++;
    const priorKnow = retrievability(st, now);
    const gradeC = deriveGrade({ correct: true, priorKnow, optionCount: OPTION_COUNT });
    const stC = schedule(st, gradeC, now);
    const stW = slipAdjustedLapse(
      st,
      gradePosterior({ correct: false, priorKnow, optionCount: OPTION_COUNT }),
      now,
    );
    candidates.push({
      id: it.id,
      blockIndex: it.blockIndex,
      seenIndex,
      afterCorrect: retrievability(stC, examNow),
      afterWrong: retrievability(stW, examNow),
      pCorrect: priorKnow,
    });
  }

  const unseenBudget = Math.round(B * DEFAULT_NEW_ITEM_SHARE);
  const unseenPicks = shuffle(unseenIds, rng).slice(0, Math.min(unseenBudget, unseenIds.length));
  const seenBudget = B - unseenPicks.length;
  const seenPicks = allocate(input, candidates, seenBudget);
  return [...seenPicks, ...unseenPicks];
}

// ---- one policy over the full horizon ---------------------------------------
type PolicyKey = "baseline" | "allocator";
function runPolicy(
  policy: PolicyKey,
  initStates: Map<string, ReviewMemoryState>,
  horizonDays: number,
  B: number,
  rng: () => number,
): Map<string, ReviewMemoryState> {
  const states = new Map(initStates); // shared t=0 start, independent evolution
  const examNow = clockAt(horizonDays);
  for (let day = 0; day < horizonDays; day++) {
    const now = clockAt(day);
    const picks =
      policy === "baseline"
        ? baselinePicks(states, now, B, rng)
        : allocatorPicks(states, now, examNow, B, rng);
    for (const id of picks) {
      states.set(id, applyReview(states.get(id)!, now, rng));
    }
  }
  return states;
}

// ---- cell = profile × horizon × budget, ≥50 replicas ------------------------
export interface CellParams {
  prior: PriorKey;
  horizonDays: number;
  budget: number;
  replicas: number;
}
export interface CellResult {
  params: CellParams;
  baselineMean: number; // mean exam pass-prob (0..1)
  allocatorMean: number;
  liftMean: number; // allocatorMean − baselineMean (probability units)
  liftSE: number;
  liftCiLow: number;
  liftCiHigh: number;
  belowThreshold: boolean; // baselineMean < BELOW_THRESHOLD_PASS
}

/** A student is "below threshold" (one the app exists for) when their baseline
 *  pass-prob is under this cutoff; the decision gate aggregates over these. */
export const BELOW_THRESHOLD_PASS = 0.9;

/**
 * `runCell(params, seed)` — run one grid cell fully deterministically from
 * `seed`. Both arms share each replica's t=0 student; each arm evolves with its
 * own derived rng stream. Returns per-policy mean pass-prob + the lift CI. PURE:
 * no stdout, no clock, no RNG global.
 */
export function runCell(params: CellParams, seed: number): CellResult {
  const { prior, horizonDays, budget, replicas } = params;
  const examNow = clockAt(horizonDays);
  const lifts: number[] = [];
  let baseSum = 0;
  let allocSum = 0;
  for (let r = 0; r < replicas; r++) {
    const initStates = buildInitStates(prior, makeLcg(deriveSeed(seed, r, 0)));
    const baselineFinal = runPolicy(
      "baseline",
      initStates,
      horizonDays,
      budget,
      makeLcg(deriveSeed(seed, r, 1)),
    );
    const allocatorFinal = runPolicy(
      "allocator",
      initStates,
      horizonDays,
      budget,
      makeLcg(deriveSeed(seed, r, 2)),
    );
    const basePass = scorePassProb(baselineFinal, examNow);
    const allocPass = scorePassProb(allocatorFinal, examNow);
    baseSum += basePass;
    allocSum += allocPass;
    lifts.push(allocPass - basePass);
  }
  const n = replicas;
  const baselineMean = baseSum / n;
  const allocatorMean = allocSum / n;
  const liftMean = lifts.reduce((a, b) => a + b, 0) / n;
  const variance =
    n > 1 ? lifts.reduce((a, b) => a + (b - liftMean) * (b - liftMean), 0) / (n - 1) : 0;
  const liftSE = Math.sqrt(variance / n);
  return {
    params,
    baselineMean,
    allocatorMean,
    liftMean,
    liftSE,
    liftCiLow: liftMean - 1.96 * liftSE,
    liftCiHigh: liftMean + 1.96 * liftSE,
    belowThreshold: baselineMean < BELOW_THRESHOLD_PASS,
  };
}

// ---- the full profile grid --------------------------------------------------
export const BASE_SEED = 42;
const PRIORS: PriorKey[] = ["weak", "median", "strong"];
const HORIZONS = [14, 30, 60];
const BUDGETS = [15, 30];
const REPLICAS = 50;

/** The 3×3×2 = 18-cell grid (spec §Simulation harness). */
export const GRID: CellParams[] = PRIORS.flatMap((prior) =>
  HORIZONS.flatMap((horizonDays) =>
    BUDGETS.map((budget) => ({ prior, horizonDays, budget, replicas: REPLICAS })),
  ),
);

/** Run the whole grid; each cell gets a distinct seed derived from `baseSeed`. */
export function runGrid(baseSeed: number = BASE_SEED): CellResult[] {
  return GRID.map((params, i) => runCell(params, deriveSeed(baseSeed, i)));
}

// ---- report formatting (pure strings; the runner does the stdout) -----------
const pp = (x: number): string => (x * 100).toFixed(2);

export function formatCellRow(r: CellResult): string {
  const p = r.params;
  return [
    p.prior.padEnd(6),
    `h=${String(p.horizonDays).padStart(2)}`,
    `B=${String(p.budget).padStart(2)}`,
    `base=${pp(r.baselineMean).padStart(6)}%`,
    `alloc=${pp(r.allocatorMean).padStart(6)}%`,
    `lift=${(r.liftMean >= 0 ? "+" : "") + pp(r.liftMean)}pp`,
    `CI[${pp(r.liftCiLow)},${pp(r.liftCiHigh)}]pp`,
    r.belowThreshold ? "below" : "ready",
  ].join("  ");
}

export interface Verdict {
  go: boolean;
  belowMeanLiftPp: number | null;
  worstCellLiftPp: number;
  belowCellCount: number;
  line: string;
}

export function computeVerdict(results: CellResult[]): Verdict {
  const below = results.filter((r) => r.belowThreshold);
  const belowMeanLiftPp =
    below.length > 0 ? (below.reduce((a, r) => a + r.liftMean, 0) / below.length) * 100 : null;
  const worstCellLiftPp = Math.min(...results.map((r) => r.liftMean * 100));
  // GATE: mean lift ≥ 2pp on the below-threshold population, no cell harmed > 0.5pp.
  const go =
    belowMeanLiftPp !== null && belowMeanLiftPp >= 2.0 && worstCellLiftPp >= -0.5;
  const belowStr = belowMeanLiftPp === null ? "n/a (no below-threshold cells)" : `${belowMeanLiftPp.toFixed(2)}pp`;
  const line =
    `VERDICT: ${go ? "GO" : "NO-GO"} | below-threshold mean lift = ${belowStr} ` +
    `(target >= 2.00pp) | worst-cell lift = ${worstCellLiftPp.toFixed(2)}pp ` +
    `(harm gate >= -0.50pp) | cells=${results.length} below=${below.length} replicas=${REPLICAS}`;
  return { go, belowMeanLiftPp, worstCellLiftPp, belowCellCount: below.length, line };
}

/** Full multi-line report: header + per-cell rows + the decision-gate verdict. */
export function formatReport(results: CellResult[]): string {
  const lines: string[] = [];
  lines.push("# exam-allocator simulation — allocator vs current queue baseline");
  lines.push(
    `# grid: {weak,median,strong} × {14,30,60}d × {15,30}/day · ${REPLICAS} replicas · seed ${BASE_SEED}`,
  );
  lines.push(
    `# pool per stratum = quota × ${POOL_MULT} (${BLOCKS.map((b) => `${b.key}:${b.quota}/${b.pool}`).join(" ")})`,
  );
  lines.push("# lift = allocator − baseline exam pass-prob (percentage points)");
  lines.push("");
  for (const r of results) lines.push(formatCellRow(r));
  lines.push("");
  lines.push(computeVerdict(results).line);
  return lines.join("\n");
}
