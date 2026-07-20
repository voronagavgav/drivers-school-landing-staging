#!/usr/bin/env bash
# Verify wave19a-09: whole-wave acceptance gate (FSRS-6 + calibration pipeline).
set -euo pipefail
cd "$(dirname "$0")/../.."

fail() { echo "FAIL: $1" >&2; exit 1; }
DB=prisma/dev.db

# `npx vitest list` occasionally emits truncated stdout when run right after a
# full `npm test` (the `2>/dev/null || true` masks the partial-output crash),
# which flakes the collection greps below. The listing is in DISCOVERY order,
# not alphabetical (reference-vectors ~line 139, calibration-metrics ~line 172),
# so a truncation at ~150 lines keeps the earlier suite but drops the later one
# while STILL clearing a naive >50-line count — that was the flaky FAIL. Retry
# until every REQUIRED token is actually present. First arg = comma-separated
# tokens that must all appear; remaining args pass through to `vitest list`.
# (If a suite is genuinely uncollected, all retries fail the token check and the
# downstream `grep -q … || fail` still fails correctly — no check is weakened.)
vitest_list() {
  local require="$1"; shift
  local out="" ok tok toks
  IFS=',' read -ra toks <<<"$require"
  for _ in 1 2 3 4 5; do
    out="$(npx vitest list "$@" 2>/dev/null || true)"
    ok=1
    for tok in "${toks[@]}"; do
      # herestring, NOT `printf | grep -q`: the listing is >64KB (>pipe buffer)
      # and grep -q closes early on a match, SIGPIPE-killing the writer, which
      # pipefail would propagate → `|| ok=0` would spuriously fire on a found tok.
      grep -q "$tok" <<<"$out" || ok=0
    done
    [ "$ok" = 1 ] && break
  done
  printf '%s\n' "$out"
}

# 1-2. Typecheck + unit suite (oracle + metrics running).
npm run -s typecheck || fail "typecheck failed"
npm run -s test || fail "npm test failed"
LIST="$(vitest_list 'reference-vectors,calibration-metrics')"
grep -q 'reference-vectors' <<<"$LIST" || fail "FSRS-6 reference oracle not collected"
grep -q 'calibration-metrics' <<<"$LIST" || fail "calibration-metrics test not collected"
grep -Eq 'describe\.skip|it\.skip' lib/fsrs/reference-vectors.test.ts && fail "reference oracle still skipped"

# 3. Integration (seed first — self-heal against accumulation).
npm run -s db:seed || fail "db:seed failed"
npm run -s test:integration || fail "integration suite failed"
ILIST="$(vitest_list 'pass-outcome.integration' --config vitest.integration.config.ts)"
grep -q 'pass-outcome.integration' <<<"$ILIST" || fail "pass-outcome integration suite not collected"

# 4. Build.
npm run -s build || fail "build failed"

# 5. FSRS-6 statics.
LEN="$(npx tsx -e 'import {FSRS_DEFAULT_WEIGHTS} from "./lib/fsrs/constants"; process.stdout.write(String(FSRS_DEFAULT_WEIGHTS.length))')"
[ "$LEN" = "21" ] || fail "FSRS_DEFAULT_WEIGHTS.length=$LEN, expected 21"
grep -Eq '\[20\]|w20' lib/fsrs/retrievability.ts || fail "decay not derived from w20"
grep -Eq 'FSRS_DECAY *= *-0\.5' lib/fsrs/retrievability.ts && fail "decay still hardcoded -0.5"
ls scripts/gen-fsrs6-vectors.* >/dev/null 2>&1 || fail "FSRS-6 generator script missing"
if grep -REn 'server-only|@/lib/db|@prisma/client|lib/generated|Math\.random|Date\.now|new Date' lib/fsrs/*.ts; then
  fail "purity violation under lib/fsrs"
fi
if grep -En 'server-only|@/lib/db|@prisma/client|lib/generated|Math\.random|Date\.now|new Date' lib/calibration-metrics.ts; then
  fail "purity violation in calibration-metrics.ts"
fi

# 6. Calibration schema/pipeline.
npx prisma migrate status 2>&1 | grep -Eiq 'up to date|no pending|schema is up to date' || fail "migrate status not clean"
[ "$(sqlite3 "$DB" "SELECT name FROM sqlite_master WHERE type='table' AND name='PassOutcome';")" = "PassOutcome" ] \
  || fail "PassOutcome table absent from dev.db"
grep -Fq 'pass_outcome_captured' lib/constants.ts || fail "pass_outcome_captured not in ANALYTICS_EVENTS"

# 7. Browser smoke (best-effort — hard guarantees are the render smoke in 08 + shared RBAC pattern).
if [ -n "${DRIVER_BROWSER_CMD:-}" ]; then
  echo "NOTE: run the admin /admin/calibration 0-row + RBAC browser smoke manually per the journal (needs served app restarted against the fresh build)." >&2
fi

echo "PASS: wave19a-09 whole-wave acceptance gate"
