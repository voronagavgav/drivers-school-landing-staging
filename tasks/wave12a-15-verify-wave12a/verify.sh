#!/usr/bin/env bash
# wave12a-15 — final full-suite wave gate.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

echo "== typecheck =="; npm run typecheck
echo "== unit =="; npm test
echo "== build =="; npm run build
echo "== seed + integration =="; npm run db:seed >/dev/null 2>&1; npm run test:integration

# no schema drift
if git status --porcelain 2>/dev/null | grep -qE 'prisma/schema.prisma'; then
  echo "FAIL: prisma/schema.prisma changed (no schema changes this wave)"; exit 1; fi
if git status --porcelain 2>/dev/null | grep -qE 'prisma/migrations/'; then
  echo "FAIL: new migration added this wave"; exit 1; fi

# static no-white-on-green
if grep -rnE '(bg-(sign|green[a-z-]*|danger|go|lane)|cta-glass)[^"'"'"']*text-white|text-white[^"'"'"']*(bg-(sign|green[a-z-]*|danger|go|lane)|cta-glass)' components app 2>/dev/null; then
  echo "FAIL: white-on-green regression"; exit 1; fi

# zero lenses shipped
if grep -rnE 'className=[^>]*\blens\b' app components 2>/dev/null; then
  echo "FAIL: a .lens is applied (0 lenses this wave)"; exit 1; fi

# real-transport browser audit (must be green over non-localhost origin)
ORIGIN="${DS_AUDIT_ORIGIN:-http://100.110.64.90:3100}"
if ! curl -sS -m 8 -o /dev/null "$ORIGIN/login" 2>/dev/null; then
  echo "FAIL: audit origin $ORIGIN not reachable — (re)start 'npm run start -- -H 0.0.0.0 -p 3100' against the fresh build (STALE-SERVER trap)"; exit 1; fi
npm run audit:browser "$ORIGIN"

echo "PASS wave12a-15"
