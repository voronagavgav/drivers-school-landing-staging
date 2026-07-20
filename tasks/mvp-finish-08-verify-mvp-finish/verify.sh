#!/usr/bin/env bash
# verify.sh — mvp-finish-08 (full batch acceptance gate: Parts A + B)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
DASH="app/(app)/dashboard/page.tsx"
ADMIN_PAGE="app/admin/questions/page.tsx"

fail() { echo "FAIL: $1"; exit 1; }

# 1+2. Typecheck + full suite (5 files / >=37, zero failures).
npm run typecheck 2>&1 | tail -3
out="$(npm test 2>&1)"; echo "$out" | tail -8
echo "$out" | grep -Eqi "fail" && fail "vitest reported failures"
files="$(echo "$out" | grep -Eo "Test Files[[:space:]]+[0-9]+ passed" | grep -Eo "[0-9]+" | head -1)"
passed="$(echo "$out" | grep -Eo "Tests[[:space:]]+[0-9]+ passed" | grep -Eo "[0-9]+" | head -1)"
[ -n "$files" ] && [ -n "$passed" ] || fail "could not parse vitest counts"
[ "$files" -ge 5 ]   || fail "expected >=5 test files, got $files"
[ "$passed" -ge 37 ] || fail "expected >=37 passing tests, got $passed"

# 3. Part A pure logic present + pure.
[ -f lib/question-stats.ts ] || fail "lib/question-stats.ts missing"
grep -Eq "export function summarizeQuestionPerformance[[:space:]]*\(" lib/question-stats.ts \
  || fail "summarizeQuestionPerformance not exported"
grep -Eq "@/lib/db|server-only|@prisma/client|lib/generated" lib/question-stats.ts \
  && fail "lib/question-stats.ts is not pure"

# 4. Part A tests present.
[ -f lib/question-stats.test.ts ] || fail "lib/question-stats.test.ts missing"
grep -q "summarizeQuestionPerformance" lib/question-stats.test.ts || fail "tests don't reference the fn"

# 5. Part A server aggregation present + delegates to pure fn.
grep -Eq "export (async )?function getQuestionPerformance" lib/server/admin.ts \
  || fail "getQuestionPerformance not exported from lib/server/admin.ts"
grep -q "summarizeQuestionPerformance" lib/server/admin.ts || fail "admin.ts doesn't use the pure fn"

# 6. Part A UI present.
grep -q "getQuestionPerformance" "$ADMIN_PAGE" || fail "$ADMIN_PAGE doesn't call getQuestionPerformance"
grep -q "timesAnswered" "$ADMIN_PAGE" || fail "$ADMIN_PAGE doesn't render timesAnswered"
grep -q "%" "$ADMIN_PAGE" || fail "$ADMIN_PAGE doesn't render a percentage"
grep -q "DemoBadge" "$ADMIN_PAGE" || fail "$ADMIN_PAGE doesn't render DemoBadge"

# 7. Part B server query present.
grep -Eq "export (async )?function getRecentReadinessScores" lib/server/progress.ts \
  || fail "getRecentReadinessScores not exported from lib/server/progress.ts"

# 8. Part B UI present + exact labels.
grep -q "readinessTrend" "$DASH" || fail "$DASH doesn't call readinessTrend"
grep -q "getRecentReadinessScores" "$DASH" || fail "$DASH doesn't call getRecentReadinessScores"
for lbl in "Динаміка: вгору" "Динаміка: вниз" "Динаміка: стабільно"; do
  grep -rqF "$lbl" "$DASH" lib/progress.ts || fail "trend label missing: $lbl"
done

# 9. Schema unchanged by this batch: no mvp-finish commit touched it, and no dirty schema edit.
if git log --pretty=%s -- prisma/schema.prisma 2>/dev/null | grep -qi "mvp-finish"; then
  fail "a mvp-finish commit modified prisma/schema.prisma"
fi
git diff --quiet -- prisma/schema.prisma 2>/dev/null || fail "uncommitted change to prisma/schema.prisma"
git diff --cached --quiet -- prisma/schema.prisma 2>/dev/null || fail "staged change to prisma/schema.prisma"

# 10. Optional browser checks (guarded; never hard-fail the gate).
APP_URL="${APP_URL:-http://localhost:3000}"
if [ -n "${DRIVER_BROWSER_CMD:-}" ] && curl -fsS -o /dev/null --max-time 3 "$APP_URL" 2>/dev/null; then
  for path in "/dashboard:Динаміка:" "/admin/questions:Статистика"; do
    url="${path%%:*}"; needle="${path#*:}"
    if "$DRIVER_BROWSER_CMD" open "$APP_URL$url" >/dev/null 2>&1 \
       && "$DRIVER_BROWSER_CMD" get text body 2>/dev/null | grep -q "$needle"; then
      echo "browser: OK $url"
    else
      echo "browser: SKIP $url (likely unauthenticated)"
    fi
  done
  "$DRIVER_BROWSER_CMD" close >/dev/null 2>&1 || true
else
  echo "browser: SKIP — no DRIVER_BROWSER_CMD or app not served"
fi

echo "PASS: mvp-finish batch acceptance met ($files files / $passed tests)"
