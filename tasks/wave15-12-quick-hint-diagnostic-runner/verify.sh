#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
R=components/test-runner.tsx
grep -q 'QUICK_SOFT_TIME_SEC' "$R" || { echo "FAIL: hint threshold not from constants"; exit 1; }
grep -q 'quick-soft-hint' "$R" || { echo "FAIL: missing quick-soft-hint element"; exit 1; }
grep -qF -e '5 хвилин' "$R" || { echo "FAIL: hint copy missing"; exit 1; }
grep -q 'DIAGNOSTIC' "$R" || { echo "FAIL: no DIAGNOSTIC withhold gate in runner"; exit 1; }
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npm test || { echo "FAIL: unit board"; exit 1; }
# ── browser smoke: QUICK keeps immediate reveal, has no countdown ──
B="${DRIVER_BROWSER_CMD:?DRIVER_BROWSER_CMD not set}"
ORIGIN="${AUDIT_ORIGIN:-http://100.110.64.90:3100}"
$B open "$ORIGIN/login" >/dev/null
$B eval 'const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;const e=document.querySelector("input[name=email]");const p=document.querySelector("input[name=password]");set.call(e,"user@drivers.school");e.dispatchEvent(new Event("input",{bubbles:true}));set.call(p,"User12345");p.dispatchEvent(new Event("input",{bubbles:true}));document.querySelector("form").requestSubmit();' >/dev/null
sleep 3
$B open "$ORIGIN/practice" >/dev/null
sleep 2
$B eval 'document.querySelector("input[name=mode][value=QUICK]").closest("form").querySelector("button").click()' >/dev/null
sleep 3
r="$($B eval '/[0-9]+:[0-9]{2}/.test(document.body.textContent)')"
echo "$r" | grep -q false || { echo "FAIL: QUICK renders a ticking timer"; $B close >/dev/null 2>&1 || true; exit 1; }
$B eval 'document.querySelector("[role=radio]")?.click()' >/dev/null
sleep 2
r="$($B eval '/Правильно|Неправильно/.test(document.body.textContent)')"
echo "$r" | grep -q true || { echo "FAIL: QUICK immediate reveal broken"; $B close >/dev/null 2>&1 || true; exit 1; }
$B close >/dev/null 2>&1 || true
echo "OK wave15-12"
