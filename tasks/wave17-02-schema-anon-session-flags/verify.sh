#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
S=prisma/schema.prisma
grep -q 'isAnonymous' "$S" || { echo "FAIL: User.isAnonymous not in schema"; exit 1; }
# additive migration present
MIG="$(find prisma/migrations -maxdepth 1 -type d -name '*wave17_anon_session' 2>/dev/null | head -1)"
[ -n "$MIG" ] || { echo "FAIL: wave17 anon-session migration dir missing"; exit 1; }
[ -f "$MIG/migration.sql" ] || { echo "FAIL: migration.sql missing in $MIG"; exit 1; }
grep -qi 'isAnonymous' "$MIG/migration.sql" || { echo "FAIL: migration.sql does not add isAnonymous"; exit 1; }
# flag reader + constant
F=lib/funnel.ts
[ -f "$F" ] || { echo "FAIL: lib/funnel.ts missing"; exit 1; }
grep -q 'isValueFirstFunnelEnabled' "$F" || { echo "FAIL: flag reader missing"; exit 1; }
grep -q 'VALUE_FIRST_FUNNEL' "$F" || { echo "FAIL: flag env name missing"; exit 1; }
grep -q '=== "true"' "$F" || { echo "FAIL: flag must be exact-string opt-in"; exit 1; }
grep -q 'ANON_SAVE_PROMPT_THRESHOLD' lib/constants.ts || { echo "FAIL: ANON_SAVE_PROMPT_THRESHOLD const missing"; exit 1; }
# flag unit test ran (prove inclusion via vitest list, not summary)
LIST="$(npx vitest list 2>/dev/null || true)"
echo "$LIST" | grep -q 'funnel' || { echo "FAIL: lib/funnel.test.ts not collected"; exit 1; }
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npm test || { echo "FAIL: unit suite"; exit 1; }
npm run test:integration || { echo "FAIL: integration suite"; exit 1; }
echo "PASS: wave17-02 schema + flags"
