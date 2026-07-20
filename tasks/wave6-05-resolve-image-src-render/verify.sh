#!/usr/bin/env bash
# verify.sh — wave6-05 (resolveImageSrc pure + wired into the render path)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
SRC="lib/image-resolve.ts"
RUNNER="components/test-runner.tsx"
PAGE="app/(app)/test/[id]/page.tsx"
ENGINE="lib/server/test-engine.ts"
fail() { echo "FAIL: $1"; exit 1; }

# 1. resolveImageSrc exported + still pure.
grep -Eq "export function resolveImageSrc|export const resolveImageSrc" "$SRC" \
  || fail "$SRC does not export resolveImageSrc"
grep -q "/api/q-image/" "$SRC" || fail "$SRC resolveImageSrc does not build /api/q-image/<key>"
grep -Eq "Math\.random|Date\.now|new Date\(|server-only|@/lib/db|@prisma/client|lib/generated" "$SRC" \
  && fail "$SRC is no longer pure"

# 2. Tests cover the branches.
grep -q "resolveImageSrc" lib/image-resolve.test.ts || fail "no resolveImageSrc test"

# 3. imageKey threaded through the engine projection + page + runner.
grep -q "imageKey" "$ENGINE" || fail "$ENGINE does not select imageKey"
grep -q "imageKey" "$PAGE"   || fail "$PAGE does not pass imageKey through"
grep -q "resolveImageSrc" "$RUNNER" || fail "$RUNNER does not use resolveImageSrc"

# 4. safeImageUrl not weakened (still rejects protocol-relative + non-/ relative).
grep -q "trimmed.startsWith" lib/sanitize.ts || fail "lib/sanitize.ts looks modified/weakened"

# 5. Typecheck + unit suite.
npm run typecheck 2>&1 | tail -3
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && fail "vitest reported failures"

echo "PASS: wave6-05 resolveImageSrc wired into render path"
