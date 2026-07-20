#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
OB='app/(app)/onboarding/page.tsx'
grep -q 'Як готуєшся' "$OB" || { echo "FAIL: prep-mode question missing from onboarding"; exit 1; }
grep -q 'не записа' "$OB" || { echo "FAIL: «ще не записався» affordance missing"; exit 1; }
grep -q 'PREP_MODES' lib/validation.ts || { echo "FAIL: prepMode schema not tied to PREP_MODES"; exit 1; }
grep -q 'onboarding_jtbd_answered' lib/server/study-profile.ts || { echo "FAIL: typed event not fired from profile action"; exit 1; }
IT=lib/server/jtbd-onboarding.integration.test.ts
[ -f "$IT" ] || { echo "FAIL: $IT missing"; exit 1; }
grep -q 'prepMode' "$IT" || { echo "FAIL: prepMode persistence not asserted"; exit 1; }
grep -q 'waitFor' "$IT" || { echo "FAIL: fire-and-forget event assert must vi.waitFor-poll"; exit 1; }
# Skip path must assert zero events — look for a 0-count expectation
grep -Eq 'toBe\(0\)|toHaveLength\(0\)' "$IT" || { echo "FAIL: skip path zero-event assert missing"; exit 1; }
# No pre-existing test edits
changed="$(git diff --name-only HEAD | grep -E '\.(integration\.)?test\.ts$' | grep -v 'jtbd-onboarding' || true)"
[ -z "$changed" ] || { echo "FAIL: pre-existing tests modified: $changed"; exit 1; }
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npm test || { echo "FAIL: unit suite"; exit 1; }
npm run test:integration || { echo "FAIL: integration suite"; exit 1; }
npm run build || { echo "FAIL: build"; exit 1; }
echo "OK wave16-12"
