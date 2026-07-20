#!/usr/bin/env bash
# wave24-06: weight-injectable FSRS-6 engine pinned to the shipped engine at default weights.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

SRC="scripts/fsrs-fit/param-engine.ts"
TEST="scripts/fsrs-fit/param-engine.oracle.test.ts"

[ -f "$SRC" ]  || { echo "FAIL: $SRC missing"; exit 1; }
[ -f "$TEST" ] || { echo "FAIL: $TEST missing"; exit 1; }

# 1. Exports the parametrized entries.
grep -Eq 'export function scheduleW' "$SRC"       || { echo "FAIL: scheduleW not exported"; exit 1; }
grep -Eq 'export function retrievabilityW' "$SRC"  || { echo "FAIL: retrievabilityW not exported"; exit 1; }

# Purity: no wall clock / rng / server-only-db in the parametrized engine (scoped to the impl file).
if grep -nE 'Math\.random|Date\.now|new Date|server-only|@/lib/db|@prisma/client' "$SRC"; then
  echo "FAIL: param-engine.ts is not pure"; exit 1; fi

# 5. Unit suite green + oracle collected (token-retry per CLAUDE.md).
vitest_list(){ local req="$1"; shift; local out ok tok toks; IFS=',' read -ra toks <<<"$req";
  for _ in 1 2 3 4 5; do out="$(npx vitest list "$@" 2>/dev/null||true)";
    ok=1; for tok in "${toks[@]}"; do grep -q "$tok" <<<"$out"||ok=0; done; [ "$ok" = 1 ]&&break; done;
  printf '%s\n' "$out"; }
LIST="$(vitest_list "param-engine.oracle")"
grep -q "param-engine.oracle" <<<"$LIST" || { echo "FAIL: param-engine.oracle not collected"; exit 1; }

npm test || { echo "FAIL: npm test"; exit 1; }

# 6. typecheck.
npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }

echo "PASS wave24-06"
