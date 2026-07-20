#!/usr/bin/env bash
# wave19c-01 — INVESTIGATION gate. The deliverable is a Findings block (no production code).
# This script makes that investigation mechanically checkable so the verify+judge have external
# reality to confirm: (1) every Finding anchor still maps to the live source, (2) NO production
# code was edited, (3) the FROZEN independence + tier-MEAN dials reproduce to 6dp via the REAL
# pure poissonBinomialAtLeast. See journal '## Findings'.
set -euo pipefail
cd "$(dirname "$0")/../.."

fail() { echo "FAIL: $1"; exit 1; }

# --- (1) Finding anchors still map to the live source ------------------------------------------
MR=lib/server/mastery-readiness.ts
grep -q "blockUnseenProb" "$MR"                        || fail "mastery-readiness: blockUnseenProb (unseen honesty floor) gone"
grep -q "blocks = blueprint.blocks.map" "$MR"          || fail "mastery-readiness: per-block map gone"
grep -q "probs.length > 0 ?" "$MR"                     || fail "mastery-readiness: n_t=probs.length seen/unseen ternary gone"
grep -q "computeReadiness({" "$MR"                     || fail "mastery-readiness: computeReadiness call gone"
grep -q "topicCorrelation: READINESS_TOPIC_CORRELATION" "$MR" || fail "mastery-readiness: dial passes ρ constant, not literal"

grep -qE "READINESS_TOPIC_CORRELATION = 0\b" lib/constants.ts || fail "constants: READINESS_TOPIC_CORRELATION is not 0 (draw-side path must stay inert)"

grep -q "export function poissonBinomialAtLeast" lib/readiness-model.ts || fail "readiness-model: poissonBinomialAtLeast export gone"

# Honesty regression gate calls computeReadiness DIRECTLY (never recomputeReadiness) → stays green by construction.
HT=lib/readiness-honesty.regression.test.ts
grep -q "computeReadiness" "$HT"                       || fail "honesty test: does not call computeReadiness"
grep -q "READINESS_TOPIC_CORRELATION" "$HT"            || fail "honesty test: does not reference ρ constant"
grep -q "recomputeReadiness" "$HT"                     && fail "honesty test: unexpectedly references recomputeReadiness"

# --- (2) Investigation-only: NO production code changed by this task ----------------------------
git diff --quiet HEAD -- lib app || fail "production code under lib/ or app/ was edited (investigation-only task)"

# --- (2b) The Findings deliverable exists on disk as a concrete artifact ------------------------
FND="tasks/wave19c-01-investigate-integration-and-preverify-dials/FINDINGS.md"
[ -f "$FND" ]                                  || fail "FINDINGS.md deliverable artifact missing"
grep -q "blocks = blueprint.blocks.map" "$FND" || fail "FINDINGS.md: block-building integration point not documented"
grep -q "topicCorrelation: READINESS_TOPIC_CORRELATION" "$FND" || fail "FINDINGS.md: dial path not documented"
grep -q "0.196467" "$FND"                      || fail "FINDINGS.md: frozen tier-MEAN dials not recorded"

# --- (3) FROZEN dials reproduce to 6dp via the REAL pure model ---------------------------------
# Self-cleaning throwaway at repo root (tsx relative imports resolve against the SCRIPT dir).
SCR=._preverify_wave19c01.ts
trap 'rm -f "$SCR"' EXIT
cat > "$SCR" <<'TS'
import { poissonBinomialAtLeast } from "./lib/readiness-model";
const QUOTA = 5, THRESHOLD = 18, RHO = 0.3;
const nEff = QUOTA / (1 + (QUOTA - 1) * RHO); // 5/2.2 = 2.272727
const students: Record<string, number[]> = {
  weak: [0.55, 0.60, 0.65, 0.60], mid: [0.75, 0.80, 0.70, 0.78],
  strong: [0.92, 0.95, 0.90, 0.94], mixed: [0.95, 0.95, 0.55, 0.90],
};
const shrink = (p: number) => Math.min(p, (p * nEff + 0.5) / (nEff + 1));
const flat = (ps: number[]) => ps.flatMap((p) => Array(QUOTA).fill(p));
// FROZEN spec (scipy-1.18 oracle, specs/wave19c-estimation-side-rho.md) — external to this repo's impl.
const eIndep: Record<string, number> = { weak: 0.003541, mid: 0.103036, strong: 0.827096, mixed: 0.317318 };
const eMean: Record<string, number> = { weak: 0.001586, mid: 0.022708, strong: 0.196467, mixed: 0.061504 };
const ePoint: [number, number][] = [[0.60, 0.569444], [0.80, 0.708333], [0.95, 0.812500]];
let ok = true;
const chk = (l: string, got: number, exp: number) => {
  const pass = Math.abs(got - exp) < 1e-6; if (!pass) ok = false;
  console.log(`${pass ? "ok  " : "FAIL"} ${l} got=${got.toFixed(6)} exp=${exp.toFixed(6)}`);
};
for (const [n, p] of Object.entries(students)) chk(`indep ${n}`, poissonBinomialAtLeast(THRESHOLD, flat(p)), eIndep[n]);
for (const [n, p] of Object.entries(students)) chk(`mean  ${n}`, poissonBinomialAtLeast(THRESHOLD, flat(p.map(shrink))), eMean[n]);
for (const [p, e] of ePoint) chk(`point ${p}`, shrink(p), e);
console.log(`nEff=${nEff.toFixed(6)}`);
if (!ok) { console.error("REPRODUCTION MISMATCH — frozen dial drift"); process.exit(1); }
console.log("REPRODUCTION OK");
TS
npx tsx --conditions=react-server "./$SCR" || fail "frozen dials do not reproduce to 6dp via poissonBinomialAtLeast"

echo "PASS wave19c-01"
