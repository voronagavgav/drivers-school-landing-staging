#!/usr/bin/env bash
# wave21-07: dashboard/onboarding consume the clamped quota; audit asserts no multi-day threat copy.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

DASH="app/(app)/dashboard/page.tsx"
ONB="app/(app)/onboarding/page.tsx"
AUDIT="bin/browser-audit.sh"

grep -q "plan.dailyQuota" "$DASH" || { echo "FAIL: dashboard must render plan.dailyQuota"; exit 1; }
grep -q "planMinutes" "$DASH" || { echo "FAIL: dashboard planMinutes missing"; exit 1; }
grep -q "plan.dailyQuota" "$ONB" || { echo "FAIL: onboarding must read plan.dailyQuota"; exit 1; }

# Audit plan-card lane carries the removed-threat negative assertion.
grep -q "Не встигнете за" "$AUDIT" || { echo "FAIL: $AUDIT missing «Не встигнете за» negative assertion"; exit 1; }

echo "=== typecheck ==="
npm run -s typecheck

echo "=== build ==="
npm run build

# Live audit if the origin is reachable; otherwise defer to wave21-08.
ORIGIN="${DRIVER_AUDIT_ORIGIN:-http://100.110.64.90:3100}"
code="$(curl -s -o /dev/null -w '%{http_code}' "$ORIGIN" || true)"
if [ "$code" != "000" ]; then
  echo "=== audit:browser ==="
  npm run audit:browser
else
  echo "SKIPPED live audit: $ORIGIN unreachable (validated in wave21-08 after :3100 restart)"
fi

echo "PASS: wave21-07"
