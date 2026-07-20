#!/usr/bin/env bash
# wave12b-09 — result-screen topic summary + honest labels (frozen probe).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
F="lib/result-topics.ts"
R="app/(app)/test/[id]/result/page.tsx"
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }
if grep -nE '@/lib/db|server-only|@/lib/auth|lib/generated|Math\.random|Date\.now|new Date' "$F"; then
  echo "FAIL: $F must be pure"; exit 1; fi
if grep -nE '</|/>' "$F"; then echo "FAIL: no JSX in the pure module"; exit 1; fi
# frozen semantics probe
cat > ./wave12b-09-probe.mts <<'PROBE'
import { topWrongTopics } from "./lib/result-topics";
const mk = (t: string, answered: boolean, correct: boolean) => ({ topicId: "id-" + t, topicTitle: t, answered, correct });
const items = [
  mk("Альфа", true, false), mk("Альфа", true, false),          // 2 wrong
  mk("Браво", true, false), mk("Браво", true, false), mk("Браво", true, false), // 3 wrong
  mk("Гамма", true, false),                                     // 1 wrong
  mk("Дельта", false, false), mk("Дельта", false, false),       // unanswered — excluded
  mk("Есхіл", true, true),                                      // correct — excluded
];
const got = topWrongTopics(items);
const want = ["Браво", "Альфа", "Гамма"];
if (JSON.stringify(got.map(g => g.topicTitle)) !== JSON.stringify(want)) {
  console.error("MISMATCH order", got); process.exit(1);
}
if (got[0].wrong !== 3 || got[1].wrong !== 2 || got[2].wrong !== 1) { console.error("MISMATCH counts", got); process.exit(1); }
// tie-break by title asc: Вечір vs Анти both 1 wrong
const tie = topWrongTopics([mk("Вечір", true, false), mk("Анти", true, false)]);
if (tie[0].topicTitle !== "Анти") { console.error("MISMATCH tiebreak", tie); process.exit(1); }
// max + empty
if (topWrongTopics(items, 2).length !== 2) { console.error("MISMATCH max"); process.exit(1); }
if (topWrongTopics([]).length !== 0) { console.error("MISMATCH empty"); process.exit(1); }
console.log("result-topics probe ok");
PROBE
npx tsx ./wave12b-09-probe.mts || { rm -f ./wave12b-09-probe.mts; echo "FAIL: frozen semantics probe"; exit 1; }
rm -f ./wave12b-09-probe.mts
[ -f "lib/result-topics.test.ts" ] || { echo "FAIL: lib/result-topics.test.ts missing"; exit 1; }
x="$(npx vitest list 2>/dev/null || true)"
echo "$x" | grep -q "result-topics.test.ts" || { echo "FAIL: result-topics.test.ts not collected"; exit 1; }
# result page wiring
grep -qF 'Найбільше помилок у темах' "$R" || { echo "FAIL: topic summary heading missing"; exit 1; }
grep -qE 'topWrongTopics' "$R" || { echo "FAIL: summary must use the pure helper"; exit 1; }
grep -qE 'TOPIC_PRACTICE' "$R" || { echo "FAIL: summary topics must link to TOPIC_PRACTICE"; exit 1; }
grep -qF 'Не цього разу — і це нормально. Почнімо з найслабших тем.' "$R" || { echo "FAIL: fail headline missing"; exit 1; }
grep -qF 'Складено. Тримайте форму.' "$R" || { echo "FAIL: pass headline missing"; exit 1; }
grep -qF 'без відповіді' "$R" || { echo "FAIL: unanswered label missing"; exit 1; }
npm run typecheck
npm test
npm run build
echo "PASS wave12b-09"
