#!/usr/bin/env bash
# verify.sh — wave4-test-10 (mistakes copy interpolates MISTAKE_RESOLVE_THRESHOLD)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
P="app/(app)/mistakes/page.tsx"
fail() { echo "FAIL: $1"; exit 1; }

[ -f "$P" ] || fail "$P missing"
# 1. Constant imported.
grep -q "MISTAKE_RESOLVE_THRESHOLD" "$P" || fail "$P does not reference MISTAKE_RESOLVE_THRESHOLD"
# 2. Interpolated into a template literal, and the hardcoded word removed.
grep -q '${MISTAKE_RESOLVE_THRESHOLD}' "$P" || fail "$P does not interpolate \${MISTAKE_RESOLVE_THRESHOLD}"
grep -qi "вічі" "$P" && fail "$P still hardcodes 'Двічі'/'двічі'" || true

# 4. No regression.
npm run typecheck 2>&1 | tail -3
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && fail "unit suite reported failures" || true

echo "PASS: wave4-test-10 mistakes copy threshold"
