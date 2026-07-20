#!/usr/bin/env bash
# wave19c-10 — whole-wave verify gate. Estimation-side ρ correction landed + suites/build/audit green.
set -euo pipefail
cd "$(dirname "$0")/../.."

# Deliverable: constants (spec §The correction, task 02).
grep -Eq "READINESS_TOPIC_CORRELATION_ESTIMATION" lib/constants.ts || { echo "FAIL: estimation ρ constant missing"; exit 1; }
grep -Eq "READINESS_ESTIMATION_TIER" lib/constants.ts || { echo "FAIL: tier constant missing"; exit 1; }
grep -Eq "READINESS_ESTIMATION_QUANTILE_ALPHA" lib/constants.ts || { echo "FAIL: quantile α constant missing"; exit 1; }
# The wave19b draw-side neutralization must survive the wave byte-for-byte.
grep -Eq "^export const READINESS_TOPIC_CORRELATION = 0;" lib/constants.ts || { echo "FAIL: draw-side ρ no longer 0"; exit 1; }

# Deliverable: pure libs + frozen-oracle tests (tasks 03–06).
for f in lib/beta-incomplete.ts lib/readiness-estimation.ts lib/beta-incomplete.oracle.test.ts lib/readiness-estimation.oracle.test.ts; do
  [ -f "$f" ] || { echo "FAIL: $f missing"; exit 1; }
done
# Frozen research oracles present as literals (spot-check three end-to-end dial values from the spec).
grep -q "0.001586" lib/readiness-estimation.oracle.test.ts || { echo "FAIL: weak tier-MEAN dial oracle missing"; exit 1; }
grep -q "0.196467" lib/readiness-estimation.oracle.test.ts || { echo "FAIL: strong tier-MEAN dial oracle missing"; exit 1; }
grep -q "0.569444" lib/readiness-estimation.oracle.test.ts || { echo "FAIL: posterior-mean p̃ oracle missing"; exit 1; }
# Purity: no server/db/nondeterminism in the new pure modules.
for f in lib/beta-incomplete.ts lib/readiness-estimation.ts; do
  grep -EqL "server-only|@/lib/db|@prisma/client|Math.random|Date.now" "$f" >/dev/null || true
  if grep -Eq "server-only|@/lib/db|@prisma/client|Math\.random|Date\.now" "$f"; then echo "FAIL: purity violation in $f"; exit 1; fi
done

# Deliverable: server wiring + audit fields (tasks 07–08).
grep -Eq "rhoEst" lib/server/mastery-readiness.ts || { echo "FAIL: inputsJson rhoEst missing"; exit 1; }
grep -Eq "dialIndep" lib/server/mastery-readiness.ts || { echo "FAIL: inputsJson dialIndep missing"; exit 1; }
grep -Eq "nEff" lib/server/mastery-readiness.ts || { echo "FAIL: inputsJson nEff missing"; exit 1; }
grep -Eq "readiness-estimation" lib/server/mastery-readiness.ts || { echo "FAIL: recomputeReadiness not importing estimation lib"; exit 1; }
# Draw-side path stays dead in the live call.
grep -Eq "topicCorrelation: *READINESS_TOPIC_CORRELATION\b" lib/server/mastery-readiness.ts || { echo "FAIL: live computeReadiness call shape changed unexpectedly"; exit 1; }

# The binding wave19b gates untouched by the whole wave (vs the pre-wave spec commit).
BASE=e206825
git diff --quiet "$BASE" -- lib/readiness-honesty.regression.test.ts || { echo "FAIL: honesty direction gate edited this wave"; exit 1; }

# Suites + build.
npm run -s typecheck
npm run -s test
vitest_has(){ local tok="$1" out; for _ in 1 2 3 4 5; do out="$(npx vitest list 2>/dev/null || true)"; grep -q "$tok" <<<"$out" && return 0; done; return 1; }
for s in beta-incomplete readiness-estimation readiness-honesty readiness-model; do
  vitest_has "$s" || { echo "FAIL: unit suite $s not collected"; exit 1; }
done

npm run -s db:seed
npm run -s test:integration
ILIST=""; for _ in 1 2 3 4 5; do ILIST="$(npx vitest list -c vitest.integration.config.ts 2>/dev/null || true)"; grep -q readiness-estimation <<<"$ILIST" && break; done
grep -q readiness-estimation <<<"$ILIST" || { echo "FAIL: readiness-estimation integration not collected"; exit 1; }

npm run -s build

# Browser transport regression gate (env-dependent; skip cleanly if unavailable).
if [ -x bin/browser-audit.sh ]; then
  npm run -s audit:browser || { echo "FAIL: audit:browser regressed"; exit 1; }
fi

echo "PASS wave19c-10"
