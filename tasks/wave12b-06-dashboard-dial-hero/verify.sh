#!/usr/bin/env bash
# wave12b-06 — dial hero replaces the disagreeing pair; recommend branches.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
D="app/(app)/dashboard/page.tsx"
C="components/readiness-dial.tsx"
[ -f "$C" ] || { echo "FAIL: $C missing"; exit 1; }
# legacy pair gone from the learner dashboard
if grep -nE 'ReadinessMeter|examReadiness' "$D"; then echo "FAIL: legacy readiness display still on dashboard"; exit 1; fi
grep -qE 'getLatestReadiness' "$D" || { echo "FAIL: dashboard must consume getLatestReadiness"; exit 1; }
# admin shadow keeps the legacy view
grep -qE 'export function ReadinessMeter|export const ReadinessMeter' components/ui.tsx || { echo "FAIL: ReadinessMeter export must survive (admin shadow)"; exit 1; }
# dial component contract
grep -qF 'Ще недостатньо даних' "$C" || { echo "FAIL: insufficient-data copy missing"; exit 1; }
grep -qE 'prefers-reduced-motion' "$C" || { echo "FAIL: reduced-motion handling missing"; exit 1; }
grep -qE 'data-testid="readiness-dial"' "$C" || { echo "FAIL: data-testid missing"; exit 1; }
grep -qE 'lens' "$C" || { echo "FAIL: dial card must carry the .lens signature class"; exit 1; }
grep -qE 'READINESS_MIN_SEEN' "$D" || grep -qE 'minSeen' "$C" || { echo "FAIL: threshold progress not wired"; exit 1; }
# purity of the client component (client-bundle law)
if grep -nE '@/lib/db|@/lib/auth|@/lib/rbac|server-only' "$C"; then echo "FAIL: server imports in client dial"; exit 1; fi
# recommend wiring + corrective branch
grep -qE 'recommendAction' "$D" || { echo "FAIL: dashboard must use lib/recommend-action"; exit 1; }
grep -qF 'найслабших тем' "$D" || { echo "FAIL: corrective (weak-topics) copy missing"; exit 1; }
# disclaimer intact on one line
grep -q 'не гарантує' "$D" || { echo "FAIL: legal disclaimer lost"; exit 1; }
npm run typecheck
npm test
npm run build
# guarded browser check
ORIGIN="${DS_AUDIT_ORIGIN:-http://100.110.64.90:3100}"
if [ -n "${DRIVER_BROWSER_CMD:-}" ] && curl -sS -m 6 -o /dev/null "$ORIGIN/login" 2>/dev/null; then
  bash bin/browser-audit.sh >/dev/null 2>&1 || { echo "FAIL: browser audit regressed"; exit 1; }
fi
echo "PASS wave12b-06"
