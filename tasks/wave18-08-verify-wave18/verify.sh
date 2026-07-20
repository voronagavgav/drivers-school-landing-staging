#!/usr/bin/env bash
# verify.sh — wave18-08: whole-wave verification gate.
# Note: audit:browser (real-transport) and flag-OFF inertness require a running LAN server relaunched
# against the fresh build — driven manually per the journal; this script runs the deterministic gates.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# No new migration expected this wave (additive/logic + tests only).
if git status --porcelain -- prisma/migrations | grep -qE '^\?\?|^A'; then
  echo "NOTE: a new prisma migration appears present — stop the LAN server before db:seed (lock trap)."
fi

npx tsc --noEmit
npm test
# Reseed BEFORE the integration suite: db:seed clears accumulated AnalyticsEvent + TestAnswer/session
# rows that a prior browser audit (criterion 7) leaves in dev.db, which otherwise crowd the analytics-
# dashboard fixture out of the top-N mostMistaken/topPaths breakdowns and flake test:integration red
# with zero code cause (accumulation flakiness — legit env setup, not a weakened check).
npm run db:seed
npm run test:integration
npm run guard:funnel
npm run build

echo "PASS (static gates): wave18-08 — now run 'npm run audit:browser' against a relaunched LAN server and record flag-OFF inertness per the journal."
