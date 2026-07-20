#!/usr/bin/env bash
# verify.sh — wave7-04 (pure applyOverride merge + unit tests)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
SRC="lib/content-override.ts"
TEST="lib/content-override.test.ts"
fail() { echo "FAIL: $1"; exit 1; }

# 1. Exported function.
[ -f "$SRC" ] || fail "$SRC missing"
grep -Eq 'export (function|const) applyOverride' "$SRC" || fail "$SRC must export applyOverride"

# 5. Purity.
for tok in 'server-only' '@/lib/db' '@prisma/client' 'lib/generated' 'Math.random' 'Date.now' 'new Date'; do
  grep -Fq "$tok" "$SRC" && fail "$SRC contains forbidden token '$tok' (must stay pure)" || true
done

# 6. Tests present + cover the key cases.
[ -f "$TEST" ] || fail "$TEST missing"
grep -Eiq 'partial' "$TEST" || fail "$TEST must cover a partial override merge"
grep -Eiq 'mutat|unchanged|toEqual' "$TEST" || fail "$TEST must assert non-mutation / plan-unchanged"

# 2-4. Behaviour smoke (repo-root tsx).
cat > ./.wave7_04_smoke.ts <<'TS'
import { applyOverride } from "./lib/content-override";
const plan = { text: "orig", options: [{ n: 1, text: "a" }], answer: 1, topic: "T", categories: ["B"], explanation: { short: "s" }, imageKey: null as string | null };
const a = applyOverride(plan, null);
if (JSON.stringify(a) !== JSON.stringify(plan)) { console.error("null override changed plan"); process.exit(1); }
const b = applyOverride(plan, { text: "fixed" });
if (b.text !== "fixed" || b.answer !== 1 || b.topic !== "T") { console.error("partial text override wrong", b); process.exit(1); }
const c = applyOverride(plan, { answer: 2, options: [{ n: 1, text: "x" }, { n: 2, text: "y" }] });
if (c.answer !== 2 || (c.options as any[]).length !== 2 || c.text !== "orig") { console.error("answer/options override wrong", c); process.exit(1); }
// non-mutation of the original plan
if (plan.text !== "orig" || plan.answer !== 1 || (plan.options as any[]).length !== 1) { console.error("plan was mutated", plan); process.exit(1); }
// explicit null clears imageKey via override
const d = applyOverride({ ...plan, imageKey: "k1" }, { imageKey: null });
if (d.imageKey !== null) { console.error("explicit null override did not clear", d); process.exit(1); }
console.log("SMOKE OK");
TS
npx tsx ./.wave7_04_smoke.ts || { rm -f ./.wave7_04_smoke.ts; fail "applyOverride behaviour smoke failed"; }
rm -f ./.wave7_04_smoke.ts

# 7. typecheck + suite includes the test.
npm run typecheck 2>&1 | tail -3
vlist="$(npx vitest list 2>/dev/null || true)"
echo "$vlist" | grep -q "lib/content-override.test.ts" || fail "content-override.test.ts not in unit suite"
npm test 2>&1 | tail -5

echo "PASS: wave7-04 applyOverride pure, shallow override-wins, non-mutating, tested; typecheck/test green"
