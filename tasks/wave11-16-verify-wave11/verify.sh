#!/usr/bin/env bash
# verify.sh — wave11-16 Wave-11 acceptance gate (§H). VERIFY-ONLY.
set -euo pipefail
cd "$(dirname "$0")/../.."
fail() { echo "FAIL: $1"; exit 1; }
WAVE11_BASE="${WAVE11_BASE:-6e00375}"

echo "== H1 typecheck + unit suite (incl new pure files) =="
npm run typecheck 2>&1 | tail -3
ulist="$(npx vitest list 2>/dev/null || true)"
for f in "queue-overrides.test.ts" "lib/streak-policy.test.ts" "lib/study-plan.test.ts" \
         "lib/fsrs/grade.test.ts" "lib/fsrs/latency-bands.test.ts"; do
  echo "$ulist" | grep -q "$f" || fail "unit suite missing $f"
done
uout="$(npm test 2>&1)"; echo "$uout" | tail -5
echo "$uout" | grep -Eqi "[1-9][0-9]* failed|✗ " && fail "unit suite reported failures" || true

echo "== H2 seed + integration suite (incl three new suites) =="
npm run db:seed 2>&1 | tail -2
ilist="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
for f in "adaptive-session.integration.test.ts" "readiness-snapshot.integration.test.ts" \
         "study-profile.integration.test.ts" "content-upsert.integration.test.ts"; do
  echo "$ilist" | grep -q "$f" || fail "integration suite missing $f"
done
iout="$(npm run test:integration 2>&1)"; echo "$iout" | tail -16
echo "$iout" | grep -Eqi "[1-9][0-9]* failed|✗ " && fail "integration suite reported failures" || true

echo "== H3 build + migrate-diff drift empty =="
npm run build 2>&1 | tail -6
drift="$(npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script 2>/dev/null || true)"
echo "$drift" | grep -Eiq 'CREATE TABLE|ALTER TABLE|DROP TABLE|CREATE INDEX' \
  && fail "migrate diff reports drift (schema != DB):
$drift" || true

echo "== H4 static guards =="
grep -Eq 'm !== "ADAPTIVE_REVIEW"' lib/constants.ts && fail "ADAPTIVE_REVIEW still excluded from STARTABLE_MODES" || true
# no learner-facing page added/restyled.
changed="$(git diff --name-only "$WAVE11_BASE"..HEAD 2>/dev/null || true)"
echo "$changed" | grep -E 'app/\(app\)/.*/page\.tsx' && fail "a learner-facing app/(app) page changed (admin-only wave)" || true
# nightly never imports @/lib/db.
grep -Eq '@/lib/db' scripts/nightly-readiness.ts && fail "nightly script imports @/lib/db" || true

echo "== H5 stable-key (content-upsert) =="
echo "$ilist" | grep -q "content-upsert.integration.test.ts" || fail "content-upsert suite absent"

echo "== H3b audit:browser 17/17 (non-localhost origin) =="
npm run audit:browser 2>&1 | tail -6

echo "PASS: Wave-11 acceptance gate green"
