#!/usr/bin/env bash
# wave14-11 — learning-health: pure outlier oracle + chunked privacy-safe aggregation.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

F=lib/learning-health.ts
T=lib/learning-health.test.ts
S=lib/server/learning-health.ts
I=lib/server/learning-health.integration.test.ts
for f in "$F" "$T" "$S" "$I"; do [ -f "$f" ] || { echo "FAIL: $f missing"; exit 1; }; done

for tok in DIFFICULTY_EXPECTED_ACCURACY DIFFICULTY_OUTLIER_DELTA DIFFICULTY_OUTLIER_MIN_ANSWERS; do
  grep -qF "$tok" lib/constants.ts || { echo "FAIL: constants missing $tok"; exit 1; }
done
grep -qF "DIFFICULTY_OUTLIER_DELTA = 0.25" lib/constants.ts || { echo "FAIL: delta must be 0.25"; exit 1; }
grep -qF "DIFFICULTY_OUTLIER_MIN_ANSWERS = 20" lib/constants.ts || { echo "FAIL: min answers must be 20"; exit 1; }

grep -qF "export function difficultyOutliers" "$F" || { echo "FAIL: difficultyOutliers not exported"; exit 1; }
# purity of the pure module
if grep -nE 'server-only|@/lib/db|@prisma/client|lib/generated|Math\.random|Date\.now|new Date\(' "$F"; then
  echo "FAIL: purity violation in $F"; exit 1
fi

# frozen oracle literals (planner-pinned): O1 easier 0.9/0.5, O2 harder 0.4, O3 non-outlier, O5 boundary
grep -qF '"easier"' "$T" || { echo "FAIL: easier-direction vector missing"; exit 1; }
grep -qF '"harder"' "$T" || { echo "FAIL: harder-direction vector missing"; exit 1; }
grep -qE 'total: *19' "$T" || { echo "FAIL: O4 below-min-answers exclusion vector missing"; exit 1; }
grep -qE 'total: *20' "$T" || { echo "FAIL: O5 min-answers boundary vector missing"; exit 1; }
grep -qF "0.68" "$T" || { echo "FAIL: O3 non-outlier literal (0.68 vs 0.7) missing"; exit 1; }

# server aggregation contract
grep -qF "getLearningHealth" "$S" || { echo "FAIL: getLearningHealth not exported"; exit 1; }
grep -qF "difficultyOutliers" "$S" || { echo "FAIL: server must use the pure outlier fn"; exit 1; }
grep -qE 'grade *>= *2' "$S" || { echo "FAIL: correct = grade >= 2 mapping missing"; exit 1; }
grep -qF "nudgeVolume7d" "$S" || { echo "FAIL: nudgeVolume7d missing"; exit 1; }
grep -qF "confidenceUptake" "$S" || { echo "FAIL: confidenceUptake missing"; exit 1; }
grep -qF "explanationCoverage" "$S" || { echo "FAIL: explanationCoverage missing"; exit 1; }
# privacy: no user identifiers in the admin aggregate module
if grep -nE 'email' "$S"; then echo "FAIL: user identifier in aggregate module"; exit 1; fi

x="$(npx vitest list 2>/dev/null || true)"
echo "$x" | grep -q "learning-health.test.ts" || { echo "FAIL: pure test not collected"; exit 1; }
y="$(npx vitest list -c vitest.integration.config.ts 2>/dev/null || true)"
echo "$y" | grep -q "learning-health.integration.test.ts" || { echo "FAIL: integration test not collected"; exit 1; }

npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }
npm run -s test || { echo "FAIL: unit tests"; exit 1; }
npm run -s test:integration || { echo "FAIL: integration suite"; exit 1; }
echo "PASS wave14-11"
