#!/usr/bin/env bash
# wave12a-13 — WCAG contrast oracle + focus/motion floor.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
G="app/globals.css"
R="components/test-runner.tsx"

# contrast module (either name)
CF="lib/contrast.ts"; [ -f "$CF" ] || CF="lib/a11y-contrast.ts"
[ -f "$CF" ] || { echo "FAIL: contrast module missing (lib/contrast.ts)"; exit 1; }
CT="lib/contrast.test.ts"; [ -f "$CT" ] || CT="lib/a11y-contrast.test.ts"
[ -f "$CT" ] || { echo "FAIL: contrast test missing"; exit 1; }

grep -qE 'contrastRatio' "$CF" || { echo "FAIL: contrastRatio not exported"; exit 1; }
for bad in 'server-only' '@/lib/db' '@prisma/client' 'lib/generated' 'Math\.random' 'Date\.now' 'new Date'; do
  if grep -qE "$bad" "$CF"; then echo "FAIL: contrast module impure: $bad"; exit 1; fi
done

# frozen anchors + key pair present in the test
grep -qE '21' "$CT" || { echo "FAIL: test missing black/white=21 anchor"; exit 1; }
grep -qF '#173B30' "$CT" || { echo "FAIL: test missing CTA green-ink #173B30"; exit 1; }
grep -qF '#9AD9B8' "$CT" || { echo "FAIL: test missing CTA green-soft #9AD9B8"; exit 1; }
grep -qE '4\.5' "$CT" || { echo "FAIL: test missing 4.5 threshold"; exit 1; }

# in suite
LIST="$(npx vitest list 2>/dev/null || true)"
echo "$LIST" | grep -qE 'contrast.test|a11y-contrast.test' || { echo "FAIL: contrast test not in vitest list"; exit 1; }

# focus-visible token color, not old blue
grep -qE ':focus-visible' "$G" || { echo "FAIL: no :focus-visible rule"; exit 1; }
if awk '/:focus-visible/{f=1} f{print} f&&/\}/{f=0}' "$G" | grep -qE '#1e5bbf'; then
  echo "FAIL: focus ring still uses old blue literal"; exit 1; fi

# reduced-motion guard present
grep -qE 'prefers-reduced-motion' "$G" || { echo "FAIL: no prefers-reduced-motion guard in globals"; exit 1; }

# runner icon+label non-color-only (regression guard)
grep -qE '✓|✗' "$R" && grep -qF 'Неправильно' "$R" || { echo "FAIL: runner lost icon+label signalling"; exit 1; }

npm run typecheck
npm test
npm run build
echo "PASS wave12a-13"
