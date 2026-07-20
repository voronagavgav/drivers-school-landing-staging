#!/usr/bin/env python3
# FSRS-6 retrievability (forgetting curve) reimplemented in PURE Python from the
# FSRS-6 math, for the holdout evaluator (wave24-04). This module is imported by
# the evaluator; it never imports or shells out to the TS/JS engine (stdlib `math`
# only), so it carries no extra pins.
#
# Formula (FSRS-6, decay weight w20):
#   R(t, S; w20) = (1 + FACTOR * t / S) ** (-w20)
#   FACTOR       = 0.9 ** (1 / (-w20)) - 1  ==  0.9 ** (-1 / w20) - 1
#   t = elapsedDays >= 0,  S = stability > 0.
# Because DECAY = -w20 and FACTOR share w20, R == 0.9 EXACTLY at t == S, and
# R == 1 at t == 0 (or when there is no prior review) — both by construction.
#
# The frozen fixtures/retrievability-grid.json is frozen from the trusted TS
# `retrievability` (which is itself oracle-verified vs py-fsrs 6.3.1); this file is
# the independent Python re-derivation cross-checked against it (never the reverse).
import json
import math
import sys


def retrievability(t, S, w20):
    """FSRS-6 recall probability at elapsed t (days) under stability S and decay w20."""
    if t <= 0:
        return 1.0
    if not (S > 0):
        return 0.0
    decay = -w20
    factor = math.pow(0.9, 1.0 / decay) - 1.0  # = 0.9 ** (-1 / w20) - 1
    r = math.pow(1.0 + factor * (t / S), decay)
    return min(1.0, max(0.0, r))


# Grid stability values (mirrors the TS emitter + the frozen fixture).
GRID_STABILITIES = [1, 10, 50, 100, 365]
# w20 grid for the anchors: the shipped default plus two off-defaults, proving the
# construction anchors hold for ANY w20 (the evaluator scores fitted vectors too).
ANCHOR_W20 = [0.1542, 0.12, 0.20]
DEFAULT_W20 = 0.1542


def self_check():
    """Assert the two EXACT construction anchors across S and w20 to <= 1e-9."""
    max0 = 0.0
    maxS = 0.0
    for w20 in ANCHOR_W20:
        for S in GRID_STABILITIES:
            max0 = max(max0, abs(retrievability(0, S, w20) - 1.0))
            maxS = max(maxS, abs(retrievability(S, S, w20) - 0.9))
    assert max0 <= 1e-9, f"anchor elapsed0 exceeded tolerance: {max0}"
    assert maxS <= 1e-9, f"anchor elapsedS exceeded tolerance: {maxS}"
    print(f"ok anchor elapsed0 R=1 maxabsdiff={max0}")
    print(f"ok anchor elapsedS R=0.9 maxabsdiff={maxS}")


def crosscheck(grid_path):
    """Evaluate the Python formula on the TS-frozen grid (w20=0.1542) and compare."""
    with open(grid_path) as fh:
        grid = json.load(fh)
    m = 0.0
    for x in grid:
        pred = retrievability(x["elapsedDays"], x["stability"], DEFAULT_W20)
        m = max(m, abs(pred - x["r"]))
    print(f"ok crosscheck maxabsdiff={m}")
    assert m < 1e-6, f"crosscheck exceeded tolerance: {m}"


def main(argv):
    if "--self-check" in argv:
        self_check()
        return 0
    if "--crosscheck" in argv:
        i = argv.index("--crosscheck")
        rest = argv[i + 1:]
        if not rest:
            print("usage: predict.py --crosscheck <grid.json>", file=sys.stderr)
            return 2
        crosscheck(rest[0])  # any further args (e.g. the TS emitter path) are ignored
        return 0
    print("usage: predict.py [--self-check | --crosscheck <grid.json>]", file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
