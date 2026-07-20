#!/usr/bin/env bash
# verify.sh — wave1-sec-15 (full Wave 1 security acceptance gate, sections A–F)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
fail() { echo "FAIL: $1"; exit 1; }

# 5. A — validation module pure + wired into every action group.
[ -f lib/validation.ts ] || fail "lib/validation.ts missing"
grep -Eq "@/lib/db|server-only|@prisma/client|lib/generated" lib/validation.ts && fail "lib/validation.ts not pure"
for f in app/actions/auth.ts app/actions/test.ts app/actions/user.ts app/admin/actions.ts; do
  grep -q "@/lib/validation" "$f" || fail "$f does not import @/lib/validation"
  grep -q "safeParse" "$f" || fail "$f does not call .safeParse"
done

# 6. B — throttling.
grep -q "LOGIN_MAX_ATTEMPTS" lib/constants.ts || fail "LOGIN_MAX_ATTEMPTS missing"
grep -q "LOGIN_WINDOW_SECONDS" lib/constants.ts || fail "LOGIN_WINDOW_SECONDS missing"
[ -f lib/login-throttle.ts ] || fail "lib/login-throttle.ts missing"
grep -Eq "@/lib/db|server-only|@prisma/client|lib/generated" lib/login-throttle.ts && fail "login-throttle core not pure"
grep -q "isThrottled" lib/login-throttle.ts || fail "isThrottled missing from core"
[ -f lib/server/login-throttle.ts ] || fail "lib/server/login-throttle.ts missing"
grep -q "isLoginThrottled" app/actions/auth.ts || fail "loginAction not throttled"
grep -qi "кількість спроб" app/actions/auth.ts || fail "Ukrainian throttle message missing"

# 7. C — image sanitise.
[ -f lib/sanitize.ts ] || fail "lib/sanitize.ts missing"
grep -Eq "export function safeImageUrl" lib/sanitize.ts || fail "safeImageUrl not exported"
grep -q "safeImageUrl" components/test-runner.tsx || fail "test-runner does not use safeImageUrl"
grep -Eq "src=\{q\.imageUrl\}" components/test-runner.tsx && fail "test-runner still renders raw src={q.imageUrl}"
grep -q "safeImageUrl" app/admin/actions.ts || fail "admin actions do not use safeImageUrl"
grep -qF "Посилання на зображення має починатися з http:// або https://." app/admin/actions.ts \
  || fail "admin imageUrl rejection message missing"

# 8. D — access control.
[ -f lib/server/access-control.integration.test.ts ] || fail "access-control integration test missing"
calls="$(grep -c "requireContentManager()" app/admin/actions.ts || true)"
[ "${calls:-0}" -ge 12 ] || fail "expected >=12 requireContentManager() calls, got ${calls:-0}"

# 9. E — headers.
grep -Eq "headers[[:space:]]*\(" next.config.ts || fail "next.config.ts has no headers()"
grep -q "X-Content-Type-Options" next.config.ts || fail "nosniff header missing"
grep -Eq "X-Frame-Options|frame-ancestors" next.config.ts || fail "frame protection missing"
grep -q "Referrer-Policy" next.config.ts || fail "Referrer-Policy missing"

# 10. F — correctness.
awk '/export async function finishSession/{f=1} f{print} /^}/{if(f)exit}' lib/server/test-engine.ts \
  | grep -q "IN_PROGRESS" || fail "finishSession has no IN_PROGRESS idempotency guard"
grep -q "useRef" components/test-runner.tsx || fail "test-runner has no useRef finish guard"
[ -f lib/server/finish-idempotency.integration.test.ts ] || fail "finish-idempotency integration test missing"

# 1+2. Typecheck + unit suite (>=8 files, zero failures).
npm run typecheck 2>&1 | tail -3
out="$(npm test 2>&1)"; echo "$out" | tail -8
echo "$out" | grep -Eqi "fail" && fail "unit suite reported failures"
files="$(echo "$out" | grep -Eo "Test Files[[:space:]]+[0-9]+ passed" | grep -Eo "[0-9]+" | head -1)"
[ -n "$files" ] || fail "could not parse unit test-file count"
[ "$files" -ge 8 ] || fail "expected >=8 unit test files, got $files"

# 3. Integration suite.
echo "Running npm run test:integration…"
iout="$(npm run test:integration 2>&1)"; echo "$iout" | tail -12
echo "$iout" | grep -Eqi "[1-9][0-9]* failed" && fail "integration suite reported failures"
echo "$iout" | grep -Eq "Tests[[:space:]]+[0-9]+ passed" || fail "integration suite did not report passing tests"

# 4. Build.
echo "Running npm run build (this can take a while)…"
npm run build 2>&1 | tail -15

echo "PASS: wave1-sec-15 — Wave 1 security batch acceptance met ($files unit test files)"
