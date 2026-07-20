#!/usr/bin/env bash
# wave12a-11 — empty states + q-image placeholder + inline submit retry.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
R="components/test-runner.tsx"

# empty states with Світлик on the three list screens
for f in "app/(app)/mistakes/page.tsx" "app/(app)/saved/page.tsx" "app/(app)/history/page.tsx"; do
  [ -f "$f" ] || { echo "FAIL: $f missing"; exit 1; }
  grep -qiE 'svitlyk' "$f" || { echo "FAIL: $f empty state must render <Svitlyk/>"; exit 1; }
done

# q-image: no empty alt, onError fallback present
if grep -qE 'alt=""' "$R"; then echo "FAIL: runner <img> must have a meaningful alt (not empty)"; exit 1; fi
grep -qE 'onError|placeholder|Placeholder' "$R" || { echo "FAIL: runner needs a q-image 404 placeholder/onError"; exit 1; }

# inline submit retry
grep -qF 'повторити' "$R" || { echo "FAIL: inline «повторити» retry missing"; exit 1; }

# dashboard pre-data: no white-on-tint, no raw blue
D="app/(app)/dashboard/page.tsx"
if grep -nE '(bg-(green[a-z-]*|danger|go))[^"'"'"']*text-white' "$D"; then echo "FAIL: dashboard white-on-tint"; exit 1; fi

npm run typecheck
npm run build
npm test
echo "--- integration ---"
npm run db:seed >/dev/null 2>&1 || true
npm run test:integration
echo "PASS wave12a-11"
