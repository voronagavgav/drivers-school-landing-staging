#!/usr/bin/env bash
# wave19d-05: pure seen/unseen split module matches the frozen oracle; oracle un-skipped.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

M="lib/readiness-seen-unseen.ts"
O="lib/readiness-seen-unseen.oracle.test.ts"
[ -f "$M" ] || { echo "FAIL: $M missing"; exit 1; }
[ -f "$O" ] || { echo "FAIL: $O missing (task 02 authors it)"; exit 1; }

# Purity: no server/db/clock/random tokens anywhere in the pure module (comments included).
if grep -nE 'server-only|@/lib/db|@prisma/client|lib/generated|Math\.random|Date\.now|new Date' "$M"; then
  echo "FAIL: purity violation in $M"; exit 1
fi

# Oracle un-skipped: no active describe.skip/it.skip/.skip( in the oracle file.
if grep -nE 'describe\.skip|it\.skip|\.skip\(' "$O"; then
  echo "FAIL: $O still has a skipped suite/test (un-skip it)"; exit 1
fi

npm run -s typecheck

# Oracle file collected with a non-skipped test.
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
LIST="$(vitest_list 'readiness-seen-unseen.oracle')"
grep -q 'readiness-seen-unseen.oracle' <<<"$LIST" || { echo "FAIL: oracle not collected"; exit 1; }

npm run -s test

echo "PASS: wave19d-05"
