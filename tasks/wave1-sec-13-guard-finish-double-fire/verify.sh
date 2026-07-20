#!/usr/bin/env bash
# verify.sh — wave1-sec-13 (client ref guard against finish double-fire)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
R="components/test-runner.tsx"

# 1. useRef imported + used.
grep -q "useRef" "$R" || { echo "FAIL: $R does not use useRef"; exit 1; }

# 1. finish() body has a ref guard (references .current and returns early).
fbody="$(awk '/function finish\(\)/{f=1} f{print} f&&/^  }/{exit}' "$R")"
echo "$fbody" | grep -q "\.current" || { echo "FAIL: finish() does not consult a ref latch (.current)"; exit 1; }
echo "$fbody" | grep -q "return" || { echo "FAIL: finish() has no early-return guard"; exit 1; }
echo "$fbody" | grep -q "finishTestAction" || { echo "FAIL: finish() no longer calls finishTestAction"; exit 1; }

# 2. Button UX preserved.
grep -q "disabled={finishing}" "$R" || { echo "FAIL: $R lost disabled={finishing} on the finish button"; exit 1; }

# 2. Both callers still invoke finish().
grep -q "onExpire={finish}" "$R" || { echo "FAIL: timer onExpire no longer calls finish"; exit 1; }
grep -Eq "onClick=\{finish\}" "$R" || { echo "FAIL: manual button no longer calls finish"; exit 1; }

# 4. Typecheck + suite green.
npm run typecheck 2>&1 | tail -3
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && { echo "FAIL: vitest reported failures"; exit 1; }

echo "PASS: wave1-sec-13 finish double-fire guarded"
