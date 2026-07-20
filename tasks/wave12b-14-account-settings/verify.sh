#!/usr/bin/env bash
# wave12b-14 — account settings: exam date, daily goal, glass tier, streak view.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
U="lib/server/user-settings.ts"
A="app/(app)/account/page.tsx"
grep -qE 'export async function setGlassTierAction' "$U" || { echo "FAIL: setGlassTierAction missing"; exit 1; }
grep -qE '"auto"' "$U" && grep -qE '"real"' "$U" && grep -qE '"emulated"' "$U" && grep -qE '"solid"' "$U" || { echo "FAIL: tier enum incomplete"; exit 1; }
T="lib/server/glass-tier-setting.integration.test.ts"
[ -f "$T" ] || { echo "FAIL: $T missing"; exit 1; }
x="$(npx vitest list -c vitest.integration.config.ts 2>/dev/null || true)"
echo "$x" | grep -q "glass-tier-setting.integration.test.ts" || { echo "FAIL: integration file not collected"; exit 1; }
files="$A components/account-forms.tsx"
grep -qF 'Дата іспиту' $files || { echo "FAIL: exam-date form missing"; exit 1; }
grep -qF 'Денна ціль' $files || { echo "FAIL: daily-goal form missing"; exit 1; }
grep -qF 'Скляні ефекти' $files || { echo "FAIL: glass-tier setting missing"; exit 1; }
grep -qE 'setExamDateAction' $files || { echo "FAIL: setExamDateAction not wired"; exit 1; }
grep -qE 'setDailyGoalAction' $files || { echo "FAIL: setDailyGoalAction not wired"; exit 1; }
grep -qE 'setGlassTierAction' $files || { echo "FAIL: setGlassTierAction not wired"; exit 1; }
grep -qE 'freezeTokens|вихідн' $files || { echo "FAIL: streak/вихідний view missing"; exit 1; }
npm run typecheck
npm test
npm run build
npm run db:seed >/dev/null 2>&1 || true
npm run test:integration
echo "PASS wave12b-14"
