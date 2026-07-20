#!/usr/bin/env bash
# verify.sh — wave6-01 (investigation: FINDINGS.md exists and covers the required surfaces)
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
F="tasks/wave6-01-investigate-image-content-surfaces/FINDINGS.md"
fail() { echo "FAIL: $1"; exit 1; }

[ -f "$F" ] || fail "$F missing — investigation output not written"

# Must cite the render surfaces, the produce/serve chain, the tier design, and the seed/test constraints.
for term in "test-runner" "import-official" "golive" "official-images" "restyled" \
            "imageKey" "SERVE_DEMO_QUESTIONS" "seed-content" "migrate deploy"; do
  grep -q "$term" "$F" || fail "$F does not mention '$term'"
done

# Must include path:line style citations (at least a few "file:NN" references).
grep -Eq '\.(ts|tsx|mjs|prisma):[0-9]+' "$F" || fail "$F has no path:line citations"

echo "PASS: wave6-01 FINDINGS.md present and covers the required surfaces"
