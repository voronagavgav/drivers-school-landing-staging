#!/usr/bin/env bash
# verify.sh — mvp-finish-06 (recent readiness scores helper: export + ordering + typecheck/test)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
SRC="lib/server/progress.ts"

# 1. Helper exported.
grep -Eq "export (async )?function getRecentReadinessScores" "$SRC" \
  || { echo "FAIL: getRecentReadinessScores not exported from $SRC"; exit 1; }

# 2. Queries ProgressSnapshot and selects the score.
grep -q "progressSnapshot" "$SRC" \
  || { echo "FAIL: $SRC does not query prisma.progressSnapshot"; exit 1; }
grep -q "readinessScore" "$SRC" \
  || { echo "FAIL: $SRC does not reference readinessScore"; exit 1; }

# 3. A module-local recent-window constant exists (mirrors RECENT_EXAM_WINDOW pattern).
grep -Eq "RECENT_READINESS_WINDOW" "$SRC" \
  || { echo "FAIL: $SRC has no RECENT_READINESS_WINDOW window constant"; exit 1; }

# 4. server-only retained + existing exports intact.
grep -q 'server-only' "$SRC" || { echo "FAIL: $SRC lost server-only import"; exit 1; }
for fn in computeProgress computeWeakTopicIds snapshotProgress; do
  grep -q "export.*function $fn" "$SRC" || { echo "FAIL: $SRC lost existing export $fn"; exit 1; }
done

# 5. Typecheck + suite green.
npm run typecheck 2>&1 | tail -3
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && { echo "FAIL: vitest reported failures"; exit 1; }

echo "PASS: mvp-finish-06 getRecentReadinessScores meets criteria"
