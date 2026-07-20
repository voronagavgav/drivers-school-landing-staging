#!/usr/bin/env bash
# wave10f-02 verify: prior-difficulty fix greens the external golden-vector gate.
set -euo pipefail
cd "$(dirname "$0")/../.."

# The external reference gate must now pass on its own.
npx vitest run lib/fsrs/reference-vectors.test.ts

# Full unit suite green (reference-vectors now folded into the gate) + typecheck.
npm test
npm run typecheck

# Purity: no forbidden tokens introduced in schedule.ts (comments included).
if grep -Eq "Math\.random|Date\.now|new Date|server-only|@/lib/db|@prisma/client|lib/generated" lib/fsrs/schedule.ts; then
  echo "FAIL: purity token in schedule.ts"; exit 1
fi
echo "PASS wave10f-02"
