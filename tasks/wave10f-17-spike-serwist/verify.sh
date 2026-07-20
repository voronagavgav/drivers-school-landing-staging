#!/usr/bin/env bash
# wave10f-17 verify: Serwist spike verdict recorded; no dep/artifact leaked.
set -euo pipefail
cd "$(dirname "$0")/../.."

F=docs/app-plan/SPIKES.md
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }
grep -qi "serwist" "$F" || { echo "FAIL: no Serwist spike section"; exit 1; }
grep -qi "verdict" "$F" || { echo "FAIL: no VERDICT line"; exit 1; }
grep -Eqi "sw\.js|service worker|webpack" "$F" || { echo "FAIL: spike must record sw.js/webpack findings"; exit 1; }

# No serwist dependency leaked into the repo.
if grep -Eqi "serwist" package.json; then echo "FAIL: serwist dependency leaked into package.json"; exit 1; fi
# No throwaway artifacts tracked.
if git ls-files | grep -Eq "^(app/sw\.ts|public/sw\.js)$"; then echo "FAIL: spike artifact committed"; exit 1; fi
echo "PASS wave10f-17"
