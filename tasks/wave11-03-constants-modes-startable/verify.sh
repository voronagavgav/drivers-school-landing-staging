#!/usr/bin/env bash
# verify.sh — wave11-03 constants + SPACED_REVIEW mode + STARTABLE flip.
set -euo pipefail
cd "$(dirname "$0")/../.."
fail() { echo "FAIL: $1"; exit 1; }
C="lib/constants.ts"

grep -Eq 'ADAPTIVE_REVIEW_SIZE[[:space:]]*=[[:space:]]*15' "$C" || fail "ADAPTIVE_REVIEW_SIZE=15 missing"
grep -Eq 'READINESS_MIN_SEEN[[:space:]]*=[[:space:]]*20' "$C" || fail "READINESS_MIN_SEEN=20 missing"
grep -Eq 'READINESS_MOCK_WINDOW[[:space:]]*=[[:space:]]*10' "$C" || fail "READINESS_MOCK_WINDOW=10 missing"
grep -Eq '"SPACED_REVIEW"' "$C" || fail "SPACED_REVIEW not in constants (TEST_MODES/MODE_LABEL)"

# STARTABLE_MODES must no longer exclude ADAPTIVE_REVIEW.
grep -Eq 'm !== "ADAPTIVE_REVIEW"' "$C" && fail "STARTABLE_MODES still excludes ADAPTIVE_REVIEW" || true

# Behavior oracle: the real schema parse accepts both modes. Assert via tsx (react-server cond not
# needed — validation.ts is pure). Written at repo root so @/ imports resolve.
cat > ./.w11_03_smoke.ts <<'TS'
import { startTestSchema } from "@/lib/validation";
const a = startTestSchema.safeParse({ mode: "ADAPTIVE_REVIEW", topicId: null }).success;
const s = startTestSchema.safeParse({ mode: "SPACED_REVIEW", topicId: null }).success;
if (!a) { console.error("ADAPTIVE_REVIEW not startable"); process.exit(1); }
if (!s) { console.error("SPACED_REVIEW not startable"); process.exit(1); }
console.log("OK both startable");
TS
npx tsx ./.w11_03_smoke.ts || { rm -f ./.w11_03_smoke.ts; fail "startTestSchema rejects the new modes"; }
rm -f ./.w11_03_smoke.ts

npm run typecheck 2>&1 | tail -3
echo "PASS: constants + SPACED_REVIEW mode + STARTABLE flip"
