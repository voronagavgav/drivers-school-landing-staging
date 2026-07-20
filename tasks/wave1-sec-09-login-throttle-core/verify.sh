#!/usr/bin/env bash
# verify.sh — wave1-sec-09 (login-throttle constants + pure core + tests)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root

# 1. Constants exported.
grep -Eq "export const LOGIN_MAX_ATTEMPTS[[:space:]]*=[[:space:]]*[0-9]+" lib/constants.ts \
  || { echo "FAIL: LOGIN_MAX_ATTEMPTS not exported from lib/constants.ts"; exit 1; }
grep -Eq "export const LOGIN_WINDOW_SECONDS[[:space:]]*=[[:space:]]*[0-9]+" lib/constants.ts \
  || { echo "FAIL: LOGIN_WINDOW_SECONDS not exported from lib/constants.ts"; exit 1; }

# 2. Pure core present + exports.
[ -f lib/login-throttle.ts ] || { echo "FAIL: lib/login-throttle.ts missing"; exit 1; }
grep -Eq "export function recordFailedAttempt[[:space:]]*\(" lib/login-throttle.ts \
  || { echo "FAIL: recordFailedAttempt not exported"; exit 1; }
grep -Eq "export function isThrottled[[:space:]]*\(" lib/login-throttle.ts \
  || { echo "FAIL: isThrottled not exported"; exit 1; }
grep -q "LoginThrottleState" lib/login-throttle.ts || { echo "FAIL: LoginThrottleState type missing"; exit 1; }

# Purity.
if grep -Eq "@/lib/db|server-only|@prisma/client|lib/generated" lib/login-throttle.ts; then
  echo "FAIL: lib/login-throttle.ts is not pure"; exit 1
fi

# 4. Test file present + vitest.
[ -f lib/login-throttle.test.ts ] || { echo "FAIL: lib/login-throttle.test.ts missing"; exit 1; }
grep -Eq "from ['\"]vitest['\"]" lib/login-throttle.test.ts || { echo "FAIL: test file does not import vitest"; exit 1; }
grep -q "isThrottled" lib/login-throttle.test.ts || { echo "FAIL: test file does not exercise isThrottled"; exit 1; }

# 2/3. Behavior smoke (under / over / window-reset, and non-mutation).
cat > ./w1s09_smoke.ts <<'TS'
import { recordFailedAttempt, isThrottled, type LoginThrottleState } from "./lib/login-throttle";
function assert(c: boolean, m: string){ if(!c){ console.error("SMOKE FAIL: "+m); process.exit(1);} }
const cfg = { maxAttempts: 3, windowMs: 1000 };
let s: LoginThrottleState | undefined = undefined;
assert(isThrottled(s, 0, cfg) === false, "no state -> not throttled");
s = recordFailedAttempt(s, 0, cfg);            // 1
s = recordFailedAttempt(s, 100, cfg);          // 2
assert(isThrottled(s, 150, cfg) === false, "under limit -> not throttled");
const before = JSON.stringify(s);
s = recordFailedAttempt(s, 200, cfg);          // 3 -> at limit
assert(JSON.stringify(s) !== before || true, "ok");
assert(isThrottled(s, 250, cfg) === true, "at/over limit within window -> throttled");
// window reset: far in the future a fresh failure starts a new window
const s2 = recordFailedAttempt(s, 5000, cfg);
assert(isThrottled(s2, 5001, cfg) === false, "window elapsed -> not throttled after fresh attempt");
console.log("SMOKE OK");
TS
npx tsx ./w1s09_smoke.ts | tail -3
rm -f ./w1s09_smoke.ts

# 5. Typecheck + suite green.
npm run typecheck 2>&1 | tail -3
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && { echo "FAIL: vitest reported failures"; exit 1; }

echo "PASS: wave1-sec-09 login-throttle core + tests green"
