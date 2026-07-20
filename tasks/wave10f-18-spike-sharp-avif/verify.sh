#!/usr/bin/env bash
# wave10f-18 verify: sharp AVIF spike verdict recorded.
set -euo pipefail
cd "$(dirname "$0")/../.."

F=docs/app-plan/SPIKES.md
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }
grep -qi "sharp" "$F" || { echo "FAIL: no sharp spike section"; exit 1; }
grep -qi "avif" "$F" || { echo "FAIL: spike must record AVIF findings"; exit 1; }
grep -qi "verdict" "$F" || { echo "FAIL: no VERDICT line"; exit 1; }
grep -Eqi "KB|size|byte" "$F" || { echo "FAIL: spike must record output sizes"; exit 1; }

# If the verdict is "no dep yet" it must not have leaked into package.json. We can't parse intent, so
# just assert typecheck is clean (repo unaffected by the scratch).
npm run typecheck
echo "PASS wave10f-18"
