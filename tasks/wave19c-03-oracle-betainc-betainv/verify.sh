#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."

F=lib/beta-incomplete.oracle.test.ts
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }

# frozen scipy anchors present as literals
for v in 0.339343 0.511245 0.665395 0.216; do
  grep -Eq "$v" "$F" || { echo "FAIL: frozen literal $v missing from $F"; exit 1; }
done
# skipped impl block + dynamic import guard present
grep -Eq 'describe\.skip' "$F" || { echo "FAIL: expected a describe.skip impl block"; exit 1; }
grep -Eq 'await import\("\./beta-incomplete"\)' "$F" || { echo "FAIL: dynamic import of ./beta-incomplete missing"; exit 1; }

npm run -s typecheck

# vitest must COLLECT the file (needs the one non-skipped test). Retry until token present
# (guards the wave19a-09 truncated-listing flake); herestring, not pipe (SIGPIPE/pipefail).
vitest_list(){ local req="$1"; shift; local out ok; for _ in 1 2 3 4 5; do
  out="$(npx vitest list 2>/dev/null || true)"; ok=1
  grep -q "$req" <<<"$out" || ok=0
  [ "$ok" = 1 ] && break
done; printf '%s\n' "$out"; }
LIST="$(vitest_list beta-incomplete.oracle)"
grep -q 'beta-incomplete.oracle' <<<"$LIST" || { echo "FAIL: oracle test file not collected by vitest list"; exit 1; }

npm test

echo "PASS wave19c-03"
