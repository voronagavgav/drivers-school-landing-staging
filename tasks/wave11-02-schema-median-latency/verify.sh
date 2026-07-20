#!/usr/bin/env bash
# verify.sh — wave11-02 schema TopicMastery.medianLatencyMs (additive nullable column).
set -euo pipefail
cd "$(dirname "$0")/../.."
fail() { echo "FAIL: $1"; exit 1; }

# 1. schema declares the nullable column inside TopicMastery.
awk '/^model TopicMastery /{p=1} p&&/medianLatencyMs[[:space:]]+Int\?/{found=1} /^}/{if(p){p=0}} END{exit !found}' \
  prisma/schema.prisma || fail "schema.prisma TopicMastery missing 'medianLatencyMs Int?'"

# 2. a scoped migration exists with an additive ADD COLUMN and no destructive ops.
MIG="$(find prisma/migrations -type d -name '*topic_mastery_median_latency*' 2>/dev/null | head -1)"
[ -n "$MIG" ] || fail "no *_topic_mastery_median_latency migration dir"
SQL="$MIG/migration.sql"
[ -f "$SQL" ] || fail "$SQL missing"
grep -Eq 'ADD COLUMN[[:space:]]+"medianLatencyMs"' "$SQL" || fail "migration lacks ADD COLUMN medianLatencyMs"
grep -Eiq 'DROP TABLE|DROP COLUMN' "$SQL" && fail "migration contains destructive op (must be additive)" || true

# 3. live DB has the column.
sqlite3 prisma/dev.db "PRAGMA table_info('TopicMastery');" | grep -q 'medianLatencyMs' \
  || fail "live dev.db TopicMastery has no medianLatencyMs column (migrate deploy not applied?)"

# 4. typecheck.
npm run typecheck 2>&1 | tail -3
echo "PASS: schema + migration + live column present; run seed/integration/migrate-diff via the wave gate"
