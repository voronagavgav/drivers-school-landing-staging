#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
P=app/segment/page.tsx
[ -f "$P" ] || { echo "FAIL: segment page missing"; exit 1; }

# §3 NO SIGNUP: zero email/password inputs anywhere in the segment flow.
if grep -Eq 'type="password"|name="email"' "$P"; then echo "FAIL: signup input present in segment flow"; exit 1; fi

# §1 the three TAP-choice steps render as single-select submit chips (no free-text).
grep -q 'name="categoryId"' "$P" || { echo "FAIL: category tap step missing"; exit 1; }
grep -q 'name="timing"' "$P" || { echo "FAIL: timing tap step missing"; exit 1; }
grep -q 'name="confidence"' "$P" || { echo "FAIL: confidence tap step missing"; exit 1; }

# §2 skip affordance present on the optional steps (never dead-ends).
grep -q 'Пропустити' "$P" || { echo "FAIL: «Пропустити» skip missing"; exit 1; }

# §7 flag-off: anon GET bounces to /login (existing authed onboarding untouched).
grep -Eq 'isValueFirstFunnelEnabled\(\)\) redirect\("/login"\)' "$P" \
  || { echo "FAIL: flag-off anon redirect to /login missing"; exit 1; }

# §4/§6 the tap actions open a real scoped session + fire the JTBD event.
A=app/actions/segment.ts
[ -f "$A" ] || { echo "FAIL: segment actions missing"; exit 1; }
grep -q 'onboarding_jtbd_answered' "$A" || { echo "FAIL: JTBD analytics event not fired"; exit 1; }
grep -Eq 'startSession|startTestAction' "$A" || { echo "FAIL: tailored session not opened"; exit 1; }

npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npm test || { echo "FAIL: unit suite"; exit 1; }
npm run test:integration || { echo "FAIL: integration suite"; exit 1; }
npm run build || { echo "FAIL: build"; exit 1; }
echo "PASS: wave17-07 segment onboarding (browser flow consolidates in wave17-14)"
