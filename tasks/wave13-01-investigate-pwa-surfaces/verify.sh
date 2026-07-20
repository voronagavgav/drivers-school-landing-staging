#!/usr/bin/env bash
# wave13-01 — investigation report exists with all required sections + substance; read-only.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
F="docs/app-plan/WAVE13-SURFACES.md"
[ -f "$F" ] || { echo "FAIL: $F missing"; exit 1; }
for h in "## SW + build" "## Image pipeline" "## WAL + sync" "## Track-route patterns" "## Pack + UI hosts" "## Secure context + E2E"; do
  grep -qF "$h" "$F" || { echo "FAIL: missing section: $h"; exit 1; }
done
# substance spot-checks (not just headings)
grep -qE "9\.5\.11" "$F" || { echo "FAIL: must pin serwist versions from SPIKES.md"; exit 1; }
grep -qE "webworker" "$F" || { echo "FAIL: must record the webworker lib tsc fix"; exit 1; }
grep -qE "SAFE_KEY|isSafeKey" "$F" || { echo "FAIL: image section must cite the key sanitiser"; exit 1; }
grep -qE "srs-review\.integration\.test" "$F" || { echo "FAIL: WAL section must list clientEventId-asserting tests"; exit 1; }
grep -qE "analytics-ingest" "$F" || { echo "FAIL: track-route section must cite lib/analytics-ingest.ts"; exit 1; }
grep -qE "baseWhere" "$F" || { echo "FAIL: pack section must cite the published-question predicate"; exit 1; }
grep -qE "localhost:3100" "$F" || { echo "FAIL: secure-context section must pin the E2E origin decision"; exit 1; }
n="$(grep -cE "DECISION:" "$F" || true)"
[ "${n:-0}" -ge 6 ] || { echo "FAIL: expected >=6 DECISION lines, got $n"; exit 1; }
# read-only: no source changes beyond docs/ and tasks/
if git status --porcelain -- app components lib bin scripts prisma package.json next.config.ts | grep -qE '.'; then
  echo "FAIL: investigation task must not touch source dirs"; exit 1; fi
echo "PASS wave13-01"
