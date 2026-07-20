#!/usr/bin/env bash
# wave12a-08 — button variants + enforced CTA rule (no white-on-green).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
U="components/ui.tsx"
G="app/globals.css"

[ -f "$U" ] || { echo "FAIL: $U missing"; exit 1; }

# CTA rule: no text-white paired with a green/sign filled button class, anywhere in ui.tsx.
# Match any single class string that has both a green/sign fill and text-white.
if grep -nE '(bg-(sign|green[a-z-]*)|cta-glass)[^"'"'"']*text-white|text-white[^"'"'"']*(bg-(sign|green[a-z-]*)|cta-glass)' "$U"; then
  echo "FAIL: text-white on a green/sign-filled button class (CTA rule)"; exit 1; fi

# primary variant: green-soft/cta-glass + green-ink, no white
prim="$(grep -E 'primary' "$U" || true)"
echo "$prim" | grep -qE 'bg-green-soft|cta-glass' || { echo "FAIL: primary must use soft-green fill"; exit 1; }
echo "$prim" | grep -qE 'text-green-ink|green-ink' || { echo "FAIL: primary must use dark green-ink text"; exit 1; }
echo "$prim" | grep -q 'text-white' && { echo "FAIL: primary must not use text-white"; exit 1; } || true

# danger variant: no white text
dang="$(grep -E 'danger' "$U" || true)"
echo "$dang" | grep -q 'text-white' && { echo "FAIL: destructive must not use text-white"; exit 1; } || true

# 44px sizing on button base or a btn-lg
grep -qE 'min-h-\[44px\]|h-\[4[4-9]px\]|py-3|py-3\.5|btn-lg' "$U" || { echo "FAIL: buttons need >=44px sizing"; exit 1; }

# token radius on primary
echo "$prim" | grep -qE 'rounded-pill|rounded-chip|rounded-card|rounded-glass' || { echo "FAIL: primary must use a token radius"; exit 1; }

# focus-visible affordance (global or utility)
grep -qE ':focus-visible' "$G" || grep -qE 'focus-visible:' "$U" || { echo "FAIL: no focus-visible affordance"; exit 1; }

npm run typecheck
npm run build
npm test
echo "PASS wave12a-08"
