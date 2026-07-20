#!/usr/bin/env bash
# wave24-10: whole-wave gate + byte-untouched invariants (spec Deliverable 5).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

BASE="${WAVE24_BASE:-d928eab}"
OUT="tasks/wave24-10-verify-wave/PREVERIFY-OUTPUT.txt"
: > "$OUT"; echo "static evidence — read, do not run" >> "$OUT"

# 6. FSRS defaults byte-untouched (literal vector present + no lib/fsrs diff).
for tok in "0.212," "1.8722," "0.1542,"; do
  grep -qF "$tok" lib/fsrs/constants.ts || { echo "FAIL: FSRS_DEFAULT_WEIGHTS altered ($tok missing)"; exit 1; }
done
if [ -n "$(git diff --name-only "$BASE" -- lib/fsrs 2>/dev/null)" ]; then
  echo "FAIL: lib/fsrs changed since $BASE:"; git diff --name-only "$BASE" -- lib/fsrs; exit 1; fi

# 7. No product wiring — changed paths must all match the allowlist.
BAD="$(git diff --name-only "$BASE" 2>/dev/null | grep -vE \
  '^scripts/fsrs-fit/|^lib/server/fsrs-export\.integration\.test\.ts$|^docs/research/WEIGHTFIT-HARNESS-2026-07-14\.md$|^tasks/|^\.gitignore$' \
  || true)"
if [ -n "$BAD" ]; then echo "FAIL: out-of-scope changed paths:"; echo "$BAD"; exit 1; fi

# 8. Nothing under app/lib/components imports the fitter (exclude the wave's own export test).
WIRED="$(grep -rlE 'scripts/fsrs-fit|VALIDATION-RESULTS' app lib components 2>/dev/null \
  | grep -vE '^lib/server/fsrs-export\.integration\.test\.ts$' || true)"
if [ -n "$WIRED" ]; then echo "FAIL: product code references the fitter/results:"; echo "$WIRED"; exit 1; fi

# 9. No new prisma migration.
if [ -n "$(git diff --name-only "$BASE" -- prisma/migrations 2>/dev/null)" ]; then
  echo "FAIL: a prisma migration was added this wave"; exit 1; fi

# 10. Report exists.
[ -f "docs/research/WEIGHTFIT-HARNESS-2026-07-14.md" ] || { echo "FAIL: report deliverable missing"; exit 1; }

# 2. Unit + oracle collection (token-retry).
vitest_list(){ local req="$1"; shift; local out ok tok toks; IFS=',' read -ra toks <<<"$req";
  for _ in 1 2 3 4 5; do out="$(npx vitest list "$@" 2>/dev/null||true)";
    ok=1; for tok in "${toks[@]}"; do grep -q "$tok" <<<"$out"||ok=0; done; [ "$ok" = 1 ]&&break; done;
  printf '%s\n' "$out"; }
LIST="$(vitest_list "param-engine.oracle,gen-synthetic.determinism")"
grep -q "param-engine.oracle" <<<"$LIST"        || { echo "FAIL: param-engine.oracle not collected"; exit 1; }
grep -q "gen-synthetic.determinism" <<<"$LIST"  || { echo "FAIL: gen-synthetic.determinism not collected"; exit 1; }

# 1-4. The stack.
echo "== typecheck ==" | tee -a "$OUT"; npm run -s typecheck 2>&1 | tee -a "$OUT"; echo "TYPECHECK_EXIT=${PIPESTATUS[0]}" | tee -a "$OUT"
echo "== unit ==" | tee -a "$OUT";      npm test 2>&1 | tail -5 | tee -a "$OUT"
echo "== db:seed (before integration) ==" | tee -a "$OUT"; npm run -s db:seed >/dev/null 2>&1 || { echo "FAIL: db:seed"; exit 1; }
ILIST="$(vitest_list "fsrs-export" --config vitest.integration.config.ts)"
grep -q "fsrs-export" <<<"$ILIST" || { echo "FAIL: fsrs-export integration test not collected"; exit 1; }
echo "== integration ==" | tee -a "$OUT"; npm run -s test:integration 2>&1 | tail -5 | tee -a "$OUT"
echo "== build ==" | tee -a "$OUT";       npm run -s build 2>&1 | tail -5 | tee -a "$OUT"

# 5. Explicitly NO browser audit (zero UI).
echo "SKIP audit:browser — wave24 ships no UI (scripts + docs only)" | tee -a "$OUT"

echo "PASS wave24-10"
