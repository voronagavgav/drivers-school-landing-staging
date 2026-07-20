#!/usr/bin/env python3
# =============================================================================
# gen-19d-oracles.py  —  REFERENCE ORACLE for the wave19d evidence-releasing
# readiness model.  The TS implementation (tasks 05/06/07) MUST MATCH the values
# this script prints; NEVER regenerate these values from the TS implementation.
#
# Source of the model (frozen here):
#   - specs/wave19d-blueprint-and-release.md  (Deliverables 2-3 + properties a-f)
#   - docs/research/HIERARCHICAL-RELEASE-RESEARCH-2026-07-13.json
#     (3-0-voted math: Lahiri-Mukherjee seen/unseen split; one-factor
#      Gauss-Hermite mixture ICC; Cai-2005 m^-1/2 credible-gap decay).
#
# Dependencies: numpy 2.4.6 ONLY (no scipy, no network). The Gauss-Hermite
# nodes/weights come from numpy.polynomial.hermite_e.hermegauss (probabilists'
# HermiteE weight e^{-x^2/2}; sum of weights = sqrt(2*pi)).
#
# This task (wave19d-02) PINS the model's open design choices — they are frozen
# HERE and later tasks may NOT edit them:
#   * nNodes = 20 Gauss-Hermite nodes  (research: "~20 nodes").
#   * sigma0 from the rho->sigma0 map (standard logistic-normal latent ICC):
#       rho = sigma0^2 / (sigma0^2 + pi^2/3)  =>  sigma0 = sqrt(rho/(1-rho) * pi^2/3)
#     with rho = 0.35 (the successor of READINESS_TOPIC_CORRELATION_ESTIMATION,
#     the research's ~0.3-0.35 within-topic ICC).  pi^2/3 = Var of the standard
#     logistic distribution — the canonical GLMM latent-scale variance.
#   * evidence-decay w(M) = sqrt(m0 / (m0 + M)),  m0 = 1  (reference review mass).
#     M = mean per-item review count over the exam's seen items.  w(0)=1 (full
#     factor spread, no per-item evidence);  w(M) ~ sqrt(m0/M) = O(M^-1/2) as
#     M->inf (Cai-2005 credible-gap rate) so sigma -> 0 and the mixture releases
#     to the independence baseline.  Engineering device (finding 7), NOT claimed
#     exactly calibrated.
#
# THE MODEL
#   per_item(R, slope)        = clip(R*slope, 0, 1)
#   block seen/unseen split (Lahiri-Mukherjee, Deliverable 2):
#     seenSum  = sum_i per_item(R_i, slope)   over the block's SEEN items
#     seenMean = seenSum / nSeen
#     Jeffreys-Beta posterior over seen evidence: Beta(0.5+seenSum, 0.5+(nSeen-seenSum))
#       posterior-predictive mean  C0 = (0.5 + seenSum) / (1 + nSeen)
#     C = min(C0, seenMean, PRIOR*slope)   (the existing honesty clamp, per block;
#         unseen slot never assumed better than the seen mean OR the prior)
#     p_slot = (seenSum + nUnseen * C) / nPool      nPool = nSeen + nUnseen
#     Seen items are NEVER shrunk; p_slot -> seenMean as coverage grows (nUnseen->0).
#   independenceDial = exact Poisson-binomial P(>= threshold) over the raw
#                      per-slot p-vector (quota copies of p_slot per block).
#   factor mixture (Deliverable 3): one shared latent logit-normal factor
#     Z~N(0,1), variance applied on the LOGIT scale.  sigma = sigma0 * w(M).
#     Per node x_i: shift every slot  p -> sigmoid(logit(p) + sigma*x_i);  run the
#     exact PB per node;  mixtureDial = sum_i normWeight_i * PB_i(>= threshold),
#     normWeight_i = ghWeight_i / sqrt(2*pi)  (sums to 1 for the N(0,1) factor).
#   finalDial = min(mixtureDial, independenceDial)   (outer never-above guarantee).
#
# Dials are reported both as probability (>=10 sig digits) and as the rounded
# integer percent the UI shows (round(prob*100)).
# =============================================================================

import math
import numpy as np
from numpy.polynomial.hermite_e import hermegauss

# ---- frozen design constants -------------------------------------------------
TOTAL      = 20            # exam questions (DEFAULT_EXAM_QUESTION_COUNT)
THRESHOLD  = 18            # correct needed to pass (TOTAL - DEFAULT_EXAM_MAX_ERRORS)
PRIOR      = 0.5           # READINESS_UNSEEN_PRIOR (conservative unseen-slot prior)
RHO        = 0.35          # within-topic ICC (successor of READINESS_TOPIC_CORRELATION_ESTIMATION)
N_NODES    = 20            # Gauss-Hermite node count (research: ~20)
M0         = 1.0           # evidence-decay reference review mass
PI2_3      = math.pi ** 2 / 3.0            # Var of the standard logistic dist
SIGMA0     = math.sqrt(RHO / (1.0 - RHO) * PI2_3)   # rho -> sigma0 map
EPS        = 1e-12         # logit clamp so p in {0,1} stays finite

# Official cat-B blueprint (Deliverable 1): PDR 10 / safety 4 / build 4 / medical 2.
QUOTAS = {"pdr": 10, "safety": 4, "build": 4, "medical": 2}

# Gauss-Hermite (probabilists' HermiteE) nodes + weights for the N(0,1) factor.
GH_NODES, GH_WEIGHTS = hermegauss(N_NODES)
GH_NORMW = GH_WEIGHTS / math.sqrt(2.0 * math.pi)   # normalised, sum to 1


def clip01(x):
    return 0.0 if x < 0.0 else (1.0 if x > 1.0 else x)


def per_item(R, slope=1.0):
    return clip01(R * slope)


def logit(p):
    q = min(1.0 - EPS, max(EPS, p))
    return math.log(q / (1.0 - q))


def sigmoid(x):
    return 1.0 / (1.0 + math.exp(-x))


def pb_at_least(k, ps):
    """Exact Poisson-binomial P(>= k) — mirrors lib/readiness-model.ts DP."""
    n = len(ps)
    if k <= 0:
        return 1.0
    if k > n:
        return 0.0
    dp = [0.0] * k
    dp[0] = 1.0
    for p in ps:
        q = clip01(p)
        for j in range(k - 1, 0, -1):
            dp[j] = dp[j] * (1.0 - q) + dp[j - 1] * q
        dp[0] = dp[0] * (1.0 - q)
    return clip01(1.0 - sum(dp))


def block_extrapolation(seen_ps, slope):
    """Return (C0, C, seenMean) for a block's seen probabilities."""
    n = len(seen_ps)
    prior_cap = per_item(PRIOR, slope)
    if n == 0:
        return prior_cap, prior_cap, prior_cap
    seen_sum = sum(seen_ps)
    seen_mean = seen_sum / n
    c0 = (0.5 + seen_sum) / (1.0 + n)
    c = min(c0, seen_mean, prior_cap)
    return c0, c, seen_mean


def block_p_slot(seen_R, n_unseen, slope):
    """Lahiri-Mukherjee per-slot marginal for a block."""
    seen_ps = [per_item(r, slope) for r in seen_R]
    _c0, c, _mean = block_extrapolation(seen_ps, slope)
    n_seen = len(seen_ps)
    n_pool = n_seen + n_unseen
    seen_sum = sum(seen_ps)
    if n_pool == 0:
        return per_item(PRIOR, slope)
    return (seen_sum + n_unseen * c) / n_pool


def exam_pvector(blocks, slope):
    """blocks: list of dict{quota, seen(list of R), unseen(int)}. -> flat p-vector."""
    pv = []
    for b in blocks:
        p = block_p_slot(b["seen"], b["unseen"], slope)
        pv.extend([p] * b["quota"])
    return pv


def mixture_dial_prob(pvec, sigma, threshold=THRESHOLD):
    """Node-weighted average pass prob over the shared logit-normal factor."""
    total = 0.0
    for xi, w in zip(GH_NODES, GH_NORMW):
        shifted = [sigmoid(logit(p) + sigma * xi) for p in pvec]
        total += w * pb_at_least(threshold, shifted)
    return total


def dials(blocks, review_mass, slope=1.0, threshold=THRESHOLD):
    """Full model: returns dict of probs + integer-percent dials."""
    pvec = exam_pvector(blocks, slope)
    indep = pb_at_least(threshold, pvec)
    sigma = SIGMA0 * math.sqrt(M0 / (M0 + review_mass))
    mixture = mixture_dial_prob(pvec, sigma, threshold)
    final = min(mixture, indep)
    return {
        "pvec": pvec,
        "sigma": sigma,
        "independence": indep,
        "mixture": mixture,
        "final": final,
        "indepDial": round(indep * 100),
        "mixDial": round(mixture * 100),
        "finalDial": round(final * 100),
    }


def homo_block(key, per_slot_R, n_seen, n_unseen):
    """A block whose seen items all carry the same R."""
    return {"quota": QUOTAS[key], "seen": [per_slot_R] * n_seen, "unseen": n_unseen}


# =============================================================================
# EMIT
# =============================================================================
def p(name, value, sig=12):
    if isinstance(value, int):
        print(f"{name} = {value}")
    else:
        print(f"{name} = {value:.{sig}g}")


print("# ==========================================================================")
print("# wave19d release-oracle — reference values. TS impl must MATCH; never")
print("# regenerate these from the TS. Source: specs/wave19d-blueprint-and-release.md")
print("# + docs/research/HIERARCHICAL-RELEASE-RESEARCH-2026-07-13.json")
print("# ==========================================================================")
print("## --- design constants (pinned by wave19d-02; later tasks read, never edit) ---")
p("TOTAL", TOTAL)
p("THRESHOLD", THRESHOLD)
p("PRIOR", PRIOR)
p("RHO", RHO)
p("PI2_3", PI2_3)
p("SIGMA0", SIGMA0)
p("N_NODES", N_NODES)
p("M0", M0)
print("# rho->sigma0:  sigma0 = sqrt(rho/(1-rho) * pi^2/3)")
print("# decay:        w(M)   = sqrt(M0 / (M0 + M))   (M0=1); sigma = sigma0*w(M)")
print("# quotas:       pdr=10 safety=4 build=4 medical=2")

print("\n## --- Gauss-Hermite nodes/weights (probabilists' HermiteE, N(0,1) factor) ---")
print("GH_NODES = [" + ", ".join(f"{x:.15g}" for x in GH_NODES) + "]")
print("GH_WEIGHTS = [" + ", ".join(f"{w:.15g}" for w in GH_WEIGHTS) + "]")
print("GH_NORMW = [" + ", ".join(f"{w:.15g}" for w in GH_NORMW) + "]")
p("GH_NORMW_SUM", float(np.sum(GH_NORMW)))

# --- factor-mixture sub-module oracle: fixed p-vector + sigma -----------------
print("\n## --- factor-mixture sub-oracle (fixed p-vector + sigma) ---")
FM_PVEC = [0.97] * 10 + [0.9] * 4 + [0.9] * 4 + [0.9] * 2   # 20-slot strong-ish set
FM_M = 4.0
FM_SIGMA = SIGMA0 * math.sqrt(M0 / (M0 + FM_M))
print("FM_PVEC = [" + ", ".join(f"{x:.15g}" for x in FM_PVEC) + "]")
p("FM_M", FM_M)
p("FM_SIGMA", FM_SIGMA)
p("FM_INDEP", pb_at_least(THRESHOLD, FM_PVEC))
# per-node conditional pass probabilities (all 20)
fm_pernode = []
for xi in GH_NODES:
    shifted = [sigmoid(logit(pp) + FM_SIGMA * xi) for pp in FM_PVEC]
    fm_pernode.append(pb_at_least(THRESHOLD, shifted))
print("FM_PERNODE = [" + ", ".join(f"{v:.15g}" for v in fm_pernode) + "]")
p("FM_MIXTURE", mixture_dial_prob(FM_PVEC, FM_SIGMA))

# --- seen/unseen sub-module oracle (Deliverable 2) ---------------------------
print("\n## --- seen/unseen split sub-oracle (Deliverable 2; block pool = 11) ---")
# (c) SPARSE: n_seen=2 @0.95 in an 11-slot block -> C near prior, does NOT certify.
c0_sp, c_sp, mean_sp = block_extrapolation([per_item(0.95)] * 2, 1.0)
p("SPARSE_C0", c0_sp)
p("SPARSE_C", c_sp)
p("SPARSE_SEENMEAN", mean_sp)
p("SPARSE_PSLOT", block_p_slot([0.95] * 2, 9, 1.0))   # pool 11 = 2 seen + 9 unseen
# mid coverage (strong): p_slot releases toward seenMean as coverage grows, C pinned.
p("MID_C", block_extrapolation([per_item(0.95)] * 8, 1.0)[1])
p("MID_PSLOT", block_p_slot([0.95] * 8, 3, 1.0))       # pool 11 = 8 seen + 3 unseen
p("FULL_PSLOT", block_p_slot([0.95] * 11, 0, 1.0))     # pool 11 = 11 seen + 0 unseen

# =============================================================================
# END-TO-END (a)-(f) DIALS
# =============================================================================
print("\n## --- end-to-end (a)-(f) release dials ---")

# (a) NEVER-ABOVE-INDEPENDENCE. WEAK set (mean < threshold/n=0.9) => final = indep
#     (min-clamp no-op: mixture RAISES the far-upper tail, so min picks indep).
#     STRONG set (mean > 0.9) => final <= indep (mixture binds, lowers the tail).
a_weak = dials(
    [homo_block("pdr", 0.7, 40, 0), homo_block("safety", 0.7, 40, 0),
     homo_block("build", 0.7, 40, 0), homo_block("medical", 0.7, 40, 0)],
    review_mass=4.0)
a_strong = dials(
    [homo_block("pdr", 0.97, 40, 0), homo_block("safety", 0.97, 40, 0),
     homo_block("build", 0.97, 40, 0), homo_block("medical", 0.97, 40, 0)],
    review_mass=4.0)
p("A_WEAK_INDEP", a_weak["independence"]); p("A_WEAK_MIX", a_weak["mixture"])
p("A_WEAK_FINAL", a_weak["final"]); p("A_WEAK_FINAL_DIAL", a_weak["finalDial"])
p("A_WEAK_INDEP_DIAL", a_weak["indepDial"])
p("A_STRONG_INDEP", a_strong["independence"]); p("A_STRONG_MIX", a_strong["mixture"])
p("A_STRONG_FINAL", a_strong["final"]); p("A_STRONG_FINAL_DIAL", a_strong["finalDial"])
p("A_STRONG_INDEP_DIAL", a_strong["indepDial"])

# (b) ASYMPTOTIC RELEASE. p_hat=0.95 across all 4 blocks, RICH evidence + full cov
#     => |final - indep| <= 2pp and final >= 80.
b = dials(
    [homo_block("pdr", 0.95, 50, 0), homo_block("safety", 0.95, 50, 0),
     homo_block("build", 0.95, 50, 0), homo_block("medical", 0.95, 50, 0)],
    review_mass=1000.0)
p("B_INDEP", b["independence"]); p("B_MIX", b["mixture"]); p("B_FINAL", b["final"])
p("B_INDEP_DIAL", b["indepDial"]); p("B_FINAL_DIAL", b["finalDial"])

# (b') 19c-ceiling counterexample now RELEASES. p_hat=1.0, nSeen=1000, full cov,
#      rich => final ~ indep and finalDial >= 95 (NOT the 19c ~59% ceiling).
bp = dials(
    [homo_block("pdr", 1.0, 1000, 0), homo_block("safety", 1.0, 1000, 0),
     homo_block("build", 1.0, 1000, 0), homo_block("medical", 1.0, 1000, 0)],
    review_mass=1000.0)
p("BP_INDEP", bp["independence"]); p("BP_FINAL", bp["final"])
p("BP_INDEP_DIAL", bp["indepDial"]); p("BP_FINAL_DIAL", bp["finalDial"])

# (c) SPARSE DISCOUNT — see seen/unseen sub-oracle above (SPARSE_C, SPARSE_PSLOT).

# (d) STUDY-NEVER-HURTS (R2 fix). pdr block pool 11: BEFORE 10 seen@0.95 + 1 unseen;
#     AFTER add the new item at R=0.6 (11 seen, 0 unseen). Other blocks fixed@0.9.
d_others = [homo_block("safety", 0.9, 20, 0), homo_block("build", 0.9, 20, 0),
            homo_block("medical", 0.9, 20, 0)]
d_before = dials([{"quota": 10, "seen": [0.95] * 10, "unseen": 1}] + d_others, review_mass=8.0)
d_after = dials([{"quota": 10, "seen": [0.95] * 10 + [0.6], "unseen": 0}] + d_others, review_mass=8.0)
p("D_BEFORE_PSLOT_PDR", block_p_slot([0.95] * 10, 1, 1.0))
p("D_AFTER_PSLOT_PDR", block_p_slot([0.95] * 10 + [0.6], 0, 1.0))
p("D_BEFORE_INDEP", d_before["independence"]); p("D_AFTER_INDEP", d_after["independence"])
p("D_BEFORE_FINAL", d_before["final"]); p("D_AFTER_FINAL", d_after["final"])
p("D_BEFORE_FINAL_DIAL", d_before["finalDial"]); p("D_AFTER_FINAL_DIAL", d_after["finalDial"])

# (e) INSTRUMENT RANGE. perfect+rich => final >= 95;  hopeless+rich => final <= 2.
e_perfect = dials(
    [homo_block("pdr", 0.999, 200, 0), homo_block("safety", 0.999, 200, 0),
     homo_block("build", 0.999, 200, 0), homo_block("medical", 0.999, 200, 0)],
    review_mass=2000.0)
e_hopeless = dials(
    [homo_block("pdr", 0.0, 200, 0), homo_block("safety", 0.0, 200, 0),
     homo_block("build", 0.0, 200, 0), homo_block("medical", 0.0, 200, 0)],
    review_mass=2000.0)
p("E_PERFECT_FINAL", e_perfect["final"]); p("E_PERFECT_FINAL_DIAL", e_perfect["finalDial"])
p("E_HOPELESS_FINAL", e_hopeless["final"]); p("E_HOPELESS_FINAL_DIAL", e_hopeless["finalDial"])

# (f) SINGLE UNCERTAINTY BUDGET. slope=1 rich => final ~ indep (within 2pp);
#     slope=0.6 same R strictly lower (slope participates ONCE, no block re-discount).
f_slope1 = dials(
    [homo_block("pdr", 0.95, 50, 0), homo_block("safety", 0.95, 50, 0),
     homo_block("build", 0.95, 50, 0), homo_block("medical", 0.95, 50, 0)],
    review_mass=1000.0, slope=1.0)
f_slope06 = dials(
    [homo_block("pdr", 0.95, 50, 0), homo_block("safety", 0.95, 50, 0),
     homo_block("build", 0.95, 50, 0), homo_block("medical", 0.95, 50, 0)],
    review_mass=1000.0, slope=0.6)
p("F_SLOPE1_INDEP", f_slope1["independence"]); p("F_SLOPE1_FINAL", f_slope1["final"])
p("F_SLOPE1_FINAL_DIAL", f_slope1["finalDial"])
p("F_SLOPE06_FINAL", f_slope06["final"]); p("F_SLOPE06_FINAL_DIAL", f_slope06["finalDial"])

# ---- self-check: the binding properties MUST hold on the printed values ------
print("\n## --- self-check (properties a-f on the frozen values) ---")
checks = {
    "a_weak_final==indep (min-clamp no-op)": abs(a_weak["final"] - a_weak["independence"]) < 1e-15,
    "a_strong_final<=indep": a_strong["final"] <= a_strong["independence"] + 1e-15,
    "b_release_within_2pp": abs(b["finalDial"] - b["indepDial"]) <= 2,
    "b_final>=80": b["finalDial"] >= 80,
    "bprime_final>=95": bp["finalDial"] >= 95,
    "c_sparse_C<0.7": c_sp < 0.7,
    "d_after>=before (study never hurts)": d_after["final"] >= d_before["final"] - 1e-15,
    "e_perfect>=95": e_perfect["finalDial"] >= 95,
    "e_hopeless<=2": e_hopeless["finalDial"] <= 2,
    "f_slope1_within_2pp": abs(f_slope1["finalDial"] - f_slope1["indepDial"]) <= 2,
    "f_slope06<slope1": f_slope06["final"] < f_slope1["final"],
    "gh_normw_sums_to_1": abs(float(np.sum(GH_NORMW)) - 1.0) < 1e-12,
}
all_ok = True
for name, ok in checks.items():
    print(f"CHECK {'PASS' if ok else 'FAIL'} {name}")
    all_ok = all_ok and ok
print(f"ALL_CHECKS = {'PASS' if all_ok else 'FAIL'}")
import sys
sys.exit(0 if all_ok else 1)
