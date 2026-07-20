#!/usr/bin/env bash
# wave20-04: pure slip-adjusted lapse layer composes schedule() twice with the capped log-blend; oracle green.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

M="lib/fsrs/lapse-adjust.ts"
O="lib/fsrs/lapse-adjust.oracle.test.ts"
[ -f "$M" ] || { echo "FAIL: $M missing"; exit 1; }
[ -f "$O" ] || { echo "FAIL: $O missing (task 02 authors it)"; exit 1; }

grep -q "slipAdjustedLapse" "$M" || { echo "FAIL: $M does not export slipAdjustedLapse"; exit 1; }
# Composes the frozen scheduler (both arms) rather than reimplementing FSRS.
grep -q "schedule" "$M" || { echo "FAIL: $M does not call schedule()"; exit 1; }
N_SCHED="$(grep -oE 'schedule\(' "$M" | wc -l | tr -d ' ')"
[ "$N_SCHED" -ge 2 ] || { echo "FAIL: expected >=2 schedule() calls (Again + Hard), got $N_SCHED"; exit 1; }
# The structural never-grow cap.
grep -Eq "Math\.min\([^)]*(prior|state)\.stability" "$M" || { echo "FAIL: min(prior.stability, …) cap absent in $M"; exit 1; }

# Purity: scope the grep to the target module (comments included).
if grep -nE 'server-only|@/lib/db|@prisma/client|lib/generated|Math\.random|Date\.now|new Date' "$M"; then
  echo "FAIL: purity violation in $M"; exit 1
fi

# schedule.ts must be untouched relative to the wave base (reference vectors depend on it) — checked
# indirectly by the reference-vectors suite staying green in `npm test` below.

# Oracle fully un-skipped now (both impl blocks live).
if grep -nE 'describe\.skip|it\.skip|\.skip\(' "$O"; then
  echo "FAIL: $O still has a skipped block (un-skip the lapse-adjust block)"; exit 1
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
LIST="$(vitest_list 'lapse-adjust.oracle,reference-vectors')"
grep -q 'lapse-adjust.oracle' <<<"$LIST" || { echo "FAIL: lapse-adjust.oracle not collected"; exit 1; }
grep -q 'reference-vectors' <<<"$LIST" || { echo "FAIL: reference-vectors not collected"; exit 1; }

npm run -s test

echo "PASS: wave20-04"
