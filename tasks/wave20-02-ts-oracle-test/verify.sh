#!/usr/bin/env bash
# wave20-02: frozen TS oracle test file exists, names the Python source, collects, and is green.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

F="lib/fsrs/lapse-adjust.oracle.test.ts"
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }

grep -q "gen-wave20-oracles.py" "$F" || { echo "FAIL: $F does not name the Python oracle source"; exit 1; }
# The two impl blocks are skipped for now (they are un-skipped by tasks 03/04).
grep -q "describe.skip" "$F" || { echo "FAIL: expected skipped impl blocks in $F (tasks 03/04 un-skip)"; exit 1; }
# Frozen posterior-direction literals present verbatim (frozen-literal grep, wave19b-04).
for lit in 0.666667 0.729730 0.782609 0.818182 ; do
  grep -Fq "$lit" "$F" || { echo "FAIL: frozen posterior literal $lit absent from $F"; exit 1; }
done
# Purity: no literal `new Date` in the pure-tree test file.
if grep -nE 'new Date' "$F"; then echo "FAIL: literal 'new Date' in $F (use Reflect.construct)"; exit 1; fi

npm run -s typecheck

# Collection gate (var capture + herestring, token retry — never pipe a runner straight into grep -q).
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
LIST="$(vitest_list 'lapse-adjust.oracle')"
grep -q 'lapse-adjust.oracle' <<<"$LIST" || { echo "FAIL: lapse-adjust.oracle not collected by vitest list"; exit 1; }

npm run -s test

echo "PASS: wave20-02"
