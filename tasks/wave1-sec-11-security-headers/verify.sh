#!/usr/bin/env bash
# verify.sh — wave1-sec-11 (security headers in next.config.ts + build succeeds)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
C="next.config.ts"

# 1. headers() block + the three headers.
grep -Eq "headers[[:space:]]*\(" "$C" || { echo "FAIL: $C has no headers() function"; exit 1; }
grep -Eq "X-Frame-Options|frame-ancestors" "$C" || { echo "FAIL: $C missing X-Frame-Options / frame-ancestors"; exit 1; }
grep -q "X-Content-Type-Options" "$C" || { echo "FAIL: $C missing X-Content-Type-Options"; exit 1; }
grep -q "nosniff" "$C" || { echo "FAIL: $C missing nosniff value"; exit 1; }
grep -q "Referrer-Policy" "$C" || { echo "FAIL: $C missing Referrer-Policy"; exit 1; }

# 2. Existing config preserved.
grep -q "allowedDevOrigins" "$C" || { echo "FAIL: $C lost allowedDevOrigins"; exit 1; }
grep -q "outputFileTracingRoot" "$C" || { echo "FAIL: $C lost outputFileTracingRoot"; exit 1; }
grep -q "turbopack" "$C" || { echo "FAIL: $C lost turbopack root"; exit 1; }

# 4. Typecheck.
npm run typecheck 2>&1 | tail -3

# 3. Build succeeds (the spec's hard gate for this task).
echo "Running npm run build (this can take a while)…"
npm run build 2>&1 | tail -15
# `set -o pipefail` makes the build's exit status propagate through the pipe.

echo "PASS: wave1-sec-11 security headers present + build succeeded"
