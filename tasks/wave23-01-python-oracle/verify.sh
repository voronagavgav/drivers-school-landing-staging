#!/usr/bin/env bash
# wave23-01: python allocator oracle — runs the script, captures stdout, greps the frozen labels.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

SCRIPT="scripts/oracles/gen-wave23-oracles.py"
OUT="tasks/wave23-01-python-oracle/PREVERIFY-OUTPUT.txt"

[ -f "$SCRIPT" ] || { echo "FAIL: $SCRIPT missing"; exit 1; }

# Header provenance + anti-regeneration string.
grep -q "specs/wave23-exam-allocator-spike.md" "$SCRIPT" || { echo "FAIL: spec not named in header"; exit 1; }
grep -q "reference oracle — the TS impl MUST match this; never regenerate these values from TS" "$SCRIPT" \
  || { echo "FAIL: anti-regeneration string missing"; exit 1; }

# Run + capture.
python3 "$SCRIPT" > "$OUT" 2>&1 || { echo "FAIL: script exited non-zero"; cat "$OUT"; exit 1; }

grep -q "static evidence — read, do not run" "$OUT" || { echo "FAIL: evidence header missing"; exit 1; }

# No failure markers anywhere in the output.
if grep -Eq 'MISMATCH|not ok|FAIL' "$OUT"; then echo "FAIL: failure marker in output"; exit 1; fi

# Frozen labels present (criteria 3–8).
for tok in \
  "ok dial_before final=" \
  "ok dP item=" \
  "ok rank order=" \
  "ok blend item=" \
  "ok blend_identity holds=true" \
  "ok budget_zero reviewed=0" \
  "ok budget_saturate reviewed=6" \
  "ok baseline order=" \
  "ok policies_differ differs=" \
  "ok mono correct_delta_nonneg=true" \
  "ok mono weak_gt_strong=true" ; do
  grep -qF "$tok" "$OUT" || { echo "FAIL: missing labelled line: $tok"; exit 1; }
done

# Exactly 6 ΔP items printed.
N="$(grep -cE '^ok dP item=' "$OUT" || true)"
[ "$N" = "6" ] || { echo "FAIL: expected 6 'ok dP item=' lines, got $N"; exit 1; }

echo "PASS wave23-01"
