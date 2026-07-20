#!/usr/bin/env bash
# verify.sh — wave7-01 (investigation deliverable present & substantive)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
F="tasks/wave7-01-investigate-content-surfaces/FINDINGS.md"
fail() { echo "FAIL: $1"; exit 1; }

# 1. Deliverable exists and is non-empty.
[ -s "$F" ] || fail "$F missing or empty"

# 2. Mentions the destructive importer statements (the delete-recreate block to replace).
grep -q "import-official.ts" "$F" || fail "$F must reference scripts/import-official.ts with line refs"
grep -Eq "deleteMany|delete-recreate" "$F" || fail "$F must catalog the destructive deleteMany block"
for m in testAnswer testSessionQuestion userMistake savedQuestion; do
  grep -q "$m" "$F" || fail "$F must list the preserved/destroyed model: $m"
done

# 3. Records the key-derivation inputs from the plan.
grep -q "import_plan.json" "$F" || fail "$F must record .content-import/import_plan.json fields"
grep -Eq "label|qnum" "$F" || fail "$F must record the label/qnum source-position fields"

# 4. Names the dependency models + a unique constraint.
grep -q "@@unique" "$F" || fail "$F must copy the relevant @@unique constraints"

# 5. Pins the seed.ts demo blocks + the lone demo-asserting suite.
grep -q "seed.ts" "$F" || fail "$F must pin the prisma/seed.ts demo blocks to remove"
grep -q "seed-content.integration.test.ts" "$F" || fail "$F must confirm the demo-asserting suite"

# 6. States the override file path + dir-absent note.
grep -q ".content-import/overrides" "$F" || fail "$F must state the overrides dir path"

# READ-ONLY: this task must not have changed production source.
DIRTY="$(git status --porcelain scripts/import-official.ts prisma/schema.prisma prisma/seed.ts lib/ 2>/dev/null || true)"
[ -z "$DIRTY" ] || fail "investigation task changed production source (must be read-only): $DIRTY"

echo "PASS: wave7-01 FINDINGS.md present and covers importer/keys/deps/seed/overrides; no source changed"
