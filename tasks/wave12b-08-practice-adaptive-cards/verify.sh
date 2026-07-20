#!/usr/bin/env bash
# wave12b-08 — adaptive family on /practice + due badge + calm nothing-due state.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
P="app/(app)/practice/page.tsx"
S="lib/server/study.ts"
grep -qE 'export async function countDueReviews' "$S" || { echo "FAIL: countDueReviews missing from $S"; exit 1; }
grep -qE 'ADAPTIVE_REVIEW' "$P" || { echo "FAIL: adaptive card missing"; exit 1; }
grep -qE 'SPACED_REVIEW' "$P" || { echo "FAIL: spaced card missing"; exit 1; }
grep -qE 'countDueReviews' "$P" || { echo "FAIL: due badge not wired"; exit 1; }
grep -qE 'MODE_LABEL' "$P" || { echo "FAIL: card titles must come from MODE_LABEL"; exit 1; }
# order: adaptive < spaced < mixed < topic grid
a="$(grep -nE 'ADAPTIVE_REVIEW' "$P" | head -1 | cut -d: -f1)"
s="$(grep -nE 'SPACED_REVIEW' "$P" | head -1 | cut -d: -f1)"
m="$(grep -nE 'MIXED_PRACTICE' "$P" | head -1 | cut -d: -f1)"
t="$(grep -nE 'TOPIC_PRACTICE' "$P" | head -1 | cut -d: -f1)"
{ [ "$a" -lt "$s" ] && [ "$s" -lt "$m" ] && [ "$m" -lt "$t" ]; } || { echo "FAIL: card order must be adaptive, spaced, mixed, topics (got $a/$s/$m/$t)"; exit 1; }
# calm nothing-due state on /practice
grep -qF "пам'ять ще тримає" "$P" || { echo "FAIL: calm nothing-due copy missing"; exit 1; }
grep -qF "Повернись завтра" "$P" || { echo "FAIL: calm nothing-due copy (return tomorrow) missing"; exit 1; }
grep -qE '<Svitlyk' "$P" || { echo "FAIL: calm state must include Svitlyk"; exit 1; }
grep -qE 'practice\?empty=SPACED_REVIEW' app/actions/test.ts || { echo "FAIL: NothingDueError must redirect to /practice?empty=SPACED_REVIEW"; exit 1; }
npm run typecheck
npm test
npm run build
npm run db:seed >/dev/null 2>&1 || true
npm run test:integration
ORIGIN="${DS_AUDIT_ORIGIN:-http://100.110.64.90:3100}"
if [ -n "${DRIVER_BROWSER_CMD:-}" ] && curl -sS -m 6 -o /dev/null "$ORIGIN/login" 2>/dev/null; then
  bash bin/browser-audit.sh >/dev/null 2>&1 || { echo "FAIL: browser audit regressed"; exit 1; }
fi
echo "PASS wave12b-08"
