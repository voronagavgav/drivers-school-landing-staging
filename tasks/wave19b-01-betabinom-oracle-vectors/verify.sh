#!/usr/bin/env bash
# wave19b-01 — beta-binomial oracle vectors (TESTS ONLY, frozen literals present + suite green).
set -euo pipefail
cd "$(dirname "$0")/../.."

F=lib/readiness-correlation.test.ts
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }

# Frozen oracle literals must appear verbatim in the test file (they are the external anchor).
for lit in \
  "0.3333333333" \
  "0.1666666667" \
  "0.6666666667" \
  "0.875" ; do
  grep -Fq "$lit" "$F" || { echo "FAIL: frozen literal $lit absent from $F"; exit 1; }
done

# Direction + parameterization intents documented.
grep -Eq "betaBinomialPmf" "$F" || { echo "FAIL: betaBinomialPmf oracle not referenced"; exit 1; }
grep -Eq "1 ?\+ ?\(n ?- ?1\)|design effect" "$F" || { echo "FAIL: design-effect (1+(n-1)ρ) intent absent"; exit 1; }

npm run -s typecheck
npm run -s test

# Prove the file is actually collected (retry until the token appears — vitest list can truncate).
vitest_has(){ local tok="$1" out; for _ in 1 2 3 4 5; do out="$(npx vitest list 2>/dev/null || true)"; grep -q "$tok" <<<"$out" && return 0; done; return 1; }
vitest_has readiness-correlation || { echo "FAIL: readiness-correlation.test.ts not collected"; exit 1; }

echo "PASS wave19b-01"
