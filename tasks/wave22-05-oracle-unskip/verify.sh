#!/usr/bin/env bash
# wave22-05: Elo oracle un-suspended and binding against the real impl; typecheck + unit green.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

F="lib/elo.oracle.test.ts"
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }

# No runtime skip remains (also catches ctx.skip( and prose `.skip(`).
if grep -Eq "describe\.skip|it\.skip|\.skip\(" "$F"; then echo "FAIL: $F still contains a .skip"; exit 1; fi
# Static import of ./elo, no residual expect-error on it.
grep -qE 'import\s*\{[^}]*\}\s*from\s*"\./elo"' "$F" || { echo "FAIL: must static-import ./elo"; exit 1; }
grep -q "@ts-expect-error" "$F" && { echo "FAIL: unused @ts-expect-error must be removed"; exit 1; } || true

# Collected.
vitest_list(){ local tok="$1"; local out; for _ in 1 2 3 4 5; do out="$(npx vitest list 2>/dev/null || true)"; grep -q "$tok" <<<"$out" && { printf '%s\n' "$out"; return 0; }; done; printf '%s\n' "$out"; return 1; }
vitest_list "elo.oracle" >/dev/null || { echo "FAIL: elo.oracle not collected"; exit 1; }

echo "=== typecheck ==="; npm run -s typecheck
echo "=== npm test ==="; npm test

echo "PASS: wave22-05"
