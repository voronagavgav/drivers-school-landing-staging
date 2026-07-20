#!/usr/bin/env bash
# wave19d-07: end-to-end release model composes 05+06, enforces min-clamp, matches frozen (a)-(f) oracle.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

M="lib/readiness-release.ts"
O="lib/readiness-release.oracle.test.ts"
[ -f "$M" ] || { echo "FAIL: $M missing"; exit 1; }
[ -f "$O" ] || { echo "FAIL: $O missing (task 02 authors it)"; exit 1; }

# Purity.
if grep -nE 'server-only|@/lib/db|@prisma/client|lib/generated|Date\.now|new Date' "$M"; then
  echo "FAIL: purity violation in $M"; exit 1
fi

# Composes the sub-modules (does not reimplement them) and applies the outer min-clamp.
grep -q 'readiness-seen-unseen' "$M"    || { echo "FAIL: must import the seen/unseen split (task 05)"; exit 1; }
grep -q 'readiness-factor-mixture' "$M" || { echo "FAIL: must import the factor mixture (task 06)"; exit 1; }
grep -qE 'Math\.min' "$M"               || { echo "FAIL: outer min(mixtureDial, independenceDial) clamp absent"; exit 1; }

# New model constants + key present in constants.ts.
grep -q 'lm-gh1' lib/constants.ts || { echo "FAIL: model key \"lm-gh1\" not in lib/constants.ts"; exit 1; }

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
LIST="$(vitest_list 'readiness-release.oracle')"
grep -q 'readiness-release.oracle' <<<"$LIST" || { echo "FAIL: release oracle not collected"; exit 1; }

npm run -s test

echo "PASS: wave19d-07"
