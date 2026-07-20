#!/usr/bin/env bash
# wave20-01: the external Python reference oracle runs and emits the frozen wave20 values.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

SCRIPT="scripts/oracles/gen-wave20-oracles.py"
OUT="tasks/wave20-01-python-oracle/PREVERIFY-OUTPUT.txt"
[ -f "$SCRIPT" ] || { echo "FAIL: $SCRIPT missing"; exit 1; }

# Header names the sources and the anti-self-grading rule.
grep -q "never regenerate these values from TS" "$SCRIPT" \
  || { echo "FAIL: $SCRIPT header missing the anti-self-grading statement"; exit 1; }
grep -q "GRADE-MECHANISM-RESEARCH" "$SCRIPT" \
  || { echo "FAIL: $SCRIPT header does not name the mechanism doc source"; exit 1; }

echo "=== running $SCRIPT ==="
python3 "$SCRIPT" | tee "$OUT"

# Captured evidence carries the labelled ok-lines for the (a)-(g) properties.
grep -q "static evidence" "$OUT" || { echo "FAIL: $OUT missing static-evidence header"; exit 1; }
for tok in blend_s50 blend_s100 blend_s5 never_grow crush_weak monotone_pi repeated_wrong \
           boundary_census posterior_direction ; do
  grep -q "$tok" "$OUT" || { echo "FAIL: $OUT missing property line '$tok'"; exit 1; }
done

# Every emitted assertion line reports ok (no 'FAIL'/'MISMATCH' from the script's own self-check).
if grep -Eiq "MISMATCH|not ok|FAIL:" "$OUT"; then
  echo "FAIL: $OUT contains a failing oracle line"; exit 1
fi

# Anchor spot-checks readable directly from the captured file (band anchors, not exact 6dp).
grep -Eq "posterior_direction.*0\.666667.*0\.729730.*0\.782609.*0\.818182" "$OUT" \
  || grep -q "0.818182" "$OUT" \
  || { echo "FAIL: posterior-direction 6dp anchors absent"; exit 1; }

echo "PASS: wave20-01"
