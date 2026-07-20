#!/usr/bin/env bash
# wave19d-06: pure factor-mixture module matches the frozen oracle; reuses existing PB DP; oracle un-skipped.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

M="lib/readiness-factor-mixture.ts"
O="lib/readiness-factor-mixture.oracle.test.ts"
[ -f "$M" ] || { echo "FAIL: $M missing"; exit 1; }
[ -f "$O" ] || { echo "FAIL: $O missing (task 02 authors it)"; exit 1; }

# Purity: no server/db/clock/random tokens (comments included).
if grep -nE 'server-only|@/lib/db|@prisma/client|lib/generated|Math\.random|Date\.now|new Date' "$M"; then
  echo "FAIL: purity violation in $M"; exit 1
fi

# Reuse the existing exact PB DP rather than reimplementing it.
grep -q 'poissonBinomialAtLeast' "$M" || { echo "FAIL: module must reuse poissonBinomialAtLeast (existing PB DP)"; exit 1; }

# Oracle un-skipped.
if grep -nE 'describe\.skip|it\.skip|\.skip\(' "$O"; then
  echo "FAIL: $O still has a skipped suite/test (un-skip it)"; exit 1
fi

npm run -s typecheck

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
LIST="$(vitest_list 'readiness-factor-mixture.oracle')"
grep -q 'readiness-factor-mixture.oracle' <<<"$LIST" || { echo "FAIL: oracle not collected"; exit 1; }

npm run -s test

echo "PASS: wave19d-06"
