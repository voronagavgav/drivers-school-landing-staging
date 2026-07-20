#!/usr/bin/env bash
# wave12b-17 — browser-audit W12b extensions.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
A="bin/browser-audit.sh"
bash -n "$A"
grep -qE 'audit-.*@drivers\.school|audit\+' "$A" || { echo "FAIL: fresh-user registration lane missing"; exit 1; }
grep -qF 'Ще недостатньо даних' "$A" || { echo "FAIL: dial insufficient-data assertion missing"; exit 1; }
grep -qF "пам'ять ще тримає" "$A" || { echo "FAIL: SPACED calm-state assertion missing"; exit 1; }
grep -qF 'Розумне повторення' "$A" || { echo "FAIL: plan-card ADAPTIVE_REVIEW assertion missing"; exit 1; }
grep -qF 'Найбільше помилок у темах' "$A" || { echo "FAIL: result topic-summary assertion missing"; exit 1; }
# pre-existing assertions preserved
grep -qE 'aria-current' "$A" || { echo "FAIL: tab-capsule assertion lost"; exit 1; }
grep -qE 'Правильно|Неправильно' "$A" || { echo "FAIL: 2b answer-loop assertion lost"; exit 1; }
grep -qE 'browser audit: .*passed' "$A" || { echo "FAIL: summary line lost"; exit 1; }
# live run when the server is reachable
ORIGIN="${DS_AUDIT_ORIGIN:-http://100.110.64.90:3100}"
if curl -sS -m 6 -o /dev/null "$ORIGIN/login" 2>/dev/null; then
  bash "$A" || { echo "FAIL: live audit run failed"; exit 1; }
else
  echo "NOTE: server unreachable — live audit skipped (static checks only)"
fi
echo "PASS wave12b-17"
