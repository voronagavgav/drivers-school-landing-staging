#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
R=components/test-runner.tsx
grep -q 'extendSessionAction' "$R" || { echo "FAIL: runner does not import extendSessionAction"; exit 1; }
grep -Eq 'from "@?/?lib/server|from "@/lib/db' "$R" && { echo "FAIL: client imports server-graph module"; exit 1; }
grep -qF -e 'Все пройдено' "$R" || { echo "FAIL: missing calm exhaustion state"; exit 1; }
grep -qF -e 'відповідано' "$R" || { echo "FAIL: missing rolling counter copy"; exit 1; }
grep -q 'MARATHON' "$R" || { echo "FAIL: no MARATHON conditionals in runner"; exit 1; }
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npm test || { echo "FAIL: unit board"; exit 1; }
# ── browser smoke ──
B="${DRIVER_BROWSER_CMD:?DRIVER_BROWSER_CMD not set}"
ORIGIN="${AUDIT_ORIGIN:-http://100.110.64.90:3100}"
$B open "$ORIGIN/login" >/dev/null
$B eval 'const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;const e=document.querySelector("input[name=email]");const p=document.querySelector("input[name=password]");set.call(e,"user@drivers.school");e.dispatchEvent(new Event("input",{bubbles:true}));set.call(p,"User12345");p.dispatchEvent(new Event("input",{bubbles:true}));document.querySelector("form").requestSubmit();' >/dev/null
sleep 3
$B open "$ORIGIN/practice" >/dev/null
sleep 2
$B eval 'document.querySelector("input[name=mode][value=MARATHON]").closest("form").querySelector("button").click()' >/dev/null
sleep 3
url="$($B eval 'location.pathname')"
echo "$url" | grep -q '/test/' || { echo "FAIL: MARATHON start did not land in /test/"; $B close >/dev/null 2>&1 || true; exit 1; }
r="$($B eval 'document.body.textContent.includes("відповідано")')"
echo "$r" | grep -q true || { echo "FAIL: rolling counter not rendered"; $B close >/dev/null 2>&1 || true; exit 1; }
r="$($B eval '[...document.querySelectorAll("button")].some(b=>b.textContent.trim()==="Завершити тест")')"
echo "$r" | grep -q true || { echo "FAIL: finish button not always visible"; $B close >/dev/null 2>&1 || true; exit 1; }
$B close >/dev/null 2>&1 || true
echo "OK wave15-11"
