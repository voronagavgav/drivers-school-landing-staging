#!/usr/bin/env bash
# wave20-06: option-count grade direction test + committed live pre-verify artifact + shift note.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

D="lib/fsrs/guess-floor-direction.test.ts"
ART="docs/research/GRADE-SHIFT-PREVERIFY-2026-07-14.txt"
NOTE="docs/research/GRADE-SHIFT-NOTE-2026-07-14.md"

[ -f "$D" ]   || { echo "FAIL: $D missing"; exit 1; }
[ -f "$ART" ] || { echo "FAIL: live pre-verify artifact $ART missing"; exit 1; }
[ -f "$NOTE" ]|| { echo "FAIL: shift note $NOTE missing"; exit 1; }

# Frozen bulk-shift literals present in the direction test.
for lit in 0.666667 0.729730 0.782609 0.818182 ; do
  grep -Fq "$lit" "$D" || { echo "FAIL: frozen posterior literal $lit absent from $D"; exit 1; }
done
# Artifact carries BEFORE/AFTER grade distributions + the static-evidence header.
grep -q "static evidence" "$ART" || { echo "FAIL: $ART missing static-evidence header"; exit 1; }
grep -Eiq "before" "$ART" && grep -Eiq "after" "$ART" || { echo "FAIL: $ART missing BEFORE/AFTER columns"; exit 1; }
# Note names the artifact.
grep -q "GRADE-SHIFT-PREVERIFY-2026-07-14" "$NOTE" || { echo "FAIL: $NOTE does not name the pre-verify artifact"; exit 1; }

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
LIST="$(vitest_list 'guess-floor-direction')"
grep -q 'guess-floor-direction' <<<"$LIST" || { echo "FAIL: guess-floor-direction test not collected"; exit 1; }

npm run -s test

echo "PASS: wave20-06"
