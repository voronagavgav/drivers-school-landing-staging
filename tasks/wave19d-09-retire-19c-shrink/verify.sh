#!/usr/bin/env bash
# wave19d-09: 19c shrink retired (tier off); superseded lib kept green; 19c integration test rewritten.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# Tier flipped off; new model key referenced.
grep -qE 'READINESS_ESTIMATION_TIER[^=]*=\s*"off"' lib/constants.ts \
  || { echo "FAIL: READINESS_ESTIMATION_TIER not set to \"off\""; exit 1; }

# Superseded lib kept.
[ -f lib/readiness-estimation.ts ] || { echo "FAIL: superseded lib deleted (must be kept, documented)"; exit 1; }
[ -f lib/readiness-estimation.oracle.test.ts ] || { echo "FAIL: 19c oracle deleted (must be kept)"; exit 1; }

# No live server module still IMPORTS or CALLS correctBlockMeanProb for the persisted dial. Anchor on
# actual code usage (a call `correctBlockMeanProb(` or an import binding), scoped to *.ts — the bare
# token also appears legitimately in prose (a mastery-readiness.ts doc comment noting it NO LONGER
# feeds the dial, and lib/server/CLAUDE.md learnings), which a whole-tree grep false-fails on.
if grep -rn --include='*.ts' -E 'correctBlockMeanProb\(|import[^;]*\bcorrectBlockMeanProb\b' lib/server; then
  echo "FAIL: lib/server still imports/calls correctBlockMeanProb"; exit 1
fi

# 19c integration test un-skipped + no stale 34/100 pinned magnitudes.
IT="lib/server/readiness-estimation.integration.test.ts"
if grep -nE 'describe\.skip|it\.skip|\.skip\(' "$IT"; then
  echo "FAIL: 19c integration test still has a skipped suite/test (un-skip + rewrite)"; exit 1
fi
if grep -nE 'toBe\(34\)|dialIndep\).toBe\(100\)' "$IT"; then
  echo "FAIL: stale wave19c 34/100 magnitudes still pinned"; exit 1
fi
grep -q 'lm-gh1' "$IT" || { echo "FAIL: rewritten test does not assert the new model key lm-gh1"; exit 1; }

npm run -s typecheck
npm run -s test

vitest_list() {
  local req="$1"; shift; local out ok tok toks
  IFS=',' read -ra toks <<<"$req"
  for _ in 1 2 3 4 5; do
    out="$(npx vitest list -c vitest.integration.config.ts 2>/dev/null || true)"; ok=1
    for tok in "${toks[@]}"; do grep -q "$tok" <<<"$out" || ok=0; done
    [ "$ok" = 1 ] && break
  done
  printf '%s\n' "$out"
}
LIST="$(vitest_list 'readiness-estimation.integration')"
grep -q 'readiness-estimation.integration' <<<"$LIST" || { echo "FAIL: 19c integration test not collected (still fully skipped?)"; exit 1; }

npm run -s db:seed
npx vitest run -c vitest.integration.config.ts "$IT"

echo "PASS: wave19d-09"
