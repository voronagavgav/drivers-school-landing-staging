#!/usr/bin/env bash
# wave12b-18 — wave close-out gate.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
npm run typecheck
npm test
npm run build
npm run db:seed >/dev/null 2>&1 || true
npm run test:integration
# drift zero
drift="$(npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script 2>/dev/null || true)"
if echo "$drift" | grep -qE '^(CREATE|ALTER|DROP)'; then echo "FAIL: schema drift detected"; echo "$drift" | head -20; exit 1; fi
# unit + integration suites collected
u="$(npx vitest list 2>/dev/null || true)"
for f in recommend-action.test.ts confidence-sampling.test.ts result-topics.test.ts runner-input.test.ts topic-map.test.ts; do
  echo "$u" | grep -q "$f" || { echo "FAIL: unit suite $f not collected"; exit 1; }
done
i="$(npx vitest list -c vitest.integration.config.ts 2>/dev/null || true)"
for f in finalize-session.integration.test.ts answer-confidence.integration.test.ts glass-tier-setting.integration.test.ts; do
  echo "$i" | grep -q "$f" || { echo "FAIL: integration suite $f not collected"; exit 1; }
done
# scope: lens count 1..2 in tsx
n="$(grep -rhoE '["'"'"'`][^"'"'"'`]*\blens\b' app components --include='*.tsx' 2>/dev/null | wc -l | tr -d ' ')"
{ [ "$n" -ge 1 ] && [ "$n" -le 2 ]; } || { echo "FAIL: .lens tsx usages must be 1..2 (got $n)"; exit 1; }
# scope: no new (app) routes
d="$(find "app/(app)" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
[ "$d" -eq 9 ] || { echo "FAIL: app/(app) route dirs changed (want 9, got $d)"; exit 1; }
# scope: no PWA/push in app code
if grep -rnE 'serviceWorker\.register|web-push' app components lib --include='*.ts' --include='*.tsx' 2>/dev/null | grep -vE '\.test\.'; then
  echo "FAIL: PWA/push artifacts are W13/14 scope"; exit 1; fi
# close-out doc
C="docs/app-plan/WAVE12B-CLOSEOUT.md"
[ -f "$C" ] || { echo "FAIL: $C missing"; exit 1; }
grep -qE 'wave12b-17' "$C" || { echo "FAIL: close-out must cover all tasks (17 missing)"; exit 1; }
# real transport (guarded but EXPECTED for close-out)
ORIGIN="${DS_AUDIT_ORIGIN:-http://100.110.64.90:3100}"
if curl -sS -m 6 -o /dev/null "$ORIGIN/login" 2>/dev/null; then
  bash bin/browser-audit.sh || { echo "FAIL: real-transport audit red"; exit 1; }
  bash bin/design-shots.sh "$ORIGIN" || true
  p="$(find /tmp/design-shots -maxdepth 1 -name '*.png' -size +3k 2>/dev/null | wc -l | tr -d ' ')"
  [ "$p" -ge 8 ] || { echo "FAIL: design-shots produced only $p PNGs >3k"; exit 1; }
else
  echo "FAIL: LAN server unreachable — close-out REQUIRES the real-transport audit (start: npm run start -- -H 0.0.0.0 -p 3100)"
  exit 1
fi
echo "PASS wave12b-18"
