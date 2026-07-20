#!/usr/bin/env bash
# Verify wave19a-03: FSRS-6 downstream consumers compile + unit/integration green; no stale FSRS-5 constants.
set -euo pipefail
cd "$(dirname "$0")/../.."

fail() { echo "FAIL: $1" >&2; exit 1; }

npm run -s typecheck || fail "typecheck failed"
npm run -s test || fail "npm test failed"

npm run -s db:seed || fail "db:seed failed"
npm run -s test:integration || fail "integration suite failed"

ILIST="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
echo "$ILIST" | grep -q 'srs-review.integration' || fail "srs-review integration suite not collected"
echo "$ILIST" | grep -q 'review-sync.integration' || fail "review-sync integration suite not collected"

# No lingering FSRS-5 magic constants in consumer code/tests (the oracle file is allowed to reference history).
if git grep -nE '19 */ *81|DECAY *= *-0\.5|= *3\.173([^0-9]|$)' -- lib app | grep -v 'reference-vectors' | grep -v 'CLAUDE.md'; then
  fail "stale FSRS-5 magic constant found outside the oracle file"
fi

echo "PASS: wave19a-03 FSRS-6 downstream verified"
