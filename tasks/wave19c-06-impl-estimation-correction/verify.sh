#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."

M=lib/readiness-estimation.ts
T=lib/readiness-estimation.oracle.test.ts
[ -f "$M" ] || { echo "FAIL: $M missing"; exit 1; }

for fn in effectiveN jeffreysBetaParams correctBlockMeanProb correctedPassProbability; do
  grep -Eq "export function $fn|export const $fn" "$M" || { echo "FAIL: $fn not exported from $M"; exit 1; }
done
# reuses the production DP, not a re-rolled tail
grep -Eq 'poissonBinomialAtLeast' "$M" || { echo "FAIL: must reuse poissonBinomialAtLeast"; exit 1; }
grep -Eq 'betaInv' "$M" || { echo "FAIL: quantile tier must use betaInv from ./beta-incomplete"; exit 1; }

# purity (scoped to module)
grep -Eq 'server-only|@/lib/db|Math\.random|new Date|Date\.now' "$M" && { echo "FAIL: impurity in $M"; exit 1; }

# oracle un-skipped
grep -Eq 'describe\.skip' "$T" && { echo "FAIL: oracle still describe.skip"; exit 1; }
grep -Eq '@ts-expect-error' "$T" && { echo "FAIL: oracle still has @ts-expect-error"; exit 1; }

# honesty regression gate must be UNMODIFIED (not staged/changed by this task)
git diff --name-only HEAD -- lib/readiness-honesty.regression.test.ts | grep -q . \
  && { echo "FAIL: honesty regression test must not be edited"; exit 1; } || true

npm run -s typecheck
npm test

echo "PASS wave19c-06"
