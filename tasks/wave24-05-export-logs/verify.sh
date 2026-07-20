#!/usr/bin/env bash
# wave24-05: ReviewLog exporter — engine-tag filtered CSV + seeded integration test.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

SRC="scripts/fsrs-fit/export-logs.ts"
TEST="lib/server/fsrs-export.integration.test.ts"

[ -f "$SRC" ]  || { echo "FAIL: $SRC missing"; exit 1; }
[ -f "$TEST" ] || { echo "FAIL: $TEST missing"; exit 1; }

# 1. Engine filter uses the constant, not a hard-coded literal.
grep -Eq 'engine:\s*REVIEW_ENGINE_VERSION' "$SRC" \
  || { echo "FAIL: export does not filter engine: REVIEW_ENGINE_VERSION"; exit 1; }
grep -Eq 'from "@/lib/fsrs"|from "@/lib/fsrs/constants"' "$SRC" \
  || { echo "FAIL: REVIEW_ENGINE_VERSION not imported from @/lib/fsrs"; exit 1; }
grep -Eq 'export (async )?function exportUserRevlog' "$SRC" \
  || { echo "FAIL: exportUserRevlog entry not exported"; exit 1; }

# 2. CSV header literal present.
grep -qF "card_id,review_time,review_rating" "$SRC" || { echo "FAIL: CSV header not found in source"; exit 1; }

# 3. Exclusion rationale documented.
grep -Eqi "pre-.*bkt2|excluded|grade.semantics" "$SRC" || { echo "FAIL: exclusion rationale comment missing"; exit 1; }

# 5. Integration test is collected (token-retry per CLAUDE.md).
vitest_list(){ local req="$1"; shift; local out ok tok toks; IFS=',' read -ra toks <<<"$req";
  for _ in 1 2 3 4 5; do out="$(npx vitest list --config vitest.integration.config.ts "$@" 2>/dev/null||true)";
    ok=1; for tok in "${toks[@]}"; do grep -q "$tok" <<<"$out"||ok=0; done; [ "$ok" = 1 ]&&break; done;
  printf '%s\n' "$out"; }
LIST="$(vitest_list "fsrs-export")"
grep -q "fsrs-export" <<<"$LIST" || { echo "FAIL: fsrs-export integration test not collected"; exit 1; }

# 6-7. Seed first (self-heal), then integration + typecheck.
npm run -s db:seed >/dev/null 2>&1 || { echo "FAIL: db:seed"; exit 1; }
npm run -s test:integration || { echo "FAIL: test:integration"; exit 1; }
npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }

echo "PASS wave24-05"
