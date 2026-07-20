#!/usr/bin/env bash
# wave12a-10 — runner restyle, behavior unchanged.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
R="components/test-runner.tsx"

[ -f "$R" ] || { echo "FAIL: $R missing"; exit 1; }

# opaque question card
grep -qE '\bsolid\b|bg-card-tint|rounded-card' "$R" || { echo "FAIL: question card must be an opaque token .solid surface"; exit 1; }
# options as .opt
grep -qE '\bopt\b|opt correct|opt wrong|"opt' "$R" || { echo "FAIL: options must use the .opt class"; exit 1; }
# non-color-only signalling preserved
grep -qF 'Правильно' "$R" || { echo "FAIL: 'Правильно' label missing"; exit 1; }
grep -qF 'Неправильно' "$R" || { echo "FAIL: 'Неправильно' label missing"; exit 1; }
grep -qE '✓|✗' "$R" || { echo "FAIL: ✓/✗ icons missing (non-color-only signalling)"; exit 1; }
# roving radiogroup preserved
grep -qE 'role="radio"' "$R" || { echo "FAIL: role=radio must remain"; exit 1; }
grep -qE 'aria-checked' "$R" || { echo "FAIL: aria-checked must remain"; exit 1; }
# save/flag 44px + aria-label
grep -qE 'min-h-\[44px\]|h-11|h-\[44px\]|w-11|min-w-\[44px\]' "$R" || { echo "FAIL: save/flag need >=44px sizing"; exit 1; }
grep -qE 'aria-label' "$R" || { echo "FAIL: save/flag icon-buttons need aria-label"; exit 1; }
# no white-on-green CTA
if grep -nE '(bg-(sign|green[a-z-]*)|cta-glass)[^"'"'"']*text-white|text-white[^"'"'"']*(bg-(sign|green[a-z-]*)|cta-glass)' "$R"; then
  echo "FAIL: white text on green CTA in runner"; exit 1; fi
# idempotency guard untouched
grep -qE 'randomUUID' "$R" || { echo "FAIL: clientEventId/randomUUID guard must remain"; exit 1; }

npm run typecheck
npm run build
npm test
echo "--- integration (seeds DB) ---"
npm run db:seed >/dev/null 2>&1 || true
npm run test:integration
echo "PASS wave12a-10"
