#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
C=components/exam-access-offer.tsx
[ -f "$C" ] || { echo "FAIL: exam-access-offer component missing"; exit 1; }
if grep -En 'lib/server|@/lib/db|@/lib/rbac|@/lib/auth' "$C"; then echo "FAIL: offer card imports server graph"; exit 1; fi
# real-%-anchored headline
grep -q 'Ти на' "$C" || { echo "FAIL: real-%-anchored headline «Ти на …» missing"; exit 1; }
# price from constant, not literal
grep -q 'PRICE_UAH' "$C" || { echo "FAIL: price must come from PRICE_UAH constant"; exit 1; }
grep -q 'Без підписки\|не підписка' "$C" || { echo "FAIL: anti-subscription line missing"; exit 1; }
grep -q 'менше за одне заняття' "$C" || { echo "FAIL: honest anchor missing"; exit 1; }
# outcome-named CTA, never «Купити»
grep -q 'Відкрити доступ\|чесний прогноз' "$C" || { echo "FAIL: outcome-named buy CTA missing"; exit 1; }
if grep -q 'Купити' "$C"; then echo "FAIL: forbidden «Купити» CTA present"; exit 1; fi
# DO-NOT tokens absent
if grep -Eq 'ціна діє ще|залишилось [0-9]|купують зараз|було [0-9]|SALE|знижк' "$C"; then echo "FAIL: dark-pattern token present"; exit 1; fi
# no timer driving appearance
if grep -Eq 'setTimeout|setInterval|countdown|Countdown' "$C"; then echo "FAIL: offer appearance appears timer-driven"; exit 1; fi
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npm test || { echo "FAIL: unit suite"; exit 1; }
npm run build || { echo "FAIL: build"; exit 1; }
echo "PASS: wave17-08 value-ask offer card (browser check in wave17-14)"
