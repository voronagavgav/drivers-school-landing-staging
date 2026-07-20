#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
C=lib/constants.ts
for m in '"QUICK"' '"MARATHON"' '"SIGN_TRAINER"' '"DIAGNOSTIC"'; do
  grep -qF -e "$m" "$C" || { echo "FAIL: TEST_MODES missing $m"; exit 1; }
done
grep -Eq 'STARTABLE_MODES *= *TEST_MODES' "$C" || { echo "FAIL: STARTABLE_MODES != TEST_MODES"; exit 1; }
for l in 'Швидка сесія' 'Марафон' 'Знаки' 'Стартова перевірка'; do
  grep -qF -e "$l" "$C" || { echo "FAIL: MODE_LABEL missing $l"; exit 1; }
done
for k in 'QUICK_COUNT = 10' 'QUICK_NEW_BUDGET = 4' 'QUICK_SOFT_TIME_SEC = 300' 'MARATHON_PAGE = 20' 'SIGN_TRAINER_COUNT = 20' 'SIGN_TRAINER_NEW_BUDGET = 8' 'DIAGNOSTIC_COUNT = 15'; do
  grep -qF -e "$k" "$C" || { echo "FAIL: missing preset constant: $k"; exit 1; }
done
grep -qF -e '"diagnostic_completed"' "$C" || { echo "FAIL: ANALYTICS_EVENTS missing diagnostic_completed"; exit 1; }
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npm test || { echo "FAIL: unit tests"; exit 1; }
echo "OK wave15-02"
