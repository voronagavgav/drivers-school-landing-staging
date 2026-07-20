#!/usr/bin/env bash
# verify.sh — wave5-04 (dashboard "на повторення" due-review card)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
DASH="app/(app)/dashboard/page.tsx"
fail() { echo "FAIL: $1"; exit 1; }

[ -f "$DASH" ] || fail "$DASH missing"

# 1. Dashboard calls the due-count helper.
grep -q "countDueMistakes" "$DASH" || fail "$DASH does not call countDueMistakes"
grep -Eq "@/lib/server/mistakes" "$DASH" || fail "$DASH does not import from @/lib/server/mistakes"

# 2. Card copy + MISTAKE_PRACTICE CTA via the existing startTestAction form.
grep -q "на повторення" "$DASH" || fail "$DASH has no 'на повторення' card copy"
grep -q "MISTAKE_PRACTICE" "$DASH" || fail "$DASH has no MISTAKE_PRACTICE CTA"
grep -q "startTestAction" "$DASH" || fail "$DASH does not use startTestAction"

# 5. Typecheck.
npm run typecheck 2>&1 | tail -3

# 6. Build (the dashboard route must compile).
npm run build 2>&1 | tail -6

echo "PASS: wave5-04 dashboard due-review card"
echo "NOTE: run 'npm run audit:browser' against the non-localhost origin to verify the card renders for a logged-in user."
