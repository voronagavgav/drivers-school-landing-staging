#!/usr/bin/env bash
# wave12a-03 — glass/solid/opt/cta component CSS, emulated-by-default.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
G="app/globals.css"

grep -qE '@layer[[:space:]]+components' "$G" || { echo "FAIL: no @layer components block"; exit 1; }

for sel in '\.glass' '\.glass-e1' '\.glass-e2' '\.lens' '\.solid' '\.opt' '\.cta-glass' '\.btn-ghost'; do
  grep -qE "$sel" "$G" || { echo "FAIL: selector ${sel//\\/} missing"; exit 1; }
done

# .cta-glass must use green-ink text, never white
if awk '/\.cta-glass/{f=1} f&&/\}/{f=0} f' "$G" | grep -qiE 'color:[[:space:]]*(#fff|#ffffff|white)'; then
  echo "FAIL: .cta-glass uses white text (CTA rule: green-ink only)"; exit 1; fi
awk '/\.cta-glass/{f=1} f{print} f&&/\}/{f=0}' "$G" | grep -qiE 'green-ink|#173B30' || { echo "FAIL: .cta-glass must use --color-green-ink / #173B30"; exit 1; }

# .lens defined but NOT applied anywhere in markup
if grep -rEn 'className=[^>]*\blens\b' app components 2>/dev/null; then
  echo "FAIL: no element may apply .lens this wave (0 lenses shipped)"; exit 1; fi

# no infinite/periodic gloss animation on glass/opt/cta
if grep -nE 'animation:[^;]*infinite' "$G"; then
  echo "FAIL: periodic/infinite animation present (light responds to hover/press/reveal only)"; exit 1; fi

# opt hover sweep must be gated by hover:hover (a hover media query must exist)
grep -qE '@media[[:space:]]*\([[:space:]]*hover[[:space:]]*:[[:space:]]*hover' "$G" || { echo "FAIL: option sweep must be gated @media (hover:hover)"; exit 1; }

npm run typecheck
npm run build
echo "PASS wave12a-03"
