#!/usr/bin/env bash
# verify.sh — wave7-03 (pure content-key helper + unit tests)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
SRC="lib/content-key.ts"
TEST="lib/content-key.test.ts"
fail() { echo "FAIL: $1"; exit 1; }

# 1. Module exports both functions.
[ -f "$SRC" ] || fail "$SRC missing"
grep -Eq 'export (function|const) questionKey' "$SRC" || fail "$SRC must export questionKey"
grep -Eq 'export (function|const) optionKey'   "$SRC" || fail "$SRC must export optionKey"

# 4. Purity: no forbidden tokens anywhere in the file.
for tok in 'server-only' '@/lib/db' '@prisma/client' 'lib/generated' 'Math.random' 'Date.now' 'new Date'; do
  grep -Fq "$tok" "$SRC" && fail "$SRC contains forbidden token '$tok' (must stay pure)" || true
done

# 5. Test file exists and proves injectivity (not just happy path).
[ -f "$TEST" ] || fail "$TEST missing"
grep -Eiq 'inject|distinct|collision|unique' "$TEST" || fail "$TEST must assert injectivity/distinctness"
grep -q 'q_11_7' "$TEST" || fail "$TEST should assert the documented questionKey format"
grep -q '__' "$TEST" || fail "$TEST should assert the double-underscore optionKey separator"

# 2-3. Behaviour check via a throwaway repo-root tsx smoke (relative import resolves at repo root).
cat > ./.wave7_03_smoke.ts <<'TS'
import { questionKey, optionKey } from "./lib/content-key";
function eq(a: string, b: string, msg: string) { if (a !== b) { console.error(`MISMATCH ${msg}: got '${a}' want '${b}'`); process.exit(1); } }
eq(questionKey("11", 7), "q_11_7", "qk 11/7");
eq(questionKey("8", 1), "q_8_1", "qk 8/1");
eq(questionKey("8.1", 2), "q_8_1_2", "qk 8.1/2 dot-normalize");
eq(optionKey("q_11_7", 1), "q_11_7__1", "ok 1-based");
eq(optionKey("q_8_1_2", 3), "q_8_1_2__3", "ok subsection");
// injectivity on an ambiguity-prone set: section 8 vs 8.1, 12 vs 1.2
const seen = new Set<string>();
for (const [s, q] of [["8",1],["8",12],["8.1",2],["8.1",23],["12",2],["1.2",3],["1.2",32]] as [string, number][]) {
  const k = questionKey(s, q);
  if (seen.has(k)) { console.error(`COLLISION at ${s}/${q} -> ${k}`); process.exit(1); }
  seen.add(k);
}
console.log("SMOKE OK");
TS
npx tsx ./.wave7_03_smoke.ts || { rm -f ./.wave7_03_smoke.ts; fail "content-key behaviour smoke failed"; }
rm -f ./.wave7_03_smoke.ts

# 6. typecheck + unit suite includes the new test.
npm run typecheck 2>&1 | tail -3
vlist="$(npx vitest list 2>/dev/null || true)"
echo "$vlist" | grep -q "lib/content-key.test.ts" || fail "content-key.test.ts not in the unit suite"
npm test 2>&1 | tail -5

echo "PASS: wave7-03 content-key pure helper exports + injective + tested; typecheck/test green"
