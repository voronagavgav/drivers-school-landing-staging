#!/usr/bin/env bash
# wave13-19 — Playwright offline E2E: runs green, and the answer landed EXACTLY once (DB oracle).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

node -e '
const p = require("./package.json");
const v = p.devDependencies && p.devDependencies.playwright;
if (!v) { console.error("FAIL: playwright not in devDependencies"); process.exit(1); }
if (/[\^~]/.test(v)) { console.error("FAIL: playwright must be exact-pinned, got " + v); process.exit(1); }
if (p.dependencies && p.dependencies.playwright) { console.error("FAIL: playwright must not be a runtime dep"); process.exit(1); }
' || exit 1
[ -f scripts/offline-e2e.mjs ] || { echo "FAIL: scripts/offline-e2e.mjs missing"; exit 1; }
grep -qE '"e2e:offline"' package.json || { echo "FAIL: npm script e2e:offline missing"; exit 1; }
grep -qF "setOffline" scripts/offline-e2e.mjs || { echo "FAIL: script must use context.setOffline"; exit 1; }
grep -qF "E2E_SESSION_ID" scripts/offline-e2e.mjs || { echo "FAIL: script must print E2E_SESSION_ID"; exit 1; }

npx playwright install chromium >/dev/null 2>&1 || { echo "FAIL: chromium install"; exit 1; }

# fresh production server on :3100 (localhost run — secure context for the SW)
npm run -s build || { echo "FAIL: build"; exit 1; }
pkill -f "next-server" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true
sleep 1
nohup npm run start -- -H 0.0.0.0 -p 3100 >/tmp/w13-e2e-server.log 2>&1 &
code="000"
for i in $(seq 1 30); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:3100/" || true)"
  [ "$code" != "000" ] && break
  sleep 1
done
[ "$code" != "000" ] || { echo "FAIL: server did not come up on :3100"; exit 1; }

out="$(npm run -s e2e:offline 2>&1)" || { echo "FAIL: e2e:offline run"; echo "$out" | tail -20; exit 1; }
echo "$out" | grep -qE 'E2E_OFFLINE_FALLBACK=PASS' || { echo "FAIL: offline fallback step"; exit 1; }
echo "$out" | grep -qE 'E2E_QUEUED=PASS' || { echo "FAIL: queued step"; exit 1; }
echo "$out" | grep -qE 'E2E_SYNCED=PASS' || { echo "FAIL: synced step"; exit 1; }
sid="$(echo "$out" | grep -E '^E2E_SESSION_ID=' | head -1 | cut -d= -f2 | tr -d '[:space:]')"
[ -n "$sid" ] || { echo "FAIL: no E2E_SESSION_ID emitted"; exit 1; }

nlog="$(sqlite3 prisma/dev.db "SELECT COUNT(*) FROM ReviewLog WHERE testSessionId='$sid';")"
[ "$nlog" = "1" ] || { echo "FAIL: exactly-once violated — ReviewLog count for session $sid is $nlog (want 1)"; exit 1; }
nans="$(sqlite3 prisma/dev.db "SELECT COUNT(*) FROM TestAnswer WHERE testSessionId='$sid';")"
[ "$nans" = "1" ] || { echo "FAIL: exactly-once violated — TestAnswer count for session $sid is $nans (want 1)"; exit 1; }

npm run -s typecheck || { echo "FAIL: typecheck"; exit 1; }
npm run -s test || { echo "FAIL: unit tests"; exit 1; }
echo "PASS wave13-19"
