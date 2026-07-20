#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."

F=lib/readiness-estimation.oracle.test.ts
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }

# frozen literals present (tier values + end-to-end dials)
for v in 0.569444 0.708333 0.8125 0.339343 0.511245 0.665395 \
         0.003541 0.001586 0.103036 0.022708 0.827096 0.196467 0.317318 0.061504 \
         0.000078 0.009722 0.000722 0.847222; do
  grep -Eq "$v" "$F" || { echo "FAIL: frozen literal $v missing from $F"; exit 1; }
done

# WEAK-population direction test present (anti fixture-dodging) — the weak p̂ vector must appear
grep -Eq '0\.55.*0\.60.*0\.65.*0\.60|\.55,[[:space:]]*\.60,[[:space:]]*\.65,[[:space:]]*\.60' "$F" \
  || { echo "FAIL: weak-student vector (.55,.60,.65,.60) not found — direction tests must use weak pop"; exit 1; }

grep -Eq 'describe\.skip' "$F" || { echo "FAIL: expected describe.skip impl block"; exit 1; }
grep -Eq 'await import\("\./readiness-estimation"\)' "$F" || { echo "FAIL: dynamic import of ./readiness-estimation missing"; exit 1; }

npm run -s typecheck

vitest_list(){ local req="$1"; local out; for _ in 1 2 3 4 5; do
  out="$(npx vitest list 2>/dev/null || true)"; grep -q "$req" <<<"$out" && break
done; printf '%s\n' "$out"; }
LIST="$(vitest_list readiness-estimation.oracle)"
grep -q 'readiness-estimation.oracle' <<<"$LIST" || { echo "FAIL: oracle not collected by vitest list"; exit 1; }

npm test

echo "PASS wave19c-05"
