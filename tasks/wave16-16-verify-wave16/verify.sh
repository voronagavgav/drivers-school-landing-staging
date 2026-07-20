#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
npx tsc --noEmit || { echo "FAIL: typecheck"; exit 1; }
npm test || { echo "FAIL: unit suite"; exit 1; }
npm run db:seed || { echo "FAIL: seed (first run)"; exit 1; }
npm run db:seed || { echo "FAIL: seed not idempotent (second run)"; exit 1; }
npm run test:integration || { echo "FAIL: integration suite"; exit 1; }
npm run build || { echo "FAIL: build"; exit 1; }
# Shipped-inert env: neither flag may be set anywhere tracked or in local env files
if git grep -nE '^(ENTITLEMENTS_ENABLED|APP_ORIGIN)=' -- . 2>/dev/null | grep -q .; then
  echo "FAIL: tracked file sets a wave16 gate env var"; exit 1
fi
for f in .env .env.local; do
  if [ -f "$f" ] && grep -qE '^(ENTITLEMENTS_ENABLED|APP_ORIGIN)=' "$f"; then
    echo "FAIL: $f sets a wave16 gate env var — must ship unset"; exit 1
  fi
done
# Never-gated contract present and collected
T=lib/server/never-gated.integration.test.ts
[ -f "$T" ] || { echo "FAIL: never-gated contract file missing"; exit 1; }
grep -q 'NEVER-GATED-CONTRACT' "$T" || { echo "FAIL: contract marker missing"; exit 1; }
x="$(npx vitest list --config vitest.integration.config.ts 2>/dev/null || true)"
echo "$x" | grep -q 'never-gated' || { echo "FAIL: contract file not collected"; exit 1; }
# Oracle never edited after freeze (do NOT re-run wave16-04's point-in-time gate itself)
shasum -a 256 -c tasks/wave16-04-entitlements-oracle/oracle.sha256 || { echo "FAIL: frozen oracle was edited"; exit 1; }
# Real-transport gate (server must be restarted on the fresh build first)
npm run audit:browser || { echo "FAIL: browser audit"; exit 1; }
grep -q '## Findings' tasks/wave16-16-verify-wave16/journal.md || { echo "FAIL: Findings summary missing"; exit 1; }
echo "OK wave16-16 — wave gate green"
