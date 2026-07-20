#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
# migration fn exists and is invoked from registerAction
grep -rq 'claimAnonSession' lib/server app/actions/auth.ts || { echo "FAIL: claimAnonSession missing / not wired"; exit 1; }
grep -q 'claimAnonSession' app/actions/auth.ts || { echo "FAIL: registerAction does not invoke migration"; exit 1; }
# no-IDOR structural guard: the migration must not take an anon-id from arbitrary input.
# Assert it reads the anon-play cookie (own-session) rather than a body/searchParam anon id.
DEF="$(grep -rl 'function claimAnonSession\|claimAnonSession =' lib/server | head -1 || true)"
[ -n "$DEF" ] || { echo "FAIL: cannot locate claimAnonSession definition"; exit 1; }
grep -q 'ds_anon_play\|getAnonPlayCookieName\|getAnonUser' "$DEF" || { echo "FAIL: migration must derive target from the anon cookie, not input"; exit 1; }
# oracle test present + collected, asserts both idempotency and no-IDOR
T=lib/server/anon-migrate.integration.test.ts
[ -f "$T" ] || { echo "FAIL: anon-migrate integration test missing"; exit 1; }
grep -qi 'idempot' "$T" || { echo "FAIL: test must cover idempotency"; exit 1; }
grep -qi 'idor\|untouched\|session B\|sessionB' "$T" || { echo "FAIL: test must cover no-IDOR (session B untouched)"; exit 1; }
grep -q 'registerAction' "$T" || { echo "FAIL: test must drive the REAL registerAction"; exit 1; }
LIST="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
echo "$LIST" | grep -q 'anon-migrate' || { echo "FAIL: anon-migrate test not collected"; exit 1; }
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npm test || { echo "FAIL: unit suite"; exit 1; }
npm run test:integration || { echo "FAIL: integration suite"; exit 1; }
echo "PASS: wave17-05 anon-user migration"
