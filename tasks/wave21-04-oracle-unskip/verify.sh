#!/usr/bin/env bash
# wave21-04: the frozen oracle suite is un-suspended and passes against the real impl.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

F="lib/study-plan.oracle.test.ts"
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }

# No suspension token remains (real or in prose).
if grep -Eq "describe\.skip|it\.skip|\.skip\(" "$F"; then
  echo "FAIL: $F still contains a .skip form"; exit 1
fi
# No stale @ts-expect-error (the reviewLoad field now exists).
if grep -q "@ts-expect-error" "$F"; then
  echo "FAIL: $F still has @ts-expect-error (would be unused → TS error)"; exit 1
fi

# Suite is collected.
LIST="$(npx vitest list 2>/dev/null || true)"
grep -q "study-plan.oracle" <<<"$LIST" || { echo "FAIL: study-plan.oracle not collected"; exit 1; }

echo "=== typecheck ==="
npm run -s typecheck
echo "=== npm test ==="
npm test

echo "PASS: wave21-04"
