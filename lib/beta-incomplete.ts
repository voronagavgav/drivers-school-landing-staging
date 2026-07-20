// ---------------------------------------------------------------------------
// Pure regularized incomplete beta function I_x(a,b) and its inverse (the Beta
// quantile). No DB, no clock, no randomness — injected inputs only.
//
// I_x(a,b) is the Beta(a,b) CDF: the probability mass on [0,x]. It powers the
// quantile tier of the readiness estimation correction (wave19c-05/06), where a
// weak-student small-sample pass estimate is pulled toward its Beta posterior's
// lower quantile.
//
// Method (Numerical Recipes §6.4): the continued-fraction `betacf` evaluated by
// the modified Lentz algorithm, scaled by the log-Beta prefactor via a Lanczos
// `lnGamma`, with the reflection I_x(a,b) = 1 − I_{1−x}(b,a) taken when
// x > (a+1)/(a+b+2) so the fraction converges from its fast side. The inverse
// uses monotone bisection on [0,1] (the CDF is strictly increasing), which
// cannot overshoot the interval the way a bare Newton step can on skewed shapes.
// ---------------------------------------------------------------------------

// Lanczos g=7 coefficients (standard, external — the classic Lanczos approx).
const LANCZOS_G = 7;
const LANCZOS_C = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028,
  771.32342877765313, -176.61502916214059, 12.507343278686905,
  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

/** Natural log of the gamma function, ln Γ(z), for z > 0 (Lanczos, g=7). */
function lnGamma(z: number): number {
  // Reflection for the small-argument tail; a,b > 0 rarely needs it but keeps
  // the kernel correct for any positive shape.
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  }
  z -= 1;
  let x = LANCZOS_C[0];
  for (let i = 1; i < LANCZOS_G + 2; i++) x += LANCZOS_C[i] / (z + i);
  const t = z + LANCZOS_G + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/**
 * Continued-fraction expansion for the incomplete beta, evaluated by the
 * modified Lentz algorithm (Numerical Recipes `betacf`). Converges fast for
 * x < (a+1)/(a+b+2); callers use the reflection otherwise.
 */
function betacf(a: number, b: number, x: number): number {
  const MAXIT = 300;
  const EPS = 3e-16;
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/**
 * Regularized incomplete beta I_x(a,b) — the Beta(a,b) CDF at x. Requires
 * a,b > 0 and x ∈ [0,1]; returns exactly 0 at x ≤ 0 and 1 at x ≥ 1.
 */
export function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = lnGamma(a + b) - lnGamma(a) - lnGamma(b);
  const bt = Math.exp(lbeta + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betacf(a, b, x)) / a;
  }
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/**
 * Inverse regularized incomplete beta: the x ∈ [0,1] with I_x(a,b) = alpha (the
 * Beta(a,b) quantile). Monotone bisection on [0,1] — the CDF is strictly
 * increasing — to ~1e-14, comfortably tighter than the oracle's 1e-6 tolerance
 * and robust on skewed a<b shapes where pure Newton can overshoot the interval.
 * `alpha` is clamped to [0,1] (α ≤ 0 → 0, α ≥ 1 → 1).
 */
export function betaInv(alpha: number, a: number, b: number): number {
  if (alpha <= 0) return 0;
  if (alpha >= 1) return 1;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 200; i++) {
    const mid = 0.5 * (lo + hi);
    const cdf = regularizedIncompleteBeta(mid, a, b);
    if (cdf < alpha) lo = mid;
    else hi = mid;
    if (hi - lo < 1e-14) break;
  }
  return 0.5 * (lo + hi);
}
