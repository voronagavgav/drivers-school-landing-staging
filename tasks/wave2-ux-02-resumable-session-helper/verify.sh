#!/usr/bin/env bash
# verify.sh — wave2-ux-02 (pure resumable-session helper + unit tests)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
SRC="lib/session-resume.ts"
TEST="lib/session-resume.test.ts"
fail() { echo "FAIL: $1"; exit 1; }

# 1. Helper exists + exports the function.
[ -f "$SRC" ] || fail "$SRC missing"
grep -Eq "export function selectResumableSession|export const selectResumableSession" "$SRC" \
  || fail "$SRC does not export selectResumableSession"

# 2. Purity: no server/DB tokens anywhere in the file (imports OR comments).
grep -Eq "server-only|@/lib/db|@prisma/client|lib/generated" "$SRC" \
  && fail "$SRC is not pure (server/DB token present)"

# 3. Test file exists, imports the fn from the @/ alias, references IN_PROGRESS.
[ -f "$TEST" ] || fail "$TEST missing"
grep -q "@/lib/session-resume" "$TEST" || fail "$TEST does not import from @/lib/session-resume"
grep -q "selectResumableSession" "$TEST" || fail "$TEST does not reference selectResumableSession"
grep -q "IN_PROGRESS" "$TEST" || fail "$TEST does not exercise IN_PROGRESS status"

# 5. Typecheck.
npm run typecheck 2>&1 | tail -3

# 4. Fast unit suite passes + includes this test file.
out="$(npm test 2>&1)"; echo "$out" | tail -8
echo "$out" | grep -Eqi "fail" && fail "vitest reported failures"
# Default reporter omits filenames on all-pass, so prove inclusion via `vitest list`.
# Capture first: `grep -q` closes the pipe early and would SIGPIPE vitest under pipefail.
listing="$(npx vitest list 2>/dev/null || true)"
echo "$listing" | grep -q "session-resume.test.ts" || fail "session-resume.test.ts did not run"

echo "PASS: wave2-ux-02 resumable-session helper + tests"
