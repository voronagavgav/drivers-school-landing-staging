#!/usr/bin/env bash
#
# smoke.sh — HTTP end-to-end smoke test for the running drivers-school server.
#
# This is NOT part of the verify gate (it never blocks the build). It exercises a
# handful of core routes over HTTP, asserting auth guards and a readiness marker,
# then prints PASS/FAIL and exits non-zero on the first failure.
#
# Prerequisites (this script does NOT start a server itself):
#   - The dev or prod server is already running and reachable at $SMOKE_BASE_URL
#     (default http://localhost:3000), e.g. `npm run dev` in another terminal.
#   - The DB is seeded (see prisma/seed.ts) so user@drivers.school /
#     admin@drivers.school exist.
#   - This shell exports the SAME SESSION_SECRET the server uses, so the cookies
#     minted here (via scripts/mint-cookie.ts) verify against lib/auth.ts.
#
# Usage:
#   SMOKE_BASE_URL=http://localhost:3000 ./scripts/smoke.sh
#
set -euo pipefail
cd "$(dirname "$0")/.."   # repo root

SMOKE_BASE_URL="${SMOKE_BASE_URL:-http://localhost:3000}"

fail() { echo "FAIL: $1"; exit 1; }

# Mint stateless HMAC session cookies for the seeded users, reusing the same
# scheme as lib/auth.ts via scripts/mint-cookie.ts (no HMAC logic duplicated here).
USER_COOKIE="$(npx tsx scripts/mint-cookie.ts user@drivers.school)" \
  || fail "could not mint USER cookie (is the DB seeded / SESSION_SECRET set?)"
ADMIN_COOKIE="$(npx tsx scripts/mint-cookie.ts admin@drivers.school)" \
  || fail "could not mint ADMIN cookie (is the DB seeded / SESSION_SECRET set?)"

body_tmp="$(mktemp)"
trap 'rm -f "$body_tmp"' EXIT

# GET $1 with optional ds_session cookie $2, body saved to $body_tmp. Echoes the
# HTTP status code ("000" if the server is unreachable). No -L: redirects (the
# guard signal) stay observable as 3xx instead of being followed to 200.
http_get() {
  local path="$1" cookie="${2:-}"
  local args=(-s --max-time 15 -o "$body_tmp" -w '%{http_code}')
  [ -n "$cookie" ] && args+=(--cookie "ds_session=$cookie")
  curl "${args[@]}" "$SMOKE_BASE_URL$path" || true
}

# (a) Authenticated USER sees their dashboard, with the readiness marker.
code="$(http_get /dashboard "$USER_COOKIE")"
[ "$code" = "200" ] || fail "USER GET /dashboard expected 200, got $code"
grep -q "Готовніст" "$body_tmp" || fail "USER GET /dashboard missing readiness marker (Готовніст)"

# (b) Unauthenticated /admin is guarded (must NOT be a 200 admin page).
code="$(http_get /admin "")"
[ "$code" != "200" ] || fail "unauthenticated GET /admin was not guarded (got 200)"

# (c) Authenticated USER (non-admin) /admin is blocked too.
code="$(http_get /admin "$USER_COOKIE")"
[ "$code" != "200" ] || fail "USER GET /admin was not blocked (got 200)"

echo "PASS"
