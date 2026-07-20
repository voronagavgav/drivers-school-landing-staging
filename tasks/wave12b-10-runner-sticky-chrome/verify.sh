#!/usr/bin/env bash
# wave12b-10 — sticky runner chrome (header + phone bottom bar).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
R="components/test-runner.tsx"
grep -qE 'sticky top-0' "$R" || { echo "FAIL: sticky header missing"; exit 1; }
grep -qE 'MODE_LABEL' "$R" || { echo "FAIL: header must show the mode label"; exit 1; }
grep -qE '(sticky|fixed) bottom-0' "$R" || { echo "FAIL: phone bottom action bar missing"; exit 1; }
grep -qE 'sm:(static|relative|hidden)' "$R" || { echo "FAIL: bottom bar must reset at sm: (desktop inline)"; exit 1; }
grep -qE 'min-h-11|h-11|h-12|py-3' "$R" || { echo "FAIL: 44px touch targets missing"; exit 1; }
# roving + finish confirm preserved
grep -qE 'onOptionsKeyDown|ArrowDown' "$R" || { echo "FAIL: arrow roving lost"; exit 1; }
grep -qE 'confirming|Завершити' "$R" || { echo "FAIL: finish flow lost"; exit 1; }
npm run typecheck
npm test
npm run build
ORIGIN="${DS_AUDIT_ORIGIN:-http://100.110.64.90:3100}"
if [ -n "${DRIVER_BROWSER_CMD:-}" ] && curl -sS -m 6 -o /dev/null "$ORIGIN/login" 2>/dev/null; then
  bash bin/browser-audit.sh >/dev/null 2>&1 || { echo "FAIL: browser audit regressed"; exit 1; }
fi
echo "PASS wave12b-10"
