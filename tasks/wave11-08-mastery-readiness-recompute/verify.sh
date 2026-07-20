#!/usr/bin/env bash
# verify.sh — wave11-08 mastery+readiness recompute module + finishSession wire (static + build).
set -euo pipefail
cd "$(dirname "$0")/../.."
fail() { echo "FAIL: $1"; exit 1; }
M="lib/server/mastery-readiness.ts"
[ -f "$M" ] || fail "$M missing"

grep -Eq 'export (async )?function recomputeTopicMastery' "$M" || fail "recomputeTopicMastery not exported"
grep -Eq 'export (async )?function recomputeReadiness' "$M" || fail "recomputeReadiness not exported"
grep -Eq 'export (async )?function getLatestReadiness' "$M" || fail "getLatestReadiness not exported"

# reuse the pure models, not re-derivation.
grep -Eq 'computeReadiness' "$M" || fail "recomputeReadiness must call the pure computeReadiness"
grep -Eq 'retrievability' "$M" || fail "meanR must use pure retrievability"
grep -Eq 'sufficientData' "$M" || fail "sufficientData flag missing (insufficient-data first-class)"
grep -Eq 'READINESS_MIN_SEEN' "$M" || fail "must gate on READINESS_MIN_SEEN"
grep -Eq 'READINESS_MOCK_WINDOW' "$M" || fail "must window mocks by READINESS_MOCK_WINDOW"

# chunking: any { in: [...] } id-list read must be bounded ≤200 (look for a chunk size const/slice).
if grep -Eq 'in:\s*\[|in:\s*chunk|in:\s*ids' "$M"; then
  grep -Eq '200|CHUNK' "$M" || fail "$M has an in-list read but no ≤200 chunking evidence"
fi

# finishSession wires both recomputes after snapshotProgress.
grep -Eq 'recomputeTopicMastery' lib/server/test-engine.ts || fail "finishSession does not call recomputeTopicMastery"
grep -Eq 'recomputeReadiness' lib/server/test-engine.ts || fail "finishSession does not call recomputeReadiness"

npm run typecheck 2>&1 | tail -3
npm run build 2>&1 | tail -6
echo "PASS: recompute module + finishSession wire (behavioral proof in wave11-09)"
