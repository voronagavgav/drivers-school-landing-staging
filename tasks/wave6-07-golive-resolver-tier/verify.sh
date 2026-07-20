#!/usr/bin/env bash
# verify.sh — wave6-07 (golive publishes into public/restyled-live tier, no DB mutation)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
GL="scripts/restyle/golive.mjs"
TIER="public/restyled-live"
fail() { echo "FAIL: $1"; exit 1; }

# 1. Static: targets the restyled-live tier, no DB UPDATE.
grep -q "restyled-live" "$GL" || fail "$GL does not target public/restyled-live"
grep -Eqi "UPDATE +Question|imageUrl" "$GL" \
  && fail "$GL still mutates the DB / Question.imageUrl — go-live must be filesystem-only"

# 2. apply publishes approved restyled PNGs into the tier.
node "$GL" apply 2>&1 | tail -3
live="$(find "$TIER" -maxdepth 1 -name '*.png' 2>/dev/null | wc -l | tr -d ' ')"
[ "${live:-0}" -ge 1 ] || fail "after apply, no files in $TIER (expected approved restyled PNGs)"

# 3. status exits 0.
node "$GL" status 2>&1 | tail -3

# 4. revert clears the tier.
node "$GL" revert 2>&1 | tail -3
live2="$(find "$TIER" -maxdepth 1 -name '*.png' 2>/dev/null | wc -l | tr -d ' ')"
[ "${live2:-0}" -eq 0 ] || fail "after revert, $TIER still has $live2 file(s)"

# 5. re-revert on an empty tier still exits 0.
node "$GL" revert 2>&1 | tail -2

# Leave the box in the applied state for the browser audit / normal use.
node "$GL" apply 2>&1 | tail -2

echo "PASS: wave6-07 golive tier apply/revert/status (published $live, no DB mutation)"
