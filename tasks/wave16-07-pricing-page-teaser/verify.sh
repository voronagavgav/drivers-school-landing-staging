#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
P=app/\(app\)/pricing/page.tsx
[ -f "$P" ] || { echo "FAIL: pricing page missing"; exit 1; }
grep -q 'PRICE_UAH' "$P" || { echo "FAIL: page must read PRICE_UAH constant"; exit 1; }
if grep -Eq '399' "$P"; then echo "FAIL: literal 399 hardcoded in page (must come from constants)"; exit 1; fi
grep -q 'прогрес не зникає' "$P" || { echo "FAIL: trust band item 1 missing"; exit 1; }
grep -q 'без автосписань' "$P" || { echo "FAIL: trust band item 2 missing"; exit 1; }
grep -q 'одна ціна' "$P" || { echo "FAIL: trust band item 3 missing"; exit 1; }
grep -q 'COPY-PENDING-L1' "$P" || { echo "FAIL: completion-offer draft not marked COPY-PENDING-L1"; exit 1; }
T=components/entitlement-teaser.tsx
[ -f "$T" ] || { echo "FAIL: teaser component missing"; exit 1; }
if grep -En 'lib/server|@/lib/db|@/lib/rbac|@/lib/auth' "$T"; then echo "FAIL: teaser imports server graph"; exit 1; fi
grep -q '/pricing' "$T" || { echo "FAIL: teaser missing /pricing link"; exit 1; }
grep -rq 'pricing_interest' app components lib/client || { echo "FAIL: pricing_interest CTA wiring missing"; exit 1; }
IT="$(grep -rl 'pricing_interest' lib --include='*.integration.test.ts' | head -1 || true)"
[ -n "$IT" ] || { echo "FAIL: no integration test for pricing_interest landing"; exit 1; }
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npm test || { echo "FAIL: unit suite"; exit 1; }
npm run test:integration || { echo "FAIL: integration suite"; exit 1; }
npm run build || { echo "FAIL: build"; exit 1; }
# Live checks (assumes LAN server restarted on the fresh build; seeded user creds)
ORIGIN="${AUDIT_ORIGIN:-http://100.110.64.90:3100}"
code="$(curl -s -o /dev/null -w '%{http_code}' "$ORIGIN/pricing" || true)"
if [ "$code" = "000" ]; then
  echo "WARN: app server not reachable at $ORIGIN — live checks skipped (run audit before done-claim)"
else
  [ "$code" != "200" ] || { echo "FAIL: /pricing served 200 unauthenticated (should redirect to login)"; exit 1; }
  if [ -n "${DRIVER_BROWSER_CMD:-}" ]; then
    "$DRIVER_BROWSER_CMD" open "$ORIGIN/login"
    # Log in only if not already authenticated (an existing session redirects /login → /dashboard,
    # so the email input is absent — guard against a null deref and skip the fill in that case).
    "$DRIVER_BROWSER_CMD" eval 'const e=document.querySelector("input[name=email]"); if(e){e.value="user@drivers.school"; document.querySelector("input[type=password]").value="User12345"; document.querySelector("form button[type=submit]").click();} true'
    sleep 2
    "$DRIVER_BROWSER_CMD" open "$ORIGIN/pricing"
    txt="$("$DRIVER_BROWSER_CMD" eval 'document.querySelector("main").textContent' || true)"
    echo "$txt" | grep -q '399' || { echo "FAIL: price 399 not rendered on /pricing"; exit 1; }
    echo "$txt" | grep -q 'Доступ до іспиту' || { echo "FAIL: plan name not rendered"; exit 1; }
    "$DRIVER_BROWSER_CMD" close || true
  fi
fi
echo "OK wave16-07"
