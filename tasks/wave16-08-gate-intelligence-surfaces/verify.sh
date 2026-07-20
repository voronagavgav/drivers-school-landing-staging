#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
IT=lib/server/entitlement-gating.integration.test.ts
[ -f "$IT" ] || { echo "FAIL: gating integration test missing"; exit 1; }
grep -q 'ENTITLEMENT_REQUIRED' "$IT" || { echo "FAIL: gating test never asserts the typed error"; exit 1; }
grep -q 'getStudyPlan' "$IT" || { echo "FAIL: gating test does not drive getStudyPlan"; exit 1; }
grep -q 'listMistakes' "$IT" || { echo "FAIL: gating test does not drive listMistakes"; exit 1; }
# Loader-layer enforcement present (defense in depth, not page-only)
grep -q 'requireIntelligenceAccess' lib/server/study.ts || { echo "FAIL: getStudyPlan not loader-guarded"; exit 1; }
grep -q 'requireIntelligenceAccess' lib/server/mistakes.ts || { echo "FAIL: listMistakes not loader-guarded"; exit 1; }
# Pages consult access + mount the teaser
grep -q 'checkIntelligenceAccess' 'app/(app)/dashboard/page.tsx' || { echo "FAIL: dashboard does not check access"; exit 1; }
grep -rq 'EntitlementTeaser\|entitlement-teaser' 'app/(app)/dashboard/page.tsx' 'app/(app)/progress/page.tsx' 'app/(app)/mistakes/page.tsx' || { echo "FAIL: teaser not mounted on gated pages"; exit 1; }
# No pre-existing test edited (flag-off inertness contract)
changed="$(git diff --name-only HEAD | grep -E '\.(integration\.)?test\.ts$' | grep -v 'entitlement-gating' || true)"
[ -z "$changed" ] || { echo "FAIL: pre-existing tests modified: $changed"; exit 1; }
# Stored-computation paths untouched
core="$(git diff --name-only HEAD | grep -E 'lib/fsrs/|lib/readiness-model\.ts|prisma/schema\.prisma' || true)"
[ -z "$core" ] || { echo "FAIL: stored-computation path touched: $core"; exit 1; }
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npm test || { echo "FAIL: unit suite (flag off)"; exit 1; }
npm run test:integration || { echo "FAIL: integration suite (flag off)"; exit 1; }
npm run build || { echo "FAIL: build"; exit 1; }
echo "OK wave16-08"
