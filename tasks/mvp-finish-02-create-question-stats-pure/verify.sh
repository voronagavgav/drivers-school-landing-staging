#!/usr/bin/env bash
# verify.sh — mvp-finish-02 (pure summarizer: export + purity + behavior + typecheck/test)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root

# 1. File + export present.
[ -f lib/question-stats.ts ] || { echo "FAIL: lib/question-stats.ts missing"; exit 1; }
grep -Eq "export function summarizeQuestionPerformance[[:space:]]*\(" lib/question-stats.ts \
  || { echo "FAIL: summarizeQuestionPerformance not exported from lib/question-stats.ts"; exit 1; }

# 2. Purity: no DB/server imports.
if grep -Eq "@/lib/db|server-only|@prisma/client|lib/generated" lib/question-stats.ts; then
  echo "FAIL: lib/question-stats.ts is not pure (DB/server import present)"; exit 1
fi

# 3. Behavior smoke test via tsx (empty, mixed, sort hardest-first, never-answered, non-mutation).
# Written at repo root (cwd) so the "./lib/..." relative import resolves against the repo.
cat > ./mvpf02_smoke.ts <<'TS'
import { summarizeQuestionPerformance as f } from "./lib/question-stats";
function assert(c: boolean, m: string){ if(!c){ console.error("SMOKE FAIL: "+m); process.exit(1);} }

// empty
assert(JSON.stringify(f([])) === "[]", "empty input -> []");

// mixed: q1 2/3
const rows = [
  { questionId: "q1", isCorrect: true },
  { questionId: "q1", isCorrect: true },
  { questionId: "q1", isCorrect: false },
];
const before = JSON.stringify(rows);
const one = f(rows);
assert(one.length === 1 && one[0].questionId === "q1", "single question entry");
assert(one[0].timesAnswered === 3 && one[0].correct === 2, "counts 3/2");
assert(Math.abs(one[0].accuracy - 2/3) < 1e-9, "accuracy 2/3");
assert(JSON.stringify(rows) === before, "input not mutated");

// sort hardest-first with tie broken by most-answered
const many = f([
  { questionId: "hi", isCorrect: true }, { questionId: "hi", isCorrect: true },                 // 1.0 x2
  { questionId: "lowA", isCorrect: false }, { questionId: "lowA", isCorrect: false },           // 0.0 x2
  { questionId: "lowB", isCorrect: false }, { questionId: "lowB", isCorrect: false }, { questionId: "lowB", isCorrect: false }, // 0.0 x3
]);
const order = many.map((e) => e.questionId);
assert(order[0] === "lowB" && order[1] === "lowA" && order[2] === "hi",
  "hardest-first with tie by most-answered, got " + order.join(","));

// never-answered via optional universe arg
const uni = (f as any)([{ questionId: "a", isCorrect: true }], ["a", "z"]);
const z = uni.find((e: any) => e.questionId === "z");
assert(!!z && z.timesAnswered === 0 && z.correct === 0 && z.accuracy === 0,
  "never-answered z -> 0/0/0");

console.log("SMOKE OK");
TS
npx tsx ./mvpf02_smoke.ts | tail -3
rm -f ./mvpf02_smoke.ts

# 4. Typecheck + suite green.
npm run typecheck 2>&1 | tail -3
out="$(npm test 2>&1)"; echo "$out" | tail -6
echo "$out" | grep -Eqi "fail" && { echo "FAIL: vitest reported failures"; exit 1; }

echo "PASS: mvp-finish-02 pure summarizer meets criteria"
