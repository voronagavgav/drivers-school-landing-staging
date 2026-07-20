#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
C=lib/constants.ts
grep -Eq 'PRICE_UAH *= *399' "$C" || { echo "FAIL: PRICE_UAH=399 missing"; exit 1; }
grep -Eq 'PRICE_TEST_ARM_UAH *= *499' "$C" || { echo "FAIL: PRICE_TEST_ARM_UAH=499 missing"; exit 1; }
grep -q 'EXAM_ACCESS' "$C" || { echo "FAIL: ENTITLEMENT_TIERS missing EXAM_ACCESS"; exit 1; }
grep -q 'ENTITLEMENT_SOURCES' "$C" || { echo "FAIL: ENTITLEMENT_SOURCES missing"; exit 1; }
grep -q 'PROMO' "$C" || { echo "FAIL: PROMO source missing"; exit 1; }
grep -Eq 'WINBACK_WINDOW_START_DAY *= *8' "$C" || { echo "FAIL: WINBACK_WINDOW_START_DAY=8 missing"; exit 1; }
grep -Eq 'WINBACK_WINDOW_END_DAY *= *9' "$C" || { echo "FAIL: WINBACK_WINDOW_END_DAY=9 missing"; exit 1; }
grep -q 'RETAKE_WINBACK' "$C" || { echo "FAIL: NUDGE_KINDS missing RETAKE_WINBACK"; exit 1; }
grep -q 'PREP_MODES' "$C" || { echo "FAIL: PREP_MODES missing"; exit 1; }
grep -q 'EXAM_OUTCOMES' "$C" || { echo "FAIL: EXAM_OUTCOMES missing"; exit 1; }
grep -q 'exam_outcome_reported' "$C" || { echo "FAIL: analytics event exam_outcome_reported missing"; exit 1; }
grep -q 'onboarding_jtbd_answered' "$C" || { echo "FAIL: analytics event onboarding_jtbd_answered missing"; exit 1; }
# No module-scope flag constant in constants.ts (flag reader belongs to lib/entitlements.ts)
if grep -q 'ENTITLEMENTS_ENABLED' "$C"; then echo "FAIL: ENTITLEMENTS_ENABLED must not live in constants.ts"; exit 1; fi
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npm test || { echo "FAIL: unit tests"; exit 1; }
echo "OK wave16-02"
