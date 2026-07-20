#!/usr/bin/env bash
# wave10f-04 verify: Easy reachable without a confidence sample; explicit low still vetoes.
set -euo pipefail
cd "$(dirname "$0")/../.."

# The relaxed Easy precondition mentions confidence == null (or an equivalent absence check).
grep -Eq "confidence == null|confidence == undefined|confidence *\?\?|== null" lib/fsrs/grade.ts \
  || { echo "FAIL: deriveGrade must allow Easy when confidence is absent"; exit 1; }

# The updated unit tests are collected.
x="$(npx vitest list 2>/dev/null || true)"
echo "$x" | grep -q "grade" || { echo "FAIL: grade test not collected"; exit 1; }

npm test
npm run typecheck
echo "PASS wave10f-04"
