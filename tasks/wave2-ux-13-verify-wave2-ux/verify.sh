#!/usr/bin/env bash
# verify.sh — wave2-ux-13 (full Wave 2 UX acceptance gate: sections A–D + build + no schema change)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
DASH="app/(app)/dashboard/page.tsx"
TR="components/test-runner.tsx"
LAYOUT="app/(app)/layout.tsx"
fail() { echo "FAIL: $1"; exit 1; }

# ---------- 5. A — resume ----------
[ -f lib/session-resume.ts ] || fail "lib/session-resume.ts missing"
grep -Eq "export (function|const) selectResumableSession" lib/session-resume.ts \
  || fail "selectResumableSession not exported"
grep -Eq "server-only|@/lib/db|@prisma/client|lib/generated" lib/session-resume.ts \
  && fail "lib/session-resume.ts is not pure"
grep -rEq "export (async )?function getResumableSession" lib/server \
  || fail "getResumableSession not exported from lib/server"
SRV="$(grep -rl "function getResumableSession" lib/server | head -1)"
grep -q "selectResumableSession" "$SRV" || fail "$SRV does not reuse selectResumableSession"
grep -qF "Продовжити тест" "$DASH" || fail "$DASH missing «Продовжити тест» card"
grep -qF '/test/${' "$DASH" || fail "$DASH resume card does not link to /test/\${id}"

# ---------- 6. B — exam behaviour ----------
grep -qF "Ви відповіли на" "$TR" || fail "B: confirm warning «Ви відповіли на …» missing"
grep -qF "Скасувати" "$TR" || fail "B: confirm dialog has no «Скасувати» control"
grep -q "finishingRef" "$TR" || fail "B: finishingRef idempotency latch lost"
grep -Eiq "flag" "$TR" || fail "B: question navigator flagging missing"
grep -q "setIdx" "$TR" || fail "B: navigator does not jump via setIdx"
grep -q "DEFAULT_EXAM_QUESTION_COUNT" "$TR" "app/(app)/test/[id]/page.tsx" \
  || fail "B: exam-short notice does not reference DEFAULT_EXAM_QUESTION_COUNT"
grep -Eq "менше|неповн|коротш" "$TR" "app/(app)/test/[id]/page.tsx" \
  || fail "B: exam-short notice text missing"

# ---------- 7. C — robustness ----------
for f in "app/(app)/error.tsx" "app/admin/error.tsx"; do
  [ -f "$f" ] || fail "C: $f missing"
  head -3 "$f" | grep -q '"use client"' || fail "C: $f not a client component"
  grep -q "reset" "$f" || fail "C: $f does not use reset()"
done
[ -f "app/(app)/test/[id]/not-found.tsx" ] || fail "C: test not-found.tsx missing"
grep -qF "/dashboard" "app/(app)/test/[id]/not-found.tsx" || fail "C: not-found has no /dashboard link"
[ -f components/submit-button.tsx ] || fail "C: components/submit-button.tsx missing"
grep -q "useFormStatus" components/submit-button.tsx || fail "C: submit-button does not use useFormStatus"
for f in "app/(app)/onboarding/page.tsx" "$DASH" "app/(app)/practice/page.tsx"; do
  grep -q "SubmitButton" "$f" || fail "C: $f does not use SubmitButton"
done

# ---------- 8. D — accessibility ----------
grep -q 'role="radiogroup"' "$TR" || fail "D: options not role=radiogroup"
grep -q 'role="radio"' "$TR" || fail "D: options not role=radio"
grep -q "aria-checked" "$TR" || fail "D: options have no aria-checked"
grep -q "onKeyDown" "$TR" || fail "D: no keyboard handler"
grep -Eq "Arrow(Down|Up|Right|Left)" "$TR" || fail "D: no arrow-key handling"
grep -q "✓" "$TR" || fail "D: no ✓ correct indicator"
grep -q "✗" "$TR" || fail "D: no ✗ wrong indicator"
grep -q "aria-live" "$TR" || fail "D: timer not aria-live"
grep -qF 'href="#main-content"' "$LAYOUT" || fail "D: no skip link to #main-content"
grep -qF 'id="main-content"' "$LAYOUT" || fail "D: <main> has no id=main-content"

# ---------- 9. No DB schema change ----------
if git log --pretty=%s -- prisma/schema.prisma 2>/dev/null | grep -qi "wave2-ux"; then
  fail "a wave2-ux commit modified prisma/schema.prisma"
fi
git diff --quiet -- prisma/schema.prisma 2>/dev/null || fail "uncommitted change to prisma/schema.prisma"
git diff --cached --quiet -- prisma/schema.prisma 2>/dev/null || fail "staged change to prisma/schema.prisma"

# ---------- 1. Typecheck ----------
npm run typecheck 2>&1 | tail -3

# ---------- 2. Fast unit suite: zero failures + >= 9 files, incl session-resume ----------
out="$(npm test 2>&1)"; echo "$out" | tail -8
echo "$out" | grep -Eqi "fail" && fail "vitest reported failures"
# vitest's default reporter does NOT print filenames on all-pass, so grepping `npm test`
# output for a file never matches — prove inclusion via `vitest list` (capture first, then grep).
listed="$(npx vitest list 2>/dev/null || true)"
echo "$listed" | grep -q "session-resume" || fail "session-resume.test.ts did not run"
files="$(echo "$out" | grep -Eo "Test Files[[:space:]]+[0-9]+ passed" | grep -Eo "[0-9]+" | head -1)"
[ -n "$files" ] || fail "could not parse vitest file count"
[ "$files" -ge 9 ] || fail "expected >=9 test files, got $files"

# ---------- 3. Integration suite ----------
echo "Running integration tests…"
npm run test:integration 2>&1 | tail -8

# ---------- 4. Build (the wave's final hard gate) ----------
echo "Running npm run build (this can take a while)…"
npm run build 2>&1 | tail -15

echo "PASS: wave2-ux-13 — Wave 2 UX acceptance met (A–D + build), $files test files"
