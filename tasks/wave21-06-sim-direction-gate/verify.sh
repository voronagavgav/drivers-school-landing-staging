#!/usr/bin/env bash
# wave21-06: deterministic simulation gate proves calm maintenance once the pool is exhausted.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

F="lib/study-plan.simulation.test.ts"
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }

# Real computeStudyPlan + FSRS primitives; deterministic (no live clock / rng).
grep -q "computeStudyPlan" "$F" || { echo "FAIL: $F must exercise the real computeStudyPlan"; exit 1; }
grep -q "MAX_DAILY_QUOTA" "$F" || { echo "FAIL: $F must assert against MAX_DAILY_QUOTA"; exit 1; }
if grep -nE "Math\.random|Date\.now|new Date\(" "$F"; then
  echo "FAIL: $F must be deterministic (no Math.random/Date.now/new Date)"; exit 1
fi
grep -q "@/lib/server" "$F" && { echo "FAIL: $F must stay pure (no @/lib/server import)"; exit 1; } || true

# Collected in the default (pure) set.
LIST="$(npx vitest list 2>/dev/null || true)"
grep -q "study-plan.simulation" <<<"$LIST" || { echo "FAIL: simulation suite not collected"; exit 1; }

echo "=== npm test ==="
npm test

echo "PASS: wave21-06"
