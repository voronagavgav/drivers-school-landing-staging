#!/usr/bin/env bash
# Verify wave19a-05: pure calibration-metrics module matches the plan-time frozen Brier/LogLoss oracles.
set -euo pipefail
cd "$(dirname "$0")/../.."

fail() { echo "FAIL: $1" >&2; exit 1; }
M=lib/calibration-metrics.ts
[ -f "$M" ] || fail "lib/calibration-metrics.ts missing"

# 1. Purity.
if grep -En 'server-only|@/lib/db|@prisma/client|lib/generated|Math\.random|Date\.now|new Date' "$M"; then
  fail "purity violation in calibration-metrics.ts"
fi

# 2. Exports present.
for fn in reliabilityDiagram brierScore logLoss ece fitPlatt applyPlatt; do
  grep -Eq "export (function|const) $fn" "$M" || fail "export $fn missing"
done

# 3. EXTERNAL FROZEN ORACLE — Brier=0.225, LogLoss≈0.6455747490 for the pinned point set.
#    (Try {p,y} then {predicted,actual} shape so the check is shape-tolerant.)
OUT="$(npx tsx -e '
import * as C from "./lib/calibration-metrics";
const mk=(p:number,y:number)=>({p,y,predicted:p,actual:y});
const P=[mk(0.9,1),mk(0.8,0),mk(0.3,0),mk(0.6,1)] as any;
const b=(C as any).brierScore(P); const l=(C as any).logLoss(P);
console.log(JSON.stringify({b,l}));
')" || fail "could not evaluate brierScore/logLoss"
B="$(echo "$OUT" | sed -E 's/.*"b":([-0-9.eE]+).*/\1/')"
L="$(echo "$OUT" | sed -E 's/.*"l":([-0-9.eE]+).*/\1/')"
awk -v v="$B" 'BEGIN{d=v-0.225; if(d<-1e-6||d>1e-6) exit 1}' || fail "brierScore=$B, expected 0.225"
awk -v v="$L" 'BEGIN{d=v-0.6455747490; if(d<-1e-6||d>1e-6) exit 1}' || fail "logLoss=$L, expected 0.6455747490"

# 4. Test file collected + green.
LIST="$(npx vitest list 2>/dev/null || true)"
echo "$LIST" | grep -q 'calibration-metrics' || fail "calibration-metrics.test.ts not collected"
grep -Eiq 'gameable|base[- ]rate' lib/calibration-metrics.test.ts || fail "missing the 'ECE is gameable' oracle/comment"

npm run -s typecheck || fail "typecheck failed"
npm run -s test || fail "npm test failed"

echo "PASS: wave19a-05 calibration-metrics matches frozen oracles"
