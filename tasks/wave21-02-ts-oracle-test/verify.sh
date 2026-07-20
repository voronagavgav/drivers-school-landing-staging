#!/usr/bin/env bash
# wave21-02: the suspended TS oracle test exists, is collected, and typecheck/npm test are green.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

F="lib/study-plan.oracle.test.ts"
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }

# Frozen literals present (transcribed from the python oracle, not the impl).
grep -q "describe.skip" "$F" || { echo "FAIL: $F impl-dependent block must be describe.skip"; exit 1; }
grep -q "@ts-expect-error" "$F" || { echo "FAIL: $F must guard the reviewLoad field with @ts-expect-error"; exit 1; }
grep -q "reviewLoad" "$F" || { echo "FAIL: $F must use the new reviewLoad input field"; exit 1; }

# File is collected (a non-skipped self-consistency test keeps it listed).
LIST="$(npx vitest list 2>/dev/null || true)"
grep -q "study-plan.oracle" <<<"$LIST" || { echo "FAIL: study-plan.oracle not collected"; exit 1; }

echo "=== typecheck ==="
npm run -s typecheck
echo "=== npm test ==="
npm test

echo "PASS: wave21-02"
