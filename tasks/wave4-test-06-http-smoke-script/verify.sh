#!/usr/bin/env bash
# verify.sh — wave4-test-06 (HTTP smoke script — STATIC checks only; never runs a server)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
S="scripts/smoke.sh"
fail() { echo "FAIL: $1"; exit 1; }

# 1. Exists + executable + shebang + strict mode.
[ -f "$S" ] || fail "$S missing"
[ -x "$S" ] || fail "$S is not executable (chmod +x)"
head -1 "$S" | grep -q '^#!/usr/bin/env bash' || fail "$S missing bash shebang"
grep -q "set -euo pipefail" "$S" || fail "$S missing 'set -euo pipefail'"

# 2. Syntax valid.
bash -n "$S" || fail "$S has a syntax error"

# 3. Reuses mint-cookie + ds_session cookie + base url.
grep -q "mint-cookie.ts" "$S" || fail "$S does not reuse scripts/mint-cookie.ts"
grep -q "ds_session" "$S" || fail "$S does not set the ds_session cookie"
grep -q "SMOKE_BASE_URL" "$S" || fail "$S has no configurable SMOKE_BASE_URL"
grep -q "curl" "$S" || fail "$S does not curl any route"

# 4. Exercises the core routes + seeded users.
grep -q "/dashboard" "$S" || fail "$S does not check /dashboard"
grep -q "/admin" "$S" || fail "$S does not check /admin"
grep -q "user@drivers.school" "$S" || fail "$S does not use the seeded USER"

# 5. Prints PASS and FAIL.
grep -q "PASS" "$S" || fail "$S never prints PASS"
grep -q "FAIL" "$S" || fail "$S never prints FAIL"

# 6. Not wired into the verify gate / package scripts.
grep -q "smoke" package.json && fail "smoke.sh must NOT be wired into package.json scripts" || true

echo "PASS: wave4-test-06 smoke script static checks"
