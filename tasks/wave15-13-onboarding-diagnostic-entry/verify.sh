#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
O='app/(app)/onboarding/page.tsx'
D='app/(app)/dashboard/page.tsx'
grep -qF -e 'Дай нам 3 хвилини' "$O" || { echo "FAIL: onboarding CTA copy missing"; exit 1; }
grep -qF -e 'value="DIAGNOSTIC"' "$O" || { echo "FAIL: onboarding DIAGNOSTIC start form missing"; exit 1; }
grep -qF -e 'Пропустити' "$O" || { echo "FAIL: skip path removed"; exit 1; }
grep -RqE 'DIAGNOSTIC' "$D" components/ || { echo "FAIL: dashboard diagnostic nudge missing"; exit 1; }
# completed-guard derives from the session table (page or the server helper it imports)
grep -RqE 'DIAGNOSTIC' app/ lib/server/ >/dev/null || { echo "FAIL: no guard query"; exit 1; }
grep -RlE 'DIAGNOSTIC' app/ lib/server/ | xargs grep -lE 'COMPLETED' | grep -q . || { echo "FAIL: completed-DIAGNOSTIC guard query not found"; exit 1; }
git diff --name-only | grep -Eq 'prisma/schema\.prisma|prisma/migrations' && { echo "FAIL: schema change forbidden"; exit 1; }
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npm test || { echo "FAIL: unit board"; exit 1; }
# ── browser presence asserts (no click-start; see journal) ──
B="${DRIVER_BROWSER_CMD:?DRIVER_BROWSER_CMD not set}"
ORIGIN="${AUDIT_ORIGIN:-http://100.110.64.90:3100}"
$B open "$ORIGIN/login" >/dev/null
$B eval 'const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;const e=document.querySelector("input[name=email]");const p=document.querySelector("input[name=password]");set.call(e,"user@drivers.school");e.dispatchEvent(new Event("input",{bubbles:true}));set.call(p,"User12345");p.dispatchEvent(new Event("input",{bubbles:true}));document.querySelector("form").requestSubmit();' >/dev/null
sleep 3
$B open "$ORIGIN/dashboard" >/dev/null
sleep 2
r="$($B eval 'document.body.textContent.includes("Стартова перевірка") || document.body.textContent.includes("3 хвилини")')"
echo "$r" | grep -q true || { echo "FAIL: dashboard diagnostic card absent for never-completed user"; $B close >/dev/null 2>&1 || true; exit 1; }
$B open "$ORIGIN/onboarding?step=2" >/dev/null
sleep 2
r="$($B eval 'document.body.textContent.includes("Дай нам 3 хвилини") && Boolean(document.querySelector("input[name=mode][value=DIAGNOSTIC]"))')"
echo "$r" | grep -q true || { echo "FAIL: onboarding CTA not rendered post-category-select"; $B close >/dev/null 2>&1 || true; exit 1; }
$B close >/dev/null 2>&1 || true
echo "OK wave15-13"
