#!/usr/bin/env bash
# verify.sh — wave8-02: demo-retired withholding test deleted; suite still green.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# (1) file gone
[ ! -f lib/server/demo-retired.integration.test.ts ] || { echo "FAIL: demo-retired.integration.test.ts still exists"; exit 1; }

# (2) no other source references the deleted suite by name
if grep -rl "demo-retired" lib/ app/ 2>/dev/null; then
  echo "FAIL: lingering reference to demo-retired under lib/ app/"; exit 1
fi

# (3) integration test list no longer contains it (capture-to-var to avoid SIGPIPE/pipefail)
LIST="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
if echo "$LIST" | grep -q "demo-retired"; then
  echo "FAIL: vitest still lists demo-retired"; exit 1
fi

# (4) typecheck + (5) unit tests green
npm run typecheck
npm test

echo "PASS: wave8-02 demo-retired deleted, suite green"
