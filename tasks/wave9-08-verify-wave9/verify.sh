#!/usr/bin/env bash
# verify.sh — wave9-08 (Wave-9 acceptance gate, §F). VERIFY-ONLY; writes no feature code.
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
fail() { echo "FAIL: $1"; exit 1; }
PURE_TOKENS=( 'server-only' '@/lib/db' '@prisma/client' 'lib/generated' 'Math.random' 'Date.now' 'new Date' )

echo "== §F-1 typecheck =="
npm run typecheck 2>&1 | tail -3

echo "== §F-2 unit suite + inclusion =="
ulist="$(npx vitest list 2>/dev/null || true)"
echo "$ulist" | grep -q "lib/content-stats.test.ts" || fail "unit suite missing lib/content-stats.test.ts"
echo "$ulist" | grep -q "lib/content-flags.test.ts" || fail "unit suite missing lib/content-flags.test.ts"
uout="$(npm test 2>&1)"; echo "$uout" | tail -5
echo "$uout" | grep -Eqi "[1-9][0-9]* failed|✗ " && fail "unit suite reported failures" || true

echo "== §F-3 seed + integration suite + inclusion =="
npm run db:seed 2>&1 | tail -3
ilist="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
echo "$ilist" | grep -q "content-stats.integration.test.ts" \
  || fail "integration suite missing content-stats.integration.test.ts"
iout="$(npm run test:integration 2>&1)"; echo "$iout" | tail -14
echo "$iout" | grep -Eqi "[1-9][0-9]* failed|✗ " && fail "integration suite reported failures" || true

echo "== §F-4 build =="
npm run build 2>&1 | tail -8

echo "== §F-5 static surface =="
CS="lib/content-stats.ts"; CF="lib/content-flags.ts"
PAGE="app/admin/content-health/page.tsx"; LAYOUT="app/admin/layout.tsx"
[ -f "$CS" ] || fail "$CS missing"
grep -Eq 'export (function|const) summarizeQuestion\b' "$CS" || fail "$CS must export summarizeQuestion"
[ -f "$CF" ] || fail "$CF missing"
grep -Eq 'export (function|const) flagQuestion\b' "$CF" || fail "$CF must export flagQuestion"
for f in "$CS" "$CF"; do
  for tok in "${PURE_TOKENS[@]}"; do
    grep -Fq "$tok" "$f" && fail "$f contains forbidden token '$tok' (must stay pure)" || true
  done
done
[ -f "$PAGE" ] || fail "$PAGE missing"
grep -q 'requireContentManager' "$PAGE" || fail "$PAGE must call requireContentManager"
grep -q '/admin/content-health' "$LAYOUT" || fail "$LAYOUT missing the content-health nav link"
grep -q 'Якість контенту' "$LAYOUT" || fail "$LAYOUT nav link must be labelled «Якість контенту»"

echo "== §F-5 NO schema change =="
WAVE9_BASE="${WAVE9_BASE:-470cc83}"
git rev-parse --verify "$WAVE9_BASE" >/dev/null 2>&1 \
  || fail "wave base '$WAVE9_BASE' not found — set WAVE9_BASE to the pre-wave commit"
git diff --quiet "$WAVE9_BASE" -- prisma/schema.prisma \
  || fail "prisma/schema.prisma changed since $WAVE9_BASE — wave-9 is compute-on-read (NO schema change)"

echo "GATE PASS: wave9 §F all green (typecheck/unit/integration/build + static surface + no schema change)"
