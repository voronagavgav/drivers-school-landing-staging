#!/usr/bin/env bash
# verify.sh — wave19e-02 un-suspend + rewrite mock-anchor direction suite (§4).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

F="lib/server/readiness-snapshot.integration.test.ts"

# 1. No suspension markers remain (describe.skip / it.skip / .skip( ). Graceful guards use `if (!x) return;`.
if grep -Eq 'describe\.skip|it\.skip|\.skip\(' "$F"; then
  echo "FAIL: a .skip marker still present in $F"; exit 1; fi

# 3. Reference must be the RELEASE model / zero-mock baseline, NOT the retired pure-model helper.
if grep -q "pureModelDial" "$F"; then
  echo "FAIL: retired pureModelDial helper still present — use release-model reconstruction"; exit 1; fi

# 2. §4 test is collected (retry until the required token appears — vitest list can truncate).
vitest_list() {
  local req="$1"; shift; local out ok
  for _ in 1 2 3 4 5; do
    out="$(npx vitest list "$@" 2>/dev/null || true)"
    ok=1; grep -q "$req" <<<"$out" || ok=0
    [ "$ok" = 1 ] && break
  done
  printf '%s\n' "$out"
}
LIST="$(vitest_list "mock-anchor direction" --config vitest.integration.config.ts "$F")"
grep -q "mock-anchor direction" <<<"$LIST" || { echo "FAIL: §4 mock-anchor direction test not collected"; exit 1; }

# 7/4/5. Run the file green on the seeded DB.
npm run db:seed
npx vitest run --config vitest.integration.config.ts "$F"

# 8. typecheck
npm run -s typecheck

echo "PASS wave19e-02"
