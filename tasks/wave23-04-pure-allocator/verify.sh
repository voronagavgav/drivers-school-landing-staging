#!/usr/bin/env bash
# wave23-04: pure allocator impl matches the frozen oracle; oracle un-skipped; purity holds.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

F="lib/exam-allocator.ts"
T="lib/exam-allocator.oracle.test.ts"
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }
[ -f "$T" ] || { echo "FAIL: $T missing"; exit 1; }

# Imports the real dial; does not reimplement PB/mixture/split.
grep -qE "from \"@/lib/readiness-release\"|from '@/lib/readiness-release'" "$F" \
  || { echo "FAIL: must import releaseDial from @/lib/readiness-release"; exit 1; }
if grep -qE "hermegauss|poissonBinomialAtLeast\s*\(.*\)\s*\{|function poissonBinomial|function blockSplit" "$F"; then
  echo "FAIL: allocator must not reimplement PB/mixture/split"; exit 1
fi

# Oracle un-skipped.
if grep -qE "describe\.skip" "$T"; then echo "FAIL: oracle test still suspended (describe.skip)"; exit 1; fi
if grep -qE "@ts-expect-error" "$T"; then echo "FAIL: stale @ts-expect-error directive remains"; exit 1; fi

# Purity (scoped to the allocator file).
if grep -nE "Date\.now|new Date|Math\.random" "$F"; then echo "FAIL: impurity (clock/rng) in allocator"; exit 1; fi
if grep -nE "server-only|@/lib/db|@prisma/client|lib/generated" "$F"; then echo "FAIL: server/db import in pure allocator"; exit 1; fi
if grep -nE "</|/>" "$F"; then echo "FAIL: JSX in pure allocator"; exit 1; fi

echo "=== typecheck ==="; npm run -s typecheck
echo "=== unit ==="; npm test

vitest_list() {
  local req="$1"; shift; local out ok tok toks
  IFS=',' read -ra toks <<<"$req"
  for _ in 1 2 3 4 5; do
    out="$(npx vitest list 2>/dev/null || true)"; ok=1
    for tok in "${toks[@]}"; do grep -q "$tok" <<<"$out" || ok=0; done
    [ "$ok" = 1 ] && break
  done
  printf '%s\n' "$out"
}
LIST="$(vitest_list 'exam-allocator.oracle')"
grep -q "exam-allocator.oracle" <<<"$LIST" || { echo "FAIL: exam-allocator.oracle not collected"; exit 1; }

echo "PASS wave23-04"
