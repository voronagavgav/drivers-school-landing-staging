#!/usr/bin/env bash
# wave23-05: deterministic sim harness runs, is byte-reproducible, drives the real pipeline, pure.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

ENGINE="lib/exam-allocator-sim.ts"
F="scripts/spikes/exam-allocator-sim.ts"
[ -f "$ENGINE" ] || { echo "FAIL: $ENGINE missing"; exit 1; }
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }

grep -qE "export (function|const) runCell" "$ENGINE" || { echo "FAIL: $ENGINE must export runCell"; exit 1; }
grep -qE "@/lib/exam-allocator-sim|runCell" "$F" || { echo "FAIL: runner does not use the shared runCell engine"; exit 1; }

# Real-pipeline imports on the engine (not reimplementations).
grep -qE "@/lib/exam-allocator\b" "$ENGINE" || { echo "FAIL: engine does not import the allocator"; exit 1; }
grep -qE "@/lib/test-engine/queue|selectReviewQueue" "$ENGINE" || { echo "FAIL: engine does not import baseline queue policy"; exit 1; }
grep -qE "@/lib/readiness-release|releaseDial" "$ENGINE" || { echo "FAIL: engine does not import releaseDial"; exit 1; }
grep -qE "@/lib/fsrs" "$ENGINE" || { echo "FAIL: engine does not import the FSRS pipeline"; exit 1; }

# Purity of the engine: no wall clock, no Math.random (LCG only). Simulated-clock new Date(<ms>) allowed.
for P in "$ENGINE" "$F"; do
  if grep -nE "Math\.random" "$P"; then echo "FAIL: Math.random in $P (must use seeded LCG)"; exit 1; fi
  if grep -nE "Date\.now" "$P"; then echo "FAIL: Date.now wall-clock read in $P"; exit 1; fi
done
if grep -nE "server-only|@/lib/db|@prisma/client|lib/generated" "$ENGINE"; then echo "FAIL: engine must stay pure (no server/db)"; exit 1; fi

echo "=== typecheck ==="; npm run -s typecheck

echo "=== run 1 ==="; npx tsx "$F" > /tmp/wave23-sim-a.txt
echo "=== run 2 ==="; npx tsx "$F" > /tmp/wave23-sim-b.txt
diff -q /tmp/wave23-sim-a.txt /tmp/wave23-sim-b.txt >/dev/null \
  || { echo "FAIL: sim stdout not byte-identical across runs (non-deterministic)"; exit 1; }

# A decision-gate verdict line is printed.
grep -qiE "verdict|GO|NO-GO|lift" /tmp/wave23-sim-a.txt || { echo "FAIL: no verdict/lift line in sim output"; exit 1; }

echo "PASS wave23-05"
