#!/usr/bin/env bash
# verify.sh — wave1-sec-10 (login throttle wired into loginAction via in-memory store)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
S="lib/server/login-throttle.ts"
A="app/actions/auth.ts"

# 1. Server store present + built on the pure core + constants, server-only.
[ -f "$S" ] || { echo "FAIL: $S missing"; exit 1; }
grep -q "@/lib/login-throttle" "$S" || { echo "FAIL: $S does not use the pure core @/lib/login-throttle"; exit 1; }
grep -Eq "LOGIN_MAX_ATTEMPTS|LOGIN_WINDOW_SECONDS" "$S" || { echo "FAIL: $S does not use the throttle constants"; exit 1; }
grep -q "server-only" "$S" || { echo "FAIL: $S must import server-only"; exit 1; }
grep -q "new Map" "$S" || { echo "FAIL: $S has no in-memory Map store"; exit 1; }
for fn in isLoginThrottled noteLoginFailure clearLoginThrottle; do
  grep -Eq "export function $fn\b" "$S" || { echo "FAIL: $S does not export $fn"; exit 1; }
done

# 2/3. loginAction wires all three.
grep -q "isLoginThrottled" "$A" || { echo "FAIL: loginAction does not check isLoginThrottled"; exit 1; }
grep -q "noteLoginFailure" "$A" || { echo "FAIL: loginAction does not record failures (noteLoginFailure)"; exit 1; }
grep -q "clearLoginThrottle" "$A" || { echo "FAIL: loginAction does not reset on success (clearLoginThrottle)"; exit 1; }

# 4. Ukrainian throttle message present.
grep -qi "кількість спроб" "$A" || { echo "FAIL: $A missing the Ukrainian 'завелика кількість спроб' message"; exit 1; }

# 5. Typecheck + suite green.
npm run typecheck 2>&1 | tail -3
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && { echo "FAIL: vitest reported failures"; exit 1; }

echo "PASS: wave1-sec-10 login throttle wired (store + reset-on-success)"
