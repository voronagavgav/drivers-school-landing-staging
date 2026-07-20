#!/usr/bin/env bash
# wave20-09: whole-wave gate — typecheck/unit/integration/build/audit + byte-untouched invariants.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# Wave base = the spec commit before any wave20 impl landed (override with WAVE20_BASE if rebased).
BASE="${WAVE20_BASE:-fbd6a52}"
git cat-file -e "$BASE^{commit}" 2>/dev/null || { echo "FAIL: wave base $BASE not found (set WAVE20_BASE)"; exit 1; }

echo "=== typecheck ==="; npm run -s typecheck
echo "=== unit ==="; npm run -s test

# Unit collection gate (>64KB list → herestring grep, token retry).
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
LIST="$(vitest_list 'lapse-adjust.oracle,guess-floor-direction')"
for tok in lapse-adjust.oracle guess-floor-direction ; do
  grep -q "$tok" <<<"$LIST" || { echo "FAIL: $tok not collected by vitest list"; exit 1; }
done

echo "=== db:seed then integration ==="
npm run -s db:seed
npm run -s test:integration

echo "=== build ==="; npm run -s build

# Engine tag + no-skip gates.
grep -Fq '"fsrs6-bkt2"' lib/fsrs/constants.ts || { echo "FAIL: engine tag not fsrs6-bkt2 in constants"; exit 1; }
grep -Fq '"fsrs6-bkt2"' lib/server/srs-review.integration.test.ts || { echo "FAIL: integration pin not fsrs6-bkt2"; exit 1; }
if grep -Fq '"fsrs6-bkt1"' lib/fsrs/constants.ts lib/server/srs-review.integration.test.ts; then
  echo "FAIL: stale fsrs6-bkt1 remains"; exit 1
fi
if grep -nE 'describe\.skip|it\.skip|\.skip\(' lib/fsrs/lapse-adjust.oracle.test.ts; then
  echo "FAIL: skipped block remains in lapse-adjust.oracle.test.ts"; exit 1
fi

# Byte-untouched invariants (schedule + frozen oracles/regression unchanged across the wave).
for f in \
  lib/fsrs/reference-vectors.test.ts \
  lib/readiness-release.oracle.test.ts \
  lib/readiness-honesty.regression.test.ts \
  lib/fsrs/schedule.ts \
  lib/fsrs/retrievability.ts ; do
  git diff --quiet "$BASE" -- "$f" || { echo "FAIL: $f changed since $BASE (must be byte-untouched)"; exit 1; }
done
# FSRS_DEFAULT_WEIGHTS vector must be unchanged (constants.ts may otherwise change: GUESS_MAX, engine tag).
git show "$BASE:lib/fsrs/constants.ts" | grep -A4 "FSRS_DEFAULT_WEIGHTS = \[" > /tmp/wave20_w_base.txt
grep -A4 "FSRS_DEFAULT_WEIGHTS = \[" lib/fsrs/constants.ts > /tmp/wave20_w_now.txt
diff -q /tmp/wave20_w_base.txt /tmp/wave20_w_now.txt || { echo "FAIL: FSRS_DEFAULT_WEIGHTS changed"; exit 1; }

# No migration added; correct⟺grade≥2 readers unchanged.
NEWMIG="$(git diff --name-only "$BASE" -- prisma/migrations | wc -l | tr -d ' ')"
[ "$NEWMIG" = 0 ] || { echo "FAIL: a migration was added this wave (spec: none needed)"; exit 1; }
git diff --quiet "$BASE" -- lib/server/calibration.ts lib/server/learning-health.ts \
  || { echo "FAIL: correct<->grade>=2 readers changed (log-true-grade needs no reader change)"; exit 1; }

# Browser audit (served app). Restart the :3100 server first if stale (see journal); assumes served.
if [ -n "${DRIVER_BROWSER_CMD:-}" ]; then
  echo "=== browser audit ==="; npm run -s audit:browser
else
  echo "note: DRIVER_BROWSER_CMD unset — run 'npm run audit:browser' manually against the served app"
fi

echo "PASS: wave20-09"
