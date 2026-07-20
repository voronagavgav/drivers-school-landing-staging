#!/usr/bin/env bash
# wave21-08: whole-wave gate — typecheck/unit/integration/build/audit + byte-untouched invariants.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

BASE="${WAVE21_BASE:-e0c120b}"
git cat-file -e "$BASE^{commit}" 2>/dev/null || { echo "FAIL: wave base $BASE not found (set WAVE21_BASE)"; exit 1; }

echo "=== typecheck ==="; npm run -s typecheck
echo "=== unit ==="; npm test

# Unit collection gate (herestring grep + token retry; CLAUDE.md).
vitest_list() {
  local req="$1"; shift; local out ok tok toks
  IFS=',' read -ra toks <<<"$req"
  for _ in 1 2 3 4 5; do
    out="$(npx vitest list 2>/dev/null || true)"; ok=1
    for tok in "${toks[@]}"; do grep -q "$tok" <<<"$out" || ok=0; done
    [ "$ok" = 1 ] && break
  done
  printf '%s\n' "$out"
}
LIST="$(vitest_list 'study-plan.oracle,study-plan.simulation')"
for tok in study-plan.oracle study-plan.simulation ; do
  grep -q "$tok" <<<"$LIST" || { echo "FAIL: $tok not collected"; exit 1; }
done

echo "=== db:seed then integration ==="
npm run -s db:seed
npm run -s test:integration

echo "=== build ==="; npm run -s build

# Byte-untouched: no lib/fsrs change; frozen oracles unchanged.
FSRS_CHANGED="$(git diff --name-only "$BASE" -- lib/fsrs | wc -l | tr -d ' ')"
[ "$FSRS_CHANGED" = "0" ] || { echo "FAIL: lib/fsrs changed since $BASE (out of scope)"; git diff --name-only "$BASE" -- lib/fsrs; exit 1; }
for f in \
  lib/readiness-release.oracle.test.ts \
  lib/readiness-honesty.regression.test.ts \
  lib/fsrs/reference-vectors.test.ts ; do
  git diff --quiet "$BASE" -- "$f" || { echo "FAIL: $f changed since $BASE (must be byte-untouched)"; exit 1; }
done

# No migration added (reviewLoad is computed, not stored).
NEWMIG="$(git diff --name-only "$BASE" -- prisma/migrations | wc -l | tr -d ' ')"
[ "$NEWMIG" = "0" ] || { echo "FAIL: unexpected prisma migration added"; exit 1; }

# Copy scoping: multi-day threat removed from the PRIORITIZE branch; exam-today copy retained.
if grep -q "Не встигнете за" lib/study-plan.ts; then
  echo "FAIL: multi-day one-shot threat «Не встигнете за» still in lib/study-plan.ts"; exit 1
fi
grep -q "не встигнете все опрацювати" lib/study-plan.ts \
  || { echo "FAIL: exam-today branch copy missing (branch may have been gutted)"; exit 1; }

# audit:browser (assumes :3100 restarted against the fresh build).
echo "=== audit:browser ==="
npm run audit:browser

echo "PASS: wave21-08"
