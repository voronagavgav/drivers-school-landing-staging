#!/usr/bin/env bash
# verify.sh — wave19e-03 repair readiness-correlation stale-guard skip.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

F="lib/server/readiness-correlation.integration.test.ts"

# 1/2. Retired block keys gone; new strata present.
if grep -Eq '\b(medicine|law|general)\b' "$F"; then
  echo "FAIL: retired block key (medicine/law/general) still referenced in $F"; exit 1; fi
for k in structure safety medical pdr; do
  grep -q "$k" "$F" || { echo "FAIL: strata key '$k' not referenced in $F"; exit 1; }
done

# 5. Stale pure-model passProbability reconstruction removed. Anchor on a CALL to the retired pure
# `computeReadiness(` — NOT preceded by a word char (so the live `recomputeReadiness(` production path
# is excluded) and NOT the backticked doc-comment prose that explains the removal (no `(`).
if grep -Eq '(^|[^[:alnum:]_])computeReadiness\(' "$F"; then
  echo "FAIL: retired computeReadiness reconstruction still present in $F"; exit 1; fi

# 6. Suite collected (retry against truncation).
vitest_list() {
  local req="$1"; shift; local out
  for _ in 1 2 3 4 5; do
    out="$(npx vitest list "$@" 2>/dev/null || true)"
    grep -q "$req" <<<"$out" && break
  done
  printf '%s\n' "$out"
}
LIST="$(vitest_list "readiness recompute applies" --config vitest.integration.config.ts "$F")"
grep -q "readiness recompute applies" <<<"$LIST" || { echo "FAIL: correlation suite not collected"; exit 1; }

# 3/4/7. Run green on seeded DB.
npm run db:seed
npx vitest run --config vitest.integration.config.ts "$F"

# 8. typecheck
npm run -s typecheck

echo "PASS wave19e-03"
