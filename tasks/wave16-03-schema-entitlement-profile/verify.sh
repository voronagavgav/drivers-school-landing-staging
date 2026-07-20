#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
grep -q 'model Entitlement' prisma/schema.prisma || { echo "FAIL: Entitlement model missing"; exit 1; }
for col in prepMode examOutcome examOutcomeDate examOutcomeReportedAt; do
  grep -q "$col" prisma/schema.prisma || { echo "FAIL: UserStudyProfile.$col missing in schema"; exit 1; }
done
n="$(find prisma/migrations -maxdepth 1 -type d -name '*wave16_entitlement_profile' | wc -l | tr -d ' ')"
[ "$n" = "1" ] || { echo "FAIL: expected exactly 1 wave16_entitlement_profile migration dir, got $n"; exit 1; }
[ -f lib/generated/prisma/models/Entitlement.ts ] || { echo "FAIL: prisma client not regenerated (Entitlement model absent)"; exit 1; }
sqlite3 prisma/dev.db "PRAGMA table_info('Entitlement');" | grep -q 'validUntil' || { echo "FAIL: Entitlement.validUntil not in dev.db"; exit 1; }
sqlite3 prisma/dev.db "PRAGMA table_info('UserStudyProfile');" | grep -q 'examOutcomeDate' || { echo "FAIL: profile columns not applied"; exit 1; }
od="$(sqlite3 prisma/dev.db "SELECT \"on_delete\" FROM pragma_foreign_key_list('Entitlement') WHERE \"table\"='User';")"
[ "$od" = "CASCADE" ] || { echo "FAIL: Entitlement->User on_delete=$od, want CASCADE"; exit 1; }
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npm test || { echo "FAIL: unit tests"; exit 1; }
npm run test:integration || { echo "FAIL: integration tests"; exit 1; }
echo "OK wave16-03"
