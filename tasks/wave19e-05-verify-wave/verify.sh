#!/usr/bin/env bash
# verify.sh — wave19e-05 whole-wave exit gate.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# 6. honesty regression gate byte-untouched vs e206825.
H="$(git show HEAD:lib/readiness-honesty.regression.test.ts | git hash-object --stdin)"
[ "$H" = "4111cddf9664f36130e856d4a144cdd1db022fba" ] \
  || { echo "FAIL: honesty regression gate changed (hash $H != e206825)"; exit 1; }

# 7. neutralized draw-side constant byte-untouched.
grep -Eq "^export const READINESS_TOPIC_CORRELATION = 0;" lib/constants.ts \
  || { echo "FAIL: READINESS_TOPIC_CORRELATION no longer exactly '= 0'"; exit 1; }

# 8. release oracle untouched vs the wave19e base 09b8097.
git diff --quiet 09b8097 -- lib/readiness-release.oracle.test.ts \
  || { echo "FAIL: lib/readiness-release.oracle.test.ts changed vs base 09b8097"; exit 1; }

# 10. live anchor present (regression guard against a silent re-drop).
M="lib/server/mastery-readiness.ts"
grep -q "READINESS_ANCHOR_STRENGTH" "$M" || { echo "FAIL: anchor strength not referenced in $M"; exit 1; }
grep -Eq "anchored:\s*true" "$M" || { echo "FAIL: inputsJson missing anchored:true in $M"; exit 1; }

# 2/3. typecheck + pure unit.
npm run -s typecheck
npm test

# 1/9. seed then integration; assert 0 skipped from the summary line.
npm run db:seed
OUT="$(npm run test:integration 2>&1)"
printf '%s\n' "$OUT" | tail -30
SUMMARY="$(printf '%s\n' "$OUT" | grep -E '^\s*Tests\s' | tail -1)"
if printf '%s\n' "$SUMMARY" | grep -q "skipped"; then
  echo "FAIL: integration suite reports skipped tests: $SUMMARY"; exit 1; fi
echo "integration summary: $SUMMARY"

# 9. the three target suites are collected.
vitest_list() {
  local req="$1"; shift; local out
  for _ in 1 2 3 4 5; do
    out="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
    grep -q "$req" <<<"$out" && break
  done
  printf '%s\n' "$out"
}
IL="$(vitest_list "mock-anchor direction")"
for tok in "mock-anchor direction" "readiness recompute applies" "DIAGNOSTIC blueprint spread"; do
  grep -q "$tok" <<<"$IL" || { echo "FAIL: target suite '$tok' not collected"; exit 1; }
done

# 4. production build.
npm run build

# 5. real-transport browser audit (app must be served; restart LAN server after build — see journal).
npm run audit:browser

echo "PASS wave19e-05"
