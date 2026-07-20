import { describe, it, expect } from "vitest";
import type { ReviewMemoryState } from "./types";

// FROZEN ORACLE for the Wave 20 grade-side honesty layer — the slip-adjusted lapse stability
// (`./lapse-adjust`, task 04) and the honest-guess-floor cap in `gradePosterior` (`./grade`, task 03)
// MUST MATCH these values. Neither impl is written/capped here.
//
// Every literal is EXTERNAL: transcribed at 6dp from the Python reference oracle
// `scripts/oracles/gen-wave20-oracles.py` (its captured stdout lives in
// tasks/wave20-01-python-oracle/PREVERIFY-OUTPUT.txt), which independently re-encodes the FSRS-6
// forget/recall stability + retrievability + the capped geometric ("log-space") blend + the BKT
// guess/slip posterior from specs/wave20-grade-honesty.md and lib/fsrs/{schedule,retrievability}.ts.
// EXPECTED VALUES COME FROM THE PYTHON ORACLE — NEVER REGENERATE THEM FROM THE TS IMPL.
//
// House pattern (wave19b-01 / wave19b-04): a NON-skipped self-consistency subset grades the frozen
// literals against LOCAL pure closed-form helpers (re-encoded FSRS-6 / BKT math, NOT the module under
// test) so `npx vitest list` collects the file and `npm test` is green BEFORE the impl exists; two
// impl-binding blocks bind the real symbols and were suspended until tasks 03/04 un-suspended them.
//
// PURE (lib/fsrs/ purity gate greps comments too): no `Math.random` / `Date.now` / the banned
// clock-construction phrase — fixed clocks are built via Reflect.construct (see `mkDate`).

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL pure closed-form helpers — an independent re-encode of the frozen model (mirrors the Python
// oracle + lib/fsrs/{schedule,retrievability,grade}.ts). These grade the frozen VECTORS; they are NOT
// the `slipAdjustedLapse` module nor the capped `gradePosterior` under test.
// ─────────────────────────────────────────────────────────────────────────────

// FSRS-6 default weights — copied verbatim from lib/fsrs/constants.ts FSRS_DEFAULT_WEIGHTS.
const W = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666,
  0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658,
  0.1542,
];
const MIN_STABILITY = 0.001;
const DECAY = -W[20];
const FACTOR = Math.pow(0.9, 1 / DECAY) - 1;

// BKT / guess-floor constants (constants.ts + Wave 20 design point 3).
const FSRS_SLIP = 0.1;
const FSRS_GUESS_DEFAULT = 0.25;
const FSRS_GUESS_MAX = 0.45;
const FSRS_KNOW_GOOD = 0.75;
const FSRS_KNOW_EASY = 0.93;

function retr(stability: number, elapsedDays: number): number {
  if (elapsedDays <= 0) return 1;
  if (!(stability > 0)) return 0;
  const r = Math.pow(1 + FACTOR * (elapsedDays / stability), DECAY);
  return Math.min(1, Math.max(0, r));
}

function intervalDays(stability: number, retention: number): number {
  return Math.max(0, (stability / FACTOR) * (Math.pow(retention, 1 / DECAY) - 1));
}

// Again-arm stability (grade 1), capped at the pre-lapse stability.
function forgetStability(difficulty: number, stability: number, r: number): number {
  const sForget =
    W[11] *
    Math.pow(difficulty, -W[12]) *
    (Math.pow(stability + 1, W[13]) - 1) *
    Math.exp(W[14] * (1 - r));
  return Math.max(MIN_STABILITY, Math.min(sForget, stability));
}

// Successful-recall stability (grade >= 2). Hard(2) applies the w15 penalty.
function recallStability(difficulty: number, stability: number, r: number, grade: number): number {
  const hardPenalty = grade === 2 ? W[15] : 1;
  const easyBonus = grade === 4 ? W[16] : 1;
  const growth =
    Math.exp(W[8]) *
    (11 - difficulty) *
    Math.pow(stability, -W[9]) *
    (Math.exp(W[10] * (1 - r)) - 1) *
    hardPenalty *
    easyBonus;
  return Math.max(MIN_STABILITY, stability * (1 + growth));
}

// Difficulty update: linear damping then mean reversion to the UNCLAMPED D_0(Easy).
function nextDifficulty(difficulty: number, grade: number): number {
  const deltaD = -W[6] * (grade - 3);
  const damped = difficulty + (deltaD * (10 - difficulty)) / 9;
  const d0RawEasy = W[4] - Math.exp(W[5] * (4 - 1)) + 1;
  const reverted = W[7] * d0RawEasy + (1 - W[7]) * damped;
  return Math.min(10, Math.max(1, reverted));
}

// Honest guess floor: g = min(1/optionCount, FSRS_GUESS_MAX); FSRS_GUESS_DEFAULT for 0/None.
function cappedGuess(optionCount: number | null): number {
  if (optionCount == null || optionCount === 0) return FSRS_GUESS_DEFAULT;
  return Math.min(1 / optionCount, FSRS_GUESS_MAX);
}

// BKT posterior π = P(knows | outcome). Likelihoods P(correct|knows)=1−s, P(correct|¬knows)=g.
function bktPosterior(correct: boolean, priorKnow: number, g: number): number {
  const s = FSRS_SLIP;
  const p0 = priorKnow;
  if (correct) return (p0 * (1 - s)) / (p0 * (1 - s) + (1 - p0) * g);
  return (p0 * s) / (p0 * s + (1 - p0) * (1 - g));
}

function gradeBand(pi: number): number {
  if (pi >= FSRS_KNOW_EASY) return 4;
  if (pi >= FSRS_KNOW_GOOD) return 3;
  return 2;
}

// The capped geometric ("log-space") blend — the slip-adjusted lapse stability.
function logBlend(priorS: number, sAgain: number, sHard: number, pi: number): number {
  return Math.min(priorS, Math.exp(pi * Math.log(sHard) + (1 - pi) * Math.log(sAgain)));
}

// The EXCLUDED linear blend (grows above prior at low π → violates never-grow-on-wrong).
function linearBlend(sAgain: number, sHard: number, pi: number): number {
  return pi * sHard + (1 - pi) * sAgain;
}

// Fixed clock builder (no banned clock-construction phrase; ms is computed, never wall-read).
const mkDate = (...args: number[]) => Reflect.construct(Date, args) as Date;

const D = 5; // the probe fixtures fix difficulty at D=5 (GRADE-MECHANISM / GRADE-SIDE-PROBES).
const G3 = cappedGuess(3); // 3-option honest floor g = 1/3 (uncapped, < 0.45).

// ─────────────────────────────────────────────────────────────────────────────
// Frozen literals — transcribed at 6dp from PREVERIFY-OUTPUT.txt (never from the TS impl).
// ─────────────────────────────────────────────────────────────────────────────

// (g) posterior_direction — CORRECT at neutral prior 0.5, CAPPED g, over optionCount {2,3,4,5}.
// Present verbatim so the frozen-literal `grep -Fq` on the exact string succeeds (wave19b-04).
const POSTERIOR_DIRECTION = [
  { optionCount: 2, pi: 0.666667, band: 2 },
  { optionCount: 3, pi: 0.729730, band: 2 },
  { optionCount: 4, pi: 0.782609, band: 3 },
  { optionCount: 5, pi: 0.818182, band: 3 },
];

// (e) repeated_wrong convergence — three wrongs on s=50, R recomputed at each new state.
const REPEATED_WRONG = [38.237590, 14.928157, 6.831944];

describe("wave20 grade-honesty frozen oracle is self-consistent (no impl)", () => {
  it("(const) derived FSRS-6 curve constants", () => {
    expect(DECAY).toBeCloseTo(-0.1542, 12);
    expect(FACTOR).toBeCloseTo(0.980346, 6);
    // Identity: at target retention 0.9 the interval equals the stability (R(S,S)=0.9).
    expect(intervalDays(2.546, 0.9)).toBeCloseTo(2.546, 6);
  });

  it("(a) blend_s50 fixture — S'_again / S'_hard / π / S'_log / S'_linear", () => {
    const r1 = retr(50, 10);
    expect(r1).toBeCloseTo(0.972770, 5);
    const sAgain = forgetStability(D, 50, r1);
    const sHard = recallStability(D, 50, r1, 2);
    const pi = bktPosterior(false, r1, G3);
    const sLog = logBlend(50, sAgain, sHard, pi);
    const sLinear = linearBlend(sAgain, sHard, pi);
    expect(sAgain).toBeCloseTo(2.546093, 4);
    expect(sHard).toBeCloseTo(63.396933, 4);
    expect(pi).toBeCloseTo(0.842731, 5);
    expect(sLog).toBeCloseTo(38.237590, 4);
    expect(sLinear).toBeCloseTo(53.826996, 4);
    // Linear EXCLUDED: it exceeds the log blend; the crush reads directly in days (interval==S at 0.9).
    expect(sLog).toBeLessThan(sLinear);
    expect(intervalDays(sLog, 0.9)).toBeCloseTo(sLog, 4);
  });

  it("(a) blend_s100 fixture — same R ratio, S'_log rounds to ~70", () => {
    const r2 = retr(100, 20);
    const sAgain = forgetStability(D, 100, r2);
    const sHard = recallStability(D, 100, r2, 2);
    const pi = bktPosterior(false, r2, G3);
    const sLog = logBlend(100, sAgain, sHard, pi);
    expect(sAgain).toBeCloseTo(3.323725, 4);
    expect(sHard).toBeCloseTo(123.871725, 4);
    expect(pi).toBeCloseTo(0.842731, 5);
    expect(sLog).toBeCloseTo(70.121039, 4);
  });

  it("(a) blend_s5 fixture — half-forgotten (R=0.509) CRUSHES; linear GROWS above prior (excluded)", () => {
    const r3 = 0.509; // synthetic half-forgotten R from the GRADE-MECHANISM doc fixture.
    const sAgain = forgetStability(D, 5, r3);
    const pi = bktPosterior(false, r3, G3);
    const sHard = recallStability(D, 5, r3, 2);
    const sLog = logBlend(5, sAgain, sHard, pi);
    const sLinear = linearBlend(sAgain, sHard, pi);
    expect(sAgain).toBeCloseTo(1.816428, 4);
    expect(pi).toBeCloseTo(0.134573, 5);
    expect(sLog).toBeCloseTo(2.821454, 4);
    expect(sLog).toBeLessThan(5); // crush
    expect(sLinear).toBeCloseTo(8.019220, 4);
    expect(5).toBeLessThan(sLinear); // linear grows above the prior → excluded
  });

  it("(b) never-grow-on-wrong: S'_log ≤ prior S over the full grid, incl. the cap-binding π>0.926 region", () => {
    const sGrid = [5, 20, 50, 100];
    const gGrid = [0.45, 1 / 3, 0.25, 0.2];
    const rGrid = [0.55, 0.9, 0.973, 0.99];
    let maxRatio = 0;
    let capBindingSeen = false;
    for (const s of sGrid) {
      for (const g of gGrid) {
        for (const r of rGrid) {
          const sa = forgetStability(D, s, r);
          const sh = recallStability(D, s, r, 2);
          const pi = bktPosterior(false, r, g);
          const sl = logBlend(s, sa, sh, pi);
          maxRatio = Math.max(maxRatio, sl / s);
          if (pi > 0.926) capBindingSeen = true;
        }
      }
    }
    expect(maxRatio).toBeLessThanOrEqual(1);
    expect(capBindingSeen).toBe(true);
  });

  it("(c) crush preserved on weak (R=0.55 grid): S'_log < prior; grid ratio ≤ 2.30; doc fixture ≤ 1.6", () => {
    const sGrid = [5, 20, 50, 100];
    const gGrid = [0.45, 1 / 3, 0.25, 0.2];
    let weakMax = 0;
    for (const s of sGrid) {
      for (const g of gGrid) {
        const sa = forgetStability(D, s, 0.55);
        const sh = recallStability(D, s, 0.55, 2);
        const pi = bktPosterior(false, 0.55, g);
        const sl = logBlend(s, sa, sh, pi);
        expect(sl).toBeLessThan(s);
        weakMax = Math.max(weakMax, sl / sa);
      }
    }
    expect(weakMax).toBeLessThanOrEqual(2.3);
    // The doc-grounded half-forgotten fixture (s=5, R=0.509, g=1/3) stays near the Again arm.
    const sa5 = forgetStability(D, 5, 0.509);
    const sh5 = recallStability(D, 5, 0.509, 2);
    const sl5 = logBlend(5, sa5, sh5, bktPosterior(false, 0.509, G3));
    expect(sl5 / sa5).toBeLessThanOrEqual(1.6);
  });

  it("(d) monotone in π at a fixed prior state (s=50, R=0.973, D=5)", () => {
    const r1 = retr(50, 10);
    const sAgain = forgetStability(D, 50, r1);
    const sHard = recallStability(D, 50, r1, 2);
    let prev = -Infinity;
    for (const pi of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      const sl = logBlend(50, sAgain, sHard, pi);
      expect(sl).toBeGreaterThan(prev);
      prev = sl;
    }
  });

  it("(e) repeated-wrong convergence: three wrongs (R recomputed) strictly decrease to the frozen steps", () => {
    let s = 50;
    let d = 5;
    let r = retr(50, 10); // first review at elapsed 10d (R~0.9728)
    const seq: number[] = [];
    for (let i = 0; i < 3; i++) {
      const sa = forgetStability(d, s, r);
      const sh = recallStability(d, s, r, 2);
      const pi = bktPosterior(false, r, G3);
      const sl = logBlend(s, sa, sh, pi);
      seq.push(sl);
      d = nextDifficulty(d, 1);
      s = sl;
      r = 0.9; // next review lands at due (R=0.9)
    }
    for (let i = 0; i < seq.length; i++) expect(seq[i]).toBeCloseTo(REPEATED_WRONG[i], 3);
    expect(seq[1]).toBeLessThan(seq[0]);
    expect(seq[2]).toBeLessThan(seq[1]);
  });

  it("(f) boundary census: guess floor g = min(1/oc, 0.45) (0.25 for oc 0); wrong never grows S", () => {
    const expectedG: Record<number, number> = { 0: 0.25, 1: 0.45, 2: 0.45, 100: 0.01 };
    for (const oc of [0, 1, 2, 100]) {
      expect(cappedGuess(oc)).toBeCloseTo(expectedG[oc], 6);
      for (const pk of [0, 1]) {
        const sa = forgetStability(D, 50, pk);
        const sh = recallStability(D, 50, pk, 2);
        const sl = logBlend(50, sa, sh, bktPosterior(false, pk, cappedGuess(oc)));
        expect(sl).toBeLessThanOrEqual(50);
      }
    }
  });

  it("(g) posterior direction: CORRECT at neutral prior 0.5, capped g, increasing in optionCount", () => {
    let prevPi = -Infinity;
    for (const row of POSTERIOR_DIRECTION) {
      const pi = bktPosterior(true, 0.5, cappedGuess(row.optionCount));
      expect(pi).toBeCloseTo(row.pi, 6);
      expect(gradeBand(pi)).toBe(row.band);
      expect(pi).toBeGreaterThanOrEqual(prevPi);
      prevPi = pi;
    }
  });
});

// IMPL-BINDING block — the real slip-adjusted lapse module (task 04 wrote `./lapse-adjust` and
// un-suspended this block, removing the suspension marker and the type-error directives).
describe("slipAdjustedLapse (impl — task 04 un-skips)", () => {
  const DAY_MS = 86_400_000;
  const nowMs = 1_800_000_000_000; // fixed epoch ms — deterministic, no wall clock.
  const now = mkDate(nowMs);

  const prior = (stability: number, elapsedDays: number): ReviewMemoryState => ({
    stability,
    difficulty: 5,
    state: "review",
    dueAt: null,
    lastReviewedAt: mkDate(nowMs - elapsedDays * DAY_MS),
    reps: 3,
    lapses: 0,
  });

  it("(a) s=50 wrong ⇒ log-blend stability 38.237590, relearning, lapses+1 (never grows past 50)", async () => {
    const { slipAdjustedLapse } = await import("./lapse-adjust");
    const pi = bktPosterior(false, retr(50, 10), G3); // 0.842731
    const res = slipAdjustedLapse(prior(50, 10), pi, now);
    expect(res.stability).toBeCloseTo(38.237590, 3);
    expect(res.stability).toBeLessThanOrEqual(50); // (b) never-grow
    expect(res.state).toBe("relearning");
    expect(res.lapses).toBe(1);
  });

  it("(a) s=100 wrong ⇒ log-blend stability 70.121039 (never grows past 100)", async () => {
    const { slipAdjustedLapse } = await import("./lapse-adjust");
    const pi = bktPosterior(false, retr(100, 20), G3);
    const res = slipAdjustedLapse(prior(100, 20), pi, now);
    expect(res.stability).toBeCloseTo(70.121039, 3);
    expect(res.stability).toBeLessThanOrEqual(100);
  });

  it("(e) a second wrong (at the crushed state, due at R=0.9) strictly decreases stability", async () => {
    const { slipAdjustedLapse } = await import("./lapse-adjust");
    const first = slipAdjustedLapse(prior(50, 10), bktPosterior(false, retr(50, 10), G3), now);
    const next: ReviewMemoryState = {
      ...first,
      difficulty: nextDifficulty(5, 1),
      lastReviewedAt: now,
    };
    const due = mkDate(nowMs + first.stability * DAY_MS); // R=0.9 exactly at elapsed==stability
    const second = slipAdjustedLapse(next, bktPosterior(false, 0.9, G3), due);
    expect(second.stability).toBeLessThan(first.stability);
    expect(second.stability).toBeCloseTo(REPEATED_WRONG[1], 3);
  });
});

// IMPL-BINDING block — the honest guess floor in the REAL gradePosterior. Un-skipped by task 03,
// which caps g at FSRS_GUESS_MAX=0.45 (before the cap gradePosterior used g=1/optionCount uncapped, so
// oc=2 gave 0.642857 not the frozen 0.666667).
describe("honest guess floor gradePosterior (impl — task 03 un-skips)", () => {
  it("(g) π at neutral prior 0.5 with capped g reproduces the frozen quartet", async () => {
    const { gradePosterior } = await import("./grade");
    for (const row of POSTERIOR_DIRECTION) {
      const pi = gradePosterior({ correct: true, priorKnow: 0.5, optionCount: row.optionCount });
      expect(pi).toBeCloseTo(row.pi, 6);
    }
  });

  it("(f) boundary census: oc=1 caps to g=0.45 (π 0.666667); oc=0 defaults to g=0.25 (π 0.782609)", async () => {
    const { gradePosterior } = await import("./grade");
    expect(gradePosterior({ correct: true, priorKnow: 0.5, optionCount: 1 })).toBeCloseTo(0.666667, 6);
    expect(gradePosterior({ correct: true, priorKnow: 0.5, optionCount: 0 })).toBeCloseTo(0.782609, 6);
  });
});
