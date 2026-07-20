#!/usr/bin/env bash
# wave19b-05 — Bayesian guess-corrected grade inference (impl + production wiring + FSRS-6 regression).
set -euo pipefail
cd "$(dirname "$0")/../.."

G=lib/fsrs/grade.ts
grep -Eq "FSRS_GUESS_DEFAULT *= *0\.25" lib/fsrs/constants.ts || { echo "FAIL: FSRS_GUESS_DEFAULT=0.25 absent"; exit 1; }
grep -Eq "FSRS_SLIP *= *0\.10?" lib/fsrs/constants.ts || { echo "FAIL: FSRS_SLIP=0.10 absent"; exit 1; }
grep -Eq "export function gradePosterior" "$G" || { echo "FAIL: gradePosterior not exported"; exit 1; }
grep -Eq "priorKnow" "$G" || { echo "FAIL: deriveGrade has no priorKnow input"; exit 1; }
# forward-only migration honesty documented.
grep -Eqi "forward.only|not .*retro|do not retro" "$G" || { echo "FAIL: forward-only migration note absent from grade.ts header"; exit 1; }

# lib/fsrs purity.
for tok in "server-only" "@/lib/db" "@prisma/client" "lib/generated" "Math.random" "Date.now" "new Date"; do
  grep -Fq "$tok" "$G" && { echo "FAIL: purity — $tok present in $G"; exit 1; } || true
done

# Production caller threads the prior.
grep -Eq "priorKnow" lib/server/study.ts || { echo "FAIL: recordReview does not pass priorKnow"; exit 1; }

# task-04 oracle no longer skipped.
if grep -Eq "describe\.skip|it\.skip|\.skip\(" lib/fsrs/grade-posterior.test.ts; then
  echo "FAIL: task-04 oracle still skipped"; exit 1
fi

npm run -s typecheck
npm run -s test

# FSRS-6 reference vectors + grade-posterior oracle both collected & green (suite already ran above).
LIST=""; for _ in 1 2 3 4 5; do LIST="$(npx vitest list 2>/dev/null || true)"; \
  { grep -q reference-vectors <<<"$LIST" && grep -q grade-posterior <<<"$LIST"; } && break; done
grep -q reference-vectors <<<"$LIST" || { echo "FAIL: reference-vectors not collected"; exit 1; }
grep -q grade-posterior <<<"$LIST" || { echo "FAIL: grade-posterior not collected"; exit 1; }

# Production-path integration suite (the file that drives submitAnswer + asserts lastGrade<=3 first-exposure).
npm run -s test:integration

echo "PASS wave19b-05"
