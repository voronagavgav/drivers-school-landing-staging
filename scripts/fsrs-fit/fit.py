#!/usr/bin/env python3
# The FITTER (wave24-03). Reads an exported review-log CSV, runs the CANONICAL
# py-fsrs Optimizer (external canon — the fit is NEVER reimplemented here), and
# emits the fitted 21-weight FSRS-6 vector + train stats as JSON.
#
# The optimizer is delegated entirely to the pinned `fsrs` package
# (`from fsrs import Optimizer`); this file only ADAPTS the CSV rows into the
# ReviewLog shape the optimizer wants, and serialises its output. No gradient/
# loss loop lives here.
#
# CSV input schema (matches the wave24-05 export):
#   header: card_id,review_time,review_rating
#   review_time  = epoch milliseconds OR ISO-8601 (auto-detected); ascending per card
#   review_rating in {1,2,3,4} = Again/Hard/Good/Easy
# Only fsrs6-bkt2-engine rows are ever exported, so a single grade semantics is
# assumed (no per-row engine column).
#
# Usage: fit.py --in <csv> --out <json>
# Output JSON: { weights:[21 floats], n_reviews:int, n_cards:int, optimizer:str }
import argparse
import csv
import math
import sys
from datetime import datetime, timezone
from importlib.metadata import version

from fsrs import Optimizer, Rating, ReviewLog

# Minimum reviews to attempt a fit. Below this we refuse rather than emit a bogus
# all-default vector (the degenerate-input guard). An empty CSV has 0 reviews.
MIN_REVIEWS = 1


def _parse_review_time(raw):
    """epoch-ms integer OR ISO-8601 string -> tz-aware UTC datetime."""
    raw = raw.strip()
    if raw.lstrip("-").isdigit():
        return datetime.fromtimestamp(int(raw) / 1000.0, tz=timezone.utc)
    dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def load_review_logs(csv_path):
    """CSV -> list[ReviewLog] grouped per card, ascending by review_time.

    Returns (review_logs, n_reviews, n_cards).
    """
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

    review_logs = []
    n_reviews = 0
    for card_id in sorted(by_card):
        for when, rating in sorted(by_card[card_id], key=lambda x: x[0]):
            review_logs.append(
                ReviewLog(
                    card_id=card_id,
                    rating=rating,
                    review_datetime=when,
                    review_duration=None,
                )
            )
            n_reviews += 1
    return review_logs, n_reviews, len(by_card)


def fit(csv_path):
    review_logs, n_reviews, n_cards = load_review_logs(csv_path)
    if n_reviews < MIN_REVIEWS or n_cards < 1:
        print(
            f"error: insufficient reviews ({n_reviews} reviews, {n_cards} cards); "
            f"need >= {MIN_REVIEWS} review over >= 1 card",
            file=sys.stderr,
        )
        sys.exit(1)

    # EXTERNAL CANON: the fit is the py-fsrs Optimizer, delegated wholesale.
    weights = Optimizer(review_logs).compute_optimal_parameters(verbose=False)
    weights = [float(w) for w in weights]

    if len(weights) != 21 or not all(math.isfinite(w) for w in weights):
        print(
            f"error: optimizer returned an invalid vector (len={len(weights)})",
            file=sys.stderr,
        )
        sys.exit(1)

    return {
        "weights": weights,
        "n_reviews": n_reviews,
        "n_cards": n_cards,
        "optimizer": f"fsrs=={version('fsrs')}",
    }


def main(argv):
    ap = argparse.ArgumentParser(description="Fit FSRS-6 weights from a review-log CSV.")
    ap.add_argument("--in", dest="in_path", required=True, help="input review-log CSV")
    ap.add_argument("--out", dest="out_path", required=True, help="output weights JSON")
    args = ap.parse_args(argv)

    result = fit(args.in_path)
    with open(args.out_path, "w") as fh:
        import json

        json.dump(result, fh, indent=2)
        fh.write("\n")
    print(
        f"ok fit n_cards={result['n_cards']} n_reviews={result['n_reviews']} "
        f"optimizer={result['optimizer']}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
