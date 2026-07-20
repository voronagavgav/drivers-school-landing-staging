#!/usr/bin/env bash
# wave12b-02 — recommend-action pure module vs the plan-time frozen matrix (oracle).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
F="lib/recommend-action.ts"
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }
# purity (whole small file; no injectable defaults documented here)
if grep -nE '@/lib/db|server-only|@/lib/auth|lib/generated|Math\.random|Date\.now|new Date' "$F"; then
  echo "FAIL: $F must be pure/deterministic"; exit 1; fi
# frozen matrix probe (planner oracle — 9 vectors)
cat > ./wave12b-02-probe.mts <<'PROBE'
import { recommendAction } from "./lib/recommend-action";
const cases: Array<[{sufficientData:boolean;lastExamPassed:boolean|null;hasWeakTopics:boolean}, string]> = [
  [{sufficientData:false,lastExamPassed:null,hasWeakTopics:false},"mixed-practice"],
  [{sufficientData:false,lastExamPassed:null,hasWeakTopics:true},"mixed-practice"],
  [{sufficientData:false,lastExamPassed:false,hasWeakTopics:true},"mixed-practice"],
  [{sufficientData:false,lastExamPassed:true,hasWeakTopics:false},"mixed-practice"],
  [{sufficientData:true,lastExamPassed:false,hasWeakTopics:true},"weak-topics"],
  [{sufficientData:true,lastExamPassed:false,hasWeakTopics:false},"weak-topics"],
  [{sufficientData:true,lastExamPassed:true,hasWeakTopics:true},"keep-pace-exam"],
  [{sufficientData:true,lastExamPassed:true,hasWeakTopics:false},"keep-pace-exam"],
  [{sufficientData:true,lastExamPassed:null,hasWeakTopics:true},"weak-topics"],
];
// tenth vector: sufficient + never-examined + no weak topics
cases.push([{sufficientData:true,lastExamPassed:null,hasWeakTopics:false},"mixed-practice"]);
let bad = 0;
for (const [input, want] of cases) {
  const got = recommendAction(input).kind;
  if (got !== want) { console.error("MISMATCH", JSON.stringify(input), "want", want, "got", got); bad++; }
}
if (bad) process.exit(1);
console.log("matrix ok:", cases.length, "vectors");
PROBE
npx tsx ./wave12b-02-probe.mts || { rm -f ./wave12b-02-probe.mts; echo "FAIL: frozen matrix probe"; exit 1; }
rm -f ./wave12b-02-probe.mts
# test file exists + is collected
[ -f "lib/recommend-action.test.ts" ] || { echo "FAIL: lib/recommend-action.test.ts missing"; exit 1; }
x="$(npx vitest list 2>/dev/null || true)"
echo "$x" | grep -q "recommend-action.test.ts" || { echo "FAIL: recommend-action.test.ts not collected by vitest"; exit 1; }
npm run typecheck
npm test
echo "PASS wave12b-02"
