#!/usr/bin/env bash
# wave22-10: whole-wave gate — typecheck/unit/integration/build/audit + consumers-off + byte-untouched.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

BASE="${WAVE22_BASE:-e0013e9}"
git cat-file -e "$BASE^{commit}" 2>/dev/null || { echo "FAIL: wave base $BASE not found (set WAVE22_BASE)"; exit 1; }

echo "=== typecheck ==="; npm run -s typecheck
echo "=== unit ==="; npm test

# Unit collection: elo.oracle (herestring grep + token retry; CLAUDE.md).
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
LIST="$(vitest_list 'elo.oracle')"
grep -q "elo.oracle" <<<"$LIST" || { echo "FAIL: elo.oracle not collected"; exit 1; }

echo "=== db:seed then integration ==="
npm run -s db:seed
npm run -s test:integration

echo "=== build ==="; npm run -s build

# Consumers OFF.
grep -qE 'export const ELO_CONSUMERS_ENABLED\s*=\s*false' lib/constants.ts \
  || { echo "FAIL: ELO_CONSUMERS_ENABLED must be false"; exit 1; }
# eloBeta/eloAnswerCount reads confined to the estimator + admin surfaces.
# Scan hand-written source only (*.ts/*.tsx) — drop docs (*.md); exclude lib/generated/ (the
# generated Prisma client is the schema field DEFINITION, not a consumer). content-stats' own
# integration test is a test of an allowed surface, like elo.integration.test.ts already is.
STRAY="$(grep -rlE 'eloBeta|eloAnswerCount' --include='*.ts' --include='*.tsx' lib app 2>/dev/null \
  | grep -vE '^(lib/server/elo\.ts|lib/server/elo\.integration\.test\.ts|lib/server/content-stats\.ts|lib/server/content-stats\.integration\.test\.ts|app/admin/content-health/|lib/elo\.ts|lib/elo\.oracle\.test\.ts|lib/generated/)' || true)"
[ -z "$STRAY" ] || { echo "FAIL: eloBeta/eloAnswerCount referenced outside estimator/admin scope:"; echo "$STRAY"; exit 1; }

# lib/elo.ts purity.
if grep -nE 'Date\.now|new Date|Math\.random' lib/elo.ts; then echo "FAIL: lib/elo.ts impure"; exit 1; fi
for tok in 'server-only' '@/lib/db' '@prisma/client' 'lib/generated'; do
  grep -qF "$tok" lib/elo.ts && { echo "FAIL: lib/elo.ts forbidden import: $tok"; exit 1; } || true
done

# Byte-untouched: lib/fsrs + frozen oracles.
FSRS_CHANGED="$(git diff --name-only "$BASE" -- lib/fsrs | wc -l | tr -d ' ')"
[ "$FSRS_CHANGED" = "0" ] || { echo "FAIL: lib/fsrs changed since $BASE"; git diff --name-only "$BASE" -- lib/fsrs; exit 1; }
for f in \
  lib/readiness-release.oracle.test.ts \
  lib/fsrs/reference-vectors.test.ts ; do
  git diff --quiet "$BASE" -- "$f" || { echo "FAIL: $f changed since $BASE (must be byte-untouched)"; exit 1; }
done

# Exactly the additive elo migration since base.
MIGS="$(git diff --name-only "$BASE" -- prisma/migrations | grep -oE 'prisma/migrations/[^/]+/' | sort -u || true)"
if [ -n "$MIGS" ]; then
  echo "$MIGS" | grep -qv '_elo_item_difficulty/' && { echo "FAIL: unexpected non-elo migration:"; echo "$MIGS"; exit 1; } || true
fi

echo "=== audit:browser (assumes :3100 restarted against fresh build) ==="
npm run audit:browser

echo "PASS: wave22-10"
