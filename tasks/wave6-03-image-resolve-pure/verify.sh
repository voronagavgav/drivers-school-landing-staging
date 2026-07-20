#!/usr/bin/env bash
# verify.sh — wave6-03 (pure imageCandidatePaths + unit tests)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
SRC="lib/image-resolve.ts"
TEST="lib/image-resolve.test.ts"
fail() { echo "FAIL: $1"; exit 1; }

# 1. Export present.
[ -f "$SRC" ] || fail "$SRC missing"
grep -Eq "export function imageCandidatePaths|export const imageCandidatePaths" "$SRC" \
  || fail "$SRC does not export imageCandidatePaths"

# 2. The three tier dirs are referenced (override / restyled-live / original).
grep -q "image-overrides" "$SRC"  || fail "$SRC has no override tier dir (image-overrides)"
grep -q "restyled-live" "$SRC"    || fail "$SRC has no restyled-live tier dir"
grep -q "official-images" "$SRC"  || fail "$SRC has no original tier dir (official-images)"

# 3. Extension handling.
for ext in png jpeg jpg svg; do
  grep -q "$ext" "$SRC" || fail "$SRC does not handle .$ext"
done

# 4. Purity (no server/db/clock; no fs/path I/O; no JSX).
grep -Eq "server-only|@/lib/db|@prisma/client|lib/generated" "$SRC" \
  && fail "$SRC is not pure (server/DB token present)"
grep -Eq "Math\.random|Date\.now|new Date\(" "$SRC" \
  && fail "$SRC uses clock/global randomness — must be pure"
grep -Eq "from \"node:fs\"|from \"node:path\"|require\(.node:" "$SRC" \
  && fail "$SRC imports fs/path — the pure module must do NO I/O"

# 5. Unit test references the function and traversal/garbage cases.
[ -f "$TEST" ] || fail "$TEST missing"
grep -q "imageCandidatePaths" "$TEST" || fail "$TEST does not reference imageCandidatePaths"
grep -Eq "\.\.|traversal|/" "$TEST"   || fail "$TEST has no traversal/garbage-key case"

# 6. Typecheck + fast unit suite + inclusion.
npm run typecheck 2>&1 | tail -3
out="$(npm test 2>&1)"; echo "$out" | tail -8
echo "$out" | grep -Eqi "fail" && fail "vitest reported failures"
listing="$(npx vitest list 2>/dev/null || true)"
echo "$listing" | grep -q "lib/image-resolve.test.ts" || fail "image-resolve.test.ts did not run"

echo "PASS: wave6-03 imageCandidatePaths pure + tests"
