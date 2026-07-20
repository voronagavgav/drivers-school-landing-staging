#!/usr/bin/env bash
# verify.sh — wave1-sec-08 (safeImageUrl applied at render + admin save)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
R="components/test-runner.tsx"
A="app/admin/actions.ts"

# 1. Render site sanitises and no longer renders the raw url.
grep -q "@/lib/sanitize" "$R" || { echo "FAIL: $R does not import from @/lib/sanitize"; exit 1; }
grep -q "safeImageUrl" "$R" || { echo "FAIL: $R does not use safeImageUrl"; exit 1; }
grep -q "<img" "$R" || { echo "FAIL: $R no longer renders an <img> (unexpected)"; exit 1; }
grep -Eq "src=\{q\.imageUrl\}" "$R" && { echo "FAIL: $R still renders raw src={q.imageUrl}"; exit 1; }

# 2/3. Admin save imports + uses safeImageUrl and carries the exact Ukrainian rejection message.
grep -q "@/lib/sanitize" "$A" || { echo "FAIL: $A does not import from @/lib/sanitize"; exit 1; }
grep -q "safeImageUrl" "$A" || { echo "FAIL: $A does not use safeImageUrl"; exit 1; }
grep -qF "Посилання на зображення має починатися з http:// або https://." "$A" \
  || { echo "FAIL: $A missing the exact Ukrainian imageUrl rejection message"; exit 1; }

# 5. Typecheck + suite green.
npm run typecheck 2>&1 | tail -3
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && { echo "FAIL: vitest reported failures"; exit 1; }

echo "PASS: wave1-sec-08 safeImageUrl applied at render + admin save"
