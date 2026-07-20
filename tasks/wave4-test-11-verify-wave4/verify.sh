#!/usr/bin/env bash
# verify.sh — wave4-test-11 (full Wave 4 acceptance gate, spec A–D)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
fail() { echo "FAIL: $1"; exit 1; }

# 1. Typecheck.
npm run typecheck 2>&1 | tail -3

# 2. Fast unit suite: zero failures + includes the new session-secret test.
out="$(npm test 2>&1)"; echo "$out" | tail -8
echo "$out" | grep -Eqi "fail" && fail "unit suite reported failures"
ulist="$(npx vitest list 2>/dev/null || true)"
echo "$ulist" | grep -q "lib/session-secret.test.ts" || fail "session-secret.test.ts missing from unit suite"

# 3. Seed then integration suite incl. the four new Wave-4 files + finish-idempotency.
npm run db:seed 2>&1 | tail -2
iout="$(npm run test:integration 2>&1)"; echo "$iout" | tail -12
echo "$iout" | grep -Eqi " failed|✗ " && fail "integration suite reported failures"
echo "$iout" | grep -Eqi "✓|passed" || fail "integration suite did not report passing"
ilist="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
for f in \
  exam-short-pool.integration.test.ts \
  mixed-weak-topics.integration.test.ts \
  saved-excludes-unpublished.integration.test.ts \
  progress-volume.integration.test.ts \
  finish-idempotency.integration.test.ts ; do
  echo "$ilist" | grep -q "$f" || fail "integration file missing from run: $f"
done

# 4. Build.
npm run build 2>&1 | tail -6

# ---- C: smoke ----
S="scripts/smoke.sh"
[ -f "$S" ] || fail "C: $S missing"
[ -x "$S" ] || fail "C: $S not executable"
bash -n "$S" || fail "C: $S syntax error"
grep -q "mint-cookie.ts" "$S" || fail "C: smoke does not reuse mint-cookie.ts"
grep -q "ds_session" "$S" || fail "C: smoke does not set ds_session"
grep -q "/dashboard" "$S" || fail "C: smoke does not check /dashboard"
grep -q "/admin" "$S" || fail "C: smoke does not check /admin"
grep -q "PASS" "$S" && grep -q "FAIL" "$S" || fail "C: smoke does not print PASS/FAIL"
grep -q "smoke" package.json && fail "C: smoke must not be wired into package.json" || true
grep -Eqi '^#+ .*smoke' README.md || fail "C: README has no smoke section"
grep -q "scripts/smoke.sh" README.md || fail "C: README does not name scripts/smoke.sh"
grep -q "SMOKE_BASE_URL" README.md || fail "C: README does not document SMOKE_BASE_URL"

# ---- D: polish ----
SRC="lib/session-secret.ts"; AUTH="lib/auth.ts"; MIST="app/(app)/mistakes/page.tsx"
[ -f "$SRC" ] || fail "D: $SRC missing"
grep -Eq "export (function|const) resolveSessionSecret" "$SRC" || fail "D: resolveSessionSecret not exported"
grep -E '^[[:space:]]*import' "$SRC" | grep -Eq "server-only|@/lib/db|@prisma/client|lib/generated" \
  && fail "D: $SRC imports a non-pure module" || true
grep -q "resolveSessionSecret" "$AUTH" || fail "D: $AUTH not wired to resolveSessionSecret"
grep -q 'dev-only-insecure-secret' "$AUTH" && fail "D: $AUTH still hardcodes its own fallback" || true
grep -q "MISTAKE_RESOLVE_THRESHOLD" "$MIST" || fail "D: mistakes page does not use MISTAKE_RESOLVE_THRESHOLD"
grep -q '${MISTAKE_RESOLVE_THRESHOLD}' "$MIST" || fail "D: mistakes page does not interpolate the threshold"
grep -qi "вічі" "$MIST" && fail "D: mistakes page still hardcodes 'Двічі'" || true

# 7. Schema unchanged across the wave.
[ -z "$(git status --porcelain prisma/schema.prisma 2>/dev/null)" ] \
  || fail "prisma/schema.prisma is dirty — Wave 4 must not change the schema"
if git rev-parse HEAD >/dev/null 2>&1; then
  git log --oneline -- prisma/schema.prisma 2>/dev/null | grep -Eiq "wave4-test" \
    && fail "a wave4-test commit touched prisma/schema.prisma" || true
fi

echo "PASS: wave4-test-11 — Wave 4 acceptance gate (A–D) green"
