#!/usr/bin/env bash
# wave19b-02 — correlation-corrected readiness tail (impl + un-skipped oracle + ρ=0 regression anchor).
set -euo pipefail
cd "$(dirname "$0")/../.."

F=lib/readiness-correlation.ts
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }

# PURITY (scoped to the pure module).
for tok in "server-only" "@/lib/db" "@prisma/client" "lib/generated" "Math.random" "Date.now" "new Date"; do
  grep -Fq "$tok" "$F" && { echo "FAIL: purity — $tok present in $F"; exit 1; } || true
done

# Required exports.
grep -Eq "export function betaBinomialPmf" "$F" || { echo "FAIL: betaBinomialPmf not exported"; exit 1; }
grep -Eq "export function correlatedPassProbability" "$F" || { echo "FAIL: correlatedPassProbability not exported"; exit 1; }
grep -Eq "blockBetaBinomParams" "$F" || { echo "FAIL: blockBetaBinomParams not exported"; exit 1; }

# Conservative ρ default constant present.
grep -Eq "READINESS_TOPIC_CORRELATION *= *0\.35" lib/constants.ts || { echo "FAIL: READINESS_TOPIC_CORRELATION=0.35 absent"; exit 1; }

# computeReadiness gained the optional ρ knob.
grep -Eq "topicCorrelation" lib/readiness-model.ts || { echo "FAIL: computeReadiness has no topicCorrelation input"; exit 1; }

# The task-01 oracle must NOT be skipped any more (no describe.skip / it.skip remaining in the oracle file).
if grep -Eq "describe\.skip|it\.skip|\.skip\(" lib/readiness-correlation.test.ts; then
  echo "FAIL: task-01 oracle still skipped"; exit 1
fi

npm run -s typecheck
npm run -s test

# Both the oracle suite and the existing readiness-model suite are collected.
LIST=""; for _ in 1 2 3 4 5; do LIST="$(npx vitest list 2>/dev/null || true)"; \
  { grep -q readiness-correlation <<<"$LIST" && grep -q readiness-model <<<"$LIST"; } && break; done
grep -q readiness-correlation <<<"$LIST" || { echo "FAIL: readiness-correlation not collected"; exit 1; }
grep -q readiness-model <<<"$LIST" || { echo "FAIL: readiness-model not collected"; exit 1; }

echo "PASS wave19b-02"
