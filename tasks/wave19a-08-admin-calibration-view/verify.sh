#!/usr/bin/env bash
# Verify wave19a-08: admin calibration read view — RBAC-gated, reuses pure metrics, renders at 0 rows.
set -euo pipefail
cd "$(dirname "$0")/../.."

fail() { echo "FAIL: $1" >&2; exit 1; }

PAGE="$(git grep -lE 'requireContentManager' -- 'app/admin/calibration/page.tsx' 'app/admin/readiness-shadow/page.tsx' | head -1)"
[ -f app/admin/calibration/page.tsx ] || grep -q 'passOutcome' app/admin/readiness-shadow/page.tsx \
  || fail "no calibration page (app/admin/calibration/page.tsx) and readiness-shadow not extended"

TARGET=app/admin/calibration/page.tsx
[ -f "$TARGET" ] || TARGET=app/admin/readiness-shadow/page.tsx

grep -q 'requireContentManager' "$TARGET" || fail "calibration view not RBAC-gated"
grep -Eq 'passOutcome' "$TARGET" || fail "calibration view does not read PassOutcome"
grep -Eq 'calibration-metrics|brierScore|logLoss|ece|reliabilityDiagram' "$TARGET" \
  || fail "calibration view does not use the pure metrics module"

# Nav link added (only required when a NEW sibling page was created).
if [ -f app/admin/calibration/page.tsx ]; then
  grep -q '/admin/calibration' app/admin/layout.tsx || fail "nav link to /admin/calibration missing"
fi

npm run -s typecheck || fail "typecheck failed"
npm run -s build || fail "build failed"

echo "PASS: wave19a-08 admin calibration view (static + build)"
