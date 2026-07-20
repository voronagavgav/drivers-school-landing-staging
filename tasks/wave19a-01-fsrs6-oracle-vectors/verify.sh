#!/usr/bin/env bash
# Verify wave19a-01: FSRS-6 golden oracle authored (structural + reproducibility), engine NOT yet ported.
set -euo pipefail
cd "$(dirname "$0")/../.."

fail() { echo "FAIL: $1" >&2; exit 1; }

GEN=""
for c in scripts/gen-fsrs6-vectors.mjs scripts/gen-fsrs6-vectors.ts scripts/gen-fsrs6-vectors.js; do
  [ -f "$c" ] && GEN="$c" && break
done
[ -n "$GEN" ] || fail "generator script scripts/gen-fsrs6-vectors.* missing"

# Generator names a pinned FSRS-6 reference version (ts-fsrs 6.x or fsrs/py-fsrs 6.3.1).
grep -Eiq 'ts-fsrs@?6|ts-fsrs.*6\.|py-fsrs|fsrs==6\.3\.1|6\.3\.1' "$GEN" \
  || fail "generator does not name a pinned FSRS-6 reference version"

TEST=lib/fsrs/reference-vectors.test.ts
[ -f "$TEST" ] || fail "reference-vectors.test.ts missing"

# Oracle is FSRS-6 and pins the exact 21-weight vector head (0.212, 1.2931 ...) — proves re-golden, not stale FSRS-5.
grep -Eq 'FSRS-6|FSRS 6' "$TEST" || fail "test header does not declare FSRS-6"
grep -Fq '0.212' "$TEST" || fail "FSRS-6 weight vector head (0.212) not documented in test"
grep -Fq '0.1542' "$TEST" || fail "FSRS-6 trainable-decay weight (w20=0.1542) not documented in test"

# State coverage: golden asserts the learning-state and interval, over new/learning/review/relearning.
grep -Eq 'relearning' "$TEST" || fail "golden does not cover the relearning phase"
grep -Eq 'review' "$TEST" || fail "golden does not cover the review phase"

# Kept SKIPPED until 02 lands the engine (engine is still FSRS-5 here, so an un-skipped test would be RED).
grep -Eq 'describe\.skip|it\.skip' "$TEST" || fail "oracle test must be describe.skip/it.skip until wave19a-02"
grep -Eiq 'UNSKIP in wave19a-02' "$TEST" || fail "missing UNSKIP-in-wave19a-02 marker comment"

# Suite stays green (the skipped oracle does not fail it).
npm run -s typecheck || fail "typecheck failed"
npm run -s test || fail "npm test failed"

echo "PASS: wave19a-01 FSRS-6 oracle authored (skipped until 02)"
