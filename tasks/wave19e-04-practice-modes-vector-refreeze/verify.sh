#!/usr/bin/env bash
# verify.sh — wave19e-04 re-freeze DIAGNOSTIC blueprint-spread (e) vs the 4-strata blueprint.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

F="lib/server/practice-modes.integration.test.ts"

# 1/4. Retired keys gone; new strata keys present.
if grep -Eq '\b(medicine|law|general)\b' "$F"; then
  echo "FAIL: retired block key (medicine/law/general) still referenced in $F"; exit 1; fi
for k in structure safety medical pdr; do
  grep -q "c\.$k" "$F" || { echo "FAIL: assertion on c.$k missing in $F"; exit 1; }
done

# 5. Test (e) collected (retry against truncation).
vitest_list() {
  local req="$1"; shift; local out
  for _ in 1 2 3 4 5; do
    out="$(npx vitest list "$@" 2>/dev/null || true)"
    grep -q "$req" <<<"$out" && break
  done
  printf '%s\n' "$out"
}
LIST="$(vitest_list "DIAGNOSTIC blueprint spread" --config vitest.integration.config.ts "$F")"
grep -q "DIAGNOSTIC blueprint spread" <<<"$LIST" || { echo "FAIL: test (e) not collected"; exit 1; }

# 2/3/6. Run green on seeded DB (the ctx.skip must not fire; assertions must pass).
npm run db:seed
npx vitest run --config vitest.integration.config.ts "$F"

# 7. typecheck
npm run -s typecheck

echo "PASS wave19e-04"
