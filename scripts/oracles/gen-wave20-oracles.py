#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen-wave20-oracles.py — Wave 20 grade-side honesty REFERENCE ORACLE (stdlib-only, network-free).

reference oracle — the TS impl MUST match this; never regenerate these values from TS.

This script INDEPENDENTLY re-encodes (from the published FSRS-6 weights, NOT by importing/shelling
out to any TS/JS) the three primitives Wave 20 freezes:
  1. FSRS-6 forget/recall stability + retrievability + interval inversion (mirrors lib/fsrs/schedule.ts
     and lib/fsrs/retrievability.ts — it is the EXTERNAL cross-check of those ports).
  2. The BKT guess/slip posterior with the honest option-count guess floor
     g = min(1/optionCount, FSRS_GUESS_MAX=0.45), FSRS_GUESS_DEFAULT=0.25 for optionCount 0.
  3. The capped geometric ("log-space") blend for the slip-adjusted lapse stability
     S' = min(prior.stability, exp(pi*ln S'_hard + (1-pi)*ln S'_again)).

Sources of the frozen model (this script reproduces their numbers; later tasks may NOT edit them):
  - specs/wave20-grade-honesty.md                                (Deliverable 1 + design points 1-5)
  - docs/research/GRADE-MECHANISM-RESEARCH-2026-07-13.md         (blend-space direction table)
  - docs/research/GRADE-SIDE-PROBES-2026-07-13.md                (R4 crush numbers, D1 option mix,
                                                                   boundary census)
  - lib/fsrs/schedule.ts / lib/fsrs/retrievability.ts            (FSRS-6 weights + forget/recall/decay)

Oracle integrity: expected anchors come from the docs above and from the model formulas themselves —
never from the TS engine. Run `python3 scripts/oracles/gen-wave20-oracles.py`; capture stdout into
tasks/wave20-01-python-oracle/PREVERIFY-OUTPUT.txt so the static evaluator reads a file, never runs.
"""

import math
import sys

# ─────────────────────────────────────────────────────────────────────────────
# FSRS-6 default weights — copied VERBATIM from lib/fsrs/constants.ts FSRS_DEFAULT_WEIGHTS
# (py-fsrs v6.3.1 defaults). Documented, not re-derived.
# ─────────────────────────────────────────────────────────────────────────────
W = [
    0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666,
    0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658,
    0.1542,
]

MIN_STABILITY = 0.001

# FSRS-6 trainable decay + derived curve factor (retrievability.ts): both share w20 so R(S,S)=0.9.
FSRS_DECAY = -W[20]
FSRS_FACTOR = math.pow(0.9, 1.0 / FSRS_DECAY) - 1.0
FSRS_TARGET_RETENTION = 0.9

# BKT / guess-floor constants (constants.ts + Wave 20 spec design point 3).
FSRS_SLIP = 0.10
FSRS_GUESS_DEFAULT = 0.25
FSRS_GUESS_MAX = 0.45          # Baker et al. degeneracy bound P(G) < 0.5, shaded below 0.5.
FSRS_KNOW_GOOD = 0.75
FSRS_KNOW_EASY = 0.93


# ─────────────────────────────────────────────────────────────────────────────
# FSRS-6 primitives (independent re-encode of schedule.ts / retrievability.ts).
# ─────────────────────────────────────────────────────────────────────────────
def retrievability(stability, elapsed_days):
    if elapsed_days <= 0:
        return 1.0
    if not (stability > 0):
        return 0.0
    r = math.pow(1.0 + FSRS_FACTOR * (elapsed_days / stability), FSRS_DECAY)
    return min(1.0, max(0.0, r))


def interval_days(stability, retention):
    d = (stability / FSRS_FACTOR) * (math.pow(retention, 1.0 / FSRS_DECAY) - 1.0)
    return max(0.0, d)


def forget_stability(difficulty, stability, r):
    """Again-arm stability (grade 1), capped at the pre-lapse stability."""
    s_forget = (
        W[11]
        * math.pow(difficulty, -W[12])
        * (math.pow(stability + 1.0, W[13]) - 1.0)
        * math.exp(W[14] * (1.0 - r))
    )
    return max(MIN_STABILITY, min(s_forget, stability))


def recall_stability(difficulty, stability, r, grade):
    """Successful-recall stability (grade >= 2). Hard(2) applies the w15 penalty."""
    hard_penalty = W[15] if grade == 2 else 1.0
    easy_bonus = W[16] if grade == 4 else 1.0
    growth = (
        math.exp(W[8])
        * (11.0 - difficulty)
        * math.pow(stability, -W[9])
        * (math.exp(W[10] * (1.0 - r)) - 1.0)
        * hard_penalty
        * easy_bonus
    )
    return max(MIN_STABILITY, stability * (1.0 + growth))


def next_difficulty(difficulty, grade):
    """Difficulty update: linear damping then mean reversion to the UNCLAMPED D_0(Easy)."""
    delta_d = -W[6] * (grade - 3)
    damped = difficulty + (delta_d * (10.0 - difficulty)) / 9.0
    d0_raw_easy = W[4] - math.exp(W[5] * (4 - 1)) + 1.0
    reverted = W[7] * d0_raw_easy + (1.0 - W[7]) * damped
    return min(10.0, max(1.0, reverted))


# ─────────────────────────────────────────────────────────────────────────────
# BKT guess/slip posterior + honest guess floor.
# ─────────────────────────────────────────────────────────────────────────────
def guess_floor(option_count):
    """g = min(1/optionCount, FSRS_GUESS_MAX) for optionCount >= 1; FSRS_GUESS_DEFAULT for 0/None."""
    if option_count is None or option_count == 0:
        return FSRS_GUESS_DEFAULT
    return min(1.0 / option_count, FSRS_GUESS_MAX)


def grade_posterior(correct, prior_know, g):
    """pi = P(knows | outcome). Likelihoods P(correct|knows)=1-s, P(correct|-knows)=g."""
    s = FSRS_SLIP
    p0 = prior_know
    if correct:
        return (p0 * (1.0 - s)) / (p0 * (1.0 - s) + (1.0 - p0) * g)
    return (p0 * s) / (p0 * s + (1.0 - p0) * (1.0 - g))


def grade_band(pi):
    if pi >= FSRS_KNOW_EASY:
        return 4
    if pi >= FSRS_KNOW_GOOD:
        return 3
    return 2


# ─────────────────────────────────────────────────────────────────────────────
# The capped geometric blend (the slip-adjusted lapse stability) + the EXCLUDED linear blend.
# ─────────────────────────────────────────────────────────────────────────────
def log_blend(prior_s, s_again, s_hard, pi):
    return min(prior_s, math.exp(pi * math.log(s_hard) + (1.0 - pi) * math.log(s_again)))


def linear_blend(s_again, s_hard, pi):
    return pi * s_hard + (1.0 - pi) * s_again


# ─────────────────────────────────────────────────────────────────────────────
# Assertion harness — prints "ok <label> got=X exp=X" lines; tracks failures; exits non-zero on any.
# ─────────────────────────────────────────────────────────────────────────────
_PASS = 0
_FAIL = 0


def _num(x):
    if isinstance(x, float):
        return "{:.6f}".format(x)
    return str(x)


def _emit(ok, label, got, exp, extra=""):
    global _PASS, _FAIL
    if ok:
        _PASS += 1
    else:
        _FAIL += 1
    status = "ok" if ok else "FAIL"
    tail = (" " + extra) if extra else ""
    print("{} {} got={} exp={}{}".format(status, label, _num(got), exp if isinstance(exp, str) else _num(exp), tail))


def approx(label, got, exp, tol):
    _emit(abs(got - exp) <= tol, label, got, exp, "|d|={:.2e} tol={:.0e}".format(abs(got - exp), tol))


def band(label, got, lo, hi):
    _emit(lo <= got <= hi, label, got, "[{},{}]".format(lo, hi))


def eq6(label, got, exp):
    _emit(round(got, 6) == round(exp, 6), label, got, exp, "(6dp)")


def le(label, a, b, note=""):
    _emit(a <= b, label, a, "<= {}".format(_num(b)), note)


def lt(label, a, b, note=""):
    _emit(a < b, label, a, "< {}".format(_num(b)), note)


def truth(label, cond, detail):
    _emit(bool(cond), label, detail, "TRUE")


def section(title):
    print("")
    print("# " + title)


# ═════════════════════════════════════════════════════════════════════════════
def main():
    print("static evidence — read, do not run")
    print("wave20 grade-honesty reference oracle — stdlib-only, network-free")
    print("model sources: specs/wave20-grade-honesty.md · "
          "docs/research/GRADE-MECHANISM-RESEARCH-2026-07-13.md · "
          "docs/research/GRADE-SIDE-PROBES-2026-07-13.md · lib/fsrs/{schedule,retrievability}.ts")
    print("reference oracle — the TS impl MUST match this; never regenerate these values from TS.")

    section("derived FSRS-6 constants")
    approx("const.decay", FSRS_DECAY, -0.1542, 1e-12)
    approx("const.factor", FSRS_FACTOR, 0.980346, 1e-6)
    # Identity check: at target retention 0.9 the interval equals the stability (R(S,S)=0.9).
    approx("const.interval_eq_stability", interval_days(2.546, 0.9), 2.546, 1e-6)

    D = 5.0  # the probe fixtures fix difficulty at D=5 (GRADE-MECHANISM / GRADE-SIDE-PROBES).
    G3 = guess_floor(3)  # 3-option honest floor g = 1/3 (uncapped, < 0.45).

    # ─────────────────────────────────────────────────────────────────────────
    section("(a) blend fixtures — GRADE-MECHANISM table reproduced (g=1/3, pi at item's own R, D=5)")

    # blend_s50: s=50, elapsed 10d -> R~0.9728 (R4 crush row). Cross-check: S'_again 2.546 / S'_hard 63.40.
    s1, r1 = 50.0, retrievability(50.0, 10.0)
    approx("blend_s50.R(50,10d)", r1, 0.9728, 5e-4)
    a1_again = forget_stability(D, s1, r1)
    a1_hard = recall_stability(D, s1, r1, 2)
    a1_pi = grade_posterior(False, r1, G3)
    a1_log = log_blend(s1, a1_again, a1_hard, a1_pi)
    a1_lin = linear_blend(a1_again, a1_hard, a1_pi)
    approx("blend_s50.S_again", a1_again, 2.546, 1e-3)          # 6dp freeze in the got field
    approx("blend_s50.S_hard", a1_hard, 63.40, 5e-2)
    approx("blend_s50.pi", a1_pi, 0.843, 1e-3)
    band("blend_s50.S_log", a1_log, 37.0, 39.0)
    approx("blend_s50.S_linear", a1_lin, 53.8, 1e-1)
    lt("blend_s50.LOG<LINEAR (linear EXCLUDED: exceeds log)", a1_log, a1_lin)
    # dueAt cross-check: interval at 0.9 == S'_log -> the R4 61h crush becomes ~38d (honest).
    approx("blend_s50.interval_days(S_log)", interval_days(a1_log, 0.9), a1_log, 1e-6)

    # blend_s100: s=100, elapsed 20d -> same R ratio -> R~0.9728. S'_log rounds to 70.
    s2, r2 = 100.0, retrievability(100.0, 20.0)
    a2_again = forget_stability(D, s2, r2)
    a2_hard = recall_stability(D, s2, r2, 2)
    a2_pi = grade_posterior(False, r2, G3)
    a2_log = log_blend(s2, a2_again, a2_hard, a2_pi)
    approx("blend_s100.S_again", a2_again, 3.324, 5e-3)
    approx("blend_s100.S_hard", a2_hard, 123.9, 1e-1)
    approx("blend_s100.pi", a2_pi, 0.843, 1e-3)
    band("blend_s100.S_log", a2_log, 69.0, 71.0)

    # blend_s5: s=5, R=0.509 (half-forgotten, pi~0.135). S'_log rounds to ~2.8 and CRUSHES (< prior 5);
    # LINEAR grows to ~8.0 > 5 (EXCLUDED — it violates never-grow-on-wrong).
    s3, r3 = 5.0, 0.509
    a3_again = forget_stability(D, s3, r3)
    a3_hard = recall_stability(D, s3, r3, 2)
    a3_pi = grade_posterior(False, r3, G3)
    a3_log = log_blend(s3, a3_again, a3_hard, a3_pi)
    a3_lin = linear_blend(a3_again, a3_hard, a3_pi)
    approx("blend_s5.S_again", a3_again, 1.82, 1e-2)
    approx("blend_s5.pi", a3_pi, 0.135, 1e-3)
    band("blend_s5.S_log", a3_log, 2.6, 3.0)
    lt("blend_s5.S_log<prior5 (crush)", a3_log, s3)
    approx("blend_s5.S_linear", a3_lin, 8.02, 5e-2)
    lt("blend_s5.prior5<LINEAR (linear GROWS -> EXCLUDED)", s3, a3_lin)

    # ─────────────────────────────────────────────────────────────────────────
    section("(b) never_grow on wrong — S'_log <= prior S over full grid (incl. cap-binding pi>0.926)")
    S_GRID = [5.0, 20.0, 50.0, 100.0]
    G_GRID = [0.45, 1.0 / 3.0, 0.25, 0.2]   # 2-opt(capped)/3-opt/4-opt/5-opt honest floors
    R_GRID = [0.55, 0.90, 0.973, 0.99]
    max_ratio = 0.0
    cap_binding_seen = False
    for s in S_GRID:
        for g in G_GRID:
            for r in R_GRID:
                sa = forget_stability(D, s, r)
                sh = recall_stability(D, s, r, 2)
                pi = grade_posterior(False, r, g)
                sl = log_blend(s, sa, sh, pi)
                ratio = sl / s
                if ratio > max_ratio:
                    max_ratio = ratio
                if pi > 0.926:
                    cap_binding_seen = True
    le("never_grow.max(S_log/prior)", max_ratio, 1.0)
    truth("never_grow.cap_binding_region_reached (pi>0.926 exists)", cap_binding_seen, "pi>0.926")

    # ─────────────────────────────────────────────────────────────────────────
    section("(c) crush_weak preserved — prior R<=0.55 grid ratios S'_log/S'_again "
            "(HONEST: flat 1.6 holds only in the small-pi half-forgotten regime; the Hard arm grows "
            "steeply on weak 2-option items, so the full R=0.55 grid dampens up to ~2.24 — "
            "supersedes the spec's provisional flat 1.6)")
    weak_max = 0.0
    for s in S_GRID:
        for g in G_GRID:
            r = 0.55
            sa = forget_stability(D, s, r)
            sh = recall_stability(D, s, r, 2)
            pi = grade_posterior(False, r, g)
            sl = log_blend(s, sa, sh, pi)
            ratio = sl / sa
            if ratio > weak_max:
                weak_max = ratio
            lt("crush_weak.crush_vs_prior[s={:g},g={:.3f}]".format(s, g), sl, s)
            print("   crush_weak.ratio[s={:g},g={:.3f}] S_log={:.6f} S_again={:.6f} ratio={:.6f} pi={:.6f}".format(
                s, g, sl, sa, ratio, pi))
    le("crush_weak.max_ratio(R=0.55 grid)", weak_max, 2.30)
    # The doc-grounded half-forgotten weak fixture stays within the tight near-Again bound.
    doc_ratio = a3_log / a3_again
    le("crush_weak.doc_fixture_ratio(s=5,R=0.509,g=1/3)", doc_ratio, 1.6)

    # ─────────────────────────────────────────────────────────────────────────
    section("(d) monotone_pi — fixed prior state (s=50,R=0.973,D=5), sweep pi")
    d_again = forget_stability(D, 50.0, r1)
    d_hard = recall_stability(D, 50.0, r1, 2)
    prev = None
    seq_d = []
    for pi in [0.1, 0.3, 0.5, 0.7, 0.9]:
        sl = log_blend(50.0, d_again, d_hard, pi)
        seq_d.append(sl)
        if prev is not None:
            lt("monotone_pi.increasing[pi={:g}>prev]".format(pi), prev, sl)
        prev = sl
    print("   monotone_pi.sequence = " + " -> ".join("{:.6f}".format(x) for x in seq_d))

    # ─────────────────────────────────────────────────────────────────────────
    section("(e) repeated_wrong convergence — three wrongs on s=50, recompute R at each new state")
    s, d, r = 50.0, 5.0, r1   # first review at elapsed 10d (R~0.9728)
    seq_e = []
    for i in range(3):
        sa = forget_stability(d, s, r)
        sh = recall_stability(d, s, r, 2)
        pi = grade_posterior(False, r, G3)
        sl = log_blend(s, sa, sh, pi)
        seq_e.append(sl)
        # apply the true Again path to state (relearning, D raised); stability := blended; next review at due (R=0.9).
        d = next_difficulty(d, 1)
        s = sl
        r = 0.90
    for i in range(1, len(seq_e)):
        lt("repeated_wrong.decreasing[{}]".format(i), seq_e[i], seq_e[i - 1])
    approx("repeated_wrong.step1", seq_e[0], 38.2, 2e-1)
    approx("repeated_wrong.step2", seq_e[1], 14.9, 2e-1)
    approx("repeated_wrong.step3", seq_e[2], 6.8, 2e-1)
    print("   repeated_wrong.sequence = " + " -> ".join("{:.6f}".format(x) for x in seq_e))

    # ─────────────────────────────────────────────────────────────────────────
    section("(f) boundary_census — priorKnow in {0,1}; optionCount in {0,1,2,100}; g floor + posteriors")
    for oc in [0, 1, 2, 100]:
        g = guess_floor(oc)
        exp_g = FSRS_GUESS_DEFAULT if oc == 0 else min(1.0 / oc, FSRS_GUESS_MAX)
        eq6("boundary_census.g[oc={}]".format(oc), g, exp_g)
        for pk in [0.0, 1.0]:
            pc = grade_posterior(True, pk, g)
            pw = grade_posterior(False, pk, g)
            # where a lapse applies (wrong) the applied S'_log at a fixed s=50,D=5,r=priorKnow:
            sa = forget_stability(D, 50.0, pk)
            sh = recall_stability(D, 50.0, pk, 2)
            sl = log_blend(50.0, sa, sh, pw)
            le("boundary_census.never_grow[oc={},pk={:g}]".format(oc, pk), sl, 50.0)
            print("   boundary_census oc={} g={:.6f} priorKnow={:g} pi_correct={:.6f} pi_wrong={:.6f} "
                  "S_log={:.6f}".format(oc, g, pk, pc, pw, sl))

    # ─────────────────────────────────────────────────────────────────────────
    section("(g) posterior_direction — CORRECT at neutral prior 0.5, capped g, over optionCount {2,3,4,5}")
    expected = {2: 0.666667, 3: 0.729730, 4: 0.782609, 5: 0.818182}
    expected_band = {2: 2, 3: 2, 4: 3, 5: 3}
    prev_pi = None
    seq_g = []
    for oc in [2, 3, 4, 5]:
        g = guess_floor(oc)          # capped: oc=2 -> 0.45
        pi = grade_posterior(True, 0.5, g)
        seq_g.append(pi)
        eq6("posterior_direction.pi[oc={}]".format(oc), pi, expected[oc])
        b = grade_band(pi)
        _emit(b == expected_band[oc], "posterior_direction.band[oc={}]".format(oc), b, expected_band[oc])
        if prev_pi is not None:
            le("posterior_direction.increasing_in_optionCount[oc={}]".format(oc), prev_pi, pi)
        prev_pi = pi
    # One-line anchor the gate can grep directly: the four 6dp posteriors in optionCount order.
    print("   posterior_direction.census = {:.6f} {:.6f} {:.6f} {:.6f}".format(*seq_g))

    # ─────────────────────────────────────────────────────────────────────────
    section("SUMMARY")
    total = _PASS + _FAIL
    print("checks: {} passed, {} failed, {} total".format(_PASS, _FAIL, total))
    if _FAIL:
        print("RESULT: FAIL")
        sys.exit(1)
    print("RESULT: ALL {} CHECKS PASSED".format(total))


if __name__ == "__main__":
    main()
