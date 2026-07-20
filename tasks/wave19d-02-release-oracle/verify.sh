#!/usr/bin/env bash
# wave19d-02: external oracle script runs; three frozen oracle test files collected + green.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

SCRIPT="scripts/oracles/gen-19d-oracles.py"
[ -f "$SCRIPT" ] || { echo "FAIL: $SCRIPT missing"; exit 1; }

# The reference script runs and emits named values (external oracle, numpy-based).
echo "=== running $SCRIPT ==="
python3 "$SCRIPT" | tee "tasks/wave19d-02-release-oracle/PREVERIFY-OUTPUT.txt"
# The script emits dial values under snake/prefix labels (A_STRONG_FINAL_DIAL,
# B_INDEP_DIAL, FM_MIXTURE, …) — match those, not the camelCase module names.
grep -qiE "FINAL_DIAL|INDEP_DIAL|_MIXTURE|MIXDIAL" "tasks/wave19d-02-release-oracle/PREVERIFY-OUTPUT.txt" \
  || { echo "FAIL: script produced no dial values"; exit 1; }

# The three frozen oracle test files exist and name the script as source.
for F in \
  lib/readiness-seen-unseen.oracle.test.ts \
  lib/readiness-factor-mixture.oracle.test.ts \
  lib/readiness-release.oracle.test.ts ; do
  [ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }
  grep -q "gen-19d-oracles.py" "$F" || { echo "FAIL: $F does not name the oracle script as source"; exit 1; }
done

# Collection gate: all three files listed by vitest (token-retry capture; herestring, never pipe-to-grep).
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
LIST="$(vitest_list 'readiness-seen-unseen.oracle,readiness-factor-mixture.oracle,readiness-release.oracle')"
for tok in readiness-seen-unseen.oracle readiness-factor-mixture.oracle readiness-release.oracle; do
  grep -q "$tok" <<<"$LIST" || { echo "FAIL: $tok not collected by vitest list"; exit 1; }
done

npm run -s typecheck
npm run -s test

echo "PASS: wave19d-02"
