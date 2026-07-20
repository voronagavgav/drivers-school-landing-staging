#!/usr/bin/env bash
# wave20-07: integration proof of slip-adjusted lapse + option-count grade through the real answer path.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# The proof lives in an extended grade-inference suite or a sibling slip-adjusted-lapse suite.
F=""
for cand in lib/server/grade-inference.integration.test.ts lib/server/slip-adjusted-lapse.integration.test.ts ; do
  [ -f "$cand" ] && F="$cand"
done
[ -n "$F" ] || { echo "FAIL: no grade-inference / slip-adjusted-lapse integration suite found"; exit 1; }

# The suite must exercise the real action path (submitAnswer) and assert the new semantics.
grep -rq "submitAnswer" lib/server/grade-inference.integration.test.ts lib/server/slip-adjusted-lapse.integration.test.ts 2>/dev/null \
  || { echo "FAIL: integration proof does not drive submitAnswer (production path)"; exit 1; }
grep -rq "fsrs6-bkt2" lib/server/grade-inference.integration.test.ts lib/server/slip-adjusted-lapse.integration.test.ts 2>/dev/null \
  || { echo "FAIL: integration proof does not assert engine=fsrs6-bkt2"; exit 1; }

npm run -s typecheck

# Collection gate on the integration config (default config excludes *.integration.test.ts).
vitest_list_int() {
  local req="$1"; shift; local out ok tok toks
  IFS=',' read -ra toks <<<"$req"
  for _ in 1 2 3 4 5; do
    out="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"; ok=1
    for tok in "${toks[@]}"; do grep -q "$tok" <<<"$out" || ok=0; done
    [ "$ok" = 1 ] && break
  done
  printf '%s\n' "$out"
}
LIST="$(vitest_list_int 'grade-inference,slip-adjusted-lapse' || true)"
grep -Eq 'grade-inference|slip-adjusted-lapse' <<<"$LIST" || { echo "FAIL: integration proof suite not collected"; exit 1; }

npm run -s db:seed
npm run -s test:integration

echo "PASS: wave20-07"
