#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen-wave22-oracles.py — Wave 22 Elo item-difficulty REFERENCE ORACLE (stdlib-only, network-free).

reference oracle — the TS impl MUST match this; never regenerate these values from TS.

This script INDEPENDENTLY re-encodes (from the published spec, NOT by importing/shelling out to any
TS/JS) the online Elo/Rasch item-difficulty estimator that Wave 22 ships, and freezes properties
(a)–(f): the single-update grid (plain + guess-adjusted), the K schedule, fold determinism on a
fixed synthetic stream, order sensitivity, convergence direction, and the guess-adjustment / K-decay
directions.

Sources of the frozen model (this script reproduces their numbers; later tasks may NOT edit them):
  - specs/wave22-elo-difficulty.md          (Goal + Design + Deliverable 1 (a)–(f))
  - docs/research/BEYOND-CURRENT-RESEARCH-2026-07-13.md finding #2
      (Pelánek 2016 Elo-for-CAP; Prowise Learn uncertainty-adaptive K)

Oracle integrity: expected anchors come from the spec's model formulas themselves — never from the
TS impl (which does not exist yet). Run `python3 scripts/oracles/gen-wave22-oracles.py`; capture
stdout into tasks/wave22-01-python-oracle/PREVERIFY-OUTPUT.txt so the static evaluator reads a file,
never runs.
"""

import math
import sys

# ─────────────────────────────────────────────────────────────────────────────
# Pinned constants (DECIDED here; task 02 copies them verbatim into lib/constants.ts).
#   ELO_GUESS_MAX shares the numeric value of FSRS_GUESS_MAX; the TS side REUSES that
#   constant rather than redeclaring it.
# ─────────────────────────────────────────────────────────────────────────────
ELO_K_MAX = 0.4
ELO_K_HALFLIFE = 20
ELO_GUESS_MAX = 0.45
ELO_MIN_ITEM_ANSWERS = 200
INIT_BETA = 0.0
INIT_THETA = 0.0


# ─────────────────────────────────────────────────────────────────────────────
# The frozen model (spec §Design). Logit-space Rasch/Elo, guess-adjusted 3PL-lite.
# ─────────────────────────────────────────────────────────────────────────────
def sigmoid(x):
    return 1.0 / (1.0 + math.exp(-x))


def k_at(n):
    # Uncertainty-adaptive learning rate; n = pre-increment counter for THIS step.
    return ELO_K_MAX / (1.0 + n / ELO_K_HALFLIFE)


def guess_floor(option_count):
    return min(1.0 / option_count, ELO_GUESS_MAX)


def predict(theta, beta, g):
    # Guess-adjusted (3PL-lite) probability of a correct answer.
    return g + (1.0 - g) * sigmoid(theta - beta)


def predict_plain(theta, beta):
    return sigmoid(theta - beta)


def elo_update(theta, beta, n_user, n_item, y, g):
    """Single guess-adjusted update. Counters used are PRE-increment values.
    Returns (theta', beta', n_user+1, n_item+1)."""
    p = predict(theta, beta, g)
    e = y - p
    theta2 = theta + k_at(n_user) * e
    beta2 = beta - k_at(n_item) * e
    return theta2, beta2, n_user + 1, n_item + 1


def fold_elo_stream(answers):
    """Consume answers in the GIVEN order (server sorts answeredAt ASC, id ASC; the fold itself is
    order-as-given). answers: list of dicts {u, q, y, oc}.
    Returns (items: {qid: (beta, n)}, users: {uid: (theta, n)})."""
    items = {}
    users = {}
    for a in answers:
        uid, qid, y, oc = a["u"], a["q"], a["y"], a["oc"]
        theta, n_u = users.get(uid, (INIT_THETA, 0))
        beta, n_i = items.get(qid, (INIT_BETA, 0))
        g = guess_floor(oc)
        theta2, beta2, n_u2, n_i2 = elo_update(theta, beta, n_u, n_i, y, g)
        users[uid] = (theta2, n_u2)
        items[qid] = (beta2, n_i2)
    return items, users


# ─────────────────────────────────────────────────────────────────────────────
# Deterministic synthetic streams (no rng — built from arithmetic patterns).
# ─────────────────────────────────────────────────────────────────────────────
def stream_b_sorted():
    # 5 users × 8 items, one answer per (user, item); user-outer order (= "answeredAt sorted").
    out = []
    for u in range(5):
        for i in range(8):
            out.append({"u": "u%d" % u, "q": "q%d" % i,
                        "y": 1 if (u + i) % 2 == 0 else 0, "oc": 4})
    return out


def stream_b_shuffled():
    # SAME multiset, fixed permutation: the sorted stream REVERSED. Every (user,item,correct,oc)
    # tuple is identical to stream_b_sorted — only the fold order differs. A reversal genuinely
    # changes the RELATIVE order in which users hit each item (and items hit each user), so betas
    # move; an item-outer re-block would preserve both relative orders and leave betas invariant.
    return list(reversed(stream_b_sorted()))


def stream_converge():
    # Pump every user's θ up with correct warmups, THEN answer the hard item X wrong and the easy
    # item Y correct. X (only-wrong) ⇒ β above pool mean; Y (only-correct) ⇒ β below pool mean.
    warmups = ["w0", "w1", "w2"]
    out = []
    for u in range(5):
        for w in warmups:
            out.append({"u": "u%d" % u, "q": w, "y": 1, "oc": 4})
    for u in range(5):
        out.append({"u": "u%d" % u, "q": "X", "y": 0, "oc": 4})
    for u in range(5):
        out.append({"u": "u%d" % u, "q": "Y", "y": 1, "oc": 4})
    return out


def stream_single_item(option_count):
    # One item answered CORRECT once by each of 5 fresh users (θ=0 each).
    return [{"u": "u%d" % u, "q": "S", "y": 1, "oc": option_count} for u in range(5)]


# ─────────────────────────────────────────────────────────────────────────────
# Print / assert harness — emits "ok <label> ..." lines. Any violated property raises (stderr +
# non-zero exit), so a clean stdout with no "not ok"/"FAIL"/"MISMATCH" IS the pass evidence.
# ─────────────────────────────────────────────────────────────────────────────
_CHECKS = 0


def require(cond, msg):
    global _CHECKS
    _CHECKS += 1
    if not cond:
        raise AssertionError(msg)


def f6(x):
    return "{:.6f}".format(x)


def section(title):
    print("")
    print("# " + title)


def main():
    print("static evidence — read, do not run")
    print("wave22 Elo item-difficulty reference oracle — stdlib-only, network-free")
    print("model source: specs/wave22-elo-difficulty.md (Goal + Design + Deliverable 1)")
    print("reference oracle — the TS impl MUST match this; never regenerate these values from TS.")
    print("constants: ELO_K_MAX={} ELO_K_HALFLIFE={} ELO_GUESS_MAX={} ELO_MIN_ITEM_ANSWERS={} "
          "initBeta={} initTheta={}".format(ELO_K_MAX, ELO_K_HALFLIFE, ELO_GUESS_MAX,
                                            ELO_MIN_ITEM_ANSWERS, INIT_BETA, INIT_THETA))

    # ─────────────────────────────────────────────────────────────────────────
    section("(a″) K schedule points — K(n) = ELO_K_MAX / (1 + n/ELO_K_HALFLIFE)")
    k0, k10, k200 = k_at(0), k_at(10), k_at(200)
    require(k0 > k10 > k200, "K schedule must be strictly decreasing")
    print("ok k_schedule K(0)={} K(10)={} K(200)={} decreasing={}".format(
        f6(k0), f6(k10), f6(k200), "true" if k0 > k10 > k200 else "false"))

    # ─────────────────────────────────────────────────────────────────────────
    section("(a′) plain-vs-guess single update — theta=0 beta=0 y=1 K=K(0)=0.4")
    # plain: P_plain=0.5 -> e=0.5 -> beta'=-0.2, theta'=+0.2
    p_plain = predict_plain(0.0, 0.0)
    e_plain = 1 - p_plain
    beta_plain = 0.0 - k_at(0) * e_plain
    theta_plain = 0.0 + k_at(0) * e_plain
    # guess g=0.2: P=0.6 -> e=0.4 -> beta'=-0.16, theta'=+0.16
    g020 = 0.2
    p_g = predict(0.0, 0.0, g020)
    e_g = 1 - p_g
    beta_g020 = 0.0 - k_at(0) * e_g
    theta_g020 = 0.0 + k_at(0) * e_g
    require(f6(beta_plain) == "-0.200000" and f6(theta_plain) == "0.200000", "plain update mismatch")
    require(f6(beta_g020) == "-0.160000" and f6(theta_g020) == "0.160000", "guess update mismatch")
    print("ok a_prime beta_plain={} theta_plain={} beta_g020={} theta_g020={}".format(
        f6(beta_plain), f6(theta_plain), f6(beta_g020), f6(theta_g020)))

    # ─────────────────────────────────────────────────────────────────────────
    section("(a) single-update grid, guess-adjusted — theta,beta in {-1,0,1}, y in {0,1}, "
            "g in {0.20,0.45}, K at n in {0,10,200}  (3*3*2*2*3 = 108 lines)")
    grid = 0
    for th in (-1, 0, 1):
        for be in (-1, 0, 1):
            for y in (0, 1):
                for g in (0.20, 0.45):
                    for n in (0, 10, 200):
                        p = predict(th, be, g)
                        e = y - p
                        beta2 = be - k_at(n) * e
                        theta2 = th + k_at(n) * e
                        print("ok upd_g th={}_be={}_y={}_g{:.2f}_n{} beta={} theta={}".format(
                            th, be, y, g, n, f6(beta2), f6(theta2)))
                        grid += 1
    require(grid == 108, "grid must be exactly 108 lines, got %d" % grid)
    print("# grid lines emitted: {}".format(grid))

    # ─────────────────────────────────────────────────────────────────────────
    section("(b) fold determinism — fixed 40-answer stream (5 users × 8 items) folded once")
    items_b, users_b = fold_elo_stream(stream_b_sorted())
    require(sum(n for _, n in items_b.values()) == 40, "item counters must total 40")
    require(sum(n for _, n in users_b.values()) == 40, "user counters must total 40")
    for qid in sorted(items_b):
        beta, n = items_b[qid]
        print("ok fold_item {} beta={} n={}".format(qid, f6(beta), n))
    for uid in sorted(users_b):
        theta, n = users_b[uid]
        print("ok fold_user {} theta={} n={}".format(uid, f6(theta), n))

    # ─────────────────────────────────────────────────────────────────────────
    section("(c) order sensitivity — SAME multiset, fixed shuffle -> different final beta")
    items_s, _ = fold_elo_stream(stream_b_shuffled())
    diff_qid = None
    for qid in sorted(items_b):
        if abs(items_b[qid][0] - items_s[qid][0]) > 1e-6:
            diff_qid = qid
            break
    require(diff_qid is not None, "shuffle must change at least one item's beta")
    b_sorted = items_b[diff_qid][0]
    b_shuf = items_s[diff_qid][0]
    require(abs(b_sorted - b_shuf) > 1e-6, "order sensitivity: beta must differ > 1e-6")
    print("ok order_sensitive differs={} item={} beta_sorted={} beta_shuffled={}".format(
        "true" if abs(b_sorted - b_shuf) > 1e-6 else "false", diff_qid, f6(b_sorted), f6(b_shuf)))

    # ─────────────────────────────────────────────────────────────────────────
    section("(d) convergence direction — hard item X above pool mean; easy item Y below")
    items_c, _ = fold_elo_stream(stream_converge())
    mean_beta = sum(b for b, _ in items_c.values()) / len(items_c)
    beta_x = items_c["X"][0]
    beta_y = items_c["Y"][0]
    require(beta_x > mean_beta, "hard item X must end above pool mean beta")
    require(beta_y < mean_beta, "easy item Y must end below pool mean beta")
    print("ok converge_hard beta_X={} mean={} gt={}".format(
        f6(beta_x), f6(mean_beta), "true" if beta_x > mean_beta else "false"))
    print("ok converge_easy beta_Y={} mean={} lt={}".format(
        f6(beta_y), f6(mean_beta), "true" if beta_y < mean_beta else "false"))

    # ─────────────────────────────────────────────────────────────────────────
    section("(e) guess-adjustment direction — identical CORRECT streams, 2-option vs 5-option")
    # g(2)=min(0.5,0.45)=0.45 (higher P -> smaller e) vs g(5)=0.2. beta moves LESS for 2-option.
    items_2, _ = fold_elo_stream(stream_single_item(2))
    items_5, _ = fold_elo_stream(stream_single_item(5))
    delta2 = items_2["S"][0] - INIT_BETA
    delta5 = items_5["S"][0] - INIT_BETA
    require(abs(delta2) < abs(delta5), "2-option correct must move beta LESS than 5-option")
    print("ok guess_weakens delta2={} delta5={} lt={}".format(
        f6(delta2), f6(delta5), "true" if abs(delta2) < abs(delta5) else "false"))

    # ─────────────────────────────────────────────────────────────────────────
    section("(f) K decay — first three |Δβ| for one repeatedly-answered item, monotone non-increasing")
    beta, n_i = INIT_BETA, 0
    deltas = []
    for u in range(5):
        theta = INIT_THETA  # fresh user each answer, all correct
        g = guess_floor(5)
        p = predict(theta, beta, g)
        e = 1 - p
        beta_new = beta - k_at(n_i) * e
        deltas.append(abs(beta_new - beta))
        beta, n_i = beta_new, n_i + 1
    d0, d1, d2 = deltas[0], deltas[1], deltas[2]
    require(d0 >= d1 >= d2, "K decay: first three |Δβ| must be monotone non-increasing")
    print("ok k_decay monotone={} deltas={},{},{}".format(
        "true" if d0 >= d1 >= d2 else "false", f6(d0), f6(d1), f6(d2)))

    # ─────────────────────────────────────────────────────────────────────────
    section("SUMMARY")
    print("checks asserted: {}".format(_CHECKS))
    print("RESULT: ALL {} PROPERTY CHECKS PASSED".format(_CHECKS))


if __name__ == "__main__":
    main()
