#!/usr/bin/env bash
# wave19b-04 — BKT guess/slip posterior oracle (TESTS ONLY, frozen Bayes literals).
set -euo pipefail
cd "$(dirname "$0")/../.."

F=lib/fsrs/grade-posterior.test.ts
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }

# lib/fsrs purity (greps comments too).
for tok in "server-only" "@/lib/db" "@prisma/client" "lib/generated" "Math.random" "Date.now" "new Date"; do
  grep -Fq "$tok" "$F" && { echo "FAIL: purity — $tok present in $F"; exit 1; } || true
done

for lit in \
  "0.4736842105" \
  "0.7826086957" \
  "0.9350649351" \
  "0.9700598802" \
  "0.6428571429" \
  "0.3478260870" ; do
  grep -Fq "$lit" "$F" || { echo "FAIL: frozen posterior literal $lit absent"; exit 1; }
done

npm run -s typecheck
npm run -s test

LIST=""; for _ in 1 2 3 4 5; do LIST="$(npx vitest list 2>/dev/null || true)"; grep -q grade-posterior <<<"$LIST" && break; done
grep -q grade-posterior <<<"$LIST" || { echo "FAIL: grade-posterior.test.ts not collected"; exit 1; }

echo "PASS wave19b-04"
