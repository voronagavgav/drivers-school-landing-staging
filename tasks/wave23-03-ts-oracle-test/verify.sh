#!/usr/bin/env bash
# wave23-03: frozen TS oracle test authored (suspended), collected, and its literals match the python.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

T="lib/exam-allocator.oracle.test.ts"
P="tasks/wave23-01-python-oracle/PREVERIFY-OUTPUT.txt"
[ -f "$T" ] || { echo "FAIL: $T missing"; exit 1; }
[ -f "$P" ] || { echo "FAIL: python PREVERIFY-OUTPUT.txt missing (wave23-01 must land first)"; exit 1; }

grep -q "gen-wave23-oracles.py" "$T" || { echo "FAIL: python source not named in oracle test"; exit 1; }
grep -qE "describe\.skip" "$T" || { echo "FAIL: suite must be suspended via describe.skip pre-impl"; exit 1; }

echo "=== typecheck ==="; npm run -s typecheck
echo "=== unit ==="; npm test

# Collection: file must be listed by vitest (proves the non-skipped self-consistency test exists).
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
LIST="$(vitest_list 'exam-allocator.oracle')"
grep -q "exam-allocator.oracle" <<<"$LIST" || { echo "FAIL: exam-allocator.oracle not collected"; exit 1; }

# Cross-check: the python ranking order line's value string appears in the test file.
RANK="$(grep -E '^ok rank order=' "$P" | head -1 | sed -E 's/^ok rank order=//')"
[ -n "$RANK" ] || { echo "FAIL: no ranking line in python output"; exit 1; }
grep -qF "$RANK" "$T" || { echo "FAIL: python ranking '$RANK' not frozen into $T"; exit 1; }

echo "PASS wave23-03"
