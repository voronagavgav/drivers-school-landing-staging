#!/usr/bin/env bash
# verify.sh — wave2-ux-10 (pending/disabled state on all submit buttons)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
SB="components/submit-button.tsx"
fail() { echo "FAIL: $1"; exit 1; }

# 1. Reusable pending-aware submit button.
[ -f "$SB" ] || fail "$SB missing"
head -3 "$SB" | grep -q '"use client"' || fail "$SB is missing the \"use client\" directive"
grep -q "useFormStatus" "$SB" || fail "$SB does not use useFormStatus"
grep -Eq "export (function|const) SubmitButton" "$SB" || fail "$SB does not export SubmitButton"
grep -q "disabled" "$SB" || fail "$SB does not set a disabled state"

# 2. Applied in the previously-unguarded forms.
for f in "app/(app)/onboarding/page.tsx" "app/(app)/dashboard/page.tsx" "app/(app)/practice/page.tsx"; do
  grep -q "SubmitButton" "$f" || fail "$f does not use SubmitButton"
done

# 3. Already-pending forms preserved.
grep -q "pending" components/auth-forms.tsx || fail "auth-forms.tsx lost its pending state"
grep -q "pending" app/admin/questions/question-editor.tsx || fail "question-editor.tsx lost its pending state"

# 4. Typecheck.
npm run typecheck 2>&1 | tail -3

# 5. Fast unit suite green.
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && fail "vitest reported failures"

echo "PASS: wave2-ux-10 submit pending states"
