#!/usr/bin/env bash
# wave22-01: the python Elo oracle exists, runs stdlib-only, and its captured stdout is clean.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

F="scripts/oracles/gen-wave22-oracles.py"
OUT="tasks/wave22-01-python-oracle/PREVERIFY-OUTPUT.txt"

[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }

# Header names the spec + the never-regenerate covenant.
grep -q "specs/wave22-elo-difficulty.md" "$F" || { echo "FAIL: header must name the spec"; exit 1; }
grep -q "reference oracle — the TS impl MUST match this; never regenerate these values from TS" "$F" \
  || { echo "FAIL: missing verbatim covenant string"; exit 1; }

# Stdlib-only: no third-party imports (allow only math / sys).
if grep -nE '^\s*(import|from)\s' "$F" | grep -vE '\b(math|sys)\b' | grep -q .; then
  echo "FAIL: non-stdlib import found"; grep -nE '^\s*(import|from)\s' "$F"; exit 1
fi

# Run it, capture stdout as static evidence.
python3 "$F" > "$OUT" || { echo "FAIL: script exited non-zero"; exit 1; }

grep -q "static evidence — read, do not run" "$OUT" || { echo "FAIL: evidence header missing in $OUT"; exit 1; }
if grep -qE 'MISMATCH|not ok|FAIL' "$OUT"; then echo "FAIL: failure marker in $OUT"; exit 1; fi

# Frozen anchors that must appear (literal values pinned in the Goal).
for tok in \
  "beta_plain=-0.200000 theta_plain=0.200000" \
  "beta_g020=-0.160000 theta_g020=0.160000" \
  "K(0)=0.400000" "K(10)=0.266667" "K(200)=0.036364" \
  "order_sensitive differs=true" \
  "converge_hard" "converge_easy" \
  "guess_weakens" "lt=true" \
  "k_decay monotone=true" ; do
  grep -qF "$tok" "$OUT" || { echo "FAIL: anchor missing in $OUT: $tok"; exit 1; }
done

# Grid coverage: at least 108 guess-adjusted single-update lines.
N="$(grep -cE '^ok upd_g ' "$OUT" || true)"
[ "${N:-0}" -ge 108 ] || { echo "FAIL: expected >=108 upd_g lines, got ${N:-0}"; exit 1; }

echo "PASS: wave22-01"
