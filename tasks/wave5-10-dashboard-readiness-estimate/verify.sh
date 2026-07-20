#!/usr/bin/env bash
# verify.sh — wave5-10 (dashboard examReadiness estimate + negated-гарантія disclaimer)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
DASH="app/(app)/dashboard/page.tsx"
fail() { echo "FAIL: $1"; exit 1; }

[ -f "$DASH" ] || fail "$DASH missing"

# 1. examReadiness wired with real inputs.
grep -q "examReadiness" "$DASH" || fail "$DASH does not call examReadiness"
grep -Eq "@/lib/readiness" "$DASH" || fail "$DASH does not import @/lib/readiness"
grep -q "getTopicMastery" "$DASH" || fail "$DASH does not source topicBands from getTopicMastery"

# 3. Legal: disclaimer present and 'гарантія' appears ONLY negated.
grep -q "гарантія" "$DASH" || fail "$DASH missing the negated 'гарантія' disclaimer"
# Every line mentioning гаранті… must also contain the negation token 'не'.
bad="$(grep -n "гаранті" "$DASH" | grep -v "не " || true)"
[ -n "$bad" ] && fail "non-negated 'гаранті…' occurrence(s): $bad"
# 4. Disclaimer references the official exam + the user's own practice.
grep -q "офіційн" "$DASH" || fail "$DASH disclaimer does not reference the official exam"
grep -q "практик" "$DASH" || fail "$DASH disclaimer does not reference the user's practice"

# 5. Typecheck.
npm run typecheck 2>&1 | tail -3

# 6. Build.
npm run build 2>&1 | tail -6

echo "PASS: wave5-10 dashboard exam-readiness estimate + legal disclaimer"
echo "NOTE: run 'npm run audit:browser' against the non-localhost origin to verify rendering for a logged-in user."
