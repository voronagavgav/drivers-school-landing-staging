// latencyBandsForMedian — derive per-topic Easy/Hard latency thresholds from a topic's median
// answer latency (Wave 11 §3). These bands feed `deriveGrade`'s overrides so a topic where the
// learner is habitually fast/slow grades relative to THAT topic's tempo, not one global cliff.
//
// FROZEN ORACLE (do not self-grade — the wiring in submitAnswer is what's exercised live):
//   Easy ≤ max(EASY_FLOOR_MS=2500,  0.5 × median)
//   Hard ≥ max(HARD_FLOOR_MS=20000, 2.5 × median)
//   median absent (null/undefined) or degenerate (≤ 0) → global constants (5000 / 30000)
// PURE + deterministic — no clock, no DB, no randomness.

import { FSRS_EASY_LATENCY_MS, FSRS_HARD_LATENCY_MS } from "./constants";

// Lower bounds so a topic with a tiny median can't collapse the bands to instant/absurd thresholds.
const EASY_FLOOR_MS = 2500;
const HARD_FLOOR_MS = 20000;

export interface LatencyBands {
  easyMs: number;
  hardMs: number;
}

export function latencyBandsForMedian(median?: number | null): LatencyBands {
  // Absent or degenerate median → fall back to the global constants (untuned behavior).
  if (median == null || median <= 0) {
    return { easyMs: FSRS_EASY_LATENCY_MS, hardMs: FSRS_HARD_LATENCY_MS };
  }
  return {
    easyMs: Math.max(EASY_FLOOR_MS, 0.5 * median),
    hardMs: Math.max(HARD_FLOOR_MS, 2.5 * median),
  };
}
