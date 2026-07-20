#!/usr/bin/env bash
# wave22-03: suspended TS Elo oracle test exists, is collected, typecheck + unit green.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

F="lib/elo.oracle.test.ts"
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }

grep -q "describe.skip" "$F"       || { echo "FAIL: impl block must be describe.skip"; exit 1; }
grep -q "@ts-expect-error" "$F"    || { echo "FAIL: dynamic import must be @ts-expect-error guarded"; exit 1; }
grep -q 'import("./elo")' "$F"     || { echo "FAIL: must dynamic-import ./elo"; exit 1; }

# Frozen anchors transcribed from the python oracle.
grep -q "0.266667" "$F" || { echo "FAIL: K(10) anchor missing"; exit 1; }
grep -q "0.036364" "$F" || { echo "FAIL: K(200) anchor missing"; exit 1; }

# File is collected (retry until the token appears; guards against truncated vitest list output).
vitest_list(){ local tok="$1"; local out; for _ in 1 2 3 4 5; do out="$(npx vitest list 2>/dev/null || true)"; grep -q "$tok" <<<"$out" && { printf '%s\n' "$out"; return 0; }; done; printf '%s\n' "$out"; return 1; }
vitest_list "elo.oracle" >/dev/null || { echo "FAIL: elo.oracle not collected"; exit 1; }

echo "=== typecheck ==="; npm run -s typecheck
echo "=== npm test ==="; npm test

echo "PASS: wave22-03"
