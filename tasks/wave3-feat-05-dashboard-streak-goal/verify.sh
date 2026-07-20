#!/usr/bin/env bash
# verify.sh — wave3-feat-05 (dashboard streak + daily-goal indicator)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
SRV="lib/server/progress.ts"
DASH="app/(app)/dashboard/page.tsx"
fail() { echo "FAIL: $1"; exit 1; }

# 1. Server helper present, returns activity + today count, derives from TestAnswer.
[ -f "$SRV" ] || fail "$SRV missing"
grep -Eq "export (async )?function getStudyActivity" "$SRV" \
  || fail "$SRV does not export getStudyActivity"
grep -q "answeredToday" "$SRV" || fail "$SRV helper does not compute answeredToday"
grep -Eq "testAnswer|answeredAt" "$SRV" || fail "$SRV does not derive activity from TestAnswer/answeredAt"

# 2. Dashboard wires the pure helpers + renders streak & daily-goal.
[ -f "$DASH" ] || fail "$DASH missing"
grep -q "@/lib/streak" "$DASH" || fail "$DASH does not import from @/lib/streak"
grep -q "studyStreak" "$DASH" || fail "$DASH does not call studyStreak"
grep -q "DAILY_GOAL_ANSWERS" "$DASH" || fail "$DASH does not use DAILY_GOAL_ANSWERS"
grep -q "getStudyActivity" "$DASH" || fail "$DASH does not call getStudyActivity"

# No schema change introduced by this task.
git diff --name-only origin/main...HEAD 2>/dev/null | grep -q "prisma/schema.prisma" \
  && fail "prisma/schema.prisma changed — task must not alter the schema" || true
[ -z "$(git status --porcelain prisma/schema.prisma 2>/dev/null)" ] \
  || fail "prisma/schema.prisma is dirty — no schema change allowed"

# 4. Typecheck.
npm run typecheck 2>&1 | tail -3

# 5. Fast unit suite.
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && fail "vitest reported failures"

# 6. Build.
npm run build 2>&1 | tail -6

# Best-effort browser check (served + signed-in user); never hard-fails.
APP_URL="${APP_URL:-http://localhost:3000}"
if [ -n "${DRIVER_BROWSER_CMD:-}" ] && curl -fsS -o /dev/null --max-time 3 "$APP_URL" 2>/dev/null; then
  if "$DRIVER_BROWSER_CMD" open "$APP_URL/dashboard" >/dev/null 2>&1 \
     && "$DRIVER_BROWSER_CMD" get text body 2>/dev/null | grep -Eqi "сері|ціль|мета|/ ?[0-9]"; then
    echo "browser: OK — streak/daily-goal block visible"
  else
    echo "browser: SKIP — could not confirm (unauthenticated/no activity); static gate passed"
  fi
  "$DRIVER_BROWSER_CMD" close >/dev/null 2>&1 || true
else
  echo "browser: SKIP — no DRIVER_BROWSER_CMD or app not served"
fi

echo "PASS: wave3-feat-05 dashboard streak + daily-goal"
