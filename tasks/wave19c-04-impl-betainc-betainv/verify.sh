#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."

M=lib/beta-incomplete.ts
T=lib/beta-incomplete.oracle.test.ts
[ -f "$M" ] || { echo "FAIL: $M missing"; exit 1; }

grep -Eq 'export function regularizedIncompleteBeta' "$M" || { echo "FAIL: regularizedIncompleteBeta not exported"; exit 1; }
grep -Eq 'export function betaInv' "$M" || { echo "FAIL: betaInv not exported"; exit 1; }

# purity (scoped to the module file)
grep -Eq 'server-only|@/lib/db|Math\.random|new Date|Date\.now' "$M" && { echo "FAIL: impurity in $M"; exit 1; }

# oracle un-skipped
grep -Eq 'describe\.skip' "$T" && { echo "FAIL: oracle still has describe.skip"; exit 1; }
grep -Eq '@ts-expect-error' "$T" && { echo "FAIL: oracle still has @ts-expect-error guard"; exit 1; }

npm run -s typecheck
npm test

echo "PASS wave19c-04"
