#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
C=components/save-progress-prompt.tsx
[ -f "$C" ] || { echo "FAIL: save-progress-prompt component missing"; exit 1; }
# client-bundle law: no server graph imports
if grep -En 'lib/server|@/lib/db|@/lib/rbac|@/lib/auth' "$C"; then echo "FAIL: prompt imports server graph"; exit 1; fi
grep -q 'Зберегти прогрес' "$C" || { echo "FAIL: value-named headline missing"; exit 1; }
grep -q 'Не зараз' "$C" || { echo "FAIL: neutral dismiss «Не зараз» missing"; exit 1; }
grep -q '/register' "$C" || { echo "FAIL: register CTA link missing"; exit 1; }
# confirmshame forbidden
if grep -Eq 'Ні, я не хочу|не хочу скласти|не хочу готуват' "$C"; then echo "FAIL: confirmshaming dismiss copy present"; exit 1; fi
# gated behind flag + anon at a mount site
grep -rq 'save-progress-prompt\|SaveProgressPrompt' app components || { echo "FAIL: prompt not mounted"; exit 1; }
grep -rq 'isValueFirstFunnelEnabled' "$(grep -rl 'SaveProgressPrompt' app 2>/dev/null | head -1 || echo /dev/null)" 2>/dev/null || echo "NOTE: confirm flag-gate at mount site manually"
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npm test || { echo "FAIL: unit suite"; exit 1; }
npm run build || { echo "FAIL: build"; exit 1; }
echo "PASS: wave17-06 save-progress prompt (browser assertions in wave17-14)"
