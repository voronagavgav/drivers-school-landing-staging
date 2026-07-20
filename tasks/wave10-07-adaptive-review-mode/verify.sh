#!/usr/bin/env bash
# verify.sh — wave10-07 (ADAPTIVE_REVIEW mode constant).
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
C="lib/constants.ts"
fail() { echo "FAIL: $1"; exit 1; }

grep -q 'ADAPTIVE_REVIEW' "$C" || fail "$C: TEST_MODES missing ADAPTIVE_REVIEW"
grep -Fq 'Розумне повторення' "$C" || fail "$C: MODE_LABEL missing «Розумне повторення»"
grep -q 'MIXED_PRACTICE' "$C" || fail "$C: MIXED_PRACTICE alias must remain (do not delete)"

# Behaviour smoke: label + immediate feedback.
cat > ./.wave10_07_smoke.ts <<'TS'
import { TEST_MODES, MODE_LABEL } from "./lib/constants";
import { showsImmediateFeedback } from "./lib/server/test-engine";
function assert(c: boolean, m: string) { if (!c) { console.error("SMOKE FAIL: " + m); process.exit(1); } }
assert((TEST_MODES as readonly string[]).includes("ADAPTIVE_REVIEW"), "TEST_MODES includes ADAPTIVE_REVIEW");
assert((TEST_MODES as readonly string[]).includes("MIXED_PRACTICE"), "MIXED_PRACTICE still present");
assert(MODE_LABEL["ADAPTIVE_REVIEW" as keyof typeof MODE_LABEL] === "Розумне повторення", "MODE_LABEL for ADAPTIVE_REVIEW");
assert(showsImmediateFeedback("ADAPTIVE_REVIEW") === true, "ADAPTIVE_REVIEW shows immediate feedback");
assert(showsImmediateFeedback("EXAM_SIMULATION") === false, "EXAM_SIMULATION still withholds feedback");
console.log("SMOKE OK");
TS
# `lib/server/test-engine.ts` starts with `import "server-only"` (throws under plain tsx). The
# `react-server` export condition resolves server-only to its empty stub, so the REAL
# showsImmediateFeedback runs at runtime instead of the marker throwing.
npx tsx --conditions=react-server ./.wave10_07_smoke.ts || { rm -f ./.wave10_07_smoke.ts; fail "adaptive-review mode smoke failed"; }
rm -f ./.wave10_07_smoke.ts

echo "== typecheck =="; npm run typecheck 2>&1 | tail -3
tout="$(npm test 2>&1)"; echo "$tout" | tail -5
echo "$tout" | grep -Eqi "[1-9][0-9]* failed|✗ " && fail "unit suite reported failures" || true

echo "PASS: wave10-07 — ADAPTIVE_REVIEW mode registered; typecheck/test green"
