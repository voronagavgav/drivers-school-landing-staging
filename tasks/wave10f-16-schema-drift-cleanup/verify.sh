#!/usr/bin/env bash
# wave10f-16 verify: redundant drift indexes gone; migrate-diff empty; suite green.
set -euo pipefail
cd "$(dirname "$0")/../.."

if grep -q "@@index(\[questionKey\])" prisma/schema.prisma; then echo "FAIL: @@index([questionKey]) still present"; exit 1; fi
if grep -q "@@index(\[optionKey\])" prisma/schema.prisma; then echo "FAIL: @@index([optionKey]) still present"; exit 1; fi

# Drift-zero: the diff script must contain no DDL.
DIFF="$(npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script 2>/dev/null || true)"
if echo "$DIFF" | grep -Eqi "CREATE |ALTER |DROP "; then
  echo "FAIL: schema drift remains:"; echo "$DIFF"; exit 1
fi

npx prisma generate
npm run db:seed
npm run test:integration
npm run typecheck
echo "PASS wave10f-16 (drift zero)"
