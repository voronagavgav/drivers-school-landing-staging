#!/usr/bin/env bash
# verify.sh — readiness-trend-04-add-unit-tests
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root

TF="lib/progress.test.ts"

# 1. Tests reference the function under test.
grep -q "readinessTrend" "$TF" \
  || { echo "FAIL: $TF must import/exercise readinessTrend"; exit 1; }

# 2. The four spec outcomes are asserted somewhere in the file.
for tok in '"IMPROVING"' '"DECLINING"' '"STABLE"'; do
  grep -q "$tok" "$TF" \
    || { echo "FAIL: $TF must assert $tok for readinessTrend cases"; exit 1; }
done
# At least 4 new it() cases mentioning trend behavior is hard to count generically;
# require >=2 STABLE assertions (the <2-scores case and the flat case both expect STABLE).
[ "$(grep -c '"STABLE"' "$TF")" -ge 2 ] \
  || { echo "FAIL: expected at least two STABLE assertions (<2 scores AND flat series)"; exit 1; }

# 4. Typecheck clean.
npm run typecheck 2>&1 | tail -5

# 3. Full suite green with >= 33 passing and zero failures.
out="$(npm test 2>&1)"; echo "$out" | tail -8
echo "$out" | grep -Eqi "fail" && { echo "FAIL: vitest reported failures"; exit 1; }
passed="$(echo "$out" | grep -Eo "Tests[[:space:]]+[0-9]+ passed" | grep -Eo "[0-9]+" | head -1)"
[ -n "$passed" ] || { echo "FAIL: could not parse vitest passing count"; exit 1; }
[ "$passed" -ge 33 ] \
  || { echo "FAIL: expected >=33 passing tests (29 baseline + >=4 new), got $passed"; exit 1; }

echo "PASS: readinessTrend tests present, $passed passing, typecheck green"
