#!/usr/bin/env bash
# wave24-07: deterministic synthetic log generator over the parametrized TS engine.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

SRC="scripts/fsrs-fit/gen-synthetic.ts"
TEST="scripts/fsrs-fit/gen-synthetic.determinism.test.ts"

[ -f "$SRC" ]  || { echo "FAIL: $SRC missing"; exit 1; }
[ -f "$TEST" ] || { echo "FAIL: $TEST missing"; exit 1; }

# 1. CSV header literal + generate export.
grep -qF "card_id,review_time,review_rating" "$SRC" || { echo "FAIL: CSV header missing"; exit 1; }
grep -Eq 'export function generate' "$SRC" || { echo "FAIL: generate() not exported"; exit 1; }

# 2. Uses param-engine, not lib/fsrs schedule or py-fsrs.
grep -Eq "from \"./param-engine\"" "$SRC" || { echo "FAIL: does not import ./param-engine"; exit 1; }
if grep -Eq 'from "@/lib/fsrs".*schedule|import\s*\{[^}]*\bschedule\b[^}]*\}\s*from\s*"@/lib/fsrs"' "$SRC"; then
  echo "FAIL: gen-synthetic imports the hard-wired schedule from @/lib/fsrs"; exit 1; fi

# 3. Seeded LCG only, no Math.random.
if grep -nE 'Math\.random' "$SRC"; then echo "FAIL: Math.random in generator (must be seeded LCG)"; exit 1; fi

# 6. Unit green + determinism test collected.
vitest_list(){ local req="$1"; shift; local out ok tok toks; IFS=',' read -ra toks <<<"$req";
  for _ in 1 2 3 4 5; do out="$(npx vitest list "$@" 2>/dev/null||true)";
    ok=1; for tok in "${toks[@]}"; do grep -q "$tok" <<<"$out"||ok=0; done; [ "$ok" = 1 ]&&break; done;
  printf '%s\n' "$out"; }
LIST="$(vitest_list "gen-synthetic.determinism")"
grep -q "gen-synthetic.determinism" <<<"$LIST" || { echo "FAIL: determinism test not collected"; exit 1; }

npm test || { echo "FAIL: npm test"; exit 1; }

# 7. typecheck.
npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }

echo "PASS wave24-07"
