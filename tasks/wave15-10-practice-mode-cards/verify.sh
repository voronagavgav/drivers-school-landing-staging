#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
P='app/(app)/practice/page.tsx'
for v in 'value="QUICK"' 'value="MARATHON"' 'value="SIGN_TRAINER"'; do
  grep -qF -e "$v" "$P" || { echo "FAIL: missing hidden mode input $v"; exit 1; }
done
grep -qF -e 'value="DIAGNOSTIC"' "$P" && { echo "FAIL: DIAGNOSTIC must not be a /practice card"; exit 1; }
grep -qF -e '5 хв' "$P" || { echo "FAIL: QUICK card missing the soft ~5 хв hint"; exit 1; }
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
# ── browser (assumes app served; see journal constraints for the restart trap) ──
B="${DRIVER_BROWSER_CMD:?DRIVER_BROWSER_CMD not set}"
ORIGIN="${AUDIT_ORIGIN:-http://100.110.64.90:3100}"
$B open "$ORIGIN/login" >/dev/null
$B eval 'const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set;const e=document.querySelector("input[name=email]");const p=document.querySelector("input[name=password]");set.call(e,"user@drivers.school");e.dispatchEvent(new Event("input",{bubbles:true}));set.call(p,"User12345");p.dispatchEvent(new Event("input",{bubbles:true}));document.querySelector("form").requestSubmit();' >/dev/null
sleep 3
$B open "$ORIGIN/practice" >/dev/null
sleep 2
for label in 'Швидка сесія' 'Марафон' 'Знаки'; do
  r="$($B eval "document.body.textContent.includes(\"$label\")")"
  echo "$r" | grep -q true || { echo "FAIL: /practice missing card text: $label"; $B close >/dev/null 2>&1 || true; exit 1; }
done
for m in QUICK MARATHON SIGN_TRAINER; do
  r="$($B eval "Boolean(document.querySelector('input[name=mode][value=$m]'))")"
  echo "$r" | grep -q true || { echo "FAIL: /practice missing discriminator input for $m"; $B close >/dev/null 2>&1 || true; exit 1; }
done
$B eval 'document.querySelector("input[name=mode][value=QUICK]").closest("form").querySelector("button").click()' >/dev/null
sleep 3
url="$($B eval 'location.pathname')"
echo "$url" | grep -q '/test/' || { echo "FAIL: QUICK start did not land in /test/ (got $url)"; $B close >/dev/null 2>&1 || true; exit 1; }
$B close >/dev/null 2>&1 || true
echo "OK wave15-10"
