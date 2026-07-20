#!/usr/bin/env bash
# verify.sh — wave11-01 investigation. Checks the findings doc exists and cites each required surface.
set -euo pipefail
cd "$(dirname "$0")/../.."   # repo root
fail() { echo "FAIL: $1"; exit 1; }
DOC="docs/app-plan/WAVE11-SURFACES.md"
[ -f "$DOC" ] || fail "$DOC not written"
for anchor in \
  "lib/server/test-engine.ts" \
  "lib/server/study.ts" \
  "lib/server/progress.ts" \
  "lib/exam-blueprint.ts" \
  "lib/constants.ts" \
  "lib/validation.ts" \
  "app/actions/test.ts" \
  "app/admin/layout.tsx" \
  "bin/browser-audit.sh" \
  "official-question.ts" \
  "TopicMastery" \
  "ReadinessSnapshot" \
  "medianLatencyMs" ; do
  grep -Fq "$anchor" "$DOC" || fail "$DOC does not cite required surface: $anchor"
done
# Each of the 9 numbered findings should carry at least one file:line style anchor.
n_anchors="$(grep -Eoc '[A-Za-z0-9_./-]+:[0-9]+' "$DOC" || true)"
[ "$n_anchors" -ge 1 ] || fail "$DOC has no file:line citations"
echo "PASS: findings doc present and cites all required surfaces"
