#!/usr/bin/env bash
# wave12b-05 — setAnswerConfidence follow-up action (production path, self-only).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
A="app/actions/test.ts"
grep -qE 'export async function setAnswerConfidenceAction' "$A" || { echo "FAIL: setAnswerConfidenceAction missing from $A"; exit 1; }
grep -qE 'setAnswerConfidenceSchema' lib/validation.ts || { echo "FAIL: setAnswerConfidenceSchema missing from lib/validation.ts"; exit 1; }
grep -qE '\$transaction' "$A" || { echo "FAIL: confidence dual-update must be transactional"; exit 1; }
T="lib/server/answer-confidence.integration.test.ts"
[ -f "$T" ] || { echo "FAIL: $T missing"; exit 1; }
grep -qE 'reviewLog' "$T" || { echo "FAIL: integration test must assert the ReviewLog row"; exit 1; }
grep -qE 'setAnswerConfidenceAction' "$T" || { echo "FAIL: integration test must call the real action"; exit 1; }
x="$(npx vitest list -c vitest.integration.config.ts 2>/dev/null || true)"
echo "$x" | grep -q "answer-confidence.integration.test.ts" || { echo "FAIL: new integration file not collected"; exit 1; }
npm run typecheck
npm test
npm run db:seed >/dev/null 2>&1 || true
npm run test:integration
echo "PASS wave12b-05"
