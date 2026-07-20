#!/usr/bin/env bash
# verify.sh — wave3-feat-08 (change-password validation schema + server action)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
VAL="lib/validation.ts"
ACT="app/actions/auth.ts"
fail() { echo "FAIL: $1"; exit 1; }

# 1. Schema present, reuses the 8-char minimum, validation stays pure.
[ -f "$VAL" ] || fail "$VAL missing"
grep -q "changePasswordSchema" "$VAL" || fail "$VAL does not export changePasswordSchema"
grep -q "currentPassword" "$VAL" || fail "$VAL changePasswordSchema lacks currentPassword"
grep -q "newPassword" "$VAL" || fail "$VAL changePasswordSchema lacks newPassword"
grep -Eq "min\(8" "$VAL" || fail "$VAL does not enforce the 8-char minimum for the new password"
grep -Eq "server-only|@/lib/db|@prisma/client|lib/generated" "$VAL" \
  && fail "$VAL is no longer pure (server/DB token present)"

# 2. Action present with the verify-before-update security flow.
[ -f "$ACT" ] || fail "$ACT missing"
grep -q '"use server"' "$ACT" || fail "$ACT lost its \"use server\" directive"
grep -q "changePasswordAction" "$ACT" || fail "$ACT does not export changePasswordAction"
grep -q "requireUser" "$ACT" || fail "$ACT does not call requireUser (must derive the user server-side)"
grep -q "changePasswordSchema" "$ACT" || fail "$ACT does not parse with changePasswordSchema"
grep -q "verifyPassword" "$ACT" || fail "$ACT does not verify the current password"
grep -q "hashPassword" "$ACT" || fail "$ACT does not re-hash the new password"
grep -q "passwordHash" "$ACT" || fail "$ACT does not update passwordHash"

# 4. No userId/email is read from the form for the change (no enumeration surface).
#    (requireUser supplies identity; the action must scope the update to that id.)
grep -Eq "user\.id|currentUser\.id|\.id \}" "$ACT" \
  || fail "$ACT does not scope the update to the session user's id"

# No schema change.
[ -z "$(git status --porcelain prisma/schema.prisma 2>/dev/null)" ] \
  || fail "prisma/schema.prisma is dirty — no schema change allowed"

# 5. Typecheck + fast unit suite.
npm run typecheck 2>&1 | tail -3
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && fail "vitest reported failures"

echo "PASS: wave3-feat-08 change-password action"
