#!/usr/bin/env bash
# wave14-06 — server calibration aggregation + /progress panel with pinned honest copy.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

S=lib/server/calibration.ts
T=lib/server/calibration.integration.test.ts
P="app/(app)/progress/page.tsx"
[ -f "$S" ] || { echo "FAIL: $S missing"; exit 1; }
[ -f "$T" ] || { echo "FAIL: $T missing"; exit 1; }

grep -qF "getCalibrationForUser" "$S" || { echo "FAIL: getCalibrationForUser not exported"; exit 1; }
grep -qF "computeCalibration" "$S" || { echo "FAIL: server module must call the pure computeCalibration"; exit 1; }
grep -qE 'grade *>= *2' "$S" || { echo "FAIL: correct = grade >= 2 mapping missing"; exit 1; }
grep -qE 'take:' "$S" || { echo "FAIL: chunked read (take) missing"; exit 1; }

# pinned copy on the progress page (section title, headline frame, invite, offline exclusion)
grep -qF "Калібрування впевненості" "$P" || { echo "FAIL: section title missing"; exit 1; }
grep -qF "Коли ви впевнені" "$P" || { echo "FAIL: sufficient-state headline missing"; exit 1; }
grep -qF "і побачите, наскільки ваше" "$P" || { echo "FAIL: insufficient invite copy missing"; exit 1; }
grep -qF "не мають оцінки впевненості й сюди не входять" "$P" || { echo "FAIL: offline exclusion note missing"; exit 1; }

# frozen oracle protected
if ! git diff --quiet HEAD -- lib/calibration.test.ts 2>/dev/null; then
  echo "FAIL: lib/calibration.test.ts modified — frozen oracle"; exit 1
fi

# integration oracle literal: expected written independently of the pure fn
grep -qE '10 */ *11' "$T" || { echo "FAIL: 10/11 literal expected value missing from integration test"; exit 1; }

x="$(npx vitest list -c vitest.integration.config.ts 2>/dev/null || true)"
echo "$x" | grep -q "calibration.integration.test.ts" || { echo "FAIL: integration test not collected"; exit 1; }

npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }
npm run -s test || { echo "FAIL: unit tests"; exit 1; }
npm run -s test:integration || { echo "FAIL: integration suite"; exit 1; }
npm run -s build || { echo "FAIL: build"; exit 1; }
echo "PASS wave14-06"
