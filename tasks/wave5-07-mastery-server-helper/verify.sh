#!/usr/bin/env bash
# verify.sh — wave5-07 (getTopicMastery server helper)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
SRC="lib/server/mastery.ts"
fail() { echo "FAIL: $1"; exit 1; }

# 1/3. Export present + reuses the pure classifier.
[ -f "$SRC" ] || fail "$SRC missing"
grep -q "getTopicMastery" "$SRC" || fail "$SRC does not export getTopicMastery"
grep -q "topicMastery" "$SRC" || fail "$SRC does not reuse the pure topicMastery"
grep -Eq "@/lib/mastery" "$SRC" || fail "$SRC does not import from @/lib/mastery"
# 2a. Uses the live-pool filter (coverage totals match the real pool, incl. demo gate).
grep -q "isPublished" "$SRC" || fail "$SRC does not apply the isPublished live filter"
grep -q "SERVE_DEMO_QUESTIONS" "$SRC" || fail "$SRC does not honour the SERVE_DEMO_QUESTIONS gate"

# 4. Typecheck.
npm run typecheck 2>&1 | tail -3

# 5. Integration suite still green.
iout="$(npm run test:integration 2>&1)"; echo "$iout" | tail -10
echo "$iout" | grep -Eqi " failed|✗ " && fail "integration suite reported failures"
echo "$iout" | grep -Eqi "✓|passed" || fail "integration suite did not report passing"

echo "PASS: wave5-07 getTopicMastery server helper"
