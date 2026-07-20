#!/usr/bin/env bash
# wave23-08: whole-wave gate — typecheck/unit/integration/build + spike-scope + byte-untouched invariants.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

BASE="${WAVE23_BASE:-ced6b85}"
git cat-file -e "$BASE^{commit}" 2>/dev/null || { echo "FAIL: wave base $BASE not found (set WAVE23_BASE)"; exit 1; }

echo "=== typecheck ==="; npm run -s typecheck
echo "=== unit ==="; npm test

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
LIST="$(vitest_list 'exam-allocator.oracle,exam-allocator-sim.determinism')"
grep -q "exam-allocator.oracle" <<<"$LIST" || { echo "FAIL: exam-allocator.oracle not collected"; exit 1; }
grep -q "exam-allocator-sim.determinism" <<<"$LIST" || { echo "FAIL: determinism test not collected"; exit 1; }

echo "=== db:seed then integration ==="
npm run -s db:seed
npm run -s test:integration

echo "=== build ==="; npm run -s build

echo "=== NO browser audit — spike ships zero UI (skipped by design) ==="

# Spike scope: no product wiring.
STRAY="$(git diff --name-only "$BASE" -- app lib/server prisma components 2>/dev/null || true)"
[ -z "$STRAY" ] || { echo "FAIL: out-of-scope product changes since base:"; echo "$STRAY"; exit 1; }

# Byte-untouched: lib/fsrs.
FSRS="$(git diff --name-only "$BASE" -- lib/fsrs 2>/dev/null || true)"
[ -z "$FSRS" ] || { echo "FAIL: lib/fsrs changed:"; echo "$FSRS"; exit 1; }

# Byte-untouched: readiness modules + wave19d/20/21/22 oracle test files.
for f in \
  lib/readiness-release.ts \
  lib/readiness-seen-unseen.ts \
  lib/readiness-model.ts \
  lib/readiness-factor-mixture.ts \
  lib/readiness-release.oracle.test.ts ; do
  if [ -f "$f" ]; then
    git diff --quiet "$BASE" -- "$f" || { echo "FAIL: $f modified vs base"; exit 1; }
  fi
done
# Wave20/21/22 oracle test files (guard whichever exist).
for f in lib/elo.oracle.test.ts lib/fsrs/reference-vectors.test.ts ; do
  if [ -f "$f" ]; then git diff --quiet "$BASE" -- "$f" || { echo "FAIL: $f modified vs base"; exit 1; }; fi
done

# No new prisma migration.
MIG="$(git diff --name-only "$BASE" -- prisma/migrations 2>/dev/null || true)"
[ -z "$MIG" ] || { echo "FAIL: unexpected prisma migration change:"; echo "$MIG"; exit 1; }

# Purity of the shipped pure libs.
for f in lib/exam-allocator.ts lib/exam-allocator-sim.ts ; do
  [ -f "$f" ] || { echo "FAIL: $f missing"; exit 1; }
  if grep -nE "Date\.now|Math\.random" "$f"; then echo "FAIL: impurity in $f"; exit 1; fi
  if grep -nE "server-only|@/lib/db|@prisma/client|lib/generated" "$f"; then echo "FAIL: server/db import in $f"; exit 1; fi
done

# Report deliverable exists with a verdict.
R="docs/research/EXAM-ALLOCATOR-SPIKE-2026-07-14.md"
[ -f "$R" ] || { echo "FAIL: $R missing"; exit 1; }
grep -qiE "verdict" "$R" || { echo "FAIL: report lacks a verdict"; exit 1; }
grep -qE "NO-GO|\bGO\b" "$R" || { echo "FAIL: report lacks GO/NO-GO"; exit 1; }

echo "PASS wave23-08"
