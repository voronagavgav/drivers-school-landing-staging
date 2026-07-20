#!/usr/bin/env bash
# wave24-04: holdout evaluator — frozen log-loss anchors + default/fitted smoke on the sample CSV.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

DIR="scripts/fsrs-fit"
PY="$DIR/.venv/bin/python"
EVAL="$DIR/evaluate.py"
CSV="$DIR/fixtures/sample-revlog.csv"
OUT="tasks/wave24-04-evaluate-py/PREVERIFY-OUTPUT.txt"

[ -x "$PY" ]   || { echo "FAIL: venv python missing (run wave24-01)"; exit 1; }
[ -f "$EVAL" ] || { echo "FAIL: $EVAL missing"; exit 1; }
[ -f "$CSV" ]  || { echo "FAIL: $CSV missing"; exit 1; }

# 1. Imports predict + py-fsrs Scheduler; does not reimplement the update loop.
grep -Eq 'import predict|from predict' "$EVAL" || { echo "FAIL: evaluate.py does not import predict"; exit 1; }
grep -Eq 'from fsrs import .*Scheduler|fsrs\.Scheduler' "$EVAL" \
  || { echo "FAIL: evaluate.py does not use py-fsrs Scheduler"; exit 1; }

# 2. Frozen log-loss anchors.
{ echo "static evidence — read, do not run"; "$PY" "$EVAL" --self-check; } > "$OUT" 2>&1 \
  || { echo "FAIL: evaluate.py --self-check exited non-zero"; cat "$OUT"; exit 1; }
grep -qF "ok logloss single=0.105361" "$OUT" || { echo "FAIL: single log-loss anchor missing/wrong"; exit 1; }
grep -qF "ok logloss triple=0.837769" "$OUT" || { echo "FAIL: triple log-loss anchor missing/wrong"; exit 1; }
if grep -Eq 'MISMATCH|not ok' "$OUT"; then echo "FAIL: failure marker in self-check"; exit 1; fi

# 3-5. Smoke default, then a fitted vector, over the sample CSV.
FIT_JSON="$(mktemp -t w24fit.XXXXXX.json)"
"$PY" "$DIR/fit.py" --in "$CSV" --out "$FIT_JSON" >>"$OUT" 2>&1 || { echo "FAIL: fit for eval smoke failed"; exit 1; }
EVAL_JSON="$(mktemp -t w24eval.XXXXXX.json)"
"$PY" "$EVAL" --in "$CSV" --weights "$FIT_JSON" --out "$EVAL_JSON" >>"$OUT" 2>&1 \
  || { echo "FAIL: evaluate.py smoke exited non-zero"; cat "$OUT"; exit 1; }

grep -qE "ok split n_train=[0-9]+ n_test=[0-9]+" "$OUT" || { echo "FAIL: chronological split line missing"; exit 1; }

"$PY" - "$EVAL_JSON" <<'PYEOF' | tee -a "$OUT" || { echo "FAIL: eval output JSON invalid"; exit 1; }
import json,sys,math
d=json.load(open(sys.argv[1]))
for k in ("default","fitted"):
    o=d[k]
    for m in ("logloss","rmse_bins"):
        assert math.isfinite(o[m]), f"{k}.{m} not finite"
assert d["default"]["n_test"]==d["fitted"]["n_test"], "n_test differs between default/fitted"
print(f"ok eval default.logloss={d['default']['logloss']:.6f} fitted.logloss={d['fitted']['logloss']:.6f} n_test={d['default']['n_test']}")
PYEOF
grep -qF "ok eval default.logloss=" "$OUT" || { echo "FAIL: eval metrics line missing"; exit 1; }

echo "PASS wave24-04"
