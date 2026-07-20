#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
# checkout server action
ACT="$(grep -rl 'export async function completeCheckout\|export async function purchaseExamAccess' app lib 2>/dev/null | head -1 || true)"
[ -n "$ACT" ] || { echo "FAIL: completeCheckout/purchaseExamAccess server action missing"; exit 1; }
grep -q 'EXAM_ACCESS' "$ACT" || { echo "FAIL: checkout action does not grant EXAM_ACCESS"; exit 1; }
# server-authoritative: resolves user from session, not from a body field
grep -Eq 'requireUser|getCurrentUser|requireContentManager' "$ACT" || { echo "FAIL: checkout must resolve user server-side"; exit 1; }
# NO real payment provider SDK/HTTP call this wave
if grep -rEni 'liqpay|fondy|stripe\.|checkout\.session|fetch\("https' "$ACT"; then echo "FAIL: real payment-provider call present (must be stubbed)"; exit 1; fi
# checkout UI surface
UI="$(find app -path '*checkout*' -name 'page.tsx' 2>/dev/null | head -1 || true)"
[ -n "$UI" ] || { echo "FAIL: checkout page surface missing"; exit 1; }
grep -q 'Не допомогло — повернемо гроші\|повернемо гроші' "$UI" || { echo "FAIL: honest money-back line missing"; exit 1; }
grep -q 'Відкрити доступ' "$UI" || { echo "FAIL: outcome-named buy CTA missing"; exit 1; }
grep -q 'не підписка\|разовий платіж' "$UI" || { echo "FAIL: anti-subscription microcopy missing"; exit 1; }
if grep -q 'Купити' "$UI"; then echo "FAIL: forbidden «Купити» CTA present"; exit 1; fi
grep -Eq 'inputMode="email"|inputMode=\{"email"\}' "$UI" || { echo "FAIL: email keyboard type missing"; exit 1; }
# integration test present + collected
T=lib/server/checkout.integration.test.ts
[ -f "$T" ] || { echo "FAIL: checkout integration test missing"; exit 1; }
grep -q 'checkIntelligenceAccess' "$T" || { echo "FAIL: test must assert server-granted access"; exit 1; }
LIST="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
echo "$LIST" | grep -q 'checkout' || { echo "FAIL: checkout test not collected"; exit 1; }
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npm test || { echo "FAIL: unit suite"; exit 1; }
npm run test:integration || { echo "FAIL: integration suite"; exit 1; }
npm run build || { echo "FAIL: build"; exit 1; }
echo "PASS: wave17-09 checkout stub + grant"
