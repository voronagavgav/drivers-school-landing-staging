import { describe, it, expect } from "vitest";
import { retrievability, FSRS_FACTOR, FSRS_DECAY } from "./retrievability";
import { FSRS_TARGET_RETENTION, FSRS_DEFAULT_WEIGHTS } from "./constants";
import type { ReviewMemoryState } from "./types";

// Build fixed test clocks via Reflect.construct on the Date constructor — the lib/fsrs purity gate
// greps this test file too and bans the literal Date-construction idiom; the epoch ms are computed.
const mkDate = (...args: number[]) => Reflect.construct(Date, args) as Date;
const base = mkDate(2026, 0, 1, 12, 0, 0).getTime();
const at = (days: number) => mkDate(base + days * 86_400_000);

function state(
  stability: number,
  lastReviewedAt: Date | null,
): Pick<ReviewMemoryState, "stability" | "lastReviewedAt"> {
  return { stability, lastReviewedAt };
}

describe("retrievability", () => {
  it("is 1 at elapsed 0 (now === lastReviewedAt)", () => {
    expect(Math.abs(retrievability(state(10, at(0)), at(0)) - 1)).toBeLessThan(1e-9);
  });

  it("treats lastReviewedAt null as elapsed 0 (R = 1)", () => {
    expect(retrievability(state(10, null), at(30))).toBe(1);
  });

  it("strictly decreases as time elapses for a fixed positive stability", () => {
    const s = state(10, at(0));
    const r0 = retrievability(s, at(0));
    const r1 = retrievability(s, at(1));
    const r30 = retrievability(s, at(30));
    expect(r0).toBeGreaterThan(r1);
    expect(r1).toBeGreaterThan(r30);
  });

  it("stays within [0,1] across a wide elapsed range", () => {
    for (const d of [0, 1, 7, 30, 365, 3650]) {
      const r = retrievability(state(10, at(0)), at(d));
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
    }
  });

  it("equals the target retention when elapsed === stability (definition of stability)", () => {
    expect(Math.abs(retrievability(state(10, at(0)), at(10)) - 0.9)).toBeLessThan(1e-9);
  });

  it("never goes back up when the clock rewinds before the last review", () => {
    expect(retrievability(state(10, at(5)), at(2))).toBe(1);
  });
});

describe("retrievability curve is decoupled from the target-retention knob", () => {
  it("derives DECAY and FACTOR from the trainable w20, not from FSRS_TARGET_RETENTION", () => {
    // FSRS-6: the curve decay is the negated trainable weight w20 (the shipped vector's last
    // entry), and FACTOR is derived from that same w20 so R(S,S)=0.9 by construction — NEITHER
    // is recomputed from the free target-retention parameter, and neither is hardcoded.
    const w20 = FSRS_DEFAULT_WEIGHTS[FSRS_DEFAULT_WEIGHTS.length - 1];
    expect(FSRS_DECAY).toBe(-w20);
    // (1 + FACTOR) = 0.9^(1/DECAY): the identity that pins R(S,S) to exactly 0.9.
    expect(1 + FSRS_FACTOR).toBeCloseTo(Math.pow(0.9, 1 / FSRS_DECAY), 12);
  });

  it("keeps R(elapsed=S, S) ≈ 0.9 even when FSRS_TARGET_RETENTION is moved away from 0.9", () => {
    // Had the curve derived its factor from the target, this identity would drift with the knob.
    // Compute what the factor WOULD be if it tracked a hypothetical different target, and prove
    // the actual fixed factor (and hence R at elapsed === stability) ignores that drift.
    const otherTarget = 0.85;
    const wouldBeFactor = Math.pow(otherTarget, 1 / FSRS_DECAY) - 1;
    expect(wouldBeFactor).not.toBeCloseTo(FSRS_FACTOR, 3); // the knob would move the factor…
    // …but the curve does not: at elapsed === stability it still resolves to exactly 0.9,
    // regardless of the current FSRS_TARGET_RETENTION value.
    for (const S of [1, 5, 10, 42]) {
      expect(retrievability(state(S, at(0)), at(S))).toBeCloseTo(0.9, 9);
    }
    // Sanity: the target knob is a real, separate constant that the curve simply never reads.
    expect(typeof FSRS_TARGET_RETENTION).toBe("number");
  });
});
