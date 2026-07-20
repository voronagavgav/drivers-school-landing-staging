#!/usr/bin/env bash
# verify.sh — wave3-feat-01 (investigation: Wave 3 wiring-surfaces findings map)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
J="tasks/wave3-feat-01-investigate-wiring-surfaces/journal.md"
fail() { echo "FAIL: $1"; exit 1; }

[ -f "$J" ] || fail "$J missing"

# 1. Has a Findings section.
grep -Eq '^## Findings' "$J" || fail "no '## Findings' heading"

# Extract the Findings section body (from the heading to the next '## ').
body="$(awk '/^## Findings$/{f=1;next} /^## /{f=0} f' "$J")"
[ -n "$(echo "$body" | tr -d '[:space:]')" ] || fail "Findings section is empty"

need() { echo "$body" | grep -q "$1" || fail "Findings missing reference: $1"; }

# 2. Mistake-spacing surface.
need "lib/server/test-engine.ts"
need "startSession"
need "orderMistakesByPriority"
need "MISTAKE_PRACTICE"
# 3. Dashboard surface.
need "app/(app)/dashboard/page.tsx"
need "getRecentReadinessScores"
need "lib/server/progress.ts"
# 4. Password surface.
need "verifyPassword"
need "hashPassword"
need "lib/validation.ts"
need "requireUser"
# 5. Integration-test convention.
need "integration.test.ts"
need "test:integration"
# 6. Seed surface.
need "prisma/seed.ts"
need "db:seed"
# 7. Schema decision recorded as NO.
echo "$body" | grep -Eqi "no schema change|schema change.*(not needed|no\b)|NO schema" \
  || fail "Findings does not record the 'no schema change' decision"

echo "PASS: wave3-feat-01 findings map complete"
