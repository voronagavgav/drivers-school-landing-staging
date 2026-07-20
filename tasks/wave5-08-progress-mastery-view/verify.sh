#!/usr/bin/env bash
# verify.sh — wave5-08 (/progress per-topic mastery view)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
PAGE="app/(app)/progress/page.tsx"
NAV="components/app-nav.tsx"
fail() { echo "FAIL: $1"; exit 1; }

# 1. New route present + wired to the server helper.
[ -f "$PAGE" ] || fail "$PAGE missing"
grep -q "getTopicMastery" "$PAGE" || fail "$PAGE does not call getTopicMastery"
grep -Eq "@/lib/server/mastery" "$PAGE" || fail "$PAGE does not import @/lib/server/mastery"
grep -q "requireUser" "$PAGE" || fail "$PAGE does not require auth"

# 2. Non-colour marker + scoped TOPIC_PRACTICE CTA.
grep -q "MASTERY_LABEL" "$PAGE" || fail "$PAGE does not render the non-colour MASTERY_LABEL marker"
grep -q "практикувати" "$PAGE" || fail "$PAGE has no 'практикувати' CTA"
grep -q "TOPIC_PRACTICE" "$PAGE" || fail "$PAGE has no TOPIC_PRACTICE CTA"
grep -q "topicId" "$PAGE" || fail "$PAGE CTA is not scoped by topicId"
grep -q "startTestAction" "$PAGE" || fail "$PAGE does not use startTestAction"

# 3. Reachable via nav.
grep -q "/progress" "$NAV" || fail "$NAV has no /progress link"

# 5. Typecheck.
npm run typecheck 2>&1 | tail -3

# 6. Build (the /progress route must compile).
npm run build 2>&1 | tail -6

echo "PASS: wave5-08 /progress mastery view"
echo "NOTE: run 'npm run audit:browser' against the non-localhost origin to verify the page renders for a logged-in user."
