#!/usr/bin/env bash
# wave23-06: compact seed-42 determinism pin — shares runCell with the sim, frozen literal, green in unit suite.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

T="lib/exam-allocator-sim.determinism.test.ts"
[ -f "$T" ] || { echo "FAIL: $T missing"; exit 1; }

grep -qE "@/lib/exam-allocator-sim" "$T" || { echo "FAIL: test must import runCell from @/lib/exam-allocator-sim"; exit 1; }
grep -qE "runCell" "$T" || { echo "FAIL: test must call the shared runCell"; exit 1; }
grep -qE "42" "$T" || { echo "FAIL: seed 42 not present"; exit 1; }
# Must not reach into the tsx runner or fs.
if grep -qE "scripts/spikes|node:fs|from \"fs\"|require\(.fs.\)" "$T"; then echo "FAIL: test reaches into tsx runner / fs"; exit 1; fi
# Frozen-literal assertion present.
grep -qE "toBe\(|toBeCloseTo\(" "$T" || { echo "FAIL: no frozen-literal assertion"; exit 1; }

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
LIST="$(vitest_list 'exam-allocator-sim.determinism')"
grep -q "exam-allocator-sim.determinism" <<<"$LIST" || { echo "FAIL: determinism test not collected"; exit 1; }

echo "PASS wave23-06"
