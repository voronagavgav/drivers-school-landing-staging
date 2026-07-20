#!/usr/bin/env bash
# wave22-09: content-health exposes + renders Elo β/n + insufficient marker; typecheck/unit/integration green.
# (Live admin browser assert is exercised in the wave verify task 10's audit:browser.)
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

STATS="lib/server/content-stats.ts"
PAGE="app/admin/content-health/page.tsx"

grep -q "eloBeta" "$STATS"        || { echo "FAIL: content-stats must select eloBeta"; exit 1; }
grep -q "eloAnswerCount" "$STATS" || { echo "FAIL: content-stats must select eloAnswerCount"; exit 1; }

grep -q "eloBeta" "$PAGE"                || { echo "FAIL: page must render eloBeta"; exit 1; }
grep -q "ELO_MIN_ITEM_ANSWERS" "$PAGE"   || { echo "FAIL: page must gate marker on ELO_MIN_ITEM_ANSWERS"; exit 1; }
grep -q "requireContentManager" "$PAGE"  || { echo "FAIL: page must keep requireContentManager RBAC"; exit 1; }
grep -q "недостатньо" "$PAGE"            || { echo "FAIL: page must show the insufficient-data marker (недостатньо)"; exit 1; }

# Page stays a server component (no "use client" that would pull the server graph client-side).
if grep -qE '^\s*"use client"' "$PAGE"; then echo "FAIL: content-health page must stay a server component"; exit 1; fi

echo "=== typecheck ==="; npm run -s typecheck
echo "=== npm test ==="; npm test
echo "=== db:seed (before integration) ==="; npm run db:seed
echo "=== integration ==="; npm run test:integration

echo "PASS: wave22-09"
