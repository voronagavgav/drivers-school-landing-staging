#!/usr/bin/env bash
# verify.sh — wave11-04 deriveGrade overrides. Runs the FROZEN oracle against the real impl.
set -euo pipefail
cd "$(dirname "$0")/../.."
fail() { echo "FAIL: $1"; exit 1; }

# Prove the pure suite includes grade.test.ts (capture to var — piping into grep -q SIGPIPE-kills it).
ulist="$(npx vitest list 2>/dev/null || true)"
echo "$ulist" | grep -q "lib/fsrs/grade.test.ts" || fail "unit suite missing lib/fsrs/grade.test.ts"

# Frozen-oracle smoke against the real deriveGrade (relative imports only → no @/ alias needed).
cat > ./.w11_04_oracle.ts <<'TS'
import { deriveGrade } from "./lib/fsrs/grade";
type C = [ret: number, args: Parameters<typeof deriveGrade>];
const O = { easyMs: 2500, hardMs: 20000 };
const cases: C[] = [
  [4, [{ correct: true, latencyMs: 2000 }]],
  [3, [{ correct: true, latencyMs: 6000 }]],
  [2, [{ correct: true, latencyMs: 30000 }]],
  [1, [{ correct: false, latencyMs: 100 }]],
  [4, [{ correct: true, latencyMs: 2400 }, O]],
  [4, [{ correct: true, latencyMs: 2500 }, O]],
  [3, [{ correct: true, latencyMs: 2600 }, O]],
  [3, [{ correct: true, latencyMs: 10000 }, O]],
  [3, [{ correct: true, latencyMs: 19999 }, O]],
  [2, [{ correct: true, latencyMs: 20000 }, O]],
  [3, [{ correct: true }, O]],
  [2, [{ correct: true, latencyMs: 1000, confidence: 1 }, O]],
];
let bad = 0;
for (const [want, args] of cases) {
  const got = (deriveGrade as (...a: unknown[]) => number)(...args);
  if (got !== want) { console.error("MISMATCH", JSON.stringify(args), "want", want, "got", got); bad++; }
}
if (bad) process.exit(1);
console.log("oracle OK:", cases.length, "cases");
TS
npx tsx ./.w11_04_oracle.ts || { rm -f ./.w11_04_oracle.ts; fail "deriveGrade fails the frozen oracle"; }
rm -f ./.w11_04_oracle.ts

npm run typecheck 2>&1 | tail -3
echo "PASS: deriveGrade override oracle green"
