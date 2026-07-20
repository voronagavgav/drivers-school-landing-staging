#!/usr/bin/env bash
# wave12a-04 — pure glass-tier resolver + frozen-matrix oracle test.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
F="lib/glass-tier.ts"
T="lib/glass-tier.test.ts"

[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }
[ -f "$T" ] || { echo "FAIL: $T missing"; exit 1; }
grep -qE 'resolveGlassTier' "$F" || { echo "FAIL: resolveGlassTier not exported"; exit 1; }

# purity: no DOM / db / nondeterminism in the pure module
for bad in 'server-only' '@/lib/db' '@prisma/client' 'lib/generated' 'Math\.random' 'Date\.now' 'new Date' '\bwindow\b' '\bnavigator\b' '\bdocument\b' 'matchMedia'; do
  if grep -qE "$bad" "$F"; then echo "FAIL: pure module contains forbidden token: $bad"; exit 1; fi
done

# test is included in the unit suite
LIST="$(npx vitest list 2>/dev/null || true)"
echo "$LIST" | grep -q 'glass-tier.test' || { echo "FAIL: glass-tier.test not in vitest list"; exit 1; }

# the frozen oracle must actually appear in the test (guard against a stub)
grep -q '"solid"' "$T" || { echo "FAIL: test missing 'solid' expectation"; exit 1; }
grep -q '"real"'  "$T" || { echo "FAIL: test missing 'real' expectation"; exit 1; }
grep -q '"emulated"' "$T" || { echo "FAIL: test missing 'emulated' expectation"; exit 1; }
# boundary vectors present
grep -qE '761|760' "$T" || { echo "FAIL: viewport boundary vector (760/761) missing"; exit 1; }

npm run typecheck
npm test
echo "PASS wave12a-04"
