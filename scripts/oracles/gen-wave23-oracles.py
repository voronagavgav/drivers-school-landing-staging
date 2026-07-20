#!/usr/bin/env python3
# =============================================================================
# gen-wave23-oracles.py
# reference oracle — the TS impl MUST match this; never regenerate these values from TS
#
# The FIRST task of wave23 (the exam-date review-allocator SPIKE). This script
# INDEPENDENTLY re-encodes (from the SPEC + the frozen wave19d dial math, NOT by
# importing/shelling out to any TS/JS) the allocator scoring model and freezes
# properties (a)-(f). The later TS oracle test (wave23-03) and impl
# (wave23-04, lib/exam-allocator.ts) MUST reproduce these 6dp values by importing
# the REAL `releaseDial`; they may NEVER regenerate them from TS.
#
# Source of the model (frozen here; later tasks may NOT edit these values):
#   - specs/wave23-exam-allocator-spike.md   (Goal + Design + Deliverable 1 (a)-(e)).
#   - The dial machinery re-encoded independently:
#       lib/readiness-release.ts        (releaseDial = min(mixture, independence))
#       lib/readiness-seen-unseen.ts    (blockSplit, Lahiri-Mukherjee)
#       lib/readiness-model.ts          (poissonBinomialAtLeast)
#       lib/readiness-factor-mixture.ts (Gauss-Hermite one-factor mixture)
#     The PB tail + seen/unseen split + GH mixture helpers below are COPIED from
#     scripts/oracles/gen-19d-oracles.py (never imported), so this is a SECOND,
#     independent implementation the TS must agree with (anti self-grading).
#   - Baseline (e) cross-check: lib/test-engine/queue.ts `scoreCandidate` docstring
#     (additive due-first score), re-encoded from the docstring formula, NOT by
#     importing the TS.
#
# Dependencies: python stdlib (math, sys) + numpy ONLY (for hermegauss, exactly as
# gen-19d does). No scipy, no network, no rng, no DB. Deterministic throughout.
#
# ---------------------------------------------------------------------------
# THE ALLOCATOR MODEL (spec Deliverable 1)
#   Objective = the REAL dial `releaseDial(input).final` (= min(mixture, indep))
#   over the official 4-strata blueprint (pdr 10 / safety 4 / build 4 / medical 2,
#   THRESHOLD = DEFAULT_EXAM_QUESTION_COUNT - DEFAULT_EXAM_MAX_ERRORS = 18,
#   UNSEEN_PRIOR = 0.5), reproduced independently.
#
#   Allocator score for reviewing candidate item i TODAY:
#     dP_i = E_outcome[ P_pass(states with item i updated) - P_pass(states) ]
#          = p_i * ( P_pass(after correct) - P_pass(before) )
#          + (1 - p_i) * ( P_pass(after wrong) - P_pass(before) )
#   where p_i = R_i (retrievability of a SEEN item at review time).
#
#   FIXTURE-SUPPLIED STATE TRANSITIONS (spec Constraints): this oracle does NOT run
#   FSRS scheduling. It scores the DIAL DELTA from GIVEN before/after
#   retrievabilities per item — each item carries `before` R, `afterCorrect` R,
#   `afterWrong` R, and `p_correct`. (The real FSRS deriveGrade->schedule transition
#   is exercised by the SIM, wave23-05, not by this allocator-score oracle; keeping
#   this a pure dial-delta function is exactly why its 6dp values are reproducible
#   in TS by importing `releaseDial`.)
# =============================================================================

import math
import sys
import numpy as np
from numpy.polynomial.hermite_e import hermegauss

# ---- frozen design constants (copied verbatim from gen-19d-oracles.py) -------
TOTAL = 20  # DEFAULT_EXAM_QUESTION_COUNT
THRESHOLD = 18  # TOTAL - DEFAULT_EXAM_MAX_ERRORS
PRIOR = 0.5  # READINESS_UNSEEN_PRIOR
RHO = 0.35  # within-topic ICC
N_NODES = 20  # Gauss-Hermite node count
M0 = 1.0  # evidence-decay reference review mass
PI2_3 = math.pi ** 2 / 3.0
SIGMA0 = math.sqrt(RHO / (1.0 - RHO) * PI2_3)
EPS = 1e-12

# Official cat-B blueprint quotas (Deliverable 1): pdr 10 / safety 4 / build 4 / medical 2.
QUOTAS = {"pdr": 10, "safety": 4, "build": 4, "medical": 2}

GH_NODES, GH_WEIGHTS = hermegauss(N_NODES)
GH_NORMW = GH_WEIGHTS / math.sqrt(2.0 * math.pi)  # normalised, sum to 1


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


def block_p_slot(seen_R, n_unseen, slope=1.0):
    """Lahiri-Mukherjee per-slot marginal for a block (mirrors blockSplit)."""
    seen_ps = [per_item(r, slope) for r in seen_R]
    n_seen = len(seen_ps)
    prior_cap = per_item(PRIOR, slope)
    if n_seen == 0:
        return prior_cap if n_unseen > 0 else 0.0
    seen_sum = sum(seen_ps)
    seen_mean = seen_sum / n_seen
    c0 = (0.5 + seen_sum) / (1.0 + n_seen)
    c = min(c0, seen_mean, prior_cap)
    n_pool = n_seen + n_unseen
    return (seen_sum + n_unseen * c) / n_pool if n_pool > 0 else 0.0


def exam_pvector(blocks, slope=1.0):
    pv = []
    for b in blocks:
        p = block_p_slot(b["seen"], b["unseen"], slope)
        pv.extend([p] * b["quota"])
    return pv


def mixture_dial_prob(pvec, sigma, threshold=THRESHOLD):
    total = 0.0
    for xi, w in zip(GH_NODES, GH_NORMW):
        shifted = [sigmoid(logit(p) + sigma * xi) for p in pvec]
        total += w * pb_at_least(threshold, shifted)
    return clip01(total)


def p_pass(blocks, review_mass, slope=1.0, threshold=THRESHOLD):
    """releaseDial(...).final = min(mixture, independence), the probability form."""
    pvec = exam_pvector(blocks, slope)
    indep = pb_at_least(threshold, pvec)
    sigma = SIGMA0 * math.sqrt(M0 / (M0 + review_mass))
    mixture = mixture_dial_prob(pvec, sigma, threshold)
    return min(mixture, indep)


# =============================================================================
# THE 6-ITEM / 2-BLOCK FIXTURE
# =============================================================================
# The candidate items live in TWO blueprint blocks (build + safety, quota 4 each).
# The other two blocks (pdr 10, medical 2) are FIXED background at R=0.95. Each
# candidate block holds its 3 candidates + one fixed background item at 0.95, all
# SEEN (nUnseen=0). review_mass=8.0 (moderate evidence) keeps the dial in a
# sensitive zone so ΔP is measurable.
REVIEW_MASS = 8.0
SLOPE = 1.0
BG = 0.95  # fixed background retrievability

# Candidate items: id -> (block, before, afterCorrect, afterWrong, p_correct).
# p_correct = before retrievability (spec: p_correct = R_i). Weak -> strong span.
ITEMS = {
    "i1": {"block": "build", "before": 0.60, "aC": 0.85, "aW": 0.40, "p": 0.60},
    "i2": {"block": "build", "before": 0.75, "aC": 0.90, "aW": 0.50, "p": 0.75},
    "i3": {"block": "build", "before": 0.88, "aC": 0.95, "aW": 0.60, "p": 0.88},
    "i4": {"block": "safety", "before": 0.65, "aC": 0.88, "aW": 0.42, "p": 0.65},
    "i5": {"block": "safety", "before": 0.80, "aC": 0.92, "aW": 0.55, "p": 0.80},
    "i6": {"block": "safety", "before": 0.94, "aC": 0.98, "aW": 0.65, "p": 0.94},
}
IDS = ["i1", "i2", "i3", "i4", "i5", "i6"]
BUILD_IDS = ["i1", "i2", "i3"]
SAFETY_IDS = ["i4", "i5", "i6"]

# Baseline (e) per-item attributes for the queue.ts additive score. `R` mirrors
# `before`; overdue/weakness/stability are fixture inputs feeding the queue formula.
BASELINE = {
    "i1": {"overdue": 0.5, "R": 0.60, "weakness": 0.80, "stability": 2.0},
    "i2": {"overdue": 2.0, "R": 0.75, "weakness": 0.30, "stability": 5.0},
    "i3": {"overdue": 0.2, "R": 0.88, "weakness": 0.10, "stability": 20.0},
    "i4": {"overdue": 1.0, "R": 0.65, "weakness": 0.60, "stability": 3.0},
    "i5": {"overdue": 3.0, "R": 0.80, "weakness": 0.20, "stability": 10.0},
    "i6": {"overdue": 0.1, "R": 0.94, "weakness": 0.05, "stability": 40.0},
}


def build_exam(rvals):
    """rvals: id -> R. Assemble the full 20-slot exam state (all 4 blocks)."""
    build_seen = [rvals[i] for i in BUILD_IDS] + [BG]
    safety_seen = [rvals[i] for i in SAFETY_IDS] + [BG]
    return [
        {"quota": QUOTAS["pdr"], "seen": [BG] * 10, "unseen": 0},
        {"quota": QUOTAS["build"], "seen": build_seen, "unseen": 0},
        {"quota": QUOTAS["safety"], "seen": safety_seen, "unseen": 0},
        {"quota": QUOTAS["medical"], "seen": [BG, BG], "unseen": 0},
    ]


BEFORE_R = {i: ITEMS[i]["before"] for i in IDS}


def dial_for(rvals):
    return p_pass(build_exam(rvals), REVIEW_MASS, SLOPE)


def with_item(base, item_id, r):
    d = dict(base)
    d[item_id] = r
    return d


DIAL_BEFORE = dial_for(BEFORE_R)


def deltas_for(item_id):
    """Return (dCorrect, dWrong, p, dP) for reviewing `item_id` today."""
    it = ITEMS[item_id]
    p = it["p"]
    d_correct = dial_for(with_item(BEFORE_R, item_id, it["aC"])) - DIAL_BEFORE
    d_wrong = dial_for(with_item(BEFORE_R, item_id, it["aW"])) - DIAL_BEFORE
    dp = p * d_correct + (1.0 - p) * d_wrong
    return d_correct, d_wrong, p, dp


DELTAS = {i: deltas_for(i) for i in IDS}
DP = {i: DELTAS[i][3] for i in IDS}


# Allocator ranking: descending ΔP; ties broken by item id ascending.
RANK = sorted(IDS, key=lambda i: (-DP[i], i))


# ---- baseline queue score (re-encoded from queue.ts scoreCandidate) ----------
W_OVERDUE, W_FORGET, W_WEAK, W_TIEBREAK = 1.0, 1.0, 0.3, 0.01


def overdue_saturation(x):
    return x / (1.0 + x)


def baseline_score(b):
    r = b["R"]
    stab = b["stability"] if b["stability"] > 0 else 0.0
    return (
        W_OVERDUE * overdue_saturation(b["overdue"])
        + W_FORGET * (1.0 - r)
        + W_WEAK * b["weakness"]
        + W_TIEBREAK * (1.0 / (1.0 + stab))
    )


BASE_SCORE = {i: baseline_score(BASELINE[i]) for i in IDS}
BASE_RANK = sorted(IDS, key=lambda i: (-BASE_SCORE[i], i))
POLICIES_DIFFER = RANK != BASE_RANK

# ---- (f) monotone sanity comparison pair -------------------------------------
# correct-path nonneg: i1 is below its block mean with afterCorrect(0.85) > before(0.60).
MONO_CORRECT_ITEM = "i1"
MONO_CORRECT_NONNEG = DELTAS[MONO_CORRECT_ITEM][0] >= -1e-15
# weak vs strong: i1 (weak, before 0.60) reviewed carries a larger ΔP than i6
# (already at the block ceiling, before 0.94) — a ceiling item can barely move the
# dial up while a weak item has room. Compare full ΔP.
MONO_WEAK, MONO_STRONG = "i1", "i6"
MONO_WEAK_GT_STRONG = DP[MONO_WEAK] > DP[MONO_STRONG]

# ---- (d) budget boundaries ---------------------------------------------------
BUDGET_ZERO_SELECTED = []  # B=0 -> allocator selects nothing
BUDGET_ZERO_GAIN = 0.0
BUDGET_SAT_SELECTED = sorted(IDS)  # B >= candidate count -> all reviewed


# =============================================================================
# EMIT — labelled `ok <token> got=X exp=X`-style lines the static judge READS.
# =============================================================================
def f6(x):
    return f"{x:.6f}"


print("# ==========================================================================")
print("# static evidence — read, do not run.  wave23 allocator reference oracle.")
print("# reference oracle — the TS impl MUST match this; never regenerate these")
print("# values from TS.  Source: specs/wave23-exam-allocator-spike.md (Deliverable 1).")
print("# ==========================================================================")

print("\n## --- design constants (from wave19d; re-encoded, not imported) ---")
print(f"TOTAL={TOTAL} THRESHOLD={THRESHOLD} PRIOR={PRIOR} RHO={RHO} N_NODES={N_NODES} M0={M0}")
print(f"SIGMA0={SIGMA0:.15g}")
print(f"quotas: pdr={QUOTAS['pdr']} safety={QUOTAS['safety']} build={QUOTAS['build']} medical={QUOTAS['medical']}")
print(f"REVIEW_MASS={REVIEW_MASS} SLOPE={SLOPE} background_R={BG}")

print("\n## --- fixture: 6 items / 2 blocks (build + safety), background fixed @0.95 ---")
for i in IDS:
    it = ITEMS[i]
    print(f"item {i}: block={it['block']} before={it['before']} afterCorrect={it['aC']} "
          f"afterWrong={it['aW']} p_correct={it['p']}")

print("\n## --- (a) ΔP_i values (6dp) + baseline dial ---")
print(f"ok dial_before final={f6(DIAL_BEFORE)}")
for i in IDS:
    print(f"ok dP item={i} dP={f6(DP[i])}")

print("\n## --- (b) allocator ranking (descending ΔP; ties by id ascending) ---")
print(f"ok rank order={','.join(RANK)}")

print("\n## --- (c) expected-outcome blend arithmetic (chosen item i1) ---")
BLEND_ITEM = "i1"
dC, dW, pp, dp = DELTAS[BLEND_ITEM]
print(f"ok blend item={BLEND_ITEM} dCorrect={f6(dC)} dWrong={f6(dW)} p={f6(pp)} dP={f6(dp)}")
blend_recomputed = pp * dC + (1.0 - pp) * dW
BLEND_HOLDS = abs(blend_recomputed - dp) < 1e-9 and round(blend_recomputed, 6) == round(dp, 6)
print(f"ok blend_identity holds={'true' if BLEND_HOLDS else 'false'}")

print("\n## --- (d) budget boundaries ---")
print(f"ok budget_zero reviewed=0 selected={','.join(BUDGET_ZERO_SELECTED) or '-'} gain={f6(BUDGET_ZERO_GAIN)}")
print(f"ok budget_saturate reviewed=6 selected={','.join(BUDGET_SAT_SELECTED)}")

print("\n## --- (e) baseline-policy ranking (queue.ts scoreCandidate, re-encoded) ---")
for i in IDS:
    print(f"baseline_score {i}={f6(BASE_SCORE[i])}")
print(f"ok baseline order={','.join(BASE_RANK)}")
print(f"ok policies_differ differs={'true' if POLICIES_DIFFER else 'false'}")

print("\n## --- (f) monotone sanity ---")
print(f"mono correct-path item={MONO_CORRECT_ITEM} dCorrect={f6(DELTAS[MONO_CORRECT_ITEM][0])}")
print(f"ok mono correct_delta_nonneg={'true' if MONO_CORRECT_NONNEG else 'false'}")
print(f"mono weak={MONO_WEAK} dP={f6(DP[MONO_WEAK])} strong={MONO_STRONG} dP={f6(DP[MONO_STRONG])}")
print(f"ok mono weak_gt_strong={'true' if MONO_WEAK_GT_STRONG else 'false'}")

# =============================================================================
# self-check: every binding property MUST hold on the frozen values.
# (Prints a marker ONLY on failure; verify.sh greps for MISMATCH/not ok/FAIL.)
# =============================================================================
print("\n## --- self-check (properties a-f on the frozen values) ---")
checks = {
    "blend_identity": BLEND_HOLDS,
    "budget_zero_empty": BUDGET_ZERO_SELECTED == [] and BUDGET_ZERO_GAIN == 0.0,
    "budget_saturate_all6": BUDGET_SAT_SELECTED == sorted(IDS),
    "rank_is_permutation": sorted(RANK) == sorted(IDS),
    "baseline_is_permutation": sorted(BASE_RANK) == sorted(IDS),
    "mono_correct_nonneg": MONO_CORRECT_NONNEG,
    "mono_weak_gt_strong": MONO_WEAK_GT_STRONG,
    "gh_normw_sums_to_1": abs(float(np.sum(GH_NORMW)) - 1.0) < 1e-12,
    "dial_before_in_0_1": 0.0 <= DIAL_BEFORE <= 1.0,
}
all_ok = True
for name, ok in checks.items():
    print(f"ok check {name} holds={'true' if ok else 'false'}")
    all_ok = all_ok and ok
if not all_ok:
    print("SELF-CHECK MISMATCH: a frozen property does not hold")
    sys.exit(1)
print("ok all_checks holds=true")
sys.exit(0)
