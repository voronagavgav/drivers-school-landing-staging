#!/usr/bin/env bash
# verify.sh — wave6-08 (db:seed auto-loads official, idempotent, demo invariant preserved)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
SEED="prisma/seed.ts"
IMP="scripts/import-official.ts"
TEST="lib/server/seed-content.integration.test.ts"
fail() { echo "FAIL: $1"; exit 1; }

# No schema change in this task.
[ -z "$(git status --porcelain prisma/schema.prisma 2>/dev/null)" ] \
  || fail "prisma/schema.prisma is dirty — no schema change in this task"

# 1. Importer is reused (exported) not forked.
grep -Eq "export (async )?function importOfficial|export const importOfficial" "$IMP" \
  || fail "$IMP does not export a reusable importOfficial()"
grep -q "importOfficial" "$SEED" || fail "$SEED does not call importOfficial (reuse the importer)"

# 2. seed-content test scoped to the demo subset + asserts official exists.
grep -Eq "isDemo:[[:space:]]*true|isDemo: true" "$TEST" \
  || fail "$TEST does not scope its demo assertions with where isDemo:true"
grep -q "OFFICIAL" "$TEST" || fail "$TEST does not assert official content is present"

# 3. First seed: official >= 1000 and demo >= 24.
out1="$(npm run db:seed 2>&1)"; echo "$out1" | tail -4
offN() { grep -iE "official" | grep -Eo "[0-9]{3,}" | sort -rn | head -1; }
demoN() { grep -E "Done\. [0-9]+ demo questions" | sed -E 's/.*Done\. ([0-9]+) demo questions.*/\1/'; }
OFF1="$(echo "$out1" | offN || true)"
DEMO1="$(echo "$out1" | demoN || true)"
[ "${OFF1:-0}" -ge 1000 ] || fail "official load reported ${OFF1:-0} (<1000)"
[ "${DEMO1:-0}" -ge 24 ]  || fail "demo load reported ${DEMO1:-0} (<24)"

# 4. Idempotent: second seed exits 0 with the same counts.
out2="$(npm run db:seed 2>&1)"; echo "$out2" | tail -4
OFF2="$(echo "$out2" | offN || true)"
DEMO2="$(echo "$out2" | demoN || true)"
[ "${OFF2:-x}" = "${OFF1:-y}" ] || fail "re-seed official not idempotent ($OFF1 then $OFF2)"
[ "${DEMO2:-x}" = "${DEMO1:-y}" ] || fail "re-seed demo not idempotent ($DEMO1 then $DEMO2)"

# 5. Typecheck + integration suite (zero failures).
npm run typecheck 2>&1 | tail -3
iout="$(npm run test:integration 2>&1)"; echo "$iout" | tail -10
echo "$iout" | grep -Eqi " failed|✗ " && fail "integration suite reported failures"

echo "PASS: wave6-08 db:seed loads official ($OFF1) + demo ($DEMO1), idempotent, suites green"
