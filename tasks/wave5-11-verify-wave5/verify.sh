#!/usr/bin/env bash
# verify.sh — wave5-11 (full Wave-5 acceptance gate, spec A–D)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
fail() { echo "FAIL: $1"; exit 1; }

# 1. Typecheck.
npm run typecheck 2>&1 | tail -3

# 2. Fast unit suite: zero failures + the three new A/B/C unit files present.
out="$(npm test 2>&1)"; echo "$out" | tail -8
echo "$out" | grep -Eqi "fail" && fail "unit suite reported failures"
listing="$(npx vitest list 2>/dev/null || true)"
echo "$listing" | grep -q "test-engine/due-mistakes.test.ts" || fail "A unit file due-mistakes.test.ts missing"
echo "$listing" | grep -q "lib/mastery.test.ts" || fail "B unit file mastery.test.ts missing"
echo "$listing" | grep -q "lib/readiness.test.ts" || fail "C unit file readiness.test.ts missing"

# 3. Seed (>=24) then integration suite incl. the new Wave-5 integration file.
seedout="$(npm run db:seed 2>&1)"; echo "$seedout" | tail -2
N="$(echo "$seedout" | grep -E "Done\. [0-9]+ demo questions" | tail -1 | sed -E 's/.*Done\. ([0-9]+) demo questions.*/\1/')"
[ "${N:-0}" -ge 24 ] || fail "seed reports only $N demo questions (need >= 24)"
iout="$(npm run test:integration 2>&1)"; echo "$iout" | tail -10
echo "$iout" | grep -Eqi " failed|✗ " && fail "integration suite reported failures"
echo "$iout" | grep -Eqi "✓|passed" || fail "integration suite did not report passing"
ilist="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
echo "$ilist" | grep -q "due-mistakes.integration.test.ts" || fail "Wave-5 integration test missing"

# 4. Build.
npm run build 2>&1 | tail -6

# ---- 5. Static A–C presence + purity ----
SEL="lib/test-engine/selection.ts"
CONST="lib/constants.ts"
SRV_MIST="lib/server/mistakes.ts"
MAST="lib/mastery.ts"
SRV_MAST="lib/server/mastery.ts"
READY="lib/readiness.ts"
DASH="app/(app)/dashboard/page.tsx"
PROG="app/(app)/progress/page.tsx"
NAV="components/app-nav.tsx"

# 5a. A — spaced-review queue.
grep -Eq "export (function|const) dueMistakes" "$SEL" || fail "A: dueMistakes not exported"
grep -Eq "server-only|@/lib/db|@prisma/client|lib/generated" "$SEL" \
  && fail "A: $SEL is not pure (server/DB token)"
grep -nE "Math\.random|Date\.now|new Date\(" "$SEL" | grep -v "rng" \
  && fail "A: $SEL not deterministic (clock/global random outside injectable rng)"
grep -q "REVIEW_INTERVALS_HOURS" "$CONST" || fail "A: REVIEW_INTERVALS_HOURS missing from constants"
grep -q "countDueMistakes" "$SRV_MIST" || fail "A: countDueMistakes missing from server layer"
grep -q "countDueMistakes" "$DASH" || fail "A: dashboard does not call countDueMistakes"
grep -q "на повторення" "$DASH" || fail "A: dashboard has no 'на повторення' card"

# 5b. B — per-topic mastery.
grep -Eq "export (function|const) topicMastery" "$MAST" || fail "B: topicMastery not exported"
grep -q "MASTERY_LABEL" "$MAST" || fail "B: MASTERY_LABEL not exported"
grep -Eq "server-only|@/lib/db|@prisma/client|lib/generated" "$MAST" \
  && fail "B: $MAST is not pure (server/DB token)"
grep -nE "Math\.random|Date\.now|new Date\(" "$MAST" \
  && fail "B: $MAST not deterministic (clock/global random)"
grep -q "MASTERY_STRONG_ACCURACY_THRESHOLD" "$CONST" || fail "B: strong-accuracy tunable missing"
grep -q "getTopicMastery" "$SRV_MAST" || fail "B: getTopicMastery missing from server layer"
[ -f "$PROG" ] || fail "B: /progress page missing"
grep -q "getTopicMastery" "$PROG" || fail "B: /progress does not call getTopicMastery"
grep -q "MASTERY_LABEL" "$PROG" || fail "B: /progress does not render the MASTERY_LABEL marker"
grep -q "практикувати" "$PROG" || fail "B: /progress has no практикувати CTA"
grep -q "TOPIC_PRACTICE" "$PROG" || fail "B: /progress CTA is not TOPIC_PRACTICE"
grep -q "/progress" "$NAV" || fail "B: nav has no /progress link"

# 5c. C — exam-readiness estimate + legal disclaimer.
grep -Eq "export (function|const) examReadiness" "$READY" || fail "C: examReadiness not exported"
grep -Eq "server-only|@/lib/db|@prisma/client|lib/generated" "$READY" \
  && fail "C: $READY is not pure (server/DB token)"
grep -nE "Math\.random|Date\.now|new Date\(" "$READY" \
  && fail "C: $READY not deterministic (clock/global random)"
grep -q "EXAM_READINESS" "$CONST" || fail "C: EXAM_READINESS_* tunables missing from constants"
grep -q "examReadiness" "$DASH" || fail "C: dashboard does not call examReadiness"
grep -q "гарантія" "$DASH" || fail "C: dashboard missing the negated 'гарантія' disclaimer"
bad="$(grep -n "гаранті" "$DASH" | grep -v "не " || true)"
[ -n "$bad" ] && fail "C: non-negated 'гаранті…' occurrence(s): $bad"

# ---- 6. Schema NOT modified by this wave ----
[ -z "$(git status --porcelain prisma/schema.prisma 2>/dev/null)" ] \
  || fail "prisma/schema.prisma is dirty — Wave 5 must not change the schema"
if git rev-parse HEAD >/dev/null 2>&1; then
  git log --oneline -- prisma/schema.prisma 2>/dev/null | grep -Eiq "wave5" \
    && fail "a wave5 commit touched prisma/schema.prisma" || true
fi

echo "PASS: wave5-11 — Wave 5 acceptance gate (A–D) green"
