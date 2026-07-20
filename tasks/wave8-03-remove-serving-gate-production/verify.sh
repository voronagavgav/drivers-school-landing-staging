#!/usr/bin/env bash
# verify.sh — wave8-03: serving gate removed from the four production files; behaviour unchanged.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

FILES=(lib/constants.ts lib/server/test-engine.ts lib/server/mastery.ts "app/(app)/practice/page.tsx")

# (1) constant export gone
if grep -qE "export const SERVE_DEMO_QUESTIONS" lib/constants.ts; then
  echo "FAIL: SERVE_DEMO_QUESTIONS still exported in lib/constants.ts"; exit 1
fi

# (5) the four production files are clean of BOTH tokens
for f in "${FILES[@]}"; do
  [ -f "$f" ] || { echo "FAIL: missing $f"; exit 1; }
  if grep -nE "SERVE_DEMO_QUESTIONS|demoWhere" "$f"; then
    echo "FAIL: token still present in $f"; exit 1
  fi
done

# (8) PRESERVE: DEMO source type + validation refine still present
grep -q '"DEMO"' lib/constants.ts || { echo "FAIL: SOURCE_TYPES no longer contains DEMO"; exit 1; }
grep -qE 'sourceType === "DEMO"' lib/validation.ts || { echo "FAIL: validation DEMO<->isDemo refine removed"; exit 1; }

# (6) typecheck + (7) unit tests
npm run typecheck
npm test

echo "PASS: wave8-03 production serving gate removed, data fields preserved, suite green"
