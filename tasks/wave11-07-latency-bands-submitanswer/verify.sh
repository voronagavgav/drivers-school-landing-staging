#!/usr/bin/env bash
# verify.sh — wave11-07 per-topic latency bands.
set -euo pipefail
cd "$(dirname "$0")/../.."
fail() { echo "FAIL: $1"; exit 1; }

# 1. pure helper exists + in suite.
grep -Eq 'export (function|const) latencyBandsForMedian' lib/fsrs/latency-bands.ts \
  || fail "latencyBandsForMedian not exported from lib/fsrs/latency-bands.ts"
ulist="$(npx vitest list 2>/dev/null || true)"
echo "$ulist" | grep -q "lib/fsrs/latency-bands.test.ts" || fail "unit suite missing latency-bands.test.ts"

# 2. purity: no DB/clock/rng/JSX tokens in the helper module.
for tok in 'server-only' '@/lib/db' 'Math.random' 'Date.now' 'new Date' '</' '/>'; do
  grep -Fq "$tok" lib/fsrs/latency-bands.ts && fail "latency-bands.ts contains forbidden token '$tok'" || true
done

# 3. frozen oracle against the real helper (relative imports only).
cat > ./.w11_07_oracle.ts <<'TS'
import { latencyBandsForMedian } from "./lib/fsrs/latency-bands";
const cases: [number | null, number, number][] = [
  [null, 5000, 30000],
  [0, 5000, 30000],
  [1000, 2500, 20000],
  [3000, 2500, 20000],
  [10000, 5000, 25000],
  [40000, 20000, 100000],
];
let bad = 0;
for (const [m, e, h] of cases) {
  const b = latencyBandsForMedian(m);
  if (b.easyMs !== e || b.hardMs !== h) { console.error("median", m, "got", b, "want", { easyMs: e, hardMs: h }); bad++; }
}
if (bad) process.exit(1);
console.log("latency-bands oracle OK");
TS
npx tsx ./.w11_07_oracle.ts || { rm -f ./.w11_07_oracle.ts; fail "latencyBandsForMedian fails frozen oracle"; }
rm -f ./.w11_07_oracle.ts

# 4. wiring: recordReview threads bands; submitAnswer reads medianLatencyMs.
grep -Eq 'easyMs' lib/server/study.ts || fail "recordReview does not accept easyMs override"
grep -Eq 'medianLatencyMs' lib/server/test-engine.ts || fail "submitAnswer does not read medianLatencyMs"

npm run typecheck 2>&1 | tail -3
echo "PASS: latency bands pure oracle + wiring"
