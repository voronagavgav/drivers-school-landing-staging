#!/usr/bin/env bash
# wave24-03: fit.py wraps the external py-fsrs optimizer; smoke on a sample CSV.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

DIR="scripts/fsrs-fit"
PY="$DIR/.venv/bin/python"
FIT="$DIR/fit.py"
CSV="$DIR/fixtures/sample-revlog.csv"
OUT="tasks/wave24-03-fit-py/PREVERIFY-OUTPUT.txt"
JSON="$(mktemp -t w24fit.XXXXXX.json)"

[ -x "$PY" ]  || { echo "FAIL: venv python missing (run wave24-01)"; exit 1; }
[ -f "$FIT" ] || { echo "FAIL: $FIT missing"; exit 1; }
[ -f "$CSV" ] || { echo "FAIL: $CSV missing"; exit 1; }

# 1. Uses the external optimizer, not a hand-rolled objective.
grep -Eq 'from fsrs import Optimizer|fsrs\.Optimizer' "$FIT" \
  || { echo "FAIL: fit.py does not call the py-fsrs Optimizer"; exit 1; }

# 2-4. Smoke: fit the sample CSV, validate output shape.
{ echo "static evidence — read, do not run"; "$PY" "$FIT" --in "$CSV" --out "$JSON"; } > "$OUT" 2>&1 \
  || { echo "FAIL: fit.py smoke exited non-zero"; cat "$OUT"; exit 1; }
[ -f "$JSON" ] || { echo "FAIL: fit.py wrote no output JSON"; exit 1; }

"$PY" - "$JSON" <<'PYEOF' | tee -a "$OUT" || { echo "FAIL: output JSON shape invalid"; exit 1; }
import json,sys,math
d=json.load(open(sys.argv[1]))
w=d["weights"]
assert isinstance(w,list) and len(w)==21, f"weights len={len(w)}"
assert all(isinstance(x,(int,float)) and math.isfinite(x) for x in w), "non-finite weight"
assert isinstance(d["n_reviews"],int) and isinstance(d["n_cards"],int)
assert isinstance(d["optimizer"],str) and d["optimizer"], "optimizer tag missing"
print(f"ok weights len=21 finite=true optimizer={d['optimizer']}")
PYEOF
grep -qF "ok weights len=21 finite=true" "$OUT" || { echo "FAIL: weights validation line missing"; exit 1; }

# 5. Degenerate-input guard: empty CSV → non-zero exit + clear message.
EMPTY="$(mktemp -t w24empty.XXXXXX.csv)"
printf 'card_id,review_time,review_rating\n' > "$EMPTY"
if "$PY" "$FIT" --in "$EMPTY" --out "$(mktemp)" >>"$OUT" 2>&1; then
  echo "FAIL: fit.py accepted an empty CSV (should error)"; exit 1
fi
grep -qi "insufficient reviews" "$OUT" || { echo "FAIL: degenerate-input message missing"; exit 1; }

echo "PASS wave24-03"
