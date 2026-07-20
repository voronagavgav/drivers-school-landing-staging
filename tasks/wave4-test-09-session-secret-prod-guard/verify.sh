#!/usr/bin/env bash
# verify.sh — wave4-test-09 (SESSION_SECRET production guard: pure helper + wiring + tests + build)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
SRC="lib/session-secret.ts"
TST="lib/session-secret.test.ts"
AUTH="lib/auth.ts"
fail() { echo "FAIL: $1"; exit 1; }

# 1. Pure helper exists + exported.
[ -f "$SRC" ] || fail "$SRC missing"
grep -Eq "export (function|const) resolveSessionSecret" "$SRC" || fail "resolveSessionSecret not exported"
# Purity: no server-only / DB / generated-client imports (scope to import lines to avoid doc-comment hits).
grep -E '^[[:space:]]*import' "$SRC" | grep -Eq "server-only|@/lib/db|@prisma/client|lib/generated" \
  && fail "$SRC imports a non-pure module" || true

# 2/3. auth.ts wired to the helper, inline fallback removed.
grep -q "resolveSessionSecret" "$AUTH" || fail "$AUTH does not call resolveSessionSecret"
grep -q '@/lib/session-secret' "$AUTH" || fail "$AUTH does not import @/lib/session-secret"
grep -q 'dev-only-insecure-secret' "$AUTH" && fail "$AUTH still hardcodes its own dev fallback" || true

# 4/5. Unit test present + included in the fast suite.
[ -f "$TST" ] || fail "$TST missing"
grep -q "resolveSessionSecret" "$TST" || fail "$TST does not test resolveSessionSecret"
grep -Eq "production" "$TST" || fail "$TST does not cover the production branch"
grep -Eq "toThrow|throws" "$TST" || fail "$TST does not assert the production throw"
out="$(npm test 2>&1)"; echo "$out" | tail -8
echo "$out" | grep -Eqi "fail" && fail "unit suite reported failures" || true
listing="$(npx vitest list 2>/dev/null || true)"
echo "$listing" | grep -q "lib/session-secret.test.ts" || fail "session-secret.test.ts not in the unit suite"

# 6. Typecheck + build (build must NOT throw despite the guard).
npm run typecheck 2>&1 | tail -3
npm run build 2>&1 | tail -6

echo "PASS: wave4-test-09 SESSION_SECRET production guard"
