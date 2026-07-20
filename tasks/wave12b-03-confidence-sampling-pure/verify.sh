#!/usr/bin/env bash
# wave12b-03 — confidence sampling pure helper vs plan-time frozen FNV-1a vectors (oracle).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
F="lib/confidence-sampling.ts"
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }
if grep -nE '@/lib/db|server-only|@/lib/auth|lib/generated|Math\.random|Date\.now|new Date' "$F"; then
  echo "FAIL: $F must be pure/deterministic"; exit 1; fi
grep -qE 'CONFIDENCE_SAMPLE_RATE' lib/constants.ts || { echo "FAIL: CONFIDENCE_SAMPLE_RATE missing from lib/constants.ts"; exit 1; }
cat > ./wave12b-03-probe.mts <<'PROBE'
import { fnv1a32, isConfidenceSampled } from "./lib/confidence-sampling";
const eq = (got: unknown, want: unknown, label: string) => {
  if (got !== want) { console.error("MISMATCH", label, "want", want, "got", got); process.exitCode = 1; }
};
eq(fnv1a32("sess-a:q-4"), 2401225625, "hash sess-a:q-4");
eq(fnv1a32("abc:def"), 3584721650, "hash abc:def");
eq(fnv1a32("sess-a:q-1"), 2451558482, "hash sess-a:q-1");
eq(isConfidenceSampled("sess-a", "q-4"), true, "sampled sess-a/q-4");
eq(isConfidenceSampled("abc", "def"), true, "sampled abc/def");
eq(isConfidenceSampled("sess-a", "q-1"), false, "sampled sess-a/q-1");
eq(isConfidenceSampled("sess-a", "q-2"), false, "sampled sess-a/q-2");
eq(isConfidenceSampled("sess-a", "q-5"), false, "sampled sess-a/q-5");
eq(isConfidenceSampled("sess-a", "q-10"), false, "sampled sess-a/q-10");
eq(isConfidenceSampled("clx1", "clq9"), false, "sampled clx1/clq9");
let n = 0;
for (let i = 0; i < 10000; i++) if (isConfidenceSampled("s" + i, "q" + i)) n++;
if (n < 1700 || n > 2300) { console.error("MISMATCH rate", n); process.exitCode = 1; }
if (!process.exitCode) console.log("vectors ok, rate", n / 10000);
PROBE
npx tsx ./wave12b-03-probe.mts || { rm -f ./wave12b-03-probe.mts; echo "FAIL: frozen vector probe"; exit 1; }
rm -f ./wave12b-03-probe.mts
[ -f "lib/confidence-sampling.test.ts" ] || { echo "FAIL: lib/confidence-sampling.test.ts missing"; exit 1; }
x="$(npx vitest list 2>/dev/null || true)"
echo "$x" | grep -q "confidence-sampling.test.ts" || { echo "FAIL: confidence-sampling.test.ts not collected"; exit 1; }
npm run typecheck
npm test
echo "PASS wave12b-03"
