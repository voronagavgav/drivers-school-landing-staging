#!/usr/bin/env bash
# verify.sh — wave8-04: the whole lib/+app/ tree is free of the serving-gate tokens (Spec §D-5), suite green.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# (1) canonical §D-5 grep over the whole tree (generated client excluded)
if grep -rnE "SERVE_DEMO_QUESTIONS|demoWhere" lib/ app/ --exclude-dir=generated 2>/dev/null; then
  echo "FAIL: SERVE_DEMO_QUESTIONS/demoWhere still present under lib/ app/"; exit 1
fi

# (3) typecheck + (4) unit tests
npm run typecheck
npm test

# (5) full integration suite green against a freshly seeded (official-only) DB
npm run db:seed
npm run test:integration

echo "PASS: wave8-04 token-free tree, full suite green"
