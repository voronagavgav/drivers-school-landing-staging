#!/usr/bin/env bash
# verify.sh — wave8-05: shared official-question fixture helper exists, adopted by >=4 suites, suite green.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

H="lib/server/__testutils__/official-question.ts"

# (1) helper exists and exports createOfficialQuestion
[ -f "$H" ] || { echo "FAIL: $H missing"; exit 1; }
grep -qE "export (async )?function createOfficialQuestion|export const createOfficialQuestion" "$H" \
  || { echo "FAIL: $H does not export createOfficialQuestion"; exit 1; }

# (2) helper does not import server-only / @/lib/db (prisma is passed in)
if grep -qE '"server-only"|@/lib/db' "$H"; then
  echo "FAIL: helper must take prisma as a param, not import server-only / @/lib/db"; exit 1
fi

# (4) imported by >=4 integration suites
COUNT="$(grep -rl "__testutils__/official-question" lib/server/*.integration.test.ts 2>/dev/null | wc -l | tr -d ' ')"
[ "${COUNT:-0}" -ge 4 ] || { echo "FAIL: helper adopted by only ${COUNT:-0} suites (<4)"; exit 1; }

# (3) helper is not collected as a test (capture-to-var; avoid SIGPIPE/pipefail)
LIST="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
if echo "$LIST" | grep -q "official-question.ts"; then
  echo "FAIL: helper module is being collected as a test suite"; exit 1
fi

# (8) no tokens reintroduced
if grep -rnE "SERVE_DEMO_QUESTIONS|demoWhere" lib/ app/ --exclude-dir=generated 2>/dev/null; then
  echo "FAIL: serving-gate token reintroduced"; exit 1
fi

# (5) typecheck + (6) unit tests
npm run typecheck
npm test

# (7) full integration suite green against freshly seeded DB
npm run db:seed
npm run test:integration

echo "PASS: wave8-05 shared helper adopted by $COUNT suites, suite green"
