#!/usr/bin/env bash
# wave19d-03: CATEGORY_B_BLUEPRINT is the official 4 strata; pure bucketing/quota pins green.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

BP="lib/exam-blueprint.ts"

# 4-strata block keys present; old keys gone.
for k in '"structure"' '"safety"' '"medical"' '"pdr"'; do
  grep -q "$k" "$BP" || { echo "FAIL: blueprint missing block key $k"; exit 1; }
done
if grep -qE 'key:\s*"(medicine|law|general)"' "$BP"; then
  echo "FAIL: old 6-block key (medicine/law/general) still present in blueprint"; exit 1
fi
# Fixed counts, no range on the mandatory blocks.
grep -qE 'range:' "$BP" && { echo "FAIL: a blueprint block still uses a range (official quotas are fixed)"; exit 1; } || true

# Purity: no server/db/clock/random tokens in the pure blueprint module.
if grep -nE 'server-only|@/lib/db|@prisma/client|lib/generated|Math\.random|Date\.now|new Date' "$BP"; then
  echo "FAIL: purity violation in $BP"; exit 1
fi

npm run -s typecheck

# Pure unit tests (the blueprint bucketing/quota pins ran); confirm the file is collected + passes.
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
LIST="$(vitest_list 'exam-blueprint.test')"
grep -q 'exam-blueprint.test' <<<"$LIST" || { echo "FAIL: exam-blueprint.test not collected"; exit 1; }

npm run -s test

echo "PASS: wave19d-03"
