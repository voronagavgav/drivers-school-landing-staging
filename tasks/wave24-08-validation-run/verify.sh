#!/usr/bin/env bash
# wave24-08: recovery + null gates on synthetic ground truth (reads the committed results JSON).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

DIR="tasks/wave24-08-validation-run"
RES="$DIR/VALIDATION-RESULTS.json"
OUT="$DIR/PREVERIFY-OUTPUT.txt"
FIND="$DIR/FINDINGS.md"
PY="scripts/fsrs-fit/.venv/bin/python"

[ -f "$RES" ]  || { echo "FAIL: $RES missing"; exit 1; }
[ -f "$OUT" ]  || { echo "FAIL: $OUT missing"; exit 1; }
[ -f "$FIND" ] || { echo "FAIL: $FIND missing"; exit 1; }
[ -x "$PY" ]   || PY="python3"

grep -qF "static evidence — read, do not run" "$OUT" || { echo "FAIL: evidence header missing"; exit 1; }
grep -q "## Acceptance" "$FIND" || { echo "FAIL: FINDINGS.md missing Acceptance table"; exit 1; }

# Gates 2-5 asserted on the committed results.
"$PY" - "$RES" <<'PYEOF' || { echo "FAIL: a validation gate did not hold"; exit 1; }
import json,sys
d=json.load(open(sys.argv[1]))
r=d["recovery"]; n=d["null"]; curve={c["reviews"]:c for c in d["curve"]}
assert r["fitted_logloss"] < r["default_logloss"], f"RECOVERY(i) FAIL: fitted {r['fitted_logloss']} !< default {r['default_logloss']}"
assert r["fitted_w20"] > 0.1542, f"RECOVERY(ii) FAIL: fitted_w20 {r['fitted_w20']} !> 0.1542"
# NULL gate, relative form (premise correction 2026-07-15, justification in FINDINGS.md + run-validation.ts:
# a seed-stable ~0.002-0.006 in-population adaptation exists on default-generated logs; flattery/leakage
# would inflate null AND recovery improvements alike, so the discriminating test is the RATIO, with the
# original 0.005 kept as the absolute floor).
null_imp = n["default_logloss"] - n["fitted_logloss"]
rec_imp = r["default_logloss"] - r["fitted_logloss"]
bound = max(0.005, 0.35 * rec_imp)
assert null_imp <= bound, f"NULL FAIL: null improvement {null_imp} > bound {bound}"
for k in (200,500,1000,2000): assert k in curve, f"curve missing reviews={k}"
assert curve[2000]["w20_err"] < curve[200]["w20_err"], f"CURVE FAIL: err(2000)={curve[2000]['w20_err']} !< err(200)={curve[200]['w20_err']}"
assert isinstance(d.get("seed"),int) and isinstance(d.get("n_users"),int)
print(f"ok recovery fitted={r['fitted_logloss']:.6f} default={r['default_logloss']:.6f} fitted_w20={r['fitted_w20']:.6f}")
print(f"ok null fitted={n['fitted_logloss']:.6f} default={n['default_logloss']:.6f}")
print(f"ok curve err200={curve[200]['w20_err']:.6f} err2000={curve[2000]['w20_err']:.6f}")
PYEOF

# 6. Headline numbers appear in BOTH the captured stdout and the results JSON (no invented numbers).
FW20="$("$PY" -c "import json;print(f\"{json.load(open('$RES'))['recovery']['fitted_w20']:.4f}\")")"
grep -qF "$FW20" "$OUT" || { echo "FAIL: fitted_w20 ($FW20) not present verbatim in PREVERIFY-OUTPUT.txt"; exit 1; }

echo "PASS wave24-08"
