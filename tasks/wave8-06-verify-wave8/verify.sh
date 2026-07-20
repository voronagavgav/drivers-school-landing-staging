#!/usr/bin/env bash
# verify.sh — wave8-06: the Wave-8 acceptance gate (Spec §D). VERIFY-ONLY; exit 0 = wave done.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

echo "== §D-1 typecheck =="
npm run typecheck

echo "== §D-2 unit tests =="
npm test

echo "== §D-3 seed (official-only) + integration =="
npm run db:seed
npm run test:integration
LIST="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
if echo "$LIST" | grep -q "demo-retired"; then
  echo "FAIL §D-3: integration suite still lists demo-retired"; exit 1
fi

echo "== §D-4 build =="
npm run build

echo "== §D-5 token-free tree =="
if grep -rnE "SERVE_DEMO_QUESTIONS|demoWhere" lib/ app/ --exclude-dir=generated 2>/dev/null; then
  echo "FAIL §D-5: SERVE_DEMO_QUESTIONS/demoWhere still present under lib/ app/"; exit 1
fi

echo "== §D-6 data fields + validation refine preserved =="
grep -q "isDemo" prisma/schema.prisma     || { echo "FAIL §D-6: Question.isDemo column removed from schema"; exit 1; }
grep -q "sourceType" prisma/schema.prisma || { echo "FAIL §D-6: Question.sourceType column removed from schema"; exit 1; }
grep -q '"DEMO"' lib/constants.ts          || { echo "FAIL §D-6: SOURCE_TYPES no longer contains DEMO"; exit 1; }
grep -qE 'sourceType === "DEMO"' lib/validation.ts || { echo "FAIL §D-6: validation DEMO<->isDemo refine removed"; exit 1; }

echo "GATE PASS: Wave-8 acceptance gate green"
