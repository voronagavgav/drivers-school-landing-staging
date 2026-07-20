#!/usr/bin/env bash
# wave19d-10: aggregate wave gate — typecheck + unit(+oracles) + integration + build + invariants.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

OUT="tasks/wave19d-10-verify-wave19d/PREVERIFY-OUTPUT.txt"
: > "$OUT"

# 6: invariants byte-untouched / draw-side inert (cheap checks first).
if ! git diff --quiet HEAD -- lib/readiness-honesty.regression.test.ts; then
  echo "FAIL: honesty regression gate changed this wave"; exit 1
fi
grep -qE 'READINESS_TOPIC_CORRELATION\s*=\s*0' lib/constants.ts \
  || { echo "FAIL: draw-side READINESS_TOPIC_CORRELATION must stay 0"; exit 1; }

# 1: typecheck
npm run -s typecheck 2>&1 | tee -a "$OUT"

# 2: unit + oracle collection.
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
LIST="$(vitest_list 'readiness-seen-unseen.oracle,readiness-factor-mixture.oracle,readiness-release.oracle,readiness-estimation.oracle')"
for tok in readiness-seen-unseen.oracle readiness-factor-mixture.oracle readiness-release.oracle readiness-estimation.oracle; do
  grep -q "$tok" <<<"$LIST" || { echo "FAIL: oracle $tok not collected"; exit 1; }
done
npm run -s test 2>&1 | tee -a "$OUT"

# 3: reseed BEFORE integration (self-heal ordering), then full integration suite.
npm run -s db:seed 2>&1 | tee -a "$OUT"
npm run -s test:integration 2>&1 | tee -a "$OUT"

# 4: build
npm run -s build 2>&1 | tee -a "$OUT"

echo "PASS: wave19d-10 (run 'npm run audit:browser' against the served NON-localhost origin separately)"
