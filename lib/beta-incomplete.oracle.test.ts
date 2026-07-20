import { describe, it, expect } from "vitest";
import { regularizedIncompleteBeta, betaInv } from "./beta-incomplete";

// FROZEN ORACLE for the regularized incomplete beta function I_x(a,b) and its
// inverse betaInv(alpha; a, b) (the Beta quantile). The IMPLEMENTATION is
// wave19c-04 (`./beta-incomplete`) — it MUST NOT be written here, and the
// assertions below are the frozen oracle later tasks may not edit.
//
// Every literal is EXTERNAL: closed-form identities, or scipy-1.18 values frozen
// from docs/research/RHO-CORRECTION-RESEARCH-2026-07-12.json. Never recompute
// them from an implementation.
//
// The impl-CALLING assertions live under describe.skip and reach the future
// module via a dynamic import guarded by @ts-expect-error (missing module). The
// un-skip task wave19c-04 removes both the `.skip` and the directive.

describe("regularizedIncompleteBeta + betaInv (frozen oracle, un-skipped in wave19c-04)", () => {
  it("I_x(1,1) = x — uniform CDF is the exact identity", () => {
    expect(regularizedIncompleteBeta(0.3, 1, 1)).toBeCloseTo(0.3, 6);
    expect(regularizedIncompleteBeta(0.7, 1, 1)).toBeCloseTo(0.7, 6);
  });

  it("boundaries: I_0(2,3) === 0 and I_1(2,3) === 1 (exact)", () => {
    expect(regularizedIncompleteBeta(0, 2, 3)).toBe(0);
    expect(regularizedIncompleteBeta(1, 2, 3)).toBe(1);
  });

  it("closed form I_x(2,2) = 3x² − 2x³", () => {
    expect(regularizedIncompleteBeta(0.5, 2, 2)).toBeCloseTo(0.5, 6);
    expect(regularizedIncompleteBeta(0.3, 2, 2)).toBeCloseTo(0.216, 6);
  });

  it("symmetry I_x(a,b) = 1 − I_{1−x}(b,a) at x=0.4, a=2.3, b=1.4", () => {
    const lhs = regularizedIncompleteBeta(0.4, 2.3, 1.4);
    const rhs = 1 - regularizedIncompleteBeta(1 - 0.4, 1.4, 2.3);
    expect(lhs).toBeCloseTo(rhs, 9);
  });

  it("betaInv(α, 1, 1) = α — uniform inverse CDF is the exact identity", () => {
    expect(betaInv(0.5, 1, 1)).toBeCloseTo(0.5, 6);
    expect(betaInv(0.3, 1, 1)).toBeCloseTo(0.3, 6);
  });

  it("round-trip I_{betaInv(α,a,b)}(a,b) = α at α=0.2, a=2.3, b=1.4", () => {
    const x = betaInv(0.2, 2.3, 1.4);
    expect(regularizedIncompleteBeta(x, 2.3, 1.4)).toBeCloseTo(0.2, 6);
  });

  it("scipy-1.18 frozen quantile anchors: betaInv(0.2, a, b)", () => {
    // a = p̂·n_eff + ½, b = (1−p̂)·n_eff + ½, n_eff = 5/2.2 = 2.2727272727,
    // p̂ = .60/.80/.95 — the wave19c-05 quantile tier's raw (pre-clamp) values.
    expect(betaInv(0.2, 1.863636364, 1.409090909)).toBeCloseTo(0.339343, 6);
    expect(betaInv(0.2, 2.318181818, 0.954545455)).toBeCloseTo(0.511245, 6);
    expect(betaInv(0.2, 2.659090909, 0.613636364)).toBeCloseTo(0.665395, 6);
  });
});

// IMPL-INDEPENDENT self-consistency of the frozen literals themselves — so
// `npx vitest list` collects this file and it stays green before wave19c-04.
// This grades the vectors, not the not-yet-written impl (no self-grading).
describe("frozen oracle literals are self-consistent (no impl)", () => {
  it("the three scipy betaInv anchors are strictly increasing and each in (0,1)", () => {
    const anchors = [0.339343, 0.511245, 0.665395];
    for (const v of anchors) {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(1);
    }
    for (let i = 1; i < anchors.length; i++) {
      expect(anchors[i]).toBeGreaterThan(anchors[i - 1]);
    }
  });

  it("closed-form literal 3x²−2x³ = 0.216 at x=0.3", () => {
    expect(3 * 0.3 ** 2 - 2 * 0.3 ** 3).toBeCloseTo(0.216, 12);
  });
});
