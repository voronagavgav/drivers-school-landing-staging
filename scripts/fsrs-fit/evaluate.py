#!/usr/bin/env python3
# The HOLDOUT EVALUATOR (wave24-04). Per-card chronological split (train on the
# first ~80% of each card's reviews, evaluate on the last ~20%); reports log-loss
# + calibration RMSE(bins) of predicted-R-at-review vs observed recall, for BOTH
# a default weight vector and a fitted one.
#
# EXTERNAL CANON, delegated wholesale:
#   - the FSRS state evolution (stability/difficulty update loop) is the py-fsrs
#     `Scheduler` (`from fsrs import Scheduler`) — never reimplemented here; we
#     only READ the replayed card's `stability`/`last_review` between reviews.
#   - the retrievability -> probability curve is the wave24-02 `predict` module
#     (`import predict`), already oracle-cross-checked vs the TS engine; its w20
#     comes from W[20] of whichever weight vector is under evaluation.
# ONLY the loss/calibration arithmetic + the retrievability call are ours.
#
# Scheduler config = shipped long-term engine semantics: short-term learning
# steps disabled (empty `learning_steps`/`relearning_steps`) and fuzzing off, so
# the replayed state matches wave19a/wave24-03.
#
# CSV input schema (matches the wave24-05 export):
#   header: card_id,review_time,review_rating
#   review_time  = epoch milliseconds OR ISO-8601 (auto-detected); ascending per card
#   review_rating in {1,2,3,4} = Again/Hard/Good/Easy; recalled == rating >= 2
#     (matches lib/server/calibration.ts `correct = grade >= 2`).
#
# Usage:
#   evaluate.py --self-check
#   evaluate.py --in <csv> --out <json> [--weights <fitted.json>]
import argparse
import csv
import json
import math
import sys
from datetime import datetime, timezone

from fsrs import Card, Rating, Scheduler

import predict

# Fraction of each card's reviews held out for the test split (the LAST reviews,
# chronologically). At least 1 test review per card, and at least 1 train review
# kept so every test review has a prior memory state to predict from.
TEST_FRACTION = 0.2
# Clamp for log-loss (avoids ln(0)); mirrors the metric-math anchors in the journal.
EPS = 1e-15


def _parse_review_time(raw):
    """epoch-ms integer OR ISO-8601 string -> tz-aware UTC datetime."""
    raw = raw.strip()
    if raw.lstrip("-").isdigit():
        return datetime.fromtimestamp(int(raw) / 1000.0, tz=timezone.utc)
    dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def load_reviews(csv_path):
    """CSV -> {card_id: [(datetime, Rating), ...ascending]}."""
    by_card = {}
    with open(csv_path, newline="") as fh:
        reader = csv.DictReader(fh)
        required = {"card_id", "review_time", "review_rating"}
        if reader.fieldnames is None or not required.issubset(reader.fieldnames):
            print(
                f"error: CSV must have header {sorted(required)}; got {reader.fieldnames}",
                file=sys.stderr,
            )
            sys.exit(2)
        for row in reader:
            card_id = int(row["card_id"])
            when = _parse_review_time(row["review_time"])
            rating = Rating(int(row["review_rating"]))
            by_card.setdefault(card_id, []).append((when, rating))
    for card_id in by_card:
        by_card[card_id].sort(key=lambda x: x[0])
    return by_card


def split_test_count(n):
    """Number of held-out (last) reviews for a card with n reviews, chronological.

    round(TEST_FRACTION * n), clamped to [1, n-1] so there is always at least one
    train review (a prior state to predict from) and at least one test review.
    Cards with n < 2 contribute no test reviews (no prior state possible).
    """
    if n < 2:
        return 0
    return min(n - 1, max(1, round(TEST_FRACTION * n)))


def build_scheduler(parameters):
    """py-fsrs Scheduler with shipped long-term config (no short-term steps, no fuzz)."""
    return Scheduler(
        parameters=parameters,
        learning_steps=(),
        relearning_steps=(),
        enable_fuzzing=False,
    )


def collect_predictions(by_card, parameters):
    """Replay each card under `parameters`; predict R at each held-out test review.

    Returns (preds, labels, n_train, n_test). The FSRS state evolution is the
    py-fsrs Scheduler; only the retrievability read + label are ours.
    """
    w20 = parameters[20]
    preds = []
    labels = []
    n_train = 0
    n_test = 0
    for card_id in sorted(by_card):
        reviews = by_card[card_id]
        n = len(reviews)
        n_te = split_test_count(n)
        test_start = n - n_te  # first index that is held out
        scheduler = build_scheduler(parameters)
        card = Card(card_id=card_id)
        for i, (when, rating) in enumerate(reviews):
            if i >= test_start:
                # State immediately BEFORE this review (from all prior reviews).
                elapsed_days = (when - card.last_review).total_seconds() / 86400.0
                p = predict.retrievability(elapsed_days, card.stability, w20)
                preds.append(p)
                labels.append(1 if int(rating) >= 2 else 0)
                n_test += 1
            else:
                n_train += 1
            card, _ = scheduler.review_card(card, rating, review_datetime=when)
    return preds, labels, n_train, n_test


def logloss(preds, labels):
    """-mean( y*ln(p) + (1-y)*ln(1-p) ), p clamped to [EPS, 1-EPS]."""
    if not preds:
        return float("nan")
    total = 0.0
    for p, y in zip(preds, labels):
        p = min(1.0 - EPS, max(EPS, p))
        total += y * math.log(p) + (1 - y) * math.log(1.0 - p)
    return -total / len(preds)


def rmse_bins(preds, labels, n_bins=10):
    """Calibration RMSE over equal-width p-bins in [0,1].

    Per non-empty bin: gap = |mean(p) - mean(y)|; RMSE = sqrt(mean of gap^2).
    """
    if not preds:
        return float("nan")
    sum_p = [0.0] * n_bins
    sum_y = [0.0] * n_bins
    count = [0] * n_bins
    for p, y in zip(preds, labels):
        b = min(n_bins - 1, int(p * n_bins))
        if b < 0:
            b = 0
        sum_p[b] += p
        sum_y[b] += y
        count[b] += 1
    sq = 0.0
    nonempty = 0
    for b in range(n_bins):
        if count[b] == 0:
            continue
        gap = abs(sum_p[b] / count[b] - sum_y[b] / count[b])
        sq += gap * gap
        nonempty += 1
    if nonempty == 0:
        return float("nan")
    return math.sqrt(sq / nonempty)


def evaluate_vector(by_card, parameters):
    preds, labels, n_train, n_test = collect_predictions(by_card, parameters)
    return {
        "logloss": logloss(preds, labels),
        "rmse_bins": rmse_bins(preds, labels),
        "n_train": n_train,
        "n_test": n_test,
    }


# Default FSRS-6 weight vector (py-fsrs Scheduler default parameters, 21 weights;
# w20=0.1542 is the shipped decay). Read from a default Scheduler so it tracks the
# pinned package rather than a hand-copied literal.
def default_parameters():
    return list(Scheduler().parameters)


def self_check():
    """Assert the two frozen log-loss anchors to <= 1e-6 (formula, impl-independent)."""
    single = logloss([0.9], [1])
    triple = logloss([0.9, 0.9, 0.9], [1, 1, 0])
    ok = True
    if abs(single - 0.105361) <= 1e-6:
        print(f"ok logloss single={single:.6f}")
    else:
        print(f"MISMATCH logloss single={single:.6f} exp=0.105361")
        ok = False
    if abs(triple - 0.837769) <= 1e-6:
        print(f"ok logloss triple={triple:.6f}")
    else:
        print(f"MISMATCH logloss triple={triple:.6f} exp=0.837769")
        ok = False
    return 0 if ok else 1


def run(csv_path, out_path, weights_path):
    by_card = load_reviews(csv_path)

    default = evaluate_vector(by_card, default_parameters())
    result = {"default": default}
    print(f"ok split n_train={default['n_train']} n_test={default['n_test']}")

    if weights_path:
        with open(weights_path) as fh:
            fit = json.load(fh)
        fitted_params = [float(w) for w in fit["weights"]]
        if len(fitted_params) != 21:
            print(
                f"error: --weights must hold 21 weights (got {len(fitted_params)})",
                file=sys.stderr,
            )
            return 1
        result["fitted"] = evaluate_vector(by_card, fitted_params)

    with open(out_path, "w") as fh:
        json.dump(result, fh, indent=2)
        fh.write("\n")

    line = (
        f"ok eval default logloss={default['logloss']:.6f} "
        f"rmse_bins={default['rmse_bins']:.6f} n_test={default['n_test']}"
    )
    if "fitted" in result:
        f = result["fitted"]
        line += (
            f" | fitted logloss={f['logloss']:.6f} "
            f"rmse_bins={f['rmse_bins']:.6f} n_test={f['n_test']}"
        )
    print(line)
    return 0


def main(argv):
    if "--self-check" in argv:
        return self_check()
    ap = argparse.ArgumentParser(description="Holdout evaluator for FSRS-6 weight vectors.")
    ap.add_argument("--in", dest="in_path", required=True, help="input review-log CSV")
    ap.add_argument("--out", dest="out_path", required=True, help="output metrics JSON")
    ap.add_argument(
        "--weights",
        dest="weights_path",
        default=None,
        help="optional fitted-weights JSON (wave24-03 fit output)",
    )
    args = ap.parse_args(argv)
    return run(args.in_path, args.out_path, args.weights_path)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
