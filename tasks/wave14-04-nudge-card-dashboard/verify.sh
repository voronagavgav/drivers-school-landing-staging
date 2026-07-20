#!/usr/bin/env bash
# wave14-04 — dashboard nudge card: pinned copy, quietness, zero emoji, real dismiss path.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

C=components/nudge-card.tsx
P="app/(app)/dashboard/page.tsx"
[ -f "$C" ] || { echo "FAIL: $C missing"; exit 1; }

grep -qF "computeDueNudges" "$P" || { echo "FAIL: dashboard must call computeDueNudges"; exit 1; }
grep -qF "dismissNudge" "$P" || { echo "FAIL: inline dismiss wrapper missing from dashboard page"; exit 1; }
grep -qF '"use server"' "$P" || { echo "FAIL: dismiss must be an inline use-server wrapper (wave12b-14 pattern)"; exit 1; }

# pinned copy fragments (one distinctive substring per kind + the action name)
grep -qF "картки на повторення" "$C" || { echo "FAIL: REVIEW_DUE copy missing"; exit 1; }
grep -qF "ніж марафон завтра" "$C" || { echo "FAIL: EXAM_COUNTDOWN copy missing"; exit 1; }
grep -qF "я збережу ваш поступ" "$C" || { echo "FAIL: DAY_OFF_OFFER (Svitlyk first-person) copy missing"; exit 1; }
grep -qF "видно, що спрацювало" "$C" || { echo "FAIL: READINESS_MILESTONE copy missing"; exit 1; }
grep -qF "Зрозуміло" "$C" || { echo "FAIL: dismiss action name missing"; exit 1; }

# quietness gates
if grep -nE 'variant="primary"|animate-|border-warn' "$C"; then
  echo "FAIL: nudge card must stay quiet (no primary button / animation / alarm border)"; exit 1
fi
# the card must not be a client component (dismiss is a server-action form)
if grep -qE '^\s*"use client"' "$C"; then echo "FAIL: nudge-card must be a server component"; exit 1; fi

# zero emoji in the nudge surface (tone law): flag emoji/pictograph/dingbat ranges
if perl -CSD -ne 'exit 1 if /[\x{1F000}-\x{1FAFF}\x{2600}-\x{27BF}\x{FE0F}\x{2B00}-\x{2BFF}]/' "$C"; then
  :
else
  echo "FAIL: emoji/pictograph found in $C"; exit 1
fi

npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }
npm run -s test || { echo "FAIL: unit tests"; exit 1; }
npm run -s build || { echo "FAIL: build"; exit 1; }
echo "PASS wave14-04"
