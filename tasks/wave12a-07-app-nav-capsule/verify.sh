#!/usr/bin/env bash
# wave12a-07 — glass tab capsule replaces the nav-scroll strip.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
N="components/app-nav.tsx"
B="components/brand.tsx"
G="app/globals.css"

[ -f "$N" ] || { echo "FAIL: $N missing"; exit 1; }

# 5 targets
for lbl in "Головна" "Навчання" "Іспит" "Прогрес" "Профіль"; do
  grep -qF "$lbl" "$N" || { echo "FAIL: nav missing tab '$lbl'"; exit 1; }
done
for href in "/dashboard" "/practice" "/progress" "/account"; do
  grep -qF "$href" "$N" || { echo "FAIL: nav missing route $href"; exit 1; }
done

# active state + client
grep -qE 'usePathname' "$N" || { echo "FAIL: nav must use usePathname for active tab"; exit 1; }
grep -qE 'aria-current' "$N" || { echo "FAIL: nav must set aria-current on active tab"; exit 1; }

# 44px target sizing present
grep -qE 'min-h-\[44px\]|min-w-\[44px\]|h-1[1-9]|h-\[4[4-9]px\]|py-3|py-4' "$N" || { echo "FAIL: nav tabs need explicit >=44px sizing"; exit 1; }

# emulated glass surface, no raw backdrop-filter
grep -qE 'glass-e1|glass e1|\bglass\b' "$N" || { echo "FAIL: nav must use e1 emulated glass class"; exit 1; }

# safe-area inset
grep -qE 'safe-area-inset-bottom' "$N" || { echo "FAIL: bottom bar needs safe-area-inset-bottom"; exit 1; }

# hidden on /test/[id]
grep -qE '/test/' "$N" || { echo "FAIL: nav must hide on the running test route"; exit 1; }

# nav-scroll removed
if grep -qE 'nav-scroll' "$N"; then echo "FAIL: nav-scroll must be removed from component"; exit 1; fi
if grep -qE '\.nav-scroll' "$G"; then echo "FAIL: .nav-scroll CSS must be removed from globals"; exit 1; fi

# brand wordmark -> svitlyk, no blue PDR tile
grep -qiE 'svitlyk' "$B" || { echo "FAIL: brand wordmark must use the Світлик glyph"; exit 1; }
if grep -qE 'bg-sign[^"]*text-white' "$B"; then echo "FAIL: blue ПДР tile must be removed from brand"; exit 1; fi

npm run typecheck
npm run build
echo "PASS wave12a-07"
