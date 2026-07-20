#!/usr/bin/env bash
# verify.sh — wave1-sec-04 (auth actions wired to validation; parse-before-DB; typecheck/test)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
F="app/actions/auth.ts"

# 1. Imports the schemas + helper.
grep -q "@/lib/validation" "$F" || { echo "FAIL: $F does not import from @/lib/validation"; exit 1; }
for sym in registerSchema loginSchema firstIssueMessage; do
  grep -q "$sym" "$F" || { echo "FAIL: $F does not reference $sym"; exit 1; }
done

# 2/3. Both actions safeParse their schema.
grep -Eq "registerSchema\.safeParse" "$F" || { echo "FAIL: registerAction does not safeParse registerSchema"; exit 1; }
grep -Eq "loginSchema\.safeParse" "$F"   || { echo "FAIL: loginAction does not safeParse loginSchema"; exit 1; }

# 2. In registerAction the schema parse must occur BEFORE the first prisma call (no bad persist / 500).
body="$(awk '/export async function registerAction/{f=1} f{print} /^}/{if(f)exit}' "$F")"
sp="$(printf '%s\n' "$body" | grep -n "registerSchema.safeParse" | head -1 | cut -d: -f1)"
pr="$(printf '%s\n' "$body" | grep -n "prisma\." | head -1 | cut -d: -f1)"
[ -n "$sp" ] || { echo "FAIL: no safeParse found in registerAction body"; exit 1; }
[ -n "$pr" ] || { echo "FAIL: no prisma call found in registerAction body (unexpected)"; exit 1; }
[ "$sp" -lt "$pr" ] || { echo "FAIL: registerAction calls prisma before validating ($sp !< $pr)"; exit 1; }

# 4. Exports intact.
for fn in registerAction loginAction logoutAction; do
  grep -Eq "export async function $fn\b" "$F" || { echo "FAIL: $F lost export $fn"; exit 1; }
done

# 5. Typecheck + suite green.
npm run typecheck 2>&1 | tail -3
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && { echo "FAIL: vitest reported failures"; exit 1; }

echo "PASS: wave1-sec-04 auth actions validated (parse-before-DB, exports intact)"
