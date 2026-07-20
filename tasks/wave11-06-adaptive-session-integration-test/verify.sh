#!/usr/bin/env bash
# verify.sh — wave11-06 adaptive-session integration test (runs this file only).
set -euo pipefail
cd "$(dirname "$0")/../.."
fail() { echo "FAIL: $1"; exit 1; }
F="lib/server/adaptive-session.integration.test.ts"
[ -f "$F" ] || fail "$F missing"

# Production-path proof: the suite must reference the real action + the typed error.
grep -Eq 'startTestAction' "$F" || fail "$F must drive the real startTestAction (production path)"
grep -Eq 'NothingDueError' "$F" || fail "$F must assert NothingDueError for empty SPACED due"
grep -Eq 'createOfficialQuestion' "$F" || fail "$F must self-provision via createOfficialQuestion"

# In the integration list (capture-to-var so the runner isn't SIGPIPE-killed).
ilist="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
echo "$ilist" | grep -q "adaptive-session.integration.test.ts" || fail "not in integration list"

# Seed then run ONLY this file green.
npm run db:seed 2>&1 | tail -2
out="$(npx vitest run --config vitest.integration.config.ts "$F" 2>&1)"; echo "$out" | tail -20
echo "$out" | grep -Eqi "[1-9][0-9]* failed|✗ " && fail "adaptive-session suite reported failures" || true
echo "PASS: adaptive-session integration green"
