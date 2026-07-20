// ---------------------------------------------------------------------------
// Pure calibration-metrics + Platt-fit math (Part 2 §H). Operates over
// predicted-P(pass) ↔ actual-pass points. No DB, no wall clock, no rng — the
// caller (the admin calibration page / server layer, wave19a-08) loads the
// PassOutcome rows and hands them in as plain arrays; this module returns plain
// numbers/objects.
//
// Point shape: `{ p, y }` where `p` is the model's predicted P(pass) in [0,1]
// and `y` is the observed outcome (1 = passed, 0 = failed). The `predicted` /
// `actual` aliases are also accepted so callers can use either vocabulary.
// ---------------------------------------------------------------------------

/** A single (predicted probability, observed outcome) point. */
export interface CalibrationPoint {
  /** Predicted P(pass) in [0,1]. */
  p?: number;
  /** Observed outcome: 1 = pass, 0 = fail. */
  y?: 0 | 1 | number;
  /** Alias for `p`. */
  predicted?: number;
  /** Alias for `y`. */
  actual?: 0 | 1 | number;
}

/** One reliability-diagram bin. Empty bins are OMITTED from the output. */
export interface ReliabilityBin {
  /** Mean predicted probability of the points that fell in this bin. */
  meanPredicted: number;
  /** Observed fraction that passed (mean y) among this bin's points. */
  observedFraction: number;
  /** Number of points in this bin. */
  count: number;
}

/** Platt calibration parameters for `P' = sigmoid(A·logit(p) + B)`. */
export interface PlattParams {
  A: number;
  B: number;
}

/** Clamp epsilon for LogLoss / logit so p=0 and p=1 stay finite. */
export const LOGLOSS_EPS = 1e-15;

function pred(pt: CalibrationPoint): number {
  return pt.p ?? pt.predicted ?? 0;
}

function outcome(pt: CalibrationPoint): number {
  return pt.y ?? pt.actual ?? 0;
}

function clampP(p: number, eps = LOGLOSS_EPS): number {
  if (p < eps) return eps;
  if (p > 1 - eps) return 1 - eps;
  return p;
}

/**
 * Reliability diagram: bucket points into `bins` equal-width intervals over
 * [0,1] and report per-bin mean predicted, observed pass fraction, and count.
 * A point with p===1 falls into the last bin. EMPTY bins are omitted, so the
 * returned array has length ≤ bins and every entry has count ≥ 1.
 */
export function reliabilityDiagram(
  points: CalibrationPoint[],
  bins = 10,
): ReliabilityBin[] {
  const sumP = new Array<number>(bins).fill(0);
  const sumY = new Array<number>(bins).fill(0);
  const cnt = new Array<number>(bins).fill(0);

  for (const pt of points) {
    const p = pred(pt);
    let idx = Math.floor(p * bins);
    if (idx >= bins) idx = bins - 1;
    if (idx < 0) idx = 0;
    sumP[idx] += p;
    sumY[idx] += outcome(pt);
    cnt[idx] += 1;
  }

  const out: ReliabilityBin[] = [];
  for (let i = 0; i < bins; i++) {
    if (cnt[i] === 0) continue;
    out.push({
      meanPredicted: sumP[i] / cnt[i],
      observedFraction: sumY[i] / cnt[i],
      count: cnt[i],
    });
  }
  return out;
}

/** Mean squared error `mean((p - y)^2)`. Empty input → 0. */
export function brierScore(points: CalibrationPoint[]): number {
  if (points.length === 0) return 0;
  let sum = 0;
  for (const pt of points) {
    const d = pred(pt) - outcome(pt);
    sum += d * d;
  }
  return sum / points.length;
}

/**
 * Cross-entropy `-mean(y·ln(p) + (1-y)·ln(1-p))`, with p clamped to
 * [LOGLOSS_EPS, 1-LOGLOSS_EPS] so p=0 / p=1 inputs never yield ±∞. Empty
 * input → 0.
 */
export function logLoss(points: CalibrationPoint[]): number {
  if (points.length === 0) return 0;
  let sum = 0;
  for (const pt of points) {
    const p = clampP(pred(pt));
    const y = outcome(pt);
    sum += y * Math.log(p) + (1 - y) * Math.log(1 - p);
  }
  return -sum / points.length;
}

/**
 * Expected Calibration Error: `Σ_b (count_b/N)·|meanPredicted_b − observedFraction_b|`.
 * A perfectly-calibrated bin (meanPredicted == observedFraction) contributes 0.
 * Empty input → 0.
 */
export function ece(points: CalibrationPoint[], bins = 10): number {
  const n = points.length;
  if (n === 0) return 0;
  const diagram = reliabilityDiagram(points, bins);
  let sum = 0;
  for (const b of diagram) {
    sum += (b.count / n) * Math.abs(b.meanPredicted - b.observedFraction);
  }
  return sum;
}

function sigmoid(z: number): number {
  // Numerically-stable logistic.
  if (z >= 0) {
    const e = Math.exp(-z);
    return 1 / (1 + e);
  }
  const e = Math.exp(z);
  return e / (1 + e);
}

function logit(p: number): number {
  const q = clampP(p);
  return Math.log(q / (1 - q));
}

/**
 * Fit Platt scaling `P' = sigmoid(A·logit(p) + B)` by logistic MLE (minimise
 * the cross-entropy / negative log-likelihood of the observed outcomes given
 * the transformed logits). Solved with damped Newton–Raphson on the 2×2
 * logistic regression over the single feature x = logit(p), with a tiny L2
 * penalty (weight `RIDGE`) to keep the Hessian positive-definite on
 * near-separable data and a backtracking line search so the step never
 * increases the objective. Returns near-identity `{A:1,B:0}`-ish parameters
 * for an already-calibrated set. Empty input → identity.
 */
export function fitPlatt(points: CalibrationPoint[]): PlattParams {
  const n = points.length;
  if (n === 0) return { A: 1, B: 0 };

  const xs = new Array<number>(n);
  const ys = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    xs[i] = logit(pred(points[i]));
    ys[i] = outcome(points[i]);
  }

  // Small L2 penalty — negligible against a real dataset (n≫1) but enough to
  // regularise the separable/degenerate case so Newton stays finite.
  const RIDGE = 1e-6;

  // Regularised negative log-likelihood at (A,B).
  const nll = (A: number, B: number): number => {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const z = A * xs[i] + B;
      const mu = sigmoid(z);
      const p = mu < LOGLOSS_EPS ? LOGLOSS_EPS : mu > 1 - LOGLOSS_EPS ? 1 - LOGLOSS_EPS : mu;
      sum += ys[i] * Math.log(p) + (1 - ys[i]) * Math.log(1 - p);
    }
    return -sum + 0.5 * RIDGE * (A * A + B * B);
  };

  let A = 1;
  let B = 0;
  const maxIter = 100;
  for (let iter = 0; iter < maxIter; iter++) {
    // Gradient g and Hessian H of the regularised negative log-likelihood.
    let g0 = RIDGE * A; // ∂/∂A
    let g1 = RIDGE * B; // ∂/∂B
    let h00 = RIDGE;
    let h01 = 0;
    let h11 = RIDGE;
    for (let i = 0; i < n; i++) {
      const x = xs[i];
      const mu = sigmoid(A * x + B);
      const r = mu - ys[i];
      g0 += r * x;
      g1 += r;
      const w = mu * (1 - mu);
      h00 += w * x * x;
      h01 += w * x;
      h11 += w;
    }
    const det = h00 * h11 - h01 * h01;
    if (!(Math.abs(det) > 0)) break;
    const dA = (h11 * g0 - h01 * g1) / det;
    const dB = (-h01 * g0 + h00 * g1) / det;

    // Backtracking line search: shrink the step until it does not increase the
    // objective. Prevents the classic Newton blow-up on near-separable logits.
    const f0 = nll(A, B);
    let t = 1;
    let nA = A - t * dA;
    let nB = B - t * dB;
    while (t > 1e-8 && !(nll(nA, nB) <= f0)) {
      t *= 0.5;
      nA = A - t * dA;
      nB = B - t * dB;
    }
    A = nA;
    B = nB;
    if (Math.abs(t * dA) < 1e-10 && Math.abs(t * dB) < 1e-10) break;
  }
  return { A, B };
}

/** Apply fitted Platt parameters to a raw probability. Monotonic in `p`. */
export function applyPlatt(p: number, params: PlattParams): number {
  return sigmoid(params.A * logit(p) + params.B);
}
