#!/usr/bin/env bash
# verify.sh — wave3-feat-06 (pure sparkline geometry helper + unit tests)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
SRC="lib/sparkline.ts"
TEST="lib/sparkline.test.ts"
fail() { echo "FAIL: $1"; exit 1; }

# 1. Export present.
[ -f "$SRC" ] || fail "$SRC missing"
grep -Eq "export function sparkline|export const sparkline" "$SRC" \
  || fail "$SRC does not export a sparkline function"

# 4. Purity + no React/JSX + determinism.
grep -Eq "server-only|@/lib/db|@prisma/client|lib/generated" "$SRC" \
  && fail "$SRC is not pure (server/DB token present)"
grep -Eq "from \"react\"|from 'react'|</|/>" "$SRC" \
  && fail "$SRC contains React/JSX — geometry helper must return data, not markup"
grep -q "Math.random" "$SRC" && fail "$SRC uses Math.random — must be deterministic"

# 2/3. Path is built (M…L…) somewhere in the source.
grep -q "path" "$SRC" || fail "$SRC does not build a path"

# 5. Test references the function via the @/ alias.
[ -f "$TEST" ] || fail "$TEST missing"
grep -q "@/lib/sparkline" "$TEST" || fail "$TEST does not import from @/lib/sparkline"
grep -q "sparkline" "$TEST" || fail "$TEST does not reference sparkline"

# 6b. Typecheck.
npm run typecheck 2>&1 | tail -3

# 6. Fast unit suite passes + includes sparkline.test.ts.
out="$(npm test 2>&1)"; echo "$out" | tail -8
echo "$out" | grep -Eqi "fail" && fail "vitest reported failures"
listing="$(npx vitest list 2>/dev/null || true)"
echo "$listing" | grep -q "sparkline.test.ts" || fail "sparkline.test.ts did not run"

echo "PASS: wave3-feat-06 sparkline pure + tests"
