#!/usr/bin/env bash
# wave12b-11 — runner input behaviors (frozen pure-helper probe + wiring greps).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
F="lib/runner-input.ts"
R="components/test-runner.tsx"
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }
if grep -nE '@/lib/db|server-only|@/lib/auth|lib/generated|Math\.random|Date\.now|new Date' "$F"; then
  echo "FAIL: $F must be pure"; exit 1; fi
if grep -nE '</|/>' "$F"; then echo "FAIL: no JSX in the pure module"; exit 1; fi
cat > ./wave12b-11-probe.mts <<'PROBE'
import { digitToOptionIndex, swipeAction, clampResumeIndex } from "./lib/runner-input";
const eq = (got: unknown, want: unknown, label: string) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) { console.error("MISMATCH", label, "want", want, "got", got); process.exitCode = 1; }
};
eq(digitToOptionIndex("1", 4), 0, "digit 1/4");
eq(digitToOptionIndex("4", 4), 3, "digit 4/4");
eq(digitToOptionIndex("4", 3), null, "digit 4/3");
eq(digitToOptionIndex("5", 4), null, "digit 5/4");
eq(digitToOptionIndex("0", 4), null, "digit 0");
eq(digitToOptionIndex("Enter", 4), null, "digit Enter");
eq(digitToOptionIndex("12", 4), null, "digit 12");
eq(swipeAction(-60, 10), "next", "swipe next");
eq(swipeAction(60, -5), "prev", "swipe prev");
eq(swipeAction(-47, 0), null, "swipe below threshold");
eq(swipeAction(-48, 0), "next", "swipe at threshold");
eq(swipeAction(-60, 80), null, "swipe vertical wins");
eq(swipeAction(-30, 0, 20), "next", "swipe custom threshold");
eq(clampResumeIndex("3", 20), 3, "resume 3");
eq(clampResumeIndex("25", 20), 0, "resume out of range");
eq(clampResumeIndex("-1", 20), 0, "resume negative");
eq(clampResumeIndex(null, 20), 0, "resume null");
eq(clampResumeIndex("abc", 20), 0, "resume NaN");
if (!process.exitCode) console.log("runner-input probe ok");
PROBE
npx tsx ./wave12b-11-probe.mts || { rm -f ./wave12b-11-probe.mts; echo "FAIL: frozen probe"; exit 1; }
rm -f ./wave12b-11-probe.mts
[ -f "lib/runner-input.test.ts" ] || { echo "FAIL: lib/runner-input.test.ts missing"; exit 1; }
x="$(npx vitest list 2>/dev/null || true)"
echo "$x" | grep -q "runner-input.test.ts" || { echo "FAIL: runner-input.test.ts not collected"; exit 1; }
# wiring
grep -qE 'digitToOptionIndex' "$R" || { echo "FAIL: digit keys not wired"; exit 1; }
grep -qE 'swipeAction' "$R" || { echo "FAIL: swipe not wired"; exit 1; }
grep -qE 'scrollIntoView' "$R" || { echo "FAIL: explanation auto-scroll missing"; exit 1; }
grep -qE 'prefers-reduced-motion' "$R" || { echo "FAIL: reduced-motion scroll fallback missing"; exit 1; }
grep -qE 'ds_test_idx' "$R" || { echo "FAIL: sessionStorage index persistence missing"; exit 1; }
grep -qE 'clampResumeIndex' "$R" || { echo "FAIL: resume must go through clampResumeIndex"; exit 1; }
grep -qE 'onOptionsKeyDown|ArrowDown' "$R" || { echo "FAIL: arrow roving lost"; exit 1; }
# no new gesture dependency
if git diff HEAD --name-only 2>/dev/null | grep -q 'package.json'; then
  if git diff HEAD -- package.json | grep -E '^\+' | grep -viE 'version|lock' | grep -qE '"(swiper|hammer|react-swipeable|use-gesture)'; then
    echo "FAIL: gesture library added"; exit 1; fi
fi
npm run typecheck
npm test
npm run build
echo "PASS wave12b-11"
