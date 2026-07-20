#!/usr/bin/env bash
# wave22-02: ELO_* constants declared with the pinned values; typecheck + unit green.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

F="lib/constants.ts"
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }

grep -qE 'export const ELO_K_MAX\s*=\s*0\.4\b'            "$F" || { echo "FAIL: ELO_K_MAX=0.4"; exit 1; }
grep -qE 'export const ELO_K_HALFLIFE\s*=\s*20\b'         "$F" || { echo "FAIL: ELO_K_HALFLIFE=20"; exit 1; }
grep -qE 'export const ELO_MIN_ITEM_ANSWERS\s*=\s*200\b'  "$F" || { echo "FAIL: ELO_MIN_ITEM_ANSWERS=200"; exit 1; }
grep -qE 'export const ELO_CONSUMERS_ENABLED\s*=\s*false' "$F" || { echo "FAIL: ELO_CONSUMERS_ENABLED=false"; exit 1; }
grep -qE 'export const ELO_INITIAL_BETA\s*=\s*0\b'        "$F" || { echo "FAIL: ELO_INITIAL_BETA=0"; exit 1; }
grep -qE 'export const ELO_INITIAL_THETA\s*=\s*0\b'       "$F" || { echo "FAIL: ELO_INITIAL_THETA=0"; exit 1; }

# Must NOT redeclare FSRS_GUESS_MAX.
grep -qE 'FSRS_GUESS_MAX\s*=' "$F" && { echo "FAIL: must not redeclare FSRS_GUESS_MAX"; exit 1; } || true

echo "=== typecheck ==="; npm run -s typecheck
echo "=== npm test ==="; npm test

echo "PASS: wave22-02"
