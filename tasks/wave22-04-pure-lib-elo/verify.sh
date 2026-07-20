#!/usr/bin/env bash
# wave22-04: pure lib/elo.ts exists, is pure, matches the python-oracle single-update golden, typecheck+unit green.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
ROOT="$(git rev-parse --show-toplevel)"

F="lib/elo.ts"
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }

grep -q "export function foldEloStream" "$F" || { echo "FAIL: foldEloStream export missing"; exit 1; }
grep -q "export function eloUpdate"     "$F" || { echo "FAIL: eloUpdate export missing"; exit 1; }

# Purity: scoped to the target module.
if grep -nE 'Date\.now|new Date|Math\.random' "$F"; then echo "FAIL: impure clock/rng in lib/elo.ts"; exit 1; fi
for tok in 'server-only' '@/lib/db' '@prisma/client' 'lib/generated'; do
  grep -qF "$tok" "$F" && { echo "FAIL: forbidden import token in lib/elo.ts: $tok"; exit 1; } || true
done
grep -qE 'FSRS_GUESS_MAX\s*=' "$F" && { echo "FAIL: must not redeclare FSRS_GUESS_MAX"; exit 1; } || true

# External-oracle cross-check of eloUpdate against the wave22-01 hand-frozen (a') golden:
# θ=0,β=0,y=1,g=0.2,K=K(0)=0.4  →  P=0.2+0.8*0.5=0.6, e=0.4  →  β'=-0.16, θ'=+0.16
CHECK="$ROOT/wave22_04_check.ts"
cat > "$CHECK" <<'TS'
import { eloUpdate } from "./lib/elo";
import { ELO_K_MAX, ELO_K_HALFLIFE, ELO_INITIAL_BETA, ELO_INITIAL_THETA } from "./lib/constants";
import { FSRS_GUESS_MAX } from "./lib/fsrs/constants";
const params = { kMax: ELO_K_MAX, kHalflife: ELO_K_HALFLIFE, guessMax: FSRS_GUESS_MAX, initialBeta: ELO_INITIAL_BETA, initialTheta: ELO_INITIAL_THETA };
// g=0.2 => optionCount=5 (min(1/5,0.45)=0.2)
const r = eloUpdate({ theta: 0, beta: 0, thetaN: 0, betaN: 0, correct: true, optionCount: 5 }, params);
const okB = Math.abs(r.beta - (-0.16)) < 5e-7;
const okT = Math.abs(r.theta - (0.16)) < 5e-7;
console.log(`upd_check beta=${r.beta.toFixed(6)} exp=-0.160000 theta=${r.theta.toFixed(6)} exp=0.160000 ok=${okB && okT}`);
if (!(okB && okT)) { console.error("MISMATCH vs python (a') golden"); process.exit(1); }
TS
npx tsx "$CHECK" || { echo "FAIL: eloUpdate does not match python (a') golden"; rm -f "$CHECK"; exit 1; }
rm -f "$CHECK"

echo "=== typecheck ==="; npm run -s typecheck
echo "=== npm test ==="; npm test

echo "PASS: wave22-04"
