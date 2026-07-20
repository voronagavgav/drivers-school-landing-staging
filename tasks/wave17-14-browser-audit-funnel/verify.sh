#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
AUD=bin/browser-audit.sh
[ -f "$AUD" ] || { echo "FAIL: browser-audit.sh missing"; exit 1; }
# wave-17 section markers present
grep -qi 'wave-17\|wave17\|value-first\|anon.*play\|funnel' "$AUD" || { echo "FAIL: no wave-17 funnel section in audit"; exit 1; }
grep -q 'Зберегти прогрес' "$AUD" || { echo "FAIL: audit missing save-prompt assertion"; exit 1; }
grep -q 'Ти на' "$AUD" || { echo "FAIL: audit missing value-ask assertion"; exit 1; }
# script parses
bash -n "$AUD" || { echo "FAIL: browser-audit.sh syntax error"; exit 1; }
# live run when reachable + flag set
ORIGIN="${AUDIT_ORIGIN:-http://100.110.64.90:3100}"
code="$(curl -s -o /dev/null -w '%{http_code}' "$ORIGIN/" || true)"
if [ "$code" = "000" ]; then
  echo "WARN: server not reachable at $ORIGIN — live funnel audit skipped; MUST run before closing the wave"
else
  if [ -n "${DRIVER_BROWSER_CMD:-}" ] && [ "${VALUE_FIRST_FUNNEL:-}" = "true" ]; then
    DRIVER_BROWSER_CMD="$DRIVER_BROWSER_CMD" bash "$AUD" "$ORIGIN" || { echo "FAIL: browser audit failed"; exit 1; }
  else
    echo "WARN: DRIVER_BROWSER_CMD unset or VALUE_FIRST_FUNNEL!=true — live funnel section skipped; run it with the flag on before closing the wave"
  fi
fi
echo "PASS: wave17-14 funnel audit wired (run live before wave close)"
