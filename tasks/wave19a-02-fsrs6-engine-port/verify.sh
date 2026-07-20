#!/usr/bin/env bash
# Verify wave19a-02: FSRS-6 engine port matches the frozen oracle; purity preserved.
set -euo pipefail
cd "$(dirname "$0")/../.."

fail() { echo "FAIL: $1" >&2; exit 1; }

# 1. 21-weight FSRS-6 vector (length + head + w20).
node -e 'import("./lib/fsrs/constants.ts").catch(()=>require("./lib/fsrs/constants"))' >/dev/null 2>&1 || true
grep -Fq '0.212' lib/fsrs/constants.ts || fail "FSRS-6 vector head (0.212) not in constants.ts"
grep -Fq '0.1542' lib/fsrs/constants.ts || fail "w20 (0.1542) not in constants.ts"
# Length === 21 via a tiny tsx probe (constants is pure — safe to import).
LEN="$(npx tsx -e 'import {FSRS_DEFAULT_WEIGHTS} from "./lib/fsrs/constants"; process.stdout.write(String(FSRS_DEFAULT_WEIGHTS.length))')"
[ "$LEN" = "21" ] || fail "FSRS_DEFAULT_WEIGHTS.length is $LEN, expected 21"

# 2. Decay/FACTOR derived from w20, not hardcoded -0.5 / 19/81.
grep -Eq '\[20\]|w20|WEIGHTS\[20\]' lib/fsrs/retrievability.ts || fail "retrievability.ts does not read w20"
grep -Fq '19 / 81' lib/fsrs/retrievability.ts && fail "retrievability.ts still hardcodes 19/81 FACTOR"
grep -Eq 'FSRS_DECAY *= *-0\.5' lib/fsrs/retrievability.ts && fail "retrievability.ts still hardcodes DECAY=-0.5"

# 2b. R(S,S) === 0.9 for the shipped w20 (external identity, holds by FACTOR construction).
RSS="$(npx tsx -e 'import {retrievability} from "./lib/fsrs/retrievability"; const now=new Date(0); const last=new Date(-100*86400000); console.log(retrievability({stability:100,lastReviewedAt:last} as any, now).toFixed(8))')"
awk -v v="$RSS" 'BEGIN{ if ((v-0.9)<-1e-6 || (v-0.9)>1e-6) exit 1 }' || fail "R(S,S)=$RSS, expected 0.90000000"

# 3. Purity: no clock/DB/rng/server tokens anywhere under lib/fsrs (comments included).
if grep -REn 'server-only|@/lib/db|@prisma/client|lib/generated|Math\.random|Date\.now|new Date' lib/fsrs/*.ts; then
  fail "purity violation in lib/fsrs (clock/DB/rng/server token present)"
fi

# 4. Oracle un-skipped + running + green.
grep -Eq 'describe\.skip|it\.skip' lib/fsrs/reference-vectors.test.ts && fail "reference-vectors.test.ts still skipped"
LIST="$(npx vitest list 2>/dev/null || true)"
echo "$LIST" | grep -q 'reference-vectors' || fail "reference-vectors.test.ts not collected by vitest"

# 5. CLAUDE.md updated to FSRS-6.
grep -Eq 'FSRS-6' lib/fsrs/CLAUDE.md || fail "lib/fsrs/CLAUDE.md not updated to FSRS-6"

# 6. Typecheck + unit suite green (oracle included).
npm run -s typecheck || fail "typecheck failed"
npm run -s test || fail "npm test failed (incl. the FSRS-6 reference oracle)"

echo "PASS: wave19a-02 FSRS-6 engine ported, oracle green, purity preserved"
