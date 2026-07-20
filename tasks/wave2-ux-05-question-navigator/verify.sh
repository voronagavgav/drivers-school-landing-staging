#!/usr/bin/env bash
# verify.sh — wave2-ux-05 (question navigator + client-side flag-for-review)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
TR="components/test-runner.tsx"
fail() { echo "FAIL: $1"; exit 1; }

[ -f "$TR" ] || fail "$TR missing"

# 1. A flag client-state exists.
grep -Eiq "flag" "$TR" || fail "$TR has no flag state/control"

# 2. Navigator jumps via setIdx (already the index setter) — must be invoked from a per-question control.
grep -q "setIdx" "$TR" || fail "$TR navigator does not use setIdx to jump"

# 3. Flagging is client-only: no NEW server action import for flags. The file may still import the
#    existing test actions (submit/finish/toggleSave); assert no schema/Prisma sneaks into this client file.
grep -Eq "@/lib/db|@prisma/client|prisma\\." "$TR" \
  && fail "$TR must not touch the DB — flag state is client-side only"

# 4. Ukrainian flag label present.
grep -Eq "Позначити|перегляд|Познач" "$TR" || fail "$TR missing a Ukrainian flag label"

# 5. aria-label present on navigator controls (question number).
grep -q "aria-label" "$TR" || fail "$TR navigator controls have no aria-label"

# 6. Typecheck.
npm run typecheck 2>&1 | tail -3

# 7. Fast unit suite green.
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && fail "vitest reported failures"

echo "PASS: wave2-ux-05 question navigator + flagging"
