import { describe, it, expect } from "vitest";
import {
  reliabilityDiagram,
  brierScore,
  logLoss,
  ece,
  fitPlatt,
  applyPlatt,
  type CalibrationPoint,
} from "./calibration-metrics";

// The plan-time FROZEN point set (Part 2 §H). Hand-computed oracles below.
const P: CalibrationPoint[] = [
  { p: 0.9, y: 1 },
  { p: 0.8, y: 0 },
  { p: 0.3, y: 0 },
  { p: 0.6, y: 1 },
];

describe("brierScore", () => {
  it("matches the frozen oracle: (0.01 + 0.64 + 0.09 + 0.16)/4 = 0.225", () => {
    expect(brierScore(P)).toBeCloseTo(0.225, 12);
  });

  it("is 0 for a perfect forecaster", () => {
    expect(brierScore([{ p: 1, y: 1 }, { p: 0, y: 0 }])).toBe(0);
  });

  it("is 0 on empty input", () => {
    expect(brierScore([])).toBe(0);
  });
});

describe("logLoss", () => {
  it("matches the frozen oracle: (−ln0.9 − ln0.2 − ln0.7 − ln0.6)/4 ≈ 0.6455747490", () => {
    expect(logLoss(P)).toBeCloseTo(0.645574749, 9);
  });

  it("clamps p=0/p=1 so it never returns ±∞", () => {
    // A confidently-wrong extreme point: without clamping this would be +∞.
    const l = logLoss([{ p: 1, y: 0 }]);
    expect(Number.isFinite(l)).toBe(true);
    // ≈ −ln(eps): a large-but-finite penalty (float rounding of 1−(1−eps)
    // makes it inexact, so we only bound the magnitude).
    expect(l).toBeGreaterThan(30);
    expect(l).toBeLessThan(40);
  });
});

describe("reliabilityDiagram", () => {
  it("omits empty bins and reports mean predicted / observed fraction / count", () => {
    // Two points in the [0.8,0.9] region, one passes → observedFraction 0.5.
    const diagram = reliabilityDiagram(P, 10);
    // Bins used: 0.3→bin3, 0.6→bin6, 0.8→bin8, 0.9→bin9 — four non-empty bins.
    expect(diagram).toHaveLength(4);
    for (const b of diagram) expect(b.count).toBeGreaterThan(0);
    const bin9 = diagram.find((b) => b.meanPredicted === 0.9)!;
    expect(bin9.observedFraction).toBe(1);
  });

  it("puts p===1 into the last bin", () => {
    const diagram = reliabilityDiagram([{ p: 1, y: 1 }], 10);
    expect(diagram).toHaveLength(1);
    expect(diagram[0].count).toBe(1);
    expect(diagram[0].meanPredicted).toBe(1);
  });
});

describe("ece — and the 'ECE is gameable' fact", () => {
  it("is 0 for a perfectly-calibrated bin (meanPredicted == observedFraction)", () => {
    // A single bin whose mean prediction equals the observed pass fraction.
    const pts: CalibrationPoint[] = [
      { p: 0.5, y: 1 },
      { p: 0.5, y: 0 },
    ];
    expect(ece(pts, 10)).toBeCloseTo(0, 12);
  });

  it("ECE≈0 does NOT imply a good forecaster: a base-rate-only p=0.5 predictor is gameable", () => {
    // Every prediction is the base rate 0.5 on a set whose observed base rate
    // is also 0.5 → ECE ≈ 0 (perfectly "calibrated" in aggregate), yet the
    // forecaster is useless: it distinguishes nothing. Brier and LogLoss expose
    // this while ECE hides it. This is the research "ECE is gameable" fact.
    const baseRate: CalibrationPoint[] = [
      { p: 0.5, y: 1 },
      { p: 0.5, y: 0 },
      { p: 0.5, y: 1 },
      { p: 0.5, y: 0 },
    ];
    expect(ece(baseRate, 10)).toBeCloseTo(0, 12);
    expect(brierScore(baseRate)).toBeCloseTo(0.25, 12); // = mean((0.5-y)^2)
    expect(logLoss(baseRate)).toBeCloseTo(0.6931472, 6); // = −ln0.5
  });

  it("is 0 on empty input", () => {
    expect(ece([])).toBe(0);
  });
});

// Deterministic well-calibrated synthetic set: for each prob level, round(N*p)
// of N points pass. No rng/clock — the construction is a plain loop.
function calibratedSet(nPerLevel: number): CalibrationPoint[] {
  const pts: CalibrationPoint[] = [];
  for (let level = 1; level <= 9; level++) {
    const p = level / 10;
    const k = Math.round(nPerLevel * p);
    for (let i = 0; i < nPerLevel; i++) {
      pts.push({ p, y: i < k ? 1 : 0 });
    }
  }
  return pts;
}

describe("Platt scaling", () => {
  it("applyPlatt is monotonic increasing in p", () => {
    const params = { A: 1.3, B: -0.4 };
    let prev = -Infinity;
    for (let p = 0.01; p <= 0.99; p += 0.01) {
      const r = applyPlatt(p, params);
      expect(r).toBeGreaterThan(prev);
      prev = r;
    }
  });

  it("recovers near-identity when fit on an already-calibrated large set", () => {
    const params = fitPlatt(calibratedSet(200));
    expect(Math.abs(params.A - 1)).toBeLessThan(0.25);
    expect(Math.abs(params.B)).toBeLessThan(0.25);
  });

  it("reduces LogLoss when fit on a systematically over-confident set", () => {
    // Take a calibrated set, then push each prediction toward the extremes
    // (sigmoid(2.5·logit(p))) WITHOUT changing outcomes → over-confident raw
    // predictions. Fitting Platt should shrink them back and lower LogLoss.
    const calibrated = calibratedSet(200);
    const overconfident: CalibrationPoint[] = calibrated.map((pt) => {
      const p = pt.p!;
      const z = 2.5 * Math.log(p / (1 - p));
      const sharpened = 1 / (1 + Math.exp(-z));
      return { p: sharpened, y: pt.y };
    });
    const rawLoss = logLoss(overconfident);
    const params = fitPlatt(overconfident);
    const recalibrated = overconfident.map((pt) => ({
      p: applyPlatt(pt.p!, params),
      y: pt.y,
    }));
    const calLoss = logLoss(recalibrated);
    expect(calLoss).toBeLessThan(rawLoss);
    // A shrinking calibrator: A < 1 undoes the 2.5× sharpening.
    expect(params.A).toBeLessThan(1);
  });
});
