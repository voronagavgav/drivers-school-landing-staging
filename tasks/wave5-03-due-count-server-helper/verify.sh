#!/usr/bin/env bash
# verify.sh — wave5-03 (countDueMistakes server helper)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
SRC="lib/server/mistakes.ts"
fail() { echo "FAIL: $1"; exit 1; }

# 1/2. Export present + reuses the pure predicate (does not re-implement it).
[ -f "$SRC" ] || fail "$SRC missing"
grep -q "countDueMistakes" "$SRC" || fail "$SRC does not export countDueMistakes"
grep -q "dueMistakes" "$SRC" || fail "$SRC does not reuse the pure dueMistakes"
grep -Eq "test-engine/selection" "$SRC" || fail "$SRC does not import from lib/test-engine/selection"
# Reads the active mistake bank.
grep -Eq "userMistake" "$SRC" || fail "$SRC does not query userMistake"

# 4. Typecheck.
npm run typecheck 2>&1 | tail -3

# 5. Integration suite still green (no regression).
iout="$(npm run test:integration 2>&1)"; echo "$iout" | tail -10
echo "$iout" | grep -Eqi " failed|✗ " && fail "integration suite reported failures"
echo "$iout" | grep -Eqi "✓|passed" || fail "integration suite did not report passing"

echo "PASS: wave5-03 countDueMistakes server helper"
