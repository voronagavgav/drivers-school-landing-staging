#!/usr/bin/env bash
# verify.sh — wave7-07 (official-only seed; demo content + guard test removed)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
SEED="prisma/seed.ts"
TEST="lib/server/seed-content.integration.test.ts"
DB="prisma/dev.db"
fail() { echo "FAIL: $1"; exit 1; }
command -v sqlite3 >/dev/null 2>&1 || fail "sqlite3 not available"

# 1. Demo content blocks removed from seed; importOfficial + users kept.
grep -Eq "const QUESTIONS|const TOPICS" "$SEED" && fail "$SEED still defines demo QUESTIONS/TOPICS arrays" || true
grep -q 'sourceType: "DEMO"' "$SEED" && fail "$SEED still creates DEMO-sourced questions" || true
grep -q "importOfficial" "$SEED" || fail "$SEED must still call importOfficial"
grep -q "user.create" "$SEED" || fail "$SEED must still create the seed users"
grep -q "category.create" "$SEED" || fail "$SEED must still create the categories"

# 3. Guard test deleted.
[ ! -f "$TEST" ] || fail "$TEST still exists — it must be deleted (guarded removed demo content)"

# 4. db:seed → official-only, 0 demo, >=1000 official.
out1="$(npm run db:seed 2>&1)"; echo "$out1" | tail -4
DEMO1="$(sqlite3 "$DB" "SELECT COUNT(*) FROM Question WHERE isDemo=1 OR sourceType='DEMO';")"
OFF1="$(sqlite3 "$DB" "SELECT COUNT(*) FROM Question WHERE sourceType='OFFICIAL' AND isPublished=1;")"
[ "$DEMO1" = "0" ] || fail "seed produced $DEMO1 demo questions (must be 0)"
[ "$OFF1" -ge 1000 ] || fail "seed produced $OFF1 published official questions (<1000)"

# 5. Idempotent re-seed.
out2="$(npm run db:seed 2>&1)"; echo "$out2" | tail -4
DEMO2="$(sqlite3 "$DB" "SELECT COUNT(*) FROM Question WHERE isDemo=1 OR sourceType='DEMO';")"
OFF2="$(sqlite3 "$DB" "SELECT COUNT(*) FROM Question WHERE sourceType='OFFICIAL' AND isPublished=1;")"
[ "$DEMO2" = "0" ] || fail "re-seed produced $DEMO2 demo questions (must stay 0)"
[ "$OFF2" = "$OFF1" ] || fail "re-seed official count not idempotent ($OFF1 -> $OFF2)"

# 6. typecheck + integration suite green.
npm run typecheck 2>&1 | tail -3
iout="$(npm run test:integration 2>&1)"; echo "$iout" | tail -10
echo "$iout" | grep -Eqi " failed|✗ " && fail "integration suite reported failures" || true

echo "PASS: wave7-07 official-only seed (off=$OFF1, demo=0), idempotent; guard test removed; suites green"
