#!/usr/bin/env bash
# wave10f-13 verify: ADAPTIVE_REVIEW gated out of startable modes.
set -euo pipefail
cd "$(dirname "$0")/../.."

grep -q "STARTABLE_MODES" lib/constants.ts || { echo "FAIL: STARTABLE_MODES missing in constants"; exit 1; }
grep -q "STARTABLE_MODES" lib/validation.ts || { echo "FAIL: startTestSchema must use STARTABLE_MODES"; exit 1; }
# ADAPTIVE_REVIEW stays in TEST_MODES / labels.
grep -q "ADAPTIVE_REVIEW" lib/constants.ts || { echo "FAIL: ADAPTIVE_REVIEW must remain in TEST_MODES/labels"; exit 1; }

npm test
npm run typecheck
echo "PASS wave10f-13"
