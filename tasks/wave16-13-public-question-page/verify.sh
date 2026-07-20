#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
P='app/q/[key]/page.tsx'
[ -f "$P" ] || { echo "FAIL: public page missing"; exit 1; }
grep -q 'notFound' "$P" || { echo "FAIL: page missing notFound path"; exit 1; }
grep -q 'Правильна відповідь' "$P" || { echo "FAIL: reveal marker string missing"; exit 1; }
if grep -q '"use client"' "$P"; then echo "FAIL: public page must not be a client component"; exit 1; fi
L=lib/server/public-question.ts
[ -f "$L" ] || { echo "FAIL: loader missing"; exit 1; }
grep -q 'isPublished' "$L" || { echo "FAIL: loader missing isPublished predicate"; exit 1; }
grep -q 'archivedAt' "$L" || { echo "FAIL: loader missing archivedAt predicate"; exit 1; }
IT=lib/server/public-question.integration.test.ts
[ -f "$IT" ] || { echo "FAIL: $IT missing"; exit 1; }
grep -q 'archivedAt' "$IT" || { echo "FAIL: archived->404 case untested"; exit 1; }
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npm test || { echo "FAIL: unit suite"; exit 1; }
npm run test:integration || { echo "FAIL: integration suite"; exit 1; }
npm run build || { echo "FAIL: build"; exit 1; }
# Live no-leak checks (assumes LAN server restarted on the fresh build)
ORIGIN="${AUDIT_ORIGIN:-http://100.110.64.90:3100}"
key="$(sqlite3 prisma/dev.db "SELECT questionKey FROM Question WHERE isPublished=1 AND isActive=1 AND archivedAt IS NULL AND questionKey IS NOT NULL LIMIT 1;")"
[ -n "$key" ] || { echo "FAIL: no live questionKey in dev.db"; exit 1; }
code="$(curl -s -o /dev/null -w '%{http_code}' "$ORIGIN/q/$key" || true)"
if [ "$code" = "000" ]; then
  echo "WARN: app server not reachable at $ORIGIN — live checks skipped (must pass before done-claim)"
else
  [ "$code" = "200" ] || { echo "FAIL: /q/$key returned $code logged-out"; exit 1; }
  html="$(curl -s "$ORIGIN/q/$key")"
  echo "$html" | grep -q 'Правильна відповідь' && { echo "FAIL: answer leaked in initial HTML"; exit 1; }
  echo "$html" | grep -q 'isCorrect' && { echo "FAIL: isCorrect serialized in initial HTML"; exit 1; }
  rev="$(curl -s "$ORIGIN/q/$key?v=1")"
  echo "$rev" | grep -q 'Правильна відповідь' || { echo "FAIL: reveal state missing marker"; exit 1; }
  code404="$(curl -s -o /dev/null -w '%{http_code}' "$ORIGIN/q/q_nope_404" || true)"
  [ "$code404" = "404" ] || { echo "FAIL: unknown key returned $code404, want 404"; exit 1; }
fi
echo "OK wave16-13"
