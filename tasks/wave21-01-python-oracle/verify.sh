#!/usr/bin/env bash
# wave21-01: the external Python reference oracle runs and emits the frozen wave21 plan values.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

SCRIPT="scripts/oracles/gen-wave21-oracles.py"
OUT="tasks/wave21-01-python-oracle/PREVERIFY-OUTPUT.txt"
[ -f "$SCRIPT" ] || { echo "FAIL: $SCRIPT missing"; exit 1; }

# Header names the sources and the anti-self-grading rule.
grep -q "never regenerate these values from TS" "$SCRIPT" \
  || { echo "FAIL: $SCRIPT header missing the anti-self-grading statement"; exit 1; }
grep -q "PLAN-REVALIDATION-2026-07-14" "$SCRIPT" \
  || { echo "FAIL: $SCRIPT header does not name the re-validation doc"; exit 1; }
grep -q "wave21-plan-honesty" "$SCRIPT" \
  || { echo "FAIL: $SCRIPT header does not name the spec"; exit 1; }

echo "=== running $SCRIPT ==="
python3 "$SCRIPT" | tee "$OUT"

grep -q "static evidence" "$OUT" || { echo "FAIL: $OUT missing static-evidence header"; exit 1; }
for tok in nodate pace priori maint explode today_ok today_over today_clamp fresh maint0 \
           clamp monotone reviewload boundary ; do
  grep -qi "$tok" "$OUT" || { echo "FAIL: $OUT missing property line '$tok'"; exit 1; }
done

# No self-check failure lines.
if grep -Eiq "MISMATCH|not ok|FAIL:" "$OUT"; then
  echo "FAIL: $OUT contains a failing oracle line"; exit 1
fi

# Anchor spot-checks readable directly from the captured file.
grep -Eq "explode.*45"        "$OUT" || { echo "FAIL: explosion fixture quota 45 (MAINT) absent"; exit 1; }
grep -Eq "fresh.*(10)"        "$OUT" || { echo "FAIL: fresh-user equality anchor (10) absent"; exit 1; }
grep -Eq "1\.036190"          "$OUT" || { echo "FAIL: reviewLoad 6dp sum 1.036190 absent"; exit 1; }
grep -Eq "102 52 22 12 7 3"   "$OUT" || { echo "FAIL: monotone base sequence absent"; exit 1; }

echo "PASS: wave21-01"
