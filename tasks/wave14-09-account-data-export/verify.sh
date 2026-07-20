#!/usr/bin/env bash
# wave14-09 — data export: full table enumeration, own-data-only, no secrets.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

S=lib/server/data-rights.ts
R="app/(app)/account/data/export/route.ts"
P="app/(app)/account/data/page.tsx"
T=lib/server/data-rights.integration.test.ts
for f in "$S" "$R" "$P" "$T"; do [ -f "$f" ] || { echo "FAIL: $f missing"; exit 1; }; done

grep -qF "exportUserData" "$S" || { echo "FAIL: exportUserData not exported"; exit 1; }
grep -qF "drivers-school-export-v1" "$S" || { echo "FAIL: export format tag missing"; exit 1; }

# every enumerated table key present in the export module
for key in userStudyProfile studyDays reviewStates reviewLogs topicMasteries readinessSnapshots testSessions userMistakes savedQuestions userSettings notificationLog; do
  grep -qF "$key" "$S" || { echo "FAIL: export key $key missing"; exit 1; }
done

# secrets never selected in the export module
if grep -nE 'passwordHash|tokenVersion' "$S"; then
  echo "FAIL: secret field referenced in export module"; exit 1
fi

# route is guarded + a real download
grep -qF "requireUser" "$R" || { echo "FAIL: export route must requireUser"; exit 1; }
grep -qF "Content-Disposition" "$R" || { echo "FAIL: attachment header missing"; exit 1; }

# pinned page copy (analytics exclusion + offline note) and the /account link
grep -qF "телеметрія не входить до експорту" "$P" || { echo "FAIL: analytics exclusion copy missing"; exit 1; }
grep -qF "лише на вашому пристрої" "$P" || { echo "FAIL: offline-data note missing"; exit 1; }
grep -qF "/account/data" "app/(app)/account/page.tsx" || { echo "FAIL: /account must link to /account/data"; exit 1; }

# cross-user + secret assertions actually exist in the test
grep -qF "passwordHash" "$T" || { echo "FAIL: no-passwordHash test assertion missing"; exit 1; }

x="$(npx vitest list -c vitest.integration.config.ts 2>/dev/null || true)"
echo "$x" | grep -q "data-rights.integration.test.ts" || { echo "FAIL: integration test not collected"; exit 1; }

m="$(find prisma/migrations -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
[ "$m" = "9" ] || { echo "FAIL: migration dir count $m != 9"; exit 1; }

npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }
npm run -s test || { echo "FAIL: unit tests"; exit 1; }
npm run -s test:integration || { echo "FAIL: integration suite"; exit 1; }
npm run -s build || { echo "FAIL: build"; exit 1; }
echo "PASS wave14-09"
